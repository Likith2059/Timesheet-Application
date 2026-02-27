import React, { useState, useEffect } from 'react';
import { reportAPI } from '../services/api';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, UserCheck, UserX, Clock, Calendar, TrendingUp, AlertCircle } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportAPI.summary()
      .then(({ data }) => setSummary(data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  if (!summary) return null;

  const { today, month, departmentStats = [] } = summary;

  const statCards = [
    { label: 'Total Employees', value: today.totalEmployees, icon: Users,     color: 'text-blue-600 bg-blue-50' },
    { label: 'Present Today',   value: today.presentToday,  icon: UserCheck,  color: 'text-green-600 bg-green-50' },
    { label: 'Absent Today',    value: today.absentToday,   icon: UserX,      color: 'text-red-600 bg-red-50' },
    { label: 'Active Sessions', value: today.activeToday,   icon: Clock,      color: 'text-purple-600 bg-purple-50' },
    { label: 'Pending Leaves',  value: today.pendingLeaves, icon: AlertCircle, color: 'text-yellow-600 bg-yellow-50' },
    { label: 'Avg Work Hours',  value: `${month.avgWorkHours}h`, icon: TrendingUp, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Overtime Hours',  value: `${month.totalOvertimeHours}h`, icon: Clock, color: 'text-pink-600 bg-pink-50' },
    { label: 'Late This Month', value: month.lateCount,     icon: Calendar,   color: 'text-orange-600 bg-orange-50' },
  ];

  const attendancePie = [
    { name: 'Present', value: today.presentToday },
    { name: 'Absent',  value: today.absentToday },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Management Overview</h1>
        <p className="text-gray-500 text-sm">Today's attendance & monthly insights</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${s.color.split(' ')[1]}`}>
              <s.icon className={`w-5 h-5 ${s.color.split(' ')[0]}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Department attendance bar */}
        {departmentStats.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-4">Department Attendance Today</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={departmentStats.map(d => ({ name: d._id || 'N/A', present: d.present, total: d.count }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="present" name="Present" fill="#3b82f6" radius={[4,4,0,0]} />
                <Bar dataKey="total"   name="Total"   fill="#e5e7eb" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Attendance pie */}
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">Today's Attendance Split</h3>
          {attendancePie.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={attendancePie} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {attendancePie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No attendance data yet today</div>
          )}
        </div>
      </div>
    </div>
  );
}
