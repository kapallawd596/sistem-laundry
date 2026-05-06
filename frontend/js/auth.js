/**
 * AUTHENTICATION SYSTEM - LaundryPro
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
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (data.success) {
                this.saveSession(data.user, data.token);
                return { success: true, user: data.user };
            }
            return { success: false, message: data.message };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: error.message };
        }
    }

    async register(userData) {
        try {
            const response = await fetch('http://localhost:3000/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            return await response.json();
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

    getUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    hasRole(role) {
        return this.isLoggedIn() && this.currentUser.role === role;
    }

    getRedirectUrl(role) {
        const pages = {
            'admin': '/pages/admin.html',
            'operator': '/pages/operator.html',
            'customer': '/pages/user.html'
        };
        return pages[role] || '/login.html';
    }

    protectPage(allowedRoles = []) {
        if (!this.isLoggedIn()) {
            window.location.href = '/login.html';
            return false;
        }
        if (allowedRoles.length > 0 && !allowedRoles.includes(this.currentUser.role)) {
            window.location.href = this.getRedirectUrl(this.currentUser.role);
            return false;
        }
        return true;
    }
}

// Buat instance global
const auth = new Auth();

// Export ke window
window.auth = auth;