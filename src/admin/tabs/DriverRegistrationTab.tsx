import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAdmin } from '../context/AdminContext';
import { CascadingFilter } from '../../components/CascadingFilter';

export const DriverRegistrationTab: React.FC = () => {
  const { vehicleTypes, globalSettings, logAction } = useAdmin();

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

  const selectedVehicleType = vehicleTypes.find((v) => (v.name && v.name.toLowerCase().trim() === (driverForm.vehicleType || '').toLowerCase().trim()) || (v.bnName && v.bnName.trim() === (driverForm.vehicleType || '').trim()));
  const isAllFree = globalSettings?.allVehiclesFree === true;

  const getVehicleRates = (v: any) => {
    if (!v) return { monthly: 0, sixMonths: 0, yearly: 0, isFree: true };
    const monthly = Number(v.monthlyFee || 0);
    if (monthly === 0 || isAllFree) {
      return { monthly: 0, sixMonths: 0, yearly: 0, isFree: true };
    }
    const d6 = Number(globalSettings?.discount6Months || 0);
    const d1y = Number(globalSettings?.discount1Year || 0);
    const sixMonths = v.fee6Months !== undefined && v.fee6Months !== null && v.fee6Months !== 0
      ? Number(v.fee6Months)
      : Math.round(monthly * 6 * (1 - d6 / 100));
    const yearly = v.feeYearly !== undefined && v.feeYearly !== null && v.feeYearly !== 0
      ? Number(v.feeYearly)
      : Math.round(monthly * 12 * (1 - d1y / 100));
    return { monthly, sixMonths, yearly, isFree: false };
  };

  const vehicleRates = getVehicleRates(selectedVehicleType);

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

      const vType = vehicleTypes.find((v) => (v.name && v.name.toLowerCase().trim() === (driverForm.vehicleType || '').toLowerCase().trim()) || (v.bnName && v.bnName.trim() === (driverForm.vehicleType || '').trim()));
      const isAllFree = globalSettings?.allVehiclesFree === true;
      const isUnlimited = isAllFree || (vType && Number(vType.monthlyFee || 0) === 0);

      await addDoc(collection(db, 'drivers'), {
        ...driverForm,
        phone: driverForm.phone.trim(),
        isActive: true,
        subscriptionStatus: 'active',
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

          {/* Selected Vehicle Rate Card (মাসিক / ৬ মাস / বাৎসরিক অথবা ফ্রি) */}
          {driverForm.vehicleType && (
            <div className="mt-3">
              {!vehicleRates.isFree ? (
                <div className="p-4 bg-orange-50/70 border border-orange-200 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                        রেজিস্ট্রেশন ফি ও রেট সমূহ ({selectedVehicleType?.name} {selectedVehicleType?.bnName ? `- ${selectedVehicleType.bnName}` : ''})
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        পেইড সার্ভিস
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-white rounded-xl border border-orange-100 shadow-2xs">
                      <span className="text-[11px] font-semibold text-gray-500 block mb-0.5">মাসিক ফি (১ মাস)</span>
                      <span className="text-base font-black text-gray-900 font-mono">৳{vehicleRates.monthly}</span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-blue-100 shadow-2xs">
                      <span className="text-[11px] font-semibold text-blue-600 block mb-0.5">৬ মাস প্যাকেজ</span>
                      <span className="text-base font-black text-blue-800 font-mono">৳{vehicleRates.sixMonths}</span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-purple-100 shadow-2xs">
                      <span className="text-[11px] font-semibold text-purple-600 block mb-0.5">বাৎসরিক (১ বছর)</span>
                      <span className="text-base font-black text-purple-800 font-mono">৳{vehicleRates.yearly}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2">
                    এই গাড়ির জন্য নির্ধারিত রেট অনুযায়ী সাবস্ক্রিপশন প্রযোজ্য হবে।
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                        ✓ এই গাড়িটি সম্পূর্ণ ফ্রি (Free Vehicle)
                      </span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                        ৳০ ফি
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700 mt-1">
                      এই গাড়ির জন্য কোনো মাসিক ফি বা পেমেন্ট প্রযোজ্য নয়। রেজিস্ট্রেশনের সাথে সাথে আজীবন/ফ্রি এক্সেস চালু হবে।
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
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

        {(driverForm.vehicleType?.toLowerCase() === 'truck' ||
          driverForm.vehicleType?.toLowerCase() === 'pickup' ||
          driverForm.vehicleType?.includes('পিকআপ') ||
          driverForm.vehicleType?.includes('পিক আপ') ||
          driverForm.vehicleType?.includes('ট্রাক')) && (
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

        {!vehicleRates.isFree && (
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
        )}

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
