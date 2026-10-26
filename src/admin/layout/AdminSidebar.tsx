import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  MapPin,
  CreditCard,
  Settings,
  UserPlus,
  Car,
  MessageCircle,
  CalendarClock,
  Briefcase,
  Banknote,
  LogOut,
  Clock,
  CalendarDays,
  Activity,
  Map,
  Monitor,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAdmin } from '../context/AdminContext';
import { auth } from '../../firebase';
import { LogoutConfirmModal } from './LogoutConfirmModal';

export interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unreadMessagesCount?: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = React.memo(({
  activeTab,
  setActiveTab,
  unreadMessagesCount = 0,
}) => {
  const { isAdmin, profile, pendingDriversCount } = useAdmin();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  let allTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'messages', label: 'Messages', icon: MessageCircle, badge: unreadMessagesCount > 0 },
    {
      id: 'drivers',
      label: 'Drivers',
      icon: Users,
      badge: pendingDriversCount > 0,
      badgeText: pendingDriversCount > 0 ? `${pendingDriversCount}` : undefined,
    },
    { id: 'driver-registration', label: 'Driver Registration', icon: UserPlus },
    { id: 'vehicle-types', label: 'Vehicle Types', icon: Car },
    { id: 'users', label: 'Sub Admin Management', icon: ShieldCheck },
    { id: 'locations', label: 'Locations', icon: MapPin },
    { id: 'upazila-stats', label: 'Upazila Stats', icon: Map },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'renewals', label: 'Renewals', icon: CalendarClock },
    { id: 'employees', label: 'Employees', icon: Briefcase },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'leaves', label: 'Leave Requests', icon: CalendarDays },
    { id: 'salaries', label: 'Salaries', icon: Banknote },
    { id: 'employeeMonitor', label: 'Live Monitor', icon: Monitor },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'logs', label: 'Activity Logs', icon: Activity },
  ];

  if (!isAdmin && profile?.rules) {
    const allowedTabs = profile.rules.split(',').map((r) => r.trim());
    allTabs = allTabs.filter(
      (t) =>
        t.id === 'dashboard' ||
        t.id === 'messages' ||
        allowedTabs.some((r) => r.startsWith(t.id))
    );
  } else if (!isAdmin) {
    allTabs = allTabs.filter((t) => t.id === 'dashboard' || t.id === 'messages');
  }

  const handleConfirmLogout = async () => {
    try {
      setLoggingOut(true);
      await auth.signOut();
    } catch (e) {
      console.error('Logout error:', e);
      setLoggingOut(false);
    }
  };

  return (
    <>
      <aside className="w-full md:w-64 bg-white border-t md:border-t-0 md:border-r border-gray-200 flex flex-row md:flex-col shrink-0 fixed bottom-0 left-0 z-50 md:static md:h-screen md:overflow-hidden select-none">
        {/* Desktop Brand - Stationary Top */}
        <div className="p-4 md:px-6 md:py-5 border-b border-gray-100 hidden md:flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-gray-900 tracking-tighter">
            JOT<span className="text-primary font-black">POT</span>{' '}
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-700 uppercase tracking-widest ml-1">
              ADMIN
            </span>
          </h2>
        </div>

        {/* Nav Items - Independently Scrollable */}
        <nav className="flex-1 p-2 md:p-3 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-y-auto items-center md:items-stretch h-[72px] md:h-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full">
          {allTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 px-3 md:px-4 py-1.5 md:py-2.5 rounded-xl text-[10px] md:text-sm font-semibold transition-all whitespace-nowrap min-w-[70px] md:min-w-0 flex-1 md:flex-none relative text-left',
                  isActive
                    ? 'bg-orange-50 text-orange-600 shadow-sm md:shadow-none'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon
                  size={18}
                  className={cn('md:w-5 md:h-5', isActive ? 'text-orange-600' : 'opacity-70')}
                />
                <span className="truncate">{tab.label}</span>
                {tab.badgeText ? (
                  <span className="hidden md:inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-white shrink-0 ml-auto animate-pulse shadow-xs">
                    {tab.badgeText} New
                  </span>
                ) : tab.badge ? (
                  <span className="absolute top-1 md:static right-2 w-2 h-2 rounded-full bg-red-500 shrink-0 ml-auto" />
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Logout button */}
        <div className="p-2 md:p-4 border-l md:border-l-0 md:border-t border-gray-100 flex items-center md:block bg-white shrink-0">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 px-3 md:px-4 py-1.5 md:py-2.5 w-full rounded-xl text-[10px] md:text-sm font-semibold text-red-600 hover:bg-red-50 transition-all min-w-[70px] md:min-w-0 cursor-pointer"
          >
            <LogOut size={18} className="md:w-5 md:h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        loading={loggingOut}
      />
    </>
  );
});
