import React, { useState, useEffect } from 'react';
import { timesheetAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { CheckCircle } from 'lucide-react';

const SBadge = ({ s }) => {
  const cls = { present:'badge-present', late:'badge-late', absent:'badge-absent', 'on-leave':'badge-leave' };
  return <span className={cls[s]||'bg-gray-100 text-gray-600 inline-flex px-2 py-0.5 text-xs font-medium rounded-full'}>{s}</span>;
};

export default function AdminTimesheets() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ date: format(new Date(),'yyyy-MM-dd'), status:'' });

  const load = () => {
    setLoading(true);
    timesheetAPI.getAll(filters).then(({data})=>setRecords(data.records)).catch(()=>toast.error('Failed')).finally(()=>setLoading(false));
  };

  useEffect(() => { load(); }, [filters]);

  const approve = async (id) => {
    try { await timesheetAPI.approve(id); toast.success('Approved'); load(); }
    catch { toast.error('Failed'); }
  };

  const f = k => e => setFilters(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1><p className="text-gray-500 text-sm">View and approve employee attendance</p></div>
      <div className="card p-4 flex flex-wrap gap-3">
        <input type="date" className="input w-auto" value={filters.date} onChange={f('date')} />
        <select className="input w-auto" value={filters.status} onChange={f('status')}>
          <option value="">All Status</option>
          {['present','late','absent','on-leave','half-day'].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b">
              {['Employee','Dept','Clock In','Clock Out','Hours','Break','Overtime','Status','Late','Approved',''].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? <tr><td colSpan={11} className="text-center py-10 text-gray-400">Loading...</td></tr>
              : records.length===0 ? <tr><td colSpan={11} className="text-center py-10 text-gray-400">No records found</td></tr>
              : records.map(r=>(
                <tr key={r._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><div className="font-medium text-gray-900">{r.employee?.firstName} {r.employee?.lastName}</div><div className="text-xs text-gray-400">{r.employee?.employeeId}</div></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{r.employee?.department}</td>
                  <td className="px-4 py-3">{r.clockIn?format(new Date(r.clockIn),'hh:mm a'):'—'}</td>
                  <td className="px-4 py-3">{r.clockOut?format(new Date(r.clockOut),'hh:mm a'):'—'}</td>
                  <td className="px-4 py-3 font-medium">{r.totalWorkHours?`${r.totalWorkHours}h`:'—'}</td>
                  <td className="px-4 py-3 text-gray-500">{r.totalBreakMinutes?`${r.totalBreakMinutes}m`:'—'}</td>
                  <td className="px-4 py-3 text-purple-600">{r.overtimeMinutes?`${r.overtimeMinutes}m`:'—'}</td>
                  <td className="px-4 py-3"><SBadge s={r.status}/></td>
                  <td className="px-4 py-3">{r.isLate?<span className="text-yellow-600 text-xs">+{r.lateByMinutes}m</span>:'—'}</td>
                  <td className="px-4 py-3">{r.isApproved?<span className="text-green-600 text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3"/>Yes</span>:<span className="text-gray-400 text-xs">No</span>}</td>
                  <td className="px-4 py-3">{!r.isApproved&&r.clockIn&&<button onClick={()=>approve(r._id)} className="text-xs btn-primary py-1 px-2">Approve</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
