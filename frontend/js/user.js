/**
 * USER/CUSTOMER PAGE - LaundryPro
 * Halaman untuk role customer/pelanggan
 */

// ============ VARIABLES ============
let currentUser = null;
let myOrders = [];
let myProfile = null;

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    currentUser = auth.getUser();
    
    if (!currentUser) {
        window.location.href = '/login.html';
        return;
    }
    
    // Check role
    if (currentUser.role !== 'customer') {
        alert('Halaman ini khusus untuk pelanggan');
        window.location.href = auth.getRedirectUrl(currentUser.role);
        return;
    }
    
    // Setup page
    setupUserInterface();
    await loadUserData();
    
    // Setup event listeners
    setupEventListeners();
});

// ============ SETUP ============
function setupUserInterface() {
    // Set user name
    document.getElementById('userName').innerText = currentUser.nama;
    document.getElementById('userAvatar').innerText = currentUser.nama.charAt(0).toUpperCase();
    
    // Set page title
    document.getElementById('pageTitle').innerText = 'Dashboard Pelanggan';
}

function setupEventListeners() {
    // Menu navigation
    document.querySelectorAll('.menu-item[data-page]').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.getAttribute('data-page');
            changePage(page);
        });
    });
    
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        auth.logout();
    });
}

// ============ PAGE NAVIGATION ============
async function changePage(page) {
    // Update active menu
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === page) {
            item.classList.add('active');
        }
    });
    
    // Update title
    const titles = {
        dashboard: 'Dashboard Saya',
        pesanan: 'Pesanan Saya',
        profile: 'Profil Saya'
    };
    document.getElementById('pageTitle').innerText = titles[page] || page;
    
    // Load page content
    if (page === 'dashboard') await loadDashboard();
    else if (page === 'pesanan') await loadMyOrders();
    else if (page === 'profile') await loadProfile();
}

// ============ LOAD DATA ============
async function loadUserData() {
    try {
        myProfile = currentUser;
        myOrders = await LaundryAPI.getPesanan({ customerId: currentUser.id });
    } catch (error) {
        console.error('Gagal load data:', error);
        showMessage('error', 'Gagal memuat data');
    }
}

async function loadDashboard() {
    if (!myOrders) await loadUserData();
    
    const stats = {
        total: myOrders.length,
        menunggu: myOrders.filter(o => o.status === 'menunggu').length,
        proses: myOrders.filter(o => o.status === 'proses').length,
        selesai: myOrders.filter(o => o.status === 'selesai').length,
        diambil: myOrders.filter(o => o.status === 'diambil').length,
        totalBelanja: myOrders.reduce((sum, o) => sum + (o.totalBayar || 0), 0)
    };
    
    const latestOrders = myOrders.slice(0, 5);
    
    const html = `
        <!-- PROFILE CARD -->
        <div class="card" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, #4361ee, #3730a3); color: white;">
            <div class="card-body" style="display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap;">
                <div class="avatar avatar-lg" style="background: rgba(255,255,255,0.2); font-size: 2rem;">
                    ${currentUser.nama.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h2 style="margin: 0 0 0.5rem 0;">${currentUser.nama}</h2>
                    <p style="margin: 0; opacity: 0.9;">
                        <i class="fas fa-envelope"></i> ${currentUser.email}
                    </p>
                    <p style="margin: 0.25rem 0 0 0; opacity: 0.9;">
                        <i class="fas fa-phone"></i> ${currentUser.no_hp || 'Belum diisi'}
                    </p>
                </div>
            </div>
        </div>
        
        <!-- STATS GRID -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon" style="background: #4361ee20; color: #4361ee;">
                    <i class="fas fa-shopping-bag"></i>
                </div>
                <div class="stat-value">${stats.total}</div>
                <div class="stat-label">Total Pesanan</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: #f59e0b20; color: #f59e0b;">
                    <i class="fas fa-spinner"></i>
                </div>
                <div class="stat-value">${stats.proses}</div>
                <div class="stat-label">Sedang Diproses</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: #10b98120; color: #10b981;">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="stat-value">${stats.selesai}</div>
                <div class="stat-label">Selesai</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: #8b5cf620; color: #8b5cf6;">
                    <i class="fas fa-money-bill-wave"></i>
                </div>
                <div class="stat-value">${formatRupiah(stats.totalBelanja)}</div>
                <div class="stat-label">Total Belanja</div>
            </div>
        </div>
        
        <!-- QUICK ACTION -->
        <div class="card" style="margin-bottom: 1.5rem;">
            <div class="card-header">
                <h3><i class="fas fa-bolt"></i> Aksi Cepat</h3>
            </div>
            <div class="card-body">
                <button class="btn btn-primary" onclick="window.location.href='/pages/pesanan-baru.html'">
                    <i class="fas fa-plus"></i> Pesanan Baru
                </button>
                <button class="btn btn-outline" onclick="changePage('pesanan')" style="margin-left: 0.5rem;">
                    <i class="fas fa-list"></i> Lihat Pesanan
                </button>
            </div>
        </div>
        
        <!-- RECENT ORDERS -->
        <div class="card">
            <div class="card-header">
                <h3><i class="fas fa-clock"></i> Pesanan Terbaru</h3>
                <button class="btn btn-sm btn-outline" onclick="changePage('pesanan')">
                    Lihat Semua <i class="fas fa-arrow-right"></i>
                </button>
            </div>
            <div class="table-wrapper">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Kode Pesanan</th>
                            <th>Layanan</th>
                            <th>Berat</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Tanggal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${latestOrders.map(o => `
                            <tr onclick="lihatDetailPesanan(${o.id})" style="cursor: pointer;">
                                <td><strong>${o.kode}</strong></td>
                                <td>${o.layananNama}</td>
                                <td>${o.berat} kg</td>
                                <td>${formatRupiah(o.totalBayar)}</td>
                                <td>${getStatusBadge(o.status)}</td>
                                <td>${o.tanggalMasuk}</td>
                            </tr>
                        `).join('')}
                        ${latestOrders.length === 0 ? '<tr><td colspan="6" class="text-center">Belum ada pesanan</td></tr>' : ''}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    document.getElementById('pageContent').innerHTML = html;
}

async function loadMyOrders() {
    if (!myOrders) await loadUserData();
    
    const html = `
        <div style="margin-bottom: 1rem; display: flex; gap: 1rem; flex-wrap: wrap;">
            <div style="flex: 1; max-width: 300px;">
                <input type="text" id="searchOrder" class="form-control" placeholder="🔍 Cari pesanan..." onkeyup="filterMyOrders()">
            </div>
            <select id="statusFilter" class="form-control" style="width: 150px;" onchange="filterMyOrders()">
                <option value="">Semua Status</option>
                <option value="menunggu">Menunggu</option>
                <option value="proses">Proses</option>
                <option value="selesai">Selesai</option>
                <option value="diambil">Diambil</option>
            </select>
        </div>
        
        <div class="table-wrapper">
            <table class="table">
                <thead>
                    <tr>
                        <th>Kode Pesanan</th>
                        <th>Layanan</th>
                        <th>Berat</th>
                        <th>Harga/kg</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Pembayaran</th>
                        <th>Tanggal</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody id="ordersTableBody">
                    ${myOrders.map(o => renderOrderRow(o)).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    document.getElementById('pageContent').innerHTML = html;
}

function renderOrderRow(order) {
    return `
        <tr>
            <td><strong>${order.kode}</strong></td>
            <td>${order.layananNama}</td>
            <td>${order.berat} kg</td>
            <td>${formatRupiah(order.hargaPerKg)}</td>
            <td>${formatRupiah(order.totalBayar)}</td>
            <td>${getStatusBadge(order.status)}</td>
            <td>${getPaymentBadge(order.statusPembayaran)}</td>
            <td>${order.tanggalMasuk}</td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="lihatDetailPesanan(${order.id})">
                    <i class="fas fa-eye"></i> Detail
                </button>
                ${order.status === 'menunggu' ? `
                    <button class="btn btn-sm btn-danger" onclick="cancelOrder(${order.id})">
                        <i class="fas fa-times"></i> Batal
                    </button>
                ` : ''}
            </td>
        </tr>
    `;
}

function filterMyOrders() {
    const search = document.getElementById('searchOrder')?.value.toLowerCase() || '';
    const status = document.getElementById('statusFilter')?.value || '';
    
    const filtered = myOrders.filter(o => {
        const matchSearch = o.kode.toLowerCase().includes(search);
        const matchStatus = !status || o.status === status;
        return matchSearch && matchStatus;
    });
    
    const tbody = document.getElementById('ordersTableBody');
    if (tbody) {
        tbody.innerHTML = filtered.map(o => renderOrderRow(o)).join('');
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">Tidak ada pesanan</td></tr>';
        }
    }
}

async function loadProfile() {
    const html = `
        <div class="card">
            <div class="card-header">
                <h3><i class="fas fa-user-circle"></i> Profil Saya</h3>
            </div>
            <div class="card-body">
                <form id="profileForm">
                    <div class="form-group">
                        <label class="form-label">Nama Lengkap</label>
                        <input type="text" id="nama" class="form-control" value="${currentUser.nama}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" id="email" class="form-control" value="${currentUser.email}" readonly>
                        <small class="text-muted">Email tidak dapat diubah</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nomor HP</label>
                        <input type="tel" id="no_hp" class="form-control" value="${currentUser.no_hp || ''}" placeholder="08xxxxxxxxxx">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Alamat</label>
                        <textarea id="alamat" class="form-control" rows="3" placeholder="Jl. Contoh No. 123">${currentUser.alamat || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password Baru (kosongkan jika tidak ingin mengubah)</label>
                        <input type="password" id="new_password" class="form-control" placeholder="Password baru">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Konfirmasi Password Baru</label>
                        <input type="password" id="confirm_password" class="form-control" placeholder="Konfirmasi password">
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Simpan Perubahan
                        </button>
                        <button type="button" class="btn btn-danger" onclick="confirmDeleteAccount()">
                            <i class="fas fa-trash"></i> Hapus Akun
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.getElementById('pageContent').innerHTML = html;
    
    // Setup form submit
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateProfile();
    });
}

async function updateProfile() {
    const newPassword = document.getElementById('new_password')?.value;
    const confirmPassword = document.getElementById('confirm_password')?.value;
    
    if (newPassword && newPassword !== confirmPassword) {
        showMessage('error', 'Konfirmasi password tidak cocok');
        return;
    }
    
    const updatedData = {
        nama: document.getElementById('nama').value,
        no_hp: document.getElementById('no_hp').value,
        alamat: document.getElementById('alamat').value
    };
    
    if (newPassword) {
        updatedData.password = newPassword;
    }
    
    try {
        // Update profile via API
        await LaundryAPI.updateUser(currentUser.id, updatedData);
        
        // Update local user
        currentUser = { ...currentUser, ...updatedData };
        localStorage.setItem('laundry_current_user', JSON.stringify(currentUser));
        
        showMessage('success', 'Profil berhasil diperbarui');
        
        // Reload page after 1 second
        setTimeout(() => location.reload(), 1000);
    } catch (error) {
        showMessage('error', error.message);
    }
}

// ============ ORDER DETAILS ============
async function lihatDetailPesanan(orderId) {
    const order = myOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const modalHtml = `
        <div class="modal active" id="orderDetailModal">
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3><i class="fas fa-receipt"></i> Detail Pesanan ${order.kode}</h3>
                    <button class="modal-close" onclick="closeModal('orderDetailModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="display: grid; gap: 1rem;">
                        <div style="display: flex; justify-content: space-between; padding-bottom: 0.5rem; border-bottom: 1px solid #e2e8f0;">
                            <span style="color: #64748b;">Status Pesanan</span>
                            <span>${getStatusBadge(order.status)}</span>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                            <div><span style="color: #64748b;">Layanan</span><br><strong>${order.layananNama}</strong></div>
                            <div><span style="color: #64748b;">Berat</span><br><strong>${order.berat} kg</strong></div>
                            <div><span style="color: #64748b;">Harga/kg</span><br><strong>${formatRupiah(order.hargaPerKg)}</strong></div>
                            <div><span style="color: #64748b;">Total</span><br><strong>${formatRupiah(order.totalBayar)}</strong></div>
                            <div><span style="color: #64748b;">Tanggal Masuk</span><br><strong>${order.tanggalMasuk}</strong></div>
                            <div><span style="color: #64748b;">Tanggal Selesai</span><br><strong>${order.tanggalSelesai || '-'}</strong></div>
                            <div><span style="color: #64748b;">Pembayaran</span><br>${getPaymentBadge(order.statusPembayaran)}</div>
                            <div><span style="color: #64748b;">Diskon</span><br><strong>${order.diskon ? formatRupiah(order.diskon) : '-'}</strong></div>
                        </div>
                        ${order.catatan ? `
                            <div style="background: #f8fafc; padding: 0.75rem; border-radius: 0.5rem;">
                                <span style="color: #64748b;">Catatan:</span>
                                <p style="margin: 0.25rem 0 0 0;">${order.catatan}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="closeModal('orderDetailModal')">Tutup</button>
                    ${order.status === 'menunggu' ? `
                        <button class="btn btn-danger" onclick="cancelOrder(${order.id})">Batalkan Pesanan</button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    const existingModal = document.getElementById('orderDetailModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// ============ CANCEL ORDER ============
async function cancelOrder(orderId) {
    if (!confirm('Apakah Anda yakin ingin membatalkan pesanan ini?')) return;
    
    try {
        await LaundryAPI.updatePesanan(orderId, { status: 'dibatalkan' });
        showMessage('success', 'Pesanan telah dibatalkan');
        await loadUserData();
        await loadMyOrders();
        closeModal('orderDetailModal');
    } catch (error) {
        showMessage('error', error.message);
    }
}

// ============ DELETE ACCOUNT ============
function confirmDeleteAccount() {
    if (confirm('⚠️ PERINGATAN: Menghapus akun akan menghapus semua data pesanan Anda. Apakah Anda yakin?')) {
        if (confirm('Konfirmasi lagi: Ketik "HAPUS" untuk melanjutkan')) {
            deleteAccount();
        }
    }
}

async function deleteAccount() {
    try {
        await LaundryAPI.deleteUser(currentUser.id);
        showMessage('success', 'Akun berhasil dihapus');
        auth.logout();
    } catch (error) {
        showMessage('error', error.message);
    }
}

// ============ HELPER FUNCTIONS ============
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.remove();
}

// Export to global
window.changePage = changePage;
window.filterMyOrders = filterMyOrders;
window.lihatDetailPesanan = lihatDetailPesanan;
window.cancelOrder = cancelOrder;
window.closeModal = closeModal;
window.confirmDeleteAccount = confirmDeleteAccount;