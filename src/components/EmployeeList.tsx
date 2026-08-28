import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X,
  Check,
  Loader2,
  AlertCircle,
  Upload,
  HelpCircle,
  Info,
  Eye,
  Briefcase,
  Award,
  CreditCard,
  UserCheck,
  Copy
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Employee, OperationType } from '../types';
import { handleFirestoreError } from '../lib/error-handler';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';

export const EmployeeList: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [copiedNip, setCopiedNip] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [isImporting, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showImportInfo, setShowImportInfo] = useState(false);

  const handleCopyNip = (nip?: string) => {
    if (!nip || nip === '-') return;
    navigator.clipboard.writeText(nip);
    setCopiedNip(nip);
    setTimeout(() => setCopiedNip(null), 2000);
  };

  useEffect(() => {
    const q = query(collection(db, 'employees'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'employees'));

    return unsubscribe;
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data: Partial<Employee> = {
      name: formData.get('name') as string,
      nip: formData.get('nip') as string,
      jabatan: formData.get('jabatan') as string,
      pangkat: formData.get('pangkat') as string,
      golongan: formData.get('golongan') as string,
      tingkatSppd: formData.get('tingkatSppd') as string,
      jabatanSppd: formData.get('jabatanSppd') as string,
    };

    try {
      if (currentEmployee?.id) {
        await updateDoc(doc(db, 'employees', currentEmployee.id), data);
      } else {
        await addDoc(collection(db, 'employees'), data);
      }
      setModalOpen(false);
      setCurrentEmployee(null);
    } catch (err: any) {
      handleFirestoreError(err, currentEmployee?.id ? OperationType.UPDATE : OperationType.CREATE, 'employees');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data ini?')) {
      try {
        await deleteDoc(doc(db, 'employees', id));
      } catch (err: any) {
        handleFirestoreError(err, OperationType.DELETE, 'employees');
      }
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const batch = writeBatch(db);
          const employeesRef = collection(db, 'employees');
          
          results.data.forEach((row: any) => {
            const newDocRef = doc(employeesRef);
            batch.set(newDocRef, {
              name: row.Nama || row.name || '',
              nip: row.NIP || row.nip || '',
              jabatan: row.Jabatan || row.jabatan || '',
              pangkat: row.Pangkat || row.pangkat || '',
              golongan: row.Golongan || row.golongan || '',
              tingkatSppd: row['Tingkat SPPD'] || row.tingkatSppd || '',
              jabatanSppd: row['Jabatan dalam SPPD'] || row.jabatanSppd || '',
            });
          });

          await batch.commit();
          alert(`Berhasil mengimport ${results.data.length} data karyawan.`);
        } catch (err: any) {
          handleFirestoreError(err, OperationType.WRITE, 'employees');
        } finally {
          setImporting(false);
          e.target.value = '';
        }
      },
      error: (err) => {
        console.error(err);
        alert('Gagal membaca file CSV.');
        setImporting(false);
      }
    });
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.nip.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Karyawan</h1>
          <p className="text-gray-500 text-sm">Kelola data pegawai Dinsos PPPA Blora.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportInfo(!showImportInfo)}
            className={`p-2.5 rounded-xl border transition-all ${showImportInfo ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'}`}
            title="Petunjuk Import"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          <label className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl transition-all hover:bg-gray-50 cursor-pointer font-medium">
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImportCSV}
              disabled={isImporting}
            />
            {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            Import CSV
          </label>
          <button
            onClick={() => {
              setCurrentEmployee(null);
              setModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-200 font-medium"
          >
            <Plus className="w-5 h-5" />
            Tambah Karyawan
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showImportInfo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-blue-800 font-bold">
                <Info className="w-5 h-5" />
                Petunjuk Format Import CSV
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-2">
                  <p className="font-bold text-blue-900 uppercase tracking-wider text-[10px]">Header Kolom yang Wajib Ada:</p>
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-blue-700 font-medium">
                    <li>• Nama</li>
                    <li>• NIP</li>
                    <li>• Jabatan</li>
                    <li>• Pangkat</li>
                    <li>• Golongan</li>
                    <li>• Tingkat SPPD</li>
                    <li>• Jabatan dalam SPPD</li>
                  </ul>
                </div>
                <div className="space-y-2 text-blue-700">
                  <p className="font-bold text-blue-900 uppercase tracking-wider text-[10px]">Peringatan Penting:</p>
                  <ul className="space-y-1 font-medium italic">
                    <li>- Pastikan file disimpan dengan format <span className="font-bold underline">CSV (Comma delimited)</span>.</li>
                    <li>- <span className="font-bold">Tingkat SPPD</span> wajib diisi satu huruf saja (A, B, C, D, E, F, G, atau H).</li>
                    <li>- Hindari penggunaan simbol "kutip" di dalam isi data Nama atau Jabatan.</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Stats */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama atau NIP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 px-4 py-2 bg-gray-50 rounded-xl whitespace-nowrap">
          <Users className="w-4 h-4" />
          Total: <span className="font-bold text-gray-900">{employees.length}</span> Pegawai
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Pegawai</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">NIP</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Jabatan</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Pangkat/Gol</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tingkat SPPD</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    Tidak ada data ditemukan
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => setViewingEmployee(emp)}
                        className="flex items-center gap-3 text-left group/name focus:outline-none cursor-pointer"
                        title="Klik untuk melihat detail data karyawan"
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-50 group-hover/name:bg-blue-600 group-hover/name:text-white flex items-center justify-center text-blue-600 font-bold text-sm transition-all shrink-0 shadow-xs">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 group-hover/name:text-blue-600 transition-colors flex items-center gap-1.5">
                            <span>{emp.name}</span>
                            <Eye className="w-3.5 h-3.5 opacity-0 group-hover/name:opacity-100 text-blue-600 transition-opacity" />
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{emp.jabatanSppd || '-'}</p>
                        </div>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                      <div className="flex items-center gap-1.5 group/nip">
                        <span>{emp.nip || '-'}</span>
                        {emp.nip && emp.nip !== '-' && (
                          <button
                            type="button"
                            onClick={() => handleCopyNip(emp.nip)}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="Salin NIP"
                          >
                            {copiedNip === emp.nip ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{emp.jabatan}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {emp.pangkat || '-'} / {emp.golongan || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold border border-gray-200">
                        {emp.tingkatSppd || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setViewingEmployee(emp)}
                          title="Lihat Detail Karyawan"
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setCurrentEmployee(emp);
                            setModalOpen(true);
                          }}
                          title="Ubah Data Karyawan"
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => emp.id && handleDelete(emp.id)}
                          title="Hapus Karyawan"
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
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
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                <h3 className="text-lg font-bold text-gray-900">
                  {currentEmployee ? 'Edit Karyawan' : 'Tambah Karyawan'}
                </h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Nama Lengkap</label>
                  <input
                    name="name"
                    required
                    defaultValue={currentEmployee?.name}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Masukkan nama lengkap..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">NIP</label>
                    <input
                      name="nip"
                      required
                      defaultValue={currentEmployee?.nip}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="NIP..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Jabatan</label>
                    <input
                      name="jabatan"
                      required
                      defaultValue={currentEmployee?.jabatan}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="Jabatan..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Pangkat</label>
                    <input
                      name="pangkat"
                      defaultValue={currentEmployee?.pangkat}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="Pangkat..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Golongan</label>
                    <input
                      name="golongan"
                      defaultValue={currentEmployee?.golongan}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="Golongan..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Tingkat SPPD</label>
                    <select
                      name="tingkatSppd"
                      defaultValue={currentEmployee?.tingkatSppd || 'C'}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                      <option value="E">E</option>
                      <option value="F">F</option>
                      <option value="G">G</option>
                      <option value="H">H</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Jabatan dalam SPPD</label>
                    <select
                      name="jabatanSppd"
                      defaultValue={currentEmployee?.jabatanSppd || 'Pelaksana'}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="Pelaksana">Pelaksana</option>
                      <option value="Kepala Dinas">Kepala Dinas</option>
                      <option value="Sekretaris">Sekretaris</option>
                      <option value="PPK">PPK</option>
                      <option value="Bendahara Pengeluaran">Bendahara Pengeluaran</option>
                      <option value="Bendahara Pengeluaran Pembantu Sekretariat">Bendahara Pengeluaran Pembantu Sekretariat</option>
                      <option value="Bendahara Pengeluaran Pembantu Bidang Sosial">Bendahara Pengeluaran Pembantu Bidang Sosial</option>
                      <option value="Bendahara Pengeluaran Pembantu Bidang PPPA">Bendahara Pengeluaran Pembantu Bidang PPPA</option>
                      <option value="Bendahara Pengeluaran Pembantu UPTD PPA">Bendahara Pengeluaran Pembantu UPTD PPA</option>
                      <option value="PPTK (Pejabat Pelaksana Teknis Kegiatan)">PPTK (Pejabat Pelaksana Teknis Kegiatan)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-3 shrink-0">
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
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-3 rounded-xl transition-all font-bold shadow-lg shadow-blue-100"
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

      {/* Modal View Detail Karyawan */}
      <AnimatePresence>
        {viewingEmployee && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingEmployee(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white relative shrink-0">
                <button
                  onClick={() => setViewingEmployee(null)}
                  className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-4 pt-1">
                  <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white font-black text-2xl shadow-inner shrink-0">
                    {viewingEmployee.name.charAt(0)}
                  </div>
                  <div className="min-w-0 pr-6">
                    <span className="inline-block px-2.5 py-0.5 bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider rounded-md mb-1 border border-white/20">
                      Detail Pegawai
                    </span>
                    <h3 className="text-xl font-black text-white truncate leading-tight">
                      {viewingEmployee.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-blue-100 text-xs font-mono">
                        NIP: {viewingEmployee.nip || '-'}
                      </p>
                      {viewingEmployee.nip && viewingEmployee.nip !== '-' && (
                        <button
                          type="button"
                          onClick={() => handleCopyNip(viewingEmployee.nip)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-[11px] font-medium transition-all cursor-pointer backdrop-blur-xs shadow-xs"
                          title="Salin NIP"
                        >
                          {copiedNip === viewingEmployee.nip ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-300" />
                              <span className="text-emerald-300 font-bold">Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-blue-100" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Body Content */}
              <div className="p-6 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Jabatan */}
                  <div className="sm:col-span-2 p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                      <span>Jabatan Kedinasan</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900">
                      {viewingEmployee.jabatan || '-'}
                    </p>
                  </div>

                  {/* Pangkat */}
                  <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <Award className="w-3.5 h-3.5 text-blue-600" />
                      <span>Pangkat</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">
                      {viewingEmployee.pangkat || '-'}
                    </p>
                  </div>

                  {/* Golongan */}
                  <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <Award className="w-3.5 h-3.5 text-blue-600" />
                      <span>Golongan / Ruang</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">
                      {viewingEmployee.golongan || '-'}
                    </p>
                  </div>

                  {/* Tingkat SPPD */}
                  <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider">
                      <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                      <span>Tingkat SPPD</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-600 text-white font-black rounded-lg text-sm shadow-xs">
                        {viewingEmployee.tingkatSppd || '-'}
                      </span>
                      <span className="text-xs text-blue-800 font-medium">
                        Standar Biaya Tingkat {viewingEmployee.tingkatSppd || '-'}
                      </span>
                    </div>
                  </div>

                  {/* Jabatan dalam SPPD */}
                  <div className="p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Jabatan dalam SPPD</span>
                    </div>
                    <p className="text-sm font-bold text-indigo-950">
                      {viewingEmployee.jabatanSppd || 'Pelaksana'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewingEmployee(null)}
                  className="px-5 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-200/60 font-semibold rounded-xl text-sm transition-all cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const emp = viewingEmployee;
                    setViewingEmployee(null);
                    setCurrentEmployee(emp);
                    setModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-200 transition-all cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Ubah Data Pegawai</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
