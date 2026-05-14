import Image from "next/image";
import type { ReactNode } from "react";

type AppHeaderProps = {
  actions?: ReactNode;
};

export function AppHeader({ actions }: AppHeaderProps) {
  return (
    <header className="bg-emerald-800 px-5 py-4 text-white shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Image
            src="/hegg-skole-fau-logo.png"
            alt="Hegg skole FAU logo"
            width={52}
            height={52}
            className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14"
            priority
          />
          <div className="min-w-0">
            <p className="truncate text-xl font-semibold text-white">
              Hegg skole FAU
            </p>
            <p className="truncate text-sm font-medium text-emerald-100">
              Skjermbrukveileder
            </p>
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </header>
  );
}
