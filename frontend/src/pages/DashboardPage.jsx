import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { timesheetAPI } from '../services/api';
import toast from 'react-hot-toast';
import { LogIn, LogOut, Coffee, CheckCircle, Timer } from 'lucide-react';
import { format } from 'date-fns';

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(id); }, []);
  return (
    <div className="text-center">
      <div className="text-5xl font-mono font-bold text-gray-900 tracking-tight">
        {format(time, 'hh:mm:ss')}<span className="text-2xl text-gray-400 ml-1">{format(time, 'a')}</span>
      </div>
      <p className="text-gray-500 mt-1">{format(time, 'EEEE, MMMM d, yyyy')}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [record,  setRecord]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const load = useCallback(async () => {
    try { const { data } = await timesheetAPI.getToday(); setRecord(data.record); }
    catch { toast.error('Failed to load today\'s record'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!record?.clockIn || record?.clockOut) return;
    const update = () => setElapsed(Math.max(0, Date.now() - new Date(record.clockIn).getTime() - (record.totalBreakMinutes||0)*60000));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [record]);

  const action = async (fn, msg) => {
    setActing(true);
    try { const { data } = await fn(); toast.success(msg || data.message); await load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Action failed'); }
    finally { setActing(false); }
  };

  const fmt = (ms) => { const s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; };

  const status = () => {
    if (!record)          return { label: 'Not clocked in',  dot: 'bg-gray-400',          bg: 'bg-gray-100',   text: 'text-gray-600' };
    if (record.isOnBreak) return { label: 'On Break',        dot: 'bg-yellow-500 animate-pulse', bg: 'bg-yellow-100', text: 'text-yellow-700' };
    if (record.clockOut)  return { label: 'Day Complete',    dot: 'bg-blue-500',           bg: 'bg-blue-100',   text: 'text-blue-700' };
    if (record.clockIn)   return { label: record.isLate ? 'Working (Late)' : 'Working',  dot: 'bg-green-500 animate-pulse', bg: 'bg-green-100', text: 'text-green-700' };
  };
  const st = status();

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.firstName}! 👋
        </h1>
        <p className="text-gray-500">{user?.designation} · {user?.department}</p>
      </div>

      <div className="card text-center py-8">
        <LiveClock />
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full mt-4 ${st.bg}`}>
          <div className={`w-2 h-2 rounded-full ${st.dot}`} />
          <span className={`text-sm font-medium ${st.text}`}>{st.label}</span>
        </div>

        {record?.clockIn && !record?.clockOut && (
          <div className="flex items-center justify-center gap-1.5 text-gray-500 mt-3">
            <Timer className="w-4 h-4" />
            <span className="text-sm">Work time:</span>
            <span className="font-mono font-semibold text-gray-800">{fmt(elapsed)}</span>
          </div>
        )}

        <div className="flex gap-3 justify-center mt-6 flex-wrap">
          {!record?.clockIn && (
            <button onClick={() => action(timesheetAPI.clockIn, 'Clocked in!')} disabled={acting}
              className="btn-success flex items-center gap-2 px-6 py-3 text-base">
              <LogIn className="w-5 h-5" /> Clock In
            </button>
          )}
          {record?.clockIn && !record?.clockOut && !record?.isOnBreak && (<>
            <button onClick={() => action(timesheetAPI.breakStart, 'Break started')} disabled={acting}
              className="btn-warning flex items-center gap-2 px-5 py-2.5">
              <Coffee className="w-4 h-4" /> Start Break
            </button>
            <button onClick={() => action(timesheetAPI.clockOut, 'Clocked out!')} disabled={acting}
              className="btn-danger flex items-center gap-2 px-5 py-2.5">
              <LogOut className="w-4 h-4" /> Clock Out
            </button>
          </>)}
          {record?.isOnBreak && (
            <button onClick={() => action(timesheetAPI.breakEnd, 'Break ended')} disabled={acting}
              className="btn-primary flex items-center gap-2 px-6 py-3 text-base">
              <CheckCircle className="w-5 h-5" /> End Break
            </button>
          )}
          {record?.clockOut && (
            <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-6 py-3 rounded-lg">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Day completed · {record.totalWorkHours}h worked</span>
            </div>
          )}
        </div>

        {record?.clockIn && (
          <div className="flex justify-center gap-8 mt-5 pt-5 border-t border-gray-100 text-sm">
            <div className="text-center">
              <p className="text-gray-400">Clock In</p>
              <p className="font-semibold text-gray-800">{format(new Date(record.clockIn), 'hh:mm a')}</p>
              {record.isLate && <p className="text-xs text-yellow-600">+{record.lateByMinutes}m late</p>}
            </div>
            {record.clockOut && <div className="text-center">
              <p className="text-gray-400">Clock Out</p>
              <p className="font-semibold text-gray-800">{format(new Date(record.clockOut), 'hh:mm a')}</p>
            </div>}
            {record.breaks?.length > 0 && <div className="text-center">
              <p className="text-gray-400">Break</p>
              <p className="font-semibold text-gray-800">{record.totalBreakMinutes}m</p>
            </div>}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Leave Balance</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[['Annual','annual','blue'],['Sick','sick','green'],['Casual','casual','yellow'],['Unpaid','unpaid','purple']].map(([label, key, color]) => (
            <div key={key} className="card p-4 text-center">
              <p className={`text-2xl font-bold text-${color}-600`}>{user?.leaveBalance?.[key] ?? 0}</p>
              <p className="text-sm text-gray-600">{label}</p>
              <p className="text-xs text-gray-400">days left</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
