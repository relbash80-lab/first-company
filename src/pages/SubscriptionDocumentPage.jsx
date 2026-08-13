import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HiOutlineArrowRight, HiOutlinePrinter } from 'react-icons/hi';
import AccountBrand from '../components/finance/AccountBrand';
import { useLanguage } from '../context/LanguageContext';
import { useOrganization } from '../context/OrganizationContext';
import { loadSubscriptionInvoiceDocument, loadSubscriptionPaymentDocument } from '../services/subscriptionService';
import { amountInArabicWords, formatDocumentDate, formatMoney } from '../utils/financialFormatting';

function Shell({ children, title }) {
  const navigate = useNavigate();
  return <div className="min-h-screen bg-slate-100 print:bg-white py-8 print:py-0 px-4 print:px-0">
    <div className="no-print max-w-[210mm] mx-auto mb-4 flex items-center justify-between gap-3">
      <button onClick={() => navigate('/subscription')} className="bg-white border border-slate-300 rounded-lg px-4 py-2 flex items-center gap-2 text-slate-700"><HiOutlineArrowRight />الاشتراكات والباقات</button>
      <button onClick={() => window.print()} className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-5 py-2.5 flex items-center gap-2 font-bold"><HiOutlinePrinter />طباعة / حفظ PDF</button>
    </div>
    <article aria-label={title} className="financial-document max-w-[210mm] min-h-[297mm] mx-auto bg-white shadow-xl print:shadow-none px-[16mm] py-[14mm] print:px-[14mm] print:py-[12mm] text-slate-800">{children}</article>
  </div>;
}

function Header({ data, titleAr, titleEn, number, status }) {
  return <header className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-5"><AccountBrand organization={data.organization} settings={data.settings} /><div className="text-end min-w-44"><p className="text-xs tracking-[0.22em] text-slate-400 font-bold">{titleEn}</p><h2 className="text-3xl font-black text-slate-900 mt-1">{titleAr}</h2><p className="font-mono font-bold text-teal-700 mt-2" dir="ltr">{number}</p><span className="inline-block mt-2 px-2.5 py-1 rounded-full bg-slate-100 text-xs font-bold">{status}</span></div></header>;
}

function Footer({ number }) {
  return <footer className="mt-12 pt-4 border-t border-slate-200 text-xs text-slate-500 flex justify-between"><p>مالية اشتراك المنصة مستقلة عن مالية السيارات والعملاء.</p><p className="font-mono" dir="ltr">{number}</p></footer>;
}

function Invoice({ data, lang }) {
  const planName = lang === 'ar' ? data.plans?.name_ar : data.plans?.name_en;
  const confirmedPayment = data.subscription_payments?.find((payment) => payment.status === 'confirmed');
  return <Shell title={`فاتورة اشتراك ${data.invoice_number}`}>
    <Header data={data} titleAr="فاتورة اشتراك" titleEn="SAAS SUBSCRIPTION INVOICE" number={data.invoice_number} status={data.status} />
    <section className="grid grid-cols-2 gap-8 mt-8"><div><p className="text-xs font-bold text-slate-400">المشترك / SUBSCRIBER</p><h3 className="text-xl font-black mt-2">{data.organization.name}</h3></div><dl className="grid grid-cols-2 gap-2 text-sm"><dt className="text-slate-500">تاريخ الإصدار</dt><dd className="font-bold">{formatDocumentDate(data.issue_date, lang)}</dd><dt className="text-slate-500">تاريخ الاستحقاق</dt><dd className="font-bold">{formatDocumentDate(data.due_date, lang)}</dd><dt className="text-slate-500">العملة</dt><dd className="font-bold">LYD</dd></dl></section>
    <table className="w-full mt-9"><thead><tr className="bg-slate-900 text-white text-sm"><th className="p-3 text-start">البيان</th><th className="p-3 text-center">الدورة</th><th className="p-3 text-end">القيمة</th></tr></thead><tbody><tr className="border-b border-slate-200"><td className="p-4"><strong className="block">اشتراك منصة — {planName}</strong><small className="text-slate-500">حد المستخدمين: {data.plans?.max_users ?? 'غير محدود'} · السيارات النشطة: {data.plans?.max_active_vehicles ?? 'غير محدود'} · التخزين: {data.plans?.max_storage_mb ?? 'غير محدود'} MB</small></td><td className="p-4 text-center">{data.billing_cycle === 'monthly' ? 'شهري' : 'سنوي'}</td><td className="p-4 text-end font-bold" dir="ltr">{formatMoney(data.subtotal, 'LYD', lang)}</td></tr></tbody></table>
    <section className="mt-7 ms-auto max-w-sm text-sm"><div className="flex justify-between py-2"><span>المجموع</span><strong dir="ltr">{formatMoney(data.subtotal, 'LYD', lang)}</strong></div>{Number(data.discount) > 0 && <div className="flex justify-between py-2 text-rose-700"><span>الخصم</span><strong dir="ltr">-{formatMoney(data.discount, 'LYD', lang)}</strong></div>}<div className="flex justify-between py-4 border-y-2 border-slate-900 text-lg"><span className="font-black">الإجمالي</span><strong dir="ltr">{formatMoney(data.total, 'LYD', lang)}</strong></div></section>
    <p className="mt-6 rounded-xl bg-teal-50 border border-teal-100 p-4 text-center font-bold">{amountInArabicWords(data.total, 'LYD')}</p>
    {confirmedPayment && <p className="mt-6 rounded-lg bg-emerald-50 text-emerald-800 p-4 font-bold">تم السداد والاعتماد بتاريخ {formatDocumentDate(confirmedPayment.reviewed_at?.slice(0, 10), lang)} — المرجع: {confirmedPayment.reference}</p>}
    <Footer number={data.invoice_number} />
  </Shell>;
}

function PaymentReceipt({ data, lang }) {
  const invoice = data.subscription_invoices;
  const number = `SUB-REC-${data.id.slice(0, 8).toUpperCase()}`;
  return <Shell title={`إيصال سداد اشتراك ${number}`}>
    <Header data={data} titleAr="إيصال سداد اشتراك" titleEn="SUBSCRIPTION PAYMENT RECEIPT" number={number} status="confirmed" />
    <section className="mt-9 rounded-2xl border-2 border-slate-900 p-7"><div className="grid grid-cols-2 gap-8"><div><p className="text-xs font-bold text-slate-400">استلمنا من / RECEIVED FROM</p><h3 className="text-xl font-black mt-2">{data.organization.name}</h3><p className="mt-2 text-sm text-slate-500">عن فاتورة {invoice?.invoice_number}</p></div><dl className="grid grid-cols-2 gap-2 text-sm"><dt className="text-slate-500">تاريخ السداد</dt><dd className="font-bold">{formatDocumentDate(data.paid_at?.slice(0, 10), lang)}</dd><dt className="text-slate-500">طريقة السداد</dt><dd className="font-bold">{data.payment_method}</dd><dt className="text-slate-500">المرجع</dt><dd className="font-bold" dir="ltr">{data.reference}</dd></dl></div><div className="my-8 py-7 border-y border-slate-200 text-center"><p className="text-sm text-slate-500">المبلغ المعتمد</p><p className="text-4xl font-black text-teal-700 mt-2" dir="ltr">{formatMoney(data.amount, 'LYD', lang)}</p><p className="font-bold mt-3">{amountInArabicWords(data.amount, 'LYD')}</p></div><div className="grid grid-cols-2 gap-4 text-sm"><div className="bg-slate-50 rounded-lg p-4"><p className="text-slate-500">الباقة</p><strong>{lang === 'ar' ? invoice?.plans?.name_ar : invoice?.plans?.name_en}</strong></div><div className="bg-slate-50 rounded-lg p-4"><p className="text-slate-500">فترة الاشتراك</p><strong>{formatDocumentDate(invoice?.period_start?.slice(0, 10), lang)} — {formatDocumentDate(invoice?.period_end?.slice(0, 10), lang)}</strong></div></div></section>
    <div className="mt-14 grid grid-cols-2 gap-16 text-center text-sm"><div className="border-t border-slate-400 pt-2">مراجع السداد</div><div className="border-t border-slate-400 pt-2">الختم والتوقيع</div></div>
    <Footer number={number} />
  </Shell>;
}

export default function SubscriptionDocumentPage({ kind }) {
  const { id } = useParams();
  const { organizationId } = useOrganization();
  const { lang } = useLanguage();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!organizationId || !id) return;
    const loader = kind === 'invoice' ? loadSubscriptionInvoiceDocument : loadSubscriptionPaymentDocument;
    loader(organizationId, id).then(setData).catch(setError);
  }, [id, kind, organizationId]);

  if (error) return <div className="min-h-screen grid place-items-center p-6 text-red-700">{error.message}</div>;
  if (!data) return <div className="min-h-screen grid place-items-center text-slate-500">جارٍ تجهيز المستند...</div>;
  return kind === 'invoice' ? <Invoice data={data} lang={lang} /> : <PaymentReceipt data={data} lang={lang} />;
}
