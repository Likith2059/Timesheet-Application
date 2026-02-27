import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage         from './pages/LoginPage';
import DashboardPage     from './pages/DashboardPage';
import TimesheetPage     from './pages/TimesheetPage';
import LeavePage         from './pages/LeavePage';
import AdminDashboard    from './pages/AdminDashboard';
import AdminEmployees    from './pages/AdminEmployees';
import AdminLeaves       from './pages/AdminLeaves';
import AdminTimesheets   from './pages/AdminTimesheets';
import ReportsPage       from './pages/ReportsPage';
import Layout            from './components/common/Layout';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/></div>;
  if (!user)   return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />
      <Route path="/" element={<Navigate to="/dashboard" />} />

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="dashboard"  element={<DashboardPage />} />
        <Route path="timesheet"  element={<TimesheetPage />} />
        <Route path="leaves"     element={<LeavePage />} />

        {/* Admin / Manager routes */}
        <Route path="admin/dashboard"  element={<ProtectedRoute roles={['admin','manager']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="admin/employees"  element={<ProtectedRoute roles={['admin']}><AdminEmployees /></ProtectedRoute>} />
        <Route path="admin/timesheets" element={<ProtectedRoute roles={['admin','manager']}><AdminTimesheets /></ProtectedRoute>} />
        <Route path="admin/leaves"     element={<ProtectedRoute roles={['admin','manager']}><AdminLeaves /></ProtectedRoute>} />
        <Route path="reports"          element={<ProtectedRoute roles={['admin','manager']}><ReportsPage /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
