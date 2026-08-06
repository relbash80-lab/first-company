import ar from './ar';
import en from './en';

const languages = { ar, en };

export const getTranslation = (lang) => languages[lang] || languages.ar;
export const supportedLanguages = [
  { code: 'ar', name: 'العربية', dir: 'rtl' },
  { code: 'en', name: 'English', dir: 'ltr' },
];
export default languages;
