import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/calculator';
import { Clock, Save, RefreshCw } from 'lucide-react';
import type { RateConfig, FeeConfig } from '@/types/database';

const assetTypes = ['vehicle', 'truck', 'equipment', 'technology'];
const conditions = ['new', 'demo', 'used_0_3', 'used_4_7', 'used_8_plus'];

const conditionLabels: Record<string, string> = {
  new: 'New',
  demo: 'Demo',
  used_0_3: 'Used (0-3 yrs)',
  used_4_7: 'Used (4-7 yrs)',
  used_8_plus: 'Used (8+ yrs)',
};

const assetTypeLabels: Record<string, string> = {
  vehicle: 'Vehicle',
  truck: 'Truck/Trailer',
  equipment: 'Equipment',
  technology: 'Technology',
};

// Default rates (matching calculator.ts)
const DEFAULT_RATES: Record<string, Record<string, number>> = {
  vehicle: { new: 6.29, demo: 6.29, used_0_3: 6.49, used_4_7: 6.99, used_8_plus: 7.49 },
  truck: { new: 6.49, demo: 6.49, used_0_3: 6.79, used_4_7: 7.29, used_8_plus: 7.99 },
  equipment: { new: 6.49, demo: 6.79, used_0_3: 6.99, used_4_7: 7.49, used_8_plus: 8.29 },
  technology: { new: 7.49, demo: 7.99, used_0_3: 8.29, used_4_7: 9.49, used_8_plus: 10.99 },
};

const DEFAULT_FEES = {
  platform_fee: { amount: 800, description: 'AssetMX platform fee' },
  ppsr_fee: { amount: 7.40, description: 'PPSR registration fee' },
  lender_establishment_fee: { amount: 495, description: 'Lender establishment fee' },
};

export function AdminRates() {
  const [rates, setRates] = useState<Record<string, Record<string, number>>>(DEFAULT_RATES);
  const [fees, setFees] = useState<Record<string, { amount: number; description: string }>>(DEFAULT_FEES);
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
      // Fetch rates
      const { data: rateData, error: rateError } = await supabase
        .from('rate_config')
        .select('*');

      if (rateError) throw rateError;

      if (rateData && rateData.length > 0) {
        const ratesMap: Record<string, Record<string, number>> = {};
        rateData.forEach((r: RateConfig) => {
          if (!ratesMap[r.asset_type]) ratesMap[r.asset_type] = {};
          ratesMap[r.asset_type][r.asset_condition] = r.base_rate;
        });
        setRates(ratesMap);
      }

      // Fetch fees
      const { data: feeData, error: feeError } = await supabase
        .from('fee_config')
        .select('*');

      if (feeError) throw feeError;

      if (feeData && feeData.length > 0) {
        const feesMap: Record<string, { amount: number; description: string }> = {};
        feeData.forEach((f: FeeConfig) => {
          feesMap[f.fee_name] = { amount: f.amount, description: f.description || '' };
        });
        setFees(feesMap);
      }
    } catch (error) {
      console.error('Error fetching rates and fees:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleRateChange(assetType: string, condition: string, value: string) {
    const numValue = parseFloat(value) || 0;
    setRates((prev) => ({
      ...prev,
      [assetType]: {
        ...prev[assetType],
        [condition]: numValue,
      },
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
      // Update rates
      for (const assetType of assetTypes) {
        for (const condition of conditions) {
          const rate = rates[assetType]?.[condition];
          if (rate !== undefined) {
            await supabase
              .from('rate_config')
              .upsert(
                {
                  asset_type: assetType,
                  asset_condition: condition,
                  base_rate: rate,
                  updated_at: new Date().toISOString(),
                } as never,
                { onConflict: 'asset_type,asset_condition' }
              );
          }
        }
      }

      // Update fees
      for (const [feeName, feeData] of Object.entries(fees)) {
        await supabase
          .from('fee_config')
          .upsert(
            {
              fee_name: feeName,
              amount: feeData.amount,
              description: feeData.description,
              updated_at: new Date().toISOString(),
            } as never,
            { onConflict: 'fee_name' }
          );
      }

      setHasChanges(false);
      alert('Changes saved successfully!');
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Error saving changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  function resetToDefaults() {
    setRates(DEFAULT_RATES);
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

        {/* Show read-only rates */}
        <Card>
          <CardHeader>
            <CardTitle>Default Base Rates (Read Only)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Type</TableHead>
                    {conditions.map((c) => (
                      <TableHead key={c} className="text-center">
                        {conditionLabels[c]}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assetTypes.map((type) => (
                    <TableRow key={type}>
                      <TableCell className="font-medium">
                        {assetTypeLabels[type]}
                      </TableCell>
                      {conditions.map((c) => (
                        <TableCell key={c} className="text-center">
                          {DEFAULT_RATES[type][c]}%
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
          <TabsTrigger value="rates">Base Rates</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
        </TabsList>

        <TabsContent value="rates" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Base Interest Rates (%)</CardTitle>
              <p className="text-sm text-muted-foreground">
                These are the lender base rates passed directly to customers. No markup applied.
              </p>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">Asset Type</TableHead>
                        {conditions.map((c) => (
                          <TableHead key={c} className="text-center min-w-24">
                            {conditionLabels[c]}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assetTypes.map((type) => (
                        <TableRow key={type}>
                          <TableCell className="font-medium">
                            {assetTypeLabels[type]}
                          </TableCell>
                          {conditions.map((c) => (
                            <TableCell key={c} className="text-center">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="30"
                                value={rates[type]?.[c] ?? ''}
                                onChange={(e) =>
                                  handleRateChange(type, c, e.target.value)
                                }
                                className="w-20 text-center mx-auto"
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                  <div className="grid gap-6 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="platform_fee">Platform Fee</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          id="platform_fee"
                          type="number"
                          step="1"
                          min="0"
                          value={fees.platform_fee?.amount ?? 800}
                          onChange={(e) => handleFeeChange('platform_fee', e.target.value)}
                          className="pl-8"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Our transparent fee (vs broker's hidden ~$2,000+)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lender_establishment_fee">Lender Establishment Fee</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          id="lender_establishment_fee"
                          type="number"
                          step="1"
                          min="0"
                          value={fees.lender_establishment_fee?.amount ?? 495}
                          onChange={(e) =>
                            handleFeeChange('lender_establishment_fee', e.target.value)
                          }
                          className="pl-8"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Charged by the lender
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ppsr_fee">PPSR Fee</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          id="ppsr_fee"
                          type="number"
                          step="0.01"
                          min="0"
                          value={fees.ppsr_fee?.amount ?? 7.4}
                          onChange={(e) => handleFeeChange('ppsr_fee', e.target.value)}
                          className="pl-8"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Personal Property Securities Register
                      </p>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-2">Total Fees</h4>
                    <p className="text-2xl font-bold text-green-700">
                      {formatCurrency(
                        (fees.platform_fee?.amount ?? 800) +
                          (fees.lender_establishment_fee?.amount ?? 495) +
                          (fees.ppsr_fee?.amount ?? 7.4)
                      )}
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      All shown upfront to customers - no hidden charges
                    </p>
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
