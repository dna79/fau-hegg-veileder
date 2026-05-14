"use client";

import { useState } from "react";

type Language = "no" | "en";

const content = {
  no: {
    languageLabel: "Norsk",
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
        title: "Smarttelefon",
        text: "Felles forventninger gjør det enklere å vente, begrense bruk og holde mobilen unna når barn trenger ro.",
      },
      {
        title: "Sosiale medier",
        text: "Aldersgrenser, personvern og respekt på nett bør være tydelige temaer hjemme og i foreldregruppen.",
      },
      {
        title: "Gaming",
        text: "Avtal tid, innhold og pauser på forhånd, og følg med på språk, pengebruk og hvem barna spiller med.",
      },
      {
        title: "Generelle råd",
        text: "Snakk sammen tidlig, stå samlet som foreldre og lag enkle regler som kan følges i hverdagen.",
      },
    ],
  },
  en: {
    languageLabel: "English",
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
        title: "Smartphones",
        text: "Shared expectations make it easier to wait, limit use and keep phones away when children need calm.",
      },
      {
        title: "Social media",
        text: "Age limits, privacy and respectful behavior online should be clear topics at home and among parents.",
      },
      {
        title: "Gaming",
        text: "Agree on time, content and breaks in advance, and pay attention to language, spending and who children play with.",
      },
      {
        title: "General advice",
        text: "Start conversations early, stay aligned as parents and make simple rules that work in everyday life.",
      },
    ],
  },
};

export default function Home() {
  const [language, setLanguage] = useState<Language>("no");
  const selected = content[language];

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
          <div className="mb-6 inline-flex rounded-full bg-emerald-100 p-1">
            {(["no", "en"] as const).map((option) => (
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
                {content[option].languageLabel}
              </button>
            ))}
          </div>

          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-700">
              {selected.languageLabel}
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
              key={stat.label}
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
              key={section.title}
              className="rounded-2xl bg-white p-6 shadow-sm shadow-emerald-900/10 ring-1 ring-emerald-100"
            >
              <h3 className="text-xl font-bold text-emerald-950">{section.title}</h3>
              <p className="mt-3 leading-7 text-slate-700">{section.text}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
