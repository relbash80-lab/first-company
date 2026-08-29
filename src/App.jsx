import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OrganizationProvider, useOrganization } from './context/OrganizationContext';
import AppLayout from './components/layout/AppLayout';
const LoginPage = lazy(() => import('./pages/LoginPage'));
const OrganizationSetupPage = lazy(() => import('./pages/OrganizationSetupPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CarsPage = lazy(() => import('./pages/CarsPage'));
const ContainersPage = lazy(() => import('./pages/ContainersPage'));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'));
const FinancePage = lazy(() => import('./pages/FinancePage'));
const FinancialDocumentPage = lazy(() => import('./pages/FinancialDocumentPage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const SubscriptionDocumentPage = lazy(() => import('./pages/SubscriptionDocumentPage'));
const PlatformAdminPage = lazy(() => import('./pages/PlatformAdminPage'));
const ReleaseNotesPage = lazy(() => import('./pages/ReleaseNotesPage'));

function LoadingScreen() {
  return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="text-center"><div className="animate-spin w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"/><p className="text-slate-500">جارٍ تجهيز مساحة العمل...</p></div></div>;
}

function ProtectedWorkspace({ children }) {
  const { user, loading: authLoading } = useAuth();
  const { organization, isPlatformAdmin, loading: orgLoading, error } = useOrganization();
  if (authLoading || (user && orgLoading)) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (error) return <div className="min-h-screen grid place-items-center p-6 text-red-700">{error.message}</div>;
  if (!organization && !isPlatformAdmin) return <OrganizationSetupPage />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? <Navigate to="/" replace /> : children;
}

function PlatformAdminRoute({ children }) {
  const { isPlatformAdmin, loading } = useOrganization();
  if (loading) return <LoadingScreen />;
  return isPlatformAdmin ? children : <Navigate to="/" replace />;
}

function TenantRoute({ children }) {
  const { organization, isPlatformAdmin, loading } = useOrganization();
  if (loading) return <LoadingScreen />;
  if (!organization) return isPlatformAdmin ? <Navigate to="/platform" replace /> : <OrganizationSetupPage />;
  return children;
}

function WorkspaceHome() {
  const { organization, isPlatformAdmin } = useOrganization();
  if (!organization && isPlatformAdmin) return <Navigate to="/platform" replace />;
  return <DashboardPage />;
}

function AppRoutes() {
  return <Routes>
    <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
    <Route element={<ProtectedWorkspace><AppLayout /></ProtectedWorkspace>}>
      <Route path="/" element={<WorkspaceHome />} />
      <Route path="/cars" element={<TenantRoute><CarsPage /></TenantRoute>} />
      <Route path="/containers" element={<TenantRoute><ContainersPage /></TenantRoute>} />
      <Route path="/payments" element={<TenantRoute><PaymentsPage /></TenantRoute>} />
      <Route path="/finance" element={<TenantRoute><FinancePage /></TenantRoute>} />
      <Route path="/finance/invoices/:id/print" element={<TenantRoute><FinancialDocumentPage kind="invoice" /></TenantRoute>} />
      <Route path="/finance/receipts/:id/print" element={<TenantRoute><FinancialDocumentPage kind="receipt" /></TenantRoute>} />
      <Route path="/finance/clients/:id/statement" element={<TenantRoute><FinancialDocumentPage kind="statement" /></TenantRoute>} />
      <Route path="/subscription" element={<TenantRoute><SubscriptionPage /></TenantRoute>} />
      <Route path="/subscription/invoices/:id/print" element={<TenantRoute><SubscriptionDocumentPage kind="invoice" /></TenantRoute>} />
      <Route path="/subscription/payments/:id/receipt" element={<TenantRoute><SubscriptionDocumentPage kind="payment" /></TenantRoute>} />
      <Route path="/updates" element={<TenantRoute><ReleaseNotesPage /></TenantRoute>} />
      <Route path="/platform" element={<PlatformAdminRoute><PlatformAdminPage /></PlatformAdminRoute>} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}

export default function App() {
  return <LanguageProvider><AuthProvider><OrganizationProvider><BrowserRouter basename={import.meta.env.BASE_URL}><Toaster position="top-center" toastOptions={{ duration: 3500, style: { borderRadius: '12px', background: '#0f172a', color: '#fff' } }}/><Suspense fallback={<LoadingScreen />}><AppRoutes /></Suspense></BrowserRouter></OrganizationProvider></AuthProvider></LanguageProvider>;
}
