// Step 5: Review & Submit
// Final review of all details before submission

import { useState } from 'react';
import { useApplicationStore } from '@/stores/applicationStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatCurrency, formatPercentage } from '@/lib/calculator';
import {
  ASSET_TYPE_LABELS,
  CONDITION_LABELS,
} from '@/types/application';
import {
  ClipboardCheck,
  ChevronLeft,
  CheckCircle,
  XCircle,
  Loader2,
  Building2,
  User,
  Package,
  DollarSign,
  Send,
} from 'lucide-react';

interface ReviewStepProps {
  onClose?: () => void;
}

export function ReviewStep({ onClose }: ReviewStepProps) {
  const {
    application,
    prevStep,
    goToStep,
    runEligibilityCheck,
    submitApplication,
    isSubmitting,
  } = useApplicationStore();

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [creditCheckAccepted, setCreditCheckAccepted] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Run eligibility check on mount
  const eligibility = application.eligibility || runEligibilityCheck();

  const handleSubmit = async () => {
    const result = await submitApplication();
    if (result.success) {
      setSubmitted(true);
    }
  };

  const allConsentsGiven = termsAccepted && privacyAccepted && creditCheckAccepted;

  // Success screen
  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Application Submitted!
        </h2>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          We've received your application and will review it within 15 minutes
          during business hours.
        </p>

        {application.quote && (
          <Card className="max-w-sm mx-auto bg-green-50 border-green-200 mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Indicative Rate</span>
                  <p className="font-bold text-green-700 text-lg">
                    {formatPercentage(application.quote.indicativeRate)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Monthly Repayment</span>
                  <p className="font-bold text-lg">
                    {formatCurrency(application.quote.monthlyRepayment)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Next steps: Check your email for document upload instructions.
          </p>
          <Button
            onClick={onClose}
            className="bg-gradient-to-r from-green-800 via-green-700 to-emerald-600"
          >
            Done
          </Button>
        </div>
      </div>
    );
  }

  // Ineligible screen
  if (!eligibility.passed) {
    return (
      <div className="space-y-6">
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-5 w-5 text-red-600" />
          <AlertTitle className="text-red-800">
            Application Cannot Proceed
          </AlertTitle>
          <AlertDescription className="text-red-700">
            <p className="mt-2">
              Based on the information provided, your application doesn't meet
              our current eligibility criteria:
            </p>
            <ul className="mt-3 space-y-2">
              {eligibility.failReasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  {reason}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>

        <div className="flex justify-between">
          <Button variant="outline" onClick={prevStep}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Edit
          </Button>
          <Button variant="outline" onClick={onClose}>
            Return to Calculator
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-green-600" />
          Review Your Application
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Please review all details before submitting
        </p>
      </div>

      {/* Eligibility Status */}
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <AlertTitle className="text-green-800">Eligibility Confirmed</AlertTitle>
        <AlertDescription className="text-green-700">
          Your application meets our initial eligibility criteria.
        </AlertDescription>
      </Alert>

      {/* Business Details */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-green-600" />
              Business Details
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToStep(0)}
              className="text-green-600 hover:text-green-700"
            >
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">ABN</span>
            <p className="font-medium">{application.business.abn}</p>
          </div>
          <div>
            <span className="text-gray-500">Entity Name</span>
            <p className="font-medium">{application.business.entityName}</p>
          </div>
          <div>
            <span className="text-gray-500">Entity Type</span>
            <p className="font-medium capitalize">
              {application.business.entityType.replace('_', ' ')}
            </p>
          </div>
          <div>
            <span className="text-gray-500">GST Registered</span>
            <p className="font-medium">
              {application.business.gstRegistered ? 'Yes' : 'No'}
            </p>
          </div>
          <div className="md:col-span-2">
            <span className="text-gray-500">Address</span>
            <p className="font-medium">
              {application.business.businessAddress},{' '}
              {application.business.businessState}{' '}
              {application.business.businessPostcode}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Directors */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-green-600" />
              Directors / Guarantors
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToStep(1)}
              className="text-green-600 hover:text-green-700"
            >
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {application.directors.directors.map((director, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <User className="w-5 h-5 text-green-700" />
              </div>
              <div className="flex-1">
                <p className="font-medium">
                  {director.firstName} {director.lastName}
                  {index === application.directors.primaryContactIndex && (
                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      Primary
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-500">{director.email}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Asset Details */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-green-600" />
              Asset Details
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToStep(2)}
              className="text-green-600 hover:text-green-700"
            >
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Asset Type</span>
            <p className="font-medium">
              {ASSET_TYPE_LABELS[application.asset.assetType]}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Condition</span>
            <p className="font-medium">
              {CONDITION_LABELS[application.asset.assetCondition]}
            </p>
          </div>
          {application.asset.assetDescription && (
            <div className="md:col-span-2">
              <span className="text-gray-500">Description</span>
              <p className="font-medium">{application.asset.assetDescription}</p>
            </div>
          )}
          <div>
            <span className="text-gray-500">Price (inc GST)</span>
            <p className="font-medium">
              {formatCurrency(application.asset.assetPriceIncGst)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Loan Details */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Loan Details
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToStep(3)}
              className="text-green-600 hover:text-green-700"
            >
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Loan Amount</span>
            <p className="font-medium text-lg">
              {formatCurrency(application.loan.loanAmount)}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Term</span>
            <p className="font-medium">
              {application.loan.termMonths} months (
              {Math.floor(application.loan.termMonths / 12)} years)
            </p>
          </div>
          <div>
            <span className="text-gray-500">Balloon</span>
            <p className="font-medium">
              {application.loan.balloonPercentage}% (
              {formatCurrency(application.loan.balloonAmount)})
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quote Summary */}
      {application.quote && (
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-green-800">
              Your Finance Quote
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-sm text-gray-600">Indicative Rate</span>
                <p className="text-2xl font-bold text-green-700">
                  {formatPercentage(application.quote.indicativeRate)}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Monthly Repayment</span>
                <p className="text-2xl font-bold">
                  {formatCurrency(application.quote.monthlyRepayment)}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Total Interest</span>
                <p className="font-semibold">
                  {formatCurrency(application.quote.totalInterest)}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Total Cost</span>
                <p className="font-semibold">
                  {formatCurrency(application.quote.totalCost)}
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-600">
              Platform fee: $800 | Establishment: $495 | PPSR: $7.40
            </p>
          </CardContent>
        </Card>
      )}

      {/* Consents */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="font-medium text-gray-900">Declarations & Consents</h3>

        <div className="flex items-start space-x-3">
          <Checkbox
            id="terms"
            checked={termsAccepted}
            onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
          />
          <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
            I have read and agree to the{' '}
            <a href="#" className="text-green-600 hover:underline">
              Terms and Conditions
            </a>
          </Label>
        </div>

        <div className="flex items-start space-x-3">
          <Checkbox
            id="privacy"
            checked={privacyAccepted}
            onCheckedChange={(checked) => setPrivacyAccepted(checked as boolean)}
          />
          <Label htmlFor="privacy" className="text-sm leading-relaxed cursor-pointer">
            I have read and agree to the{' '}
            <a href="#" className="text-green-600 hover:underline">
              Privacy Policy
            </a>{' '}
            and consent to the collection and use of my information
          </Label>
        </div>

        <div className="flex items-start space-x-3">
          <Checkbox
            id="creditCheck"
            checked={creditCheckAccepted}
            onCheckedChange={(checked) =>
              setCreditCheckAccepted(checked as boolean)
            }
          />
          <Label
            htmlFor="creditCheck"
            className="text-sm leading-relaxed cursor-pointer"
          >
            I consent to a credit check being performed on myself and any
            directors/guarantors listed in this application
          </Label>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={prevStep}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!allConsentsGiven || isSubmitting}
          className="bg-gradient-to-r from-green-800 via-green-700 to-emerald-600 hover:from-green-900 hover:via-green-800 hover:to-emerald-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Submit Application
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
