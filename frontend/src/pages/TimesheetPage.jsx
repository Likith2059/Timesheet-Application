// TimesheetPage.jsx
import React, { useState, useEffect } from 'react';
import { timesheetAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Calendar, Clock, TrendingUp, AlertTriangle } from 'lucide-react';

const SBadge = ({ s }) => ({ present:'badge-present',late:'badge-late',absent:'badge-absent','on-leave':'badge-leave' }[s]
  ? <span className={({ present:'badge-present',late:'badge-late',absent:'badge-absent','on-leave':'badge-leave' }[s] || 'bg-gray-100 text-gray-600 inline-flex px-2 py-0.5 text-xs font-medium rounded-full')}>{s}</span>
  : <span className="bg-gray-100 text-gray-600 inline-flex px-2 py-0.5 text-xs font-medium rounded-full">{s}</span>);

export default function TimesheetPage() {
  const [records, setRecords] = useState([]);
  const [stats,   setStats]   = useState({});
  const [loading, setLoading] = useState(true);
  const [month,   setMonth]   = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    setLoading(true);
    timesheetAPI.getMy({ month })
      .then(({ data }) => { setRecords(data.records); setStats(data.stats||{}); })
      .catch(() => toast.error('Failed to load timesheet'))
      .finally(() => setLoading(false));
  }, [month]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-gray-900">My Timesheet</h1><p className="text-gray-500 text-sm">Your attendance history</p></div>
        <input type="month" className="input w-auto" value={month} max={format(new Date(),'yyyy-MM')} onChange={e=>setMonth(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[[Calendar,'Present Days',stats.presentDays||0,'text-green-600 bg-green-50'],[Clock,'Total Hours',`${(stats.totalWorkHours||0).toFixed(1)}h`,'text-blue-600 bg-blue-50'],[TrendingUp,'Overtime',`${((stats.overtimeMinutes||0)/60).toFixed(1)}h`,'text-purple-600 bg-purple-50'],[AlertTriangle,'Late Days',stats.lateDays||0,'text-yellow-600 bg-yellow-50']]
          .map(([Icon,label,val,cls],i) => (
            <div key={i} className="card flex items-center gap-3 p-4">
              <div className={`p-2 rounded-lg ${cls.split(' ')[1]}`}><Icon className={`w-5 h-5 ${cls.split(' ')[0]}`} /></div>
              <div><p className="text-xl font-bold text-gray-900">{val}</p><p className="text-xs text-gray-500">{label}</p></div>
            </div>
          ))}
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b">
              {['Date','Day','Clock In','Clock Out','Hours','Break','Overtime','Status','Late'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? <tr><td colSpan={9} className="text-center py-12 text-gray-400">Loading...</td></tr>
              : records.length===0 ? <tr><td colSpan={9} className="text-center py-12 text-gray-400">No records found</td></tr>
              : records.map(r=>(
                <tr key={r._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{format(new Date(r.date),'MMM d, yyyy')}</td>
                  <td className="px-4 py-3 text-gray-500">{format(new Date(r.date),'EEE')}</td>
                  <td className="px-4 py-3">{r.clockIn?format(new Date(r.clockIn),'hh:mm a'):'—'}</td>
                  <td className="px-4 py-3">{r.clockOut?format(new Date(r.clockOut),'hh:mm a'):'—'}</td>
                  <td className="px-4 py-3 font-medium">{r.totalWorkHours?`${r.totalWorkHours}h`:'—'}</td>
                  <td className="px-4 py-3 text-gray-500">{r.totalBreakMinutes?`${r.totalBreakMinutes}m`:'—'}</td>
                  <td className="px-4 py-3 text-purple-600">{r.overtimeMinutes?`${r.overtimeMinutes}m`:'—'}</td>
                  <td className="px-4 py-3"><SBadge s={r.status} /></td>
                  <td className="px-4 py-3">{r.isLate?<span className="text-yellow-600 text-xs">+{r.lateByMinutes}m</span>:'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
