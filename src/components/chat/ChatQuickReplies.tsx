import { cn } from '@/lib/utils';

interface QuickReplyOption {
  label: string;
  value: string;
}

interface ChatQuickRepliesProps {
  options: QuickReplyOption[] | string[];
  onSelect: (value: string) => void;
  disabled?: boolean;
  vertical?: boolean;
}

export function ChatQuickReplies({ options, onSelect, disabled = false, vertical = false }: ChatQuickRepliesProps) {
  // Normalize options to always be QuickReplyOption[]
  const normalizedOptions: QuickReplyOption[] = options.map((opt) =>
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  );

  // Vertical layout for ABN selection (business cards)
  if (vertical) {
    return (
      <div className="flex flex-col gap-2 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] animate-in fade-in slide-in-from-bottom-2 duration-300 max-h-80 overflow-y-auto bg-white border-t border-slate-200 flex-shrink-0">
        {normalizedOptions.map((option) => {
          // Check if this is a business result (contains ABN:)
          const isBusinessOption = option.value.includes('ABN:');

          if (isBusinessOption) {
            // Parse business info from the option
            const parts = option.value.match(/^(.+?)\s*\((\w+)\)\s*-\s*ABN:\s*(.+)$/);
            const businessName = parts?.[1] || option.label;
            const state = parts?.[2] || '';
            const abn = parts?.[3] || '';

            return (
              <button
                key={option.value}
                onClick={() => !disabled && onSelect(option.value)}
                disabled={disabled}
                className={cn(
                  'w-full p-3 rounded-lg text-left',
                  'border-2 border-purple-200 bg-white',
                  'hover:bg-purple-50 hover:border-purple-300',
                  'active:bg-purple-100 active:scale-[0.99]',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-all duration-150',
                  'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2'
                )}
              >
                <div className="font-medium text-purple-800 text-sm leading-tight">{businessName}</div>
                <div className="flex items-center gap-2 mt-1">
                  {state && <span className="text-xs text-slate-500">{state}</span>}
                  <span className="text-xs text-slate-400">ABN: {abn}</span>
                </div>
              </button>
            );
          }

          // Regular option button (e.g., "None of these")
          return (
            <button
              key={option.value}
              onClick={() => !disabled && onSelect(option.value)}
              disabled={disabled}
              className={cn(
                'w-full px-4 py-3 rounded-lg text-sm font-medium text-center',
                'border-2 border-slate-200 bg-white text-slate-600',
                'hover:bg-slate-50 hover:border-slate-300',
                'active:bg-slate-100 active:scale-[0.99]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-all duration-150',
                'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2'
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  // Horizontal layout (default)
  return (
    <div className="flex flex-wrap gap-2 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] animate-in fade-in slide-in-from-bottom-2 duration-300 bg-white border-t border-slate-200 flex-shrink-0">
      {normalizedOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => !disabled && onSelect(option.value)}
          disabled={disabled}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium',
            'border-2 border-purple-200 bg-white text-purple-700',
            'hover:bg-purple-50 hover:border-purple-300',
            'active:bg-purple-100 active:scale-95',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// Commonly used quick reply sets
export const QUICK_REPLIES = {
  yesNo: [
    { label: "Yep that's me", value: 'yes' },
    { label: "Nah, try again", value: 'no' },
  ],
  confirm: [
    { label: "Looks good", value: 'confirm' },
    { label: "Need to change something", value: 'edit' },
  ],
  assetType: [
    { label: "Vehicle", value: 'vehicle' },
    { label: "Truck/Trailer", value: 'truck' },
    { label: "Equipment", value: 'equipment' },
    { label: "Technology", value: 'technology' },
  ],
  assetCondition: [
    { label: "Brand new", value: 'new' },
    { label: "Demo", value: 'demo' },
    { label: "Used (0-3 years)", value: 'used_0_3' },
    { label: "Used (4-7 years)", value: 'used_4_7' },
    { label: "Older (8+ years)", value: 'used_8_plus' },
  ],
  loanTerm: [
    { label: "3 years", value: '36' },
    { label: "4 years", value: '48' },
    { label: "5 years", value: '60' },
    { label: "7 years", value: '84' },
  ],
  balloon: [
    { label: "No balloon (own it outright)", value: '0' },
    { label: "20% balloon", value: '20' },
    { label: "30% balloon", value: '30' },
    { label: "What's a balloon?", value: 'explain' },
  ],
  continueOrEdit: [
    { label: "Continue", value: 'continue' },
    { label: "Let me check", value: 'review' },
  ],
  moreDirectors: [
    { label: "Just me", value: 'no' },
    { label: "Add another director", value: 'yes' },
  ],
};
