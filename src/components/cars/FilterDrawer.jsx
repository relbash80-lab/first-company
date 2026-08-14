import { HiOutlineBookmark, HiOutlineFilter, HiOutlineTrash, HiOutlineX } from 'react-icons/hi';

const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100';

export default function FilterDrawer({ open, labels, filters, options, savedSearches, saveName, onSaveName, onChange, onReset, onApplySaved, onDeleteSaved, onSaveSearch, onClose }) {
  if (!open) return null;
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
      <div><h2 className="flex items-center gap-2 font-black text-slate-900"><HiOutlineFilter className="h-5 w-5 text-teal-600" />{labels.advancedFilters}</h2><p className="mt-1 text-xs text-slate-500">{labels.filtersHint}</p></div>
      <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100" aria-label={labels.close}><HiOutlineX className="h-5 w-5" /></button>
    </div>

    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <label className="text-xs font-bold text-slate-600">{labels.auction}<select className={`${fieldClass} mt-1.5`} value={filters.auction} onChange={(e) => onChange('auction', e.target.value)}><option value="all">{labels.all}</option>{options.auctions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label className="text-xs font-bold text-slate-600">{labels.port}<select className={`${fieldClass} mt-1.5`} value={filters.port} onChange={(e) => onChange('port', e.target.value)}><option value="all">{labels.all}</option>{options.ports.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label className="text-xs font-bold text-slate-600">{labels.owner}<select className={`${fieldClass} mt-1.5`} value={filters.owner} onChange={(e) => onChange('owner', e.target.value)}><option value="all">{labels.all}</option>{options.owners.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label className="text-xs font-bold text-slate-600">{labels.container}<select className={`${fieldClass} mt-1.5`} value={filters.container} onChange={(e) => onChange('container', e.target.value)}><option value="all">{labels.all}</option><option value="assigned">{labels.assigned}</option><option value="unassigned">{labels.unassigned}</option></select></label>
      <label className="text-xs font-bold text-slate-600">{labels.balance}<select className={`${fieldClass} mt-1.5`} value={filters.balance} onChange={(e) => onChange('balance', e.target.value)}><option value="all">{labels.all}</option><option value="purchase">{labels.purchaseBalance}</option><option value="shipping">{labels.shippingBalance}</option><option value="any">{labels.anyBalance}</option><option value="clear">{labels.clearBalance}</option></select></label>
      <label className="text-xs font-bold text-slate-600">{labels.fromDate}<input type="date" className={`${fieldClass} mt-1.5`} value={filters.fromDate} onChange={(e) => onChange('fromDate', e.target.value)} /></label>
      <label className="text-xs font-bold text-slate-600">{labels.toDate}<input type="date" className={`${fieldClass} mt-1.5`} value={filters.toDate} onChange={(e) => onChange('toDate', e.target.value)} /></label>
      <label className="text-xs font-bold text-slate-600">{labels.sort}<select className={`${fieldClass} mt-1.5`} value={filters.sort} onChange={(e) => onChange('sort', e.target.value)}><option value="newest">{labels.newest}</option><option value="oldest">{labels.oldest}</option><option value="model">{labels.byModel}</option><option value="balance">{labels.highestBalance}</option></select></label>
    </div>

    <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-wrap gap-2">
        {savedSearches.length === 0 ? <span className="text-xs text-slate-400">{labels.noSavedSearches}</span> : savedSearches.map((search) => <div key={search.id} className="inline-flex items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50"><button type="button" onClick={() => onApplySaved(search)} className="px-3 py-2 text-xs font-bold text-slate-700 hover:bg-white"><HiOutlineBookmark className="me-1 inline h-4 w-4 text-teal-600" />{search.name}</button><button type="button" onClick={() => onDeleteSaved(search)} className="grid h-8 w-8 place-items-center border-s border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title={labels.deleteSaved}><HiOutlineTrash className="h-4 w-4" /></button></div>)}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input className={`${fieldClass} sm:w-52`} value={saveName} onChange={(e) => onSaveName(e.target.value)} placeholder={labels.searchName} maxLength={80} />
        <button type="button" onClick={onSaveSearch} disabled={saveName.trim().length < 2} className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">{labels.saveSearch}</button>
        <button type="button" onClick={onReset} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-50">{labels.reset}</button>
      </div>
    </div>
  </section>;
}
