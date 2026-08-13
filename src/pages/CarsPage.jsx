import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  subscribeToCars,
  addCar,
  updateCar,
  deleteCar,
  calcPurchaseSubTotal,
  calcShippingSubTotal,
  calcPurchaseRemaining,
  calcShippingRemaining,
} from '../services/carService';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch, HiOutlineX, HiOutlineEye } from 'react-icons/hi';
import CarFormModal from '../components/cars/CarFormModal';
import CarDetailModal from '../components/cars/CarDetailModal';
import { useOrganization } from '../context/OrganizationContext';

const STATUS_COLORS = {
  purchased: 'bg-yellow-100 text-yellow-800',
  purchasePaid: 'bg-blue-100 text-blue-800',
  atPort: 'bg-purple-100 text-purple-800',
  loaded: 'bg-indigo-100 text-indigo-800',
  inTransit: 'bg-orange-100 text-orange-800',
  arrived: 'bg-green-100 text-green-800',
};

export default function CarsPage() {
  const { t, lang } = useLanguage();
  const { organizationId } = useOrganization();
  const [cars, setCars] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingCar, setEditingCar] = useState(null);
  const [viewingCar, setViewingCar] = useState(null);

  useEffect(() => {
    const unsub = subscribeToCars(organizationId, setCars, (error) => toast.error(error.message));
    return unsub;
  }, [organizationId]);

  const statusLabels = {
    purchased: t.purchased,
    purchasePaid: t.purchasePaid,
    atPort: t.atPort,
    loaded: t.loaded,
    inTransit: t.inTransit,
    arrived: t.arrived,
  };

  const filtered = cars.filter((car) => {
    const matchSearch =
      !searchTerm ||
      car.yearMakeModel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.vin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car.owner?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || car.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSave = async (data, isEdit) => {
    try {
      if (isEdit) {
        await updateCar(organizationId, editingCar.id, data);
        toast.success(t.carUpdated);
      } else {
        await addCar(organizationId, data);
        toast.success(t.carAdded);
      }
      setShowForm(false);
      setEditingCar(null);
    } catch (err) {
      if (err.message === 'VIN_EXISTS') {
        toast.error(t.vinExists);
      } else if (['trial_expired', 'subscription_expired', 'past_due', 'suspended', 'canceled', 'vehicle_limit_reached', 'subscription_missing', 'organization_inactive', 'subscription_blocked'].includes(err.message)) {
        toast.error(t.subscriptionBlocked);
      } else {
        toast.error(err.message);
      }
    }
  };

  const handleDelete = async (car) => {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      await deleteCar(organizationId, car.id);
      toast.success(t.carDeleted);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleEdit = (car) => {
    setEditingCar(car);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-800">{t.cars}</h1>
        <button
          onClick={() => {
            setEditingCar(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition font-medium"
        >
          <HiOutlinePlus className="w-5 h-5" />
          {t.addCar}
        </button>
      </div>

      {/* Search & Filter */}
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
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute top-3 end-3">
              <HiOutlineX className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
        >
          <option value="all">{t.all}</option>
          {Object.entries(statusLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t.yearMakeModel}</th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t.vin}</th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t.owner}</th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t.status}</th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t.remaining} ({t.cars})</th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase">{t.shippingRemaining}</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-12 text-gray-400">
                  {t.noData}
                </td>
              </tr>
            ) : (
              filtered.map((car) => (
                <tr key={car.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-gray-800 text-sm">{car.yearMakeModel}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono" dir="ltr">{car.vin}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{car.owner}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[car.status || 'purchased']}`}>
                      {statusLabels[car.status || 'purchased']}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold" dir="ltr">
                    <span className={calcPurchaseRemaining(car) > 0 ? 'text-red-600' : 'text-green-600'}>
                      ${calcPurchaseRemaining(car).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold" dir="ltr">
                    <span className={calcShippingRemaining(car) > 0 ? 'text-red-600' : 'text-green-600'}>
                      ${calcShippingRemaining(car).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setViewingCar(car)} className="p-1.5 rounded-lg hover:bg-teal-50 text-teal-600" title={t.details}>
                        <HiOutlineEye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEdit(car)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title={t.edit}>
                        <HiOutlinePencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(car)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title={t.delete}>
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* فوتر الجدول */}
      <div className="text-sm text-gray-500">
        {lang === 'ar' ? `عرض ${filtered.length} من ${cars.length} سيارة` : `Showing ${filtered.length} of ${cars.length} cars`}
      </div>

      {/* Modals */}
      {showForm && (
        <CarFormModal
          car={editingCar}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingCar(null); }}
        />
      )}
      {viewingCar && (
        <CarDetailModal
          car={viewingCar}
          onClose={() => setViewingCar(null)}
        />
      )}
    </div>
  );
}
