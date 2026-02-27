import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { timesheetAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Clock, Coffee, LogIn, LogOut, CheckCircle, AlertCircle, Timer } from 'lucide-react';
import { format } from 'date-fns';

const StatCard = ({ label, value, sub, color = 'blue' }) => {
  const colors = {
    blue:   'bg-blue-50 text-blue-700',
    green:  'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    purple: 'bg-purple-50 text-purple-700',
  };
  return (
    <div className="card text-center">
      <div className={`inline-block px-3 py-1 rounded-full text-2xl font-bold mb-1 ${colors[color]}`}>{value}</div>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
};

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="text-center">
      <div className="text-5xl font-mono font-bold text-gray-900 tracking-tight">
        {format(time, 'hh:mm:ss')}
        <span className="text-2xl text-gray-400 ml-1">{format(time, 'a')}</span>
      </div>
      <p className="text-gray-500 mt-1">{format(time, 'EEEE, MMMM d, yyyy')}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user }  = useAuth();
  const [record, setRecord]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const loadToday = useCallback(async () => {
    try {
      const { data } = await timesheetAPI.getToday();
      setRecord(data.record);
    } catch (err) {
      toast.error('Failed to load today\'s record');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadToday(); }, [loadToday]);

  // Live elapsed time counter
  useEffect(() => {
    if (!record?.clockIn || record?.clockOut) return;
    const update = () => {
      const ms = Date.now() - new Date(record.clockIn).getTime();
      const breakMs = (record.totalBreakMinutes || 0) * 60000;
      setElapsed(Math.max(0, ms - breakMs));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [record]);

  const action = async (fn, successMsg) => {
    setActing(true);
    try {
      const { data } = await fn();
      toast.success(successMsg || data.message);
      await loadToday();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    } finally {
      setActing(false);
    }
  };

  const formatElapsed = (ms) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  const statusInfo = () => {
    if (!record)             return { label: 'Not clocked in', color: 'text-gray-500', bg: 'bg-gray-100' };
    if (record.isOnBreak)    return { label: 'On Break',       color: 'text-yellow-700', bg: 'bg-yellow-100' };
    if (record.clockOut)     return { label: 'Clocked Out',    color: 'text-blue-700',   bg: 'bg-blue-100' };
    if (record.clockIn)      return { label: record.isLate ? 'Working (Late)' : 'Working', color: 'text-green-700', bg: 'bg-green-100' };
  };

  const st = statusInfo();

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.firstName}! 👋
        </h1>
        <p className="text-gray-500">{user?.designation} · {user?.department}</p>
      </div>

      {/* Clock widget */}
      <div className="card text-center py-8">
        <LiveClock />

        {/* Status badge */}
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full mt-4 ${st.bg}`}>
          <div className={`w-2 h-2 rounded-full ${record?.clockIn && !record?.clockOut ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className={`text-sm font-medium ${st.color}`}>{st.label}</span>
        </div>

        {/* Elapsed timer */}
        {record?.clockIn && !record?.clockOut && (
          <div className="mt-4">
            <div className="flex items-center justify-center gap-1.5 text-gray-500">
              <Timer className="w-4 h-4" />
              <span className="text-sm">Work time:</span>
              <span className="font-mono font-semibold text-gray-800">{formatElapsed(elapsed)}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center mt-6 flex-wrap">
          {!record?.clockIn && (
            <button onClick={() => action(timesheetAPI.clockIn, 'Clocked in!')}
              disabled={acting}
              className="btn-success flex items-center gap-2 px-6 py-3 text-base">
              <LogIn className="w-5 h-5" /> Clock In
            </button>
          )}

          {record?.clockIn && !record?.clockOut && !record?.isOnBreak && (
            <>
              <button onClick={() => action(timesheetAPI.breakStart, 'Break started')}
                disabled={acting}
                className="btn-warning flex items-center gap-2 px-5 py-2.5">
                <Coffee className="w-4 h-4" /> Start Break
              </button>
              <button onClick={() => action(timesheetAPI.clockOut, 'Clocked out!')}
                disabled={acting}
                className="btn-danger flex items-center gap-2 px-5 py-2.5">
                <LogOut className="w-4 h-4" /> Clock Out
              </button>
            </>
          )}

          {record?.isOnBreak && (
            <button onClick={() => action(timesheetAPI.breakEnd, 'Break ended')}
              disabled={acting}
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

        {/* Clock times */}
        {record?.clockIn && (
          <div className="flex justify-center gap-8 mt-5 pt-5 border-t border-gray-100 text-sm">
            <div className="text-center">
              <p className="text-gray-400">Clock In</p>
              <p className="font-semibold text-gray-800">{format(new Date(record.clockIn), 'hh:mm a')}</p>
              {record.isLate && <p className="text-xs text-yellow-600">+{record.lateByMinutes}m late</p>}
            </div>
            {record?.clockOut && (
              <div className="text-center">
                <p className="text-gray-400">Clock Out</p>
                <p className="font-semibold text-gray-800">{format(new Date(record.clockOut), 'hh:mm a')}</p>
              </div>
            )}
            {record?.breaks?.length > 0 && (
              <div className="text-center">
                <p className="text-gray-400">Break</p>
                <p className="font-semibold text-gray-800">{record.totalBreakMinutes}m</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Leave balance */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Leave Balance</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Annual"  value={user?.leaveBalance?.annual  || 0} sub="days remaining" color="blue" />
          <StatCard label="Sick"    value={user?.leaveBalance?.sick    || 0} sub="days remaining" color="green" />
          <StatCard label="Casual"  value={user?.leaveBalance?.casual  || 0} sub="days remaining" color="yellow" />
          <StatCard label="Unpaid"  value={user?.leaveBalance?.unpaid  || 0} sub="days taken"     color="purple" />
        </div>
      </div>
    </div>
  );
}
