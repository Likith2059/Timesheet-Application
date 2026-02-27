import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';
import { UserPlus, Search, Edit2, UserX, Key, X } from 'lucide-react';

export default function AdminEmployees() {
  const [employees,  setEmployees]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [modal,      setModal]      = useState(null);
  const [form,       setForm]       = useState({});
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    adminAPI.getEmployees({ search, limit:50 }).then(({data})=>setEmployees(data.employees)).catch(()=>toast.error('Failed')).finally(()=>setLoading(false));
  };

  useEffect(() => { const id=setTimeout(load,300); return ()=>clearTimeout(id); }, [search]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      modal==='add' ? await adminAPI.registerUser(form) : await adminAPI.updateEmployee(modal._id, form);
      toast.success(modal==='add'?'Employee added!':'Updated!');
      setModal(null); load();
    } catch (err) { toast.error(err.response?.data?.error||'Failed'); }
    finally { setSubmitting(false); }
  };

  const deactivate = async (id) => {
    if (!window.confirm('Deactivate this employee?')) return;
    try { await adminAPI.deactivate(id); toast.success('Deactivated'); load(); }
    catch { toast.error('Failed'); }
  };

  const resetPwd = async (id) => {
    const pw = prompt('New password (min 6 chars):');
    if (!pw||pw.length<6) return toast.error('Too short');
    try { await adminAPI.resetPassword(id,{newPassword:pw}); toast.success('Password reset'); }
    catch { toast.error('Failed'); }
  };

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-gray-900">Employee Management</h1><p className="text-gray-500 text-sm">Add, edit, and manage employees</p></div>
        <button onClick={()=>{ setForm({role:'employee',department:'',designation:''}); setModal('add'); }} className="btn-primary flex items-center gap-2"><UserPlus className="w-4 h-4"/> Add Employee</button>
      </div>
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"/>
        <input className="input pl-9" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <p className="text-gray-400 col-span-3 text-center py-10">Loading...</p>
        : employees.map(emp=>(
          <div key={emp._id} className="card p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">{emp.firstName?.charAt(0)}</div>
                <div><p className="font-semibold text-gray-900">{emp.firstName} {emp.lastName}</p><p className="text-xs text-gray-400">{emp.employeeId}</p></div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${emp.role==='admin'?'bg-purple-100 text-purple-700':emp.role==='manager'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-600'}`}>{emp.role}</span>
            </div>
            <div className="mt-3 space-y-1 text-sm text-gray-600">
              <p>📧 {emp.email}</p>
              <p>🏢 {emp.department} · {emp.designation}</p>
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
              <button onClick={()=>{ setForm({...emp}); setModal(emp); }} className="btn-secondary flex-1 py-1.5 text-xs flex items-center justify-center gap-1"><Edit2 className="w-3 h-3"/> Edit</button>
              <button onClick={()=>resetPwd(emp._id)} className="btn-secondary py-1.5 px-2 text-xs"><Key className="w-3 h-3"/></button>
              <button onClick={()=>deactivate(emp._id)} className="py-1.5 px-2 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50"><UserX className="w-3 h-3"/></button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">{modal==='add'?'Add Employee':'Edit Employee'}</h3>
              <button onClick={()=>setModal(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500"/></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">First Name</label><input className="input" value={form.firstName||''} onChange={f('firstName')} required/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label><input className="input" value={form.lastName||''} onChange={f('lastName')} required/></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" className="input" value={form.email||''} onChange={f('email')} required disabled={modal!=='add'}/></div>
              {modal==='add' && <div><label className="block text-sm font-medium text-gray-700 mb-1">Password</label><input type="password" className="input" value={form.password||''} onChange={f('password')} required minLength={6}/></div>}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Department</label><input className="input" value={form.department||''} onChange={f('department')}/></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Designation</label><input className="input" value={form.designation||''} onChange={f('designation')}/></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select className="input" value={form.role||'employee'} onChange={f('role')}>
                    <option value="employee">Employee</option><option value="manager">Manager</option><option value="admin">Admin</option>
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input className="input" value={form.phone||''} onChange={f('phone')}/></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting?'Saving...':(modal==='add'?'Add Employee':'Save Changes')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
