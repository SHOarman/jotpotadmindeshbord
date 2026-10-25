import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AdminDashboard } from './pages/AdminDashboard';
import { LoginPage } from './pages/LoginPage';
import { EmployeePortal } from './pages/EmployeePortal';
import { AuthProvider, useAuth } from './AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import './i18n';
import { Toaster } from 'react-hot-toast';

const ThemeApplier = () => {
  useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, []);
  return null;
};

// Root route handler: if authenticated as admin/agent, show AdminDashboard; if employee, show EmployeePortal; otherwise, show LoginPage
const RootRoute = () => {
  const { user, isAgent, isEmployee, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-gray-500">Loading Jotpot Admin...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isEmployee) {
    return <Navigate to="/portal" replace />;
  }

  if (isAgent) {
    return <AdminDashboard />;
  }

  return <Navigate to="/login" replace />;
};

export default function App() {
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.primaryColor) {
          document.documentElement.style.setProperty('--primary-color', data.primaryColor);
        }
        if (data.secondaryColor) {
          document.documentElement.style.setProperty('--secondary-color', data.secondaryColor);
        }
      }
    }, (error) => {
      console.error("Error in global settings listener:", error);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthProvider>
      <ThemeApplier />
      <Router>
        <div className="min-h-screen bg-gray-50 font-sans">
          <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/portal" element={<EmployeePortal />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <Toaster position="top-right" />
      </Router>
    </AuthProvider>
  );
}
