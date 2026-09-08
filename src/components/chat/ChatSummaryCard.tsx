import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit2, Building2, Car, User, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/calculator';

interface SummaryData {
  business?: {
    entityName?: string;
    abn?: string;
    entityType?: string;
    gstRegistered?: boolean;
  };
  abnLookup?: {
    entityName: string;
    abnRegisteredDate: string;
    gstRegistered: boolean;
  };
  asset?: {
    assetType?: string;
    assetCondition?: string;
    assetYear?: number;
    assetMake?: string;
    assetModel?: string;
    supplierName?: string;
    assetPriceIncGst?: number;
    assetDescription?: string;
  };
  loan?: {
    loanAmount?: number;
    termMonths?: number;
    balloonPercentage?: number;
    depositAmount?: number;
  };
  directors?: {
    directors?: Array<{
      fullName?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      address?: string;
    }>;
  };
  quote?: {
    monthlyRepayment: number;
    weeklyRepayment?: number;
    indicativeRate: number;
  };
}

interface ChatSummaryCardProps {
  data: SummaryData;
  onEdit?: (section: string) => void;
}

// Format asset type for display
const formatAssetType = (type?: string): string => {
  const labels: Record<string, string> = {
    vehicle: 'Car, ute or van',
    truck: 'Truck or trailer',
    equipment: 'Equipment or machinery',
  };
  return labels[type || ''] || type || 'Not provided';
};

// Format condition for display
const formatCondition = (condition?: string): string => {
  const labels: Record<string, string> = {
    new: 'New',
    demo: 'Demo',
    used_0_3: 'Used',
    used_4_7: 'Used',
    used_8_plus: 'Used',
  };
  return labels[condition || ''] || condition || 'Not provided';
};

// "3 years", "18 months"
const formatTerm = (months?: number): string => {
  if (!months) return 'Not provided';
  if (months % 12 === 0) {
    const years = months / 12;
    return `${years} year${years === 1 ? '' : 's'}`;
  }
  return `${months} months`;
};

// Year make model, falling back to the free-text description
const formatItem = (asset?: SummaryData['asset']): string => {
  const parts = [asset?.assetYear, asset?.assetMake, asset?.assetModel].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  return asset?.assetDescription || 'Not provided';
};

const directorName = (director?: { fullName?: string; firstName?: string; lastName?: string }): string => {
  if (!director) return 'Not provided';
  const joined = [director.firstName, director.lastName].filter(Boolean).join(' ').trim();
  return director.fullName || joined || 'Not provided';
};

export function ChatSummaryCard({ data, onEdit }: ChatSummaryCardProps) {
  const businessName = data.abnLookup?.entityName || data.business?.entityName || 'Your business';
  const price = data.asset?.assetPriceIncGst || 0;
  const deposit = data.loan?.depositAmount || 0;
  const financeAmount = data.loan?.loanAmount || Math.max(price - deposit, 0);
  const directorsList = data.directors?.directors || [];

  return (
    <Card className="border-ink-200 bg-ivory shadow-lg overflow-hidden">
      <CardHeader className="bg-forest text-cream pb-4">
        <CardTitle className="text-lg font-semibold">Application summary</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Business */}
        <SummarySection
          icon={<Building2 className="h-4 w-4" />}
          title="Business"
          onEdit={onEdit ? () => onEdit('business') : undefined}
        >
          <SummaryRow label="Business name" value={businessName} />
          <SummaryRow label="ABN" value={data.business?.abn || 'Not provided'} />
          <SummaryRow
            label="GST registered"
            value={(data.abnLookup?.gstRegistered ?? data.business?.gstRegistered) ? 'Yes' : 'No'}
          />
        </SummarySection>

        {/* Asset */}
        <SummarySection
          icon={<Car className="h-4 w-4" />}
          title="Asset"
          onEdit={onEdit ? () => onEdit('asset') : undefined}
        >
          <SummaryRow label="What" value={formatItem(data.asset)} />
          <SummaryRow label="Type" value={formatAssetType(data.asset?.assetType)} />
          <SummaryRow label="Condition" value={formatCondition(data.asset?.assetCondition)} />
          <SummaryRow label="Supplier" value={data.asset?.supplierName || 'Not provided'} />
          <SummaryRow label="Price inc GST" value={price ? formatCurrency(price) : 'Not provided'} />
        </SummarySection>

        {/* Loan */}
        <SummarySection
          icon={<DollarSign className="h-4 w-4" />}
          title="Loan"
          onEdit={onEdit ? () => onEdit('loan') : undefined}
        >
          <SummaryRow label="Finance amount" value={formatCurrency(financeAmount)} />
          <SummaryRow label="Term" value={formatTerm(data.loan?.termMonths)} />
          <SummaryRow
            label="Balloon"
            value={data.loan?.balloonPercentage ? `${data.loan.balloonPercentage}%` : 'No balloon'}
          />
          <SummaryRow label="Deposit or trade-in" value={deposit > 0 ? formatCurrency(deposit) : 'None'} />
        </SummarySection>

        {/* Your details */}
        <SummarySection
          icon={<User className="h-4 w-4" />}
          title="Your details"
          onEdit={onEdit ? () => onEdit('personal') : undefined}
        >
          {directorsList.length === 0 && (
            <SummaryRow label="Name" value="Not provided" />
          )}
          {directorsList.map((director, index) => (
            <div key={index} className={index > 0 ? 'mt-3 pt-3 border-t border-ink-100' : ''}>
              {directorsList.length > 1 && (
                <div className="text-xs text-ink-500 mb-1">
                  {index === 0 ? 'You' : `Director ${index + 1}`}
                </div>
              )}
              <SummaryRow label="Name" value={directorName(director)} />
              <SummaryRow label="Email" value={director.email || 'Not provided'} />
              <SummaryRow label="Phone" value={director.phone || 'Not provided'} />
              {index === 0 && (
                <SummaryRow label="Address" value={director.address || 'Not provided'} />
              )}
            </div>
          ))}
        </SummarySection>

        {/* Indicative repayment */}
        {data.quote && (
          <div className="bg-sage-100 p-4 border-t border-sage-200">
            <div className="text-center">
              <div className="text-sm text-ink-600 mb-1">Estimated repayment</div>
              <div className="text-2xl font-display text-forest">
                {formatCurrency(data.quote.monthlyRepayment)}/month
              </div>
              <div className="text-sm text-ink-600 mt-1">
                {formatCurrency(data.quote.weeklyRepayment || (data.quote.monthlyRepayment * 12) / 52)}/week at {data.quote.indicativeRate.toFixed(2)}% p.a. lender base rate
              </div>
              <div className="text-xs text-ink-500 mt-2">
                Indicative only, not an offer of credit.
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SummarySectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  onEdit?: () => void;
}

function SummarySection({ icon, title, children, onEdit }: SummarySectionProps) {
  return (
    <div className="p-4 border-b border-ink-100 last:border-b-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-forest">
          {icon}
          <span className="font-medium text-sm">{title}</span>
        </div>
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-7 px-2 text-xs text-forest hover:text-forest-800 hover:bg-sage-100"
          >
            <Edit2 className="h-3 w-3 mr-1" />
            Edit
          </Button>
        )}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

interface SummaryRowProps {
  label: string;
  value: string;
}

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-ink-600">{label}</span>
      <span className="text-ink font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
