import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  HiOutlineBadgeCheck,
  HiOutlineCash,
  HiOutlineCheck,
  HiOutlineClock,
  HiOutlineCog,
  HiOutlineDocumentText,
  HiOutlineRefresh,
  HiOutlineShieldCheck,
  HiOutlineTruck,
  HiOutlineUsers,
  HiOutlineX,
} from 'react-icons/hi';
import { useLanguage } from '../context/LanguageContext';
import { useOrganization } from '../context/OrganizationContext';
import {
  configurePlanPricing,
  loadSubscriptionCenter,
  requestSubscriptionInvoice,
  reviewSubscriptionPayment,
  submitSubscriptionPayment,
  subscribeToSubscription,
} from '../services/subscriptionService';

const today = () => new Date().toISOString().slice(0, 10);

function money(value, lang) {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-LY' : 'en-US', {
    style: 'currency', currency: 'LYD', minimumFractionDigits: 2,
  }).format(Number(value));
}

function date(value, lang) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-LY' : 'en-GB', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(value));
}

function Modal({ title, onClose, children }) {
  return <div className="fixed inset-0 z-[70] bg-slate-950/55 p-4 grid place-items-center" onMouseDown={onClose}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto" onMouseDown={(event) => event.stopPropagation()}>
      <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10"><h2 className="text-xl font-bold text-slate-800">{title}</h2><button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><HiOutlineX className="w-5 h-5" /></button></div>
      <div className="p-6">{children}</div>
    </div>
  </div>;
}

function UsageBar({ icon: Icon, label, used, limit, unlimitedLabel }) {
  const unlimited = limit === null || limit === undefined;
  const percent = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  return <div className="rounded-xl border border-slate-200 p-4">
    <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 font-bold text-slate-700"><Icon className="text-teal-600" />{label}</span><strong className="text-sm text-slate-600" dir="ltr">{used} / {unlimited ? unlimitedLabel : limit}</strong></div>
    <div className="h-2 bg-slate-100 rounded-full mt-3 overflow-hidden"><div className={`h-full rounded-full ${percent >= 90 ? 'bg-red-500' : percent >= 70 ? 'bg-amber-500' : 'bg-teal-600'}`} style={{ width: `${unlimited ? 0 : percent}%` }} /></div>
  </div>;
}

function PaymentForm({ invoice, organizationId, labels, onDone, onClose }) {
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [paidAt, setPaidAt] = useState(today());
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await submitSubscriptionPayment({ organizationId, invoiceId: invoice.id, paymentMethod: method, reference, paidAt: `${paidAt}T12:00:00+02:00` });
      toast.success(labels.paymentSubmitted);
      await onDone();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  return <form onSubmit={submit} className="space-y-4">
    <div className="rounded-xl bg-teal-50 border border-teal-100 p-4 flex items-center justify-between"><span><strong className="block font-mono">{invoice.invoice_number}</strong><small className="text-slate-500">{labels.fullInvoiceAmount}</small></span><strong className="text-teal-800" dir="ltr">{money(invoice.total, 'ar')}</strong></div>
    <label className="space-y-1 block"><span className="text-sm font-bold text-slate-700">{labels.paymentMethod}</span><select value={method} onChange={(event) => setMethod(event.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white"><option value="bank_transfer">{labels.bankTransfer}</option><option value="deposit">{labels.bankDeposit}</option><option value="cash">{labels.cash}</option><option value="other">{labels.other}</option></select></label>
    <label className="space-y-1 block"><span className="text-sm font-bold text-slate-700">{labels.paymentReference}</span><input required minLength="3" value={reference} onChange={(event) => setReference(event.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5" /></label>
    <label className="space-y-1 block"><span className="text-sm font-bold text-slate-700">{labels.paymentDate}</span><input required type="date" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5" /></label>
    <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3">{labels.paymentReviewNote}</p>
    <button disabled={saving} className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-lg py-3 font-bold">{saving ? labels.saving : labels.submitPayment}</button>
  </form>;
}

function PricingForm({ plan, labels, onDone, onClose }) {
  const [monthly, setMonthly] = useState(plan.monthly_price_lyd ?? '');
  const [annual, setAnnual] = useState(plan.annual_price_lyd ?? '');
  const [features, setFeatures] = useState((plan.features || []).join('\n'));
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await configurePlanPricing(plan.id, monthly, annual, features.split('\n').map((item) => item.trim()).filter(Boolean));
      toast.success(labels.pricingSaved);
      await onDone();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  return <form onSubmit={submit} className="space-y-4">
    <div className="grid sm:grid-cols-2 gap-4"><label className="space-y-1"><span className="text-sm font-bold text-slate-700">{labels.monthlyPrice}</span><input type="number" min="0.01" step="0.01" value={monthly} onChange={(event) => setMonthly(event.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5" placeholder={labels.unapproved} /></label><label className="space-y-1"><span className="text-sm font-bold text-slate-700">{labels.annualPrice}</span><input type="number" min="0.01" step="0.01" value={annual} onChange={(event) => setAnnual(event.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5" placeholder={labels.unapproved} /></label></div>
    <label className="space-y-1 block"><span className="text-sm font-bold text-slate-700">{labels.featuresOnePerLine}</span><textarea rows="6" value={features} onChange={(event) => setFeatures(event.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5" /></label>
    <button disabled={saving} className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-lg py-3 font-bold">{saving ? labels.saving : labels.savePricing}</button>
  </form>;
}

export default function SubscriptionPage() {
  const { lang } = useLanguage();
  const { organizationId, role } = useOrganization();
  const [workspace, setWorkspace] = useState({ plans: [], subscription: null, invoices: [], memberCount: 0, activeVehicleCount: 0, storageMb: 0, isPlatformAdmin: false, pendingPayments: [] });
  const [cycle, setCycle] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(null);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [pricingPlan, setPricingPlan] = useState(null);

  const labels = useMemo(() => lang === 'ar' ? {
    eyebrow: 'اشتراك المنصة', title: 'الاشتراكات والباقات', subtitle: 'إدارة تجربة الحساب، الباقة، التجديد وفواتير الاشتراك بالدينار الليبي.', refresh: 'تحديث', currentPlan: 'الباقة الحالية', status: 'الحالة', periodEnds: 'نهاية الفترة', trialEnds: 'نهاية التجربة', daysRemaining: 'يوم متبقٍ', usage: 'استخدام الحساب', users: 'المستخدمون', activeVehicles: 'السيارات النشطة', storage: 'التخزين', unlimited: 'غير محدود', choosePlan: 'اختر الباقة المناسبة', monthly: 'شهري', annual: 'سنوي', perMonth: '/ شهر', perYear: '/ سنة', unapproved: 'السعر غير معتمد', trialPrice: 'مجانية خلال التجربة', customQuote: 'تتطلب عرض سعر خاص', pricePolicy: 'لم نضع أي سعر افتراضي. لا يمكن إصدار فاتورة حتى يعتمد مدير المنصة السعر رسميًا.', requestInvoice: 'إصدار فاتورة الاشتراك', current: 'الباقة الحالية', openInvoiceExists: 'توجد فاتورة اشتراك مفتوحة', ownerOnly: 'الطلب متاح لمالك الحساب فقط', invoiceCreated: 'تم إصدار فاتورة الاشتراك', features: 'المزايا', upTo: 'حتى', usersUnit: 'مستخدم', vehiclesUnit: 'سيارة نشطة', storageUnit: 'MB تخزين', invoices: 'فواتير الاشتراك', invoiceNumber: 'رقم الفاتورة', plan: 'الباقة', cycle: 'الدورة', issueDate: 'الإصدار', dueDate: 'الاستحقاق', total: 'الإجمالي', invoiceStatus: 'الحالة', action: 'الإجراء', noInvoices: 'لا توجد فواتير اشتراك بعد', pay: 'تسجيل بيانات السداد', paymentPending: 'السداد قيد المراجعة', paid: 'مدفوعة', issued: 'صادرة', voided: 'ملغاة', paymentMethod: 'طريقة السداد', bankTransfer: 'تحويل مصرفي', bankDeposit: 'إيداع مصرفي', cash: 'نقدي', other: 'أخرى', paymentReference: 'مرجع السداد', paymentDate: 'تاريخ السداد', fullInvoiceAmount: 'قيمة الفاتورة كاملة', paymentReviewNote: 'تسجيل المرجع لا يفعّل الاشتراك مباشرة؛ يجب أن يراجعه مدير المنصة ويعتمده.', submitPayment: 'إرسال السداد للمراجعة', paymentSubmitted: 'تم إرسال بيانات السداد للمراجعة', saving: 'جارٍ الحفظ...', adminReview: 'مراجعة مدفوعات الاشتراكات', approve: 'اعتماد وتفعيل', reject: 'رفض', paymentApproved: 'تم اعتماد السداد وتفعيل الاشتراك', paymentRejected: 'تم رفض السداد', noPendingPayments: 'لا توجد مدفوعات بانتظار المراجعة', configurePricing: 'إدارة السعر', monthlyPrice: 'السعر الشهري LYD', annualPrice: 'السعر السنوي LYD', featuresOnePerLine: 'المزايا — ميزة في كل سطر', savePricing: 'حفظ السعر والمزايا', pricingSaved: 'تم حفظ سعر الباقة', trialing: 'فترة تجريبية', active: 'نشط', past_due: 'متأخر', suspended: 'موقوف', canceled: 'ملغى', separationNote: 'مالية الاشتراك مستقلة تمامًا عن فواتير السيارات وإيصالات العملاء.',
  } : {
    eyebrow: 'Platform subscription', title: 'Subscriptions and plans', subtitle: 'Manage the account trial, plan, renewals and LYD subscription invoices.', refresh: 'Refresh', currentPlan: 'Current plan', status: 'Status', periodEnds: 'Period ends', trialEnds: 'Trial ends', daysRemaining: 'days remaining', usage: 'Account usage', users: 'Users', activeVehicles: 'Active vehicles', storage: 'Storage', unlimited: 'Unlimited', choosePlan: 'Choose a plan', monthly: 'Monthly', annual: 'Annual', perMonth: '/ month', perYear: '/ year', unapproved: 'Price not approved', trialPrice: 'Free during trial', customQuote: 'Custom quote required', pricePolicy: 'No placeholder price is used. An invoice cannot be issued until the platform administrator approves the price.', requestInvoice: 'Issue subscription invoice', current: 'Current plan', openInvoiceExists: 'An open subscription invoice exists', ownerOnly: 'Only the account owner can request it', invoiceCreated: 'Subscription invoice issued', features: 'Features', upTo: 'Up to', usersUnit: 'users', vehiclesUnit: 'active vehicles', storageUnit: 'MB storage', invoices: 'Subscription invoices', invoiceNumber: 'Invoice no.', plan: 'Plan', cycle: 'Cycle', issueDate: 'Issue date', dueDate: 'Due date', total: 'Total', invoiceStatus: 'Status', action: 'Action', noInvoices: 'No subscription invoices yet', pay: 'Submit payment details', paymentPending: 'Payment under review', paid: 'Paid', issued: 'Issued', voided: 'Voided', paymentMethod: 'Payment method', bankTransfer: 'Bank transfer', bankDeposit: 'Bank deposit', cash: 'Cash', other: 'Other', paymentReference: 'Payment reference', paymentDate: 'Payment date', fullInvoiceAmount: 'Full invoice amount', paymentReviewNote: 'Submitting the reference does not activate the subscription until a platform administrator reviews and approves it.', submitPayment: 'Submit payment for review', paymentSubmitted: 'Payment details submitted for review', saving: 'Saving...', adminReview: 'Subscription payment review', approve: 'Approve and activate', reject: 'Reject', paymentApproved: 'Payment approved and subscription activated', paymentRejected: 'Payment rejected', noPendingPayments: 'No payments awaiting review', configurePricing: 'Configure pricing', monthlyPrice: 'Monthly price LYD', annualPrice: 'Annual price LYD', featuresOnePerLine: 'Features — one per line', savePricing: 'Save pricing and features', pricingSaved: 'Plan pricing saved', trialing: 'Trialing', active: 'Active', past_due: 'Past due', suspended: 'Suspended', canceled: 'Canceled', separationNote: 'Subscription billing is fully separate from vehicle and customer accounting.',
  }, [lang]);

  const refresh = useCallback(async () => {
    if (!organizationId) return;
    try {
      setWorkspace(await loadSubscriptionCenter(organizationId));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => organizationId ? subscribeToSubscription(organizationId, refresh) : undefined, [organizationId, refresh]);

  const current = workspace.subscription;
  const plan = current?.plans;
  const currentEnd = current?.status === 'trialing' ? current?.trial_ends_at : current?.current_period_end;
  const remaining = currentEnd ? Math.max(0, Math.ceil((new Date(currentEnd) - new Date()) / 86400000)) : null;
  const openInvoice = workspace.invoices.find((invoice) => invoice.status === 'issued');

  async function requestPlan(planId) {
    setRequesting(planId);
    try {
      await requestSubscriptionInvoice(organizationId, planId, cycle);
      toast.success(labels.invoiceCreated);
      await refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setRequesting(null);
    }
  }

  async function review(paymentId, approve) {
    try {
      await reviewSubscriptionPayment(paymentId, approve, null);
      toast.success(approve ? labels.paymentApproved : labels.paymentRejected);
      await refresh();
    } catch (error) {
      toast.error(error.message);
    }
  }

  const statusLabel = (status) => labels[status] || status || '—';
  const statusClass = (status) => ({ trialing: 'bg-blue-100 text-blue-700', active: 'bg-emerald-100 text-emerald-700', past_due: 'bg-amber-100 text-amber-800', suspended: 'bg-red-100 text-red-700', canceled: 'bg-slate-200 text-slate-600' })[status] || 'bg-slate-100 text-slate-600';

  if (loading) return <div className="py-24 text-center text-slate-400">...</div>;

  return <div className="space-y-5">
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4"><div><p className="text-teal-600 font-bold text-sm">{labels.eyebrow}</p><h1 className="text-3xl font-black text-slate-800">{labels.title}</h1><p className="text-slate-500 mt-1">{labels.subtitle}</p></div><button onClick={refresh} className="border border-slate-300 bg-white px-4 py-2.5 rounded-lg flex items-center gap-2 text-slate-700 self-start"><HiOutlineRefresh />{labels.refresh}</button></div>

    <div className="grid xl:grid-cols-[1.1fr_1fr] gap-4">
      <section className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 shadow-lg"><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-slate-400">{labels.currentPlan}</p><h2 className="text-3xl font-black mt-1">{lang === 'ar' ? plan?.name_ar : plan?.name_en}</h2><span className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-bold ${statusClass(current?.status)}`}>{statusLabel(current?.status)}</span></div><HiOutlineShieldCheck className="w-12 h-12 text-teal-300" /></div><div className="grid sm:grid-cols-2 gap-3 mt-7"><div className="rounded-xl bg-white/5 border border-white/10 p-4"><p className="text-xs text-slate-400">{current?.status === 'trialing' ? labels.trialEnds : labels.periodEnds}</p><strong className="block mt-1">{date(currentEnd, lang)}</strong></div><div className="rounded-xl bg-white/5 border border-white/10 p-4"><p className="text-xs text-slate-400">{labels.daysRemaining}</p><strong className="block text-2xl mt-1" dir="ltr">{remaining ?? '—'}</strong></div></div></section>
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><h2 className="font-bold text-xl text-slate-800 mb-4">{labels.usage}</h2><div className="space-y-3"><UsageBar icon={HiOutlineUsers} label={labels.users} used={workspace.memberCount} limit={plan?.max_users} unlimitedLabel={labels.unlimited} /><UsageBar icon={HiOutlineTruck} label={labels.activeVehicles} used={workspace.activeVehicleCount} limit={plan?.max_active_vehicles} unlimitedLabel={labels.unlimited} /><UsageBar icon={HiOutlineDocumentText} label={labels.storage} used={workspace.storageMb} limit={plan?.max_storage_mb} unlimitedLabel={labels.unlimited} /></div></section>
    </div>

    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><div className="flex flex-col md:flex-row md:items-center justify-between gap-3"><div><h2 className="font-bold text-xl text-slate-800">{labels.choosePlan}</h2><p className="text-xs text-amber-700 mt-1">{labels.pricePolicy}</p></div><div className="bg-slate-100 rounded-xl p-1 flex self-start"><button onClick={() => setCycle('monthly')} className={`px-4 py-2 rounded-lg text-sm font-bold ${cycle === 'monthly' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}`}>{labels.monthly}</button><button onClick={() => setCycle('annual')} className={`px-4 py-2 rounded-lg text-sm font-bold ${cycle === 'annual' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}`}>{labels.annual}</button></div></div>
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mt-5">{workspace.plans.map((item) => {
        const price = cycle === 'monthly' ? item.monthly_price_lyd : item.annual_price_lyd;
        const isCurrent = current?.plan_id === item.id;
        const disabledReason = isCurrent ? labels.current : !item.is_public ? labels.customQuote : openInvoice ? labels.openInvoiceExists : role !== 'owner' ? labels.ownerOnly : price === null || Number(price) <= 0 ? labels.unapproved : null;
        return <article key={item.id} className={`rounded-2xl border p-5 flex flex-col ${isCurrent ? 'border-teal-400 bg-teal-50/40' : 'border-slate-200'}`}><div className="flex items-start justify-between gap-2"><div><h3 className="text-xl font-black text-slate-800">{lang === 'ar' ? item.name_ar : item.name_en}</h3><p className="text-xs uppercase tracking-wider text-slate-400 mt-1">{item.id}</p></div>{isCurrent && <HiOutlineBadgeCheck className="w-7 h-7 text-teal-600" />}{workspace.isPlatformAdmin && item.id !== 'trial' && <button onClick={() => setPricingPlan(item)} title={labels.configurePricing} className="p-2 rounded-lg bg-slate-100 text-slate-600"><HiOutlineCog /></button>}</div><div className="my-5 min-h-16">{item.id === 'trial' ? <p className="font-bold text-teal-700">{labels.trialPrice}</p> : price !== null && Number(price) > 0 ? <><strong className="text-2xl text-slate-900" dir="ltr">{money(price, lang)}</strong><small className="text-slate-500 ms-1">{cycle === 'monthly' ? labels.perMonth : labels.perYear}</small></> : <p className="font-bold text-amber-700">{item.is_public ? labels.unapproved : labels.customQuote}</p>}</div><ul className="space-y-2 text-sm text-slate-600 flex-1">{(item.features || []).map((feature) => <li key={feature} className="flex gap-2"><HiOutlineCheck className="text-teal-600 shrink-0 mt-0.5" />{feature}</li>)}<li>{labels.upTo} {item.max_users ?? labels.unlimited} {labels.usersUnit}</li><li>{labels.upTo} {item.max_active_vehicles ?? labels.unlimited} {labels.vehiclesUnit}</li><li>{item.max_storage_mb ?? labels.unlimited} {labels.storageUnit}</li></ul>{item.id !== 'trial' && <button disabled={Boolean(disabledReason) || requesting === item.id} onClick={() => requestPlan(item.id)} className="mt-5 w-full rounded-lg bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-500 text-white py-2.5 font-bold text-sm">{requesting === item.id ? labels.saving : disabledReason || labels.requestInvoice}</button>}</article>;
      })}</div>
    </section>

    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"><div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2"><HiOutlineDocumentText className="text-teal-600" /><h2 className="font-bold text-xl text-slate-800">{labels.invoices}</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[850px]"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{[labels.invoiceNumber, labels.plan, labels.cycle, labels.issueDate, labels.dueDate, labels.total, labels.invoiceStatus, labels.action].map((item) => <th key={item} className="px-4 py-3 text-start">{item}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{workspace.invoices.length === 0 ? <tr><td colSpan="8" className="py-14 text-center text-slate-400">{labels.noInvoices}</td></tr> : workspace.invoices.map((invoice) => { const pending = invoice.subscription_payments?.some((payment) => payment.status === 'pending'); return <tr key={invoice.id}><td className="px-4 py-3 font-mono">{invoice.invoice_number}</td><td className="px-4 py-3 font-bold">{lang === 'ar' ? invoice.plans?.name_ar : invoice.plans?.name_en}</td><td className="px-4 py-3">{invoice.billing_cycle === 'monthly' ? labels.monthly : labels.annual}</td><td className="px-4 py-3">{date(invoice.issue_date, lang)}</td><td className="px-4 py-3">{date(invoice.due_date, lang)}</td><td className="px-4 py-3 font-bold" dir="ltr">{money(invoice.total, lang)}</td><td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : invoice.status === 'issued' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>{labels[invoice.status] || invoice.status}</span></td><td className="px-4 py-3">{invoice.status === 'issued' && (pending ? <span className="text-xs font-bold text-amber-700"><HiOutlineClock className="inline" /> {labels.paymentPending}</span> : role === 'owner' && <button onClick={() => setPaymentInvoice(invoice)} className="text-sm font-bold text-teal-700">{labels.pay}</button>)}</td></tr>; })}</tbody></table></div></section>

    {workspace.isPlatformAdmin && <section className="bg-amber-50 rounded-2xl border border-amber-200 overflow-hidden"><div className="px-5 py-4 border-b border-amber-200 flex items-center gap-2"><HiOutlineShieldCheck className="text-amber-700" /><h2 className="font-bold text-xl text-slate-800">{labels.adminReview}</h2></div><div className="divide-y divide-amber-200">{workspace.pendingPayments.length === 0 ? <p className="p-8 text-center text-slate-500">{labels.noPendingPayments}</p> : workspace.pendingPayments.map((payment) => <div key={payment.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"><span><strong className="block">{payment.organizations?.name} — {payment.subscription_invoices?.invoice_number}</strong><small className="text-slate-500">{payment.reference} · {payment.payment_method} · {date(payment.paid_at, lang)}</small></span><span className="flex items-center gap-2"><strong className="me-3" dir="ltr">{money(payment.amount, lang)}</strong><button onClick={() => review(payment.id, false)} className="border border-red-300 text-red-700 bg-white rounded-lg px-3 py-2 text-sm font-bold">{labels.reject}</button><button onClick={() => review(payment.id, true)} className="bg-emerald-600 text-white rounded-lg px-3 py-2 text-sm font-bold">{labels.approve}</button></span></div>)}</div></section>}

    <p className="text-xs text-slate-500 bg-slate-100 rounded-lg px-3 py-2 flex items-center gap-2"><HiOutlineCash />{labels.separationNote}</p>

    {paymentInvoice && <Modal title={labels.pay} onClose={() => setPaymentInvoice(null)}><PaymentForm invoice={paymentInvoice} organizationId={organizationId} labels={labels} onDone={refresh} onClose={() => setPaymentInvoice(null)} /></Modal>}
    {pricingPlan && <Modal title={`${labels.configurePricing}: ${lang === 'ar' ? pricingPlan.name_ar : pricingPlan.name_en}`} onClose={() => setPricingPlan(null)}><PricingForm plan={pricingPlan} labels={labels} onDone={refresh} onClose={() => setPricingPlan(null)} /></Modal>}
  </div>;
}
