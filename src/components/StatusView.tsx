import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  Search,
  RotateCw,
  Phone,
  Layers,
  Trash2,
  ExternalLink,
  AlertCircle,
  Filter,
  FileSpreadsheet,
} from 'lucide-react';
import { AppSettings, Booking } from '../types';
import { formatPhoneNumber, downloadCsvForGoogleSheets, formatDateToDDMMYY } from '../utils/bookingUtils';

interface StatusViewProps {
  settings: AppSettings;
  bookings: Booking[];
  currentUserPhone: string;
  onCancelBooking: (bookingId: string) => void;
  onRefreshData: () => void;
}

export const StatusView: React.FC<StatusViewProps> = ({
  settings,
  bookings,
  currentUserPhone,
  onCancelBooking,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'me' | 'all'>('me');
  const [statusFilter, setStatusFilter] = useState<'SEMUA' | 'MENUNGGU' | 'LULUS' | 'DITOLAK'>('SEMUA');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    onRefreshData();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Filter bookings based on view (me vs all), status, and search query
  const filteredBookings = bookings.filter((b) => {
    // Me vs All
    if (activeTab === 'me') {
      const cleanUserPhone = currentUserPhone.replace(/[^0-9]/g, '');
      const cleanBookingPhone = b.phoneNumber.replace(/[^0-9]/g, '');
      // Match if same phone or endsWith
      const matchesPhone =
        cleanBookingPhone === cleanUserPhone ||
        (cleanUserPhone.length >= 8 && cleanBookingPhone.endsWith(cleanUserPhone.slice(-8)));
      if (!matchesPhone) return false;
    }

    // Status filter
    if (statusFilter !== 'SEMUA' && b.status !== statusFilter) {
      return false;
    }

    // Search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchRoom = b.roomName.toLowerCase().includes(q);
      const matchApplicant = b.applicantName.toLowerCase().includes(q);
      const matchPurpose = b.purpose.toLowerCase().includes(q);
      const matchId = b.id.toLowerCase().includes(q);
      if (!matchRoom && !matchApplicant && !matchPurpose && !matchId) return false;
    }

    return true;
  });

  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'LULUS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-wider">
            <CheckCircle2 className="w-3 h-3" />
            <span>Lulus</span>
          </span>
        );
      case 'DITOLAK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-extrabold uppercase tracking-wider">
            <XCircle className="w-3 h-3" />
            <span>Ditolak</span>
          </span>
        );
      case 'MENUNGGU':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-extrabold uppercase tracking-wider">
            <Clock className="w-3 h-3" />
            <span>Menunggu</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 pb-6 animate-in fade-in duration-300">
      {/* View Header with Refresh */}
      <div className="bg-[#112240] rounded-3xl p-5 border border-amber-500/20 shadow-lg flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white">Status Tempahan</h2>
          <p className="text-xs text-slate-400">Semak rekod permohonan dan jadual fasiliti sekolah</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
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
              const rows = filteredBookings.map((b) => [
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
            }}
            className="p-2.5 rounded-xl bg-[#0A192F] hover:bg-slate-800 border border-slate-700 text-emerald-400 hover:text-emerald-300 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Muat Turun CSV untuk Google Sheets"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Google Sheets</span>
          </button>

          <button
            onClick={handleRefresh}
            className={`p-2.5 rounded-xl bg-[#0A192F] hover:bg-slate-800 border border-slate-700 text-amber-400 transition cursor-pointer ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            title="Muat Semula Rekod"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Tabs (Tempahan Saya vs Jadual Umum) */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-[#112240] rounded-2xl border border-slate-800">
        <button
          onClick={() => setActiveTab('me')}
          className={`py-2.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'me'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Tempahan Saya</span>
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`py-2.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'all'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Jadual Umum</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari bilik, nama guru, atau ID..."
            className="w-full bg-[#112240] text-xs text-white placeholder-slate-500 pl-9 pr-4 py-2.5 rounded-xl border border-slate-800 focus:border-amber-400 outline-none transition"
          />
        </div>

        {/* Status Pills */}
        <div className="flex overflow-x-auto space-x-2 no-scrollbar pb-0.5">
          {(['SEMUA', 'MENUNGGU', 'LULUS', 'DITOLAK'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap transition cursor-pointer ${
                statusFilter === status
                  ? 'bg-slate-200 text-slate-950 font-bold'
                  : 'bg-[#112240] text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {status === 'SEMUA' ? 'Semua Status' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="bg-[#112240] rounded-3xl p-8 text-center text-slate-400 border border-slate-800 my-4">
          <AlertCircle className="w-10 h-10 text-slate-500 mx-auto mb-2.5" />
          <p className="font-bold text-sm text-white">Tiada rekod tempahan ditemui</p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            {activeTab === 'me'
              ? 'Anda belum mempunyai tempahan di bawah nombor telefon ini.'
              : 'Tiada jadual tempahan yang sepadan dengan tapisan semasa.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((b) => {
            const isUserOwner =
              b.phoneNumber.replace(/[^0-9]/g, '') === currentUserPhone.replace(/[^0-9]/g, '');

            return (
              <div
                key={b.id}
                className="bg-[#112240] rounded-2xl p-4 sm:p-5 border border-slate-800 hover:border-slate-700 shadow-lg space-y-3 transition"
              >
                {/* Header line */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {b.id}
                      </span>
                      {b.quantity > 0 && (
                        <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                          {b.quantity} Unit Aset
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-base text-white mt-1">
                      {b.roomName}
                    </h3>
                  </div>
                  <div>{getStatusBadge(b.status)}</div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-[#0A192F] p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{formatDateToDDMMYY(b.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{b.time} - {b.endTime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300 col-span-2">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {b.applicantName} ({b.phoneNumber})
                    </span>
                  </div>
                </div>

                {/* Purpose Note */}
                <div className="text-xs text-slate-300">
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase">Tujuan Penggunaan:</span>
                  <p className="mt-0.5 italic">"{b.purpose}"</p>
                </div>

                {/* Admin Notes if rejected */}
                {b.adminNotes && (
                  <div className="text-xs bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-xl text-rose-300">
                    <span className="font-bold block text-[10px] uppercase">Catatan Pentadbir:</span>
                    <p>{b.adminNotes}</p>
                  </div>
                )}

                {/* Card Actions */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
                  {/* WhatsApp Admin inquiry */}
                  <a
                    href={`https://wa.me/${formatPhoneNumber(settings.adminWhatsapp)}?text=${encodeURIComponent(
                      `Salam Admin, saya ingin menyemak status permohonan tempahan *${b.roomName}* (ID: ${b.id}) pada tarikh guna ${formatDateToDDMMYY(b.date)}. Terima kasih.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold text-[11px] transition"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Tanya Admin</span>
                  </a>

                  {/* Cancel Button (Owner only + Menunggu status) */}
                  {isUserOwner && b.status === 'MENUNGGU' && (
                    <button
                      onClick={() => {
                        if (confirm('Adakah anda pasti untuk membatalkan tempahan ini?')) {
                          onCancelBooking(b.id);
                        }
                      }}
                      className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 font-semibold text-[11px] px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Batal Permohonan</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
