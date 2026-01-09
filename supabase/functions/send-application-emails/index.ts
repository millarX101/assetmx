// Supabase Edge Function: Send Application Emails
// Sends confirmation email to client and notification to admin

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "info@assetmx.com.au";
const FROM_EMAIL = "AssetMX <noreply@assetmx.com.au>";

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

// Client confirmation email template
const getClientEmailHtml = (data: ApplicationData): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Received - AssetMX</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 40px 40px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display: inline-block; background: white; border-radius: 12px; padding: 12px 16px;">
                      <span style="font-size: 24px; font-weight: bold; color: #1e293b;">Asset</span><span style="font-size: 24px; font-weight: bold; color: #7c3aed;">MX</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 24px;">
                    <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 600;">Application Received</h1>
                    <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Thanks ${data.contactName.split(" ")[0]}, we're on it!</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Application Summary -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 18px; font-weight: 600;">Your Application Summary</h2>

              <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Business</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500; text-align: right;">${data.entityName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">ABN</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500; text-align: right;">${data.abn}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Asset</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500; text-align: right;">${data.assetDescription || data.assetType}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 12px 0 0;">
                          <div style="border-top: 1px solid #e2e8f0;"></div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0 8px; color: #64748b; font-size: 14px;">Finance Amount</td>
                        <td style="padding: 12px 0 8px; color: #7c3aed; font-size: 20px; font-weight: 700; text-align: right;">${formatMoney(data.loanAmount)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Term</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500; text-align: right;">${data.termMonths} months</td>
                      </tr>
                      ${data.balloonPercentage > 0 ? `
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Balloon</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500; text-align: right;">${data.balloonPercentage}%</td>
                      </tr>` : ""}
                      ${data.depositAmount > 0 ? `
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Deposit</td>
                        <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 500; text-align: right;">${formatMoney(data.depositAmount)}</td>
                      </tr>` : ""}
                      ${data.monthlyRepayment ? `
                      <tr>
                        <td colspan="2" style="padding: 12px 0 0;">
                          <div style="border-top: 1px solid #e2e8f0;"></div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0 8px; color: #64748b; font-size: 14px;">Est. Monthly Repayment</td>
                        <td style="padding: 12px 0 8px; color: #16a34a; font-size: 18px; font-weight: 700; text-align: right;">${formatMoney(data.monthlyRepayment)}/mo</td>
                      </tr>` : ""}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- What Happens Next -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 18px; font-weight: 600;">What Happens Next</h2>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 16px 0; border-bottom: 1px solid #f1f5f9;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 40px; vertical-align: top;">
                          <div style="width: 32px; height: 32px; background: #f0fdf4; border-radius: 50%; text-align: center; line-height: 32px; color: #16a34a; font-weight: 600;">1</div>
                        </td>
                        <td style="vertical-align: top; padding-left: 12px;">
                          <div style="color: #1e293b; font-weight: 600; font-size: 15px;">Privacy Consent</div>
                          <div style="color: #64748b; font-size: 14px; margin-top: 4px;">You'll receive the Westpac Online Privacy form to complete and return.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 0; border-bottom: 1px solid #f1f5f9;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 40px; vertical-align: top;">
                          <div style="width: 32px; height: 32px; background: #f0fdf4; border-radius: 50%; text-align: center; line-height: 32px; color: #16a34a; font-weight: 600;">2</div>
                        </td>
                        <td style="vertical-align: top; padding-left: 12px;">
                          <div style="color: #1e293b; font-weight: 600; font-size: 15px;">Dealer/Supplier Contact</div>
                          <div style="color: #64748b; font-size: 14px; margin-top: 4px;">We'll contact your dealer for the tax invoice. If this is a private sale, we'll be in touch directly.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 0;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 40px; vertical-align: top;">
                          <div style="width: 32px; height: 32px; background: #f0fdf4; border-radius: 50%; text-align: center; line-height: 32px; color: #16a34a; font-weight: 600;">3</div>
                        </td>
                        <td style="vertical-align: top; padding-left: 12px;">
                          <div style="color: #1e293b; font-weight: 600; font-size: 15px;">E-Sign Documents</div>
                          <div style="color: #64748b; font-size: 14px; margin-top: 4px;">Once approved, loan documents will be sent via e-signature for quick, paperless signing.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Timeline -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 20px;">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align: top; width: 24px;">
                      <span style="font-size: 20px;">⏱️</span>
                    </td>
                    <td style="padding-left: 12px;">
                      <div style="color: #92400e; font-weight: 600; font-size: 15px;">Expected Timeline</div>
                      <div style="color: #a16207; font-size: 14px; margin-top: 4px;">Most applications are assessed within 15 minutes during business hours (Mon-Fri 9am-5pm AEST).</div>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Contact -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                Questions? Reply to this email or call us on <a href="tel:1300000000" style="color: #7c3aed; text-decoration: none; font-weight: 500;">1300 000 000</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 30px 40px; border-top: 1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px; color: #1e293b; font-size: 14px; font-weight: 600;">AssetMX</p>
                    <p style="margin: 0; color: #64748b; font-size: 12px;">Transparent Finance</p>
                  </td>
                  <td style="text-align: right;">
                    <a href="https://assetmx.com.au" style="color: #7c3aed; text-decoration: none; font-size: 12px;">assetmx.com.au</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 20px 0 0; color: #94a3b8; font-size: 11px; line-height: 1.5;">
                Blackrock Leasing Pty Ltd | ABN XX XXX XXX XXX | Australian Credit Licence XXXXXX<br>
                This email contains confidential information intended for the addressee only.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

// Admin notification email template
const getAdminEmailHtml = (data: ApplicationData): string => {
  const adminUrl = `https://assetmx.com.au/admin/applications/${data.id}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

    <!-- Header -->
    <tr>
      <td style="background: #7c3aed; padding: 20px 24px;">
        <h1 style="margin: 0; color: white; font-size: 18px; font-weight: 600;">
          🚀 New Application Submitted
        </h1>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 8px; padding: 16px;">
          <tr>
            <td style="padding: 8px 16px;">
              <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">Business</strong><br>
              <span style="color: #1e293b; font-size: 16px; font-weight: 600;">${data.entityName}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 16px;">
              <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">Contact</strong><br>
              <span style="color: #1e293b; font-size: 14px;">${data.contactName} | ${data.contactEmail} | ${data.contactPhone}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 16px;">
              <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">Asset</strong><br>
              <span style="color: #1e293b; font-size: 14px;">${data.assetDescription || data.assetType}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 16px;">
              <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">Finance</strong><br>
              <span style="color: #7c3aed; font-size: 20px; font-weight: 700;">${formatMoney(data.loanAmount)}</span>
              <span style="color: #64748b; font-size: 14px;"> over ${data.termMonths} months${data.balloonPercentage > 0 ? ` (${data.balloonPercentage}% balloon)` : ""}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 16px;">
              <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">Documents</strong><br>
              <span style="color: ${data.documentsUploaded ? '#16a34a' : '#f59e0b'}; font-size: 14px; font-weight: 500;">
                ${data.documentsUploaded ? '✅ Uploaded' : '⏳ Pending'}
              </span>
            </td>
          </tr>
        </table>

        <div style="margin-top: 24px; text-align: center;">
          <a href="${adminUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            View Application →
          </a>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #94a3b8; font-size: 12px;">
          Application ID: ${data.id}<br>
          Submitted: ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}
        </p>
      </td>
    </tr>

  </table>
</body>
</html>
`;
};

// Send email via Resend
async function sendEmail(
  to: string,
  subject: string,
  html: string
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

// Director form request email template
const getDirectorFormEmailHtml = (data: DirectorFormRequest): string => {
  const formUrl = `https://assetmx.com.au/director-form?email=${encodeURIComponent(data.directorEmail)}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Your Details - AssetMX</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 40px 40px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display: inline-block; background: white; border-radius: 12px; padding: 12px 16px;">
                      <span style="font-size: 24px; font-weight: bold; color: #1e293b;">Asset</span><span style="font-size: 24px; font-weight: bold; color: #7c3aed;">MX</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 24px;">
                    <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 600;">Your Details Needed</h1>
                    <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Quick form to complete</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #1e293b; font-size: 16px; line-height: 1.6;">
                Hi there,
              </p>
              <p style="margin: 0 0 20px; color: #1e293b; font-size: 16px; line-height: 1.6;">
                <strong>${data.primaryContactName}</strong> has listed you as an additional director/guarantor on a finance application for <strong>${data.businessName}</strong>.
              </p>
              <p style="margin: 0 0 30px; color: #1e293b; font-size: 16px; line-height: 1.6;">
                Please take a couple of minutes to complete your details by clicking the button below.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${formUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  Complete Your Details
                </a>
              </div>

              <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-top: 30px;">
                <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                  <strong style="color: #1e293b;">What we need:</strong><br>
                  • Basic personal information<br>
                  • Property ownership status<br>
                  • Quick financial summary
                </p>
                <p style="margin: 16px 0 0; color: #64748b; font-size: 14px;">
                  Takes about 2-3 minutes to complete.
                </p>
              </div>
            </td>
          </tr>

          <!-- Questions -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                Questions? Contact ${data.primaryContactName} at <a href="mailto:${data.primaryContactEmail}" style="color: #7c3aed; text-decoration: none;">${data.primaryContactEmail}</a> or reply to this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 30px 40px; border-top: 1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px; color: #1e293b; font-size: 14px; font-weight: 600;">AssetMX</p>
                    <p style="margin: 0; color: #64748b; font-size: 12px;">Transparent Asset Finance</p>
                  </td>
                  <td style="text-align: right;">
                    <a href="https://assetmx.com.au" style="color: #7c3aed; text-decoration: none; font-size: 12px;">assetmx.com.au</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

// New lead notification email template (admin only)
const getLeadNotificationEmailHtml = (data: NewLeadRequest): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Lead - AssetMX</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display: inline-block; background: white; border-radius: 12px; padding: 12px 16px;">
                      <span style="font-size: 24px; font-weight: bold; color: #1e293b;">Asset</span><span style="font-size: 24px; font-weight: bold; color: #7c3aed;">MX</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 20px;">
                    <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">📋 New Lead Captured</h1>
                    <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Non-qualifying applicant - manual follow-up required</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px 40px;">
              <!-- Reason for not qualifying -->
              <div style="background: #fef3c7; border-radius: 12px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">Reason:</p>
                <p style="margin: 4px 0 0; color: #78350f; font-size: 14px;">${data.reason}</p>
              </div>

              <!-- Contact Details -->
              <h3 style="margin: 0 0 16px; color: #1e293b; font-size: 16px; font-weight: 600;">Contact Details</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 14px;">Name:</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                    <span style="color: #1e293b; font-size: 14px; font-weight: 500;">${data.name}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 14px;">Email:</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                    <a href="mailto:${data.email}" style="color: #7c3aed; font-size: 14px; text-decoration: none;">${data.email}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 14px;">Phone:</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                    <a href="tel:${data.phone}" style="color: #7c3aed; font-size: 14px; text-decoration: none;">${data.phone}</a>
                  </td>
                </tr>
                ${data.businessName ? `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 14px;">Business:</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                    <span style="color: #1e293b; font-size: 14px;">${data.businessName}</span>
                  </td>
                </tr>
                ` : ''}
                ${data.abn ? `
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 14px;">ABN:</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                    <span style="color: #1e293b; font-size: 14px;">${data.abn}</span>
                  </td>
                </tr>
                ` : ''}
              </table>

              <!-- Finance Details -->
              <h3 style="margin: 0 0 16px; color: #1e293b; font-size: 16px; font-weight: 600;">Finance Requirements</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 14px;">Asset Type:</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                    <span style="color: #1e293b; font-size: 14px;">${data.assetType || 'Not specified'}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 14px;">Loan Amount:</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                    <span style="color: #1e293b; font-size: 14px; font-weight: 600;">${formatMoney(data.loanAmount)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 14px;">Consent to Share:</span>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                    <span style="color: ${data.consentToShare ? '#16a34a' : '#dc2626'}; font-size: 14px; font-weight: 500;">${data.consentToShare ? '✓ Yes - can share with partners' : '✗ No - contact directly only'}</span>
                  </td>
                </tr>
              </table>

              <!-- Action Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://assetmx.com.au/admin/leads" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px;">
                  View in Admin Dashboard
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 20px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #64748b; font-size: 12px; text-align: center;">
                This lead was captured via the AssetMX Express chat flow.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
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
        `Complete Your Details - ${data.businessName} Finance Application`,
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
        `📋 New Lead: ${data.name} - ${data.businessName || 'No business'} - ${formatMoney(data.loanAmount)}`,
        getLeadNotificationEmailHtml(data)
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
      `Application Received - ${data.entityName}`,
      getClientEmailHtml(data)
    );

    // Send admin notification email
    const adminResult = await sendEmail(
      ADMIN_EMAIL,
      `🚀 New Application: ${data.entityName} - ${formatMoney(data.loanAmount)}`,
      getAdminEmailHtml(data)
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
