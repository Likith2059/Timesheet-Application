import React, { useState, useEffect } from 'react';
import { leaveAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const cls = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected', cancelled: 'bg-gray-100 text-gray-500 inline-flex px-2 py-0.5 text-xs font-medium rounded-full' };
  return <span className={cls[status] || 'badge-pending'}>{status}</span>;
};

export default function AdminLeaves() {
  const [leaves,  setLeaves]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('pending');
  const [modal,   setModal]   = useState(null); // { leave, action }
  const [note,    setNote]    = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await leaveAPI.getAll({ status: filter });
      setLeaves(data.leaves);
    } catch { toast.error('Failed to load leaves'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const review = async (status) => {
    try {
      await leaveAPI.review(modal.leave._id, { status, reviewNote: note });
      toast.success(`Leave ${status}`);
      setModal(null);
      setNote('');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
        <p className="text-gray-500 text-sm">Review and manage employee leave applications</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['pending', 'approved', 'rejected', ''].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                {['Employee', 'Type', 'From', 'To', 'Days', 'Reason', 'Status', 'Applied', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : leaves.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">No {filter} leave requests</td></tr>
              ) : leaves.map(l => (
                <tr key={l._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{l.employee?.firstName} {l.employee?.lastName}</div>
                    <div className="text-xs text-gray-400">{l.employee?.department}</div>
                  </td>
                  <td className="px-4 py-3 capitalize font-medium text-gray-700">{l.leaveType}</td>
                  <td className="px-4 py-3 text-gray-600">{format(new Date(l.startDate), 'MMM d')}</td>
                  <td className="px-4 py-3 text-gray-600">{format(new Date(l.endDate), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{l.totalDays}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={l.reason}>{l.reason}</td>
                  <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                  <td className="px-4 py-3 text-xs text-gray-400">{format(new Date(l.createdAt), 'MMM d')}</td>
                  <td className="px-4 py-3">
                    {l.status === 'pending' && (
                      <div className="flex gap-1.5">
                        <button onClick={() => { setModal({ leave: l, action: 'approve' }); setNote(''); }}
                          className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors" title="Approve">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setModal({ leave: l, action: 'reject' }); setNote(''); }}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Reject">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className={`text-lg font-semibold ${modal.action === 'approve' ? 'text-green-700' : 'text-red-700'}`}>
              {modal.action === 'approve' ? '✅ Approve Leave' : '❌ Reject Leave'}
            </h3>
            <p className="text-sm text-gray-600">
              <strong>{modal.leave.employee?.firstName} {modal.leave.employee?.lastName}</strong> — {modal.leave.leaveType} leave
              for <strong>{modal.leave.totalDays}</strong> day(s)
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
              <textarea className="input resize-none" rows={3} value={note}
                onChange={e => setNote(e.target.value)} placeholder="Add a note for the employee..." />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => review(modal.action === 'approve' ? 'approved' : 'rejected')}
                className={`flex-1 ${modal.action === 'approve' ? 'btn-success' : 'btn-danger'}`}>
                Confirm {modal.action}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
