import React, { useState, useMemo } from 'react';
import {
  Car,
  Bike,
  Truck,
  Bus,
  Plane,
  Sparkles,
  Gift,
  Coins,
  CheckCircle2,
  RotateCcw,
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Search,
  LayoutList,
  LayoutGrid,
  X,
  Check,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAdmin } from '../context/AdminContext';
import { cn } from '../../lib/utils';
import { syncDriversSubscriptionStatus } from '../../lib/subscriptionSync';

const STANDARD_FEES: Record<string, number> = {
  bike: 100,
  motorcycle: 100,
  car: 300,
  cng: 200,
  auto: 150,
  ambulance: 0,
  truck: 400,
  pickup: 250,
  rickshaw: 50,
  tomtom: 100,
  easybike: 150,
  microbus: 350,
  noah: 350,
  hiace: 350,
  van: 80,
  bus: 500,
  tractor: 150,
  votvoti: 150,
  helicopter: 5000,
};

const getVehicleIcon = (name: string) => {
  const n = (name || '').toLowerCase();
  if (
    n.includes('bike') ||
    n.includes('motorcycle') ||
    n.includes('বাইক') ||
    n.includes('মোটরসাইকেল') ||
    n.includes('cycle')
  ) {
    return <Bike size={18} className="text-blue-500" />;
  }
  if (
    n.includes('truck') ||
    n.includes('pickup') ||
    n.includes('ভটভটি') ||
    n.includes('ট্রাক') ||
    n.includes('পিকআপ') ||
    n.includes('tractor')
  ) {
    return <Truck size={18} className="text-amber-500" />;
  }
  if (
    n.includes('bus') ||
    n.includes('microbus') ||
    n.includes('hiace') ||
    n.includes('noah') ||
    n.includes('ভ্যান') ||
    n.includes('van') ||
    n.includes('বাস') ||
    n.includes('মাইক্রোবাস')
  ) {
    return <Bus size={18} className="text-indigo-500" />;
  }
  if (n.includes('heli') || n.includes('plane') || n.includes('হেলিকপ্টার')) {
    return <Plane size={18} className="text-purple-500" />;
  }
  return <Car size={18} className="text-primary" />;
};

export const VehicleTypesTab: React.FC = () => {
  const {
    isAdmin,
    hasPermission,
    vehicleTypes,
    refreshVehicleTypes,
    refreshGlobalSettings,
    logAction,
  } = useAdmin();

  // Search, filter, view mode state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'free' | 'paid' | 'active' | 'hidden'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    name: '',
    bnName: '',
    monthlyFee: 0,
    discountType: 'percentage',
    discountValue: 0,
  });

  const [editingVehicle, setEditingVehicle] = useState<any | null>(null);
  const [editVehicleForm, setEditVehicleForm] = useState({
    name: '',
    bnName: '',
    monthlyFee: 0,
    discountType: 'percentage',
    discountValue: 0,
  });

  const [seedingVehicles, setSeedingVehicles] = useState(false);
  const [pricingActionLoading, setPricingActionLoading] = useState(false);
  const [syncingDrivers, setSyncingDrivers] = useState(false);

  const defaultVehicles = [
    { name: 'Bike', bnName: 'বাইক', monthlyFee: 100 },
    { name: 'Car', bnName: 'প্রাইভেট কার', monthlyFee: 300 },
    { name: 'CNG', bnName: 'সিএনজি', monthlyFee: 200 },
    { name: 'Auto', bnName: 'অটো রিকশা', monthlyFee: 150 },
    { name: 'Ambulance', bnName: 'অ্যাম্বুলেন্স', monthlyFee: 0 },
    { name: 'Truck', bnName: 'ট্রাক', monthlyFee: 400 },
    { name: 'Pickup', bnName: 'পিকআপ', monthlyFee: 250 },
  ];

  // Helper to sync writes to both vehicleTypes and vehicle_types collections
  const updateVehicleBoth = async (id: string, data: any) => {
    await Promise.allSettled([
      setDoc(doc(db, 'vehicleTypes', id), data, { merge: true }),
      setDoc(doc(db, 'vehicle_types', id), data, { merge: true }),
    ]);
  };

  const deleteVehicleBoth = async (id: string) => {
    await Promise.allSettled([
      deleteDoc(doc(db, 'vehicleTypes', id)),
      deleteDoc(doc(db, 'vehicle_types', id)),
    ]);
  };

  const addVehicleBoth = async (data: any) => {
    const newRef = doc(collection(db, 'vehicleTypes'));
    await Promise.allSettled([
      setDoc(newRef, data),
      setDoc(doc(db, 'vehicle_types', newRef.id), data),
    ]);
  };

  const isAllFree =
    vehicleTypes.length > 0 &&
    vehicleTypes.every((v) => Number(v.monthlyFee || 0) === 0);

  const handleManualSyncDrivers = async () => {
    setSyncingDrivers(true);
    try {
      const res = await syncDriversSubscriptionStatus(vehicleTypes, isAllFree);
      alert(
        `✓ সাবস্ক্রিপশন সিঙ্ক সম্পন্ন হয়েছে!\n\n• মোট ড্রাইভার: ${res.totalDrivers} জন\n• অ্যাপ/ওয়েবে মেয়াদোত্তীর্ণ ও পেমেন্টহীন হাইড করা হয়েছে: ${res.deactivatedExpired} টি গাড়ি\n• ফ্রি মোডে সচল করা হয়েছে: ${res.reactivatedFree} টি গাড়ি\n\nএখন মোবাইল অ্যাপ এবং ওয়েবসাইটে শুধু ভ্যালিড সাবস্ক্রিপশন থাকা গাড়িই প্রদর্শিত হবে।`
      );
    } catch (err) {
      console.error('Error during manual sync:', err);
      alert('ড্রাইভার স্ট্যাটাস সিঙ্ক করতে সমস্যা হয়েছে।');
    } finally {
      setSyncingDrivers(false);
    }
  };

  const handleMakeAllVehiclesFree = async () => {
    if (!isAdmin && !hasPermission('vehicle-types')) {
      alert('You do not have permission to change vehicle pricing.');
      return;
    }
    if (!window.confirm('আপনি কি সব গাড়ির মাসিক ফি ৳০ (সম্পূর্ণ ফ্রি) করতে চান?')) return;

    setPricingActionLoading(true);
    try {
      const updatedTypes: any[] = [];
      for (const v of vehicleTypes) {
        await updateVehicleBoth(v.id, { monthlyFee: 0 });
        updatedTypes.push({ ...v, monthlyFee: 0 });
      }

      await setDoc(doc(db, 'settings', 'global'), { allVehiclesFree: true }, { merge: true });
      await Promise.all([refreshVehicleTypes(), refreshGlobalSettings()]);

      // Sync drivers so all approved vehicles are active in app/web mode
      await syncDriversSubscriptionStatus(updatedTypes, true);

      await logAction('pricing_free_all', 'Set all vehicle types monthly fee to ৳0 (Free)');
      alert('✓ সফল হয়েছে! সব গাড়ির মাসিক ফি ৳০ (সম্পূর্ণ ফ্রি) করা হয়েছে এবং গাড়িগুলো অ্যাপে সচল রাখা হয়েছে।');
    } catch (err) {
      console.error('Error setting all vehicles free:', err);
      alert('সব গাড়ি ফ্রি করতে সমস্যা হয়েছে।');
    } finally {
      setPricingActionLoading(false);
    }
  };

  const handleRestoreStandardFees = async () => {
    if (!isAdmin && !hasPermission('vehicle-types')) {
      alert('You do not have permission to change vehicle pricing.');
      return;
    }
    if (!window.confirm('আপনি কি সব গাড়ির রেগুলার মাসিক ফি (যেমন বাইক ৳১০০, কার ৳৩০০) ফিরিয়ে আনতে চান?')) return;

    setPricingActionLoading(true);
    try {
      const updatedTypes: any[] = [];
      for (const v of vehicleTypes) {
        const key = (v.name || '').trim().toLowerCase();
        const stdFee = STANDARD_FEES[key] !== undefined ? STANDARD_FEES[key] : (Number(v.monthlyFee) || 100);
        await updateVehicleBoth(v.id, { monthlyFee: stdFee });
        updatedTypes.push({ ...v, monthlyFee: stdFee });
      }

      await setDoc(doc(db, 'settings', 'global'), { allVehiclesFree: false }, { merge: true });
      await Promise.all([refreshVehicleTypes(), refreshGlobalSettings()]);

      // Crucial: Deactivate expired / unpaid drivers from app & web mode immediately
      const syncRes = await syncDriversSubscriptionStatus(updatedTypes, false);

      await logAction('pricing_restore_standard', 'Restored standard vehicle monthly fees');
      alert(`✓ সব গাড়ির স্ট্যান্ডার্ড মাসিক ফি সফলভাবে ফিরিয়ে আনা হয়েছে!\n\nপেইড সাবস্ক্রিপশন ছাড়া বা মেয়াদোত্তীর্ণ ${syncRes.deactivatedExpired} টি গাড়ি মোবাইল অ্যাপ ও ওয়েবসাইট থেকে স্বয়ংক্রিয়ভাবে হাইড (deactivated) করা হয়েছে।`);
    } catch (err) {
      console.error('Error restoring standard fees:', err);
      alert('ফি ফিরিয়ে আনতে সমস্যা হয়েছে।');
    } finally {
      setPricingActionLoading(false);
    }
  };

  const handleToggleSingleVehicleFree = async (v: any) => {
    const isCurrentlyFree = Number(v.monthlyFee || 0) === 0;
    const key = (v.name || '').trim().toLowerCase();
    const newFee = isCurrentlyFree
      ? STANDARD_FEES[key] !== undefined ? STANDARD_FEES[key] : 100
      : 0;

    try {
      await updateVehicleBoth(v.id, { monthlyFee: newFee });
      await refreshVehicleTypes();
      await syncDriversSubscriptionStatus();
      await logAction('toggle_single_free', `Changed fee for ${v.name} to ৳${newFee}`);
    } catch (err) {
      console.error('Error changing vehicle fee:', err);
    }
  };

  const handleSeedVehicles = async () => {
    setSeedingVehicles(true);
    try {
      for (const v of defaultVehicles) {
        if (!vehicleTypes.some((existing) => existing.name.toLowerCase() === v.name.toLowerCase())) {
          await addVehicleBoth({ ...v, isVisible: true });
        }
      }
      await refreshVehicleTypes();
      await logAction('seed_vehicles', 'Seeded default vehicle types');
      alert('Default vehicles seeded successfully!');
    } catch (err) {
      console.error('Error seeding vehicles:', err);
    } finally {
      setSeedingVehicles(false);
    }
  };

  const handleAddVehicleType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.name || !newVehicle.bnName) return;
    try {
      await addVehicleBoth({ ...newVehicle, isVisible: true });
      await refreshVehicleTypes();
      setNewVehicle({ name: '', bnName: '', monthlyFee: 0, discountType: 'percentage', discountValue: 0 });
      setIsAddModalOpen(false);
      await logAction('add_vehicle_type', `Added vehicle type ${newVehicle.name}`);
    } catch (err) {
      console.error('Error adding vehicle type:', err);
    }
  };

  const handleToggleVehicleType = async (id: string, currentStatus: boolean) => {
    try {
      await updateVehicleBoth(id, { isVisible: !currentStatus });
      await refreshVehicleTypes();
    } catch (err) {
      console.error('Error toggling vehicle type:', err);
    }
  };

  const startEditingVehicle = (v: any) => {
    setEditingVehicle(v);
    setEditVehicleForm({
      name: v.name || '',
      bnName: v.bnName || '',
      monthlyFee: v.monthlyFee ?? 0,
      discountType: v.discountType || 'percentage',
      discountValue: v.discountValue || 0,
    });
  };

  const saveEditedVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    try {
      await updateVehicleBoth(editingVehicle.id, editVehicleForm);
      setEditingVehicle(null);
      await refreshVehicleTypes();
      await syncDriversSubscriptionStatus();
      await logAction('edit_vehicle_type', `Updated vehicle type ${editVehicleForm.name}`);
    } catch (err) {
      console.error('Error saving vehicle type:', err);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this vehicle type?')) return;
    try {
      await deleteVehicleBoth(id);
      await refreshVehicleTypes();
      await logAction('delete_vehicle_type', `Deleted vehicle type ${id}`);
    } catch (err) {
      console.error('Error deleting vehicle type:', err);
    }
  };

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return vehicleTypes.filter((v) => {
      const matchSearch =
        (v.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.bnName || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      const isFree = Number(v.monthlyFee || 0) === 0;
      const isVisible = v.isVisible !== false;

      if (filterType === 'free') return isFree;
      if (filterType === 'paid') return !isFree;
      if (filterType === 'active') return isVisible;
      if (filterType === 'hidden') return !isVisible;

      return true;
    });
  }, [vehicleTypes, searchTerm, filterType]);

  const stats = useMemo(() => {
    const total = vehicleTypes.length;
    const free = vehicleTypes.filter((v) => Number(v.monthlyFee || 0) === 0).length;
    const paid = total - free;
    const active = vehicleTypes.filter((v) => v.isVisible !== false).length;
    const hidden = total - active;
    return { total, free, paid, active, hidden };
  }, [vehicleTypes]);

  return (
    <div className="p-4 md:p-8 max-w-7xl">
      {/* ONE UNIFIED BEAUTIFUL BOX FOR ALL VEHICLE MANAGEMENT */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
        {/* Box Top Header: Title, Global Free Mode & Actions */}
        <div className="p-5 md:p-6 border-b border-gray-100 bg-gradient-to-b from-gray-50/50 to-white">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Left Title & Status */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-2xs">
                <Layers size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h4 className="font-black text-gray-900 text-base md:text-lg">
                    গাড়ির তালিকা ও ফি নির্ধারণ
                  </h4>
                  <span className="inline-flex items-center text-[11px] font-black px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    মোট {stats.total} টি গাড়ি
                  </span>
                  {isAllFree ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-2xs">
                      <CheckCircle2 size={12} />
                      সব গাড়ি সম্পূর্ণ ফ্রি
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-amber-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-2xs">
                      <Coins size={12} />
                      পেইড মোড চালু ({stats.paid} টি)
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  গাড়ির মাসিক ফি পরিবর্তন করতে পারেন অথবা এক ক্লিকে সব গাড়ি ফ্রি মোডে রূপান্তর করতে পারেন
                </p>
              </div>
            </div>

            {/* Right Buttons: Master Free Mode Toggle & Add Button */}
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              {/* Master Free Mode Switch Button */}
              <button
                type="button"
                disabled={pricingActionLoading}
                onClick={() => {
                  if (isAllFree) {
                    handleRestoreStandardFees();
                  } else {
                    handleMakeAllVehiclesFree();
                  }
                }}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 border shadow-2xs',
                  isAllFree
                    ? 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600'
                    : 'bg-white hover:bg-amber-50 text-amber-800 border-amber-200 hover:border-amber-300'
                )}
                title={isAllFree ? 'আগের ফি ফিরিয়ে আনুন' : 'সব গাড়ি ফ্রি করুন (৳০)'}
              >
                {isAllFree ? (
                  <>
                    <CheckCircle2 size={15} />
                    <span>ফ্রি মোড চালু (৳০)</span>
                    <ToggleRight size={20} className="text-white" />
                  </>
                ) : (
                  <>
                    <Sparkles size={15} className="text-amber-600" />
                    <span>সব গাড়ি ফ্রি করুন</span>
                    <ToggleLeft size={20} className="text-gray-400" />
                  </>
                )}
              </button>

              {/* Restore Fee Button (if all free) */}
              {isAllFree && (
                <button
                  type="button"
                  disabled={pricingActionLoading}
                  onClick={handleRestoreStandardFees}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 transition-all flex items-center gap-1.5"
                >
                  <RotateCcw size={13} className="text-gray-500" />
                  <span>আগের ফি আনুন</span>
                </button>
              )}

              {/* Seed Defaults (if Admin) */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleSeedVehicles}
                  disabled={seedingVehicles}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all disabled:opacity-50"
                  title="ডিফল্ট গাড়ির তালিকা লোড করুন"
                >
                  {seedingVehicles ? 'Seeding...' : 'Seed Defaults'}
                </button>
              )}

              {/* Sync Drivers Subscription in App / Web */}
              {(isAdmin || hasPermission('vehicle-types')) && (
                <button
                  type="button"
                  onClick={handleManualSyncDrivers}
                  disabled={syncingDrivers}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                  title="অ্যাপ ও ওয়েবসাইটে মেয়াদোত্তীর্ণ গাড়ি হাইড করার জন্য ড্রাইভার সাবস্ক্রিপশন সিঙ্ক করুন"
                >
                  <RefreshCw size={13} className={cn('text-primary', syncingDrivers && 'animate-spin')} />
                  <span>{syncingDrivers ? 'সিঙ্ক হচ্ছে...' : 'সাবস্ক্রিপশন সিঙ্ক'}</span>
                </button>
              )}

              {/* Add Vehicle Button */}
              {(isAdmin || hasPermission('vehicle-types')) && (
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-primary hover:opacity-90 text-white transition-all shadow-sm flex items-center gap-1.5 ml-auto lg:ml-0"
                >
                  <Plus size={16} />
                  <span>নতুন গাড়ি যোগ করুন</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Global Free Banner Notification Bar inside Box */}
        <div
          className={cn(
            'px-5 py-3 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs',
            isAllFree
              ? 'bg-emerald-50/70 border-emerald-100 text-emerald-900'
              : 'bg-amber-50/50 border-amber-100 text-amber-900'
          )}
        >
          <div className="flex items-center gap-2">
            {isAllFree ? (
              <Gift size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <Coins size={16} className="text-amber-600 shrink-0" />
            )}
            <span className="font-semibold">
              {isAllFree
                ? 'বর্তমানে সব গাড়ির মাসিক ফি সম্পূর্ণ ফ্রি (৳০)। ড্রাইভারদের সাবস্ক্রিপশন চার্জ নেওয়া হচ্ছে না।'
                : `বর্তমানে স্ট্যান্ডার্ড পেইড মোড সক্রিয় রয়েছে। মোট ${stats.free} টি গাড়ি ফ্রি এবং ${stats.paid} টি গাড়ি পেইড।`}
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {isAllFree ? (
              <button
                onClick={handleRestoreStandardFees}
                disabled={pricingActionLoading}
                className="underline hover:text-emerald-700 font-bold"
              >
                আগের ফি ফিরিয়ে আনবেন?
              </button>
            ) : (
              <button
                onClick={handleMakeAllVehiclesFree}
                disabled={pricingActionLoading}
                className="underline hover:text-amber-700 font-bold"
              >
                সব গাড়ি ফ্রি করতে চান?
              </button>
            )}
          </div>
        </div>

        {/* Filter, Search & View Mode Switcher Toolbar */}
        <div className="p-4 md:px-6 border-b border-gray-100 bg-white flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="গাড়ির নাম দিয়ে সার্চ করুন (e.g. Bike, কার)..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50/70 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Pills & View Toggle */}
          <div className="flex items-center justify-between md:justify-end gap-2.5 overflow-x-auto pb-1 md:pb-0">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-semibold shrink-0">
              <button
                onClick={() => setFilterType('all')}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all',
                  filterType === 'all'
                    ? 'bg-white text-gray-900 shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-gray-800'
                )}
              >
                সব ({stats.total})
              </button>
              <button
                onClick={() => setFilterType('free')}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all',
                  filterType === 'free'
                    ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-gray-800'
                )}
              >
                ফ্রি ({stats.free})
              </button>
              <button
                onClick={() => setFilterType('paid')}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all',
                  filterType === 'paid'
                    ? 'bg-white text-amber-700 shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-gray-800'
                )}
              >
                পেইড ({stats.paid})
              </button>
              <button
                onClick={() => setFilterType('active')}
                className={cn(
                  'px-2.5 py-1 rounded-lg transition-all',
                  filterType === 'active'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-gray-800'
                )}
              >
                অ্যাক্টিভ ({stats.active})
              </button>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-gray-500 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  viewMode === 'table' ? 'bg-white text-gray-900 shadow-2xs' : 'hover:text-gray-800'
                )}
                title="লিস্ট / টেবিল ভিউ"
              >
                <LayoutList size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  viewMode === 'grid' ? 'bg-white text-gray-900 shadow-2xs' : 'hover:text-gray-800'
                )}
                title="কার্ড গ্রিড ভিউ"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Content: Clean Unified Table or Grid */}
        {filteredVehicles.length === 0 ? (
          <div className="py-14 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
              <Car size={28} />
            </div>
            <p className="text-gray-600 font-bold text-sm">কোনো গাড়ি পাওয়া যায়নি</p>
            <p className="text-gray-400 text-xs mt-1">
              {searchTerm ? 'সার্চ কুয়েরি পরিবর্তন করে আবার চেষ্টা করুন' : 'নতুন গাড়ি যোগ করুন বা সিড করুন'}
            </p>
          </div>
        ) : viewMode === 'table' ? (
          /* TABLE VIEW: All vehicles listed inside this ONE single box */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/40 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-3 px-6">গাড়ির নাম ও বিবরণ</th>
                  <th className="py-3 px-6">মাসিক ফি (Monthly Fee)</th>
                  <th className="py-3 px-6">ফ্রি সুইচ</th>
                  <th className="py-3 px-6">স্ট্যাটাস</th>
                  <th className="py-3 px-6 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredVehicles.map((v) => {
                  const isFree = Number(v.monthlyFee || 0) === 0;
                  const isVisible = v.isVisible !== false;

                  return (
                    <tr
                      key={v.id}
                      className={cn(
                        'hover:bg-gray-50/80 transition-colors',
                        isFree && 'bg-emerald-50/20'
                      )}
                    >
                      {/* Vehicle Name with Icon */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gray-100/90 flex items-center justify-center shrink-0 border border-gray-200/60 shadow-2xs">
                            {getVehicleIcon(v.name)}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                              {v.name}
                              {v.bnName && (
                                <span className="text-xs text-gray-400 font-normal">
                                  ({v.bnName})
                                </span>
                              )}
                            </div>
                            {v.discountValue ? (
                              <span className="text-[10px] text-amber-600 font-semibold">
                                {v.discountType === 'percentage'
                                  ? `${v.discountValue}% ডিসকাউন্ট`
                                  : `৳${v.discountValue} ছাড়`}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400">স্ট্যান্ডার্ড প্ল্যান</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Fee Badge */}
                      <td className="py-3.5 px-6">
                        {isFree ? (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-100/80 border border-emerald-200/80 px-2.5 py-1 rounded-xl shadow-2xs">
                            <Sparkles size={12} />
                            ফ্রি (৳০/মাস)
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-gray-900 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-xl font-mono">
                              ৳{v.monthlyFee}/মাস
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Quick Free Toggle */}
                      <td className="py-3.5 px-6">
                        <button
                          type="button"
                          onClick={() => handleToggleSingleVehicleFree(v)}
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 border',
                            isFree
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                          )}
                          title={isFree ? 'পেইড ফি সেট করুন' : 'এই গাড়িটি ফ্রি করুন (৳০)'}
                        >
                          {isFree ? (
                            <>
                              <Check size={12} />
                              <span>ফ্রি আছে</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={12} className="text-amber-500" />
                              <span>ফ্রি করুন</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Visibility Toggle */}
                      <td className="py-3.5 px-6">
                        <button
                          onClick={() => handleToggleVehicleType(v.id, isVisible)}
                          className={cn(
                            'inline-flex items-center gap-1.5 font-bold transition-opacity hover:opacity-80 text-xs'
                          )}
                        >
                          {isVisible ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-lg text-[11px]">
                              <ToggleRight size={18} className="text-emerald-500" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-lg text-[11px]">
                              <ToggleLeft size={18} className="text-gray-400" />
                              Hidden
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => startEditingVehicle(v)}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:text-primary hover:bg-orange-50 transition-colors"
                            title="সম্পাদনা করুন"
                          >
                            <Edit2 size={13} />
                          </button>
                          {(isAdmin || hasPermission('vehicle-types')) && (
                            <button
                              onClick={() => handleDeleteVehicle(v.id)}
                              className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* GRID VIEW (Inside the same unified box, without clutter) */
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredVehicles.map((v) => {
              const isFree = Number(v.monthlyFee || 0) === 0;
              const isVisible = v.isVisible !== false;

              return (
                <div
                  key={v.id}
                  className={cn(
                    'p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3',
                    isFree
                      ? 'bg-emerald-50/20 border-emerald-200/80 hover:border-emerald-300'
                      : 'bg-white border-gray-200 hover:border-gray-300 shadow-2xs'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 border border-gray-200/60">
                        {getVehicleIcon(v.name)}
                      </div>
                      <div>
                        <h5 className="font-bold text-gray-900 text-sm">{v.name}</h5>
                        <p className="text-xs text-gray-500 font-medium">{v.bnName}</p>
                      </div>
                    </div>

                    {isFree ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg">
                        <Sparkles size={11} />
                        ফ্রি (৳০)
                      </span>
                    ) : (
                      <span className="text-xs font-black text-gray-900 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-lg font-mono">
                        ৳{v.monthlyFee}/মাস
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 text-xs">
                    <button
                      onClick={() => handleToggleVehicleType(v.id, isVisible)}
                      className="flex items-center gap-1 text-gray-600 font-bold"
                    >
                      {isVisible ? (
                        <ToggleRight className="text-emerald-500" size={18} />
                      ) : (
                        <ToggleLeft className="text-gray-300" size={18} />
                      )}
                      <span className="text-[11px]">{isVisible ? 'Active' : 'Hidden'}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleSingleVehicleFree(v)}
                        className={cn(
                          'text-[10px] font-bold px-2 py-1 rounded-md border',
                          isFree
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-gray-50 text-gray-600 border-gray-200'
                        )}
                      >
                        {isFree ? 'পেইড করুন' : 'ফ্রি করুন'}
                      </button>
                      <button
                        onClick={() => startEditingVehicle(v)}
                        className="p-1 rounded-md border border-gray-200 text-gray-500 hover:text-primary hover:bg-orange-50"
                        title="Edit"
                      >
                        <Edit2 size={13} />
                      </button>
                      {(isAdmin || hasPermission('vehicle-types')) && (
                        <button
                          onClick={() => handleDeleteVehicle(v.id)}
                          className="p-1 rounded-md border border-gray-200 text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Box Footer Stats */}
        <div className="p-3.5 px-6 border-t border-gray-100 bg-gray-50/60 flex flex-wrap items-center justify-between text-xs text-gray-500 gap-2">
          <span>
            প্রদর্শিত হচ্ছে: <strong className="text-gray-800">{filteredVehicles.length}</strong> /{' '}
            {stats.total} টি গাড়ি
          </span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              ফ্রি: {stats.free} টি
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              পেইড: {stats.paid} টি
            </span>
          </div>
        </div>
      </div>

      {/* ADD VEHICLE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-gray-200 max-w-lg w-full p-6 shadow-xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Plus size={18} />
                </div>
                <div>
                  <h4 className="font-black text-gray-900 text-base">নতুন গাড়ি যোগ করুন</h4>
                  <p className="text-xs text-gray-400">নতুন যানবাহনের ক্যাটাগরি ও মাসিক সাবস্ক্রিপশন ফি</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddVehicleType} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                    English Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={newVehicle.name}
                    onChange={(e) => setNewVehicle({ ...newVehicle, name: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. Scooter / Rickshaw"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                    বাংলা নাম *
                  </label>
                  <input
                    required
                    type="text"
                    value={newVehicle.bnName}
                    onChange={(e) => setNewVehicle({ ...newVehicle, bnName: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
                    placeholder="যেমন: স্কুটার / রিকশা"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Monthly Fee (৳) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewVehicle({ ...newVehicle, monthlyFee: 0 })}
                    className="text-[11px] font-bold text-emerald-600 hover:underline"
                  >
                    ফ্রি করতে চান? (৳০ সেট করুন)
                  </button>
                </div>
                <input
                  required
                  type="number"
                  min="0"
                  value={newVehicle.monthlyFee}
                  onChange={(e) => setNewVehicle({ ...newVehicle, monthlyFee: Number(e.target.value) })}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary font-mono"
                  placeholder="0"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                    Discount Type
                  </label>
                  <select
                    value={newVehicle.discountType}
                    onChange={(e) => setNewVehicle({ ...newVehicle, discountType: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (৳)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newVehicle.discountValue}
                    onChange={(e) => setNewVehicle({ ...newVehicle, discountValue: Number(e.target.value) })}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-primary text-white hover:opacity-90 shadow-sm transition-all"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT VEHICLE MODAL */}
      {editingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-gray-200 max-w-lg w-full p-6 shadow-xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-primary flex items-center justify-center font-bold">
                  <Edit2 size={17} />
                </div>
                <div>
                  <h4 className="font-black text-gray-900 text-base">গাড়ির তথ্য সম্পাদনা</h4>
                  <p className="text-xs text-gray-400">নাম ও ফি আপডেট করুন</p>
                </div>
              </div>
              <button
                onClick={() => setEditingVehicle(null)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveEditedVehicle} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                    English Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={editVehicleForm.name}
                    onChange={(e) => setEditVehicleForm({ ...editVehicleForm, name: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                    বাংলা নাম *
                  </label>
                  <input
                    required
                    type="text"
                    value={editVehicleForm.bnName}
                    onChange={(e) => setEditVehicleForm({ ...editVehicleForm, bnName: e.target.value })}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary font-semibold"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Monthly Fee (৳)
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditVehicleForm({ ...editVehicleForm, monthlyFee: 0 })}
                    className="text-[11px] font-bold text-emerald-600 hover:underline"
                  >
                    ফ্রি করুন (৳০)
                  </button>
                </div>
                <input
                  required
                  type="number"
                  min="0"
                  value={editVehicleForm.monthlyFee}
                  onChange={(e) =>
                    setEditVehicleForm({ ...editVehicleForm, monthlyFee: Number(e.target.value) })
                  }
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-2 focus:ring-primary font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                    Discount Type
                  </label>
                  <select
                    value={editVehicleForm.discountType}
                    onChange={(e) =>
                      setEditVehicleForm({ ...editVehicleForm, discountType: e.target.value })
                    }
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (৳)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editVehicleForm.discountValue}
                    onChange={(e) =>
                      setEditVehicleForm({ ...editVehicleForm, discountValue: Number(e.target.value) })
                    }
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingVehicle(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-primary text-white hover:opacity-90 shadow-sm transition-all"
                >
                  আপডেট করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleTypesTab;
