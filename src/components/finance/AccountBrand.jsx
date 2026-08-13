const brandColors = [
  ['#0f766e', '#ccfbf1'],
  ['#1d4ed8', '#dbeafe'],
  ['#7c3aed', '#ede9fe'],
  ['#b45309', '#fef3c7'],
  ['#be123c', '#ffe4e6'],
  ['#047857', '#d1fae5'],
];

function brandIndex(name) {
  return Array.from(name || '').reduce((total, char) => (total + char.codePointAt(0)), 0) % brandColors.length;
}

function initials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'FC';
  if (words.length === 1) {
    const letters = Array.from(words[0]);
    const withoutArabicArticle = letters.length > 4 && letters[0] === 'ا' && letters[1] === 'ل' ? letters.slice(2) : letters;
    return withoutArabicArticle.slice(0, 2).join('');
  }
  return `${Array.from(words[0])[0]}${Array.from(words[1])[0]}`;
}

export default function AccountBrand({ organization, settings, compact = false }) {
  const name = organization?.name?.trim() || settings?.legal_name?.trim() || 'First Company';
  const [foreground, background] = brandColors[brandIndex(name)];
  const logoPath = settings?.logo_storage_path?.trim();
  const logoUrl = logoPath && (/^(https?:|data:|blob:)/i.test(logoPath) || logoPath.startsWith('/')) ? logoPath : null;

  return <div className="flex items-center gap-3">
    {logoUrl ? <img src={logoUrl} alt={name} className={`${compact ? 'w-11 h-11' : 'w-16 h-16'} rounded-2xl object-contain border border-slate-200`} /> : <div
      className={`${compact ? 'w-11 h-11 text-lg' : 'w-16 h-16 text-2xl'} rounded-2xl grid place-items-center font-black shadow-sm border`}
      style={{ color: foreground, backgroundColor: background, borderColor: `${foreground}22` }}
      aria-label={`شعار ${name}`}
    >{initials(name)}</div>}
    <div>
      <h1 className={`${compact ? 'text-lg' : 'text-2xl'} font-black text-slate-900`}>{name}</h1>
      {!compact && <div className="text-xs text-slate-500 space-y-0.5 mt-1">
        {settings?.address && <p>{settings.address}</p>}
        {(settings?.phone || settings?.email) && <p dir="ltr">{[settings.phone, settings.email].filter(Boolean).join(' · ')}</p>}
      </div>}
    </div>
  </div>;
}
