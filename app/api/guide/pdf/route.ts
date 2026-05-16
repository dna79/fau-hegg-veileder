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

type PdfDoc = PDFKit.PDFDocument & { __generatedAt?: string; __pageNumber?: number };

type TextStyle = {
  width: number;
  font: "Helvetica" | "Helvetica-Bold";
  fontSize: number;
  color: string;
  lineGap?: number;
  paragraphGap?: number;
  x?: number;
};

const colors = {
  green: "#006B4F",
  text: "#1F2937",
  muted: "#4B5563",
  divider: "#CFEFE2",
};

const footerReserve = 34;
const sectionGap = 14;

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

function contentWidth(doc: PdfDoc) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function bottomLimit(doc: PdfDoc) {
  return doc.page.height - doc.page.margins.bottom - footerReserve;
}

function availableHeight(doc: PdfDoc) {
  return bottomLimit(doc) - doc.y;
}

function renderFooter(doc: PdfDoc) {
  const generatedAt = doc.__generatedAt;
  const pageNumber = doc.__pageNumber ?? 1;

  if (!generatedAt) {
    return;
  }

  const previousY = doc.y;
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#6B7280")
    .text(
      `Hegg skole FAU - Generert ${generatedAt} - Side ${pageNumber}`,
      doc.page.margins.left,
      doc.page.height - doc.page.margins.bottom - 10,
      {
        width: contentWidth(doc),
        align: "center",
        lineBreak: false,
      },
    );
  doc.y = previousY;
}

function addPageIfNeeded(doc: PdfDoc, requiredHeight: number) {
  if (doc.y + requiredHeight <= bottomLimit(doc)) {
    return false;
  }

  renderFooter(doc);
  doc.addPage();
  doc.__pageNumber = (doc.__pageNumber ?? 1) + 1;
  return true;
}

function ensureSpace(doc: PdfDoc, requiredHeight: number) {
  addPageIfNeeded(doc, requiredHeight);
}

function applyTextStyle(doc: PdfDoc, style: TextStyle) {
  doc.font(style.font).fontSize(style.fontSize).fillColor(style.color);
}

function textHeight(doc: PdfDoc, text: string, style: TextStyle) {
  applyTextStyle(doc, style);
  return doc.heightOfString(text, {
    width: style.width,
    lineGap: style.lineGap ?? 0,
  });
}

function takeFittingText(doc: PdfDoc, text: string, style: TextStyle, maxHeight: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  let chunk = "";
  let consumed = 0;

  for (const word of words) {
    const candidate = chunk ? `${chunk} ${word}` : word;
    const candidateHeight = textHeight(doc, candidate, style);

    if (candidateHeight <= maxHeight || consumed === 0) {
      chunk = candidate;
      consumed += 1;
    } else {
      break;
    }
  }

  return {
    chunk,
    rest: words.slice(consumed).join(" "),
  };
}

function renderWrappedText(doc: PdfDoc, text: string | undefined, style: TextStyle) {
  const paragraphs = (text ?? "")
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  paragraphs.forEach((paragraph, paragraphIndex) => {
    let remaining = paragraph;

    while (remaining) {
      ensureSpace(doc, style.fontSize * 2.5);
      applyTextStyle(doc, style);

      const maxHeight = availableHeight(doc);
      const fullHeight = textHeight(doc, remaining, style);
      const x = style.x ?? doc.page.margins.left;

      if (fullHeight <= maxHeight) {
        doc.text(remaining, x, doc.y, {
          width: style.width,
          lineGap: style.lineGap ?? 0,
        });
        remaining = "";
      } else {
        const { chunk, rest } = takeFittingText(doc, remaining, style, maxHeight);
        doc.text(chunk, x, doc.y, {
          width: style.width,
          lineGap: style.lineGap ?? 0,
        });
        remaining = rest;

        if (remaining) {
          doc.addPage();
        }
      }
    }

    if (paragraphIndex < paragraphs.length - 1 || style.paragraphGap) {
      doc.y += style.paragraphGap ?? 6;
    }
  });
}

function renderHeader(doc: PdfDoc) {
  const left = doc.page.margins.left;
  const width = contentWidth(doc);

  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(colors.green)
    .text("Hegg skole FAU", left, doc.y, { width });

  doc
    .font("Helvetica")
    .fontSize(9.5)
    .fillColor(colors.muted)
    .text("Skjermbrukveileder", left, doc.y + 2, { width });

  doc.y += 12;
  doc
    .moveTo(left, doc.y)
    .lineTo(left + width, doc.y)
    .lineWidth(0.8)
    .strokeColor(colors.divider)
    .stroke();
  doc.y += 22;
}

function renderStats(doc: PdfDoc, guide: StructuredGuide) {
  const width = contentWidth(doc);
  const left = doc.page.margins.left;

  ensureSpace(doc, 88);
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(colors.green)
    .text("Tall fra foreldregruppen", left, doc.y, { width });
  doc.y += 8;

  guide.stats.forEach((stat) => {
    renderWrappedText(doc, `${stat.value} - ${stat.label}`, {
      width,
      font: "Helvetica",
      fontSize: 10.5,
      color: colors.text,
      lineGap: 3,
      paragraphGap: 3,
    });
  });

  doc.y += 10;
}

function renderBullet(doc: PdfDoc, text: string) {
  const left = doc.page.margins.left;
  const bulletX = left + 4;
  const textX = left + 16;
  const width = contentWidth(doc) - 16;

  ensureSpace(doc, 20);
  doc.font("Helvetica").fontSize(10.5).fillColor(colors.text).text("-", bulletX, doc.y, {
    width: 8,
    lineBreak: false,
  });

  renderWrappedText(doc, text, {
    x: textX,
    width,
    font: "Helvetica",
    fontSize: 10.5,
    color: colors.text,
    lineGap: 3,
    paragraphGap: 4,
  });
}

function renderSection(doc: PdfDoc, section: StructuredGuide["sections"][number]) {
  const width = contentWidth(doc);
  const title = section.title?.trim();
  const summary = section.summary?.trim();
  const body = section.body?.trim();
  const recommendations = section.recommendations?.filter((item) => item.trim()) ?? [];

  ensureSpace(doc, 80);

  if (title) {
    renderWrappedText(doc, title, {
      width,
      font: "Helvetica-Bold",
      fontSize: 15,
      color: colors.green,
      lineGap: 3,
      paragraphGap: 6,
    });
  }

  if (summary) {
    renderWrappedText(doc, summary, {
      width,
      font: "Helvetica",
      fontSize: 10.8,
      color: colors.text,
      lineGap: 4,
      paragraphGap: 5,
    });
  }

  if (body && body !== summary) {
    renderWrappedText(doc, body, {
      width,
      font: "Helvetica",
      fontSize: 10.8,
      color: colors.text,
      lineGap: 4,
      paragraphGap: 5,
    });
  }

  recommendations.forEach((recommendation) => renderBullet(doc, recommendation));

  doc.y += sectionGap;
}

function createPdfBuffer(guide: StructuredGuide, languageName: string, language: string) {
  return new Promise<Buffer>((resolve, reject) => {
    const doc: PdfDoc = new PDFDocument({
      size: "A4",
      margin: 48,
      compress: false,
      info: {
        Title: `${guide.title} - Hegg skole FAU`,
        Author: "Hegg skole FAU",
      },
    });
    const chunks: Buffer[] = [];
    const width = contentWidth(doc);
    const generatedAt = new Intl.DateTimeFormat("nb-NO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    doc.__generatedAt = generatedAt;
    doc.__pageNumber = 1;

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    renderHeader(doc);

    renderWrappedText(doc, guide.title, {
      width,
      font: "Helvetica-Bold",
      fontSize: 22,
      color: colors.green,
      lineGap: 4,
      paragraphGap: 8,
    });

    renderWrappedText(doc, guide.intro, {
      width,
      font: "Helvetica",
      fontSize: 11,
      color: colors.text,
      lineGap: 4,
      paragraphGap: 7,
    });

    renderWrappedText(doc, languageName, {
      width,
      font: "Helvetica",
      fontSize: 9.5,
      color: colors.muted,
      lineGap: 3,
      paragraphGap: 16,
    });

    renderStats(doc, guide);
    doc.y += 8;

    guide.sections.forEach((section) => renderSection(doc, section));

    console.log("PDF sections rendered", {
      language,
      sectionCount: guide.sections.length,
      pageCount: doc.__pageNumber ?? 1,
    });

    renderFooter(doc);
    doc.end();
  });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const requestedLanguage = normalizeLanguage(url.searchParams.get("lang"));
    const translations = await loadPublishedTranslations();
    const { language, guide } = selectGuideLanguage(translations, requestedLanguage);
    const pdfBuffer = await createPdfBuffer(guide, languageLabels[language], language);
    const body = new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" });

    return new Response(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="hegg-skole-fau-veileder-${language}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("PDF generation failed", error);

    return Response.json(
      { error: "Kunne ikke lage PDF. Prøv igjen senere." },
      { status: 500 },
    );
  }
}