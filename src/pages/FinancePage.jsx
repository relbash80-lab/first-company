import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  HiOutlineCash,
  HiOutlineDocumentText,
  HiOutlineDownload,
  HiOutlinePlus,
  HiOutlineReceiptTax,
  HiOutlineRefresh,
  HiOutlineX,
} from 'react-icons/hi';
import { useLanguage } from '../context/LanguageContext';
import { useOrganization } from '../context/OrganizationContext';
import {
  allocateReceipt,
  createInvoiceDraft,
  issueInvoice,
  loadFinanceWorkspace,
  recordReceipt,
  subscribeToFinance,
} from '../services/financeService';

const today = () => new Date().toISOString().slice(0, 10);

function money(value, currency, lang) {
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-LY' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function Modal({ title, onClose, children }) {
  return <div className="fixed inset-0 z-[70] bg-slate-950/55 p-4 grid place-items-center" onMouseDown={onClose}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto" onMouseDown={(event) => event.stopPropagation()}>
      <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><HiOutlineX className="w-5 h-5" /></button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>;
}

function CurrencySummary({ currency, invoices, receipts, lang, labels }) {
  const activeInvoices = invoices.filter((item) => item.currency === currency && !['draft', 'voided'].includes(item.stored_status));
  const postedReceipts = receipts.filter((item) => item.currency === currency && item.status === 'posted');
  const invoiced = activeInvoices.reduce((sum, item) => sum + Number(item.grand_total || 0), 0);
  const paid = activeInvoices.reduce((sum, item) => sum + Number(item.paid_total || 0), 0);
  const balance = activeInvoices.reduce((sum, item) => sum + Number(item.balance_total || 0), 0);
  const unapplied = postedReceipts.reduce((sum, item) => sum + Number(item.unallocated_total || 0), 0);
  const palette = currency === 'LYD'
    ? { section: 'bg-emerald-50/60 border-emerald-100', badge: 'bg-emerald-100 text-emerald-700' }
    : { section: 'bg-blue-50/60 border-blue-100', badge: 'bg-blue-100 text-blue-700' };

  return <section className={`rounded-2xl border p-5 ${palette.section}`}>
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-bold text-slate-800">{currency === 'LYD' ? labels.lyd : labels.usd}</h2>
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${palette.badge}`}>{currency}</span>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[
        [labels.invoiced, invoiced],
        [labels.collected, paid],
        [labels.balance, balance],
        [labels.unapplied, unapplied],
      ].map(([label, value]) => <div key={label} className="bg-white rounded-xl border border-white p-3 shadow-sm">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="font-bold text-slate-800 mt-1" dir="ltr">{money(value, currency, lang)}</p>
      </div>)}
    </div>
  </section>;
}

function InvoiceForm({ clients, charges, organizationId, lang, labels, onDone, onClose }) {
  const [clientId, setClientId] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate] = useState(today());
  const [selected, setSelected] = useState([]);
  const [notes, setNotes] = useState('');
  const [issueNow, setIssueNow] = useState(true);
  const [saving, setSaving] = useState(false);
  const available = charges.filter((item) => item.client_id === clientId && item.currency === currency);
  const selectedTotal = available.filter((item) => selected.includes(item.charge_id)).reduce((sum, item) => sum + Number(item.amount), 0);

  useEffect(() => setSelected([]), [clientId, currency]);

  async function submit(event) {
    event.preventDefault();
    if (!clientId || selected.length === 0) return toast.error(labels.selectCharges);
    setSaving(true);
    try {
      const invoiceId = await createInvoiceDraft({
        organizationId,
        clientId,
        chargeIds: selected,
        currency,
        issueDate,
        dueDate,
        customerNotes: notes,
      });
      if (issueNow) await issueInvoice(organizationId, invoiceId);
      toast.success(issueNow ? labels.invoiceIssued : labels.draftCreated);
      await onDone();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  return <form onSubmit={submit} className="space-y-5">
    <div className="grid sm:grid-cols-2 gap-4">
      <label className="space-y-1"><span className="text-sm font-semibold text-slate-700">{labels.client}</span>
        <select required value={clientId} onChange={(event) => setClientId(event.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white">
          <option value="">{labels.chooseClient}</option>
          {clients.map((client) => <option value={client.id} key={client.id}>{client.name}</option>)}
        </select>
      </label>
      <label className="space-y-1"><span className="text-sm font-semibold text-slate-700">{labels.currency}</span>
        <select value={currency} onChange={(event) => setCurrency(event.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white">
          <option value="USD">USD — {labels.usd}</option><option value="LYD">LYD — {labels.lyd}</option>
        </select>
      </label>
      <label className="space-y-1"><span className="text-sm font-semibold text-slate-700">{labels.issueDate}</span><input type="date" required value={issueDate} onChange={(event) => setIssueDate(event.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5" /></label>
      <label className="space-y-1"><span className="text-sm font-semibold text-slate-700">{labels.dueDate}</span><input type="date" required min={issueDate} value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5" /></label>
    </div>

    <div>
      <div className="flex items-center justify-between mb-2"><h3 className="font-bold text-slate-800">{labels.unbilledCharges}</h3><span className="font-bold text-teal-700" dir="ltr">{money(selectedTotal, currency, lang)}</span></div>
      <div className="border border-slate-200 rounded-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
        {!clientId ? <p className="p-6 text-center text-slate-400">{labels.chooseClientFirst}</p> : available.length === 0 ? <p className="p-6 text-center text-slate-400">{labels.noChargesCurrency}</p> : available.map((charge) => <label key={charge.charge_id} className="p-3 flex items-start gap-3 hover:bg-slate-50 cursor-pointer">
          <input type="checkbox" className="mt-1 accent-teal-600" checked={selected.includes(charge.charge_id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, charge.charge_id] : current.filter((id) => id !== charge.charge_id))} />
          <span className="flex-1"><span className="block font-semibold text-sm text-slate-700">{charge.description || charge.category}</span><span className="text-xs text-slate-500" dir="ltr">{charge.vin} · {charge.vehicle_label}</span></span>
          <span className="font-bold text-slate-700" dir="ltr">{money(charge.amount, currency, lang)}</span>
        </label>)}
      </div>
    </div>

    <label className="space-y-1 block"><span className="text-sm font-semibold text-slate-700">{labels.notes}</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows="2" className="w-full border border-slate-300 rounded-lg px-3 py-2.5" /></label>
    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={issueNow} onChange={(event) => setIssueNow(event.target.checked)} className="accent-teal-600" />{labels.issueImmediately}</label>
    <button disabled={saving} className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-lg py-3 font-bold">{saving ? labels.saving : issueNow ? labels.createAndIssue : labels.saveDraft}</button>
  </form>;
}

function ReceiptForm({ clients, invoices, organizationId, labels, lang, onDone, onClose }) {
  const [clientId, setClientId] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [receiptDate, setReceiptDate] = useState(today());
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const openInvoices = invoices.filter((item) => item.client_id === clientId && item.currency === currency && !['draft', 'voided', 'paid'].includes(item.effective_status) && Number(item.balance_total) > 0);
  const selectedInvoice = openInvoices.find((item) => item.id === invoiceId);

  useEffect(() => setInvoiceId(''), [clientId, currency]);

  async function submit(event) {
    event.preventDefault();
    if (!clientId || Number(amount) <= 0) return;
    setSaving(true);
    try {
      const receiptId = await recordReceipt({ organizationId, clientId, amount, currency, receiptDate, paymentMethod: method, reference });
      if (selectedInvoice) {
        const allocation = Math.min(Number(amount), Number(selectedInvoice.balance_total));
        if (allocation > 0) await allocateReceipt(organizationId, receiptId, selectedInvoice.id, allocation);
      }
      toast.success(labels.receiptRecorded);
      await onDone();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  return <form onSubmit={submit} className="space-y-5">
    <div className="grid sm:grid-cols-2 gap-4">
      <label className="space-y-1"><span className="text-sm font-semibold text-slate-700">{labels.client}</span><select required value={clientId} onChange={(event) => setClientId(event.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white"><option value="">{labels.chooseClient}</option>{clients.map((client) => <option value={client.id} key={client.id}>{client.name}</option>)}</select></label>
      <label className="space-y-1"><span className="text-sm font-semibold text-slate-700">{labels.currency}</span><select value={currency} onChange={(event) => setCurrency(event.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white"><option value="USD">USD — {labels.usd}</option><option value="LYD">LYD — {labels.lyd}</option></select></label>
      <label className="space-y-1"><span className="text-sm font-semibold text-slate-700">{labels.amount}</span><input required min="0.01" step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5" /></label>
      <label className="space-y-1"><span className="text-sm font-semibold text-slate-700">{labels.receiptDate}</span><input required type="date" value={receiptDate} onChange={(event) => setReceiptDate(event.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5" /></label>
      <label className="space-y-1"><span className="text-sm font-semibold text-slate-700">{labels.method}</span><select value={method} onChange={(event) => setMethod(event.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white"><option value="bank_transfer">{labels.bankTransfer}</option><option value="cash">{labels.cash}</option><option value="check">{labels.check}</option><option value="other">{labels.other}</option></select></label>
      <label className="space-y-1"><span className="text-sm font-semibold text-slate-700">{labels.reference}</span><input value={reference} onChange={(event) => setReference(event.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5" /></label>
    </div>
    <label className="space-y-1 block"><span className="text-sm font-semibold text-slate-700">{labels.allocateTo}</span><select value={invoiceId} onChange={(event) => setInvoiceId(event.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white"><option value="">{labels.keepAsCredit}</option>{openInvoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoice_number} — {money(invoice.balance_total, currency, lang)}</option>)}</select></label>
    {selectedInvoice && Number(amount) > Number(selectedInvoice.balance_total) && <p className="rounded-lg bg-amber-50 text-amber-800 px-3 py-2 text-sm">{labels.excessCredit} {money(Number(amount) - Number(selectedInvoice.balance_total), currency, lang)}</p>}
    <button disabled={saving} className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-lg py-3 font-bold">{saving ? labels.saving : labels.recordReceipt}</button>
  </form>;
}

export default function FinancePage() {
  const { lang } = useLanguage();
  const { organizationId } = useOrganization();
  const [workspace, setWorkspace] = useState({ clients: [], charges: [], invoices: [], receipts: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('invoices');
  const [showInvoice, setShowInvoice] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  const labels = useMemo(() => lang === 'ar' ? {
    title: 'المركز المالي', subtitle: 'الفواتير والتحصيل والأرصدة من مصدر واحد', newInvoice: 'فاتورة جديدة', recordReceipt: 'تسجيل سداد', refresh: 'تحديث', invoices: 'الفواتير', receipts: 'الإيصالات', unbilledCharges: 'رسوم غير مفوترة', reports: 'ملخص التقرير', usd: 'الدولار الأمريكي', lyd: 'الدينار الليبي', invoiced: 'المفوتر', collected: 'المحصل', balance: 'الرصيد', unapplied: 'دائن غير موزع', invoiceNumber: 'رقم الفاتورة', client: 'العميل', date: 'التاريخ', dueDate: 'الاستحقاق', currency: 'العملة', total: 'الإجمالي', paid: 'المسدّد', status: 'الحالة', actions: 'إجراء', issue: 'إصدار', draft: 'مسودة', issued: 'صادرة', partially_paid: 'سداد جزئي', paidStatus: 'مسددة', overdue: 'متأخرة', voided: 'ملغاة', noInvoices: 'لا توجد فواتير بعد', receiptNumber: 'رقم الإيصال', amount: 'المبلغ', allocated: 'الموزع', credit: 'غير الموزع', noReceipts: 'لا توجد إيصالات بعد', vehicle: 'السيارة', description: 'البيان', chargeDate: 'تاريخ الرسم', noCharges: 'لا توجد رسوم غير مفوترة', exportCsv: 'تصدير CSV', createInvoice: 'إنشاء فاتورة', chooseClient: 'اختر العميل', chooseClientFirst: 'اختر العميل لعرض الرسوم', selectCharges: 'اختر رسمًا واحدًا على الأقل', noChargesCurrency: 'لا توجد رسوم بهذه العملة لهذا العميل', issueDate: 'تاريخ الإصدار', notes: 'ملاحظات العميل', issueImmediately: 'إصدار الفاتورة مباشرة بعد إنشاء المسودة', createAndIssue: 'إنشاء وإصدار الفاتورة', saveDraft: 'حفظ كمسودة', saving: 'جارٍ الحفظ...', invoiceIssued: 'تم إصدار الفاتورة', draftCreated: 'تم إنشاء المسودة', newReceipt: 'إيصال قبض جديد', receiptDate: 'تاريخ السداد', method: 'طريقة السداد', bankTransfer: 'تحويل مصرفي', cash: 'نقدي', check: 'شيك', other: 'أخرى', reference: 'المرجع', allocateTo: 'توزيع السداد على فاتورة', keepAsCredit: 'بدون توزيع — يبقى رصيدًا دائنًا', excessCredit: 'المبلغ الزائد سيبقى رصيدًا دائنًا:', receiptRecorded: 'تم تسجيل إيصال السداد', reportHint: 'تعرض كل عملة مستقلة ولا يتم جمع USD مع LYD.',
  } : {
    title: 'Financial Center', subtitle: 'Invoices, collections and balances from one source', newInvoice: 'New invoice', recordReceipt: 'Record receipt', refresh: 'Refresh', invoices: 'Invoices', receipts: 'Receipts', unbilledCharges: 'Unbilled charges', reports: 'Report summary', usd: 'US Dollar', lyd: 'Libyan Dinar', invoiced: 'Invoiced', collected: 'Collected', balance: 'Balance', unapplied: 'Unapplied credit', invoiceNumber: 'Invoice no.', client: 'Client', date: 'Date', dueDate: 'Due date', currency: 'Currency', total: 'Total', paid: 'Paid', status: 'Status', actions: 'Action', issue: 'Issue', draft: 'Draft', issued: 'Issued', partially_paid: 'Partially paid', paidStatus: 'Paid', overdue: 'Overdue', voided: 'Voided', noInvoices: 'No invoices yet', receiptNumber: 'Receipt no.', amount: 'Amount', allocated: 'Allocated', credit: 'Unallocated', noReceipts: 'No receipts yet', vehicle: 'Vehicle', description: 'Description', chargeDate: 'Charge date', noCharges: 'No unbilled charges', exportCsv: 'Export CSV', createInvoice: 'Create invoice', chooseClient: 'Choose client', chooseClientFirst: 'Choose a client to view charges', selectCharges: 'Choose at least one charge', noChargesCurrency: 'No charges in this currency for this client', issueDate: 'Issue date', notes: 'Customer notes', issueImmediately: 'Issue immediately after creating the draft', createAndIssue: 'Create and issue invoice', saveDraft: 'Save draft', saving: 'Saving...', invoiceIssued: 'Invoice issued', draftCreated: 'Draft created', newReceipt: 'New receipt', receiptDate: 'Receipt date', method: 'Payment method', bankTransfer: 'Bank transfer', cash: 'Cash', check: 'Check', other: 'Other', reference: 'Reference', allocateTo: 'Allocate to invoice', keepAsCredit: 'Do not allocate — keep as client credit', excessCredit: 'Excess will remain as client credit:', receiptRecorded: 'Receipt recorded', reportHint: 'Each currency is reported separately; USD and LYD are never combined.',
  }, [lang]);

  const refresh = useCallback(async () => {
    if (!organizationId) return;
    try {
      const data = await loadFinanceWorkspace(organizationId);
      setWorkspace(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => organizationId ? subscribeToFinance(organizationId, refresh) : undefined, [organizationId, refresh]);

  async function handleIssue(invoiceId) {
    try { await issueInvoice(organizationId, invoiceId); toast.success(labels.invoiceIssued); await refresh(); } catch (error) { toast.error(error.message); }
  }

  function exportInvoices() {
    const header = ['invoice_number', 'client', 'issue_date', 'due_date', 'currency', 'total', 'paid', 'balance', 'status'];
    const rows = workspace.invoices.map((item) => [item.invoice_number || '', item.clients?.name || '', item.issue_date, item.due_date, item.currency, item.grand_total, item.paid_total || 0, item.balance_total || 0, item.effective_status || item.status]);
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `financial-invoices-${today()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const statusLabel = (value) => ({ draft: labels.draft, issued: labels.issued, partially_paid: labels.partially_paid, paid: labels.paidStatus, overdue: labels.overdue, voided: labels.voided })[value] || value;
  const statusClass = (value) => ({ draft: 'bg-slate-100 text-slate-700', issued: 'bg-blue-100 text-blue-700', partially_paid: 'bg-amber-100 text-amber-800', paid: 'bg-emerald-100 text-emerald-700', overdue: 'bg-red-100 text-red-700', voided: 'bg-slate-200 text-slate-500' })[value] || 'bg-slate-100';

  return <div className="space-y-5">
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
      <div><p className="text-teal-600 font-bold text-sm">{labels.reports}</p><h1 className="text-3xl font-bold text-slate-800">{labels.title}</h1><p className="text-slate-500 mt-1">{labels.subtitle}</p></div>
      <div className="flex flex-wrap gap-2">
        <button onClick={refresh} className="border border-slate-300 bg-white px-4 py-2.5 rounded-lg flex items-center gap-2 text-slate-700"><HiOutlineRefresh />{labels.refresh}</button>
        <button onClick={() => setShowReceipt(true)} className="border border-teal-600 text-teal-700 bg-white px-4 py-2.5 rounded-lg flex items-center gap-2 font-bold"><HiOutlineCash />{labels.recordReceipt}</button>
        <button onClick={() => setShowInvoice(true)} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 font-bold"><HiOutlinePlus />{labels.newInvoice}</button>
      </div>
    </div>

    <div className="grid xl:grid-cols-2 gap-4"><CurrencySummary currency="USD" {...workspace} lang={lang} labels={labels} /><CurrencySummary currency="LYD" {...workspace} lang={lang} labels={labels} /></div>
    <p className="text-xs text-slate-500 bg-slate-100 rounded-lg px-3 py-2">{labels.reportHint}</p>

    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex overflow-x-auto">{[['invoices', labels.invoices, HiOutlineDocumentText], ['receipts', labels.receipts, HiOutlineReceiptTax], ['charges', labels.unbilledCharges, HiOutlineCash]].map(([value, label, Icon]) => <button key={value} onClick={() => setTab(value)} className={`px-4 py-4 border-b-2 flex items-center gap-2 whitespace-nowrap ${tab === value ? 'border-teal-600 text-teal-700 font-bold' : 'border-transparent text-slate-500'}`}><Icon />{label}</button>)}</div>
        {tab === 'invoices' && <button onClick={exportInvoices} className="text-sm text-slate-600 flex items-center gap-1"><HiOutlineDownload />{labels.exportCsv}</button>}
      </div>

      <div className="overflow-x-auto">
        {loading ? <div className="py-20 text-center text-slate-400">...</div> : tab === 'invoices' ? <table className="w-full min-w-[900px]"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{[labels.invoiceNumber, labels.client, labels.issueDate, labels.dueDate, labels.currency, labels.total, labels.paid, labels.balance, labels.status, labels.actions].map((item) => <th key={item} className="px-4 py-3 text-start">{item}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{workspace.invoices.length === 0 ? <tr><td colSpan="10" className="py-16 text-center text-slate-400">{labels.noInvoices}</td></tr> : workspace.invoices.map((invoice) => { const state = invoice.effective_status || invoice.status; return <tr key={invoice.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-mono text-sm">{invoice.invoice_number || '—'}</td><td className="px-4 py-3 font-semibold text-slate-700">{invoice.clients?.name}</td><td className="px-4 py-3 text-sm">{invoice.issue_date}</td><td className="px-4 py-3 text-sm">{invoice.due_date}</td><td className="px-4 py-3 font-bold">{invoice.currency}</td><td className="px-4 py-3 font-semibold" dir="ltr">{money(invoice.grand_total, invoice.currency, lang)}</td><td className="px-4 py-3 text-emerald-700" dir="ltr">{money(invoice.paid_total, invoice.currency, lang)}</td><td className="px-4 py-3 text-red-700 font-bold" dir="ltr">{money(invoice.balance_total, invoice.currency, lang)}</td><td className="px-4 py-3"><span className={`px-2.5 py-1 text-xs font-bold rounded-full ${statusClass(state)}`}>{statusLabel(state)}</span></td><td className="px-4 py-3">{invoice.status === 'draft' && <button onClick={() => handleIssue(invoice.id)} className="text-teal-700 font-bold text-sm">{labels.issue}</button>}</td></tr>; })}</tbody></table> : tab === 'receipts' ? <table className="w-full min-w-[760px]"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{[labels.receiptNumber, labels.client, labels.receiptDate, labels.currency, labels.amount, labels.allocated, labels.credit, labels.status].map((item) => <th key={item} className="px-4 py-3 text-start">{item}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{workspace.receipts.length === 0 ? <tr><td colSpan="8" className="py-16 text-center text-slate-400">{labels.noReceipts}</td></tr> : workspace.receipts.map((receipt) => <tr key={receipt.id}><td className="px-4 py-3 font-mono text-sm">{receipt.receipt_number}</td><td className="px-4 py-3 font-semibold">{receipt.clients?.name}</td><td className="px-4 py-3">{receipt.receipt_date}</td><td className="px-4 py-3 font-bold">{receipt.currency}</td><td className="px-4 py-3" dir="ltr">{money(receipt.amount, receipt.currency, lang)}</td><td className="px-4 py-3 text-emerald-700" dir="ltr">{money(receipt.allocated_total, receipt.currency, lang)}</td><td className="px-4 py-3 text-amber-700" dir="ltr">{money(receipt.unallocated_total, receipt.currency, lang)}</td><td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded-full ${receipt.status === 'posted' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>{receipt.status}</span></td></tr>)}</tbody></table> : <table className="w-full min-w-[760px]"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{[labels.client, labels.vehicle, labels.description, labels.chargeDate, labels.currency, labels.amount].map((item) => <th key={item} className="px-4 py-3 text-start">{item}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{workspace.charges.length === 0 ? <tr><td colSpan="6" className="py-16 text-center text-slate-400">{labels.noCharges}</td></tr> : workspace.charges.map((charge) => <tr key={charge.charge_id}><td className="px-4 py-3">{workspace.clients.find((client) => client.id === charge.client_id)?.name}</td><td className="px-4 py-3"><span className="block font-semibold">{charge.vehicle_label}</span><span className="text-xs font-mono text-slate-500">{charge.vin}</span></td><td className="px-4 py-3">{charge.description || charge.category}</td><td className="px-4 py-3">{charge.charge_date}</td><td className="px-4 py-3 font-bold">{charge.currency}</td><td className="px-4 py-3 font-bold" dir="ltr">{money(charge.amount, charge.currency, lang)}</td></tr>)}</tbody></table>}
      </div>
    </div>

    {showInvoice && <Modal title={labels.createInvoice} onClose={() => setShowInvoice(false)}><InvoiceForm {...workspace} organizationId={organizationId} lang={lang} labels={labels} onDone={refresh} onClose={() => setShowInvoice(false)} /></Modal>}
    {showReceipt && <Modal title={labels.newReceipt} onClose={() => setShowReceipt(false)}><ReceiptForm {...workspace} organizationId={organizationId} lang={lang} labels={labels} onDone={refresh} onClose={() => setShowReceipt(false)} /></Modal>}
  </div>;
}
