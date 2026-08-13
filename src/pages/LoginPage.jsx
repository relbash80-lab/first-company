import { useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineArrowRightOnRectangle, HiOutlineBuildingOffice2, HiOutlineCheckCircle } from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup, resetPassword } = useAuth();
  const { toggleLanguage, lang } = useLanguage();
  const ar = lang === 'ar';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signup') {
        const result = await signup(email, password, displayName);
        if (!result.session) {
          toast.success(ar ? 'تم إنشاء الحساب. افتح بريدك لتأكيده ثم سجّل الدخول.' : 'Account created. Confirm your email, then sign in.', { duration: 7000 });
          setMode('login');
        }
      } else {
        await login(email, password);
      }
    } catch (error) {
      const invalidCredentials = error.message?.toLowerCase().includes('invalid login credentials');
      toast.error(
        invalidCredentials
          ? (ar ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Invalid email or password')
          : error.message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email) return toast.error(ar ? 'أدخل بريدك أولاً' : 'Enter your email first');
    try {
      await resetPassword(email);
      toast.success(ar ? 'أرسلنا رابط إعادة التعيين' : 'Reset link sent');
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 grid lg:grid-cols-2" dir={ar ? 'rtl' : 'ltr'}>
      <section className="hidden lg:flex relative overflow-hidden p-14 text-white flex-col justify-between bg-gradient-to-br from-teal-700 via-teal-900 to-slate-950">
        <div className="absolute -top-36 -left-20 h-96 w-96 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative flex items-center gap-3 text-xl font-black"><span className="grid place-items-center w-11 h-11 rounded-2xl bg-white/10"><HiOutlineBuildingOffice2 /></span> First Company</div>
        <div className="relative max-w-xl">
          <p className="text-teal-200 font-bold mb-4">{ar ? 'من السيارة إلى الرصيد في شاشة واحدة' : 'From vehicle to balance in one workspace'}</p>
          <h1 className="text-5xl font-black leading-tight mb-6">{ar ? 'شغّل شركة الاستيراد بوضوح، لا بالفوضى.' : 'Run your import company with clarity.'}</h1>
          <div className="space-y-4 text-slate-200">
            {[ar ? 'عزل كامل لبيانات كل مشترك' : 'Tenant data isolation', ar ? 'رصيد مشتريات وشحن محسوب آليًا' : 'Automatic purchase and shipping balances', ar ? 'تحديثات حية وسجل تدقيق' : 'Realtime updates and audit history'].map((item) => <div key={item} className="flex items-center gap-3"><HiOutlineCheckCircle className="text-teal-300 w-6 h-6" />{item}</div>)}
          </div>
        </div>
        <p className="relative text-xs text-slate-400">Powered by Supabase · Secure multi-tenant SaaS</p>
      </section>

      <section className="bg-slate-50 flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-md">
          <div className="flex justify-between items-center mb-8"><div className="lg:hidden font-black text-slate-900">First Company</div><button onClick={toggleLanguage} className="text-sm font-bold text-teal-700">{ar ? 'English' : 'العربية'}</button></div>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/60 p-7 sm:p-9">
            <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl mb-7">
              <button onClick={() => setMode('login')} className={`rounded-lg py-2.5 text-sm font-bold ${mode === 'login' ? 'bg-white shadow text-teal-700' : 'text-slate-500'}`}>{ar ? 'تسجيل الدخول' : 'Sign in'}</button>
              <button onClick={() => setMode('signup')} className={`rounded-lg py-2.5 text-sm font-bold ${mode === 'signup' ? 'bg-white shadow text-teal-700' : 'text-slate-500'}`}>{ar ? 'إنشاء حساب' : 'Create account'}</button>
            </div>
            <h2 className="text-2xl font-black text-slate-900">{mode === 'login' ? (ar ? 'مرحبًا بعودتك' : 'Welcome back') : (ar ? 'ابدأ تجربتك' : 'Start your trial')}</h2>
            <p className="text-slate-500 mt-2 mb-7">{mode === 'login' ? (ar ? 'ادخل إلى مساحة شركتك الآمنة.' : 'Enter your secure company workspace.') : (ar ? 'أنشئ حسابك ثم مساحة شركتك.' : 'Create your account, then your workspace.')}</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && <label className="block"><span className="text-sm font-semibold text-slate-700">{ar ? 'اسمك' : 'Your name'}</span><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500" /></label>}
              <label className="block"><span className="text-sm font-semibold text-slate-700">{ar ? 'البريد الإلكتروني' : 'Email'}</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500" dir="ltr" placeholder="name@company.com" /></label>
              <label className="block"><span className="text-sm font-semibold text-slate-700">{ar ? 'كلمة المرور' : 'Password'}</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength="8" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-teal-500" dir="ltr" placeholder="••••••••" /></label>
              <button disabled={loading} className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-xl py-3.5 font-black flex items-center justify-center gap-2 disabled:opacity-50"><HiOutlineArrowRightOnRectangle />{loading ? (ar ? 'جارٍ التنفيذ...' : 'Please wait...') : mode === 'login' ? (ar ? 'دخول' : 'Sign in') : (ar ? 'إنشاء الحساب' : 'Create account')}</button>
              {mode === 'login' && <button type="button" onClick={handleReset} className="w-full text-sm text-teal-700 font-semibold py-2">{ar ? 'نسيت كلمة المرور؟' : 'Forgot password?'}</button>}
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
