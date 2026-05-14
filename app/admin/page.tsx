const workflowSteps = [
  "Last opp PDF",
  "Hent ut norsk tekst",
  "Oppdater strukturert innhold",
  "Oppdater oversettelser",
  "Publiser ny versjon",
];

const translationStatuses = [
  { language: "Norsk", status: "Publisert", tone: "bg-emerald-100 text-emerald-800" },
  { language: "English", status: "Oppdatert", tone: "bg-emerald-100 text-emerald-800" },
  { language: "Polski", status: "Klar for kontroll", tone: "bg-amber-100 text-amber-800" },
  { language: "Українська", status: "Klar for kontroll", tone: "bg-amber-100 text-amber-800" },
  { language: "العربية", status: "Utkast", tone: "bg-slate-100 text-slate-700" },
  { language: "Soomaali", status: "Utkast", tone: "bg-slate-100 text-slate-700" },
];

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-emerald-50 text-slate-950">
      <header className="bg-emerald-800 px-5 py-5 text-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-100">Hegg skole</p>
            <h1 className="text-2xl font-bold tracking-tight">
              Admin – Hegg skole veileder
            </h1>
          </div>
          <div className="rounded-full bg-white px-4 py-2 text-sm font-bold text-emerald-800 shadow-sm">
            FAU
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-6 px-5 py-6 sm:px-8 lg:grid-cols-3 lg:py-10">
        <section className="rounded-3xl bg-white p-6 shadow-md shadow-emerald-900/10 ring-1 ring-emerald-100">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Current published version
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-emerald-950">
            Versjon 1.0
          </h2>
          <p className="mt-3 leading-7 text-slate-700">
            Publisert innhold for foreldreveilederen. Neste versjon er ikke koblet
            til backend ennå.
          </p>
          <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-900">Status</p>
            <p className="mt-1 text-sm text-slate-700">Aktiv på offentlig side</p>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-md shadow-emerald-900/10 ring-1 ring-emerald-100">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Upload new PDF
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-emerald-950">
            Ny kildefil
          </h2>
          <div className="mt-5 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50 p-6 text-center">
            <p className="font-semibold text-emerald-950">Velg PDF</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Mock for senere opplasting. Ingen fil lagres ennå.
            </p>
          </div>
          <button
            type="button"
            className="mt-5 w-full rounded-full bg-emerald-800 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-900"
          >
            Last opp PDF
          </button>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-md shadow-emerald-900/10 ring-1 ring-emerald-100 lg:row-span-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Processing workflow
          </p>
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
                  <p className="mt-1 text-sm text-slate-700">Mock steg for MVP</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-md shadow-emerald-900/10 ring-1 ring-emerald-100 lg:col-span-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Translation status
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-emerald-950">
            Språk
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {translationStatuses.map((item) => (
              <article
                key={item.language}
                className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 p-4"
              >
                <p className="font-semibold text-emerald-950">{item.language}</p>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.tone}`}>
                  {item.status}
                </span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
