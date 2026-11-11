# DOKUMENTASI MEMORI SISTEM: LUGOSS BOOKING APPS (SMK LUGOSS)
**Status Kemajuan:** ~98% Siap (Sedia Digunakan / Production-Ready)  
**Pengguna / Pentadbir:** `g-31296677@moe-dl.edu.my`  
**Tarikh Kemaskini:** 11 November 2026  

---

## 1. Ringkasan & Seni Bina Aplikasi
Aplikasi **Lugoss Booking Apps** merupakan sistem tempahan bilik khas/fasiliti dan peminjaman aset/peralatan sekolah berasaskan web (React + TypeScript + Tailwind CSS) yang dioptimumkan untuk paparan telefon pintar (*mobile frame*) dan komputer.

### Struktur Fail Utama:
- `src/App.tsx`: Pengurusan *state* pusat (pengesahan pengguna, sesi admin, tempahan, fasiliti, tetapan, dan sinkronisasi ke `localStorage` serta Google Sheets).
- `src/components/Header.tsx`: Bar navigasi atas memaparkan logo sekolah rasmi, nama sekolah, status integrasi Google Sheets, makluman sistem, dan butang tukar ID pengguna.
- `src/components/HomeView.tsx`: Dashboard utama guru dengan senarai fasiliti, kad status ketersediaan (*available*, *in-use*, *maintenance*), kiraan stok unit aset, dan carian pantas mengikut kategori (Semua, Makmal, Dewan, Bilik, Aset).
- `src/components/BookView.tsx`: Borang tempahan interaktif dilengkapi semakan konflik masa bertindih automatik (*time conflict check*), pengurusan kuantiti unit bagi aset, dan modal makluman WhatsApp automatik selepas penghantaran.
- `src/components/StatusView.tsx`: Paparan status permohonan (*MENUNGGU*, *LULUS*, *DITOLAK*), fungsi pembatalan oleh pemilik, butang pertanyaan terus ke WhatsApp pentadbir (*Tanya Admin*), dan eksport rekod ke CSV.
- `src/components/AdminView.tsx`: Zon pentadbir lengkap dengan kata laluan:
  - **Kelulusan Tempahan**: Butang tindakan automatik **"Lulus & Hantar WhatsApp"** dan **"Tolak & WhatsApp"**.
  - **Urus Fasiliti & Aset (CRUD)**: Tambah, kemaskini, padam fasiliti/aset dengan muat naik gambar terus ke Google Drive.
  - **Google Sheets & Panduan**: Panduan 3 langkah *Apps Script*, penyegerakan *batch*, pratonton lajur Google Sheet, dan muat turun fail CSV.
  - **Tetapan UI & Logo**: Muat naik logo rasmi sekolah ke Google Drive/tempatan, pengurusan teks makluman, nombor WhatsApp notifikasi, kata laluan pentadbir, dan URL Google Apps Script.
- `src/utils/bookingUtils.ts`:
  - `formatDateToDDMMYY`: Penyelarasan format tarikh ke `DD/MM/YY` (contoh: `25/11/26`).
  - `buildAdminWhatsappUrl`: Format notifikasi tempahan baharu ke WhatsApp admin.
  - `buildTeacherNotificationWhatsappUrl`: Format mesej status rasmi kelulusan/penolakan ke WhatsApp guru.
  - `uploadImageToGoogleDrive`: Muat naik gambar ke folder Google Drive `Lugoss_App_Images`.
  - `GOOGLE_APPS_SCRIPT_CODE`: Templat kod lengkap Google Apps Script (`Code.gs`) untuk pangkalan data Google Sheet.
- `server.js`: Pelayan Express untuk menyajikan binaan fail `dist/` pada Port 3000.

---

## 2. Ciri-Ciri Utama yang Telah Sempurna (98%)
1. **Penukaran & Muat Naik Logo Sekolah**:
   - Terdapat bahagian khusus di **Tetapan UI** untuk memilih gambar logo sekolah dari galeri atau kamera peranti.
   - Gambar logo dimuat naik terus ke Google Drive Admin (Folder `Lugoss_App_Images`) atau disimpan setempat (`localStorage`), dan dikemas kini serta-merta pada bar tajuk atas (*Header*) dan modal log masuk guru.

2. **Muat Naik Gambar Fasiliti & Aset**:
   - Pengurus fasiliti boleh memuat naik gambar bilik atau alatan terus dari peranti tanpa perlu menyalin URL luaran secara manual.

3. **Format Tarikh WhatsApp Seragam (`DD/MM/YY`)**:
   - Semua mesej WhatsApp yang dijana memaparkan baris `*Tarikh Guna:* DD/MM/YY` (contoh: `25/11/26`) agar mudah dan jelas dibaca oleh pentadbir dan guru.

4. **Kelulusan & Penolakan Automatik Bersama WhatsApp**:
   - **Lulus & Hantar WhatsApp**: Mengubah status kepada `LULUS` dan terus membuka pautan WhatsApp rasmi kepada pemohon.
   - **Tolak & WhatsApp**: Membuka dialog pilihan catatan penolakan (*Masa bertindih*, *Fasiliti diselenggara*, dll.) dan terus menghantar WhatsApp penolakan kepada pemohon.
   - Dilengkapi *fallback* modal sekiranya peranti menghalang *popup window*.

5. **Penyelarasan Google Sheets & Drive (Mesra Akaun KPM-Guru)**:
   - Menggunakan kaedah Google Apps Script Web App (`Code.gs`) yang beroperasi di dalam akaun Google Drive guru tanpa sekatan GCP OAuth.
   - Disokong dengan fungsi sandaran data luar talian (*offline fallback* melalui `localStorage`) dan eksport fail CSV.

---

## 3. Cadangan Kemaskini Seterusnya (Baki 2%)
Sekiranya pentadbir ingin menambah baik sistem pada masa akan datang:
1. **Penjanaan Kod QR (QR Code)**:
   - Menjana kod QR bagi setiap permohonan lulus untuk imbasan semasa guru mengambil kunci bilik atau peralatan aset.
2. **Statistik Penggunaan Mengikut Panitia**:
   - Graf ringkas dalam Zon Pentadbir menunjukkan fasiliti atau aset yang paling kerap ditempah setiap bulan.
3. **Pemberitahuan Peringatan (Reminder)**:
   - Butang pantas untuk admin menghantar peringatan pemulangan aset kepada guru selepas tamat waktu tempahan.
