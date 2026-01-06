// Application Wizard Progress Indicator
// Shows current step and allows navigation to completed steps

import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { APPLICATION_STEPS } from '@/types/application';

interface ProgressIndicatorProps {
  currentStep: number;
  completedStep: number;
  onStepClick?: (step: number) => void;
}

export function ProgressIndicator({
  currentStep,
  completedStep,
  onStepClick,
}: ProgressIndicatorProps) {
  return (
    <nav aria-label="Application progress" className="w-full">
      {/* Desktop version - horizontal */}
      <ol className="hidden md:flex items-center justify-between">
        {APPLICATION_STEPS.map((step, index) => {
          const isCompleted = index < completedStep + 1 && index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = index <= completedStep + 1;

          return (
            <li key={step.id} className="flex-1 relative">
              {/* Connector line */}
              {index !== 0 && (
                <div
                  className={cn(
                    'absolute left-0 top-4 -translate-y-1/2 w-full h-0.5 -ml-1/2',
                    isCompleted || isCurrent ? 'bg-green-600' : 'bg-gray-200'
                  )}
                  style={{ width: 'calc(100% - 2rem)', left: '-50%', marginLeft: '1rem' }}
                />
              )}

              {/* Step indicator */}
              <button
                type="button"
                onClick={() => isClickable && onStepClick?.(index)}
                disabled={!isClickable}
                className={cn(
                  'relative z-10 flex flex-col items-center group',
                  isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
                )}
              >
                {/* Circle */}
                <span
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    isCompleted && 'bg-green-600 text-white',
                    isCurrent && 'bg-green-600 text-white ring-4 ring-green-100',
                    !isCompleted && !isCurrent && 'bg-gray-200 text-gray-500'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </span>

                {/* Label */}
                <span
                  className={cn(
                    'mt-2 text-xs font-medium transition-colors',
                    isCurrent && 'text-green-700',
                    isCompleted && 'text-green-600',
                    !isCompleted && !isCurrent && 'text-gray-500'
                  )}
                >
                  {step.title}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Mobile version - compact */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-900">
            Step {currentStep + 1} of {APPLICATION_STEPS.length}
          </span>
          <span className="text-sm text-gray-500">
            {APPLICATION_STEPS[currentStep].title}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / APPLICATION_STEPS.length) * 100}%` }}
          />
        </div>
      </div>
    </nav>
  );
}
