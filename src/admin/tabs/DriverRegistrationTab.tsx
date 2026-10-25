import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAdmin } from '../context/AdminContext';
import { CascadingFilter } from '../../components/CascadingFilter';

export const DriverRegistrationTab: React.FC = () => {
  const { vehicleTypes, logAction } = useAdmin();

  const [driverForm, setDriverForm] = useState({
    name: '',
    phone: '',
    vehicleModel: '',
    vehicleRegNumber: '',
    vehicleType: '',
    division: '',
    district: '',
    upazila: '',
    union: '',
    ward: '',
    capacity: '',
    seatingCapacity: '',
    isCovered: false,
    vehicleLength: '',
    autoPay: false,
    isAirAmbulance: false,
    isSelfDriving: false,
  });

  const [submittingDriver, setSubmittingDriver] = useState(false);
  const [driverSuccess, setDriverSuccess] = useState(false);

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingDriver(true);
    try {
      // Check for duplicate phone number
      const q = query(collection(db, 'drivers'), where('phone', '==', driverForm.phone.trim()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const existingDriver = querySnapshot.docs[0].data();
        alert(
          `এই নাম্বার এ Registration আছে তার নাম: ${existingDriver.name}। আপনি Registration করতে চাইলে আপনাকে অন্য কোন নাম্বার ব্যবহার করতে হবে।`
        );
        setSubmittingDriver(false);
        return;
      }

      const vType = vehicleTypes.find((v) => v.name === driverForm.vehicleType);
      const isUnlimited = vType && vType.monthlyFee === 0;

      await addDoc(collection(db, 'drivers'), {
        ...driverForm,
        phone: driverForm.phone.trim(),
        isActive: true,
        expiryDate: isUnlimited ? new Date('2099-12-31') : new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await logAction('driver_register', `Registered new driver ${driverForm.name} (${driverForm.phone})`);

      setDriverSuccess(true);
      setDriverForm((prev) => ({
        ...prev,
        name: '',
        phone: '',
        vehicleModel: '',
        vehicleRegNumber: '',
        capacity: '',
        seatingCapacity: '',
        vehicleLength: '',
        isCovered: false,
        isAirAmbulance: false,
        isSelfDriving: false,
      }));
      setTimeout(() => setDriverSuccess(false), 3000);
    } catch (err) {
      console.error('Error adding driver:', err);
      alert('Failed to register driver.');
    } finally {
      setSubmittingDriver(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900">Register New Driver</h3>
        <p className="text-xs text-gray-500 mt-0.5">Add a new driver to the directory. They will be active immediately.</p>
      </div>

      {driverSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-100 text-green-700 rounded-2xl font-semibold text-sm">
          ✓ Driver registered successfully!
        </div>
      )}

      <form onSubmit={handleAddDriver} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Full Name</label>
            <input
              required
              type="text"
              value={driverForm.name}
              onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary focus:bg-white text-sm transition-all"
              placeholder="e.g. Rahim Uddin"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Phone Number</label>
            <input
              required
              type="tel"
              value={driverForm.phone}
              onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary focus:bg-white text-sm transition-all"
              placeholder="01XXXXXXXXX"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Vehicle Model</label>
            <input
              required
              type="text"
              value={driverForm.vehicleModel}
              onChange={(e) => setDriverForm({ ...driverForm, vehicleModel: e.target.value })}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary focus:bg-white text-sm transition-all"
              placeholder="e.g. Toyota Noah 2018"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Vehicle Reg Number</label>
            <input
              required
              type="text"
              value={driverForm.vehicleRegNumber}
              onChange={(e) => setDriverForm({ ...driverForm, vehicleRegNumber: e.target.value })}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary focus:bg-white text-sm transition-all"
              placeholder="e.g. Dhaka Metro-Ga 12-3456"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Location & Vehicle Type</label>
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
            <CascadingFilter
              onFilterChange={(newFilters) =>
                setDriverForm((prev: any) => {
                  if (prev.vehicleType !== newFilters.vehicleType) {
                    return {
                      ...prev,
                      ...newFilters,
                      isCovered: false,
                      isAirAmbulance: false,
                      isSelfDriving: false,
                    };
                  }
                  return { ...prev, ...newFilters };
                })
              }
            />
          </div>
        </div>

        {/* Dynamic vehicle conditional fields */}
        {driverForm.vehicleType?.toLowerCase() === 'motorcycle' && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">ড্রাইভিং অপশন (Driving Option)</label>
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <input
                type="checkbox"
                id="isSelfDrivingAdd"
                checked={driverForm.isSelfDriving}
                onChange={(e) => setDriverForm({ ...driverForm, isSelfDriving: e.target.checked })}
                className="w-4 h-4 text-primary rounded focus:ring-primary"
              />
              <label htmlFor="isSelfDrivingAdd" className="text-sm font-medium text-gray-700 cursor-pointer">
                উইথআউট ড্রাইভার রেন্ট বা সেলফ ড্রাইভিং? (Rent without driver?)
              </label>
            </div>
          </div>
        )}

        {(driverForm.vehicleType?.toLowerCase() === 'truck' || driverForm.vehicleType?.toLowerCase() === 'pickup') && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">কভার স্ট্যাটাস</label>
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isCoveredAdd"
                  checked={driverForm.isCovered}
                  onChange={(e) => setDriverForm({ ...driverForm, isCovered: e.target.checked })}
                  className="w-4 h-4 text-primary rounded focus:ring-primary"
                />
                <label htmlFor="isCoveredAdd" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Covered?
                </label>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">গাড়ি কত ফিট লম্বা?</label>
              <input
                required
                type="text"
                value={driverForm.vehicleLength || ''}
                onChange={(e) => setDriverForm({ ...driverForm, vehicleLength: e.target.value })}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary text-sm"
                placeholder="যেমন: ৭ ফিট, ১২ ফিট"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">ধারন ক্ষমতা (Capacity)</label>
              <input
                required
                type="text"
                value={driverForm.capacity || ''}
                onChange={(e) => setDriverForm({ ...driverForm, capacity: e.target.value })}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary text-sm"
                placeholder="যেমন: ১ টন, ২ টন"
              />
            </div>
          </div>
        )}

        {(driverForm.vehicleType?.toLowerCase() === 'bus' ||
          driverForm.vehicleType?.toLowerCase() === 'minibus' ||
          driverForm.vehicleType?.toLowerCase() === 'helicopter') && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">আসন সংখ্যা (Seating Capacity)</label>
            <input
              required
              type="text"
              value={driverForm.seatingCapacity || ''}
              onChange={(e) => setDriverForm({ ...driverForm, seatingCapacity: e.target.value })}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary text-sm"
              placeholder="যেমন: ২৫ জন, ৪০ জন"
            />
          </div>
        )}

        {driverForm.vehicleType?.toLowerCase() === 'helicopter' && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <input
              type="checkbox"
              id="isAirAmbulanceAdd"
              checked={driverForm.isAirAmbulance}
              onChange={(e) => setDriverForm({ ...driverForm, isAirAmbulance: e.target.checked })}
              className="w-4 h-4 text-primary rounded focus:ring-primary"
            />
            <label htmlFor="isAirAmbulanceAdd" className="text-sm font-medium text-gray-700 cursor-pointer">
              এয়ার অ্যাম্বুলেন্স হিসেবে ব্যবহৃত হবে? (Air Ambulance)
            </label>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <input
            type="checkbox"
            id="autoPayAdd"
            checked={driverForm.autoPay}
            onChange={(e) => setDriverForm({ ...driverForm, autoPay: e.target.checked })}
            className="w-4 h-4 text-primary rounded focus:ring-primary"
          />
          <label htmlFor="autoPayAdd" className="text-sm font-medium text-gray-700 cursor-pointer">
            Auto Pay via Automated Payment Gateway (অটো পে)
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submittingDriver}
            className="bg-primary text-white px-8 py-3.5 rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 text-sm shadow-sm"
          >
            {submittingDriver ? 'Registering...' : 'Register Driver'}
          </button>
        </div>
      </form>
    </div>
  );
};
export default DriverRegistrationTab;
