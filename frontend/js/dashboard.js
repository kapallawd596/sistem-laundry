/**
 * DASHBOARD COMPONENT - LaundryPro
 * Komponen dashboard untuk semua role
 */

// ============ DASHBOARD CLASS ============
class Dashboard {
    constructor() {
        this.stats = null;
        this.aktivitas = [];
        this.pesananTerbaru = [];
        this.charts = {};
    }

    /**
     * Load dashboard data
     */
    async loadDashboardData() {
        try {
            this.stats = await LaundryAPI.getStatistik();
            this.aktivitas = await LaundryAPI.getAktivitas();
            this.pesananTerbaru = await LaundryAPI.getPesanan({ limit: 5 });
            return true;
        } catch (error) {
            console.error('Gagal load dashboard:', error);
            return false;
        }
    }

    /**
     * Render dashboard HTML
     */
    render() {
        if (!this.stats) {
            return '<div class="loading"><div class="spinner"></div> Memuat dashboard...</div>';
        }

        const user = auth.getUser();
        const isAdmin = user?.role === 'admin';
        const isOperator = user?.role === 'operator';

        return `
            <!-- WELCOME SECTION -->
            <div class="welcome-section" style="margin-bottom: 1.5rem;">
                <div class="card" style="background: linear-gradient(135deg, #4361ee, #3730a3); color: white;">
                    <div class="card-body" style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="margin: 0 0 0.5rem 0;">Selamat Datang, ${user?.nama || 'User'}!</h2>
                            <p style="margin: 0; opacity: 0.9;">${getGreeting()} - ${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                        <div class="avatar avatar-lg" style="background: rgba(255,255,255,0.2); font-size: 2rem;">
                            ${user?.nama?.charAt(0) || 'U'}
                        </div>
                    </div>
                </div>
            </div>

            <!-- STATS GRID -->
            <div class="stats-grid">
                ${this.renderStatCard('Total Pesanan', this.stats.totalPesanan || 0, 'fa-receipt', '#4361ee')}
                ${this.renderStatCard('Pendapatan', formatRupiah(this.stats.totalPendapatan || 0), 'fa-money-bill-wave', '#10b981')}
                ${this.renderStatCard('Dalam Proses', this.stats.pesananProses || 0, 'fa-spinner', '#f59e0b')}
                ${this.renderStatCard('Selesai', this.stats.pesananSelesai || 0, 'fa-check-circle', '#06b6d4')}
                ${isAdmin || isOperator ? this.renderStatCard('Pelanggan', this.stats.totalPelanggan || 0, 'fa-users', '#8b5cf6') : ''}
                ${isAdmin ? this.renderStatCard('Layanan', this.stats.totalLayanan || 0, 'fa-tags', '#ec4899') : ''}
            </div>

            <!-- CHARTS SECTION (Admin/Operator only) -->
            ${(isAdmin || isOperator) ? `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-chart-line"></i> Pendapatan 7 Hari Terakhir</h3>
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
            ` : ''}

            <!-- QUICK ACTIONS -->
            <div class="card" style="margin-bottom: 1.5rem;">
                <div class="card-header">
                    <h3><i class="fas fa-bolt"></i> Aksi Cepat</h3>
                </div>
                <div class="card-body">
                    <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                        <button class="btn btn-primary" onclick="window.openModal?.('pesananModal')">
                            <i class="fas fa-plus"></i> Pesanan Baru
                        </button>
                        <button class="btn btn-success" onclick="window.location.href='/pages/pelanggan.html'">
                            <i class="fas fa-user-plus"></i> Tambah Pelanggan
                        </button>
                        <button class="btn btn-info" onclick="window.location.href='/pages/laporan.html'">
                            <i class="fas fa-chart-bar"></i> Lihat Laporan
                        </button>
                    </div>
                </div>
            </div>

            <!-- RECENT ORDERS & ACTIVITIES -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-clock"></i> Pesanan Terbaru</h3>
                        <button class="btn btn-sm btn-outline" onclick="window.location.href='/pages/pesanan.html'">
                            Lihat Semua <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                    <div class="card-body" style="padding: 0;">
                        <div class="table-wrapper">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Kode</th>
                                        <th>Pelanggan</th>
                                        <th>Total</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.renderRecentOrders()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-history"></i> Aktivitas Terkini</h3>
                    </div>
                    <div class="card-body">
                        ${this.renderActivities()}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render stat card
     */
    renderStatCard(label, value, icon, color) {
        return `
            <div class="stat-card">
                <div class="stat-icon" style="background: ${color}20; color: ${color};">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="stat-value">${typeof value === 'number' ? value.toLocaleString() : value}</div>
                <div class="stat-label">${label}</div>
            </div>
        `;
    }

    /**
     * Render recent orders table rows
     */
    renderRecentOrders() {
        if (!this.pesananTerbaru || this.pesananTerbaru.length === 0) {
            return '<tr><td colspan="4" class="text-center">Belum ada pesanan</td></tr>';
        }

        return this.pesananTerbaru.map(p => `
            <tr onclick="window.lihatDetail?.(${p.id})" style="cursor: pointer;">
                <td><strong>${p.kode}</strong></td>
                <td>${p.pelangganNama}</td>
                <td>${formatRupiah(p.totalBayar)}</td>
                <td>${getStatusBadge(p.status)}</td>
            </tr>
        `).join('');
    }

    /**
     * Render activities list
     */
    renderActivities() {
        if (!this.aktivitas || this.aktivitas.length === 0) {
            return '<div class="text-center text-muted">Belum ada aktivitas</div>';
        }

        return this.aktivitas.slice(0, 10).map(a => `
            <div class="activity-item">
                <div class="activity-icon ${a.tipe}">
                    <i class="fas ${this.getActivityIcon(a.tipe)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">${a.deskripsi}</div>
                    <div class="activity-time">${formatTime(a.createdAt)}</div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Get activity icon
     */
    getActivityIcon(tipe) {
        const icons = {
            'success': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'warning': 'fa-exclamation-triangle',
            'info': 'fa-info-circle'
        };
        return icons[tipe] || 'fa-bell';
    }

    /**
     * Initialize charts
     */
    initCharts() {
        if (!this.stats) return;

        // Revenue Chart
        const revenueCtx = document.getElementById('revenueChart')?.getContext('2d');
        if (revenueCtx && typeof Chart !== 'undefined') {
            this.charts.revenue = new Chart(revenueCtx, {
                type: 'line',
                data: {
                    labels: this.stats.pendapatanPerHari?.map(d => d.tanggal) || [],
                    datasets: [{
                        label: 'Pendapatan (Rp)',
                        data: this.stats.pendapatanPerHari?.map(d => d.total) || [],
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
        if (statusCtx && typeof Chart !== 'undefined') {
            this.charts.status = new Chart(statusCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Menunggu', 'Proses', 'Selesai', 'Diambil'],
                    datasets: [{
                        data: [
                            this.stats.pesananMenunggu || 0,
                            this.stats.pesananProses || 0,
                            this.stats.pesananSelesai || 0,
                            this.stats.pesananDiambil || 0
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

    /**
     * Refresh dashboard
     */
    async refresh() {
        await this.loadDashboardData();
        const container = document.getElementById('dashboardContent');
        if (container) {
            container.innerHTML = this.render();
            this.initCharts();
        }
    }
}

// ============ CUSTOMER DASHBOARD ============
class CustomerDashboard {
    constructor() {
        this.pesananSaya = [];
        this.profile = null;
    }

    async loadCustomerData() {
        const user = auth.getUser();
        if (!user) return false;

        try {
            this.pesananSaya = await LaundryAPI.getPesanan({ customerId: user.id });
            this.profile = user;
            return true;
        } catch (error) {
            console.error('Gagal load customer data:', error);
            return false;
        }
    }

    render() {
        if (!this.profile) {
            return '<div class="loading"><div class="spinner"></div> Memuat data...</div>';
        }

        const stats = {
            total: this.pesananSaya.length,
            proses: this.pesananSaya.filter(p => p.status === 'proses').length,
            selesai: this.pesananSaya.filter(p => p.status === 'selesai').length,
            diambil: this.pesananSaya.filter(p => p.status === 'diambil').length
        };

        return `
            <!-- PROFILE SECTION -->
            <div class="card" style="margin-bottom: 1.5rem;">
                <div class="card-body" style="display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap;">
                    <div class="avatar avatar-lg" style="background: linear-gradient(135deg, #4361ee, #06b6d4);">
                        ${this.profile.nama?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <h2 style="margin: 0 0 0.25rem 0;">${this.profile.nama}</h2>
                        <p style="margin: 0; color: #64748b;">
                            <i class="fas fa-envelope"></i> ${this.profile.email} &nbsp;|&nbsp;
                            <i class="fas fa-phone"></i> ${this.profile.no_hp || '-'}
                        </p>
                        <p style="margin: 0.25rem 0 0 0; color: #64748b;">
                            <i class="fas fa-map-marker-alt"></i> ${this.profile.alamat || 'Belum diisi'}
                        </p>
                    </div>
                </div>
            </div>

            <!-- STATS -->
            <div class="stats-grid">
                ${this.renderStatCard('Total Pesanan', stats.total, 'fa-receipt', '#4361ee')}
                ${this.renderStatCard('Dalam Proses', stats.proses, 'fa-spinner', '#f59e0b')}
                ${this.renderStatCard('Selesai', stats.selesai, 'fa-check-circle', '#10b981')}
                ${this.renderStatCard('Diambil', stats.diambil, 'fa-box', '#06b6d4')}
            </div>

            <!-- RECENT ORDERS -->
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-shopping-bag"></i> Riwayat Pesanan Saya</h3>
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
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderOrderHistory()}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderStatCard(label, value, icon, color) {
        return `
            <div class="stat-card">
                <div class="stat-icon" style="background: ${color}20; color: ${color};">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="stat-value">${value}</div>
                <div class="stat-label">${label}</div>
            </div>
        `;
    }

    renderOrderHistory() {
        if (!this.pesananSaya || this.pesananSaya.length === 0) {
            return '<tr><td colspan="7" class="text-center">Belum ada pesanan</td></tr>';
        }

        return this.pesananSaya.map(p => `
            <tr>
                <td><strong>${p.kode}</strong></td>
                <td>${p.layananNama}</td>
                <td>${p.berat} kg</td>
                <td>${formatRupiah(p.totalBayar)}</td>
                <td>${getStatusBadge(p.status)}</td>
                <td>${p.tanggalMasuk}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="window.lihatDetailPesanan(${p.id})">
                        <i class="fas fa-eye"></i> Detail
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async refresh() {
        await this.loadCustomerData();
        const container = document.getElementById('dashboardContent');
        if (container) {
            container.innerHTML = this.render();
        }
    }
}

// ============ OPERATOR DASHBOARD ============
class OperatorDashboard extends Dashboard {
    constructor() {
        super();
        this.todayOrders = [];
        this.pendingPickup = [];
    }

    async loadOperatorData() {
        await this.loadDashboardData();
        
        try {
            const today = new Date().toISOString().split('T')[0];
            this.todayOrders = await LaundryAPI.getPesanan({ tanggal: today });
            this.pendingPickup = await LaundryAPI.getPesanan({ status: 'selesai' });
            return true;
        } catch (error) {
            console.error('Gagal load operator data:', error);
            return false;
        }
    }

    render() {
        if (!this.stats) {
            return '<div class="loading"><div class="spinner"></div> Memuat dashboard...</div>';
        }

        const user = auth.getUser();

        return `
            <!-- WELCOME -->
            <div class="welcome-section" style="margin-bottom: 1.5rem;">
                <div class="card" style="background: linear-gradient(135deg, #06b6d4, #0891b2); color: white;">
                    <div class="card-body" style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h2 style="margin: 0;">Selamat Bekerja, ${user?.nama}!</h2>
                            <p style="margin: 0.5rem 0 0 0;">${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                        <div class="avatar avatar-lg" style="background: rgba(255,255,255,0.2);">
                            ${user?.nama?.charAt(0) || 'O'}
                        </div>
                    </div>
                </div>
            </div>

            <!-- STATS -->
            <div class="stats-grid">
                ${this.renderStatCard('Pesanan Hari Ini', this.todayOrders.length, 'fa-calendar-day', '#06b6d4')}
                ${this.renderStatCard('Perlu Diambil', this.pendingPickup.length, 'fa-box-open', '#f59e0b')}
                ${this.renderStatCard('Sedang Proses', this.stats.pesananProses || 0, 'fa-spinner', '#4361ee')}
                ${this.renderStatCard('Selesai Hari Ini', this.stats.pesananSelesai || 0, 'fa-check-circle', '#10b981')}
            </div>

            <!-- QUICK ACTIONS -->
            <div class="card" style="margin-bottom: 1.5rem;">
                <div class="card-header">
                    <h3><i class="fas fa-bolt"></i> Aksi Cepat</h3>
                </div>
                <div class="card-body">
                    <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                        <button class="btn btn-primary" onclick="window.openModal?.('pesananModal')">
                            <i class="fas fa-plus"></i> Pesanan Baru
                        </button>
                        <button class="btn btn-warning" onclick="window.location.href='/pages/pesanan.html?status=proses'">
                            <i class="fas fa-play"></i> Update Status
                        </button>
                        <button class="btn btn-success" onclick="window.location.href='/pages/pesanan.html?status=selesai'">
                            <i class="fas fa-check"></i> Konfirmasi Selesai
                        </button>
                    </div>
                </div>
            </div>

            <!-- TODAY'S ORDERS -->
            <div class="card" style="margin-bottom: 1.5rem;">
                <div class="card-header">
                    <h3><i class="fas fa-today"></i> Pesanan Hari Ini</h3>
                </div>
                <div class="table-wrapper">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Kode</th><th>Pelanggan</th><th>Layanan</th><th>Berat</th><th>Status</th><th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderTodayOrders()}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- PENDING PICKUP -->
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-box"></i> Pesanan Siap Diambil</h3>
                </div>
                <div class="table-wrapper">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Kode</th><th>Pelanggan</th><th>Total</th><th>Tanggal Selesai</th><th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderPendingPickup()}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderTodayOrders() {
        if (!this.todayOrders || this.todayOrders.length === 0) {
            return '<tr><td colspan="6" class="text-center">Tidak ada pesanan hari ini</td></tr>';
        }

        return this.todayOrders.map(p => `
            <tr>
                <td><strong>${p.kode}</strong></td>
                <td>${p.pelangganNama}</td>
                <td>${p.layananNama}</td>
                <td>${p.berat} kg</td>
                <td>${getStatusBadge(p.status)}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="window.updateStatusPesanan(${p.id})">
                        <i class="fas fa-sync"></i> Update
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderPendingPickup() {
        if (!this.pendingPickup || this.pendingPickup.length === 0) {
            return '<tr><td colspan="5" class="text-center">Tidak ada pesanan yang siap diambil</td></tr>';
        }

        return this.pendingPickup.map(p => `
            <tr>
                <td><strong>${p.kode}</strong></td>
                <td>${p.pelangganNama}</td>
                <td>${formatRupiah(p.totalBayar)}</td>
                <td>${p.tanggalSelesai || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="window.markAsTaken(${p.id})">
                        <i class="fas fa-check"></i> Sudah Diambil
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async refresh() {
        await this.loadOperatorData();
        const container = document.getElementById('dashboardContent');
        if (container) {
            container.innerHTML = this.render();
        }
    }
}

// ============ EXPORTS & INITIALIZATION ============

// Global dashboard instances
let currentDashboard = null;

/**
 * Initialize dashboard based on user role
 */
async function initDashboard() {
    const user = auth.getUser();
    const container = document.getElementById('dashboardContent');
    
    if (!container) return;
    
    if (!user) {
        container.innerHTML = '<div class="alert alert-danger">Silakan login terlebih dahulu</div>';
        return;
    }
    
    // Create dashboard based on role
    if (user.role === 'admin') {
        currentDashboard = new Dashboard();
    } else if (user.role === 'operator') {
        currentDashboard = new OperatorDashboard();
    } else if (user.role === 'customer') {
        currentDashboard = new CustomerDashboard();
    }
    
    if (currentDashboard) {
        await currentDashboard.loadDashboardData?.();
        container.innerHTML = currentDashboard.render();
        currentDashboard.initCharts?.();
    }
}

/**
 * Refresh dashboard
 */
async function refreshDashboard() {
    if (currentDashboard) {
        await currentDashboard.refresh();
    }
}

/**
 * Get greeting based on time
 */
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 18) return 'Selamat Siang';
    return 'Selamat Malam';
}

// Export to global
window.Dashboard = Dashboard;
window.CustomerDashboard = CustomerDashboard;
window.OperatorDashboard = OperatorDashboard;
window.initDashboard = initDashboard;
window.refreshDashboard = refreshDashboard;
window.getGreeting = getGreeting;