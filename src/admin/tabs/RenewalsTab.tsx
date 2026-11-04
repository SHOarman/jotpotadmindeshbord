import React, { useState, useEffect } from 'react';
import {
  MessageCircle,
  PhoneCall,
  RefreshCw,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  Calendar,
  Check,
  Plus,
  Search,
} from 'lucide-react';
import {
  collection,
  query,
  limit,
  getDocs,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useAdmin } from '../context/AdminContext';
import { cn, formatVehicleTypeBn } from '../../lib/utils';
import axios from 'axios';
import { syncDriversSubscriptionStatus } from '../../lib/subscriptionSync';

export interface RenewalsTabProps {
  setActiveTab: (tab: string) => void;
  onRenewDriver?: (driverId: string) => void;
}

export const RenewalsTab: React.FC<RenewalsTabProps> = ({
  setActiveTab,
  onRenewDriver,
}) => {
  const {
    isAdmin,
    hasPermission,
    vehicleTypes,
    globalSettings,
    profile,
    user,
    logAction,
  } = useAdmin();

  const [drivers, setDrivers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [renewalSort, setRenewalSort] = useState<'priority' | 'asc' | 'desc'>('priority');
  const [renewalFilter, setRenewalFilter] = useState<
    'all' | 'pending' | 'active' | 'expired' | 'expiring_soon' | 'unlimited'
  >('all');
  const [renewalStartDate, setRenewalStartDate] = useState('');
  const [renewalEndDate, setRenewalEndDate] = useState('');
  const [renewalPaymentStatusFilter, setRenewalPaymentStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [triggeringReminders, setTriggeringReminders] = useState(false);
  const [syncingExpired, setSyncingExpired] = useState(false);
  const [approvingPaymentId, setApprovingPaymentId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dSnap, pSnap] = await Promise.all([
        getDocs(query(collection(db, 'drivers'), limit(300))),
        getDocs(query(collection(db, 'payments'), limit(300))),
      ]);
      setDrivers(dSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setPayments(pSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error fetching renewals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Approve a pending renewal payment & update driver
  const handleApproveRenewal = async (driver: any, payment: any) => {
    if (!driver && !payment) return;
    const targetDriverId = driver?.id || payment?.driverId;
    const targetPaymentId = payment?.id;
    const approverName = profile?.name || user?.email || 'Admin';

    try {
      setApprovingPaymentId(targetPaymentId || targetDriverId);

      // 1. Approve payment doc if exists
      if (targetPaymentId) {
        await setDoc(
          doc(db, 'payments', targetPaymentId),
          {
            status: 'approved',
            approvedByUid: profile?.uid || user?.uid || null,
            approvedByName: approverName,
            approvedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      // 2. Extend driver's validity
      const durationDays = Number(payment?.durationDays) || 30;
      let curExp = driver?.expiryDate?.toDate
        ? driver.expiryDate.toDate()
        : driver?.expiryDate instanceof Date
        ? driver.expiryDate
        : driver?.expiryDate
        ? new Date(driver.expiryDate)
        : new Date();

      if (isNaN(curExp.getTime()) || !driver?.isActive || curExp < new Date() || curExp.getFullYear() > 2090) {
        curExp = new Date();
      }

      const newExpiry = new Date(curExp.getTime() + durationDays * 86400000);

      await setDoc(
        doc(db, 'drivers', targetDriverId),
        {
          expiryDate: newExpiry,
          durationDays: durationDays,
          isActive: true,
          status: 'approved',
          subscriptionStatus: 'active',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Update local state
      setDrivers((prev) =>
        prev.map((d) =>
          d.id === targetDriverId
            ? { ...d, expiryDate: newExpiry, durationDays, isActive: true, status: 'approved', subscriptionStatus: 'active' }
            : d
        )
      );

      setPayments((prev) =>
        prev.map((p) =>
          p.id === targetPaymentId
            ? { ...p, status: 'approved', approvedByName: approverName }
            : p
        )
      );

      if (logAction) {
        await logAction(
          'renew_approve',
          `Approved renewal for ${driver?.name || payment?.driverName} (${durationDays} days)`
        );
      }

      alert(
        `✓ ড্রাইভার "${driver?.name || payment?.driverName}" এর ${durationDays} দিনের রিনিউ আবেদন অনুমোদিত হয়েছে এবং মেয়াদ সফলভাবে বাড়ানো হয়েছে!`
      );
    } catch (err: any) {
      console.error('Error approving renewal:', err);
      alert('রিনিউ অনুমোদন করতে সমস্যা হয়েছে: ' + (err?.message || 'Error'));
    } finally {
      setApprovingPaymentId(null);
    }
  };

  // Quick Add Days (+30d, +90d, etc.) directly from Renewals table
  const handleQuickAddDays = async (driver: any, days: number) => {
    if (!driver?.id) return;
    try {
      setApprovingPaymentId(driver.id);
      let curExp = driver.expiryDate?.toDate
        ? driver.expiryDate.toDate()
        : driver.expiryDate instanceof Date
        ? driver.expiryDate
        : driver.expiryDate
        ? new Date(driver.expiryDate)
        : new Date();

      if (isNaN(curExp.getTime()) || !driver.isActive || curExp < new Date() || curExp.getFullYear() > 2090) {
        curExp = new Date();
      }

      const newExpiry = new Date(curExp.getTime() + days * 86400000);

      await setDoc(
        doc(db, 'drivers', driver.id),
        {
          expiryDate: newExpiry,
          durationDays: days,
          isActive: true,
          status: 'approved',
          subscriptionStatus: 'active',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setDrivers((prev) =>
        prev.map((d) =>
          d.id === driver.id
            ? { ...d, expiryDate: newExpiry, durationDays: days, isActive: true, status: 'approved', subscriptionStatus: 'active' }
            : d
        )
      );

      if (logAction) {
        await logAction('renew_extend', `Added ${days} days for ${driver.name}`);
      }
      alert(`✓ "${driver.name}" এর মেয়াদ সফলভাবে +${days} দিন বাড়ানো হয়েছে!`);
    } catch (err: any) {
      console.error('Error adding days:', err);
      alert('মেয়াদ বাড়াতে সমস্যা হয়েছে: ' + (err?.message || 'Error'));
    } finally {
      setApprovingPaymentId(null);
    }
  };

  const handleTriggerReminders = async () => {
    setTriggeringReminders(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      await axios.post(
        '/api/trigger-reminders',
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert('Renewal check and WhatsApp reminder process triggered successfully!');
    } catch (err: any) {
      console.error('Error triggering reminders:', err);
      alert('Failed to trigger reminders.');
    } finally {
      setTriggeringReminders(false);
    }
  };

  const handleSyncExpiredDrivers = async () => {
    setSyncingExpired(true);
    try {
      const res = await syncDriversSubscriptionStatus(
        vehicleTypes,
        globalSettings?.allVehiclesFree
      );
      await fetchData();
      alert(
        `✓ সাবস্ক্রিপশন সিঙ্ক সম্পন্ন!\n\n• মেয়াদোত্তীর্ণ ও পেমেন্টহীন নিষ্ক্রিয় করা হয়েছে: ${res.deactivatedExpired} টি গাড়ি\n• ফ্রি মোডে সচল করা হয়েছে: ${res.reactivatedFree} টি গাড়ি\n\nঅ্যাপ এবং ওয়েবসাইটে এক্সপায়ার্ড গাড়ি আর দেখা যাবে না।`
      );
    } catch (e) {
      console.error('Error syncing expired drivers:', e);
      alert('সিঙ্ক করতে সমস্যা হয়েছে।');
    } finally {
      setSyncingExpired(false);
    }
  };

  const handleCallClick = async (driver: any) => {
    try {
      await addDoc(collection(db, 'analytics_calls'), {
        driverId: driver.id,
        driverName: driver.name,
        vehicleType: driver.vehicleType,
        timestamp: serverTimestamp(),
        date: new Date().toISOString().split('T')[0],
      });
    } catch (err) {
      console.error('Error logging call:', err);
    }
  };

  // Find all pending renewal payment requests
  const pendingRenewals = payments
    .filter((p) => p.status === 'pending')
    .map((p) => {
      const pClean = (p.driverPhone || '').replace(/[^0-9]/g, '');
      const matchedDriver = drivers.find(
        (d) =>
          d.id === p.driverId ||
          (d.phone && pClean && d.phone.replace(/[^0-9]/g, '') === pClean)
      );
      return { payment: p, driver: matchedDriver };
    });

  // Filter & Sort Drivers for the Renewals Directory
  const filteredAndSortedDrivers = drivers
    .filter((d) => {
      // Clean phone and search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          (d.name || '').toLowerCase().includes(q) ||
          (d.phone || '').includes(q) ||
          (d.vehicleModel || '').toLowerCase().includes(q) ||
          (d.vehicleType || '').toLowerCase().includes(q) ||
          (d.vehicleRegNumber || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Check payments for this driver
      const dClean = (d.phone || '').replace(/[^0-9]/g, '');
      const driverPayments = payments
        .filter(
          (p) =>
            p.driverId === d.id ||
            (p.driverPhone && dClean && p.driverPhone.replace(/[^0-9]/g, '') === dClean)
        )
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
          return dateB - dateA;
        });

      const hasPendingPayment = driverPayments.some((p) => p.status === 'pending');

      // Date parsing
      const expObj = d.expiryDate?.toDate
        ? d.expiryDate.toDate()
        : d.expiryDate instanceof Date
        ? d.expiryDate
        : d.expiryDate
        ? new Date(d.expiryDate)
        : null;

      const isUnlimited = expObj && expObj.getFullYear() > 2090;
      const isExpired = !isUnlimited && (!expObj || expObj.getTime() <= Date.now());
      const daysLeft = expObj && !isUnlimited
        ? Math.ceil((expObj.getTime() - Date.now()) / 86400000)
        : 0;

      // Filter: Payment status
      if (renewalPaymentStatusFilter !== 'all') {
        if (renewalPaymentStatusFilter === 'none') {
          if (driverPayments.length > 0) return false;
        } else {
          if (driverPayments.length === 0) return false;
          if (driverPayments[0].status !== renewalPaymentStatusFilter) return false;
        }
      }

      // Filter: Date range
      if (renewalStartDate || renewalEndDate) {
        if (!expObj) return false;
        if (renewalStartDate && expObj < new Date(renewalStartDate)) return false;
        if (renewalEndDate) {
          const endDate = new Date(renewalEndDate);
          endDate.setHours(23, 59, 59, 999);
          if (expObj > endDate) return false;
        }
      }

      // Filter: Renewal status
      if (renewalFilter === 'pending') return hasPendingPayment;
      if (renewalFilter === 'active') return !isExpired && !isUnlimited;
      if (renewalFilter === 'expired') return isExpired;
      if (renewalFilter === 'expiring_soon') return !isExpired && !isUnlimited && daysLeft <= 7;
      if (renewalFilter === 'unlimited') return isUnlimited;

      return true;
    })
    .sort((a, b) => {
      const expA = a.expiryDate?.toDate ? a.expiryDate.toDate().getTime() : 0;
      const expB = b.expiryDate?.toDate ? b.expiryDate.toDate().getTime() : 0;

      if (renewalSort === 'priority') {
        const now = Date.now();
        const daysLeftA = expA ? Math.ceil((expA - now) / 86400000) : -9999;
        const daysLeftB = expB ? Math.ceil((expB - now) / 86400000) : -9999;

        // Pending payments always #1 priority!
        const dCleanA = (a.phone || '').replace(/[^0-9]/g, '');
        const dCleanB = (b.phone || '').replace(/[^0-9]/g, '');
        const pendA = payments.some((p) => p.status === 'pending' && (p.driverId === a.id || p.driverPhone?.replace(/[^0-9]/g, '') === dCleanA));
        const pendB = payments.some((p) => p.status === 'pending' && (p.driverId === b.id || p.driverPhone?.replace(/[^0-9]/g, '') === dCleanB));

        if (pendA && !pendB) return -1;
        if (!pendA && pendB) return 1;

        const getCategory = (dLeft: number) => {
          if (dLeft >= 0 && dLeft <= 7) return 1; // Expiring soon
          if (dLeft < 0) return 2; // Expired
          return 3; // Active / Future
        };

        const catA = getCategory(daysLeftA);
        const catB = getCategory(daysLeftB);
        if (catA !== catB) return catA - catB;
        return expA - expB;
      }
      return renewalSort === 'asc' ? expA - expB : expB - expA;
    });

  return (
    <div className="p-4 md:p-8">
      {/* 1. TOP PENDING RENEWALS BANNER */}
      {pendingRenewals.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50/90 border border-amber-300 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              <h4 className="font-bold text-amber-900 text-sm md:text-base flex items-center gap-2">
                <span>নতুন রিনিউ রিকোয়েস্ট এসেছে!</span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-amber-200 text-amber-900 font-extrabold">
                  {pendingRenewals.length} টি পেন্ডিং
                </span>
              </h4>
            </div>
            <span className="text-xs font-semibold text-amber-700">অনুমোদন করলে মেয়াদ সাথে সাথে যুক্ত হবে</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingRenewals.map(({ payment: p, driver: d }) => {
              const durationDays = p.durationDays || 30;
              const isApproving = approvingPaymentId === p.id || (d && approvingPaymentId === d.id);

              return (
                <div
                  key={p.id}
                  className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-gray-900 text-sm">
                          {d?.name || p.driverName || 'ড্রাইভার'}
                        </div>
                        <div className="text-xs font-mono text-gray-600">
                          {p.driverPhone || d?.phone}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-orange-100 text-orange-800 border border-orange-200">
                        {durationDays} দিন (৳{p.amount || 0})
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-gray-500 flex flex-col gap-0.5">
                      {p.transactionId && (
                        <div>
                          <span className="font-semibold text-gray-700">TrxID: </span>
                          <span className="font-mono text-gray-900 font-bold">{p.transactionId}</span>
                        </div>
                      )}
                      {p.bkashNumber && (
                        <div>
                          <span className="font-semibold text-gray-700">বিকাশ: </span>
                          <span className="font-mono">{p.bkashNumber}</span>
                        </div>
                      )}
                      {d?.vehicleType && (
                        <div className="text-[11px] text-gray-400">
                          গাড়ি: {d.vehicleModel ? `${d.vehicleModel} (${d.vehicleType})` : formatVehicleTypeBn(d.vehicleType)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={isApproving}
                      onClick={() => handleApproveRenewal(d, p)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isApproving ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>অনুমোদন হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          <span>অনুমোদন ও সচল করুন</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-gray-900">Subscription Renewals</h3>
            {(isAdmin || hasPermission('renewals.whatsapp')) && (
              <button
                onClick={handleTriggerReminders}
                disabled={triggeringReminders}
                className="bg-green-100 text-green-700 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-green-200 transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
              >
                <MessageCircle size={14} />
                {triggeringReminders ? 'Triggering...' : 'Trigger Reminders'}
              </button>
            )}

            {isAdmin && (
              <button
                onClick={handleSyncExpiredDrivers}
                disabled={syncingExpired}
                title="অ্যাপ ও ওয়েবসাইটে মেয়াদোত্তীর্ণ গাড়ি হাইড করার জন্য ড্রাইভার সাবস্ক্রিপশন সিঙ্ক করুন"
                className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
              >
                <RefreshCw size={13} className={cn('text-amber-600', syncingExpired && 'animate-spin')} />
                <span>{syncingExpired ? 'সিঙ্ক হচ্ছে...' : 'এক্সপায়ার্ড নিষ্ক্রিয় করুন (Sync App/Web)'}</span>
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            মোট ড্রাইভার: {drivers.length} জন | রিনিউ রিকোয়েস্ট: {pendingRenewals.length} টি
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search box */}
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs shadow-2xs">
            <Search size={13} className="text-gray-400" />
            <input
              type="text"
              placeholder="নাম বা মোবাইল নম্বর..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="outline-none bg-transparent text-gray-800 w-32 md:w-40 text-xs"
            />
          </div>

          {/* Expiry date range */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs shadow-2xs">
            <span className="font-bold text-gray-400 text-[11px]">From:</span>
            <input
              type="date"
              value={renewalStartDate}
              onChange={(e) => setRenewalStartDate(e.target.value)}
              className="outline-none bg-transparent text-gray-700 text-xs font-mono"
            />
            <span className="font-bold text-gray-400 text-[11px] ml-1">To:</span>
            <input
              type="date"
              value={renewalEndDate}
              onChange={(e) => setRenewalEndDate(e.target.value)}
              className="outline-none bg-transparent text-gray-700 text-xs font-mono"
            />
            {(renewalStartDate || renewalEndDate) && (
              <button
                onClick={() => {
                  setRenewalStartDate('');
                  setRenewalEndDate('');
                }}
                className="ml-1 text-[11px] text-red-500 font-bold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Payment Status Filter */}
          <div className="flex bg-gray-100 p-0.5 rounded-xl text-xs font-bold">
            {['all', 'pending', 'approved', 'none'].map((status) => (
              <button
                key={status}
                onClick={() => setRenewalPaymentStatusFilter(status)}
                className={cn(
                  'px-2 py-1 rounded-lg capitalize transition-all text-xs',
                  renewalPaymentStatusFilter === status
                    ? 'bg-white text-gray-900 shadow-2xs font-extrabold'
                    : 'text-gray-500 hover:text-gray-900'
                )}
              >
                {status === 'none' ? 'No Pay' : status === 'pending' ? 'পেন্ডিং' : status}
              </button>
            ))}
          </div>

          {/* Renewal Status Dropdown */}
          <select
            value={renewalFilter}
            onChange={(e) => setRenewalFilter(e.target.value as any)}
            className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary shadow-2xs"
          >
            <option value="all">সকল ড্রাইভার (All)</option>
            <option value="pending">পেন্ডিং রিনিউ (Pending Requests)</option>
            <option value="active">সক্রিয় মেয়াদ (Active)</option>
            <option value="expiring_soon">মেয়াদ শেষের পথে (≤ 7 days)</option>
            <option value="expired">মেয়াদ শেষ (Expired)</option>
            <option value="unlimited">ফ্রি / আজীবন (Unlimited)</option>
          </select>

          {/* Sort Dropdown */}
          <select
            value={renewalSort}
            onChange={(e) => setRenewalSort(e.target.value as any)}
            className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary shadow-2xs"
          >
            <option value="priority">Priority First</option>
            <option value="asc">Earliest Expiry</option>
            <option value="desc">Latest Expiry</option>
          </select>
        </div>
      </div>

      {/* 3. Renewals Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="py-3 px-4 font-bold text-gray-500 text-xs w-12 text-center">#</th>
              <th className="py-3 px-4 font-bold text-gray-500 text-xs min-w-[180px]">Driver</th>
              <th className="py-3 px-4 font-bold text-gray-500 text-xs min-w-[160px]">Vehicle</th>
              <th className="py-3 px-4 font-bold text-gray-500 text-xs min-w-[100px]">Status</th>
              <th className="py-3 px-4 font-bold text-gray-500 text-xs min-w-[140px]">Latest Payment</th>
              <th className="py-3 px-4 font-bold text-gray-500 text-xs min-w-[140px]">Expiry Date</th>
              <th className="py-3 px-4 font-bold text-gray-500 text-xs min-w-[150px]">Days Left</th>
              <th className="py-3 px-4 font-bold text-gray-500 text-xs text-right min-w-[180px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredAndSortedDrivers.map((d, index) => {
              const dClean = (d.phone || '').replace(/[^0-9]/g, '');
              const driverPayments = payments
                .filter(
                  (p) =>
                    p.driverId === d.id ||
                    (p.driverPhone && dClean && p.driverPhone.replace(/[^0-9]/g, '') === dClean)
                )
                .sort((a, b) => {
                  const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
                  const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
                  return dateB - dateA;
                });

              const latestPayment = driverPayments[0];
              const isPaymentPending = latestPayment?.status === 'pending';

              const expObj = d.expiryDate?.toDate
                ? d.expiryDate.toDate()
                : d.expiryDate instanceof Date
                ? d.expiryDate
                : d.expiryDate
                ? new Date(d.expiryDate)
                : null;

              const isUnlimited = expObj && expObj.getFullYear() > 2090;
              const isExpired = !isUnlimited && (!expObj || expObj.getTime() <= Date.now());
              const daysLeft = expObj && !isUnlimited
                ? Math.ceil((expObj.getTime() - Date.now()) / 86400000)
                : 0;

              const dateStr = expObj
                ? isUnlimited
                  ? 'Unlimited'
                  : expObj.toLocaleDateString()
                : 'N/A';

              const phone = d.phone.startsWith('+88') ? d.phone : `+88${d.phone}`;
              const message = isExpired
                ? `হ্যালো ${d.name}, আপনার ঝটপট সার্ভিসের সাবস্ক্রিপশন ${dateStr} তারিখে শেষ হয়েছে। রাইড পেতে অনুগ্রহ করে রিনিউ করুন।`
                : `হ্যালো ${d.name}, আপনার ঝটপট সার্ভিসের সাবস্ক্রিপশন ${dateStr} তারিখে শেষ হবে। নিরবচ্ছিন্ন রাইড পেতে অনুগ্রহ করে রিনিউ করুন।`;
              const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

              const isApproving = approvingPaymentId === d.id || (latestPayment && approvingPaymentId === latestPayment.id);

              return (
                <tr
                  key={d.id}
                  className={cn(
                    'hover:bg-orange-50/25 transition-colors',
                    isPaymentPending && 'bg-amber-50/40'
                  )}
                >
                  <td className="py-3 px-4 text-xs font-mono text-gray-400 text-center font-bold">
                    {index + 1}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                      <span>{d.name || 'ড্রাইভার'}</span>
                      {isPaymentPending && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" title="পেন্ডিং রিনিউ রিকোয়েস্ট" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-gray-500 font-mono">{d.phone}</span>
                      {(isAdmin || hasPermission('renewals.whatsapp')) && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#25D366] hover:opacity-80"
                          title="WhatsApp Reminder"
                        >
                          <MessageCircle size={13} />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-xs text-gray-800 font-semibold">{d.vehicleModel || 'গাড়ি'}</div>
                    <div className="text-[11px] text-gray-400">{d.vehicleType || 'মোটরসাইকেল'}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-md text-[10px] font-bold border',
                        isPaymentPending
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : !isExpired
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      )}
                    >
                      {isPaymentPending
                        ? 'পেন্ডিং রিনিউ'
                        : !isExpired
                        ? 'Active'
                        : 'Expired'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {latestPayment ? (
                      <div>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border',
                            latestPayment.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : latestPayment.status === 'rejected'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                          )}
                        >
                          {latestPayment.status === 'pending'
                            ? `পেন্ডিং (${latestPayment.durationDays || 30}d)`
                            : latestPayment.status}
                        </span>
                        {latestPayment.amount ? (
                          <div className="text-[10px] font-bold text-gray-500 mt-0.5">
                            ৳{latestPayment.amount} {latestPayment.transactionId ? `(${latestPayment.transactionId.slice(-6)})` : ''}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">No Payments</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs font-mono font-medium text-gray-700">
                    {dateStr}
                  </td>
                  <td className="py-3 px-4">
                    {isUnlimited ? (
                      <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-bold text-xs">
                        <Sparkles size={11} /> Unlimited
                      </span>
                    ) : isExpired ? (
                      <span className="text-rose-600 font-bold text-xs">
                        Expired {Math.abs(daysLeft)}d ago
                      </span>
                    ) : (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded border font-bold text-xs',
                          daysLeft <= 7
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        )}
                      >
                        <Clock size={11} />
                        {daysLeft} দিন বাকি
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-1.5 items-center">
                      <a
                        href={`tel:${d.phone}`}
                        onClick={() => handleCallClick(d)}
                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-orange-50 rounded-lg transition-colors"
                        title="Call Driver"
                      >
                        <PhoneCall size={15} />
                      </a>

                      {/* If pending payment: ONE-CLICK APPROVE BUTTON */}
                      {isPaymentPending ? (
                        <button
                          type="button"
                          disabled={isApproving}
                          onClick={() => handleApproveRenewal(d, latestPayment)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 disabled:opacity-50"
                          title="রিনিউ অনুমোদন করুন"
                        >
                          {isApproving ? (
                            <RefreshCw size={11} className="animate-spin" />
                          ) : (
                            <Check size={12} />
                          )}
                          <span>অনুমোদন</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isApproving}
                            onClick={() => handleQuickAddDays(d, 30)}
                            className="bg-primary/10 text-primary hover:bg-primary hover:text-white px-2 py-1 rounded-lg text-[11px] font-bold transition-all"
                            title="মেয়াদ +৩০ দিন বাড়ান"
                          >
                            +৩০ দিন
                          </button>
                          <button
                            type="button"
                            disabled={isApproving}
                            onClick={() => handleQuickAddDays(d, 90)}
                            className="bg-primary/10 text-primary hover:bg-primary hover:text-white px-2 py-1 rounded-lg text-[11px] font-bold transition-all"
                            title="মেয়াদ +৯০ দিন বাড়ান"
                          >
                            +৯০ দিন
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredAndSortedDrivers.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400 text-xs font-semibold">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle size={28} className="text-gray-300" />
                    <span>কোনো ড্রাইভার খুঁজে পাওয়া যায়নি। ফিল্টার পরিবর্তন করে আবার দেখুন।</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RenewalsTab;
