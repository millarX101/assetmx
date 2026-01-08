// Application Export Utilities
// Generates formatted HTML for downloading application data

import { formatCurrency } from './calculator';

// Application data interface (matches what's stored in Supabase)
interface ExportApplication {
  id: string;
  created_at: string;
  status: string;
  // Business details
  entity_name: string;
  abn: string;
  entity_type?: string;
  trading_name?: string;
  gst_registered?: boolean;
  gst_registered_date?: string;
  business_address?: string;
  business_state?: string;
  business_postcode?: string;
  // Asset details
  asset_type: string;
  asset_category?: string;
  asset_condition: string;
  asset_year?: number;
  asset_make?: string;
  asset_model?: string;
  asset_description?: string;
  asset_price_inc_gst?: number;
  supplier_name?: string;
  supplier_abn?: string;
  // Loan details
  loan_amount: number;
  deposit_amount?: number;
  trade_in_amount?: number;
  term_months: number;
  balloon_percentage?: number;
  balloon_amount?: number;
  indicative_rate?: number;
  monthly_repayment?: number;
  // Directors (stored as JSONB array)
  directors: Array<{
    firstName: string;
    lastName: string;
    dob: string;
    email: string;
    phone: string;
    residentialAddress?: string;
    address?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
    licenceNumber?: string;
    licenceState?: string;
    // Assets & Liabilities
    ownsProperty?: boolean;
    propertyValue?: number;
    mortgageBalance?: number;
    monthlyMortgagePayment?: number;
    hasInvestmentProperty?: boolean;
    investmentPropertyValue?: number;
    investmentMortgageBalance?: number;
    monthlyInvestmentMortgagePayment?: number;
    vehiclesValue?: number;
    vehicleLoanBalance?: number;
    monthlyVehicleLoanPayment?: number;
    creditCardLimit?: number;
    creditCardOutstanding?: number;
    monthlyCreditCardPayment?: number;
    // Income & Expenses
    annualSalary?: number;
    otherIncome?: number;
    otherIncomeDescription?: string;
    monthlyLivingExpenses?: number;
    // Totals
    totalAssets?: number;
    totalLiabilities?: number;
    netPosition?: number;
    totalMonthlyPayments?: number;
  }>;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCondition(condition: string): string {
  const labels: Record<string, string> = {
    new: 'New',
    demo: 'Demo',
    used_0_3: 'Used (0-3 years)',
    used_4_7: 'Used (4-7 years)',
    used_8_plus: 'Used (8+ years)',
  };
  return labels[condition] || condition;
}

function formatEntityType(type: string): string {
  const labels: Record<string, string> = {
    company: 'Company',
    trust: 'Trust',
    sole_trader: 'Sole Trader',
    partnership: 'Partnership',
  };
  return labels[type] || type;
}

function formatAssetType(type: string): string {
  const labels: Record<string, string> = {
    vehicle: 'Vehicle',
    truck: 'Truck/Trailer',
    equipment: 'Equipment/Machinery',
  };
  return labels[type] || type;
}

function currencyOrNA(value: number | undefined | null): string {
  if (value === undefined || value === null || value === 0) return 'N/A';
  return formatCurrency(value);
}

export function generateApplicationHTML(app: ExportApplication): string {
  const directors = app.directors || [];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AssetMX Application - ${app.entity_name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #1a1a1a;
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      font-size: 24px;
      color: #16a34a;
      margin-bottom: 5px;
      border-bottom: 3px solid #16a34a;
      padding-bottom: 10px;
    }
    .subtitle {
      color: #666;
      margin-bottom: 20px;
    }
    h2 {
      font-size: 16px;
      color: #16a34a;
      margin: 20px 0 10px 0;
      padding: 8px 12px;
      background: #f0fdf4;
      border-left: 4px solid #16a34a;
    }
    h3 {
      font-size: 14px;
      color: #333;
      margin: 15px 0 8px 0;
      padding-bottom: 5px;
      border-bottom: 1px solid #e5e5e5;
    }
    .section {
      margin-bottom: 20px;
      padding: 15px;
      background: #fafafa;
      border-radius: 8px;
    }
    .row {
      display: flex;
      padding: 6px 0;
      border-bottom: 1px solid #eee;
    }
    .row:last-child { border-bottom: none; }
    .label {
      font-weight: 600;
      color: #555;
      width: 200px;
      flex-shrink: 0;
    }
    .value {
      color: #1a1a1a;
    }
    .director-card {
      background: white;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
    }
    .director-name {
      font-size: 14px;
      font-weight: 600;
      color: #16a34a;
      margin-bottom: 10px;
    }
    .financial-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .financial-box {
      background: #f5f5f5;
      padding: 10px;
      border-radius: 6px;
    }
    .financial-box h4 {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .totals-row {
      background: #16a34a;
      color: white;
      padding: 10px 15px;
      border-radius: 6px;
      margin-top: 10px;
      display: flex;
      justify-content: space-between;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 2px solid #e5e5e5;
      color: #666;
      font-size: 11px;
      text-align: center;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-submitted { background: #dbeafe; color: #1e40af; }
    .status-approved { background: #dcfce7; color: #166534; }
    .status-declined { background: #fee2e2; color: #991b1b; }
    @media print {
      body { padding: 0; }
      .section { break-inside: avoid; }
      .director-card { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>AssetMX Application Summary</h1>
  <p class="subtitle">
    Application ID: ${app.id}<br>
    Submitted: ${formatDate(app.created_at)}
    <span class="status-badge status-${app.status}">${app.status}</span>
  </p>

  <h2>1. Business Details</h2>
  <div class="section">
    <div class="row"><span class="label">Entity Name</span><span class="value">${app.entity_name || 'N/A'}</span></div>
    <div class="row"><span class="label">ABN</span><span class="value">${app.abn || 'N/A'}</span></div>
    <div class="row"><span class="label">Trading Name</span><span class="value">${app.trading_name || 'Same as entity name'}</span></div>
    <div class="row"><span class="label">Entity Type</span><span class="value">${formatEntityType(app.entity_type || '')}</span></div>
    <div class="row"><span class="label">GST Registered</span><span class="value">${app.gst_registered ? 'Yes' : 'No'}${app.gst_registered_date ? ` (since ${formatDate(app.gst_registered_date)})` : ''}</span></div>
    <div class="row"><span class="label">Business Address</span><span class="value">${app.business_address || ''} ${app.business_state || ''} ${app.business_postcode || ''}</span></div>
  </div>

  <h2>2. Director Details</h2>
  ${directors.map((d, i) => `
  <div class="director-card">
    <div class="director-name">Director ${i + 1}: ${d.firstName} ${d.lastName}</div>

    <h3>Personal Details</h3>
    <div class="row"><span class="label">Date of Birth</span><span class="value">${formatDate(d.dob)}</span></div>
    <div class="row"><span class="label">Email</span><span class="value">${d.email || 'N/A'}</span></div>
    <div class="row"><span class="label">Phone</span><span class="value">${d.phone || 'N/A'}</span></div>
    <div class="row"><span class="label">Residential Address</span><span class="value">${d.residentialAddress || [d.address, d.suburb, d.state, d.postcode].filter(Boolean).join(', ') || 'N/A'}</span></div>
    <div class="row"><span class="label">Driver's Licence</span><span class="value">${d.licenceNumber ? `${d.licenceNumber} (${d.licenceState})` : 'N/A'}</span></div>

    <h3>Assets & Liabilities</h3>
    <div class="financial-grid">
      <div class="financial-box">
        <h4>Property</h4>
        <div class="row"><span class="label">Owns Property</span><span class="value">${d.ownsProperty ? 'Yes' : 'No'}</span></div>
        ${d.ownsProperty ? `
        <div class="row"><span class="label">Property Value</span><span class="value">${currencyOrNA(d.propertyValue)}</span></div>
        <div class="row"><span class="label">Mortgage Balance</span><span class="value">${currencyOrNA(d.mortgageBalance)}</span></div>
        <div class="row"><span class="label">Monthly Payment</span><span class="value">${currencyOrNA(d.monthlyMortgagePayment)}</span></div>
        ` : ''}
      </div>
      <div class="financial-box">
        <h4>Investment Property</h4>
        <div class="row"><span class="label">Has Investment</span><span class="value">${d.hasInvestmentProperty ? 'Yes' : 'No'}</span></div>
        ${d.hasInvestmentProperty ? `
        <div class="row"><span class="label">Value</span><span class="value">${currencyOrNA(d.investmentPropertyValue)}</span></div>
        <div class="row"><span class="label">Mortgage</span><span class="value">${currencyOrNA(d.investmentMortgageBalance)}</span></div>
        <div class="row"><span class="label">Monthly Payment</span><span class="value">${currencyOrNA(d.monthlyInvestmentMortgagePayment)}</span></div>
        ` : ''}
      </div>
      <div class="financial-box">
        <h4>Vehicles</h4>
        <div class="row"><span class="label">Total Value</span><span class="value">${currencyOrNA(d.vehiclesValue)}</span></div>
        <div class="row"><span class="label">Loan Balance</span><span class="value">${currencyOrNA(d.vehicleLoanBalance)}</span></div>
        <div class="row"><span class="label">Monthly Payment</span><span class="value">${currencyOrNA(d.monthlyVehicleLoanPayment)}</span></div>
      </div>
      <div class="financial-box">
        <h4>Credit Cards</h4>
        <div class="row"><span class="label">Total Limit</span><span class="value">${currencyOrNA(d.creditCardLimit)}</span></div>
        <div class="row"><span class="label">Outstanding</span><span class="value">${currencyOrNA(d.creditCardOutstanding)}</span></div>
        <div class="row"><span class="label">Monthly Payment</span><span class="value">${currencyOrNA(d.monthlyCreditCardPayment)}</span></div>
      </div>
    </div>

    <h3>Income & Expenses</h3>
    <div class="financial-grid">
      <div class="financial-box">
        <h4>Income</h4>
        <div class="row"><span class="label">Annual Salary</span><span class="value">${currencyOrNA(d.annualSalary)}</span></div>
        <div class="row"><span class="label">Other Income</span><span class="value">${currencyOrNA(d.otherIncome)}${d.otherIncomeDescription ? ` (${d.otherIncomeDescription})` : ''}</span></div>
      </div>
      <div class="financial-box">
        <h4>Monthly Expenses</h4>
        <div class="row"><span class="label">Living Expenses</span><span class="value">${currencyOrNA(d.monthlyLivingExpenses)}</span></div>
        <div class="row"><span class="label">Total Payments</span><span class="value">${currencyOrNA(d.totalMonthlyPayments)}</span></div>
      </div>
    </div>

    <div class="totals-row">
      <span>Total Assets: ${currencyOrNA(d.totalAssets)}</span>
      <span>Total Liabilities: ${currencyOrNA(d.totalLiabilities)}</span>
      <span>Net Position: ${currencyOrNA(d.netPosition)}</span>
    </div>
  </div>
  `).join('')}

  <h2>3. Asset Details</h2>
  <div class="section">
    <div class="row"><span class="label">Asset Type</span><span class="value">${formatAssetType(app.asset_type)}</span></div>
    <div class="row"><span class="label">Category</span><span class="value">${app.asset_category || 'N/A'}</span></div>
    <div class="row"><span class="label">Condition</span><span class="value">${formatCondition(app.asset_condition)}</span></div>
    <div class="row"><span class="label">Year/Make/Model</span><span class="value">${[app.asset_year, app.asset_make, app.asset_model].filter(Boolean).join(' ') || 'N/A'}</span></div>
    <div class="row"><span class="label">Description</span><span class="value">${app.asset_description || 'N/A'}</span></div>
    <div class="row"><span class="label">Price (inc GST)</span><span class="value">${currencyOrNA(app.asset_price_inc_gst)}</span></div>
    <div class="row"><span class="label">Supplier</span><span class="value">${app.supplier_name || 'N/A'}${app.supplier_abn ? ` (ABN: ${app.supplier_abn})` : ''}</span></div>
  </div>

  <h2>4. Loan Details</h2>
  <div class="section">
    <div class="row"><span class="label">Loan Amount</span><span class="value">${formatCurrency(app.loan_amount)}</span></div>
    <div class="row"><span class="label">Deposit</span><span class="value">${currencyOrNA(app.deposit_amount)}</span></div>
    <div class="row"><span class="label">Trade-In</span><span class="value">${currencyOrNA(app.trade_in_amount)}</span></div>
    <div class="row"><span class="label">Term</span><span class="value">${app.term_months} months (${Math.round(app.term_months / 12)} years)</span></div>
    <div class="row"><span class="label">Balloon</span><span class="value">${app.balloon_percentage ?? 0}%${app.balloon_amount ? ` (${formatCurrency(app.balloon_amount)})` : ''}</span></div>
    <div class="row"><span class="label">Indicative Rate</span><span class="value">${app.indicative_rate ?? 'N/A'}% p.a.</span></div>
    <div class="row"><span class="label">Monthly Repayment</span><span class="value">${currencyOrNA(app.monthly_repayment)}</span></div>
  </div>

  <h2>5. Declaration</h2>
  <div class="section">
    <p style="margin-bottom: 10px;">
      <strong>Affordability Declaration:</strong> An affordability declaration will be sent to the applicant
      via Westpac's electronic signing system. This declaration confirms that the applicant can comfortably
      afford the proposed repayments.
    </p>
    <p style="color: #666; font-style: italic;">
      Status: Pending Westpac e-signature
    </p>
  </div>

  <div class="footer">
    <p>Generated by AssetMX on ${new Date().toLocaleString('en-AU')}</p>
    <p>Application ID: ${app.id}</p>
  </div>
</body>
</html>
`;
}

// Download application as HTML file
export function downloadApplicationHTML(app: ExportApplication): void {
  const html = generateApplicationHTML(app);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `AssetMX-Application-${app.entity_name.replace(/[^a-zA-Z0-9]/g, '-')}-${app.id.slice(0, 8)}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
