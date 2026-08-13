import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useLanguage } from '../../context/LanguageContext';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { lang } = useLanguage();

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
