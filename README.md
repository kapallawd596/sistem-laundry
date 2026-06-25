 Sistem Informasi Manajemen Laundry (Web App)

Ini adalah aplikasi web untuk membantu pengelolaan bisnis laundry, mulai dari pemesanan, proses cucian, sampai pengantaran dan review pelanggan.

Project ini dibuat sebagai tugas akhir perkuliahan, dengan fokus ke sistem yang bisa dipakai untuk simulasi operasional laundry sehari-hari.
 Fitur Utama

Aplikasi ini punya 3 jenis pengguna (role) dengan fitur masing-masing:

 1. Role Pengguna
Pelanggan
Daftar & login akun
Pesan layanan laundry
Lihat status cucian (tracking)
Melakukan pembayaran
Karyawan
Mengelola pesanan yang masuk
Update status proses laundry
Mengatur pickup & delivery
Admin
Kontrol semua data sistem
Kelola user (pelanggan & karyawan)
Lihat laporan transaksi
Setting sistem secara keseluruhan
 2. Modul Sistem
Payment (payment.js)
Menghitung total biaya laundry secara otomatis sesuai layanan.
Stok & Perlengkapan (ManajemenStok&Perlengkapan.js)
Untuk memantau bahan seperti deterjen, pewangi, dan kebutuhan operasional lain.
Pickup & Delivery (pickup&delivery.js)
Mengatur jadwal penjemputan dan pengantaran pakaian.
Promo (promo.js)
Sistem voucher atau diskon untuk pelanggan.
Rating & Review (Rating&Review.js)
Pelanggan bisa kasih penilaian dan komentar untuk layanan.
🛠️ Teknologi yang Dipakai
Bagian	Teknologi
Frontend	HTML, CSS, JavaScript (Vanilla)
Backend	Node.js
Database	JSON (db.json)
API	Fetch API
 Struktur Folder
SISTEM-LAUNDRY/
├── backend/
│   ├── db.json              # Data utama (database sederhana)
│   ├── server.js           # Server Node.js
│   └── package.json        # Dependensi backend
│
└── frontend/
    ├── css/                # Styling
    ├── js/                # Logic per fitur (auth, payment, dll)
    ├── pages/             # Halaman sesuai role
    ├── index.html         # Landing page
    ├── login.html         # Halaman login
    └── register.html      # Halaman daftar