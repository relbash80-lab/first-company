import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlineHome,
  HiOutlineTruck,
  HiOutlineCube,
  HiOutlineCreditCard,
  HiOutlineBadgeCheck,
  HiOutlineCog,
  HiOutlineLogout,
  HiOutlineGlobeAlt,
  HiOutlineSearchCircle,
  HiOutlineShieldCheck,
} from 'react-icons/hi';
import { useOrganization } from '../../context/OrganizationContext';

export default function Sidebar({ isOpen, onClose }) {
  const { t, toggleLanguage, lang } = useLanguage();
  const { logout } = useAuth();
  const { organization, isPlatformAdmin } = useOrganization();

  const labels = lang === 'ar'
    ? { workspace: 'مساحة العمليات', operations: 'التشغيل', vehicleCenter: 'مركز السيارات', platform: 'إدارة المنصة' }
    : { workspace: 'Operations workspace', operations: 'Operations', vehicleCenter: 'Vehicle center', platform: 'Platform administration' };
  const tenantLinks = [
    { to: '/', icon: HiOutlineHome, label: t.dashboard },
    { to: '/cars', icon: HiOutlineSearchCircle, label: labels.vehicleCenter },
    { to: '/containers', icon: HiOutlineCube, label: t.containers },
    { to: '/finance', icon: HiOutlineCreditCard, label: t.finance },
    { to: '/subscription', icon: HiOutlineBadgeCheck, label: t.subscription },
  ];
  const links = [
    ...(organization ? tenantLinks : []),
    ...(isPlatformAdmin ? [{ to: '/platform', icon: HiOutlineShieldCheck, label: labels.platform }] : []),
  ];

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 ${
      isActive
        ? 'bg-white text-slate-950 shadow-lg shadow-slate-950/10'
        : 'text-slate-300 hover:bg-white/8 hover:text-white'
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
        className={`fixed top-0 ${lang === 'ar' ? 'right-0' : 'left-0'} h-full w-72 bg-[#0d1b2f] z-50 transform transition-transform duration-300 lg:translate-x-0 ${
          isOpen
            ? 'translate-x-0'
            : lang === 'ar'
            ? 'translate-x-full'
            : '-translate-x-full'
        } flex flex-col`}
      >
        {/* Logo */}
        <div className="border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-teal-500 text-white shadow-lg shadow-teal-950/40"><HiOutlineTruck className="h-6 w-6" /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-teal-300">First Company</p><h1 className="mt-0.5 text-sm font-black text-white">{labels.workspace}</h1></div></div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto p-4">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{labels.operations}</p>
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
        <div className="space-y-2 border-t border-white/10 p-4">
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
