import { useLanguage } from '../../context/LanguageContext';
import { HiOutlineMenuAlt2, HiOutlineMenuAlt3 } from 'react-icons/hi';

export default function Header({ onMenuToggle, title }) {
  const { lang } = useLanguage();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center gap-4 sticky top-0 z-30">
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
    </header>
  );
}
