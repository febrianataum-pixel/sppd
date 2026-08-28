import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Plus, 
  Trash2, 
  Save, 
  Image as ImageIcon, 
  FileText, 
  DollarSign, 
  Fuel,
  ChevronRight,
  Activity,
  Users,
  ShieldCheck,
  UserCheck,
  Search,
  Check,
  Edit2,
  RefreshCw,
  Clock,
  Mail,
  Building2,
  AlertCircle
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { AppSettings, SubActivity, TravelCost, FuelPrice, AppUser } from '../types';
import { useAuth } from '../lib/AuthProvider';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const Settings: React.FC = () => {
  const { user: currentAuthUser } = useAuth();
  const [settings, setSettings] = useState<AppSettings>({
    legalBasis: [],
    travelCosts: [],
    fuelPrices: []
  });
  const [subActivities, setSubActivities] = useState<SubActivity[]>([]);
  const [usersList, setUsersList] = useState<AppUser[]>([]);
  const [activeTab, setActiveTab] = useState<'general' | 'activities' | 'costs' | 'fuel' | 'bendahara' | 'users'>('general');
  const [loading, setLoading] = useState(true);

  // User tab states
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userBidangFilter, setUserBidangFilter] = useState<string>('all');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // New Sub Activity state
  const [newActivity, setNewActivity] = useState({ code: '', name: '' });

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'general'), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data() as AppSettings);
      }
      setLoading(false);
    });

    const unsubActivities = onSnapshot(collection(db, 'sub_activities'), (snapshot) => {
      setSubActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubActivity)));
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsersList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser)));
    });

    return () => {
      unsubSettings();
      unsubActivities();
      unsubUsers();
    };
  }, []);

  const saveSettings = async (newSettings: AppSettings) => {
    try {
      await setDoc(doc(db, 'settings', 'general'), newSettings);
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        saveSettings({ ...settings, logo: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const addLegalBasis = () => {
    const newBasis = [...settings.legalBasis, ''];
    saveSettings({ ...settings, legalBasis: newBasis });
  };

  const updateLegalBasis = (index: number, value: string) => {
    const newBasis = [...settings.legalBasis];
    newBasis[index] = value;
    saveSettings({ ...settings, legalBasis: newBasis });
  };

  const removeLegalBasis = (index: number) => {
    const newBasis = settings.legalBasis.filter((_, i) => i !== index);
    saveSettings({ ...settings, legalBasis: newBasis });
  };

  const addTravelCost = () => {
    const newCosts = [...settings.travelCosts, { tingkat: '', type: 'Dalam Daerah', destination: '', amount: 0 }];
    saveSettings({ ...settings, travelCosts: newCosts as TravelCost[] });
  };

  const updateTravelCost = (index: number, field: keyof TravelCost, value: any) => {
    const newCosts = [...settings.travelCosts];
    newCosts[index] = { ...newCosts[index], [field]: value };
    saveSettings({ ...settings, travelCosts: newCosts });
  };

  const removeTravelCost = (index: number) => {
    const newCosts = settings.travelCosts.filter((_, i) => i !== index);
    saveSettings({ ...settings, travelCosts: newCosts });
  };

  const addFuelPrice = () => {
    const newPrices = [...settings.fuelPrices, { type: '', price: 0 }];
    saveSettings({ ...settings, fuelPrices: newPrices as FuelPrice[] });
  };

  const updateFuelPrice = (index: number, field: keyof FuelPrice, value: any) => {
    const newPrices = [...settings.fuelPrices];
    newPrices[index] = { ...newPrices[index], [field]: value };
    saveSettings({ ...settings, fuelPrices: newPrices });
  };

  const removeFuelPrice = (index: number) => {
    const newPrices = settings.fuelPrices.filter((_, i) => i !== index);
    saveSettings({ ...settings, fuelPrices: newPrices });
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.code || !newActivity.name) return;
    try {
      await addDoc(collection(db, 'sub_activities'), newActivity);
      setNewActivity({ code: '', name: '' });
    } catch (error) {
      console.error("Error adding activity:", error);
    }
  };

  const handleDeleteActivity = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'sub_activities', id));
    } catch (error) {
      console.error("Error deleting activity:", error);
    }
  };

  const handleUpdateUserBidang = async (userId: string, newBidang: 'Semua Bidang' | 'Sekretariat' | 'Bidang Sosial' | 'Bidang PPPA') => {
    try {
      await updateDoc(doc(db, 'users', userId), { bidang: newBidang });
      setActionFeedback(`Hak akses bidang berhasil diubah ke: ${newBidang}`);
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (error) {
      console.error("Error updating user bidang:", error);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: 'Admin' | 'Operator' | 'Pegawai') => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setActionFeedback(`Peran akun berhasil diubah menjadi: ${newRole}`);
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (error) {
      console.error("Error updating user role:", error);
    }
  };

  const handleSyncCurrentUser = async () => {
    if (!currentAuthUser) return;
    setIsSyncing(true);
    try {
      const userRef = doc(db, 'users', currentAuthUser.uid);
      const snap = await getDoc(userRef);
      const nowIso = new Date().toISOString();
      if (!snap.exists()) {
        await setDoc(userRef, {
          uid: currentAuthUser.uid,
          email: currentAuthUser.email || '',
          displayName: currentAuthUser.displayName || currentAuthUser.email?.split('@')[0] || 'Pengguna',
          photoURL: currentAuthUser.photoURL || '',
          role: currentAuthUser.email === 'febrianataum@gmail.com' ? 'Admin' : 'Operator',
          bidang: 'Semua Bidang',
          lastLoginAt: nowIso,
          createdAt: nowIso
        });
      } else {
        await setDoc(userRef, {
          lastLoginAt: nowIso,
          displayName: currentAuthUser.displayName || snap.data()?.displayName || currentAuthUser.email?.split('@')[0] || 'Pengguna',
          photoURL: currentAuthUser.photoURL || snap.data()?.photoURL || '',
          email: currentAuthUser.email || snap.data()?.email || ''
        }, { merge: true });
      }
      setActionFeedback('Akun autentikasi Firebase berhasil disinkronkan!');
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (error) {
      console.error("Error syncing current user:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUser.id) return;
    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        displayName: editingUser.displayName,
        role: editingUser.role,
        bidang: editingUser.bidang,
      });
      setIsEditUserModalOpen(false);
      setEditingUser(null);
      setActionFeedback('Data pengguna berhasil diperbarui!');
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (error) {
      console.error("Error saving user:", error);
    }
  };

  const handleDeleteUser = async (user: AppUser) => {
    if (!user.id) return;
    if (confirm(`Apakah Anda yakin ingin menghapus data pengguna ${user.displayName || user.email} dari daftar?`)) {
      try {
        await deleteDoc(doc(db, 'users', user.id));
        setActionFeedback('Pengguna berhasil dihapus dari daftar.');
        setTimeout(() => setActionFeedback(null), 3000);
      } catch (error) {
        console.error("Error deleting user:", error);
      }
    }
  };

  const filteredUsers = usersList.filter(u => {
    const matchesSearch = 
      (u.displayName || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      (u.bidang || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      (u.role || '').toLowerCase().includes(userSearchTerm.toLowerCase());
    
    const matchesBidang = userBidangFilter === 'all' || u.bidang === userBidangFilter;
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;

    return matchesSearch && matchesBidang && matchesRole;
  });

  if (loading) return <div className="flex justify-center p-12">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
            <SettingsIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Utilitas & Pengaturan</h1>
            <p className="text-gray-500 font-medium">Konfigurasi sistem, akun pengguna, dan data referensi</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Tabs */}
        <div className="space-y-2">
          {[
            { id: 'general', label: 'Umum & KOP', icon: ImageIcon },
            { id: 'users', label: 'Pengguna / Users', icon: ShieldCheck, badge: usersList.length > 0 ? usersList.length : undefined },
            { id: 'activities', label: 'Sub Kegiatan', icon: Activity },
            { id: 'costs', label: 'Biaya Perjalanan', icon: DollarSign },
            { id: 'fuel', label: 'Bahan Bakar', icon: Fuel },
            { id: 'bendahara', label: 'Bendahara Pembantu', icon: Users },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 ${
                activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' 
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <tab.icon className="w-5 h-5" />
                <span className="font-bold">{tab.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {tab.badge !== undefined && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    activeTab === tab.id ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {tab.badge}
                  </span>
                )}
                <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === tab.id ? 'rotate-90' : ''}`} />
              </div>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8"
            >
              {activeTab === 'general' && (
                <div className="space-y-8">
                  <section className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-blue-600" />
                      Logo KOP Surat
                    </h3>
                    <div className="flex items-start gap-6">
                      <div className="w-32 h-32 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                        {settings.logo ? (
                          <img src={settings.logo} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-gray-300" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-bold cursor-pointer hover:bg-blue-700 transition-colors">
                          Upload Logo Baru
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </label>
                        <p className="text-sm text-gray-400">Format: PNG, JPG (Maks. 1MB). Disarankan background transparan.</p>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4 pt-8 border-t border-gray-50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        Dasar Hukum (Surat Tugas)
                      </h3>
                      <button onClick={addLegalBasis} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors">
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      {settings.legalBasis.map((basis, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            value={basis}
                            onChange={(e) => updateLegalBasis(idx, e.target.value)}
                            placeholder={`Dasar Hukum ke-${idx + 1}`}
                            className="flex-1 px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                          <button onClick={() => removeLegalBasis(idx)} className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {activeTab === 'activities' && (
                <div className="space-y-8">
                  <section className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Plus className="w-5 h-5 text-blue-600" />
                      Tambah Sub Kegiatan
                    </h3>
                    <form onSubmit={handleAddActivity} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input
                        placeholder="Kode (misal: 1.01.01)"
                        value={newActivity.code}
                        onChange={(e) => setNewActivity({ ...newActivity, code: e.target.value })}
                        className="px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      <input
                        placeholder="Nama Sub Kegiatan"
                        value={newActivity.name}
                        onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                        className="px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                      <button type="submit" className="bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">
                        Tambah
                      </button>
                    </form>
                  </section>

                  <section className="space-y-4 pt-8 border-t border-gray-50">
                    <h3 className="text-xl font-bold text-gray-900">Daftar Sub Kegiatan</h3>
                    <div className="overflow-hidden rounded-2xl border border-gray-100">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Kode</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Nama</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {subActivities.map((act) => (
                            <tr key={act.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 font-mono text-sm text-blue-600">{act.code}</td>
                              <td className="px-6 py-4 text-sm font-medium text-gray-700">{act.name}</td>
                              <td className="px-6 py-4 text-right">
                                <button onClick={() => handleDeleteActivity(act.id!)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === 'costs' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                      Nominal Biaya Perjalanan Dinas
                    </h3>
                    <button onClick={addTravelCost} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors">
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    {settings.travelCosts.map((cost, idx) => (
                      <div key={idx} className={`grid grid-cols-1 ${cost.type === 'Luar Daerah' ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-4 p-4 bg-gray-50 rounded-2xl relative group`}>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Tingkat</label>
                          <input
                            value={cost.tingkat}
                            onChange={(e) => updateTravelCost(idx, 'tingkat', e.target.value)}
                            placeholder="A, B, C..."
                            className="w-full px-4 py-2 bg-white border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Jenis</label>
                          <select
                            value={cost.type}
                            onChange={(e) => updateTravelCost(idx, 'type', e.target.value)}
                            className="w-full px-4 py-2 bg-white border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            <option value="Dalam Daerah">Dalam Daerah</option>
                            <option value="Luar Daerah">Luar Daerah</option>
                          </select>
                        </div>
                        {cost.type === 'Luar Daerah' && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Provinsi / Tujuan</label>
                            <select
                              value={['DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'DI Yogyakarta', 'Jawa Timur', 'Banten'].includes(cost.destination || '') ? cost.destination : 'Lainnya'}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'Lainnya') {
                                  updateTravelCost(idx, 'destination', '');
                                } else {
                                  updateTravelCost(idx, 'destination', val);
                                }
                              }}
                              className="w-full px-4 py-2 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                              <option value="DKI Jakarta">Provinsi DKI Jakarta</option>
                              <option value="Jawa Barat">Provinsi Jawa Barat</option>
                              <option value="Jawa Tengah">Provinsi Jawa Tengah</option>
                              <option value="DI Yogyakarta">Provinsi DI Yogyakarta</option>
                              <option value="Jawa Timur">Provinsi Jawa Timur</option>
                              <option value="Banten">Provinsi Banten</option>
                              <option value="Lainnya">Input Manual / Lainnya</option>
                            </select>
                            {(!['DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'DI Yogyakarta', 'Jawa Timur', 'Banten'].includes(cost.destination || '')) && (
                              <input
                                value={cost.destination || ''}
                                onChange={(e) => updateTravelCost(idx, 'destination', e.target.value)}
                                placeholder="Masukkan Provinsi/Tujuan..."
                                className="w-full px-4 py-2 mt-1.5 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                            )}
                          </div>
                        )}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nominal (Rp)</label>
                          <input
                            type="number"
                            value={cost.amount}
                            onChange={(e) => updateTravelCost(idx, 'amount', Number(e.target.value))}
                            className="w-full px-4 py-2 bg-white border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                        <div className="flex items-end pb-1">
                          <button onClick={() => removeTravelCost(idx)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 mt-4">
                    <p className="text-sm text-blue-700 font-semibold leading-relaxed">
                      💡 Info Otomatis: Untuk Perjalanan Luar Daerah, sistem secara otomatis memetakan nama kota/kabupaten tujuan di SPPD ke provinsinya (contoh: Semarang, Pati, Kudus masuk Provinsi Jawa Tengah). Nominal biaya dinas akan otomatis disesuaikan berdasarkan ketentuan provinsi tersebut.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'fuel' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Fuel className="w-5 h-5 text-blue-600" />
                      Jenis Bahan Bakar & Harga
                    </h3>
                    <button onClick={addFuelPrice} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors">
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    {settings.fuelPrices.map((fuel, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-2xl">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Jenis BBM</label>
                          <input
                            value={fuel.type}
                            onChange={(e) => updateFuelPrice(idx, 'type', e.target.value)}
                            placeholder="Pertalite, Pertamax..."
                            className="w-full px-4 py-2 bg-white border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Harga per Liter</label>
                          <input
                            type="number"
                            value={fuel.price}
                            onChange={(e) => updateFuelPrice(idx, 'price', Number(e.target.value))}
                            className="w-full px-4 py-2 bg-white border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                        <div className="flex items-end pb-1">
                          <button onClick={() => removeFuelPrice(idx)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="text-sm text-blue-700 font-medium">
                      * Harga BBM di atas dapat disesuaikan secara manual mengikuti peraturan terbaru di Jawa Tengah.
                    </p>
                  </div>
                </div>
              )}
              {activeTab === 'bendahara' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      Bendahara Pengeluaran Pembantu
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                    {['Sekretariat', 'Bidang Sosial', 'Bidang PPPA'].map((bidang) => (
                      <div key={bidang} className="p-6 bg-gray-50 rounded-2xl space-y-4">
                        <h4 className="font-bold text-gray-900">{bidang}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Jabatan Bendahara</label>
                            <input
                              value={settings.bendaharaPembantu?.[bidang]?.title || ''}
                              onChange={(e) => {
                                const newBendahara = { ...settings.bendaharaPembantu };
                                if (!newBendahara[bidang]) newBendahara[bidang] = { name: '', nip: '', title: '' };
                                newBendahara[bidang].title = e.target.value;
                                saveSettings({ ...settings, bendaharaPembantu: newBendahara });
                              }}
                              placeholder="Contoh: PEMBANTU BIDANG SOSIAL"
                              className="w-full px-4 py-2 bg-white border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nama Bendahara</label>
                            <input
                              value={settings.bendaharaPembantu?.[bidang]?.name || ''}
                              onChange={(e) => {
                                const newBendahara = { ...settings.bendaharaPembantu };
                                if (!newBendahara[bidang]) newBendahara[bidang] = { name: '', nip: '', title: '' };
                                newBendahara[bidang].name = e.target.value;
                                saveSettings({ ...settings, bendaharaPembantu: newBendahara });
                              }}
                              placeholder="Nama Lengkap..."
                              className="w-full px-4 py-2 bg-white border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">NIP</label>
                            <input
                              value={settings.bendaharaPembantu?.[bidang]?.nip || ''}
                              onChange={(e) => {
                                const newBendahara = { ...settings.bendaharaPembantu };
                                if (!newBendahara[bidang]) newBendahara[bidang] = { name: '', nip: '', title: '' };
                                newBendahara[bidang].nip = e.target.value;
                                saveSettings({ ...settings, bendaharaPembantu: newBendahara });
                              }}
                              placeholder="NIP..."
                              className="w-full px-4 py-2 bg-white border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'users' && (
                <div className="space-y-6">
                  {/* Feedback Toast */}
                  <AnimatePresence>
                    {actionFeedback && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200 text-sm font-semibold shadow-sm"
                      >
                        <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span>{actionFeedback}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Header & Sync */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-blue-600" />
                        Pengguna & Hak Akses Bidang
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Daftar akun login Google Firebase Authentication dan konfigurasi data Bidang yang diakses.
                      </p>
                    </div>
                    <button
                      onClick={handleSyncCurrentUser}
                      disabled={isSyncing}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-xl text-sm transition-colors shrink-0 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      Sinkronkan Akun Saya
                    </button>
                  </div>

                  {/* Stat Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total User</p>
                      <p className="text-2xl font-black text-gray-900 mt-1">{usersList.length}</p>
                    </div>
                    <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-100/60">
                      <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Sekretariat</p>
                      <p className="text-2xl font-black text-amber-900 mt-1">
                        {usersList.filter(u => u.bidang === 'Sekretariat').length}
                      </p>
                    </div>
                    <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100/60">
                      <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Bidang Sosial</p>
                      <p className="text-2xl font-black text-indigo-900 mt-1">
                        {usersList.filter(u => u.bidang === 'Bidang Sosial').length}
                      </p>
                    </div>
                    <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-100/60">
                      <p className="text-xs font-bold text-rose-700 uppercase tracking-wider">Bidang PPPA</p>
                      <p className="text-2xl font-black text-rose-900 mt-1">
                        {usersList.filter(u => u.bidang === 'Bidang PPPA').length}
                      </p>
                    </div>
                  </div>

                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        placeholder="Cari nama, email, atau bidang..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                      />
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={userBidangFilter}
                        onChange={(e) => setUserBidangFilter(e.target.value)}
                        className="px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-700 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="all">Semua Akses Bidang</option>
                        <option value="Semua Bidang">Semua Bidang (Global)</option>
                        <option value="Sekretariat">Sekretariat</option>
                        <option value="Bidang Sosial">Bidang Sosial</option>
                        <option value="Bidang PPPA">Bidang PPPA</option>
                      </select>
                      <select
                        value={userRoleFilter}
                        onChange={(e) => setUserRoleFilter(e.target.value)}
                        className="px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-700 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="all">Semua Peran / Role</option>
                        <option value="Admin">Admin</option>
                        <option value="Operator">Operator</option>
                        <option value="Pegawai">Pegawai</option>
                      </select>
                    </div>
                  </div>

                  {/* Users Table */}
                  <div className="overflow-x-auto rounded-2xl border border-gray-100">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50/80 text-gray-400 font-bold text-xs uppercase tracking-wider border-b border-gray-100">
                        <tr>
                          <th className="px-5 py-4">Pengguna / Akun</th>
                          <th className="px-4 py-4">Peran (Role)</th>
                          <th className="px-4 py-4">Akses Data Bidang (Aksi)</th>
                          <th className="px-4 py-4">Login Terakhir</th>
                          <th className="px-4 py-4 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium">
                              <UserCheck className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                              Tidak ada data pengguna yang sesuai dengan filter pencarian.
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((u) => {
                            const isCurrent = currentAuthUser?.uid === u.uid || currentAuthUser?.email === u.email;
                            return (
                              <tr key={u.id || u.uid} className="hover:bg-gray-50/60 transition-colors">
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 overflow-hidden border border-gray-200">
                                      {u.photoURL ? (
                                        <img 
                                          src={u.photoURL} 
                                          alt={u.displayName} 
                                          className="w-full h-full object-cover"
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : (
                                        (u.displayName || u.email || 'U').charAt(0).toUpperCase()
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="font-bold text-gray-900 truncate">{u.displayName || 'Tanpa Nama'}</p>
                                        {isCurrent && (
                                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full">
                                            Anda
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                                        <Mail className="w-3 h-3" />
                                        {u.email}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <select
                                    value={u.role || 'Operator'}
                                    onChange={(e) => u.id && handleUpdateUserRole(u.id, e.target.value as any)}
                                    className={`px-3 py-1.5 rounded-xl font-bold text-xs border focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                                      u.role === 'Admin'
                                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                                        : u.role === 'Operator'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-gray-50 text-gray-700 border-gray-200'
                                    }`}
                                  >
                                    <option value="Admin">Admin</option>
                                    <option value="Operator">Operator</option>
                                    <option value="Pegawai">Pegawai</option>
                                  </select>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={u.bidang || 'Semua Bidang'}
                                      onChange={(e) => u.id && handleUpdateUserBidang(u.id, e.target.value as any)}
                                      className={`px-3 py-1.5 rounded-xl font-bold text-xs border focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                                        u.bidang === 'Sekretariat'
                                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                                          : u.bidang === 'Bidang Sosial'
                                          ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                          : u.bidang === 'Bidang PPPA'
                                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                                          : 'bg-blue-50 text-blue-800 border-blue-200'
                                      }`}
                                    >
                                      <option value="Semua Bidang">Semua Bidang (Global)</option>
                                      <option value="Sekretariat">Sekretariat</option>
                                      <option value="Bidang Sosial">Bidang Sosial</option>
                                      <option value="Bidang PPPA">Bidang PPPA</option>
                                    </select>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-xs text-gray-500">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                    {u.lastLoginAt ? (
                                      <span>
                                        {format(new Date(u.lastLoginAt), 'dd MMM yyyy, HH:mm', { locale: idLocale })}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">Belum ada catatan</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => {
                                        setEditingUser(u);
                                        setIsEditUserModalOpen(true);
                                      }}
                                      title="Edit detail pengguna"
                                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteUser(u)}
                                      title="Hapus pengguna dari daftar"
                                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-100 flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800 font-medium leading-relaxed">
                      <strong>Keterangan Hak Akses Bidang:</strong> Pengaturan Bidang pada akun di atas menentukan data bidang default yang ditampilkan saat user membuat SPPD atau memfilter rekapitulasi data perjalanan dinas. User dengan status <em>Semua Bidang</em> memiliki akses ke seluruh divisi.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Modal Edit Pengguna */}
      <AnimatePresence>
        {isEditUserModalOpen && editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-md w-full p-6 space-y-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Edit Pengguna</h3>
                    <p className="text-xs text-gray-500">{editingUser.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditUserModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-xl"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEditUser} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600">Nama Lengkap / Tampilan</label>
                  <input
                    type="text"
                    required
                    value={editingUser.displayName || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, displayName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600">Peran / Role</label>
                  <select
                    value={editingUser.role || 'Operator'}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Admin">Admin (Akses Penuh)</option>
                    <option value="Operator">Operator</option>
                    <option value="Pegawai">Pegawai</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600">Hak Akses Data Bidang</label>
                  <select
                    value={editingUser.bidang || 'Semua Bidang'}
                    onChange={(e) => setEditingUser({ ...editingUser, bidang: e.target.value as any })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Semua Bidang">Semua Bidang (Global)</option>
                    <option value="Sekretariat">Sekretariat</option>
                    <option value="Bidang Sosial">Bidang Sosial</option>
                    <option value="Bidang PPPA">Bidang PPPA</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsEditUserModalOpen(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 text-sm transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold text-white text-sm shadow-md shadow-blue-200 transition-all"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
