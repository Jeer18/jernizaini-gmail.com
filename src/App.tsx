import React, { useState, useEffect } from 'react';
import { AppSettings, Booking, Facility } from './types';
import { DEFAULT_BOOKINGS, DEFAULT_FACILITIES, DEFAULT_SETTINGS } from './data/initialData';
import { Header } from './components/Header';
import { LoginModal } from './components/LoginModal';
import { HomeView } from './components/HomeView';
import { BookView } from './components/BookView';
import { StatusView } from './components/StatusView';
import { AdminView } from './components/AdminView';
import { BottomNav } from './components/BottomNav';
import { syncWithGasBackend } from './utils/bookingUtils';

export default function App() {
  // 1. User Authentication
  const [currentUserPhone, setCurrentUserPhone] = useState<string>(() => {
    return localStorage.getItem('lugossUserPhone') || '0123456789';
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // 2. Admin Authentication
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('lugossAdminLoggedIn') === 'true';
  });

  // 3. Settings State
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('lugossSettings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Failed to parse settings:', e);
      }
    }
    return DEFAULT_SETTINGS;
  });

  // 4. Facilities State
  const [facilities, setFacilities] = useState<Facility[]>(() => {
    const saved = localStorage.getItem('lugossFacilities');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse facilities:', e);
      }
    }
    return DEFAULT_FACILITIES;
  });

  // 5. Bookings State
  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('lugossBookings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse bookings:', e);
      }
    }
    return DEFAULT_BOOKINGS;
  });

  // 6. Navigation and UI Layout
  const [activeTab, setActiveTab] = useState<'home' | 'book' | 'status' | 'admin'>('home');
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('lugossUserPhone', currentUserPhone);
  }, [currentUserPhone]);

  useEffect(() => {
    localStorage.setItem('lugossAdminLoggedIn', String(isAdminLoggedIn));
  }, [isAdminLoggedIn]);

  useEffect(() => {
    localStorage.setItem('lugossSettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('lugossFacilities', JSON.stringify(facilities));
  }, [facilities]);

  useEffect(() => {
    localStorage.setItem('lugossBookings', JSON.stringify(bookings));
  }, [bookings]);

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Auth Handlers
  const handleLogin = (phone: string, name?: string) => {
    setCurrentUserPhone(phone);
    setIsLoginModalOpen(false);
    showToast(name ? `Selamat datang, ${name}!` : 'Log masuk berjaya!');
  };

  const handleLogout = () => {
    setCurrentUserPhone('');
    localStorage.removeItem('lugossUserPhone');
    setIsLoginModalOpen(true);
    showToast('Anda telah berjaya log keluar.');
  };

  const handleAdminLogin = (password: string): boolean => {
    if (password === settings.adminPassword) {
      setIsAdminLoggedIn(true);
      showToast('Log masuk Pentadbir berjaya!');
      return true;
    }
    return false;
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    showToast('Log keluar Pentadbir berjaya.');
  };

  // Booking Handlers
  const handleSubmitBooking = (newBooking: Booking) => {
    setBookings((prev) => [newBooking, ...prev]);

    // Background sync with Google Sheets if URL provided
    if (settings.gasWebAppUrl) {
      syncWithGasBackend(settings.gasWebAppUrl, 'addBooking', {
        id: newBooking.id,
        applicantName: newBooking.applicantName,
        phoneNumber: newBooking.phoneNumber,
        roomId: newBooking.roomId,
        roomName: newBooking.roomName,
        date: newBooking.date,
        time: newBooking.time,
        endTime: newBooking.endTime,
        purpose: newBooking.purpose,
        quantity: newBooking.quantity,
        status: newBooking.status,
      }).then(() => {
        showToast(`Tempahan ${newBooking.roomName} berjaya disimpan & disegerak ke Google Sheet!`);
      });
    } else {
      showToast(`Tempahan ${newBooking.roomName} berjaya disimpan!`);
    }
  };

  const handleCancelBooking = (bookingId: string) => {
    setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    showToast('Permohonan tempahan telah dibatalkan.');
  };

  const handleUpdateBookingStatus = (
    bookingId: string,
    status: 'LULUS' | 'DITOLAK',
    notes?: string
  ) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId ? { ...b, status, adminNotes: notes || b.adminNotes } : b
      )
    );

    // Optional GAS sync
    if (settings.gasWebAppUrl) {
      syncWithGasBackend(settings.gasWebAppUrl, 'updateBookingStatus', {
        id: bookingId,
        status,
      });
    }

    showToast(
      status === 'LULUS'
        ? 'Tempahan telah diluluskan!'
        : 'Tempahan telah ditolak.'
    );
  };

  // Facility Handlers
  const handleSaveFacility = (facilityData: Facility) => {
    setFacilities((prev) => {
      const index = prev.findIndex((f) => f.id === facilityData.id);
      if (index >= 0) {
        const copy = [...prev];
        copy[index] = facilityData;
        return copy;
      } else {
        return [facilityData, ...prev];
      }
    });

    if (settings.gasWebAppUrl) {
      syncWithGasBackend(settings.gasWebAppUrl, 'saveFacility', {
        facility: {
          id: facilityData.id,
          name: facilityData.name,
          type: facilityData.type,
          capacity: facilityData.capacity,
          desc: facilityData.desc,
          inventory: facilityData.inventory,
          status: facilityData.status,
          img: facilityData.img,
        },
      });
    }

    showToast('Fasiliti/Aset berjaya disimpan!');
  };

  const handleDeleteFacility = (facilityId: string) => {
    setFacilities((prev) => prev.filter((f) => f.id !== facilityId));
    showToast('Fasiliti/Aset telah dipadam.');
  };

  // Settings & Reset
  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    if (settings.gasWebAppUrl) {
      syncWithGasBackend(settings.gasWebAppUrl, 'updateSettings', newSettings);
    }
    showToast('Tetapan telah dikemaskini.');
  };

  const handleResetData = () => {
    setFacilities(DEFAULT_FACILITIES);
    setBookings(DEFAULT_BOOKINGS);
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('lugossFacilities');
    localStorage.removeItem('lugossBookings');
    localStorage.removeItem('lugossSettings');
    showToast('Data telah diset semula kepada contoh asal.');
  };

  const handleRefreshData = async () => {
    if (settings.gasWebAppUrl) {
      const data = await syncWithGasBackend(settings.gasWebAppUrl, 'getData');
      if (data) {
        if (data.facilities) setFacilities(data.facilities);
        if (data.bookings) setBookings(data.bookings);
        if (data.announcement) {
          setSettings((prev) => ({ ...prev, announcement: data.announcement }));
        }
        showToast('Data disegerakkan dari Google Sheets!');
        return;
      }
    }
    showToast('Data dimuat semula.');
  };

  const handleSelectFacilityToBook = (facilityId: string) => {
    setSelectedFacilityId(facilityId);
    setActiveTab('book');
  };

  const pendingApprovalsCount = bookings.filter((b) => b.status === 'MENUNGGU').length;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans antialiased selection:bg-amber-500/30 selection:text-amber-300">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-4 z-50 px-4 py-2.5 rounded-2xl bg-amber-500 text-slate-950 font-bold text-xs shadow-2xl animate-in slide-in-from-top-4 duration-300 flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container - Phone Mockup or Full Screen */}
      <div
        className={`w-full transition-all duration-300 flex flex-col bg-[#0A192F] relative overflow-hidden ${
          isPhoneFrame
            ? 'sm:my-4 sm:max-w-[430px] sm:h-[94vh] sm:rounded-[2.5rem] sm:border-[8px] sm:border-[#112240] sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)]'
            : 'max-w-2xl min-h-screen sm:rounded-none sm:border-none'
        } min-h-screen sm:min-h-0`}
      >
        {/* Header */}
        <Header
          settings={settings}
          userPhone={currentUserPhone}
          onLogout={handleLogout}
          onOpenLogin={() => setIsLoginModalOpen(true)}
          isPhoneFrame={isPhoneFrame}
          onToggleFrame={() => setIsPhoneFrame(!isPhoneFrame)}
          pendingCount={pendingApprovalsCount}
        />

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-5 pb-24 text-white relative">
          {activeTab === 'home' && (
            <HomeView
              settings={settings}
              facilities={facilities}
              bookings={bookings}
              onSelectFacilityToBook={handleSelectFacilityToBook}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'book' && (
            <BookView
              settings={settings}
              facilities={facilities}
              bookings={bookings}
              currentUserPhone={currentUserPhone}
              selectedFacilityId={selectedFacilityId}
              onClearSelectedFacility={() => setSelectedFacilityId(null)}
              onSubmitBooking={handleSubmitBooking}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'status' && (
            <StatusView
              settings={settings}
              bookings={bookings}
              currentUserPhone={currentUserPhone}
              onCancelBooking={handleCancelBooking}
              onRefreshData={handleRefreshData}
            />
          )}

          {activeTab === 'admin' && (
            <AdminView
              settings={settings}
              facilities={facilities}
              bookings={bookings}
              isAdminLoggedIn={isAdminLoggedIn}
              onAdminLogin={handleAdminLogin}
              onAdminLogout={handleAdminLogout}
              onUpdateBookingStatus={handleUpdateBookingStatus}
              onSaveFacility={handleSaveFacility}
              onDeleteFacility={handleDeleteFacility}
              onUpdateSettings={handleUpdateSettings}
              onResetData={handleResetData}
              onRefreshData={handleRefreshData}
            />
          )}
        </main>

        {/* Bottom Navigation */}
        <BottomNav
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          pendingApprovalsCount={pendingApprovalsCount}
        />

        {/* User Login Modal */}
        {isLoginModalOpen && (
          <LoginModal
            settings={settings}
            onLogin={handleLogin}
            onClose={() => setIsLoginModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
