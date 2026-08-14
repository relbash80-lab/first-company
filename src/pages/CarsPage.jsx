import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  HiOutlineAdjustments,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineStar,
  HiOutlineViewGrid,
  HiOutlineViewList,
  HiOutlineX,
  HiStar,
} from 'react-icons/hi';
import { useLanguage } from '../context/LanguageContext';
import { useOrganization } from '../context/OrganizationContext';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToCars,
  addCar,
  updateCar,
  deleteCar,
  calcPurchaseRemaining,
  calcShippingRemaining,
} from '../services/carService';
import {
  deleteVehicleSearch,
  loadVehicleCenterPreferences,
  saveVehicleSearch,
  setVehicleWatchlisted,
} from '../services/vehicleCenterService';
import CarFormModal from '../components/cars/CarFormModal';
import CarDetailModal from '../components/cars/CarDetailModal';
import VehicleCard from '../components/cars/VehicleCard';
import VehicleTable from '../components/cars/VehicleTable';
import FilterDrawer from '../components/cars/FilterDrawer';
import EmptyState from '../components/ui/EmptyState';

const DEFAULT_FILTERS = {
  status: 'all',
  auction: 'all',
  port: 'all',
  owner: 'all',
  container: 'all',
  balance: 'all',
  fromDate: '',
  toDate: '',
  sort: 'newest',
};

const PAGE_SIZES = [6, 12, 24];

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export default function CarsPage() {
  const { t, lang } = useLanguage();
  const { organizationId } = useOrganization();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [filters, setFilters] = useState(() => ({
    ...DEFAULT_FILTERS,
    status: searchParams.get('status') || 'all',
    balance: searchParams.get('balance') || (searchParams.get('attention') === '1' ? 'any' : 'all'),
  }));
  const [watchlistOnly, setWatchlistOnly] = useState(searchParams.get('watch') === '1');
  const [watchlist, setWatchlist] = useState(new Set());
  const [savedSearches, setSavedSearches] = useState([]);
  const [saveName, setSaveName] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('first-company:vehicle-view') || 'table');
  const [pageSize, setPageSize] = useState(12);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingCar, setEditingCar] = useState(null);
  const [viewingCar, setViewingCar] = useState(null);

  const labels = lang === 'ar' ? {
    eyebrow: 'مركز سياراتي', title: 'مركز السيارات', subtitle: 'ابحث وراقب واتخذ الإجراء من سجل تشغيلي واحد مألوف لمستخدمي المزادات.',
    addVehicle: 'إضافة سيارة', searchPlaceholder: 'VIN أو اللوت أو السيارة أو المالك أو الحاوية...', filters: 'الفلاتر', advancedFilters: 'فلاتر متقدمة', filtersHint: 'ضيّق النتائج واحفظ تركيبة البحث لاستخدامها لاحقًا.',
    allVehicles: 'كل السيارات', watchlist: 'قائمة المتابعة', needsAction: 'تحتاج إجراء', recentlyArrived: 'وصلت حديثًا', results: 'نتيجة', cards: 'بطاقات', table: 'جدول',
    vehicle: 'السيارة', lot: 'اللوت', owner: 'المالك', sourceLocation: 'المصدر / الموقع', container: 'الحاوية', status: 'الحالة', openBalance: 'الرصيد المفتوح', actions: 'الإجراءات',
    details: 'التفاصيل', edit: 'تعديل', delete: 'حذف', addWatch: 'إضافة للمتابعة', removeWatch: 'إزالة من المتابعة', selectVehicle: 'تحديد السيارة', selectPage: 'تحديد الصفحة',
    auction: 'جهة المزاد', port: 'ميناء الشحن', balance: 'الرصيد', assigned: 'مرتبطة بحاوية', unassigned: 'دون حاوية', purchaseBalance: 'رصيد شراء', shippingBalance: 'رصيد شحن', anyBalance: 'أي رصيد مفتوح', clearBalance: 'مسددة بالكامل',
    fromDate: 'من تاريخ الشراء', toDate: 'إلى تاريخ الشراء', sort: 'الفرز', newest: 'الأحدث إضافة', oldest: 'الأقدم إضافة', byModel: 'اسم السيارة', highestBalance: 'أعلى رصيد', all: 'الكل',
    saveSearch: 'حفظ البحث', searchName: 'اسم البحث المحفوظ', noSavedSearches: 'لا توجد بحوث محفوظة بعد.', deleteSaved: 'حذف البحث المحفوظ', saved: 'تم حفظ البحث', savedDeleted: 'تم حذف البحث المحفوظ', reset: 'إعادة الضبط', close: 'إغلاق',
    noResults: 'لا توجد سيارات تطابق البحث', noResultsHint: 'جرّب إزالة بعض الفلاتر أو البحث برقم VIN أو اللوت.', showing: 'عرض', of: 'من', perPage: 'في الصفحة', selected: 'محدد', clearSelection: 'إلغاء التحديد',
    openSource: 'فتح موقع المصدر', other: 'أخرى', noLocation: 'لا يوجد موقع', notAssigned: 'غير مرتبطة بحاوية', preferencesUnavailable: 'تحتاج ميزات المتابعة إلى تطبيق ترحيل UI-2 في Supabase.',
  } : {
    eyebrow: 'My vehicle center', title: 'Vehicle center', subtitle: 'Search, monitor and act from one auction-familiar operational record.',
    addVehicle: 'Add vehicle', searchPlaceholder: 'VIN, lot, vehicle, owner or container...', filters: 'Filters', advancedFilters: 'Advanced filters', filtersHint: 'Narrow the results and save the filter combination for later.',
    allVehicles: 'All vehicles', watchlist: 'Watchlist', needsAction: 'Needs action', recentlyArrived: 'Recently arrived', results: 'results', cards: 'Cards', table: 'Table',
    vehicle: 'Vehicle', lot: 'Lot', owner: 'Owner', sourceLocation: 'Source / location', container: 'Container', status: 'Status', openBalance: 'Open balance', actions: 'Actions',
    details: 'Details', edit: 'Edit', delete: 'Delete', addWatch: 'Add to watchlist', removeWatch: 'Remove from watchlist', selectVehicle: 'Select vehicle', selectPage: 'Select page',
    auction: 'Auction source', port: 'Shipping port', balance: 'Balance', assigned: 'Assigned to container', unassigned: 'Without container', purchaseBalance: 'Purchase balance', shippingBalance: 'Shipping balance', anyBalance: 'Any open balance', clearBalance: 'Fully settled',
    fromDate: 'Purchase date from', toDate: 'Purchase date to', sort: 'Sort', newest: 'Newest added', oldest: 'Oldest added', byModel: 'Vehicle name', highestBalance: 'Highest balance', all: 'All',
    saveSearch: 'Save search', searchName: 'Saved search name', noSavedSearches: 'No saved searches yet.', deleteSaved: 'Delete saved search', saved: 'Search saved', savedDeleted: 'Saved search deleted', reset: 'Reset', close: 'Close',
    noResults: 'No vehicles match this search', noResultsHint: 'Remove some filters or search by VIN or lot number.', showing: 'Showing', of: 'of', perPage: 'per page', selected: 'selected', clearSelection: 'Clear selection',
    openSource: 'Open source website', other: 'Other', noLocation: 'No location', notAssigned: 'Not assigned to a container', preferencesUnavailable: 'Watchlist features require the UI-2 Supabase migration.',
  };

  const statusLabels = useMemo(() => ({
    purchased: t.purchased,
    purchasePaid: t.purchasePaid,
    atPort: t.atPort,
    loaded: t.loaded,
    inTransit: t.inTransit,
    arrived: t.arrived,
  }), [t]);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToCars(organizationId, (nextCars) => { setCars(nextCars); setLoading(false); }, (error) => { toast.error(error.message); setLoading(false); });
    return unsub;
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId || !user?.id) return;
    loadVehicleCenterPreferences(organizationId, user.id)
      .then(({ watchlist: nextWatchlist, savedSearches: nextSearches }) => { setWatchlist(nextWatchlist); setSavedSearches(nextSearches); })
      .catch((error) => {
        console.warn('Vehicle center preferences unavailable', error);
        if (error.code === '42P01' || error.message?.includes('vehicle_watchlist')) toast(labels.preferencesUnavailable, { icon: 'ℹ️' });
      });
  }, [organizationId, user?.id]);

  useEffect(() => {
    setSearchTerm(searchParams.get('q') || '');
    setFilters((current) => ({
      ...current,
      status: searchParams.get('status') || 'all',
      balance: searchParams.get('balance') || (searchParams.get('attention') === '1' ? 'any' : current.balance),
    }));
    setWatchlistOnly(searchParams.get('watch') === '1');
    if (searchParams.get('new') === '1') { setEditingCar(null); setShowForm(true); }
  }, [searchParams]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (searchTerm) next.set('q', searchTerm); else next.delete('q');
    if (filters.status !== 'all') next.set('status', filters.status); else next.delete('status');
    if (filters.balance !== 'all') next.set('balance', filters.balance); else next.delete('balance');
    if (watchlistOnly) next.set('watch', '1'); else next.delete('watch');
    next.delete('attention');
    next.delete('new');
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
  }, [filters.balance, filters.status, searchParams, searchTerm, setSearchParams, watchlistOnly]);

  useEffect(() => { setPage(1); }, [searchTerm, filters, watchlistOnly, pageSize]);
  useEffect(() => { localStorage.setItem('first-company:vehicle-view', viewMode); }, [viewMode]);

  const options = useMemo(() => ({
    auctions: unique(cars.map((car) => car.auction)),
    ports: unique(cars.map((car) => car.shippingPort)),
    owners: unique(cars.map((car) => car.owner)),
  }), [cars]);

  const statusCounts = useMemo(() => cars.reduce((counts, car) => ({ ...counts, [car.status]: (counts[car.status] || 0) + 1 }), {}), [cars]);
  const needsActionCount = useMemo(() => cars.filter((car) => calcPurchaseRemaining(car) > 0 || calcShippingRemaining(car) > 0).length, [cars]);
  const arrivedCount = statusCounts.arrived || 0;

  const filteredCars = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const result = cars.filter((car) => {
      const searchable = [car.yearMakeModel, car.vin, car.owner, car.lotStock, car.containerNumber, car.buyingLocation, car.auction].filter(Boolean).join(' ').toLowerCase();
      const purchaseRemaining = calcPurchaseRemaining(car);
      const shippingRemaining = calcShippingRemaining(car);
      const matchBalance = filters.balance === 'all'
        || (filters.balance === 'purchase' && purchaseRemaining > 0)
        || (filters.balance === 'shipping' && shippingRemaining > 0)
        || (filters.balance === 'any' && (purchaseRemaining > 0 || shippingRemaining > 0))
        || (filters.balance === 'clear' && purchaseRemaining <= 0 && shippingRemaining <= 0);
      const buyingDate = car.buyingDate || '';
      return (!term || searchable.includes(term))
        && (filters.status === 'all' || car.status === filters.status)
        && (filters.auction === 'all' || car.auction === filters.auction)
        && (filters.port === 'all' || car.shippingPort === filters.port)
        && (filters.owner === 'all' || car.owner === filters.owner)
        && (filters.container === 'all' || (filters.container === 'assigned' ? Boolean(car.containerNumber) : !car.containerNumber))
        && matchBalance
        && (!filters.fromDate || buyingDate >= filters.fromDate)
        && (!filters.toDate || buyingDate <= filters.toDate)
        && (!watchlistOnly || watchlist.has(car.id));
    });
    return result.sort((a, b) => {
      if (filters.sort === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      if (filters.sort === 'model') return String(a.yearMakeModel || '').localeCompare(String(b.yearMakeModel || ''));
      if (filters.sort === 'balance') return (calcPurchaseRemaining(b) + calcShippingRemaining(b)) - (calcPurchaseRemaining(a) + calcShippingRemaining(a));
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [cars, filters, searchTerm, watchlist, watchlistOnly]);

  const pageCount = Math.max(1, Math.ceil(filteredCars.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageCars = filteredCars.slice((safePage - 1) * pageSize, safePage * pageSize);
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => value !== DEFAULT_FILTERS[key]).length + (watchlistOnly ? 1 : 0);

  const handleFilterChange = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const resetFilters = () => { setFilters(DEFAULT_FILTERS); setWatchlistOnly(false); setSearchTerm(''); };

  const handleSave = async (data, isEdit) => {
    try {
      if (isEdit) { await updateCar(organizationId, editingCar.id, data); toast.success(t.carUpdated); }
      else { await addCar(organizationId, data); toast.success(t.carAdded); }
      setShowForm(false); setEditingCar(null);
    } catch (error) {
      if (error.message === 'VIN_EXISTS') toast.error(t.vinExists);
      else if (['trial_expired', 'subscription_expired', 'past_due', 'suspended', 'canceled', 'vehicle_limit_reached', 'subscription_missing', 'organization_inactive', 'subscription_blocked'].includes(error.message)) toast.error(t.subscriptionBlocked);
      else toast.error(error.message);
    }
  };

  const handleDelete = async (car) => {
    if (!window.confirm(t.confirmDelete)) return;
    try { await deleteCar(organizationId, car.id); toast.success(t.carDeleted); }
    catch (error) { toast.error(error.message); }
  };

  const handleToggleWatch = async (car) => {
    const nextWatched = !watchlist.has(car.id);
    setWatchlist((current) => { const next = new Set(current); if (nextWatched) next.add(car.id); else next.delete(car.id); return next; });
    try { await setVehicleWatchlisted(organizationId, user.id, car.id, nextWatched); }
    catch (error) {
      setWatchlist((current) => { const next = new Set(current); if (nextWatched) next.delete(car.id); else next.add(car.id); return next; });
      toast.error(error.message);
    }
  };

  const handleSaveSearch = async () => {
    try {
      const record = await saveVehicleSearch(organizationId, user.id, saveName, { ...filters, searchTerm, watchlistOnly });
      setSavedSearches((current) => [record, ...current.filter((item) => item.id !== record.id && item.name !== record.name)]);
      setSaveName(''); toast.success(labels.saved);
    } catch (error) { toast.error(error.message); }
  };

  const handleDeleteSaved = async (search) => {
    try { await deleteVehicleSearch(organizationId, user.id, search.id); setSavedSearches((current) => current.filter((item) => item.id !== search.id)); toast.success(labels.savedDeleted); }
    catch (error) { toast.error(error.message); }
  };

  const applySavedSearch = (search) => {
    const { searchTerm: savedTerm = '', watchlistOnly: savedWatchlist = false, ...savedFilters } = search.filters || {};
    setFilters({ ...DEFAULT_FILTERS, ...savedFilters });
    setSearchTerm(savedTerm);
    setWatchlistOnly(Boolean(savedWatchlist));
  };

  const toggleSelected = (id) => setSelectedIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const togglePage = (items) => setSelectedIds((current) => {
    const next = new Set(current);
    const allSelected = items.length > 0 && items.every((car) => next.has(car.id));
    items.forEach((car) => { if (allSelected) next.delete(car.id); else next.add(car.id); });
    return next;
  });

  return <div className="space-y-5">
    <section className="relative overflow-hidden rounded-3xl bg-slate-900 px-5 py-6 text-white shadow-xl md:px-7">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 10% 20%, #2dd4bf 0 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-300">{labels.eyebrow}</p><h1 className="mt-2 text-2xl font-black md:text-3xl">{labels.title}</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">{labels.subtitle}</p></div>
        <button type="button" onClick={() => { setEditingCar(null); setShowForm(true); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-teal-950/30 hover:bg-teal-400"><HiOutlinePlus className="h-5 w-5" />{labels.addVehicle}</button>
      </div>
    </section>

    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[
        { label: labels.allVehicles, count: cars.length, active: !watchlistOnly && filters.status === 'all' && filters.balance === 'all', action: resetFilters },
        { label: labels.watchlist, count: watchlist.size, active: watchlistOnly, action: () => setWatchlistOnly((value) => !value), watch: true },
        { label: labels.needsAction, count: needsActionCount, active: filters.balance === 'any', action: () => handleFilterChange('balance', filters.balance === 'any' ? 'all' : 'any') },
        { label: labels.recentlyArrived, count: arrivedCount, active: filters.status === 'arrived', action: () => handleFilterChange('status', filters.status === 'arrived' ? 'all' : 'arrived') },
      ].map((item) => <button type="button" key={item.label} onClick={item.action} className={`flex items-center justify-between rounded-2xl border p-4 text-start shadow-sm transition ${item.active ? 'border-teal-300 bg-teal-50 text-teal-900' : 'border-slate-200 bg-white text-slate-700 hover:border-teal-200'}`}><div><p className="text-xs font-bold text-slate-500">{item.label}</p><strong className="mt-2 block text-2xl text-slate-900">{item.count}</strong></div>{item.watch ? (item.active ? <HiStar className="h-7 w-7 text-amber-400" /> : <HiOutlineStar className="h-7 w-7 text-slate-300" />) : <span className={`h-10 w-1.5 rounded-full ${item.active ? 'bg-teal-500' : 'bg-slate-200'}`} />}</button>)}
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative flex-1"><HiOutlineSearch className="absolute start-3 top-3 h-5 w-5 text-slate-400" /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={labels.searchPlaceholder} className="w-full rounded-xl border border-slate-200 py-2.5 pe-10 ps-10 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100" />{searchTerm && <button type="button" onClick={() => setSearchTerm('')} className="absolute end-3 top-3 text-slate-400 hover:text-slate-700"><HiOutlineX className="h-5 w-5" /></button>}</div>
        <select value={filters.status} onChange={(event) => handleFilterChange('status', event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-teal-400"><option value="all">{labels.all} — {t.status}</option>{Object.entries(statusLabels).map(([key, value]) => <option key={key} value={key}>{value} ({statusCounts[key] || 0})</option>)}</select>
        <button type="button" onClick={() => setShowFilters((value) => !value)} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-black ${showFilters || activeFilterCount ? 'border-teal-300 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}><HiOutlineAdjustments className="h-5 w-5" />{labels.filters}{activeFilterCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-teal-600 px-1 text-[10px] text-white">{activeFilterCount}</span>}</button>
        <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1"><button type="button" onClick={() => setViewMode('cards')} className={`grid h-9 w-10 place-items-center rounded-lg ${viewMode === 'cards' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-400'}`} title={labels.cards}><HiOutlineViewGrid className="h-5 w-5" /></button><button type="button" onClick={() => setViewMode('table')} className={`grid h-9 w-10 place-items-center rounded-lg ${viewMode === 'table' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-400'}`} title={labels.table}><HiOutlineViewList className="h-5 w-5" /></button></div>
      </div>
    </section>

    <FilterDrawer open={showFilters} labels={labels} filters={filters} options={options} savedSearches={savedSearches} saveName={saveName} onSaveName={setSaveName} onChange={handleFilterChange} onReset={resetFilters} onApplySaved={applySavedSearch} onDeleteSaved={handleDeleteSaved} onSaveSearch={handleSaveSearch} onClose={() => setShowFilters(false)} />

    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3"><p className="text-sm font-black text-slate-800">{filteredCars.length} {labels.results}</p>{selectedIds.size > 0 && <div className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white"><span>{selectedIds.size} {labels.selected}</span><button type="button" onClick={() => setSelectedIds(new Set())} className="text-teal-300 hover:text-white">{labels.clearSelection}</button></div>}</div>
      <label className="flex items-center gap-2 text-xs text-slate-500"><span>{labels.perPage}</span><select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700">{PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
    </div>

    {loading ? <div className={`grid gap-4 ${viewMode === 'cards' ? 'md:grid-cols-2 xl:grid-cols-3' : ''}`}>{[1,2,3,4,5,6].map((item) => <div key={item} className="h-52 animate-pulse rounded-2xl border border-slate-200 bg-white" />)}</div> : pageCars.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white"><EmptyState title={labels.noResults} description={labels.noResultsHint} action={<button type="button" onClick={resetFilters} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white">{labels.reset}</button>} /></div> : viewMode === 'cards' ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{pageCars.map((car) => <VehicleCard key={car.id} car={car} labels={labels} statusLabel={statusLabels[car.status]} watched={watchlist.has(car.id)} selected={selectedIds.has(car.id)} onToggleWatch={handleToggleWatch} onToggleSelected={toggleSelected} onView={setViewingCar} onEdit={(item) => { setEditingCar(item); setShowForm(true); }} onDelete={handleDelete} />)}</div> : <VehicleTable cars={pageCars} labels={labels} statusLabels={statusLabels} watchlist={watchlist} selectedIds={selectedIds} onToggleWatch={handleToggleWatch} onToggleSelected={toggleSelected} onTogglePage={togglePage} onView={setViewingCar} onEdit={(item) => { setEditingCar(item); setShowForm(true); }} onDelete={handleDelete} />}

    {filteredCars.length > 0 && <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><p>{labels.showing} {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filteredCars.length)} {labels.of} {filteredCars.length}</p><div className="flex items-center gap-2"><button type="button" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"><HiOutlineChevronRight className="h-5 w-5 rtl:hidden" /><HiOutlineChevronLeft className="hidden h-5 w-5 rtl:block" /></button><span className="min-w-20 text-center font-bold text-slate-700" dir="ltr">{safePage} / {pageCount}</span><button type="button" disabled={safePage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"><HiOutlineChevronLeft className="h-5 w-5 rtl:hidden" /><HiOutlineChevronRight className="hidden h-5 w-5 rtl:block" /></button></div></div>}

    {showForm && <CarFormModal car={editingCar} onSave={handleSave} onClose={() => { setShowForm(false); setEditingCar(null); }} />}
    {viewingCar && <CarDetailModal car={viewingCar} onClose={() => setViewingCar(null)} />}
  </div>;
}
