import React, { useState, Suspense, lazy } from 'react';
import { useAuth } from '../AuthContext';
import { Navigate } from 'react-router-dom';
import { AdminProvider, useAdmin } from '../admin/context/AdminContext';
import { AdminSidebar } from '../admin/layout/AdminSidebar';
import { AdminHeader } from '../admin/layout/AdminHeader';
import { TabSkeleton } from '../admin/layout/TabSkeleton';
import { auth } from '../firebase';
import { ShieldAlert, LogOut } from 'lucide-react';

// Code-split Lazy-Loaded Admin Tabs for Maximum Performance
const DashboardTab = lazy(() => import('../admin/tabs/DashboardTab'));
const MessagesTab = lazy(() => import('../admin/tabs/MessagesTab'));
const DriversTab = lazy(() => import('../admin/tabs/DriversTab'));
const DriverRegistrationTab = lazy(() => import('../admin/tabs/DriverRegistrationTab'));
const VehicleTypesTab = lazy(() => import('../admin/tabs/VehicleTypesTab'));
const SubAdminTab = lazy(() => import('../admin/tabs/SubAdminTab'));
const LocationsTab = lazy(() => import('../admin/tabs/LocationsTab'));
const UpazilaStatsTab = lazy(() => import('../admin/tabs/UpazilaStatsTab'));
const PaymentsTab = lazy(() => import('../admin/tabs/PaymentsTab'));
const RenewalsTab = lazy(() => import('../admin/tabs/RenewalsTab'));
const EmployeesTab = lazy(() => import('../admin/tabs/EmployeesTab'));
const AttendanceTab = lazy(() => import('../admin/tabs/AttendanceTab'));
const LeavesTab = lazy(() => import('../admin/tabs/LeavesTab'));
const SalariesTab = lazy(() => import('../admin/tabs/SalariesTab'));
const LiveMonitorTab = lazy(() => import('../admin/tabs/LiveMonitorTab'));
const SettingsTab = lazy(() => import('../admin/tabs/SettingsTab'));
const ActivityLogsTab = lazy(() => import('../admin/tabs/ActivityLogsTab'));

const AdminDashboardContent: React.FC = () => {
  const { user, isAdmin, isAgent } = useAdmin();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [driverFilterStatus, setDriverFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  if (!isAdmin && !isAgent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-lg border border-gray-100 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Access Denied</h2>
          <p className="text-sm text-gray-500 mb-6">
            You do not possess the required administrator privileges to access the JOTPOT Admin Console.
          </p>
          <button
            onClick={() => auth.signOut()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-900 text-white font-bold text-sm hover:bg-gray-800 transition-colors shadow-sm"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    );
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardTab
            setActiveTab={setActiveTab}
            setDriverFilterStatus={(status) => {
              setDriverFilterStatus(status);
              setActiveTab('drivers');
            }}
          />
        );
      case 'messages':
        return <MessagesTab />;
      case 'drivers':
        return <DriversTab initialFilterStatus={driverFilterStatus} />;
      case 'driver-registration':
        return <DriverRegistrationTab />;
      case 'vehicle-types':
        return <VehicleTypesTab />;
      case 'users':
        return <SubAdminTab />;
      case 'locations':
        return <LocationsTab />;
      case 'upazila-stats':
        return <UpazilaStatsTab />;
      case 'payments':
        return <PaymentsTab />;
      case 'renewals':
        return <RenewalsTab />;
      case 'employees':
        return <EmployeesTab />;
      case 'attendance':
        return <AttendanceTab />;
      case 'leaves':
        return <LeavesTab />;
      case 'salaries':
        return <SalariesTab />;
      case 'employeeMonitor':
        return <LiveMonitorTab />;
      case 'settings':
        return <SettingsTab />;
      case 'logs':
        return <ActivityLogsTab />;
      default:
        return (
          <div className="p-8 text-center text-gray-400">
            <p>Select a tab from the sidebar to manage administration data.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden bg-gray-50/60 text-gray-900">
      {/* Sidebar Navigation - Fixed & Stationary */}
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Administrative Workspace */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Stationary Header */}
        <div className="shrink-0 bg-white md:bg-transparent md:px-8 md:pt-6 md:pb-2 border-b md:border-b-0 border-gray-200">
          <AdminHeader activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        {/* Independently Scrollable Tab Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:px-8 md:py-4 pb-24 md:pb-12">
          <Suspense fallback={<TabSkeleton />}>
            {renderActiveTab()}
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export const AdminDashboard: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">Loading Portal...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AdminProvider>
      <AdminDashboardContent />
    </AdminProvider>
  );
};

export default AdminDashboard;
