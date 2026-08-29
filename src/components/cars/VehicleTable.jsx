import { HiOutlineEye, HiOutlineExternalLink, HiOutlinePencil, HiOutlineStar, HiOutlineTrash, HiStar } from 'react-icons/hi';
import StatusBadge from '../ui/StatusBadge';
import { calcPurchaseRemaining, calcShippingRemaining } from '../../services/carService';

const AUCTION_LINKS = { copart: 'https://www.copart.com/', iaai: 'https://www.iaai.com/' };
const money = (value) => `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

export default function VehicleTable({ cars, labels, statusLabels, watchlist, selectedIds, onToggleWatch, onToggleSelected, onTogglePage, onView, onEdit, onDelete }) {
  const allSelected = cars.length > 0 && cars.every((car) => selectedIds.has(car.id));
  return <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
    <table className="w-full min-w-[1180px]">
      <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <tr>
          <th className="w-12 px-4 py-3 text-center"><input type="checkbox" className="h-4 w-4 accent-teal-600" checked={allSelected} onChange={() => onTogglePage(cars)} aria-label={labels.selectPage} /></th>
          <th className="px-3 py-3 text-start">{labels.vehicle}</th>
          <th className="px-3 py-3 text-start">VIN / {labels.lot}</th>
          <th className="px-3 py-3 text-start">{labels.sourceLocation}</th>
          <th className="px-3 py-3 text-start">{labels.owner}</th>
          <th className="px-3 py-3 text-start">{labels.container}</th>
          <th className="px-3 py-3 text-start">{labels.status}</th>
          <th className="px-3 py-3 text-start">{labels.openBalance}</th>
          <th className="px-3 py-3 text-center">{labels.actions}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {cars.map((car) => {
          const balance = calcPurchaseRemaining(car) + calcShippingRemaining(car);
          const watched = watchlist.has(car.id);
          const auctionLink = AUCTION_LINKS[String(car.auction || '').toLowerCase()];
          return <tr key={car.id} className={`${selectedIds.has(car.id) ? 'bg-teal-50/60' : 'hover:bg-slate-50/80'} transition`}>
            <td className="px-4 py-3 text-center"><input type="checkbox" className="h-4 w-4 accent-teal-600" checked={selectedIds.has(car.id)} onChange={() => onToggleSelected(car.id)} aria-label={labels.selectVehicle} /></td>
            <td className="px-3 py-3"><button type="button" onClick={() => onView(car)} className="max-w-52 text-start text-sm font-black text-slate-800 hover:text-teal-700">{car.yearMakeModel || labels.incompleteVehicle}</button><p className="mt-1 text-[10px] text-slate-400">{car.createdAt ? new Date(car.createdAt).toLocaleDateString() : '—'}</p></td>
            <td className="px-3 py-3"><p className="font-mono text-xs text-slate-700" dir="ltr">{car.vin || '—'}</p><p className="mt-1 font-mono text-[10px] text-slate-400" dir="ltr">{car.lotStock || '—'}</p></td>
            <td className="px-3 py-3"><div className="flex items-center gap-1.5"><span className="text-xs font-bold text-slate-700">{car.auction || labels.other}</span>{auctionLink && <a href={auctionLink} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-teal-600" title={labels.openSource}><HiOutlineExternalLink className="h-4 w-4" /></a>}</div><p className="mt-1 max-w-44 truncate text-[10px] text-slate-400">{car.buyingLocation || '—'}</p></td>
            <td className="px-3 py-3 text-xs font-bold text-slate-600">{car.owner || '—'}</td>
            <td className="px-3 py-3 font-mono text-xs text-slate-600" dir="ltr">{car.containerNumber || '—'}</td>
            <td className="px-3 py-3"><StatusBadge status={car.status} label={statusLabels[car.status]} /></td>
            <td className={`px-3 py-3 font-mono text-xs font-black ${balance > 0 ? 'text-rose-700' : 'text-emerald-700'}`} dir="ltr">{money(balance)}</td>
            <td className="px-3 py-3"><div className="flex items-center justify-center gap-1">
              <button type="button" onClick={() => onToggleWatch(car)} className={`grid h-8 w-8 place-items-center rounded-lg ${watched ? 'bg-amber-50 text-amber-500' : 'text-slate-400 hover:bg-amber-50 hover:text-amber-500'}`} title={watched ? labels.removeWatch : labels.addWatch}>{watched ? <HiStar className="h-4 w-4" /> : <HiOutlineStar className="h-4 w-4" />}</button>
              <button type="button" onClick={() => onView(car)} className="grid h-8 w-8 place-items-center rounded-lg text-teal-600 hover:bg-teal-50" title={labels.details}><HiOutlineEye className="h-4 w-4" /></button>
              <button type="button" onClick={() => onEdit(car)} className="grid h-8 w-8 place-items-center rounded-lg text-sky-600 hover:bg-sky-50" title={labels.edit}><HiOutlinePencil className="h-4 w-4" /></button>
              <button type="button" onClick={() => onDelete(car)} className="grid h-8 w-8 place-items-center rounded-lg text-rose-600 hover:bg-rose-50" title={labels.delete}><HiOutlineTrash className="h-4 w-4" /></button>
            </div></td>
          </tr>;
        })}
      </tbody>
    </table>
  </div>;
}
