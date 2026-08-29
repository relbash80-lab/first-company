import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineBuildingOffice2, HiOutlineShieldCheck, HiOutlineSparkles } from 'react-icons/hi2';
import { useOrganization } from '../context/OrganizationContext';
import { useLanguage } from '../context/LanguageContext';

function slugify(value) {
  const asciiSlug = value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  if (asciiSlug || !value.trim()) return asciiSlug;
  const hash = Array.from(value).reduce((total, character) => ((total * 31) + character.codePointAt(0)) >>> 0, 7);
  return `company-${hash.toString(36)}`;
}

export default function OrganizationSetupPage() {
  const { lang, toggleLanguage } = useLanguage();
  const { createOrganization } = useOrganization();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [saving, setSaving] = useState(false);
  const isArabic = lang === 'ar';
  const suggestedSlug = useMemo(() => slugify(name), [name]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createOrganization({ name, slug: slug || suggestedSlug, currency: 'USD' });
      toast.success(isArabic ? 'تم إنشاء شركتك وبدء الفترة التجريبية' : 'Workspace created and trial started');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-5 lg:p-10" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-6xl grid lg:grid-cols-[1.1fr_.9fr] gap-8 items-center min-h-[calc(100vh-5rem)]">
        <section>
          <button onClick={toggleLanguage} className="text-sm text-teal-300 mb-10">
            {isArabic ? 'English' : 'العربية'}
          </button>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-400/10 border border-teal-300/20 px-4 py-2 text-teal-200 text-sm mb-6">
            <HiOutlineSparkles /> {isArabic ? 'SaaS متعدد الشركات' : 'Multi-tenant SaaS'}
          </div>
          <h1 className="text-4xl lg:text-6xl font-black leading-tight mb-6">
            {isArabic ? 'أنشئ مساحة شركتك الأولى' : 'Create your first company workspace'}
          </h1>
          <p className="text-slate-300 text-lg leading-8 max-w-2xl">
            {isArabic
              ? 'كل شركة تحصل على بياناتها وأعضائها واشتراكها بصورة مستقلة. سياسات Neon RLS تمنع اختلاط بيانات المشتركين.'
              : 'Every company gets isolated data, members, and subscription. Neon RLS policies prevent tenant data from mixing.'}
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mt-10">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5"><HiOutlineShieldCheck className="w-7 h-7 text-teal-300 mb-3"/><b>{isArabic ? 'عزل محكم' : 'Strong isolation'}</b><p className="text-sm text-slate-400 mt-2">RLS على كل جداول التشغيل.</p></div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5"><HiOutlineBuildingOffice2 className="w-7 h-7 text-teal-300 mb-3"/><b>{isArabic ? 'جاهز للاشتراك' : 'Subscription ready'}</b><p className="text-sm text-slate-400 mt-2">تجربة، خطط، استخدام وفوترة.</p></div>
          </div>
        </section>

        <section className="bg-white text-slate-900 rounded-3xl shadow-2xl p-6 sm:p-9">
          <h2 className="text-2xl font-bold mb-2">{isArabic ? 'بيانات الشركة' : 'Company details'}</h2>
          <p className="text-slate-500 mb-7">{isArabic ? 'ستصبح أنت مالك مساحة العمل.' : 'You will become the workspace owner.'}</p>
          <form onSubmit={submit} className="space-y-5">
            <label className="block"><span className="text-sm font-semibold">{isArabic ? 'اسم الشركة' : 'Company name'}</span><input value={name} onChange={(e) => setName(e.target.value)} minLength="2" required className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500" placeholder={isArabic ? 'مثال: الصقر لاستيراد السيارات' : 'Example: Falcon Auto Imports'} /></label>
            <label className="block"><span className="text-sm font-semibold">{isArabic ? 'المعرّف المختصر' : 'Workspace slug'}</span><input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500" placeholder={suggestedSlug || 'falcon-auto'} dir="ltr" /></label>
            <button disabled={saving || !(slug || suggestedSlug)} className="w-full rounded-xl bg-teal-600 text-white font-bold py-3.5 hover:bg-teal-700 disabled:opacity-50">{saving ? (isArabic ? 'جارٍ الإنشاء...' : 'Creating...') : (isArabic ? 'إنشاء الشركة وبدء التجربة' : 'Create company and start trial')}</button>
          </form>
        </section>
      </div>
    </main>
  );
}
