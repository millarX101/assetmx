import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminLogin } from '@/pages/admin/Login';
import { AdminLayout } from '@/pages/admin/AdminLayout';
import { AdminResetPassword } from '@/pages/admin/ResetPassword';
import { useAuthStore } from '@/stores/authStore';

// Admin app, served on its own site (admin.html). Paths keep the /admin prefix so
// every existing link and navigate() call works unchanged; / goes to /admin.
const page = <T extends Record<string, React.ComponentType>>(load: () => Promise<T>, name: keyof T) =>
  lazy(() => load().then((m) => ({ default: m[name] as React.ComponentType })));

const AdminDashboard = page(() => import('@/pages/admin/Dashboard'), 'AdminDashboard');
const AdminApplications = page(() => import('@/pages/admin/Applications'), 'AdminApplications');
const AdminLeads = page(() => import('@/pages/admin/Leads'), 'AdminLeads');
const LeadDetail = page(() => import('@/pages/admin/LeadDetail'), 'LeadDetail');
const AdminQuotes = page(() => import('@/pages/admin/Quotes'), 'AdminQuotes');
const QuoteBuilder = page(() => import('@/pages/admin/QuoteBuilder'), 'QuoteBuilder');
const QuoteDetail = page(() => import('@/pages/admin/QuoteDetail'), 'QuoteDetail');
const AdminAnalytics = page(() => import('@/pages/admin/Analytics'), 'AdminAnalytics');
const AdminRates = page(() => import('@/pages/admin/Rates'), 'AdminRates');

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isLoading } = useAuthStore();
  if (isLoading) return <Spinner />;
  if (!user || !isAdmin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

export function AdminApp() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/reset-password" element={<AdminResetPassword />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="applications" element={<AdminApplications />} />
            <Route path="applications/:id" element={<AdminApplications />} />
            <Route path="leads" element={<AdminLeads />} />
            <Route path="leads/:id" element={<LeadDetail />} />
            <Route path="quotes" element={<AdminQuotes />} />
            <Route path="quotes/new" element={<QuoteBuilder />} />
            <Route path="quotes/:id" element={<QuoteDetail />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="rates" element={<AdminRates />} />
          </Route>
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
