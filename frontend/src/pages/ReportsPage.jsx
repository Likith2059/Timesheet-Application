import React, { useState } from 'react';
import { reportAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { FileText, Download, FileSpreadsheet } from 'lucide-react';

const dl = (blob, name) => { const u=URL.createObjectURL(blob),a=document.createElement('a'); a.href=u; a.download=name; a.click(); URL.revokeObjectURL(u); };

export default function ReportsPage() {
  const [month,   setMonth]   = useState(format(new Date(),'yyyy-MM'));
  const [loading, setLoading] = useState({ json:false, csv:false, pdf:false });
  const [report,  setReport]  = useState(null);

  const fetchJSON = () => {
    setLoading(l=>({...l,json:true}));
    reportAPI.attendance({ month, format:'json' }).then(({data})=>setReport(data)).catch(()=>toast.error('Failed')).finally(()=>setLoading(l=>({...l,json:false})));
  };

  const exportCSV = () => {
    setLoading(l=>({...l,csv:true}));
    reportAPI.exportCSV({ month }).then(({data})=>{ dl(new Blob([data],{type:'text/csv'}),`attendance-${month}.csv`); toast.success('CSV downloaded!'); }).catch(()=>toast.error('Failed')).finally(()=>setLoading(l=>({...l,csv:false})));
  };

  const exportPDF = () => {
    setLoading(l=>({...l,pdf:true}));
    reportAPI.exportPDF({ month }).then(({data})=>{ dl(new Blob([data],{type:'application/pdf'}),`attendance-${month}.pdf`); toast.success('PDF downloaded!'); }).catch(()=>toast.error('Failed')).finally(()=>setLoading(l=>({...l,pdf:false})));
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Reports</h1><p className="text-gray-500 text-sm">Generate and export attendance reports</p></div>
      <div className="card flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
          <input type="month" className="input w-auto" value={month} max={format(new Date(),'yyyy-MM')} onChange={e=>setMonth(e.target.value)}/>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={fetchJSON} disabled={loading.json} className="btn-primary flex items-center gap-2"><FileText className="w-4 h-4"/>{loading.json?'Loading...':'Generate Report'}</button>
          <button onClick={exportCSV}  disabled={loading.csv}  className="btn-secondary flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-green-600"/>{loading.csv?'Exporting...':'Export CSV'}</button>
          <button onClick={exportPDF}  disabled={loading.pdf}  className="btn-secondary flex items-center gap-2"><Download className="w-4 h-4 text-red-600"/>{loading.pdf?'Generating...':'Export PDF'}</button>
        </div>
      </div>

      {report && <>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[['Total Records',report.summary.totalRecords],['Present',report.summary.totalPresent],['Absent',report.summary.totalAbsent],['Late',report.summary.totalLate],['On Leave',report.summary.totalOnLeave],['Avg Hours',`${report.summary.avgWorkHours}h`]].map(([l,v])=>(
            <div key={l} className="card p-4 text-center"><p className="text-2xl font-bold text-blue-600">{v}</p><p className="text-sm text-gray-600">{l}</p></div>
          ))}
        </div>
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b font-semibold text-gray-700">Records — {month} ({report.records.length} entries)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b">
                {['Emp ID','Name','Dept','Date','In','Out','Hours','Break','Status','Late'].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {report.records.map((r,i)=>(
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{r.employeeId}</td>
                    <td className="px-4 py-2.5 font-medium">{r.employeeName}</td>
                    <td className="px-4 py-2.5 text-gray-500">{r.department}</td>
                    <td className="px-4 py-2.5">{r.date}</td>
                    <td className="px-4 py-2.5">{r.clockIn}</td>
                    <td className="px-4 py-2.5">{r.clockOut}</td>
                    <td className="px-4 py-2.5 font-medium">{r.totalWorkHours}h</td>
                    <td className="px-4 py-2.5 text-gray-500">{r.breakMinutes}m</td>
                    <td className="px-4 py-2.5"><span className={`px-2 py-0.5 text-xs rounded-full font-medium ${r.status==='present'?'bg-green-100 text-green-700':r.status==='late'?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'}`}>{r.status}</span></td>
                    <td className="px-4 py-2.5 text-xs">{r.isLate==='Yes'?<span className="text-yellow-600">+{r.lateByMinutes}m</span>:'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>}
    </div>
  );
}
