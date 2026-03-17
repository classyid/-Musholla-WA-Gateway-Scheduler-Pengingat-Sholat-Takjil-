# 🕌 Musholla WA Gateway & Scheduler (Pengingat Sholat & Takjil)

Aplikasi berbasis web (Node.js) yang berfungsi sebagai penjadwal (*scheduler*) otomatis untuk mengirimkan notifikasi pengingat Imsyak dan jadwal shodaqoh Takjil / Kultum via WhatsApp. Aplikasi ini dilengkapi dengan Dashboard UI untuk memudahkan manajemen konfigurasi dan pemantauan sistem (System Logs).

> **⚠️ INFORMASI PENTING / DISCLAIMER:**
> Aplikasi ini adalah **Klien (Scheduler & Dashboard)**. Aplikasi ini **TIDAK** menyediakan API WA, API Jadwal Sholat, maupun API CCTV secara bawaan. Anda harus menyediakan layanan API pihak ketiga tersebut secara terpisah. Aplikasi ini bertugas menghubungkan ketiganya menjadi satu alur yang terotomatisasi.
> 
> * **API Jadwal Sholat**: Membutuhkan eksternal endpoint yang merespon dengan data JSON jadwal sholat harian (contoh endpoint bawaan: `api-sholat.appku.asia`).
> * **API WhatsApp Gateway**: Membutuhkan eksternal WA Gateway (menggunakan *Baileys, WhatsApp Web.js*, atau layanan pihak ketiga) yang menerima metode `POST /api/send-message` dan `POST /api/send-image`.
> * **CCTV Endpoint**: Membutuhkan URL publik yang mengembalikan file gambar (JPEG/PNG) secara langsung.

## ✨ Fitur Utama

- 🕰️ **Auto-Sync Jadwal Sholat**: Sinkronisasi jadwal secara otomatis setiap hari pada pukul 00:05.
- 📣 **Broadcast Imsyak & Maghrib**: Mengirim pengingat Imsyak (1 jam sebelum) dan Takjil/Maghrib (1 jam sebelum) secara otomatis.
- 📷 **Integrasi Snapshot CCTV**: Melampirkan tangkapan layar CCTV musholla/masjid secara langsung ke dalam pesan WhatsApp.
- 📝 **Template Dinamis**: Mendukung penggunaan tag otomatis pada pesan (contoh: `{{kota}}`, `{{tanggal}}`, `{{imsyak}}`, `{{nama}}` donatur takjil).
- ⚙️ **Web Dashboard (Dark Mode)**: Antarmuka yang modern dan responsif untuk mengatur URL, API Key, dan mengaktifkan/menonaktifkan jadwal.
- 📊 **System Logging**: Pemantauan aktivitas bot, API, CCTV, dan scheduler secara real-time langsung dari dashboard lengkap dengan filter data.

## 🛠️ Teknologi yang Digunakan

* **Backend**: Node.js, Express.js, Axios, node-cron
* **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript, FontAwesome
* **Database**: Flat JSON File (`data/config.json`, `data/takjil.json`, `data/logs.json`) - *Tanpa setup database eksternal!*

## 🚀 Cara Instalasi & Penggunaan

1. **Clone Repositori**
   ```bash
   git clone https://github.com/classyid/-Musholla-WA-Gateway-Scheduler-Pengingat-Sholat-Takjil-.git
   cd nama-repo
   ```

2. **Install Dependensi**
   Pastikan Anda sudah menginstal [Node.js](https://nodejs.org/).
   ```bash
   npm install
   ```

3. **Inisialisasi Database Log**
   Jalankan script migrasi untuk pertama kali agar sistem log berjalan dengan baik:
   ```bash
   node migrate_init_logs.js
   ```

4. **Jalankan Server**
   ```bash
   node server.js
   ```

5. **Akses Dashboard**
   Buka browser dan akses: `http://localhost:5531`. Silakan isi konfigurasi (URL API WA, API Key, dll) melalui dashboard tersebut.

## 📂 Struktur Folder Penting

* `/src` : Berisi core logic (Scheduler, module WhatsApp, module API Sholat, Custom Logger).
* `/public` : Berisi file statis untuk Dashboard Web (HTML, JS, asset).
* `/data` : Folder penyimpan database flat-file (`config.json`, `takjil.json`, `logs.json`).

## 🤝 Kontribusi
*Pull Request* (PR) dan *Issue* sangat kami harapkan. Jika Anda menemukan *bug* atau memiliki ide penambahan fitur (seperti support driver gateway WA yang berbeda), jangan ragu untuk berkontribusi!

## 📜 Lisensi
Lisensi MIT - Bebas untuk dimodifikasi dan digunakan untuk keperluan komunitas/masjid/pribadi.
