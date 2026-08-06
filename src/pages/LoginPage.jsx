import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, resetPassword } = useAuth();
  const { t, toggleLanguage, lang } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      toast.error(
        err.code === 'auth/invalid-credential'
          ? lang === 'ar'
            ? 'البريد أو كلمة المرور غير صحيحة'
            : 'Invalid email or password'
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email) {
      toast.error(lang === 'ar' ? 'أدخل بريدك الإلكتروني أولاً' : 'Enter your email first');
      return;
    }
    try {
      await resetPassword(email);
      toast.success(lang === 'ar' ? 'تم إرسال رابط إعادة التعيين' : 'Reset link sent');
    } catch {
      toast.error(lang === 'ar' ? 'حدث خطأ' : 'An error occurred');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-700 via-teal-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Language toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={toggleLanguage}
            className="text-sm text-teal-600 hover:text-teal-800 font-medium"
          >
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>

        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🚗</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{t.loginTitle}</h1>
          <p className="text-gray-500 text-sm">{t.loginSubtitle}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.email}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
              placeholder="email@example.com"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.password}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition"
              placeholder="••••••••"
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 focus:ring-4 focus:ring-teal-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t.loading : t.login}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="w-full text-sm text-teal-600 hover:text-teal-800 py-2"
          >
            {t.forgotPassword}
          </button>
        </form>
      </div>
    </div>
  );
}
