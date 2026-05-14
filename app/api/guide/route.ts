import { NextResponse } from "next/server";
import {
  createSupabaseBrowserClient,
  hasSupabasePublicConfig,
} from "@/lib/supabase/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasSupabasePublicConfig()) {
    return NextResponse.json(
      { error: "Ingen publisert veileder er tilgjengelig." },
      { status: 404 },
    );
  }

  try {
    const supabase = createSupabaseBrowserClient();
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (documentError) {
      throw documentError;
    }

    if (!document) {
      return NextResponse.json(
        { error: "Ingen publisert veileder er tilgjengelig." },
        { status: 404 },
      );
    }

    const [
      { data: translations, error: translationsError },
      { data: languages, error: languagesError },
    ] = await Promise.all([
      supabase
        .from("guide_translations")
        .select("language_code, content")
        .eq("document_id", document.id)
        .eq("status", "published"),
      supabase
        .from("languages")
        .select("language_code, name, native_name, enabled, sort_order")
        .eq("enabled", true)
        .order("sort_order", { ascending: true }),
    ]);

    if (translationsError) {
      throw translationsError;
    }

    if (languagesError) {
      throw languagesError;
    }

    return NextResponse.json({
      document,
      languages: languages ?? [],
      translations: Object.fromEntries(
        (translations ?? []).map((translation) => [
          translation.language_code,
          translation.content,
        ]),
      ),
    });
  } catch (error) {
    console.error("Guide fetch failed", error);

    return NextResponse.json(
      { error: "Kunne ikke hente publisert veileder." },
      { status: 500 },
    );
  }
}
