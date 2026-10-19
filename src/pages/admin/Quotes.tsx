// /admin/quotes - every quote, newest first.

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/calculator';
import { QUOTE_STATUS_META, db, timeAgo } from '@/lib/crm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Quote, QuoteStatus } from '@/types/database';

export function AdminQuotes() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'open' | QuoteStatus>('all');
  // Automatic quotes (request-quote) have no created_by; manual ones carry the admin's id.
  const [origin, setOrigin] = useState<'all' | 'manual' | 'auto'>('all');

  useEffect(() => {
    db
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data }) => {
        setQuotes(data ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const t = search.toLowerCase().trim();
    return quotes.filter((q) => {
      if (origin === 'auto' && q.created_by) return false;
      if (origin === 'manual' && !q.created_by) return false;
      if (status === 'open' && !(q.status === 'sent' || q.status === 'viewed')) return false;
      if (status !== 'all' && status !== 'open' && q.status !== status) return false;
      if (!t) return true;
      return [q.quote_number, q.customer_name, q.customer_email, q.business_name, q.asset_description]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(t));
    });
  }, [quotes, search, status, origin]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
        <Button asChild className="bg-forest hover:bg-forest-700 text-white">
          <Link to="/admin/quotes/new">
            <Plus className="mr-2 h-4 w-4" />New quote
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search quote number, customer, business, asset…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="w-full md:w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All quotes</SelectItem>
              <SelectItem value="open">Awaiting response</SelectItem>
              {(Object.keys(QUOTE_STATUS_META) as QuoteStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{QUOTE_STATUS_META[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={origin} onValueChange={(v) => setOrigin(v as typeof origin)}>
            <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Manual + auto</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="auto">Auto</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {quotes.length ? 'No quotes match.' : 'No quotes yet. Create one from a lead or with “New quote”.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Finance</TableHead>
                    <TableHead>Repayment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Sent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((q) => (
                    <TableRow key={q.id} className="cursor-pointer" onClick={() => navigate(`/admin/quotes/${q.id}`)}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {q.quote_number}
                        <div className="text-xs font-normal text-muted-foreground">{q.created_by ? 'Manual' : 'Auto'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{q.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{q.business_name ?? q.customer_email}</div>
                      </TableCell>
                      <TableCell>
                        <div>{formatCurrency(q.loan_amount)}</div>
                        <div className="text-xs text-muted-foreground">
                          {q.term_months}mo · {formatPercentage(q.rate_pct)}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(q.monthly_repayment)}/mo</TableCell>
                      <TableCell>
                        <Badge variant={QUOTE_STATUS_META[q.status].variant}>{QUOTE_STATUS_META[q.status].label}</Badge>
                      </TableCell>
                      <TableCell>{q.view_count || '—'}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {q.sent_at ? timeAgo(q.sent_at) : 'Not sent'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
