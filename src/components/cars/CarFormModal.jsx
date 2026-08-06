import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { HiOutlineX } from 'react-icons/hi';

const INITIAL_STATE = {
  yearMakeModel: '',
  vin: '',
  auction: 'Copart',
  lotStock: '',
  buyingLocation: '',
  buyingDate: '',
  wireDate: '',
  owner: '',
  buyingPrice: '',
  otherFees: '',
  notes: '',
  // Shipping
  destination: '',
  destinationType: '',
  shippingPort: '',
  containerNumber: '',
  shippingLine: '',
  transitArrivalDate: '',
  shippingWireDate: '',
  inlandPrice: '',
  oceanPrice: '',
  // Financial
  purchasePaid: '',
  shippingPaid: '',
  status: 'purchased',
};

export default function CarFormModal({ car, onSave, onClose }) {
  const { t } = useLanguage();
  const isEdit = !!car;
  const [form, setForm] = useState(car ? { ...INITIAL_STATE, ...car } : INITIAL_STATE);
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.vin.length !== 17) {
      return;
    }
    setSaving(true);
    await onSave(form, isEdit);
    setSaving(false);
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">
            {isEdit ? t.editCar : t.addCar}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-6">
          {/* === قسم بيانات السيارة === */}
          <div>
            <h3 className="text-lg font-semibold text-teal-700 mb-3 pb-2 border-b border-teal-100">
              🚗 {t.carDetails}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelClass}>{t.yearMakeModel} *</label>
                <input name="yearMakeModel" value={form.yearMakeModel} onChange={handleChange} required className={inputClass} placeholder="2019 HYUNDAI SANTA FE SEL 2.4L" />
              </div>
              <div>
                <label className={labelClass}>{t.vin} *</label>
                <input name="vin" value={form.vin} onChange={handleChange} required maxLength={17} minLength={17} className={inputClass} placeholder="5NMS3CAD4KH132040" dir="ltr" disabled={isEdit} />
                {form.vin && form.vin.length !== 17 && (
                  <p className="text-red-500 text-xs mt-1">{t.invalidVin}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>{t.auction}</label>
                <select name="auction" value={form.auction} onChange={handleChange} className={inputClass}>
                  <option value="Copart">Copart</option>
                  <option value="IAAI">IAAI</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>{t.lotStock}</label>
                <input name="lotStock" value={form.lotStock} onChange={handleChange} className={inputClass} dir="ltr" />
              </div>
              <div>
                <label className={labelClass}>{t.buyingLocation}</label>
                <input name="buyingLocation" value={form.buyingLocation} onChange={handleChange} className={inputClass} placeholder="IN - INDIANAPOLIS" />
              </div>
              <div>
                <label className={labelClass}>{t.buyingDate}</label>
                <input name="buyingDate" type="date" value={form.buyingDate} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t.wireDate}</label>
                <input name="wireDate" type="date" value={form.wireDate} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t.owner} *</label>
                <input name="owner" value={form.owner} onChange={handleChange} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t.status}</label>
                <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
                  <option value="purchased">{t.purchased}</option>
                  <option value="purchasePaid">{t.purchasePaid}</option>
                  <option value="atPort">{t.atPort}</option>
                  <option value="loaded">{t.loaded}</option>
                  <option value="inTransit">{t.inTransit}</option>
                  <option value="arrived">{t.arrived}</option>
                </select>
              </div>
            </div>
          </div>

          {/* === قسم المالي (الشراء) === */}
          <div>
            <h3 className="text-lg font-semibold text-green-700 mb-3 pb-2 border-b border-green-100">
              💰 {t.buyingPrice}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>{t.buyingPrice} ($)</label>
                <input name="buyingPrice" type="number" step="0.01" value={form.buyingPrice} onChange={handleChange} className={inputClass} dir="ltr" />
              </div>
              <div>
                <label className={labelClass}>{t.commission} ($)</label>
                <input value="100" disabled className={`${inputClass} bg-gray-100`} dir="ltr" />
              </div>
              <div>
                <label className={labelClass}>{t.otherFees} ($)</label>
                <input name="otherFees" type="number" step="0.01" value={form.otherFees} onChange={handleChange} className={inputClass} dir="ltr" />
              </div>
              <div>
                <label className={labelClass}>{t.paid} ($)</label>
                <input name="purchasePaid" type="number" step="0.01" value={form.purchasePaid} onChange={handleChange} className={inputClass} dir="ltr" />
              </div>
            </div>
          </div>

          {/* === قسم الشحن === */}
          <div>
            <h3 className="text-lg font-semibold text-blue-700 mb-3 pb-2 border-b border-blue-100">
              🚢 {t.shipping}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t.destination}</label>
                <input name="destination" value={form.destination} onChange={handleChange} className={inputClass} placeholder="بنغازي" />
              </div>
              <div>
                <label className={labelClass}>{t.destinationType}</label>
                <input name="destinationType" value={form.destinationType} onChange={handleChange} className={inputClass} placeholder="رباعي / ثلاثي" />
              </div>
              <div>
                <label className={labelClass}>{t.shippingPort}</label>
                <select name="shippingPort" value={form.shippingPort} onChange={handleChange} className={inputClass}>
                  <option value="">--</option>
                  <option value="NJ">{t.portNJ}</option>
                  <option value="GA">{t.portGA}</option>
                  <option value="TX">{t.portTX}</option>
                  <option value="CA">{t.portCA}</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>{t.shippingLine}</label>
                <select name="shippingLine" value={form.shippingLine} onChange={handleChange} className={inputClass}>
                  <option value="">--</option>
                  <option value="Arkas">Arkas</option>
                  <option value="MSC">MSC</option>
                  <option value="Maersk">Maersk</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>{t.containerNumber}</label>
                <input name="containerNumber" value={form.containerNumber} onChange={handleChange} className={inputClass} dir="ltr" />
              </div>
              <div>
                <label className={labelClass}>{t.transitArrival}</label>
                <input name="transitArrivalDate" type="date" value={form.transitArrivalDate} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>{t.inlandPrice} ($)</label>
                <input name="inlandPrice" type="number" step="0.01" value={form.inlandPrice} onChange={handleChange} className={inputClass} dir="ltr" />
              </div>
              <div>
                <label className={labelClass}>{t.oceanPrice} ($)</label>
                <input name="oceanPrice" type="number" step="0.01" value={form.oceanPrice} onChange={handleChange} className={inputClass} dir="ltr" />
              </div>
              <div>
                <label className={labelClass}>{t.shippingPaid} ($)</label>
                <input name="shippingPaid" type="number" step="0.01" value={form.shippingPaid} onChange={handleChange} className={inputClass} dir="ltr" />
              </div>
            </div>
          </div>

          {/* ملاحظات */}
          <div>
            <label className={labelClass}>{t.notes}</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows="3" className={inputClass} />
          </div>

          {/* أزرار */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium">
              {t.cancel}
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 font-medium disabled:opacity-50">
              {saving ? t.loading : t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
