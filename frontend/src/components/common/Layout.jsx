import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Clock, LayoutDashboard, CalendarDays, FileText, Users, ClipboardList, BarChart3, LogOut, Menu, X } from 'lucide-react';

const NavItem = ({ to, icon: Icon, label, onClick }) => (
  <NavLink to={to} onClick={onClick}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
       ${isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
    <Icon className="w-4 h-4 flex-shrink-0" />
    {label}
  </NavLink>
);

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const [open, setOpen]  = useState(false);
  const isAdmin   = user?.role === 'admin';
  const isManager = user?.role === 'manager' || isAdmin;

  const close = () => setOpen(false);

  const Sidebar = () => (
    <div className="flex flex-col w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
        <div className="bg-blue-600 p-1.5 rounded-lg"><Clock className="w-5 h-5 text-white" /></div>
        <span className="text-lg font-bold text-gray-900">TimesheetPro</span>
        <button onClick={close} className="ml-auto p-1 lg:hidden"><X className="w-5 h-5 text-gray-400" /></button>
      </div>
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">{user?.fullName?.charAt(0)}</div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.fullName}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role} · {user?.employeeId}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Employee</p>
        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard"    onClick={close} />
        <NavItem to="/timesheet" icon={Clock}           label="My Timesheet" onClick={close} />
        <NavItem to="/leaves"    icon={CalendarDays}    label="My Leaves"    onClick={close} />
        {isManager && <>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mt-5 mb-2">Management</p>
          <NavItem to="/admin/dashboard"  icon={BarChart3}    label="Overview"    onClick={close} />
          <NavItem to="/admin/timesheets" icon={ClipboardList} label="Attendance"  onClick={close} />
          <NavItem to="/admin/leaves"     icon={CalendarDays} label="Leave Requests" onClick={close} />
          <NavItem to="/reports"          icon={FileText}     label="Reports"     onClick={close} />
          {isAdmin && <NavItem to="/admin/employees" icon={Users} label="Employees" onClick={close} />}
        </>}
      </nav>
      <div className="px-3 py-4 border-t border-gray-100">
        <button onClick={() => { logout(); navigate('/login'); }}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="hidden lg:flex"><Sidebar /></div>
      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="relative flex flex-col w-64 bg-white"><Sidebar /></div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button onClick={() => setOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1 rounded-md"><Clock className="w-4 h-4 text-white" /></div>
            <span className="font-bold text-gray-900">TimesheetPro</span>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto"><Outlet /></main>
      </div>
    </div>
  );
}
