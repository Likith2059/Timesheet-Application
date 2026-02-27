import React, { useState, useEffect } from 'react';
import { leaveAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { format, differenceInBusinessDays, parseISO } from 'date-fns';
import { PlusCircle, X } from 'lucide-react';

const SBadge = ({ s }) => {
  const cls = { pending:'badge-pending', approved:'badge-approved', rejected:'badge-rejected', cancelled:'bg-gray-100 text-gray-500 inline-flex px-2 py-0.5 text-xs font-medium rounded-full' };
  return <span className={cls[s]||'badge-pending'}>{s}</span>;
};

const TYPES = ['annual','sick','casual','unpaid','maternity','paternity','bereavement'];

export default function LeavePage() {
  const { user } = useAuth();
  const [leaves,     setLeaves]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ leaveType:'annual', startDate:'', endDate:'', reason:'', isHalfDay:false, halfDayType:'morning' });

  const load = async () => {
    setLoading(true);
    try { const { data } = await leaveAPI.getMy(); setLeaves(data.leaves); }
    catch { toast.error('Failed to load leaves'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const calcDays = () => {
    if (!form.startDate || !form.endDate) return 0;
    if (form.isHalfDay) return 0.5;
    try { return Math.max(0, differenceInBusinessDays(parseISO(form.endDate), parseISO(form.startDate)) + 1); }
    catch { return 0; }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await leaveAPI.apply(form);
      toast.success('Leave submitted!');
      setShowModal(false);
      setForm({ leaveType:'annual', startDate:'', endDate:'', reason:'', isHalfDay:false, halfDayType:'morning' });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const cancel = async (id) => {
    if (!window.confirm('Cancel this leave?')) return;
    try { await leaveAPI.cancel(id); toast.success('Cancelled'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">My Leaves</h1><p className="text-gray-500 text-sm">Apply and track leave requests</p></div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><PlusCircle className="w-4 h-4" /> Apply Leave</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[['annual','Annual'],['sick','Sick'],['casual','Casual'],['unpaid','Unpaid']].map(([k,l]) => (
          <div key={k} className="card p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{user?.leaveBalance?.[k]??0}</p>
            <p className="text-sm text-gray-600">{l} Leave</p>
            <p className="text-xs text-gray-400">days available</p>
          </div>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b font-semibold text-gray-700">Leave History</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b">
              {['Type','From','To','Days','Reason','Status','Applied',''].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? <tr><td colSpan={8} className="text-center py-12 text-gray-400">Loading...</td></tr>
              : leaves.length===0 ? <tr><td colSpan={8} className="text-center py-12 text-gray-400">No leave requests found</td></tr>
              : leaves.map(l=>(
                <tr key={l._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 capitalize font-medium">{l.leaveType}</td>
                  <td className="px-4 py-3 text-gray-600">{format(new Date(l.startDate),'MMM d, yyyy')}</td>
                  <td className="px-4 py-3 text-gray-600">{format(new Date(l.endDate),'MMM d, yyyy')}</td>
                  <td className="px-4 py-3 font-medium">{l.totalDays}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{l.reason}</td>
                  <td className="px-4 py-3"><SBadge s={l.status} /></td>
                  <td className="px-4 py-3 text-xs text-gray-400">{format(new Date(l.createdAt),'MMM d')}</td>
                  <td className="px-4 py-3">{l.status==='pending'&&<button onClick={()=>cancel(l._id)} className="text-xs text-red-600 hover:underline">Cancel</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Apply for Leave</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                <select className="input" value={form.leaveType} onChange={f('leaveType')}>
                  {TYPES.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)} Leave</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                  <input type="date" className="input" value={form.startDate} min={format(new Date(),'yyyy-MM-dd')} onChange={f('startDate')} required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                  <input type="date" className="input" value={form.endDate} min={form.startDate||format(new Date(),'yyyy-MM-dd')} onChange={f('endDate')} required /></div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isHalfDay} onChange={e=>setForm(p=>({...p,isHalfDay:e.target.checked}))} className="rounded border-gray-300 text-blue-600" />
                <span className="text-sm text-gray-700">Half day leave</span>
              </label>
              {form.isHalfDay && <select className="input" value={form.halfDayType} onChange={f('halfDayType')}><option value="morning">Morning</option><option value="afternoon">Afternoon</option></select>}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Reason <span className="text-red-500">*</span></label>
                <textarea className="input resize-none" rows={3} value={form.reason} onChange={f('reason')} required placeholder="Reason for leave..." /></div>
              {calcDays()>0 && <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">📅 <strong>{calcDays()} working day{calcDays()>1?'s':''}</strong> from {form.leaveType} balance.</div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting?'Submitting...':'Submit Application'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
