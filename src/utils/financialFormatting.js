export function formatMoney(value, currency = 'USD', lang = 'ar') {
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-LY' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export function formatDocumentDate(value, lang = 'ar') {
  if (!value) return '—';
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-LY' : 'en-GB', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(`${value}T12:00:00`));
}

const arabicOnes = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
const arabicTeens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
const arabicTens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const arabicHundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

function underThousand(value) {
  const parts = [];
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  if (hundreds) parts.push(arabicHundreds[hundreds]);
  if (rest) {
    if (rest < 10) parts.push(arabicOnes[rest]);
    else if (rest < 20) parts.push(arabicTeens[rest - 10]);
    else {
      const one = rest % 10;
      const ten = Math.floor(rest / 10);
      parts.push(one ? `${arabicOnes[one]} و${arabicTens[ten]}` : arabicTens[ten]);
    }
  }
  return parts.join(' و');
}

function scaleWords(value, singular, dual, plural) {
  if (value === 1) return singular;
  if (value === 2) return dual;
  if (value >= 3 && value <= 10) return `${underThousand(value)} ${plural}`;
  return `${underThousand(value)} ${singular}`;
}

export function amountInArabicWords(value, currency) {
  const safe = Math.max(0, Math.round((Number(value) || 0) * 100));
  const whole = Math.floor(safe / 100);
  const fraction = safe % 100;
  const parts = [];
  const millions = Math.floor(whole / 1_000_000);
  const thousands = Math.floor((whole % 1_000_000) / 1_000);
  const remainder = whole % 1_000;
  if (millions) parts.push(scaleWords(millions, 'مليون', 'مليونان', 'ملايين'));
  if (thousands) parts.push(scaleWords(thousands, 'ألف', 'ألفان', 'آلاف'));
  if (remainder || parts.length === 0) parts.push(underThousand(remainder) || 'صفر');
  const unit = currency === 'LYD' ? 'دينار ليبي' : 'دولار أمريكي';
  const fractionUnit = currency === 'LYD' ? 'درهم' : 'سنت';
  return `فقط ${parts.join(' و')} ${unit}${fraction ? ` و${underThousand(fraction)} ${fractionUnit}` : ''} لا غير`;
}
