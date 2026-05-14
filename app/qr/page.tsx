"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { AppHeader } from "@/components/AppHeader";

export default function QrPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [origin, setOrigin] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SITE_URL && typeof window !== "undefined") {
      const timeout = window.setTimeout(() => {
        setOrigin(window.location.origin);
      }, 0);

      return () => window.clearTimeout(timeout);
    }
  }, []);

  const guideUrl = useMemo(() => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin;
    return siteUrl ? `${siteUrl.replace(/\/$/, "")}/` : "/";
  }, [origin]);

  function handleDownload() {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const link = document.createElement("a");
    link.download = "hegg-skole-fau-veileder-qr.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(guideUrl);
    setCopyMessage("Lenke kopiert");
    window.setTimeout(() => setCopyMessage(""), 2200);
  }

  return (
    <main className="min-h-screen bg-emerald-50 text-slate-950">
      <AppHeader />

      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-6 sm:px-8 lg:py-10">
        <section className="rounded-3xl bg-white p-6 shadow-md shadow-emerald-900/10 ring-1 ring-emerald-100 sm:p-8">
          <h1 className="text-3xl font-bold tracking-tight text-emerald-950 sm:text-4xl">
            QR-kode til veilederen
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-700">
            Bruk QR-koden for å dele veilederen med foresatte.
          </p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-md shadow-emerald-900/10 ring-1 ring-emerald-100 sm:p-8">
          <div className="mx-auto flex max-w-sm flex-col items-center">
            <div className="relative rounded-3xl bg-white p-4 shadow-sm ring-1 ring-emerald-100">
              <QRCodeCanvas
                ref={canvasRef}
                value={guideUrl}
                size={280}
                level="H"
                includeMargin
                fgColor="#064e3b"
                bgColor="#ffffff"
              />
              <div className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-white text-base font-black text-emerald-800 shadow-sm ring-1 ring-emerald-100">
                FAU
              </div>
            </div>

            <p className="mt-5 break-all text-center text-sm font-medium text-slate-700">
              {guideUrl}
            </p>
            <p className="mt-3 text-center text-sm text-slate-600">
              Test QR-koden med mobilkamera før den deles.
            </p>

            <div className="mt-6 grid w-full gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-full bg-emerald-800 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-900"
              >
                Last ned PNG
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="rounded-full bg-white px-5 py-3 text-sm font-bold text-emerald-800 shadow-sm ring-1 ring-emerald-200 transition hover:bg-emerald-50"
              >
                Kopier lenke
              </button>
            </div>

            {copyMessage ? (
              <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">
                {copyMessage}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
