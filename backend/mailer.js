// backend/mailer.js
// ============================================================
// Utility untuk mengirim email sungguhan (SMTP) menggunakan nodemailer.
// Dipakai oleh fitur forgot-password di server.js
// ============================================================

const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Membuat (atau mengambil cache) transporter nodemailer dari env vars.
 * Kalau env belum diisi, return null supaya caller bisa fallback ke
 * mode dev (console.log token) tanpa bikin server crash.
 */
function getTransporter() {
    if (transporter) return transporter;

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        console.warn('⚠️  SMTP belum dikonfigurasi (.env) — email TIDAK akan terkirim, hanya di-log.');
        return null;
    }

    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: Number(SMTP_PORT) === 465, // true kalau pakai port 465 (SSL)
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
        }
    });

    return transporter;
}

/**
 * Kirim email berisi token reset password.
 * @param {string} to - email tujuan
 * @param {string} token - token reset password
 * @returns {Promise<boolean>} true kalau berhasil terkirim
 */
async function sendResetPasswordEmail(to, token) {
    const t = getTransporter();

    if (!t) {
        // SMTP belum dikonfigurasi -> fallback log supaya development tetap jalan
        console.log(`\n🔐 [DEV FALLBACK] SMTP belum diset, token untuk ${to}: ${token}\n`);
        return false;
    }

    const fromName = process.env.SMTP_FROM_NAME || 'Laundry App';
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color:#2563eb;">Reset Password</h2>
            <p>Kami menerima permintaan untuk mereset password akun Anda.</p>
            <p>Gunakan kode OTP berikut di halaman reset password:</p>
            <div style="background:#f3f4f6; padding:20px; border-radius:8px; text-align:center; font-size:32px; font-weight:bold; letter-spacing:8px;">
                ${token}
            </div>
            <p style="margin-top:16px; color:#6b7280; font-size:13px;">
                Kode ini berlaku selama <strong>10 menit</strong>. Jika Anda tidak merasa meminta reset password,
                abaikan email ini — password Anda tidak akan berubah.
            </p>
        </div>
    `;

    try {
        await t.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to,
            subject: 'Kode OTP Reset Password - Laundry App',
            html,
            text: `Kode OTP reset password Anda: ${token} (berlaku 10 menit)`
        });
        console.log(`✅ Email reset password berhasil dikirim ke ${to}`);
        return true;
    } catch (err) {
        console.error('❌ Gagal mengirim email reset password:', err.message);
        return false;
    }
}

module.exports = { sendResetPasswordEmail };
