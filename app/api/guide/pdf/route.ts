import { existsSync } from "fs";
import { join } from "path";
import PDFDocument from "pdfkit";
import {
  createSupabaseBrowserClient,
  hasSupabasePublicConfig,
} from "@/lib/supabase/client";
import {
  fallbackContent,
  languageLabels,
  normalizeLanguage,
  selectGuideLanguage,
  type GuideTranslations,
} from "@/lib/guide-content";
import type { StructuredGuide } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadPublishedTranslations(): Promise<GuideTranslations> {
  if (!hasSupabasePublicConfig()) {
    return fallbackContent;
  }

  try {
    const supabase = createSupabaseBrowserClient();
    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("id")
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (documentError || !document) {
      return fallbackContent;
    }

    const { data: translations, error: translationsError } = await supabase
      .from("guide_translations")
      .select("language_code, content")
      .eq("document_id", document.id)
      .eq("status", "published");

    if (translationsError || !translations?.length) {
      return fallbackContent;
    }

    return Object.fromEntries(
      translations.map((translation) => [
        translation.language_code,
        translation.content as unknown as StructuredGuide,
      ]),
    ) as GuideTranslations;
  } catch (error) {
    console.error("PDF guide fetch failed", error);
    return fallbackContent;
  }
}

function createPdfBuffer(guide: StructuredGuide, languageName: string) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 48,
      bufferPages: true,
      info: {
        Title: `${guide.title} - Hegg skole FAU`,
        Author: "Hegg skole FAU",
      },
    });
    const chunks: Buffer[] = [];
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - doc.page.margins.left - doc.page.margins.right;
    const generatedAt = new Intl.DateTimeFormat("nb-NO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    const pngLogoPath = join(process.cwd(), "public", "hegg-skole-fau-logo.png");
    if (existsSync(pngLogoPath)) {
      try {
        doc.image(pngLogoPath, 48, 42, { width: 42, height: 42 });
      } catch {
        // Logo is optional for PDF generation.
      }
    }

    doc
      .fillColor("#064e3b")
      .font("Helvetica-Bold")
      .fontSize(18)
      .text("Hegg skole FAU", 100, 46)
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#475569")
      .text("Skjermbrukveileder", 100, 68)
      .moveDown(3);

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#047857")
      .text(languageName.toUpperCase(), 48, 112, { characterSpacing: 0.8 });

    doc
      .moveDown(0.8)
      .font("Helvetica-Bold")
      .fontSize(26)
      .fillColor("#0f172a")
      .text(guide.title, { width: contentWidth, lineGap: 4 })
      .moveDown(0.6)
      .font("Helvetica")
      .fontSize(12.5)
      .fillColor("#334155")
      .text(guide.intro, { width: contentWidth, lineGap: 4 })
      .moveDown(1.3);

    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor("#064e3b")
      .text("Tall fra foreldregruppen")
      .moveDown(0.4);

    guide.stats.forEach((stat) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor("#047857")
        .text(stat.value, { continued: true })
        .font("Helvetica")
        .fontSize(11)
        .fillColor("#334155")
        .text(`  ${stat.label}`, { lineGap: 3 });
    });

    doc.moveDown(1.4);

    guide.sections.forEach((section, index) => {
      if (index > 0) {
        doc.moveDown(0.8);
      }

      doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .fillColor("#064e3b")
        .text(section.title, { width: contentWidth, lineGap: 3 })
        .moveDown(0.35)
        .font("Helvetica")
        .fontSize(11.5)
        .fillColor("#334155")
        .text(section.summary || section.body, { width: contentWidth, lineGap: 4 });

      if (section.body && section.body !== section.summary) {
        doc.moveDown(0.35).text(section.body, { width: contentWidth, lineGap: 4 });
      }

      if (section.recommendations.length) {
        doc.moveDown(0.45);
        section.recommendations.forEach((recommendation) => {
          doc.text(`• ${recommendation}`, {
            width: contentWidth,
            indent: 12,
            lineGap: 3,
          });
        });
      }
    });

    const pageRange = doc.bufferedPageRange();
    for (let index = 0; index < pageRange.count; index += 1) {
      doc.switchToPage(index);
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#64748b")
        .text(
          `Hegg skole FAU · Generert ${generatedAt}`,
          doc.page.margins.left,
          doc.page.height - 42,
          {
            width: contentWidth,
            align: "center",
          },
        );
    }

    doc.end();
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedLanguage = normalizeLanguage(url.searchParams.get("lang"));
  const translations = await loadPublishedTranslations();
  const { language, guide } = selectGuideLanguage(translations, requestedLanguage);
  const pdfBuffer = await createPdfBuffer(guide, languageLabels[language]);
  const body = new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" });

  return new Response(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="hegg-skole-fau-veileder-${language}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
