"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

const menuItems = [
  { label: "Veileder", href: "/" },
  { label: "Admin", href: "/admin" },
  { label: "QR-kode", href: "/qr" },
];

type AppHeaderProps = {
  actions?: ReactNode;
};

export function AppHeader({ actions }: AppHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logoSrc, setLogoSrc] = useState("/hegg-skole-fau-logo.png");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        isMenuOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isMenuOpen]);

  return (
    <header className="bg-emerald-800 px-5 py-4 text-white shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src={logoSrc}
            alt="Hegg skole FAU logo"
            width={60}
            height={60}
            className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14"
            priority
            onError={() => setLogoSrc("/hegg-skole-fau-logo.svg")}
          />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-white sm:text-xl">
              Hegg skole FAU
            </p>
            <p className="truncate text-sm font-medium text-emerald-100">
              Skjermbrukveileder
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {actions ? <div className="hidden sm:block">{actions}</div> : null}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label={isMenuOpen ? "Lukk meny" : "Åpne meny"}
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((current) => !current)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/15"
            >
              <span className="sr-only">{isMenuOpen ? "Lukk meny" : "Åpne meny"}</span>
              <span className="flex flex-col gap-1.5" aria-hidden="true">
                <span className="block h-0.5 w-5 rounded-full bg-white" />
                <span className="block h-0.5 w-5 rounded-full bg-white" />
                <span className="block h-0.5 w-5 rounded-full bg-white" />
              </span>
            </button>

            {isMenuOpen ? (
              <nav className="absolute right-0 top-14 z-50 w-56 rounded-2xl bg-white p-2 text-slate-950 shadow-xl ring-1 ring-emerald-900/10">
                {menuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="block rounded-xl px-4 py-3 text-base font-semibold text-emerald-950 transition hover:bg-emerald-50"
                  >
                    {item.label}
                  </Link>
                ))}
                {actions ? (
                  <div className="border-t border-emerald-100 p-2 sm:hidden">
                    {actions}
                  </div>
                ) : null}
              </nav>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}