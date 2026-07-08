// backend/server.js — VERSI FIXED + MIDTRANS + VERCEL READY
// ============================================================

// ✅ FIX: Hanya load .env di development (Vercel pakai env vars)
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: __dirname + '/.env' });
}

console.log('📁 Current directory:', __dirname);
console.log('🔍 DB_HOST:', process.env.DB_HOST ? '✅ ADA' : '❌ KOSONG');
console.log('🔍 DB_PORT:', process.env.DB_PORT ? '✅ ADA' : '❌ KOSONG');
console.log('🔍 DB_USER:', process.env.DB_USER ? '✅ ADA' : '❌ KOSONG');
console.log('🔍 DB_PASSWORD:', process.env.DB_PASSWORD ? '✅ ADA' : '❌ KOSONG');
console.log('🔍 DB_NAME:', process.env.DB_NAME ? '✅ ADA' : '❌ KOSONG');
console.log('🔍 JWT_SECRET:', process.env.JWT_SECRET ? '✅ ADA' : '❌ KOSONG');
console.log('🔍 MIDTRANS:', process.env.MIDTRANS_SERVER_KEY ? '✅ ADA' : '❌ KOSONG');

const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./database');
const midtransClient = require('midtrans-client');

const app = express();
const PORT = process.env.PORT || 3000;

// ============ ERROR HANDLER GLOBAL ============
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
});

// ============ MIDTRANS INITIALIZATION ============
const snap = new midtransClient.Snap({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// ============ JWT SECRET VALIDATION ============
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET tidak ada atau terlalu pendek (minimal 32 karakter)!');
    process.exit(1);
}

// ============ [HIGH-4] RATE LIMITING ============
const loginAttempts = new Map();
const registerAttempts = new Map();

function rateLimit(map, maxCount, windowMs) {
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const entry = map.get(ip);

        if (entry && now < entry.resetAt) {
            if (entry.count >= maxCount) {
                const waitSec = Math.ceil((entry.resetAt - now) / 1000);
                return res.status(429).json({
                    success: false,
                    message: `Terlalu banyak percobaan. Coba lagi dalam ${waitSec} detik.`
                });
            }
            entry.count++;
        } else {
            map.set(ip, { count: 1, resetAt: now + windowMs });
        }
        next();
    };
}

const loginRateLimit = rateLimit(loginAttempts, 10, 15 * 60 * 1000);
const registerRateLimit = rateLimit(registerAttempts, 5, 60 * 60 * 1000);

// ============ [HIGH-1] CORS ============
app.use((req, res, next) => {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
        .split(',')
        .map(o => o.trim());

    const origin = req.headers.origin;

    if (process.env.NODE_ENV === 'development') {
        if (origin) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        } else {
            res.setHeader('Access-Control-Allow-Origin', '*');
        }
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
        if (origin && allowedOrigins.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') return res.status(200).end();
    next();
});

// ============ SECURITY HEADERS ============
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

// ============ HELPER FUNCTIONS ============
function sendError(res, statusCode, publicMsg, internalErr = null) {
    if (internalErr) console.error('[SERVER ERROR]', internalErr);
    const msg = process.env.NODE_ENV === 'production' ? publicMsg : (internalErr?.message || publicMsg);
    return res.status(statusCode).json({ success: false, error: msg });
}

function generateOrderCode() {
    const d = new Date();
    const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const crypto = require('crypto');
    const random = crypto.randomInt(0, 100000).toString().padStart(5, '0');
    return `LDY${date}${random}`;
}

async function addAktivitas(deskripsi, tipe = 'info') {
    try {
        await pool.query('INSERT INTO aktivitas (deskripsi, tipe) VALUES (?, ?)', [deskripsi, tipe]);
    } catch (err) {
        console.error('Failed to add activity:', err.message);
    }
}

// ============ [HIGH-8] AUTH MIDDLEWARE ============
async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Token tidak ditemukan' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const [users] = await pool.query('SELECT id, nama, email, role, no_hp, alamat FROM users WHERE id = ?', [decoded.id]);
        if (users.length === 0) return res.status(401).json({ error: 'User tidak ditemukan' });
        req.user = users[0];
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token tidak valid atau sudah kadaluarsa' });
    }
}

function checkRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        if (!allowedRoles.includes(req.user.role)) return res.status(403).json({ error: 'Akses ditolak' });
        next();
    };
}

function validateRequired(body, fields) {
    return fields.filter(f => !body[f] || String(body[f]).trim() === '');
}

// ============ API LOGIN ============
app.post('/api/login', loginRateLimit, async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('📌 Login attempt:', email);

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
        }

        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Email atau password salah' });
        }

        const user = users[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: 'Email atau password salah' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        const { password: _, ...userWithoutPass } = user;
        await addAktivitas(`User ${user.nama} (${user.role}) login`, 'success');

        res.json({ success: true, user: userWithoutPass, token });
    } catch (err) {
        console.error('❌ Login error:', err);
        res.status(500).json({
            success: false,
            message: 'Login gagal',
            error: process.env.NODE_ENV === 'production' ? undefined : err.message
        });
    }
});

// ============ API REGISTER ============
app.post('/api/register', registerRateLimit, async (req, res) => {
    const { nama, email, password, no_hp, alamat, role } = req.body;  // ✅ TAMBAHKAN role

    const missing = validateRequired(req.body, ['nama', 'email', 'password']);
    if (missing.length > 0) {
        return res.status(400).json({ success: false, message: `Field wajib diisi: ${missing.join(', ')}` });
    }

    if (password.length < 8) {
        return res.status(400).json({ success: false, message: 'Password minimal 8 karakter' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'Format email tidak valid' });
    }

    try {
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Email sudah terdaftar' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        
        // ✅ PAKAI ROLE DARI REQUEST, DEFAULT 'pelanggan'
        const userRole = role || 'pelanggan';  // ← PERUBAHAN DI SINI!

        const [result] = await pool.query(
            'INSERT INTO users (nama, email, password, role, no_hp, alamat) VALUES (?, ?, ?, ?, ?, ?)',
            [nama.trim(), email.toLowerCase().trim(), hashedPassword, userRole, no_hp || '', alamat || '']
        );

        // ✅ HANYA INSERT KE PELANGGAN JIKA ROLE = pelanggan
        if (userRole === 'pelanggan') {
            await pool.query(
                'INSERT INTO pelanggan (user_id, nama, email, no_hp, alamat, poin, total_transaksi) VALUES (?, ?, ?, ?, ?, 0, 0)',
                [result.insertId, nama.trim(), email.toLowerCase().trim(), no_hp || '', alamat || '']
            );
        }

        await addAktivitas(`User baru terdaftar: ${email} (${userRole})`, 'success');
        res.json({ success: true, message: 'Registrasi berhasil' });
        
    } catch (err) {
        sendError(res, 500, 'Registrasi gagal', err);
    }
});
// ============ API STATISTIK ============
app.get('/api/statistik', authenticate, checkRole(['admin', 'karyawan']), async (req, res) => {
    try {
        console.log('📊 Fetching stats from Aiven database...');
        console.log('👤 User:', req.user?.email);
        
        // ✅ TOTAL PESANAN
        const [totalPesananResult] = await pool.query('SELECT COUNT(*) as total FROM pesanan');
        const totalPesanan = totalPesananResult[0]?.total || 0;
        console.log('📊 totalPesanan:', totalPesanan);
        
        // ✅ TOTAL PENDAPATAN (SEMUA PESANAN)
        const [totalPendapatanResult] = await pool.query('SELECT COALESCE(SUM(total_bayar), 0) as total FROM pesanan');
        const totalPendapatan = totalPendapatanResult[0]?.total || 0;
        console.log('📊 totalPendapatan:', totalPendapatan);
        
        // ✅ STATUS PESANAN (PASTIKAN CASE SENSITIVE)
        const [menungguResult] = await pool.query("SELECT COUNT(*) as total FROM pesanan WHERE status = 'menunggu'");
        const [prosesResult] = await pool.query("SELECT COUNT(*) as total FROM pesanan WHERE status = 'proses'");
        const [selesaiResult] = await pool.query("SELECT COUNT(*) as total FROM pesanan WHERE status = 'selesai'");
        const [diambilResult] = await pool.query("SELECT COUNT(*) as total FROM pesanan WHERE status = 'diambil'");
        
        console.log('📊 Status:', {
            menunggu: menungguResult[0]?.total || 0,
            proses: prosesResult[0]?.total || 0,
            selesai: selesaiResult[0]?.total || 0,
            diambil: diambilResult[0]?.total || 0
        });
        
        // ✅ TOTAL PELANGGAN (DARI USERS)
        const [pelangganResult] = await pool.query("SELECT COUNT(*) as total FROM users WHERE role = 'pelanggan'");
        const totalPelanggan = pelangganResult[0]?.total || 0;
        console.log('📊 totalPelanggan:', totalPelanggan);
        
        // ✅ TOTAL LAYANAN
        const [layananResult] = await pool.query('SELECT COUNT(*) as total FROM layanan');
        const totalLayanan = layananResult[0]?.total || 0;
        console.log('📊 totalLayanan:', totalLayanan);
        
        // ✅ PENDAPATAN PER HARI (7 HARI TERAKHIR)
        const [perHariResult] = await pool.query(`
            SELECT DATE(tanggal_pesan) as tanggal, COALESCE(SUM(total_bayar), 0) as total
            FROM pesanan
            WHERE tanggal_pesan >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(tanggal_pesan)
            ORDER BY tanggal DESC
        `);
        console.log('📊 pendapatanPerHari:', perHariResult);
        
        // ✅ BUILD RESPONSE
        const result = {
            totalPesanan,
            totalPendapatan,
            pesananMenunggu: menungguResult[0]?.total || 0,
            pesananProses: prosesResult[0]?.total || 0,
            pesananSelesai: selesaiResult[0]?.total || 0,
            pesananDiambil: diambilResult[0]?.total || 0,
            totalPelanggan,
            totalLayanan,
            pendapatanPerHari: perHariResult || []
        };
        
        console.log('📊 FINAL RESULT:', JSON.stringify(result, null, 2));
        res.json(result);
        
    } catch (err) {
        console.error('❌ Statistik error:', err);
        console.error('❌ Stack:', err.stack);
        res.status(500).json({ 
            error: 'Gagal mengambil statistik',
            detail: err.message,
            stack: err.stack
        });
    }
});
// ============ [HIGH-6] DATABASE STATUS ============
app.get('/api/database-status', authenticate, checkRole(['admin']), async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ success: true, connected: true, timestamp: new Date().toISOString() });
    } catch (err) {
        res.json({ success: false, connected: false });
    }
});

// ============ API PELANGGAN ============
app.get('/api/pelanggan', authenticate, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM pelanggan ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        sendError(res, 500, 'Gagal mengambil data pelanggan', err);
    }
});

app.post('/api/pelanggan', authenticate, checkRole(['admin']), async (req, res) => {
    try {
        const { user_id, nama, email, no_hp, alamat } = req.body;
        if (!user_id || !nama) return res.status(400).json({ error: 'user_id dan nama wajib diisi' });

        const [result] = await pool.query(
            'INSERT INTO pelanggan (user_id, nama, email, no_hp, alamat, poin, total_transaksi) VALUES (?, ?, ?, ?, ?, 0, 0)',
            [user_id, nama.trim(), email || '', no_hp || '', alamat || '']
        );
        await addAktivitas(`Pelanggan baru ditambahkan: ${nama}`, 'success');
        res.json({ success: true, id: result.insertId });
    } catch (err) {
        sendError(res, 500, 'Gagal menambah pelanggan', err);
    }
});

app.put('/api/pelanggan/:id', authenticate, checkRole(['admin']), async (req, res) => {
    try {
        const { nama, email, no_hp, alamat } = req.body;
        await pool.query(
            'UPDATE pelanggan SET nama = ?, email = ?, no_hp = ?, alamat = ? WHERE id = ?',
            [nama, email, no_hp, alamat, req.params.id]
        );
        await addAktivitas(`Pelanggan ID ${req.params.id} diupdate`, 'info');
        res.json({ success: true });
    } catch (err) {
        sendError(res, 500, 'Gagal update pelanggan', err);
    }
});

app.delete('/api/pelanggan/:id', authenticate, checkRole(['admin']), async (req, res) => {
    try {
        await pool.query('DELETE FROM pelanggan WHERE id = ?', [req.params.id]);
        await addAktivitas(`Pelanggan ID ${req.params.id} dihapus`, 'warning');
        res.json({ success: true });
    } catch (err) {
        sendError(res, 500, 'Gagal hapus pelanggan', err);
    }
});

// ============ API LAYANAN ============
app.get('/api/layanan', authenticate, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM layanan ORDER BY id ASC');
        res.json(rows);
    } catch (err) {
        sendError(res, 500, 'Gagal mengambil layanan', err);
    }
});

app.post('/api/layanan', authenticate, checkRole(['admin']), async (req, res) => {
    try {
        const { nama, harga, estimasi, deskripsi, icon } = req.body;
        if (!nama || !harga) return res.status(400).json({ error: 'nama dan harga wajib diisi' });
        if (isNaN(harga) || harga <= 0) return res.status(400).json({ error: 'harga harus angka positif' });

        const [result] = await pool.query(
            'INSERT INTO layanan (nama, harga, estimasi, deskripsi, icon, status) VALUES (?, ?, ?, ?, ?, ?)',
            [nama.trim(), Number(harga), estimasi || '', deskripsi || '', icon || 'fa-tshirt', 'active']
        );
        await addAktivitas(`Layanan baru: ${nama}`, 'success');
        res.json({ success: true, id: result.insertId });
    } catch (err) {
        sendError(res, 500, 'Gagal menambah layanan', err);
    }
});

app.put('/api/layanan/:id', authenticate, checkRole(['admin']), async (req, res) => {
    try {
        const { nama, harga, estimasi, deskripsi, icon, status } = req.body;
        await pool.query(
            'UPDATE layanan SET nama = ?, harga = ?, estimasi = ?, deskripsi = ?, icon = ?, status = ? WHERE id = ?',
            [nama, Number(harga), estimasi, deskripsi, icon, status, req.params.id]
        );
        await addAktivitas(`Layanan ID ${req.params.id} diupdate`, 'info');
        res.json({ success: true });
    } catch (err) {
        sendError(res, 500, 'Gagal update layanan', err);
    }
});

app.delete('/api/layanan/:id', authenticate, checkRole(['admin']), async (req, res) => {
    try {
        await pool.query('DELETE FROM layanan WHERE id = ?', [req.params.id]);
        await addAktivitas(`Layanan ID ${req.params.id} dihapus`, 'warning');
        res.json({ success: true });
    } catch (err) {
        sendError(res, 500, 'Gagal hapus layanan', err);
    }
});

// ============ API PESANAN ============
app.get('/api/pesanan', authenticate, async (req, res) => {
    try {
        let query = `SELECT id, kode, pelanggan_id, pelanggan_nama as pelangganNama,
                     pelanggan_hp as pelangganHp, pelanggan_alamat as pelangganAlamat,
                     layanan_id, layanan_nama as layananNama, berat, harga_per_kg as hargaPerKg,
                     total_harga as totalHarga, diskon, total_bayar as totalBayar,
                     status, status_pembayaran as statusPembayaran,
                     tanggal_pesan as tanggalPesan, tanggal_masuk as tanggalMasuk,
                     tanggal_selesai as tanggalSelesai, jadwal_jemput as jadwalJemput,
                     catatan, created_at, midtrans_order_id, payment_status
                     FROM pesanan`;
        let params = [];

        if (req.user.role === 'pelanggan') {
            query += ' WHERE pelanggan_id = ? ORDER BY id DESC';
            params = [req.user.id];
        } else {
            query += ' ORDER BY id DESC';
        }

        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const offset = Math.max(parseInt(req.query.offset) || 0, 0);
        query += ` LIMIT ${limit} OFFSET ${offset}`;

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        sendError(res, 500, 'Gagal mengambil pesanan', err);
    }
});

// ============ API PESANAN - POST ============
app.post('/api/pesanan', authenticate, async (req, res) => {
    try {
        console.log('📦 Request body:', req.body);
        console.log('👤 User:', req.user);

        const pelangganId = req.user.id;
        const pelangganNama = req.user.nama;
        const pelangganHp = req.user.no_hp || '';
        const pelangganAlamat = req.user.alamat || '';

        const { layananId, jadwalJemput, catatan } = req.body;

        if (!layananId) {
            return res.status(400).json({ error: 'Layanan wajib dipilih' });
        }

        const [layananRows] = await pool.query('SELECT nama, harga FROM layanan WHERE id = ?', [layananId]);
        if (layananRows.length === 0) {
            return res.status(400).json({ error: 'Layanan tidak ditemukan' });
        }

        const layananNama = layananRows[0].nama;
        const hargaPerKg = layananRows[0].harga;
        const kode = generateOrderCode();
        const tanggalPesan = new Date().toISOString().split('T')[0];

        const [result] = await pool.query(`
            INSERT INTO pesanan 
            (kode, pelanggan_id, pelanggan_nama, pelanggan_hp, pelanggan_alamat,
             layanan_id, layanan_nama, harga_per_kg, 
             status, status_pembayaran, tanggal_pesan, jadwal_jemput, catatan)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            kode,
            pelangganId,
            pelangganNama,
            pelangganHp,
            pelangganAlamat,
            layananId,
            layananNama,
            hargaPerKg,
            'menunggu',
            'belum',
            tanggalPesan,
            jadwalJemput || null,
            catatan || ''
        ]);

        await addAktivitas(`Pesanan baru: ${kode} dari ${pelangganNama}`, 'success');

        res.json({
            success: true,
            id: result.insertId,
            kode,
            layanan_nama: layananNama,
            pelanggan_nama: pelangganNama
        });
    } catch (err) {
        console.error('❌ Error add pesanan:', err);
        res.status(500).json({
            error: 'Gagal membuat pesanan',
            detail: err.message
        });
    }
});

// ============ [CRIT-3] PUT PESANAN ============
app.put('/api/pesanan/:id', authenticate, checkRole(['admin', 'karyawan']), async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'ID tidak valid' });

        const ALLOWED_FIELDS = {
            status: 'status',
            status_pembayaran: 'status_pembayaran',
            catatan: 'catatan',
            jadwal_jemput: 'jadwal_jemput',
            berat: 'berat',
            diskon: 'diskon',
            tanggal_masuk: 'tanggal_masuk',
        };

        const fields = [];
        const values = [];

        for (const [bodyKey, colName] of Object.entries(ALLOWED_FIELDS)) {
            if (req.body[bodyKey] !== undefined) {
                fields.push(`${colName} = ?`);
                values.push(req.body[bodyKey]);
            }
        }

        if (fields.length === 0) {
            return res.status(400).json({ error: 'Tidak ada field yang valid untuk diupdate' });
        }

        if (req.body.berat !== undefined) {
            const [[pesananLama]] = await pool.query('SELECT harga_per_kg, diskon FROM pesanan WHERE id = ?', [id]);
            if (pesananLama) {
                const berat = Math.max(0, parseFloat(req.body.berat) || 0);
                const diskon = parseFloat(req.body.diskon ?? pesananLama.diskon) || 0;
                const totalHarga = berat * pesananLama.harga_per_kg;
                const totalBayar = Math.max(0, totalHarga - diskon);
                fields.push('total_harga = ?', 'total_bayar = ?');
                values.push(totalHarga, totalBayar);
            }
        }

        values.push(id);
        await pool.query(`UPDATE pesanan SET ${fields.join(', ')} WHERE id = ?`, values);

        if (req.body.status === 'selesai') {
            await pool.query('UPDATE pesanan SET tanggal_selesai = CURDATE() WHERE id = ?', [id]);
        }

        if (req.body.status_pembayaran === 'lunas') {
            const [[pesanan]] = await pool.query('SELECT pelanggan_id, total_bayar FROM pesanan WHERE id = ?', [id]);
            if (pesanan?.pelanggan_id) {
                const poinBaru = Math.floor(pesanan.total_bayar / 1000);
                await pool.query(
                    'UPDATE pelanggan SET poin = poin + ?, total_transaksi = total_transaksi + 1 WHERE user_id = ?',
                    [poinBaru, pesanan.pelanggan_id]
                );
            }
        }

        await addAktivitas(`Pesanan ID ${id} diupdate oleh ${req.user.email}`, 'info');
        res.json({ success: true });
    } catch (err) {
        sendError(res, 500, 'Gagal update pesanan', err);
    }
});

app.delete('/api/pesanan/:id', authenticate, checkRole(['admin']), async (req, res) => {
    try {
        await pool.query('DELETE FROM pesanan WHERE id = ?', [req.params.id]);
        await addAktivitas(`Pesanan ID ${req.params.id} dihapus oleh ${req.user.email}`, 'warning');
        res.json({ success: true });
    } catch (err) {
        sendError(res, 500, 'Gagal hapus pesanan', err);
    }
});

// ============ API USERS ============
app.get('/api/users', authenticate, checkRole(['admin']), async (req, res) => {
    try {
        console.log('📋 GET /api/users - User:', req.user.email);
        
        const [rows] = await pool.query(
            'SELECT id, nama, email, role, no_hp, alamat, created_at FROM users ORDER BY id DESC'
        );
        
        console.log('📋 Users found:', rows.length);
        res.json(rows);
        
    } catch (err) {
        console.error('❌ Error get users:', err);
        sendError(res, 500, 'Gagal mengambil users', err);
    }
});

// ============ DELETE USER ============
app.delete('/api/users/:id', authenticate, checkRole(['admin']), async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        console.log(`🗑️ DELETE /api/users/${userId} - User:`, req.user.email);
        
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'ID user tidak valid' });
        }
        
        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Tidak bisa menghapus akun sendiri dari sini' });
        }
        
        // Cek user ada
        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'User tidak ditemukan' });
        }
        
        // Hapus relasi di pelanggan
        await pool.query('DELETE FROM pelanggan WHERE user_id = ?', [userId]);
        
        // Update pesanan (set pelanggan_id jadi NULL)
        await pool.query('UPDATE pesanan SET pelanggan_id = NULL WHERE pelanggan_id = ?', [userId]);
        
        // Hapus user
        await pool.query('DELETE FROM users WHERE id = ?', [userId]);
        
        await addAktivitas(`User "${users[0].nama}" (ID ${userId}) dihapus oleh ${req.user.email}`, 'warning');
        
        res.json({ 
            success: true, 
            message: `User "${users[0].nama}" berhasil dihapus` 
        });
        
    } catch (err) {
        console.error('❌ Error delete user:', err);
        res.status(500).json({ 
            error: 'Gagal hapus user',
            detail: err.message
        });
    }
});

// ============ UPDATE USER ============
app.put('/api/users/:id', authenticate, checkRole(['admin']), async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        console.log(`✏️ PUT /api/users/${userId} - User:`, req.user.email);
        console.log('📝 Body:', req.body);
        
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'ID user tidak valid' });
        }
        
        // Cek user ada
        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'User tidak ditemukan' });
        }
        
        const { nama, role, no_hp, alamat } = req.body;
        
        // ✅ VALIDASI
        if (!nama || nama.trim() === '') {
            return res.status(400).json({ error: 'Nama wajib diisi' });
        }
        
        // ✅ UPDATE USER
        await pool.query(
            'UPDATE users SET nama = ?, role = ?, no_hp = ?, alamat = ? WHERE id = ?',
            [nama.trim(), role || 'pelanggan', no_hp || '', alamat || '', userId]
        );
        
        // ✅ UPDATE PELANGGAN (jika role pelanggan)
        if (role === 'pelanggan') {
            // Cek apakah user sudah ada di tabel pelanggan
            const [existingPelanggan] = await pool.query('SELECT * FROM pelanggan WHERE user_id = ?', [userId]);
            
            if (existingPelanggan.length === 0) {
                // Insert ke pelanggan jika belum ada
                await pool.query(
                    'INSERT INTO pelanggan (user_id, nama, email, no_hp, alamat, poin, total_transaksi) VALUES (?, ?, ?, ?, ?, 0, 0)',
                    [userId, nama.trim(), users[0].email, no_hp || '', alamat || '']
                );
            } else {
                // Update pelanggan jika sudah ada
                await pool.query(
                    'UPDATE pelanggan SET nama = ?, no_hp = ?, alamat = ? WHERE user_id = ?',
                    [nama.trim(), no_hp || '', alamat || '', userId]
                );
            }
        } else {
            // Jika role bukan pelanggan, hapus dari pelanggan
            await pool.query('DELETE FROM pelanggan WHERE user_id = ?', [userId]);
        }
        
        await addAktivitas(`User "${nama}" (ID ${userId}) diupdate oleh ${req.user.email}`, 'info');
        
        res.json({ 
            success: true, 
            message: `User "${nama}" berhasil diupdate` 
        });
        
    } catch (err) {
        console.error('❌ Error update user:', err);
        res.status(500).json({ 
            error: 'Gagal update user',
            detail: err.message
        });
    }
});

// ============ API AKTIVITAS ============
app.get('/api/aktivitas', authenticate, checkRole(['admin', 'karyawan']), async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const [rows] = await pool.query('SELECT * FROM aktivitas ORDER BY id DESC LIMIT ?', [limit]);
        res.json(rows);
    } catch (err) {
        sendError(res, 500, 'Gagal mengambil aktivitas', err);
    }
});

app.post('/api/aktivitas', authenticate, checkRole(['admin', 'karyawan']), async (req, res) => {
    try {
        const { deskripsi, tipe } = req.body;
        if (!deskripsi) return res.status(400).json({ error: 'deskripsi wajib diisi' });
        await pool.query('INSERT INTO aktivitas (deskripsi, tipe) VALUES (?, ?)', [deskripsi, tipe || 'info']);
        res.json({ success: true });
    } catch (err) {
        sendError(res, 500, 'Gagal tambah aktivitas', err);
    }
});

// ============ API PROFILE ============
app.put('/api/profile', authenticate, async (req, res) => {
    try {
        const { nama, no_hp, alamat } = req.body;
        if (!nama || nama.trim() === '') return res.status(400).json({ error: 'Nama wajib diisi' });

        await pool.query(
            'UPDATE users SET nama = ?, no_hp = ?, alamat = ? WHERE id = ?',
            [nama.trim(), no_hp || '', alamat || '', req.user.id]
        );
        await pool.query(
            'UPDATE pelanggan SET nama = ?, no_hp = ?, alamat = ? WHERE user_id = ?',
            [nama.trim(), no_hp || '', alamat || '', req.user.id]
        );

        const [[updated]] = await pool.query(
            'SELECT id, nama, email, role, no_hp, alamat FROM users WHERE id = ?',
            [req.user.id]
        );
        await addAktivitas(`${req.user.email} update profil`, 'info');
        res.json(updated);
    } catch (err) {
        sendError(res, 500, 'Gagal update profil', err);
    }
});

app.post('/api/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Password wajib diisi' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: 'Password baru minimal 8 karakter' });
        }

        const [[user]] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
        if (!await bcrypt.compare(currentPassword, user.password)) {
            return res.status(400).json({ success: false, message: 'Password saat ini salah' });
        }

        const hashed = await bcrypt.hash(newPassword, 12);
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
        await addAktivitas(`${req.user.email} mengubah password`, 'info');
        res.json({ success: true, message: 'Password berhasil diubah' });
    } catch (err) {
        sendError(res, 500, 'Gagal mengubah password', err);
    }
});

app.delete('/api/delete-account', authenticate, async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = ?', [req.user.id]);
        res.json({ success: true, message: 'Akun berhasil dihapus' });
    } catch (err) {
        sendError(res, 500, 'Gagal hapus akun', err);
    }
});

// ============ NOTIFICATION SETTINGS ============
app.get('/api/notification-settings', authenticate, async (req, res) => {
    res.json({ emailNotifications: true, smsNotifications: false, whatsappNotifications: true });
});

app.post('/api/notification-settings', authenticate, async (req, res) => {
    await addAktivitas(`${req.user.email} update notification settings`, 'info');
    res.json({ success: true });
});

// ============ [CRIT-4] FORGOT PASSWORD ============
const resetTokens = new Map();

app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email wajib diisi' });

    try {
        const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);

        if (users.length === 0) {
            return res.json({ success: true, message: 'Jika email terdaftar, link reset akan dikirimkan' });
        }

        const crypto = require('crypto');
        const token = crypto.randomBytes(32).toString('hex');
        resetTokens.set(email.toLowerCase().trim(), { token, expiresAt: Date.now() + 3600000 });

        if (process.env.NODE_ENV !== 'production') {
            console.log(`\n🔐 [DEV ONLY] RESET TOKEN untuk ${email}: ${token}\n`);
        }

        res.json({ success: true, message: 'Jika email terdaftar, link reset akan dikirimkan' });
    } catch (err) {
        sendError(res, 500, 'Gagal proses reset password', err);
    }
});

app.post('/api/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
        return res.status(400).json({ success: false, message: 'Token dan password baru wajib diisi' });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ success: false, message: 'Password minimal 8 karakter' });
    }

    try {
        let foundEmail = null;
        for (const [email, data] of resetTokens.entries()) {
            if (data.token === token && data.expiresAt > Date.now()) {
                foundEmail = email;
                break;
            }
        }

        if (!foundEmail) {
            return res.status(400).json({ success: false, message: 'Token tidak valid atau sudah kadaluarsa' });
        }

        const hashed = await bcrypt.hash(newPassword, 12);
        await pool.query('UPDATE users SET password = ? WHERE email = ?', [hashed, foundEmail]);
        resetTokens.delete(foundEmail);
        res.json({ success: true, message: 'Password berhasil direset' });
    } catch (err) {
        sendError(res, 500, 'Gagal reset password', err);
    }
});

// ============ MIDTRANS PAYMENT API ============

// Create Payment Token
app.post('/api/create-payment-token', authenticate, async (req, res) => {
    try {
        const { orderId } = req.body;
        console.log('💰 Creating payment token for order:', orderId);
        console.log('📌 Environment:', process.env.MIDTRANS_IS_PRODUCTION === 'true' ? 'PRODUCTION' : 'SANDBOX');

        const [orders] = await pool.query(
            'SELECT * FROM pesanan WHERE id = ? AND pelanggan_id = ?',
            [orderId, req.user.id]
        );

        if (orders.length === 0) {
            return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
        }

        const order = orders[0];

        if (order.status_pembayaran === 'lunas') {
            return res.status(400).json({ error: 'Pesanan sudah lunas' });
        }

        const grossAmount = parseInt(order.total_bayar || 0);
        if (grossAmount <= 0) {
            return res.status(400).json({
                error: 'Total pembayaran tidak valid (Rp 0)',
                detail: 'Pesanan belum memiliki berat atau total harga'
            });
        }

        if (grossAmount < 1000) {
            return res.status(400).json({
                error: 'Minimal pembayaran Rp 1.000',
                detail: `Total saat ini: Rp ${grossAmount}`
            });
        }

        const midtransOrderId = `ORDER-${order.kode}-${Date.now()}`;

        const parameter = {
            transaction_details: {
                order_id: midtransOrderId,
                gross_amount: grossAmount
            },
            customer_details: {
                first_name: order.pelanggan_nama || req.user.nama || 'Pelanggan',
                email: req.user.email || 'customer@example.com',
                phone: order.pelanggan_hp || req.user.no_hp || '081234567890'
            },
            item_details: [{
                id: String(order.layanan_id || 1),
                price: parseInt(order.harga_per_kg || 0),
                quantity: parseInt(order.berat || 1),
                name: order.layanan_nama || 'Layanan Laundry'
            }],
            custom_field1: order.kode,
            custom_field2: `Pesanan Laundry - ${order.kode}`
        };

        console.log('📦 Midtrans parameter:', JSON.stringify(parameter, null, 2));

        const transaction = await snap.createTransaction(parameter);

        await pool.query(
            'UPDATE pesanan SET midtrans_order_id = ? WHERE id = ?',
            [midtransOrderId, orderId]
        );

        res.json({
            success: true,
            token: transaction.token,
            redirect_url: transaction.redirect_url
        });

    } catch (error) {
        console.error('❌ Midtrans Error:', error);
        res.status(500).json({
            error: 'Gagal membuat pembayaran',
            detail: error.message
        });
    }
});

// Payment Notification (Webhook)
// ============ WEBHOOK MIDTRANS ============
app.post('/api/payment-notification', async (req, res) => {
    try {
        const notification = req.body;
        console.log('📨 Webhook called!');
        console.log('📨 Body:', JSON.stringify(notification, null, 2));

        const { order_id, transaction_status } = notification;

        if (!order_id) {
            console.log('❌ No order_id');
            return res.status(400).json({ error: 'No order_id' });
        }

        // ✅ Cari pesanan berdasarkan midtrans_order_id
        const [orders] = await pool.query(
            'SELECT id, status_pembayaran FROM pesanan WHERE midtrans_order_id = ?',
            [order_id]
        );

        if (orders.length === 0) {
            console.log('❌ Order not found:', order_id);
            return res.status(404).json({ error: 'Order not found' });
        }

        const orderId = orders[0].id;
        console.log('✅ Order found:', orderId);

        if (transaction_status === 'capture' || transaction_status === 'settlement') {
            // ✅ PAKAI TANDA PETIK UNTUK ENUM VALUE!
            await pool.query(
                'UPDATE pesanan SET status_pembayaran = ?, payment_status = ? WHERE id = ?',
                ['lunas', transaction_status, orderId]  // ← 'lunas' pakai petik
            );
            console.log(`✅ Order ${orderId} updated to lunas`);
            
            // Tambah poin
            const [orders2] = await pool.query(
                'SELECT pelanggan_id, total_bayar FROM pesanan WHERE id = ?',
                [orderId]
            );
            
            if (orders2.length > 0) {
                const pelangganId = orders2[0].pelanggan_id;
                const totalBayar = orders2[0].total_bayar;
                const poinBaru = Math.floor(totalBayar / 1000);
                await pool.query(
                    'UPDATE pelanggan SET poin = poin + ?, total_transaksi = total_transaksi + 1 WHERE user_id = ?',
                    [poinBaru, pelangganId]
                );
            }
        }

        res.json({ success: true });

    } catch (error) {
        console.error('❌ Webhook error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Check Payment Status
app.get('/api/payment-status/:orderId', authenticate, async (req, res) => {
    try {
        const orderId = req.params.orderId;
        console.log('🔍 Checking payment status for order:', orderId);

        const [orders] = await pool.query(
            'SELECT midtrans_order_id, status_pembayaran, payment_status FROM pesanan WHERE id = ? AND pelanggan_id = ?',
            [orderId, req.user.id]
        );

        if (orders.length === 0) {
            return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
        }

        res.json({
            success: true,
            status: orders[0].status_pembayaran,
            payment_status: orders[0].payment_status,
            midtrans_order_id: orders[0].midtrans_order_id
        });

    } catch (error) {
        console.error('❌ Payment status error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ SERVE FRONTEND ============
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, '../frontend/login.html')));
app.get('/register.html', (req, res) => res.sendFile(path.join(__dirname, '../frontend/register.html')));
app.get('/offline.html', (req, res) => res.sendFile(path.join(__dirname, '../frontend/offline.html')));

// ============ [HIGH-3] PATH TRAVERSAL FIX ============
function safeFile(res, dir, filename, allowedExt) {
    if (!filename || /[/\\]/.test(filename) || filename.includes('..')) {
        return res.status(400).send('Invalid filename');
    }
    const ext = path.extname(filename).toLowerCase();
    if (!allowedExt.includes(ext)) {
        return res.status(400).send('File type not allowed');
    }
    const fullPath = path.join(__dirname, dir, filename);
    res.sendFile(fullPath, err => {
        if (err) res.status(404).send('Not found');
    });
}

app.get('/pages/:page', (req, res) => safeFile(res, '../frontend/pages', req.params.page, ['.html']));
app.get('/js/:file', (req, res) => safeFile(res, '../frontend/js', req.params.file, ['.js']));
app.get('/css/:file', (req, res) => safeFile(res, '../frontend/css', req.params.file, ['.css']));
app.get('/icons/:file', (req, res) => safeFile(res, '../frontend/icons', req.params.file, ['.png', '.svg', '.ico', '.webp']));

app.get('/manifest.json', (req, res) => res.sendFile(path.join(__dirname, '../frontend/manifest.json')));
app.get('/service-worker.js', (req, res) => res.sendFile(path.join(__dirname, '../frontend/service-worker.js')));

// ============ 404 handler ============
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Endpoint tidak ditemukan' });
    }
    res.status(404).send('Not Found');
});

// ============ START SERVER ============
// ✅ Ekspor untuk Vercel
module.exports = app;

// Jalankan jika bukan di Vercel
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`\n✅ Laundry Server berjalan di http://localhost:${PORT}`);
        console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`   Midtrans: ${process.env.MIDTRANS_SERVER_KEY ? '✅ Configured' : '❌ Not configured'}`);
    });
}