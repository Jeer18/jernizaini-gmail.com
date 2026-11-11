import React, { useState, useRef } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Settings,
  Layers,
  Save,
  MessageCircle,
  Database,
  RefreshCw,
  AlertCircle,
  Key,
  LogOut,
  Sparkles,
  Download,
  RotateCcw,
  FileSpreadsheet,
  Copy,
  Check,
  ExternalLink,
  BookOpen,
  ArrowUpRight,
  UploadCloud,
  Image as ImageIcon,
  Camera,
  Loader2,
} from 'lucide-react';
import { AppSettings, Booking, Facility } from '../types';
import {
  buildTeacherNotificationWhatsappUrl,
  syncWithGasBackend,
  syncAllToGoogleSheet,
  downloadCsvForGoogleSheets,
  uploadImageToGoogleDrive,
  GOOGLE_APPS_SCRIPT_CODE,
  formatDateToDDMMYY,
} from '../utils/bookingUtils';

interface AdminViewProps {
  settings: AppSettings;
  facilities: Facility[];
  bookings: Booking[];
  isAdminLoggedIn: boolean;
  onAdminLogin: (password: string) => boolean;
  onAdminLogout: () => void;
  onUpdateBookingStatus: (bookingId: string, status: 'LULUS' | 'DITOLAK', notes?: string) => void;
  onSaveFacility: (facility: Facility) => void;
  onDeleteFacility: (facilityId: string) => void;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onResetData: () => void;
  onRefreshData?: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  settings,
  facilities,
  bookings,
  isAdminLoggedIn,
  onAdminLogin,
  onAdminLogout,
  onUpdateBookingStatus,
  onSaveFacility,
  onDeleteFacility,
  onUpdateSettings,
  onResetData,
  onRefreshData,
}) => {
  // Login State
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Sub-tabs
  const [adminTab, setAdminTab] = useState<'approvals' | 'facilities' | 'sheets' | 'settings'>('approvals');
  const [approvalFilter, setApprovalFilter] = useState<'SEMUA' | 'MENUNGGU' | 'LULUS' | 'DITOLAK'>('MENUNGGU');

  // Facility Form Modal
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);

  // Reject Reason Modal State
  const [rejectModalBooking, setRejectModalBooking] = useState<Booking | null>(null);
  const [rejectReason, setRejectReason] = useState('Masa bertindih / fasiliti sedang diselenggara');

  // Auto WhatsApp Notification Notice State
  const [autoWhatsappNotice, setAutoWhatsappNotice] = useState<{
    applicantName: string;
    phoneNumber: string;
    status: 'LULUS' | 'DITOLAK';
    whatsappUrl: string;
  } | null>(null);

  // Google Sheets state
  const [isCopiedScript, setIsCopiedScript] = useState(false);
  const [isBatchSyncing, setIsBatchSyncing] = useState(false);
  const [batchSyncResult, setBatchSyncResult] = useState<string | null>(null);
  const [sheetPreviewTab, setSheetPreviewTab] = useState<'bookings' | 'facilities'>('bookings');

  // Settings form state
  const [formSchoolName, setFormSchoolName] = useState(settings.schoolName);
  const [formLogoUrl, setFormLogoUrl] = useState(settings.logoUrl || '');
  const [formAnnouncement, setFormAnnouncement] = useState(settings.announcement);
  const [formAdminWhatsapp, setFormAdminWhatsapp] = useState(settings.adminWhatsapp);
  const [formAdminPassword, setFormAdminPassword] = useState(settings.adminPassword);
  const [formGasUrl, setFormGasUrl] = useState(settings.gasWebAppUrl);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Logo Upload State
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadMessage, setLogoUploadMessage] = useState<string | null>(null);
  const [isCustomLogoUrlMode, setIsCustomLogoUrlMode] = useState(false);

  // Synchronize form when external settings prop changes
  React.useEffect(() => {
    setFormSchoolName(settings.schoolName);
    setFormLogoUrl(settings.logoUrl || '');
    setFormAnnouncement(settings.announcement);
    setFormAdminWhatsapp(settings.adminWhatsapp);
    setFormAdminPassword(settings.adminPassword);
    setFormGasUrl(settings.gasWebAppUrl);
  }, [settings]);

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Sila pilih fail gambar sahaja (PNG, JPG, JPEG, SVG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert('Saiz fail terlalu besar (maksimum 8MB).');
      return;
    }

    setIsUploadingLogo(true);
    setLogoUploadMessage('Sedang memproses fail logo sekolah...');

    const reader = new FileReader();
    reader.onload = async () => {
      const base64String = reader.result as string;
      setFormLogoUrl(base64String); // Set immediate local preview

      if (formGasUrl) {
        setLogoUploadMessage('Sedang memuat naik ke Google Drive Admin (Folder: Lugoss_App_Images)...');
        const result = await uploadImageToGoogleDrive(
          formGasUrl,
          base64String,
          `school_logo_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`,
          file.type
        );
        if (result.success && result.imageUrl && result.isCloud) {
          setFormLogoUrl(result.imageUrl);
          setLogoUploadMessage('✓ Logo berjaya disimpan ke Google Drive Admin (Folder: Lugoss_App_Images)!');
        } else {
          setLogoUploadMessage('✓ Logo sedia digunakan (Simpanan Tempatan). Sedia disimpan ke Google Drive apabila URL Apps Script sah.');
        }
      } else {
        setLogoUploadMessage('✓ Logo sedia digunakan (Simpanan Tempatan). Sila klik butang "Simpan Perubahan Tetapan" di bawah.');
      }
      setIsUploadingLogo(false);
    };

    reader.onerror = () => {
      setIsUploadingLogo(false);
      setLogoUploadMessage('Ralat semasa membaca fail logo.');
    };

    reader.readAsDataURL(file);
  };

  // Facility form state
  const [facName, setFacName] = useState('');
  const [facType, setFacType] = useState('MAKMAL');
  const [facCapacity, setFacCapacity] = useState(30);
  const [facDesc, setFacDesc] = useState('');
  const [facInventory, setFacInventory] = useState('');
  const [facStatus, setFacStatus] = useState<'available' | 'in-use' | 'maintenance'>('available');
  const [facImg, setFacImg] = useState('');

  // Facility Image Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [isCustomUrlMode, setIsCustomUrlMode] = useState(false);

  const PRESET_SCHOOL_IMAGES = [
    { label: 'Makmal Komputer', url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80' },
    { label: 'Makmal Sains', url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&auto=format&fit=crop&q=80' },
    { label: 'Dewan Rasmi', url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&auto=format&fit=crop&q=80' },
    { label: 'Bilik Mesyuarat', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=80' },
    { label: 'Pusat Sumber (PSS)', url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=600&auto=format&fit=crop&q=80' },
    { label: 'Peralatan / Projektor', url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80' },
  ];

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Sila pilih fail gambar sahaja (JPEG, PNG, WebP, dsb).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert('Saiz fail terlalu besar (maksimum 8MB).');
      return;
    }

    setIsUploadingImage(true);
    setUploadMessage('Sedang memproses gambar...');

    const reader = new FileReader();
    reader.onload = async () => {
      const base64String = reader.result as string;
      setFacImg(base64String); // Set immediate local preview

      if (formGasUrl) {
        setUploadMessage('Sedang memuat naik ke Google Drive Admin (Folder: Lugoss_App_Images)...');
        const result = await uploadImageToGoogleDrive(
          formGasUrl,
          base64String,
          `fac_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`,
          file.type
        );
        if (result.success && result.imageUrl && result.isCloud) {
          setFacImg(result.imageUrl);
          setUploadMessage('✓ Berjaya disimpan ke Google Drive Admin (Folder: Lugoss_App_Images)!');
        } else {
          setUploadMessage('✓ Gambar sedia digunakan (Simpanan Tempatan).');
        }
      } else {
        setUploadMessage('✓ Gambar sedia digunakan (Simpanan Tempatan). Sedia disegerak ke Google Drive apabila URL dimasukkan.');
      }
      setIsUploadingImage(false);
    };

    reader.onerror = () => {
      setIsUploadingImage(false);
      setUploadMessage('Ralat semasa membaca fail gambar.');
    };

    reader.readAsDataURL(file);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onAdminLogin(adminPasswordInput);
    if (!success) {
      setLoginError('Kata laluan pentadbir tidak tepat. Sila cuba lagi.');
    } else {
      setLoginError('');
      setAdminPasswordInput('');
    }
  };

  /**
   * Helper to automatically trigger WhatsApp without being blocked
   */
  const triggerWhatsappOpen = (url: string) => {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
      }, 150);
    } catch (e) {
      console.error('Trigger WhatsApp error:', e);
    }
  };

  /**
   * Approve booking AND automatically trigger WhatsApp notification to the teacher
   */
  const handleApproveWithWhatsapp = (b: Booking) => {
    onUpdateBookingStatus(b.id, 'LULUS');
    const updatedBooking: Booking = { ...b, status: 'LULUS' };
    const whatsappUrl = buildTeacherNotificationWhatsappUrl(b.phoneNumber, updatedBooking, 'LULUS');

    // Automatically trigger WhatsApp in a new tab / app
    triggerWhatsappOpen(whatsappUrl);

    // Show instant feedback popup with fallback direct button
    setAutoWhatsappNotice({
      applicantName: b.applicantName,
      phoneNumber: b.phoneNumber,
      status: 'LULUS',
      whatsappUrl,
    });
  };

  /**
   * Open the reject dialog with reason choices
   */
  const handleOpenRejectModal = (b: Booking) => {
    setRejectModalBooking(b);
    setRejectReason('Masa bertindih / fasiliti sedang diselenggara');
  };

  /**
   * Confirm rejection AND automatically trigger WhatsApp notification with reason
   */
  const handleConfirmRejectWithWhatsapp = () => {
    if (!rejectModalBooking) return;
    const note = rejectReason.trim() || 'Masa bertindih / fasiliti sedang diselenggara';
    onUpdateBookingStatus(rejectModalBooking.id, 'DITOLAK', note);
    const updatedBooking: Booking = { ...rejectModalBooking, status: 'DITOLAK', adminNotes: note };
    const whatsappUrl = buildTeacherNotificationWhatsappUrl(
      rejectModalBooking.phoneNumber,
      updatedBooking,
      'DITOLAK',
      note
    );

    // Automatically trigger WhatsApp
    triggerWhatsappOpen(whatsappUrl);

    // Show instant feedback popup with fallback direct button
    setAutoWhatsappNotice({
      applicantName: rejectModalBooking.applicantName,
      phoneNumber: rejectModalBooking.phoneNumber,
      status: 'DITOLAK',
      whatsappUrl,
    });

    setRejectModalBooking(null);
  };

  const openAddFacilityModal = () => {
    setEditingFacility(null);
    setFacName('');
    setFacType('MAKMAL');
    setFacCapacity(30);
    setFacDesc('');
    setFacInventory('');
    setFacStatus('available');
    setFacImg('https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80');
    setUploadMessage(null);
    setIsCustomUrlMode(false);
    setShowFacilityModal(true);
  };

  const openEditFacilityModal = (fac: Facility) => {
    setEditingFacility(fac);
    setFacName(fac.name);
    setFacType(fac.type);
    setFacCapacity(fac.capacity);
    setFacDesc(fac.desc);
    setFacInventory(fac.inventory);
    setFacStatus(fac.status);
    setFacImg(fac.img);
    setUploadMessage(null);
    setIsCustomUrlMode(false);
    setShowFacilityModal(true);
  };

  const handleFacilityFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!facName.trim()) return;

    const facilityData: Facility = {
      id: editingFacility ? editingFacility.id : (facType === 'ASET' ? 'AST-' : 'FAC-') + Date.now().toString().slice(-4),
      name: facName.trim(),
      type: facType,
      capacity: Number(facCapacity),
      desc: facDesc.trim(),
      inventory: facInventory.trim(),
      status: facStatus,
      img: facImg.trim() || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&auto=format&fit=crop&q=80',
    };

    onSaveFacility(facilityData);
    setShowFacilityModal(false);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      schoolName: formSchoolName,
      logoUrl: formLogoUrl,
      announcement: formAnnouncement,
      adminWhatsapp: formAdminWhatsapp,
      adminPassword: formAdminPassword,
      gasWebAppUrl: formGasUrl,
    });
    alert('Tetapan berjaya disimpan!');
  };

  const handleTestGasSync = async () => {
    if (!formGasUrl) {
      setSyncFeedback('Sila masukkan URL Google Apps Script dahulu.');
      return;
    }
    setIsSyncing(true);
    setSyncFeedback('Menyambung ke Google Sheets Web App...');
    try {
      const data = await syncWithGasBackend(formGasUrl, 'getData');
      if (data && (data.facilities || data.bookings)) {
        setSyncFeedback(`Berjaya! Menyegerakkan ${data.facilities?.length || 0} fasiliti dan ${data.bookings?.length || 0} tempahan.`);
      } else {
        setSyncFeedback('Sambungan berjaya dibuat (status 200 OK).');
      }
    } catch {
      setSyncFeedback('Ralat semasa menyambung ke Web App. Pastikan URL membenarkan akses "Anyone".');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setIsCopiedScript(true);
    setTimeout(() => setIsCopiedScript(false), 2500);
  };

  const handleBatchSyncToSheet = async () => {
    if (!formGasUrl) {
      setBatchSyncResult('Sila masukkan URL Google Apps Script Web App terlebih dahulu.');
      return;
    }
    setIsBatchSyncing(true);
    setBatchSyncResult('Sedang menghantar semua rekod fasiliti, aset & tempahan ke Google Sheet...');
    try {
      const res = await syncAllToGoogleSheet(formGasUrl, facilities, bookings, {
        announcement: formAnnouncement,
        adminWhatsapp: formAdminWhatsapp,
        adminPassword: formAdminPassword,
      });
      if (res.success) {
        setBatchSyncResult(`Selesai! Berjaya menyegerakkan ${facilities.length} fasiliti/aset dan ${bookings.length} tempahan ke Google Sheet.`);
      } else {
        setBatchSyncResult('Ralat semasa menyegerakkan ke Google Sheet.');
      }
    } catch (err: any) {
      setBatchSyncResult('Ralat: ' + (err.message || 'Gagal menyegerak'));
    } finally {
      setIsBatchSyncing(false);
    }
  };

  const handleDownloadBookingsCsv = () => {
    const headers = [
      'ID',
      'Nama Guru',
      'No Telefon',
      'ID Bilik',
      'Nama Bilik',
      'Tarikh',
      'Masa Mula',
      'Masa Tamat',
      'Tujuan',
      'Status',
      'Kuantiti',
      'Timestamp',
    ];
    const rows = bookings.map((b) => [
      b.id,
      b.applicantName,
      b.phoneNumber,
      b.roomId,
      b.roomName,
      b.date,
      b.time,
      b.endTime,
      b.purpose,
      b.status,
      b.quantity,
      b.timestamp,
    ]);
    downloadCsvForGoogleSheets(`Bookings_Lugoss_${Date.now()}.csv`, headers, rows);
  };

  const handleDownloadFacilitiesCsv = () => {
    const headers = [
      'ID',
      'Nama',
      'Kategori',
      'Kapasiti',
      'Penerangan',
      'Inventori',
      'Status',
      'Gambar',
    ];
    const rows = facilities.map((f) => [
      f.id,
      f.name,
      f.type,
      f.capacity,
      f.desc,
      f.inventory,
      f.status,
      f.img,
    ]);
    downloadCsvForGoogleSheets(`Facilities_Lugoss_${Date.now()}.csv`, headers, rows);
  };

  const handleExportJson = () => {
    const dataToExport = {
      settings,
      facilities,
      bookings,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lugoss_booking_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // If not logged in as Admin, show login gate
  if (!isAdminLoggedIn) {
    return (
      <div className="py-8 px-2 flex flex-col items-center justify-center animate-in fade-in duration-300">
        <div className="w-full max-w-sm bg-[#112240] border border-amber-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl text-white">
          <div className="w-16 h-16 bg-amber-500/20 border-2 border-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4 text-amber-400">
            <Key className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-extrabold text-center text-white">Zon Pentadbir</h2>
          <p className="text-xs text-slate-400 text-center mt-1 mb-6">
            Sila masukkan kata laluan untuk kelulusan tempahan dan pengurusan sistem.
          </p>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                Kata Laluan Pentadbir
              </label>
              <input
                type="password"
                value={adminPasswordInput}
                onChange={(e) => {
                  setAdminPasswordInput(e.target.value);
                  if (loginError) setLoginError('');
                }}
                placeholder="Masukkan kata laluan"
                className="w-full bg-[#0A192F] text-center text-white text-base tracking-widest border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-3 outline-none transition"
                autoFocus
              />
              {loginError && (
                <p className="text-rose-400 text-xs mt-1.5 text-center font-medium">
                  {loginError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-bold py-3.5 rounded-xl transition shadow-[0_4px_14px_0_rgba(245,158,11,0.39)] text-xs uppercase tracking-wider cursor-pointer"
            >
              Log Masuk Pentadbir
            </button>
          </form>

          {/* Default password hint for ease of testing */}
          <div className="mt-5 p-3 rounded-xl bg-[#0A192F] border border-slate-800 text-center">
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Kata Laluan Lalai (Default):</p>
            <p className="font-mono text-xs text-amber-400 font-bold mt-0.5">admin123</p>
          </div>
        </div>
      </div>
    );
  }

  const pendingApprovalsCount = bookings.filter((b) => b.status === 'MENUNGGU').length;

  // Filter bookings for approval tab
  const filteredBookings = bookings.filter((b) => {
    if (approvalFilter === 'SEMUA') return true;
    return b.status === approvalFilter;
  });

  return (
    <div className="space-y-5 pb-8 animate-in fade-in duration-300">
      {/* Admin Top Header */}
      <div className="bg-[#112240] rounded-3xl p-5 border border-amber-500/30 shadow-lg flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider mb-0.5">
            <ShieldCheck className="w-4 h-4" />
            <span>Panel Pentadbir</span>
          </div>
          <h2 className="text-xl font-extrabold text-white">Kawalan Lugoss Admin</h2>
        </div>
        <button
          onClick={onAdminLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar</span>
        </button>
      </div>

      {/* Admin Sub Navigation Tabs */}
      <div className="flex overflow-x-auto space-x-2 no-scrollbar bg-[#112240] p-1.5 rounded-2xl border border-slate-800">
        <button
          onClick={() => setAdminTab('approvals')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center justify-center gap-1.5 cursor-pointer ${
            adminTab === 'approvals'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Kelulusan</span>
          {pendingApprovalsCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
              {pendingApprovalsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setAdminTab('facilities')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center justify-center gap-1.5 cursor-pointer ${
            adminTab === 'facilities'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Fasiliti & Aset</span>
        </button>

        <button
          onClick={() => setAdminTab('sheets')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center justify-center gap-1.5 cursor-pointer ${
            adminTab === 'sheets'
              ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span>Google Sheets</span>
        </button>

        <button
          onClick={() => setAdminTab('settings')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center justify-center gap-1.5 cursor-pointer ${
            adminTab === 'settings'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Tetapan UI</span>
        </button>
      </div>

      {/* TAB 1: KELULUSAN (APPROVALS) */}
      {adminTab === 'approvals' && (
        <div className="space-y-4">
          {/* Approval Status Filter */}
          <div className="flex overflow-x-auto space-x-2 no-scrollbar">
            {(['MENUNGGU', 'SEMUA', 'LULUS', 'DITOLAK'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setApprovalFilter(filter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  approvalFilter === filter
                    ? 'bg-slate-200 text-slate-950 font-bold'
                    : 'bg-[#112240] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {filter === 'MENUNGGU' ? `Menunggu (${pendingApprovalsCount})` : filter}
              </button>
            ))}
          </div>

          {filteredBookings.length === 0 ? (
            <div className="bg-[#112240] rounded-3xl p-8 text-center text-slate-400 border border-slate-800">
              <CheckCircle2 className="w-9 h-9 text-emerald-400 mx-auto mb-2" />
              <p className="font-bold text-sm text-white">Tiada permohonan dalam kategori ini</p>
              <p className="text-xs text-slate-500 mt-0.5">Semua permohonan terkini telah diproses.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredBookings.map((b) => (
                <div
                  key={b.id}
                  className="bg-[#112240] rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-lg space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {b.id}
                      </span>
                      <h3 className="font-extrabold text-base text-white mt-1">
                        {b.roomName}
                      </h3>
                      {b.quantity > 0 && (
                        <span className="text-[11px] font-bold text-sky-400">
                          (Kuantiti: {b.quantity} Unit)
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                        b.status === 'LULUS'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : b.status === 'DITOLAK'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>

                  <div className="bg-[#0A192F] p-3 rounded-xl border border-slate-800 text-xs space-y-1 text-slate-300">
                    <p><span className="text-slate-500">Pemohon:</span> <strong className="text-white">{b.applicantName}</strong> ({b.phoneNumber})</p>
                    <p><span className="text-slate-500">Tarikh & Masa:</span> <strong className="text-white">{formatDateToDDMMYY(b.date)}</strong> ({b.time} - {b.endTime})</p>
                    <p><span className="text-slate-500">Tujuan:</span> {b.purpose}</p>
                  </div>

                  {/* Actions for Admin */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                    {b.status !== 'LULUS' && (
                      <button
                        onClick={() => handleApproveWithWhatsapp(b)}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md"
                        title="Luluskan permohonan dan hantar WhatsApp secara automatik"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Lulus & Hantar WhatsApp</span>
                      </button>
                    )}

                    {b.status !== 'DITOLAK' && (
                      <button
                        onClick={() => handleOpenRejectModal(b)}
                        className="py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                        title="Tolak permohonan dan hantar WhatsApp makluman secara automatik"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Tolak & WhatsApp</span>
                      </button>
                    )}

                    {/* WhatsApp direct notification to teacher */}
                    <a
                      href={buildTeacherNotificationWhatsappUrl(
                        b.phoneNumber,
                        b,
                        b.status === 'LULUS' ? 'LULUS' : 'DITOLAK',
                        b.adminNotes
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-2.5 rounded-xl bg-[#0A192F] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1 transition"
                      title="Hantar Pengesahan WhatsApp ke Guru Semula"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">WhatsApp Semula</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FASILITI & ASET (CRUD) */}
      {adminTab === 'facilities' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Senarai Fasiliti & Aset ({facilities.length})</span>
            </h3>
            <button
              onClick={openAddFacilityModal}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Baharu</span>
            </button>
          </div>

          <div className="space-y-3">
            {facilities.map((fac) => {
              const isAsset = fac.type === 'ASET';
              return (
                <div
                  key={fac.id}
                  className="bg-[#112240] rounded-2xl p-4 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={fac.img}
                      alt={fac.name}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-700 shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400 uppercase">
                          {isAsset ? 'ASET' : fac.type}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {isAsset ? `Stok: ${fac.capacity} Unit` : `Kapasiti: ${fac.capacity} Org`}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-white mt-0.5">{fac.name}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{fac.inventory}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => openEditFacilityModal(fac)}
                      className="p-2 rounded-xl bg-[#0A192F] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
                      title="Edit Fasiliti"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Padam fasiliti "${fac.name}"?`)) {
                          onDeleteFacility(fac.id);
                        }
                      }}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                      title="Padam Fasiliti"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: GOOGLE SHEETS & DATA */}
      {adminTab === 'sheets' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Status Header */}
          <div className="bg-[#112240] rounded-3xl p-5 border border-emerald-500/30 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                    <span>Integrasi Google Sheets</span>
                    {formGasUrl ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Tersambung</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Mod Tempatan
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Simpan semua tempahan, senarai bilik/aset dan tetapan terus ke dalam lejar Google Sheets sekolah.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleBatchSyncToSheet}
                disabled={isBatchSyncing}
                className="p-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition shadow-lg flex flex-col items-center justify-center text-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isBatchSyncing ? 'animate-spin' : ''}`} />
                <span>{isBatchSyncing ? 'Menyegerak...' : 'Segerak Semua Data'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onRefreshData) onRefreshData();
                }}
                className="p-3 rounded-2xl bg-[#0A192F] hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs transition flex flex-col items-center justify-center text-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Tarik dari Sheet</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadBookingsCsv}
                className="p-3 rounded-2xl bg-[#0A192F] hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs transition flex flex-col items-center justify-center text-center gap-1.5"
                title="Muat turun fail CSV tempahan untuk Google Sheets"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Bookings.csv</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadFacilitiesCsv}
                className="p-3 rounded-2xl bg-[#0A192F] hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs transition flex flex-col items-center justify-center text-center gap-1.5"
                title="Muat turun fail CSV fasiliti untuk Google Sheets"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Facilities.csv</span>
              </button>
            </div>

            {batchSyncResult && (
              <div className="mt-3 p-3 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{batchSyncResult}</span>
              </div>
            )}
          </div>

          {/* Web App URL Form & Connection */}
          <div className="bg-[#112240] rounded-3xl p-5 border border-slate-800 shadow-xl space-y-3">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>URL Google Apps Script Web App</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tampal URL Web App daripada Google Sheet anda untuk membolehkan penyimpanan data secara automatik setiap kali tempahan baharu dihantar.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={formGasUrl}
                onChange={(e) => setFormGasUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 bg-[#0A192F] text-white border border-slate-700 focus:border-emerald-400 rounded-xl px-4 py-2.5 text-xs outline-none transition"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSettings({ gasWebAppUrl: formGasUrl });
                    handleTestGasSync();
                  }}
                  disabled={isSyncing}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Menguji...' : 'Simpan & Uji'}</span>
                </button>
              </div>
            </div>

            {syncFeedback && (
              <p className="text-xs text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                {syncFeedback}
              </p>
            )}
          </div>

          {/* Step-by-Step Setup Guide & Script Copier */}
          <div className="bg-[#112240] rounded-3xl p-5 border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Panduan 3 Langkah Sambung Google Sheet</span>
              </h4>
              <a
                href="https://sheets.new"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
              >
                <span>Buka Google Sheet</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 leading-relaxed bg-[#0A192F] p-4 rounded-2xl border border-slate-800">
              <li>
                Buka Google Sheet baharu di Google Drive akaun MOE / peribadi anda (cth: namakan <strong>Lugoss Database</strong>).
              </li>
              <li>
                Di Google Sheet, klik menu <strong>Extensions &gt; Apps Script</strong>.
              </li>
              <li>
                Padam kod asal, klik butang <strong>"Salin Skrip Code.gs"</strong> di bawah, dan tampal ke dalam Apps Script, kemudian klik ikon Simpan (Save).
              </li>
              <li>
                Klik butang biru <strong>Deploy &gt; New deployment</strong>, pilih jenis <strong>Web app</strong>. Set <em>Execute as: Me</em> dan <em>Who has access: Anyone</em>, kemudian klik <strong>Deploy</strong>.
              </li>
              <li>
                Salin <strong>Web app URL</strong> yang diberikan dan masukkan ke dalam kotak URL di atas, kemudian klik <strong>Simpan &amp; Uji</strong>.
              </li>
            </ol>

            <button
              type="button"
              onClick={handleCopyScript}
              className="w-full py-3 rounded-xl bg-[#0A192F] hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {isCopiedScript ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{isCopiedScript ? 'Kod Berjaya Disalin ke Papan Keratan!' : 'Salin Kod Google Apps Script (Code.gs)'}</span>
            </button>
          </div>

          {/* Live Spreadsheet Tabular Preview */}
          <div className="bg-[#112240] rounded-3xl p-5 border border-slate-800 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Pratonton Struktur Tab Google Sheet</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Data yang disimpan mengikut format lajur tepat Google Sheet Lugoss.
                </p>
              </div>

              <div className="flex bg-[#0A192F] p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setSheetPreviewTab('bookings')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    sheetPreviewTab === 'bookings'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tab Bookings ({bookings.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSheetPreviewTab('facilities')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    sheetPreviewTab === 'facilities'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tab Facilities ({facilities.length})
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-800 rounded-2xl no-scrollbar max-h-60 overflow-y-auto">
              {sheetPreviewTab === 'bookings' ? (
                <table className="w-full text-left text-[11px] text-slate-300 whitespace-nowrap">
                  <thead className="bg-[#0A192F] text-amber-400 uppercase font-bold sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">ID</th>
                      <th className="p-2.5">Nama Guru</th>
                      <th className="p-2.5">No Telefon</th>
                      <th className="p-2.5">Nama Bilik</th>
                      <th className="p-2.5">Tarikh</th>
                      <th className="p-2.5">Masa</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Kuantiti</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-[#112240]">
                    {bookings.slice(0, 8).map((b) => (
                      <tr key={b.id} className="hover:bg-slate-800/50">
                        <td className="p-2.5 font-mono text-amber-400">{b.id}</td>
                        <td className="p-2.5 font-semibold text-white">{b.applicantName}</td>
                        <td className="p-2.5 font-mono">{b.phoneNumber}</td>
                        <td className="p-2.5">{b.roomName}</td>
                        <td className="p-2.5">{b.date}</td>
                        <td className="p-2.5">{b.time}-{b.endTime}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              b.status === 'LULUS'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : b.status === 'DITOLAK'
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="p-2.5">{b.quantity || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-[11px] text-slate-300 whitespace-nowrap">
                  <thead className="bg-[#0A192F] text-amber-400 uppercase font-bold sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">ID</th>
                      <th className="p-2.5">Nama</th>
                      <th className="p-2.5">Kategori</th>
                      <th className="p-2.5">Kapasiti / Stok</th>
                      <th className="p-2.5">Inventori</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-[#112240]">
                    {facilities.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-800/50">
                        <td className="p-2.5 font-mono text-amber-400">{f.id}</td>
                        <td className="p-2.5 font-semibold text-white">{f.name}</td>
                        <td className="p-2.5 font-bold text-slate-300">{f.type}</td>
                        <td className="p-2.5">{f.capacity} {f.type === 'ASET' ? 'Unit' : 'Orang'}</td>
                        <td className="p-2.5 max-w-xs truncate">{f.inventory}</td>
                        <td className="p-2.5">
                          <span className="text-emerald-400 font-semibold">{f.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TETAPAN UI & CLOUD */}
      {adminTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-[#112240] rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl space-y-4">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-amber-400" />
            <span>Tetapan Sistem & Integrasi Google Sheets</span>
          </h3>

          {/* Bahagian Muat Naik Logo Sekolah */}
          <div className="bg-[#0A192F] p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span>Logo Rasmi Sekolah / Institusi</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCustomLogoUrlMode(!isCustomLogoUrlMode)}
                className="text-[11px] text-slate-400 hover:text-amber-300 transition underline cursor-pointer"
              >
                {isCustomLogoUrlMode ? 'Tukar ke Mod Muat Naik Fail' : 'Guna Pautan URL Gambar'}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Logo Preview */}
              <div className="relative group shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white p-2 border-2 border-amber-400/80 shadow-lg flex items-center justify-center overflow-hidden">
                  <img
                    src={formLogoUrl || 'https://placehold.co/100x100/ffffff/0A192F?text=Logo'}
                    alt="Pratonton Logo Sekolah"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=160&auto=format&fit=crop&q=80';
                    }}
                  />
                </div>
                {isUploadingLogo && (
                  <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                  </div>
                )}
              </div>

              {/* Upload Actions & Explanation */}
              <div className="flex-1 space-y-2 text-center sm:text-left w-full">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Logo ini akan dipaparkan di bahagian atas (<span className="text-amber-300 font-medium">Header</span>) dan skrin log masuk guru di seluruh aplikasi.
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoFileChange}
                  />

                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition shadow cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingLogo ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UploadCloud className="w-4 h-4" />
                    )}
                    <span>{isUploadingLogo ? 'Memuat Naik...' : 'Pilih / Muat Naik Logo Baharu'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormLogoUrl('https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=160&auto=format&fit=crop&q=80');
                      setLogoUploadMessage('Logo telah diset semula kepada gambar asal.');
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Set Semula</span>
                  </button>
                </div>

                {isCustomLogoUrlMode && (
                  <div className="pt-2">
                    <input
                      type="url"
                      value={formLogoUrl}
                      onChange={(e) => setFormLogoUrl(e.target.value)}
                      placeholder="https://... pautan gambar logo rasmi"
                      className="w-full bg-[#112240] text-white border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs outline-none transition"
                    />
                  </div>
                )}

                {logoUploadMessage && (
                  <p className="text-[11px] text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                    {logoUploadMessage}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Nama Sekolah / Institusi
            </label>
            <input
              type="text"
              value={formSchoolName}
              onChange={(e) => setFormSchoolName(e.target.value)}
              className="w-full bg-[#0A192F] text-white border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-2.5 text-xs outline-none transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Teks Makluman / Pengumuman Sistem
            </label>
            <textarea
              rows={3}
              value={formAnnouncement}
              onChange={(e) => setFormAnnouncement(e.target.value)}
              className="w-full bg-[#0A192F] text-white border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-2.5 text-xs outline-none transition resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                No. WhatsApp Admin (Notifikasi)
              </label>
              <input
                type="tel"
                value={formAdminWhatsapp}
                onChange={(e) => setFormAdminWhatsapp(e.target.value)}
                placeholder="Cth: 60168510226"
                className="w-full bg-[#0A192F] text-white border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-2.5 text-xs outline-none transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Kata Laluan Pentadbir Baharu
              </label>
              <input
                type="text"
                value={formAdminPassword}
                onChange={(e) => setFormAdminPassword(e.target.value)}
                className="w-full bg-[#0A192F] text-white border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-2.5 text-xs outline-none transition"
              />
            </div>
          </div>

          {/* Google Apps Script Integration Section */}
          <div className="pt-4 border-t border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Database className="w-4 h-4" />
              <span>URL Google Apps Script (Web App)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Jika anda mempunyai skrip Google Apps Script untuk Google Sheets sekolah (seperti dalam fail handoff), tampal URL di sini untuk menyegerakkan data secara langsung.
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={formGasUrl}
                onChange={(e) => setFormGasUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 bg-[#0A192F] text-white border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-2 text-xs outline-none transition"
              />
              <button
                type="button"
                onClick={handleTestGasSync}
                disabled={isSyncing}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Menguji...' : 'Uji Sambungan'}</span>
              </button>
            </div>
            {syncFeedback && (
              <p className="text-xs text-amber-400 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                {syncFeedback}
              </p>
            )}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan Tetapan</span>
            </button>
          </div>

          {/* Backup & Reset tools */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleExportJson}
              className="text-slate-400 hover:text-white flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Muat Turun Sandaran (JSON)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm('Adakah anda pasti mahu mengembalikan data asal contoh (demo)?')) {
                  onResetData();
                  alert('Data berjaya diset semula kepada data contoh!');
                }
              }}
              className="text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Set Semula Demo</span>
            </button>
          </div>
        </form>
      )}

      {/* MODAL: ADD / EDIT FACILITY */}
      {showFacilityModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#112240] border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl text-white animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-white">
                {editingFacility ? 'Kemaskini Fasiliti / Aset' : 'Tambah Fasiliti / Aset Baharu'}
              </h3>
              <button
                onClick={() => setShowFacilityModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFacilityFormSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Nama Fasiliti / Aset
                </label>
                <input
                  type="text"
                  required
                  value={facName}
                  onChange={(e) => setFacName(e.target.value)}
                  placeholder="Cth: Makmal Komputer 2 / Projektor Mudah Alih"
                  className="w-full bg-[#0A192F] text-white border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Kategori
                  </label>
                  <select
                    value={facType}
                    onChange={(e) => setFacType(e.target.value)}
                    className="w-full bg-[#0A192F] text-white border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs outline-none"
                  >
                    <option value="MAKMAL">MAKMAL</option>
                    <option value="DEWAN">DEWAN</option>
                    <option value="BILIK">BILIK</option>
                    <option value="ASET">ASET (Peralatan)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    {facType === 'ASET' ? 'Jumlah Unit Stok' : 'Kapasiti Orang'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={facCapacity}
                    onChange={(e) => setFacCapacity(Number(e.target.value))}
                    className="w-full bg-[#0A192F] text-white border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Penerangan Ringkas
                </label>
                <textarea
                  rows={2}
                  value={facDesc}
                  onChange={(e) => setFacDesc(e.target.value)}
                  placeholder="Penerangan kemudahan fasiliti atau lokasi simpanan aset..."
                  className="w-full bg-[#0A192F] text-white border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Senarai Inventori / Kelengkapan
                </label>
                <input
                  type="text"
                  value={facInventory}
                  onChange={(e) => setFacInventory(e.target.value)}
                  placeholder="Cth: 40 PC, 2 Aircond, 1 Projektor"
                  className="w-full bg-[#0A192F] text-white border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Status Ketersediaan
                </label>
                <select
                  value={facStatus}
                  onChange={(e) => setFacStatus(e.target.value as any)}
                  className="w-full bg-[#0A192F] text-white border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs outline-none"
                >
                  <option value="available">Sedia Digunakan (Available)</option>
                  <option value="in-use">Sedang Beroperasi (In Use)</option>
                  <option value="maintenance">Penyelenggaraan (Maintenance)</option>
                </select>
              </div>

              {/* IMAGE UPLOADER & GOOGLE DRIVE INTEGRATION */}
              <div className="pt-1 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span>Gambar Fasiliti / Aset</span>
                  </label>
                  {formGasUrl ? (
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>Simpan ke Google Drive</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      Simpanan Tempatan
                    </span>
                  )}
                </div>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                {/* Upload Area / Preview */}
                {facImg ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 group">
                    <img
                      src={facImg}
                      alt="Pratonton"
                      className="w-full h-36 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/60 text-emerald-400 border border-emerald-500/30 backdrop-blur-xs flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          <span>{facImg.includes('googleusercontent') ? 'Tersimpan di Google Drive' : 'Gambar Dipilih'}</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingImage}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition shadow flex items-center gap-1 cursor-pointer"
                          >
                            <UploadCloud className="w-3 h-3" />
                            <span>Tukar Gambar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFacImg('');
                              setUploadMessage(null);
                            }}
                            className="p-1 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 transition"
                            title="Padam Gambar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="w-full border-2 border-dashed border-amber-500/40 hover:border-amber-400 bg-[#0A192F] hover:bg-slate-800/80 rounded-2xl p-5 text-center transition flex flex-col items-center justify-center gap-2 cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center group-hover:scale-110 transition">
                      {isUploadingImage ? (
                        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                      ) : (
                        <UploadCloud className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-amber-400 transition">
                        Tekan untuk Muat Naik Gambar
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Pilih dari galeri telefon, kamera atau fail komputer (JPG, PNG)
                      </p>
                    </div>
                  </button>
                )}

                {/* Upload Status Message */}
                {uploadMessage && (
                  <div className={`p-2.5 rounded-xl text-[11px] flex items-center gap-1.5 ${
                    uploadMessage.startsWith('✓')
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                  }`}>
                    {isUploadingImage && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-amber-400" />}
                    <span>{uploadMessage}</span>
                  </div>
                )}

                {/* PRESET SCHOOL IMAGES (PILIHAN PANTAS) */}
                <div className="pt-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Atau Pilih Gambar Contoh Sekolah (Pantas):</span>
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {PRESET_SCHOOL_IMAGES.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setFacImg(preset.url);
                          setUploadMessage(`✓ Gambar "${preset.label}" dipilih.`);
                        }}
                        className={`text-left p-1.5 rounded-xl bg-[#0A192F] hover:bg-slate-800 border text-[10px] font-semibold transition truncate flex items-center gap-1 cursor-pointer ${
                          facImg === preset.url
                            ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                            : 'border-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        <ImageIcon className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="truncate">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* OPTIONAL MANUAL URL TOGGLE */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCustomUrlMode(!isCustomUrlMode)}
                    className="text-[10px] text-slate-400 hover:text-amber-400 transition underline cursor-pointer"
                  >
                    {isCustomUrlMode ? '▲ Sembunyikan input URL' : '▼ Atau masukkan URL web gambar secara manual (Pilihan)'}
                  </button>
                  {isCustomUrlMode && (
                    <div className="mt-1.5 animate-in fade-in duration-200">
                      <input
                        type="url"
                        value={facImg}
                        onChange={(e) => setFacImg(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-[#0A192F] text-white border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowFacilityModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition shadow-md"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: TOLAK TEMPAHAN DENGAN WHATSAPP AUTOMATIK */}
      {rejectModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#112240] border border-rose-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl text-white relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <h4 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>Tolak Permohonan & Hantar WhatsApp</span>
              </h4>
              <button
                type="button"
                onClick={() => setRejectModalBooking(null)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#0A192F] p-3 rounded-2xl border border-slate-800 text-xs mb-3 space-y-1.5 text-slate-300">
              <p><span className="text-slate-500">Pemohon:</span> <strong className="text-white">{rejectModalBooking.applicantName}</strong> ({rejectModalBooking.phoneNumber})</p>
              <p><span className="text-slate-500">Fasiliti:</span> <strong className="text-amber-400">{rejectModalBooking.roomName}</strong></p>
              <p><span className="text-slate-500">Tarikh Guna:</span> <strong className="text-slate-200">{formatDateToDDMMYY(rejectModalBooking.date)}</strong> ({rejectModalBooking.time} - {rejectModalBooking.endTime})</p>
            </div>

            <div className="space-y-2 mb-4">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Sebab / Catatan Penolakan untuk Guru:
              </label>

              {/* Quick Select Tags */}
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {[
                  'Masa bertindih aktiviti lain',
                  'Fasiliti sedang diselenggara',
                  'Acara rasmi sekolah berlangsung',
                  'Stok peralatan tidak mencukupi',
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setRejectReason(tag)}
                    className={`text-[10px] px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                      rejectReason === tag
                        ? 'bg-rose-500/25 text-rose-300 border-rose-500/50 font-bold'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Masukkan sebab penolakan..."
                className="w-full bg-[#0A192F] text-white border border-slate-700 focus:border-rose-400 rounded-xl px-3 py-2 text-xs outline-none transition resize-none"
              />
              <p className="text-[10px] text-slate-400">
                * Mesej penolakan bersama catatan ini akan dihantar secara langsung ke WhatsApp guru.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRejectModalBooking(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectWithWhatsapp}
                className="flex-2 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-extrabold text-xs uppercase tracking-wider transition shadow flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Sahkan & Hantar WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL / NOTICE: STATUS WHATSAPP AUTOMATIK BERJAYA */}
      {autoWhatsappNotice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#112240] border-2 border-emerald-500/60 rounded-3xl p-6 shadow-2xl text-center text-white relative animate-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setAutoWhatsappNotice(null)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs cursor-pointer"
              title="Tutup"
            >
              ✕
            </button>

            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${
              autoWhatsappNotice.status === 'LULUS'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
            }`}>
              <MessageCircle className="w-7 h-7" />
            </div>

            <h4 className="font-extrabold text-base text-white">
              {autoWhatsappNotice.status === 'LULUS' ? 'Status: Permohonan Diluluskan' : 'Status: Permohonan Ditolak'}
            </h4>
            <p className="text-xs text-slate-300 mt-1 mb-4 leading-relaxed">
              Status telah dikemas kini. Sistem membuka WhatsApp untuk menghantar notifikasi kepada <strong className="text-amber-300">{autoWhatsappNotice.applicantName}</strong> ({autoWhatsappNotice.phoneNumber}).
            </p>

            <a
              href={autoWhatsappNotice.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setAutoWhatsappNotice(null)}
              className="flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold py-3 rounded-xl shadow-lg transition active:scale-95 text-xs uppercase tracking-wider mb-2.5 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Buka WhatsApp Sekarang</span>
            </a>

            <button
              type="button"
              onClick={() => setAutoWhatsappNotice(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Selesai & Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
