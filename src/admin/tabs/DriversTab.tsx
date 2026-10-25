import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Download,
  ChevronDown,
  Edit3,
  Trash2,
  Users,
  ShieldCheck,
  AlertCircle,
  Clock,
  Phone,
  MessageSquare,
  MapPin,
  Car,
  Bus,
  Truck,
  Sparkles,
  RefreshCw,
  X,
  Check,
  CheckCircle2,
  Calendar,
  Layers,
  PhoneCall,
  SlidersHorizontal,
} from 'lucide-react';
import {
  collection,
  query,
  limit,
  getDocs,
  startAfter,
  doc,
  setDoc,
  deleteDoc,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAdmin } from '../context/AdminContext';
import { CascadingFilter } from '../../components/CascadingFilter';
import { cn } from '../../lib/utils';

export interface DriversTabProps {
  initialFilterStatus?: 'all' | 'active' | 'inactive';
}

const AVATAR_COLORS = [
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-rose-100 text-rose-800 border-rose-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-orange-100 text-orange-800 border-orange-200',
];

const getAvatarStyle = (name?: string) => {
  const str = (name || 'Driver').trim();
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getInitials = (name?: string) => {
  if (!name) return 'DR';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const DriversTab: React.FC<DriversTabProps> = ({ initialFilterStatus = 'all' }) => {
  const { isAdmin, hasPermission, vehicleTypes, logAction } = useAdmin();

  const [drivers, setDrivers] = useState<any[]>([]);
  const [driversLastDoc, setDriversLastDoc] = useState<any>(null);
  const [driversHasMore, setDriversHasMore] = useState(true);
  const [driversLoading, setDriversLoading] = useState(false);
  const [driversLoadingMore, setDriversLoadingMore] = useState(false);
  const [driverFilterStatus, setDriverFilterStatus] = useState<string>(initialFilterStatus);
  const [searchQuery, setSearchQuery] = useState('');
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [editDriverForm, setEditDriverForm] = useState<any>({});

  const DRIVERS_PER_PAGE = 50;

  const fetchDrivers = useCallback(async (isLoadMore = false) => {
    try {
      if (isLoadMore) setDriversLoadingMore(true);
      else setDriversLoading(true);

      let q = query(collection(db, 'drivers'), limit(DRIVERS_PER_PAGE));
      if (isLoadMore && driversLastDoc) {
        q = query(collection(db, 'drivers'), startAfter(driversLastDoc), limit(DRIVERS_PER_PAGE));
      }

      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (isLoadMore) {
        setDrivers((prev) => {
          const newDocs = docs.filter((newDoc) => !prev.some((p) => p.id === newDoc.id));
          return [...prev, ...newDocs];
        });
      } else {
        setDrivers(docs);
      }

      if (snap.docs.length > 0) {
        setDriversLastDoc(snap.docs[snap.docs.length - 1]);
      }
      setDriversHasMore(snap.docs.length === DRIVERS_PER_PAGE);
    } catch (err) {
      console.error('Error fetching drivers:', err);
    } finally {
      if (isLoadMore) setDriversLoadingMore(false);
      else setDriversLoading(false);
    }
  }, [driversLastDoc]);

  const searchDrivers = useCallback(async (sq: string) => {
    try {
      setDriversLoading(true);
      const trimmed = sq.trim();
      if (!trimmed) {
        fetchDrivers(false);
        return;
      }

      const phoneQuery = query(
        collection(db, 'drivers'),
        where('phone', '>=', trimmed),
        where('phone', '<=', trimmed + '\uf8ff'),
        limit(25)
      );
      const nameQuery = query(
        collection(db, 'drivers'),
        where('name', '>=', trimmed),
        where('name', '<=', trimmed + '\uf8ff'),
        limit(25)
      );
      const regQuery = query(
        collection(db, 'drivers'),
        where('vehicleRegNumber', '>=', trimmed),
        where('vehicleRegNumber', '<=', trimmed + '\uf8ff'),
        limit(25)
      );

      const [phoneSnap, nameSnap, regSnap] = await Promise.all([
        getDocs(phoneQuery),
        getDocs(nameQuery),
        getDocs(regQuery),
      ]);

      const combinedMap = new Map();
      [...phoneSnap.docs, ...nameSnap.docs, ...regSnap.docs].forEach((d) => {
        if (!combinedMap.has(d.id)) {
          combinedMap.set(d.id, { id: d.id, ...d.data() });
        }
      });

      setDrivers(Array.from(combinedMap.values()));
      setDriversHasMore(false);
    } catch (err) {
      console.error('Error searching drivers:', err);
    } finally {
      setDriversLoading(false);
    }
  }, [fetchDrivers]);

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchQuery(internalSearchQuery);
    }, 450);
    return () => clearTimeout(timeout);
  }, [internalSearchQuery]);

  useEffect(() => {
    searchDrivers(searchQuery);
  }, [searchQuery, searchDrivers]);

  const startEditingDriver = (d: any) => {
    setEditingDriverId(d.id);
    setEditDriverForm({
      name: d.name || '',
      phone: d.phone || '',
      vehicleModel: d.vehicleModel || '',
      vehicleRegNumber: d.vehicleRegNumber || '',
      vehicleType: d.vehicleType || '',
      division: d.division || '',
      district: d.district || '',
      upazila: d.upazila || '',
      union: d.union || '',
      ward: d.ward || '',
      capacity: d.capacity || '',
      seatingCapacity: d.seatingCapacity || '',
      isSelfDriving: d.isSelfDriving || false,
      isAirAmbulance: d.isAirAmbulance || false,
      autoPay: d.autoPay || false,
      isCovered: d.isCovered || false,
      vehicleLength: d.vehicleLength || '',
      isActive: d.isActive ?? true,
    });
  };

  const cancelEditingDriver = () => {
    setEditingDriverId(null);
  };

  const saveEditedDriver = async (id: string) => {
    try {
      setSavingEdit(true);
      const vType = vehicleTypes.find((v) => v.name === editDriverForm.vehicleType);
      const isUnlimited = vType && vType.monthlyFee === 0;

      const currentDriver = drivers.find((d) => d.id === id);
      let newExpiryDate = currentDriver?.expiryDate;

      if (currentDriver) {
        const wasUnlimited =
          currentDriver.expiryDate?.toDate &&
          currentDriver.expiryDate.toDate().getFullYear() > 2090;

        if (isUnlimited && !wasUnlimited) {
          newExpiryDate = new Date('2099-12-31');
        } else if (!isUnlimited && wasUnlimited) {
          newExpiryDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
        }
      }

      await setDoc(
        doc(db, 'drivers', id),
        {
          ...editDriverForm,
          expiryDate: newExpiryDate,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setDrivers(
        drivers.map((d) =>
          d.id === id ? { ...d, ...editDriverForm, expiryDate: newExpiryDate } : d
        )
      );
      setEditingDriverId(null);
      await logAction('driver_edit', `Updated driver ${editDriverForm.name} (${id})`);
    } catch (err) {
      console.error('Error updating driver:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteDriver = async (id: string) => {
    if (!isAdmin && !hasPermission('drivers.edit')) {
      alert('You are not authorized to delete drivers.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this driver? This action cannot be undone.')) return;

    try {
      await deleteDoc(doc(db, 'drivers', id));
      setDrivers(drivers.filter((d) => d.id !== id));
      await logAction('driver_delete', `Deleted driver ${id}`);
    } catch (err) {
      console.error('Error deleting driver:', err);
    }
  };

  const handleExportDrivers = async (exportType: 'all_active' | 'filtered' | 'expiring_soon') => {
    setExporting(true);
    setExportDropdownOpen(false);

    try {
      await new Promise((r) => setTimeout(r, 400));
      let driversToExport = [...drivers];

      if (exportType === 'all_active') {
        driversToExport = driversToExport.filter((d) => {
          const isUnlimited =
            d.expiryDate?.toDate && d.expiryDate.toDate().getFullYear() > 2090;
          const isExpired = isUnlimited
            ? false
            : !d.expiryDate?.toDate || d.expiryDate.toDate() <= new Date();
          return d.isActive && !isExpired;
        });
      } else if (exportType === 'expiring_soon') {
        driversToExport = driversToExport.filter((d) => {
          const isUnlimited =
            d.expiryDate?.toDate && d.expiryDate.toDate().getFullYear() > 2090;
          if (isUnlimited) return false;
          const isExpired = !d.expiryDate?.toDate || d.expiryDate.toDate() <= new Date();
          const daysLeft = d.expiryDate?.toDate
            ? Math.ceil((d.expiryDate.toDate().getTime() - new Date().getTime()) / 86400000)
            : 0;
          return !isExpired && daysLeft <= 7;
        });
      }

      if (driversToExport.length === 0) {
        alert('No drivers found for the selected export option.');
        return;
      }

      const headers = [
        'Driver Name',
        'Phone Number',
        'Vehicle Type',
        'Vehicle Model',
        'Reg Number',
        'Location',
        'Status',
      ];
      const csvRows = [
        headers.join(','),
        ...driversToExport.map((d) =>
          [
            `"${d.name || ''}"`,
            `"${d.phone || ''}"`,
            `"${d.vehicleType || ''}"`,
            `"${d.vehicleModel || ''}"`,
            `"${d.vehicleRegNumber || ''}"`,
            `"${[d.division, d.district, d.upazila].filter(Boolean).join(', ')}"`,
            `"${d.isActive ? 'Active' : 'Inactive'}"`,
          ].join(',')
        ),
      ];

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `drivers_${exportType}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Export error:', e);
    } finally {
      setExporting(false);
    }
  };

  // Status and Count Calculations
  const { activeCount, inactiveCount, expiringSoonCount } = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let expiring = 0;

    drivers.forEach((d) => {
      const vType = vehicleTypes.find((v) => v.name === d.vehicleType);
      const requiresPayment = vType && vType.monthlyFee > 0;
      let isUnlimited = false;
      let isExpired = false;

      if (!requiresPayment) {
        isUnlimited = true;
      } else {
        if (d.expiryDate?.toDate && d.expiryDate.toDate().getFullYear() > 2090) {
          isExpired = true;
        } else {
          isExpired = d.expiryDate?.toDate ? d.expiryDate.toDate() < new Date() : true;
        }
      }

      const isActive = d.isActive && !isExpired;
      if (isActive) {
        active++;
        if (requiresPayment && d.expiryDate?.toDate) {
          const daysLeft = Math.ceil((d.expiryDate.toDate().getTime() - Date.now()) / 86400000);
          if (daysLeft > 0 && daysLeft <= 7) expiring++;
        }
      } else {
        inactive++;
      }
    });

    return { activeCount: active, inactiveCount: inactive, expiringSoonCount: expiring };
  }, [drivers, vehicleTypes]);

  // Filtered List
  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const vType = vehicleTypes.find((v) => v.name === d.vehicleType);
      const requiresPayment = vType && vType.monthlyFee > 0;
      let isUnlimited = false;
      let isExpired = false;

      if (!requiresPayment) {
        isUnlimited = true;
        isExpired = false;
      } else {
        if (d.expiryDate?.toDate && d.expiryDate.toDate().getFullYear() > 2090) {
          isExpired = true;
        } else {
          isExpired = d.expiryDate?.toDate ? d.expiryDate.toDate() < new Date() : true;
        }
      }

      const isActive = d.isActive && !isExpired;

      if (driverFilterStatus === 'active') return isActive;
      if (driverFilterStatus === 'inactive') return !isActive;
      if (driverFilterStatus === 'expiring') {
        if (!requiresPayment || !d.expiryDate?.toDate) return false;
        const daysLeft = Math.ceil((d.expiryDate.toDate().getTime() - Date.now()) / 86400000);
        return isActive && daysLeft > 0 && daysLeft <= 7;
      }
      return true;
    });
  }, [drivers, vehicleTypes, driverFilterStatus]);

  const getVehicleTag = (vType?: string) => {
    const type = (vType || '').toLowerCase();
    if (type.includes('bus') || type.includes('minibus')) {
      return { icon: Bus, bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    }
    if (type.includes('car') || type.includes('private') || type.includes('taxi')) {
      return { icon: Car, bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    if (type.includes('truck') || type.includes('pickup') || type.includes('lorry')) {
      return { icon: Truck, bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    return { icon: Car, bg: 'bg-purple-50 text-purple-700 border-purple-200' };
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Drivers */}
        <div
          onClick={() => setDriverFilterStatus('all')}
          className={cn(
            'p-4 rounded-2xl border transition-all cursor-pointer bg-white shadow-xs hover:shadow-sm relative overflow-hidden group',
            driverFilterStatus === 'all'
              ? 'border-primary ring-2 ring-primary/20'
              : 'border-gray-200/80 hover:border-gray-300'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Drivers</span>
            <div className="p-2 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 group-hover:scale-105 transition-transform">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900 tracking-tight">{drivers.length}</span>
            <span className="text-[11px] text-gray-400 font-medium">loaded</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Full fleet registry</p>
        </div>

        {/* Active Drivers */}
        <div
          onClick={() => setDriverFilterStatus('active')}
          className={cn(
            'p-4 rounded-2xl border transition-all cursor-pointer bg-white shadow-xs hover:shadow-sm relative overflow-hidden group',
            driverFilterStatus === 'active'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20'
              : 'border-gray-200/80 hover:border-gray-300'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:scale-105 transition-transform">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 tracking-tight">{activeCount}</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Verified & subscribed</p>
        </div>

        {/* Inactive / Expired */}
        <div
          onClick={() => setDriverFilterStatus('inactive')}
          className={cn(
            'p-4 rounded-2xl border transition-all cursor-pointer bg-white shadow-xs hover:shadow-sm relative overflow-hidden group',
            driverFilterStatus === 'inactive'
              ? 'border-rose-500 ring-2 ring-rose-500/20'
              : 'border-gray-200/80 hover:border-gray-300'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Inactive</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 group-hover:scale-105 transition-transform">
              <AlertCircle size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600 tracking-tight">{inactiveCount}</span>
            <span className="text-[11px] text-rose-500 font-medium">attention</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Expired or off-duty</p>
        </div>

        {/* Expiring Soon */}
        <div
          onClick={() => setDriverFilterStatus('expiring')}
          className={cn(
            'p-4 rounded-2xl border transition-all cursor-pointer bg-white shadow-xs hover:shadow-sm relative overflow-hidden group',
            driverFilterStatus === 'expiring'
              ? 'border-amber-500 ring-2 ring-amber-500/20'
              : 'border-gray-200/80 hover:border-gray-300'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Expiring Soon</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 group-hover:scale-105 transition-transform">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 tracking-tight">{expiringSoonCount}</span>
            <span className="text-[11px] text-amber-600 font-medium">≤ 7 days</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Renewal follow-ups</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        {/* Table Toolbar Header */}
        <div className="p-4 md:p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-gray-50/40">
          {/* Segmented Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-100/80 rounded-xl text-xs font-bold self-start md:self-auto">
            <button
              onClick={() => setDriverFilterStatus('all')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all',
                driverFilterStatus === 'all'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              )}
            >
              All Drivers ({drivers.length})
            </button>
            <button
              onClick={() => setDriverFilterStatus('active')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5',
                driverFilterStatus === 'active'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Active ({activeCount})
            </button>
            <button
              onClick={() => setDriverFilterStatus('inactive')}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5',
                driverFilterStatus === 'inactive'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Inactive ({inactiveCount})
            </button>
            {expiringSoonCount > 0 && (
              <button
                onClick={() => setDriverFilterStatus('expiring')}
                className={cn(
                  'px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5',
                  driverFilterStatus === 'expiring'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-amber-600 hover:text-amber-700'
                )}
              >
                <Clock size={12} />
                Expiring ({expiringSoonCount})
              </button>
            )}
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="text"
                placeholder="Search name, phone, reg number..."
                value={internalSearchQuery}
                onChange={(e) => setInternalSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-2xs"
              />
              {internalSearchQuery && (
                <button
                  onClick={() => {
                    setInternalSearchQuery('');
                    setSearchQuery('');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-md"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Reload Data Button */}
            <button
              onClick={() => fetchDrivers(false)}
              disabled={driversLoading}
              title="Refresh Drivers"
              className="p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-primary hover:border-primary/40 transition-all shadow-2xs disabled:opacity-50"
            >
              <RefreshCw size={15} className={cn(driversLoading && 'animate-spin text-primary')} />
            </button>

            {/* Export Dropdown */}
            {isAdmin && (
              <div className="relative">
                <button
                  onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                  disabled={exporting}
                  className="bg-white border border-gray-200 text-gray-700 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-gray-50 hover:border-gray-300 transition-all shadow-2xs flex items-center gap-2 disabled:opacity-50"
                >
                  <Download size={14} className="text-gray-500" />
                  <span>{exporting ? 'Exporting...' : 'Export'}</span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>

                {exportDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setExportDropdownOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-40">
                      <div className="px-3.5 py-2 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Export As CSV
                      </div>
                      <button
                        onClick={() => handleExportDrivers('all_active')}
                        className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors flex items-center gap-2"
                      >
                        <ShieldCheck size={14} className="text-emerald-600" />
                        Export All Active Drivers
                      </button>
                      <button
                        onClick={() => handleExportDrivers('filtered')}
                        className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2"
                      >
                        <Layers size={14} className="text-blue-600" />
                        Export Current Filtered List
                      </button>
                      <button
                        onClick={() => handleExportDrivers('expiring_soon')}
                        className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors flex items-center gap-2"
                      >
                        <Clock size={14} className="text-amber-600" />
                        Export Expiring Soon (≤ 7 days)
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Drivers Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200/80 bg-gray-50/80 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 min-w-[200px]">Driver Profile</th>
                <th className="py-3 px-4 min-w-[200px]">Vehicle & Registration</th>
                <th className="py-3 px-4 min-w-[180px]">Location</th>
                <th className="py-3 px-4 min-w-[150px]">Validity / Status</th>
                <th className="py-3 px-4 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredDrivers.map((d, index) => {
                const vType = vehicleTypes.find((v) => v.name === d.vehicleType);
                const requiresPayment = vType && vType.monthlyFee > 0;
                let isUnlimited = false;
                let isExpired = false;
                let daysLeft = 0;

                if (!requiresPayment) {
                  isUnlimited = true;
                  isExpired = false;
                } else {
                  if (d.expiryDate?.toDate && d.expiryDate.toDate().getFullYear() > 2090) {
                    isExpired = true;
                  } else {
                    isExpired = d.expiryDate?.toDate ? d.expiryDate.toDate() < new Date() : true;
                    if (d.expiryDate?.toDate && !isExpired) {
                      daysLeft = Math.ceil((d.expiryDate.toDate().getTime() - Date.now()) / 86400000);
                    }
                  }
                }

                const isActive = d.isActive && !isExpired;
                const vehicleBadge = getVehicleTag(d.vehicleType);
                const VehicleIcon = vehicleBadge.icon;
                const avatarStyle = getAvatarStyle(d.name);
                const initials = getInitials(d.name);
                const cleanPhone = (d.phone || '').replace(/[^0-9]/g, '');

                return (
                  <tr
                    key={d.id}
                    className="hover:bg-orange-50/25 transition-colors group"
                  >
                    {/* Index */}
                    <td className="py-3.5 px-4 text-center font-mono text-[11px] text-gray-400 font-semibold align-middle">
                      {index + 1}
                    </td>

                    {/* Driver Profile */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border shrink-0 shadow-2xs',
                            avatarStyle
                          )}
                        >
                          {initials}
                        </div>

                        {/* Name & Contacts */}
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 text-sm tracking-tight truncate group-hover:text-primary transition-colors flex items-center gap-1.5">
                            <span>{d.name || 'Unnamed Driver'}</span>
                            {isActive && (
                              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" title="Active Account" />
                            )}
                          </div>

                          {/* Phone & Instant Contact Icons */}
                          <div className="flex items-center gap-2 mt-1">
                            <a
                              href={`tel:${d.phone}`}
                              className="text-[11px] font-mono text-gray-600 hover:text-primary flex items-center gap-1 transition-colors"
                              title="Click to Call"
                            >
                              <Phone size={11} className="text-gray-400" />
                              <span>{d.phone || 'No phone'}</span>
                            </a>

                            {cleanPhone && (
                              <a
                                href={`https://wa.me/88${cleanPhone.startsWith('88') ? cleanPhone.slice(2) : cleanPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                title="Chat on WhatsApp"
                              >
                                <MessageSquare size={12} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Vehicle & Registration */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex flex-col gap-1 items-start">
                        {/* Vehicle Type Pill */}
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border',
                            vehicleBadge.bg
                          )}
                        >
                          <VehicleIcon size={11} />
                          <span>{d.vehicleType || 'Unassigned'}</span>
                        </span>

                        {/* Vehicle Model & Registration Plate */}
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          {d.vehicleModel && (
                            <span className="font-semibold text-gray-800 text-xs">
                              {d.vehicleModel}
                            </span>
                          )}

                          {d.vehicleRegNumber ? (
                            <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 tracking-wide">
                              {d.vehicleRegNumber}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">No plate</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex items-start gap-1.5 text-gray-700">
                        <MapPin size={13} className="text-orange-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-xs text-gray-900 leading-tight">
                            {[d.upazila, d.district].filter(Boolean).join(', ') || 'Location not set'}
                          </div>
                          {(d.union || d.ward || d.division) && (
                            <div className="text-[11px] text-gray-400 leading-tight mt-0.5">
                              {[d.ward, d.union, d.division].filter(Boolean).join(' • ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Status & Validity */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex flex-col gap-1 items-start">
                        {/* Status Badge */}
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border',
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          )}
                        >
                          <span
                            className={cn(
                              'w-1.5 h-1.5 rounded-full',
                              isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                            )}
                          />
                          {isActive ? 'Active' : 'Inactive'}
                        </span>

                        {/* Subscription Detail */}
                        <div className="text-[10px] font-medium mt-0.5">
                          {isUnlimited ? (
                            <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200/60 font-semibold">
                              <Sparkles size={10} />
                              Unlimited
                            </span>
                          ) : isExpired ? (
                            <span className="text-rose-500 font-semibold">Subscription Overdue</span>
                          ) : daysLeft <= 7 ? (
                            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 font-bold">
                              <Clock size={10} />
                              Expires in {daysLeft}d
                            </span>
                          ) : d.expiryDate?.toDate ? (
                            <span className="text-gray-500 flex items-center gap-1 font-mono">
                              <Calendar size={10} className="text-gray-400" />
                              {d.expiryDate.toDate().toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right align-middle">
                      <div className="flex justify-end gap-1.5 items-center">
                        {/* Edit Button */}
                        <button
                          onClick={() => startEditingDriver(d)}
                          className="p-1.5 rounded-xl border border-gray-200 text-gray-500 hover:text-primary hover:border-primary/40 hover:bg-orange-50 transition-all shadow-2xs"
                          title="Edit Driver"
                        >
                          <Edit3 size={14} />
                        </button>

                        {/* Delete Button */}
                        {(isAdmin || hasPermission('drivers.edit')) && (
                          <button
                            onClick={() => handleDeleteDriver(d.id)}
                            className="p-1.5 rounded-xl border border-gray-200 text-gray-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all shadow-2xs"
                            title="Delete Driver"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredDrivers.length === 0 && !driversLoading && (
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="p-3 bg-gray-100 rounded-2xl text-gray-400">
                        <Users size={28} />
                      </div>
                      <p className="font-bold text-gray-700 text-sm">No drivers found</p>
                      <p className="text-gray-400 text-xs">
                        Try refining your search keyword or switching the status filter tab.
                      </p>
                      {(searchQuery || driverFilterStatus !== 'all') && (
                        <button
                          onClick={() => {
                            setInternalSearchQuery('');
                            setSearchQuery('');
                            setDriverFilterStatus('all');
                          }}
                          className="mt-2 text-xs font-bold text-primary hover:underline"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Load More Pagination Footer */}
        {driversHasMore && !searchQuery && (
          <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50/50">
            <span className="text-xs font-semibold text-gray-500">
              Showing <span className="text-gray-900 font-bold">{filteredDrivers.length}</span> drivers
            </span>
            <button
              onClick={() => fetchDrivers(true)}
              disabled={driversLoadingMore}
              className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-xs disabled:opacity-50 flex items-center gap-2"
            >
              {driversLoadingMore && <RefreshCw size={12} className="animate-spin" />}
              <span>{driversLoadingMore ? 'Loading More...' : 'Load 50 More Drivers'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Edit Driver Slide-over / Modal */}
      {editingDriverId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div
            className="fixed inset-0"
            onClick={cancelEditingDriver}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-orange-100 text-orange-600">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Edit Driver Profile</h3>
                  <p className="text-xs text-gray-400">Update vehicle details, location & active status</p>
                </div>
              </div>
              <button
                onClick={cancelEditingDriver}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Personal Information */}
              <div>
                <h4 className="font-bold text-gray-400 uppercase tracking-wider text-[11px] mb-3">
                  Driver Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editDriverForm.name}
                      onChange={(e) => setEditDriverForm({ ...editDriverForm, name: e.target.value })}
                      placeholder="e.g. Rohim Miya"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={editDriverForm.phone}
                      onChange={(e) => setEditDriverForm({ ...editDriverForm, phone: e.target.value })}
                      placeholder="e.g. 01710101010"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Vehicle Information */}
              <div>
                <h4 className="font-bold text-gray-400 uppercase tracking-wider text-[11px] mb-3">
                  Vehicle Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Vehicle Type</label>
                    <select
                      value={editDriverForm.vehicleType}
                      onChange={(e) => setEditDriverForm({ ...editDriverForm, vehicleType: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-xs font-semibold"
                    >
                      <option value="">Select Type</option>
                      {vehicleTypes.map((v) => (
                        <option key={v.id} value={v.name}>
                          {v.name} ({v.monthlyFee ? `৳${v.monthlyFee}/mo` : 'Free'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Vehicle Model</label>
                    <input
                      type="text"
                      value={editDriverForm.vehicleModel}
                      onChange={(e) => setEditDriverForm({ ...editDriverForm, vehicleModel: e.target.value })}
                      placeholder="e.g. 2013 (Private Car)"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Registration Number</label>
                    <input
                      type="text"
                      value={editDriverForm.vehicleRegNumber}
                      onChange={(e) => setEditDriverForm({ ...editDriverForm, vehicleRegNumber: e.target.value })}
                      placeholder="e.g. 161332"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Location Hierarchy */}
              <div>
                <h4 className="font-bold text-gray-400 uppercase tracking-wider text-[11px] mb-3">
                  Operational Location
                </h4>
                <div className="bg-gray-50/70 p-3.5 rounded-2xl border border-gray-200/80">
                  <CascadingFilter
                    compact
                    hideVehicleType={true}
                    initialState={editDriverForm}
                    onFilterChange={(filters) => setEditDriverForm({ ...editDriverForm, ...filters })}
                  />
                </div>
              </div>

              {/* Vehicle Specifications & Options */}
              <div>
                <h4 className="font-bold text-gray-400 uppercase tracking-wider text-[11px] mb-3">
                  Specifications & Features
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-3">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Seating Capacity</label>
                    <input
                      type="text"
                      value={editDriverForm.seatingCapacity}
                      onChange={(e) => setEditDriverForm({ ...editDriverForm, seatingCapacity: e.target.value })}
                      placeholder="e.g. 4"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Load Capacity</label>
                    <input
                      type="text"
                      value={editDriverForm.capacity}
                      onChange={(e) => setEditDriverForm({ ...editDriverForm, capacity: e.target.value })}
                      placeholder="e.g. 2 Ton"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Vehicle Length</label>
                    <input
                      type="text"
                      value={editDriverForm.vehicleLength}
                      onChange={(e) => setEditDriverForm({ ...editDriverForm, vehicleLength: e.target.value })}
                      placeholder="e.g. 14 ft"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-xs"
                    />
                  </div>
                </div>

                {/* Feature Checkboxes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={editDriverForm.isSelfDriving || false}
                      onChange={(e) => setEditDriverForm({ ...editDriverForm, isSelfDriving: e.target.checked })}
                      className="accent-primary rounded"
                    />
                    <span className="font-semibold text-gray-700">Self Driving</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={editDriverForm.isAirAmbulance || false}
                      onChange={(e) => setEditDriverForm({ ...editDriverForm, isAirAmbulance: e.target.checked })}
                      className="accent-primary rounded"
                    />
                    <span className="font-semibold text-gray-700">Air Ambulance</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={editDriverForm.isCovered || false}
                      onChange={(e) => setEditDriverForm({ ...editDriverForm, isCovered: e.target.checked })}
                      className="accent-primary rounded"
                    />
                    <span className="font-semibold text-gray-700">Covered</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={editDriverForm.autoPay || false}
                      onChange={(e) => setEditDriverForm({ ...editDriverForm, autoPay: e.target.checked })}
                      className="accent-primary rounded"
                    />
                    <span className="font-semibold text-gray-700">Auto Pay</span>
                  </label>
                </div>
              </div>

              {/* Status Toggle */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Account Status</h4>
                  <p className="text-gray-400 text-xs">When inactive, this driver will not be shown in public searches.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditDriverForm({ ...editDriverForm, isActive: !editDriverForm.isActive })}
                  className={cn(
                    'px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2',
                    editDriverForm.isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-gray-200 text-gray-700'
                  )}
                >
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full',
                      editDriverForm.isActive ? 'bg-white' : 'bg-gray-500'
                    )}
                  />
                  <span>{editDriverForm.isActive ? 'Active' : 'Inactive'}</span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-2.5 bg-gray-50/60">
              <button
                type="button"
                onClick={cancelEditingDriver}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingEdit}
                onClick={() => saveEditedDriver(editingDriverId)}
                className="bg-primary text-white px-5 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-xs disabled:opacity-50 flex items-center gap-2"
              >
                {savingEdit ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriversTab;
