import type { StructuredGuide } from "@/lib/gemini";

export type LanguageCode = "nb" | "en" | "pl" | "uk" | "ar" | "so";

export type GuideTranslations = Partial<Record<LanguageCode, StructuredGuide>>;

export const languageLabels: Record<LanguageCode, string> = {
  nb: "Norsk",
  en: "English",
  pl: "Polski",
  uk: "Українська",
  ar: "العربية",
  so: "Soomaali",
};

export const languageDirections: Record<LanguageCode, "ltr" | "rtl"> = {
  nb: "ltr",
  en: "ltr",
  pl: "ltr",
  uk: "ltr",
  ar: "rtl",
  so: "ltr",
};

export const fallbackContent: Record<"nb" | "en", StructuredGuide> = {
  nb: {
    title: "Trygg og balansert skjermbruk",
    intro: "Veileder for foreldre om smarttelefon, sosiale medier og gaming.",
    languageCode: "nb",
    stats: [
      { value: "74 %", label: "ønsker felles retningslinjer" },
      { value: "79 %", label: "ønsker håndheving av aldersgrenser" },
      { value: "88 %", label: "ønsker mobilfrie arrangementer" },
      { value: "90 %", label: "mener skolen bør være mobilfri sone" },
    ],
    sections: [
      {
        sectionKey: "smarttelefon",
        title: "Smarttelefon",
        paragraphs: [
          "Felles forventninger gjør det enklere å vente, begrense bruk og holde mobilen unna når barn trenger ro.",
        ],
        bullets: [],
      },
      {
        sectionKey: "sosiale-medier",
        title: "Sosiale medier",
        paragraphs: [
          "Aldersgrenser, personvern og respekt på nett bør være tydelige temaer hjemme og i foreldregruppen.",
        ],
        bullets: [],
      },
      {
        sectionKey: "gaming",
        title: "Gaming",
        paragraphs: [
          "Avtal tid, innhold og pauser på forhånd, og følg med på språk, pengebruk og hvem barna spiller med.",
        ],
        bullets: [],
      },
      {
        sectionKey: "generelle-rad",
        title: "Generelle råd",
        paragraphs: [
          "Snakk sammen tidlig, stå samlet som foreldre og lag enkle regler som kan følges i hverdagen.",
        ],
        bullets: [],
      },
    ],
  },
  en: {
    title: "Safe and balanced screen use",
    intro: "Guide for parents about smartphones, social media and gaming.",
    languageCode: "en",
    stats: [
      { value: "74 %", label: "want shared guidelines" },
      { value: "79 %", label: "want age limits to be enforced" },
      { value: "88 %", label: "want phone-free events" },
      { value: "90 %", label: "believe school should be a phone-free zone" },
    ],
    sections: [
      {
        sectionKey: "smarttelefon",
        title: "Smartphones",
        paragraphs: [
          "Shared expectations make it easier to wait, limit use and keep phones away when children need calm.",
        ],
        bullets: [],
      },
      {
        sectionKey: "sosiale-medier",
        title: "Social media",
        paragraphs: [
          "Age limits, privacy and respectful behavior online should be clear topics at home and among parents.",
        ],
        bullets: [],
      },
      {
        sectionKey: "gaming",
        title: "Gaming",
        paragraphs: [
          "Agree on time, content and breaks in advance, and pay attention to language, spending and who children play with.",
        ],
        bullets: [],
      },
      {
        sectionKey: "generelle-rad",
        title: "General advice",
        paragraphs: [
          "Start conversations early, stay aligned as parents and make simple rules that work in everyday life.",
        ],
        bullets: [],
      },
    ],
  },
};

export function normalizeLanguage(value: string | null): LanguageCode {
  if (
    value === "nb" ||
    value === "en" ||
    value === "pl" ||
    value === "uk" ||
    value === "ar" ||
    value === "so"
  ) {
    return value;
  }

  return "nb";
}

export function selectGuideLanguage(
  translations: GuideTranslations,
  requestedLanguage: LanguageCode,
) {
  const selectedLanguage = translations[requestedLanguage]
    ? requestedLanguage
    : translations.en
      ? "en"
      : "nb";

  return {
    language: selectedLanguage,
    guide: translations[selectedLanguage] ?? fallbackContent.nb,
  };
}
