import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Users, 
  FolderTree, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SPPD, Employee, SubActivity, OperationType } from '../types';
import { handleFirestoreError } from '../lib/error-handler';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '../lib/utils';

const StatCard = ({ icon: Icon, label, value, color, trend }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group">
    <div className="flex items-start justify-between mb-4">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600 group-hover:scale-110 transition-transform`}>
        <Icon className="w-6 h-6" />
      </div>
      {trend && (
        <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
          <TrendingUp className="w-3 h-3" />
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-gray-500 text-sm font-medium mb-1">{label}</h3>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalSPPD: 0,
    totalEmployees: 0,
    totalSubActivities: 0,
    activeSPPD: 0,
    completedSPPD: 0,
  });
  const [recentSPPD, setRecentSPPD] = useState<SPPD[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const unsubSPPD = onSnapshot(collection(db, 'sppd'), (snapshot) => {
      const sppdList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SPPD));
      const active = sppdList.filter(s => s.status === 'active').length;
      const completed = sppdList.filter(s => s.status === 'completed').length;
      
      setStats(prev => ({ 
        ...prev, 
        totalSPPD: sppdList.length,
        activeSPPD: active,
        completedSPPD: completed
      }));

      // Prepare chart data (last 6 months)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      const data = Array.from({ length: 6 }, (_, i) => {
        const monthIndex = (currentMonth - 5 + i + 12) % 12;
        return {
          name: months[monthIndex],
          count: sppdList.filter(s => new Date(s.createdAt).getMonth() === monthIndex).length
        };
      });
      setChartData(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'sppd'));

    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => {
      setStats(prev => ({ ...prev, totalEmployees: snapshot.size }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'employees'));

    const unsubSubActivities = onSnapshot(collection(db, 'sub_activities'), (snapshot) => {
      setStats(prev => ({ ...prev, totalSubActivities: snapshot.size }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'sub_activities'));

    const qRecent = query(collection(db, 'sppd'), orderBy('createdAt', 'desc'), limit(5));
    const unsubRecent = onSnapshot(qRecent, (snapshot) => {
      setRecentSPPD(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SPPD)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'sppd'));

    return () => {
      unsubSPPD();
      unsubEmployees();
      unsubSubActivities();
      unsubRecent();
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Selamat datang di Sistem SPPD Dinsos PPPA Blora.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={FileText} 
          label="Total SPPD" 
          value={stats.totalSPPD} 
          color="bg-blue-500" 
          trend="+12%" 
        />
        <StatCard 
          icon={Users} 
          label="Total Karyawan" 
          value={stats.totalEmployees} 
          color="bg-purple-500" 
        />
        <StatCard 
          icon={FolderTree} 
          label="Sub Kegiatan" 
          value={stats.totalSubActivities} 
          color="bg-orange-500" 
        />
        <StatCard 
          icon={CheckCircle2} 
          label="Selesai" 
          value={stats.completedSPPD} 
          color="bg-green-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900">Statistik SPPD</h3>
            <select className="text-sm border-none bg-gray-50 rounded-lg px-2 py-1 focus:ring-0">
              <option>6 Bulan Terakhir</option>
            </select>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9ca3af', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9ca3af', fontSize: 12 }} 
                />
                <Tooltip 
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#2563eb' : '#93c5fd'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-6">SPPD Terbaru</h3>
          <div className="space-y-6">
            {recentSPPD.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Belum ada data</p>
              </div>
            ) : (
              recentSPPD.map((sppd) => (
                <div key={sppd.id} className="flex gap-4 group">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                    sppd.status === 'active' ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"
                  )}>
                    {sppd.status === 'active' ? <Clock className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {sppd.destination}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{sppd.purpose}</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {format(new Date(sppd.createdAt), 'dd MMM yyyy, HH:mm', { locale: id })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          {recentSPPD.length > 0 && (
            <button className="w-full mt-8 py-3 text-sm font-medium text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
              Lihat Semua
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
