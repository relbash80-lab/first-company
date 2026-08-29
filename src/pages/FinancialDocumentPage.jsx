import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HiOutlineArrowRight, HiOutlinePrinter } from 'react-icons/hi';
import { useLanguage } from '../context/LanguageContext';
import { useOrganization } from '../context/OrganizationContext';
import AccountBrand from '../components/finance/AccountBrand';
import { loadClientStatement, loadInvoiceDocument, loadReceiptDocument } from '../services/financeService';
import { amountInArabicWords, formatDocumentDate, formatMoney } from '../utils/financialFormatting';

function DocumentShell({ children, title }) {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  return <div className="min-h-screen bg-slate-100 print:bg-white py-8 print:py-0 px-4 print:px-0">
    <div className="no-print max-w-[210mm] mx-auto mb-4 flex items-center justify-between gap-3">
      <button onClick={() => navigate('/finance')} className="bg-white border border-slate-300 rounded-lg px-4 py-2 flex items-center gap-2 text-slate-700"><HiOutlineArrowRight />{lang === 'ar' ? 'كشف حساب' : 'Account Statement'}</button>
      <button onClick={() => window.print()} className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-5 py-2.5 flex items-center gap-2 font-bold"><HiOutlinePrinter />طباعة / حفظ PDF</button>
    </div>
    <article aria-label={title} className="financial-document max-w-[210mm] min-h-[297mm] mx-auto bg-white shadow-xl print:shadow-none px-[16mm] py-[14mm] print:px-[14mm] print:py-[12mm] text-slate-800">
      {children}
    </article>
  </div>;
}

function Header({ data, titleAr, titleEn, number, status }) {
  return <>
    <header className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-5">
      <AccountBrand organization={data.organization} settings={data.settings} />
      <div className="text-end min-w-44">
        <p className="text-xs tracking-[0.22em] text-slate-400 font-bold uppercase">{titleEn}</p>
        <h2 className="text-3xl font-black text-slate-900 mt-1">{titleAr}</h2>
        {number && <p className="font-mono font-bold text-teal-700 mt-2" dir="ltr">{number}</p>}
        {status && <span className="inline-block mt-2 px-2.5 py-1 rounded-full bg-slate-100 text-xs font-bold">{status}</span>}
      </div>
    </header>
  </>;
}

function Footer({ settings, documentNumber }) {
  return <footer className="mt-10 pt-4 border-t border-slate-200 text-xs text-slate-500 flex items-end justify-between gap-5">
    <div><p>{settings?.invoice_footer || 'شكرًا لتعاملكم معنا'}</p>{settings?.payment_instructions && <p className="mt-1">{settings.payment_instructions}</p>}</div>
    <p className="font-mono" dir="ltr">{documentNumber}</p>
  </footer>;
}

function InvoiceDocument({ data, lang }) {
  const state = data.effective_status || data.status;
  return <DocumentShell title={`فاتورة ${data.invoice_number || ''}`}>
    <Header data={data} titleAr="فاتورة" titleEn="INVOICE" number={data.invoice_number || 'مسودة'} status={state} />
    <section className="grid grid-cols-2 gap-8 mt-7">
      <div><p className="text-xs font-bold text-slate-400 mb-2">فاتورة إلى / BILL TO</p><h3 className="text-lg font-black">{data.clients?.name}</h3>{data.clients?.phone && <p className="text-sm mt-1" dir="ltr">{data.clients.phone}</p>}{data.clients?.email && <p className="text-sm" dir="ltr">{data.clients.email}</p>}</div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-slate-500">تاريخ الإصدار</dt><dd className="font-bold">{formatDocumentDate(data.issue_date, lang)}</dd>
        <dt className="text-slate-500">تاريخ الاستحقاق</dt><dd className="font-bold">{formatDocumentDate(data.due_date, lang)}</dd>
        <dt className="text-slate-500">العملة</dt><dd className="font-bold">{data.currency}</dd>
      </dl>
    </section>
    <table className="w-full mt-8 border-collapse">
      <thead><tr className="bg-slate-900 text-white text-xs"><th className="p-3 text-start w-9">#</th><th className="p-3 text-start">البيان / DESCRIPTION</th><th className="p-3 text-center">الكمية</th><th className="p-3 text-end">السعر</th><th className="p-3 text-end">الإجمالي</th></tr></thead>
      <tbody>{[...(data.invoice_items || [])].sort((a, b) => a.sort_order - b.sort_order).map((item, index) => <tr key={item.id} className="border-b border-slate-200 text-sm align-top"><td className="p-3 text-slate-400">{index + 1}</td><td className="p-3"><p className="font-bold">{item.description}</p>{(item.vehicle_label || item.vin_snapshot) && <p className="text-xs text-slate-500 mt-1" dir="ltr">{item.vehicle_label} · VIN {item.vin_snapshot}</p>}</td><td className="p-3 text-center">{item.quantity}</td><td className="p-3 text-end" dir="ltr">{formatMoney(item.unit_price, data.currency, lang)}</td><td className="p-3 text-end font-bold" dir="ltr">{formatMoney(item.line_total, data.currency, lang)}</td></tr>)}</tbody>
    </table>
    <section className="mt-6 ms-auto w-full max-w-sm text-sm">
      <div className="flex justify-between py-2"><span>المجموع الجزئي</span><strong dir="ltr">{formatMoney(data.subtotal, data.currency, lang)}</strong></div>
      {Number(data.discount_total) > 0 && <div className="flex justify-between py-2 text-rose-700"><span>الخصم</span><strong dir="ltr">-{formatMoney(data.discount_total, data.currency, lang)}</strong></div>}
      {Number(data.tax_total) > 0 && <div className="flex justify-between py-2"><span>الضريبة</span><strong dir="ltr">{formatMoney(data.tax_total, data.currency, lang)}</strong></div>}
      <div className="flex justify-between py-3 border-y-2 border-slate-900 text-lg"><span className="font-black">إجمالي الفاتورة</span><strong dir="ltr">{formatMoney(data.grand_total, data.currency, lang)}</strong></div>
      <div className="flex justify-between py-2 text-emerald-700"><span>المسدّد</span><strong dir="ltr">{formatMoney(data.paid_total, data.currency, lang)}</strong></div>
      {Number(data.credited_total) > 0 && <div className="flex justify-between py-2 text-violet-700"><span>إشعارات دائنة</span><strong dir="ltr">{formatMoney(data.credited_total, data.currency, lang)}</strong></div>}
      <div className="flex justify-between py-3 bg-slate-100 px-3 rounded-lg text-lg"><span className="font-black">الرصيد</span><strong className="text-rose-700" dir="ltr">{formatMoney(data.balance_total, data.currency, lang)}</strong></div>
    </section>
    {data.customer_notes && <section className="mt-7 rounded-lg bg-slate-50 p-4 text-sm"><p className="font-bold mb-1">ملاحظات</p><p>{data.customer_notes}</p></section>}
    <Footer settings={data.settings} documentNumber={data.invoice_number} />
  </DocumentShell>;
}

function ReceiptDocument({ data, lang }) {
  const allocations = (data.receipt_allocations || []).filter((item) => !item.reversed_at);
  return <DocumentShell title={`إيصال ${data.receipt_number}`}>
    <Header data={data} titleAr="إيصال قبض" titleEn="PAYMENT RECEIPT" number={data.receipt_number} status={data.status} />
    <section className="mt-8 rounded-2xl border-2 border-slate-900 p-6">
      <div className="grid grid-cols-2 gap-6"><div><p className="text-xs font-bold text-slate-400">استلمنا من / RECEIVED FROM</p><h3 className="text-xl font-black mt-2">{data.clients?.name}</h3></div><dl className="grid grid-cols-2 gap-2 text-sm"><dt className="text-slate-500">التاريخ</dt><dd className="font-bold">{formatDocumentDate(data.receipt_date, lang)}</dd><dt className="text-slate-500">الطريقة</dt><dd className="font-bold">{data.payment_method}</dd><dt className="text-slate-500">المرجع</dt><dd className="font-bold" dir="ltr">{data.reference || '—'}</dd></dl></div>
      <div className="my-7 py-6 border-y border-slate-200 text-center"><p className="text-sm text-slate-500">المبلغ المستلم</p><p className="text-4xl font-black text-teal-700 mt-2" dir="ltr">{formatMoney(data.amount, data.currency, lang)}</p><p className="mt-3 font-bold text-slate-700">{amountInArabicWords(data.amount, data.currency)}</p></div>
      <div className="grid grid-cols-2 gap-4 text-sm"><div className="bg-emerald-50 rounded-lg p-3"><p className="text-emerald-700">الموزع على فواتير</p><strong dir="ltr">{formatMoney(data.allocated_total, data.currency, lang)}</strong></div><div className="bg-amber-50 rounded-lg p-3"><p className="text-amber-700">رصيد دائن غير موزع</p><strong dir="ltr">{formatMoney(data.unallocated_total, data.currency, lang)}</strong></div></div>
    </section>
    {allocations.length > 0 && <section className="mt-7"><h3 className="font-black mb-3">توزيع السداد</h3><table className="w-full text-sm"><thead><tr className="bg-slate-100"><th className="p-3 text-start">الفاتورة</th><th className="p-3 text-start">تاريخها</th><th className="p-3 text-end">المبلغ الموزع</th></tr></thead><tbody>{allocations.map((item, index) => <tr key={index} className="border-b"><td className="p-3 font-mono">{item.invoices?.invoice_number}</td><td className="p-3">{formatDocumentDate(item.invoices?.issue_date, lang)}</td><td className="p-3 text-end font-bold" dir="ltr">{formatMoney(item.amount, data.currency, lang)}</td></tr>)}</tbody></table></section>}
    {data.notes && <p className="mt-6 text-sm bg-slate-50 p-4 rounded-lg">{data.notes}</p>}
    <div className="mt-14 grid grid-cols-2 gap-16 text-center text-sm"><div className="border-t border-slate-400 pt-2">توقيع المستلم</div><div className="border-t border-slate-400 pt-2">الختم والتوقيع</div></div>
    <Footer settings={data.settings} documentNumber={data.receipt_number} />
  </DocumentShell>;
}

function StatementDocument({ data, lang }) {
  const currencies = ['USD', 'LYD'];
  const grouped = useMemo(() => Object.fromEntries(currencies.map((currency) => {
    const entries = [
      ...data.invoices.filter((item) => item.currency === currency).map((item) => ({ date: item.issue_date, ref: item.invoice_number, label: 'فاتورة', debit: Number(item.grand_total), credit: 0 })),
      ...data.receipts.filter((item) => item.currency === currency).map((item) => ({ date: item.receipt_date, ref: item.receipt_number, label: 'إيصال قبض', debit: 0, credit: Number(item.amount) })),
      ...data.creditNotes.filter((item) => item.currency === currency).map((item) => ({ date: item.issue_date, ref: item.credit_note_number, label: `إشعار دائن - ${item.reason}`, debit: 0, credit: Number(item.total) })),
    ].sort((a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label));
    let balance = 0;
    return [currency, entries.map((entry) => ({ ...entry, balance: balance += entry.debit - entry.credit }))];
  })), [data]);

  return <DocumentShell title={`كشف حساب ${data.client.name}`}>
    <Header data={data} titleAr="كشف حساب عميل" titleEn="CUSTOMER STATEMENT" />
    <section className="mt-7 flex justify-between gap-6 border-b border-slate-200 pb-5"><div><p className="text-xs font-bold text-slate-400">العميل / CUSTOMER</p><h3 className="text-xl font-black mt-1">{data.client.name}</h3><p className="text-sm text-slate-500 mt-1" dir="ltr">{[data.client.phone, data.client.email].filter(Boolean).join(' · ')}</p></div><div className="text-sm"><p className="text-slate-500">تاريخ الكشف</p><strong>{formatDocumentDate(new Date().toISOString().slice(0, 10), lang)}</strong></div></section>
    {currencies.map((currency) => <section key={currency} className="mt-8 break-inside-avoid"><div className="flex justify-between items-center mb-3"><h3 className="text-lg font-black">حركات {currency}</h3><span className="px-3 py-1 rounded-full bg-slate-100 font-bold text-sm">{currency}</span></div><table className="w-full text-sm"><thead><tr className="bg-slate-900 text-white"><th className="p-3 text-start">التاريخ</th><th className="p-3 text-start">المرجع</th><th className="p-3 text-start">البيان</th><th className="p-3 text-end">مدين</th><th className="p-3 text-end">دائن</th><th className="p-3 text-end">الرصيد</th></tr></thead><tbody>{grouped[currency].length === 0 ? <tr><td colSpan="6" className="p-8 text-center text-slate-400">لا توجد حركات بهذه العملة</td></tr> : grouped[currency].map((entry, index) => <tr key={`${entry.ref}-${index}`} className="border-b border-slate-200"><td className="p-3">{formatDocumentDate(entry.date, lang)}</td><td className="p-3 font-mono">{entry.ref}</td><td className="p-3">{entry.label}</td><td className="p-3 text-end" dir="ltr">{entry.debit ? formatMoney(entry.debit, currency, lang) : '—'}</td><td className="p-3 text-end text-emerald-700" dir="ltr">{entry.credit ? formatMoney(entry.credit, currency, lang) : '—'}</td><td className="p-3 text-end font-bold" dir="ltr">{formatMoney(entry.balance, currency, lang)}</td></tr>)}</tbody><tfoot><tr className="bg-slate-100 font-black"><td colSpan="5" className="p-3">الرصيد النهائي</td><td className="p-3 text-end" dir="ltr">{formatMoney(grouped[currency].at(-1)?.balance || 0, currency, lang)}</td></tr></tfoot></table></section>)}
    <Footer settings={data.settings} documentNumber={`STATEMENT-${data.client.id.slice(0, 8)}`} />
  </DocumentShell>;
}

export default function FinancialDocumentPage({ kind }) {
  const { id } = useParams();
  const { organizationId } = useOrganization();
  const { lang } = useLanguage();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!organizationId || !id) return;
    const loader = kind === 'invoice' ? loadInvoiceDocument : kind === 'receipt' ? loadReceiptDocument : loadClientStatement;
    loader(organizationId, id).then(setData).catch(setError);
  }, [id, kind, organizationId]);

  if (error) return <div className="min-h-screen grid place-items-center p-6 text-red-700">{error.message}</div>;
  if (!data) return <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-500">جارٍ تجهيز المستند...</div>;
  if (kind === 'invoice') return <InvoiceDocument data={data} lang={lang} />;
  if (kind === 'receipt') return <ReceiptDocument data={data} lang={lang} />;
  return <StatementDocument data={data} lang={lang} />;
}
