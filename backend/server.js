const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ============ DATABASE (baca dari db.json) ============
const DB_PATH = path.join(__dirname, 'db.json');

function readDB() {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Gagal baca db.json:', err);
        return { users: [], pelanggan: [], layanan: [], pesanan: [], aktivitas: [] };
    }
}

function writeDB(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error('Gagal tulis db.json:', err);
    }
}

function getNextId(arr) {
    return arr.length > 0 ? Math.max(...arr.map(item => item.id)) + 1 : 1;
}

function addAktivitas(deskripsi, tipe = "info") {
    const db = readDB();
    const newId = getNextId(db.aktivitas);
    const newAktivitas = { id: newId, deskripsi, tipe, createdAt: new Date().toISOString() };
    db.aktivitas.unshift(newAktivitas);
    if (db.aktivitas.length > 50) db.aktivitas.pop();
    writeDB(db);
}

function generateOrderCode() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `LDY${year}${month}${day}${random}`;
}

// ============ MIDDLEWARE ============
function authenticate(req, res, next) {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const userId = token.replace('token_', '');
    const db = readDB();
    const user = db.users.find(u => u.id == userId);
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
    const db = readDB();
    const user = db.users.find(u => u.email === email && u.password === password);
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
    const db = readDB();
    
    if (db.users.find(u => u.email === email)) {
        return res.status(400).json({ success: false, message: "Email sudah terdaftar" });
    }
    
    const newUserId = getNextId(db.users);
    const newUser = { id: newUserId, nama, email, password, role: "pelanggan", no_hp, alamat: alamat || '', createdAt: new Date().toISOString() };
    db.users.push(newUser);
    
    const newPelangganId = getNextId(db.pelanggan);
    db.pelanggan.push({ id: newPelangganId, nama, email, no_hp, alamat: alamat || '', poin: 0, totalTransaksi: 0, createdAt: new Date().toISOString() });
    
    writeDB(db);
    addAktivitas(`User baru terdaftar: ${email}`, "success");
    
    const { password: _, ...userWithoutPass } = newUser;
    res.json({ success: true, user: userWithoutPass });
});

// ============ API USERS ============
app.get('/api/users', authenticate, checkRole(['admin']), (req, res) => {
    const db = readDB();
    res.json(db.users.map(({ password, ...rest }) => rest));
});

app.delete('/api/users/:id', authenticate, checkRole(['admin']), (req, res) => {
    const id = parseInt(req.params.id);
    const db = readDB();
    const deleted = db.users.find(u => u.id === id);
    db.users = db.users.filter(u => u.id !== id);
    writeDB(db);
    if (deleted) addAktivitas(`User ${deleted.nama} dihapus oleh admin`, "warning");
    res.json({ success: true });
});

app.put('/api/profile', authenticate, (req, res) => {
    const db = readDB();
    const index = db.users.findIndex(u => u.id === req.user.id);
    if (index !== -1) {
        db.users[index] = { ...db.users[index], nama: req.body.nama, alamat: req.body.alamat, no_hp: req.body.no_hp };
        writeDB(db);
        const { password, ...userWithoutPass } = db.users[index];
        res.json(userWithoutPass);
    } else {
        res.status(404).json({ error: "User tidak ditemukan" });
    }
});

// ============ API PELANGGAN ==========
app.get('/api/pelanggan', authenticate, (req, res) => {
    const db = readDB();
    res.json(db.pelanggan);
});

app.post('/api/pelanggan', authenticate, checkRole(['admin', 'karyawan']), (req, res) => {
    const db = readDB();
    const newId = getNextId(db.pelanggan);
    const newPelanggan = { id: newId, ...req.body, poin: 0, totalTransaksi: 0, createdAt: new Date().toISOString() };
    db.pelanggan.push(newPelanggan);
    writeDB(db);
    addAktivitas(`Pelanggan baru: ${newPelanggan.nama} ditambahkan`, "success");
    res.json(newPelanggan);
});

app.put('/api/pelanggan/:id', authenticate, checkRole(['admin', 'karyawan']), (req, res) => {
    const id = parseInt(req.params.id);
    const db = readDB();
    const index = db.pelanggan.findIndex(p => p.id === id);
    if (index !== -1) {
        db.pelanggan[index] = { ...db.pelanggan[index], ...req.body };
        writeDB(db);
        res.json(db.pelanggan[index]);
    } else {
        res.status(404).json({ error: "Pelanggan tidak ditemukan" });
    }
});

app.delete('/api/pelanggan/:id', authenticate, checkRole(['admin']), (req, res) => {
    const id = parseInt(req.params.id);
    const db = readDB();
    const deleted = db.pelanggan.find(p => p.id === id);
    db.pelanggan = db.pelanggan.filter(p => p.id !== id);
    writeDB(db);
    if (deleted) addAktivitas(`Pelanggan ${deleted.nama} dihapus`, "warning");
    res.json({ success: true });
});

// ============ API LAYANAN ==========
app.get('/api/layanan', authenticate, (req, res) => {
    const db = readDB();
    res.json(db.layanan);
});

app.post('/api/layanan', authenticate, checkRole(['admin']), (req, res) => {
    const db = readDB();
    const newId = getNextId(db.layanan);
    const newLayanan = { id: newId, ...req.body, status: "active" };
    db.layanan.push(newLayanan);
    writeDB(db);
    res.json(newLayanan);
});

app.put('/api/layanan/:id', authenticate, checkRole(['admin']), (req, res) => {
    const id = parseInt(req.params.id);
    const db = readDB();
    const index = db.layanan.findIndex(l => l.id === id);
    if (index !== -1) {
        db.layanan[index] = { ...db.layanan[index], ...req.body };
        writeDB(db);
        res.json(db.layanan[index]);
    } else {
        res.status(404).json({ error: "Layanan tidak ditemukan" });
    }
});

app.delete('/api/layanan/:id', authenticate, checkRole(['admin']), (req, res) => {
    const id = parseInt(req.params.id);
    const db = readDB();
    db.layanan = db.layanan.filter(l => l.id !== id);
    writeDB(db);
    res.json({ success: true });
});

// ============ API PESANAN ==========
app.get('/api/pesanan', authenticate, (req, res) => {
    let db = readDB();
    let result = [...db.pesanan];
    if (req.user.role === 'pelanggan') {
        const customerPelanggan = db.pelanggan.find(p => p.email === req.user.email);
        if (customerPelanggan) result = result.filter(p => p.pelangganId === customerPelanggan.id);
        else result = [];
    }
    const { status, limit } = req.query;
    if (status) result = result.filter(p => p.status === status);
    if (limit) result = result.slice(0, parseInt(limit));
    res.json(result);
});

app.post('/api/pesanan', authenticate, checkRole(['pelanggan', 'admin', 'karyawan']), (req, res) => {
    let db = readDB();
    let pelangganId = req.body.pelangganId;
    let pelangganNama = req.body.pelangganNama;
    let pelangganHp = req.body.pelangganHp;
    let pelangganAlamat = req.body.pelangganAlamat;
    
    if (req.user.role === 'pelanggan') {
        const customerPelanggan = db.pelanggan.find(p => p.email === req.user.email);
        if (customerPelanggan) {
            pelangganId = customerPelanggan.id;
            pelangganNama = customerPelanggan.nama;
            pelangganHp = customerPelanggan.no_hp;
            pelangganAlamat = customerPelanggan.alamat;
        }
    }
    
    const newId = getNextId(db.pesanan);
    const newPesanan = {
        id: newId,
        kode: generateOrderCode(),
        pelangganId, pelangganNama, pelangganHp, pelangganAlamat,
        layananId: req.body.layananId,
        layananNama: req.body.layananNama,
        berat: null,
        hargaPerKg: req.body.hargaPerKg,
        totalHarga: null,
        diskon: req.body.diskon || 0,
        totalBayar: null,
        status: "menunggu",
        statusPembayaran: "belum",
        tanggalPesan: new Date().toISOString().split('T')[0],
        tanggalMasuk: null,
        tanggalSelesai: null,
        jadwalJemput: req.body.jadwalJemput,
        jadwalAntar: req.body.jadwalAntar,
        catatan: req.body.catatan || "",
        karyawanId: null,
        createdAt: new Date().toISOString()
    };
    db.pesanan.push(newPesanan);
    writeDB(db);
    addAktivitas(`Pesanan baru: ${newPesanan.kode} dari ${newPesanan.pelangganNama}`, "success");
    res.json(newPesanan);
});

app.put('/api/pesanan/:id', authenticate, checkRole(['admin', 'karyawan']), (req, res) => {
    const id = parseInt(req.params.id);
    let db = readDB();
    const index = db.pesanan.findIndex(p => p.id === id);
    if (index !== -1) {
        const oldStatus = db.pesanan[index].status;
        db.pesanan[index] = { ...db.pesanan[index], ...req.body };
        
        if (req.body.berat && !db.pesanan[index].totalHarga) {
            db.pesanan[index].totalHarga = db.pesanan[index].berat * db.pesanan[index].hargaPerKg;
            db.pesanan[index].totalBayar = db.pesanan[index].totalHarga - (db.pesanan[index].diskon || 0);
            db.pesanan[index].tanggalMasuk = new Date().toISOString().split('T')[0];
        }
        if (req.body.status === "selesai" && !db.pesanan[index].tanggalSelesai) {
            db.pesanan[index].tanggalSelesai = new Date().toISOString().split('T')[0];
        }
        if (oldStatus !== req.body.status) {
            addAktivitas(`Status pesanan ${db.pesanan[index].kode} berubah: ${oldStatus} → ${req.body.status}`, "info");
        }
        writeDB(db);
        res.json(db.pesanan[index]);
    } else {
        res.status(404).json({ error: "Pesanan tidak ditemukan" });
    }
});

app.delete('/api/pesanan/:id', authenticate, checkRole(['admin']), (req, res) => {
    const id = parseInt(req.params.id);
    let db = readDB();
    db.pesanan = db.pesanan.filter(p => p.id !== id);
    writeDB(db);
    res.json({ success: true });
});

// ============ STATISTIK ==========
app.get('/api/statistik', authenticate, checkRole(['admin', 'karyawan']), (req, res) => {
    const db = readDB();
    const totalPesanan = db.pesanan.length;
    const totalPendapatan = db.pesanan.reduce((sum, p) => sum + (p.totalBayar || 0), 0);
    const pendapatanPerHari = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const total = db.pesanan.filter(p => p.tanggalMasuk === dateStr && p.statusPembayaran === "lunas").reduce((sum, p) => sum + (p.totalBayar || 0), 0);
        pendapatanPerHari.push({ tanggal: dateStr, total });
    }
    res.json({
        totalPesanan,
        totalPendapatan,
        pesananMenunggu: db.pesanan.filter(p => p.status === "menunggu").length,
        pesananProses: db.pesanan.filter(p => p.status === "proses").length,
        pesananSelesai: db.pesanan.filter(p => p.status === "selesai").length,
        pesananDiambil: db.pesanan.filter(p => p.status === "diambil").length,
        totalPelanggan: db.pelanggan.length,
        totalLayanan: db.layanan.length,
        pendapatanPerHari
    });
});

app.get('/api/aktivitas', authenticate, checkRole(['admin', 'karyawan']), (req, res) => {
    const db = readDB();
    res.json(db.aktivitas);
});

// ============ SERVE FRONTEND ==========
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