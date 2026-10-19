// Quote terms and conditions - printed on the PDF quote sheet (page 2) and
// shown on the customer's /q/<token> page. One source for both: the web app
// imports this file too, so keep it free of Deno APIs.
//
// Clauses 1, 6, 7, 8 (2nd para), 9 and 10 and most of 5 restate
// site/src/content/legal/terms.md (Terms of Service, updated 2026-09-08).
// Clauses 2, 3, 4 and 8 (1st para) are quote-specific. Change the Terms of
// Service first, then mirror it here.

export const QUOTE_TERMS_VERSION = "2026-10-19";

export interface TermsClause {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

interface TermsInput {
  valid_until: string; // YYYY-MM-DD
  rate_pct: number;
  effective_rate_pct?: number | null;
}

const longDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

export function quoteTerms(q: TermsInput): TermsClause[] {
  const rate = `${Number(q.rate_pct).toFixed(2)}%`;
  const eff = q.effective_rate_pct != null ? `${Number(q.effective_rate_pct).toFixed(2)}%` : null;

  return [
    {
      heading: "Indicative quote",
      paragraphs: [
        "This quote is indicative only and subject to credit assessment. It is not an offer, approval or commitment to lend. Final rates, terms and approval are determined by the lending partner based on their assessment criteria.",
      ],
    },
    {
      heading: "Validity",
      paragraphs: [
        `This quote is valid until ${longDate(q.valid_until)}, subject to settlement by then. If the interest rate changes before you enter into the finance contract, we will give you the new rate and updated repayments before you proceed.`,
      ],
    },
    {
      heading: "How the repayments are calculated",
      paragraphs: [
        "Repayments are monthly in arrears: the first payment is due one month after settlement. They are calculated on the total amount financed at the interest rate shown, fixed for the term. Weekly and fortnightly amounts are the monthly repayment expressed as an equivalent. Where there is a balloon or residual, it is the final payment: a term of 60 months is 59 monthly repayments followed by the balloon as payment 60. Figures are rounded to the nearest cent.",
      ],
    },
    {
      heading: "Deposit and trade-in",
      paragraphs: [
        "Any deposit or trade-in shown reduces the amount to finance. A trade-in value is as advised and is subject to inspection and valuation. Any finance owing on the trade-in must be paid out at or before settlement. If either amount changes, the repayments will change.",
      ],
    },
    {
      heading: "Fees and charges",
      paragraphs: [
        `Our platform fee is $800 (inclusive of GST), payable at settlement. You can pay it upfront or add it to the amount financed. If you add it to the loan you pay interest on it, which raises your effective rate${eff ? ` from ${rate} to ${eff}` : ""}. The fee is shown separately from the lender's interest rate, is only charged if your finance application settles, and is non-refundable once settlement occurs. We do not receive commissions from lenders.`,
        "The lender establishment fee is charged by the lender, not by us, and is added to the amount financed. Additional fees may be charged by lending partners. These are disclosed before you accept a finance offer.",
      ],
    },
    {
      heading: "Eligibility",
      paragraphs: ["Finance is provided for business purposes only. To proceed you must:"],
      bullets: [
        "Be at least 18 years of age",
        "Be an Australian resident or citizen",
        "Have a valid Australian Business Number (ABN)",
        "Have the authority to act on behalf of the business applying for finance",
      ],
    },
    {
      heading: "Your information",
      paragraphs: [
        "This quote is based on the information you have given us. You agree to provide accurate and complete information. Providing false or misleading information may result in termination of services and may constitute fraud.",
        "We collect and handle your personal information in accordance with our Privacy Policy, and may share it with lending partners, credit reporting bodies and service providers as necessary to process your application.",
      ],
    },
    {
      heading: "Accepting this quote",
      paragraphs: [
        "Accepting this quote tells us to start your finance application. It is not a credit contract and does not bind you or the lender to proceed.",
        "Submitting an application does not guarantee approval. We reserve the right to decline applications or refer them for additional review at our discretion.",
      ],
    },
    {
      heading: "Complaints",
      paragraphs: [
        "If you have a complaint about our services, please contact us at info@assetmx.com.au. We will endeavour to resolve your complaint within 30 days.",
        "If we cannot resolve your complaint, you may refer it to the Australian Financial Complaints Authority (AFCA): www.afca.org.au, info@afca.org.au, 1800 931 678.",
      ],
    },
    {
      heading: "Governing law and full terms",
      paragraphs: [
        "These quote terms are governed by the laws of New South Wales, Australia. They should be read with our Terms of Service (assetmx.com.au/terms), Credit Guide (assetmx.com.au/credit-guide) and Privacy Policy (assetmx.com.au/privacy). If there is any inconsistency, the Terms of Service prevail.",
      ],
    },
  ];
}
