import { NextResponse } from "next/server";
import {
  structureGuideWithGemini,
  validateStructuredGuide,
} from "@/lib/gemini";
import { requireAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StructureGuideRequest = {
  filename?: unknown;
  text?: unknown;
};

export async function POST(request: Request) {
  const unauthorized = await requireAdminSession();

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = (await request.json()) as StructureGuideRequest;

    if (typeof body.filename !== "string" || !body.filename.trim()) {
      return NextResponse.json({ error: "Mangler filnavn." }, { status: 400 });
    }

    if (typeof body.text !== "string" || !body.text.trim()) {
      return NextResponse.json(
        { error: "Mangler tekst fra PDF-en." },
        { status: 400 },
      );
    }

    const structuredGuide = await structureGuideWithGemini({
      filename: body.filename,
      text: body.text,
    });

    return NextResponse.json(validateStructuredGuide(structuredGuide));
  } catch (error) {
    console.error("Guide structuring failed", error);

    const message =
      error instanceof Error && error.message.includes("GEMINI_API_KEY")
        ? "Gemini API-nøkkel mangler. Legg til GEMINI_API_KEY i miljøvariablene."
        : "Kunne ikke strukturere innholdet akkurat nå. Sjekk teksten og prøv igjen.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
