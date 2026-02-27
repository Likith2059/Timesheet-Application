import React, { useState, useEffect } from 'react';
import { timesheetAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { CheckCircle, Search } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const map = {
    present: 'badge-present', late: 'badge-late', absent: 'badge-absent',
    'on-leave': 'badge-leave', 'half-day': 'badge-pending'
  };
  return <span className={map[status] || 'bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full'}>{status}</span>;
};

export default function AdminTimesheets() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ date: format(new Date(), 'yyyy-MM-dd'), department: '', status: '' });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await timesheetAPI.getAll(filters);
      setRecords(data.records);
    } catch { toast.error('Failed to load records'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters]);

  const approve = async (id) => {
    try {
      await timesheetAPI.approve(id);
      toast.success('Approved');
      load();
    } catch { toast.error('Approval failed'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
        <p className="text-gray-500 text-sm">View and approve employee attendance</p>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <input type="date" className="input w-auto" value={filters.date}
          onChange={e => setFilters(f => ({ ...f, date: e.target.value }))} />
        <select className="input w-auto" value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Status</option>
          {['present', 'late', 'absent', 'on-leave', 'half-day'].map(s => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>
        <input placeholder="Department..." className="input w-40" value={filters.department}
          onChange={e => setFilters(f => ({ ...f, department: e.target.value }))} />
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Employee', 'Dept', 'Clock In', 'Clock Out', 'Hours', 'Break', 'Overtime', 'Status', 'Late', 'Approved', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={11} className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-10 text-gray-400">No records found</td></tr>
              ) : records.map(r => (
                <tr key={r._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{r.employee?.firstName} {r.employee?.lastName}</div>
                    <div className="text-xs text-gray-400">{r.employee?.employeeId}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.employee?.department}</td>
                  <td className="px-4 py-3 text-gray-700">{r.clockIn ? format(new Date(r.clockIn), 'hh:mm a') : '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{r.clockOut ? format(new Date(r.clockOut), 'hh:mm a') : '—'}</td>
                  <td className="px-4 py-3 font-medium">{r.totalWorkHours ? `${r.totalWorkHours}h` : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{r.totalBreakMinutes ? `${r.totalBreakMinutes}m` : '—'}</td>
                  <td className="px-4 py-3 text-purple-600">{r.overtimeMinutes ? `${r.overtimeMinutes}m` : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">
                    {r.isLate ? <span className="text-yellow-600 text-xs">+{r.lateByMinutes}m</span> : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {r.isApproved
                      ? <span className="text-green-600 text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Yes</span>
                      : <span className="text-gray-400 text-xs">No</span>}
                  </td>
                  <td className="px-4 py-3">
                    {!r.isApproved && r.clockIn && (
                      <button onClick={() => approve(r._id)} className="text-xs btn-primary py-1 px-2">Approve</button>
                    )}
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
