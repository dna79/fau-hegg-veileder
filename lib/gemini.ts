export type StructuredGuide = {
  title: string;
  intro: string;
  stats: Array<{
    value: string;
    label: string;
  }>;
  sections: Array<{
    sectionKey: string;
    title: string;
    summary: string;
    body: string;
    recommendations: string[];
  }>;
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
          summary: { type: "STRING" },
          body: { type: "STRING" },
          recommendations: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
        },
        required: ["sectionKey", "title", "summary", "body", "recommendations"],
      },
    },
  },
  required: ["title", "intro", "stats", "sections"],
};

const targetLanguageNames = {
  en: "English",
  pl: "Polish",
  uk: "Ukrainian",
  ar: "Arabic",
  so: "Somali",
} as const;

export type TargetLanguage = keyof typeof targetLanguageNames;

function parseJsonResponse(text: string): unknown {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  return JSON.parse(withoutFence);
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
    stats: guide.stats.map((stat) => ({
      value: typeof stat.value === "string" ? stat.value : "",
      label: typeof stat.label === "string" ? stat.label : "",
    })),
    sections: guide.sections.map((section) => ({
      sectionKey: typeof section.sectionKey === "string" ? section.sectionKey : "",
      title: typeof section.title === "string" ? section.title : "",
      summary: typeof section.summary === "string" ? section.summary : "",
      body: typeof section.body === "string" ? section.body : "",
      recommendations: Array.isArray(section.recommendations)
        ? section.recommendations.filter(
            (recommendation): recommendation is string =>
              typeof recommendation === "string",
          )
        : [],
    })),
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
Du skal strukturere norsk tekst hentet ut fra en PDF for FAU ved Hegg skole.

Returner KUN gyldig JSON som matcher dette skjemaet:
{
  "title": "string",
  "intro": "string",
  "stats": [{ "value": "string", "label": "string" }],
  "sections": [
    {
      "sectionKey": "string",
      "title": "string",
      "summary": "string",
      "body": "string",
      "recommendations": ["string"]
    }
  ]
}

Retningslinjer:
- Behold innholdet på norsk.
- Lag korte, foreldreorienterte tekster.
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
): StructuredGuide {
  return {
    ...translated,
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

export async function translateGuideWithGemini(params: {
  guide: StructuredGuide;
  targetLanguage: TargetLanguage;
}): Promise<StructuredGuide> {
  const targetLanguageName = targetLanguageNames[params.targetLanguage];

  if (!targetLanguageName) {
    throw new Error("Ugyldig målspråk.");
  }

  const prompt = `
Du skal oversette strukturert norsk FAU-veilederinnhold til ${targetLanguageName}.

Returner KUN gyldig JSON med nøyaktig samme struktur som input:
{
  "title": "string",
  "intro": "string",
  "stats": [{ "value": "string", "label": "string" }],
  "sections": [
    {
      "sectionKey": "string",
      "title": "string",
      "summary": "string",
      "body": "string",
      "recommendations": ["string"]
    }
  ]
}

Regler:
- Oversett all brukerrettet tekst til ${targetLanguageName}.
- Bevar norsk skolekontekst presist: "ungdomsskole" skal oversettes som "lower secondary school" på engelsk, eller tilsvarende forklaring på andre språk.
- Bevar norsk skolekontekst presist: "barneskole" skal oversettes som "primary school" på engelsk, eller tilsvarende forklaring på andre språk.
- Ikke bruk "middle school" for ungdomsskole og ikke overtilpass skoletrinn til andre lands skolesystemer.
- FAU skal fortsatt hete FAU. Legg bare til en kort forklaring der det er naturlig, for eksempel foreldreutvalg/parent council.
- Somali-oversettelser er utkast som skal gjennomgås av mennesker; bruk konservativt, tydelig språk og ikke legg til ny tolkning.
- Ikke endre sectionKey.
- Ikke endre statistikkverdier som 74 %, 79 %, 88 % eller 90 %.
- Ikke legg til, fjern eller omorganiser felter.
- Ikke legg til markdown, forklaring eller tekst utenfor JSON.

Input JSON:
${JSON.stringify(params.guide, null, 2)}
`;

  const translated = validateStructuredGuide(await generateGeminiJson(prompt));

  if (
    translated.stats.length !== params.guide.stats.length ||
    translated.sections.length !== params.guide.sections.length ||
    translated.sections.some(
      (section, index) =>
        section.recommendations.length !==
        params.guide.sections[index]?.recommendations.length,
    )
  ) {
    throw new Error("Gemini endret strukturen under oversetting.");
  }

  return preserveNonTranslatedFields(params.guide, translated);
}
