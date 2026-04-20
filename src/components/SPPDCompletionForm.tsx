import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Loader2, 
  FileText, 
  Image as ImageIcon, 
  Trash2, 
  Plus,
  CheckCircle2
} from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SPPD, OperationType, AppSettings } from '../types';
import { handleFirestoreError } from '../lib/error-handler';
import { motion, AnimatePresence } from 'motion/react';

interface SPPDCompletionFormProps {
  isOpen: boolean;
  onClose: () => void;
  sppdId: string | null;
}

export const SPPDCompletionForm: React.FC<SPPDCompletionFormProps> = ({ isOpen, onClose, sppdId }) => {
  const [isFetching, setFetching] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportResults, setReportResults] = useState<string[]>(['']);
  const [documentation, setDocumentation] = useState<string[]>([]);
  const [fuelType, setFuelType] = useState<string>('');
  const [fuelAmount, setFuelAmount] = useState<number>(0);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    if (!isOpen || !sppdId) return;

    const fetchSPPD = async () => {
      setFetching(true);
      try {
        // Fetch Settings
        const settingsRef = doc(db, 'settings', 'general');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          setSettings(settingsSnap.data() as AppSettings);
        }

        const docRef = doc(db, 'sppd', sppdId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as SPPD;
          setReportResults(data.reportResults && data.reportResults.length > 0 ? data.reportResults : ['']);
          setDocumentation(data.documentation || []);
          setFuelType(data.fuelType || '');
          setFuelAmount(data.fuelAmount || 0);
        }
      } catch (err) {
        console.error(err);
        setError('Gagal mengambil data SPPD');
      } finally {
        setFetching(false);
      }
    };

    fetchSPPD();
  }, [isOpen, sppdId]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (documentation.length + files.length > 6) {
      setError('Maksimal 6 foto dokumentasi.');
      return;
    }

    Array.from(files).forEach((file: File) => {
      // Basic size check for original file (though we will compress it)
      if (file.size > 5 * 1024 * 1024) { // 5MB limit for raw upload
        setError('Ukuran file asli terlalu besar (maksimal 5MB)');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize logic (Max width/height 800px)
          const MAX_SIZE = 800;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 0.6 quality
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
          setDocumentation(prev => [...prev, compressedBase64]);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setDocumentation(prev => prev.filter((_, i) => i !== index));
  };

  const addReportResult = () => {
    setReportResults(prev => [...prev, '']);
  };

  const updateReportResult = (index: number, value: string) => {
    const newResults = [...reportResults];
    newResults[index] = value;
    setReportResults(newResults);
  };

  const removeReportResult = (index: number) => {
    if (reportResults.length <= 1) {
      setReportResults(['']);
      return;
    }
    setReportResults(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sppdId) return;

    const filteredResults = reportResults.filter(r => r.trim() !== '');
    if (filteredResults.length === 0) {
      setError('Hasil perjalanan dinas harus diisi minimal satu');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const docRef = doc(db, 'sppd', sppdId);
      await updateDoc(docRef, {
        reportResults: filteredResults,
        documentation,
        fuelType,
        fuelAmount,
        status: 'completed',
        completedAt: new Date().toISOString()
      });
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `sppd/${sppdId}`);
      setError('Gagal menyimpan laporan');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-green-50 to-white">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-green-100 text-green-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Selesaikan SPPD</h2>
              <p className="text-sm text-gray-500">Lengkapi laporan hasil dan dokumentasi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              {error}
            </div>
          )}

          {isFetching ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p>Mengambil data...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">BBM yang digunakan</label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-green-500 transition-all text-gray-700"
                  >
                    <option value="">Pilih BBM...</option>
                    {settings?.fuelPrices.map((fuel, idx) => (
                      <option key={idx} value={fuel.type}>{fuel.type}</option>
                    ))}
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Jumlah Rupiah BBM</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Rp</span>
                    <input
                      type="number"
                      value={fuelAmount || ''}
                      onChange={(e) => setFuelAmount(Number(e.target.value))}
                      placeholder="0"
                      className="w-full pl-12 pr-5 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-green-500 transition-all text-gray-700"
                    />
                  </div>
                </div>
              </div>

              {/* Hasil Perjalanan Dinas */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-900 font-bold">
                    <FileText className="w-5 h-5 text-green-600" />
                    <h3>Hasil Perjalanan Dinas</h3>
                  </div>
                  <button
                    type="button"
                    onClick={addReportResult}
                    className="px-4 py-2 bg-green-50 text-green-600 rounded-xl text-sm font-bold hover:bg-green-100 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Hasil
                  </button>
                </div>
                
                <div className="space-y-3">
                  {reportResults.map((result, idx) => (
                    <div key={idx} className="flex gap-3 items-start group">
                      <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center font-bold text-sm shrink-0 mt-3">
                        {idx + 1}
                      </div>
                      <div className="flex-1 relative">
                        <textarea
                          required
                          value={result}
                          onChange={(e) => updateReportResult(idx, e.target.value)}
                          placeholder={`Tuliskan hasil ke-${idx + 1}...`}
                          className="w-full min-h-[100px] px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-green-500 transition-all resize-none text-gray-700 leading-relaxed"
                        />
                        {reportResults.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeReportResult(idx)}
                            className="absolute top-2 right-2 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dokumentasi */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-900 font-bold">
                    <ImageIcon className="w-5 h-5 text-green-600" />
                    <h3>Dokumentasi Kegiatan</h3>
                  </div>
                  <label className="cursor-pointer px-4 py-2 bg-green-50 text-green-600 rounded-xl text-sm font-bold hover:bg-green-100 transition-colors flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Tambah Foto
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {documentation.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-100 rounded-3xl p-12 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
                    <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm">Belum ada dokumentasi ditambahkan</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {documentation.map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group border border-gray-100 shadow-sm">
                        <img src={img} alt={`Dokumentasi ${idx + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </form>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || isFetching || reportResults.every(r => !r.trim())}
            className="px-8 py-3 bg-green-600 text-white rounded-2xl text-sm font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Selesaikan SPPD
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
