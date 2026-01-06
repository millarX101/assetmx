import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Users, DollarSign, TrendingUp, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/calculator';
import type { Lead } from '@/types/database';

interface DashboardStats {
  totalLeads: number;
  newLeads: number;
  totalLoanValue: number;
  conversionRate: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    newLeads: 0,
    totalLoanValue: 0,
    conversionRate: 0,
  });
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    async function fetchDashboardData() {
      try {
        // Fetch all leads
        const { data: leads, error } = await supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (leads) {
          const totalLeads = leads.length;
          const newLeads = leads.filter((l) => l.status === 'new').length;
          const converted = leads.filter((l) => l.status === 'converted').length;
          const totalLoanValue = leads.reduce((sum, l) => sum + Number(l.loan_amount), 0);
          const conversionRate = totalLeads > 0 ? (converted / totalLeads) * 100 : 0;

          setStats({
            totalLeads,
            newLeads,
            totalLoanValue,
            conversionRate,
          });

          setRecentLeads(leads.slice(0, 5));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const configured = isSupabaseConfigured();

  if (!configured) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="mx-auto h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Supabase Not Configured</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                To see real data, set up your Supabase project and add credentials to{' '}
                <code className="bg-gray-100 px-1 rounded">.env.local</code>
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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back! Here's your overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : stats.totalLeads}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.newLeads} new this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Leads</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? '...' : stats.newLeads}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting contact</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Loan Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : formatCurrency(stats.totalLoanValue)}
            </div>
            <p className="text-xs text-muted-foreground">All quote requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : `${stats.conversionRate.toFixed(1)}%`}
            </div>
            <p className="text-xs text-muted-foreground">Lead to conversion</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Leads */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Leads</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : recentLeads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No leads yet. They'll appear here when customers submit quote requests.
            </div>
          ) : (
            <div className="space-y-4">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{lead.business_name}</p>
                    <p className="text-sm text-muted-foreground">{lead.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(lead.loan_amount)}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {lead.asset_type} - {lead.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
