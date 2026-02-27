import React, { useState, useEffect } from 'react';
import { timesheetAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Calendar, Clock, TrendingUp, AlertTriangle } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const map = {
    present: 'badge-present', late: 'badge-late', absent: 'badge-absent',
    'on-leave': 'badge-leave', 'half-day': 'badge-pending', holiday: 'bg-indigo-100 text-indigo-700 inline-flex px-2 py-0.5 text-xs font-medium rounded-full'
  };
  return <span className={map[status] || 'badge-absent'}>{status}</span>;
};

export default function TimesheetPage() {
  const [records, setRecords]   = useState([]);
  const [stats,   setStats]     = useState({});
  const [loading, setLoading]   = useState(true);
  const [month,   setMonth]     = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await timesheetAPI.getMy({ month });
        setRecords(data.records);
        setStats(data.stats || {});
      } catch (err) {
        toast.error('Failed to load timesheet');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [month]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Timesheet</h1>
          <p className="text-gray-500 text-sm">Your attendance history</p>
        </div>
        <input
          type="month"
          className="input w-auto"
          value={month}
          max={format(new Date(), 'yyyy-MM')}
          onChange={e => setMonth(e.target.value)}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Present Days', value: stats.presentDays || 0, icon: Calendar, color: 'text-green-600 bg-green-50' },
          { label: 'Total Hours',  value: `${(stats.totalWorkHours || 0).toFixed(1)}h`, icon: Clock, color: 'text-blue-600 bg-blue-50' },
          { label: 'Overtime',     value: `${((stats.overtimeMinutes || 0) / 60).toFixed(1)}h`, icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
          { label: 'Late Days',    value: stats.lateDays || 0, icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-50' },
        ].map(s => (
          <div key={s.label} className="card flex items-center gap-3 p-4">
            <div className={`p-2 rounded-lg ${s.color.split(' ')[1]}`}>
              <s.icon className={`w-5 h-5 ${s.color.split(' ')[0]}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Date', 'Day', 'Clock In', 'Clock Out', 'Work Hours', 'Break', 'Overtime', 'Status', 'Late'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">No records found for this month</td></tr>
              ) : records.map(r => (
                <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{format(new Date(r.date), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3 text-gray-500">{format(new Date(r.date), 'EEE')}</td>
                  <td className="px-4 py-3 text-gray-700">{r.clockIn ? format(new Date(r.clockIn), 'hh:mm a') : '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{r.clockOut ? format(new Date(r.clockOut), 'hh:mm a') : '—'}</td>
                  <td className="px-4 py-3 font-medium">{r.totalWorkHours ? `${r.totalWorkHours}h` : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{r.totalBreakMinutes ? `${r.totalBreakMinutes}m` : '—'}</td>
                  <td className="px-4 py-3 text-purple-600">{r.overtimeMinutes ? `${r.overtimeMinutes}m` : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">
                    {r.isLate
                      ? <span className="text-yellow-600 text-xs font-medium">+{r.lateByMinutes}m</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
