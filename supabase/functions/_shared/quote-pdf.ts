// Branded A4 quote sheet: page 1 the quote, page 2+ the quote terms.
// Used by send-quote (email attachment, admin download) and quote-public
// (customer download). Drawn with pdf-lib so it needs no browser.
//
// Standard PDF fonts only (Helvetica) - they can't encode characters outside
// WinAnsi, so every string goes through `t()` first.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "npm:pdf-lib@1.17.1";
import { DISCLAIMER, ENTITY, LICENCE_LINE, aud, assetLabel, longDate, pct, type Row } from "./quote.ts";
import { QUOTE_TERMS_VERSION, quoteTerms } from "./quote-terms.ts";

const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

const C = {
  forest: hex("#3D472B"),
  forestDark: hex("#272E1B"),
  sage: hex("#CCDBB2"),
  sageLight: hex("#F0FAE1"),
  cream: hex("#F5EAD8"),
  ivory: hex("#F9F4ED"),
  ink: hex("#201E1D"),
  muted: hex("#645C50"),
  faint: hex("#A39A8C"),
  line: hex("#E4DACB"),
  white: rgb(1, 1, 1),
};

// Ribbon mark, from src/components/BrandMark.tsx (100x100 viewBox, inner group).
const MARK_LEFT = "M40 8 H24 C14 8 6 16 6 26 V74 C6 84 14 92 24 92 H40 Z";
const MARK_DIAG = "M30 8 H58 L94 92 H49 L20 24 V20 C20 13 25 8 30 8 Z";

const W = 595.28;
const H = 841.89;
const M = 44; // side margin

/** Map to WinAnsi-safe text. */
function t(s: unknown): string {
  return String(s ?? "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/→/g, "->")
    .replace(/\r/g, "")
    .replace(/[^\n\x20-\x7E\xA0-\xFF]/g, "");
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of t(text).split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) line = next;
      else {
        if (line) out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
}

interface Fonts {
  reg: PDFFont;
  bold: PDFFont;
}

function text(page: PDFPage, s: string, x: number, y: number, size: number, font: PDFFont, color = C.ink) {
  page.drawText(t(s), { x, y, size, font, color });
}

function textRight(page: PDFPage, s: string, right: number, y: number, size: number, font: PDFFont, color = C.ink) {
  const v = t(s);
  page.drawText(v, { x: right - font.widthOfTextAtSize(v, size), y, size, font, color });
}

function textCenter(page: PDFPage, s: string, cx: number, y: number, size: number, font: PDFFont, color = C.ink) {
  const v = t(s);
  page.drawText(v, { x: cx - font.widthOfTextAtSize(v, size) / 2, y, size, font, color });
}

/** Header band. Returns the y just below it. */
function header(page: PDFPage, f: Fonts, q: Row, compact: boolean): number {
  const bandH = compact ? 64 : 104;
  page.drawRectangle({ x: 0, y: H - bandH, width: W, height: bandH, color: C.forest });

  const markSize = compact ? 34 : 50;
  const mx = M;
  const my = H - (bandH - markSize) / 2; // top of mark
  const s = (markSize / 100) * 0.78;
  const off = (markSize / 100) * 11;
  page.drawSvgPath(MARK_LEFT, { x: mx + off, y: my - off, scale: s, color: C.sage });
  page.drawSvgPath(MARK_DIAG, { x: mx + off, y: my - off, scale: s, color: C.cream });

  const tx = mx + markSize + 12;
  const nameSize = compact ? 18 : 24;
  const baseY = H - bandH / 2 + (compact ? -2 : 2);
  text(page, "Asset", tx, baseY, nameSize, f.bold, C.white);
  text(page, "MX", tx + f.bold.widthOfTextAtSize("Asset", nameSize), baseY, nameSize, f.bold, C.sage);
  if (!compact) text(page, "TRANSPARENT FINANCE", tx + 1, baseY - 16, 7.5, f.reg, C.sage);

  const r = W - M;
  if (compact) {
    textRight(page, `Quote ${q.quote_number} - terms and conditions`, r, baseY + 2, 9, f.bold, C.white);
  } else {
    textRight(page, "FINANCE QUOTE", r, H - 36, 8, f.reg, C.sage);
    textRight(page, q.quote_number, r, H - 56, 18, f.bold, C.white);
    textRight(page, `Issued ${longDate(q.sent_at ?? q.created_at ?? new Date().toISOString())}`, r, H - 72, 8.5, f.reg, C.sage);
    textRight(page, `Valid until ${longDate(q.valid_until)}`, r, H - 84, 8.5, f.reg, C.sage);
  }
  return H - bandH;
}

function footer(page: PDFPage, f: Fonts, n: number, total: number) {
  page.drawLine({ start: { x: M, y: 40 }, end: { x: W - M, y: 40 }, thickness: 0.5, color: C.line });
  text(page, LICENCE_LINE, M, 28, 7, f.reg, C.faint);
  text(page, `${ENTITY.email}  |  assetmx.com.au`, M, 18, 7, f.reg, C.faint);
  textRight(page, `Page ${n} of ${total}`, W - M, 28, 7, f.reg, C.faint);
}

function row(page: PDFPage, f: Fonts, x: number, w: number, y: number, label: string, value: string, opts: { strong?: boolean; sub?: string } = {}) {
  text(page, label, x, y, 9.5, f.reg, C.muted);
  textRight(page, value, x + w, y, 9.5, opts.strong ? f.bold : f.reg, C.ink);
  let bottom = y - 8;
  if (opts.sub) {
    text(page, opts.sub, x, y - 11, 7.5, f.reg, C.faint);
    bottom = y - 18;
  }
  page.drawLine({ start: { x, y: bottom }, end: { x: x + w, y: bottom }, thickness: 0.5, color: C.line });
  return bottom - 14;
}

export async function renderQuotePdf(q: Row): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`AssetMX quote ${q.quote_number}`);
  doc.setAuthor(`${ENTITY.legalName} (AssetMX)`);
  doc.setSubject(`Finance quote for ${q.customer_name}`);
  doc.setCreator("AssetMX");
  const f: Fonts = {
    reg: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  const contentW = W - M * 2;

  // ── Page 1: the quote ─────────────────────────────────────────────────────
  const p1 = doc.addPage([W, H]);
  let y = header(p1, f, q, false) - 34;

  // Prepared for / asset
  const half = contentW / 2;
  text(p1, "PREPARED FOR", M, y, 7.5, f.reg, C.faint);
  textRight(p1, "ASSET", W - M, y, 7.5, f.reg, C.faint);
  y -= 15;
  text(p1, q.customer_name, M, y, 11, f.bold);
  const assetLines = wrap(assetLabel(q), f.bold, 11, half - 10).slice(0, 2);
  assetLines.forEach((l, i) => textRight(p1, l, W - M, y - i * 14, 11, f.bold));
  let ly = y - 14;
  if (q.business_name) { text(p1, q.business_name, M, ly, 9.5, f.reg, C.muted); ly -= 13; }
  if (q.abn) { text(p1, `ABN ${q.abn}`, M, ly, 9.5, f.reg, C.muted); ly -= 13; }
  y = Math.min(ly, y - assetLines.length * 14) - 14;

  // Personal note
  if (q.message) {
    const lines = wrap(q.message, f.reg, 9.5, contentW - 28).slice(0, 7);
    const boxH = lines.length * 13 + 20;
    p1.drawRectangle({ x: M, y: y - boxH, width: contentW, height: boxH, color: C.ivory, borderColor: C.line, borderWidth: 0.5 });
    lines.forEach((l, i) => text(p1, l, M + 14, y - 18 - i * 13, 9.5, f.reg));
    y -= boxH + 18;
  }

  // Headline repayment
  const heroH = 116;
  p1.drawRectangle({ x: M, y: y - heroH, width: contentW, height: heroH, color: C.sageLight });
  const cx = W / 2;
  textCenter(p1, "MONTHLY REPAYMENT", cx, y - 24, 8, f.reg, C.forest);
  textCenter(p1, aud(q.monthly_repayment), cx, y - 58, 32, f.bold, C.forestDark);
  textCenter(p1, `${aud(q.weekly_repayment)} weekly  |  ${aud(q.fortnightly_repayment)} fortnightly`, cx, y - 78, 9.5, f.reg, C.muted);
  const rateText = `Indicative rate ${pct(q.rate_pct)} p.a.`;
  const pillW = f.bold.widthOfTextAtSize(rateText, 10) + 28;
  p1.drawRectangle({ x: cx - pillW / 2, y: y - 106, width: pillW, height: 20, color: C.white });
  textCenter(p1, rateText, cx, y - 99.5, 10, f.bold, C.forest);
  y -= heroH + 30;

  // Breakdown columns
  const colW = (contentW - 28) / 2;
  const lx = M;
  const rx = M + colW + 28;
  text(p1, "Loan", lx, y, 11, f.bold);
  text(p1, "Fees and totals", rx, y, 11, f.bold);
  let a = y - 20;
  let b = y - 20;
  a = row(p1, f, lx, colW, a, "Asset amount", aud(q.loan_amount));
  a = row(p1, f, lx, colW, a, "Term", `${q.term_months} months`);
  const hasBalloon = Number(q.balloon_amount) > 0;
  a = row(p1, f, lx, colW, a, "Balloon / residual", hasBalloon ? aud(q.balloon_amount) : "None", {
    sub: hasBalloon ? `${q.balloon_percentage}% of asset amount, due at end of term` : undefined,
  });
  a = row(p1, f, lx, colW, a, "Total amount financed", aud(q.amount_financed), { strong: true });

  b = row(p1, f, rx, colW, b, "AssetMX fee (flat, incl. GST)", aud(q.platform_fee), {
    sub: q.fee_financed ? "Financed into the loan" : "Paid upfront at settlement",
  });
  b = row(p1, f, rx, colW, b, "Lender establishment fee", aud(q.establishment_fee), { sub: "Financed into the loan" });
  b = row(p1, f, rx, colW, b, "Total interest", aud(q.total_interest));
  b = row(p1, f, rx, colW, b, "Total cost over the term", aud(q.total_cost), { strong: true });
  y = Math.min(a, b) - 6;

  // Broker comparison
  const saving = Number(q.estimated_saving ?? 0);
  if (saving > 0 && q.broker_rate_pct) {
    const boxH = 50;
    p1.drawRectangle({ x: M, y: y - boxH, width: contentW, height: boxH, color: C.ivory, borderColor: C.line, borderWidth: 0.5 });
    text(p1, "No commission in your rate", M + 14, y - 19, 10, f.bold);
    text(
      p1,
      `A typical broker rate of ${pct(q.broker_rate_pct)} would cost about ${aud(q.broker_total_cost ?? 0, 0)} over the same term.`,
      M + 14, y - 34, 8.5, f.reg, C.muted,
    );
    textRight(p1, "Estimated saving", W - M - 14, y - 19, 7.5, f.reg, C.faint);
    textRight(p1, aud(saving), W - M - 14, y - 36, 14, f.bold, C.forest);
    y -= boxH + 22;
  }

  // Next step
  text(p1, "Next step", M, y, 10, f.bold);
  y -= 14;
  for (const l of wrap(
    "To go ahead, open your quote link and press Accept, or reply to the quote email. Accepting starts your application; it is not a credit contract. See page 2 for the terms of this quote.",
    f.reg, 9, contentW,
  )) {
    text(p1, l, M, y, 9, f.reg, C.muted);
    y -= 12;
  }

  // Disclaimer, pinned above the footer
  const disc = wrap(DISCLAIMER, f.reg, 7.5, contentW);
  disc.forEach((l, i) => text(p1, l, M, 52 + (disc.length - 1 - i) * 10, 7.5, f.reg, C.faint));

  // ── Page 2+: terms ────────────────────────────────────────────────────────
  let page = doc.addPage([W, H]);
  y = header(page, f, q, true) - 30;
  text(page, "Quote terms and conditions", M, y, 15, f.bold);
  y -= 16;
  text(page, `These terms apply to quote ${q.quote_number}. Version ${QUOTE_TERMS_VERSION}.`, M, y, 8.5, f.reg, C.muted);
  y -= 24;

  const ensure = (needed: number) => {
    if (y - needed < 60) {
      page = doc.addPage([W, H]);
      y = header(page, f, q, true) - 36;
    }
  };

  const TS = 8.6; // terms font size
  const TL = 11.4; // terms leading
  quoteTerms(q as never).forEach((clause, i) => {
    ensure(36);
    text(page, `${i + 1}. ${clause.heading}`, M, y, 9.5, f.bold);
    y -= 13;
    for (const para of clause.paragraphs) {
      for (const l of wrap(para, f.reg, TS, contentW)) {
        ensure(TL);
        text(page, l, M, y, TS, f.reg, C.ink);
        y -= TL;
      }
      y -= 3;
    }
    for (const bullet of clause.bullets ?? []) {
      wrap(bullet, f.reg, TS, contentW - 14).forEach((l, j) => {
        ensure(TL);
        if (j === 0) text(page, "-", M + 2, y, TS, f.reg, C.muted);
        text(page, l, M + 14, y, TS, f.reg, C.ink);
        y -= TL;
      });
    }
    y -= 8;
  });

  const pages = doc.getPages();
  pages.forEach((pg, i) => footer(pg, f, i + 1, pages.length));

  return await doc.save();
}

export const pdfFilename = (q: Row) => `AssetMX-quote-${q.quote_number}.pdf`;

/** Base64 for Resend attachments (chunked: spreading a large array overflows the stack). */
export function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
