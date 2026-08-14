import {
  HiOutlineCube,
  HiOutlineEye,
  HiOutlineExternalLink,
  HiOutlineLocationMarker,
  HiOutlinePencil,
  HiOutlineStar,
  HiOutlineTrash,
  HiStar,
  HiOutlineTruck,
} from 'react-icons/hi';
import StatusBadge from '../ui/StatusBadge';
import { calcPurchaseRemaining, calcShippingRemaining } from '../../services/carService';

const AUCTION_LINKS = {
  copart: 'https://www.copart.com/',
  iaai: 'https://www.iaai.com/',
};

const money = (value) => `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

export default function VehicleCard({
  car,
  labels,
  statusLabel,
  watched,
  selected,
  onToggleWatch,
  onToggleSelected,
  onView,
  onEdit,
  onDelete,
}) {
  const balance = calcPurchaseRemaining(car) + calcShippingRemaining(car);
  const auctionLink = AUCTION_LINKS[String(car.auction || '').toLowerCase()];

  return <article className={`group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${selected ? 'border-teal-400 ring-2 ring-teal-100' : 'border-slate-200'}`}>
    <div className="relative h-36 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 0 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
      <div className="absolute inset-0 grid place-items-center text-white/70"><HiOutlineTruck className="h-16 w-16" /></div>
      <label className="absolute start-3 top-3 grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-white/20 bg-slate-950/55 text-white backdrop-blur">
        <input type="checkbox" className="h-4 w-4 accent-teal-500" checked={selected} onChange={() => onToggleSelected(car.id)} aria-label={labels.selectVehicle} />
      </label>
      <button type="button" onClick={() => onToggleWatch(car)} className="absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-xl border border-white/20 bg-slate-950/55 text-amber-300 backdrop-blur hover:bg-slate-950/75" aria-label={watched ? labels.removeWatch : labels.addWatch} title={watched ? labels.removeWatch : labels.addWatch}>
        {watched ? <HiStar className="h-5 w-5" /> : <HiOutlineStar className="h-5 w-5" />}
      </button>
      <div className="absolute bottom-3 start-3 flex items-center gap-2">
        <span className="rounded-lg bg-white/95 px-2.5 py-1 text-xs font-black text-slate-900">{car.auction || labels.other}</span>
        {auctionLink && <a href={auctionLink} target="_blank" rel="noopener noreferrer" className="grid h-7 w-7 place-items-center rounded-lg bg-white/15 text-white hover:bg-white/25" title={labels.openSource}><HiOutlineExternalLink className="h-4 w-4" /></a>}
      </div>
    </div>

    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-slate-900" title={car.yearMakeModel}>{car.yearMakeModel}</h3>
          <p className="mt-1 truncate font-mono text-[11px] text-slate-500" dir="ltr">{car.vin}</p>
        </div>
        <StatusBadge status={car.status} label={statusLabel} dot={false} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-slate-50 p-2.5"><p className="text-[10px] text-slate-400">{labels.lot}</p><p className="mt-1 truncate font-mono font-bold text-slate-700" dir="ltr">{car.lotStock || '—'}</p></div>
        <div className="rounded-xl bg-slate-50 p-2.5"><p className="text-[10px] text-slate-400">{labels.owner}</p><p className="mt-1 truncate font-bold text-slate-700">{car.owner || '—'}</p></div>
      </div>

      <div className="mt-3 space-y-2 text-xs text-slate-500">
        <p className="flex items-center gap-2"><HiOutlineLocationMarker className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{car.buyingLocation || labels.noLocation}</span></p>
        <p className="flex items-center gap-2"><HiOutlineCube className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate font-mono" dir="ltr">{car.containerNumber || labels.notAssigned}</span></p>
      </div>

      <div className={`mt-4 flex items-center justify-between rounded-xl px-3 py-2.5 ${balance > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
        <span className="text-[11px] font-bold">{labels.openBalance}</span>
        <strong className="font-mono text-sm" dir="ltr">{money(balance)}</strong>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
        <button type="button" onClick={() => onView(car)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-3 py-2.5 text-xs font-black text-white hover:bg-teal-700"><HiOutlineEye className="h-4 w-4" />{labels.details}</button>
        <button type="button" onClick={() => onEdit(car)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700" title={labels.edit}><HiOutlinePencil className="h-4 w-4" /></button>
        <button type="button" onClick={() => onDelete(car)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700" title={labels.delete}><HiOutlineTrash className="h-4 w-4" /></button>
      </div>
    </div>
  </article>;
}
