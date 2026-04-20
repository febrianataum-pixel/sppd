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
  Users
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { AppSettings, SubActivity, TravelCost, FuelPrice } from '../types';
import { motion, AnimatePresence } from 'motion/react';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    legalBasis: [],
    travelCosts: [],
    fuelPrices: []
  });
  const [subActivities, setSubActivities] = useState<SubActivity[]>([]);
  const [activeTab, setActiveTab] = useState<'general' | 'activities' | 'costs' | 'fuel' | 'bendahara'>('general');
  const [loading, setLoading] = useState(true);

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

    return () => {
      unsubSettings();
      unsubActivities();
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
    const newCosts = [...settings.travelCosts, { tingkat: '', type: 'Dalam Daerah', amount: 0 }];
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
            <p className="text-gray-500 font-medium">Konfigurasi sistem dan data referensi</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Tabs */}
        <div className="space-y-2">
          {[
            { id: 'general', label: 'Umum & KOP', icon: ImageIcon },
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
              <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === tab.id ? 'rotate-90' : ''}`} />
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
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-2xl relative group">
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
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Settings;
