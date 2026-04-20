import React, { useEffect, useState } from 'react';
import { 
  FolderTree, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X,
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SubActivity, OperationType } from '../types';
import { handleFirestoreError } from '../lib/error-handler';
import { motion, AnimatePresence } from 'motion/react';

export const SubActivityList: React.FC = () => {
  const [activities, setActivities] = useState<SubActivity[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<SubActivity | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'sub_activities'), orderBy('code', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubActivity)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'sub_activities'));

    return unsubscribe;
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data: Partial<SubActivity> = {
      code: formData.get('code') as string,
      name: formData.get('name') as string,
    };

    try {
      if (currentActivity?.id) {
        await updateDoc(doc(db, 'sub_activities', currentActivity.id), data);
      } else {
        await addDoc(collection(db, 'sub_activities'), data);
      }
      setModalOpen(false);
      setCurrentActivity(null);
    } catch (err: any) {
      handleFirestoreError(err, currentActivity?.id ? OperationType.UPDATE : OperationType.CREATE, 'sub_activities');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Hapus sub kegiatan ini?')) {
      try {
        await deleteDoc(doc(db, 'sub_activities', id));
      } catch (err: any) {
        handleFirestoreError(err, OperationType.DELETE, 'sub_activities');
      }
    }
  };

  const filteredActivities = activities.filter(act => 
    act.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    act.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sub Kegiatan</h1>
          <p className="text-gray-500 text-sm">Kelola daftar sub kegiatan Dinsos PPPA Blora.</p>
        </div>
        <button
          onClick={() => {
            setCurrentActivity(null);
            setModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-200 font-medium"
        >
          <Plus className="w-5 h-5" />
          Tambah Sub Kegiatan
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari kode atau nama kegiatan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredActivities.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-400">
            Tidak ada data ditemukan
          </div>
        ) : (
          filteredActivities.map((act) => (
            <div key={act.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-orange-50 text-orange-600">
                  <FolderTree className="w-6 h-6" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setCurrentActivity(act);
                      setModalOpen(true);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => act.id && handleDelete(act.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-1">{act.code}</h3>
              <p className="text-gray-900 font-bold leading-tight">{act.name}</p>
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900">
                  {currentActivity ? 'Edit Sub Kegiatan' : 'Tambah Sub Kegiatan'}
                </h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Kode Sub Kegiatan</label>
                  <input
                    name="code"
                    required
                    defaultValue={currentActivity?.code}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500 transition-all"
                    placeholder="Contoh: 1.06.01.2.01.0001"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Nama Sub Kegiatan</label>
                  <textarea
                    name="name"
                    required
                    defaultValue={currentActivity?.name}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500 transition-all resize-none"
                    placeholder="Masukkan nama sub kegiatan lengkap..."
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 px-4 py-3 text-gray-600 font-medium hover:bg-gray-50 rounded-xl transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white px-4 py-3 rounded-xl transition-all font-bold shadow-lg shadow-orange-100"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Simpan Data
                      </>
                    )}
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
