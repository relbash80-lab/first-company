import { useLanguage } from '../../context/LanguageContext';
import { HiOutlineMenuAlt2, HiOutlineMenuAlt3 } from 'react-icons/hi';
import { useOrganization } from '../../context/OrganizationContext';

export default function Header({ onMenuToggle, title }) {
  const { lang } = useLanguage();
  const { organization, role } = useOrganization();

  return (
    <header className="app-header bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center gap-4 sticky top-0 z-30">
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
      >
        {lang === 'ar' ? (
          <HiOutlineMenuAlt3 className="w-6 h-6" />
        ) : (
          <HiOutlineMenuAlt2 className="w-6 h-6" />
        )}
      </button>
      {title && (
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      )}
      <div className="ms-auto text-end">
        <p className="text-sm font-bold text-slate-700">{organization?.name}</p>
        <p className="text-[11px] uppercase tracking-wide text-teal-600">{role}</p>
      </div>
    </header>
  );
}
