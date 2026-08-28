import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Users, 
  FolderTree, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Building2
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
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthProvider';
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
  const { appUser } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalSPPD: 0,
    totalEmployees: 0,
    totalSubActivities: 0,
    activeSPPD: 0,
    completedSPPD: 0,
  });
  const [recentSPPD, setRecentSPPD] = useState<SPPD[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  const userBidang = appUser?.bidang;
  const isAllBidang = !userBidang || userBidang === 'Semua Bidang';

  useEffect(() => {
    const unsubSPPD = onSnapshot(query(collection(db, 'sppd'), orderBy('createdAt', 'desc')), (snapshot) => {
      const allSppd = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SPPD));
      
      // Filter based on user's authorized division/bidang
      const sppdList = isAllBidang ? allSppd : allSppd.filter(s => s.bidang === userBidang);
      
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
      setRecentSPPD(sppdList.slice(0, 5));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'sppd'));

    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => {
      setStats(prev => ({ ...prev, totalEmployees: snapshot.size }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'employees'));

    const unsubSubActivities = onSnapshot(collection(db, 'sub_activities'), (snapshot) => {
      setStats(prev => ({ ...prev, totalSubActivities: snapshot.size }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'sub_activities'));

    return () => {
      unsubSPPD();
      unsubEmployees();
      unsubSubActivities();
    };
  }, [userBidang, isAllBidang]);

  return (
    <div className="space-y-8">
      {/* Header with Division Scope Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              isAllBidang
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : userBidang === 'Sekretariat'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : userBidang === 'Bidang Sosial'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : userBidang === 'Bidang PPPA'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              <Building2 className="w-3.5 h-3.5" />
              {isAllBidang ? 'Semua Bidang' : `Akses: ${userBidang}`}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {isAllBidang 
              ? 'Selamat datang di Sistem SPPD Dinsos PPPA Blora. Menampilkan data seluruh bidang.' 
              : `Selamat datang di Sistem SPPD Dinsos PPPA Blora. Menampilkan data SPPD khusus ${userBidang}.`}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={FileText} 
          label={isAllBidang ? "Total SPPD" : `Total SPPD (${userBidang})`} 
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
          label={isAllBidang ? "Selesai" : `Selesai (${userBidang})`} 
          value={stats.completedSPPD} 
          color="bg-green-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-gray-900">Statistik SPPD</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {isAllBidang ? 'Akumulasi seluruh bidang' : `Khusus divisi ${userBidang}`}
              </p>
            </div>
            <select className="text-sm border-none bg-gray-50 rounded-lg px-2.5 py-1 focus:ring-0 text-gray-600 font-medium">
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-gray-900">SPPD Terbaru</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {isAllBidang ? 'Seluruh divisi' : `Khusus ${userBidang}`}
              </p>
            </div>
          </div>
          <div className="space-y-6">
            {recentSPPD.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Belum ada data SPPD</p>
                {!isAllBidang && (
                  <p className="text-xs text-gray-400 mt-1">untuk bidang {userBidang}</p>
                )}
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
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-400">
                        {format(new Date(sppd.createdAt), 'dd MMM yyyy, HH:mm', { locale: id })}
                      </span>
                      {sppd.bidang && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                          {sppd.bidang}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {recentSPPD.length > 0 && (
            <button 
              onClick={() => navigate('/sppd')}
              className="w-full mt-8 py-3 text-sm font-medium text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors cursor-pointer"
            >
              Lihat Semua
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
