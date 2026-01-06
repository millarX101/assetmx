import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatPercentage } from '@/lib/calculator';
import { Search, Eye, Clock, FileText, FileSpreadsheet } from 'lucide-react';

type ApplicationStatus = 'draft' | 'submitted' | 'eligible' | 'ineligible' | 'approved' | 'declined' | 'settled';

interface Director {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  email: string;
  phone: string;
  address?: string;
  licenceNumber?: string;
  licenceState?: string;
  // Financial position
  propertyValue?: number;
  mortgageBalance?: number;
  vehiclesValue?: number;
  savingsValue?: number;
  otherLoansBalance?: number;
  creditCardLimit?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  netPosition?: number;
}

interface Application {
  id: string;
  created_at: string;
  updated_at: string;
  status: ApplicationStatus;
  step_completed: number;
  // Business
  abn: string;
  abn_status?: string;
  abn_registered_date?: string;
  entity_name: string;
  entity_type?: string;
  gst_registered?: boolean;
  trading_name?: string;
  business_address?: string;
  business_state?: string;
  business_postcode?: string;
  // Asset
  asset_type: string;
  asset_condition: string;
  asset_year?: number;
  asset_make?: string;
  asset_model?: string;
  asset_description?: string;
  supplier_name?: string;
  asset_price_ex_gst?: number;
  asset_gst?: number;
  asset_price_inc_gst?: number;
  // Loan
  loan_amount: number;
  deposit_amount?: number;
  trade_in_amount?: number;
  term_months: number;
  balloon_percentage?: number;
  balloon_amount?: number;
  business_use_percentage?: number;
  // Quote
  indicative_rate?: number;
  monthly_repayment?: number;
  // Directors
  directors?: Director[];
  primary_contact_index?: number;
  // Admin
  notes?: string;
  internal_notes?: string;
}

const statusColors: Record<ApplicationStatus, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info'> = {
  draft: 'secondary',
  submitted: 'info',
  eligible: 'warning',
  ineligible: 'destructive',
  approved: 'success',
  declined: 'destructive',
  settled: 'success',
};

const statusLabels: Record<ApplicationStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  eligible: 'Eligible',
  ineligible: 'Ineligible',
  approved: 'Approved',
  declined: 'Declined',
  settled: 'Settled',
};

export function AdminApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }
    fetchApplications();
  }, []);

  useEffect(() => {
    let filtered = applications;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (app) =>
          app.entity_name.toLowerCase().includes(term) ||
          app.abn.includes(term) ||
          (app.directors?.[0]?.email?.toLowerCase().includes(term)) ||
          (app.directors?.[0]?.phone?.includes(term))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }

    setFilteredApplications(filtered);
  }, [applications, searchTerm, statusFilter]);

  async function fetchApplications() {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications((data || []) as Application[]);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateApplicationStatus(appId: string, newStatus: ApplicationStatus) {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: newStatus } as never)
        .eq('id', appId);

      if (error) throw error;

      setApplications((prev) =>
        prev.map((app) =>
          app.id === appId ? { ...app, status: newStatus } : app
        )
      );

      if (selectedApp?.id === appId) {
        setSelectedApp((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (error) {
      console.error('Error updating application status:', error);
    }
  }

  async function updateApplicationNotes(appId: string) {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ notes } as never)
        .eq('id', appId);

      if (error) throw error;

      setApplications((prev) =>
        prev.map((app) => (app.id === appId ? { ...app, notes } : app))
      );

      if (selectedApp) {
        setSelectedApp({ ...selectedApp, notes });
      }
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  }

  // Export as CSV for Westpac manual entry
  function exportToCSV() {
    const headers = [
      'Date',
      'Status',
      'ABN',
      'Entity Name',
      'Entity Type',
      'GST Registered',
      'ABN Registered Date',
      'Business State',
      'Business Postcode',
      'Director 1 Name',
      'Director 1 DOB',
      'Director 1 Email',
      'Director 1 Phone',
      'Director 1 Address',
      'Director 1 Licence',
      'Director 1 Licence State',
      'Property Value',
      'Mortgage Balance',
      'Vehicles Value',
      'Savings/Super',
      'Other Loans',
      'Credit Card Limits',
      'Total Assets',
      'Total Liabilities',
      'Net Position',
      'Asset Type',
      'Asset Condition',
      'Asset Year',
      'Asset Make',
      'Asset Model',
      'Asset Description',
      'Asset Price (inc GST)',
      'Supplier Name',
      'Loan Amount',
      'Deposit',
      'Trade-In',
      'Term (months)',
      'Balloon %',
      'Balloon Amount',
      'Business Use %',
      'Indicative Rate',
      'Monthly Repayment',
    ];

    const rows = filteredApplications.map((app) => {
      const director = app.directors?.[0];
      return [
        new Date(app.created_at).toLocaleDateString('en-AU'),
        app.status,
        app.abn,
        app.entity_name,
        app.entity_type || '',
        app.gst_registered ? 'Yes' : 'No',
        app.abn_registered_date || '',
        app.business_state || '',
        app.business_postcode || '',
        director ? `${director.firstName} ${director.lastName}` : '',
        director?.dateOfBirth || '',
        director?.email || '',
        director?.phone || '',
        director?.address || '',
        director?.licenceNumber || '',
        director?.licenceState || '',
        director?.propertyValue || 0,
        director?.mortgageBalance || 0,
        director?.vehiclesValue || 0,
        director?.savingsValue || 0,
        director?.otherLoansBalance || 0,
        director?.creditCardLimit || 0,
        director?.totalAssets || 0,
        director?.totalLiabilities || 0,
        director?.netPosition || 0,
        app.asset_type,
        app.asset_condition,
        app.asset_year || '',
        app.asset_make || '',
        app.asset_model || '',
        app.asset_description || '',
        app.asset_price_inc_gst || '',
        app.supplier_name || '',
        app.loan_amount,
        app.deposit_amount || 0,
        app.trade_in_amount || 0,
        app.term_months,
        app.balloon_percentage || 0,
        app.balloon_amount || 0,
        app.business_use_percentage || 100,
        app.indicative_rate || '',
        app.monthly_repayment || '',
      ];
    });

    // Escape CSV values
    const escapeCSV = (val: unknown): string => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csv = [headers, ...rows].map((row) => row.map(escapeCSV).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assetmx-applications-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Export single application as detailed text (for copy/paste into Westpac)
  function exportSingleAsText(app: Application) {
    const director = app.directors?.[0];
    const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-AU') : 'N/A';

    const text = `
================================================================================
ASSETMX APPLICATION - WESTPAC MANUAL ENTRY
================================================================================

SUBMISSION DATE: ${formatDate(app.created_at)}
APPLICATION STATUS: ${statusLabels[app.status]}

--------------------------------------------------------------------------------
BUSINESS DETAILS
--------------------------------------------------------------------------------
ABN:                    ${app.abn}
Entity Name:            ${app.entity_name}
Entity Type:            ${app.entity_type || 'N/A'}
Trading Name:           ${app.trading_name || 'Same as entity name'}
GST Registered:         ${app.gst_registered ? 'Yes' : 'No'}
ABN Registration Date:  ${formatDate(app.abn_registered_date)}
Business Address:       ${app.business_address || 'N/A'}
Business State:         ${app.business_state || 'N/A'}
Business Postcode:      ${app.business_postcode || 'N/A'}

--------------------------------------------------------------------------------
DIRECTOR / GUARANTOR DETAILS
--------------------------------------------------------------------------------
Full Name:              ${director ? `${director.firstName} ${director.lastName}` : 'N/A'}
Date of Birth:          ${director?.dateOfBirth || 'N/A'}
Email:                  ${director?.email || 'N/A'}
Phone:                  ${director?.phone || 'N/A'}
Address:                ${director?.address || 'N/A'}
Driver's Licence:       ${director?.licenceNumber || 'N/A'}
Licence State:          ${director?.licenceState || 'N/A'}

--------------------------------------------------------------------------------
PERSONAL FINANCIAL POSITION
--------------------------------------------------------------------------------
ASSETS:
  Property Value:       ${director?.propertyValue ? formatCurrency(director.propertyValue) : '$0'}
  Vehicles Value:       ${director?.vehiclesValue ? formatCurrency(director.vehiclesValue) : '$0'}
  Savings/Super:        ${director?.savingsValue ? formatCurrency(director.savingsValue) : '$0'}
  TOTAL ASSETS:         ${director?.totalAssets ? formatCurrency(director.totalAssets) : '$0'}

LIABILITIES:
  Mortgage Balance:     ${director?.mortgageBalance ? formatCurrency(director.mortgageBalance) : '$0'}
  Other Loans:          ${director?.otherLoansBalance ? formatCurrency(director.otherLoansBalance) : '$0'}
  Credit Card Limits:   ${director?.creditCardLimit ? formatCurrency(director.creditCardLimit) : '$0'}
  TOTAL LIABILITIES:    ${director?.totalLiabilities ? formatCurrency(director.totalLiabilities) : '$0'}

NET POSITION:           ${director?.netPosition ? formatCurrency(director.netPosition) : '$0'}

--------------------------------------------------------------------------------
ASSET DETAILS
--------------------------------------------------------------------------------
Asset Type:             ${app.asset_type}
Asset Condition:        ${app.asset_condition.replace('_', ' ')}
Asset Year:             ${app.asset_year || 'N/A'}
Make:                   ${app.asset_make || 'N/A'}
Model:                  ${app.asset_model || 'N/A'}
Description:            ${app.asset_description || 'N/A'}
Supplier:               ${app.supplier_name || 'N/A'}
Price (inc GST):        ${app.asset_price_inc_gst ? formatCurrency(app.asset_price_inc_gst) : 'N/A'}
Price (ex GST):         ${app.asset_price_ex_gst ? formatCurrency(app.asset_price_ex_gst) : 'N/A'}
GST Amount:             ${app.asset_gst ? formatCurrency(app.asset_gst) : 'N/A'}

--------------------------------------------------------------------------------
LOAN DETAILS
--------------------------------------------------------------------------------
Loan Amount:            ${formatCurrency(app.loan_amount)}
Deposit:                ${formatCurrency(app.deposit_amount || 0)}
Trade-In Value:         ${formatCurrency(app.trade_in_amount || 0)}
Term:                   ${app.term_months} months
Balloon Percentage:     ${app.balloon_percentage || 0}%
Balloon Amount:         ${formatCurrency(app.balloon_amount || 0)}
Business Use:           ${app.business_use_percentage || 100}%

--------------------------------------------------------------------------------
INDICATIVE QUOTE
--------------------------------------------------------------------------------
Indicative Rate:        ${app.indicative_rate ? formatPercentage(app.indicative_rate) : 'N/A'}
Monthly Repayment:      ${app.monthly_repayment ? formatCurrency(app.monthly_repayment) : 'N/A'}

================================================================================
Generated by AssetMX on ${new Date().toLocaleDateString('en-AU')} at ${new Date().toLocaleTimeString('en-AU')}
================================================================================
`.trim();

    // Copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
      alert('Application details copied to clipboard!');
    }).catch(() => {
      // Fallback: download as file
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `application-${app.abn}-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  const configured = isSupabaseConfigured();

  if (!configured) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="mx-auto h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Supabase Not Configured</h3>
              <p className="text-muted-foreground">
                Set up Supabase to see and manage applications.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
        <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by business name, ABN, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="eligible">Eligible</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="settled">Settled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filteredApplications.length} Application{filteredApplications.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || statusFilter !== 'all'
                ? 'No applications match your filters.'
                : 'No applications yet.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Loan</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((app) => {
                    const director = app.directors?.[0];
                    return (
                      <TableRow key={app.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(app.created_at).toLocaleDateString('en-AU')}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{app.entity_name}</p>
                            <p className="text-xs text-muted-foreground">
                              ABN: {app.abn}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {director ? (
                            <div>
                              <p className="text-sm">{director.firstName} {director.lastName}</p>
                              <p className="text-xs text-muted-foreground">
                                {director.email}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm capitalize">{app.asset_type}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {app.asset_condition.replace('_', ' ')}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {formatCurrency(app.loan_amount)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {app.term_months}mo
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {app.indicative_rate
                            ? formatPercentage(app.indicative_rate)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusColors[app.status]}>
                            {statusLabels[app.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedApp(app);
                                setNotes(app.notes || '');
                              }}
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => exportSingleAsText(app)}
                              title="Copy for Westpac"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Application Detail Dialog */}
      <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-6">
              {/* Business Info */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold mb-3 text-blue-800">Business Details</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">ABN</Label>
                    <p className="font-medium">{selectedApp.abn}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Entity Name</Label>
                    <p className="font-medium">{selectedApp.entity_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Entity Type</Label>
                    <p className="font-medium">{selectedApp.entity_type || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">GST Registered</Label>
                    <p className="font-medium">{selectedApp.gst_registered ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">ABN Registered</Label>
                    <p className="font-medium">
                      {selectedApp.abn_registered_date
                        ? new Date(selectedApp.abn_registered_date).toLocaleDateString('en-AU')
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Location</Label>
                    <p className="font-medium">
                      {selectedApp.business_state} {selectedApp.business_postcode}
                    </p>
                  </div>
                </div>
              </div>

              {/* Director Info */}
              {selectedApp.directors?.[0] && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold mb-3 text-green-800">Director / Guarantor</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Full Name</Label>
                      <p className="font-medium">
                        {selectedApp.directors[0].firstName} {selectedApp.directors[0].lastName}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Date of Birth</Label>
                      <p className="font-medium">{selectedApp.directors[0].dateOfBirth || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="font-medium">{selectedApp.directors[0].email}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Phone</Label>
                      <p className="font-medium">{selectedApp.directors[0].phone}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Address</Label>
                      <p className="font-medium">{selectedApp.directors[0].address || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Driver's Licence</Label>
                      <p className="font-medium">
                        {selectedApp.directors[0].licenceNumber || '-'}
                        {selectedApp.directors[0].licenceState && ` (${selectedApp.directors[0].licenceState})`}
                      </p>
                    </div>
                  </div>

                  {/* Personal Financial Position */}
                  {(selectedApp.directors[0].totalAssets || selectedApp.directors[0].totalLiabilities) && (
                    <div className="mt-4 pt-4 border-t border-green-200">
                      <h5 className="font-medium mb-3 text-green-700">Personal Financial Position</h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <div className="bg-white rounded p-2">
                          <Label className="text-muted-foreground text-xs">Property Value</Label>
                          <p className="font-medium">{selectedApp.directors[0].propertyValue ? formatCurrency(selectedApp.directors[0].propertyValue) : '-'}</p>
                        </div>
                        <div className="bg-white rounded p-2">
                          <Label className="text-muted-foreground text-xs">Mortgage Balance</Label>
                          <p className="font-medium text-red-600">{selectedApp.directors[0].mortgageBalance ? formatCurrency(selectedApp.directors[0].mortgageBalance) : '-'}</p>
                        </div>
                        <div className="bg-white rounded p-2">
                          <Label className="text-muted-foreground text-xs">Vehicles Value</Label>
                          <p className="font-medium">{selectedApp.directors[0].vehiclesValue ? formatCurrency(selectedApp.directors[0].vehiclesValue) : '-'}</p>
                        </div>
                        <div className="bg-white rounded p-2">
                          <Label className="text-muted-foreground text-xs">Savings/Super</Label>
                          <p className="font-medium">{selectedApp.directors[0].savingsValue ? formatCurrency(selectedApp.directors[0].savingsValue) : '-'}</p>
                        </div>
                        <div className="bg-white rounded p-2">
                          <Label className="text-muted-foreground text-xs">Other Loans</Label>
                          <p className="font-medium text-red-600">{selectedApp.directors[0].otherLoansBalance ? formatCurrency(selectedApp.directors[0].otherLoansBalance) : '-'}</p>
                        </div>
                        <div className="bg-white rounded p-2">
                          <Label className="text-muted-foreground text-xs">Credit Card Limits</Label>
                          <p className="font-medium text-red-600">{selectedApp.directors[0].creditCardLimit ? formatCurrency(selectedApp.directors[0].creditCardLimit) : '-'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mt-3">
                        <div className="bg-green-100 rounded p-2 text-center">
                          <Label className="text-green-700 text-xs">Total Assets</Label>
                          <p className="font-bold text-green-700">{formatCurrency(selectedApp.directors[0].totalAssets || 0)}</p>
                        </div>
                        <div className="bg-red-100 rounded p-2 text-center">
                          <Label className="text-red-700 text-xs">Total Liabilities</Label>
                          <p className="font-bold text-red-700">{formatCurrency(selectedApp.directors[0].totalLiabilities || 0)}</p>
                        </div>
                        <div className={`rounded p-2 text-center ${(selectedApp.directors[0].netPosition || 0) >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
                          <Label className={`text-xs ${(selectedApp.directors[0].netPosition || 0) >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Net Position</Label>
                          <p className={`font-bold ${(selectedApp.directors[0].netPosition || 0) >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{formatCurrency(selectedApp.directors[0].netPosition || 0)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Asset Info */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h4 className="font-semibold mb-3 text-purple-800">Asset Details</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Asset Type</Label>
                    <p className="font-medium capitalize">{selectedApp.asset_type}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Condition</Label>
                    <p className="font-medium capitalize">{selectedApp.asset_condition.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Year</Label>
                    <p className="font-medium">{selectedApp.asset_year || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Make</Label>
                    <p className="font-medium">{selectedApp.asset_make || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Model</Label>
                    <p className="font-medium">{selectedApp.asset_model || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Supplier</Label>
                    <p className="font-medium">{selectedApp.supplier_name || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Price (inc GST)</Label>
                    <p className="font-medium">
                      {selectedApp.asset_price_inc_gst
                        ? formatCurrency(selectedApp.asset_price_inc_gst)
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Loan Details */}
              <div className="bg-amber-50 rounded-lg p-4">
                <h4 className="font-semibold mb-3 text-amber-800">Loan Details</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Loan Amount</Label>
                    <p className="font-medium text-lg">{formatCurrency(selectedApp.loan_amount)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Deposit</Label>
                    <p className="font-medium">{formatCurrency(selectedApp.deposit_amount || 0)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Trade-In</Label>
                    <p className="font-medium">{formatCurrency(selectedApp.trade_in_amount || 0)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Term</Label>
                    <p className="font-medium">{selectedApp.term_months} months</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Balloon</Label>
                    <p className="font-medium">
                      {selectedApp.balloon_percentage || 0}%
                      {selectedApp.balloon_amount && ` (${formatCurrency(selectedApp.balloon_amount)})`}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Business Use</Label>
                    <p className="font-medium">{selectedApp.business_use_percentage || 100}%</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Indicative Rate</Label>
                    <p className="font-medium text-green-600">
                      {selectedApp.indicative_rate
                        ? formatPercentage(selectedApp.indicative_rate)
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Monthly Repayment</Label>
                    <p className="font-medium">
                      {selectedApp.monthly_repayment
                        ? formatCurrency(selectedApp.monthly_repayment)
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status & Actions */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label className="text-muted-foreground mb-2 block">Status</Label>
                  <Select
                    value={selectedApp.status}
                    onValueChange={(value) =>
                      updateApplicationStatus(selectedApp.id, value as ApplicationStatus)
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="eligible">Eligible</SelectItem>
                      <SelectItem value="ineligible">Ineligible</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                      <SelectItem value="settled">Settled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-muted-foreground mb-2 block">Quick Export</Label>
                  <Button
                    variant="outline"
                    onClick={() => exportSingleAsText(selectedApp)}
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Copy for Westpac
                  </Button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes" className="text-muted-foreground mb-2 block">
                  Notes
                </Label>
                <textarea
                  id="notes"
                  className="w-full min-h-24 p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Add notes about this application..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedApp(null)}>
                  Close
                </Button>
                <Button
                  onClick={() => updateApplicationNotes(selectedApp.id)}
                  className="bg-gradient-brand"
                >
                  Save Notes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
