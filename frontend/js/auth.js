/**
 * frontend/js/auth.js — VERSI FIXED
 * ============================================================
 * PERBAIKAN:
 * ✅ [HIGH-2] Tambah escapeHtml() — wajib dipakai di semua innerHTML
 * ✅ [HIGH-8] Token dikirim dengan format Bearer (via api.js)
 * ✅ [MEDIUM] Hapus duplikasi initMobileSidebar (ada di utils.js juga)
 * ✅ [LOW]    Validasi JSON.parse currentUser yang aman
 * ============================================================
 */

// ============================================================
// [HIGH-2] WAJIB DIPAKAI DI SELURUH CODEBASE
// Gunakan escapeHtml() setiap kali memasukkan data ke innerHTML
//
// ❌ JANGAN: element.innerHTML = `<td>${user.nama}</td>`
// ✅ HARUS:  element.innerHTML = `<td>${escapeHtml(user.nama)}</td>`
// ============================================================
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
}

// Ekspor global — tersedia di semua halaman yang load auth.js
window.escapeHtml = escapeHtml;

// ============================================================
class Auth {
    constructor() {
        this.currentUser = null;
        this.token       = null;
        this.loadSession();
        this.initMobileSidebar();
    }

    loadSession() {
        try {
            const savedToken = localStorage.getItem('token');
            const savedUser  = localStorage.getItem('currentUser');

            // ✅ Validasi token ada dan berbentuk JWT (3 bagian dipisah titik)
            if (savedToken && savedToken.split('.').length === 3 && savedUser) {
                this.token       = savedToken;
                this.currentUser = JSON.parse(savedUser);
            } else {
                // Data tidak valid — bersihkan
                this.clearSession();
            }
        } catch (error) {
            console.error('Gagal load session:', error);
            this.clearSession();
        }
    }

    saveSession(user, token) {
        if (!user || !token) return;
        this.currentUser = user;
        this.token       = token;
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('token', token);
        // ❌ Dihapus: pernah menyimpan token tanpa "Bearer " — sekarang format beres di api.js
    }

    clearSession() {
        this.currentUser = null;
        this.token       = null;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('token');
    }

    async login(email, password) {
        try {
            const data = await LaundryAPI.login(email, password);
            if (data.success) {
                this.saveSession(data.user, data.token);
                return { success: true, user: data.user };
            }
            return { success: false, message: data.message || 'Login gagal' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    logout() {
        this.clearSession();
        window.location.href = '/login.html';
    }

    getCurrentUser() { return this.currentUser; }
    isLoggedIn()     { return this.currentUser !== null && this.token !== null; }

    getRedirectUrl() {
        const pages = {
            admin:     '/pages/admin.html',
            karyawan:  '/pages/karyawan.html',
            pelanggan: '/pages/pelanggan.html',
        };
        return pages[this.currentUser?.role] || '/login.html';
    }

    redirectToDashboard() {
        window.location.href = this.getRedirectUrl();
    }

    // ✅ Mobile sidebar — satu implementasi di sini, hapus dari utils.js
    // ❌ Lama: fungsi ini diduplikasi identik di utils.js juga
    initMobileSidebar() {
        setTimeout(() => {
            if (!document.querySelector('.mobile-menu-btn') && document.querySelector('.sidebar')) {
                const btn       = document.createElement('button');
                btn.className   = 'mobile-menu-btn';
                btn.setAttribute('aria-label', 'Buka menu');
                btn.innerHTML   = '<i class="fas fa-bars" aria-hidden="true"></i>';
                btn.onclick     = () => this.toggleSidebar();
                document.body.appendChild(btn);
            }

            if (!document.querySelector('.sidebar-overlay')) {
                const overlay       = document.createElement('div');
                overlay.className   = 'sidebar-overlay';
                overlay.setAttribute('role', 'presentation');
                overlay.onclick     = () => this.closeSidebar();
                document.body.appendChild(overlay);
            }
        }, 100);
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        if (!sidebar) return;
        const isOpen = sidebar.classList.toggle('open');
        if (overlay) overlay.style.display = isOpen ? 'block' : 'none';
    }

    closeSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.style.display = 'none';
    }
}

const auth     = new Auth();
window.auth    = auth;