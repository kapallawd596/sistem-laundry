/**
 * ADMIN DASHBOARD - LaundryPro
 * Manajemen lengkap untuk role admin
 */

// ============ VARIABLES ============
let currentPage = 'dashboard';
let currentPesananData = [];
let currentPelangganData = [];
let currentLayananData = [];
let currentUserData = [];

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', async () => {
    // Cek login
    const user = LaundryAPI.getCurrentUser();
    if (!user) {
        window.location.href = '../login.html';
        return;
    }
    
    if (user.role !== 'admin') {
        alert('Akses ditolak! Hanya admin yang bisa mengakses halaman ini.');
        window.location.href = '../login.html';
        return;
    }
    
    // Tampilkan nama user
    document.getElementById('userName').innerText = user.nama;
    document.getElementById('userAvatar').innerText = user.nama.charAt(0).toUpperCase();
    
    // Load dashboard pertama
    await loadDashboard();
    
    // Setup event listeners
    setupEventListeners();
});

// ============ EVENT LISTENERS ============
function setupEventListeners() {
    // Menu items
    document.querySelectorAll('.menu-item[data-page]').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.getAttribute('data-page');
            changePage(page);
        });
    });
    
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        LaundryAPI.logout();
    });
}

// ============ PAGE NAVIGATION ============
async function changePage(page) {
    currentPage = page;
    
    // Update active menu
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === page) {
            item.classList.add('active');
        }
    });
    
    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        pesanan: 'Manajemen Pesanan',
        pelanggan: 'Data Pelanggan',
        layanan: 'Layanan & Harga',
        laporan: 'Laporan & Statistik',
        users: 'Manajemen User'
    };
    document.getElementById('pageTitle').innerText = titles[page] || page;
    
    // Load page content
    if (page === 'dashboard') await loadDashboard();
    else if (page === 'pesanan') await loadPesanan();
    else if (page === 'pelanggan') await loadPelanggan();
    else if (page === 'layanan') await loadLayanan();
    else if (page === 'laporan') await loadLaporan();
    else if (page === 'users') await loadUsers();
}

// ============ DASHBOARD ============
async function loadDashboard() {
    showLoading('pageContent');
    
    try {
        const stats = await LaundryAPI.getStatistik();
        const aktivitas = await LaundryAPI.getAktivitas();
        const pesananTerbaru = await LaundryAPI.getPesanan({ limit: 5 });
        
        const html = `
            <!-- STATS GRID -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon" style="background: #dbeafe; color: #4361ee;">
                        <i class="fas fa-receipt"></i>
                    </div>
                    <div class="stat-value">${stats.totalPesanan || 0}</div>
                    <div class="stat-label">Total Pesanan</div>
                    <div class="stat-change">${getChangePercentage(stats.totalPesanan, 30)} dari bulan lalu</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: #d1fae5; color: #10b981;">
                        <i class="fas fa-money-bill-wave"></i>
                    </div>
                    <div class="stat-value">${formatRupiah(stats.totalPendapatan || 0)}</div>
                    <div class="stat-label">Total Pendapatan</div>
                    <div class="stat-change text-success">↑ 12.5% dari bulan lalu</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: #fed7aa; color: #f59e0b;">
                        <i class="fas fa-spinner"></i>
                    </div>
                    <div class="stat-value">${stats.pesananProses || 0}</div>
                    <div class="stat-label">Dalam Proses</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: #e0e7ff; color: #3730a3;">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stat-value">${stats.totalPelanggan || 0}</div>
                    <div class="stat-label">Pelanggan Aktif</div>
                </div>
            </div>
            
            <!-- CHART & AKTIVITAS -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-chart-line"></i> Pendapatan Per Hari</h3>
                    </div>
                    <div class="card-body">
                        <canvas id="revenueChart" style="max-height: 250px;"></canvas>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-chart-pie"></i> Status Pesanan</h3>
                    </div>
                    <div class="card-body">
                        <canvas id="statusChart" style="max-height: 250px;"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- PESANAN TERBARU -->
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-clock"></i> Pesanan Terbaru</h3>
                    <button class="btn btn-sm btn-primary" onclick="changePage('pesanan')">
                        Lihat Semua <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                <div class="table-wrapper">
                    <table class="table">
                        <thead>
                            <tr><th>Kode</th><th>Pelanggan</th><th>Layanan</th><th>Total</th><th>Status</th><th>Tanggal</th></tr>
                        </thead>
                        <tbody>
                            ${pesananTerbaru.map(p => `
                                <tr>
                                    <td><strong>${p.kode}</strong></td>
                                    <td>${p.pelangganNama}</td>
                                    <td>${p.layananNama}</td>
                                    <td>${formatRupiah(p.totalBayar)}</td>
                                    <td>${getStatusBadge(p.status)}</td>
                                    <td>${p.tanggalMasuk}</td>
                                </tr>
                            `).join('')}
                            ${pesananTerbaru.length === 0 ? '<tr><td colspan="6" class="text-center">Belum ada pesanan</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- AKTIVITAS TERKINI -->
            <div class="card" style="margin-top: 1.5rem;">
                <div class="card-header">
                    <h3><i class="fas fa-history"></i> Aktivitas Terkini</h3>
                </div>
                <div class="card-body">
                    ${aktivitas.map(a => `
                        <div class="activity-item">
                            <div class="activity-icon ${a.tipe}">
                                <i class="fas ${getActivityIcon(a.tipe)}"></i>
                            </div>
                            <div class="activity-content">
                                <div class="activity-text">${a.deskripsi}</div>
                                <div class="activity-time">${formatTime(a.createdAt)}</div>
                            </div>
                        </div>
                    `).join('')}
                    ${aktivitas.length === 0 ? '<div class="text-center text-muted">Belum ada aktivitas</div>' : ''}
                </div>
            </div>
        `;
        
        document.getElementById('pageContent').innerHTML = html;
        
        // Load charts
        loadCharts(stats);
        
    } catch (error) {
        showError('pageContent', error.message);
    }
}

function loadCharts(stats) {
    // Chart.js harus sudah di-load
    if (typeof Chart !== 'undefined') {
        // Revenue Chart
        const revenueCtx = document.getElementById('revenueChart')?.getContext('2d');
        if (revenueCtx) {
            new Chart(revenueCtx, {
                type: 'line',
                data: {
                    labels: stats.pendapatanPerHari?.map(d => d.tanggal) || ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
                    datasets: [{
                        label: 'Pendapatan (Rp)',
                        data: stats.pendapatanPerHari?.map(d => d.total) || [0, 0, 0, 0, 0, 0, 0],
                        borderColor: '#4361ee',
                        backgroundColor: 'rgba(67, 97, 238, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        }
        
        // Status Chart
        const statusCtx = document.getElementById('statusChart')?.getContext('2d');
        if (statusCtx) {
            new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Menunggu', 'Proses', 'Selesai', 'Diambil'],
                    datasets: [{
                        data: [
                            stats.pesananMenunggu || 0,
                            stats.pesananProses || 0,
                            stats.pesananSelesai || 0,
                            stats.pesananDiambil || 0
                        ],
                        backgroundColor: ['#f59e0b', '#4361ee', '#10b981', '#06b6d4']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        }
    }
}

// ============ PESANAN MANAGEMENT ============
async function loadPesanan() {
    showLoading('pageContent');
    
    try {
        const pesanan = await LaundryAPI.getPesanan();
        currentPesananData = pesanan;
        
        const html = `
            <div style="margin-bottom: 1rem; display: flex; gap: 1rem; flex-wrap: wrap;">
                <button class="btn btn-primary" onclick="showTambahPesanan()">
                    <i class="fas fa-plus"></i> Tambah Pesanan
                </button>
                <div style="flex: 1; max-width: 300px;">
                    <input type="text" id="searchPesanan" class="form-control" placeholder="🔍 Cari pesanan..." onkeyup="filterPesanan()">
                </div>
                <select id="statusFilter" class="form-control" style="width: 150px;" onchange="filterPesanan()">
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
                            <th>Kode</th><th>Pelanggan</th><th>Layanan</th><th>Berat</th><th>Total</th><th>Status</th><th>Pembayaran</th><th>Tgl Masuk</th><th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="pesananTableBody">
                        ${pesanan.map(p => renderPesananRow(p)).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('pageContent').innerHTML = html;
        
    } catch (error) {
        showError('pageContent', error.message);
    }
}

function renderPesananRow(p) {
    return `
        <tr>
            <td><strong>${p.kode}</strong></td>
            <td>${p.pelangganNama}<br><small class="text-muted">${p.pelangganHp || ''}</small></td>
            <td>${p.layananNama}</td>
            <td>${p.berat} kg</td>
            <td>${formatRupiah(p.totalBayar)}</td>
            <td>${getStatusBadge(p.status)}</td>
            <td>${getPaymentBadge(p.statusPembayaran)}</td>
            <td>${p.tanggalMasuk}</td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="viewPesanan(${p.id})" title="Detail">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline" onclick="editPesanan(${p.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deletePesanan(${p.id})" title="Hapus">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `;
}

function filterPesanan() {
    const search = document.getElementById('searchPesanan')?.value.toLowerCase() || '';
    const status = document.getElementById('statusFilter')?.value || '';
    
    const filtered = currentPesananData.filter(p => {
        const matchSearch = p.kode.toLowerCase().includes(search) || 
                           p.pelangganNama.toLowerCase().includes(search);
        const matchStatus = !status || p.status === status;
        return matchSearch && matchStatus;
    });
    
    const tbody = document.getElementById('pesananTableBody');
    if (tbody) {
        tbody.innerHTML = filtered.map(p => renderPesananRow(p)).join('');
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">Tidak ada data</td></tr>';
        }
    }
}

// ============ PELANGGAN MANAGEMENT ============
async function loadPelanggan() {
    showLoading('pageContent');
    
    try {
        const pelanggan = await LaundryAPI.getPelanggan();
        currentPelangganData = pelanggan;
        
        const html = `
            <div style="margin-bottom: 1rem; display: flex; gap: 1rem; flex-wrap: wrap;">
                <button class="btn btn-primary" onclick="showTambahPelanggan()">
                    <i class="fas fa-plus"></i> Tambah Pelanggan
                </button>
                <div style="flex: 1; max-width: 300px;">
                    <input type="text" id="searchPelanggan" class="form-control" placeholder="🔍 Cari pelanggan..." onkeyup="filterPelanggan()">
                </div>
            </div>
            
            <div class="table-wrapper">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Nama</th><th>Email</th><th>No HP</th><th>Alamat</th><th>Poin</th><th>Transaksi</th><th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="pelangganTableBody">
                        ${pelanggan.map(p => renderPelangganRow(p)).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('pageContent').innerHTML = html;
        
    } catch (error) {
        showError('pageContent', error.message);
    }
}

function renderPelangganRow(p) {
    return `
        <tr>
            <td><strong>${p.nama}</strong></td>
            <td>${p.email || '-'}</td>
            <td>${p.no_hp}</td>
            <td>${p.alamat || '-'}</td>
            <td><span class="badge badge-primary">${p.poin || 0} poin</span></td>
            <td>${p.totalTransaksi || 0}x</td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="editPelanggan(${p.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deletePelanggan(${p.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `;
}

function filterPelanggan() {
    const search = document.getElementById('searchPelanggan')?.value.toLowerCase() || '';
    
    const filtered = currentPelangganData.filter(p => 
        p.nama.toLowerCase().includes(search) || 
        p.no_hp.includes(search) ||
        (p.email && p.email.toLowerCase().includes(search))
    );
    
    const tbody = document.getElementById('pelangganTableBody');
    if (tbody) {
        tbody.innerHTML = filtered.map(p => renderPelangganRow(p)).join('');
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Tidak ada data</td></tr>';
        }
    }
}

// ============ LAYANAN MANAGEMENT ============
async function loadLayanan() {
    showLoading('pageContent');
    
    try {
        const layanan = await LaundryAPI.getLayanan();
        currentLayananData = layanan;
        
        const html = `
            <div style="margin-bottom: 1rem;">
                <button class="btn btn-primary" onclick="showTambahLayanan()">
                    <i class="fas fa-plus"></i> Tambah Layanan
                </button>
            </div>
            
            <div class="table-wrapper">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Icon</th><th>Nama Layanan</th><th>Harga/kg</th><th>Estimasi</th><th>Deskripsi</th><th>Status</th><th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${layanan.map(l => `
                            <tr>
                                <td><i class="fas ${l.icon || 'fa-tshirt'}"></i></td>
                                <td><strong>${l.nama}</strong></td>
                                <td>${formatRupiah(l.harga)}</td>
                                <td>${l.estimasi}</td>
                                <td>${l.deskripsi || '-'}</td>
                                <td>${getStatusBadge(l.status || 'active')}</td>
                                <td>
                                    <button class="btn btn-sm btn-outline" onclick="editLayanan(${l.id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="deleteLayanan(${l.id})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('pageContent').innerHTML = html;
        
    } catch (error) {
        showError('pageContent', error.message);
    }
}

// ============ LAPORAN ============
async function loadLaporan() {
    showLoading('pageContent');
    
    try {
        const stats = await LaundryAPI.getStatistik();
        const pesanan = await LaundryAPI.getPesanan();
        
        // Hitung layanan terpopuler
        const layananCount = {};
        pesanan.forEach(p => {
            layananCount[p.layananNama] = (layananCount[p.layananNama] || 0) + 1;
        });
        const topLayanan = Object.entries(layananCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        const html = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${stats.totalPesanan || 0}</div>
                    <div class="stat-label">Total Pesanan</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${formatRupiah(stats.totalPendapatan || 0)}</div>
                    <div class="stat-label">Total Pendapatan</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.totalPelanggan || 0}</div>
                    <div class="stat-label">Pelanggan Terdaftar</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.totalLayanan || 0}</div>
                    <div class="stat-label">Layanan Aktif</div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-chart-pie"></i> Status Pesanan</h3>
                    </div>
                    <div class="card-body">
                        <canvas id="laporanStatusChart" style="max-height: 250px;"></canvas>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-trophy"></i> Layanan Terpopuler</h3>
                    </div>
                    <div class="card-body">
                        ${topLayanan.map(([nama, count]) => `
                            <div style="margin-bottom: 1rem;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                                    <span>${nama}</span>
                                    <span>${count} pesanan</span>
                                </div>
                                <div class="progress">
                                    <div class="progress-bar progress-bar-primary" style="width: ${(count / pesanan.length) * 100}%"></div>
                                </div>
                            </div>
                        `).join('')}
                        ${topLayanan.length === 0 ? '<div class="text-center text-muted">Belum ada data</div>' : ''}
                    </div>
                </div>
            </div>
            
            <div class="card" style="margin-top: 1.5rem;">
                <div class="card-header">
                    <h3><i class="fas fa-download"></i> Export Laporan</h3>
                </div>
                <div class="card-body">
                    <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                        <button class="btn btn-outline" onclick="exportLaporan('pdf')">
                            <i class="fas fa-file-pdf"></i> Export PDF
                        </button>
                        <button class="btn btn-outline" onclick="exportLaporan('excel')">
                            <i class="fas fa-file-excel"></i> Export Excel
                        </button>
                        <button class="btn btn-outline" onclick="window.print()">
                            <i class="fas fa-print"></i> Print
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('pageContent').innerHTML = html;
        
        // Load chart
        if (typeof Chart !== 'undefined') {
            const ctx = document.getElementById('laporanStatusChart')?.getContext('2d');
            if (ctx) {
                new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Menunggu', 'Proses', 'Selesai', 'Diambil'],
                        datasets: [{
                            data: [
                                stats.pesananMenunggu || 0,
                                stats.pesananProses || 0,
                                stats.pesananSelesai || 0,
                                stats.pesananDiambil || 0
                            ],
                            backgroundColor: ['#f59e0b', '#4361ee', '#10b981', '#06b6d4']
                        }]
                    }
                });
            }
        }
        
    } catch (error) {
        showError('pageContent', error.message);
    }
}

// ============ USERS MANAGEMENT (ADMIN ONLY) ============
async function loadUsers() {
    showLoading('pageContent');
    
    try {
        const users = await LaundryAPI.getUsers();
        currentUserData = users;
        
        const html = `
            <div style="margin-bottom: 1rem;">
                <button class="btn btn-primary" onclick="showTambahUser()">
                    <i class="fas fa-plus"></i> Tambah User
                </button>
            </div>
            
            <div class="table-wrapper">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Nama</th><th>Email</th><th>Role</th><th>No HP</th><th>Alamat</th><th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(u => `
                            <tr>
                                <td><strong>${u.nama}</strong></td>
                                <td>${u.email}</td>
                                <td>${getRoleBadge(u.role)}</td>
                                <td>${u.no_hp || '-'}</td>
                                <td>${u.alamat || '-'}</td>
                                <td>
                                    <button class="btn btn-sm btn-outline" onclick="editUser(${u.id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        document.getElementById('pageContent').innerHTML = html;
        
    } catch (error) {
        showError('pageContent', error.message);
    }
}

// ============ CRUD OPERATIONS ============
async function showTambahPesanan() {
    const pelanggan = await LaundryAPI.getPelanggan();
    const layanan = await LaundryAPI.getLayanan();
    
    const modalHtml = `
        <div class="modal active" id="pesananModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-plus"></i> Tambah Pesanan</h3>
                    <button class="modal-close" onclick="closeModal('pesananModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="formPesanan">
                        <div class="form-group">
                            <label class="form-label required">Pelanggan</label>
                            <select id="pelangganId" class="form-control" required>
                                <option value="">Pilih Pelanggan</option>
                                ${pelanggan.map(p => `<option value="${p.id}">${p.nama} - ${p.no_hp}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label required">Layanan</label>
                            <select id="layananId" class="form-control" required onchange="hitungTotalPesanan()">
                                <option value="">Pilih Layanan</option>
                                ${layanan.map(l => `<option value="${l.id}" data-harga="${l.harga}">${l.nama} - ${formatRupiah(l.harga)}/kg</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label required">Berat (kg)</label>
                            <input type="number" id="berat" class="form-control" step="0.5" min="0.5" value="1" oninput="hitungTotalPesanan()" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Total Harga</label>
                            <input type="text" id="totalHarga" class="form-control" readonly>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Diskon</label>
                            <input type="number" id="diskon" class="form-control" value="0" oninput="hitungTotalPesanan()">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Status Pembayaran</label>
                            <select id="statusPembayaran" class="form-control">
                                <option value="belum">Belum Lunas</option>
                                <option value="lunas">Lunas</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Catatan</label>
                            <textarea id="catatan" class="form-control" rows="2"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="closeModal('pesananModal')">Batal</button>
                    <button class="btn btn-primary" onclick="simpanPesanan()">Simpan</button>
                </div>
            </div>
        </div>
    `;
    
    // Append modal ke body
    const existingModal = document.getElementById('pesananModal');
    if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function hitungTotalPesanan() {
    const layananSelect = document.getElementById('layananId');
    const selectedOption = layananSelect.options[layananSelect.selectedIndex];
    const harga = parseInt(selectedOption?.dataset?.harga || 0);
    const berat = parseFloat(document.getElementById('berat')?.value || 0);
    const diskon = parseFloat(document.getElementById('diskon')?.value || 0);
    
    const total = (harga * berat) - diskon;
    document.getElementById('totalHarga').value = formatRupiah(total > 0 ? total : 0);
}

async function simpanPesanan() {
    const pelangganId = document.getElementById('pelangganId').value;
    const layananId = document.getElementById('layananId').value;
    const berat = parseFloat(document.getElementById('berat').value);
    const diskon = parseFloat(document.getElementById('diskon').value || 0);
    const statusPembayaran = document.getElementById('statusPembayaran').value;
    const catatan = document.getElementById('catatan').value;
    
    if (!pelangganId || !layananId || !berat) {
        alert('Mohon lengkapi data!');
        return;
    }
    
    // Get data pelanggan dan layanan
    const pelanggan = await LaundryAPI.getPelanggan();
    const layanan = await LaundryAPI.getLayanan();
    const selectedPelanggan = pelanggan.find(p => p.id == pelangganId);
    const selectedLayanan = layanan.find(l => l.id == layananId);
    
    const totalHarga = (selectedLayanan.harga * berat) - diskon;
    
    const newPesanan = {
        pelangganId: parseInt(pelangganId),
        pelangganNama: selectedPelanggan.nama,
        pelangganHp: selectedPelanggan.no_hp,
        layananId: parseInt(layananId),
        layananNama: selectedLayanan.nama,
        berat: berat,
        hargaPerKg: selectedLayanan.harga,
        totalHarga: selectedLayanan.harga * berat,
        diskon: diskon,
        totalBayar: totalHarga,
        status: "menunggu",
        statusPembayaran: statusPembayaran,
        tanggalMasuk: new Date().toISOString().split('T')[0],
        catatan: catatan,
        operatorId: LaundryAPI.getCurrentUser()?.id
    };
    
    try {
        await LaundryAPI.addPesanan(newPesanan);
        closeModal('pesananModal');
        await loadPesanan();
        showToast('success', 'Pesanan berhasil ditambahkan!');
    } catch (error) {
        showToast('error', error.message);
    }
}

// ============ HELPER FUNCTIONS ============
function formatRupiah(angka) {
    return 'Rp ' + angka.toLocaleString('id-ID');
}

function formatTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('id-ID');
}

function getStatusBadge(status) {
    const statusMap = {
        'menunggu': 'badge-warning',
        'proses': 'badge-info',
        'selesai': 'badge-success',
        'diambil': 'badge-primary',
        'active': 'badge-success'
    };
    return `<span class="badge ${statusMap[status] || 'badge-secondary'}">${status}</span>`;
}

function getPaymentBadge(status) {
    if (status === 'lunas') {
        return '<span class="badge badge-success">Lunas</span>';
    }
    return '<span class="badge badge-danger">Belum Lunas</span>';
}

function getRoleBadge(role) {
    const roleMap = {
        'admin': 'badge-danger',
        'operator': 'badge-info',
        'customer': 'badge-primary'
    };
    return `<span class="badge ${roleMap[role]}">${role}</span>`;
}

function getActivityIcon(tipe) {
    const iconMap = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };
    return iconMap[tipe] || 'fa-bell';
}

function getChangePercentage(current, previous) {
    if (!previous) return 'Data baru';
    const change = ((current - previous) / previous * 100).toFixed(1);
    return change > 0 ? `↑ ${change}%` : `↓ ${Math.abs(change)}%`;
}

function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <span style="margin-left: 1rem;">Memuat data...</span>
            </div>
        `;
    }
}

function showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i>
                ${message}
            </div>
        `;
    }
}

function showToast(type, message) {
    // Simple alert untuk sementara
    alert(message);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.remove();
}

// Export functions ke global scope
window.changePage = changePage;
window.filterPesanan = filterPesanan;
window.filterPelanggan = filterPelanggan;
window.showTambahPesanan = showTambahPesanan;
window.hitungTotalPesanan = hitungTotalPesanan;
window.simpanPesanan = simpanPesanan;
window.closeModal = closeModal;
window.formatRupiah = formatRupiah;