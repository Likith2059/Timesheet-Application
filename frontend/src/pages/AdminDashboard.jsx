// AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { reportAPI } from '../services/api';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, UserCheck, UserX, Clock, AlertCircle, TrendingUp, Calendar } from 'lucide-react';

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportAPI.summary().then(({data})=>setSummary(data)).catch(()=>toast.error('Failed to load')).finally(()=>setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/></div>;
  if (!summary) return null;
  const { today, month, departmentStats=[] } = summary;

  const cards = [
    [Users,'Total Employees',today.totalEmployees,'text-blue-600 bg-blue-50'],
    [UserCheck,'Present Today',today.presentToday,'text-green-600 bg-green-50'],
    [UserX,'Absent Today',today.absentToday,'text-red-600 bg-red-50'],
    [Clock,'Active Sessions',today.activeToday,'text-purple-600 bg-purple-50'],
    [AlertCircle,'Pending Leaves',today.pendingLeaves,'text-yellow-600 bg-yellow-50'],
    [TrendingUp,'Avg Work Hours',`${month.avgWorkHours}h`,'text-indigo-600 bg-indigo-50'],
    [Clock,'Overtime (Month)',`${month.totalOvertimeHours}h`,'text-pink-600 bg-pink-50'],
    [Calendar,'Late (Month)',month.lateCount,'text-orange-600 bg-orange-50'],
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Management Overview</h1><p className="text-gray-500 text-sm">Today's attendance & monthly insights</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(([Icon,label,val,cls],i)=>(
          <div key={i} className="card p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${cls.split(' ')[1]}`}><Icon className={`w-5 h-5 ${cls.split(' ')[0]}`}/></div>
            <div><p className="text-xl font-bold text-gray-900">{val}</p><p className="text-xs text-gray-500 leading-tight">{label}</p></div>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {departmentStats.length>0 && (
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-4">Department Attendance Today</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={departmentStats.map(d=>({name:d._id||'N/A',present:d.present,total:d.count}))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="name" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/><Tooltip/>
                <Bar dataKey="present" name="Present" fill="#3b82f6" radius={[4,4,0,0]}/>
                <Bar dataKey="total"   name="Total"   fill="#e5e7eb" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">Today's Split</h3>
          {today.presentToday>0||today.absentToday>0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={[{name:'Present',value:today.presentToday},{name:'Absent',value:today.absentToday}].filter(d=>d.value>0)} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name,value})=>`${name}: ${value}`}>
                  {['#3b82f6','#ef4444'].map((c,i)=><Cell key={i} fill={c}/>)}
                </Pie>
                <Legend/><Tooltip/>
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No data yet today</div>}
        </div>
      </div>
    </div>
  );
}
