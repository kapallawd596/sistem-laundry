/**
 * UTILITY FUNCTIONS - LaundryPro
 * Fungsi-fungsi bantu yang reusable
 */

// ============ FORMATTING FUNCTIONS ============

/**
 * Format angka ke Rupiah
 * @param {number} angka - Angka yang akan diformat
 * @returns {string} Format Rupiah (Rp 10.000)
 */
function formatRupiah(angka) {
    if (angka === undefined || angka === null) return 'Rp 0';
    return 'Rp ' + angka.toLocaleString('id-ID');
}

/**
 * Format angka ke format ribuan
 * @param {number} angka - Angka yang akan diformat
 * @returns {string} Format ribuan (10.000)
 */
function formatNumber(angka) {
    if (angka === undefined || angka === null) return '0';
    return angka.toLocaleString('id-ID');
}

/**
 * Format tanggal ke format Indonesia
 * @param {string|Date} date - Tanggal yang akan diformat
 * @returns {string} Format tanggal (DD/MM/YYYY)
 */
function formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Format tanggal lengkap (dengan hari)
 * @param {string|Date} date - Tanggal yang akan diformat
 * @returns {string} Format tanggal lengkap (Senin, 01 Januari 2024)
 */
function formatDateLong(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

/**
 * Format waktu
 * @param {string|Date} date - Tanggal/waktu yang akan diformat
 * @returns {string} Format waktu (HH:MM)
 */
function formatTime(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format datetime lengkap
 * @param {string|Date} date - Tanggal/waktu yang akan diformat
 * @returns {string} Format datetime (DD/MM/YYYY HH:MM)
 */
function formatDateTime(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format durasi dalam hari
 * @param {string|Date} startDate - Tanggal mulai
 * @param {string|Date} endDate - Tanggal selesai
 * @returns {string} Format durasi
 */
function formatDuration(startDate, endDate) {
    if (!startDate || !endDate) return '-';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} hari`;
}

// ============ VALIDATION FUNCTIONS ============

/**
 * Validasi email
 * @param {string} email - Email yang akan divalidasi
 * @returns {boolean} True jika valid
 */
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Validasi nomor HP Indonesia
 * @param {string} phone - Nomor HP yang akan divalidasi
 * @returns {boolean} True jika valid
 */
function isValidPhone(phone) {
    const re = /^08[0-9]{8,11}$/;
    return re.test(phone);
}

/**
 * Validasi password (minimal 6 karakter)
 * @param {string} password - Password yang akan divalidasi
 * @returns {boolean} True jika valid
 */
function isValidPassword(password) {
    return password && password.length >= 6;
}

/**
 * Validasi berat (minimal 0.5 kg)
 * @param {number} berat - Berat yang akan divalidasi
 * @returns {boolean} True jika valid
 */
function isValidWeight(berat) {
    return berat && berat >= 0.5;
}

// ============ STRING FUNCTIONS ============

/**
 * Capitalize first letter of each word
 * @param {string} str - String yang akan di-capitalize
 * @returns {string} String dengan huruf pertama kapital
 */
function capitalizeWords(str) {
    if (!str) return '';
    return str.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
}

/**
 * Truncate string with ellipsis
 * @param {string} str - String yang akan dipotong
 * @param {number} length - Panjang maksimal
 * @returns {string} String yang sudah dipotong
 */
function truncateString(str, length = 50) {
    if (!str) return '';
    if (str.length <= length) return str;
    return str.substring(0, length) + '...';
}

/**
 * Generate random string
 * @param {number} length - Panjang string yang diinginkan
 * @returns {string} Random string
 */
function generateRandomString(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Generate order code
 * @returns {string} Kode pesanan (LDY20240101XXXX)
 */
function generateOrderCode() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = generateRandomString(4).toUpperCase();
    return `LDY${year}${month}${day}${random}`;
}

// ============ DATE FUNCTIONS ============

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string} Tanggal hari ini
 */
function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

/**
 * Get date from days ago
 * @param {number} days - Jumlah hari yang lalu
 * @returns {string} Tanggal (YYYY-MM-DD)
 */
function getDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
}

/**
 * Get date from days ahead
 * @param {number} days - Jumlah hari yang akan datang
 * @returns {string} Tanggal (YYYY-MM-DD)
 */
function getDaysAhead(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

/**
 * Check if date is today
 * @param {string} date - Tanggal yang akan dicek
 * @returns {boolean} True jika tanggal hari ini
 */
function isToday(date) {
    if (!date) return false;
    const today = getTodayDate();
    return date === today;
}

/**
 * Get greeting based on time
 * @returns {string} Sapaan (Selamat Pagi/Siang/Sore/Malam)
 */
function getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'Selamat Pagi';
    if (hour >= 11 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
}

// ============ BADGE FUNCTIONS ============

/**
 * Get status badge HTML
 * @param {string} status - Status pesanan
 * @returns {string} HTML badge
 */
function getStatusBadge(status) {
    const statusMap = {
        'menunggu': { class: 'badge-warning', text: 'Menunggu' },
        'proses': { class: 'badge-info', text: 'Diproses' },
        'selesai': { class: 'badge-success', text: 'Selesai' },
        'diambil': { class: 'badge-primary', text: 'Diambil' },
        'dibatalkan': { class: 'badge-danger', text: 'Dibatalkan' },
        'active': { class: 'badge-success', text: 'Aktif' },
        'inactive': { class: 'badge-danger', text: 'Nonaktif' }
    };
    
    const badge = statusMap[status] || { class: 'badge-secondary', text: status };
    return `<span class="badge ${badge.class}">${badge.text}</span>`;
}

/**
 * Get payment status badge
 * @param {string} status - Status pembayaran
 * @returns {string} HTML badge
 */
function getPaymentBadge(status) {
    if (status === 'lunas') {
        return '<span class="badge badge-success">Lunas</span>';
    }
    return '<span class="badge badge-danger">Belum Lunas</span>';
}

/**
 * Get role badge
 * @param {string} role - Role user
 * @returns {string} HTML badge
 */
function getRoleBadge(role) {
    const roleMap = {
        'admin': { class: 'badge-danger', text: 'Admin' },
        'operator': { class: 'badge-info', text: 'Operator' },
        'customer': { class: 'badge-primary', text: 'Pelanggan' }
    };
    const badge = roleMap[role] || { class: 'badge-secondary', text: role };
    return `<span class="badge ${badge.class}">${badge.text}</span>`;
}

// ============ NOTIFICATION FUNCTIONS ============

/**
 * Show toast notification
 * @param {string} type - Tipe notifikasi (success, error, warning, info)
 * @param {string} message - Pesan yang akan ditampilkan
 * @param {number} duration - Durasi tampil dalam milidetik
 */
function showToast(type, message, duration = 3000) {
    // Check if toast container exists
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
        `;
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.style.cssText = `
        background: ${colors[type] || colors.info};
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
        min-width: 250px;
    `;
    
    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Remove after duration
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Show loading indicator
 * @param {string} elementId - ID element yang akan diberi loading
 */
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <span style="margin-left: 1rem;">Memuat data...</span>
            </div>
        `;
    }
}

/**
 * Hide loading indicator
 * @param {string} elementId - ID element yang akan dihapus loadingnya
 */
function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element && element.querySelector('.loading')) {
        element.innerHTML = '';
    }
}

// ============ STORAGE FUNCTIONS ============

/**
 * Save data to localStorage
 * @param {string} key - Key penyimpanan
 * @param {any} data - Data yang akan disimpan
 */
function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        return false;
    }
}

/**
 * Get data from localStorage
 * @param {string} key - Key penyimpanan
 * @param {any} defaultValue - Nilai default jika tidak ada
 * @returns {any} Data dari localStorage
 */
function getFromLocalStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('Error reading from localStorage:', error);
        return defaultValue;
    }
}

/**
 * Remove data from localStorage
 * @param {string} key - Key yang akan dihapus
 */
function removeFromLocalStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Error removing from localStorage:', error);
        return false;
    }
}

// ============ DOWNLOAD FUNCTIONS ============

/**
 * Download data as JSON file
 * @param {any} data - Data yang akan didownload
 * @param {string} filename - Nama file
 */
function downloadAsJSON(data, filename = 'data.json') {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Download data as CSV file
 * @param {Array} data - Array of objects
 * @param {string} filename - Nama file
 */
function downloadAsCSV(data, filename = 'data.csv') {
    if (!data || data.length === 0) {
        console.warn('No data to export');
        return;
    }
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add data rows
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header] || '';
            return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
    }
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ============ COLOR FUNCTIONS ============

/**
 * Generate random color
 * @returns {string} Random hex color
 */
function getRandomColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

/**
 * Get color for status
 * @param {string} status - Status pesanan
 * @returns {string} Hex color
 */
function getStatusColor(status) {
    const colors = {
        'menunggu': '#f59e0b',
        'proses': '#3b82f6',
        'selesai': '#10b981',
        'diambil': '#8b5cf6',
        'dibatalkan': '#ef4444'
    };
    return colors[status] || '#6b7280';
}

// ============ EXPORT FUNCTIONS ============

// Export to global scope for use in HTML
window.formatRupiah = formatRupiah;
window.formatNumber = formatNumber;
window.formatDate = formatDate;
window.formatDateLong = formatDateLong;
window.formatTime = formatTime;
window.formatDateTime = formatDateTime;
window.formatDuration = formatDuration;
window.isValidEmail = isValidEmail;
window.isValidPhone = isValidPhone;
window.isValidPassword = isValidPassword;
window.isValidWeight = isValidWeight;
window.capitalizeWords = capitalizeWords;
window.truncateString = truncateString;
window.generateRandomString = generateRandomString;
window.generateOrderCode = generateOrderCode;
window.getTodayDate = getTodayDate;
window.getDaysAgo = getDaysAgo;
window.getDaysAhead = getDaysAhead;
window.isToday = isToday;
window.getGreeting = getGreeting;
window.getStatusBadge = getStatusBadge;
window.getPaymentBadge = getPaymentBadge;
window.getRoleBadge = getRoleBadge;
window.showToast = showToast;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.saveToLocalStorage = saveToLocalStorage;
window.getFromLocalStorage = getFromLocalStorage;
window.removeFromLocalStorage = removeFromLocalStorage;
window.downloadAsJSON = downloadAsJSON;
window.downloadAsCSV = downloadAsCSV;
window.getRandomColor = getRandomColor;
window.getStatusColor = getStatusColor;