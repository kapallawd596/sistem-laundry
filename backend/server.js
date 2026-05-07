const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ============ DATABASE ============
let users = [
    { id: 1, nama: "Admin Utama", email: "admin@laundry.com", password: "admin123", role: "admin", no_hp: "081234567890", alamat: "Jl. Laundry No.1", createdAt: new Date().toISOString() },
    { id: 2, nama: "Karyawan Laundry", email: "karyawan@laundry.com", password: "karyawan123", role: "karyawan", no_hp: "081234567891", alamat: "Jl. Laundry No.2", createdAt: new Date().toISOString() },
    { id: 3, nama: "Pelanggan Setia", email: "pelanggan@example.com", password: "user123", role: "pelanggan", no_hp: "081234567892", alamat: "Jl. Contoh No.3", createdAt: new Date().toISOString() }
];

let pelanggan = [
    { id: 1, nama: "Budi Santoso", email: "budi@gmail.com", no_hp: "081234567893", alamat: "Jl. Mawar No.5", poin: 120, totalTransaksi: 3, createdAt: new Date().toISOString() },
    { id: 2, nama: "Siti Aminah", email: "siti@gmail.com", no_hp: "081234567894", alamat: "Jl. Melati No.8", poin: 250, totalTransaksi: 5, createdAt: new Date().toISOString() }
];

let layanan = [
    { id: 1, nama: "Cuci Setrika", harga: 7000, estimasi: "1x24 jam", deskripsi: "Cuci + setrika rapi", icon: "fa-tshirt", status: "active" },
    { id: 2, nama: "Cuci Kering", harga: 5000, estimasi: "1x24 jam", deskripsi: "Cuci biasa tidak disetrika", icon: "fa-jug-detergent", status: "active" },
    { id: 3, nama: "Setrika Saja", harga: 4000, estimasi: "6 jam", deskripsi: "Setrika pakaian bersih", icon: "fa-iron", status: "active" },
    { id: 4, nama: "Dry Cleaning", harga: 25000, estimasi: "2x24 jam", deskripsi: "Pencucian kering khusus", icon: "fa-dryer", status: "active" },
    { id: 5, nama: "Express 3 Jam", harga: 15000, estimasi: "3 jam", deskripsi: "Layanan kilat", icon: "fa-bolt", status: "active" }
];

let pesanan = [
    { id: 1, kode: "LDY2025001", pelangganId: 1, pelangganNama: "Budi Santoso", pelangganHp: "081234567893", pelangganAlamat: "Jl. Mawar No.5", layananId: 1, layananNama: "Cuci Setrika", berat: 3.5, hargaPerKg: 7000, totalHarga: 24500, diskon: 0, totalBayar: 24500, status: "selesai", statusPembayaran: "lunas", tanggalPesan: "2025-01-20", tanggalMasuk: "2025-01-20", tanggalSelesai: "2025-01-21", jadwalJemput: "2025-01-20 09:00", jadwalAntar: null, catatan: "", karyawanId: 1, createdAt: new Date().toISOString() }
];

let aktivitas = [
    { id: 1, deskripsi: "Sistem Laundry int Aktif", tipe: "info", createdAt: new Date().toISOString() }
];

let nextIds = { pelanggan: 3, layanan: 6, pesanan: 2, user: 4, aktivitas: 2 };

// ============ HELPER FUNCTIONS ============
function generateOrderCode() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `LDY${year}${month}${day}${random}`;
}

function addAktivitas(deskripsi, tipe = "info") {
    nextIds.aktivitas++;
    aktivitas.unshift({ id: nextIds.aktivitas, deskripsi, tipe, createdAt: new Date().toISOString() });
    if (aktivitas.length > 50) aktivitas.pop();
}

// ============ MIDDLEWARE ============
function authenticate(req, res, next) {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const userId = token.replace('token_', '');
    const user = users.find(u => u.id == userId);
    if (!user) return res.status(401).json({ error: "Invalid token" });
    req.user = user;
    next();
}

function checkRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: "Unauthorized" });
        if (!allowedRoles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
        next();
    };
}

// ============ API AUTH ============
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        const { password, ...userWithoutPass } = user;
        addAktivitas(`User ${user.nama} (${user.role}) login`, "success");
        res.json({ success: true, user: userWithoutPass, token: `token_${user.id}` });
    } else {
        res.status(401).json({ success: false, message: "Email atau password salah" });
    }
});

app.post('/api/register', (req, res) => {
    const { nama, email, password, no_hp, alamat } = req.body;
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ success: false, message: "Email sudah terdaftar" });
    }
    nextIds.user++;
    const newUser = { id: nextIds.user, nama, email, password, role: "pelanggan", no_hp, alamat: alamat || '', createdAt: new Date().toISOString() };
    users.push(newUser);
    nextIds.pelanggan++;
    pelanggan.push({ id: nextIds.pelanggan, nama, email, no_hp, alamat: alamat || '', poin: 0, totalTransaksi: 0, createdAt: new Date().toISOString() });
    addAktivitas(`User baru terdaftar: ${email}`, "success");
    const { password: _, ...userWithoutPass } = newUser;
    res.json({ success: true, user: userWithoutPass });
});

// ============ API USERS (Admin only) ============
app.get('/api/users', authenticate, checkRole(['admin']), (req, res) => {
    res.json(users.map(({ password, ...rest }) => rest));
});
app.delete('/api/users/:id', authenticate, checkRole(['admin']), (req, res) => {
    const id = parseInt(req.params.id);
    const deleted = users.find(u => u.id === id);
    users = users.filter(u => u.id !== id);
    if (deleted) addAktivitas(`User ${deleted.nama} dihapus oleh admin`, "warning");
    res.json({ success: true });
});
app.put('/api/profile', authenticate, (req, res) => {
    const index = users.findIndex(u => u.id === req.user.id);
    if (index !== -1) {
        users[index] = { ...users[index], nama: req.body.nama, alamat: req.body.alamat, no_hp: req.body.no_hp };
        const { password, ...userWithoutPass } = users[index];
        res.json(userWithoutPass);
    } else {
        res.status(404).json({ error: "User tidak ditemukan" });
    }
});

// ============ API PELANGGAN ============
app.get('/api/pelanggan', authenticate, (req, res) => res.json(pelanggan));
app.post('/api/pelanggan', authenticate, checkRole(['admin', 'karyawan']), (req, res) => {
    nextIds.pelanggan++;
    const newPelanggan = { id: nextIds.pelanggan, ...req.body, poin: 0, totalTransaksi: 0, createdAt: new Date().toISOString() };
    pelanggan.push(newPelanggan);
    addAktivitas(`Pelanggan baru: ${newPelanggan.nama} ditambahkan`, "success");
    res.json(newPelanggan);
});
app.put('/api/pelanggan/:id', authenticate, checkRole(['admin', 'karyawan']), (req, res) => {
    const index = pelanggan.findIndex(p => p.id === parseInt(req.params.id));
    if (index !== -1) {
        pelanggan[index] = { ...pelanggan[index], ...req.body };
        res.json(pelanggan[index]);
    } else {
        res.status(404).json({ error: "Pelanggan tidak ditemukan" });
    }
});
app.delete('/api/pelanggan/:id', authenticate, checkRole(['admin']), (req, res) => {
    const id = parseInt(req.params.id);
    const deleted = pelanggan.find(p => p.id === id);
    pelanggan = pelanggan.filter(p => p.id !== id);
    if (deleted) addAktivitas(`Pelanggan ${deleted.nama} dihapus`, "warning");
    res.json({ success: true });
});

// ============ API LAYANAN ============
app.get('/api/layanan', authenticate, (req, res) => res.json(layanan));
app.post('/api/layanan', authenticate, checkRole(['admin']), (req, res) => {
    nextIds.layanan++;
    const newLayanan = { id: nextIds.layanan, ...req.body, status: "active" };
    layanan.push(newLayanan);
    res.json(newLayanan);
});
app.put('/api/layanan/:id', authenticate, checkRole(['admin']), (req, res) => {
    const index = layanan.findIndex(l => l.id === parseInt(req.params.id));
    if (index !== -1) {
        layanan[index] = { ...layanan[index], ...req.body };
        res.json(layanan[index]);
    } else {
        res.status(404).json({ error: "Layanan tidak ditemukan" });
    }
});
app.delete('/api/layanan/:id', authenticate, checkRole(['admin']), (req, res) => {
    layanan = layanan.filter(l => l.id !== parseInt(req.params.id));
    res.json({ success: true });
});

// ============ API PESANAN ============
app.get('/api/pesanan', authenticate, (req, res) => {
    let result = [...pesanan];
    if (req.user.role === 'pelanggan') {
        const customerPelanggan = pelanggan.find(p => p.email === req.user.email);
        if (customerPelanggan) result = result.filter(p => p.pelangganId === customerPelanggan.id);
        else result = [];
    }
    const { status, limit } = req.query;
    if (status) result = result.filter(p => p.status === status);
    if (limit) result = result.slice(0, parseInt(limit));
    res.json(result);
});

app.post('/api/pesanan', authenticate, checkRole(['pelanggan', 'admin', 'karyawan']), (req, res) => {
    nextIds.pesanan++;
    let pelangganId = req.body.pelangganId, pelangganNama = req.body.pelangganNama, pelangganHp = req.body.pelangganHp, pelangganAlamat = req.body.pelangganAlamat;
    if (req.user.role === 'pelanggan') {
        const customerPelanggan = pelanggan.find(p => p.email === req.user.email);
        if (customerPelanggan) {
            pelangganId = customerPelanggan.id;
            pelangganNama = customerPelanggan.nama;
            pelangganHp = customerPelanggan.no_hp;
            pelangganAlamat = customerPelanggan.alamat;
        }
    }
    const newPesanan = {
        id: nextIds.pesanan, kode: generateOrderCode(), pelangganId, pelangganNama, pelangganHp, pelangganAlamat,
        layananId: req.body.layananId, layananNama: req.body.layananNama, berat: null, hargaPerKg: req.body.hargaPerKg,
        totalHarga: null, diskon: req.body.diskon || 0, totalBayar: null, status: "menunggu", statusPembayaran: "belum",
        tanggalPesan: new Date().toISOString().split('T')[0], tanggalMasuk: null, tanggalSelesai: null,
        jadwalJemput: req.body.jadwalJemput, jadwalAntar: req.body.jadwalAntar, catatan: req.body.catatan || "", karyawanId: null, createdAt: new Date().toISOString()
    };
    pesanan.push(newPesanan);
    addAktivitas(`Pesanan baru: ${newPesanan.kode} dari ${newPesanan.pelangganNama}`, "success");
    res.json(newPesanan);
});

app.put('/api/pesanan/:id', authenticate, checkRole(['admin', 'karyawan']), (req, res) => {
    const index = pesanan.findIndex(p => p.id === parseInt(req.params.id));
    if (index !== -1) {
        const oldStatus = pesanan[index].status;
        pesanan[index] = { ...pesanan[index], ...req.body };
        if (req.body.berat && !pesanan[index].totalHarga) {
            pesanan[index].totalHarga = pesanan[index].berat * pesanan[index].hargaPerKg;
            pesanan[index].totalBayar = pesanan[index].totalHarga - (pesanan[index].diskon || 0);
            pesanan[index].tanggalMasuk = new Date().toISOString().split('T')[0];
        }
        if (req.body.status === "selesai" && !pesanan[index].tanggalSelesai) {
            pesanan[index].tanggalSelesai = new Date().toISOString().split('T')[0];
        }
        if (oldStatus !== req.body.status) {
            addAktivitas(`Status pesanan ${pesanan[index].kode} berubah: ${oldStatus} → ${req.body.status}`, "info");
        }
        res.json(pesanan[index]);
    } else {
        res.status(404).json({ error: "Pesanan tidak ditemukan" });
    }
});

app.delete('/api/pesanan/:id', authenticate, checkRole(['admin']), (req, res) => {
    pesanan = pesanan.filter(p => p.id !== parseInt(req.params.id));
    res.json({ success: true });
});

// ============ API STATISTIK ============
app.get('/api/statistik', authenticate, checkRole(['admin', 'karyawan']), (req, res) => {
    const totalPesanan = pesanan.length;
    const totalPendapatan = pesanan.reduce((sum, p) => sum + (p.totalBayar || 0), 0);
    const pendapatanPerHari = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const total = pesanan.filter(p => p.tanggalMasuk === dateStr && p.statusPembayaran === "lunas").reduce((sum, p) => sum + (p.totalBayar || 0), 0);
        pendapatanPerHari.push({ tanggal: dateStr, total });
    }
    res.json({
        totalPesanan, totalPendapatan,
        pesananMenunggu: pesanan.filter(p => p.status === "menunggu").length,
        pesananProses: pesanan.filter(p => p.status === "proses").length,
        pesananSelesai: pesanan.filter(p => p.status === "selesai").length,
        pesananDiambil: pesanan.filter(p => p.status === "diambil").length,
        totalPelanggan: pelanggan.length, totalLayanan: layanan.length, pendapatanPerHari
    });
});

app.get('/api/aktivitas', authenticate, checkRole(['admin', 'karyawan']), (req, res) => res.json(aktivitas));

// ============ SERVE FRONTEND ============
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║     🚀 Laundry int Server Berjalan! 🚀            ║
╠══════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                  ║
╠══════════════════════════════════════════════════╣
║  📋 AKUN DEMO:                                   ║
║  👑 Admin:     admin@laundry.com / admin123      ║
║  👨‍💼 Karyawan:  karyawan@laundry.com / karyawan123 ║
║  👤 Pelanggan: pelanggan@example.com / user123   ║
╚══════════════════════════════════════════════════╝
    `);
});