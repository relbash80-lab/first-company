const STATUS_STYLES = {
  purchased: 'border-amber-200 bg-amber-50 text-amber-800',
  purchasePaid: 'border-sky-200 bg-sky-50 text-sky-800',
  atPort: 'border-violet-200 bg-violet-50 text-violet-800',
  loaded: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  inTransit: 'border-orange-200 bg-orange-50 text-orange-800',
  arrived: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  released: 'border-slate-200 bg-slate-50 text-slate-700',
};

export default function StatusBadge({ status, label, dot = true }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${STATUS_STYLES[status] || STATUS_STYLES.released}`}>
    {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
    {label}
  </span>;
}
