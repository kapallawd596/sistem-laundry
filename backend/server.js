const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ============ DATABASE ============
let users = [
    { id: 1, nama: "Admin Utama", email: "admin@laundry.com", password: "admin123", role: "admin", no_hp: "081234567890", alamat: "Jl. Laundry No.1" },
    { id: 2, nama: "Operator Laundry", email: "operator@laundry.com", password: "operator123", role: "operator", no_hp: "081234567891", alamat: "Jl. Laundry No.2" },
    { id: 3, nama: "Pelanggan Setia", email: "pelanggan@example.com", password: "user123", role: "customer", no_hp: "081234567892", alamat: "Jl. Contoh No.3" }
];

let pelanggan = [
    { id: 1, nama: "Budi Santoso", email: "budi@gmail.com", no_hp: "081234567893", alamat: "Jl. Mawar No.5", poin: 120, totalTransaksi: 3 },
    { id: 2, nama: "Siti Aminah", email: "siti@gmail.com", no_hp: "081234567894", alamat: "Jl. Melati No.8", poin: 250, totalTransaksi: 5 }
];

let layanan = [
    { id: 1, nama: "Cuci Setrika", harga: 7000, estimasi: "1x24 jam", deskripsi: "Cuci + setrika rapi", status: "active" },
    { id: 2, nama: "Cuci Kering", harga: 5000, estimasi: "1x24 jam", deskripsi: "Cuci biasa tidak disetrika", status: "active" },
    { id: 3, nama: "Setrika Saja", harga: 4000, estimasi: "6 jam", deskripsi: "Setrika pakaian bersih", status: "active" },
    { id: 4, nama: "Dry Cleaning", harga: 25000, estimasi: "2x24 jam", deskripsi: "Pencucian kering khusus", status: "active" },
    { id: 5, nama: "Express 3 Jam", harga: 15000, estimasi: "3 jam", deskripsi: "Layanan kilat", status: "active" }
];

let pesanan = [
    { id: 1, kode: "LDY2025001", pelangganId: 1, pelangganNama: "Budi Santoso", pelangganHp: "081234567893", layananId: 1, layananNama: "Cuci Setrika", berat: 3.5, hargaPerKg: 7000, totalHarga: 24500, diskon: 0, totalBayar: 24500, status: "selesai", statusPembayaran: "lunas", tanggalMasuk: "2025-01-15", tanggalSelesai: "2025-01-16", catatan: "", operatorId: 2 },
    { id: 2, kode: "LDY2025002", pelangganId: 2, pelangganNama: "Siti Aminah", pelangganHp: "081234567894", layananId: 5, layananNama: "Express 3 Jam", berat: 2, hargaPerKg: 15000, totalHarga: 30000, diskon: 3000, totalBayar: 27000, status: "proses", statusPembayaran: "belum", tanggalMasuk: "2025-01-20", tanggalSelesai: null, catatan: "Urgent", operatorId: 2 }
];

let aktivitas = [
    { id: 1, deskripsi: "Sistem Laundry int Aktif", tipe: "info", createdAt: new Date().toISOString() }
];

let nextIds = {
    pelanggan: 3,
    layanan: 6,
    pesanan: 3,
    user: 4,
    aktivitas: 2
};

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
    aktivitas.unshift({
        id: nextIds.aktivitas,
        deskripsi,
        tipe,
        createdAt: new Date().toISOString()
    });
    if (aktivitas.length > 50) aktivitas.pop();
}

// ============ API AUTH ============
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        const { password, ...userWithoutPass } = user;
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
    const newUser = {
        id: nextIds.user,
        nama,
        email,
        password,
        role: "customer",
        no_hp,
        alamat
    };
    
    users.push(newUser);
    addAktivitas(`User baru terdaftar: ${email}`, "success");
    
    const { password: _, ...userWithoutPass } = newUser;
    res.json({ success: true, user: userWithoutPass });
});

// ============ API USERS ============
app.get('/api/users', (req, res) => {
    const usersWithoutPass = users.map(({ password, ...rest }) => rest);
    res.json(usersWithoutPass);
});

app.delete('/api/users/:id', (req, res) => {
    const id = parseInt(req.params.id);
    users = users.filter(u => u.id !== id);
    res.json({ success: true });
});

// ============ API PELANGGAN ============
app.get('/api/pelanggan', (req, res) => {
    res.json(pelanggan);
});

app.post('/api/pelanggan', (req, res) => {
    nextIds.pelanggan++;
    const newPelanggan = {
        id: nextIds.pelanggan,
        ...req.body,
        poin: 0,
        totalTransaksi: 0
    };
    pelanggan.push(newPelanggan);
    addAktivitas(`Pelanggan baru: ${newPelanggan.nama}`, "success");
    res.json(newPelanggan);
});

app.put('/api/pelanggan/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = pelanggan.findIndex(p => p.id === id);
    if (index !== -1) {
        pelanggan[index] = { ...pelanggan[index], ...req.body };
        res.json(pelanggan[index]);
    } else {
        res.status(404).json({ error: "Pelanggan tidak ditemukan" });
    }
});

app.delete('/api/pelanggan/:id', (req, res) => {
    const id = parseInt(req.params.id);
    pelanggan = pelanggan.filter(p => p.id !== id);
    addAktivitas(`Pelanggan dengan ID ${id} dihapus`, "warning");
    res.json({ success: true });
});

// ============ API LAYANAN ============
app.get('/api/layanan', (req, res) => {
    res.json(layanan);
});

app.post('/api/layanan', (req, res) => {
    nextIds.layanan++;
    const newLayanan = {
        id: nextIds.layanan,
        ...req.body,
        status: "active"
    };
    layanan.push(newLayanan);
    addAktivitas(`Layanan baru: ${newLayanan.nama} - Rp${newLayanan.harga}/kg`, "success");
    res.json(newLayanan);
});

app.put('/api/layanan/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = layanan.findIndex(l => l.id === id);
    if (index !== -1) {
        layanan[index] = { ...layanan[index], ...req.body };
        addAktivitas(`Layanan ${layanan[index].nama} diperbarui`, "info");
        res.json(layanan[index]);
    } else {
        res.status(404).json({ error: "Layanan tidak ditemukan" });
    }
});

app.delete('/api/layanan/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const deleted = layanan.find(l => l.id === id);
    layanan = layanan.filter(l => l.id !== id);
    if (deleted) {
        addAktivitas(`Layanan ${deleted.nama} dihapus`, "warning");
    }
    res.json({ success: true });
});

// ============ API PESANAN ============
app.get('/api/pesanan', (req, res) => {
    let result = [...pesanan];
    const { status, customerId, limit } = req.query;
    
    if (status) result = result.filter(p => p.status === status);
    if (customerId) result = result.filter(p => p.pelangganId == customerId);
    if (limit) result = result.slice(0, parseInt(limit));
    
    res.json(result);
});

app.post('/api/pesanan', (req, res) => {
    nextIds.pesanan++;
    const newPesanan = {
        id: nextIds.pesanan,
        kode: generateOrderCode(),
        ...req.body,
        status: "menunggu",
        tanggalMasuk: new Date().toISOString().split('T')[0]
    };
    pesanan.push(newPesanan);
    
    // Update poin pelanggan
    const pelangganData = pelanggan.find(p => p.id === newPesanan.pelangganId);
    if (pelangganData) {
        pelangganData.totalTransaksi = (pelangganData.totalTransaksi || 0) + 1;
        pelangganData.poin = (pelangganData.poin || 0) + Math.floor(newPesanan.totalBayar / 10000);
    }
    
    addAktivitas(`Pesanan baru: ${newPesanan.kode} dari ${newPesanan.pelangganNama}`, "success");
    res.json(newPesanan);
});

app.put('/api/pesanan/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = pesanan.findIndex(p => p.id === id);
    if (index !== -1) {
        const oldStatus = pesanan[index].status;
        pesanan[index] = { ...pesanan[index], ...req.body };
        
        if (oldStatus !== req.body.status) {
            addAktivitas(`Status pesanan ${pesanan[index].kode} berubah: ${oldStatus} → ${req.body.status}`, "info");
        }
        
        // Jika status selesai, set tanggal selesai
        if (req.body.status === "selesai" && !pesanan[index].tanggalSelesai) {
            pesanan[index].tanggalSelesai = new Date().toISOString().split('T')[0];
        }
        
        res.json(pesanan[index]);
    } else {
        res.status(404).json({ error: "Pesanan tidak ditemukan" });
    }
});

app.delete('/api/pesanan/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const deleted = pesanan.find(p => p.id === id);
    pesanan = pesanan.filter(p => p.id !== id);
    if (deleted) {
        addAktivitas(`Pesanan ${deleted.kode} dihapus`, "warning");
    }
    res.json({ success: true });
});

// ============ API STATISTIK ============
app.get('/api/statistik', (req, res) => {
    const totalPesanan = pesanan.length;
    const totalPendapatan = pesanan.reduce((sum, p) => sum + (p.totalBayar || 0), 0);
    const pesananMenunggu = pesanan.filter(p => p.status === "menunggu").length;
    const pesananProses = pesanan.filter(p => p.status === "proses").length;
    const pesananSelesai = pesanan.filter(p => p.status === "selesai").length;
    const pesananDiambil = pesanan.filter(p => p.status === "diambil").length;
    const totalPelanggan = pelanggan.length;
    const totalLayanan = layanan.length;
    
    // Pendapatan per hari (7 hari terakhir)
    const pendapatanPerHari = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const total = pesanan
            .filter(p => p.tanggalMasuk === dateStr && p.statusPembayaran === "lunas")
            .reduce((sum, p) => sum + (p.totalBayar || 0), 0);
        pendapatanPerHari.push({ tanggal: dateStr, total });
    }
    
    res.json({
        totalPesanan,
        totalPendapatan,
        pesananMenunggu,
        pesananProses,
        pesananSelesai,
        pesananDiambil,
        totalPelanggan,
        totalLayanan,
        pendapatanPerHari
    });
});

app.get('/api/aktivitas', (req, res) => {
    res.json(aktivitas);
});

// ============ SERVE FRONTEND ============
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║     🚀 Laundry int Server Berjalan! 🚀            ║
╠══════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                  ║
╠══════════════════════════════════════════════════╣
║  📋 AKUN DEMO:                                   ║
║  Admin:     admin@laundry.com / admin123         ║
║  Operator:  operator@laundry.com / operator123   ║
║  Pelanggan: pelanggan@example.com / user123      ║
╚══════════════════════════════════════════════════╝
    `);
});