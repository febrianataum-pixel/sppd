import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Download,
  Eye,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  MapPin,
  User,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Image as ImageIcon,
  FolderTree
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  deleteDoc, 
  doc,
  query,
  orderBy,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SPPD, Employee, SubActivity, OperationType, AppSettings } from '../types';
import { handleFirestoreError } from '../lib/error-handler';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';
import { SPPDForm } from './SPPDForm';
import { SPPDCompletionForm } from './SPPDCompletionForm';

export const SPPDList: React.FC = () => {
  const [sppdList, setSppdList] = useState<SPPD[]>([]);
  const [employees, setEmployees] = useState<Record<string, Employee>>({});
  const [activities, setActivities] = useState<Record<string, SubActivity>>({});
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [isCompletionModalOpen, setCompletionModalOpen] = useState(false);
  const [selectedSppdId, setSelectedSppdId] = useState<string | null>(null);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [sppdToDownload, setSppdToDownload] = useState<SPPD | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewFilename, setPreviewFilename] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({
    key: 'createdAt',
    direction: 'desc'
  });

  useEffect(() => {
    const unsubSPPD = onSnapshot(query(collection(db, 'sppd'), orderBy('createdAt', 'desc')), (snapshot) => {
      setSppdList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SPPD)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'sppd'));

    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => {
      const empMap: Record<string, Employee> = {};
      snapshot.docs.forEach(doc => { empMap[doc.id] = { id: doc.id, ...doc.data() } as Employee; });
      setEmployees(empMap);
    });

    const unsubActivities = onSnapshot(collection(db, 'sub_activities'), (snapshot) => {
      const actMap: Record<string, SubActivity> = {};
      snapshot.docs.forEach(doc => { actMap[doc.id] = { id: doc.id, ...doc.data() } as SubActivity; });
      setActivities(actMap);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'general'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as AppSettings);
      }
    });

    return () => {
      unsubSPPD();
      unsubEmployees();
      unsubActivities();
      unsubSettings();
    };
  }, []);

  const handleAdd = () => {
    setSelectedSppdId(null);
    setModalOpen(true);
  };

  const handleEdit = (id: string) => {
    setSelectedSppdId(id);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Hapus data SPPD ini?')) {
      try {
        await deleteDoc(doc(db, 'sppd', id));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const renderSPDContent = (doc: jsPDF, sppd: SPPD) => {
    const employee = employees[sppd.employeeId];
    const ppk = employees[sppd.ppkId];
    const activity = activities[sppd.subActivityId];

    // Set default font color to black
    doc.setTextColor(0, 0, 0);

    // Header (KOP)
    if (settings?.logo) {
      try {
        doc.addImage(settings.logo, 'PNG', 20, 10, 25, 25);
      } catch (e) {
        console.error("Error adding logo to PDF:", e);
      }
    }

    doc.setFontSize(10);
    doc.text('PEMERINTAH KABUPATEN BLORA', 115, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DINAS SOSIAL PEMBERDAYAAN PEREMPUAN', 115, 21, { align: 'center' });
    doc.text('DAN PERLINDUNGAN ANAK', 115, 27, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Jl. Pemuda No. 16 A Blora 58215, No. Tlp: (0296) 5298541', 115, 32, { align: 'center' });
    doc.text('Website : dinsos.blorakab.go.id / E-mail : dinsosp3a.bla.com', 115, 36, { align: 'center' });
    doc.line(20, 38, 190, 38);

    // Body font size
    const bodyFontSize = 10;
    doc.setFontSize(bodyFontSize);
    doc.setFont('helvetica', 'normal');

    // Extract number and year from sppd.number (Format: 000.1.2.3 / [nomor] / {tahun})
    let displayNum = sppd.number || '....................';
    const match = displayNum.match(/000\.1\.2\.3 \/ (.*) \/ (\d{4})/);
    if (match) {
      displayNum = `${match[1]} / ${match[2]}`;
    }

    doc.text('Kode No : 000.1.2.3', 140, 45);
    doc.text(`Nomor : ${displayNum}`, 140, 50);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('SURAT PERJALANAN DINAS (SPD)', 105, 60, { align: 'center' });
    doc.line(75, 61, 135, 61);

    doc.setFontSize(bodyFontSize);
    doc.setFont('helvetica', 'normal');

    const data = [
      ['1.', 'Pejabat Pembuat Komitmen', ppk?.name || '-'],
      ['2.', 'Pegawai yang melaksanakan perjalanan dinas', ''],
      ['', 'a. Nama', employee?.name || '-'],
      ['', 'b. NIP', employee?.nip || '-'],
      ['', 'c. Pangkat/ Golongan', `${employee?.pangkat || '-'} / ${employee?.golongan || '-'}`],
      ['', 'd. Jabatan', employee?.jabatan || '-'],
      ['', 'e. Tingkat biaya Perjalanan Dinas', sppd.tingkatBiaya ? `Tingkat ${sppd.tingkatBiaya}` : '-'],
      ['3.', 'Maksud Perjalanan Dinas', sppd.purpose],
      ['4.', 'Alat Angkutan yang dipergunakan', sppd.transport],
      ['5.', 'a. Tempat Berangkat', sppd.departureLocation],
      ['', 'b. Tempat Tujuan', sppd.destination],
      ['6.', 'a. Lama Perjalanan Dinas', `${sppd.duration} Hari`],
      ['', 'b. Tanggal berangkat', format(new Date(sppd.departureDate), 'dd MMMM yyyy', { locale: id })],
      ['', 'c. Tanggal Harus kembali', format(new Date(sppd.returnDate), 'dd MMMM yyyy', { locale: id })],
      ['7.', 'PENGIKUT :', ''],
    ];

    autoTable(doc, {
      startY: 65,
      body: data,
      theme: 'grid',
      styles: { fontSize: bodyFontSize, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 70 },
        2: { cellWidth: 110 },
      },
      didParseCell: (data) => {
        // Bold PPK name (row 0, col 2) and Employee name (row 2, col 2)
        if ((data.row.index === 0 && data.column.index === 2) || 
            (data.row.index === 2 && data.column.index === 2)) {
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    let currentY = (doc as any).lastAutoTable.finalY;

    // Followers Table
    if (sppd.followers && sppd.followers.length > 0) {
      const followerRows = sppd.followers.map((f, i) => [
        '', i + 1, f.name, f.nip, f.gol, f.tingkat ? `Tingkat ${f.tingkat}` : '-', i + 1, f.ket
      ]);
      autoTable(doc, {
        startY: currentY,
        head: [['', 'No', 'Nama', 'NIP', 'Gol', 'Tingkat Biaya Perjalanan Dinas', 'Tanda Tangan', 'Ket']],
        body: followerRows,
        theme: 'grid',
        styles: { fontSize: bodyFontSize - 1, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0], halign: 'center', valign: 'middle' },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1, halign: 'center' },
        columnStyles: {
          0: { cellWidth: 10 }, // Empty column to align "No" under "PENGIKUT :"
          1: { cellWidth: 10 },
          2: { cellWidth: 40, halign: 'left' },
          3: { cellWidth: 40 },
          4: { cellWidth: 15 },
          5: { cellWidth: 35 },
          6: { cellWidth: 20, halign: 'left' }, // Tanda tangan left aligned
          7: { cellWidth: 20, halign: 'left' },
        }
      });
      currentY = (doc as any).lastAutoTable.finalY;
    }

    const budgetData = [
      ['8.', 'Pembebanan Anggaran', ''],
      ['', '- Kegiatan', activity?.name || '-'],
      ['9.', 'Keterangan lain - lain', sppd.otherNotes || '-'],
    ];

    autoTable(doc, {
      startY: currentY,
      body: budgetData,
      theme: 'grid',
      styles: { fontSize: bodyFontSize, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 70 },
        2: { cellWidth: 110 }, // Aligned with main table
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 5;
    doc.setFontSize(bodyFontSize);
    doc.text('Dikeluarkan di : Blora', 130, finalY);
    doc.text(`Pada Tanggal : ${format(new Date(sppd.departureDate), 'dd MMMM yyyy', { locale: id })}`, 130, finalY + 5);

    doc.text('PELAKSANA PERJALANAN DINAS', 30, finalY + 12);
    doc.text('PEJABAT PEMBUAT KOMITMEN', 130, finalY + 12);

    doc.setFont('helvetica', 'bold');
    doc.text(employee?.name || '', 30, finalY + 32);
    doc.text(ppk?.name || '', 130, finalY + 32);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP : ${employee?.nip || ''}`, 30, finalY + 37);
    doc.text(`NIP : ${ppk?.nip || ''}`, 130, finalY + 37);
  };

  const generatePDF = (sppd: SPPD) => {
    const doc = new jsPDF();
    renderSPDContent(doc, sppd);
    doc.save(`SPPD_${(sppd.number || 'Draft').replace(/\//g, '_')}.pdf`);
  };

  const handleDownloadClick = (sppd: SPPD) => {
    setSppdToDownload(sppd);
    setDownloadModalOpen(true);
  };

  const renderSuratTugasContent = (doc: jsPDF, sppd: SPPD) => {
    const employee = employees[sppd.employeeId];
    const ppk = employees[sppd.ppkId];
    const kepalaDinas = (Object.values(employees) as Employee[]).find(e => e.jabatanSppd?.toUpperCase() === 'KEPALA DINAS');

    doc.setTextColor(0, 0, 0);
    const bodyFontSize = 10;

    // Header (KOP)
    if (settings?.logo) {
      try {
        doc.addImage(settings.logo, 'PNG', 20, 10, 25, 25);
      } catch (e) {
        console.error("Error adding logo to PDF:", e);
      }
    }

    doc.setFontSize(10);
    doc.text('PEMERINTAH KABUPATEN BLORA', 115, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DINAS SOSIAL PEMBERDAYAAN PEREMPUAN', 115, 21, { align: 'center' });
    doc.text('DAN PERLINDUNGAN ANAK', 115, 27, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Jl. Pemuda No. 16 A Telp / Fax (0296) 5298541 BLORA - 58215', 115, 32, { align: 'center' });
    doc.text('Website : dinsos.blorakab.go.id / E-mail : dinsosp3a.bla.com', 115, 36, { align: 'center' });
    doc.line(20, 38, 190, 38);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('SURAT PERINTAH TUGAS', 105, 50, { align: 'center' });
    doc.line(80, 51, 130, 51);

    doc.setFontSize(bodyFontSize);
    doc.setFont('helvetica', 'normal');

    let displayNum = sppd.number || '....................';
    const match = displayNum.match(/000\.1\.2\.3 \/ (.*) \/ (\d{4})/);
    if (match) {
      displayNum = `${match[1]} / ${match[2]}`;
    }
    doc.text(`Nomor : 000.1.2.3 / ${displayNum}`, 105, 56, { align: 'center' });

    // Dasar
    doc.text('Dasar', 20, 70);
    doc.text(':', 45, 70);
    
    const legalBasis = (settings?.legalBasis && settings.legalBasis.length > 0) 
      ? settings.legalBasis 
      : [
          'Peraturan Daerah Kabupaten Blora Nomor 11 tahun 2024, tentang Anggaran Pendapatan dan Belanja Daerah Kabupaten Blora Tahun 2025;',
          'Peraturan Bupati Blora Nomor 42 Tahun 2024 tentang Anggaran Pendapatan dan Belanja Daerah Kab. Blora Tahun 2025;',
          'Dokumen Pelaksanaan Anggaran Satuan Kerja Perangkat Daerah (DPA SKPD) Nomor 900/4689/2024 Tahun Anggaran 2025;',
          'Kepentingan Dinas.'
        ];

    autoTable(doc, {
      startY: 66,
      margin: { left: 50 },
      body: legalBasis.map((basis, idx) => [`${idx + 1}.`, basis]),
      theme: 'plain',
      styles: { 
        fontSize: bodyFontSize, 
        cellPadding: { top: 0.5, bottom: 0.5, left: 0, right: 0 }, 
        textColor: [0, 0, 0],
        overflow: 'linebreak',
        halign: 'justify'
      },
      columnStyles: { 
        0: { cellWidth: 5, halign: 'left' }, 
        1: { cellWidth: 135 } 
      }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 5;
    
    doc.setFont('helvetica', 'bold');
    doc.text('MENUGASKAN', 105, currentY, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.text('Kepada', 20, currentY + 10);
    doc.text(':', 45, currentY + 10);
    
    // List of employees (Main + Followers)
    const allEmployees = [
      { 
        name: employee?.name || '-', 
        nip: employee?.nip || '-', 
        pangkat: employee?.pangkat || '-', 
        gol: employee?.golongan || '-', 
        jabatan: employee?.jabatan || '-' 
      },
      ...(sppd.followers || []).map(f => {
        // Try to find the employee by NIP to get the pangkat
        const empFromList = (Object.values(employees) as Employee[]).find(e => e.nip === f.nip);
        return {
          name: f.name,
          nip: f.nip,
          pangkat: empFromList?.pangkat || '-',
          gol: f.gol,
          jabatan: f.ket // In SPD, ket is used for jabatan
        };
      })
    ];

    currentY += 10;
    allEmployees.forEach((emp, idx) => {
      const startX = 50;
      doc.text(`${idx + 1}. Nama`, startX, currentY);
      doc.text(':', startX + 25, currentY);
      doc.setFont('helvetica', 'bold');
      doc.text(emp.name, startX + 30, currentY);
      doc.setFont('helvetica', 'normal');
      
      currentY += 5;
      doc.text('Pangkat/Gol', startX, currentY);
      doc.text(':', startX + 25, currentY);
      doc.text(`${emp.pangkat} / ${emp.gol}`, startX + 30, currentY);
      
      currentY += 5;
      doc.text('NIP', startX, currentY);
      doc.text(':', startX + 25, currentY);
      doc.text(emp.nip, startX + 30, currentY);
      
      currentY += 5;
      doc.text('Jabatan', startX, currentY);
      doc.text(':', startX + 25, currentY);
      doc.text(emp.jabatan, startX + 30, currentY);
      
      currentY += 7;
    });

    // Untuk
    const untukY = currentY + 5;
    doc.text('Untuk', 20, untukY);
    doc.text(':', 45, untukY);
    
    const dateRange = sppd.duration > 1 
      ? `${format(new Date(sppd.departureDate), 'dd MMMM yyyy', { locale: id })} s/d ${format(new Date(sppd.returnDate), 'dd MMMM yyyy', { locale: id })}`
      : format(new Date(sppd.departureDate), 'dd MMMM yyyy', { locale: id });

    // Point 1 is special with sub-rows
    doc.text('1.', 50, untukY);
    doc.text('Maksud Perjalanan', 55, untukY);
    doc.text(':', 90, untukY);
    const purposeLines = doc.splitTextToSize(sppd.purpose, 100);
    doc.text(purposeLines, 95, untukY);
    
    let nextY = untukY + (purposeLines.length * 5);
    doc.text('Tempat', 55, nextY);
    doc.text(':', 90, nextY);
    doc.text(sppd.destination, 95, nextY);
    
    nextY += 5;
    doc.text('Hari/Tanggal', 55, nextY);
    doc.text(':', 90, nextY);
    doc.text(dateRange, 95, nextY);
    
    nextY += 7;

    // Points 2-5 using autoTable for justification
    const otherPoints = [
      ['2.', 'Melaporkan hasil pelaksanaan tugas kepada pemberi tugas;'],
      ['3.', 'Perintah itu dilaksanakan dengan penuh tanggung jawab;'],
      ['4.', 'Biaya perjalanan dinas diberikan sesuai ketentuan yang berlaku;'],
      ['5.', 'Apabila terdapat kekeliruan dalam Surat Perintah Tugas ini akan diadakan perbaikan sebagaimana mestinya.']
    ];

    autoTable(doc, {
      startY: nextY - 4,
      margin: { left: 50 },
      body: otherPoints,
      theme: 'plain',
      styles: { 
        fontSize: bodyFontSize, 
        cellPadding: { top: 0.5, bottom: 0.5, left: 0, right: 0 }, 
        textColor: [0, 0, 0],
        overflow: 'linebreak',
        halign: 'justify'
      },
      columnStyles: { 
        0: { cellWidth: 5, halign: 'left' }, 
        1: { cellWidth: 140 } 
      }
    });

    nextY = (doc as any).lastAutoTable.finalY;

    // Footer
    let footerY = Math.max(nextY + 15, 220);
    if (footerY > 240) { // Add new page if too long
      doc.addPage();
      footerY = 30;
    }

    doc.text('Ditetapkan di', 120, footerY);
    doc.text(':', 145, footerY);
    doc.text('Blora', 150, footerY);
    
    doc.text('Pada Tanggal', 120, footerY + 5);
    doc.text(':', 145, footerY + 5);
    doc.text(format(new Date(sppd.createdAt), 'dd MMMM yyyy', { locale: id }), 150, footerY + 5);
    
    doc.line(120, footerY + 7, 190, footerY + 7);
    
    doc.setFont('helvetica', 'normal'); // Changed from bold to normal as per request
    const deptNameLines = doc.splitTextToSize('KEPALA DINAS SOSIAL PEMBERDAYAAN PEREMPUAN DAN PERLINDUNGAN ANAK KABUPATEN BLORA', 70);
    doc.text(deptNameLines, 155, footerY + 12, { align: 'center' });

    // Signed by Kepala Dinas
    const signer = kepalaDinas || ppk;
    doc.setFont('helvetica', 'bold'); // Name should be bold as per standard format
    doc.text(signer?.name || '', 155, footerY + 45, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(signer?.pangkat || '', 155, footerY + 50, { align: 'center' });
    doc.text(`NIP : ${signer?.nip || ''}`, 155, footerY + 55, { align: 'center' });
  };

  const generateSuratTugas = (sppd: SPPD) => {
    const doc = new jsPDF();
    renderSuratTugasContent(doc, sppd);
    doc.save(`Surat_Tugas_${(sppd.number || 'Draft').replace(/\//g, '_')}.pdf`);
  };

  const renderLaporanHasilContent = (doc: jsPDF, sppd: SPPD) => {
    const employee = employees[sppd.employeeId];

    doc.setTextColor(0, 0, 0);
    const bodyFontSize = 10;

    // Header (KOP)
    if (settings?.logo) {
      try {
        doc.addImage(settings.logo, 'PNG', 20, 10, 25, 25);
      } catch (e) {
        console.error("Error adding logo to PDF:", e);
      }
    }

    doc.setFontSize(10);
    doc.text('PEMERINTAH KABUPATEN BLORA', 115, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DINAS SOSIAL PEMBERDAYAAN PEREMPUAN', 115, 21, { align: 'center' });
    doc.text('DAN PERLINDUNGAN ANAK', 115, 27, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Jl. Pemuda No. 16 A Blora 58215, No. Tlp: (0296) 5298541', 115, 32, { align: 'center' });
    doc.text('Website : dinsos.blorakab.go.id / E-mail : dinsosp3a.bla.com', 115, 36, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(20, 38, 190, 38);
    doc.setLineWidth(0.2);
    doc.line(20, 39, 190, 39);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN HASIL PERJALANAN', 105, 50, { align: 'center' });
    doc.line(75, 51, 135, 51);

    doc.setFontSize(bodyFontSize);
    doc.setFont('helvetica', 'normal');

    // Section 1: UMUM
    doc.setFont('helvetica', 'bold');
    doc.text('1. UMUM', 20, 65);
    doc.setFont('helvetica', 'normal');
    
    doc.text('Maksud dan tujuan perjalanan Dinas', 25, 72);
    doc.text(':', 95, 72);
    const purposeLines = doc.splitTextToSize(sppd.purpose, 85);
    doc.text(purposeLines, 100, 72);
    
    let currentY = 72 + (purposeLines.length * 5);
    
    doc.text('Tanggal dan Nomor Surat Perintah Tugas', 25, currentY);
    doc.text(':', 95, currentY);
    doc.text(`${format(new Date(sppd.departureDate), 'dd MMMM yyyy', { locale: id })}`, 100, currentY);
    doc.text(`Nomor : ${sppd.number || '-'}`, 100, currentY + 5);
    
    currentY += 15;
    doc.text('Tempat Tujuan', 25, currentY);
    doc.text(':', 95, currentY);
    doc.text(sppd.destination, 100, currentY);

    // Section 2: HASIL YANG DIPEROLEH
    currentY += 15;
    doc.setFont('helvetica', 'bold');
    doc.text('2. HASIL YANG DIPEROLEH', 20, currentY);
    doc.setFont('helvetica', 'normal');
    
    currentY += 7;
    if (Array.isArray(sppd.reportResults) && sppd.reportResults.length > 0) {
      sppd.reportResults.forEach((res) => {
        const resLines = doc.splitTextToSize(res, 160);
        doc.text('•', 25, currentY);
        doc.text(resLines, 30, currentY);
        currentY += (resLines.length * 5) + 2;
        
        if (currentY > 260) {
          doc.addPage();
          currentY = 20;
        }
      });
    } else {
      doc.text('• Telah dilaksanakan koordinasi/kegiatan sesuai dengan maksud perjalanan dinas tersebut di atas.', 25, currentY);
      currentY += 7;
    }

    // Section 3: LAIN-LAIN
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }
    
    currentY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('3. LAIN-LAIN', 20, currentY);
    doc.setFont('helvetica', 'normal');
    
    currentY += 7;
    doc.text('• Dokumentasi kegiatan terlampir,', 25, currentY);
    if (sppd.fuelType) {
      currentY += 6;
      doc.text(`• BBM yang digunakan: ${sppd.fuelType} (Rp. ${sppd.fuelAmount?.toLocaleString('id-ID') || '0'})`, 25, currentY);
    }
    currentY += 6;
    doc.text('• Selama kegiatan berlangsung lancar.', 25, currentY);
    currentY += 6;
    doc.text('• Demikian untuk menjadi periksa dan mohon petunjuk.', 25, currentY);

    // Footer
    currentY += 15;
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }
    
    const footerX = 115;
    doc.text(`Blora, ${format(new Date(sppd.returnDate), 'dd MMMM yyyy', { locale: id })}`, footerX, currentY);
    doc.text('Yang menjalankan tugas :', footerX, currentY + 6);
    
    currentY += 15;
    // Main Employee
    doc.text(`1.`, footerX, currentY);
    doc.text(employee?.name || '', footerX + 10, currentY);
    doc.line(170, currentY, 190, currentY); // Signature line placeholder
    
    // Followers
    if (sppd.followers && sppd.followers.length > 0) {
      sppd.followers.forEach((f, idx) => {
        currentY += 10;
        if (currentY > 280) {
          doc.addPage();
          currentY = 20;
        }
        doc.text(`${idx + 2}.`, footerX, currentY);
        doc.text(f.name, footerX + 10, currentY);
        doc.line(170, currentY, 190, currentY);
      });
    }
  };

  const generateLaporanHasil = (sppd: SPPD) => {
    const doc = new jsPDF();
    renderLaporanHasilContent(doc, sppd);
    doc.save(`Laporan_Hasil_${(sppd.number || 'Draft').replace(/\//g, '_')}.pdf`);
  };

  const renderDokumentasiContent = (doc: jsPDF, sppd: SPPD) => {
    const bodyFontSize = 10;

    // Header (Centered according to user request)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DOKUMENTASI', 105, 30, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const purposeLines = doc.splitTextToSize(sppd.purpose, 160);
    doc.text(purposeLines, 105, 38, { align: 'center' });
    
    let currentY = 38 + (purposeLines.length * 5);
    doc.text(sppd.destination, 105, currentY, { align: 'center' });
    currentY += 6;
    doc.text(format(new Date(sppd.departureDate), 'dd MMMM yyyy', { locale: id }), 105, currentY, { align: 'center' });

    currentY += 15; // Space before photos

    if (!sppd.documentation || sppd.documentation.length === 0) {
      doc.setFontSize(bodyFontSize);
      doc.text('Tidak ada dokumentasi foto.', 105, currentY, { align: 'center' });
    } else {
      const photos = sppd.documentation;
      const count = photos.length;
      
      // Determine grid layout based on count
      let cols = 1;
      let imgWidth = 120;
      let imgHeight = 80;
      let marginX = (210 - imgWidth) / 2;
      
      if (count > 1) {
        cols = 2;
        imgWidth = 85;
        imgHeight = 60;
        marginX = 15;
      }
      
      if (count > 4) {
        cols = 3;
        imgWidth = 60;
        imgHeight = 45;
        marginX = 10;
      }

      photos.forEach((img, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        
        const x = marginX + (col * (imgWidth + 5));
        const y = currentY + (row * (imgHeight + 5));

        // Check for page overflow
        if (y + imgHeight > 280) {
          // In "Dokumentasi", user explicitly asked to fit on "one page", 
          // but if too many, we might need to break or stop.
          // For now, let's keep it responsive but if it's really too many, 
          // we'll handle gracefully with a line indicating more.
          if (index === (cols * 3)) { // Max 9 photos (3x3) usually fits well? 
            // Optional: doc.addPage(); and reset currentY
          }
        }
        
        try {
          doc.addImage(img, 'JPEG', x, y, imgWidth, imgHeight);
        } catch (e) {
          console.error('Error adding image to PDF', e);
          doc.setFontSize(8);
          doc.text(`[Gagal memuat gambar ${index + 1}]`, x + 5, y + 10);
        }
      });
    }
  };

  const generateDokumentasi = (sppd: SPPD) => {
    const doc = new jsPDF();
    renderDokumentasiContent(doc, sppd);
    doc.save(`Dokumentasi_${(sppd.number || 'Draft').replace(/\//g, '_')}.pdf`);
  };

  const terbilang = (n: number): string => {
    const units = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
    let res = "";
    if (n < 12) res = units[n];
    else if (n < 20) res = terbilang(n - 10) + " belas";
    else if (n < 100) res = terbilang(Math.floor(n / 10)) + " puluh " + terbilang(n % 10);
    else if (n < 200) res = "seratus " + terbilang(n - 100);
    else if (n < 1000) res = terbilang(Math.floor(n / 100)) + " ratus " + terbilang(n % 100);
    else if (n < 2000) res = "seribu " + terbilang(n - 1000);
    else if (n < 1000000) res = terbilang(Math.floor(n / 1000)) + " ribu " + terbilang(n % 1000);
    else if (n < 1000000000) res = terbilang(Math.floor(n / 1000000)) + " juta " + terbilang(n % 1000000);
    return res.trim().replace(/\s+/g, ' ');
  };

  const renderRincianBiayaContent = (doc: jsPDF, sppd: SPPD) => {
    const employee = employees[sppd.employeeId];
    const ppk = employees[sppd.ppkId];
    
    // Find Bendahara from employees list based on jabatanSppd
    const employeeList = Object.values(employees) as Employee[];
    const bendaharaEmployee = employeeList.find(emp => 
      emp.jabatanSppd === `Bendahara Pengeluaran Pembantu ${sppd.bidang}`
    ) || employeeList.find(emp => emp.jabatanSppd === 'Bendahara Pengeluaran');
    
    const bendaharaSettings = settings?.bendaharaPembantu?.[sppd.bidang];
    const bendaharaName = bendaharaEmployee?.name || bendaharaSettings?.name || '';
    const bendaharaNip = bendaharaEmployee?.nip || bendaharaSettings?.nip || '';
    
    // Clean up title to avoid double "Bendahara Pengeluaran"
    const rawTitle = bendaharaSettings?.title || bendaharaEmployee?.jabatanSppd || `PEMBANTU ${sppd.bidang.toUpperCase()}`;
    const bendaharaTitle = rawTitle.replace(/^Bendahara Pengeluaran\s+/i, '');

    doc.setTextColor(0, 0, 0);
    const bodyFontSize = 10;

    // Title
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RINCIAN BIAYA PERJALANAN DINAS', 105, 20, { align: 'center' });
    
    doc.setFontSize(bodyFontSize);
    doc.setFont('helvetica', 'normal');

    let displayNum = sppd.number || '-';
    const match = displayNum.match(/000\.1\.2\.3 \/ (.*) \/ (\d{4})/);
    if (match) {
      displayNum = `${match[1]} / ${match[2]}`;
    }

    doc.text('Lampiran SPD Nomor', 20, 30);
    doc.text(':', 60, 30);
    doc.setFont('helvetica', 'bold');
    doc.text(`000.1.2.3 / ${displayNum}`, 65, 30);
    doc.setFont('helvetica', 'normal');

    doc.text('Tanggal', 20, 35);
    doc.text(':', 60, 35);
    doc.text(format(new Date(sppd.departureDate), 'dd MMMM yyyy', { locale: id }), 65, 35);

    // Table Data
    const travelCost = settings?.travelCosts.find(c => 
      c.tingkat === sppd.tingkatBiaya && c.type === (sppd.travelType || 'Dalam Daerah')
    );
    const dailyAllowance = travelCost?.amount || 430000;
    
    const tableBody = [];
    
    // Main Employee
    tableBody.push([
      '1',
      employee?.name || '',
      'Rp. ' + dailyAllowance.toLocaleString('id-ID'),
      sppd.duration + ' Hari',
      'Rp. ' + (dailyAllowance * sppd.duration).toLocaleString('id-ID'),
      sppd.tingkatBiaya,
      '1.'
    ]);

    // Followers
    sppd.followers?.forEach((f, idx) => {
      const fTravelCost = settings?.travelCosts.find(c => 
        c.tingkat === f.tingkat && c.type === (sppd.travelType || 'Dalam Daerah')
      );
      const fDailyAllowance = fTravelCost?.amount || 430000;
      tableBody.push([
        (idx + 2).toString(),
        f.name,
        'Rp. ' + fDailyAllowance.toLocaleString('id-ID'),
        sppd.duration + ' Hari',
        'Rp. ' + (fDailyAllowance * sppd.duration).toLocaleString('id-ID'),
        f.tingkat,
        (idx + 2).toString() + '.'
      ]);
    });

    const totalAmount = tableBody.reduce((sum, row) => {
      const val = parseInt(row[4].replace(/[^0-9]/g, ''));
      return sum + val;
    }, 0);

    autoTable(doc, {
      startY: 45,
      head: [['NO', 'PERINCIAN BIAYA', 'NOMINAL', 'HARI', 'JUMLAH DITERIMA', 'KET', 'TTD']],
      body: [
        ...tableBody,
        [
          { content: 'JUMLAH', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold' } },
          { content: 'Rp. ' + totalAmount.toLocaleString('id-ID'), styles: { fontStyle: 'bold' } },
          '',
          ''
        ]
      ],
      theme: 'grid',
      styles: { fontSize: 9, textColor: [0, 0, 0], cellPadding: 2, lineWidth: 0.2, lineColor: [0, 0, 0] },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.2, halign: 'center', fontStyle: 'bold', lineColor: [0, 0, 0] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        2: { halign: 'right' },
        3: { halign: 'center' },
        4: { halign: 'right' },
        5: { halign: 'center' },
        6: { cellWidth: 20 }
      }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 5;
    doc.setFont('helvetica', 'bolditalic');
    doc.text(`[ ${terbilang(totalAmount)} rupiah ]`, 20, currentY);
    doc.setFont('helvetica', 'normal');

    currentY += 15;
    doc.text(`Blora, ${format(new Date(sppd.departureDate), 'dd MMMM yyyy', { locale: id })}`, 140, currentY);

    currentY += 15;
    doc.setFont('helvetica', 'bold');
    doc.text('PERHITUNGAN SPD RAMPUNG', 105, currentY, { align: 'center' });
    doc.setFont('helvetica', 'normal');

    currentY += 10;
    doc.text('ditetapkan Sejumlah', 20, currentY);
    doc.text('Rp. ' + totalAmount.toLocaleString('id-ID'), 120, currentY);
    
    currentY += 5;
    doc.text('yang telah dibayar semula', 20, currentY);
    doc.text('Rp. ' + totalAmount.toLocaleString('id-ID'), 120, currentY);
    
    currentY += 5;
    doc.text('sisa kurang / lebih', 20, currentY);
    doc.text('Rp', 120, currentY);
    doc.text('-', 140, currentY);

    currentY += 20;
    doc.setFont('helvetica', 'bold');
    doc.text('PEJABAT PEMBUAT KOMITMEN', 20, currentY);
    doc.text('BENDAHARA PENGELUARAN', 120, currentY);
    currentY += 5;
    doc.text(bendaharaTitle.toUpperCase(), 120, currentY);

    currentY += 25;
    doc.text(ppk?.name || '', 20, currentY);
    doc.text(bendaharaName, 120, currentY);
    
    currentY += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${ppk?.nip || ''}`, 20, currentY);
    doc.text(`NIP. ${bendaharaNip}`, 120, currentY);
  };

  const generateRincianBiaya = (sppd: SPPD) => {
    const doc = new jsPDF();
    renderRincianBiayaContent(doc, sppd);
    doc.save(`Rincian_Biaya_${(sppd.number || 'Draft').replace(/\//g, '_')}.pdf`);
  };

  const renderKwitansiContent = (doc: jsPDF, sppd: SPPD) => {
    const employee = employees[sppd.employeeId];
    const ppk = employees[sppd.ppkId];
    const subActivity = activities[sppd.subActivityId];

    const fuelPriceObj = settings?.fuelPrices.find(f => f.type === sppd.fuelType);
    const pricePerLiter = fuelPriceObj?.price || 10000;
    const fuelAmount = sppd.fuelAmount || 0;
    const quantity = fuelAmount > 0 ? (fuelAmount / pricePerLiter).toFixed(2) : '0';

    doc.setTextColor(0, 0, 0);
    
    // Calculate total amount
    const travelCost = settings?.travelCosts.find(c => 
      c.tingkat === sppd.tingkatBiaya && c.type === (sppd.travelType || 'Dalam Daerah')
    );
    const dailyAllowance = travelCost?.amount || 430000;
    const transportCost = 150000;
    const totalAmount = (dailyAllowance * sppd.duration) + transportCost;

    // Bottom Section: KWITANSI
    let currentY = 20;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('K W I T A N S I', 105, currentY, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    currentY += 10;
    doc.text('Nomor', 20, currentY);
    doc.text(`: ${sppd.number || '-'}`, 50, currentY);

    currentY += 7;
    const bendaharaText = sppd.bidang 
      ? `BENDAHARA PENGELUARAN PEMBANTU ${sppd.bidang.toUpperCase()}`
      : 'BENDAHARA PENGELUARAN';
    doc.text('Telah terima dari', 20, currentY);
    doc.text(`: ${bendaharaText} DINSOS PPPA KAB. BLORA`, 50, currentY);

    currentY += 10;
    doc.text('Uang sejumlah', 20, currentY);
    doc.text(':', 50, currentY);
    doc.setFont('helvetica', 'bolditalic');
    
    // Draw hatching box for amount in words
    const boxX = 55;
    const boxY = currentY - 5;
    const boxW = 140;
    const boxH = 8;
    doc.rect(boxX, boxY, boxW, boxH);
    // Simple hatching simulation
    for (let i = 0; i < boxW; i += 2) {
      doc.line(boxX + i, boxY, boxX + i + 2, boxY + boxH);
    }
    
    doc.setFillColor(255, 255, 255);
    const textWidth = doc.getTextWidth(`[ ${terbilang(totalAmount).toUpperCase()} RUPIAH ]`) + 10;
    doc.rect(boxX + (boxW - textWidth) / 2, boxY + 1, textWidth, boxH - 2, 'F');
    doc.text(`[ ${terbilang(totalAmount).toUpperCase()} RUPIAH ]`, 125, currentY, { align: 'center' });
    doc.setFont('helvetica', 'normal');

    currentY += 10;
    doc.text('Untuk pembayaran', 20, currentY);
    doc.text(`: Biaya Perjalanan Dinas pada tgl ${format(new Date(sppd.departureDate), 'dd MMMM yyyy', { locale: id })} ke ${sppd.destination}`, 50, currentY);
    
    currentY += 7;
    const purposeLines = doc.splitTextToSize(sppd.purpose, 140);
    doc.text(purposeLines, 50, currentY);
    currentY += (purposeLines.length * 5);
    
    doc.text(`Pada ${subActivity?.name || '-'}`, 50, currentY);

    currentY += 15;
    doc.text('Mengetahui/Menyetujui', 50, currentY, { align: 'center' });
    doc.text(`Blora, ${format(new Date(sppd.departureDate), 'dd MMMM yyyy', { locale: id })}`, 160, currentY, { align: 'center' });
    doc.text('PPKom', 50, currentY + 5, { align: 'center' });
    doc.text('Yang Menerima', 160, currentY + 5, { align: 'center' });

    currentY += 25;
    doc.setFont('helvetica', 'bold');
    doc.text(ppk?.name || '', 50, currentY, { align: 'center' });
    doc.text(employee?.name || '', 160, currentY, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${ppk?.nip || ''}`, 50, currentY + 5, { align: 'center' });
    doc.text(`NIP. ${employee?.nip || ''}`, 160, currentY + 5, { align: 'center' });

    currentY += 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    
    // Rp box with hatching
    doc.rect(20, currentY - 8, 60, 12);
    for (let i = 0; i < 10; i += 2) {
      doc.line(20 + i, currentY - 8, 20 + i + 2, currentY + 4);
    }
    doc.text(`Rp. ${totalAmount.toLocaleString('id-ID')} ,-`, 35, currentY);
  };

  const generateKwitansi = (sppd: SPPD) => {
    const doc = new jsPDF();
    renderKwitansiContent(doc, sppd);
    if (sppd.fuelAmount && sppd.fuelAmount > 0) {
      doc.addPage();
      renderKwitansiBBMContent(doc, sppd);
    }
    doc.save(`Kwitansi_${(sppd.number || 'Draft').replace(/\//g, '_')}.pdf`);
  };

  const renderKwitansiBBMContent = (doc: jsPDF, sppd: SPPD) => {
    const employee = employees[sppd.employeeId];
    const ppk = employees[sppd.ppkId];
    const subActivity = activities[sppd.subActivityId];
    
    const fuelPriceObj = settings?.fuelPrices.find(f => f.type === sppd.fuelType);
    const pricePerLiter = fuelPriceObj?.price || 10000;
    const fuelAmount = sppd.fuelAmount || 0;
    const quantity = fuelAmount > 0 ? (fuelAmount / pricePerLiter).toFixed(2) : '0';

    doc.setTextColor(0, 0, 0);
    
    // Top Section: PENGESAHAN KUITANSI
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('PENGESAHAN KUITANSI ATAU BUKTI PEMBELIAN/PEMBAYARAN', 105, 15, { align: 'center' });
    doc.line(15, 17, 195, 17);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('1. Berdasarkan bukti pembelian/kuitansi tersebut dibawah ini telah dilakukan:', 20, 25);
    const wrapText = doc.splitTextToSize('serah terima hasil pekerjaan 100% (seratus persen) dari pihak Penyedia barang/jasa kepada Pengguna Barang/Kuasa Pengguna Barang;', 170);
    doc.text(wrapText, 25, 30);
    doc.text('2. pemeriksaan administratif oleh pejabat pemeriksa hasil pekerjaan;', 20, 30 + (wrapText.length * 5));

    autoTable(doc, {
      startY: 35 + (wrapText.length * 5),
      head: [['NO', 'URAIAN PEKERJAAN', 'JUMLAH', 'SATUAN UKURAN', 'HARGA SATUAN', 'JUMLAH']],
      body: [
        ['1', 'Belanja Bahan-bahan Bakar dan Pelumas', '', '', '', ''],
        ['', `BBM ${sppd.fuelType || '-'}`, quantity, 'Lt', 'Rp. ' + pricePerLiter.toLocaleString('id-ID'), 'Rp. ' + fuelAmount.toLocaleString('id-ID')],
        ['', '', '', '', '', ''],
        [{ content: 'TOTAL', colSpan: 5, styles: { halign: 'center', fontStyle: 'bold' } }, { content: 'Rp. ' + fuelAmount.toLocaleString('id-ID'), styles: { fontStyle: 'bold' } }]
      ],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'right' },
        5: { halign: 'right' }
      }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'normal');
    doc.text('Pejabat Penandatangan Kontrak', 140, currentY);
    currentY += 20;
    doc.setFont('helvetica', 'bold');
    doc.text(ppk?.name || '', 140, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${ppk?.nip || ''}`, 140, currentY + 5);

    // Separator
    currentY += 15;
    doc.line(15, currentY, 195, currentY);

    // Bottom Section: KWITANSI
    currentY += 15;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('K W I T A N S I', 105, currentY, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    currentY += 10;
    doc.text('Nomor', 20, currentY);
    doc.text(`: ${sppd.number || '-'}`, 50, currentY);

    currentY += 7;
    const bendaharaText = sppd.bidang 
      ? `BENDAHARA PENGELUARAN PEMBANTU ${sppd.bidang.toUpperCase()}`
      : 'BENDAHARA PENGELUARAN';
    doc.text('Telah terima dari', 20, currentY);
    doc.text(`: ${bendaharaText} DINSOS PPPA KAB. BLORA`, 50, currentY);

    currentY += 10;
    doc.text('Uang sejumlah', 20, currentY);
    doc.text(':', 50, currentY);
    doc.setFont('helvetica', 'bolditalic');
    
    // Draw hatching box for amount in words
    const boxX = 55;
    const boxY = currentY - 5;
    const boxW = 140;
    const boxH = 8;
    doc.rect(boxX, boxY, boxW, boxH);
    // Simple hatching simulation
    for (let i = 0; i < boxW; i += 2) {
      doc.line(boxX + i, boxY, boxX + i + 2, boxY + boxH);
    }
    
    doc.setFillColor(255, 255, 255);
    const textWidth = doc.getTextWidth(`[ ${terbilang(fuelAmount).toUpperCase()} RUPIAH ]`) + 10;
    doc.rect(boxX + (boxW - textWidth) / 2, boxY + 1, textWidth, boxH - 2, 'F');
    doc.text(`[ ${terbilang(fuelAmount).toUpperCase()} RUPIAH ]`, 125, currentY, { align: 'center' });
    doc.setFont('helvetica', 'normal');

    currentY += 10;
    doc.text('Untuk pembayaran', 20, currentY);
    doc.text(`: Biaya belanja BBM pada tgl ${format(new Date(sppd.departureDate), 'dd MMMM yyyy', { locale: id })} ke ${sppd.destination}`, 50, currentY);
    
    currentY += 7;
    const purposeLines = doc.splitTextToSize(sppd.purpose, 140);
    doc.text(purposeLines, 50, currentY);
    currentY += (purposeLines.length * 5);
    
    doc.text(`Pada ${subActivity?.name || '-'}`, 50, currentY);

    currentY += 15;
    doc.text('Mengetahui/Menyetujui', 50, currentY, { align: 'center' });
    doc.text(`Blora, ${format(new Date(sppd.departureDate), 'dd MMMM yyyy', { locale: id })}`, 160, currentY, { align: 'center' });
    doc.text('PPKom', 50, currentY + 5, { align: 'center' });
    doc.text('Yang Menerima', 160, currentY + 5, { align: 'center' });

    currentY += 25;
    doc.setFont('helvetica', 'bold');
    doc.text(ppk?.name || '', 50, currentY, { align: 'center' });
    doc.text(employee?.name || '', 160, currentY, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${ppk?.nip || ''}`, 50, currentY + 5, { align: 'center' });
    doc.text(`NIP. ${employee?.nip || ''}`, 160, currentY + 5, { align: 'center' });

    currentY += 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    
    // Rp box with hatching
    doc.rect(20, currentY - 8, 60, 12);
    for (let i = 0; i < 10; i += 2) {
      doc.line(20 + i, currentY - 8, 20 + i + 2, currentY + 4);
    }
    doc.text(`Rp. ${fuelAmount.toLocaleString('id-ID')} ,-`, 35, currentY);
  };

  const handlePreview = (sppd: SPPD) => {
    const doc = new jsPDF();
    
    // SPD
    renderSPDContent(doc, sppd);
    
    // Surat Tugas
    doc.addPage();
    renderSuratTugasContent(doc, sppd);
    
    // Laporan Hasil
    if (sppd.status === 'completed') {
      doc.addPage();
      renderLaporanHasilContent(doc, sppd);
      
      // Dokumentasi
      doc.addPage();
      renderDokumentasiContent(doc, sppd);
    }
    
    // Rincian Biaya
    doc.addPage();
    renderRincianBiayaContent(doc, sppd);
    
    // Kwitansi
    doc.addPage();
    renderKwitansiContent(doc, sppd);
    if (sppd.fuelAmount && sppd.fuelAmount > 0) {
      doc.addPage();
      renderKwitansiBBMContent(doc, sppd);
    }

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    
    // Set custom filename with date and purpose
    const formattedDate = format(new Date(sppd.departureDate), 'yyyyMMdd');
    const safePurpose = sppd.purpose.substring(0, 30).replace(/[^a-z0-9]/gi, '_');
    const filename = `[${formattedDate}_${safePurpose}].pdf`;
    
    setPreviewFilename(filename);
    setPreviewUrl(url);
    setIsPreviewModalOpen(true);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedSPPD = [...sppdList]
    .filter(s => {
      const empName = employees[s.employeeId]?.name || '';
      return (s.number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
             s.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
             empName.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      if (!sortConfig) return 0;
      const { key, direction } = sortConfig;

      let valA: any = a[key as keyof SPPD];
      let valB: any = b[key as keyof SPPD];

      if (key === 'employeeName') {
        valA = employees[a.employeeId]?.name || '';
        valB = employees[b.employeeId]?.name || '';
      }

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig?.key !== column) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="w-3 h-3 ml-1 text-blue-600" /> : 
      <ChevronDown className="w-3 h-3 ml-1 text-blue-600" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data SPPD</h1>
          <p className="text-gray-500 text-sm">Kelola daftar Surat Perintah Perjalanan Dinas.</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-200 font-medium"
        >
          <Plus className="w-5 h-5" />
          Tambah SPPD
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nomor SPPD, tujuan, atau nama pegawai..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th 
                  className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('number')}
                >
                  <div className="flex items-center">Nomor SPPD <SortIcon column="number" /></div>
                </th>
                <th 
                  className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('employeeName')}
                >
                  <div className="flex items-center">Pegawai <SortIcon column="employeeName" /></div>
                </th>
                <th 
                  className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('destination')}
                >
                  <div className="flex items-center">Tujuan <SortIcon column="destination" /></div>
                </th>
                <th 
                  className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('bidang')}
                >
                  <div className="flex items-center">Bidang <SortIcon column="bidang" /></div>
                </th>
                <th 
                  className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('departureDate')}
                >
                  <div className="flex items-center">Waktu <SortIcon column="departureDate" /></div>
                </th>
                <th 
                  className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">Status <SortIcon column="status" /></div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedSPPD.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center">
                      <FileText className="w-12 h-12 text-gray-200 mb-3" />
                      <p>Tidak ada data SPPD ditemukan</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedSPPD.map((sppd) => (
                  <tr key={sppd.id} className="hover:bg-gray-50 transition-colors group">
                    <td className={cn(
                      "px-6 py-4 border-l-4",
                      sppd.travelType === 'Luar Daerah' ? "border-yellow-400" : "border-blue-500"
                    )}>
                      <p className="font-bold text-gray-900">{sppd.number || '-'}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Dibuat: {format(new Date(sppd.createdAt), 'dd MMM yyyy')}</p>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handlePreview(sppd)}
                        className="flex items-center gap-3 text-left hover:text-blue-600 transition-colors group/name"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0 group-hover/name:bg-blue-100 group-hover/name:text-blue-700">
                          {(employees[sppd.employeeId]?.name || '?').charAt(0)}
                        </div>
                        <p className="text-sm font-semibold text-gray-900 truncate max-w-[150px] group-hover/name:text-blue-600 underline decoration-blue-200/50 decoration-2 underline-offset-4">
                          {employees[sppd.employeeId]?.name || 'Loading...'}
                        </p>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate max-w-[150px]">{sppd.destination}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FolderTree className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate max-w-[150px]">{sppd.bidang || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{format(new Date(sppd.departureDate), 'dd MMM')} - {format(new Date(sppd.returnDate), 'dd MMM yyyy')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit",
                          sppd.status === 'active' ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"
                        )}>
                          {sppd.status === 'active' ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                          {sppd.status}
                        </div>
                        {sppd.status === 'active' && (
                          <p className="text-[9px] text-red-500 font-medium italic">Laporan & Dokumentasi belum selesai</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedSppdId(sppd.id!);
                            setCompletionModalOpen(true);
                          }}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            sppd.status === 'completed' ? "text-gray-400 hover:bg-gray-100" : "text-green-600 hover:bg-green-50"
                          )}
                          title="Selesaikan SPPD"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadClick(sppd)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Unduh Dokumen"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => sppd.id && handleEdit(sppd.id)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => sppd.id && handleDelete(sppd.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Hapus"
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

      <SPPDForm 
        isOpen={isModalOpen} 
        onClose={() => setModalOpen(false)} 
        sppdId={selectedSppdId} 
      />

      <SPPDCompletionForm
        isOpen={isCompletionModalOpen}
        onClose={() => setCompletionModalOpen(false)}
        sppdId={selectedSppdId}
      />

      {/* Download Options Modal */}
      <AnimatePresence>
        {downloadModalOpen && sppdToDownload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDownloadModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-gray-900">Dokumen SPPD</h3>
                </div>
                <button 
                  onClick={() => setDownloadModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400"
                >
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>
              
              <div className="p-6 space-y-3">
                <p className="text-sm text-gray-500 mb-4">Pilih jenis dokumen untuk SPPD nomor: <span className="font-bold text-gray-900">{sppdToDownload.number || '-'}</span></p>
                
                <button
                  onClick={() => { generatePDF(sppdToDownload); setDownloadModalOpen(false); }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="p-2 bg-gray-50 group-hover:bg-white rounded-lg text-gray-400 group-hover:text-blue-600 transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-sm">SPD (Surat Perjalanan Dinas)</p>
                    <p className="text-xs text-gray-500">Dokumen utama perjalanan dinas</p>
                  </div>
                </button>

                <button
                  onClick={() => { generateSuratTugas(sppdToDownload); setDownloadModalOpen(false); }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="p-2 bg-gray-50 group-hover:bg-white rounded-lg text-gray-400 group-hover:text-blue-600 transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-sm">Surat Tugas</p>
                    <p className="text-xs text-gray-500">Surat perintah penugasan pegawai</p>
                  </div>
                </button>

                <button
                  onClick={() => { generateLaporanHasil(sppdToDownload); setDownloadModalOpen(false); }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="p-2 bg-gray-50 group-hover:bg-white rounded-lg text-gray-400 group-hover:text-blue-600 transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-sm">Laporan Hasil</p>
                    <p className="text-xs text-gray-500">Laporan pelaksanaan perjalanan dinas</p>
                  </div>
                </button>

                <button
                  onClick={() => { generateDokumentasi(sppdToDownload); setDownloadModalOpen(false); }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="p-2 bg-gray-50 group-hover:bg-white rounded-lg text-gray-400 group-hover:text-blue-600 transition-colors">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-sm">Dokumentasi</p>
                    <p className="text-xs text-gray-500">Foto-foto dokumentasi kegiatan</p>
                  </div>
                </button>

                <button
                  onClick={() => { generateRincianBiaya(sppdToDownload); setDownloadModalOpen(false); }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="p-2 bg-gray-50 group-hover:bg-white rounded-lg text-gray-400 group-hover:text-blue-600 transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-sm">Rincian Biaya</p>
                    <p className="text-xs text-gray-500">Detail pengeluaran perjalanan dinas</p>
                  </div>
                </button>

                <button
                  onClick={() => { generateKwitansi(sppdToDownload); setDownloadModalOpen(false); }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="p-2 bg-gray-50 group-hover:bg-white rounded-lg text-gray-400 group-hover:text-blue-600 transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-sm">Kwitansi</p>
                    <p className="text-xs text-gray-500">Bukti pembayaran dan pengesahan kuitansi (termasuk BBM)</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PDF Preview Modal */}
      <AnimatePresence>
        {isPreviewModalOpen && previewUrl && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsPreviewModalOpen(false);
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Preview Dokumen SPPD</h3>
                    <p className="text-xs text-gray-500">Seluruh berkas dokumen dalam satu tampilan</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = previewUrl!;
                      link.download = previewFilename;
                      link.click();
                    }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all shadow-lg shadow-blue-200 text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Unduh Lengkap
                  </button>
                  <button
                    onClick={() => {
                      setIsPreviewModalOpen(false);
                      URL.revokeObjectURL(previewUrl);
                      setPreviewUrl(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500"
                  >
                    <MoreVertical className="rotate-45 w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 bg-gray-100 p-4 overflow-hidden">
                <iframe 
                  src={previewUrl} 
                  className="w-full h-full rounded-xl border border-gray-200 shadow-inner bg-white"
                  title="PDF Preview"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
