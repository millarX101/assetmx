// Step 1: Business Details
// ABN lookup with auto-populate

import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { lookupABN, validateABN, formatABN, formatABNAge } from '@/lib/abn-lookup';
import { AUSTRALIAN_STATES, type BusinessDetailsData, type EntityType } from '@/types/application';
import {
  Search,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Building2,
  HelpCircle,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function BusinessDetailsStep() {
  const { application, updateBusiness, nextStep } = useApplicationStore();
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [abnValidated, setAbnValidated] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BusinessDetailsData>({
    defaultValues: application.business,
  });

  const watchedAbn = watch('abn');
  const gstRegistered = watch('gstRegistered');

  // Handle ABN lookup
  const handleAbnLookup = async () => {
    const cleanAbn = watchedAbn?.replace(/\D/g, '');

    if (!cleanAbn || cleanAbn.length !== 11) {
      setLookupError('Please enter a valid 11-digit ABN');
      return;
    }

    if (!validateABN(cleanAbn)) {
      setLookupError('Invalid ABN. Please check the number and try again.');
      return;
    }

    setIsLookingUp(true);
    setLookupError(null);

    try {
      const result = await lookupABN(cleanAbn);

      if (!result) {
        setLookupError('ABN not found. Please check the number.');
        return;
      }

      // Auto-populate form fields
      setValue('entityName', result.entityName);
      setValue('entityType', result.entityType);
      setValue('gstRegistered', result.gstRegistered);
      setValue('gstRegisteredDate', result.gstRegisteredDate || '');
      setValue('abnRegisteredDate', result.abnRegisteredDate);
      setValue('tradingName', result.tradingName || '');
      setValue('businessAddress', result.businessAddress || '');
      setValue('businessState', result.state || '');
      setValue('businessPostcode', result.postcode || '');

      // Update store with lookup result
      updateBusiness({
        abn: cleanAbn,
        abnLookup: result,
        entityName: result.entityName,
        entityType: result.entityType,
        gstRegistered: result.gstRegistered,
        gstRegisteredDate: result.gstRegisteredDate,
        abnRegisteredDate: result.abnRegisteredDate,
        tradingName: result.tradingName,
        businessAddress: result.businessAddress,
        businessState: result.state,
        businessPostcode: result.postcode,
      });

      setAbnValidated(true);
    } catch (error) {
      setLookupError('Failed to look up ABN. Please try again.');
    } finally {
      setIsLookingUp(false);
    }
  };

  const onSubmit = (data: BusinessDetailsData) => {
    updateBusiness(data);
    nextStep();
  };

  // Check eligibility warnings
  const abnAge = application.business.abnRegisteredDate
    ? Math.floor(
        (new Date().getTime() - new Date(application.business.abnRegisteredDate).getTime()) /
          (1000 * 60 * 60 * 24 * 30)
      )
    : 0;

  const hasEligibilityIssues =
    (abnValidated && abnAge < 24) || (abnValidated && !gstRegistered);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-green-600" />
          Business Details
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Enter your ABN and we'll auto-fill your business details
        </p>
      </div>

      {/* ABN Lookup Section */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="abn" className="flex items-center gap-2">
            Australian Business Number (ABN)
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    We'll verify your ABN with the Australian Business Register
                    and auto-fill your business details.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                id="abn"
                placeholder="XX XXX XXX XXX"
                {...register('abn', {
                  required: 'ABN is required',
                  validate: (value) =>
                    validateABN(value?.replace(/\D/g, '') || '') ||
                    'Please enter a valid ABN',
                })}
                className="pr-10"
                onChange={(e) => {
                  const formatted = formatABN(e.target.value);
                  e.target.value = formatted;
                  setAbnValidated(false);
                }}
              />
              {abnValidated && (
                <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600" />
              )}
            </div>
            <Button
              type="button"
              onClick={handleAbnLookup}
              disabled={isLookingUp}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLookingUp ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4 mr-1" />
                  Lookup
                </>
              )}
            </Button>
          </div>

          {errors.abn && (
            <p className="text-sm text-red-500">{errors.abn.message}</p>
          )}
          {lookupError && (
            <p className="text-sm text-red-500">{lookupError}</p>
          )}
        </div>

        {/* ABN Lookup Result */}
        {abnValidated && application.business.abnLookup && (
          <Alert
            className={
              hasEligibilityIssues
                ? 'border-yellow-200 bg-yellow-50'
                : 'border-green-200 bg-green-50'
            }
          >
            {hasEligibilityIssues ? (
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
            <AlertTitle>
              {hasEligibilityIssues ? 'Eligibility Warning' : 'ABN Verified'}
            </AlertTitle>
            <AlertDescription>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Status:</span>{' '}
                  <span
                    className={
                      application.business.abnLookup.abnStatus === 'Active'
                        ? 'text-green-700 font-medium'
                        : 'text-red-700 font-medium'
                    }
                  >
                    {application.business.abnLookup.abnStatus}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">GST:</span>{' '}
                  <span
                    className={
                      application.business.abnLookup.gstRegistered
                        ? 'text-green-700 font-medium'
                        : 'text-red-700 font-medium'
                    }
                  >
                    {application.business.abnLookup.gstRegistered
                      ? 'Registered'
                      : 'Not Registered'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">ABN Age:</span>{' '}
                  <span
                    className={
                      abnAge >= 24
                        ? 'text-green-700 font-medium'
                        : 'text-red-700 font-medium'
                    }
                  >
                    {formatABNAge(application.business.abnRegisteredDate)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Type:</span>{' '}
                  <span className="font-medium capitalize">
                    {application.business.abnLookup.entityType.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {hasEligibilityIssues && (
                <div className="mt-3 p-2 bg-yellow-100 rounded text-yellow-800 text-sm">
                  {abnAge < 24 && (
                    <p>
                      Your ABN is less than 24 months old. Minimum trading
                      history required is 24 months.
                    </p>
                  )}
                  {!gstRegistered && (
                    <p className={abnAge < 24 ? 'mt-1' : ''}>
                      Your business is not GST registered. GST registration is
                      required for finance.
                    </p>
                  )}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Business Details Form (shown after ABN lookup) */}
      {abnValidated && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entityName">Legal Entity Name</Label>
              <Input
                id="entityName"
                {...register('entityName', { required: 'Entity name is required' })}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entityType">Entity Type</Label>
              <Select
                value={watch('entityType')}
                onValueChange={(value) => setValue('entityType', value as EntityType)}
                disabled
              >
                <SelectTrigger className="bg-gray-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="trust">Trust</SelectItem>
                  <SelectItem value="sole_trader">Sole Trader</SelectItem>
                  <SelectItem value="partnership">Partnership</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tradingName">Trading Name (optional)</Label>
            <Input
              id="tradingName"
              placeholder="If different from legal name"
              {...register('tradingName')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessAddress">Business Address</Label>
            <Input
              id="businessAddress"
              placeholder="Street address"
              {...register('businessAddress', { required: 'Address is required' })}
            />
            {errors.businessAddress && (
              <p className="text-sm text-red-500">{errors.businessAddress.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessState">State</Label>
              <Select
                value={watch('businessState')}
                onValueChange={(value) => setValue('businessState', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {AUSTRALIAN_STATES.map((state) => (
                    <SelectItem key={state.value} value={state.value}>
                      {state.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessPostcode">Postcode</Label>
              <Input
                id="businessPostcode"
                placeholder="2000"
                maxLength={4}
                {...register('businessPostcode', {
                  required: 'Postcode is required',
                  pattern: {
                    value: /^\d{4}$/,
                    message: 'Invalid postcode',
                  },
                })}
              />
              {errors.businessPostcode && (
                <p className="text-sm text-red-500">{errors.businessPostcode.message}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        <div /> {/* Spacer for first step */}
        <Button
          type="submit"
          disabled={!abnValidated || hasEligibilityIssues}
          className="bg-gradient-to-r from-green-800 via-green-700 to-emerald-600 hover:from-green-900 hover:via-green-800 hover:to-emerald-700"
        >
          Continue to Directors
        </Button>
      </div>

      {/* AI Explainer */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-sm text-blue-800">
          <strong>Why we ask this:</strong> We verify your ABN to confirm your
          business meets our lender requirements (24+ months trading, GST
          registered). This also helps us pre-fill your application details.
        </p>
      </div>
    </form>
  );
}
