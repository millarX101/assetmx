import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Landing } from '@/pages/Landing';
import { Application } from '@/pages/Application';
import { Terms } from '@/pages/legal/Terms';
import { Privacy } from '@/pages/legal/Privacy';
import { CreditGuide } from '@/pages/legal/CreditGuide';
import { AdminLogin } from '@/pages/admin/Login';
import { AdminLayout } from '@/pages/admin/AdminLayout';
import { AdminDashboard } from '@/pages/admin/Dashboard';
import { AdminLeads } from '@/pages/admin/Leads';
import { AdminRates } from '@/pages/admin/Rates';
import { useAuthStore } from '@/stores/authStore';

// Protected route wrapper for admin pages
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/apply" element={<Application />} />

        {/* Legal pages */}
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/credit-guide" element={<CreditGuide />} />

        {/* Admin routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="leads" element={<AdminLeads />} />
          <Route path="rates" element={<AdminRates />} />
        </Route>

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
