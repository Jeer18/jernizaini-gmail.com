import React, { useState } from 'react';
import { Bell, Sparkles, LogOut, Smartphone, Monitor, Info, CheckCircle2, User } from 'lucide-react';
import { AppSettings } from '../types';

interface HeaderProps {
  settings: AppSettings;
  userPhone: string;
  onLogout: () => void;
  onOpenLogin: () => void;
  isPhoneFrame: boolean;
  onToggleFrame: () => void;
  pendingCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  userPhone,
  onLogout,
  onOpenLogin,
  isPhoneFrame,
  onToggleFrame,
  pendingCount,
}) => {
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  return (
    <>
      <header className="relative z-20 bg-[#0A192F] border-b border-[#112240] px-4 pt-4 pb-4 sm:px-6 shadow-lg">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* Logo & School Name */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white p-1 border-2 border-amber-400/80 shadow-md flex items-center justify-center overflow-hidden shrink-0">
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
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#112240] border border-amber-500/30 text-[10px] sm:text-xs font-semibold text-amber-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Lugoss Booking</span>
              </div>
              {settings.gasWebAppUrl && (
                <div className="hidden sm:inline-flex items-center gap-1 ml-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Google Sheets</span>
                </div>
              )}
              <p className="text-xs text-slate-300 font-medium truncate max-w-[150px] sm:max-w-xs">
                {settings.schoolName || 'SMK Lugoss'}
              </p>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Viewport frame toggle for desktop */}
            <button
              onClick={onToggleFrame}
              title={isPhoneFrame ? 'Tukar ke Paparan Lebar' : 'Tukar ke Paparan Telefon'}
              className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg bg-[#112240] hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-800 transition cursor-pointer"
            >
              {isPhoneFrame ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => setShowNotificationModal(true)}
              className="relative p-2 rounded-xl bg-[#112240] hover:bg-[#1B2A4A] border border-amber-500/20 text-slate-200 transition cursor-pointer"
              title="Notifikasi Sistem"
            >
              <Bell className="w-4 h-4" />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-950 text-[10px] font-bold rounded-full flex items-center justify-center pulse-gold">
                  {pendingCount}
                </span>
              )}
            </button>

            {/* User Log Out / Log Masuk Button */}
            {userPhone ? (
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-bold transition cursor-pointer active:scale-95 shadow-xs"
                title="Log Keluar Pengguna"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Log Keluar</span>
              </button>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-bold transition cursor-pointer active:scale-95 shadow-xs"
                title="Log Masuk Pengguna"
              >
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>Log Masuk</span>
              </button>
            )}
          </div>
        </div>

        {/* User Greeting Bar */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-1.5">
              Salam Sejahtera,{' '}
              <span className="text-amber-400 font-extrabold">
                {userPhone ? `${userPhone.slice(0, 4)}***${userPhone.slice(-3)}` : 'Tetamu'}
              </span>
            </h1>
            <p className="text-xs text-slate-400">Sistem Tempahan Fasiliti & Aset Sekolah</p>
          </div>
        </div>
      </header>

      {/* Notifications Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#112240] border border-amber-500/30 rounded-2xl p-5 shadow-2xl text-white animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Notifikasi Terkini</h3>
                <p className="text-xs text-slate-400">Pemberitahuan Sistem Lugoss</p>
              </div>
            </div>

            <div className="space-y-3 mb-5 max-h-60 overflow-y-auto pr-1">
              <div className="p-3 rounded-xl bg-[#0A192F] border border-slate-800 text-xs text-slate-300">
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-1">
                  <Info className="w-3.5 h-3.5" />
                  <span>Makluman Pentadbir</span>
                </div>
                <p>{settings.announcement}</p>
              </div>

              {pendingCount > 0 ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Permohonan Menunggu</span>
                  </div>
                  <p>Terdapat {pendingCount} permohonan tempahan sedang menunggu kelulusan admin.</p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p>Semua permohonan terkini telah diproses oleh admin.</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowNotificationModal(false)}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition shadow-lg"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
};
