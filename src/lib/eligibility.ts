// Pre-Eligibility Gate
// Rules-based checking BEFORE document collection
// Clean rejections with clear explanations

import type { ApplicationData, EligibilityResult, EligibilityCheck } from '@/types/application';

/**
 * Calculate months between two dates
 */
function monthsBetween(startDate: string, endDate: Date = new Date()): number {
  const start = new Date(startDate);
  const yearDiff = endDate.getFullYear() - start.getFullYear();
  const monthDiff = endDate.getMonth() - start.getMonth();
  return yearDiff * 12 + monthDiff;
}

/**
 * Run all eligibility checks against application data
 * Returns immediately usable result with clear fail reasons
 */
export function checkEligibility(application: ApplicationData): EligibilityResult {
  const checks: Record<string, EligibilityCheck> = {};
  const failReasons: string[] = [];

  // ===== HARD DECLINES =====
  // These stop the application immediately

  // 1. ABN Age (minimum 24 months)
  const abnAgeMonths = application.business.abnRegisteredDate
    ? monthsBetween(application.business.abnRegisteredDate)
    : 0;

  checks.abnAge = {
    passed: abnAgeMonths >= 24,
    value: abnAgeMonths,
    required: 24,
    message: abnAgeMonths >= 24
      ? `ABN registered ${abnAgeMonths} months (${Math.floor(abnAgeMonths / 12)} years)`
      : `ABN must be at least 24 months old. Yours is ${abnAgeMonths} months.`,
  };

  if (!checks.abnAge.passed) {
    failReasons.push(
      `Your ABN was registered ${abnAgeMonths} months ago. We require at least 24 months trading history.`
    );
  }

  // 2. GST Registration
  checks.gstRegistered = {
    passed: application.business.gstRegistered === true,
    value: application.business.gstRegistered,
    required: true,
    message: application.business.gstRegistered
      ? 'GST registered'
      : 'Business must be GST registered',
  };

  if (!checks.gstRegistered.passed) {
    failReasons.push(
      'Your business must be registered for GST. This is a requirement for our lender panel.'
    );
  }

  // 3. ABN Status (must be Active)
  const abnActive = application.business.abnLookup?.abnStatus === 'Active';
  checks.abnStatus = {
    passed: abnActive,
    value: application.business.abnLookup?.abnStatus || 'Unknown',
    required: 'Active',
    message: abnActive ? 'ABN is active' : 'ABN must be active',
  };

  if (!checks.abnStatus.passed && application.business.abnLookup) {
    failReasons.push(
      `Your ABN status is "${application.business.abnLookup.abnStatus}". Only active ABNs are eligible.`
    );
  }

  // 4. Loan Amount Range
  const loanAmount = application.loan.loanAmount;
  const loanInRange = loanAmount >= 5000 && loanAmount <= 500000;

  checks.loanAmount = {
    passed: loanInRange,
    value: loanAmount,
    required: '$5,000 - $500,000',
    message: loanInRange
      ? `Loan amount $${loanAmount.toLocaleString()} is within range`
      : `Loan amount must be between $5,000 and $500,000`,
  };

  if (!checks.loanAmount.passed) {
    if (loanAmount < 5000) {
      failReasons.push(`Minimum loan amount is $5,000. You've requested $${loanAmount.toLocaleString()}.`);
    } else {
      failReasons.push(`Maximum loan amount is $500,000. You've requested $${loanAmount.toLocaleString()}.`);
    }
  }

  // 5. Term Range
  const termMonths = application.loan.termMonths;
  const termInRange = termMonths >= 12 && termMonths <= 84;

  checks.termMonths = {
    passed: termInRange,
    value: termMonths,
    required: '12-84 months',
    message: termInRange
      ? `Term of ${termMonths} months is acceptable`
      : `Term must be between 12 and 84 months`,
  };

  if (!checks.termMonths.passed) {
    failReasons.push(`Loan term must be between 12 and 84 months. You've selected ${termMonths} months.`);
  }

  // 6. Balloon Percentage
  const balloonPct = application.loan.balloonPercentage;
  const balloonOk = balloonPct >= 0 && balloonPct <= 50;

  checks.balloonPercentage = {
    passed: balloonOk,
    value: balloonPct,
    required: '0-50%',
    message: balloonOk
      ? `Balloon of ${balloonPct}% is acceptable`
      : `Balloon/residual must be between 0% and 50%`,
  };

  if (!checks.balloonPercentage.passed) {
    failReasons.push(`Maximum balloon/residual is 50%. You've selected ${balloonPct}%.`);
  }

  // 7. At least one director
  const hasDirector = application.directors.directors.length >= 1;

  checks.directorRequired = {
    passed: hasDirector,
    value: application.directors.directors.length,
    required: 1,
    message: hasDirector
      ? `${application.directors.directors.length} director(s) provided`
      : 'At least one director/guarantor is required',
  };

  if (!checks.directorRequired.passed) {
    failReasons.push('At least one director or guarantor must be provided.');
  }

  // ===== SOFT CHECKS (Warnings, not declines) =====

  // Business use percentage
  const businessUse = application.loan.businessUsePercentage;
  const businessUseOk = businessUse >= 50;

  checks.businessUsePercentage = {
    passed: businessUseOk,
    value: businessUse,
    required: '50%+',
    message: businessUseOk
      ? `${businessUse}% business use qualifies for best rates`
      : `Business use under 50% may affect available rates`,
  };
  // Note: This is a soft check - doesn't add to failReasons

  // Asset age at term end (for used assets)
  if (application.asset.assetYear && application.asset.assetCondition.startsWith('used')) {
    const currentYear = new Date().getFullYear();
    const assetAge = currentYear - application.asset.assetYear;
    const ageAtTermEnd = assetAge + Math.ceil(termMonths / 12);
    const ageOk = ageAtTermEnd <= 15;

    checks.assetAgeAtTermEnd = {
      passed: ageOk,
      value: ageAtTermEnd,
      required: '15 years max',
      message: ageOk
        ? `Asset will be ${ageAtTermEnd} years old at term end`
        : `Asset will be ${ageAtTermEnd} years old at term end (max 15 years)`,
    };

    if (!checks.assetAgeAtTermEnd.passed) {
      failReasons.push(
        `The asset will be ${ageAtTermEnd} years old at the end of the loan term. Maximum asset age at term end is 15 years. Consider a shorter term.`
      );
    }
  }

  // ===== CALCULATE OVERALL RESULT =====
  const hardChecksPassed = [
    checks.abnAge,
    checks.gstRegistered,
    checks.abnStatus,
    checks.loanAmount,
    checks.termMonths,
    checks.balloonPercentage,
    checks.directorRequired,
    checks.assetAgeAtTermEnd,
  ].every((check) => !check || check.passed);

  return {
    passed: hardChecksPassed,
    checks,
    failReasons,
  };
}

/**
 * Quick pre-check before starting application
 * Just checks the basics that can be determined from calculator
 */
export function quickEligibilityCheck(
  loanAmount: number,
  termMonths: number,
  balloonPercentage: number
): { passed: boolean; issues: string[] } {
  const issues: string[] = [];

  if (loanAmount < 5000) {
    issues.push('Minimum loan amount is $5,000');
  }
  if (loanAmount > 500000) {
    issues.push('Maximum loan amount is $500,000');
  }
  if (termMonths < 12) {
    issues.push('Minimum term is 12 months');
  }
  if (termMonths > 84) {
    issues.push('Maximum term is 84 months');
  }
  if (balloonPercentage > 50) {
    issues.push('Maximum balloon/residual is 50%');
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}

/**
 * Get human-readable explanation for an eligibility result
 */
export function getEligibilityExplanation(result: EligibilityResult): string {
  if (result.passed) {
    return 'Great news! Based on the information provided, you meet our initial eligibility criteria. The next step is to upload your documents for verification.';
  }

  const intro = "Unfortunately, we're unable to proceed with your application at this time.";
  const reasons = result.failReasons.map((r, i) => `${i + 1}. ${r}`).join('\n');

  return `${intro}\n\n${reasons}\n\nIf you believe this is an error or your circumstances have changed, please contact us.`;
}

/**
 * Format eligibility checks for display
 */
export function formatEligibilityChecks(
  checks: Record<string, EligibilityCheck>
): { label: string; passed: boolean; message: string }[] {
  const labels: Record<string, string> = {
    abnAge: 'ABN Age',
    gstRegistered: 'GST Registration',
    abnStatus: 'ABN Status',
    loanAmount: 'Loan Amount',
    termMonths: 'Loan Term',
    balloonPercentage: 'Balloon/Residual',
    directorRequired: 'Director Details',
    businessUsePercentage: 'Business Use',
    assetAgeAtTermEnd: 'Asset Age',
  };

  return Object.entries(checks).map(([key, check]) => ({
    label: labels[key] || key,
    passed: check.passed,
    message: check.message || '',
  }));
}
