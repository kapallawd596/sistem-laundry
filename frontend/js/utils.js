/**
 * UTILITY FUNCTIONS - LaundryPro
 * Helper functions yang reusable untuk semua role
 */

// ============ FORMATTING ============
function formatRupiah(angka) {
    if (angka === undefined || angka === null) return 'Rp 0';
    return 'Rp ' + angka.toLocaleString('id-ID');
}

function formatNumber(angka) {
    if (angka === undefined || angka === null) return '0';
    return angka.toLocaleString('id-ID');
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('id-ID');
}

function formatTimeShort(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

// ============ BADGES ============
function getStatusBadge(status) {
    const map = {
        'menunggu': '<span class="badge badge-warning">⏳ Menunggu</span>',
        'proses': '<span class="badge badge-info">🔄 Diproses</span>',
        'selesai': '<span class="badge badge-success">✅ Selesai</span>',
        'diambil': '<span class="badge badge-primary">📦 Diambil</span>',
        'active': '<span class="badge badge-success">✅ Aktif</span>',
        'inactive': '<span class="badge badge-danger">❌ Nonaktif</span>'
    };
    return map[status] || `<span class="badge">${status}</span>`;
}

function getPaymentBadge(status) {
    return status === 'lunas' 
        ? '<span class="badge badge-success">✅ Lunas</span>'
        : '<span class="badge badge-warning">⏳ Belum Lunas</span>';
}

function getRoleBadge(role) {
    const map = {
        'admin': '<span class="badge badge-danger">👑 Admin</span>',
        'karyawan': '<span class="badge badge-info">🔧 Karyawan</span>',
        'pelanggan': '<span class="badge badge-success">👤 Pelanggan</span>'
    };
    return map[role] || `<span class="badge">${role}</span>`;
}

// ============ GREETING ============
function getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'Selamat Pagi';
    if (hour >= 11 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
}

// ============ TOAST NOTIFICATION ============
function showToast(type, message) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    toast.innerHTML = `${icons[type] || 'ℹ️'} ${message}`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ============ LOADING ============
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <span>Memuat data...</span>
            </div>
        `;
    }
}

// ============ MODAL ============
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.remove();
}

function openModal(contentHtml, title) {
    const existingModal = document.getElementById('dynamicModal');
    if (existingModal) existingModal.remove();
    
    const modalHtml = `
        <div class="modal active" id="dynamicModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-${title === 'Form' ? 'edit' : 'plus'}"></i> ${title}</h3>
                    <button class="modal-close" onclick="closeModal('dynamicModal')">&times;</button>
                </div>
                <div class="modal-body">
                    ${contentHtml}
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// ============ PARTICLES ============
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    
    for (let i = 0; i < 80; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = Math.random() * 10 + 10 + 's';
        container.appendChild(particle);
    }
}

// ============ DATE TIME ============
function updateDateTime() {
    const timeEl = document.getElementById('currentTime');
    const dateEl = document.getElementById('currentDate');
    
    if (timeEl && dateEl) {
        const now = new Date();
        timeEl.innerText = now.toLocaleTimeString('id-ID', { hour12: false });
        dateEl.innerText = now.toLocaleDateString('id-ID', { 
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
        });
    }
}

// Export ke window
window.formatRupiah = formatRupiah;
window.formatNumber = formatNumber;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.formatTimeShort = formatTimeShort;
window.getStatusBadge = getStatusBadge;
window.getPaymentBadge = getPaymentBadge;
window.getRoleBadge = getRoleBadge;
window.getGreeting = getGreeting;
window.showToast = showToast;
window.showLoading = showLoading;
window.closeModal = closeModal;
window.openModal = openModal;
window.createParticles = createParticles;
window.updateDateTime = updateDateTime;