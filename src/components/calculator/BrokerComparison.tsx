import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercentage, type QuoteOutput } from '@/lib/calculator';
import { TrendingDown, AlertCircle } from 'lucide-react';

interface BrokerComparisonProps {
  quote: QuoteOutput;
}

export function BrokerComparison({ quote }: BrokerComparisonProps) {
  const savingsPercentage = ((quote.estimatedSaving / quote.brokerComparisonTotalCost) * 100).toFixed(1);

  return (
    <Card className="border-2 border-green-200 dark:border-green-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-green-600" />
          How We Compare
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Side-by-side with a traditional broker on the same loan
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Broker Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              <h3 className="font-bold text-lg">Traditional Broker</h3>
            </div>

            <div className="space-y-3 bg-red-50 dark:bg-red-950/30 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rate shown to you:</span>
                  <span className="font-semibold">{formatPercentage(quote.brokerComparisonRate)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Base rate:</span>
                  <span>{formatPercentage(quote.indicativeRate)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>+ Hidden commission:</span>
                  <span className="text-red-600 dark:text-red-400 font-semibold">
                    +{formatPercentage(quote.brokerComparisonRate - quote.indicativeRate)}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-red-200 dark:border-red-800">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Application fee:</span>
                  <span>$0*</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  *But it's hidden in the rate
                </p>
              </div>

              <div className="pt-3 border-t border-red-200 dark:border-red-800">
                <div className="flex justify-between">
                  <span className="font-semibold">Total Cost:</span>
                  <span className="font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(quote.brokerComparisonTotalCost)}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Commission embedded in rate</p>
              <p>• 3-7 day decisions</p>
              <p>• Phone tag and paperwork</p>
            </div>
          </div>

          {/* AssetMX Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <TrendingDown className="h-5 w-5" />
              <h3 className="font-bold text-lg">AssetMX</h3>
            </div>

            <div className="space-y-3 bg-green-50 dark:bg-green-950/30 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rate shown to you:</span>
                  <span className="font-semibold">{formatPercentage(quote.indicativeRate)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Base rate:</span>
                  <span>{formatPercentage(quote.indicativeRate)}</span>
                </div>
                <div className="flex justify-between text-xs text-green-600 dark:text-green-400 font-semibold">
                  <span>+ Our markup:</span>
                  <span>$0 (separate fee)</span>
                </div>
              </div>

              <div className="pt-3 border-t border-green-200 dark:border-green-800">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Platform fee:</span>
                  <span className="font-semibold">{formatCurrency(quote.platformFee)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Transparent and upfront
                </p>
              </div>

              <div className="pt-3 border-t border-green-200 dark:border-green-800">
                <div className="flex justify-between">
                  <span className="font-semibold">Total Cost:</span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(quote.totalCost)}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>✓ No rate markup</p>
              <p>✓ 15-minute conditional approval</p>
              <p>✓ 100% self-service online</p>
            </div>
          </div>
        </div>

        {/* Savings Highlight */}
        <div className="mt-6 bg-gradient-to-r from-green-800 via-green-700 to-emerald-600 text-white rounded-xl p-6 shadow-lg shadow-green-900/20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium opacity-90">Your Saving with AssetMX</p>
              <p className="text-3xl md:text-4xl font-bold mt-1">
                {formatCurrency(quote.estimatedSaving)}
              </p>
              <p className="text-sm opacity-90 mt-1">
                That's {savingsPercentage}% less than a traditional broker
              </p>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm opacity-90">Over the life of the loan</p>
              <p className="text-xs opacity-75 mt-1">Same lenders. Same terms.</p>
              <p className="text-xs opacity-75">We just don't hide our fee.</p>
            </div>
          </div>
        </div>

        {/* Explainer */}
        <div className="mt-6 bg-muted/50 rounded-lg p-4 text-sm space-y-3">
          <h4 className="font-semibold">How it works:</h4>
          <div className="space-y-2 text-muted-foreground">
            <p>
              <strong>Traditional model:</strong> Broker commission is typically built into your interest rate.
              On a $100k loan, this can add over $2,000 to your total repayments.
            </p>
            <p>
              <strong>Our approach:</strong> We charge a flat $800 fee shown separately. You get the lender's
              base rate directly. A streamlined, self-service experience for straightforward finance needs.
            </p>
          </div>
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-muted-foreground">
              <strong>Is AssetMX right for you?</strong> We're designed for established businesses funding
              assets up to $500k who value speed and transparency. If you have complex requirements or
              prefer working with a dedicated relationship manager, a traditional broker may be a better fit.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
