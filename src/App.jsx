import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OrganizationProvider, useOrganization } from './context/OrganizationContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import OrganizationSetupPage from './pages/OrganizationSetupPage';
import DashboardPage from './pages/DashboardPage';
import CarsPage from './pages/CarsPage';
import ContainersPage from './pages/ContainersPage';
import PaymentsPage from './pages/PaymentsPage';
import FinancePage from './pages/FinancePage';
import FinancialDocumentPage from './pages/FinancialDocumentPage';
import SubscriptionPage from './pages/SubscriptionPage';

function LoadingScreen() {
  return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="text-center"><div className="animate-spin w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"/><p className="text-slate-500">جارٍ تجهيز مساحة العمل...</p></div></div>;
}

function ProtectedWorkspace({ children }) {
  const { user, loading: authLoading } = useAuth();
  const { organization, loading: orgLoading, error } = useOrganization();
  if (authLoading || (user && orgLoading)) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (error) return <div className="min-h-screen grid place-items-center p-6 text-red-700">{error.message}</div>;
  if (!organization) return <OrganizationSetupPage />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? <Navigate to="/" replace /> : children;
}

function AppRoutes() {
  return <Routes>
    <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
    <Route element={<ProtectedWorkspace><AppLayout /></ProtectedWorkspace>}>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/cars" element={<CarsPage />} />
      <Route path="/containers" element={<ContainersPage />} />
      <Route path="/payments" element={<PaymentsPage />} />
      <Route path="/finance" element={<FinancePage />} />
      <Route path="/finance/invoices/:id/print" element={<FinancialDocumentPage kind="invoice" />} />
      <Route path="/finance/receipts/:id/print" element={<FinancialDocumentPage kind="receipt" />} />
      <Route path="/finance/clients/:id/statement" element={<FinancialDocumentPage kind="statement" />} />
      <Route path="/subscription" element={<SubscriptionPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}

export default function App() {
  return <LanguageProvider><AuthProvider><OrganizationProvider><BrowserRouter basename={import.meta.env.BASE_URL}><Toaster position="top-center" toastOptions={{ duration: 3500, style: { borderRadius: '12px', background: '#0f172a', color: '#fff' } }}/><AppRoutes /></BrowserRouter></OrganizationProvider></AuthProvider></LanguageProvider>;
}
