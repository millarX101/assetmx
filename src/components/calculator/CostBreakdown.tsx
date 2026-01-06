import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoIcon } from 'lucide-react';
import { formatCurrency, formatPercentage, type QuoteOutput } from '@/lib/calculator';

interface CostBreakdownProps {
  quote: QuoteOutput;
  loanAmount: number;
  payFeeUpfront?: boolean;
}

export function CostBreakdown({ quote, loanAmount, payFeeUpfront = false }: CostBreakdownProps) {
  // Calculate the actual amount financed based on fee option
  const amountFinanced = payFeeUpfront
    ? quote.totalAmountFinancedFeeUpfront
    : quote.totalAmountFinanced;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Cost Breakdown</CardTitle>
        <p className="text-sm text-muted-foreground">
          Every dollar accounted for. No surprises. No hidden fees.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Amount Financed */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm uppercase text-muted-foreground">Amount Financed</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Asset Cost</span>
              <span className="font-medium">{formatCurrency(loanAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">+ Lender Establishment Fee (financed)</span>
              <span className="font-medium">{formatCurrency(quote.lenderEstablishmentFee)}</span>
            </div>
            {!payFeeUpfront && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">+ Platform Fee (financed)</span>
                <span className="font-medium">{formatCurrency(quote.platformFee)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t">
              <span className="font-semibold">Total Amount Financed</span>
              <span className="font-semibold">{formatCurrency(amountFinanced)}</span>
            </div>
          </div>
        </div>

        {/* Loan Repayments */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm uppercase text-muted-foreground">Loan Repayments</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Total Interest ({formatPercentage(quote.indicativeRate)} p.a.)
              </span>
              <span className="font-medium">{formatCurrency(quote.totalInterest)}</span>
            </div>
            {quote.balloonAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Balloon Payment (end of term)</span>
                <span className="font-medium">{formatCurrency(quote.balloonAmount)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t">
              <span className="font-semibold">Total Repayments</span>
              <span className="font-semibold">{formatCurrency(quote.totalRepayments)}</span>
            </div>
          </div>
        </div>

        {/* Upfront Fees (paid before settlement) */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm uppercase text-muted-foreground">Due Before Settlement</h4>
          <div className="space-y-2">
            {payFeeUpfront && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Platform Fee (AssetMX)</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-semibold mb-1">Our Flat $800 Fee</p>
                      <p>
                        This covers our AI-powered application processing, document verification, and loan
                        management. Unlike brokers, we don't add margin to your interest rate.
                      </p>
                      <p className="mt-2 text-xs italic">Due before settlement is lodged.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="font-medium">{formatCurrency(quote.platformFee)}</span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">PPSR Registration</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold mb-1">Government Registry Fee</p>
                    <p>
                      The Personal Property Securities Register (PPSR) is a government database that records
                      the lender's security interest in your asset.
                    </p>
                    <p className="mt-2">This is a mandatory government fee.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="font-medium">{formatCurrency(quote.ppsrFee)}</span>
            </div>

            <div className="flex justify-between pt-2 border-t">
              <span className="font-semibold">Total Due Upfront</span>
              <span className="font-semibold">
                {formatCurrency(payFeeUpfront ? quote.platformFee + quote.ppsrFee : quote.ppsrFee)}
              </span>
            </div>
          </div>
        </div>

        {/* Financed Fees (included in loan) */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm uppercase text-muted-foreground">Financed Into Loan</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Lender Establishment Fee</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold mb-1">Lender Setup Fee</p>
                    <p>
                      This is a one-time fee charged by the lender to set up your loan account. It's
                      financed into the loan amount.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="font-medium">{formatCurrency(quote.lenderEstablishmentFee)}</span>
            </div>

            {!payFeeUpfront && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Platform Fee (AssetMX)</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-semibold mb-1">Our Flat $800 Fee</p>
                      <p>
                        This covers our AI-powered application processing, document verification, and loan
                        management. Unlike brokers, we don't add margin to your interest rate.
                      </p>
                      <p className="mt-2 text-xs italic">Financed into your loan (most popular option).</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="font-medium">{formatCurrency(quote.platformFee)}</span>
              </div>
            )}

            <div className="flex justify-between pt-2 border-t">
              <span className="font-semibold">Total Financed Fees</span>
              <span className="font-semibold">
                {formatCurrency(payFeeUpfront ? quote.lenderEstablishmentFee : quote.lenderEstablishmentFee + quote.platformFee)}
              </span>
            </div>
          </div>
        </div>

        {/* Total Cost */}
        <div className="bg-primary/5 rounded-lg p-4 border-2 border-primary/20">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-bold text-lg">Total Cost of Finance</h4>
              <p className="text-xs text-muted-foreground mt-1">
                All repayments + all fees = complete transparency
              </p>
            </div>
            <span className="text-2xl md:text-3xl font-bold text-primary">
              {formatCurrency(quote.totalCost)}
            </span>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 text-sm">
          <p className="font-semibold mb-2">Why this matters:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>✓ No hidden broker commission in the rate</li>
            <li>✓ All fees shown upfront before you apply</li>
            <li>✓ No surprises at settlement</li>
            <li>✓ Compare apples-to-apples with other quotes</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
