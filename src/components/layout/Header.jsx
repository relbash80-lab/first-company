import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { HiOutlineBell, HiOutlineMenuAlt2, HiOutlineMenuAlt3, HiOutlineSearch } from 'react-icons/hi';
import { useOrganization } from '../../context/OrganizationContext';

export default function Header({ onMenuToggle, title }) {
  const { lang } = useLanguage();
  const { organization, role } = useOrganization();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const labels = lang === 'ar' ? { placeholder: 'ابحث بـ VIN أو رقم اللوت أو السيارة أو المالك...', account: 'حساب الشركة', notifications: 'الإشعارات', menu: 'فتح القائمة' } : { placeholder: 'Search VIN, lot, vehicle or owner...', account: 'Company account', notifications: 'Notifications', menu: 'Open menu' };

  function submit(event) {
    event.preventDefault();
    const value = query.trim();
    navigate(value ? `/cars?q=${encodeURIComponent(value)}` : '/cars');
  }

  return (
    <header className="app-header sticky top-0 z-30 flex min-h-18 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur md:px-6">
      <button
        onClick={onMenuToggle}
        aria-label={labels.menu}
        className="lg:hidden rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"
      >
        {lang === 'ar' ? (
          <HiOutlineMenuAlt3 className="w-6 h-6" />
        ) : (
          <HiOutlineMenuAlt2 className="w-6 h-6" />
        )}
      </button>
      {title && <h2 className="hidden text-lg font-semibold text-gray-800 xl:block">{title}</h2>}
      <form onSubmit={submit} className="relative mx-auto flex-1 md:max-w-2xl">
        <HiOutlineSearch className="pointer-events-none absolute start-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.placeholder} className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 ps-11 pe-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10" />
      </form>
      <button title={labels.notifications} className="relative grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"><HiOutlineBell className="h-5 w-5" /><span className="absolute end-2 top-2 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white" /></button>
      <div className="hidden min-w-32 items-center gap-3 border-s border-slate-200 ps-4 sm:flex"><div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-700 text-sm font-black text-white">{organization?.name?.slice(0, 1) || 'F'}</div><div className="text-start"><p className="max-w-32 truncate text-sm font-black text-slate-800">{organization?.name}</p><p className="text-[10px] uppercase tracking-wider text-slate-400">{labels.account} · {role}</p></div></div>
    </header>
  );
}
