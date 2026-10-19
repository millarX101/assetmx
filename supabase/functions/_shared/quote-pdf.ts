// Branded A4 quote sheet. Page 1 is the quote in four plain sections -
// Payments, Finance calculation, Interest rate, Fees - and page 2 the quote
// terms. Used by send-quote (email attachment, admin download) and
// quote-public (customer download). Drawn with pdf-lib, no browser needed.
//
// Standard PDF fonts only (Helvetica): they can't encode characters outside
// WinAnsi, so every string goes through `t()`.

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

export const FINANCE_TYPES: Record<string, string> = {
  chattel_mortgage: "Commercial loan (chattel mortgage)",
  finance_lease: "Finance lease",
  hire_purchase: "Commercial hire purchase",
};
const CONDITION: Record<string, string> = {
  new: "New", demo: "Demo", used_0_3: "Used (0-3 yrs)", used_4_7: "Used (4-7 yrs)", used_8_plus: "Used (8+ yrs)",
};
const ASSET_TYPE: Record<string, string> = { vehicle: "Vehicle", truck: "Truck / trailer", equipment: "Equipment / machinery" };

const W = 595.28;
const H = 841.89;
const M = 46;
const CW = W - M * 2;

function t(s: unknown): string {
  return String(s ?? "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
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

interface Ctx {
  page: PDFPage;
  reg: PDFFont;
  bold: PDFFont;
}

function txt(c: Ctx, s: string, x: number, y: number, size: number, bold = false, color = C.ink) {
  c.page.drawText(t(s), { x, y, size, font: bold ? c.bold : c.reg, color });
}
function right(c: Ctx, s: string, r: number, y: number, size: number, bold = false, color = C.ink) {
  const v = t(s);
  const f = bold ? c.bold : c.reg;
  c.page.drawText(v, { x: r - f.widthOfTextAtSize(v, size), y, size, font: f, color });
}
function hline(c: Ctx, y: number, x1 = M, x2 = W - M, color = C.line, thickness = 0.6) {
  c.page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color });
}

function header(c: Ctx, q: Row, subtitle: string): number {
  const bandH = 66;
  c.page.drawRectangle({ x: 0, y: H - bandH, width: W, height: bandH, color: C.forest });
  const size = 38;
  const top = H - (bandH - size) / 2;
  const s = (size / 100) * 0.78;
  const off = (size / 100) * 11;
  c.page.drawSvgPath(MARK_LEFT, { x: M + off, y: top - off, scale: s, color: C.sage });
  c.page.drawSvgPath(MARK_DIAG, { x: M + off, y: top - off, scale: s, color: C.cream });
  const tx = M + size + 10;
  txt(c, "Asset", tx, H - 36, 19, true, C.white);
  txt(c, "MX", tx + c.bold.widthOfTextAtSize("Asset", 19), H - 36, 19, true, C.sage);
  txt(c, "TRANSPARENT FINANCE", tx + 1, H - 48, 6.5, false, C.sage);
  right(c, subtitle, W - M, H - 28, 7.5, false, C.sage);
  right(c, q.quote_number, W - M, H - 45, 15, true, C.white);
  return H - bandH;
}

function footer(c: Ctx, n: number, total: number) {
  hline(c, 40);
  txt(c, LICENCE_LINE, M, 28, 7, false, C.faint);
  txt(c, `${ENTITY.email}  |  assetmx.com.au`, M, 18, 7, false, C.faint);
  right(c, `Page ${n} of ${total}`, W - M, 28, 7, false, C.faint);
}

/** Numbered section heading with a rule. Returns y for the first line below. */
function section(c: Ctx, y: number, n: number, title: string): number {
  c.page.drawCircle({ x: M + 8, y: y + 3.5, size: 8, color: C.forest });
  const ns = String(n);
  c.page.drawText(ns, { x: M + 8 - c.bold.widthOfTextAtSize(ns, 8.5) / 2, y: y + 0.5, size: 8.5, font: c.bold, color: C.white });
  txt(c, title, M + 22, y, 11.5, true, C.forestDark);
  hline(c, y - 8, M, W - M, C.forest, 0.8);
  return y - 21;
}

/** Ledger line: label left, amount right. */
function ledger(c: Ctx, y: number, label: string, amount: string, o: { bold?: boolean; note?: string; muted?: boolean } = {}) {
  txt(c, label, M + 22, y, 9.5, o.bold, o.muted ? C.muted : C.ink);
  if (o.note) {
    const lw = (o.bold ? c.bold : c.reg).widthOfTextAtSize(t(label), 9.5);
    txt(c, o.note, M + 22 + lw + 8, y, 8, false, C.faint);
  }
  right(c, amount, W - M, y, 9.5, o.bold, o.muted ? C.muted : C.ink);
  return y - 14.2;
}

export async function renderQuotePdf(q: Row): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`AssetMX quote ${q.quote_number}`);
  doc.setAuthor(`${ENTITY.legalName} (AssetMX)`);
  doc.setSubject(`Finance quote for ${q.customer_name}`);
  doc.setCreator("AssetMX");
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  // Legacy quotes (before deposit/trade-in) have no asset_price.
  const price = Number(q.asset_price ?? q.loan_amount);
  const deposit = Number(q.deposit_amount ?? 0);
  const tradeIn = Number(q.trade_in_amount ?? 0);
  const net = Number(q.loan_amount);
  const n = Number(q.term_months);
  const balloon = Number(q.balloon_amount);
  const fee = Number(q.platform_fee);
  const lenderFee = Number(q.establishment_fee);
  const eff = q.effective_rate_pct != null ? Number(q.effective_rate_pct) : null;
  const alt = q.alt_monthly_repayment != null ? Number(q.alt_monthly_repayment) : null;
  const upfrontMonthly = q.fee_financed ? alt : Number(q.monthly_repayment);
  const financedMonthly = q.fee_financed ? Number(q.monthly_repayment) : alt;

  // ── Page 1 ───────────────────────────────────────────────────────────────
  const c: Ctx = { page: doc.addPage([W, H]), reg, bold };
  let y = header(c, q, "FINANCE QUOTE") - 24;

  // Details (Westpac-style key/value grid)
  const kx = M;
  const vx = M + 70;
  const kx2 = M + CW / 2 + 10;
  const vx2 = kx2 + 78;
  const goodsW = W - M - vx2;
  const lines: [string, string][] = [
    ["Quote for", q.customer_name],
    ...(q.business_name ? [["Business", q.business_name] as [string, string]] : []),
    ...(q.abn ? [["ABN", q.abn] as [string, string]] : []),
    ["Quoted by", q.prepared_by || "AssetMX"],
    ["Date", longDate(q.sent_at ?? q.created_at ?? new Date().toISOString())],
    ["Valid until", longDate(q.valid_until)],
  ];
  const goods = wrap(assetLabel(q), bold, 9.5, goodsW).slice(0, 2);
  const lines2: [string, string[], boolean][] = [
    ["Finance type", [FINANCE_TYPES[q.finance_type] ?? FINANCE_TYPES.chattel_mortgage], false],
    ["Goods", goods, true],
    ["Asset type", [`${ASSET_TYPE[q.asset_type] ?? q.asset_type}, ${CONDITION[q.asset_condition] ?? q.asset_condition}`], false],
    ["Term", [`${n} months`], false],
  ];
  let ly = y;
  for (const [k, v] of lines) {
    txt(c, k, kx, ly, 8.5, false, C.muted);
    txt(c, v, vx, ly, 9.5, k === "Quote for");
    ly -= 12.5;
  }
  let ry = y;
  for (const [k, vs, b] of lines2) {
    txt(c, k, kx2, ry, 8.5, false, C.muted);
    vs.forEach((v, i) => txt(c, v, vx2, ry - i * 11.5, 9.5, b));
    ry -= 12.5 + (vs.length - 1) * 11.5;
  }
  y = Math.min(ly, ry) - 8;

  if (q.message) {
    const ml = wrap(q.message, reg, 8.6, CW - 24).slice(0, 4);
    const bh = ml.length * 11 + 11;
    c.page.drawRectangle({ x: M, y: y - bh, width: CW, height: bh, color: C.ivory });
    c.page.drawRectangle({ x: M, y: y - bh, width: 2.5, height: bh, color: C.sage });
    ml.forEach((l, i) => txt(c, l, M + 14, y - 13 - i * 11, 8.6, false, C.ink));
    y -= bh + 4;
  }
  y -= 12;

  // 1. Payments
  y = section(c, y, 1, "Your payments");
  const boxH = 40;
  c.page.drawRectangle({ x: M, y: y - boxH + 12, width: CW, height: boxH, color: C.sageLight });
  txt(c, aud(q.monthly_repayment), M + 16, y - 16, 22, true, C.forestDark);
  txt(c, "per month", M + 22 + bold.widthOfTextAtSize(t(aud(q.monthly_repayment)), 22), y - 16, 10, false, C.forest);
  right(c, `${aud(q.fortnightly_repayment)} per fortnight (equivalent)`, W - M - 16, y - 7, 8.5, false, C.muted);
  right(c, `${aud(q.weekly_repayment)} per week (equivalent)`, W - M - 16, y - 19, 8.5, false, C.muted);
  y -= boxH + 4;

  // Schedule table
  const cols = [M + 22, M + 82, M + 170, M + 300, M + 410];
  const head = ["Payments", "Frequency", "Amount", "From", "To"];
  head.forEach((h, i) => (i === 2 ? right(c, h, cols[2] + 70, y, 7.5, true, C.muted) : txt(c, h, cols[i], y, 7.5, true, C.muted)));
  hline(c, y - 5, M + 22);
  y -= 16;
  txt(c, String(n), cols[0], y, 9.5);
  txt(c, "Monthly", cols[1], y, 9.5);
  right(c, aud(q.monthly_repayment), cols[2] + 70, y, 9.5, true);
  txt(c, "Month 1 (1 month after settlement)", cols[3], y, 8.5, false, C.muted);
  txt(c, `Month ${n}`, cols[4] + 40, y, 8.5, false, C.muted);
  if (balloon > 0) {
    y -= 14;
    txt(c, "1", cols[0], y, 9.5);
    txt(c, "Balloon", cols[1], y, 9.5);
    right(c, aud(balloon), cols[2] + 70, y, 9.5, true);
    txt(c, "With the final monthly payment", cols[3], y, 8.5, false, C.muted);
    txt(c, `Month ${n}`, cols[4] + 40, y, 8.5, false, C.muted);
  }
  y -= 8;
  hline(c, y, M + 22);
  y -= 11;
  txt(c, "Payments are monthly in arrears. No GST is charged on the repayments.", M + 22, y, 7.6, false, C.faint);
  y -= 20;

  // 2. Finance calculation
  y = section(c, y, 2, "Finance calculation");
  y = ledger(c, y, "Asset price", aud(price));
  if (deposit > 0) y = ledger(c, y, "Less deposit", `-${aud(deposit)}`);
  if (tradeIn > 0) y = ledger(c, y, "Less trade-in", `-${aud(tradeIn)}`);
  if (deposit > 0 || tradeIn > 0) {
    hline(c, y + 10, M + 22);
    y = ledger(c, y - 2, "Amount to finance", aud(net), { bold: true });
  }
  y = ledger(c, y, "Plus lender establishment fee", aud(lenderFee), { note: "charged by the lender" });
  y = q.fee_financed
    ? ledger(c, y, "Plus AssetMX fee", aud(fee), { note: "added to the loan - see section 4" })
    : ledger(c, y, "AssetMX fee", "Paid upfront", { note: `${aud(fee, 0)} at settlement - not financed`, muted: true });
  hline(c, y + 10, M + 22, W - M, C.ink, 0.8);
  y = ledger(c, y - 2, "Total amount financed", aud(q.amount_financed), { bold: true });
  if (balloon > 0) {
    y = ledger(c, y, "Balloon / residual", aud(balloon), { note: `${q.balloon_percentage}% of asset price, due at end of term` });
  }
  y -= 8;

  // 3. Interest rate
  y = section(c, y, 3, "Interest rate");
  txt(c, `${pct(q.rate_pct)} p.a.`, M + 22, y - 4, 17, true, C.forestDark);
  txt(c, `fixed for ${n} months`, M + 30 + bold.widthOfTextAtSize(t(`${pct(q.rate_pct)} p.a.`), 17), y - 4, 9, false, C.muted);
  if (q.fee_financed && eff != null) {
    right(c, `Effective rate with the AssetMX fee added: ${pct(eff)} p.a.`, W - M, y - 1, 8.5, true, C.forest);
    right(c, "Adding the fee to the loan means you pay interest on it.", W - M, y - 12, 7.8, false, C.muted);
  } else if (eff != null) {
    right(c, "Fee paid upfront, so no interest is charged on it.", W - M, y - 1, 8.5, false, C.muted);
    right(c, `(If added to the loan, the effective rate would be ${pct(eff)} p.a.)`, W - M, y - 12, 7.8, false, C.faint);
  }
  y -= 24;
  y = ledger(c, y, "Total interest over the term", aud(q.total_interest));
  y = ledger(c, y, `Total repayments${balloon > 0 ? " incl. balloon" : ""}`, aud(q.total_repayments));
  y = ledger(c, y, `Total cost${q.fee_financed ? "" : " incl. AssetMX fee paid upfront"}`, aud(q.total_cost), { bold: true });
  y -= 8;

  // 4. Fees
  y = section(c, y, 4, "Fees");
  const optW = (CW - 22 - 12) / 2;
  const optH = 50;
  const opts = [
    { title: "Pay AssetMX fee upfront", line1: `${aud(fee, 0)} paid at settlement`, monthly: upfrontMonthly, rate: Number(q.rate_pct), chosen: !q.fee_financed },
    { title: "Add AssetMX fee to the loan", line1: "Nothing to pay upfront", monthly: financedMonthly, rate: eff, chosen: !!q.fee_financed },
  ];
  opts.forEach((o, i) => {
    const x = M + 22 + i * (optW + 12);
    c.page.drawRectangle({
      x, y: y - optH + 10, width: optW, height: optH,
      color: o.chosen ? C.sageLight : C.white,
      borderColor: o.chosen ? C.forest : C.line,
      borderWidth: o.chosen ? 1.2 : 0.6,
    });
    txt(c, o.title, x + 10, y - 4, 9.5, true);
    if (o.chosen) right(c, "THIS QUOTE", x + optW - 10, y - 4, 7, true, C.forest);
    txt(c, o.line1, x + 10, y - 17, 8.3, false, C.muted);
    txt(c, o.monthly != null ? `${aud(o.monthly)} per month` : "-", x + 10, y - 31, 9.5, true);
    if (o.rate != null) right(c, `effective rate ${pct(o.rate)} p.a.`, x + optW - 10, y - 31, 8.3, false, C.muted);
  });
  y -= optH + 4;
  for (const l of wrap(
    `AssetMX fee: ${aud(fee, 0)} flat (incl. GST), only payable if your finance settles. We take no commission from the lender. ` +
      `Lender establishment fee: ${aud(lenderFee, 0)}, charged by the lender and added to the amount financed.`,
    reg, 8, CW - 22,
  )) {
    txt(c, l, M + 22, y, 8, false, C.muted);
    y -= 10.5;
  }
  if (y < 84) console.warn(`[quote-pdf] page 1 content reaches y=${y.toFixed(0)}, overlapping the disclaimer`);

  // Disclaimer pinned above the footer
  const disc = wrap(`${DISCLAIMER} Terms of this quote are on page 2.`, reg, 7.2, CW);
  disc.forEach((l, i) => txt(c, l, M, 48 + (disc.length - 1 - i) * 9, 7.2, false, C.faint));

  // ── Page 2: terms ────────────────────────────────────────────────────────
  const p2: Ctx = { page: doc.addPage([W, H]), reg, bold };
  let ty = header(p2, q, "QUOTE TERMS AND CONDITIONS") - 32;
  txt(p2, "Quote terms and conditions", M, ty, 14, true);
  ty -= 15;
  txt(p2, `These terms apply to quote ${q.quote_number}. Version ${QUOTE_TERMS_VERSION}.`, M, ty, 8.3, false, C.muted);
  ty -= 20;

  let tc = p2;
  const ensure = (need: number) => {
    if (ty - need < 56) {
      tc = { page: doc.addPage([W, H]), reg, bold };
      ty = header(tc, q, "QUOTE TERMS AND CONDITIONS") - 32;
    }
  };
  const TS = 8.5;
  const TL = 11.3;
  quoteTerms(q as never).forEach((clause, i) => {
    ensure(34);
    txt(tc, `${i + 1}. ${clause.heading}`, M, ty, 9.5, true);
    ty -= 13;
    for (const para of clause.paragraphs) {
      for (const l of wrap(para, reg, TS, CW)) {
        ensure(TL);
        txt(tc, l, M, ty, TS);
        ty -= TL;
      }
      ty -= 3;
    }
    for (const b of clause.bullets ?? []) {
      wrap(b, reg, TS, CW - 14).forEach((l, j) => {
        ensure(TL);
        if (j === 0) txt(tc, "-", M + 2, ty, TS, false, C.muted);
        txt(tc, l, M + 14, ty, TS);
        ty -= TL;
      });
    }
    ty -= 7;
  });

  const pages = doc.getPages();
  pages.forEach((pg, i) => footer({ page: pg, reg, bold }, i + 1, pages.length));
  return await doc.save();
}

export const pdfFilename = (q: Row) => `AssetMX-quote-${q.quote_number}.pdf`;

/** Base64 for Resend attachments (chunked: spreading a large array overflows the stack). */
export function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
