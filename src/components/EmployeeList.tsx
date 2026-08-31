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
  Copy,
  Sparkles,
  ShieldCheck,
  CheckSquare,
  Square
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
import { Employee, OperationType, getEmployeeRoles, employeeHasRole } from '../types';
import { handleFirestoreError } from '../lib/error-handler';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';

const ROLE_GROUPS = [
  {
    category: 'Pimpinan & Umum',
    description: 'Jabatan struktural pimpinan atau pelaksana tugas umum',
    roles: ['Pelaksana', 'Kepala Dinas', 'Sekretaris']
  },
  {
    category: 'Pejabat Penatausahaan Keuangan (PPK)',
    description: 'Pejabat Penatausahaan Keuangan SKPD / Bidang',
    roles: ['PPK (Umum)', 'PPK Sekretariat', 'PPK Bidang Sosial', 'PPK Bidang PPPA', 'PPK UPTD PPA']
  },
  {
    category: 'Pejabat Pembuat Komitmen (PPKom)',
    description: 'Pejabat Pembuat Komitmen pengadaan / kegiatan',
    roles: ['PPKom (Umum)', 'PPKom Sekretariat', 'PPKom Bidang Sosial', 'PPKom Bidang PPPA', 'PPKom UPTD PPA']
  },
  {
    category: 'Pejabat Pelaksana Teknis Kegiatan (PPTK)',
    description: 'Pejabat teknis pengendali pelaksanaan kegiatan',
    roles: ['PPTK (Umum)', 'PPTK Sekretariat', 'PPTK Bidang Sosial', 'PPTK Bidang PPPA', 'PPTK UPTD PPA']
  },
  {
    category: 'Bendahara Pengeluaran',
    description: 'Bendahara pengeluaran dinas / pembantu bidang',
    roles: [
      'Bendahara Pengeluaran',
      'Bendahara Pengeluaran Pembantu Sekretariat',
      'Bendahara Pengeluaran Pembantu Bidang Sosial',
      'Bendahara Pengeluaran Pembantu Bidang PPPA',
      'Bendahara Pengeluaran Pembantu UPTD PPA'
    ]
  }
];

const ROLE_PRESETS = [
  {
    label: 'Kepala Bidang Sosial (PPK & PPKom)',
    roles: ['PPK Bidang Sosial', 'PPKom Bidang Sosial'],
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
  },
  {
    label: 'Kepala Bidang PPPA (PPK & PPKom)',
    roles: ['PPK Bidang PPPA', 'PPKom Bidang PPPA'],
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
  },
  {
    label: 'Sekretaris (PPK & PPKom)',
    roles: ['PPK Sekretariat', 'PPKom Sekretariat'],
    color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
  },
  {
    label: 'Kepala UPTD PPA (PPK & PPKom)',
    roles: ['PPK UPTD PPA', 'PPKom UPTD PPA'],
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
  }
];

export const EmployeeList: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['Pelaksana']);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [copiedNip, setCopiedNip] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [isImporting, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('Semua');
  const [showImportInfo, setShowImportInfo] = useState(false);

  const getJabatanSppdBadges = (emp?: Partial<Employee> | null) => {
    const roles = getEmployeeRoles(emp);
    if (roles.length === 0 || (roles.length === 1 && roles[0] === 'Pelaksana')) {
      return <span className="text-[10px] text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-md inline-block">Pelaksana</span>;
    }
    return (
      <div className="flex flex-wrap items-center gap-1">
        {roles.map((role, idx) => {
          if (role === 'Pelaksana' && roles.length > 1) return null;
          let style = "text-gray-700 bg-gray-100 border-gray-200";
          const rUp = role.toUpperCase();
          if (rUp.includes('PPTK')) {
            style = "text-amber-800 font-bold bg-amber-50 border-amber-200/80";
          } else if (rUp.includes('PPKOM')) {
            style = "text-blue-800 font-bold bg-blue-50 border-blue-200/80";
          } else if (rUp.includes('PPK')) {
            style = "text-indigo-800 font-bold bg-indigo-50 border-indigo-200/80";
          } else if (role.toLowerCase().includes('bendahara')) {
            style = "text-emerald-800 font-bold bg-emerald-50 border-emerald-200/80";
          } else if (role.toLowerCase().includes('kepala dinas') || role.toLowerCase().includes('sekretaris')) {
            style = "text-purple-800 font-bold bg-purple-50 border-purple-200/80";
          }
          return (
            <span key={idx} className={`text-[10px] px-2 py-0.5 rounded-md border ${style}`}>
              {role}
            </span>
          );
        })}
      </div>
    );
  };

  const handleCopyNip = (nip?: string) => {
    if (!nip || nip === '-') return;
    navigator.clipboard.writeText(nip);
    setCopiedNip(nip);
    setTimeout(() => setCopiedNip(null), 2000);
  };

  const toggleRole = (role: string) => {
    setSelectedRoles(prev => {
      if (role === 'Pelaksana') {
        return ['Pelaksana'];
      }
      const withoutPelaksana = prev.filter(r => r !== 'Pelaksana');
      if (withoutPelaksana.includes(role)) {
        const filtered = withoutPelaksana.filter(r => r !== role);
        return filtered.length > 0 ? filtered : ['Pelaksana'];
      } else {
        return [...withoutPelaksana, role];
      }
    });
  };

  const applyPreset = (roles: string[]) => {
    setSelectedRoles(roles);
  };

  useEffect(() => {
    const q = query(collection(db, 'employees'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'employees'));

    return unsubscribe;
  }, []);

  const openAddModal = () => {
    setCurrentEmployee(null);
    setSelectedRoles(['Pelaksana']);
    setModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setCurrentEmployee(emp);
    const roles = getEmployeeRoles(emp);
    setSelectedRoles(roles.length > 0 ? roles : ['Pelaksana']);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const validRoles = selectedRoles.length > 0 ? selectedRoles : ['Pelaksana'];

    const data: Partial<Employee> = {
      name: formData.get('name') as string,
      nip: formData.get('nip') as string,
      jabatan: formData.get('jabatan') as string,
      pangkat: formData.get('pangkat') as string,
      golongan: formData.get('golongan') as string,
      tingkatSppd: formData.get('tingkatSppd') as string,
      jabatanSppdList: validRoles,
      jabatanSppd: validRoles.join(', '),
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
            const rawJabatanSppd = row['Jabatan dalam SPPD'] || row.jabatanSppd || '';
            const parsedRoles = rawJabatanSppd
              ? rawJabatanSppd.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean)
              : ['Pelaksana'];

            const newDocRef = doc(employeesRef);
            batch.set(newDocRef, {
              name: row.Nama || row.name || '',
              nip: row.NIP || row.nip || '',
              jabatan: row.Jabatan || row.jabatan || '',
              pangkat: row.Pangkat || row.pangkat || '',
              golongan: row.Golongan || row.golongan || '',
              tingkatSppd: row['Tingkat SPPD'] || row.tingkatSppd || '',
              jabatanSppdList: parsedRoles,
              jabatanSppd: parsedRoles.join(', '),
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

  const filteredEmployees = employees.filter(emp => {
    const roles = getEmployeeRoles(emp);
    const rolesString = roles.join(' ');
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.nip.includes(searchTerm) ||
      (emp.jabatan || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.jabatanSppd || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      rolesString.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (selectedRoleFilter === 'Semua') return true;
    if (selectedRoleFilter === 'PPTK') return employeeHasRole(emp, 'PPTK');
    if (selectedRoleFilter === 'PPK') return employeeHasRole(emp, 'PPK');
    if (selectedRoleFilter === 'PPKom') return employeeHasRole(emp, 'PPKOM');
    if (selectedRoleFilter === 'Bendahara') return employeeHasRole(emp, 'bendahara');
    if (selectedRoleFilter === 'Pelaksana') return roles.length === 0 || (roles.length === 1 && roles[0] === 'Pelaksana');
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Karyawan</h1>
          <p className="text-gray-500 text-sm">Kelola data pegawai Dinsos PPPA Blora dengan dukungan multi-peran SPPD (PPK, PPKom, PPTK, dll).</p>
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
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-200 font-medium cursor-pointer"
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
                Petunjuk Format Import CSV (Dukungan Multi-Peran)
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
                  <div className="mt-3 p-3 bg-white/80 rounded-xl border border-blue-200 text-blue-900 text-xs space-y-1">
                    <p className="font-bold">💡 Contoh Multi-Peran (PPK & PPKom Sekaligus):</p>
                    <code className="block bg-blue-100/70 p-1.5 rounded text-[11px] font-mono">
                      PPK Bidang Sosial, PPKom Bidang Sosial
                    </code>
                  </div>
                </div>
                <div className="space-y-2 text-blue-700">
                  <p className="font-bold text-blue-900 uppercase tracking-wider text-[10px]">Pilihan Jabatan dalam SPPD:</p>
                  <ul className="space-y-1 font-medium text-xs">
                    <li>- <span className="font-semibold">PPK:</span> PPK Sekretariat, PPK Bidang Sosial, PPK Bidang PPPA, PPK UPTD PPA, PPK (Umum)</li>
                    <li>- <span className="font-semibold">PPKom:</span> PPKom Sekretariat, PPKom Bidang Sosial, PPKom Bidang PPPA, PPKom UPTD PPA, PPKom (Umum)</li>
                    <li>- <span className="font-semibold">PPTK:</span> PPTK Sekretariat, PPTK Bidang Sosial, PPTK Bidang PPPA, PPTK UPTD PPA, PPTK (Umum)</li>
                    <li>- <span className="font-semibold">Bendahara:</span> Bendahara Pengeluaran, Bendahara Pengeluaran Pembantu [Bidang]</li>
                    <li>- <span className="font-semibold">Pimpinan/Umum:</span> Kepala Dinas, Sekretaris, Pelaksana</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama, NIP, jabatan, atau peran SPPD (PPK, PPKom, PPTK)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm transition-all"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 px-4 py-2.5 bg-gray-50 rounded-xl whitespace-nowrap">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Total: <strong className="text-gray-900">{filteredEmployees.length}</strong> / {employees.length} Pegawai</span>
          </div>
        </div>

        {/* Role Quick Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px] mr-1 shrink-0">Filter Peran:</span>
          {['Semua', 'PPTK', 'PPK', 'PPKom', 'Bendahara', 'Pelaksana'].map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setSelectedRoleFilter(role)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
                selectedRoleFilter === role
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {role}
              {role !== 'Semua' && (
                <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedRoleFilter === role ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {employees.filter(e => {
                    if (role === 'PPTK') return employeeHasRole(e, 'PPTK');
                    if (role === 'PPK') return employeeHasRole(e, 'PPK');
                    if (role === 'PPKom') return employeeHasRole(e, 'PPKOM');
                    if (role === 'Bendahara') return employeeHasRole(e, 'bendahara');
                    if (role === 'Pelaksana') {
                      const r = getEmployeeRoles(e);
                      return r.length === 0 || (r.length === 1 && r[0] === 'Pelaksana');
                    }
                    return true;
                  }).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Pegawai & Peran SPPD</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">NIP</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Jabatan Kedinasan</th>
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
                        className="flex items-start gap-3 text-left group/name focus:outline-none cursor-pointer"
                        title="Klik untuk melihat detail data karyawan"
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-50 group-hover/name:bg-blue-600 group-hover/name:text-white flex items-center justify-center text-blue-600 font-bold text-sm transition-all shrink-0 shadow-xs mt-0.5">
                          {emp.name.charAt(0)}
                        </div>
                        <div className="space-y-1.5 max-w-sm">
                          <p className="font-semibold text-gray-900 group-hover/name:text-blue-600 transition-colors flex items-center gap-1.5">
                            <span>{emp.name}</span>
                            <Eye className="w-3.5 h-3.5 opacity-0 group-hover/name:opacity-100 text-blue-600 transition-opacity shrink-0" />
                          </p>
                          <div>
                            {getJabatanSppdBadges(emp)}
                          </div>
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
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">{emp.jabatan}</td>
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
                          onClick={() => openEditModal(emp)}
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

      {/* Modal Tambah / Edit Karyawan */}
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
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {currentEmployee ? 'Ubah Data Karyawan' : 'Tambah Karyawan Baru'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Tentukan identitas dan peran penandatangan SPPD (dapat memilih lebih dari 1 peran).
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
                {error && (
                  <div className="p-4 bg-red-50 text-red-700 rounded-2xl flex items-center gap-3 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Profil Utama */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Nama Lengkap & Gelar</label>
                    <input
                      name="name"
                      required
                      defaultValue={currentEmployee?.name}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-medium text-gray-900"
                      placeholder="Contoh: Drs. H. Ahmad Fauzi, M.Si"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">NIP</label>
                    <input
                      name="nip"
                      defaultValue={currentEmployee?.nip}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                      placeholder="198001012005011001 atau -"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Jabatan Kedinasan</label>
                    <input
                      name="jabatan"
                      required
                      defaultValue={currentEmployee?.jabatan}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="Contoh: Kepala Bidang Sosial"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Pangkat</label>
                    <input
                      name="pangkat"
                      defaultValue={currentEmployee?.pangkat}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                      placeholder="Contoh: Pembina"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Golongan</label>
                    <input
                      name="golongan"
                      defaultValue={currentEmployee?.golongan}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                      placeholder="Contoh: IV/a"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Tingkat SPPD</label>
                    <select
                      name="tingkatSppd"
                      defaultValue={currentEmployee?.tingkatSppd || 'C'}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm font-semibold"
                    >
                      <option value="A">A - Pejabat Eselon II / Kepala Dinas</option>
                      <option value="B">B - Pejabat Eselon III / Kabid / Sekretaris</option>
                      <option value="C">C - Golongan IV / Eselon IV</option>
                      <option value="D">D - Golongan III</option>
                      <option value="E">E - Golongan II</option>
                      <option value="F">F - Golongan I</option>
                      <option value="G">G - Non ASN / PTT</option>
                      <option value="H">H - Tingkat Khusus / Lainnya</option>
                    </select>
                  </div>
                </div>

                {/* Multi-Role Selector */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        <label className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                          Peran dalam SPPD (Bisa Pilih Lebih dari 1)
                        </label>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Centang satu atau beberapa peran. Misalnya Kepala Bidang Sosial bisa menjadi <strong>PPK</strong> sekaligus <strong>PPKom</strong>.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedRoles(['Pelaksana'])}
                      className="text-xs text-gray-500 hover:text-red-600 underline font-medium self-start sm:self-auto cursor-pointer"
                    >
                      Reset ke Pelaksana
                    </button>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Pilihan Cepat Kombinasi (Presets):</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ROLE_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => applyPreset(preset.roles)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer ${preset.color}`}
                        >
                          + {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected Roles Preview Tags */}
                  <div className="p-3 bg-white rounded-xl border border-gray-200/60 space-y-2">
                    <div className="text-[11px] font-bold text-gray-600 flex items-center justify-between">
                      <span>Peran Terpilih ({selectedRoles.length}):</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedRoles.map((role, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold rounded-lg shadow-2xs"
                        >
                          <span>{role}</span>
                          <button
                            type="button"
                            onClick={() => toggleRole(role)}
                            className="text-blue-500 hover:text-red-600 p-0.5 rounded-full hover:bg-blue-100 transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Grouped Checkboxes / Chips */}
                  <div className="space-y-3.5 pt-1">
                    {ROLE_GROUPS.map((group, gIdx) => (
                      <div key={gIdx} className="space-y-1.5">
                        <p className="text-[11px] font-bold text-gray-700">{group.category}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {group.roles.map((role, rIdx) => {
                            const isSelected = selectedRoles.includes(role);
                            return (
                              <button
                                key={rIdx}
                                type="button"
                                onClick={() => toggleRole(role)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer border ${
                                  isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 shrink-0 text-white" />
                                ) : (
                                  <Square className="w-4 h-4 shrink-0 text-gray-400" />
                                )}
                                <span className="truncate">{role}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 px-4 py-3 text-gray-600 font-medium hover:bg-gray-50 rounded-xl transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-3 rounded-xl transition-all font-bold shadow-lg shadow-blue-100 cursor-pointer"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Simpan Data Pegawai
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
                  <div className="p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-1.5 sm:col-span-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-wider">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Peran dalam SPPD</span>
                    </div>
                    <div>
                      {getJabatanSppdBadges(viewingEmployee)}
                    </div>
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
                    openEditModal(emp);
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
