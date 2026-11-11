import React, { useState } from 'react';
import {
  CalendarPlus,
  FileSignature,
  Megaphone,
  Search,
  Users,
  Box,
  Layers,
  ArrowRight,
  Info,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { AppSettings, Booking, Facility } from '../types';

interface HomeViewProps {
  settings: AppSettings;
  facilities: Facility[];
  bookings: Booking[];
  onSelectFacilityToBook: (facilityId: string) => void;
  onNavigateTab: (tab: 'home' | 'book' | 'status' | 'admin') => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  settings,
  facilities,
  bookings,
  onSelectFacilityToBook,
  onNavigateTab,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('SEMUA');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeDetailFacility, setActiveDetailFacility] = useState<Facility | null>(null);

  // Statistics
  const totalBookings = bookings.length;
  const approvedCount = bookings.filter((b) => b.status === 'LULUS').length;
  const pendingCount = bookings.filter((b) => b.status === 'MENUNGGU').length;

  const categories = ['SEMUA', 'MAKMAL', 'DEWAN', 'BILIK', 'ASET'];

  const filteredFacilities = facilities.filter((fac) => {
    const matchesCategory =
      selectedCategory === 'SEMUA' || fac.type.toUpperCase() === selectedCategory;
    const matchesSearch =
      fac.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fac.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fac.inventory.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-6 animate-in fade-in duration-300">
      {/* Hero Stats Card */}
      <div className="bg-[#112240] rounded-3xl p-5 sm:p-6 border border-amber-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              Ringkasan Rekod
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                {totalBookings}
              </span>
              <span className="text-slate-400 text-xs font-semibold uppercase">
                Jumlah Tempahan
              </span>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('book')}
            className="self-start sm:self-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition shadow-[0_4px_14px_0_rgba(245,158,11,0.39)] flex items-center gap-2 text-xs uppercase tracking-wider cursor-pointer active:scale-95"
          >
            <span>Tempah Sekarang</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Sub metrics */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
          <div className="bg-[#0A192F]/80 p-3 rounded-2xl border border-emerald-500/20 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Diluluskan</p>
              <p className="text-lg font-bold text-emerald-400">{approvedCount}</p>
            </div>
          </div>

          <div className="bg-[#0A192F]/80 p-3 rounded-2xl border border-amber-500/20 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Menunggu</p>
              <p className="text-lg font-bold text-amber-400">{pendingCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Launch Buttons */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <button
          onClick={() => onNavigateTab('book')}
          className="bg-[#112240] hover:bg-[#152a50] p-4 sm:p-5 rounded-2xl border border-slate-800 hover:border-amber-500/40 flex flex-col items-center text-center shadow-lg active:scale-98 transition group cursor-pointer"
        >
          <div className="w-12 h-12 bg-[#0A192F] rounded-2xl flex items-center justify-center mb-2.5 border border-amber-500/30 text-amber-400 group-hover:scale-110 transition shadow-inner">
            <CalendarPlus className="w-6 h-6" />
          </div>
          <h3 className="text-white font-bold text-sm">Borang Tempah</h3>
          <p className="text-slate-400 text-[11px] mt-0.5">Bilik, Makmal & Aset</p>
        </button>

        <button
          onClick={() => onNavigateTab('status')}
          className="bg-[#112240] hover:bg-[#152a50] p-4 sm:p-5 rounded-2xl border border-slate-800 hover:border-amber-500/40 flex flex-col items-center text-center shadow-lg active:scale-98 transition group cursor-pointer"
        >
          <div className="w-12 h-12 bg-[#0A192F] rounded-2xl flex items-center justify-center mb-2.5 border border-amber-500/30 text-amber-400 group-hover:scale-110 transition shadow-inner">
            <FileSignature className="w-6 h-6" />
          </div>
          <h3 className="text-white font-bold text-sm">Semak Status</h3>
          <p className="text-slate-400 text-[11px] mt-0.5">Jadual & Permohonan</p>
        </button>
      </div>

      {/* Announcement Marquee/Banner */}
      <div className="bg-[#112240] border-l-4 border-amber-400 rounded-r-2xl p-4 shadow-md flex items-start gap-3">
        <div className="bg-amber-500/10 p-2 rounded-xl text-amber-400 shrink-0 mt-0.5">
          <Megaphone className="w-4 h-4" />
        </div>
        <div className="text-xs">
          <p className="text-amber-400 font-bold uppercase tracking-wider mb-0.5">Makluman Sekolah:</p>
          <p className="text-slate-300 leading-relaxed">{settings.announcement}</p>
        </div>
      </div>

      {/* Facilities & Assets Directory */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Fasiliti & Aset Sekolah</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {filteredFacilities.length}
              </span>
            </h2>
            <p className="text-xs text-slate-400">Pilih bilik atau peralatan untuk membuat tempahan</p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari fasiliti / aset..."
              className="w-full bg-[#112240] text-xs text-white placeholder-slate-500 pl-8 pr-3 py-2 rounded-xl border border-slate-800 focus:border-amber-400 outline-none transition"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex overflow-x-auto space-x-2 no-scrollbar pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'bg-[#112240] text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {cat === 'SEMUA' ? 'Semua' : cat === 'ASET' ? 'Aset / Peralatan' : cat}
            </button>
          ))}
        </div>

        {/* Facilities List / Grid */}
        {filteredFacilities.length === 0 ? (
          <div className="bg-[#112240] rounded-2xl p-8 text-center text-slate-400 border border-slate-800">
            <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="font-semibold text-sm">Tiada fasiliti atau aset dijumpai</p>
            <p className="text-xs text-slate-500 mt-1">Cuba tukar kata kunci carian atau kategori.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredFacilities.map((fac) => {
              const isAsset = fac.type === 'ASET';
              return (
                <div
                  key={fac.id}
                  className="bg-[#112240] rounded-2xl border border-slate-800/90 overflow-hidden shadow-lg hover:border-amber-500/40 transition flex flex-col group"
                >
                  {/* Image container */}
                  <div className="relative h-36 w-full bg-slate-900 overflow-hidden">
                    <img
                      src={fac.img}
                      alt={fac.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&auto=format&fit=crop&q=80';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#112240] via-transparent to-black/40" />

                    {/* Category Pill */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider backdrop-blur-md shadow-sm ${
                          isAsset
                            ? 'bg-amber-500/90 text-slate-950 font-extrabold'
                            : 'bg-indigo-600/90 text-white'
                        }`}
                      >
                        {isAsset ? 'ASET / ALAT' : fac.type}
                      </span>
                    </div>

                    {/* Status Pill */}
                    <div className="absolute top-2.5 right-2.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg backdrop-blur-md ${
                          fac.status === 'available'
                            ? 'bg-emerald-500/80 text-white'
                            : fac.status === 'in-use'
                            ? 'bg-amber-500/80 text-slate-950'
                            : 'bg-rose-500/80 text-white'
                        }`}
                      >
                        {fac.status === 'available'
                          ? 'Sedia'
                          : fac.status === 'in-use'
                          ? 'Digunakan'
                          : 'Penyelenggaraan'}
                      </span>
                    </div>

                    {/* Capacity / Stock Tag */}
                    <div className="absolute bottom-2 left-2.5 flex items-center gap-1 text-[11px] font-semibold text-white bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-xs">
                      {isAsset ? <Box className="w-3 h-3 text-amber-400" /> : <Users className="w-3 h-3 text-amber-400" />}
                      <span>
                        {isAsset ? `Stok: ${fac.capacity} Unit` : `Kapasiti: ${fac.capacity} Orang`}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-white group-hover:text-amber-400 transition mb-1">
                        {fac.name}
                      </h3>
                      <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed mb-3">
                        {fac.desc}
                      </p>
                    </div>

                    {/* Inventory snippet */}
                    <div className="pt-2 border-t border-slate-800/80 mb-3 text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{fac.inventory}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveDetailFacility(fac)}
                        className="p-2 rounded-xl bg-[#0A192F] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition"
                        title="Lihat Maklumat Penuh"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onSelectFacilityToBook(fac.id)}
                        className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-[0_2px_8px_0_rgba(245,158,11,0.25)] active:scale-95 cursor-pointer"
                      >
                        <span>Tempah</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Facility Detail Modal */}
      {activeDetailFacility && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#112240] border border-amber-500/30 rounded-3xl overflow-hidden shadow-2xl text-white animate-in zoom-in-95 duration-200">
            <div className="relative h-44 w-full bg-slate-900">
              <img
                src={activeDetailFacility.img}
                alt={activeDetailFacility.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#112240] via-transparent to-black/50" />
              <button
                onClick={() => setActiveDetailFacility(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition"
              >
                ✕
              </button>
              <div className="absolute bottom-3 left-4">
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 uppercase tracking-wider">
                  {activeDetailFacility.type}
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  {activeDetailFacility.name}
                </h3>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Penerangan</label>
                <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
                  {activeDetailFacility.desc}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-[#0A192F] p-3 rounded-2xl border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    {activeDetailFacility.type === 'ASET' ? 'Jumlah Unit Stok' : 'Kapasiti Maksimum'}
                  </span>
                  <span className="text-amber-400 font-bold text-sm">
                    {activeDetailFacility.capacity}{' '}
                    {activeDetailFacility.type === 'ASET' ? 'Unit' : 'Orang'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Status Semasa</span>
                  <span
                    className={`font-bold text-xs ${
                      activeDetailFacility.status === 'available'
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {activeDetailFacility.status === 'available'
                      ? 'Sedia Digunakan'
                      : 'Sedang Beroperasi'}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1 mb-1">
                  <Layers className="w-3 h-3 text-amber-400" />
                  <span>Senarai Peralatan & Inventori</span>
                </label>
                <div className="bg-[#0A192F] p-3 rounded-xl border border-slate-800 text-xs text-slate-300">
                  {activeDetailFacility.inventory}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => setActiveDetailFacility(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
                >
                  Tutup
                </button>
                <button
                  onClick={() => {
                    const id = activeDetailFacility.id;
                    setActiveDetailFacility(null);
                    onSelectFacilityToBook(id);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition shadow-md"
                >
                  Tempah Ini
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
