import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { subscribeToCars } from '../services/carService';
import { HiOutlineCube, HiOutlineTruck } from 'react-icons/hi';
import { useOrganization } from '../context/OrganizationContext';
import toast from 'react-hot-toast';

export default function ContainersPage() {
  const { t } = useLanguage();
  const { organizationId } = useOrganization();
  const [cars, setCars] = useState([]);

  useEffect(() => {
    const unsub = subscribeToCars(organizationId, setCars, (error) => toast.error(error.message));
    return unsub;
  }, [organizationId]);

  // تجميع السيارات حسب رقم الحاوية
  const containerMap = {};
  cars.forEach((car) => {
    if (car.containerNumber) {
      if (!containerMap[car.containerNumber]) {
        containerMap[car.containerNumber] = {
          number: car.containerNumber,
          shippingLine: car.shippingLine,
          shippingPort: car.shippingPort,
          destination: car.destination,
          transitArrivalDate: car.transitArrivalDate,
          cars: [],
        };
      }
      containerMap[car.containerNumber].cars.push(car);
    }
  });

  const containers = Object.values(containerMap);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">{t.containers}</h1>

      {containers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <HiOutlineCube className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">{t.noData}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {containers.map((container) => (
            <div key={container.number} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <HiOutlineCube className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800" dir="ltr">{container.number}</h3>
                  <p className="text-sm text-gray-500">
                    {container.shippingLine} • {container.shippingPort} → {container.destination}
                  </p>
                </div>
              </div>

              {container.transitArrivalDate && (
                <div className="text-xs text-gray-500 mb-3">
                  {t.transitArrival}: <span dir="ltr">{container.transitArrivalDate}</span>
                </div>
              )}

              <div className="border-t border-gray-100 pt-3">
                <p className="text-sm font-medium text-gray-600 mb-2">
                  {t.carsInContainer} ({container.cars.length})
                </p>
                <div className="space-y-2">
                  {container.cars.map((car) => (
                    <div key={car.id} className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded-lg">
                      <HiOutlineTruck className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-800">{car.yearMakeModel}</span>
                      <span className="text-gray-400 font-mono text-xs ms-auto" dir="ltr">{car.vin?.slice(-6)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
