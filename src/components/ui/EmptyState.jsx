import { HiOutlineTruck } from 'react-icons/hi';

export default function EmptyState({ title, description, action }) {
  return <div className="grid min-h-52 place-items-center px-6 py-10 text-center">
    <div><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400"><HiOutlineTruck className="h-7 w-7" /></div><h3 className="mt-4 font-black text-slate-800">{title}</h3>{description && <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">{description}</p>}{action && <div className="mt-5">{action}</div>}</div>
  </div>;
}
