import { cn } from '@/lib/utils';

interface ChatProgressProps {
  currentStep: number;
  totalSteps: number;
  label?: string;
}

export function ChatProgress({ currentStep, totalSteps, label }: ChatProgressProps) {
  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="px-4 py-2 bg-white border-b border-slate-100">
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
        <span>{label || `Step ${currentStep} of ${totalSteps}`}</span>
        <span>{percentage}% complete</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full bg-gradient-brand rounded-full',
            'transition-all duration-500 ease-out'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Phase labels for the chat flow
export const CHAT_PHASES = [
  { id: 1, label: 'Business details' },
  { id: 2, label: 'Asset info' },
  { id: 3, label: 'Your details' },
  { id: 4, label: 'Loan setup' },
  { id: 5, label: 'Review' },
];

export function getPhaseLabel(stepId: string): string {
  // Map step IDs to phases
  if (stepId.startsWith('abn') || stepId.startsWith('business')) return 'Business details';
  if (stepId.startsWith('asset')) return 'Asset info';
  if (stepId.startsWith('director') || stepId.startsWith('personal')) return 'Your details';
  if (stepId.startsWith('loan') || stepId.startsWith('term') || stepId.startsWith('balloon')) return 'Loan setup';
  if (stepId.startsWith('review') || stepId.startsWith('summary')) return 'Review';
  return 'Getting started';
}
