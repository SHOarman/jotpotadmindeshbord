import React, { useState, useEffect } from 'react';
import { Car, ShieldCheck, Banknote, Briefcase, Users, MessageCircle, CalendarDays, PhoneCall, Activity } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAdmin } from '../context/AdminContext';
import { cn } from '../../lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export interface DashboardTabProps {
  setActiveTab: (tab: string) => void;
  setDriverFilterStatus?: (status: 'all' | 'active' | 'inactive') => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ setActiveTab, setDriverFilterStatus }) => {
  const { isAdmin, isAgent, vehicleTypes } = useAdmin();
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [employeesCount, setEmployeesCount] = useState<number>(0);
  const [unreadChatsCount, setUnreadChatsCount] = useState<number>(0);
  const [pendingLeavesCount, setPendingLeavesCount] = useState<number>(0);
  const [analyticsCalls, setAnalyticsCalls] = useState<any[]>([]);
  const [callFilterDate, setCallFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [driversSnap, paymentsSnap, empSnap, callsSnap] = await Promise.all([
        getDocs(query(collection(db, 'drivers'), orderBy('createdAt', 'desc'), limit(150))),
        getDocs(query(collection(db, 'payments'), orderBy('createdAt', 'desc'), limit(150))),
        getDocs(query(collection(db, 'employees'), limit(200))),
        getDocs(query(collection(db, 'analytics_calls'), orderBy('timestamp', 'desc'), limit(500)))
      ]);

      setDrivers(driversSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setPayments(paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setEmployeesCount(empSnap.size);
      setAnalyticsCalls(callsSnap.docs.map(d => d.data()));
    } catch (e) {
      console.error('Error fetching dashboard summary:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Leaves count listener
    const leavesUnsub = onSnapshot(query(collection(db, 'leaves'), limit(50)), (snap) => {
      setPendingLeavesCount(snap.docs.filter(d => d.data().status === 'pending').length);
    });

    // Unread chats listener
    const waUnsub = onSnapshot(query(collection(db, 'whatsapp_sessions'), limit(100)), (snap) => {
      const waUnread = snap.docs.filter(d => d.data().unread).length;
      setUnreadChatsCount(waUnread);
    });

    return () => {
      leavesUnsub();
      waUnsub();
    };
  }, []);

  // Auto refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const activeDriversCount = drivers.filter(d => {
    const isUnlimited = d.expiryDate?.toDate && d.expiryDate.toDate().getFullYear() > 2090;
    if (isUnlimited) return d.isActive;
    return d.isActive && (!d.expiryDate?.toDate || d.expiryDate.toDate() > new Date());
  }).length;

  const inactiveDriversCount = drivers.filter(d => {
    const isUnlimited = d.expiryDate?.toDate && d.expiryDate.toDate().getFullYear() > 2090;
    if (isUnlimited) return !d.isActive;
    return !d.isActive || (d.expiryDate?.toDate && d.expiryDate.toDate() <= new Date());
  }).length;

  const totalRevenue = payments
    .filter(p => p.status === 'approved')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const pendingApprovalsCount = payments.filter(p => !p.status || p.status === 'pending').length;

  const filteredCalls = analyticsCalls.filter(c => {
    const dateStr = c.timestamp?.toDate
      ? c.timestamp.toDate().toISOString().split('T')[0]
      : (typeof c.timestamp === 'string' ? new Date(c.timestamp).toISOString().split('T')[0] : '');
    return dateStr === callFilterDate;
  });

  const callsByType = filteredCalls.reduce((acc, call) => {
    const t = call.vehicleType || 'Unknown';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 md:gap-8 bg-gray-50/40">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">Overview Dashboard</h2>
          <p className="text-gray-500 text-xs md:text-sm mt-0.5">Real-time statistics & business insights.</p>
        </div>
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={cn(
            'text-xs font-bold px-3.5 py-2 rounded-xl border shadow-sm flex items-center transition-all',
            autoRefresh ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          )}
        >
          <Activity size={14} className={cn('mr-1.5', autoRefresh ? 'text-green-600 animate-pulse' : 'text-gray-400')} />
          Auto Refresh {autoRefresh ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Active Drivers */}
        <div
          onClick={() => {
            if (setDriverFilterStatus) setDriverFilterStatus('active');
            setActiveTab('drivers');
          }}
          className="bg-white border flex flex-col gap-2 border-gray-100 p-6 rounded-3xl cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all group overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between z-10">
            <h3 className="text-gray-500 font-bold text-xs uppercase tracking-wider">Active Drivers</h3>
            <div className="p-2 bg-green-100 text-green-600 rounded-xl"><Car size={18} /></div>
          </div>
          <div className="flex items-end gap-2.5 z-10 mt-2">
            <p className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">{activeDriversCount}</p>
            <span className="text-green-600 font-bold text-xs mb-1 bg-green-50 px-2 py-0.5 rounded-md">Online</span>
          </div>
        </div>

        {/* Inactive / Expired */}
        <div
          onClick={() => {
            if (setDriverFilterStatus) setDriverFilterStatus('inactive');
            setActiveTab('drivers');
          }}
          className="bg-white border flex flex-col gap-2 border-gray-100 p-6 rounded-3xl cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all group overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between z-10">
            <h3 className="text-gray-500 font-bold text-xs uppercase tracking-wider">Inactive / Expired</h3>
            <div className="p-2 bg-red-100 text-red-600 rounded-xl"><ShieldCheck size={18} /></div>
          </div>
          <div className="flex items-end gap-2.5 z-10 mt-2">
            <p className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">{inactiveDriversCount}</p>
            <span className="text-red-600 font-bold text-xs mb-1 bg-red-50 px-2 py-0.5 rounded-md">Action Needed</span>
          </div>
        </div>

        {/* Total Revenue */}
        <div
          onClick={() => setActiveTab('payments')}
          className="bg-white border flex flex-col gap-2 border-gray-100 p-6 rounded-3xl cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all group overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between z-10">
            <h3 className="text-gray-500 font-bold text-xs uppercase tracking-wider">Revenue Total</h3>
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><Banknote size={18} /></div>
          </div>
          <div className="flex items-end gap-2 z-10 mt-2">
            <p className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
              <span className="text-2xl text-gray-400 mr-1">৳</span>
              {totalRevenue.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Pending Approvals */}
        <div
          onClick={() => setActiveTab('payments')}
          className="bg-white border flex flex-col gap-2 border-gray-100 p-6 rounded-3xl cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all group overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between z-10">
            <h3 className="text-gray-500 font-bold text-xs uppercase tracking-wider">Pending Approvals</h3>
            <div className="p-2 bg-purple-100 text-purple-600 rounded-xl"><Briefcase size={18} /></div>
          </div>
          <div className="flex items-end justify-between z-10 mt-2">
            <p className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">{pendingApprovalsCount}</p>
            <span className="text-purple-600 font-bold text-xs mb-1 bg-purple-50 px-2.5 py-1 rounded-lg">Review &rarr;</span>
          </div>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div onClick={() => setActiveTab('employees')} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between hover:border-gray-300 transition-colors cursor-pointer group">
          <div className="flex items-center gap-3.5">
            <div className="bg-orange-50 p-2.5 rounded-2xl text-orange-600 group-hover:bg-orange-100 transition-colors"><Users size={22} /></div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Employees</p>
              <p className="text-xl font-black text-gray-900">{employeesCount}</p>
            </div>
          </div>
          <span className="text-gray-300 group-hover:text-primary transition-colors">&rarr;</span>
        </div>

        <div onClick={() => setActiveTab('messages')} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between hover:border-gray-300 transition-colors cursor-pointer group">
          <div className="flex items-center gap-3.5">
            <div className="bg-pink-50 p-2.5 rounded-2xl text-pink-600 group-hover:bg-pink-100 transition-colors"><MessageCircle size={22} /></div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Unread Chats</p>
              <p className="text-xl font-black text-gray-900">{unreadChatsCount}</p>
            </div>
          </div>
          <span className="text-gray-300 group-hover:text-primary transition-colors">&rarr;</span>
        </div>

        <div onClick={() => setActiveTab('attendance')} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between hover:border-gray-300 transition-colors cursor-pointer group">
          <div className="flex items-center gap-3.5">
            <div className="bg-cyan-50 p-2.5 rounded-2xl text-cyan-600 group-hover:bg-cyan-100 transition-colors"><CalendarDays size={22} /></div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Leaves</p>
              <p className="text-xl font-black text-gray-900">{pendingLeavesCount}</p>
            </div>
          </div>
          <span className="text-gray-300 group-hover:text-primary transition-colors">&rarr;</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between hover:border-gray-200 transition-colors group">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3.5">
              <div className="bg-indigo-50 p-2.5 rounded-2xl text-indigo-600 group-hover:bg-indigo-100 transition-colors shrink-0">
                <PhoneCall size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider truncate">Phone Calls</p>
                <p className="text-xl font-black text-gray-900">{filteredCalls.length}</p>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">Date</span>
            <input
              type="date"
              value={callFilterDate}
              onChange={(e) => setCallFilterDate(e.target.value)}
              className="text-[11px] font-semibold border border-gray-200 rounded-lg px-2 py-1 outline-none text-gray-700 bg-gray-50 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all w-full max-w-[130px] shrink-0"
              title="Filter calls by date"
            />
          </div>
          {Object.entries(callsByType).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(callsByType).slice(0, 3).map(([type, count]) => (
                <span key={type} className="bg-indigo-50/70 text-indigo-700 text-[10px] px-2 py-0.5 rounded-md font-bold">
                  {type}: {count}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm flex flex-col">
          <h3 className="text-gray-900 font-bold text-base mb-4 flex items-center gap-2">
            <Car className="text-primary" size={18} /> Drivers by Vehicle Type
          </h3>
          <div className="flex-1 min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vehicleTypes.map(vt => ({
                name: vt.name,
                count: drivers.filter(d => d.vehicleType === vt.name).length
              })).filter(vt => vt.count > 0)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '14px', border: '1px solid #f3f4f6' }} />
                <Bar dataKey="count" fill="#ff7a00" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm flex flex-col">
          <h3 className="text-gray-900 font-bold text-base mb-4 flex items-center gap-2">
            <Activity className="text-green-500" size={18} /> 7-Day Revenue Trend
          </h3>
          <div className="flex-1 min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={Array.from({ length: 7 }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                const dateStr = d.toISOString().split('T')[0];
                const dayRevenue = payments.filter(p =>
                  p.status === 'approved' &&
                  p.createdAt &&
                  (p.createdAt.toDate ? p.createdAt.toDate().toISOString().split('T')[0] : new Date(p.createdAt).toISOString().split('T')[0]) === dateStr
                ).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
                return { date: `${d.getDate()}/${d.getMonth() + 1}`, amount: dayRevenue };
              })}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <RechartsTooltip contentStyle={{ borderRadius: '14px', border: '1px solid #f3f4f6' }} />
                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" activeDot={{ r: 5, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DashboardTab;
