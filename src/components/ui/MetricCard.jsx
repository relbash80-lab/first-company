import { Link } from 'react-router-dom';
import { HiOutlineArrowNarrowLeft, HiOutlineArrowNarrowRight } from 'react-icons/hi';
import { useLanguage } from '../../context/LanguageContext';

export default function MetricCard({ icon: Icon, label, value, hint, to, tone = 'teal' }) {
  const { lang } = useLanguage();
  const tones = {
    teal: 'bg-teal-50 text-teal-700 ring-teal-100',
    red: 'bg-rose-50 text-rose-700 ring-rose-100',
    orange: 'bg-orange-50 text-orange-700 ring-orange-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
  };
  const Arrow = lang === 'ar' ? HiOutlineArrowNarrowLeft : HiOutlineArrowNarrowRight;
  const content = <>
    <div className="flex items-start justify-between gap-4">
      <div className={`grid h-11 w-11 place-items-center rounded-xl ring-1 ${tones[tone] || tones.teal}`}><Icon className="h-6 w-6" /></div>
      {to && <Arrow className="h-5 w-5 text-slate-300 transition group-hover:text-teal-600" />}
    </div>
    <div className="mt-5"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 text-2xl font-black tracking-tight text-slate-900" dir="ltr">{value}</p>{hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}</div>
  </>;
  const className = 'group block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md';
  return to ? <Link to={to} className={className}>{content}</Link> : <div className={className}>{content}</div>;
}
