// Step 3: Asset Details
// What's being financed - dropdown-driven, not free text

import { useForm, Controller } from 'react-hook-form';
import { useApplicationStore } from '@/stores/applicationStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ASSET_TYPE_LABELS,
  ASSET_CATEGORIES,
  CONDITION_LABELS,
  type AssetDetailsData,
  type AssetType,
  type AssetCondition,
} from '@/types/application';
// formatCurrency imported but used for future enhancements
import { Package, ChevronLeft, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function AssetDetailsStep() {
  const { application, updateAsset, nextStep, prevStep } = useApplicationStore();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AssetDetailsData>({
    defaultValues: application.asset,
  });

  const watchedAssetType = watch('assetType');
  const watchedPriceExGst = watch('assetPriceExGst');
  const watchedCondition = watch('assetCondition');

  // Get categories for selected asset type
  const categories = watchedAssetType ? ASSET_CATEGORIES[watchedAssetType] : [];

  // Auto-calculate GST
  const gstAmount = (watchedPriceExGst || 0) * 0.1;
  const totalIncGst = (watchedPriceExGst || 0) + gstAmount;

  const onSubmit = (data: AssetDetailsData) => {
    updateAsset({
      ...data,
      assetGst: gstAmount,
      assetPriceIncGst: totalIncGst,
    });
    nextStep();
  };

  // Get current year for validation
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 20 }, (_, i) => currentYear - i);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-green-600" />
          Asset Details
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Tell us about the asset you're financing
        </p>
      </div>

      {/* Asset Type & Category */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Asset Type *</Label>
          <Controller
            name="assetType"
            control={control}
            rules={{ required: 'Asset type is required' }}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  setValue('assetCategory', ''); // Reset category when type changes
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ASSET_TYPE_LABELS) as AssetType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {ASSET_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.assetType && (
            <p className="text-sm text-red-500">{errors.assetType.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Controller
            name="assetCategory"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value || ''}
                onValueChange={field.onChange}
                disabled={!watchedAssetType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {/* Condition */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          Asset Condition *
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Asset condition affects your interest rate. New assets typically
                  get the best rates.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Controller
          name="assetCondition"
          control={control}
          rules={{ required: 'Condition is required' }}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CONDITION_LABELS) as AssetCondition[]).map((condition) => (
                  <SelectItem key={condition} value={condition}>
                    {CONDITION_LABELS[condition]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.assetCondition && (
          <p className="text-sm text-red-500">{errors.assetCondition.message}</p>
        )}
      </div>

      {/* Year, Make, Model (for used assets) */}
      {watchedCondition && watchedCondition !== 'new' && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Year</Label>
            <Controller
              name="assetYear"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value?.toString() || ''}
                  onValueChange={(value) => field.onChange(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>Make</Label>
            <Input
              placeholder="e.g. Toyota"
              {...register('assetMake')}
            />
          </div>
          <div className="space-y-2">
            <Label>Model</Label>
            <Input
              placeholder="e.g. Hilux SR5"
              {...register('assetModel')}
            />
          </div>
        </div>
      )}

      {/* Asset Description */}
      <div className="space-y-2">
        <Label>Asset Description</Label>
        <Input
          placeholder="Brief description of the asset"
          {...register('assetDescription')}
        />
      </div>

      {/* Supplier Details */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="font-medium text-gray-900">Supplier Details (if known)</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Supplier / Dealer Name</Label>
            <Input
              placeholder="Dealer or private seller name"
              {...register('supplierName')}
            />
          </div>
          <div className="space-y-2">
            <Label>Supplier ABN</Label>
            <Input
              placeholder="XX XXX XXX XXX"
              {...register('supplierAbn')}
            />
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="font-medium text-gray-900 flex items-center gap-2">
          Asset Price
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Enter the purchase price excluding GST. GST will be calculated
                  automatically.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </h3>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="assetPriceExGst">Price (ex GST) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                id="assetPriceExGst"
                type="number"
                className="pl-7"
                placeholder="0.00"
                {...register('assetPriceExGst', {
                  required: 'Price is required',
                  min: { value: 1, message: 'Price must be greater than 0' },
                  valueAsNumber: true,
                })}
              />
            </div>
            {errors.assetPriceExGst && (
              <p className="text-sm text-red-500">{errors.assetPriceExGst.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>GST (10%)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="text"
                className="pl-7 bg-gray-50"
                value={gstAmount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                disabled
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Total (inc GST)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="text"
                className="pl-7 bg-green-50 font-semibold"
                value={totalIncGst.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                disabled
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={prevStep}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <Button
          type="submit"
          className="bg-gradient-to-r from-green-800 via-green-700 to-emerald-600 hover:from-green-900 hover:via-green-800 hover:to-emerald-700"
        >
          Continue to Loan Terms
        </Button>
      </div>

      {/* AI Explainer */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-sm text-blue-800">
          <strong>Why we ask this:</strong> Asset details help us match you with
          the right lender and determine your rate. New assets from dealers
          typically qualify for the best rates and fastest approvals.
        </p>
      </div>
    </form>
  );
}
