import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PublishGuideRequest = {
  documentId?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PublishGuideRequest;

    if (typeof body.documentId !== "string" || !body.documentId.trim()) {
      return NextResponse.json({ error: "Mangler dokument-ID." }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();

    const { error: archiveError } = await supabase
      .from("documents")
      .update({ status: "archived" })
      .eq("status", "published");

    if (archiveError) {
      throw archiveError;
    }

    const { data: document, error: publishError } = await supabase
      .from("documents")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
      })
      .eq("id", body.documentId)
      .select("id, status, version, published_at")
      .single();

    if (publishError) {
      throw publishError;
    }

    const { error: translationsError } = await supabase
      .from("guide_translations")
      .update({ status: "published" })
      .eq("document_id", body.documentId);

    if (translationsError) {
      throw translationsError;
    }

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error("Guide publish failed", error);

    const message =
      error instanceof Error && error.message.includes("Supabase")
        ? "Supabase miljøvariabler mangler."
        : "Kunne ikke publisere versjonen akkurat nå.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
