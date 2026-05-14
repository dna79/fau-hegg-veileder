import { createRequire } from "module";
import { NextResponse } from "next/server";
import type pdfParse from "pdf-parse";
import { requireAdminSession } from "@/lib/admin-auth";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse/lib/pdf-parse.js") as typeof pdfParse;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExtractedPdfResponse = {
  filename: string;
  text: string;
  pageCount: number;
};

export async function POST(request: Request) {
  const unauthorized = await requireAdminSession();

  if (unauthorized) {
    return unauthorized;
  }

  try {
    const formData = await request.formData();
    const upload = formData.get("file");

    if (!(upload instanceof File)) {
      return NextResponse.json({ error: "Mangler PDF-fil." }, { status: 400 });
    }

    const isPdf =
      upload.type === "application/pdf" || upload.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      return NextResponse.json({ error: "Filen må være en PDF." }, { status: 400 });
    }

    const buffer = Buffer.from(await upload.arrayBuffer());
    const result = await pdf(buffer);
    const response: ExtractedPdfResponse = {
      filename: upload.name,
      text: result.text.trim(),
      pageCount: result.numpages,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("PDF extraction failed", error);

    return NextResponse.json(
      {
        error:
          "Kunne ikke hente ut tekst fra PDF-en. Sjekk at filen ikke er passordbeskyttet eller skadet.",
      },
      { status: 500 },
    );
  }
}
