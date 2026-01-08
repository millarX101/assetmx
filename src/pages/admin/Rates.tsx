import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/calculator';
import { Clock, Save, RefreshCw, Info } from 'lucide-react';

// New simplified rate structure by term
const DEFAULT_TERM_RATES: Record<number, number> = {
  12: 7.15,  // 1 year
  24: 6.95,  // 2 years
  36: 6.49,  // 3 years
  48: 6.49,  // 4 years
  60: 6.49,  // 5 years
};

const TERM_LABELS: Record<number, string> = {
  12: '12 months (1 year)',
  24: '24 months (2 years)',
  36: '36 months (3 years)',
  48: '48 months (4 years)',
  60: '60 months (5 years)',
};

const DEFAULT_FEES: Record<string, { amount: number; description: string; condition?: string }> = {
  platform_fee: { amount: 800, description: 'AssetMX platform fee' },
  lender_establishment_fee: { amount: 500, description: 'Lender establishment fee' },
  ppsr_fee: { amount: 7.40, description: 'PPSR registration fee' },
  inspection_fee: { amount: 250, description: 'Vehicle inspection fee', condition: 'Private sale only' },
};

export function AdminRates() {
  const [termRates, setTermRates] = useState<Record<number, number>>(DEFAULT_TERM_RATES);
  const [fees, setFees] = useState<Record<string, { amount: number; description: string; condition?: string }>>(DEFAULT_FEES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }
    fetchRatesAndFees();
  }, []);

  async function fetchRatesAndFees() {
    try {
      // Fetch term-based rates from rate_config
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rateData, error: rateError } = await (supabase.from('rate_config') as any)
        .select('*');

      if (rateError) throw rateError;

      if (rateData && rateData.length > 0) {
        const ratesMap: Record<number, number> = { ...DEFAULT_TERM_RATES };
        // Try to read term_months if it exists, otherwise use existing data
        rateData.forEach((r: { term_months?: number; base_rate: number }) => {
          if (r.term_months) {
            ratesMap[r.term_months] = r.base_rate;
          }
        });
        setTermRates(ratesMap);
      }

      // Fetch fees
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: feeData, error: feeError } = await (supabase.from('fee_config') as any)
        .select('*');

      if (feeError) throw feeError;

      if (feeData && feeData.length > 0) {
        const feesMap: Record<string, { amount: number; description: string; condition?: string }> = { ...DEFAULT_FEES };
        feeData.forEach((f: { fee_name: string; amount: number; description?: string }) => {
          if (feesMap[f.fee_name]) {
            feesMap[f.fee_name] = {
              ...feesMap[f.fee_name],
              amount: f.amount,
              description: f.description || feesMap[f.fee_name].description,
            };
          }
        });
        setFees(feesMap);
      }
    } catch (error) {
      console.error('Error fetching rates and fees:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleTermRateChange(term: number, value: string) {
    const numValue = parseFloat(value) || 0;
    setTermRates((prev) => ({
      ...prev,
      [term]: numValue,
    }));
    setHasChanges(true);
  }

  function handleFeeChange(feeName: string, value: string) {
    const numValue = parseFloat(value) || 0;
    setFees((prev) => ({
      ...prev,
      [feeName]: {
        ...prev[feeName],
        amount: numValue,
      },
    }));
    setHasChanges(true);
  }

  async function saveChanges() {
    if (!isSupabaseConfigured()) return;

    setIsSaving(true);
    try {
      // Note: The term-based rates would need a schema update to store term_months
      // For now, we'll save to fee_config and handle rates differently

      // Update fees
      for (const [feeName, feeData] of Object.entries(fees)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('fee_config') as any)
          .upsert(
            {
              fee_name: feeName,
              amount: feeData.amount,
              description: feeData.description,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'fee_name' }
          );
      }

      setHasChanges(false);
      alert('Changes saved successfully! Note: Rate changes require a database schema update to take effect.');
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Error saving changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  function resetToDefaults() {
    setTermRates(DEFAULT_TERM_RATES);
    setFees(DEFAULT_FEES);
    setHasChanges(true);
  }

  const configured = isSupabaseConfigured();

  if (!configured) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Rate Configuration</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="mx-auto h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Supabase Not Configured</h3>
              <p className="text-muted-foreground mb-4">
                Set up Supabase to manage rates. Currently showing default rates.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Rate Configuration</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetToDefaults} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Reset to Defaults
          </Button>
          <Button
            size="sm"
            onClick={saveChanges}
            disabled={!hasChanges || isSaving}
            className="gap-2 bg-gradient-to-r from-green-800 via-green-700 to-emerald-600"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          You have unsaved changes. Click "Save Changes" to apply them.
        </div>
      )}

      <Tabs defaultValue="rates">
        <TabsList>
          <TabsTrigger value="rates">Interest Rates</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
        </TabsList>

        <TabsContent value="rates" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Interest Rates by Term</CardTitle>
              <p className="text-sm text-muted-foreground">
                Simple flat rates based on loan term. Same rate for all asset types (new to 3 years old).
              </p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(TERM_LABELS).map(([term, label]) => (
                      <div key={term} className="bg-gray-50 rounded-lg p-4">
                        <Label htmlFor={`rate-${term}`} className="text-sm font-medium">
                          {label}
                        </Label>
                        <div className="flex items-center gap-2 mt-2">
                          <Input
                            id={`rate-${term}`}
                            type="number"
                            step="0.01"
                            min="0"
                            max="30"
                            value={termRates[Number(term)] ?? ''}
                            onChange={(e) => handleTermRateChange(Number(term), e.target.value)}
                            className="w-24 text-center"
                          />
                          <span className="text-lg font-semibold text-gray-600">%</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4 flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">How rates work</p>
                      <ul className="list-disc list-inside space-y-1 text-blue-700">
                        <li>Same rate applies to all asset types (vehicles, trucks, equipment)</li>
                        <li>Assets must be new to 3 years old to qualify for express</li>
                        <li>Rates shown are passed directly to customers - no markup</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Fee Configuration</CardTitle>
              <p className="text-sm text-muted-foreground">
                All fees shown transparently to customers upfront.
              </p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    {Object.entries(fees).map(([feeName, feeData]) => (
                      <div key={feeName} className="bg-gray-50 rounded-lg p-4">
                        <Label htmlFor={feeName} className="text-sm font-medium">
                          {feeData.description}
                          {feeData.condition && (
                            <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                              {feeData.condition}
                            </span>
                          )}
                        </Label>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-lg text-gray-500">$</span>
                          <Input
                            id={feeName}
                            type="number"
                            step={feeName === 'ppsr_fee' ? '0.01' : '1'}
                            min="0"
                            value={feeData.amount}
                            onChange={(e) => handleFeeChange(feeName, e.target.value)}
                            className="w-28"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-2">Standard Fees Total</h4>
                    <p className="text-2xl font-bold text-green-700">
                      {formatCurrency(
                        (fees.platform_fee?.amount ?? 800) +
                        (fees.lender_establishment_fee?.amount ?? 500) +
                        (fees.ppsr_fee?.amount ?? 7.4)
                      )}
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      Inspection fee ({formatCurrency(fees.inspection_fee?.amount ?? 250)}) only applies to private sales
                    </p>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4 flex items-start gap-3">
                    <Info className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-purple-800">
                      <p className="font-medium mb-1">Our transparent pricing</p>
                      <p className="text-purple-700">
                        Unlike traditional brokers who hide their commission in the interest rate
                        (typically adding ~2% = ~$2,000+ on a $100k loan), we charge a flat
                        platform fee. This saves customers significantly on larger loans.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
