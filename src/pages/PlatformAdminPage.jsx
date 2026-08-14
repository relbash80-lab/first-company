import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  HiOutlineOfficeBuilding,
  HiOutlineCreditCard,
  HiOutlineExclamation,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineShieldCheck,
  HiOutlineUsers,
} from 'react-icons/hi';
import { useLanguage } from '../context/LanguageContext';
import {
  loadPlatformAdminDashboard,
  updatePlatformMember,
  updatePlatformOrganization,
  updatePlatformSubscription,
} from '../services/platformAdminService';

const ROLES = ['owner', 'manager', 'buyer', 'shipping_officer', 'accountant', 'viewer'];
const STATUSES = ['trialing', 'active', 'past_due', 'suspended', 'canceled'];

function Metric({ icon: Icon, label, value, tone = 'teal' }) {
  const tones = {
    teal: 'bg-teal-50 text-teal-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-slate-100 text-slate-700',
  };
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`mb-4 grid h-11 w-11 place-items-center rounded-xl ${tones[tone]}`}><Icon className="h-6 w-6" /></div><p className="text-sm text-slate-500">{label}</p><strong className="mt-1 block text-3xl font-black text-slate-900" dir="ltr">{value}</strong></article>;
}

function SubscriptionEditor({ organization, plans, labels, onSaved }) {
  const current = organization.subscription;
  const [planId, setPlanId] = useState(current?.plan_id || 'trial');
  const [status, setStatus] = useState(current?.status || 'trialing');
  const [periodEnd, setPeriodEnd] = useState(current?.current_period_end?.slice(0, 10) || '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updatePlatformSubscription({ organizationId: organization.id, planId, status, periodEnd });
      toast.success(labels.subscriptionSaved);
      await onSaved();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="mb-5 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-700"><HiOutlineCreditCard className="h-5 w-5" /></div><div><h3 className="font-black text-slate-900">{labels.subscriptionControl}</h3><p className="text-xs text-slate-500">{labels.subscriptionHelp}</p></div></div><div className="grid gap-4 md:grid-cols-3"><label className="text-sm font-bold text-slate-600">{labels.plan}<select value={planId} onChange={(event) => setPlanId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal">{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name_ar} / {plan.name_en}</option>)}</select></label><label className="text-sm font-bold text-slate-600">{labels.status}<select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-normal">{STATUSES.map((item) => <option key={item} value={item}>{labels.statuses[item]}</option>)}</select></label><label className="text-sm font-bold text-slate-600">{labels.periodEnd}<input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal" /></label></div><button disabled={saving} onClick={save} className="mt-5 rounded-xl bg-teal-600 px-5 py-2.5 font-bold text-white hover:bg-teal-700 disabled:opacity-50">{saving ? labels.saving : labels.saveSubscription}</button></section>;
}

function MembersEditor({ organization, labels, onSaved }) {
  const [savingId, setSavingId] = useState(null);

  async function save(member, role, isActive) {
    setSavingId(member.user_id);
    try {
      await updatePlatformMember({ organizationId: organization.id, userId: member.user_id, role, isActive });
      toast.success(labels.permissionSaved);
      await onSaved();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingId(null);
    }
  }

  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-4"><h3 className="font-black text-slate-900">{labels.permissions}</h3><p className="mt-1 text-xs text-slate-500">{labels.permissionsHelp}</p></div><div className="overflow-x-auto"><table className="w-full min-w-[720px]"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3 text-start">{labels.member}</th><th className="px-4 py-3 text-start">{labels.userId}</th><th className="px-4 py-3 text-start">{labels.role}</th><th className="px-4 py-3 text-start">{labels.access}</th><th className="px-4 py-3 text-start">{labels.action}</th></tr></thead><tbody className="divide-y divide-slate-100">{organization.members.map((member) => <MemberRow key={member.user_id} member={member} labels={labels} saving={savingId === member.user_id} onSave={save} />)}</tbody></table></div></section>;
}

function MemberRow({ member, labels, saving, onSave }) {
  const [role, setRole] = useState(member.role);
  const [isActive, setIsActive] = useState(member.is_active);
  return <tr><td className="px-4 py-3"><strong className="block text-sm text-slate-800">{member.profile?.display_name || labels.unnamed}</strong><small className="text-slate-400">{member.profile?.phone || '—'}</small></td><td className="px-4 py-3 font-mono text-xs text-slate-500" dir="ltr">{member.user_id.slice(0, 8)}…</td><td className="px-4 py-3"><select value={role} onChange={(event) => setRole(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm">{ROLES.map((item) => <option key={item} value={item}>{labels.roles[item]}</option>)}</select></td><td className="px-4 py-3"><label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="h-4 w-4 accent-teal-600" />{isActive ? labels.active : labels.disabled}</label></td><td className="px-4 py-3"><button disabled={saving} onClick={() => onSave(member, role, isActive)} className="rounded-lg border border-teal-200 px-3 py-2 text-sm font-bold text-teal-700 hover:bg-teal-50 disabled:opacity-50">{saving ? labels.saving : labels.save}</button></td></tr>;
}

export default function PlatformAdminPage() {
  const { lang } = useLanguage();
  const [data, setData] = useState({ organizations: [], plans: [], pendingPayments: [] });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const labels = lang === 'ar' ? {
    eyebrow: 'لوحة مالك النظام', title: 'إدارة المنصة', subtitle: 'مركز التحكم في حسابات المشتركين والباقات والاشتراكات وصلاحيات المستخدمين.', refresh: 'تحديث', accounts: 'حسابات الشركات', activeSubscriptions: 'اشتراكات سارية', needsAttention: 'تحتاج متابعة', pendingPayments: 'دفعات بانتظار الاعتماد', search: 'ابحث باسم الحساب أو المعرّف...', noAccounts: 'لا توجد حسابات مطابقة', members: 'مستخدم', open: 'إدارة', disableAccount: 'إيقاف الحساب', enableAccount: 'تفعيل الحساب', subscriptionControl: 'الاشتراك والباقة', subscriptionHelp: 'تغيير إداري يدوي يسجل في سجل التدقيق ولا يمثل سدادًا ماليًا.', plan: 'الباقة', status: 'حالة الاشتراك', periodEnd: 'نهاية الفترة', saveSubscription: 'حفظ الاشتراك', subscriptionSaved: 'تم تحديث الاشتراك', saving: 'جارٍ الحفظ...', permissions: 'المستخدمون والصلاحيات', permissionsHelp: 'إدارة أدوار أعضاء الحساب مع حماية آخر مالك نشط.', member: 'المستخدم', userId: 'معرّف المستخدم', role: 'الدور', access: 'الوصول', action: 'الإجراء', save: 'حفظ', active: 'نشط', disabled: 'موقوف', permissionSaved: 'تم تحديث الصلاحية', unnamed: 'مستخدم دون اسم', organizationSaved: 'تم تحديث حالة الحساب', statuses: { trialing: 'تجريبي', active: 'نشط', past_due: 'متأخر', suspended: 'موقوف', canceled: 'ملغى' }, roles: { owner: 'مالك الحساب', manager: 'مدير', buyer: 'مشتريات', shipping_officer: 'شحن', accountant: 'محاسب', viewer: 'مشاهدة' },
  } : {
    eyebrow: 'System owner console', title: 'Platform administration', subtitle: 'Control subscriber accounts, plans, subscriptions and user permissions.', refresh: 'Refresh', accounts: 'Company accounts', activeSubscriptions: 'Current subscriptions', needsAttention: 'Needs attention', pendingPayments: 'Payments awaiting approval', search: 'Search by account name or identifier...', noAccounts: 'No matching accounts', members: 'users', open: 'Manage', disableAccount: 'Disable account', enableAccount: 'Enable account', subscriptionControl: 'Subscription and plan', subscriptionHelp: 'Manual administrative change is audited and does not represent a financial payment.', plan: 'Plan', status: 'Subscription status', periodEnd: 'Period end', saveSubscription: 'Save subscription', subscriptionSaved: 'Subscription updated', saving: 'Saving...', permissions: 'Users and permissions', permissionsHelp: 'Manage account member roles while protecting the last active owner.', member: 'User', userId: 'User ID', role: 'Role', access: 'Access', action: 'Action', save: 'Save', active: 'Active', disabled: 'Disabled', permissionSaved: 'Permission updated', unnamed: 'Unnamed user', organizationSaved: 'Account status updated', statuses: { trialing: 'Trialing', active: 'Active', past_due: 'Past due', suspended: 'Suspended', canceled: 'Canceled' }, roles: { owner: 'Account owner', manager: 'Manager', buyer: 'Buyer', shipping_officer: 'Shipping', accountant: 'Accountant', viewer: 'Viewer' },
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await loadPlatformAdminDashboard();
      setData(next);
      setSelectedId((current) => current || next.organizations[0]?.id || null);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.organizations.filter((organization) => !needle || organization.name.toLowerCase().includes(needle) || organization.slug.toLowerCase().includes(needle));
  }, [data.organizations, query]);
  const selected = data.organizations.find((item) => item.id === selectedId) ?? filtered[0] ?? null;
  const activeCount = data.organizations.filter((item) => ['trialing', 'active'].includes(item.subscription?.status)).length;
  const attentionCount = data.organizations.filter((item) => ['past_due', 'suspended'].includes(item.subscription?.status) || !item.is_active).length;

  async function toggleOrganization(organization) {
    try {
      await updatePlatformOrganization({ organizationId: organization.id, isActive: !organization.is_active });
      toast.success(labels.organizationSaved);
      await refresh();
    } catch (error) {
      toast.error(error.message);
    }
  }

  return <div className="space-y-6"><header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-teal-600">{labels.eyebrow}</p><h1 className="mt-2 text-3xl font-black text-slate-950">{labels.title}</h1><p className="mt-2 max-w-3xl text-sm text-slate-500">{labels.subtitle}</p></div><button onClick={refresh} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-bold text-slate-700"><HiOutlineRefresh className={loading ? 'animate-spin' : ''} />{labels.refresh}</button></header><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={HiOutlineOfficeBuilding} label={labels.accounts} value={data.organizations.length} /><Metric icon={HiOutlineShieldCheck} label={labels.activeSubscriptions} value={activeCount} tone="blue" /><Metric icon={HiOutlineExclamation} label={labels.needsAttention} value={attentionCount} tone="amber" /><Metric icon={HiOutlineCreditCard} label={labels.pendingPayments} value={data.pendingPayments.length} tone="slate" /></section><div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]"><aside className="self-start overflow-hidden rounded-2xl border border-slate-200 bg-white xl:sticky xl:top-24"><div className="border-b border-slate-100 p-4"><div className="relative"><HiOutlineSearch className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.search} className="w-full rounded-xl border border-slate-300 py-2.5 ps-10 pe-3 text-sm" /></div></div><div className="max-h-[620px] divide-y divide-slate-100 overflow-y-auto">{filtered.length === 0 ? <p className="p-8 text-center text-sm text-slate-400">{labels.noAccounts}</p> : filtered.map((organization) => <button key={organization.id} onClick={() => setSelectedId(organization.id)} className={`w-full p-4 text-start transition ${selected?.id === organization.id ? 'bg-teal-50' : 'hover:bg-slate-50'}`}><div className="flex items-start justify-between gap-3"><span><strong className="block text-sm text-slate-900">{organization.name}</strong><small className="mt-1 block font-mono text-slate-400" dir="ltr">{organization.slug}</small></span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${organization.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{organization.is_active ? labels.active : labels.disabled}</span></div><div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>{organization.subscription?.plans?.name_ar || organization.subscription?.plan_id || '—'}</span><span><HiOutlineUsers className="inline" /> {organization.members.length} {labels.members}</span></div></button>)}</div></aside>{selected && <main className="space-y-5"><section className="rounded-2xl bg-[#0d1b2f] p-6 text-white"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><p className="text-xs uppercase tracking-[0.18em] text-teal-300">{selected.slug}</p><h2 className="mt-2 text-2xl font-black">{selected.name}</h2><p className="mt-2 text-sm text-slate-400">{selected.members.length} {labels.members} · {selected.default_currency} · {selected.timezone}</p></div><button onClick={() => toggleOrganization(selected)} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${selected.is_active ? 'border border-red-400/40 bg-red-400/10 text-red-200' : 'bg-emerald-500 text-white'}`}>{selected.is_active ? labels.disableAccount : labels.enableAccount}</button></div></section><SubscriptionEditor key={`${selected.id}:${selected.subscription?.updated_at}`} organization={selected} plans={data.plans} labels={labels} onSaved={refresh} /><MembersEditor key={`${selected.id}:${selected.members.map((item) => `${item.user_id}:${item.role}:${item.is_active}`).join('|')}`} organization={selected} labels={labels} onSaved={refresh} /></main>}</div></div>;
}
