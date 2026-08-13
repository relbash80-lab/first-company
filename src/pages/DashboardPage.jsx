import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  HiOutlineArrowNarrowLeft,
  HiOutlineArrowNarrowRight,
  HiOutlineCash,
  HiOutlineClock,
  HiOutlineCube,
  HiOutlineDocumentText,
  HiOutlineExclamationCircle,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineTruck,
} from 'react-icons/hi';
import { useLanguage } from '../context/LanguageContext';
import { useOrganization } from '../context/OrganizationContext';
import { subscribeToCars, calcPurchaseRemaining, calcShippingRemaining } from '../services/carService';
import MetricCard from '../components/ui/MetricCard';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';

function money(value) {
  return `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function shortDate(value, lang) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-LY' : 'en-US', { day: 'numeric', month: 'short' }).format(new Date(value));
}

export default function DashboardPage() {
  const { t, lang } = useLanguage();
  const { organizationId, organization } = useOrganization();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => subscribeToCars(organizationId, (items) => { setCars(items); setLoading(false); }, (error) => { toast.error(error.message); setLoading(false); }), [organizationId]);

  const labels = useMemo(() => lang === 'ar' ? {
    eyebrow: 'مركز عمليات الاستيراد', welcome: `مرحبًا بك في ${organization?.name || 'مساحة العمل'}`, subtitle: 'راقب السيارات والأرصدة والشحنات التي تحتاج قرارك من شاشة واحدة.', addVehicle: 'إضافة سيارة', newInvoice: 'فاتورة جديدة', refresh: 'تحديث البيانات', operations: 'حالة العمليات', operationsHint: 'توزيع السيارات حسب موقعها في رحلة الاستيراد', attention: 'تحتاج إجراء', attentionHint: 'الأرصدة أو الشحنات المفتوحة ذات الأولوية', recent: 'أحدث السيارات', recentHint: 'آخر السجلات المضافة إلى حساب الشركة', viewAll: 'عرض مركز السيارات', noVehicles: 'لا توجد سيارات بعد', noVehiclesHint: 'أضف أول سيارة لتبدأ متابعة رحلة الاستيراد.', noAttention: 'العمليات تحت السيطرة', noAttentionHint: 'لا توجد سيارات بأرصدة مفتوحة حاليًا.', purchaseBalance: 'متبقي شراء', shippingBalance: 'متبقي شحن', lot: 'اللوت', location: 'الموقع', owner: 'المالك', updated: 'أضيفت', vehicle: 'السيارة', activeInventory: 'المخزون النشط', purchaseDue: 'رصيد المشتريات', shippingDue: 'رصيد الشحن', needsAction: 'تحتاج متابعة', activeHint: 'داخل رحلة الاستيراد', usdHint: 'بالدولار الأمريكي', actionHint: 'رصيد شراء أو شحن مفتوح',
  } : {
    eyebrow: 'Import operations center', welcome: `Welcome to ${organization?.name || 'your workspace'}`, subtitle: 'Monitor vehicles, balances and shipments that need a decision from one screen.', addVehicle: 'Add vehicle', newInvoice: 'New invoice', refresh: 'Refresh data', operations: 'Operations status', operationsHint: 'Vehicles by stage in the import journey', attention: 'Needs action', attentionHint: 'Priority vehicles with open purchase or shipping balances', recent: 'Latest vehicles', recentHint: 'Most recent records added to the company account', viewAll: 'Open vehicle center', noVehicles: 'No vehicles yet', noVehiclesHint: 'Add the first vehicle to start tracking the import journey.', noAttention: 'Operations are under control', noAttentionHint: 'There are no vehicles with open balances right now.', purchaseBalance: 'Purchase balance', shippingBalance: 'Shipping balance', lot: 'Lot', location: 'Location', owner: 'Owner', updated: 'Added', vehicle: 'Vehicle', activeInventory: 'Active inventory', purchaseDue: 'Purchase due', shippingDue: 'Shipping due', needsAction: 'Needs follow-up', activeHint: 'In the import journey', usdHint: 'US dollars', actionHint: 'Open purchase or shipping balance',
  }, [lang, organization?.name]);

  const statusLabels = { purchased: t.purchased, purchasePaid: t.purchasePaid, atPort: t.atPort, loaded: t.loaded, inTransit: t.inTransit, arrived: t.arrived };
  const statusCounts = cars.reduce((acc, car) => ({ ...acc, [car.status || 'purchased']: (acc[car.status || 'purchased'] || 0) + 1 }), {});
  const totalPurchaseRemaining = cars.reduce((sum, car) => sum + Math.max(0, calcPurchaseRemaining(car)), 0);
  const totalShippingRemaining = cars.reduce((sum, car) => sum + Math.max(0, calcShippingRemaining(car)), 0);
  const attentionCars = cars.filter((car) => calcPurchaseRemaining(car) > 0 || calcShippingRemaining(car) > 0).sort((a, b) => (calcPurchaseRemaining(b) + calcShippingRemaining(b)) - (calcPurchaseRemaining(a) + calcShippingRemaining(a)));
  const recentCars = cars.slice(0, 6);
  const Arrow = lang === 'ar' ? HiOutlineArrowNarrowLeft : HiOutlineArrowNarrowRight;

  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-3xl bg-[#10233d] px-5 py-6 text-white shadow-xl shadow-slate-900/10 md:px-7 md:py-7">
      <div className="absolute -end-16 -top-20 h-56 w-56 rounded-full bg-teal-400/15 blur-3xl" /><div className="absolute bottom-0 start-1/3 h-28 w-72 bg-cyan-400/10 blur-3xl" />
      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-300">{labels.eyebrow}</p><h1 className="mt-2 text-2xl font-black md:text-3xl">{labels.welcome}</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">{labels.subtitle}</p></div><div className="flex flex-wrap gap-2"><Link to="/finance" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm font-bold hover:bg-white/15"><HiOutlineDocumentText className="h-5 w-5" />{labels.newInvoice}</Link><Link to="/cars?new=1" className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-teal-950/30 hover:bg-teal-400"><HiOutlinePlus className="h-5 w-5" />{labels.addVehicle}</Link></div></div>
    </section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard icon={HiOutlineTruck} label={labels.activeInventory} value={cars.length} hint={labels.activeHint} to="/cars" tone="teal" />
      <MetricCard icon={HiOutlineCash} label={labels.purchaseDue} value={money(totalPurchaseRemaining)} hint={labels.usdHint} to="/cars?balance=purchase" tone="red" />
      <MetricCard icon={HiOutlineCube} label={labels.shippingDue} value={money(totalShippingRemaining)} hint={labels.usdHint} to="/cars?balance=shipping" tone="orange" />
      <MetricCard icon={HiOutlineExclamationCircle} label={labels.needsAction} value={attentionCars.length} hint={labels.actionHint} to="/cars?attention=1" tone="violet" />
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4"><div><h2 className="font-black text-slate-900">{labels.operations}</h2><p className="mt-1 text-xs text-slate-500">{labels.operationsHint}</p></div><HiOutlineRefresh className="h-5 w-5 text-slate-300" /></div>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {Object.entries(statusLabels).map(([status, label]) => { const count = statusCounts[status] || 0; const percent = cars.length ? Math.round((count / cars.length) * 100) : 0; return <Link to={`/cars?status=${status}`} key={status} className="rounded-xl border border-slate-200 p-3.5 transition hover:border-teal-200 hover:bg-teal-50/30"><div className="flex items-center justify-between"><StatusBadge status={status} label={label} /><strong className="text-lg text-slate-900">{count}</strong></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-500" style={{ width: `${percent}%` }} /></div><p className="mt-2 text-[10px] font-bold text-slate-400" dir="ltr">{percent}%</p></Link>; })}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4"><div><h2 className="font-black text-slate-900">{labels.attention}</h2><p className="mt-1 text-xs text-slate-500">{labels.attentionHint}</p></div><span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-700">{attentionCars.length}</span></div>
        {attentionCars.length === 0 ? <EmptyState title={labels.noAttention} description={labels.noAttentionHint} /> : <div className="max-h-[410px] divide-y divide-slate-100 overflow-y-auto">{attentionCars.slice(0, 6).map((car) => <Link to={`/cars?q=${encodeURIComponent(car.vin)}`} key={car.id} className="group flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500"><HiOutlineTruck className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-800">{car.yearMakeModel}</p><p className="truncate font-mono text-[10px] text-slate-400" dir="ltr">{car.vin}</p></div><div className="text-end"><p className="text-xs font-black text-rose-700" dir="ltr">{money(calcPurchaseRemaining(car) + calcShippingRemaining(car))}</p><p className="mt-0.5 text-[10px] text-slate-400">{labels.needsAction}</p></div><Arrow className="h-4 w-4 text-slate-300 group-hover:text-teal-600" /></Link>)}</div>}
      </div>
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-black text-slate-900">{labels.recent}</h2><p className="mt-1 text-xs text-slate-500">{labels.recentHint}</p></div><Link to="/cars" className="inline-flex items-center gap-2 text-xs font-black text-teal-700 hover:text-teal-800">{labels.viewAll}<Arrow className="h-4 w-4" /></Link></div>
      {loading ? <div className="space-y-3 p-5">{[1,2,3].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}</div> : recentCars.length === 0 ? <EmptyState title={labels.noVehicles} description={labels.noVehiclesHint} action={<Link to="/cars?new=1" className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white">{labels.addVehicle}</Link>} /> : <div className="overflow-x-auto"><table className="w-full min-w-[960px]"><thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3 text-start">{labels.vehicle}</th><th className="px-4 py-3 text-start">VIN / {labels.lot}</th><th className="px-4 py-3 text-start">{t.auction}</th><th className="px-4 py-3 text-start">{labels.location}</th><th className="px-4 py-3 text-start">{labels.owner}</th><th className="px-4 py-3 text-start">{t.status}</th><th className="px-4 py-3 text-start">{labels.updated}</th></tr></thead><tbody className="divide-y divide-slate-100">{recentCars.map((car) => <tr key={car.id} className="group hover:bg-slate-50"><td className="px-5 py-3.5"><Link to={`/cars?q=${encodeURIComponent(car.vin)}`} className="font-black text-slate-800 group-hover:text-teal-700">{car.yearMakeModel}</Link></td><td className="px-4 py-3.5"><p className="font-mono text-xs text-slate-700" dir="ltr">{car.vin}</p><p className="mt-0.5 text-[10px] text-slate-400" dir="ltr">{car.lotStock || '—'}</p></td><td className="px-4 py-3.5 text-sm font-bold text-slate-600">{car.auction}</td><td className="px-4 py-3.5 text-xs text-slate-500">{car.buyingLocation || '—'}</td><td className="px-4 py-3.5 text-xs font-bold text-slate-600">{car.owner}</td><td className="px-4 py-3.5"><StatusBadge status={car.status} label={statusLabels[car.status]} /></td><td className="px-4 py-3.5 text-xs text-slate-500">{shortDate(car.createdAt, lang)}</td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
