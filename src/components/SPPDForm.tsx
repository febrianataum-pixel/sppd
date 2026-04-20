import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Save, 
  RotateCcw, 
  Loader2, 
  AlertCircle,
  FileText,
  User,
  FolderTree,
  MapPin,
  Calendar,
  Truck,
  Wallet,
  Plus,
  Trash2,
  Users
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SPPD, Employee, SubActivity, OperationType } from '../types';
import { handleFirestoreError } from '../lib/error-handler';
import { cn } from '../lib/utils';
import { differenceInDays, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { SearchableSelect } from './SearchableSelect';

interface SPPDFormProps {
  isOpen: boolean;
  onClose: () => void;
  sppdId?: string | null;
}

export const SPPDForm: React.FC<SPPDFormProps> = ({ isOpen, onClose, sppdId }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activities, setActivities] = useState<SubActivity[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [isFetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sppdNumber, setSppdNumber] = useState('');
  const [sppdYear, setSppdYear] = useState('2026');
  const [formData, setFormData] = useState<Partial<SPPD>>({
    status: 'active',
    transport: 'Kendaraan Dinas',
    departureLocation: 'Dinsos PPPA Kab. Blora',
    departureDate: new Date().toISOString().split('T')[0],
    returnDate: new Date().toISOString().split('T')[0],
    duration: 1,
    travelType: 'Dalam Daerah',
    followers: [],
    tingkatBiaya: 'A',
    bidang: 'Sekretariat',
    otherNotes: '',
  });

  useEffect(() => {
    if (!isOpen) return;

    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => {
      const emps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
      setEmployees(emps);
      
      // Auto-select PPK if not editing and PPK exists
      if (!sppdId) {
        const ppk = emps.find(e => e.jabatanSppd?.toUpperCase() === 'PPK');
        if (ppk) {
          setFormData(prev => ({ ...prev, ppkId: ppk.id }));
        }
      }
    });

    const unsubActivities = onSnapshot(collection(db, 'sub_activities'), (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubActivity)));
    });

    if (sppdId) {
      setFetching(true);
      const fetchSPPD = async () => {
        try {
          const docRef = doc(db, 'sppd', sppdId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as SPPD;
            setFormData(data);
            
            // Extract the middle part and year if it matches the format: 000.1.2.3 / [nomor] / {tahun}
            const match = data.number?.match(/000\.1\.2\.3 \/ (.*) \/ (\d{4})/);
            if (match) {
              setSppdNumber(match[1]);
              setSppdYear(match[2]);
            } else if (data.number) {
              setSppdNumber(data.number);
            }
          }
        } catch (err) {
          console.error(err);
        } finally {
          setFetching(false);
        }
      };
      fetchSPPD();
    } else {
      setFormData({
        status: 'active',
        transport: 'Kendaraan Dinas',
        departureLocation: 'Dinsos PPPA Kab. Blora',
        departureDate: new Date().toISOString().split('T')[0],
        returnDate: new Date().toISOString().split('T')[0],
        duration: 1,
        travelType: 'Dalam Daerah',
        followers: [],
        tingkatBiaya: 'A',
        bidang: 'Sekretariat',
        otherNotes: '',
      });
      setSppdNumber('');
      setSppdYear('2026');
    }

    return () => {
      unsubEmployees();
      unsubActivities();
    };
  }, [isOpen, sppdId]);

  useEffect(() => {
    if (formData.departureDate && formData.returnDate) {
      const start = parseISO(formData.departureDate);
      const end = parseISO(formData.returnDate);
      const days = differenceInDays(end, start) + 1;
      if (days > 0 && days !== formData.duration) {
        setFormData(prev => ({ ...prev, duration: days }));
      }
    }
  }, [formData.departureDate, formData.returnDate]);

  const handleAddFollower = () => {
    if ((formData.followers?.length || 0) >= 3) {
      alert('Maksimal 3 pengikut.');
      return;
    }
    setFormData(prev => ({
      ...prev,
      followers: [...(prev.followers || []), { name: '', nip: '', gol: '', tingkat: '', ket: '' }]
    }));
  };

  const handleRemoveFollower = (index: number) => {
    setFormData(prev => ({
      ...prev,
      followers: prev.followers?.filter((_, i) => i !== index)
    }));
  };

  const handleFollowerSelect = (index: number, employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;

    // Validation: Cannot be the primary employee
    if (emp.id === formData.employeeId) {
      setError(`Pegawai "${emp.name}" sudah dipilih sebagai Pegawai yang Diperintah.`);
      return;
    }

    // Validation: Cannot be a duplicate follower
    const isDuplicate = formData.followers?.some((f, i) => i !== index && f.nip === emp.nip);
    if (isDuplicate) {
      setError(`Pegawai "${emp.name}" sudah ada dalam daftar pengikut.`);
      return;
    }

    setError(null);
    setFormData(prev => {
      const newFollowers = [...(prev.followers || [])];
      newFollowers[index] = {
        name: emp.name,
        nip: emp.nip,
        gol: emp.golongan || '',
        tingkat: emp.tingkatSppd || '',
        ket: emp.jabatan || ''
      };
      return { ...prev, followers: newFollowers };
    });
  };

  const handleEmployeeSelect = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;

    // Check if this employee is already a follower
    const isFollower = formData.followers?.some(f => f.nip === emp.nip);
    if (isFollower) {
      setError(`Pegawai "${emp.name}" sudah ada dalam daftar pengikut. Hapus dari pengikut terlebih dahulu.`);
      return;
    }

    setError(null);
    setFormData(prev => ({
      ...prev,
      employeeId: emp.id,
      tingkatBiaya: emp.tingkatSppd || prev.tingkatBiaya
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Client-side validation
    if (!formData.ppkId) {
      setError('Pejabat Pembuat Komitmen (PPK) harus dipilih.');
      setLoading(false);
      return;
    }
    if (!formData.employeeId) {
      setError('Pegawai yang Diperintah harus dipilih.');
      setLoading(false);
      return;
    }
    if (!formData.subActivityId) {
      setError('Sub Kegiatan harus dipilih.');
      setLoading(false);
      return;
    }
    if (!formData.bidang) {
      setError('Bidang harus dipilih.');
      setLoading(false);
      return;
    }

    // Validate followers
    const invalidFollower = formData.followers?.find(f => !f.nip);
    if (invalidFollower) {
      setError('Semua baris pengikut harus memilih karyawan.');
      setLoading(false);
      return;
    }

    const fullNumber = sppdNumber.includes('/') ? sppdNumber : `000.1.2.3 / ${sppdNumber} / ${sppdYear}`;

    const data = {
      ...formData,
      number: fullNumber,
      createdAt: formData.createdAt || new Date().toISOString(),
    } as SPPD;

    try {
      if (sppdId) {
        await updateDoc(doc(db, 'sppd', sppdId), data as any);
      } else {
        await addDoc(collection(db, 'sppd'), data);
      }
      onClose();
    } catch (err: any) {
      handleFirestoreError(err, sppdId ? OperationType.UPDATE : OperationType.CREATE, 'sppd');
    } finally {
      setLoading(false);
    }
  };

  const employeeOptions = employees.map(emp => ({
    id: emp.id!,
    label: emp.name,
    sublabel: `${emp.nip} - ${emp.jabatan}`,
    data: emp
  }));

  const ppkOptions = employees
    .filter(e => e.jabatanSppd?.toUpperCase() === 'PPK')
    .map(emp => ({
      id: emp.id!,
      label: emp.name,
      sublabel: emp.nip,
      data: emp
    }));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-gray-50 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-6 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{sppdId ? 'Edit SPPD' : 'Tambah SPPD Baru'}</h2>
                  <p className="text-sm text-gray-500">Lengkapi formulir sesuai format standar SPPD.</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-600"
              >
                <RotateCcw className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isFetching ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                  <p className="text-gray-500 font-medium">Memuat data SPPD...</p>
                </div>
              ) : (
                <form id="sppd-form" onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
                      <AlertCircle className="w-5 h-5" />
                      {error}
                    </div>
                  )}

                  {/* Section: Dokumen */}
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-gray-50">
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                        <FileText className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-gray-900">Informasi Dokumen</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Nomor SPPD</label>
                        <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                           <span className="text-sm font-bold text-gray-400 shrink-0">000.1.2.3 /</span>
                           <input
                             required
                             placeholder="Isi Nomor..."
                             value={sppdNumber}
                             onChange={(e) => setSppdNumber(e.target.value)}
                             className="flex-1 bg-transparent border-none p-0 focus:ring-0 text-sm font-bold text-gray-900"
                           />
                           <span className="text-sm font-bold text-gray-400 shrink-0">/</span>
                           <select
                             value={sppdYear}
                             onChange={(e) => setSppdYear(e.target.value)}
                             className="bg-transparent border-none p-0 focus:ring-0 text-sm font-bold text-gray-900 cursor-pointer"
                           >
                             {['2026', '2027', '2028', '2029', '2030'].map(year => (
                               <option key={year} value={year}>{year}</option>
                             ))}
                           </select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Bidang / Bendahara Pembantu</label>
                        <select
                          required
                          value={formData.bidang || ''}
                          onChange={(e) => setFormData({ ...formData, bidang: e.target.value as any })}
                          className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                        >
                          <option value="">Pilih Bidang...</option>
                          <option value="Sekretariat">Sekretariat</option>
                          <option value="Bidang Sosial">Bidang Sosial</option>
                          <option value="Bidang PPPA">Bidang PPPA</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section: Pejabat & Pegawai */}
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-gray-50">
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                        <User className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-gray-900">Pejabat & Pelaksana</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Pejabat Pembuat Komitmen (PPK)</label>
                        <SearchableSelect
                          options={ppkOptions}
                          value={formData.ppkId || ''}
                          onChange={(val) => setFormData({ ...formData, ppkId: val })}
                          placeholder="Pilih PPK..."
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Pegawai yang Diperintah</label>
                        <SearchableSelect
                          options={employeeOptions.map(opt => ({
                            ...opt,
                            disabled: formData.followers?.some(f => f.nip === opt.data.nip)
                          }))}
                          value={formData.employeeId || ''}
                          onChange={handleEmployeeSelect}
                          placeholder="Cari Pegawai..."
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Tingkat Biaya Perjalanan</label>
                        <input
                          required
                          value={formData.tingkatBiaya || ''}
                          onChange={(e) => setFormData({ ...formData, tingkatBiaya: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                          placeholder="Contoh: A / B / C"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Jenis Perjalanan</label>
                        <select
                          value={formData.travelType || 'Dalam Daerah'}
                          onChange={(e) => setFormData({ ...formData, travelType: e.target.value as any })}
                          className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                        >
                          <option value="Dalam Daerah">Dalam Daerah</option>
                          <option value="Luar Daerah">Luar Daerah</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section: Travel Details */}
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-gray-50">
                      <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-gray-900">Detail Perjalanan</h3>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Maksud Perjalanan Dinas</label>
                      <textarea
                        required
                        value={formData.purpose || ''}
                        onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                        placeholder="Masukkan maksud perjalanan dinas..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Tempat Berangkat</label>
                        <input
                          required
                          value={formData.departureLocation || ''}
                          onChange={(e) => setFormData({ ...formData, departureLocation: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Tempat Tujuan</label>
                        <input
                          required
                          value={formData.destination || ''}
                          onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                          placeholder="Tujuan..."
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Tanggal Berangkat</label>
                        <input
                          type="date"
                          required
                          value={formData.departureDate || ''}
                          onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Tanggal Kembali</label>
                        <input
                          type="date"
                          required
                          value={formData.returnDate || ''}
                          onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Lama Perjalanan (Hari)</label>
                        <input
                          type="number"
                          readOnly
                          value={formData.duration || 0}
                          className="w-full px-4 py-3 bg-gray-100 border-none rounded-xl text-gray-500 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Alat Angkut</label>
                        <input
                          required
                          value={formData.transport || ''}
                          onChange={(e) => setFormData({ ...formData, transport: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Sub Kegiatan</label>
                        <select
                          required
                          value={formData.subActivityId || ''}
                          onChange={(e) => setFormData({ ...formData, subActivityId: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                        >
                          <option value="">Pilih Sub Kegiatan...</option>
                          {activities.map(act => (
                            <option key={act.id} value={act.id}>{act.code} - {act.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section: Followers */}
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                          <Users className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-gray-900">Pengikut (Maks. 3)</h3>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {formData.followers?.length === 0 ? (
                        <p className="text-center py-4 text-gray-400 text-sm">Tidak ada pengikut</p>
                      ) : (
                        formData.followers?.map((follower, index) => {
                          const selectedEmp = employees.find(e => e.nip === follower.nip);
                          
                          // Mark employees as disabled if they are already selected as primary or as another follower
                          const followerOptions = employeeOptions.map(opt => ({
                            ...opt,
                            disabled: opt.id === formData.employeeId || 
                                     (formData.followers?.some((f, i) => i !== index && f.nip === opt.data.nip))
                          }));

                          return (
                            <div key={index} className="p-5 bg-gray-50 rounded-2xl space-y-4 relative group border border-gray-100">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                                    {index + 1}
                                  </div>
                                  <h4 className="font-bold text-gray-900">
                                    {follower.name || 'Pilih Pengikut'}
                                  </h4>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFollower(index)}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Pilih Karyawan</label>
                                  <SearchableSelect
                                    options={followerOptions}
                                    value={selectedEmp?.id || ''}
                                    onChange={(val) => handleFollowerSelect(index, val)}
                                    placeholder="Cari Nama Pengikut..."
                                    className="bg-white"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">NIP</label>
                                  <input
                                    readOnly
                                    value={follower.nip}
                                    className="w-full px-4 py-3 bg-gray-100 border-none rounded-xl text-sm text-gray-500"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Golongan</label>
                                  <input
                                    readOnly
                                    value={follower.gol}
                                    className="w-full px-4 py-3 bg-gray-100 border-none rounded-xl text-sm text-gray-500"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Tingkat Biaya</label>
                                  <input
                                    readOnly
                                    value={follower.tingkat}
                                    className="w-full px-4 py-3 bg-gray-100 border-none rounded-xl text-sm text-gray-500"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Jabatan</label>
                                  <input
                                    placeholder="Jabatan..."
                                    value={follower.ket}
                                    onChange={(e) => {
                                      const newFollowers = [...(formData.followers || [])];
                                      newFollowers[index] = { ...newFollowers[index], ket: e.target.value };
                                      setFormData({ ...formData, followers: newFollowers });
                                    }}
                                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}

                      {/* Add Follower Button at the bottom */}
                      <div className="pt-2">
                        <button
                          type="button"
                          disabled={(formData.followers?.length || 0) >= 3}
                          onClick={handleAddFollower}
                          className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-purple-100 rounded-2xl text-purple-600 font-bold hover:bg-purple-50 hover:border-purple-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-5 h-5" />
                          Tambah Pengikut {(formData.followers?.length || 0) > 0 ? `(${formData.followers?.length}/3)` : ''}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Section: Other Notes */}
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Keterangan Lain-lain</label>
                    <textarea
                      value={formData.otherNotes || ''}
                      onChange={(e) => setFormData({ ...formData, otherNotes: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                      placeholder="Keterangan tambahan jika ada..."
                    />
                  </div>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-white border-t border-gray-100 flex gap-4 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                Batal
              </button>
              <button
                type="submit"
                form="sppd-form"
                disabled={isLoading || isFetching}
                className="flex-[2] px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Simpan SPPD
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

