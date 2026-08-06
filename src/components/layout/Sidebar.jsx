import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlineHome,
  HiOutlineTruck,
  HiOutlineCube,
  HiOutlineCreditCard,
  HiOutlineCog,
  HiOutlineLogout,
  HiOutlineGlobeAlt,
} from 'react-icons/hi';

export default function Sidebar({ isOpen, onClose }) {
  const { t, toggleLanguage, lang } = useLanguage();
  const { logout } = useAuth();

  const links = [
    { to: '/', icon: HiOutlineHome, label: t.dashboard },
    { to: '/cars', icon: HiOutlineTruck, label: t.cars },
    { to: '/containers', icon: HiOutlineCube, label: t.containers },
    { to: '/payments', icon: HiOutlineCreditCard, label: t.payments },
  ];

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      isActive
        ? 'bg-teal-600 text-white shadow-md'
        : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
    }`;

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 ${lang === 'ar' ? 'right-0' : 'left-0'} h-full w-64 bg-gray-800 z-50 transform transition-transform duration-300 lg:translate-x-0 ${
          isOpen
            ? 'translate-x-0'
            : lang === 'ar'
            ? 'translate-x-full'
            : '-translate-x-full'
        } flex flex-col`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold text-white text-center">
            🚗 {t.appName}
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={linkClass}
              onClick={onClose}
              end={link.to === '/'}
            >
              <link.icon className="w-5 h-5 flex-shrink-0" />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="p-4 border-t border-gray-700 space-y-2">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700/50 hover:text-white w-full transition-all"
          >
            <HiOutlineGlobeAlt className="w-5 h-5" />
            <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-900/30 hover:text-red-300 w-full transition-all"
          >
            <HiOutlineLogout className="w-5 h-5" />
            <span>{t.logout}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
