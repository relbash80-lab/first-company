import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useLanguage } from '../../context/LanguageContext';
import { useOrganization } from '../../context/OrganizationContext';
import { recordUsage } from '../../services/usageService';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { lang } = useLanguage();
  const { organizationId } = useOrganization();
  const location = useLocation();

  useEffect(() => {
    if (!organizationId) return undefined;
    const report = () => recordUsage({ organizationId, pathname: location.pathname }).catch(() => {});
    report();
    const onVisibility = () => { if (document.visibilityState === 'visible') report(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [organizationId, location.pathname]);

  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className={`app-shell-content ${lang === 'ar' ? 'lg:mr-72' : 'lg:ml-72'} transition-all duration-300`}>
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="app-main mx-auto w-full max-w-[1720px] p-4 md:p-6 lg:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
