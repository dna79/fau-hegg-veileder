"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import type { StructuredGuide } from "@/lib/gemini";
import { logoutAdmin } from "./actions";

const workflowSteps = [
  "Last opp PDF",
  "Hent ut norsk tekst",
  "Oppdater strukturert innhold",
  "Oppdater oversettelser",
  "Publiser ny versjon",
];

const translationTargets = [
  { code: "en", label: "English", statusLabel: "English", needsReview: false },
  { code: "pl", label: "Polish", statusLabel: "Polski", needsReview: false },
  { code: "uk", label: "Ukrainian", statusLabel: "Українська", needsReview: false },
  { code: "ar", label: "Arabic", statusLabel: "العربية", needsReview: false },
  { code: "so", label: "Somali", statusLabel: "Soomaali", needsReview: true },
] as const;

type TranslationTarget = (typeof translationTargets)[number]["code"];

type ExtractedPdf = {
  filename: string;
  text: string;
  pageCount: number;
};

type SaveResponse = {
  documentId?: string;
  status?: string;
  savedLanguages?: string[];
  error?: string;
};

type PublishResponse = {
  success?: boolean;
  document?: {
    id: string;
    version: string;
    status: string;
  };
  error?: string;
};

export default function AdminPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedPdf, setExtractedPdf] = useState<ExtractedPdf | null>(null);
  const [structuredGuide, setStructuredGuide] = useState<StructuredGuide | null>(null);
  const [translatedGuides, setTranslatedGuides] = useState<
    Partial<Record<TranslationTarget, StructuredGuide>>
  >({});
  const [translatedLanguage, setTranslatedLanguage] =
    useState<TranslationTarget | null>(null);
  const [version, setVersion] = useState("1.0");
  const [savedDraft, setSavedDraft] = useState<{
    documentId: string;
    status: string;
    savedLanguages: string[];
  } | null>(null);
  const [error, setError] = useState("");
  const [structureError, setStructureError] = useState("");
  const [translationError, setTranslationError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStructuring, setIsStructuring] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const translatedGuide = translatedLanguage
    ? translatedGuides[translatedLanguage] ?? null
    : null;

  function resetDerivedState() {
    setExtractedPdf(null);
    setStructuredGuide(null);
    setTranslatedGuides({});
    setTranslatedLanguage(null);
    setStructureError("");
    setTranslationError("");
    setSaveError("");
    setSaveMessage("");
    setSavedDraft(null);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setSelectedFile(file);
    setError("");
    resetDerivedState();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setError("Velg en PDF-fil først.");
      return;
    }

    setIsLoading(true);
    setError("");
    resetDerivedState();

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch("/api/admin/extract-pdf", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Kunne ikke hente ut tekst fra PDF.");
      }

      setExtractedPdf(payload);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Kunne ikke hente ut tekst fra PDF.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStructureGuide() {
    if (!extractedPdf) {
      setStructureError("Hent ut tekst fra PDF-en først.");
      return;
    }

    setIsStructuring(true);
    setStructureError("");
    setTranslationError("");
    setSaveError("");
    setSaveMessage("");
    setSavedDraft(null);
    setStructuredGuide(null);
    setTranslatedGuides({});
    setTranslatedLanguage(null);

    try {
      const response = await fetch("/api/admin/structure-guide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: extractedPdf.filename,
          text: extractedPdf.text,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Kunne ikke strukturere innholdet.");
      }

      setStructuredGuide(payload);
    } catch (guideError) {
      setStructureError(
        guideError instanceof Error
          ? guideError.message
          : "Kunne ikke strukturere innholdet.",
      );
    } finally {
      setIsStructuring(false);
    }
  }

  async function handleTranslateGuide(targetLanguage: TranslationTarget) {
    if (!structuredGuide) {
      setTranslationError("Strukturer innholdet før du oversetter.");
      return;
    }

    setIsTranslating(true);
    setTranslationError("");
    setSaveError("");
    setSaveMessage("");
    setSavedDraft(null);
    setTranslatedLanguage(targetLanguage);

    try {
      const response = await fetch("/api/admin/translate-guide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          guide: structuredGuide,
          targetLanguage,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Kunne ikke oversette innholdet.");
      }

      setTranslatedGuides((current) => ({
        ...current,
        [targetLanguage]: payload,
      }));
    } catch (guideError) {
      setTranslationError(
        guideError instanceof Error
          ? guideError.message
          : "Kunne ikke oversette innholdet.",
      );
    } finally {
      setIsTranslating(false);
    }
  }

  async function handleSaveDraft() {
    if (!structuredGuide) {
      setSaveError("Strukturer innholdet før du lagrer.");
      return;
    }

    setIsSaving(true);
    setSaveError("");
    setSaveMessage("");

    try {
      const response = await fetch("/api/admin/save-guide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceFilename: extractedPdf?.filename ?? selectedFile?.name ?? null,
          version,
          translations: {
            nb: structuredGuide,
            ...translatedGuides,
          },
        }),
      });
      const payload = (await response.json()) as SaveResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Kunne ikke lagre veilederen.");
      }

      if (!payload.documentId || !payload.status || !payload.savedLanguages) {
        throw new Error("Utkastet ble lagret, men svaret manglet dokument-ID.");
      }

      setSavedDraft({
        documentId: payload.documentId,
        status: payload.status,
        savedLanguages: payload.savedLanguages,
      });
      setSaveMessage(`Utkast ${payload.documentId} er lagret.`);
    } catch (saveErrorValue) {
      setSaveError(
        saveErrorValue instanceof Error
          ? saveErrorValue.message
          : "Kunne ikke lagre veilederen.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublishGuide() {
    if (!savedDraft) {
      setSaveError("Lagre et utkast før du publiserer.");
      return;
    }

    setIsSaving(true);
    setSaveError("");
    setSaveMessage("");

    try {
      const response = await fetch("/api/admin/publish-guide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId: savedDraft.documentId,
        }),
      });
      const payload = (await response.json()) as PublishResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Kunne ikke publisere veilederen.");
      }

      setSavedDraft((current) =>
        current ? { ...current, status: payload.document?.status ?? "published" } : current,
      );
      setSaveMessage(`Versjon ${payload.document?.version ?? version} er publisert.`);
    } catch (publishErrorValue) {
      setSaveError(
        publishErrorValue instanceof Error
          ? publishErrorValue.message
          : "Kunne ikke publisere veilederen.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-emerald-50 text-slate-950">
      <AppHeader
        actions={
          <form action={logoutAdmin}>
            <button
              type="submit"
              className="rounded-full bg-white px-4 py-2 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50"
            >
              Logg ut
            </button>
          </form>
        }
      />

      <div className="mx-auto grid max-w-5xl gap-6 px-5 py-6 sm:px-8 lg:grid-cols-3 lg:py-10">
        <section className="rounded-3xl bg-white p-6 shadow-md shadow-emerald-900/10 ring-1 ring-emerald-100">
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-emerald-950">
            Versjon
          </h2>
          <p className="mt-3 leading-7 text-slate-700">
            Angi versjonsnummeret som skal brukes når utkastet lagres.
          </p>
          <label className="mt-5 block">
            <span className="text-sm font-semibold text-emerald-900">Versjon</span>
            <input
              type="text"
              value={version}
              onChange={(event) => setVersion(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none ring-0 transition focus:border-emerald-500"
            />
          </label>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-md shadow-emerald-900/10 ring-1 ring-emerald-100">
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-emerald-950">
            Last opp PDF
          </h2>
          <form className="mt-5" onSubmit={handleSubmit}>
            <label className="block rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50 p-6 text-center transition hover:border-emerald-400">
              <span className="font-semibold text-emerald-950">Velg PDF</span>
              <span className="mt-2 block text-sm leading-6 text-slate-700">
                {selectedFile
                  ? selectedFile.name
                  : "Last opp en PDF for å hente ut tekst server-side."}
              </span>
              <input
                type="file"
                name="file"
                accept="application/pdf"
                className="sr-only"
                onChange={handleFileChange}
              />
            </label>

            {error ? (
              <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700 ring-1 ring-red-100">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!selectedFile || isLoading}
              className="mt-5 w-full rounded-full bg-emerald-800 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            >
              {isLoading ? "Henter ut tekst..." : "Last opp PDF"}
            </button>
          </form>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-md shadow-emerald-900/10 ring-1 ring-emerald-100 lg:row-span-2">
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-emerald-950">
            Arbeidsflyt
          </h2>
          <ol className="mt-6 space-y-4">
            {workflowSteps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-sm font-bold text-white">
                  {index + 1}
                </span>
                <div className="min-w-0 rounded-2xl bg-emerald-50 px-4 py-3">
                  <p className="font-semibold text-emerald-950">{step}</p>
                  <p className="mt-1 text-sm text-slate-700">
                    {index === 1 && extractedPdf
                      ? `${extractedPdf.pageCount} sider behandlet`
                      : index === 2 && structuredGuide
                        ? `${structuredGuide.sections.length} seksjoner klare`
                        : index === 3 && Object.keys(translatedGuides).length > 0
                          ? `${Object.keys(translatedGuides).length} oversettelser klare`
                          : index === 4 && savedDraft
                            ? savedDraft.status === "published"
                              ? "Versjon publisert"
                              : "Utkast lagret"
                            : "Venter på neste steg"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-md shadow-emerald-900/10 ring-1 ring-emerald-100 lg:col-span-2">
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-emerald-950">
            Status
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <article className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 p-4">
              <p className="font-semibold text-emerald-950">Norsk</p>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                {structuredGuide ? "Klar" : "Venter"}
              </span>
            </article>
            {translationTargets.map((target) => (
              <article
                key={target.code}
                className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 p-4"
              >
                <p className="font-semibold text-emerald-950">{target.statusLabel}</p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    translatedGuides[target.code]
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {translatedGuides[target.code]
                    ? target.needsReview
                      ? "Til gjennomgang"
                      : "Klar"
                    : "Utkast"}
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-md shadow-emerald-900/10 ring-1 ring-emerald-100 lg:col-span-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-emerald-950">
                Uthentet tekst
              </h2>
            </div>
            {extractedPdf ? (
              <div className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-800">
                {extractedPdf.pageCount} sider
              </div>
            ) : null}
          </div>

          <div className="mt-5 min-h-48 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
            {isLoading ? (
              <p className="text-sm font-medium text-slate-700">
                Leser PDF og henter ut tekst...
              </p>
            ) : extractedPdf ? (
              <>
                <p className="mb-3 text-sm font-semibold text-emerald-950">
                  {extractedPdf.filename}
                </p>
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
                  {extractedPdf.text || "Ingen tekst funnet i PDF-en."}
                </pre>
              </>
            ) : (
              <p className="text-sm font-medium text-slate-700">
                Velg og last opp en PDF for å se forhåndsvisning av tekst her.
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={!extractedPdf || isStructuring}
            onClick={handleStructureGuide}
            className="mt-5 rounded-full bg-emerald-800 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
          >
            {isStructuring ? "Strukturerer innhold..." : "Strukturer innhold"}
          </button>

          {structureError ? (
            <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700 ring-1 ring-red-100">
              {structureError}
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-md shadow-emerald-900/10 ring-1 ring-emerald-100 lg:col-span-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-emerald-950">
                Strukturert innhold
              </h2>
            </div>
            {structuredGuide ? (
              <div className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-800">
                {structuredGuide.sections.length} seksjoner
              </div>
            ) : null}
          </div>

          <div className="mt-5 min-h-48 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
            {isStructuring ? (
              <p className="text-sm font-medium text-slate-700">
                Sender norsk tekst til Gemini og bygger struktur...
              </p>
            ) : structuredGuide ? (
              <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
                {JSON.stringify(structuredGuide, null, 2)}
              </pre>
            ) : (
              <p className="text-sm font-medium text-slate-700">
                Når PDF-teksten er hentet ut kan du strukturere innholdet her.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-md shadow-emerald-900/10 ring-1 ring-emerald-100 lg:col-span-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-emerald-950">
                Oversettelser
              </h2>
            </div>
            {translatedLanguage ? (
              <div className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-800">
                {
                  translationTargets.find((target) => target.code === translatedLanguage)
                    ?.label
                }
              </div>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {translationTargets.map((target) => (
              <button
                key={target.code}
                type="button"
                disabled={!structuredGuide || isTranslating}
                onClick={() => handleTranslateGuide(target.code)}
                className="rounded-full bg-emerald-800 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
              >
                {isTranslating && translatedLanguage === target.code
                  ? "Oversetter..."
                  : target.label}
              </button>
            ))}
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-700">
            Somali-oversettelser markeres som til gjennomgang før publisering.
          </p>

          {translationError ? (
            <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700 ring-1 ring-red-100">
              {translationError}
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-md shadow-emerald-900/10 ring-1 ring-emerald-100 lg:col-span-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-emerald-950">
                Oversatt innhold
              </h2>
            </div>
            {translatedGuide ? (
              <div className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-800">
                {translatedGuide.sections.length} seksjoner
              </div>
            ) : null}
          </div>

          <div className="mt-5 min-h-48 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
            {isTranslating ? (
              <p className="text-sm font-medium text-slate-700">
                Sender strukturert innhold til Gemini for oversetting...
              </p>
            ) : translatedGuide ? (
              <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
                {JSON.stringify(translatedGuide, null, 2)}
              </pre>
            ) : (
              <p className="text-sm font-medium text-slate-700">
                Når innholdet er strukturert kan du oversette det til et valgt språk
                her.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-md shadow-emerald-900/10 ring-1 ring-emerald-100 lg:col-span-3">
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-emerald-950">
            Lagring og publisering
          </h2>
          <p className="mt-3 leading-7 text-slate-700">
            Lagring bruker Supabase på serveren. Publisering blir tilgjengelig når
            et utkast er lagret.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={!structuredGuide || isSaving}
              onClick={handleSaveDraft}
              className="rounded-full bg-white px-5 py-3 text-sm font-bold text-emerald-800 shadow-sm ring-1 ring-emerald-200 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
            >
              {isSaving ? "Lagrer..." : "Lagre utkast"}
            </button>
            <button
              type="button"
              disabled={!savedDraft || savedDraft.status === "published" || isSaving}
              onClick={handlePublishGuide}
              className="rounded-full bg-emerald-800 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            >
              {isSaving ? "Publiserer..." : "Publiser versjon"}
            </button>
          </div>

          {savedDraft ? (
            <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900 ring-1 ring-emerald-100">
              <p className="font-bold">Dokument-ID: {savedDraft.documentId}</p>
              <p className="mt-1">Status: {savedDraft.status}</p>
              <p className="mt-1">
                Språk lagret: {savedDraft.savedLanguages.join(", ")}
              </p>
            </div>
          ) : null}

          {saveError ? (
            <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700 ring-1 ring-red-100">
              {saveError}
            </div>
          ) : null}
          {saveMessage ? (
            <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800 ring-1 ring-emerald-100">
              {saveMessage}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
