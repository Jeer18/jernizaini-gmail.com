import React, { useState } from 'react';
import { Smartphone, ShieldCheck, ArrowRight, Sparkles, UserCheck } from 'lucide-react';
import { AppSettings } from '../types';

interface LoginModalProps {
  settings: AppSettings;
  onLogin: (phone: string, name?: string) => void;
  onClose?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ settings, onLogin, onClose }) => {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const quickUsers = [
    { name: 'Cikgu Ahmad Razak', phone: '0123456789', role: 'Guru Sains Komputer' },
    { name: 'Ustazah Nurul Ain', phone: '0198765432', role: 'Guru Pendidikan Islam' },
    { name: 'Cikgu Tan Wei Loon', phone: '0178899001', role: 'Ketua Panitia BI' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
    if (cleanPhone.length < 8) {
      setError('Sila masukkan nombor telefon yang sah (sekurang-kurangnya 8 digit).');
      return;
    }
    setError('');
    onLogin(cleanPhone);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A192F]/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#112240] border border-amber-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl text-white relative overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Close Button if dismissible */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="Tutup & Masuk ke Dashboard"
          >
            ✕
          </button>
        )}

        {/* Decorative background glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Logo */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 bg-white rounded-full p-2 border-4 border-amber-400 shadow-xl mb-3 flex items-center justify-center">
            <img
              src={settings.logoUrl || 'https://placehold.co/100x100/ffffff/0A192F?text=SMK+L'}
              alt="Logo Sekolah"
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=160&auto=format&fit=crop&q=80';
              }}
            />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{settings.schoolName || 'SMK Lugoss'}</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white">Selamat Datang</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-[260px]">
            Sistem Tempahan Fasiliti & Aset Sekolah. Sila log masuk dengan No. Telefon guru.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
              <span>No. Telefon / ID Pengguna</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (error) setError('');
              }}
              placeholder="Cth: 0123456789"
              className="w-full bg-[#0A192F] text-center text-white placeholder-slate-500 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-3 text-lg font-bold tracking-widest outline-none transition shadow-inner"
              autoFocus
            />
            {error && <p className="text-rose-400 text-xs mt-1.5 text-center">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-bold py-3.5 rounded-xl transition shadow-[0_4px_14px_0_rgba(245,158,11,0.39)] flex items-center justify-center gap-2 text-sm uppercase tracking-wide cursor-pointer"
          >
            <span>Log Masuk Sistem</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onLogin('0123456789', 'Cikgu Ahmad Razak')}
            className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-amber-300 font-bold text-xs uppercase tracking-wider transition border border-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Masuk Terus ke Dashboard (Pantas)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Fast Quick Select for Demo */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2.5 flex items-center justify-center gap-1">
            <UserCheck className="w-3 h-3 text-amber-400" />
            <span>Pilih Pengguna Contoh (Pantas)</span>
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {quickUsers.map((u) => (
              <button
                key={u.phone}
                type="button"
                onClick={() => onLogin(u.phone, u.name)}
                className="text-left px-3 py-2 rounded-xl bg-[#0A192F] hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 transition flex items-center justify-between text-xs group"
              >
                <div>
                  <p className="font-semibold text-slate-200 group-hover:text-amber-400 transition">
                    {u.name}
                  </p>
                  <p className="text-[10px] text-slate-500">{u.role} • {u.phone}</p>
                </div>
                <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-amber-400 transition" />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-500 text-center">
          <ShieldCheck className="w-3 h-3 text-amber-500/60" />
          <span>Akses selamat & rekod automatik sekolah</span>
        </div>
      </div>
    </div>
  );
};
