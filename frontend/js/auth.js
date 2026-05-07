/**
 * AUTHENTICATION - Laundry int
 * Login, logout, session management
 */

class Auth {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.loadSession();
    }

    loadSession() {
        try {
            const savedUser = localStorage.getItem('currentUser');
            const savedToken = localStorage.getItem('token');
            if (savedUser) {
                this.currentUser = JSON.parse(savedUser);
                this.token = savedToken;
            }
        } catch (error) {
            console.error('Gagal load session:', error);
        }
    }

    saveSession(user, token) {
        this.currentUser = user;
        this.token = token;
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('token', token);
    }

    clearSession() {
        this.currentUser = null;
        this.token = null;
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
            return { success: false, message: data.message };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    logout() {
        this.clearSession();
        window.location.href = '/login.html';
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    getRedirectUrl() {
        const role = this.currentUser?.role;
        const pages = {
            'admin': '/pages/admin.html',
            'karyawan': '/pages/karyawan.html',
            'pelanggan': '/pages/pelanggan.html'
        };
        return pages[role] || '/login.html';
    }

    redirectToDashboard() {
        window.location.href = this.getRedirectUrl();
    }
}

const auth = new Auth();
window.auth = auth;