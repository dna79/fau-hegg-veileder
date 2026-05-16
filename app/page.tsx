"use client";

import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import {
  fallbackContent,
  languageLabels,
  type GuideTranslations,
  type LanguageCode,
} from "@/lib/guide-content";

type GuideApiResponse = {
  translations?: GuideTranslations;
};

export default function Home() {
  const [language, setLanguage] = useState<LanguageCode>("nb");
  const [publishedContent, setPublishedContent] = useState<GuideTranslations | null>(
    null,
  );
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPublishedGuide() {
      try {
        const response = await fetch("/api/guide", { cache: "no-store" });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as GuideApiResponse;

        if (
          isMounted &&
          payload.translations &&
          Object.keys(payload.translations).length
        ) {
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

  const content: GuideTranslations = publishedContent ?? fallbackContent;
  const availableLanguages = useMemo(
    () =>
      (Object.keys(content) as LanguageCode[]).filter(
        (code) => content[code] && languageLabels[code],
      ),
    [content],
  );
  const selectedLanguage = content[language] ? language : "nb";
  const selected = content[selectedLanguage] ?? fallbackContent.nb;

  async function handleDownloadPdf() {
    setIsDownloadingPdf(true);
    setPdfError("");

    try {
      const response = await fetch(`/api/guide/pdf?lang=${selectedLanguage}`);

      if (!response.ok) {
        throw new Error("PDF generation failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `hegg-skole-fau-veileder-${selectedLanguage}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setPdfError("Kunne ikke lage PDF. Prøv igjen senere.");
    } finally {
      setIsDownloadingPdf(false);
    }
  }

  return (
    <main className="min-h-screen bg-emerald-50 text-slate-950">
      <AppHeader />

      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-6 sm:px-8 lg:py-10">
        <section className="rounded-3xl bg-white p-6 shadow-md shadow-emerald-900/10 ring-1 ring-emerald-100 sm:p-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2 rounded-3xl bg-emerald-100 p-1">
              {availableLanguages.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setLanguage(option);
                    setPdfError("");
                  }}
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

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="rounded-full bg-emerald-800 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            >
              {isDownloadingPdf ? "Lager PDF..." : "Last ned PDF"}
            </button>
          </div>

          {pdfError ? (
            <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700 ring-1 ring-red-100">
              {pdfError}
            </div>
          ) : null}

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
