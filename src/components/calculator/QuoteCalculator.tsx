import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  calculateQuote,
  formatCurrency,
  formatPercentage,
  getMaxBalloon,
  PLATFORM_FEE,
  type QuoteInput,
} from '@/lib/calculator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { InfoIcon, ArrowRight } from 'lucide-react';
import { CostBreakdown } from './CostBreakdown';
import { BrokerComparison } from './BrokerComparison';
import { LeadCaptureModal } from '@/components/admin/LeadCaptureModal';
import { useApplicationStore } from '@/stores/applicationStore';

const assetTypeLabels = {
  vehicle: 'Vehicle (Car, Ute, Van)',
  truck: 'Truck / Trailer',
  equipment: 'Equipment / Machinery',
};

const assetConditionLabels = {
  new: 'New',
  demo: 'Demo',
  used_0_3: 'Used (0-3 years)',
  used_4_7: 'Used (4-7 years)',
  used_8_plus: 'Used (8+ years)',
};

const termOptions = [
  { months: 12, label: '1yr' },
  { months: 24, label: '2yr' },
  { months: 36, label: '3yr' },
  { months: 48, label: '4yr' },
  { months: 60, label: '5yr' },
];

export function QuoteCalculator() {
  const navigate = useNavigate();
  const { initFromCalculator } = useApplicationStore();
  const [showResults, setShowResults] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [formData, setFormData] = useState<QuoteInput>({
    assetType: 'vehicle',
    assetCondition: 'new',
    loanAmount: 50000,
    termMonths: 60,
    balloonPercentage: 20,
    financePlatformFee: true, // Default: finance the $800 fee
  });
  const [payFeeUpfront, setPayFeeUpfront] = useState(false);

  // Get max balloon for current term
  const maxBalloon = getMaxBalloon(formData.termMonths);

  // Adjust balloon if it exceeds max for new term
  const effectiveBalloon = Math.min(formData.balloonPercentage, maxBalloon);

  // Live calculation as user adjusts inputs
  const liveQuote = (() => {
    try {
      return calculateQuote({ ...formData, balloonPercentage: effectiveBalloon });
    } catch {
      return null;
    }
  })();

  const handleShowFullBreakdown = () => {
    setShowResults(true);
    // Scroll to results
    setTimeout(() => {
      document.getElementById('results-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  };

  return (
    <TooltipProvider>
      <div className="w-full max-w-4xl mx-auto">
        <Card className="border-purple-100 shadow-card">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl font-display text-slate-900">Asset Finance Calculator</CardTitle>
            <p className="text-slate-500">
              See your real rate in 30 seconds. No hidden fees. Ever.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Asset Type */}
              <div className="space-y-2">
                <Label htmlFor="asset-type" className="text-slate-700">What are you financing?</Label>
                <Select
                  value={formData.assetType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, assetType: value as QuoteInput['assetType'] })
                  }
                >
                  <SelectTrigger id="asset-type" className="border-slate-200 focus:ring-purple-500 focus:border-purple-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(assetTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Asset Condition */}
              <div className="space-y-2">
                <Label htmlFor="asset-condition" className="text-slate-700">Asset Condition</Label>
                <Select
                  value={formData.assetCondition}
                  onValueChange={(value) =>
                    setFormData({ ...formData, assetCondition: value as QuoteInput['assetCondition'] })
                  }
                >
                  <SelectTrigger id="asset-condition" className="border-slate-200 focus:ring-purple-500 focus:border-purple-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(assetConditionLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Loan Amount */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-slate-700">Loan Amount</Label>
                  <span className="text-2xl font-mono font-bold text-slate-900">{formatCurrency(formData.loanAmount)}</span>
                </div>
                <Slider
                  value={[formData.loanAmount]}
                  onValueChange={([value]) => setFormData({ ...formData, loanAmount: value })}
                  min={5000}
                  max={500000}
                  step={5000}
                  className="w-full [&_[role=slider]]:bg-gradient-brand [&_[role=slider]]:border-purple-600 [&_.bg-primary]:bg-gradient-brand"
                />
                <div className="flex justify-between text-sm text-slate-500">
                  <span>$5,000</span>
                  <span>$500,000</span>
                </div>
              </div>

              {/* Loan Term */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-slate-700">Loan Term</Label>
                  <span className="text-lg font-semibold text-slate-900">
                    {formData.termMonths} months ({formData.termMonths / 12} years)
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {termOptions.map(({ months, label }) => (
                    <Button
                      key={months}
                      type="button"
                      variant={formData.termMonths === months ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFormData({ ...formData, termMonths: months })}
                      className={formData.termMonths === months
                        ? 'bg-gradient-brand hover:opacity-90 text-white border-0'
                        : 'border-slate-200 text-slate-600 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200'}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Balloon */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Label className="text-slate-700">Balloon / Residual</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InfoIcon className="h-4 w-4 text-slate-400 cursor-help hover:text-purple-600 transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          A balloon payment reduces your monthly repayments but leaves a lump sum due at
                          the end of the loan. Max {maxBalloon}% for {Math.ceil(formData.termMonths / 12)} year term.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <span className="text-lg font-semibold text-slate-900">
                    {effectiveBalloon}% (
                    {formatCurrency((formData.loanAmount * effectiveBalloon) / 100)})
                  </span>
                </div>
                <Slider
                  value={[effectiveBalloon]}
                  onValueChange={([value]) => setFormData({ ...formData, balloonPercentage: value })}
                  min={0}
                  max={maxBalloon}
                  step={5}
                  className="w-full [&_[role=slider]]:bg-gradient-brand [&_[role=slider]]:border-purple-600 [&_.bg-primary]:bg-gradient-brand"
                />
                <div className="flex justify-between text-sm text-slate-500">
                  <span>0%</span>
                  <span>{maxBalloon}% max</span>
                </div>
              </div>

              {/* Platform Fee Option */}
              <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <Checkbox
                  id="pay-fee-upfront"
                  checked={payFeeUpfront}
                  onCheckedChange={(checked) => {
                    setPayFeeUpfront(checked === true);
                    setFormData({ ...formData, financePlatformFee: checked !== true });
                  }}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <Label htmlFor="pay-fee-upfront" className="text-slate-700 font-medium cursor-pointer">
                    Pay {formatCurrency(PLATFORM_FEE)} platform fee upfront
                  </Label>
                  <p className="text-sm text-slate-500 mt-1">
                    {payFeeUpfront
                      ? 'Fee will be due before settlement is lodged.'
                      : 'Fee is financed into your loan (most popular option).'}
                  </p>
                </div>
              </div>

              {/* Live Quote Preview */}
              {liveQuote && (
                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-sm text-slate-500 mb-1">Your Indicative Rate</p>
                      <p className="text-4xl md:text-5xl font-mono font-bold text-gradient-brand">
                        {formatPercentage(liveQuote.indicativeRate)}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">p.a. base rate*</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-6">
                      <div className="text-center">
                        <p className="text-xs text-slate-500">Weekly</p>
                        <p className="text-base md:text-lg font-mono font-semibold text-slate-900">
                          {formatCurrency(payFeeUpfront ? liveQuote.weeklyRepaymentFeeUpfront : liveQuote.weeklyRepayment)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500">Fortnightly</p>
                        <p className="text-base md:text-lg font-mono font-semibold text-slate-900">
                          {formatCurrency(payFeeUpfront ? liveQuote.fortnightlyRepaymentFeeUpfront : liveQuote.fortnightlyRepayment)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500">Monthly</p>
                        <p className="text-base md:text-lg font-mono font-semibold text-slate-900">
                          {formatCurrency(payFeeUpfront ? liveQuote.monthlyRepaymentFeeUpfront : liveQuote.monthlyRepayment)}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 text-center mt-4">
                      Payments in advance • First payment due at contract start
                    </p>
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={handleShowFullBreakdown}
                className="w-full bg-gradient-brand hover:opacity-90 text-white shadow-lg shadow-purple-900/20 border-0"
                size="lg"
              >
                See Full Cost Breakdown <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {showResults && liveQuote && (
          <div id="results-section" className="mt-8 space-y-6 scroll-mt-8">
            <CostBreakdown quote={liveQuote} loanAmount={formData.loanAmount} payFeeUpfront={payFeeUpfront} />
            <BrokerComparison quote={liveQuote} />

            {/* CTA */}
            <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-lg md:text-xl font-semibold text-purple-800">
                      Save {formatCurrency(liveQuote.estimatedSaving)} with AssetMX
                    </h3>
                    <p className="text-purple-600 mt-1">
                      Apply now for conditional approval in 15 minutes
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={() => {
                      initFromCalculator(formData);
                      navigate('/chat-apply');
                    }}
                    className="bg-gradient-brand hover:opacity-90 text-white shadow-lg shadow-purple-900/20 w-full md:w-auto"
                  >
                    Start Application
                  </Button>
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-slate-500 text-center max-w-2xl mx-auto">
              *Rate subject to credit assessment. Rates from 6.45% p.a. for 1-5 year terms, 7.15% p.a. for longer terms.
              For established businesses with 2+ years trading history and good credit. Rates are lender base rates
              with no markup. Our $800 fee is shown separately for full transparency.
            </p>
          </div>
        )}

        {/* Lead Capture Modal */}
        {liveQuote && (
          <LeadCaptureModal
            open={showLeadModal}
            onOpenChange={setShowLeadModal}
            quote={liveQuote}
            quoteInput={formData}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
