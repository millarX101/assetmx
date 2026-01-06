import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { formatCurrency, formatPercentage, type QuoteOutput, type QuoteInput } from '@/lib/calculator';
import { CheckCircle, Loader2 } from 'lucide-react';

interface LeadCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: QuoteOutput;
  quoteInput: QuoteInput;
}

interface LeadFormData {
  email: string;
  phone: string;
  business_name: string;
  abn: string;
}

export function LeadCaptureModal({
  open,
  onOpenChange,
  quote,
  quoteInput,
}: LeadCaptureModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LeadFormData>();

  const onSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (!isSupabaseConfigured()) {
        // Demo mode - just simulate success
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsSuccess(true);
        return;
      }

      const { error: insertError } = await supabase.from('leads').insert({
        email: data.email,
        phone: data.phone,
        business_name: data.business_name,
        abn: data.abn,
        asset_type: quoteInput.assetType,
        asset_condition: quoteInput.assetCondition,
        loan_amount: quoteInput.loanAmount,
        term_months: quoteInput.termMonths,
        balloon_percentage: quoteInput.balloonPercentage,
        indicative_rate: quote.indicativeRate,
        monthly_repayment: quote.monthlyRepayment,
        total_cost: quote.totalCost,
        estimated_saving: quote.estimatedSaving,
        status: 'new',
      });

      if (insertError) {
        throw insertError;
      }

      setIsSuccess(true);
    } catch (err) {
      console.error('Error submitting lead:', err);
      setError('Something went wrong. Please try again or contact us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      // Reset form after modal closes
      setTimeout(() => {
        reset();
        setIsSuccess(false);
        setError(null);
      }, 200);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        {isSuccess ? (
          <div className="text-center py-6">
            <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <DialogTitle className="text-xl mb-2">Application Received!</DialogTitle>
            <DialogDescription className="text-base">
              We'll review your details and be in touch within 15 minutes during business hours.
            </DialogDescription>
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Your indicative rate:</strong>{' '}
                {formatPercentage(quote.indicativeRate)}
              </p>
              <p className="text-sm text-green-800">
                <strong>Estimated saving:</strong>{' '}
                {formatCurrency(quote.estimatedSaving)}
              </p>
            </div>
            <Button
              onClick={handleClose}
              className="mt-6 bg-gradient-to-r from-green-800 via-green-700 to-emerald-600"
            >
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Start Your Application</DialogTitle>
              <DialogDescription>
                Enter your details to lock in your rate and start the application process.
              </DialogDescription>
            </DialogHeader>

            {/* Quote Summary */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Loan Amount</p>
                  <p className="font-semibold">{formatCurrency(quoteInput.loanAmount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Indicative Rate</p>
                  <p className="font-semibold text-green-700">
                    {formatPercentage(quote.indicativeRate)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Monthly Repayment</p>
                  <p className="font-semibold">{formatCurrency(quote.monthlyRepayment)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Your Saving</p>
                  <p className="font-semibold text-green-700">
                    {formatCurrency(quote.estimatedSaving)}
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="business_name">Business Name *</Label>
                <Input
                  id="business_name"
                  placeholder="Your Business Pty Ltd"
                  {...register('business_name', { required: 'Business name is required' })}
                />
                {errors.business_name && (
                  <p className="text-xs text-red-500">{errors.business_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="abn">ABN *</Label>
                <Input
                  id="abn"
                  placeholder="12 345 678 901"
                  {...register('abn', {
                    required: 'ABN is required',
                    pattern: {
                      value: /^[\d\s]{11,14}$/,
                      message: 'Please enter a valid 11-digit ABN',
                    },
                  })}
                />
                {errors.abn && (
                  <p className="text-xs text-red-500">{errors.abn.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@business.com.au"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Please enter a valid email',
                    },
                  })}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0412 345 678"
                  {...register('phone', {
                    required: 'Phone is required',
                    pattern: {
                      value: /^[\d\s+()-]{8,}$/,
                      message: 'Please enter a valid phone number',
                    },
                  })}
                />
                {errors.phone && (
                  <p className="text-xs text-red-500">{errors.phone.message}</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-green-800 via-green-700 to-emerald-600"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                By submitting, you agree to our terms and privacy policy.
                <br />
                We'll never share your information with third parties.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
