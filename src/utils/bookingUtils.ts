import { Booking, Facility } from '../types';

export interface ConflictCheckResult {
  hasConflict: boolean;
  message?: string;
  conflictingBooking?: Booking;
}

/**
 * Normalizes phone number into Malaysian international format (e.g. 60123456789)
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('60')) {
    return cleaned;
  }
  if (cleaned.startsWith('0')) {
    return '60' + cleaned.slice(1);
  }
  return cleaned;
}

/**
 * Checks for time conflict in room bookings.
 * Note: ASSETS ('ASET') do not block time because multiple teachers can borrow portions of the asset stock.
 */
export function checkBookingTimeConflict(
  selectedFacility: Facility | undefined,
  date: string,
  startTime: string,
  endTime: string,
  allBookings: Booking[],
  excludeBookingId?: string
): ConflictCheckResult {
  if (!selectedFacility || !date || !startTime || !endTime) {
    return { hasConflict: false };
  }

  // ASSETS bypass time conflict validation
  if (selectedFacility.type === 'ASET') {
    return { hasConflict: false };
  }

  // Validate start vs end time
  if (startTime >= endTime) {
    return {
      hasConflict: true,
      message: 'Masa mula mestilah lebih awal daripada masa tamat penggunaan.',
    };
  }

  // Compare against active (non-rejected) bookings for the same room on the same date
  const conflict = allBookings.find((b) => {
    if (excludeBookingId && b.id === excludeBookingId) return false;
    if (b.status === 'DITOLAK') return false;
    if (b.roomId !== selectedFacility.id && b.roomName.toLowerCase() !== selectedFacility.name.toLowerCase()) {
      return false;
    }
    if (b.date !== date) return false;

    // Normalizing times (format HH:mm)
    const existingStart = b.time.includes('T')
      ? b.time.split('T')[1].substring(0, 5)
      : b.time.substring(0, 5);
    const existingEnd = b.endTime.includes('T')
      ? b.endTime.split('T')[1].substring(0, 5)
      : b.endTime.substring(0, 5);

    // Overlap condition: start < existingEnd && end > existingStart
    return startTime < existingEnd && endTime > existingStart;
  });

  if (conflict) {
    return {
      hasConflict: true,
      message: `Bilik ini telah ditempah oleh ${conflict.applicantName} (${conflict.time} - ${conflict.endTime}) bagi tujuan: "${conflict.purpose}".`,
      conflictingBooking: conflict,
    };
  }

  return { hasConflict: false };
}

/**
 * Formats a date string (e.g., 'YYYY-MM-DD' or ISO) to 'DD/MM/YY' format (e.g., '15/11/26')
 * for cleaner readability by administrators and users on WhatsApp.
 */
export function formatDateToDDMMYY(dateStr: string): string {
  if (!dateStr) return '';
  // Check if dateStr matches YYYY-MM-DD
  const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    const [, yyyy, mm, dd] = match;
    const formattedDay = dd.padStart(2, '0');
    const formattedMonth = mm.padStart(2, '0');
    const formattedYear = yyyy.slice(-2);
    return `${formattedDay}/${formattedMonth}/${formattedYear}`;
  }

  // Fallback using Date object if different format
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  }

  return dateStr;
}

/**
 * Constructs the WhatsApp URL to notify admin upon booking submission
 */
export function buildAdminWhatsappUrl(
  adminWhatsapp: string,
  booking: Booking,
  facility?: Facility
): string {
  const cleanNumber = formatPhoneNumber(adminWhatsapp);
  const isAsset = facility?.type === 'ASET' || booking.quantity > 0;
  const formattedDate = formatDateToDDMMYY(booking.date);

  const lines = [
    '🔔 *TEMPAHAN BAHARU - LUGOSS BOOKING APPS*',
    '--------------------------------------',
    `*Pemohon:* ${booking.applicantName}`,
    `*No. Telefon:* ${booking.phoneNumber}`,
    `*Fasiliti / Aset:* ${booking.roomName}${isAsset ? ` (Kuantiti: ${booking.quantity} Unit)` : ''}`,
    `*Tarikh Guna:* ${formattedDate}`,
    `*Masa:* ${booking.time} hingga ${booking.endTime}`,
    `*Tujuan:* ${booking.purpose}`,
    `*ID Tempahan:* ${booking.id}`,
    '--------------------------------------',
    'Salam Admin, mohon semak dan luluskan permohonan ini di portal sistem. Terima kasih.',
  ];

  const message = lines.join('\n');
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Constructs the WhatsApp URL for admin to notify teacher about approval or rejection
 */
export function buildTeacherNotificationWhatsappUrl(
  teacherPhone: string,
  booking: Booking,
  newStatus: 'LULUS' | 'DITOLAK',
  notes?: string
): string {
  const cleanNumber = formatPhoneNumber(teacherPhone);
  const statusEmoji = newStatus === 'LULUS' ? '✅' : '❌';
  const statusText = newStatus === 'LULUS' ? 'DILULUSKAN' : 'DITOLAK';
  const formattedDate = formatDateToDDMMYY(booking.date);

  const lines = [
    `${statusEmoji} *STATUS TEMPAHAN: ${statusText}*`,
    '--------------------------------------',
    `Salam sejahtera ${booking.applicantName},`,
    `Permohonan tempahan anda di *Lugoss Booking Apps* telah diproses:`,
    '',
    `*ID Tempahan:* ${booking.id}`,
    `*Fasiliti / Aset:* ${booking.roomName}${booking.quantity > 0 ? ` (${booking.quantity} Unit)` : ''}`,
    `*Tarikh Guna:* ${formattedDate}`,
    `*Masa:* ${booking.time} - ${booking.endTime}`,
    `*Status:* ${statusText}`,
    ...(notes ? [`*Catatan Admin:* ${notes}`] : []),
    '--------------------------------------',
    'Sila simpan mesej ini sebagai bukti kelulusan rasmi sekolah. Terima kasih.',
  ];

  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(lines.join('\n'))}`;
}

/**
 * Sends a payload to Google Apps Script Web App.
 * Uses text/plain to avoid preflight CORS, and falls back to mode: 'no-cors' if needed.
 */
export async function syncWithGasBackend(
  gasUrl: string,
  action: string,
  payload?: any
): Promise<any> {
  if (!gasUrl || gasUrl.trim() === '' || gasUrl.includes('MASUKKAN_WEB_APP_URL')) {
    return null;
  }

  const cleanUrl = gasUrl.trim();

  try {
    if (action === 'getData') {
      const res = await fetch(`${cleanUrl}?action=getData&t=${Date.now()}`);
      if (!res.ok) throw new Error(`GAS error: ${res.statusText}`);
      return await res.json();
    } else {
      // Standard fetch with text/plain (avoids CORS preflight)
      try {
        const res = await fetch(cleanUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action, ...payload }),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (postErr) {
        // Fallback for CORS redirect to googleusercontent
        await fetch(cleanUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action, ...payload }),
        });
        return { result: 'sent_no_cors' };
      }
    }
  } catch (err) {
    console.warn('Google Sheets sync notice:', err);
    return null;
  }
}

/**
 * Sync all current facilities, bookings, and settings into Google Sheet
 */
export async function syncAllToGoogleSheet(
  gasUrl: string,
  facilities: Facility[],
  bookings: Booking[],
  settings: { announcement?: string; adminWhatsapp?: string; adminPassword?: string }
): Promise<{ success: boolean; count: number }> {
  if (!gasUrl) return { success: false, count: 0 };

  let count = 0;
  // 1. Sync Settings
  await syncWithGasBackend(gasUrl, 'updateSettings', settings);

  // 2. Sync Facilities
  for (const fac of facilities) {
    await syncWithGasBackend(gasUrl, 'saveFacility', { facility: fac });
    count++;
  }

  // 3. Sync Bookings
  for (const b of bookings) {
    await syncWithGasBackend(gasUrl, 'addBooking', {
      id: b.id,
      applicantName: b.applicantName,
      phoneNumber: b.phoneNumber,
      roomId: b.roomId,
      roomName: b.roomName,
      date: b.date,
      time: b.time,
      endTime: b.endTime,
      purpose: b.purpose,
      quantity: b.quantity,
      status: b.status,
    });
    count++;
  }

  return { success: true, count };
}

/**
 * Generates and downloads a CSV file for Google Sheets
 */
export function downloadCsvForGoogleSheets(filename: string, headers: string[], rows: (string | number)[][]) {
  const escapeCsv = (val: string | number) => {
    const str = String(val ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Excel / Google Sheets
    [headers.map(escapeCsv).join(','), ...rows.map((row) => row.map(escapeCsv).join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Uploads an image (base64) to the admin's Google Drive via Google Apps Script Web App.
 * Creates a folder 'Lugoss_App_Images' in Google Drive and sets public view access.
 */
export async function uploadImageToGoogleDrive(
  gasUrl: string,
  base64Data: string,
  fileName?: string,
  mimeType?: string
): Promise<{ success: boolean; imageUrl: string; isCloud: boolean }> {
  if (!gasUrl || gasUrl.trim() === '' || gasUrl.includes('MASUKKAN_WEB_APP_URL')) {
    // If no Google Apps Script connected, store as local base64 data URL
    return { success: true, imageUrl: base64Data, isCloud: false };
  }

  try {
    const res = await fetch(gasUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'uploadImage',
        base64: base64Data,
        fileName: fileName || `fac_${Date.now()}.png`,
        mimeType: mimeType || 'image/png',
      }),
    });

    const data = await res.json();
    if (data && data.result === 'success' && data.imageUrl) {
      return { success: true, imageUrl: data.imageUrl, isCloud: true };
    }
  } catch (err) {
    console.warn('Google Drive direct upload error, using local base64 fallback:', err);
  }

  // Fallback to local base64 so admin is never blocked
  return { success: true, imageUrl: base64Data, isCloud: false };
}

/**
 * Official Google Apps Script (Code.gs) template for the user's Google Sheet
 */
export const GOOGLE_APPS_SCRIPT_CODE = `// ==============================================================
// GOOGLE APPS SCRIPT: LUGOSS BOOKING APPS (VERSI GOOGLE SHEETS)
// ==============================================================
// Arahan:
// 1. Buka Google Sheet baru di Google Drive (cth: "Lugoss Booking Database").
// 2. Klik Extensions > Apps Script.
// 3. Padam kod asal, tampal kod di bawah, dan klik Save.
// 4. Klik Deploy > New Deployment > Pilih jenis "Web App".
// 5. Set "Execute as": "Me" dan "Who has access": "Anyone".
// 6. Klik Deploy, salin "Web App URL" dan masukkan ke dalam aplikasi Lugoss.
// ==============================================================

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getData";
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

    // A. TAMBAH / REKOD TEMPAHAN
    if (data.action === "addBooking") {
      var sheet = getOrCreateSheet(doc, "Bookings", [
        "ID", "Nama Guru", "No Telefon", "ID Bilik", "Nama Bilik",
        "Tarikh", "Masa Mula", "Masa Tamat", "Tujuan", "Status", "Kuantiti", "Timestamp"
      ]);
      var newId = data.id || ("BK-" + Date.now().toString().slice(-6));
      var timestamp = new Date();
      var qty = data.quantity || 0;
      var status = data.status || "MENUNGGU";

      // Elak rekod berganda jika ID sudah wujud
      var rows = sheet.getDataRange().getValues();
      var exists = false;
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] == newId) { exists = true; break; }
      }

      if (!exists) {
        sheet.appendRow([
          newId, data.applicantName, "'" + data.phoneNumber, data.roomId, data.roomName,
          data.date, data.time, data.endTime, data.purpose, status, qty, timestamp
        ]);
      }
      return responseJSON({ result: "success", id: newId });
    }

    // B. KEMASKINI STATUS TEMPAHAN (LULUS / DITOLAK)
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
      var sheet = getOrCreateSheet(doc, "Facilities", [
        "ID", "Nama", "Kategori", "Kapasiti", "Penerangan", "Inventori", "Status", "Gambar"
      ]);
      var fac = data.facility;
      var rows = sheet.getDataRange().getValues();
      var foundIndex = -1;

      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] == fac.id) { foundIndex = i + 1; break; }
      }

      if (foundIndex > 0) {
        sheet.getRange(foundIndex, 2, 1, 7).setValues([[
          fac.name, fac.type, fac.capacity, fac.desc, fac.inventory, fac.status, fac.img
        ]]);
      } else {
        sheet.appendRow([
          fac.id, fac.name, fac.type, fac.capacity, fac.desc, fac.inventory, fac.status, fac.img
        ]);
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

    // E. MUAT NAIK GAMBAR KE GOOGLE DRIVE (Folder: Lugoss_App_Images)
    if (data.action === "uploadImage") {
      var folderName = "Lugoss_App_Images";
      var folders = DriveApp.getFoldersByName(folderName);
      var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
      var base64Data = data.base64.indexOf(",") > -1 ? data.base64.split(",")[1] : data.base64;
      var mimeType = data.mimeType || "image/jpeg";
      var decoded = Utilities.base64Decode(base64Data);
      var blob = Utilities.newBlob(decoded, mimeType, data.fileName || ("img_" + Date.now() + ".jpg"));
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      var fileUrl = "https://lh3.googleusercontent.com/d/" + file.getId();
      return responseJSON({ result: "success", imageUrl: fileUrl, fileId: file.getId() });
    }

    return responseJSON({ result: "unknown_action" });
  } catch (err) {
    return responseJSON({ result: "error", message: err.toString() });
  }
}

function getOrCreateSheet(doc, sheetName, headers) {
  var sheet = doc.getSheetByName(sheetName);
  if (!sheet) {
    sheet = doc.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0A192F").setFontColor("#F59E0B");
  }
  return sheet;
}

function getSettingValue(doc, key, defaultValue) {
  var sheet = doc.getSheetByName("Settings");
  if (!sheet) return defaultValue;
  var rows = sheet.getDataRange().getValues();
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][0] == key) return rows[i][1];
  }
  return defaultValue;
}

function setSettingValue(doc, key, value) {
  var sheet = getOrCreateSheet(doc, "Settings", ["Key", "Value"]);
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

function getFacilitiesData(doc) {
  var sheet = doc.getSheetByName("Facilities");
  if (!sheet) return [];
  var rows = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    result.push({
      id: String(rows[i][0]),
      name: String(rows[i][1]),
      type: String(rows[i][2]),
      capacity: Number(rows[i][3]) || 0,
      desc: String(rows[i][4]),
      inventory: String(rows[i][5]),
      status: String(rows[i][6]),
      img: String(rows[i][7])
    });
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
      id: String(rows[i][0]),
      applicantName: String(rows[i][1]),
      phoneNumber: String(rows[i][2]).replace("'", ""),
      roomId: String(rows[i][3]),
      roomName: String(rows[i][4]),
      date: formatDateString(rows[i][5]),
      time: String(rows[i][6]),
      endTime: String(rows[i][7]),
      purpose: String(rows[i][8]),
      status: String(rows[i][9]),
      quantity: Number(rows[i][10]) || 0
    });
  }
  return result;
}

function formatDateString(dateVal) {
  if (dateVal instanceof Date) {
    return dateVal.getFullYear() + '-' + String(dateVal.getMonth() + 1).padStart(2, '0') + '-' + String(dateVal.getDate()).padStart(2, '0');
  }
  return String(dateVal);
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
`;

