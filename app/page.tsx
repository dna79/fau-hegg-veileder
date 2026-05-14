"use client";

import { useEffect, useMemo, useState } from "react";
import type { StructuredGuide } from "@/lib/gemini";

type LanguageCode = "nb" | "en" | "pl" | "uk" | "ar" | "so";

type GuideApiResponse = {
  translations?: Partial<Record<LanguageCode, StructuredGuide>>;
};

const languageLabels: Record<LanguageCode, string> = {
  nb: "Norsk",
  en: "English",
  pl: "Polski",
  uk: "Українська",
  ar: "العربية",
  so: "Soomaali",
};

const fallbackContent: Record<"nb" | "en", StructuredGuide> = {
  nb: {
    title: "Trygg og balansert skjermbruk",
    intro: "Veileder for foreldre om smarttelefon, sosiale medier og gaming.",
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
        summary:
          "Felles forventninger gjør det enklere å vente, begrense bruk og holde mobilen unna når barn trenger ro.",
        body: "Felles forventninger gjør det enklere å vente, begrense bruk og holde mobilen unna når barn trenger ro.",
        recommendations: [],
      },
      {
        sectionKey: "sosiale-medier",
        title: "Sosiale medier",
        summary:
          "Aldersgrenser, personvern og respekt på nett bør være tydelige temaer hjemme og i foreldregruppen.",
        body: "Aldersgrenser, personvern og respekt på nett bør være tydelige temaer hjemme og i foreldregruppen.",
        recommendations: [],
      },
      {
        sectionKey: "gaming",
        title: "Gaming",
        summary:
          "Avtal tid, innhold og pauser på forhånd, og følg med på språk, pengebruk og hvem barna spiller med.",
        body: "Avtal tid, innhold og pauser på forhånd, og følg med på språk, pengebruk og hvem barna spiller med.",
        recommendations: [],
      },
      {
        sectionKey: "generelle-rad",
        title: "Generelle råd",
        summary:
          "Snakk sammen tidlig, stå samlet som foreldre og lag enkle regler som kan følges i hverdagen.",
        body: "Snakk sammen tidlig, stå samlet som foreldre og lag enkle regler som kan følges i hverdagen.",
        recommendations: [],
      },
    ],
  },
  en: {
    title: "Safe and balanced screen use",
    intro: "Guide for parents about smartphones, social media and gaming.",
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
        summary:
          "Shared expectations make it easier to wait, limit use and keep phones away when children need calm.",
        body: "Shared expectations make it easier to wait, limit use and keep phones away when children need calm.",
        recommendations: [],
      },
      {
        sectionKey: "sosiale-medier",
        title: "Social media",
        summary:
          "Age limits, privacy and respectful behavior online should be clear topics at home and among parents.",
        body: "Age limits, privacy and respectful behavior online should be clear topics at home and among parents.",
        recommendations: [],
      },
      {
        sectionKey: "gaming",
        title: "Gaming",
        summary:
          "Agree on time, content and breaks in advance, and pay attention to language, spending and who children play with.",
        body: "Agree on time, content and breaks in advance, and pay attention to language, spending and who children play with.",
        recommendations: [],
      },
      {
        sectionKey: "generelle-rad",
        title: "General advice",
        summary:
          "Start conversations early, stay aligned as parents and make simple rules that work in everyday life.",
        body: "Start conversations early, stay aligned as parents and make simple rules that work in everyday life.",
        recommendations: [],
      },
    ],
  },
};

export default function Home() {
  const [language, setLanguage] = useState<LanguageCode>("nb");
  const [publishedContent, setPublishedContent] =
    useState<Partial<Record<LanguageCode, StructuredGuide>> | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPublishedGuide() {
      try {
        const response = await fetch("/api/guide", { cache: "no-store" });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as GuideApiResponse;

        if (isMounted && payload.translations && Object.keys(payload.translations).length) {
          setPublishedContent(payload.translations);
        }
      } catch {
        if (isMounted) {
          setPublishedContent(null);
        }
      }
    }

    void loadPublishedGuide();

    return () => {
      isMounted = false;
    };
  }, []);

  const content: Partial<Record<LanguageCode, StructuredGuide>> =
    publishedContent ?? fallbackContent;
  const availableLanguages = useMemo(
    () =>
      (Object.keys(content) as LanguageCode[]).filter(
        (code) => content[code] && languageLabels[code],
      ),
    [content],
  );
  const selectedLanguage = content[language] ? language : "nb";
  const selected = content[selectedLanguage] ?? fallbackContent.nb;

  return (
    <main className="min-h-screen bg-emerald-50 text-slate-950">
      <header className="bg-emerald-800 px-5 py-5 text-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-100">Hegg skole</p>
            <h1 className="text-2xl font-bold tracking-tight">FAU veileder</h1>
          </div>
          <div className="rounded-full bg-white px-4 py-2 text-sm font-bold text-emerald-800 shadow-sm">
            FAU
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-6 sm:px-8 lg:py-10">
        <section className="rounded-3xl bg-white p-6 shadow-md shadow-emerald-900/10 ring-1 ring-emerald-100 sm:p-8">
          <div className="mb-6 flex flex-wrap gap-2 rounded-3xl bg-emerald-100 p-1">
            {availableLanguages.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLanguage(option)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  language === option
                    ? "bg-emerald-800 text-white shadow-sm"
                    : "text-emerald-900 hover:bg-white"
                }`}
                aria-pressed={language === option}
              >
                {languageLabels[option]}
              </button>
            ))}
          </div>

          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-700">
              {languageLabels[selectedLanguage]}
            </p>
            <h2 className="text-4xl font-bold tracking-tight text-emerald-950 sm:text-5xl">
              {selected.title}
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-700">{selected.intro}</p>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {selected.stats.map((stat) => (
            <article
              key={`${stat.value}-${stat.label}`}
              className="rounded-2xl bg-white p-5 shadow-sm shadow-emerald-900/10 ring-1 ring-emerald-100"
            >
              <p className="text-3xl font-bold text-emerald-800">{stat.value}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{stat.label}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {selected.sections.map((section) => (
            <article
              key={section.sectionKey}
              className="rounded-2xl bg-white p-6 shadow-sm shadow-emerald-900/10 ring-1 ring-emerald-100"
            >
              <h3 className="text-xl font-bold text-emerald-950">{section.title}</h3>
              <p className="mt-3 leading-7 text-slate-700">
                {section.summary || section.body}
              </p>
              {section.recommendations.length ? (
                <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
                  {section.recommendations.map((recommendation) => (
                    <li key={recommendation}>• {recommendation}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
