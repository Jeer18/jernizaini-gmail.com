import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  Phone,
  AlertTriangle,
  CheckCircle2,
  Send,
  Box,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { AppSettings, Booking, Facility } from '../types';
import { checkBookingTimeConflict, buildAdminWhatsappUrl, formatDateToDDMMYY } from '../utils/bookingUtils';

interface BookViewProps {
  settings: AppSettings;
  facilities: Facility[];
  bookings: Booking[];
  currentUserPhone: string;
  selectedFacilityId: string | null;
  onClearSelectedFacility: () => void;
  onSubmitBooking: (booking: Booking) => void;
  onNavigateTab: (tab: 'home' | 'book' | 'status' | 'admin') => void;
}

export const BookView: React.FC<BookViewProps> = ({
  settings,
  facilities,
  bookings,
  currentUserPhone,
  selectedFacilityId,
  onClearSelectedFacility,
  onSubmitBooking,
  onNavigateTab,
}) => {
  // Form fields
  const [applicantName, setApplicantName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(currentUserPhone || '');
  const [roomId, setRoomId] = useState(selectedFacilityId || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [time, setTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');
  const [purpose, setPurpose] = useState('');

  // Modals & Feedback
  const [submittedBooking, setSubmittedBooking] = useState<Booking | null>(null);
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);

  // Sync if selectedFacilityId changes from parent
  useEffect(() => {
    if (selectedFacilityId) {
      setRoomId(selectedFacilityId);
    }
  }, [selectedFacilityId]);

  // Sync phone number
  useEffect(() => {
    if (currentUserPhone) {
      setPhoneNumber(currentUserPhone);
    }
  }, [currentUserPhone]);

  const selectedFacility = facilities.find((f) => f.id === roomId);
  const isAsset = selectedFacility?.type === 'ASET';

  // Real-time conflict validation
  const conflictResult = checkBookingTimeConflict(
    selectedFacility,
    date,
    time,
    endTime,
    bookings
  );

  const isFormValid =
    applicantName.trim() !== '' &&
    phoneNumber.trim() !== '' &&
    roomId !== '' &&
    date !== '' &&
    time !== '' &&
    endTime !== '' &&
    purpose.trim() !== '' &&
    !conflictResult.hasConflict &&
    (!isAsset || (quantity > 0 && quantity <= (selectedFacility?.capacity || 999)));

  const handleFacilityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setRoomId(newId);
    onClearSelectedFacility();
    const fac = facilities.find((f) => f.id === newId);
    if (fac?.type === 'ASET') {
      setQuantity(1);
    } else {
      setQuantity(0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !selectedFacility) return;

    const newBooking: Booking = {
      id: 'BK-' + Date.now().toString().slice(-6),
      applicantName: applicantName.trim(),
      phoneNumber: phoneNumber.trim(),
      roomId: selectedFacility.id,
      roomName: selectedFacility.name,
      date,
      time,
      endTime,
      purpose: purpose.trim(),
      status: 'MENUNGGU',
      quantity: isAsset ? Number(quantity) : 0,
      timestamp: new Date().toISOString(),
    };

    onSubmitBooking(newBooking);
    setSubmittedBooking(newBooking);
    setShowWhatsappModal(true);
  };

  const handleCloseWhatsappModal = () => {
    setShowWhatsappModal(false);
    // Reset fields
    setPurpose('');
    onNavigateTab('status');
  };

  return (
    <div className="space-y-5 pb-6 animate-in fade-in duration-300">
      {/* View Header */}
      <div className="bg-[#112240] rounded-3xl p-5 border border-amber-500/20 shadow-lg">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Borang Permohonan Rasmi</span>
        </div>
        <h2 className="text-xl font-extrabold text-white">Tempahan Fasiliti & Aset</h2>
        <p className="text-xs text-slate-400 mt-1">
          Sila isi butiran lengkap untuk semakan dan kelulusan pentadbir sekolah.
        </p>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-[#112240] rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl space-y-4">
        {/* Applicant Name */}
        <div>
          <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-amber-400" />
            <span>Nama Guru Pemohon <span className="text-rose-400">*</span></span>
          </label>
          <input
            type="text"
            required
            value={applicantName}
            onChange={(e) => setApplicantName(e.target.value)}
            placeholder="Cth: Cikgu Ahmad Razak"
            className="w-full bg-[#0A192F] text-white placeholder-slate-500 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm outline-none transition"
          />
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-amber-400" />
            <span>Nombor Telefon (ID) <span className="text-rose-400">*</span></span>
          </label>
          <input
            type="tel"
            required
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Cth: 0123456789"
            className="w-full bg-[#0A192F] text-white placeholder-slate-500 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm outline-none transition"
          />
          <p className="text-[10px] text-slate-500 mt-1">
            Nombor ini akan digunakan untuk pengesahan dan notifikasi status tempahan.
          </p>
        </div>

        <div className="border-t border-slate-800 my-2" />

        {/* Select Facility / Asset */}
        <div>
          <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Pilih Bilik / Aset Sekolah <span className="text-rose-400">*</span></span>
          </label>
          <select
            required
            value={roomId}
            onChange={handleFacilityChange}
            className="w-full bg-[#0A192F] text-white border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm outline-none transition cursor-pointer"
          >
            <option value="" disabled>-- Sila Pilih Fasiliti / Aset --</option>
            <optgroup label="FASILITI & MAKMAL">
              {facilities
                .filter((f) => f.type !== 'ASET')
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    [{f.type}] {f.name} (Kapasiti: {f.capacity} orang)
                  </option>
                ))}
            </optgroup>
            <optgroup label="ASET & PERALATAN MUDAH ALIH">
              {facilities
                .filter((f) => f.type === 'ASET')
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    [ASET] {f.name} (Stok: {f.capacity} unit)
                  </option>
                ))}
            </optgroup>
          </select>
        </div>

        {/* Dynamic Quantity for Assets */}
        {isAsset && selectedFacility && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Box className="w-4 h-4" />
                <span>Kuantiti Unit Diperlukan <span className="text-rose-400">*</span></span>
              </label>
              <span className="text-[10px] text-amber-300 font-semibold bg-amber-500/20 px-2 py-0.5 rounded-full">
                Maksimum: {selectedFacility.capacity} Unit
              </span>
            </div>
            <input
              type="number"
              min="1"
              max={selectedFacility.capacity}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-[#0A192F] text-white font-extrabold text-base border border-amber-500/50 focus:border-amber-400 rounded-xl px-4 py-2.5 outline-none transition"
              required
            />
            <p className="text-[10px] text-slate-400 mt-1.5">
              * Aset tidak menghalang tempahan guru lain selagi baki stok unit mencukupi.
            </p>
          </div>
        )}

        {/* Date */}
        <div>
          <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>Tarikh Penggunaan <span className="text-rose-400">*</span></span>
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-[#0A192F] text-white border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm outline-none transition [color-scheme:dark]"
          />
        </div>

        {/* Time start & end */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Masa Mula <span className="text-rose-400">*</span></span>
            </label>
            <input
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-[#0A192F] text-white border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm outline-none transition [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Masa Tamat <span className="text-rose-400">*</span></span>
            </label>
            <input
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-[#0A192F] text-white border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm outline-none transition [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Time conflict warning banner */}
        {conflictResult.hasConflict && (
          <div className="bg-rose-500/10 border border-rose-500/40 rounded-2xl p-3.5 flex items-start gap-3 animate-in shake duration-300">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-rose-400">Pertindihan Masa Dikesan!</p>
              <p className="text-slate-300 mt-0.5 leading-relaxed">
                {conflictResult.message}
              </p>
              <p className="text-[10px] text-rose-300/80 mt-1">
                Sila pilih waktu lain atau fasiliti yang berbeza untuk mengelakkan pertembungan.
              </p>
            </div>
          </div>
        )}

        {/* Purpose */}
        <div>
          <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Tujuan Penggunaan & Catatan <span className="text-rose-400">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Cth: Kelas amali Sains Tingkatan 5 / Bengkel SPM Panitia / Latihan Sukan..."
            className="w-full bg-[#0A192F] text-white placeholder-slate-500 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-2.5 text-sm outline-none transition resize-none"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isFormValid}
          className={`w-full py-4 rounded-xl font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg cursor-pointer ${
            isFormValid
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-[0.99] shadow-[0_4px_16px_0_rgba(245,158,11,0.39)]'
              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-70'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Hantar Permohonan Tempahan</span>
        </button>
      </form>

      {/* WhatsApp Modal after submission */}
      {showWhatsappModal && submittedBooking && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#112240] border border-emerald-500/40 rounded-3xl p-6 shadow-2xl text-white text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-400">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h3 className="text-xl font-extrabold text-white">Permohonan Dihantar!</h3>
            <p className="text-xs text-slate-300 mt-1 mb-4 leading-relaxed">
              Rekod anda dengan ID <span className="font-mono text-amber-400 font-bold">{submittedBooking.id}</span> telah berjaya disimpan.
            </p>

            <div className="bg-[#0A192F] p-3.5 rounded-2xl border border-slate-800 text-xs text-left mb-5 space-y-1">
              <p><span className="text-slate-400">Fasiliti:</span> <span className="font-semibold text-white">{submittedBooking.roomName}</span></p>
              <p><span className="text-slate-400">Tarikh Guna:</span> <span className="font-semibold text-white">{formatDateToDDMMYY(submittedBooking.date)}</span></p>
              <p><span className="text-slate-400">Masa:</span> <span className="font-semibold text-white">{submittedBooking.time} - {submittedBooking.endTime}</span></p>
              {submittedBooking.quantity > 0 && (
                <p><span className="text-slate-400">Kuantiti:</span> <span className="font-semibold text-amber-400">{submittedBooking.quantity} Unit</span></p>
              )}
            </div>

            {/* Direct WhatsApp button to Admin */}
            <a
              href={buildAdminWhatsappUrl(settings.adminWhatsapp, submittedBooking, selectedFacility)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold py-3.5 rounded-xl shadow-lg transition active:scale-95 mb-2.5 text-xs uppercase tracking-wider"
            >
              <span>Maklumkan Admin (WhatsApp)</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            <button
              onClick={handleCloseWhatsappModal}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
            >
              Lihat Status Tempahan Saya
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
