import React, { useState, useEffect } from 'react';
import { MessageCircle, PhoneCall } from 'lucide-react';
import { collection, query, limit, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useAdmin } from '../context/AdminContext';
import { cn } from '../../lib/utils';
import axios from 'axios';

export interface RenewalsTabProps {
  setActiveTab: (tab: string) => void;
  onRenewDriver?: (driverId: string) => void;
}

export const RenewalsTab: React.FC<RenewalsTabProps> = ({ setActiveTab, onRenewDriver }) => {
  const { isAdmin, hasPermission } = useAdmin();

  const [drivers, setDrivers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [renewalSort, setRenewalSort] = useState<'priority' | 'asc' | 'desc'>('priority');
  const [renewalFilter, setRenewalFilter] = useState<'all' | 'active' | 'expired' | 'expiring_soon'>('all');
  const [renewalStartDate, setRenewalStartDate] = useState('');
  const [renewalEndDate, setRenewalEndDate] = useState('');
  const [renewalPaymentStatusFilter, setRenewalPaymentStatusFilter] = useState('all');
  const [triggeringReminders, setTriggeringReminders] = useState(false);

  useEffect(() => {
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
    fetchData();
  }, []);

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

  const filteredAndSortedDrivers = drivers
    .filter((d) => {
      const isUnlimited =
        d.expiryDate?.toDate && d.expiryDate.toDate().getFullYear() > 2090;
      if (isUnlimited) return false;

      const isExpired = !d.expiryDate?.toDate || d.expiryDate.toDate() <= new Date();
      const daysLeft = d.expiryDate?.toDate
        ? Math.ceil((d.expiryDate.toDate().getTime() - new Date().getTime()) / 86400000)
        : 0;

      if (renewalStartDate || renewalEndDate) {
        if (!d.expiryDate?.toDate) return false;
        const expiryDate = d.expiryDate.toDate();
        if (renewalStartDate && expiryDate < new Date(renewalStartDate)) return false;
        if (renewalEndDate) {
          const endDate = new Date(renewalEndDate);
          endDate.setHours(23, 59, 59, 999);
          if (expiryDate > endDate) return false;
        }
      }

      if (renewalPaymentStatusFilter !== 'all') {
        const driverPayments = payments
          .filter((p) => p.driverId === d.id)
          .sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
            return dateB - dateA;
          });

        if (renewalPaymentStatusFilter === 'none') {
          if (driverPayments.length > 0) return false;
        } else {
          if (driverPayments.length === 0) return false;
          if (driverPayments[0].status !== renewalPaymentStatusFilter) return false;
        }
      }

      if (renewalFilter === 'active') return !isExpired;
      if (renewalFilter === 'expired') return isExpired;
      if (renewalFilter === 'expiring_soon') return !isExpired && daysLeft <= 7;
      return true;
    })
    .sort((a, b) => {
      const dateA = a.expiryDate?.toDate ? a.expiryDate.toDate().getTime() : 0;
      const dateB = b.expiryDate?.toDate ? b.expiryDate.toDate().getTime() : 0;

      if (renewalSort === 'priority') {
        const now = new Date().getTime();
        const daysLeftA = dateA ? Math.ceil((dateA - now) / 86400000) : -9999;
        const daysLeftB = dateB ? Math.ceil((dateB - now) / 86400000) : -9999;

        const getCategory = (dLeft: number) => {
          if (dLeft >= 0 && dLeft <= 7) return 1;
          if (dLeft < 0) return 2;
          return 3;
        };

        const catA = getCategory(daysLeftA);
        const catB = getCategory(daysLeftB);
        if (catA !== catB) return catA - catB;
        return dateA - dateB;
      }
      return renewalSort === 'asc' ? dateA - dateB : dateB - dateA;
    });

  return (
    <div className="p-4 md:p-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold text-gray-900">Subscription Renewals</h3>
          {(isAdmin || hasPermission('renewals.whatsapp')) && (
            <button
              onClick={handleTriggerReminders}
              disabled={triggeringReminders}
              className="bg-green-100 text-green-700 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-green-200 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <MessageCircle size={14} />
              {triggeringReminders ? 'Triggering...' : 'Trigger Reminders'}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Expiry date range */}
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs shadow-sm">
            <span className="font-bold text-gray-400">Expiry From:</span>
            <input
              type="date"
              value={renewalStartDate}
              onChange={(e) => setRenewalStartDate(e.target.value)}
              className="outline-none bg-transparent text-gray-700"
            />
            <span className="font-bold text-gray-400 ml-1">To:</span>
            <input
              type="date"
              value={renewalEndDate}
              onChange={(e) => setRenewalEndDate(e.target.value)}
              className="outline-none bg-transparent text-gray-700"
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

          <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold">
            {['all', 'approved', 'pending', 'rejected', 'none'].map((status) => (
              <button
                key={status}
                onClick={() => setRenewalPaymentStatusFilter(status)}
                className={cn(
                  'px-2.5 py-1 rounded-lg capitalize transition-all',
                  renewalPaymentStatusFilter === status
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                )}
              >
                {status === 'none' ? 'No Pay' : status}
              </button>
            ))}
          </div>

          <select
            value={renewalFilter}
            onChange={(e) => setRenewalFilter(e.target.value as any)}
            className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary shadow-sm"
          >
            <option value="all">All Expiries</option>
            <option value="active">Active Only</option>
            <option value="expiring_soon">Expiring Soon (≤ 7 days)</option>
            <option value="expired">Expired Only</option>
          </select>

          <select
            value={renewalSort}
            onChange={(e) => setRenewalSort(e.target.value as any)}
            className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary shadow-sm"
          >
            <option value="priority">Priority First</option>
            <option value="asc">Earliest Expiry</option>
            <option value="desc">Latest Expiry</option>
          </select>
        </div>
      </div>

      {/* Renewals Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="py-3 px-4 font-bold text-gray-500 text-xs w-12">#</th>
              <th className="py-3 px-4 font-bold text-gray-500 text-xs">Driver</th>
              <th className="py-3 px-4 font-bold text-gray-500 text-xs">Vehicle</th>
              <th className="py-3 px-4 font-bold text-gray-500 text-xs">Status</th>
              <th className="py-3 px-4 font-bold text-gray-500 text-xs">Latest Payment</th>
              <th className="py-3 px-4 font-bold text-gray-500 text-xs">Expiry Date</th>
              <th className="py-3 px-4 font-bold text-gray-500 text-xs">Days Left</th>
              <th className="py-3 px-4 font-bold text-gray-500 text-xs text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredAndSortedDrivers.map((d, index) => {
              const isUnlimited =
                d.expiryDate?.toDate && d.expiryDate.toDate().getFullYear() > 2090;
              const isExpired =
                isUnlimited ? false : !d.expiryDate?.toDate || d.expiryDate.toDate() <= new Date();
              const daysLeft = isUnlimited
                ? 'Unlimited'
                : d.expiryDate?.toDate
                ? Math.ceil((d.expiryDate.toDate().getTime() - new Date().getTime()) / 86400000)
                : 0;
              const dateStr = d.expiryDate?.toDate
                ? d.expiryDate.toDate().getFullYear() > 2090
                  ? 'Unlimited'
                  : d.expiryDate.toDate().toLocaleDateString()
                : 'N/A';

              const phone = d.phone.startsWith('+88') ? d.phone : `+88${d.phone}`;
              const message = isExpired
                ? `হ্যালো ${d.name}, আপনার ঝটপট সার্ভিসের সাবস্ক্রিপশন ${dateStr} তারিখে শেষ হয়েছে। রাইড পেতে অনুগ্রহ করে রিনিউ করুন।`
                : `হ্যালো ${d.name}, আপনার ঝটপট সার্ভিসের সাবস্ক্রিপশন ${dateStr} তারিখে শেষ হবে। নিরবচ্ছিন্ন রাইড পেতে অনুগ্রহ করে রিনিউ করুন।`;
              const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

              const driverPayments = payments
                .filter((p) => p.driverId === d.id)
                .sort((a, b) => {
                  const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
                  const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
                  return dateB - dateA;
                });
              const latestPayment = driverPayments.length > 0 ? driverPayments[0] : null;

              return (
                <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4 font-mono text-xs text-gray-400">{index + 1}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-gray-900 text-xs">{d.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-gray-500">{d.phone}</span>
                      {(isAdmin || hasPermission('renewals.whatsapp')) && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#25D366] hover:opacity-80"
                          title="WhatsApp"
                        >
                          <MessageCircle size={13} />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-xs text-gray-800 font-semibold">{d.vehicleModel}</div>
                    <div className="text-[11px] text-gray-400">{d.vehicleType}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-md text-[10px] font-bold',
                        !isExpired ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      )}
                    >
                      {!isExpired ? 'Active' : 'Expired'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {latestPayment ? (
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold capitalize',
                          latestPayment.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : latestPayment.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-orange-100 text-orange-700'
                        )}
                      >
                        {latestPayment.status || 'approved'}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">No Payments</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs font-medium text-gray-700">{dateStr}</td>
                  <td className="py-3 px-4">
                    {isUnlimited ? (
                      <span className="font-bold text-xs text-green-600">Unlimited</span>
                    ) : isExpired ? (
                      <span className="text-red-600 font-bold text-xs">
                        Expired {Math.abs(daysLeft as number)}d ago
                      </span>
                    ) : (
                      <span
                        className={cn(
                          'font-bold text-xs',
                          (daysLeft as number) <= 7 ? 'text-orange-600' : 'text-green-600'
                        )}
                      >
                        {daysLeft}d left
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-2 items-center">
                      <a
                        href={`tel:${d.phone}`}
                        onClick={() => handleCallClick(d)}
                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-orange-50 rounded-lg transition-colors"
                        title="Call"
                      >
                        <PhoneCall size={16} />
                      </a>
                      <button
                        onClick={() => {
                          if (onRenewDriver) onRenewDriver(d.id);
                          setActiveTab('payments');
                        }}
                        className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-xs font-bold hover:bg-primary hover:text-white transition-all"
                      >
                        Renew
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredAndSortedDrivers.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-gray-400 text-xs font-semibold">
                  No drivers matching renewal filter.
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
