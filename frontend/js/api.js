/**
 * frontend/js/api.js — VERSI FINAL
 * Sumber data: Database Aiven (via Backend)
 * Semua data dari API, JANGAN hitung manual di frontend!
 */

// ============ KONFIGURASI URL ============
const API_URLS = {
    local:  'http://localhost:3000/api',
    vercel: 'https://web-app-sistem-londryint.vercel.app/api'
};

function getApiBaseUrl() {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    return isLocal ? API_URLS.local : API_URLS.vercel;
}

const API_BASE = getApiBaseUrl();

// ============ HELPER ============
function getBearerToken() {
    const token = localStorage.getItem('token');
    return token ? `Bearer ${token}` : '';
}

// ============ CLASS API ============
class LaundryAPI {
    // ============================================================
    // REQUEST - SEMUA API CALL LEWAT SINI
    // ============================================================
    static async request(endpoint, options = {}) {
        const token = getBearerToken();

        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': token } : {}),
                    ...(options.headers || {}),
                },
            });

            // ✅ 401 - Token expired
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('currentUser');
                window.location.href = '/login.html';
                throw new Error('Sesi habis, silakan login kembali');
            }

            // ✅ 429 - Rate limiting
            if (response.status === 429) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || 'Terlalu banyak percobaan, coba lagi nanti');
            }

            // ✅ Error lainnya
            if (!response.ok) {
                let errData = {};
                try { errData = await response.json(); } catch (_) {}
                throw new Error(errData.error || errData.message || `Server error (${response.status})`);
            }

            return response.json();
        } catch (networkErr) {
            if (networkErr.message && networkErr.message.includes('fetch')) {
                throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
            }
            throw networkErr;
        }
    }

    // ============================================================
    // NORMALISASI DATA (snake_case → camelCase)
    // ============================================================
    static normalizePesanan(item) {
        if (!item) return null;
        
        return {
            id: item.id,
            kode: item.kode,
            pelangganId: item.pelanggan_id || item.pelangganId,
            pelangganNama: item.pelanggan_nama || item.pelangganNama,
            pelangganHp: item.pelanggan_hp || item.pelangganHp,
            pelangganAlamat: item.pelanggan_alamat || item.pelangganAlamat,
            layananId: item.layanan_id || item.layananId,
            layananNama: item.layanan_nama || item.layananNama,
            berat: parseFloat(item.berat) || 0,
            hargaPerKg: item.harga_per_kg || item.hargaPerKg || 0,
            totalHarga: parseFloat(item.total_harga || item.totalHarga) || 0,
            diskon: parseFloat(item.diskon) || 0,
            totalBayar: parseFloat(item.total_bayar || item.totalBayar) || 0,
            status: item.status || 'menunggu',
            statusPembayaran: item.status_pembayaran || item.statusPembayaran || 'belum',
            tanggalPesan: item.tanggal_pesan || item.tanggalPesan,
            tanggalMasuk: item.tanggal_masuk || item.tanggalMasuk,
            tanggalSelesai: item.tanggal_selesai || item.tanggalSelesai,
            jadwalJemput: item.jadwal_jemput || item.jadwalJemput,
            catatan: item.catatan,
            createdAt: item.created_at || item.createdAt,
            midtransOrderId: item.midtrans_order_id || item.midtransOrderId,
            paymentStatus: item.payment_status || item.paymentStatus
        };
    }

    static normalizePelanggan(item) {
        if (!item) return null;
        
        return {
            id: item.id,
            user_id: item.user_id || item.userId,
            nama: item.nama,
            email: item.email,
            no_hp: item.no_hp || item.noHp,
            alamat: item.alamat,
            poin: item.poin || 0,
            totalTransaksi: item.total_transaksi || item.totalTransaksi || 0,
            createdAt: item.created_at || item.createdAt
        };
    }

    static normalizeLayanan(item) {
        if (!item) return null;
        
        return {
            id: item.id,
            nama: item.nama,
            harga: item.harga || 0,
            estimasi: item.estimasi,
            deskripsi: item.deskripsi,
            status: item.status || 'active'
        };
    }

    static normalizeUser(item) {
        if (!item) return null;
        
        return {
            id: item.id,
            nama: item.nama,
            email: item.email,
            role: item.role,
            no_hp: item.no_hp || item.noHp,
            alamat: item.alamat,
            createdAt: item.created_at || item.createdAt
        };
    }

    // ============================================================
    // AUTH
    // ============================================================
    static async login(email, password) {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        return response.json();
    }

    static async register(data) {
        const { role: _removed, ...safeData } = data;
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(safeData),
        });
        return response.json();
    }

    // ============================================================
    // USERS
    
static async getUsers() {
    const data = await this.request('/users');
    if (Array.isArray(data)) {
        return data.map(item => this.normalizeUser(item));
    }
    return this.normalizeUser(data);
}

static async deleteUser(id) {
    if (!id) throw new Error('ID user tidak valid');
    return this.request(`/users/${id}`, { method: 'DELETE' });
}

static async updateUser(id, data) {
    if (!id) throw new Error('ID user tidak valid');
    return this.request(`/users/${id}`, { 
        method: 'PUT', 
        body: JSON.stringify(data) 
    });
}

static async updateProfile(data) {
    return this.request('/profile', { method: 'PUT', body: JSON.stringify(data) });
}
    // ============================================================
    // SETTINGS
    // ============================================================
    static async changePassword(currentPassword, newPassword) {
        return this.request('/change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword }),
        });
    }
    
    static async deleteAccount() {
        return this.request('/delete-account', { method: 'DELETE' });
    }
    
    static async getNotificationSettings() {
        return this.request('/notification-settings');
    }
    
    static async saveNotificationSettings(settings) {
        return this.request('/notification-settings', { 
            method: 'POST', 
            body: JSON.stringify(settings) 
        });
    }

    // ============================================================
    // PELANGGAN
    // ============================================================
    static async getPelanggan() {
        const data = await this.request('/pelanggan');
        if (Array.isArray(data)) {
            return data.map(item => this.normalizePelanggan(item));
        }
        return this.normalizePelanggan(data);
    }
    
    static async addPelanggan(data) {
        return this.request('/pelanggan', { method: 'POST', body: JSON.stringify(data) });
    }
    
    static async updatePelanggan(id, data) {
        return this.request(`/pelanggan/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    }
    
    static async deletePelanggan(id) {
        return this.request(`/pelanggan/${id}`, { method: 'DELETE' });
    }

    // ============================================================
    // LAYANAN
    // ============================================================
    static async getLayanan() {
        const data = await this.request('/layanan');
        if (Array.isArray(data)) {
            return data.map(item => this.normalizeLayanan(item));
        }
        return this.normalizeLayanan(data);
    }
    
    static async addLayanan(data) {
        return this.request('/layanan', { method: 'POST', body: JSON.stringify(data) });
    }
    
    static async updateLayanan(id, data) {
        return this.request(`/layanan/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    }
    
    static async deleteLayanan(id) {
        return this.request(`/layanan/${id}`, { method: 'DELETE' });
    }

    // ============================================================
    // PESANAN
    // ============================================================
    static async getPesanan(params = {}) {
        const query = new URLSearchParams(params).toString();
        const endpoint = query ? `/pesanan?${query}` : '/pesanan';
        const data = await this.request(endpoint);
        
        if (Array.isArray(data)) {
            return data.map(item => this.normalizePesanan(item));
        }
        return this.normalizePesanan(data);
    }
    
    static async addPesanan(data) {
        return this.request('/pesanan', { method: 'POST', body: JSON.stringify(data) });
    }
    
    static async updatePesanan(id, data) {
        return this.request(`/pesanan/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    }
    
    static async deletePesanan(id) {
        return this.request(`/pesanan/${id}`, { method: 'DELETE' });
    }

    // ============================================================
    // TRACKING KURIR LIVE
    // ============================================================
    // Admin/karyawan: generate link kurir (token) untuk 1 pesanan yang siap diantar
    static async generateKurirLink(id) {
        return this.request(`/pesanan/${id}/kurir-link`, { method: 'POST' });
    }

    // Pelanggan/admin/karyawan: polling status + posisi live kurir untuk 1 pesanan
    static async getTrackingOrder(id) {
        return this.request(`/tracking/order/${id}`);
    }

    // ============================================================
    // RATING & ULASAN
    // ============================================================
    // Pelanggan: kirim ulasan (1-5 bintang + komentar) untuk pesanan yang sudah diambil
    static async addUlasan(pesananId, rating, komentar) {
        return this.request(`/pesanan/${pesananId}/ulasan`, {
            method: 'POST',
            body: JSON.stringify({ rating, komentar })
        });
    }

    // Cek apakah 1 pesanan sudah diberi ulasan (null kalau belum)
    static async getUlasanPesanan(pesananId) {
        return this.request(`/pesanan/${pesananId}/ulasan`);
    }

    // Admin/karyawan: daftar semua ulasan masuk + rata-rata rating
    static async getAllUlasan() {
        return this.request('/ulasan');
    }

    // ============================================================
    // STATISTIK & AKTIVITAS - DATA LANGSUNG DARI DATABASE AIVEN
    // ============================================================
    static async getStatistik() {
        // ✅ DATA LANGSUNG DARI DATABASE AIVEN (via backend)
        return this.request('/statistik');
    }
    
    static async getAktivitas(limit) {
        const q = limit ? `?limit=${limit}` : '';
        return this.request(`/aktivitas${q}`);
    }
    
    static async addAktivitas(data) {
        return this.request('/aktivitas', { method: 'POST', body: JSON.stringify(data) });
    }

    // ============================================================
    // LAPORAN
    // ============================================================
    static async getLaporan(params = {}) {
        const query = new URLSearchParams(params).toString();
        const endpoint = query ? `/laporan?${query}` : '/laporan';
        return this.request(endpoint);
    }

    static async getLaporanPeriode(startDate, endDate) {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        return this.request(`/laporan/periode?${params}`);
    }

    static async getLaporanPerLayanan() {
        return this.request('/laporan/layanan');
    }

    static async getLaporanPerStatus() {
        return this.request('/laporan/status');
    }

    static async getDashboardStats() {
        return this.request('/dashboard/stats');
    }

    // ============================================================
    // MIDTRANS PAYMENT
    // ============================================================
    static async createPaymentToken(orderId) {
        return this.request('/create-payment-token', {
            method: 'POST',
            body: JSON.stringify({ orderId })
        });
    }

    static async checkPaymentStatus(orderId) {
        return this.request(`/payment-status/${orderId}`);
    }

    // ============================================================
    // EXPORT DATA
    // ============================================================
    static async exportData(type, startDate, endDate) {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const response = await fetch(`${API_BASE}/export/${type}?${params}`, {
            headers: { 'Authorization': getBearerToken() },
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Export gagal');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export_${type}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        return { success: true };
    }
}

// ============================================================
// EXPOSE GLOBALS
// ============================================================
window.LaundryAPI = LaundryAPI;
window.API_BASE = API_BASE;

console.log('✅ API Loaded - Base URL:', API_BASE);
console.log('📊 Sumber data: Database Aiven (via Backend)');