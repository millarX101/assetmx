import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ADMIN_URL } from '@/lib/admin-url';

// Public app only. Admin is a separate build (admin.html / src/admin) served at
// ADMIN_URL, so applicants never download the admin screens.
// Each page loads on demand: opening the chat downloads the chat, nothing else.
const page = <T extends Record<string, React.ComponentType>>(load: () => Promise<T>, name: keyof T) =>
  lazy(() => load().then((m) => ({ default: m[name] as React.ComponentType })));

const Landing = page(() => import('@/pages/Landing'), 'Landing');
const Application = page(() => import('@/pages/Application'), 'Application');
const ChatApply = page(() => import('@/pages/ChatApply'), 'ChatApply');
const QuoteView = page(() => import('@/pages/QuoteView'), 'QuoteView');
const Terms = page(() => import('@/pages/legal/Terms'), 'Terms');
const Privacy = page(() => import('@/pages/legal/Privacy'), 'Privacy');
const CreditGuide = page(() => import('@/pages/legal/CreditGuide'), 'CreditGuide');
const VehicleFinance = page(() => import('@/pages/products/VehicleFinance'), 'VehicleFinance');
const TruckFinance = page(() => import('@/pages/products/TruckFinance'), 'TruckFinance');
const EquipmentFinance = page(() => import('@/pages/products/EquipmentFinance'), 'EquipmentFinance');
const EVLeasing = page(() => import('@/pages/products/EVLeasing'), 'EVLeasing');
const HowWeCompare = page(() => import('@/pages/HowWeCompare'), 'HowWeCompare');
const Contact = page(() => import('@/pages/Contact'), 'Contact');
const HowAssetFinanceWorks = page(() => import('@/pages/guides/HowAssetFinanceWorks'), 'HowAssetFinanceWorks');
const AdvertisedRatesMisleading = page(() => import('@/pages/guides/AdvertisedRatesMisleading'), 'AdvertisedRatesMisleading');
const BrokerFeesExplained = page(() => import('@/pages/guides/BrokerFeesExplained'), 'BrokerFeesExplained');

/** Old /admin links (bookmarks, emails) go to the admin site, same path. */
function ToAdminSite() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.location.replace(`${ADMIN_URL}${pathname}${search}`);
  }, [pathname, search]);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen bg-cream" />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/apply" element={<Application />} />
          <Route path="/chat-apply" element={<ChatApply />} />
          <Route path="/q/:token" element={<QuoteView />} />

          {/* Legal pages */}
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/credit-guide" element={<CreditGuide />} />

          {/* Product pages */}
          <Route path="/car-finance" element={<VehicleFinance />} />
          <Route path="/vehicle-finance" element={<Navigate to="/car-finance" replace />} />
          <Route path="/truck-finance" element={<TruckFinance />} />
          <Route path="/equipment-finance" element={<EquipmentFinance />} />
          <Route path="/ev-leasing" element={<EVLeasing />} />
          <Route path="/how-we-compare" element={<HowWeCompare />} />
          <Route path="/contact" element={<Contact />} />

          {/* Guide pages */}
          <Route path="/guides/how-asset-finance-works" element={<HowAssetFinanceWorks />} />
          <Route path="/guides/advertised-rates-misleading" element={<AdvertisedRatesMisleading />} />
          <Route path="/guides/broker-fees-explained" element={<BrokerFeesExplained />} />

          {/* Admin lives on its own site */}
          <Route path="/admin/*" element={<ToAdminSite />} />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
