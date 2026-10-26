import React, { useState } from 'react';
import { Bell, ChevronDown, Plus, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAdmin } from '../context/AdminContext';
import { auth } from '../../firebase';
import { LogoutConfirmModal } from './LogoutConfirmModal';

export interface AdminHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onQuickAdd?: () => void;
  onSelectPendingDriver?: (driverId: string) => void;
  onNavigateToPendingDrivers?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  activeTab,
  setActiveTab,
  onQuickAdd,
  onSelectPendingDriver,
  onNavigateToPendingDrivers,
}) => {
  const { profile, notifications, unreadNotificationsCount, markNotificationRead, isAdmin } = useAdmin();
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const formatTabTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return 'Overview Dashboard';
      case 'driver-registration':
        return 'Driver Registration';
      case 'vehicle-types':
        return 'Vehicle Types';
      case 'users':
        return 'Sub Admin Management';
      case 'upazila-stats':
        return 'Upazila Driver Statistics';
      case 'employeeMonitor':
        return 'Live Employee Monitor';
      case 'logs':
        return 'Activity Audit Logs';
      default:
        return `${tab.charAt(0).toUpperCase() + tab.slice(1)} Management`;
    }
  };

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
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm relative">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex items-center gap-2 outline-none"
        >
          <h2 className="text-lg font-black text-gray-900 tracking-tight">
            JOT<span className="text-primary">POT</span>{' '}
            <span className="text-[10px] text-gray-400 font-bold">ADMIN</span>
          </h2>
          <ChevronDown
            size={16}
            className={cn('text-gray-500 transition-transform', mobileMenuOpen ? 'rotate-180' : '')}
          />
        </button>

        <div className="flex items-center gap-2">
          {/* Mobile Notifications button */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 bg-gray-50 border border-gray-200 rounded-full hover:bg-gray-100 relative"
          >
            <Bell size={18} className="text-gray-600" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 top-[57px] bg-black/20 z-40"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-2xl max-h-[70vh] overflow-y-auto z-50 flex flex-col p-2">
              <div className="p-2 border-b border-gray-100 mb-1 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Navigation
                </span>
                <span className="text-xs text-gray-500">{profile?.email}</span>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowLogoutModal(true);
                }}
                className="flex items-center gap-3 px-4 py-3 w-full rounded-xl font-semibold text-red-600 hover:bg-red-50 transition-all text-left text-sm cursor-pointer"
              >
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Desktop Header */}
      <header className="hidden md:flex justify-between items-center mb-1">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {formatTabTitle(activeTab)}
          </h1>
          <p className="text-xs font-semibold text-gray-400 mt-0.5">
            Logged in as <span className="text-gray-700">{profile?.name || profile?.email || 'Admin'}</span>
            {isAdmin && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-bold text-[10px]">Super Admin</span>}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications Button */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 relative transition-all shadow-sm"
              title="Notifications"
            >
              <Bell size={18} className="text-gray-600" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
                  <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                    {unreadNotificationsCount} New
                  </span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-xs font-semibold">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const isRead = n.readBy?.includes(profile?.uid || '');
                      return (
                        <div
                          key={n.id}
                          onClick={() => {
                            markNotificationRead(n.id, n.readBy || []);
                            setShowNotifications(false);
                            if (n.type === 'registration') {
                              if (n.driverId && onSelectPendingDriver) {
                                onSelectPendingDriver(n.driverId);
                              } else if (onNavigateToPendingDrivers) {
                                onNavigateToPendingDrivers();
                              } else {
                                setActiveTab?.('drivers');
                              }
                            } else if (n.type === 'renewal') {
                              setActiveTab?.('renewals');
                            }
                          }}
                          className={cn(
                            'p-3.5 border-b border-gray-50 cursor-pointer transition-colors hover:bg-gray-50 text-left group',
                            !isRead ? 'bg-orange-50/40' : ''
                          )}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span
                              className={cn(
                                'text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1',
                                n.type === 'registration'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-orange-100 text-orange-700'
                              )}
                            >
                              {n.type === 'registration' ? 'New Driver' : 'Renewal'}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {n.createdAt?.toDate
                                ? new Date(n.createdAt.toDate()).toLocaleDateString()
                                : ''}
                            </span>
                          </div>
                          <p className={cn('text-xs mt-1 leading-snug', !isRead ? 'font-bold text-gray-900' : 'text-gray-600')}>
                            {n.message}
                          </p>
                          {n.type === 'registration' && (
                            <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-gray-100">
                              <span className="text-[11px] font-bold text-primary group-hover:underline flex items-center gap-1">
                                রিকোয়েস্ট দেখুন ও একসেপ্ট করুন &rarr;
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Action Button */}
          {onQuickAdd && (
            <button
              onClick={onQuickAdd}
              className="bg-primary text-white px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold hover:opacity-90 transition-all shadow-sm"
            >
              <Plus size={16} />
              Add New
            </button>
          )}
        </div>
      </header>

      {/* Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        loading={loggingOut}
      />
    </>
  );
};
