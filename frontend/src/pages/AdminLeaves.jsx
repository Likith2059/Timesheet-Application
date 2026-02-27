import React, { useState, useEffect } from 'react';
import { leaveAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { CheckCircle, XCircle, X } from 'lucide-react';

const SBadge = ({ s }) => {
  const cls = { pending:'badge-pending', approved:'badge-approved', rejected:'badge-rejected', cancelled:'bg-gray-100 text-gray-500 inline-flex px-2 py-0.5 text-xs font-medium rounded-full' };
  return <span className={cls[s]||'badge-pending'}>{s}</span>;
};

export default function AdminLeaves() {
  const [leaves,  setLeaves]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('pending');
  const [modal,   setModal]   = useState(null);
  const [note,    setNote]    = useState('');

  const load = () => {
    setLoading(true);
    leaveAPI.getAll({ status: filter }).then(({data})=>setLeaves(data.leaves)).catch(()=>toast.error('Failed')).finally(()=>setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const review = async (status) => {
    try { await leaveAPI.review(modal._id, { status, reviewNote: note }); toast.success(`Leave ${status}`); setModal(null); setNote(''); load(); }
    catch (err) { toast.error(err.response?.data?.error||'Failed'); }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1><p className="text-gray-500 text-sm">Review and manage employee leave applications</p></div>
      <div className="flex gap-2 flex-wrap">
        {['pending','approved','rejected',''].map(s=>(
          <button key={s} onClick={()=>setFilter(s)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter===s?'bg-blue-600 text-white':'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>{s||'All'}</button>
        ))}
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b">
              {['Employee','Type','From','To','Days','Reason','Status','Applied','Actions'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? <tr><td colSpan={9} className="text-center py-10 text-gray-400">Loading...</td></tr>
              : leaves.length===0 ? <tr><td colSpan={9} className="text-center py-10 text-gray-400">No {filter} requests</td></tr>
              : leaves.map(l=>(
                <tr key={l._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><div className="font-medium">{l.employee?.firstName} {l.employee?.lastName}</div><div className="text-xs text-gray-400">{l.employee?.department}</div></td>
                  <td className="px-4 py-3 capitalize font-medium">{l.leaveType}</td>
                  <td className="px-4 py-3 text-gray-600">{format(new Date(l.startDate),'MMM d')}</td>
                  <td className="px-4 py-3 text-gray-600">{format(new Date(l.endDate),'MMM d, yyyy')}</td>
                  <td className="px-4 py-3 font-semibold">{l.totalDays}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={l.reason}>{l.reason}</td>
                  <td className="px-4 py-3"><SBadge s={l.status}/></td>
                  <td className="px-4 py-3 text-xs text-gray-400">{format(new Date(l.createdAt),'MMM d')}</td>
                  <td className="px-4 py-3">
                    {l.status==='pending' && (
                      <div className="flex gap-1.5">
                        <button onClick={()=>{ setModal(l); setNote(''); }} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100" title="Approve"><CheckCircle className="w-4 h-4"/></button>
                        <button onClick={()=>{ setModal({...l, _reject:true}); setNote(''); }} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" title="Reject"><XCircle className="w-4 h-4"/></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className={`text-lg font-semibold ${modal._reject?'text-red-700':'text-green-700'}`}>
              {modal._reject ? '❌ Reject Leave' : '✅ Approve Leave'}
            </h3>
            <p className="text-sm text-gray-600"><strong>{modal.employee?.firstName} {modal.employee?.lastName}</strong> — {modal.leaveType} leave for <strong>{modal.totalDays}</strong> day(s)</p>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
              <textarea className="input resize-none" rows={3} value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a note..." /></div>
            <div className="flex gap-3">
              <button onClick={()=>setModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={()=>review(modal._reject?'rejected':'approved')} className={`flex-1 ${modal._reject?'btn-danger':'btn-success'}`}>
                Confirm {modal._reject?'Reject':'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
