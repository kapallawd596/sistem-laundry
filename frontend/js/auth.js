/**
 * AUTHENTICATION SYSTEM - LaundryPro
 * Manajemen login, register, session, dan proteksi halaman
 */

// ============ KONFIGURASI ============
const AUTH_KEY = 'laundry_current_user';
const TOKEN_KEY = 'laundry_token';

// ============ AUTH CLASS ============
class Auth {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.loadSession();
    }

    // ============ SESSION MANAGEMENT ============
    
    /**
     * Load session dari localStorage
     */
    loadSession() {
        try {
            const savedUser = localStorage.getItem(AUTH_KEY);
            const savedToken = localStorage.getItem(TOKEN_KEY);
            
            if (savedUser && savedToken) {
                this.currentUser = JSON.parse(savedUser);
                this.token = savedToken;
            }
        } catch (error) {
            console.error('Gagal load session:', error);
            this.clearSession();
        }
    }

    /**
     * Simpan session ke localStorage
     */
    saveSession(user, token) {
        this.currentUser = user;
        this.token = token;
        localStorage.setItem(AUTH_KEY, JSON.stringify(user));
        localStorage.setItem(TOKEN_KEY, token);
    }

    /**
     * Hapus session
     */
    clearSession() {
        this.currentUser = null;
        this.token = null;
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem(TOKEN_KEY);
    }

    // ============ LOGIN & REGISTER ============
    
    /**
     * Login user
     * @param {string} email - Email user
     * @param {string} password - Password user
     * @returns {Promise<object>} Hasil login
     */
    async login(email, password) {
        // Validasi input
        if (!email || !password) {
            throw new Error('Email dan password wajib diisi');
        }

        try {
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': application/json
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login gagal');
            }

            if (data.success && data.user) {
                this.saveSession(data.user, data.token);
                this.logActivity('login', `User ${data.user.email} berhasil login`);
                return {
                    success: true,
                    user: data.user,
                    redirect: this.getRedirectUrl(data.user.role)
                };
            }

            throw new Error('Login gagal: respons tidak valid');

        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    /**
     * Register user baru
     * @param {object} userData - Data user
     * @returns {Promise<object>} Hasil register
     */
    async register(userData) {
        const { nama, email, password, confirmPassword, no_hp, alamat } = userData;

        // Validasi input
        if (!nama || !email || !password) {
            throw new Error('Nama, email, dan password wajib diisi');
        }

        if (!this.validateEmail(email)) {
            throw new Error('Format email tidak valid');
        }

        if (password.length < 6) {
            throw new Error('Password minimal 6 karakter');
        }

        if (password !== confirmPassword) {
            throw new Error('Konfirmasi password tidak cocok');
        }

        if (!no_hp) {
            throw new Error('Nomor HP wajib diisi');
        }

        if (!this.validatePhone(no_hp)) {
            throw new Error('Nomor HP tidak valid (contoh: 081234567890)');
        }

        try {
            const response = await fetch('http://localhost:3000/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nama,
                    email,
                    password,
                    no_hp,
                    alamat: alamat || '',
                    role: 'customer' // Default role untuk register
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Register gagal');
            }

            if (data.success) {
                this.logActivity('register', `User baru: ${email} berhasil register`);
                return {
                    success: true,
                    message: 'Registrasi berhasil! Silakan login.'
                };
            }

            throw new Error('Register gagal');

        } catch (error) {
            console.error('Register error:', error);
            throw error;
        }
    }

    /**
     * Logout user
     */
    logout() {
        if (this.currentUser) {
            this.logActivity('logout', `User ${this.currentUser.email} logout`);
        }
        this.clearSession();
        
        // Redirect ke login page
        window.location.href = '/login.html';
    }

    // ============ VALIDATION ============
    
    /**
     * Validasi email
     */
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    /**
     * Validasi nomor HP (Indonesia)
     */
    validatePhone(phone) {
        const re = /^08[0-9]{8,11}$/;
        return re.test(phone);
    }

    /**
     * Validasi password strength
     */
    validatePasswordStrength(password) {
        const checks = {
            length: password.length >= 6,
            hasNumber: /[0-9]/.test(password),
            hasLetter: /[a-zA-Z]/.test(password)
        };
        
        const score = Object.values(checks).filter(Boolean).length;
        const strength = score === 3 ? 'strong' : score === 2 ? 'medium' : 'weak';
        
        return {
            valid: checks.length,
            strength,
            checks
        };
    }

    // ============ HELPER FUNCTIONS ============
    
    /**
     * Get redirect URL berdasarkan role
     */
    getRedirectUrl(role) {
        const rolePages = {
            'admin': '/pages/admin.html',
            'operator': '/pages/operator.html',
            'customer': '/pages/user.html'
        };
        return rolePages[role] || '/index.html';
    }

    /**
     * Cek apakah user sudah login
     */
    isLoggedIn() {
        return this.currentUser !== null && this.token !== null;
    }

    /**
     * Cek apakah user memiliki role tertentu
     */
    hasRole(role) {
        return this.isLoggedIn() && this.currentUser.role === role;
    }

    /**
     * Get current user
     */
    getUser() {
        return this.currentUser;
    }

    /**
     * Get token
     */
    getToken() {
        return this.token;
    }

    /**
     * Proteksi halaman berdasarkan role
     */
    protectPage(allowedRoles = []) {
        if (!this.isLoggedIn()) {
            window.location.href = '/login.html';
            return false;
        }

        if (allowedRoles.length > 0 && !allowedRoles.includes(this.currentUser.role)) {
            // Redirect ke halaman sesuai role
            window.location.href = this.getRedirectUrl(this.currentUser.role);
            return false;
        }

        return true;
    }

    /**
     * Log aktivitas user
     */
    async logActivity(type, description) {
        try {
            // Optional: kirim ke backend untuk logging
            console.log(`[${type}] ${description} - ${new Date().toISOString()}`);
        } catch (error) {
            console.error('Gagal log aktivitas:', error);
        }
    }

    // ============ API WITH AUTH ============
    
    /**
     * Fetch dengan authentication header
     */
    async fetchWithAuth(url, options = {}) {
        if (!this.isLoggedIn()) {
            throw new Error('User tidak login');
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`,
            ...options.headers
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (response.status === 401) {
                // Token expired atau invalid
                this.clearSession();
                window.location.href = '/login.html';
                throw new Error('Sesi berakhir, silakan login ulang');
            }

            return response;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }
}

// ============ FORM HANDLERS ============

/**
 * Handle login form submission
 */
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;
    const loginBtn = document.querySelector('#loginForm button[type="submit"]');
    const errorDiv = document.getElementById('loginError');
    
    // Show loading
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
    }
    
    // Clear error
    if (errorDiv) errorDiv.style.display = 'none';
    
    try {
        const result = await auth.login(email, password);
        
        if (result.success) {
            // Show success message
            showMessage('success', 'Login berhasil! Mengalihkan...');
            
            // Redirect after short delay
            setTimeout(() => {
                window.location.href = result.redirect;
            }, 1000);
        }
    } catch (error) {
        // Show error message
        if (errorDiv) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
        showMessage('error', error.message);
    } finally {
        // Reset button
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        }
    }
}

/**
 * Handle register form submission
 */
async function handleRegister(event) {
    event.preventDefault();
    
    const nama = document.getElementById('nama')?.value;
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    const no_hp = document.getElementById('no_hp')?.value;
    const alamat = document.getElementById('alamat')?.value;
    const registerBtn = document.querySelector('#registerForm button[type="submit"]');
    
    // Show loading
    if (registerBtn) {
        registerBtn.disabled = true;
        registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mendaftar...';
    }
    
    try {
        const result = await auth.register({
            nama,
            email,
            password,
            confirmPassword,
            no_hp,
            alamat
        });
        
        if (result.success) {
            showMessage('success', result.message);
            
            // Redirect to login after 2 seconds
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
        }
    } catch (error) {
        showMessage('error', error.message);
    } finally {
        if (registerBtn) {
            registerBtn.disabled = false;
            registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> Daftar';
        }
    }
}

/**
 * Show message notification
 */
function showMessage(type, message) {
    // Check if toast container exists
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
        `;
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        margin-bottom: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Toggle password visibility
 */
function togglePassword(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

/**
 * Validate password strength in real-time
 */
function checkPasswordStrength() {
    const password = document.getElementById('password')?.value;
    const strengthBar = document.getElementById('passwordStrength');
    const strengthText = document.getElementById('strengthText');
    
    if (!password || !strengthBar) return;
    
    const result = auth.validatePasswordStrength(password);
    
    // Update strength bar
    let width = 0;
    let color = '';
    let text = '';
    
    if (result.strength === 'weak') {
        width = 33;
        color = '#ef4444';
        text = 'Lemah';
    } else if (result.strength === 'medium') {
        width = 66;
        color = '#f59e0b';
        text = 'Sedang';
    } else {
        width = 100;
        color = '#10b981';
        text = 'Kuat';
    }
    
    strengthBar.style.width = `${width}%`;
    strengthBar.style.backgroundColor = color;
    
    if (strengthText) {
        strengthText.textContent = text;
        strengthText.style.color = color;
    }
}

/**
 * Check if email already exists (live check)
 */
async function checkEmailAvailability() {
    const email = document.getElementById('email')?.value;
    const emailError = document.getElementById('emailError');
    
    if (!email || !auth.validateEmail(email)) {
        if (emailError) emailError.style.display = 'none';
        return;
    }
    
    try {
        // This would require a backend endpoint to check email existence
        // For now, just validate format
        if (emailError) emailError.style.display = 'none';
    } catch (error) {
        console.error('Email check error:', error);
    }
}

// ============ PAGE PROTECTION ============

/**
 * Protect page based on current user role
 */
function protectPage(allowedRoles = []) {
    if (!auth.isLoggedIn()) {
        window.location.href = '/login.html';
        return false;
    }
    
    if (allowedRoles.length > 0 && !allowedRoles.includes(auth.getUser().role)) {
        const redirectUrl = auth.getRedirectUrl(auth.getUser().role);
        window.location.href = redirectUrl;
        return false;
    }
    
    return true;
}

/**
 * Update UI based on user role (hide/show elements)
 */
function updateUIByRole() {
    const user = auth.getUser();
    if (!user) return;
    
    // Show/hide elements based on role
    document.querySelectorAll('[data-role]').forEach(el => {
        const requiredRole = el.getAttribute('data-role');
        if (requiredRole && user.role !== requiredRole) {
            el.style.display = 'none';
        }
    });
    
    // Show user info
    const userNameElements = document.querySelectorAll('[data-user-name]');
    userNameElements.forEach(el => {
        el.textContent = user.nama;
    });
    
    const userAvatarElements = document.querySelectorAll('[data-user-avatar]');
    userAvatarElements.forEach(el => {
        el.textContent = user.nama.charAt(0).toUpperCase();
    });
}

// ============ INITIALIZATION ============

// Create global auth instance
const auth = new Auth();

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .password-strength-bar {
        height: 4px;
        background: #e2e8f0;
        border-radius: 2px;
        margin-top: 5px;
        overflow: hidden;
    }
    
    .password-strength-fill {
        height: 100%;
        width: 0%;
        transition: width 0.3s ease;
        border-radius: 2px;
    }
`;
document.head.appendChild(style);

// Export for global use
window.auth = auth;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.togglePassword = togglePassword;
window.checkPasswordStrength = checkPasswordStrength;
window.checkEmailAvailability = checkEmailAvailability;
window.protectPage = protectPage;
window.updateUIByRole = updateUIByRole;
window.showMessage = showMessage;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Update UI if user is logged in
    if (auth.isLoggedIn()) {
        updateUIByRole();
    }
    
    // Setup password strength checker
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', checkPasswordStrength);
    }
    
    // Setup email availability checker
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('blur', checkEmailAvailability);
    }
});