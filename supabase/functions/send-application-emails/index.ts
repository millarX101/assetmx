// Supabase Edge Function: Send Application Emails
// Sends confirmation email to client and notification to admin

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ADMIN_URL, C, DISCLAIMER, aud, esc, firstName, pct, row, shell } from "../_shared/quote.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "info@assetmx.com.au";
const FROM_EMAIL = "AssetMX <noreply@assetmx.com.au>";
// noreply@ has no mailbox. Customer emails reply to info@ (forwarded to the team
// by Cloudflare Email Routing); team notices reply straight to the customer.
const CUSTOMER_REPLY_TO = Deno.env.get("QUOTE_REPLY_TO") || "info@assetmx.com.au";

interface ApplicationData {
  id: string;
  entityName: string;
  abn: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  assetType: string;
  assetDescription?: string;
  loanAmount: number;
  termMonths: number;
  balloonPercentage: number;
  depositAmount: number;
  assetPrice?: number;
  monthlyRepayment?: number;
  indicativeRate?: number;
  documentsUploaded: boolean;
}

interface DirectorFormRequest {
  type: 'director_form_request';
  directorEmail: string;
  businessName: string;
  primaryContactName: string;
  primaryContactEmail: string;
}

interface NewLeadRequest {
  type: 'new_lead';
  name: string;
  email: string;
  phone: string;
  businessName: string;
  abn: string;
  assetType: string;
  loanAmount: number;
  reason: string;
  consentToShare: boolean;
}

// Format currency
const formatMoney = (amount: number): string => {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Short reference shown to the applicant: the start of the application id.
const applicationReference = (id: string) => `APP-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

// Client confirmation email: summary, then what happens next. Plain, no sales copy.
const getClientEmailHtml = (data: ApplicationData): string => {
  const assetPrice = Number(data.assetPrice) || 0;
  const deposit = Number(data.depositAmount) || 0;
  const balloonPct = Number(data.balloonPercentage) || 0;
  const step = (n: number, title: string, body: string) => `<tr>
<td valign="top" style="padding:0 12px 14px 0;width:28px;">
  <div style="width:26px;height:26px;border-radius:13px;background:${C.forest};color:#ffffff;font-size:13px;font-weight:700;line-height:26px;text-align:center;">${n}</div>
</td>
<td valign="top" style="padding:2px 0 14px;font-size:14px;line-height:1.55;">
  <strong>${esc(title)}</strong><br><span style="color:${C.muted};">${esc(body)}</span>
</td></tr>`;

  const inner = `
<tr><td style="padding:28px 28px 8px;">
  <p style="margin:0 0 14px;font-size:16px;">Hi ${esc(firstName(data.contactName))},</p>
  <p style="margin:0 0 6px;font-size:15px;line-height:1.6;">
    We have your finance application for <strong>${esc(data.entityName)}</strong>. Your reference is <strong>${esc(applicationReference(data.id))}</strong>.
  </p>
</td></tr>
<tr><td style="padding:12px 28px 4px;">
  <div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:${C.forest};font-weight:700;margin-bottom:6px;">Your application</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${row("Reference", applicationReference(data.id))}
    ${row("Business", data.entityName)}
    ${data.abn ? row("ABN", data.abn) : ""}
    ${row("Asset", data.assetDescription || data.assetType)}
    ${assetPrice > 0 ? row("Asset price", aud(assetPrice)) : ""}
    ${deposit > 0 ? row("Less deposit", `-${aud(deposit)}`) : ""}
    ${row("Amount to finance", aud(data.loanAmount), true)}
    ${row("Term", `${data.termMonths} months, payments monthly in arrears`)}
    ${balloonPct > 0 ? row("Balloon", `${balloonPct}%`) : ""}
    ${data.indicativeRate ? row("Indicative rate", `${pct(data.indicativeRate)} p.a.`) : ""}
    ${data.monthlyRepayment ? row("Indicative repayment", `${aud(data.monthlyRepayment)} per month`, true) : ""}
  </table>
</td></tr>
<tr><td style="padding:20px 28px 4px;">
  <div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:${C.forest};font-weight:700;margin-bottom:12px;">What happens next</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${step(1, "Credit assessment", "We check your application against lender policy and submit it. Conditional approval is typically the same business day for in-policy applications.")}
    ${step(2, "Bank statements", "If the lender needs them, we email you a secure link to provide your bank statements.")}
    ${step(3, "Affordability declaration", "Your lender may email you an affordability declaration to sign.")}
    ${step(4, "Loan documents", "Once approved, the loan documents are sent to you for e-signature.")}
    ${step(5, "Settlement", "After you sign, the lender pays the supplier and you take delivery of the asset.")}
  </table>
</td></tr>
<tr><td style="padding:12px 28px 24px;">
  <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${C.muted};">Questions? Reply to this email and quote ${esc(applicationReference(data.id))}.</p>
  <p style="margin:0;font-size:15px;"><strong>AssetMX</strong></p>
  <p style="margin:22px 0 0;font-size:11px;line-height:1.6;color:${C.muted};">${esc(DISCLAIMER)}</p>
</td></tr>`;

  return shell(inner, `Application ${applicationReference(data.id)} received - what happens next`);
};

// Team notice: new application. Same layout as every other AssetMX email.
const getAdminEmailHtml = (data: ApplicationData): string => {
  const adminUrl = `${ADMIN_URL}/admin/applications/${data.id}`;
  const ref = applicationReference(data.id);
  const assetPrice = Number(data.assetPrice) || 0;
  const deposit = Number(data.depositAmount) || 0;
  const balloonPct = Number(data.balloonPercentage) || 0;
  const inner = `
<tr><td style="padding:28px 28px 8px;">
  <p style="margin:0 0 6px;font-size:20px;font-weight:800;color:${C.forest};">New application ${esc(ref)}</p>
  <p style="margin:0;font-size:15px;line-height:1.6;"><strong>${esc(data.entityName)}</strong> applied for ${esc(aud(data.loanAmount, 0))} over ${data.termMonths} months.</p>
</td></tr>
<tr><td style="padding:12px 28px 4px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${row("Reference", ref)}
    ${row("Business", data.entityName)}
    ${data.abn ? row("ABN", data.abn) : ""}
    ${row("Contact", data.contactName)}
    ${row("Email", data.contactEmail)}
    ${data.contactPhone ? row("Phone", data.contactPhone) : ""}
    ${row("Asset", data.assetDescription || data.assetType)}
    ${assetPrice > 0 ? row("Asset price", aud(assetPrice)) : ""}
    ${deposit > 0 ? row("Deposit", aud(deposit)) : ""}
    ${row("Amount to finance", aud(data.loanAmount), true)}
    ${row("Term", `${data.termMonths} months`)}
    ${balloonPct > 0 ? row("Balloon", `${balloonPct}%`) : ""}
    ${data.indicativeRate ? row("Indicative rate", `${pct(data.indicativeRate)} p.a.`) : ""}
    ${data.monthlyRepayment ? row("Indicative repayment", `${aud(data.monthlyRepayment)} per month`) : ""}
    ${row("Documents", data.documentsUploaded ? "Uploaded in chat" : "None uploaded")}
  </table>
</td></tr>
<tr><td style="padding:20px 28px 28px;">
  <a href="${adminUrl}" style="display:inline-block;background:${C.forest};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 26px;border-radius:999px;">Open in AssetMX admin</a>
</td></tr>`;
  return shell(inner, `New application ${ref}: ${data.entityName} - ${aud(data.loanAmount, 0)}`);
};

// Send email via Resend
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  replyTo: string = CUSTOMER_REPLY_TO
): Promise<{ success: boolean; error?: string }> {
  console.log("[EMAIL] Attempting to send email to:", to);
  console.log("[EMAIL] Subject:", subject);
  console.log("[EMAIL] RESEND_API_KEY present:", !!RESEND_API_KEY);

  if (!RESEND_API_KEY) {
    console.error("[EMAIL] RESEND_API_KEY not configured!");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    console.log("[EMAIL] Sending with from:", FROM_EMAIL);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
        reply_to: replyTo,
      }),
    });

    const responseText = await response.text();
    console.log("[EMAIL] Resend response status:", response.status);
    console.log("[EMAIL] Resend response body:", responseText);

    if (!response.ok) {
      let errorMessage = "Failed to send email";
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorMessage;
      } catch {}
      console.error("[EMAIL] Failed:", errorMessage);
      return { success: false, error: errorMessage };
    }

    console.log("[EMAIL] Successfully sent to:", to);
    return { success: true };
  } catch (error) {
    console.error("[EMAIL] Exception:", error.message);
    return { success: false, error: error.message };
  }
}

// To an additional director/guarantor. There is no self-serve director form yet,
// so the team collects their details directly.
const getDirectorFormEmailHtml = (data: DirectorFormRequest): string => {
  const inner = `
<tr><td style="padding:28px 28px 8px;">
  <p style="margin:0 0 14px;font-size:16px;">Hi,</p>
  <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">
    ${esc(data.primaryContactName)} has listed you as a director or guarantor on a finance application for <strong>${esc(data.businessName)}</strong> through AssetMX.
  </p>
  <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">
    The lender needs your name, date of birth, address and driver licence details. Our team will contact you to collect them. Nothing is needed from you until then.
  </p>
</td></tr>
<tr><td style="padding:4px 28px 24px;">
  <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${C.muted};">Questions? Reply to this email, or contact ${esc(data.primaryContactName)} at ${esc(data.primaryContactEmail)}.</p>
  <p style="margin:0;font-size:15px;"><strong>AssetMX</strong></p>
</td></tr>`;
  return shell(inner, `Finance application for ${data.businessName}: director details`);
};

// Team notice: chat applicant who did not qualify and left details.
const getLeadNotificationEmailHtml = (data: NewLeadRequest): string => {
  const inner = `
<tr><td style="padding:28px 28px 8px;">
  <p style="margin:0 0 6px;font-size:20px;font-weight:800;color:${C.forest};">New lead: ${esc(data.name || "No name")}</p>
  <p style="margin:0;font-size:15px;line-height:1.6;"><strong>Reason:</strong> ${esc(data.reason || "Did not qualify via chat")}</p>
</td></tr>
<tr><td style="padding:12px 28px 4px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${row("Name", data.name || "-")}
    ${row("Email", data.email || "-")}
    ${row("Phone", data.phone || "-")}
    ${data.businessName ? row("Business", data.businessName) : ""}
    ${data.abn ? row("ABN", data.abn) : ""}
    ${row("Asset", data.assetType || "Not specified")}
    ${row("Amount", data.loanAmount ? aud(data.loanAmount, 0) : "Not given")}
    ${row("Share with partners", data.consentToShare ? "Yes" : "No, contact directly")}
  </table>
</td></tr>
<tr><td style="padding:20px 28px 28px;">
  <a href="${ADMIN_URL}/admin/leads" style="display:inline-block;background:${C.forest};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 26px;border-radius:999px;">Open leads in AssetMX admin</a>
</td></tr>`;
  return shell(inner, `New lead: ${data.name} - ${data.reason}`);
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
      },
    });
  }

  try {
    const requestData = await req.json();

    // Check if this is a director form request
    if (requestData.type === 'director_form_request') {
      const data = requestData as DirectorFormRequest;

      if (!data.directorEmail) {
        return new Response(
          JSON.stringify({ error: "Missing director email" }),
          { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
        );
      }

      const result = await sendEmail(
        data.directorEmail,
        `Finance application for ${data.businessName}: director details`,
        getDirectorFormEmailHtml(data)
      );

      return new Response(
        JSON.stringify({ success: true, result }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Check if this is a new lead notification
    if (requestData.type === 'new_lead') {
      const data = requestData as NewLeadRequest;

      // Send admin notification email only (no client email for leads)
      const result = await sendEmail(
        ADMIN_EMAIL,
        `New lead: ${data.name} - ${data.businessName || 'No business'} - ${formatMoney(data.loanAmount)}`,
        getLeadNotificationEmailHtml(data),
        data.email || CUSTOMER_REPLY_TO
      );

      return new Response(
        JSON.stringify({ success: true, result }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Otherwise, handle as application email
    const data = requestData as ApplicationData;

    // Validate required fields
    if (!data.contactEmail || !data.entityName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Send client confirmation email
    const clientResult = await sendEmail(
      data.contactEmail,
      `Application received - ${applicationReference(data.id)} - ${data.entityName}`,
      getClientEmailHtml(data)
    );

    // Send admin notification email
    const adminResult = await sendEmail(
      ADMIN_EMAIL,
      `New application ${applicationReference(data.id)}: ${data.entityName} - ${formatMoney(data.loanAmount)}`,
      getAdminEmailHtml(data),
      data.contactEmail
    );

    return new Response(
      JSON.stringify({
        success: true,
        clientEmail: clientResult,
        adminEmail: adminResult,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
