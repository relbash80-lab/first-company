import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { subscribeToCars, calcPurchaseRemaining, calcShippingRemaining } from '../services/carService';
import { HiOutlineTruck, HiOutlineCash, HiOutlineCube, HiOutlineExclamationCircle } from 'react-icons/hi';

function StatCard({ icon: Icon, label, value, color, isCurrency }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>
            {isCurrency ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : value}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('600', '100').replace('700', '100')}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );
}

const STATUS_COLORS = {
  purchased: 'bg-yellow-100 text-yellow-800',
  purchasePaid: 'bg-blue-100 text-blue-800',
  atPort: 'bg-purple-100 text-purple-800',
  loaded: 'bg-indigo-100 text-indigo-800',
  inTransit: 'bg-orange-100 text-orange-800',
  arrived: 'bg-green-100 text-green-800',
};

export default function DashboardPage() {
  const { t } = useLanguage();
  const [cars, setCars] = useState([]);

  useEffect(() => {
    const unsub = subscribeToCars(setCars);
    return unsub;
  }, []);

  const totalCars = cars.length;
  const totalPurchaseRemaining = cars.reduce((sum, c) => sum + calcPurchaseRemaining(c), 0);
  const totalShippingRemaining = cars.reduce((sum, c) => sum + calcShippingRemaining(c), 0);
  const carsNeedFollowUp = cars.filter(
    (c) => calcPurchaseRemaining(c) > 0 || calcShippingRemaining(c) > 0
  ).length;

  // عدد السيارات حسب الحالة
  const statusCounts = cars.reduce((acc, c) => {
    const s = c.status || 'purchased';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const statusLabels = {
    purchased: t.purchased,
    purchasePaid: t.purchasePaid,
    atPort: t.atPort,
    loaded: t.loaded,
    inTransit: t.inTransit,
    arrived: t.arrived,
  };

  const recentCars = cars.slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">{t.dashboard}</h1>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={HiOutlineTruck} label={t.totalCars} value={totalCars} color="text-teal-600" />
        <StatCard icon={HiOutlineCash} label={t.totalRemainingPurchase} value={totalPurchaseRemaining} color="text-red-600" isCurrency />
        <StatCard icon={HiOutlineCube} label={t.totalRemainingShipping} value={totalShippingRemaining} color="text-orange-600" isCurrency />
        <StatCard icon={HiOutlineExclamationCircle} label={t.carsNeedFollowUp} value={carsNeedFollowUp} color="text-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* نظرة عامة على الحالات */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{t.statusOverview}</h3>
          <div className="space-y-3">
            {Object.entries(statusLabels).map(([key, label]) => {
              const count = statusCounts[key] || 0;
              const pct = totalCars ? Math.round((count / totalCars) * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[key]}`}>
                      {label}
                    </span>
                    <span className="text-gray-600">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* آخر السيارات المضافة */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{t.recentCars}</h3>
          {recentCars.length === 0 ? (
            <p className="text-gray-400 text-center py-8">{t.noData}</p>
          ) : (
            <div className="space-y-3">
              {recentCars.map((car) => (
                <div
                  key={car.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{car.yearMakeModel}</p>
                    <p className="text-xs text-gray-500 font-mono" dir="ltr">{car.vin}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[car.status || 'purchased']}`}>
                    {statusLabels[car.status || 'purchased']}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
