import { useEffect, useMemo, useState } from 'react';
import { HiOutlineClock, HiOutlineSparkles } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';
import { loadPublishedReleases } from '../services/usageService';

export default function ReleaseNotesPage() {
  const { lang } = useLanguage();
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const labels = useMemo(() => lang === 'ar' ? {
    eyebrow: 'تطور المنصة', title: 'سجل الإصدارات', subtitle: 'كل ميزة وإصلاح نُشر في المنصة مع تاريخ واضح.', empty: 'لا توجد إصدارات منشورة بعد.',
  } : {
    eyebrow: 'Platform evolution', title: 'Release notes', subtitle: 'Every published feature and fix with a clear date.', empty: 'No published releases yet.',
  }, [lang]);

  useEffect(() => {
    loadPublishedReleases().then(setReleases).catch((error) => toast.error(error.message)).finally(() => setLoading(false));
  }, []);

  return <div className="mx-auto max-w-5xl space-y-6">
    <header><p className="text-xs font-black uppercase tracking-[0.2em] text-teal-600">{labels.eyebrow}</p><h1 className="mt-2 text-3xl font-black text-slate-950">{labels.title}</h1><p className="mt-2 text-sm text-slate-500">{labels.subtitle}</p></header>
    {loading ? <div className="h-44 animate-pulse rounded-2xl bg-slate-200" /> : releases.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">{labels.empty}</div> : <div className="relative space-y-5 before:absolute before:bottom-5 before:start-5 before:top-5 before:w-px before:bg-slate-200">
      {releases.map((release) => <article key={release.id} className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:ms-12 sm:p-6">
        <span className="absolute -start-[3.35rem] top-6 hidden h-10 w-10 place-items-center rounded-full bg-teal-600 text-white ring-8 ring-[#f4f6f8] sm:grid"><HiOutlineSparkles /></span>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><span className="rounded-full bg-slate-900 px-3 py-1 font-mono text-xs font-bold text-white" dir="ltr">v{release.version}</span><h2 className="mt-4 text-xl font-black text-slate-900">{lang === 'ar' ? release.title_ar : release.title_en}</h2><p className="mt-2 text-sm text-slate-600">{lang === 'ar' ? release.summary_ar : release.summary_en}</p></div><span className="flex shrink-0 items-center gap-2 text-xs text-slate-400"><HiOutlineClock />{release.released_at ? new Intl.DateTimeFormat(lang === 'ar' ? 'ar-LY' : 'en-GB', { dateStyle: 'medium' }).format(new Date(release.released_at)) : '—'}</span></div>
        {Array.isArray(release.changes) && release.changes.length > 0 && <ul className="mt-5 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">{release.changes.map((change) => <li key={change} className="rounded-xl bg-slate-50 px-4 py-3">• {String(change).replaceAll('_', ' ')}</li>)}</ul>}
      </article>)}
    </div>}
  </div>;
}
