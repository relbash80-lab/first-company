import { useLanguage } from '../../context/LanguageContext';
import { calcPurchaseSubTotal, calcShippingSubTotal, calcPurchaseRemaining, calcShippingRemaining } from '../../services/carService';
import { HiOutlineX } from 'react-icons/hi';

function InfoRow({ label, value, dir, color }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-50">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-medium ${color || 'text-gray-800'}`} dir={dir}>
        {value || '—'}
      </span>
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

export default function CarDetailModal({ car, onClose }) {
  const { t } = useLanguage();

  const fmt = (n) => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const purchaseRemaining = calcPurchaseRemaining(car);
  const shippingRemaining = calcShippingRemaining(car);

  const statusLabels = {
    purchased: t.purchased,
    purchasePaid: t.purchasePaid,
    atPort: t.atPort,
    loaded: t.loaded,
    inTransit: t.inTransit,
    arrived: t.arrived,
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{car.yearMakeModel || t.incompleteVehicle}</h2>
            <p className="text-sm text-gray-500 font-mono mt-1" dir="ltr">{car.vin || '—'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* الحالة */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{t.status}:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[car.status || 'purchased']}`}>
              {statusLabels[car.status || 'purchased']}
            </span>
          </div>

          {/* بيانات السيارة */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-teal-700 mb-2">🚗 {t.carDetails}</h3>
            <InfoRow label={t.auction} value={car.auction} />
            <InfoRow label={t.lotStock} value={car.lotStock} dir="ltr" />
            <InfoRow label={t.buyingLocation} value={car.buyingLocation} />
            <InfoRow label={t.buyingDate} value={car.buyingDate} dir="ltr" />
            <InfoRow label={t.wireDate} value={car.wireDate} dir="ltr" />
            <InfoRow label={t.owner} value={car.owner} />
          </div>

          {/* المالي */}
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-green-700 mb-2">💰 {t.financialSummary}</h3>
            <InfoRow label={t.buyingPrice} value={fmt(car.buyingPrice)} dir="ltr" />
            <InfoRow label={t.commission} value={fmt(car.commission)} dir="ltr" />
            <InfoRow label={t.otherFees} value={fmt(car.otherFees)} dir="ltr" />
            <InfoRow label={t.subTotal} value={fmt(calcPurchaseSubTotal(car))} dir="ltr" color="text-gray-900 font-bold" />
            <InfoRow label={t.paid} value={fmt(car.purchasePaid)} dir="ltr" color="text-green-600" />
            <InfoRow label={t.remaining} value={fmt(purchaseRemaining)} dir="ltr" color={purchaseRemaining > 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'} />
          </div>

          {/* الشحن */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-700 mb-2">🚢 {t.shipping}</h3>
            <InfoRow label={t.destination} value={car.destination} />
            <InfoRow label={t.destinationType} value={car.destinationType} />
            <InfoRow label={t.shippingPort} value={car.shippingPort} />
            <InfoRow label={t.containerNumber} value={car.containerNumber} dir="ltr" />
            <InfoRow label={t.shippingLine} value={car.shippingLine} />
            <InfoRow label={t.transitArrival} value={car.transitArrivalDate} dir="ltr" />
            <InfoRow label={t.inlandPrice} value={fmt(car.inlandPrice)} dir="ltr" />
            <InfoRow label={t.oceanPrice} value={fmt(car.oceanPrice)} dir="ltr" />
            <InfoRow label={t.shippingSubTotal} value={fmt(calcShippingSubTotal(car))} dir="ltr" color="text-gray-900 font-bold" />
            <InfoRow label={t.shippingPaid} value={fmt(car.shippingPaid)} dir="ltr" color="text-green-600" />
            <InfoRow label={t.shippingRemaining} value={fmt(shippingRemaining)} dir="ltr" color={shippingRemaining > 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'} />
          </div>

          {/* ملاحظات */}
          {car.notes && (
            <div className="bg-amber-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-amber-700 mb-2">📝 {t.notes}</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{car.notes}</p>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium">
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}
