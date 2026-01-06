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
    assetPriceIncGst?: number;
    assetDescription?: string;
  };
  loan?: {
    termMonths?: number;
    balloonPercentage?: number;
    depositAmount?: number;
  };
  directors?: {
    directors?: Array<{
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      address?: string;
    }>;
  };
  quote?: {
    monthlyRepayment: number;
    weeklyRepayment: number;
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
    vehicle: 'Vehicle',
    truck: 'Truck/Trailer',
    equipment: 'Equipment/Machinery',
    technology: 'Technology/Medical',
  };
  return labels[type || ''] || type || 'Not specified';
};

// Format condition for display
const formatCondition = (condition?: string): string => {
  const labels: Record<string, string> = {
    new: 'Brand new',
    demo: 'Demo',
    used_0_3: 'Used (0-3 years)',
    used_4_7: 'Used (4-7 years)',
    used_8_plus: 'Older (8+ years)',
  };
  return labels[condition || ''] || condition || 'Not specified';
};

export function ChatSummaryCard({ data, onEdit }: ChatSummaryCardProps) {
  const businessName = data.abnLookup?.entityName || data.business?.entityName || 'Your business';
  const loanAmount = (data.asset?.assetPriceIncGst || 0) - (data.loan?.depositAmount || 0);
  const directorsList = data.directors?.directors || [];

  return (
    <Card className="border-purple-200 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-brand text-white pb-4">
        <CardTitle className="text-lg font-semibold">Application Summary</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Business Section */}
        <SummarySection
          icon={<Building2 className="h-4 w-4" />}
          title="Business"
          onEdit={onEdit ? () => onEdit('business') : undefined}
        >
          <SummaryRow label="Business name" value={businessName} />
          <SummaryRow label="ABN" value={data.business?.abn || 'Not provided'} />
          <SummaryRow
            label="GST registered"
            value={data.abnLookup?.gstRegistered ? 'Yes ✓' : 'No'}
          />
        </SummarySection>

        {/* Asset Section */}
        <SummarySection
          icon={<Car className="h-4 w-4" />}
          title="Asset"
          onEdit={onEdit ? () => onEdit('asset') : undefined}
        >
          <SummaryRow label="Type" value={formatAssetType(data.asset?.assetType)} />
          <SummaryRow label="Condition" value={formatCondition(data.asset?.assetCondition)} />
          <SummaryRow
            label="Purchase price"
            value={data.asset?.assetPriceIncGst ? formatCurrency(data.asset.assetPriceIncGst) : 'Not provided'}
          />
        </SummarySection>

        {/* Your Details Section */}
        <SummarySection
          icon={<User className="h-4 w-4" />}
          title="Your Details"
          onEdit={onEdit ? () => onEdit('personal') : undefined}
        >
          {directorsList.map((director, index) => (
            <div key={index} className={index > 0 ? 'mt-3 pt-3 border-t border-slate-100' : ''}>
              {directorsList.length > 1 && (
                <div className="text-xs text-slate-400 mb-1">Director {index + 1}</div>
              )}
              <SummaryRow label="Name" value={director.firstName || 'Not provided'} />
              <SummaryRow label="Email" value={director.email || 'Not provided'} />
              <SummaryRow label="Phone" value={director.phone || 'Not provided'} />
            </div>
          ))}
        </SummarySection>

        {/* Loan Section */}
        <SummarySection
          icon={<DollarSign className="h-4 w-4" />}
          title="Loan Details"
          onEdit={onEdit ? () => onEdit('loan') : undefined}
        >
          <SummaryRow
            label="Finance amount"
            value={formatCurrency(loanAmount)}
          />
          <SummaryRow
            label="Term"
            value={data.loan?.termMonths ? `${data.loan.termMonths} months (${data.loan.termMonths / 12} years)` : '60 months'}
          />
          <SummaryRow
            label="Balloon"
            value={data.loan?.balloonPercentage ? `${data.loan.balloonPercentage}%` : 'No balloon'}
          />
          {data.loan?.depositAmount && data.loan.depositAmount > 0 && (
            <SummaryRow label="Deposit" value={formatCurrency(data.loan.depositAmount)} />
          )}
        </SummarySection>

        {/* Quote Section */}
        {data.quote && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 border-t border-purple-100">
            <div className="text-center">
              <div className="text-sm text-slate-500 mb-1">Estimated repayments</div>
              <div className="text-2xl font-mono font-bold text-purple-700">
                {formatCurrency(data.quote.monthlyRepayment)}/month
              </div>
              <div className="text-sm text-slate-500 mt-1">
                ({formatCurrency(data.quote.weeklyRepayment)}/week at {data.quote.indicativeRate.toFixed(2)}% p.a.)
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
    <div className="p-4 border-b border-slate-100 last:border-b-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-purple-700">
          {icon}
          <span className="font-medium text-sm">{title}</span>
        </div>
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-7 px-2 text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-50"
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
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800 font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
