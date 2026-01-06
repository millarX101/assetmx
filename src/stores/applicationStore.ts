// Application Wizard State Management
// Manages multi-step application flow with persistence

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ApplicationData,
  BusinessDetailsData,
  DirectorDetailsData,
  AssetDetailsData,
  LoanDetailsData,
  EligibilityResult,
  Director,
} from '@/types/application';
import { createEmptyApplication } from '@/types/application';
import { calculateQuote, type QuoteInput } from '@/lib/calculator';
import { checkEligibility } from '@/lib/eligibility';

interface ApplicationState {
  // Current application data
  application: ApplicationData;

  // Wizard state
  currentStep: number;
  isSubmitting: boolean;
  error: string | null;

  // Actions - Navigation
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;

  // Actions - Data Updates
  updateBusiness: (data: Partial<BusinessDetailsData>) => void;
  updateDirectors: (data: Partial<DirectorDetailsData>) => void;
  addDirector: (director: Director) => void;
  removeDirector: (index: number) => void;
  updateDirector: (index: number, director: Partial<Director>) => void;
  updateAsset: (data: Partial<AssetDetailsData>) => void;
  updateLoan: (data: Partial<LoanDetailsData>) => void;

  // Actions - Quote & Eligibility
  calculateAndStoreQuote: () => void;
  runEligibilityCheck: () => EligibilityResult;

  // Actions - Application Lifecycle
  resetApplication: () => void;
  submitApplication: () => Promise<{ success: boolean; error?: string }>;

  // Actions - Initialize from calculator
  initFromCalculator: (input: QuoteInput) => void;
}

export const useApplicationStore = create<ApplicationState>()(
  persist(
    (set, get) => ({
      // Initial state
      application: createEmptyApplication(),
      currentStep: 0,
      isSubmitting: false,
      error: null,

      // Navigation
      setCurrentStep: (step) => set({ currentStep: step }),

      nextStep: () => {
        const { currentStep, application } = get();
        const newStep = Math.min(currentStep + 1, 4);
        set({
          currentStep: newStep,
          application: {
            ...application,
            stepCompleted: Math.max(application.stepCompleted, currentStep),
          },
        });
      },

      prevStep: () => {
        const { currentStep } = get();
        set({ currentStep: Math.max(currentStep - 1, 0) });
      },

      goToStep: (step) => {
        const { application } = get();
        // Only allow going to completed steps or the next one
        if (step <= application.stepCompleted + 1) {
          set({ currentStep: step });
        }
      },

      // Business Details
      updateBusiness: (data) => {
        const { application } = get();
        set({
          application: {
            ...application,
            business: { ...application.business, ...data },
          },
        });
      },

      // Directors
      updateDirectors: (data) => {
        const { application } = get();
        set({
          application: {
            ...application,
            directors: { ...application.directors, ...data },
          },
        });
      },

      addDirector: (director) => {
        const { application } = get();
        set({
          application: {
            ...application,
            directors: {
              ...application.directors,
              directors: [...application.directors.directors, director],
            },
          },
        });
      },

      removeDirector: (index) => {
        const { application } = get();
        const newDirectors = application.directors.directors.filter((_, i) => i !== index);
        set({
          application: {
            ...application,
            directors: {
              ...application.directors,
              directors: newDirectors,
              primaryContactIndex:
                application.directors.primaryContactIndex >= newDirectors.length
                  ? 0
                  : application.directors.primaryContactIndex,
            },
          },
        });
      },

      updateDirector: (index, director) => {
        const { application } = get();
        const newDirectors = [...application.directors.directors];
        newDirectors[index] = { ...newDirectors[index], ...director };
        set({
          application: {
            ...application,
            directors: {
              ...application.directors,
              directors: newDirectors,
            },
          },
        });
      },

      // Asset Details
      updateAsset: (data) => {
        const { application } = get();

        // Auto-calculate GST if price changes
        let updatedData = { ...data };
        if (data.assetPriceExGst !== undefined) {
          updatedData.assetGst = data.assetPriceExGst * 0.1;
          updatedData.assetPriceIncGst = data.assetPriceExGst * 1.1;
        } else if (data.assetPriceIncGst !== undefined) {
          updatedData.assetPriceExGst = data.assetPriceIncGst / 1.1;
          updatedData.assetGst = data.assetPriceIncGst - updatedData.assetPriceExGst;
        }

        set({
          application: {
            ...application,
            asset: { ...application.asset, ...updatedData },
          },
        });
      },

      // Loan Details
      updateLoan: (data) => {
        const { application } = get();

        // Auto-calculate balloon amount if percentage changes
        let updatedData = { ...data };
        if (data.balloonPercentage !== undefined) {
          const loanAmount = data.loanAmount ?? application.loan.loanAmount;
          updatedData.balloonAmount = loanAmount * (data.balloonPercentage / 100);
        }

        // Auto-calculate loan amount from asset price minus deposit/trade-in
        if (
          data.depositAmount !== undefined ||
          data.tradeInAmount !== undefined ||
          data.loanAmount === undefined
        ) {
          const assetPrice = application.asset.assetPriceIncGst;
          const deposit = data.depositAmount ?? application.loan.depositAmount;
          const tradeIn = data.tradeInAmount ?? application.loan.tradeInAmount;
          if (assetPrice > 0) {
            updatedData.loanAmount = Math.max(0, assetPrice - deposit - tradeIn);
          }
        }

        set({
          application: {
            ...application,
            loan: { ...application.loan, ...updatedData },
          },
        });
      },

      // Calculate quote from current application data
      calculateAndStoreQuote: () => {
        const { application } = get();

        try {
          const input: QuoteInput = {
            assetType: application.asset.assetType,
            assetCondition: application.asset.assetCondition,
            loanAmount: application.loan.loanAmount,
            termMonths: application.loan.termMonths,
            balloonPercentage: application.loan.balloonPercentage,
          };

          const quote = calculateQuote(input);

          set({
            application: {
              ...application,
              quote: {
                indicativeRate: quote.indicativeRate,
                monthlyRepayment: quote.monthlyRepayment,
                totalInterest: quote.totalInterest,
                totalRepayments: quote.totalRepayments,
                totalFeesFinanced: quote.totalFeesFinanced,
                totalFeesUpfront: quote.totalFeesUpfront,
                totalCost: quote.totalCost,
              },
            },
          });
        } catch (error) {
          console.error('Failed to calculate quote:', error);
        }
      },

      // Run eligibility check
      runEligibilityCheck: () => {
        const { application } = get();
        const result = checkEligibility(application);

        set({
          application: {
            ...application,
            eligibility: result,
          },
        });

        return result;
      },

      // Reset application to empty state
      resetApplication: () => {
        set({
          application: createEmptyApplication(),
          currentStep: 0,
          isSubmitting: false,
          error: null,
        });
      },

      // Submit application
      submitApplication: async () => {
        const { application } = get();

        set({ isSubmitting: true, error: null });

        try {
          // Run final eligibility check
          const eligibility = checkEligibility(application);

          if (!eligibility.passed) {
            set({
              isSubmitting: false,
              error: 'Application does not meet eligibility requirements',
              application: {
                ...application,
                eligibility,
                status: 'ineligible',
              },
            });
            return { success: false, error: 'Eligibility check failed' };
          }

          // TODO: Submit to Supabase
          // For now, just update status
          await new Promise((resolve) => setTimeout(resolve, 1000));

          set({
            isSubmitting: false,
            application: {
              ...application,
              status: 'submitted',
              eligibility,
            },
          });

          return { success: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Submission failed';
          set({ isSubmitting: false, error: message });
          return { success: false, error: message };
        }
      },

      // Initialize from calculator (when user clicks "Start Application")
      initFromCalculator: (input) => {
        const quote = calculateQuote(input);

        set({
          currentStep: 0,
          application: {
            ...createEmptyApplication(),
            asset: {
              assetType: input.assetType,
              assetCondition: input.assetCondition,
              assetPriceExGst: 0,
              assetGst: 0,
              assetPriceIncGst: 0,
            },
            loan: {
              loanAmount: input.loanAmount,
              depositAmount: 0,
              tradeInAmount: 0,
              termMonths: input.termMonths,
              balloonPercentage: input.balloonPercentage,
              balloonAmount: input.loanAmount * (input.balloonPercentage / 100),
              businessUsePercentage: 100,
            },
            quote: {
              indicativeRate: quote.indicativeRate,
              monthlyRepayment: quote.monthlyRepayment,
              totalInterest: quote.totalInterest,
              totalRepayments: quote.totalRepayments,
              totalFeesFinanced: quote.totalFeesFinanced,
              totalFeesUpfront: quote.totalFeesUpfront,
              totalCost: quote.totalCost,
            },
          },
        });
      },
    }),
    {
      name: 'assetmx-application',
      // Only persist application data, not UI state
      partialize: (state) => ({
        application: state.application,
        currentStep: state.currentStep,
      }),
    }
  )
);
