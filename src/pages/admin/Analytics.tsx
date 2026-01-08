import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { formatCurrency } from '@/lib/calculator';
import {
  Users,
  FileText,
  TrendingUp,
  Eye,
  Clock,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface AnalyticsData {
  // Applications
  totalApplications: number;
  applicationsThisWeek: number;
  applicationsThisMonth: number;
  applicationsByStatus: Record<string, number>;
  applicationsByAssetType: Record<string, number>;
  avgLoanAmount: number;
  totalLoanValue: number;

  // Leads
  totalLeads: number;
  leadsThisWeek: number;
  leadsThisMonth: number;
  leadsByStatus: Record<string, number>;
  conversionRate: number;

  // Trends
  weekOverWeekChange: number;
}

export function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Fetch applications
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: applications } = await (supabase.from('applications') as any)
        .select('*');

      // Fetch leads
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: leads } = await (supabase.from('leads') as any)
        .select('*');

      const apps = (applications || []) as Array<{
        created_at: string;
        status: string;
        asset_type: string;
        loan_amount: number;
      }>;
      const allLeads = (leads || []) as Array<{
        created_at: string;
        status: string;
      }>;

      // Calculate application stats
      const applicationsThisWeek = apps.filter(
        (a) => new Date(a.created_at) >= oneWeekAgo
      ).length;
      const applicationsThisMonth = apps.filter(
        (a) => new Date(a.created_at) >= oneMonthAgo
      ).length;
      const applicationsLastWeek = apps.filter(
        (a) => new Date(a.created_at) >= twoWeeksAgo && new Date(a.created_at) < oneWeekAgo
      ).length;

      // Applications by status
      const applicationsByStatus: Record<string, number> = {};
      apps.forEach((a) => {
        applicationsByStatus[a.status] = (applicationsByStatus[a.status] || 0) + 1;
      });

      // Applications by asset type
      const applicationsByAssetType: Record<string, number> = {};
      apps.forEach((a) => {
        if (a.asset_type) {
          applicationsByAssetType[a.asset_type] = (applicationsByAssetType[a.asset_type] || 0) + 1;
        }
      });

      // Average loan amount
      const totalLoanValue = apps.reduce((sum, a) => sum + Number(a.loan_amount || 0), 0);
      const avgLoanAmount = apps.length > 0 ? totalLoanValue / apps.length : 0;

      // Lead stats
      const leadsThisWeek = allLeads.filter(
        (l) => new Date(l.created_at) >= oneWeekAgo
      ).length;
      const leadsThisMonth = allLeads.filter(
        (l) => new Date(l.created_at) >= oneMonthAgo
      ).length;

      // Leads by status
      const leadsByStatus: Record<string, number> = {};
      allLeads.forEach((l) => {
        leadsByStatus[l.status] = (leadsByStatus[l.status] || 0) + 1;
      });

      // Conversion rate
      const converted = allLeads.filter((l) => l.status === 'converted').length;
      const conversionRate = allLeads.length > 0 ? (converted / allLeads.length) * 100 : 0;

      // Week over week change
      const weekOverWeekChange = applicationsLastWeek > 0
        ? ((applicationsThisWeek - applicationsLastWeek) / applicationsLastWeek) * 100
        : applicationsThisWeek > 0 ? 100 : 0;

      setData({
        totalApplications: apps.length,
        applicationsThisWeek,
        applicationsThisMonth,
        applicationsByStatus,
        applicationsByAssetType,
        avgLoanAmount,
        totalLoanValue,
        totalLeads: allLeads.length,
        leadsThisWeek,
        leadsThisMonth,
        leadsByStatus,
        conversionRate,
        weekOverWeekChange,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const configured = isSupabaseConfigured();

  if (!configured) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="mx-auto h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Supabase Not Configured</h3>
              <p className="text-muted-foreground">
                Set up Supabase to see analytics.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleString('en-AU')}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalApplications || 0}</div>
            <p className="text-xs text-muted-foreground">
              {data?.applicationsThisWeek || 0} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalLeads || 0}</div>
            <p className="text-xs text-muted-foreground">
              {data?.leadsThisWeek || 0} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Loan Amount</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.avgLoanAmount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total: {formatCurrency(data?.totalLoanValue || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Week/Week Change</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {Math.abs(data?.weekOverWeekChange || 0).toFixed(0)}%
              </span>
              {(data?.weekOverWeekChange || 0) >= 0 ? (
                <ArrowUpRight className="h-5 w-5 text-green-600" />
              ) : (
                <ArrowDownRight className="h-5 w-5 text-red-600" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              vs last week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Applications by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Applications by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(data?.applicationsByStatus || {}).length === 0 ? (
              <p className="text-muted-foreground text-sm">No applications yet</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(data?.applicationsByStatus || {}).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
                      <span className="capitalize text-sm">{status}</span>
                    </div>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leads by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Leads by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(data?.leadsByStatus || {}).length === 0 ? (
              <p className="text-muted-foreground text-sm">No leads yet</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(data?.leadsByStatus || {}).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getLeadStatusColor(status)}`} />
                      <span className="capitalize text-sm">{status}</span>
                    </div>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Applications by Asset Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Applications by Asset Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(data?.applicationsByAssetType || {}).length === 0 ? (
              <p className="text-muted-foreground text-sm">No applications yet</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(data?.applicationsByAssetType || {}).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="capitalize text-sm">{type}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{
                            width: `${(count / (data?.totalApplications || 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="font-semibold w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Conversion Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-800">Lead Conversion Rate</span>
                <span className="text-xl font-bold text-blue-600">
                  {(data?.conversionRate || 0).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-green-800">Applications This Month</span>
                <span className="text-xl font-bold text-green-600">
                  {data?.applicationsThisMonth || 0}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="text-sm font-medium text-purple-800">Leads This Month</span>
                <span className="text-xl font-bold text-purple-600">
                  {data?.leadsThisMonth || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-400',
    submitted: 'bg-blue-500',
    eligible: 'bg-yellow-500',
    ineligible: 'bg-red-400',
    approved: 'bg-green-500',
    declined: 'bg-red-600',
    settled: 'bg-green-700',
  };
  return colors[status] || 'bg-gray-400';
}

function getLeadStatusColor(status: string): string {
  const colors: Record<string, string> = {
    new: 'bg-blue-500',
    contacted: 'bg-yellow-500',
    qualified: 'bg-purple-500',
    converted: 'bg-green-500',
    lost: 'bg-red-500',
  };
  return colors[status] || 'bg-gray-400';
}
