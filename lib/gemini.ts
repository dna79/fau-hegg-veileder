export type StructuredGuideSection = {
  sectionKey: string;
  title: string;
  paragraphs: string[];
  bullets: string[];
  summary?: string;
  body?: string;
  recommendations?: string[];
};

export type StructuredGuide = {
  title: string;
  intro: string;
  languageCode?: string;
  stats: Array<{
    value: string;
    label: string;
  }>;
  sections: StructuredGuideSection[];
};

export type TranslationValidationResult = {
  guide: StructuredGuide;
  warning?: string;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

const geminiModelUrl =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

const guideSchema = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    intro: { type: "STRING" },
    languageCode: { type: "STRING" },
    stats: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          value: { type: "STRING" },
          label: { type: "STRING" },
        },
        required: ["value", "label"],
      },
    },
    sections: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          sectionKey: { type: "STRING" },
          title: { type: "STRING" },
          paragraphs: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
          bullets: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
        },
        required: ["sectionKey", "title", "paragraphs", "bullets"],
      },
    },
  },
  required: ["title", "intro", "languageCode", "stats", "sections"],
};

const targetLanguageNames = {
  en: "English",
  pl: "Polish",
  uk: "Ukrainian",
  ar: "Arabic",
  so: "Somali",
} as const;

const adminMissingContentError =
  "Oversettelsen ser ut til å mangle innhold. Prøv igjen.";
const lengthWarning =
  "Oversettelsen er betydelig kortere enn originalen og bør kontrolleres.";

export type TargetLanguage = keyof typeof targetLanguageNames;

function parseJsonResponse(text: string): unknown {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  return JSON.parse(withoutFence);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function splitLegacyBody(body: unknown): string[] {
  if (typeof body !== "string" || !body.trim()) {
    return [];
  }

  return body
    .split(/\n{2,}/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function normalizeSection(
  section: Partial<StructuredGuideSection>,
): StructuredGuideSection {
  const paragraphs = stringArray(section.paragraphs);
  const bullets = stringArray(section.bullets);
  const legacyRecommendations = stringArray(section.recommendations);
  const legacyBodyParagraphs = splitLegacyBody(section.body);
  const legacySummary =
    typeof section.summary === "string" ? section.summary.trim() : "";

  return {
    sectionKey:
      typeof section.sectionKey === "string" ? section.sectionKey : "",
    title: typeof section.title === "string" ? section.title : "",
    paragraphs: paragraphs.length
      ? paragraphs
      : legacyBodyParagraphs.length
        ? legacyBodyParagraphs
        : legacySummary
          ? [legacySummary]
          : [],
    bullets: bullets.length ? bullets : legacyRecommendations,
    summary: typeof section.summary === "string" ? section.summary : undefined,
    body: typeof section.body === "string" ? section.body : undefined,
    recommendations: legacyRecommendations.length
      ? legacyRecommendations
      : undefined,
  };
}

export function validateStructuredGuide(value: unknown): StructuredGuide {
  if (!value || typeof value !== "object") {
    throw new Error("Gemini svarte ikke med et gyldig objekt.");
  }

  const guide = value as Partial<StructuredGuide>;

  if (typeof guide.title !== "string" || !guide.title.trim()) {
    throw new Error("Strukturert innhold mangler tittel.");
  }

  if (!Array.isArray(guide.stats) || guide.stats.length === 0) {
    throw new Error("Strukturert innhold mangler statistikk.");
  }

  if (!Array.isArray(guide.sections) || guide.sections.length === 0) {
    throw new Error("Strukturert innhold mangler seksjoner.");
  }

  return {
    title: guide.title,
    intro: typeof guide.intro === "string" ? guide.intro : "",
    languageCode:
      typeof guide.languageCode === "string" ? guide.languageCode : undefined,
    stats: guide.stats.map((stat) => ({
      value: typeof stat.value === "string" ? stat.value : "",
      label: typeof stat.label === "string" ? stat.label : "",
    })),
    sections: guide.sections.map(normalizeSection),
  };
}

async function generateGeminiJson(prompt: string): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY er ikke satt i miljøvariablene.");
  }

  const response = await fetch(geminiModelUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: guideSchema,
      },
    }),
  });

  const payload = (await response.json()) as GeminiGenerateContentResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Gemini-kallet feilet.");
  }

  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returnerte ikke strukturert innhold.");
  }

  return parseJsonResponse(text);
}

export async function structureGuideWithGemini(params: {
  filename: string;
  text: string;
}): Promise<StructuredGuide> {
  const prompt = `
You are converting extracted Norwegian PDF text into structured JSON for a multilingual web guide.
This is a preservation task, not a summarization task.
Do not summarize, shorten, simplify, omit, or merge away details.
Do not rewrite into a shorter version.
Preserve all meaningful information from the source text.
Preserve the full meaning and as much of the original wording as possible.
Keep all recommendations, explanations, numbers, caveats, and context.
You may only reorganize into logical sections, paragraphs, and bullet lists.
If text appears duplicated in the source, preserve it unless it is clearly repeated due to PDF extraction artifacts.
Return only valid JSON.

Return KUN gyldig JSON som matcher dette skjemaet:
{
  "title": "string",
  "intro": "string",
  "languageCode": "nb",
  "stats": [{ "value": "string", "label": "string" }],
  "sections": [
    {
      "sectionKey": "string",
      "title": "string",
      "paragraphs": ["string"],
      "bullets": ["string"]
    }
  ]
}

Retningslinjer:
- Behold innholdet på norsk og sett languageCode til "nb".
- Ikke lag en kort veileder. Bevar hele kildeteksten som meningsfulle avsnitt og punktlister.
- Ikke bruk summary som hovedinnholdsfelt; hovedtekst skal ligge i paragraphs og anbefalings-/punktlister i bullets.
- Bruk sectionKey som korte stabile nøkler, for eksempel smarttelefon, sosiale-medier, gaming og generelle-rad når de passer.
- Ikke finn opp tall eller statistikk som ikke finnes i teksten.
- Ikke legg til markdown, forklaring eller tekst utenfor JSON.

Filnavn: ${params.filename}

PDF-tekst:
${params.text}
`;

  return validateStructuredGuide(await generateGeminiJson(prompt));
}

function preserveNonTranslatedFields(
  source: StructuredGuide,
  translated: StructuredGuide,
  targetLanguage: TargetLanguage,
): StructuredGuide {
  return {
    ...translated,
    languageCode: targetLanguage,
    stats: translated.stats.map((stat, index) => ({
      ...stat,
      value: source.stats[index]?.value ?? stat.value,
    })),
    sections: translated.sections.map((section, index) => ({
      ...section,
      sectionKey: source.sections[index]?.sectionKey ?? section.sectionKey,
    })),
  };
}

function guideContentLength(guide: StructuredGuide) {
  return [
    guide.title,
    guide.intro,
    ...guide.stats.flatMap((stat) => [stat.value, stat.label]),
    ...guide.sections.flatMap((section) => [
      section.title,
      ...section.paragraphs,
      ...section.bullets,
    ]),
  ].join(" ").length;
}

function validateTranslationStructure(
  source: StructuredGuide,
  translated: StructuredGuide,
): string[] {
  const mismatches: string[] = [];

  if (translated.sections.length !== source.sections.length) {
    mismatches.push(
      `section count ${translated.sections.length} !== ${source.sections.length}`,
    );
  }

  if (translated.stats.length !== source.stats.length) {
    mismatches.push(
      `stat count ${translated.stats.length} !== ${source.stats.length}`,
    );
  }

  source.stats.forEach((stat, index) => {
    if (translated.stats[index]?.value !== stat.value) {
      mismatches.push(`stat value at ${index} changed`);
    }
  });

  source.sections.forEach((sourceSection, index) => {
    const translatedSection = translated.sections[index];

    if (!translatedSection) {
      mismatches.push(`missing section at ${index}`);
      return;
    }

    if (translatedSection.sectionKey !== sourceSection.sectionKey) {
      mismatches.push(
        `sectionKey at ${index} ${translatedSection.sectionKey} !== ${sourceSection.sectionKey}`,
      );
    }

    if (
      translatedSection.paragraphs.length !== sourceSection.paragraphs.length
    ) {
      mismatches.push(
        `paragraph count for ${sourceSection.sectionKey} ${translatedSection.paragraphs.length} !== ${sourceSection.paragraphs.length}`,
      );
    }

    if (translatedSection.bullets.length !== sourceSection.bullets.length) {
      mismatches.push(
        `bullet count for ${sourceSection.sectionKey} ${translatedSection.bullets.length} !== ${sourceSection.bullets.length}`,
      );
    }
  });

  return mismatches;
}

export async function translateGuideWithGemini(params: {
  guide: StructuredGuide;
  targetLanguage: TargetLanguage;
}): Promise<TranslationValidationResult> {
  const targetLanguageName = targetLanguageNames[params.targetLanguage];

  if (!targetLanguageName) {
    throw new Error("Ugyldig målspråk.");
  }

  const prompt = `
Du skal oversette komplett strukturert norsk FAU-veilederinnhold til ${targetLanguageName}.
Translate the complete JSON content.
Preserve all fields and all array items.
Do not summarize.
Do not shorten.
Do not omit details.
Do not add new facts.
Keep sectionKey unchanged.
Keep stat values unchanged.
Keep the number of paragraphs and bullets the same as the source unless absolutely impossible.
Translate every paragraph and every bullet.
Return only valid JSON.

Returner KUN gyldig JSON med nøyaktig samme struktur som input:
{
  "title": "string",
  "intro": "string",
  "languageCode": "${params.targetLanguage}",
  "stats": [{ "value": "string", "label": "string" }],
  "sections": [
    {
      "sectionKey": "string",
      "title": "string",
      "paragraphs": ["string"],
      "bullets": ["string"]
    }
  ]
}

Regler:
- Oversett all brukerrettet tekst til ${targetLanguageName}.
- Oversett hele JSON-innholdet, inkludert hver label, hver seksjonstittel, hvert avsnitt og hvert punkt.
- Ikke legg til, fjern eller omorganiser felter, seksjoner eller array-elementer.
- Bevar norsk skolekontekst presist: "ungdomsskole" skal oversettes som "lower secondary school" på engelsk, eller tilsvarende forklaring på andre språk.
- Bevar norsk skolekontekst presist: "barneskole" skal oversettes som "primary school" på engelsk, eller tilsvarende forklaring på andre språk.
- Ikke bruk "middle school" for ungdomsskole og ikke overtilpass skoletrinn til andre lands skolesystemer.
- FAU skal fortsatt hete FAU. Legg bare til en kort forklaring der det er naturlig, for eksempel foreldreutvalg/parent council.
- Somali-oversettelser er utkast som skal gjennomgås av mennesker; bruk konservativt, tydelig språk og ikke legg til ny tolkning.
- Ikke endre sectionKey.
- Ikke endre statistikkverdier som 74 %, 79 %, 88 % eller 90 %, og ikke endre andre stat value-felt.
- Sett languageCode til "${params.targetLanguage}".
- Ikke legg til markdown, forklaring eller tekst utenfor JSON.

Input JSON:
${JSON.stringify(params.guide, null, 2)}
`;

  const translated = validateStructuredGuide(await generateGeminiJson(prompt));
  const mismatches = validateTranslationStructure(params.guide, translated);

  if (mismatches.length) {
    console.error("Gemini translation structure mismatch", {
      targetLanguage: params.targetLanguage,
      mismatches,
    });
    throw new Error(adminMissingContentError);
  }

  const preserved = preserveNonTranslatedFields(
    params.guide,
    translated,
    params.targetLanguage,
  );
  const sourceLength = guideContentLength(params.guide);
  const translatedLength = guideContentLength(preserved);
  const comparableLanguage =
    params.targetLanguage !== "ar" && params.targetLanguage !== "so";
  const warning =
    comparableLanguage &&
    sourceLength > 0 &&
    translatedLength / sourceLength < 0.6
      ? lengthWarning
      : undefined;

  if (warning) {
    console.warn("Gemini translation length sanity warning", {
      targetLanguage: params.targetLanguage,
      sourceLength,
      translatedLength,
      ratio: translatedLength / sourceLength,
    });
  }

  return { guide: preserved, warning };
}
