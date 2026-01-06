// Application Wizard Container
// Orchestrates multi-step application flow

import { useEffect } from 'react';
import { useApplicationStore } from '@/stores/applicationStore';
import { ProgressIndicator } from './ProgressIndicator';
import { BusinessDetailsStep } from './steps/BusinessDetailsStep';
import { DirectorDetailsStep } from './steps/DirectorDetailsStep';
import { AssetDetailsStep } from './steps/AssetDetailsStep';
import { LoanDetailsStep } from './steps/LoanDetailsStep';
import { ReviewStep } from './steps/ReviewStep';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, X } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/calculator';

interface ApplicationWizardProps {
  onClose?: () => void;
}

export function ApplicationWizard({ onClose }: ApplicationWizardProps) {
  const {
    application,
    currentStep,
    goToStep,
    calculateAndStoreQuote,
  } = useApplicationStore();

  // Recalculate quote when loan details change
  useEffect(() => {
    if (application.loan.loanAmount > 0) {
      calculateAndStoreQuote();
    }
  }, [
    application.asset.assetType,
    application.asset.assetCondition,
    application.loan.loanAmount,
    application.loan.termMonths,
    application.loan.balloonPercentage,
    calculateAndStoreQuote,
  ]);

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <BusinessDetailsStep />;
      case 1:
        return <DirectorDetailsStep />;
      case 2:
        return <AssetDetailsStep />;
      case 3:
        return <LoanDetailsStep />;
      case 4:
        return <ReviewStep onClose={onClose} />;
      default:
        return <BusinessDetailsStep />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Calculator
                </Button>
              )}
              <h1 className="text-lg font-semibold text-gray-900">
                Finance Application
              </h1>
            </div>

            {/* Quote summary badge */}
            {application.quote && (
              <div className="hidden sm:flex items-center gap-4 text-sm">
                <div className="text-right">
                  <span className="text-gray-500">Rate</span>
                  <span className="ml-2 font-semibold text-green-700">
                    {formatPercentage(application.quote.indicativeRate)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-gray-500">Monthly</span>
                  <span className="ml-2 font-semibold">
                    {formatCurrency(application.quote.monthlyRepayment)}
                  </span>
                </div>
              </div>
            )}

            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Progress indicator */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <ProgressIndicator
            currentStep={currentStep}
            completedStep={application.stepCompleted}
            onStepClick={goToStep}
          />
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card className="shadow-sm">
          <CardContent className="p-6 md:p-8">
            {renderStep()}
          </CardContent>
        </Card>

        {/* Mobile quote summary */}
        {application.quote && (
          <div className="sm:hidden mt-4">
            <Card className="bg-green-50 border-green-100">
              <CardContent className="p-4">
                <div className="flex justify-between text-sm">
                  <div>
                    <span className="text-gray-600">Indicative Rate</span>
                    <p className="font-semibold text-green-700">
                      {formatPercentage(application.quote.indicativeRate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-600">Monthly Repayment</span>
                    <p className="font-semibold">
                      {formatCurrency(application.quote.monthlyRepayment)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
