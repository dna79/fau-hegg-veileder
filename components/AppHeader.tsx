import Image from "next/image";
import type { ReactNode } from "react";

type AppHeaderProps = {
  title?: string;
  actions?: ReactNode;
};

export function AppHeader({ title = "FAU veileder", actions }: AppHeaderProps) {
  return (
    <header className="bg-emerald-800 px-5 py-5 text-white shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Image
            src="/hegg-skole-fau-logo.png"
            alt="Hegg skole FAU logo"
            width={52}
            height={52}
            className="h-12 w-12 shrink-0 object-contain sm:h-13 sm:w-13"
            priority
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-emerald-100">Hegg skole FAU</p>
            <h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </header>
  );
}
