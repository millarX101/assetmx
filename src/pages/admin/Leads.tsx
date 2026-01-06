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
import { Search, Download, Eye, Clock } from 'lucide-react';
import type { Lead, LeadStatus } from '@/types/database';

const statusColors: Record<LeadStatus, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info'> = {
  new: 'info',
  contacted: 'warning',
  qualified: 'secondary',
  converted: 'success',
  lost: 'destructive',
};

const statusLabels: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  converted: 'Converted',
  lost: 'Lost',
};

export function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }
    fetchLeads();
  }, []);

  useEffect(() => {
    let filtered = leads;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (lead) =>
          lead.business_name.toLowerCase().includes(term) ||
          lead.email.toLowerCase().includes(term) ||
          lead.abn.includes(term) ||
          lead.phone.includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((lead) => lead.status === statusFilter);
    }

    setFilteredLeads(filtered);
  }, [leads, searchTerm, statusFilter]);

  async function fetchLeads() {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateLeadStatus(leadId: string, newStatus: LeadStatus) {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus } as never)
        .eq('id', leadId);

      if (error) throw error;

      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId ? { ...lead, status: newStatus } : lead
        )
      );

      if (selectedLead?.id === leadId) {
        setSelectedLead((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (error) {
      console.error('Error updating lead status:', error);
    }
  }

  async function updateLeadNotes(leadId: string) {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ notes } as never)
        .eq('id', leadId);

      if (error) throw error;

      setLeads((prev) =>
        prev.map((lead) => (lead.id === leadId ? { ...lead, notes } : lead))
      );

      if (selectedLead) {
        setSelectedLead({ ...selectedLead, notes });
      }
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  }

  function exportToCSV() {
    const headers = [
      'Date',
      'Business Name',
      'Email',
      'Phone',
      'ABN',
      'Asset Type',
      'Condition',
      'Loan Amount',
      'Term (months)',
      'Balloon %',
      'Rate',
      'Monthly Repayment',
      'Status',
    ];

    const rows = filteredLeads.map((lead) => [
      new Date(lead.created_at).toLocaleDateString(),
      lead.business_name,
      lead.email,
      lead.phone,
      lead.abn,
      lead.asset_type,
      lead.asset_condition,
      lead.loan_amount,
      lead.term_months,
      lead.balloon_percentage,
      lead.indicative_rate,
      lead.monthly_repayment,
      lead.status,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assetmx-leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  const configured = isSupabaseConfigured();

  if (!configured) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="mx-auto h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Supabase Not Configured</h3>
              <p className="text-muted-foreground">
                Set up Supabase to see and manage leads.
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
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <Button onClick={exportToCSV} variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
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
                placeholder="Search by business, email, ABN, or phone..."
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
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filteredLeads.length} Lead{filteredLeads.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || statusFilter !== 'all'
                ? 'No leads match your filters.'
                : 'No leads yet.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Loan Details</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{lead.business_name}</p>
                          <p className="text-xs text-muted-foreground">
                            ABN: {lead.abn}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{lead.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {lead.phone}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {formatCurrency(lead.loan_amount)}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {lead.asset_type} / {lead.term_months}mo
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.indicative_rate
                          ? formatPercentage(lead.indicative_rate)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[lead.status]}>
                          {statusLabels[lead.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLead(lead);
                            setNotes(lead.notes || '');
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-6">
              {/* Business Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Business Name</Label>
                  <p className="font-medium">{selectedLead.business_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">ABN</Label>
                  <p className="font-medium">{selectedLead.abn}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedLead.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{selectedLead.phone}</p>
                </div>
              </div>

              {/* Quote Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold mb-3">Quote Details</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Loan Amount</Label>
                    <p className="font-medium">
                      {formatCurrency(selectedLead.loan_amount)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Asset Type</Label>
                    <p className="font-medium capitalize">{selectedLead.asset_type}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Condition</Label>
                    <p className="font-medium capitalize">
                      {selectedLead.asset_condition.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Term</Label>
                    <p className="font-medium">{selectedLead.term_months} months</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Balloon</Label>
                    <p className="font-medium">{selectedLead.balloon_percentage}%</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Indicative Rate</Label>
                    <p className="font-medium text-green-600">
                      {selectedLead.indicative_rate
                        ? formatPercentage(selectedLead.indicative_rate)
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Monthly Repayment</Label>
                    <p className="font-medium">
                      {selectedLead.monthly_repayment
                        ? formatCurrency(selectedLead.monthly_repayment)
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Est. Saving</Label>
                    <p className="font-medium text-green-600">
                      {selectedLead.estimated_saving
                        ? formatCurrency(selectedLead.estimated_saving)
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <Label className="text-muted-foreground mb-2 block">Status</Label>
                <Select
                  value={selectedLead.status}
                  onValueChange={(value) =>
                    updateLeadStatus(selectedLead.id, value as LeadStatus)
                  }
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes" className="text-muted-foreground mb-2 block">
                  Notes
                </Label>
                <textarea
                  id="notes"
                  className="w-full min-h-24 p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Add notes about this lead..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedLead(null)}>
                  Close
                </Button>
                <Button
                  onClick={() => updateLeadNotes(selectedLead.id)}
                  className="bg-gradient-to-r from-green-800 via-green-700 to-emerald-600"
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
