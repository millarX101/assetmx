// Step 4: Loan Details
// Amount, term, balloon, and business use

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useApplicationStore } from '@/stores/applicationStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatPercentage } from '@/lib/calculator';
import { type LoanDetailsData } from '@/types/application';
import { DollarSign, ChevronLeft, HelpCircle, Calculator } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function LoanDetailsStep() {
  const { application, updateLoan, nextStep, prevStep, calculateAndStoreQuote } =
    useApplicationStore();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
  } = useForm<LoanDetailsData>({
    defaultValues: application.loan,
  });

  const assetPriceIncGst = application.asset.assetPriceIncGst || 0;
  const watchedDeposit = watch('depositAmount') || 0;
  const watchedTradeIn = watch('tradeInAmount') || 0;
  const watchedTermMonths = watch('termMonths');
  const watchedBalloonPct = watch('balloonPercentage');
  const watchedBusinessUse = watch('businessUsePercentage');

  // Calculate loan amount from asset price minus deposit/trade-in
  const calculatedLoanAmount = Math.max(0, assetPriceIncGst - watchedDeposit - watchedTradeIn);
  const balloonAmount = calculatedLoanAmount * (watchedBalloonPct / 100);

  // Update loan amount when dependencies change
  useEffect(() => {
    if (assetPriceIncGst > 0) {
      setValue('loanAmount', calculatedLoanAmount);
      updateLoan({
        loanAmount: calculatedLoanAmount,
        depositAmount: watchedDeposit,
        tradeInAmount: watchedTradeIn,
        termMonths: watchedTermMonths,
        balloonPercentage: watchedBalloonPct,
        balloonAmount: balloonAmount,
        businessUsePercentage: watchedBusinessUse,
      });
    }
  }, [
    assetPriceIncGst,
    watchedDeposit,
    watchedTradeIn,
    watchedTermMonths,
    watchedBalloonPct,
    watchedBusinessUse,
    calculatedLoanAmount,
    balloonAmount,
    setValue,
    updateLoan,
  ]);

  // Recalculate quote when values change
  useEffect(() => {
    if (calculatedLoanAmount >= 5000) {
      calculateAndStoreQuote();
    }
  }, [calculatedLoanAmount, watchedTermMonths, watchedBalloonPct, calculateAndStoreQuote]);

  const onSubmit = (data: LoanDetailsData) => {
    updateLoan({
      ...data,
      loanAmount: calculatedLoanAmount,
      balloonAmount: balloonAmount,
    });
    nextStep();
  };

  // Term options
  const termOptions = [
    { months: 12, label: '1 year' },
    { months: 24, label: '2 years' },
    { months: 36, label: '3 years' },
    { months: 48, label: '4 years' },
    { months: 60, label: '5 years' },
    { months: 72, label: '6 years' },
    { months: 84, label: '7 years' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          Loan Details
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure your loan amount, term, and structure
        </p>
      </div>

      {/* Loan Amount Calculation */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Asset Price</span>
              <p className="font-semibold">{formatCurrency(assetPriceIncGst)}</p>
            </div>
            <div>
              <span className="text-gray-500">Less Deposit</span>
              <p className="font-semibold text-red-600">
                -{formatCurrency(watchedDeposit)}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Less Trade-in</span>
              <p className="font-semibold text-red-600">
                -{formatCurrency(watchedTradeIn)}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Loan Amount</span>
              <p className="font-bold text-lg text-green-700">
                {formatCurrency(calculatedLoanAmount)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deposit & Trade-in */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="depositAmount">Deposit (optional)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <Input
              id="depositAmount"
              type="number"
              className="pl-7"
              placeholder="0"
              {...register('depositAmount', {
                min: { value: 0, message: 'Cannot be negative' },
                valueAsNumber: true,
              })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tradeInAmount">Trade-in Value (optional)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <Input
              id="tradeInAmount"
              type="number"
              className="pl-7"
              placeholder="0"
              {...register('tradeInAmount', {
                min: { value: 0, message: 'Cannot be negative' },
                valueAsNumber: true,
              })}
            />
          </div>
        </div>
      </div>

      {/* Term Selection */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          Loan Term
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Longer terms mean lower repayments but more interest overall.
                  Most business assets are financed over 3-5 years.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <div className="flex flex-wrap gap-2">
          {termOptions.map((option) => (
            <Button
              key={option.months}
              type="button"
              variant={watchedTermMonths === option.months ? 'default' : 'outline'}
              size="sm"
              onClick={() => setValue('termMonths', option.months)}
              className={
                watchedTermMonths === option.months
                  ? 'bg-green-600 hover:bg-green-700'
                  : ''
              }
            >
              {option.label}
            </Button>
          ))}
        </div>
        <p className="text-sm text-gray-500">
          {watchedTermMonths} months ({Math.floor(watchedTermMonths / 12)} years
          {watchedTermMonths % 12 > 0 ? ` ${watchedTermMonths % 12} months` : ''})
        </p>
      </div>

      {/* Balloon/Residual */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          Balloon / Residual: {watchedBalloonPct}%
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  A balloon payment reduces your monthly repayments but leaves a
                  lump sum at the end. You can refinance, pay it off, or trade in.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Controller
          name="balloonPercentage"
          control={control}
          render={({ field }) => (
            <Slider
              min={0}
              max={50}
              step={5}
              value={[field.value]}
              onValueChange={([value]) => field.onChange(value)}
              className="py-4"
            />
          )}
        />
        <div className="flex justify-between text-sm text-gray-500">
          <span>0% (no balloon)</span>
          <span className="font-medium text-gray-900">
            Balloon: {formatCurrency(balloonAmount)}
          </span>
          <span>50% max</span>
        </div>
      </div>

      {/* Business Use Percentage */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          Business Use: {watchedBusinessUse}%
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  The percentage of time the asset will be used for business
                  purposes. This affects GST and depreciation claims.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Controller
          name="businessUsePercentage"
          control={control}
          render={({ field }) => (
            <Slider
              min={0}
              max={100}
              step={5}
              value={[field.value]}
              onValueChange={([value]) => field.onChange(value)}
              className="py-4"
            />
          )}
        />
        <div className="flex justify-between text-sm text-gray-500">
          <span>0% (personal)</span>
          <span>100% (business)</span>
        </div>
        {watchedBusinessUse < 50 && (
          <p className="text-sm text-yellow-600">
            Business use under 50% may affect available rates and GST treatment.
          </p>
        )}
      </div>

      {/* Live Quote Preview */}
      {application.quote && calculatedLoanAmount >= 5000 && (
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-800">Your Quote</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-sm text-gray-600">Rate</span>
                <p className="text-xl font-bold text-green-700">
                  {formatPercentage(application.quote.indicativeRate)}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Monthly</span>
                <p className="text-xl font-bold">
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
          </CardContent>
        </Card>
      )}

      {/* Validation Warning */}
      {calculatedLoanAmount < 5000 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            Minimum loan amount is $5,000. Adjust your deposit or trade-in to
            increase the loan amount.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={prevStep}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <Button
          type="submit"
          disabled={calculatedLoanAmount < 5000}
          className="bg-gradient-to-r from-green-800 via-green-700 to-emerald-600 hover:from-green-900 hover:via-green-800 hover:to-emerald-700"
        >
          Review Application
        </Button>
      </div>

      {/* AI Explainer */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-sm text-blue-800">
          <strong>Pro tip:</strong> Based on your BAS, keeping repayments under
          15% of monthly turnover is generally sustainable. A 20-30% balloon can
          reduce repayments significantly while preserving cash flow.
        </p>
      </div>
    </form>
  );
}
