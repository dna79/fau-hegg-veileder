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
  type LanguageCode,
} from "@/lib/guide-content";
import type { StructuredGuide } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PdfDoc = PDFKit.PDFDocument & {
  __generatedAt?: string;
  __pageNumber?: number;
  __labels?: PdfLabels;
};

type FontName = "Regular" | "Bold";

type TextStyle = {
  width: number;
  font: FontName;
  fontSize: number;
  color: string;
  lineGap?: number;
  paragraphGap?: number;
  x?: number;
};

type PdfLabels = {
  statsTitle: string;
  generated: string;
  page: string;
  guideSubtitle: string;
};

const pdfLabels: Record<LanguageCode, PdfLabels> = {
  nb: {
    statsTitle: "Tall fra foreldregruppen",
    generated: "Generert",
    page: "Side",
    guideSubtitle: "Skjermbrukveileder",
  },
  en: {
    statsTitle: "Results from the parent group",
    generated: "Generated",
    page: "Page",
    guideSubtitle: "Screen-use guide",
  },
  pl: {
    statsTitle: "Wyniki ankiety wśród rodziców",
    generated: "Wygenerowano",
    page: "Strona",
    guideSubtitle: "Przewodnik dotyczący korzystania z ekranów",
  },
  uk: {
    statsTitle: "Результати опитування батьків",
    generated: "Створено",
    page: "Сторінка",
    guideSubtitle: "Посібник щодо використання екранів",
  },
  ar: {
    statsTitle: "نتائج مجموعة أولياء الأمور",
    generated: "تم الإنشاء",
    page: "صفحة",
    guideSubtitle: "دليل استخدام الشاشات",
  },
  so: {
    statsTitle: "Natiijooyinka waalidiinta",
    generated: "La sameeyay",
    page: "Bogga",
    guideSubtitle: "Hagaha isticmaalka shaashadda",
  },
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

function fontPaths() {
  return {
    regular: join(process.cwd(), "public", "fonts", "NotoSans-Regular.ttf"),
    bold: join(process.cwd(), "public", "fonts", "NotoSans-Bold.ttf"),
  };
}

function registerFonts(doc: PdfDoc) {
  const fonts = fontPaths();
  const missingFonts = Object.values(fonts).filter((fontPath) => !existsSync(fontPath));

  if (missingFonts.length) {
    console.error("PDF font files missing", { missingFonts });
    throw new Error("PDF-fontene mangler på serveren.");
  }

  doc.registerFont("Regular", fonts.regular);
  doc.registerFont("Bold", fonts.bold);
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
  const labels = doc.__labels ?? pdfLabels.nb;

  if (!generatedAt) {
    return;
  }

  const previousY = doc.y;
  doc
    .font("Regular")
    .fontSize(8)
    .fillColor("#6B7280")
    .text(
      `Hegg skole FAU - ${labels.generated} ${generatedAt} - ${labels.page} ${pageNumber}`,
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

function startNewPage(doc: PdfDoc) {
  renderFooter(doc);
  doc.addPage();
  doc.__pageNumber = (doc.__pageNumber ?? 1) + 1;
}

function addPageIfNeeded(doc: PdfDoc, requiredHeight: number) {
  if (doc.y + requiredHeight <= bottomLimit(doc)) {
    return false;
  }

  startNewPage(doc);
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
          startNewPage(doc);
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
  const labels = doc.__labels ?? pdfLabels.nb;

  doc
    .font("Bold")
    .fontSize(13)
    .fillColor(colors.green)
    .text("Hegg skole FAU", left, doc.y, { width });

  doc
    .font("Regular")
    .fontSize(9.5)
    .fillColor(colors.muted)
    .text(labels.guideSubtitle, left, doc.y + 2, { width });

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
  const labels = doc.__labels ?? pdfLabels.nb;
  const gap = 22;
  const columnWidth = (width - gap) / 2;
  const valueWidth = 44;
  const rowGap = 9;
  const valueStyle: TextStyle = {
    width: valueWidth,
    font: "Bold",
    fontSize: 10.8,
    color: colors.green,
    lineGap: 3,
  };
  const labelStyle: TextStyle = {
    width: columnWidth - valueWidth,
    font: "Regular",
    fontSize: 10.2,
    color: colors.text,
    lineGap: 3,
  };

  ensureSpace(doc, 88);
  doc
    .font("Bold")
    .fontSize(12)
    .fillColor(colors.green)
    .text(labels.statsTitle, left, doc.y, { width });
  doc.y += 10;

  for (let index = 0; index < guide.stats.length; index += 2) {
    const rowStats = guide.stats.slice(index, index + 2);
    const rowHeight = Math.max(
      ...rowStats.map((stat) =>
        Math.max(
          textHeight(doc, stat.value, valueStyle),
          textHeight(doc, stat.label, labelStyle),
        ),
      ),
    );

    ensureSpace(doc, rowHeight + rowGap);

    if (rowHeight > availableHeight(doc)) {
      startNewPage(doc);
    }

    const rowY = doc.y;
    rowStats.forEach((stat, columnIndex) => {
      const columnX = left + columnIndex * (columnWidth + gap);
      applyTextStyle(doc, valueStyle);
      doc.text(stat.value, columnX, rowY, {
        width: valueWidth,
        lineGap: valueStyle.lineGap,
      });
      applyTextStyle(doc, labelStyle);
      doc.text(stat.label, columnX + valueWidth, rowY, {
        width: labelStyle.width,
        lineGap: labelStyle.lineGap,
      });
    });

    doc.y = rowY + rowHeight + rowGap;
  }

  doc.y += 8;
}
function renderBullet(doc: PdfDoc, text: string) {
  const left = doc.page.margins.left;
  const bulletX = left + 2;
  const textX = left + 16;
  const textWidth = contentWidth(doc) - 16;
  const fontSize = 10.5;
  const lineGap = 3;
  const spacing = 4;
  const cleanText = text.trim();

  if (!cleanText) {
    return;
  }

  const textStyle: TextStyle = {
    width: textWidth,
    font: "Regular",
    fontSize,
    color: colors.text,
    lineGap,
  };
  const requiredHeight = Math.max(fontSize + lineGap, textHeight(doc, cleanText, textStyle));

  ensureSpace(doc, requiredHeight + spacing);

  if (requiredHeight > availableHeight(doc)) {
    startNewPage(doc);
  }

  const bulletY = doc.y;
  applyTextStyle(doc, textStyle);
  doc.text("•", bulletX, bulletY, {
    width: 10,
    lineBreak: false,
  });
  doc.text(cleanText, textX, bulletY, {
    width: textWidth,
    lineGap,
  });
  doc.y = bulletY + requiredHeight + spacing;
}
function normalizeSectionText(text: string) {
  return text
    .toLowerCase()
    .replace(/[\W_]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function replaceEnglishSchoolTerms(text: string) {
  return text
    .replace(/middle school/gi, "lower secondary school")
    .replace(/elementary school students/gi, "primary school pupils")
    .replace(/elementary school/gi, "primary school");
}

function normalizeGuideForPdf(guide: StructuredGuide, language: LanguageCode): StructuredGuide {
  if (language !== "en") {
    return guide;
  }

  return {
    ...guide,
    title: replaceEnglishSchoolTerms(guide.title),
    intro: replaceEnglishSchoolTerms(guide.intro),
    stats: guide.stats.map((stat) => ({
      ...stat,
      label: replaceEnglishSchoolTerms(stat.label),
    })),
    sections: guide.sections.map((section) => ({
      ...section,
      title: replaceEnglishSchoolTerms(section.title),
      summary: replaceEnglishSchoolTerms(section.summary),
      body: replaceEnglishSchoolTerms(section.body),
      recommendations: section.recommendations.map(replaceEnglishSchoolTerms),
    })),
  };
}

function chooseSectionText(summary?: string, body?: string) {
  const cleanSummary = summary?.trim() ?? "";
  const cleanBody = body?.trim() ?? "";

  if (!cleanBody) {
    return cleanSummary;
  }

  if (!cleanSummary) {
    return cleanBody;
  }

  const normalizedSummary = normalizeSectionText(cleanSummary);
  const normalizedBody = normalizeSectionText(cleanBody);
  const overlaps =
    normalizedSummary.includes(normalizedBody) ||
    normalizedBody.includes(normalizedSummary);

  if (overlaps) {
    return cleanBody.length > cleanSummary.length ? cleanBody : cleanSummary;
  }

  if (cleanBody.length > cleanSummary.length * 1.35) {
    return cleanBody;
  }

  return cleanSummary;
}

function renderSection(doc: PdfDoc, section: StructuredGuide["sections"][number]) {
  const width = contentWidth(doc);
  const title = section.title?.trim();
  const sectionText = chooseSectionText(section.summary, section.body);
  const recommendations = section.recommendations?.filter((item) => item.trim()) ?? [];

  ensureSpace(doc, 80);

  if (title) {
    renderWrappedText(doc, title, {
      width,
      font: "Bold",
      fontSize: 15,
      color: colors.green,
      lineGap: 3,
      paragraphGap: 6,
    });
  }

  if (sectionText) {
    renderWrappedText(doc, sectionText, {
      width,
      font: "Regular",
      fontSize: 10.8,
      color: colors.text,
      lineGap: 4,
      paragraphGap: 5,
    });
  }

  recommendations.forEach((recommendation) => renderBullet(doc, recommendation));

  doc.y += sectionGap;
}

function createPdfBuffer(guide: StructuredGuide, languageName: string, language: LanguageCode) {
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
    doc.__labels = pdfLabels[language] ?? pdfLabels.nb;

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    registerFonts(doc);
    renderHeader(doc);

    renderWrappedText(doc, guide.title, {
      width,
      font: "Bold",
      fontSize: 22,
      color: colors.green,
      lineGap: 4,
      paragraphGap: 8,
    });

    renderWrappedText(doc, guide.intro, {
      width,
      font: "Regular",
      fontSize: 11,
      color: colors.text,
      lineGap: 4,
      paragraphGap: 7,
    });

    renderWrappedText(doc, languageName, {
      width,
      font: "Regular",
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
    if (requestedLanguage === "ar") {
      // Arabic requires RTL layout and glyph shaping. PDFKit does not handle this reliably in the current MVP.
      return Response.json(
        { error: "PDF for arabisk er ikke tilgjengelig ennå. Bruk webversjonen." },
        { status: 501 },
      );
    }

    const translations = await loadPublishedTranslations();
    const { language, guide } = selectGuideLanguage(translations, requestedLanguage);
    const pdfGuide = normalizeGuideForPdf(guide, language);
    const pdfBuffer = await createPdfBuffer(pdfGuide, languageLabels[language], language);
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