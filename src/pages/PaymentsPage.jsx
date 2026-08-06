import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { subscribeToCars, calcPurchaseRemaining, calcShippingRemaining } from '../services/carService';
import { HiOutlineCreditCard, HiOutlineSearch } from 'react-icons/hi';

export default function PaymentsPage() {
  const { t, lang } = useLanguage();
  const [cars, setCars] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    const unsub = subscribeToCars(setCars);
    return unsub;
  }, []);

  const fmt = (n) => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const filtered = cars.filter((car) => {
    const match =
      !searchTerm ||
      car.yearMakeModel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.vin?.toLowerCase().includes(searchTerm.toLowerCase());

    if (typeFilter === 'purchaseRemaining') return match && calcPurchaseRemaining(car) > 0;
    if (typeFilter === 'shippingRemaining') return match && calcShippingRemaining(car) > 0;
    if (typeFilter === 'fullyPaid') return match && calcPurchaseRemaining(car) === 0 && calcShippingRemaining(car) === 0;
    return match;
  });

  const totalPurchaseRemaining = cars.reduce((s, c) => s + calcPurchaseRemaining(c), 0);
  const totalShippingRemaining = cars.reduce((s, c) => s + calcShippingRemaining(c), 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">{t.payments}</h1>

      {/* ملخص مالي */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
          <p className="text-sm text-red-600">{t.totalRemainingPurchase}</p>
          <p className="text-2xl font-bold text-red-700 mt-1" dir="ltr">{fmt(totalPurchaseRemaining)}</p>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-center">
          <p className="text-sm text-orange-600">{t.totalRemainingShipping}</p>
          <p className="text-2xl font-bold text-orange-700 mt-1" dir="ltr">{fmt(totalShippingRemaining)}</p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
          <p className="text-sm text-purple-600">{t.total}</p>
          <p className="text-2xl font-bold text-purple-700 mt-1" dir="ltr">{fmt(totalPurchaseRemaining + totalShippingRemaining)}</p>
        </div>
      </div>

      {/* بحث وفلتر */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <HiOutlineSearch className="absolute top-3 start-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`${t.search}...`}
            className="w-full ps-10 pe-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
        >
          <option value="all">{t.all}</option>
          <option value="purchaseRemaining">{t.totalRemainingPurchase}</option>
          <option value="shippingRemaining">{t.totalRemainingShipping}</option>
          <option value="fullyPaid">{lang === 'ar' ? 'مدفوع بالكامل' : 'Fully Paid'}</option>
        </select>
      </div>

      {/* الجدول */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t.yearMakeModel}</th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t.vin}</th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t.owner}</th>
              <th className="px-4 py-3 text-end text-xs font-semibold text-gray-500 uppercase">{t.remaining} (🛒)</th>
              <th className="px-4 py-3 text-end text-xs font-semibold text-gray-500 uppercase">{t.shippingRemaining} (🚢)</th>
              <th className="px-4 py-3 text-end text-xs font-semibold text-gray-500 uppercase">{t.total}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-12 text-gray-400">{t.noData}</td>
              </tr>
            ) : (
              filtered.map((car) => {
                const pr = calcPurchaseRemaining(car);
                const sr = calcShippingRemaining(car);
                return (
                  <tr key={car.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{car.yearMakeModel}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono" dir="ltr">{car.vin}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{car.owner}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-end" dir="ltr">
                      <span className={pr > 0 ? 'text-red-600' : 'text-green-600'}>{fmt(pr)}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-end" dir="ltr">
                      <span className={sr > 0 ? 'text-red-600' : 'text-green-600'}>{fmt(sr)}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-end" dir="ltr">
                      <span className={pr + sr > 0 ? 'text-red-700' : 'text-green-700'}>{fmt(pr + sr)}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
