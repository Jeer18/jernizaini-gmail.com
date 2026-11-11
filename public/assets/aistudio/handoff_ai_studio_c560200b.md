# PROJECT HANDOFF: LUGOSS BOOKING APPS
**Context for Google AI Studio / LLM System Prompt**

Hello! You are now acting as the senior developer and maintainer for "Lugoss Booking Apps", a mobile-first web application built for a school environment to book facilities (rooms) and assets (equipment like chairs/projectors). 

Please read the following architecture, database schema, and full codebase to understand the current state of the project before answering any future prompts or making modifications.

---

## 1. TECH STACK & ARCHITECTURE
* **Frontend:** Single-file HTML (`dashboard.html`), styled with Tailwind CSS (via CDN) and FontAwesome icons. Responsive, but designed to look like a mobile app UI on desktop.
* **Backend:** Google Apps Script (`Code.gs`) deployed as a Web App.
* **Database:** Google Sheets (3 specific tabs: `Bookings`, `Facilities`, `Settings`).
* **Communication:** Frontend uses `fetch()` to send/receive JSON payloads to/from the GAS Web App URL. Includes a cache-buster parameter (`?t=timestamp`) to prevent stale data.

---

## 2. DATABASE SCHEMA (GOOGLE SHEETS)
The Google Sheet contains exactly 3 tabs.
1. **Bookings**: `ID`, `Nama Guru`, `No Telefon`, `ID Bilik`, `Nama Bilik`, `Tarikh`, `Masa Mula`, `Masa Tamat`, `Tujuan`, `Status` (MENUNGGU/LULUS/DITOLAK), `Kuantiti`, `Timestamp`.
2. **Facilities**: `ID`, `Nama`, `Kategori` (MAKMAL/DEWAN/ASET/dll), `Kapasiti`, `Penerangan`, `Inventori`, `Status` (available/in-use), `Gambar`.
3. **Settings**: Key-Value pairs (`Key`, `Value`). Keys used: `announcement`, `logoUrl`, `adminWhatsapp`, `adminPassword`.

---

## 3. BUSINESS LOGIC & RULES
* **Rooms vs. Assets:** If a facility is category "ASET", the UI dynamically shows a "Quantity" input field and *bypasses* the strict time-conflict validation (since multiple people can borrow parts of the asset stock). If it's a room (e.g., "MAKMAL"), time conflicts are strictly blocked in the frontend UI.
* **User Authentication:** Simple phone number login (stored in `localStorage`).
* **Admin Authentication:** Simple password login. Admin can approve/reject bookings and add/edit facilities.
* **Notifications:** Uses a semi-automated WhatsApp redirect to notify the admin after a booking is submitted.

---

## 4. BACKEND CODE (`Code.gs`)

```javascript
// ==========================================
// GOOGLE APPS SCRIPT: LUGOSS BOOKING APPS (VERSI ASET)
// ==========================================

function doGet(e) {
  var action = e.parameter.action;
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === "getData") {
    var result = {
      announcement: getSettingValue(doc, "announcement", "Selamat datang ke Lugoss Booking Apps."),
      logoUrl: getSettingValue(doc, "logoUrl", ""),
      adminWhatsapp: getSettingValue(doc, "adminWhatsapp", "60168510226"),
      adminPassword: getSettingValue(doc, "adminPassword", "admin123"),
      facilities: getFacilitiesData(doc),
      bookings: getBookingsData(doc)
    };
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var doc = SpreadsheetApp.getActiveSpreadsheet();

    // A. TAMBAH TEMPAHAN BAHARU (BESERTA KUANTITI)
    if (data.action === "addBooking") {
      var sheet = getOrCreateSheet(doc, "Bookings", ["ID", "Nama Guru", "No Telefon", "ID Bilik", "Nama Bilik", "Tarikh", "Masa Mula", "Masa Tamat", "Tujuan", "Status", "Kuantiti", "Timestamp"]);
      var newId = "BK-" + Date.now();
      var timestamp = new Date();
      var qty = data.quantity || 0; 
      
      sheet.appendRow([
        newId, data.applicantName, "'" + data.phoneNumber, data.roomId, data.roomName,
        data.date, data.time, data.endTime, data.purpose, "MENUNGGU", qty, timestamp
      ]);
      return responseJSON({ result: "success", id: newId });
    }

    // B. KEMASKINI STATUS TEMPAHAN (LULUS/DITOLAK)
    if (data.action === "updateBookingStatus") {
      var sheet = doc.getSheetByName("Bookings");
      if (sheet) {
        var rows = sheet.getDataRange().getValues();
        for (var i = 1; i < rows.length; i++) {
          if (rows[i][0] == data.id) {
            sheet.getRange(i + 1, 10).setValue(data.status); // Lajur 10 = Status
            return responseJSON({ result: "success" });
          }
        }
      }
      return responseJSON({ result: "error", message: "ID tidak dijumpai" });
    }

    // C. SIMPAN / KEMASKINI FASILITI ATAU ASET
    if (data.action === "saveFacility") {
      var sheet = getOrCreateSheet(doc, "Facilities", ["ID", "Nama", "Kategori", "Kapasiti", "Penerangan", "Inventori", "Status", "Gambar"]);
      var fac = data.facility;
      var rows = sheet.getDataRange().getValues();
      var foundIndex = -1;

      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] == fac.id) { foundIndex = i + 1; break; }
      }

      if (foundIndex > 0) {
        sheet.getRange(foundIndex, 2, 1, 7).setValues([[ fac.name, fac.type, fac.capacity, fac.desc, fac.inventory, fac.status, fac.img ]]);
      } else {
        sheet.appendRow([ fac.id, fac.name, fac.type, fac.capacity, fac.desc, fac.inventory, fac.status, fac.img ]);
      }
      return responseJSON({ result: "success" });
    }

    // D. KEMASKINI TETAPAN UI ADMIN
    if (data.action === "updateSettings") {
      if (data.announcement !== undefined) setSettingValue(doc, "announcement", data.announcement);
      if (data.logoUrl !== undefined) setSettingValue(doc, "logoUrl", data.logoUrl);
      if (data.adminWhatsapp !== undefined) setSettingValue(doc, "adminWhatsapp", data.adminWhatsapp);
      if (data.adminPassword !== undefined) setSettingValue(doc, "adminPassword", data.adminPassword);
      return responseJSON({ result: "success" });
    }

    // E. MUAT NAIK GAMBAR
    if (data.action === "uploadImage") {
      var folderName = "Lugoss_App_Images";
      var folders = DriveApp.getFoldersByName(folderName);
      var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
      var base64Data = data.base64.split(",")[1];
      var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), "image/png", data.fileName || "image_" + Date.now() + ".png");
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return responseJSON({ result: "success", imageUrl: "https://lh3.googleusercontent.com/d/" + file.getId() });
    }

  } catch (err) {
    return responseJSON({ result: "error", message: err.toString() });
  }
}

// FUNGSI BANTUAN
function getOrCreateSheet(doc, sheetName, headers) {
  var sheet = doc.getSheetByName(sheetName);
  if (!sheet) { sheet = doc.insertSheet(sheetName); sheet.appendRow(headers); }
  return sheet;
}

function getSettingValue(doc, key, defaultValue) {
  var sheet = doc.getSheetByName("Settings");
  if (!sheet) return defaultValue;
  var rows = sheet.getDataRange().getValues();
  for (var i = 0; i < rows.length; i++) { if (rows[i][0] == key) return rows[i][1]; }
  return defaultValue;
}

function setSettingValue(doc, key, value) {
  var sheet = getOrCreateSheet(doc, "Settings", ["Key", "Value"]);
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == key) { sheet.getRange(i + 1, 2).setValue(value); return; }
  }
  sheet.appendRow([key, value]);
}

function getFacilitiesData(doc) {
  var sheet = doc.getSheetByName("Facilities");
  if (!sheet) return [];
  var rows = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    result.push({ id: rows[i][0], name: rows[i][1], type: rows[i][2], capacity: rows[i][3], desc: rows[i][4], inventory: rows[i][5], status: rows[i][6], img: rows[i][7] });
  }
  return result;
}

function getBookingsData(doc) {
  var sheet = doc.getSheetByName("Bookings");
  if (!sheet) return [];
  var rows = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    result.push({
      id: rows[i][0], applicantName: rows[i][1], phoneNumber: String(rows[i][2]).replace("'", ""),
      roomId: rows[i][3], roomName: rows[i][4], date: formatDateString(rows[i][5]),
      time: rows[i][6], endTime: rows[i][7], purpose: rows[i][8], status: rows[i][9], quantity: rows[i][10]
    });
  }
  return result;
}

function formatDateString(dateVal) {
  if (dateVal instanceof Date) { return dateVal.getFullYear() + '-' + String(dateVal.getMonth() + 1).padStart(2, '0') + '-' + String(dateVal.getDate()).padStart(2, '0'); }
  return String(dateVal);
}

function responseJSON(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
```

---

## 5. FRONTEND CODE (`dashboard.html`)
*(Note: Remember to replace `MASUKKAN_WEB_APP_URL_ANDA_DI_SINI` with the actual deployment URL).*

```html
<!DOCTYPE html>
<html lang="ms">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lugoss Booking Apps</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = { theme: { extend: { fontFamily: { sans: ['Inter', 'sans-serif'], }, colors: { navy: '#0A192F', card: '#112240', gold: '#F59E0B', goldhover: '#D97706', dark: '#000000', darker: '#050505', } } } }
    </script>
    <style>
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .pulse-gold { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); animation: pulse-g 2s infinite; }
        @keyframes pulse-g { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(245, 158, 11, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); } }
        @media (min-width: 640px) { .phone-frame { height: 92vh; width: min(calc(92vh * 9 / 16), 430px); border-radius: 2.5rem; border: 8px solid #0A192F; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); } }
        @media (max-width: 639px) { .phone-frame { width: 100vw; height: 100dvh; border-radius: 0; border: none; } }
    </style>
</head>
<body class="bg-slate-950 flex justify-center items-center w-screen h-screen m-0 font-sans select-none overflow-hidden">
    <div class="phone-frame bg-dark relative overflow-hidden flex flex-col">
        
        <!-- LOGIN SCREEN -->
        <div id="userLoginScreen" class="absolute inset-0 bg-navy z-[200] flex flex-col items-center justify-center p-6 hidden">
            <div class="w-24 h-24 bg-white rounded-full flex items-center justify-center p-2 border-4 border-gold shadow-lg mb-6">
                <img id="loginLogo" src="" onerror="this.onerror=null; this.src='https://placehold.co/100x100/ffffff/0A192F?text=SMK+L'" class="w-full h-full object-contain">
            </div>
            <h2 class="text-2xl font-bold text-white mb-2 text-center">Selamat Datang</h2>
            <p class="text-gray-400 text-sm text-center mb-8">Sila masukkan No. Telefon / ID anda untuk mengakses sistem tempahan.</p>
            <div class="w-full bg-card p-6 rounded-2xl border border-gray-800 shadow-xl">
                <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">No. Telefon / ID Pengguna</label>
                <input type="tel" id="userPhoneInput" placeholder="Cth: 0123456789" class="w-full bg-navy text-center text-white border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-gold transition mb-4 tracking-widest text-lg font-bold">
                <button onclick="loginUser()" class="w-full bg-gold hover:bg-goldhover text-black font-bold py-3 rounded-xl transition shadow-[0_4px_14px_0_rgba(245,158,11,0.39)]">Log Masuk Sistem</button>
            </div>
        </div>

        <main class="flex-1 overflow-y-auto no-scrollbar pb-24 text-white relative">
            
            <!-- HOME VIEW -->
            <div id="view-home" class="page-view block">
                <div class="bg-navy rounded-b-[2.5rem] p-6 pt-10 sm:pt-12 relative overflow-hidden shadow-lg border-b border-card">
                    <div class="absolute -top-10 -right-10 w-40 h-40 bg-gold/10 rounded-full blur-2xl"></div>
                    <div class="flex justify-between items-center mb-6 relative z-10">
                        <div class="w-14 h-14 bg-white rounded-full flex items-center justify-center p-1.5 border-2 border-gold/50 shadow-lg shrink-0 overflow-hidden">
                            <img id="mainAppLogo" src="" onerror="this.onerror=null; this.src='https://placehold.co/100x100/ffffff/0A192F?text=SMK+L'" alt="Logo Sekolah" class="w-full h-full object-contain">
                        </div>
                        <div class="bg-card border border-gold/30 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold text-gold tracking-wider uppercase flex items-center shadow-md mx-2">
                            <i class="fa-solid fa-sparkles mr-2 text-gold"></i> Lugoss Booking Apps
                        </div>
                        <div class="w-14 h-14 rounded-full flex items-center justify-center relative cursor-pointer shrink-0" onclick="showModal('Notifikasi', 'Tiada makluman baharu setakat ini.')">
                            <i class="fa-regular fa-bell text-gray-300 text-2xl"></i>
                            <span class="absolute top-2 right-3 w-3 h-3 bg-gold rounded-full pulse-gold"></span>
                        </div>
                    </div>
                    <div class="flex justify-between items-end mb-1 relative z-10">
                        <h1 class="text-3xl font-bold text-white max-w-[200px] truncate">Hi, <span id="displayUserPhoneText" class="text-gold">Tetamu</span></h1>
                        <button onclick="logoutUser()" class="text-[10px] bg-red-500/10 border border-red-500/50 text-red-400 px-3 py-1.5 rounded-lg flex items-center backdrop-blur hover:bg-red-500/30 transition shadow-sm font-bold tracking-wide shrink-0"><i class="fa-solid fa-power-off mr-1.5"></i> Log Keluar</button>
                    </div>
                    <p class="text-sm text-gray-400 mb-8 relative z-10">Sistem Tempahan Fasiliti Sekolah</p>
                    <div class="bg-card rounded-2xl p-6 border border-gold/20 shadow-xl relative z-10 flex justify-between items-center">
                        <div>
                            <p class="text-xs text-gray-400 font-medium tracking-widest uppercase mb-1">TEMPAHAN SYSTEM <i class="fa-solid fa-circle-info text-gray-500 ml-1"></i></p>
                            <div class="flex items-baseline space-x-2"><span id="stat-total-bookings" class="text-5xl font-bold text-white">0</span><span class="text-gray-400 text-sm">Rekod</span></div>
                        </div>
                        <button onclick="switchTab('book')" class="bg-gold hover:bg-goldhover text-black font-bold py-3 px-5 sm:px-6 rounded-xl transition shadow-[0_4px_14px_0_rgba(245,158,11,0.39)] flex items-center text-sm">Tempah <br> Sekarang<i class="fa-solid fa-arrow-right ml-2 sm:ml-3"></i></button>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4 px-6 mt-6">
                    <div onclick="switchTab('book')" class="bg-card p-5 sm:p-6 rounded-2xl border border-gray-800 flex flex-col justify-center items-center text-center shadow-lg active:scale-95 transition cursor-pointer">
                        <div class="w-14 h-14 bg-navy rounded-full flex items-center justify-center mb-3 border border-gold/20 shadow-inner"><i class="fa-solid fa-calendar-plus text-gold text-2xl"></i></div>
                        <h3 class="text-white font-semibold text-sm sm:text-base">Tempah</h3><p class="text-gray-500 text-xs mt-1">Fasiliti & Aset</p>
                    </div>
                    <div onclick="switchTab('status')" class="bg-card p-5 sm:p-6 rounded-2xl border border-gray-800 flex flex-col justify-center items-center text-center shadow-lg active:scale-95 transition cursor-pointer">
                        <div class="w-14 h-14 bg-navy rounded-full flex items-center justify-center mb-3 border border-gold/20 shadow-inner"><i class="fa-solid fa-file-signature text-gold text-2xl"></i></div>
                        <h3 class="text-white font-semibold text-sm sm:text-base">Semak Status</h3><p class="text-gray-500 text-xs mt-1">Tempahan sedia ada</p>
                    </div>
                </div>

                <div class="px-6 mt-6">
                    <div class="bg-card border-l-4 border-gold rounded-r-xl py-4 px-5 flex items-center shadow-md">
                        <div class="bg-gold/10 p-2 rounded-full mr-4 shrink-0"><i class="fa-solid fa-bullhorn text-gold text-base"></i></div>
                        <p id="announcement-text" class="text-sm text-gray-300 line-clamp-2"><span class="text-gold font-semibold">MAKLUMAN:</span> Selamat datang.</p>
                    </div>
                </div>

                <div class="mt-8 px-6 mb-8">
                    <div class="flex justify-between items-end mb-4">
                        <h2 class="text-xl font-bold text-white">Fasiliti & Aset</h2>
                        <span class="text-sm text-gold flex items-center"><i class="fa-solid fa-arrows-left-right mr-1"></i> Leret</span>
                    </div>
                    <div id="facilities-container" class="flex overflow-x-auto space-x-4 no-scrollbar pb-2 cursor-grab active:cursor-grabbing"></div>
                </div>
            </div>

            <!-- BOOK VIEW -->
            <div id="view-book" class="page-view hidden">
                <div class="bg-navy px-6 py-6 pb-8 border-b border-card rounded-b-[2rem]">
                    <h1 class="text-2xl font-bold text-white mb-2">Borang Tempahan</h1>
                    <p class="text-sm text-gray-400">Lengkapkan butiran untuk meminjam fasiliti atau aset.</p>
                </div>
                <form class="px-6 -mt-4" onsubmit="submitBooking(event)">
                    <div class="bg-card rounded-2xl p-5 shadow-xl border border-gray-800 space-y-4">
                        <div>
                            <label class="block text-[11px] font-semibold text-gray-400 uppercase mb-2">Nama Guru Pemohon</label>
                            <input type="text" id="bookName" class="w-full bg-navy text-white border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-gold transition" required>
                        </div>
                        <div>
                            <label class="block text-[11px] font-semibold text-gray-400 uppercase mb-2">Nombor Telefon (ID)</label>
                            <input type="tel" id="bookPhone" class="w-full bg-navy text-gray-500 border border-gray-700 rounded-xl px-4 py-3 outline-none cursor-not-allowed" readonly required>
                        </div>
                        <hr class="border-gray-800 my-2">
                        <div>
                            <label class="block text-[11px] font-semibold text-gray-400 uppercase mb-2">Pilih Bilik / Aset</label>
                            <select id="roomSelect" class="w-full bg-navy text-white border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-gold transition appearance-none" required></select>
                        </div>
                        <div id="quantityContainer" class="hidden bg-gold/10 p-4 rounded-xl border border-gold/30">
                            <label class="block text-[11px] font-bold text-gold uppercase mb-2">Kuantiti Diperlukan</label>
                            <input type="number" id="bookQuantity" min="1" class="w-full bg-navy text-white border border-gold/50 rounded-xl px-4 py-3 outline-none focus:border-gold transition font-bold">
                            <p id="quantityHint" class="text-[10px] text-gray-400 mt-1"></p>
                        </div>
                        <div>
                            <label class="block text-[11px] font-semibold text-gray-400 uppercase mb-2">Tarikh Guna</label>
                            <input type="date" id="bookDate" class="w-full bg-navy text-white border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-gold transition color-scheme-dark" required>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-[11px] font-semibold text-gray-400 uppercase mb-2">Masa Mula</label>
                                <input type="time" id="bookTime" class="w-full bg-navy text-white border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-gold transition color-scheme-dark" required>
                            </div>
                            <div>
                                <label class="block text-[11px] font-semibold text-gray-400 uppercase mb-2">Masa Tamat</label>
                                <input type="time" id="bookEndTime" class="w-full bg-navy text-white border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-gold transition color-scheme-dark" required>
                            </div>
                        </div>
                        <div>
                            <label class="block text-[11px] font-semibold text-gray-400 uppercase mb-2">Tujuan Penggunaan</label>
                            <input type="text" id="bookPurpose" class="w-full bg-navy text-white border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-gold transition placeholder-gray-600" required>
                        </div>
                        <div id="conflictWarning" class="hidden bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 mt-2 transition-all duration-300">
                            <i class="fa-solid fa-triangle-exclamation mr-1.5"></i> <span id="conflictText">Masa bertindih!</span>
                        </div>
                        <button type="submit" id="btnSubmitBooking" class="w-full bg-gold hover:bg-goldhover text-black font-bold py-4 rounded-xl shadow-[0_4px_14px_0_rgba(245,158,11,0.39)] transition mt-4">Hantar Permohonan</button>
                    </div>
                </form>
            </div>

            <!-- STATUS VIEW -->
            <div id="view-status" class="page-view hidden">
                <div class="bg-navy px-6 py-6 border-b border-card flex justify-between items-center">
                    <div><h1 class="text-2xl font-bold text-white mb-1">Status Tempahan</h1><p class="text-sm text-gray-400">Rekod terkini</p></div>
                    <button onclick="fetchCloudData()" class="bg-card p-2.5 rounded-full border border-gold/30 text-gold hover:bg-gold hover:text-black transition"><i class="fa-solid fa-rotate"></i></button>
                </div>
                <div class="px-4 pt-4 flex space-x-2">
                    <button id="btn-status-me" onclick="setBookingView('me')" class="flex-1 bg-gold text-black py-2 rounded-lg text-xs font-bold transition shadow-md">Tempahan Saya</button>
                    <button id="btn-status-all" onclick="setBookingView('all')" class="flex-1 bg-navy border border-gray-700 text-gray-400 py-2 rounded-lg text-xs font-bold transition">Jadual Umum</button>
                </div>
                <div class="px-4 py-4 space-y-4" id="status-list-container"></div>
            </div>

            <!-- ADMIN VIEW -->
            <div id="view-admin" class="page-view hidden">
                <div class="bg-navy px-6 py-6 border-b border-gold/30">
                    <div class="flex justify-between items-center mb-2"><h1 class="text-2xl font-bold text-gold">Zon Pentadbir</h1><button onclick="logoutAdmin()" id="btnLogout" class="hidden text-xs bg-gray-800 text-gray-300 px-3 py-1 rounded-full border border-gray-700">Keluar</button></div>
                    <p class="text-sm text-gray-400">Kawalan sistem dan kelulusan automatik.</p>
                </div>
                <div id="admin-login-section" class="px-6 py-12 flex flex-col items-center justify-center">
                    <div class="w-full bg-card p-6 rounded-2xl border border-gray-800 shadow-xl">
                        <label class="block text-xs font-semibold text-gray-400 uppercase mb-2">Kata Laluan</label>
                        <input type="password" id="adminPassword" class="w-full bg-navy text-center text-white border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-gold transition mb-4">
                        <button onclick="attemptAdminLogin()" class="w-full bg-gold hover:bg-goldhover text-black font-bold py-3 rounded-xl transition">Log Masuk</button>
                    </div>
                </div>
                <div id="admin-dashboard-section" class="hidden flex-col h-full">
                    <div class="flex overflow-x-auto space-x-2 px-4 py-3 no-scrollbar border-b border-gray-800 bg-card/50">
                        <button onclick="switchAdminTab('approval')" id="adm-tab-approval" class="adm-tab whitespace-nowrap bg-gold text-black px-4 py-1.5 rounded-full text-xs font-bold transition">Kelulusan</button>
                        <button onclick="switchAdminTab('facilities')" id="adm-tab-facilities" class="adm-tab whitespace-nowrap bg-navy text-gray-400 border border-gray-700 px-4 py-1.5 rounded-full text-xs font-bold transition">Fasiliti/Aset</button>
                        <button onclick="switchAdminTab('settings')" id="adm-tab-settings" class="adm-tab whitespace-nowrap bg-navy text-gray-400 border border-gray-700 px-4 py-1.5 rounded-full text-xs font-bold transition">Tetapan UI</button>
                    </div>
                    <div id="adm-view-approval" class="adm-view block px-4 py-4"><div id="admin-approval-list" class="space-y-3"></div></div>
                    <div id="adm-view-facilities" class="adm-view hidden px-4 py-4"><button onclick="openAdminFacilityForm()" class="mb-4 text-[10px] bg-gold/20 text-gold px-2.5 py-1.5 rounded">Tambah</button><div id="admin-facilities-list" class="space-y-3"></div></div>
                    <div id="adm-view-settings" class="adm-view hidden px-4 py-4">
                        <textarea id="adminAnnouncementInput" rows="3" class="w-full bg-navy text-white text-sm border border-gray-700 rounded-xl px-3 py-2 mb-4"></textarea>
                        <input type="tel" id="adminWhatsappInput" class="w-full bg-navy text-white text-sm border border-gray-700 rounded-xl px-3 py-2 mb-4">
                        <input type="text" id="adminPasswordInput" placeholder="New Password" class="w-full bg-navy text-white text-sm border border-gray-700 rounded-xl px-3 py-2 mb-4">
                        <button onclick="updateSettingsData()" class="w-full bg-gold hover:bg-goldhover text-black font-bold py-3 rounded-xl transition text-sm">Simpan Perubahan</button>
                    </div>
                </div>
            </div>
        </main>

        <!-- NAVIGATION -->
        <nav class="absolute bottom-0 w-full bg-card border-t border-gray-800 px-6 py-4 flex justify-between items-center z-50 rounded-t-2xl shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
            <button onclick="switchTab('home')" class="nav-btn active flex flex-col items-center p-2 text-gold transition" data-target="home"><i class="fa-solid fa-house text-2xl mb-1.5"></i><span class="text-xs font-medium tracking-wide">Utama</span></button>
            <button onclick="switchTab('book')" class="nav-btn flex flex-col items-center p-2 text-gray-500 transition" data-target="book"><i class="fa-solid fa-calendar-plus text-2xl mb-1.5"></i><span class="text-xs font-medium tracking-wide">Tempah</span></button>
            <button onclick="switchTab('status')" class="nav-btn flex flex-col items-center p-2 text-gray-500 transition" data-target="status"><i class="fa-solid fa-list-check text-2xl mb-1.5"></i><span class="text-xs font-medium tracking-wide">Status</span></button>
            <button onclick="switchTab('admin')" class="nav-btn flex flex-col items-center p-2 text-gray-500 transition" data-target="admin"><i class="fa-solid fa-user-shield text-2xl mb-1.5"></i><span class="text-xs font-medium tracking-wide">Admin</span></button>
        </nav>
    </div>

    <!-- Modals Structure Simplified for brevity, same as previous implementations -->
    <div id="customModal" class="absolute inset-0 bg-black/80 z-[100] flex items-center justify-center hidden opacity-0 transition-opacity"><div class="bg-card rounded-2xl p-6 w-[85%] max-w-sm mx-auto" id="modalContent"><h3 id="modalTitle" class="text-lg font-bold text-center text-white mb-2"></h3><p id="modalMessage" class="text-center text-gray-400 text-sm mb-6"></p><button onclick="closeModal()" class="w-full bg-gold py-3 rounded-xl">Tutup</button></div></div>
    
    <div id="whatsappModal" class="absolute inset-0 bg-black/80 z-[150] flex items-center justify-center hidden opacity-0 transition-opacity"><div class="bg-card rounded-2xl p-6 w-[85%] max-w-sm mx-auto text-center" id="whatsappModalContent"><h3 class="text-lg font-bold text-white mb-2">Tempahan Dihantar!</h3><a id="btnWhatsappAdmin" href="#" target="_blank" onclick="closeWhatsappModal()" class="flex justify-center items-center w-full bg-green-500 text-white font-bold py-3.5 rounded-xl mb-3"><i class="fa-brands fa-whatsapp text-xl mr-2"></i> Maklumkan Admin</a></div></div>

    <script>
        const GOOGLE_SCRIPT_URL = "MASUKKAN_WEB_APP_URL_ANDA_DI_SINI";
        
        let ADMIN_WHATSAPP_NUMBER = "60168510226"; let ADMIN_PASSWORD = "admin123";
        let isAdmin = false; let isDragging = false; let editingFacilityId = null; let uploadedBase64Image = null;
        let facilitiesData = []; let bookingsData = []; let currentUserPhone = localStorage.getItem('lugossUserPhone') || '';
        let currentStatusView = 'me';

        document.addEventListener('DOMContentLoaded', () => { checkUserLogin(); initDragToScroll(); fetchCloudData();
            document.getElementById('roomSelect').addEventListener('input', (e) => { checkTimeConflict(); handleRoomSelection(e); });
            ['bookDate', 'bookTime', 'bookEndTime'].forEach(id => document.getElementById(id).addEventListener('input', checkTimeConflict));
        });

        function handleRoomSelection(e) {
            const fac = facilitiesData.find(f => f.id === e.target.value);
            const qtyContainer = document.getElementById('quantityContainer'); const qtyInput = document.getElementById('bookQuantity');
            if (fac && fac.type === 'ASET') { qtyContainer.classList.remove('hidden'); qtyInput.max = fac.capacity; qtyInput.required = true; document.getElementById('quantityHint').innerHTML = `Maksimum: <b>${fac.capacity} Unit</b>`; } 
            else { qtyContainer.classList.add('hidden'); qtyInput.required = false; qtyInput.value = ''; }
        }

        function checkTimeConflict() {
            const roomSelect = document.getElementById('roomSelect'); const date = document.getElementById('bookDate').value; const startTime = document.getElementById('bookTime').value; const endTime = document.getElementById('bookEndTime').value;
            const warningDiv = document.getElementById('conflictWarning'); const submitBtn = document.getElementById('btnSubmitBooking');
            if (!roomSelect.value || !date || !startTime || !endTime) { warningDiv.classList.add('hidden'); submitBtn.disabled = false; return; }

            const fac = facilitiesData.find(f => f.id === roomSelect.value);
            if (fac && fac.type === 'ASET') { warningDiv.classList.add('hidden'); submitBtn.disabled = false; return; } // Aset tidak block masa

            if (startTime >= endTime) { document.getElementById('conflictText').innerText = "Masa tidak sah."; warningDiv.classList.remove('hidden'); submitBtn.disabled = true; return; }
            
            const roomName = roomSelect.options[roomSelect.selectedIndex].text;
            const hasConflict = bookingsData.some(b => {
                if (b.roomName === roomName && b.date === date && b.status !== 'DITOLAK') {
                    let bTime = typeof b.time==='string'&&b.time.includes('T') ? new Date(b.time).toTimeString().substring(0,5) : b.time;
                    let bEndTime = typeof b.endTime==='string'&&b.endTime.includes('T') ? new Date(b.endTime).toTimeString().substring(0,5) : b.endTime;
                    if (startTime < bEndTime && endTime > bTime) { document.getElementById('conflictText').innerHTML = `Telah ditempah oleh <b>${b.applicantName}</b> (${bTime}-${bEndTime}).`; return true; }
                }
                return false;
            });
            if (hasConflict) { warningDiv.classList.remove('hidden'); submitBtn.disabled = true; } else { warningDiv.classList.add('hidden'); submitBtn.disabled = false; }
        }

        function checkUserLogin() { if(!currentUserPhone) { document.getElementById('userLoginScreen').classList.remove('hidden'); } else { document.getElementById('userLoginScreen').classList.add('hidden'); document.getElementById('displayUserPhoneText').innerText = currentUserPhone.substring(0, 6) + '***'; document.getElementById('bookPhone').value = currentUserPhone; } }
        function loginUser() { const phone = document.getElementById('userPhoneInput').value.trim(); if(phone.length < 8) { showModal("Ralat", "Sila masukkan ID yang sah."); return; } currentUserPhone = phone; localStorage.setItem('lugossUserPhone', currentUserPhone); checkUserLogin(); renderBookingsStatus(); }
        function logoutUser() { localStorage.removeItem('lugossUserPhone'); currentUserPhone = ''; document.getElementById('userPhoneInput').value = ''; checkUserLogin(); }

        function fetchCloudData() {
            if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes("MASUKKAN_WEB_APP_URL")) return;
            fetch(GOOGLE_SCRIPT_URL + '?action=getData&t=' + new Date().getTime())
                .then(res => res.json())
                .then(data => {
                    if (data.announcement) { document.getElementById('announcement-text').innerHTML = data.announcement; document.getElementById('adminAnnouncementInput').value = data.announcement; }
                    if (data.adminWhatsapp) { ADMIN_WHATSAPP_NUMBER = data.adminWhatsapp; document.getElementById('adminWhatsappInput').value = data.adminWhatsapp; }
                    if (data.adminPassword) ADMIN_PASSWORD = data.adminPassword;
                    if (data.facilities) { facilitiesData = data.facilities; renderFacilities(); populateRoomDropdown(); if(isAdmin) renderAdminFacilities(); }
                    if (data.bookings) { bookingsData = data.bookings; renderBookingsStatus(); if(isAdmin) renderAdminApprovalList(); document.getElementById('stat-total-bookings').innerText = bookingsData.length; }
                }).catch(err => console.log(err));
        }

        function populateRoomDropdown() { const select = document.getElementById('roomSelect'); select.innerHTML = '<option value="" disabled selected>-- Pilih --</option>'; facilitiesData.forEach(fac => { select.innerHTML += `<option value="${fac.id}">${fac.type === 'ASET' ? '[ASET] ' : ''}${fac.name}</option>`; }); }
        
        function submitBooking(e) {
            e.preventDefault(); if (document.getElementById('btnSubmitBooking').disabled) return;
            const roomSelect = document.getElementById('roomSelect'); const qtyInput = document.getElementById('bookQuantity');
            let finalQty = qtyInput.value ? parseInt(qtyInput.value) : 0;
            const payload = { action: "addBooking", applicantName: document.getElementById('bookName').value, phoneNumber: document.getElementById('bookPhone').value, roomId: roomSelect.value, roomName: roomSelect.options[roomSelect.selectedIndex].text.replace('[ASET] ', ''), date: document.getElementById('bookDate').value, time: document.getElementById('bookTime').value, endTime: document.getElementById('bookEndTime').value, purpose: document.getElementById('bookPurpose').value, quantity: finalQty };
            
            showModal('Penghantaran...', 'Sedang menyimpan...');
            fetch(GOOGLE_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) }).then(() => {
                document.getElementById('customModal').classList.add('hidden');
                document.getElementById('btnWhatsappAdmin').href = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=Salam Admin, permohonan baru.`;
                document.getElementById('whatsappModal').classList.remove('hidden'); document.getElementById('whatsappModal').classList.remove('opacity-0');
                e.target.reset(); document.getElementById('quantityContainer').classList.add('hidden');
            });
        }
        
        // ... (Remaining rendering logic for UI matches previous dashboard functions) ...
        function showModal(title, msg) { document.getElementById('modalTitle').innerText = title; document.getElementById('modalMessage').innerText = msg; document.getElementById('customModal').classList.remove('hidden', 'opacity-0'); }
        function closeModal() { document.getElementById('customModal').classList.add('hidden', 'opacity-0'); }
        function closeWhatsappModal() { document.getElementById('whatsappModal').classList.add('hidden', 'opacity-0'); switchTab('status'); fetchCloudData(); }
        function switchTab(tabId) { document.querySelectorAll('.page-view').forEach(v => { v.classList.add('hidden'); v.classList.remove('block'); }); document.getElementById('view-' + tabId).classList.remove('hidden'); document.getElementById('view-' + tabId).classList.add('block'); if (tabId === 'status') fetchCloudData(); }
        
        // Setup placeholders for complex renders to save prompt space
        function renderFacilities() { document.getElementById('facilities-container').innerHTML = facilitiesData.map(f => `<div class="bg-card p-4 rounded text-sm text-white">${f.name}</div>`).join(''); }
        function renderBookingsStatus() { document.getElementById('status-list-container').innerHTML = bookingsData.map(b => `<div class="bg-card p-3 rounded text-sm text-white">${b.roomName} - ${b.status}</div>`).join(''); }
        function renderAdminApprovalList() { document.getElementById('admin-approval-list').innerHTML = bookingsData.map(b => `<div class="bg-card p-2 rounded text-white">${b.roomName} - <button onclick="updateBookingStatusCloud('${b.id}', 'LULUS')">LULUS</button></div>`).join(''); }
        function updateBookingStatusCloud(id, s) { fetch(GOOGLE_SCRIPT_URL, {method:'POST', body:JSON.stringify({action:'updateBookingStatus', id:id, status:s})}).then(fetchCloudData); }
        function attemptAdminLogin() { if(document.getElementById('adminPassword').value === ADMIN_PASSWORD) { isAdmin = true; document.getElementById('admin-login-section').classList.add('hidden'); document.getElementById('admin-dashboard-section').classList.remove('hidden'); fetchCloudData(); } }
        function logoutAdmin() { isAdmin = false; switchTab('home'); }
        function switchAdminTab(t) { document.querySelectorAll('.adm-view').forEach(v => { v.classList.add('hidden'); v.classList.remove('block'); }); document.getElementById('adm-view-' + t).classList.remove('hidden'); document.getElementById('adm-view-' + t).classList.add('block'); }
        function updateSettingsData() { fetch(GOOGLE_SCRIPT_URL, {method:'POST', body:JSON.stringify({action:'updateSettings', announcement: document.getElementById('adminAnnouncementInput').value, adminWhatsapp: document.getElementById('adminWhatsappInput').value})}).then(fetchCloudData); }
        function initDragToScroll() {} // implementation placeholder
    </script>
</body>
</html>
```