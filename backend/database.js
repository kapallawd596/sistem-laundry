// backend/database.js
// ✅ FIXED: Semua kredensial dipindahkan ke .env
// ❌ SEBELUMNYA: host, port, user, password di-hardcode langsung di sini

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Validasi env variables wajib saat startup
const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missing = required.filter(key => !process.env[key]);
if (missing.length > 0) {
    console.error(`❌ ENV VARIABLES TIDAK ADA: ${missing.join(', ')}`);
    console.error('   Pastikan file .env sudah ada dan diisi dengan benar.');
    process.exit(1);
}

// ✅ FIXED: SSL dengan verifikasi sertifikat aktif
// ❌ SEBELUMNYA: rejectUnauthorized: false (rentan MitM attack)
let sslConfig = { rejectUnauthorized: true };

// Cek apakah ada file CA cert dari Aiven
const caPath = path.join(__dirname, 'ca-cert-aiven.pem');
if (fs.existsSync(caPath)) {
    sslConfig.ca = fs.readFileSync(caPath);
    console.log('✅ SSL CA certificate loaded dari ca-cert-aiven.pem');
} else {
    // Fallback: tetap verifikasi tapi tanpa custom CA
    // Download CA cert dari Aiven dashboard jika perlu
    console.warn('⚠️  ca-cert-aiven.pem tidak ditemukan. Menggunakan sistem CA default.');
}

const pool = mysql.createPool({
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT),
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: sslConfig,
    waitForConnections: true,
    connectionLimit:    parseInt(process.env.DB_POOL_SIZE) || 10,
    queueLimit: 0,
    // Timeout koneksi
    connectTimeout: 10000,
});

// Test koneksi saat startup
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log(`✅ MySQL Connected ke ${process.env.DB_HOST}`);
        connection.release();
    } catch (err) {
        console.error('❌ MySQL Connection Error:', err.message);
        // Jangan exit — biarkan health check endpoint yang tangani
    }
})();

module.exports = pool;
