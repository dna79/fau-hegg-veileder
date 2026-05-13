export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-900 sm:px-10">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 sm:p-10">
        <header className="mb-8 border-b border-zinc-200 pb-6">
          <h1 className="text-3xl font-bold tracking-tight">Hegg skole – Skjermbrukveileder / Screen-Use Guide</h1>
          <p className="mt-3 text-base text-zinc-700">
            MVP for FAU: practical, shared expectations for healthy screen use at school and at home.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-xl border border-zinc-200 p-5">
            <h2 className="mb-3 text-xl font-semibold">Norsk</h2>
            <ul className="list-disc space-y-2 pl-5 text-zinc-800">
              <li>Skjerm brukes med tydelig formål: læring, kreativitet eller kommunikasjon.</li>
              <li>Ta korte pauser minst hvert 30. minutt: reis deg, strekk deg, se ut av vinduet.</li>
              <li>Mobil holdes borte i undervisning med mindre lærer sier noe annet.</li>
              <li>Vis respekt på nett: ingen deling av bilder/video av andre uten samtykke.</li>
              <li>Etter kl. 20 anbefales skjermfri tid for bedre søvn og ro.</li>
            </ul>
          </article>

          <article className="rounded-xl border border-zinc-200 p-5">
            <h2 className="mb-3 text-xl font-semibold">English</h2>
            <ul className="list-disc space-y-2 pl-5 text-zinc-800">
              <li>Use screens with a clear purpose: learning, creativity, or communication.</li>
              <li>Take short breaks at least every 30 minutes: stand up, stretch, look away.</li>
              <li>Phones stay away during lessons unless a teacher allows otherwise.</li>
              <li>Be respectful online: do not share photos/videos of others without consent.</li>
              <li>After 8:00 PM, screen-free time is recommended for better sleep and calm.</li>
            </ul>
          </article>
        </section>

        <section className="mt-8 rounded-xl bg-zinc-100 p-5">
          <h3 className="text-lg font-semibold">Kontakt / Contact</h3>
          <p className="mt-2 text-zinc-700">
            Innspill fra foresatte sendes til FAU via skolens vanlige kommunikasjonskanal.
            <br />
            Parent feedback can be sent to the parent committee through the school&apos;s standard communication channel.
          </p>
        </section>
      </div>
    </main>
  );
}