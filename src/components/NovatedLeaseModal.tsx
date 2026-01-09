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
import { CheckCircle, Loader2, Car, Users } from 'lucide-react';

interface NovatedLeaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface NovatedFormData {
  enquiry_type: 'personal' | 'employer';
  name: string;
  email: string;
  phone: string;
  company_name?: string;
}

export function NovatedLeaseModal({ open, onOpenChange }: NovatedLeaseModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enquiryType, setEnquiryType] = useState<'personal' | 'employer' | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<NovatedFormData>();

  const onSubmit = async (data: NovatedFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Save to leads table with novated lease type
      if (isSupabaseConfigured()) {
        const { error: insertError } = await supabase.from('leads').insert({
          name: data.name,
          email: data.email,
          phone: data.phone,
          business_name: data.company_name || null,
          lead_type: 'novated_lease',
          notes: data.enquiry_type === 'personal'
            ? 'Personal novated lease enquiry - for themselves'
            : `Employer enquiry - looking to offer novated leasing to staff. Company: ${data.company_name || 'Not provided'}`,
          status: 'new',
          source: 'ev_page_modal',
        } as never);

        if (insertError) {
          console.error('Error saving lead:', insertError);
        }
      }

      // Send email notification via edge function
      if (isSupabaseConfigured()) {
        try {
          await supabase.functions.invoke('send-novated-enquiry', {
            body: {
              to: 'ben@millarX.com.au',
              enquiry_type: data.enquiry_type,
              name: data.name,
              email: data.email,
              phone: data.phone,
              company_name: data.company_name,
            },
          });
        } catch (emailError) {
          console.error('Error sending email notification:', emailError);
          // Don't fail the submission if email fails
        }
      }

      setIsSuccess(true);
    } catch (err) {
      console.error('Error submitting novated lease enquiry:', err);
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
        setEnquiryType(null);
      }, 200);
    }
  };

  const handleEnquiryTypeSelect = (type: 'personal' | 'employer') => {
    setEnquiryType(type);
    setValue('enquiry_type', type);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        {isSuccess ? (
          <div className="text-center py-6">
            <div className="mx-auto h-16 w-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-purple-600" />
            </div>
            <DialogTitle className="text-xl mb-2">Enquiry Received!</DialogTitle>
            <DialogDescription className="text-base">
              The millarX team will be in touch within 24 hours to discuss your novated lease options.
            </DialogDescription>
            <div className="mt-6 p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-800">
                They'll explain FBT exemptions, salary packaging setup, and how everything works.
              </p>
            </div>
            <Button
              onClick={handleClose}
              className="mt-6 bg-gradient-brand hover:opacity-90"
            >
              Done
            </Button>
          </div>
        ) : !enquiryType ? (
          // Step 1: Choose enquiry type
          <>
            <DialogHeader>
              <DialogTitle>Novated Lease Enquiry</DialogTitle>
              <DialogDescription>
                How can we help you with novated leasing?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <button
                type="button"
                onClick={() => handleEnquiryTypeSelect('personal')}
                className="w-full p-4 border-2 border-purple-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all text-left flex items-start gap-4"
              >
                <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Car className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">For Myself</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    I want a novated lease for my personal vehicle through salary sacrifice
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleEnquiryTypeSelect('employer')}
                className="w-full p-4 border-2 border-purple-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all text-left flex items-start gap-4"
              >
                <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">For My Staff</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    I'm an employer looking to offer novated leasing as a staff benefit
                  </p>
                </div>
              </button>
            </div>

            <div className="bg-purple-50 rounded-lg p-3 text-sm text-purple-700">
              Novated leasing is handled by <strong>millarX</strong>, our sister company specialising in salary packaging.
            </div>
          </>
        ) : (
          // Step 2: Contact details form
          <>
            <DialogHeader>
              <DialogTitle>
                {enquiryType === 'personal' ? 'Personal Novated Lease' : 'Employer Enquiry'}
              </DialogTitle>
              <DialogDescription>
                {enquiryType === 'personal'
                  ? "Enter your details and we'll get back to you about your novated lease options."
                  : "Enter your details and we'll discuss setting up novated leasing for your team."}
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <input type="hidden" {...register('enquiry_type')} value={enquiryType} />

              <div className="space-y-2">
                <Label htmlFor="name">Your Name *</Label>
                <Input
                  id="name"
                  placeholder="Full name"
                  {...register('name', { required: 'Name is required' })}
                />
                {errors.name && (
                  <p className="text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>

              {enquiryType === 'employer' && (
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    placeholder="Your Company Pty Ltd"
                    {...register('company_name')}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
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
                  onClick={() => setEnquiryType(null)}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-brand hover:opacity-90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Enquiry'
                  )}
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Your details will be sent to the millarX team who specialise in novated leasing.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
