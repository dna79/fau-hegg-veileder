"use client";

import { useActionState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { loginAdmin } from "./actions";

export default function AdminLoginPage() {
  const [state, formAction, isPending] = useActionState(loginAdmin, {});

  return (
    <main className="min-h-screen bg-emerald-50 text-slate-950">
      <AppHeader />

      <div className="mx-auto flex max-w-md flex-col gap-6 px-5 py-8 sm:px-8 lg:py-12">
        <section className="rounded-3xl bg-white p-6 shadow-md shadow-emerald-900/10 ring-1 ring-emerald-100 sm:p-8">
          <h2 className="text-3xl font-bold tracking-tight text-emerald-950">
            Admininnlogging
          </h2>

          <form action={formAction} className="mt-6 space-y-5">
            <label className="block">
              <span className="text-sm font-semibold text-emerald-900">Passord</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                className="mt-2 w-full rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500"
              />
            </label>

            {state.error ? (
              <div className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700 ring-1 ring-red-100">
                {state.error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-full bg-emerald-800 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            >
              {isPending ? "Logger inn..." : "Logg inn"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
