import { NextResponse } from "next/server";
import {
  translateGuideWithGemini,
  validateStructuredGuide,
  type TargetLanguage,
} from "@/lib/gemini";
import { requireAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supportedLanguages = ["en", "pl", "uk", "ar", "so"] as const;

type TranslateGuideRequest = {
  guide?: unknown;
  targetLanguage?: unknown;
};

function isTargetLanguage(value: unknown): value is TargetLanguage {
  return (
    typeof value === "string" &&
    supportedLanguages.includes(value as TargetLanguage)
  );
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminSession();

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = (await request.json()) as TranslateGuideRequest;

    if (!isTargetLanguage(body.targetLanguage)) {
      return NextResponse.json({ error: "Ugyldig målspråk." }, { status: 400 });
    }

    const guide = validateStructuredGuide(body.guide);
    const translatedGuide = await translateGuideWithGemini({
      guide,
      targetLanguage: body.targetLanguage,
    });

    return NextResponse.json(translatedGuide);
  } catch (error) {
    console.error("Guide translation failed", error);

    const message =
      error instanceof Error && error.message.includes("GEMINI_API_KEY")
        ? "Gemini API-nøkkel mangler. Legg til GEMINI_API_KEY i miljøvariablene."
        : "Kunne ikke oversette innholdet akkurat nå. Sjekk strukturen og prøv igjen.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
