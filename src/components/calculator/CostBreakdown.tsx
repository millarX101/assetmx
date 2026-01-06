import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoIcon } from 'lucide-react';
import { formatCurrency, formatPercentage, type QuoteOutput } from '@/lib/calculator';

interface CostBreakdownProps {
  quote: QuoteOutput;
  loanAmount: number;
}

export function CostBreakdown({ quote, loanAmount }: CostBreakdownProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Cost Breakdown</CardTitle>
        <p className="text-sm text-muted-foreground">
          Every dollar accounted for. No surprises. No hidden fees.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Loan Costs */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm uppercase text-muted-foreground">Loan Repayments</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Loan Amount</span>
              <span className="font-medium">{formatCurrency(loanAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Total Interest ({formatPercentage(quote.indicativeRate)} over{' '}
                {quote.balloonAmount > 0 ? 'term + balloon' : 'term'})
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

        {/* One-Time Fees */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm uppercase text-muted-foreground">One-Time Fees</h4>
          <div className="space-y-2">
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
                      management. Unlike brokers, we don't add margin to your interest rate. This flat fee is
                      the same whether you borrow $20,000 or $500,000.
                    </p>
                    <p className="mt-2 text-xs italic">Only charged if your loan settles.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="font-medium">{formatCurrency(quote.platformFee)}</span>
            </div>

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
                      This is a one-time fee charged by the lender to set up your loan account. It covers
                      their administration and documentation costs.
                    </p>
                    <p className="mt-2">
                      This fee varies by lender ($395-$695). We've partnered with lenders who keep this low.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <span className="font-medium">{formatCurrency(quote.lenderEstablishmentFee)}</span>
            </div>

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
              <span className="font-semibold">Total Fees</span>
              <span className="font-semibold">{formatCurrency(quote.totalFees)}</span>
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
