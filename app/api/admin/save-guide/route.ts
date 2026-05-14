import { NextResponse } from "next/server";
import { validateStructuredGuide, type StructuredGuide } from "@/lib/gemini";
import { requireAdminSession } from "@/lib/admin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SaveGuideRequest = {
  sourceFilename?: unknown;
  version?: unknown;
  translations?: unknown;
};

const supportedLanguageCodes = ["nb", "en", "pl", "uk", "ar", "so"] as const;

function isSupportedLanguageCode(value: string) {
  return supportedLanguageCodes.includes(
    value as (typeof supportedLanguageCodes)[number],
  );
}

function normalizeTranslations(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new Error("Mangler oversettelser.");
  }

  return Object.entries(value as Record<string, unknown>).reduce(
    (acc, [languageCode, guide]) => {
      if (isSupportedLanguageCode(languageCode)) {
        acc[languageCode] = validateStructuredGuide(guide);
      }

      return acc;
    },
    {} as Record<string, StructuredGuide>,
  );
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminSession();

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = (await request.json()) as SaveGuideRequest;
    const version =
      typeof body.version === "string" && body.version.trim()
        ? body.version.trim()
        : "1.0";
    const sourceFilename =
      typeof body.sourceFilename === "string" ? body.sourceFilename : null;
    const translations = normalizeTranslations(body.translations);
    const norwegianGuide = translations.nb;

    if (!norwegianGuide) {
      return NextResponse.json(
        { error: "Mangler norsk strukturert innhold." },
        { status: 400 },
      );
    }

    const supabase = createSupabaseServerClient();
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .insert({
        title: norwegianGuide.title,
        version,
        status: "draft",
        source_filename: sourceFilename,
        published_at: null,
      })
      .select("id, status, version")
      .single();

    if (documentError) {
      throw documentError;
    }

    const translationRows = Object.entries(translations).map(
      ([languageCode, guide]) => ({
        document_id: document.id,
        language_code: languageCode,
        content: guide as unknown as Json,
        status: "draft" as const,
      }),
    );

    const { error: translationsError } = await supabase
      .from("guide_translations")
      .insert(translationRows);

    if (translationsError) {
      throw translationsError;
    }

    return NextResponse.json({
      documentId: document.id,
      status: document.status,
      savedLanguages: translationRows.map((row) => row.language_code),
    });
  } catch (error) {
    console.error("Guide save failed", error);

    const message =
      error instanceof Error && error.message.includes("Supabase")
        ? "Supabase miljøvariabler mangler."
        : "Kunne ikke lagre utkastet akkurat nå.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
