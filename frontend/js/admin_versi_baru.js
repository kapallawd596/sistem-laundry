/**
 * ADMIN DASHBOARD - LaundryPro
 * Fitur lengkap + Settings + Sidebar Responsive + PETA LOKASI + TRACKING REAL-TIME
 * SUMBER DATA: DATABASE AIVEN (via Backend API)
 */

let currentUser = null;
let currentPageData = {};
let map = null;
let refreshInterval = null;

// ============ HELPER FUNCTIONS ============
function updateDateTime() {
    const now = new Date();
    const timeEl = document.getElementById('currentTime');
    const dateEl = document.getElementById('currentDate');
    if (timeEl) timeEl.innerText = now.toLocaleTimeString('id-ID', { hour12: false });
    if (dateEl) dateEl.innerText = now.toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
}

function createParticles() {
    const container = document.getElementById('particles');
    if (!container || container.children.length > 0) return;
    for (let i = 0; i < 80; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDelay = Math.random() * 15 + 's';
        p.style.animationDuration = Math.random() * 10 + 10 + 's';
        container.appendChild(p);
    }
}

function formatRupiah(angka) {
    if (angka === undefined || angka === null || isNaN(angka) || angka === '') {
        return 'Rp 0';
    }
    const num = Number(angka);
    if (isNaN(num)) return 'Rp 0';
    return 'Rp ' + num.toLocaleString('id-ID');
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('id-ID');
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function getStatusBadge(status) {
    const statusMap = {
        'menunggu': '<span class="badge badge-warning">⏳ Menunggu</span>',
        'proses': '<span class="badge badge-info">🔄 Diproses</span>',
        'selesai': '<span class="badge badge-success">✅ Selesai</span>',
        'diambil': '<span class="badge badge-success">📦 Diambil</span>'
    };
    return statusMap[status] || `<span class="badge">${status}</span>`;
}

function getPaymentBadge(status) {
    return status === 'lunas' 
        ? '<span class="badge badge-success">✅ Lunas</span>'
        : '<span class="badge badge-warning">⏳ Belum Lunas</span>';
}

function getRoleBadge(role) {
    const roleMap = {
        'admin': '<span class="badge badge-danger">👑 Admin</span>',
        'karyawan': '<span class="badge badge-info">🔧 Karyawan</span>',
        'pelanggan': '<span class="badge badge-success">👤 Pelanggan</span>'
    };
    return roleMap[role] || `<span class="badge">${role}</span>`;
}

function showToast(type, message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    toast.innerHTML = `${icons[type] || 'ℹ️'} ${message}`;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3000);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.remove();
}

function openModal(contentHtml, title = 'Form') {
    const existingModal = document.getElementById('dynamicModal');
    if (existingModal) existingModal.remove();
    
    const modalHtml = `
        <div class="modal active" id="dynamicModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-${title === 'Form' ? 'edit' : 'plus'}"></i> ${title}</h3>
                    <button class="modal-close" onclick="closeModal('dynamicModal')">&times;</button>
                </div>
                <div class="modal-body">${contentHtml}</div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// ============ DESTROY CHART HELPER ============
function destroyChartIfExists(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    if (canvas._chart) {
        canvas._chart.destroy();
        canvas._chart = null;
    }
    
    if (typeof Chart !== 'undefined' && Chart.getChart(canvas)) {
        Chart.getChart(canvas).destroy();
    }
}

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = auth.getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = '/login.html';
        return;
    }
    
    document.getElementById('userName').innerText = currentUser.nama;
    document.getElementById('userAvatar').innerText = currentUser.nama.charAt(0).toUpperCase();
    
    auth.initMobileSidebar();
    
    await loadDashboard();
    
    document.querySelectorAll('.menu-item[data-page]').forEach(item => {
        item.addEventListener('click', () => loadPage(item.getAttribute('data-page')));
    });
    
    document.getElementById('logoutBtn').addEventListener('click', () => auth.logout());
    
    setInterval(updateDateTime, 1000);
    updateDateTime();
    createParticles();
});

// ============ PAGE LOADER ============
async function loadPage(page) {
    stopAutoRefresh();
    
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`[data-page="${page}"]`).classList.add('active');
    
    if (window.innerWidth <= 768) {
        auth.closeSidebar();
    }
    
    const titles = {
        dashboard: 'Dashboard', 
        pesanan: 'Manajemen Pesanan',
        pelanggan: 'Data Pelanggan', 
        layanan: 'Kelola Layanan',
        laporan: 'Laporan & Statistik', 
        users: 'Manajemen User',
        settings: 'Pengaturan',
        map: 'Peta & Tracking Lokasi',
        ulasan: 'Rating & Ulasan Pelanggan'
    };
    
    const icons = {
        dashboard: 'fa-chart-line',
        pesanan: 'fa-receipt',
        pelanggan: 'fa-users',
        layanan: 'fa-tags',
        laporan: 'fa-chart-pie',
        users: 'fa-user-cog',
        settings: 'fa-cog',
        map: 'fa-map-marker-alt',
        ulasan: 'fa-star'
    };
    
    document.getElementById('pageTitle').innerHTML = `<i class="fas ${icons[page]}"></i> ${titles[page]}`;
    document.getElementById('pageContent').innerHTML = '<div class="loading"><div class="spinner"></div>Memuat data...</div>';
    
    if (page === 'dashboard') await loadDashboard();
    else if (page === 'pesanan') await loadPesanan();
    else if (page === 'pelanggan') await loadPelanggan();
    else if (page === 'layanan') await loadLayanan();
    else if (page === 'laporan') await loadLaporan();
    else if (page === 'users') await loadUsers();
    else if (page === 'settings') await loadSettings();
    else if (page === 'map') await loadMapPage();
    else if (page === 'ulasan') await loadUlasan();
}

// ============ DASHBOARD - DATA DARI AIVEN ============
async function loadDashboard() {
    try {
        // ✅ DATA LANGSUNG DARI API (DATABASE AIVEN)
        const stats = await LaundryAPI.getStatistik();
        console.log('📊 STATS FROM AIVEN:', stats);
        
        const aktivitas = await LaundryAPI.getAktivitas();
        const pesananTerbaru = await LaundryAPI.getPesanan({ limit: 5 });
        
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const pesananHariIni = pesananTerbaru.filter(p => {
            const tgl = p.tanggalMasuk || p.tanggalPesan || '';
            return tgl.includes(todayStr);
        });
        
        const html = `
            <!-- GREETING -->
            <div style="background:linear-gradient(135deg,rgba(59,130,246,0.12),rgba(6,182,212,0.06));border-radius:12px;padding:14px 18px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <div>
                    <h2 style="font-size:1.1rem;margin:0;">👋 Selamat datang, ${currentUser.nama}!</h2>
                    <p style="color:#94a3b8;font-size:0.75rem;margin:0;">${today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <div style="display:flex;gap:8px;align-items:center;">
                    <span style="background:rgba(16,185,129,0.15);color:#6ee7b7;padding:4px 12px;border-radius:20px;font-size:0.7rem;">
                        📦 ${pesananHariIni.length} pesanan hari ini
                    </span>
                </div>
            </div>
            
            <!-- STATS -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-receipt"></i></div>
                    <div class="stat-value">${stats.totalPesanan || 0}</div>
                    <div class="stat-label">Total Pesanan</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-money-bill-wave"></i></div>
                    <div class="stat-value">${formatRupiah(stats.totalPendapatan || 0)}</div>
                    <div class="stat-label">Total Pendapatan</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-spinner"></i></div>
                    <div class="stat-value">${stats.pesananProses || 0}</div>
                    <div class="stat-label">Dalam Proses</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-users"></i></div>
                    <div class="stat-value">${stats.totalPelanggan || 0}</div>
                    <div class="stat-label">Total Pelanggan</div>
                </div>
            </div>
            
            <!-- CHART -->
            <div class="dashboard-charts" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                <div class="glass-card">
                    <div class="card-header" style="font-size:0.85rem;padding:10px 14px;">
                        <span><i class="fas fa-chart-line"></i> Pendapatan 7 Hari</span>
                    </div>
                    <div class="card-body" style="padding:10px 14px;">
                        <div class="chart-container" style="position:relative;width:100%;height:200px;">
                            <canvas id="revenueChart"></canvas>
                        </div>
                    </div>
                </div>
                <div class="glass-card">
                    <div class="card-header" style="font-size:0.85rem;padding:10px 14px;">
                        <span><i class="fas fa-chart-pie"></i> Status Pesanan</span>
                        <span style="font-size:0.6rem;color:#64748b;">${stats.totalPesanan} total</span>
                    </div>
                    <div class="card-body" style="padding:10px 14px;">
                        <div class="chart-container" style="position:relative;width:100%;height:200px;">
                            <canvas id="statusChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- PESANAN TERBARU -->
            <div class="glass-card">
                <div class="card-header" style="font-size:0.85rem;padding:10px 14px;">
                    <span><i class="fas fa-clock"></i> Pesanan Terbaru</span>
                    <button class="btn btn-sm btn-outline" onclick="loadPage('pesanan')" style="font-size:0.65rem;padding:4px 10px;">Lihat Semua</button>
                </div>
                <div class="card-body" style="padding:0;">
                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th style="font-size:0.6rem;padding:8px 10px;">Kode</th>
                                    <th style="font-size:0.6rem;padding:8px 10px;">Pelanggan</th>
                                    <th style="font-size:0.6rem;padding:8px 10px;">Total</th>
                                    <th style="font-size:0.6rem;padding:8px 10px;">Status</th>
                                    <th style="font-size:0.6rem;padding:8px 10px;">Tanggal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pesananTerbaru.map(p => `
                                    <tr>
                                        <td style="font-size:0.7rem;padding:8px 10px;"><strong>${p.kode}</strong></td>
                                        <td style="font-size:0.7rem;padding:8px 10px;">${p.pelangganNama}</td>
                                        <td style="font-size:0.7rem;padding:8px 10px;font-weight:600;color:#10b981;">${formatRupiah(p.totalBayar)}</td>
                                        <td style="font-size:0.7rem;padding:8px 10px;">${getStatusBadge(p.status)}</td>
                                        <td style="font-size:0.6rem;padding:8px 10px;color:#94a3b8;">${p.tanggalMasuk || p.tanggalPesan}</td>
                                    </tr>
                                `).join('')}
                                ${pesananTerbaru.length === 0 ? '<tr><td colspan="5" style="text-align:center;padding:12px;color:#64748b;font-size:0.8rem;">Belum ada pesanan</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <!-- AKTIVITAS -->
            <div class="glass-card">
                <div class="card-header" style="font-size:0.85rem;padding:10px 14px;">
                    <span><i class="fas fa-history"></i> Aktivitas Terkini</span>
                </div>
                <div class="card-body" style="padding:10px 14px;">
                    ${(aktivitas || []).slice(0, 8).map(a => `
                        <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(59,130,246,0.04);">
                            <span style="font-size:1.1rem;">📌</span>
                            <div style="flex:1;">
                                <div style="font-size:0.8rem;color:#cbd5e1;">${a.deskripsi}</div>
                                <div style="font-size:0.55rem;color:#64748b;">${formatDateTime(a.createdAt)}</div>
                            </div>
                        </div>
                    `).join('')}
                    ${(aktivitas || []).length === 0 ? '<p style="color:#64748b;font-size:0.8rem;text-align:center;padding:8px;">Belum ada aktivitas</p>' : ''}
                </div>
            </div>
        `;
        
        document.getElementById('pageContent').innerHTML = html;
        
        // ===== RENDER CHART =====
        if (typeof Chart !== 'undefined') {
            setTimeout(() => {
                const revenueCanvas = document.getElementById('revenueChart');
                const statusCanvas = document.getElementById('statusChart');
                const isMobile = window.innerWidth <= 768;
                
                // CHART PENDAPATAN
                if (revenueCanvas) {
                    destroyChartIfExists('revenueChart');
                    
                    let labels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
                    let data = [0, 0, 0, 0, 0, 0, 0];
                    
                    if (stats.pendapatanPerHari && stats.pendapatanPerHari.length > 0) {
                        labels = stats.pendapatanPerHari.map(d => {
                            if (d.tanggal) {
                                const date = new Date(d.tanggal);
                                const day = String(date.getDate()).padStart(2, '0');
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                return day + '/' + month;
                            }
                            return '-';
                        });
                        data = stats.pendapatanPerHari.map(d => {
                            const val = parseFloat(d.total);
                            return isNaN(val) ? 0 : val;
                        });
                    }
                    
                    new Chart(revenueCanvas, {
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: 'Pendapatan',
                                data: data,
                                borderColor: '#3B82F6',
                                backgroundColor: 'rgba(59,130,246,0.1)',
                                tension: 0.4,
                                fill: true,
                                pointRadius: isMobile ? 2 : 3,
                                pointBackgroundColor: '#3B82F6'
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    labels: { color: '#94a3b8', font: { size: isMobile ? 8 : 10 } }
                                }
                            },
                            scales: {
                                x: {
                                    ticks: { color: '#94a3b8', font: { size: isMobile ? 7 : 9 } },
                                    grid: { color: 'rgba(59,130,246,0.05)' }
                                },
                                y: {
                                    ticks: { 
                                        color: '#94a3b8', 
                                        font: { size: isMobile ? 7 : 9 },
                                        callback: function(value) {
                                            if (value >= 1000) return (value/1000) + 'K';
                                            return value;
                                        }
                                    },
                                    grid: { color: 'rgba(59,130,246,0.05)' }
                                }
                            }
                        }
                    });
                }
                
                // CHART STATUS
                if (statusCanvas) {
                    destroyChartIfExists('statusChart');
                    
                    new Chart(statusCanvas, {
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
                                backgroundColor: ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6'],
                                borderWidth: 0
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    position: 'bottom',
                                    labels: {
                                        color: '#94a3b8',
                                        font: { size: isMobile ? 8 : 9 },
                                        padding: isMobile ? 4 : 8,
                                        boxWidth: isMobile ? 8 : 10
                                    }
                                }
                            },
                            cutout: isMobile ? '60%' : '65%'
                        }
                    });
                }
            }, 300);
        }
        
    } catch(e) {
        document.getElementById('pageContent').innerHTML = `<div style="color:red;padding:20px;font-size:0.85rem;">Error: ${e.message}</div>`;
        console.error('❌ Error loadDashboard:', e);
    }
}

// ============ MANAJEMEN PESANAN ============
async function loadPesanan() {
    try {
        const pesanan = await LaundryAPI.getPesanan();
        currentPageData.pesanan = pesanan;
        
        const html = `
            <div class="search-filter">
                <input type="text" id="searchPesanan" placeholder="🔍 Cari kode atau pelanggan..." onkeyup="filterPesanan()">
                <select id="statusFilter" onchange="filterPesanan()"><option value="">Semua Status</option><option value="menunggu">Menunggu</option><option value="proses">Proses</option><option value="selesai">Selesai</option><option value="diambil">Diambil</option></select>
                <button class="btn btn-primary" onclick="showTambahPesanan()"><i class="fas fa-plus"></i> Tambah Pesanan</button>
            </div>
            <div class="glass-card"><div class="card-header"><span><i class="fas fa-receipt"></i> Daftar Pesanan</span></div>
            <div class="card-body" style="padding:0;"><div class="table-wrap"><table class="table"><thead><tr><th>Kode</th><th>Pelanggan</th><th>Layanan</th><th>Berat</th><th>Total</th><th>Status</th><th>Pembayaran</th><th>Aksi</th></tr></thead><tbody id="pesananTableBody">${pesanan.map(p => renderPesananRow(p)).join('')}</tbody></table></div></div></div>
        `;
        document.getElementById('pageContent').innerHTML = html;
        
        window.filterPesanan = function() {
            const search = document.getElementById('searchPesanan')?.value.toLowerCase() || '';
            const status = document.getElementById('statusFilter')?.value || '';
            const filtered = (currentPageData.pesanan || []).filter(p => {
                const matchSearch = p.kode.toLowerCase().includes(search) || p.pelangganNama.toLowerCase().includes(search);
                const matchStatus = !status || p.status === status;
                return matchSearch && matchStatus;
            });
            const tbody = document.getElementById('pesananTableBody');
            if (tbody) tbody.innerHTML = filtered.map(p => renderPesananRow(p)).join('') || '<tr><td colspan="8" class="text-center">Tidak ada data</td>';
        };
    } catch(e) {
        document.getElementById('pageContent').innerHTML = `<div style="color:red;">Error: ${e.message}</div>`;
    }
}

function renderPesananRow(p) {
    return `
        <tr>
            <td><strong>${p.kode}</strong></td>
            <td>${p.pelangganNama}<br><small class="text-muted">${p.pelangganHp || ''}</small></td>
            <td>${p.layananNama}</td>
            <td>${p.berat ? p.berat + ' kg' : '<span style="color:#F59E0B;">Belum ditimbang</span>'}</td>
            <td>${p.totalBayar ? formatRupiah(p.totalBayar) : '-'}</td>
            <td>${getStatusBadge(p.status)}</span></td>
            <td>${getPaymentBadge(p.statusPembayaran)}</span></td>
            <td class="action-buttons">
                ${(!p.berat || p.berat === null) ? `<button class="btn btn-sm btn-warning" onclick="openInputBeratAdmin(${p.id})"><i class="fas fa-weight-hanging"></i> Timbang</button>` : ''}
                <button class="btn btn-sm btn-primary" onclick="editPesanan(${p.id})"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn btn-sm btn-danger" onclick="hapusPesanan(${p.id})"><i class="fas fa-trash"></i> Hapus</button>
            </td>
        </tr>
    `;
}

window.openInputBeratAdmin = function(orderId) {
    const pesanan = currentPageData.pesanan || [];
    const order = pesanan.find(p => p.id === orderId);
    if (!order) return;
    
    const html = `
        <form id="inputBeratForm">
            <div class="form-group"><label class="form-label">Kode Pesanan</label><input type="text" class="form-control" value="${order.kode}" readonly disabled></div>
            <div class="form-group"><label class="form-label">Pelanggan</label><input type="text" class="form-control" value="${order.pelangganNama}" readonly disabled></div>
            <div class="form-group"><label class="form-label">Layanan</label><input type="text" class="form-control" value="${order.layananNama} - ${formatRupiah(order.hargaPerKg)}/kg" readonly disabled></div>
            <div class="form-group"><label class="form-label required">Berat (kg)</label><input type="number" id="berat" class="form-control" step="0.1" min="0.1" placeholder="Contoh: 3.5" required><small style="color:#64748B;">Timbang pakaian di toko, lalu input beratnya</small></div>
            <div class="form-group"><label class="form-label">Total Harga (Otomatis)</label><input type="text" id="totalDisplay" class="form-control" readonly disabled></div>
        </form>
        <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal('dynamicModal')">Batal</button><button class="btn btn-primary" onclick="saveBeratAdmin(${orderId})">Simpan & Proses</button></div>
    `;
    openModal(html, 'Input Berat Pesanan');
    
    document.getElementById('berat').addEventListener('input', function() {
        const berat = parseFloat(this.value) || 0;
        const total = berat * order.hargaPerKg;
        document.getElementById('totalDisplay').value = formatRupiah(total);
    });
};

window.saveBeratAdmin = async function(orderId) {
    const berat = parseFloat(document.getElementById('berat').value);
    if (!berat || berat <= 0) { showToast('error', 'Masukkan berat yang valid!'); return; }
    const order = currentPageData.pesanan.find(p => p.id === orderId);
    const totalHarga = berat * order.hargaPerKg;
    try {
        await LaundryAPI.updatePesanan(orderId, { berat: berat, totalHarga: totalHarga, totalBayar: totalHarga, status: 'proses', tanggalMasuk: new Date().toISOString().split('T')[0] });
        closeModal('dynamicModal');
        showToast('success', `Berat ${berat} kg disimpan! Total: ${formatRupiah(totalHarga)}`);
        loadPage('pesanan');
    } catch(e) { showToast('error', e.message); }
};

window.showTambahPesanan = async function() {
    const pelanggan = await LaundryAPI.getPelanggan();
    const layanan = await LaundryAPI.getLayanan();
    const html = `
        <form id="formPesanan">
            <div class="form-group"><label class="form-label">Pelanggan</label><select id="pelangganId" class="form-control" required><option value="">Pilih Pelanggan</option>${pelanggan.map(p => `<option value="${p.id}">${p.nama} - ${p.no_hp}</option>`).join('')}</select></div>
            <div class="form-group"><label class="form-label">Layanan</label><select id="layananId" class="form-control" required onchange="hitungTotal()"><option value="">Pilih Layanan</option>${layanan.map(l => `<option value="${l.id}" data-harga="${l.harga}">${l.nama} - ${formatRupiah(l.harga)}/kg</option>`).join('')}</select></div>
            <div class="form-group"><label class="form-label">Berat (kg)</label><input type="number" id="berat" class="form-control" step="0.5" min="0.5" value="1" oninput="hitungTotal()" required></div>
            <div class="form-group"><label class="form-label">Total Harga</label><input type="text" id="totalHarga" class="form-control" readonly></div>
            <div class="form-group"><label class="form-label">Diskon</label><input type="number" id="diskon" class="form-control" value="0" oninput="hitungTotal()"></div>
            <div class="form-group"><label class="form-label">Status Pembayaran</label><select id="statusPembayaran" class="form-control"><option value="belum">Belum Lunas</option><option value="lunas">Lunas</option></select></div>
            <div class="form-group"><label class="form-label">Catatan</label><textarea id="catatan" class="form-control" rows="2"></textarea></div>
        </form>
        <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal('dynamicModal')">Batal</button><button class="btn btn-primary" onclick="simpanPesanan()">Simpan</button></div>
    `;
    openModal(html, 'Tambah Pesanan');
    
    window.hitungTotal = function() {
        const select = document.getElementById('layananId');
        const harga = parseInt(select.options[select.selectedIndex]?.dataset?.harga || 0);
        const berat = parseFloat(document.getElementById('berat')?.value || 0);
        const diskon = parseFloat(document.getElementById('diskon')?.value || 0);
        const total = (harga * berat) - diskon;
        document.getElementById('totalHarga').value = formatRupiah(total > 0 ? total : 0);
    };
};

window.simpanPesanan = async function() {
    const pelangganId = document.getElementById('pelangganId').value;
    const layananId = document.getElementById('layananId').value;
    const berat = parseFloat(document.getElementById('berat').value);
    const diskon = parseFloat(document.getElementById('diskon').value || 0);
    const statusPembayaran = document.getElementById('statusPembayaran').value;
    const catatan = document.getElementById('catatan').value;
    
    if (!pelangganId || !layananId || !berat) { showToast('error', 'Lengkapi data!'); return; }
    
    const pelanggan = await LaundryAPI.getPelanggan();
    const layanan = await LaundryAPI.getLayanan();
    const selectedPelanggan = pelanggan.find(p => p.id == pelangganId);
    const selectedLayanan = layanan.find(l => l.id == layananId);
    
    const newPesanan = {
        pelangganId: parseInt(pelangganId), pelangganNama: selectedPelanggan.nama, pelangganHp: selectedPelanggan.no_hp, pelangganAlamat: selectedPelanggan.alamat || '',
        layananId: parseInt(layananId), layananNama: selectedLayanan.nama, berat: berat,
        hargaPerKg: selectedLayanan.harga, totalHarga: selectedLayanan.harga * berat,
        diskon: diskon, totalBayar: (selectedLayanan.harga * berat) - diskon,
        status: "menunggu", statusPembayaran: statusPembayaran, catatan: catatan,
        tanggalMasuk: new Date().toISOString().split('T')[0]
    };
    try {
        await LaundryAPI.addPesanan(newPesanan);
        closeModal('dynamicModal');
        showToast('success', 'Pesanan berhasil ditambahkan!');
        loadPage('pesanan');
    } catch(e) { showToast('error', e.message); }
};

window.editPesanan = async function(id) {
    const pesanan = await LaundryAPI.getPesanan();
    const p = pesanan.find(p => p.id === id);
    if (!p) return;
    const html = `
        <form><div class="form-group"><label class="form-label">Status</label><select id="status" class="form-control"><option ${p.status==='menunggu'?'selected':''}>menunggu</option><option ${p.status==='proses'?'selected':''}>proses</option><option ${p.status==='selesai'?'selected':''}>selesai</option><option ${p.status==='diambil'?'selected':''}>diambil</option></select></div>
        <div class="form-group"><label class="form-label">Status Pembayaran</label><select id="statusPembayaran" class="form-control"><option ${p.statusPembayaran==='belum'?'selected':''}>belum</option><option ${p.statusPembayaran==='lunas'?'selected':''}>lunas</option></select></div>
        <div class="form-group"><label class="form-label">Catatan</label><textarea id="catatan" class="form-control" rows="2">${p.catatan || ''}</textarea></div>
        <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal('dynamicModal')">Batal</button><button class="btn btn-primary" onclick="updatePesanan(${id})">Update</button></div>
    `;
    openModal(html, 'Edit Pesanan');
    
    window.updatePesanan = async function(orderId) {
        const status = document.getElementById('status').value;
        const statusPembayaran = document.getElementById('statusPembayaran').value;
        const catatan = document.getElementById('catatan').value;
        try {
            await LaundryAPI.updatePesanan(orderId, { status, statusPembayaran, catatan });
            closeModal('dynamicModal');
            showToast('success', 'Pesanan berhasil diupdate!');
            loadPage('pesanan');
        } catch(e) { showToast('error', e.message); }
    };
};

window.hapusPesanan = async function(id) {
    if (confirm('Yakin hapus pesanan ini?')) {
        try {
            await LaundryAPI.deletePesanan(id);
            showToast('success', 'Pesanan dihapus');
            loadPage('pesanan');
        } catch(e) { showToast('error', e.message); }
    }
};

// ============ MANAJEMEN PELANGGAN ============
async function loadPelanggan() {
    try {
        const pelanggan = await LaundryAPI.getPelanggan();
        currentPageData.pelanggan = pelanggan;
        const html = `
            <div class="search-filter"><input type="text" id="searchPelanggan" placeholder="🔍 Cari nama atau no HP..." onkeyup="filterPelanggan()"><button class="btn btn-primary" onclick="showTambahPelanggan()"><i class="fas fa-plus"></i> Tambah Pelanggan</button></div>
            <div class="glass-card"><div class="card-header"><span><i class="fas fa-users"></i> Daftar Pelanggan</span></div>
            <div class="card-body" style="padding:0;"><div class="table-wrap"><table class="table"><thead><tr><th>Nama</th><th>Email</th><th>No HP</th><th>Alamat</th><th>Poin</th><th>Total Transaksi</th><th>Aksi</th></tr></thead><tbody id="pelangganTableBody">${pelanggan.map(p => renderPelangganRow(p)).join('')}</tbody></table></div></div></div>
        `;
        document.getElementById('pageContent').innerHTML = html;
        
        window.filterPelanggan = function() {
            const search = document.getElementById('searchPelanggan')?.value.toLowerCase() || '';
            const filtered = (currentPageData.pelanggan || []).filter(p => p.nama.toLowerCase().includes(search) || p.no_hp.includes(search));
            const tbody = document.getElementById('pelangganTableBody');
            if (tbody) tbody.innerHTML = filtered.map(p => renderPelangganRow(p)).join('') || '<tr><td colspan="7" class="text-center">Tidak ada data</td>';
        };
    } catch(e) {
        document.getElementById('pageContent').innerHTML = `<div style="color:red;">Error: ${e.message}</div>`;
    }
}

function renderPelangganRow(p) {
    return `<tr>
        <td><strong>${p.nama}</strong></td>
        <td>${p.email || '-'}</td>
        <td>${p.no_hp}</td>
        <td>${p.alamat || '-'}</td>
        <td><span class="badge badge-info">${p.poin || 0} poin</span></td>
        <td>${p.totalTransaksi || 0} kali</td>
        <td class="action-buttons"><button class="btn btn-sm btn-primary" onclick="editPelanggan(${p.id})"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger" onclick="hapusPelanggan(${p.id})"><i class="fas fa-trash"></i></button></td>
    </tr>`;
}

window.showTambahPelanggan = function() {
    const html = `<form><div class="form-group"><label class="form-label">Nama</label><input id="nama" class="form-control" required></div><div class="form-group"><label class="form-label">Email</label><input id="email" type="email" class="form-control" required></div><div class="form-group"><label class="form-label">No HP</label><input id="no_hp" class="form-control" required></div><div class="form-group"><label class="form-label">Alamat</label><textarea id="alamat" class="form-control" rows="2"></textarea></div><div class="form-group"><label class="form-label">Password</label><input type="password" id="password" class="form-control" required></div><div class="modal-footer"><button class="btn btn-outline" onclick="closeModal('dynamicModal')">Batal</button><button class="btn btn-primary" onclick="simpanPelanggan()">Simpan</button></div></form>`;
    openModal(html, 'Tambah Pelanggan');
    
    window.simpanPelanggan = async function() {
        const data = { nama: document.getElementById('nama').value, email: document.getElementById('email').value, no_hp: document.getElementById('no_hp').value, alamat: document.getElementById('alamat').value, password: document.getElementById('password').value };
        try {
            const response = await fetch('https://laundry-backend-api.vercel.app/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, role: 'pelanggan' }) });
            const result = await response.json();
            if (result.success) { closeModal('dynamicModal'); showToast('success', 'Pelanggan ditambahkan'); loadPage('pelanggan'); }
            else showToast('error', result.message);
        } catch(e) { showToast('error', e.message); }
    };
};

// ============ RATING & ULASAN PELANGGAN ============
async function loadUlasan() {
    try {
        const data = await LaundryAPI.getAllUlasan();
        currentPageData.ulasan = data.ulasan;

        const starsHtml = (rating) => `<span style="color:#f59e0b;letter-spacing:2px;">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</span>`;

        const html = `
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-value">${data.totalUlasan}</div><div class="stat-label">Total Ulasan</div></div>
                <div class="stat-card"><div class="stat-value">${data.rataRata} <i class="fas fa-star" style="font-size:0.9rem;color:#f59e0b;"></i></div><div class="stat-label">Rata-rata Rating</div></div>
            </div>
            <div class="glass-card">
                <div class="card-header"><span><i class="fas fa-star"></i> Ulasan Masuk dari Pelanggan</span></div>
                <div class="card-body" style="padding:0;">
                    <div class="table-wrap">
                        <table class="table">
                            <thead><tr><th>Pelanggan</th><th>Pesanan</th><th>Layanan</th><th>Rating</th><th>Komentar</th><th>Tanggal</th></tr></thead>
                            <tbody id="ulasanTableBody">
                                ${data.ulasan.map(u => `
                                    <tr>
                                        <td><strong>${escapeHtml(u.pelangganNama)}</strong></td>
                                        <td>${escapeHtml(u.pesananKode)}</td>
                                        <td>${escapeHtml(u.layananNama || '-')}</td>
                                        <td>${starsHtml(u.rating)}</td>
                                        <td style="max-width:280px;">${u.komentar ? escapeHtml(u.komentar) : '<span style="color:#64748b;">-</span>'}</td>
                                        <td style="font-size:0.7rem;white-space:nowrap;">${formatDate(u.createdAt)}</td>
                                    </tr>
                                `).join('')}
                                ${data.ulasan.length === 0 ? '<tr><td colspan="6" class="text-center" style="padding:16px;color:#64748b;">Belum ada ulasan masuk dari pelanggan.</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('pageContent').innerHTML = html;
    } catch (e) {
        document.getElementById('pageContent').innerHTML = `<div style="color:red;">Error: ${e.message}</div>`;
    }
}

window.editPelanggan = async function(id) {
    const pelanggan = await LaundryAPI.getPelanggan();
    const p = pelanggan.find(p => p.id === id);
    const html = `<form><div class="form-group"><label class="form-label">Nama</label><input id="nama" class="form-control" value="${p.nama}" required></div><div class="form-group"><label class="form-label">Email</label><input id="email" class="form-control" value="${p.email || ''}" readonly disabled></div><div class="form-group"><label class="form-label">No HP</label><input id="no_hp" class="form-control" value="${p.no_hp}" required></div><div class="form-group"><label class="form-label">Alamat</label><textarea id="alamat" class="form-control" rows="2">${p.alamat || ''}</textarea></div><div class="modal-footer"><button class="btn btn-outline" onclick="closeModal('dynamicModal')">Batal</button><button class="btn btn-primary" onclick="updatePelanggan(${id})">Update</button></div></form>`;
    openModal(html, 'Edit Pelanggan');
    
    window.updatePelanggan = async function(pelId) {
        const data = { nama: document.getElementById('nama').value, no_hp: document.getElementById('no_hp').value, alamat: document.getElementById('alamat').value };
        try {
            await LaundryAPI.updatePelanggan(pelId, data);
            closeModal('dynamicModal');
            showToast('success', 'Pelanggan diupdate');
            loadPage('pelanggan');
        } catch(e) { showToast('error', e.message); }
    };
};

window.hapusPelanggan = async function(id) {
    if (confirm('Yakin hapus pelanggan ini?')) {
        try {
            await LaundryAPI.deletePelanggan(id);
            showToast('success', 'Pelanggan dihapus');
            loadPage('pelanggan');
        } catch(e) { showToast('error', e.message); }
    }
};

// ============ MANAJEMEN LAYANAN ============
async function loadLayanan() {
    try {
        const layanan = await LaundryAPI.getLayanan();
        currentPageData.layanan = layanan;
        const html = `
            <div style="margin-bottom:1rem;"><button class="btn btn-primary" onclick="showTambahLayanan()"><i class="fas fa-plus"></i> Tambah Layanan</button></div>
            <div class="glass-card"><div class="card-header"><span><i class="fas fa-tags"></i> Daftar Layanan</span></div>
            <div class="card-body" style="padding:0;"><div class="table-wrap"><table class="table"><thead><tr><th>Nama</th><th>Harga/kg</th><th>Estimasi</th><th>Deskripsi</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${layanan.map(l => renderLayananRow(l)).join('')}</tbody></table></div></div></div>
        `;
        document.getElementById('pageContent').innerHTML = html;
    } catch(e) { document.getElementById('pageContent').innerHTML = `<div style="color:red;">Error: ${e.message}</div>`; }
}

function renderLayananRow(l) {
    return `<tr>
        <td><strong>${l.nama}</strong></td>
        <td>${formatRupiah(l.harga)}</td>
        <td>${l.estimasi}</td>
        <td>${l.deskripsi || '-'}</td>
        <td>${l.status === 'active' ? '<span class="badge badge-success">Aktif</span>' : '<span class="badge badge-danger">Nonaktif</span>'}</td>
        <td class="action-buttons"><button class="btn btn-sm btn-primary" onclick="editLayanan(${l.id})"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger" onclick="hapusLayanan(${l.id})"><i class="fas fa-trash"></i></button></td>
    </tr>`;
}

window.showTambahLayanan = function() {
    const html = `<form><div class="form-group"><label class="form-label">Nama Layanan</label><input id="nama" class="form-control" required></div><div class="form-group"><label class="form-label">Harga/kg</label><input id="harga" type="number" class="form-control" required></div><div class="form-group"><label class="form-label">Estimasi</label><input id="estimasi" class="form-control" placeholder="1x24 jam" required></div><div class="form-group"><label class="form-label">Deskripsi</label><textarea id="deskripsi" class="form-control" rows="2"></textarea></div><div class="modal-footer"><button class="btn btn-outline" onclick="closeModal('dynamicModal')">Batal</button><button class="btn btn-primary" onclick="simpanLayanan()">Simpan</button></div></form>`;
    openModal(html, 'Tambah Layanan');
    
    window.simpanLayanan = async function() {
        const data = { nama: document.getElementById('nama').value, harga: parseInt(document.getElementById('harga').value), estimasi: document.getElementById('estimasi').value, deskripsi: document.getElementById('deskripsi').value };
        try {
            await LaundryAPI.addLayanan(data);
            closeModal('dynamicModal');
            showToast('success', 'Layanan ditambahkan');
            loadPage('layanan');
        } catch(e) { showToast('error', e.message); }
    };
};

window.editLayanan = async function(id) {
    const layanan = await LaundryAPI.getLayanan();
    const l = layanan.find(l => l.id === id);
    const html = `<form><div class="form-group"><label class="form-label">Nama Layanan</label><input id="nama" class="form-control" value="${l.nama}" required></div><div class="form-group"><label class="form-label">Harga/kg</label><input id="harga" type="number" class="form-control" value="${l.harga}" required></div><div class="form-group"><label class="form-label">Estimasi</label><input id="estimasi" class="form-control" value="${l.estimasi}" required></div><div class="form-group"><label class="form-label">Deskripsi</label><textarea id="deskripsi" class="form-control" rows="2">${l.deskripsi || ''}</textarea></div><div class="modal-footer"><button class="btn btn-outline" onclick="closeModal('dynamicModal')">Batal</button><button class="btn btn-primary" onclick="updateLayanan(${id})">Update</button></div></form>`;
    openModal(html, 'Edit Layanan');
    
    window.updateLayanan = async function(layId) {
        const data = { nama: document.getElementById('nama').value, harga: parseInt(document.getElementById('harga').value), estimasi: document.getElementById('estimasi').value, deskripsi: document.getElementById('deskripsi').value };
        try {
            await LaundryAPI.updateLayanan(layId, data);
            closeModal('dynamicModal');
            showToast('success', 'Layanan diupdate');
            loadPage('layanan');
        } catch(e) { showToast('error', e.message); }
    };
};

window.hapusLayanan = async function(id) {
    if (confirm('Yakin hapus layanan ini?')) {
        try {
            await LaundryAPI.deleteLayanan(id);
            showToast('success', 'Layanan dihapus');
            loadPage('layanan');
        } catch(e) { showToast('error', e.message); }
    }
};

// ============ LAPORAN ============
async function loadLaporan() {
    try {
        // ✅ DATA DARI API
        let stats = await LaundryAPI.getStatistik();
        let pesanan = await LaundryAPI.getPesanan();
        let layananList = await LaundryAPI.getLayanan();
        
        console.log('📊 STATS FROM AIVEN:', stats);
        
        // ✅ HITUNG STATUS DARI PESANAN
        const pesananMenunggu = pesanan.filter(p => p.status === 'menunggu').length;
        const pesananProses = pesanan.filter(p => p.status === 'proses').length;
        const pesananSelesai = pesanan.filter(p => p.status === 'selesai').length;
        const pesananDiambil = pesanan.filter(p => p.status === 'diambil').length;
        
        console.log('📊 STATUS:', { pesananMenunggu, pesananProses, pesananSelesai, pesananDiambil });
        
        // Hitung layanan terpopuler
        const layananCount = {};
        pesanan.forEach(p => {
            const nama = p.layananNama || 'Unknown';
            layananCount[nama] = (layananCount[nama] || 0) + 1;
        });
        const topLayanan = Object.entries(layananCount).sort((a,b) => b[1] - a[1]).slice(0, 5);
        const totalPesanan = pesanan.length || 1;
        const totalPendapatan = pesanan.reduce((sum, p) => sum + (p.totalBayar || 0), 0);
        
        // ✅ BUILD HTML
        const html = `
            <!-- FILTER -->
            <div class="laporan-filters" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;background:rgba(15,23,42,0.4);padding:14px 16px;border-radius:12px;border:1px solid rgba(59,130,246,0.08);">
                <div style="display:flex;gap:8px;flex-wrap:wrap;flex:1;">
                    <input type="date" id="filterStart" class="form-control" style="flex:1;min-width:130px;padding:8px 12px;font-size:0.8rem;" value="${new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0]}">
                    <span style="color:#64748b;display:flex;align-items:center;">s.d.</span>
                    <input type="date" id="filterEnd" class="form-control" style="flex:1;min-width:130px;padding:8px 12px;font-size:0.8rem;" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <select id="filterLayanan" class="form-control" style="flex:1;min-width:120px;padding:8px 12px;font-size:0.8rem;">
                    <option value="">📋 Semua Layanan</option>
                    ${layananList.map(l => `<option value="${l.id}">${l.nama}</option>`).join('')}
                </select>
                <select id="filterStatus" class="form-control" style="flex:1;min-width:120px;padding:8px 12px;font-size:0.8rem;">
                    <option value="">📊 Semua Status</option>
                    <option value="menunggu">⏳ Menunggu</option>
                    <option value="proses">🔄 Proses</option>
                    <option value="selesai">✅ Selesai</option>
                    <option value="diambil">📦 Diambil</option>
                </select>
                <button class="btn btn-primary" onclick="applyLaporanFilters()" style="font-size:0.8rem;padding:8px 16px;">
                    <i class="fas fa-search"></i> Terapkan
                </button>
                <button class="btn btn-outline" onclick="resetLaporanFilters()" style="font-size:0.8rem;padding:8px 16px;">
                    <i class="fas fa-undo"></i> Reset
                </button>
            </div>
            
            <!-- RINGKASAN -->
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;">
                <div class="stat-card" style="padding:12px 10px;">
                    <div class="stat-value" style="font-size:20px;">${pesanan.length}</div>
                    <div class="stat-label" style="font-size:10px;">📦 Total Pesanan</div>
                </div>
                <div class="stat-card" style="padding:12px 10px;">
                    <div class="stat-value" style="font-size:20px;">${formatRupiah(totalPendapatan)}</div>
                    <div class="stat-label" style="font-size:10px;">💰 Total Pendapatan</div>
                </div>
                <div class="stat-card" style="padding:12px 10px;">
                    <div class="stat-value" style="font-size:20px;">${stats.totalPelanggan || 0}</div>
                    <div class="stat-label" style="font-size:10px;">👤 Total Pelanggan</div>
                </div>
                <div class="stat-card" style="padding:12px 10px;">
                    <div class="stat-value" style="font-size:20px;">${stats.totalLayanan || 0}</div>
                    <div class="stat-label" style="font-size:10px;">🏷️ Total Layanan</div>
                </div>
            </div>
            
            <!-- CHART + LAYANAN TERPOPULER -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                <div class="glass-card">
                    <div class="card-header" style="font-size:0.85rem;padding:10px 14px;">
                        <span><i class="fas fa-chart-pie"></i> Status Pesanan</span>
                        <span style="font-size:0.6rem;color:#64748b;">${pesanan.length} total</span>
                    </div>
                    <div class="card-body" style="padding:10px 14px;">
                        <div class="chart-container" style="position:relative;width:100%;height:200px;">
                            <canvas id="laporanChart"></canvas>
                        </div>
                    </div>
                </div>
                
                <div class="glass-card">
                    <div class="card-header" style="font-size:0.85rem;padding:10px 14px;">
                        <span><i class="fas fa-trophy"></i> Layanan Terpopuler</span>
                        <span style="font-size:0.6rem;color:#64748b;">Top 5</span>
                    </div>
                    <div class="card-body" style="padding:10px 14px;">
                        ${topLayanan.length > 0 ? topLayanan.map(([nama, count]) => `
                            <div style="margin-bottom:10px;">
                                <div style="display:flex;justify-content:space-between;font-size:0.8rem;color:#cbd5e1;">
                                    <span>${nama}</span>
                                    <span style="color:#60a5fa;font-weight:600;">${count} pesanan</span>
                                </div>
                                <div style="height:5px;background:#1e293b;border-radius:3px;margin-top:3px;overflow:hidden;">
                                    <div style="width:${Math.round((count/totalPesanan)*100)}%;height:100%;background:linear-gradient(90deg,#3b82f6,#06b6d4);border-radius:3px;transition:width 0.6s ease;"></div>
                                </div>
                            </div>
                        `).join('') : '<p style="color:#64748b;font-size:0.8rem;text-align:center;padding:16px;">Belum ada data layanan</p>'}
                    </div>
                </div>
            </div>
            
            <!-- TABEL DETAIL -->
            <div class="glass-card">
                <div class="card-header" style="font-size:0.85rem;padding:10px 14px;">
                    <span><i class="fas fa-table"></i> Detail Data Pesanan</span>
                    <span style="font-size:0.6rem;color:#64748b;">${pesanan.length} data</span>
                </div>
                <div class="card-body" style="padding:0;">
                    <div class="table-wrap">
                        <table id="laporanTable">
                            <thead>
                                <tr>
                                    <th style="font-size:0.6rem;padding:8px 10px;">Kode</th>
                                    <th style="font-size:0.6rem;padding:8px 10px;">Pelanggan</th>
                                    <th style="font-size:0.6rem;padding:8px 10px;">Layanan</th>
                                    <th style="font-size:0.6rem;padding:8px 10px;">Berat</th>
                                    <th style="font-size:0.6rem;padding:8px 10px;">Total</th>
                                    <th style="font-size:0.6rem;padding:8px 10px;">Status</th>
                                    <th style="font-size:0.6rem;padding:8px 10px;">Tanggal</th>
                                </tr>
                            </thead>
                            <tbody id="laporanTableBody">
                                ${pesanan.map(p => `
                                    <tr>
                                        <td style="font-size:0.75rem;padding:8px 10px;"><strong>${p.kode}</strong></td>
                                        <td style="font-size:0.75rem;padding:8px 10px;">${p.pelangganNama}</td>
                                        <td style="font-size:0.75rem;padding:8px 10px;">${p.layananNama}</td>
                                        <td style="font-size:0.75rem;padding:8px 10px;">${p.berat || 0} kg</td>
                                        <td style="font-size:0.75rem;padding:8px 10px;font-weight:600;color:#10b981;">${formatRupiah(p.totalBayar || 0)}</td>
                                        <td style="font-size:0.75rem;padding:8px 10px;">${getStatusBadge(p.status)}</td>
                                        <td style="font-size:0.65rem;padding:8px 10px;color:#94a3b8;">${formatDate(p.tanggalPesan)}</td>
                                    </tr>
                                `).join('')}
                                ${pesanan.length === 0 ? '<tr><td colspan="7" style="text-align:center;padding:20px;color:#64748b;">Tidak ada data</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <!-- EXPORT -->
            <div class="glass-card">
                <div class="card-header" style="font-size:0.85rem;padding:10px 14px;">
                    <span><i class="fas fa-download"></i> Export Laporan</span>
                </div>
                <div class="card-body" style="padding:10px 14px;">
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <button class="btn btn-primary" onclick="exportLaporanToExcel()" style="flex:1;min-width:100px;font-size:0.75rem;padding:8px 14px;">
                            <i class="fas fa-file-excel"></i> Export Excel
                        </button>
                        <button class="btn btn-primary" onclick="exportLaporanToPDF()" style="flex:1;min-width:100px;font-size:0.75rem;padding:8px 14px;">
                            <i class="fas fa-file-pdf"></i> Export PDF
                        </button>
                        <button class="btn btn-outline" onclick="window.print()" style="flex:1;min-width:100px;font-size:0.75rem;padding:8px 14px;">
                            <i class="fas fa-print"></i> Print
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('pageContent').innerHTML = html;
        
        // ===== RENDER CHART =====
        if (typeof Chart !== 'undefined') {
            setTimeout(() => {
                const canvas = document.getElementById('laporanChart');
                if (canvas) {
                    destroyChartIfExists('laporanChart');
                    
                    const isMobile = window.innerWidth <= 768;
                    
                    new Chart(canvas, {
                        type: 'doughnut',
                        data: {
                            labels: ['Menunggu', 'Proses', 'Selesai', 'Diambil'],
                            datasets: [{
                                data: [
                                    pesananMenunggu,
                                    pesananProses,
                                    pesananSelesai,
                                    pesananDiambil
                                ],
                                backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#06b6d4'],
                                borderColor: ['#f59e0b', '#3b82f6', '#10b981', '#06b6d4'],
                                borderWidth: 2,
                                hoverOffset: 8
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    position: 'bottom',
                                    labels: {
                                        color: '#94a3b8',
                                        font: { 
                                            size: isMobile ? 9 : 11,
                                            family: 'Inter, sans-serif' 
                                        },
                                        padding: isMobile ? 6 : 10,
                                        boxWidth: isMobile ? 10 : 14,
                                        boxHeight: isMobile ? 10 : 14,
                                        usePointStyle: true,
                                        pointStyle: 'circle'
                                    }
                                }
                            },
                            cutout: isMobile ? '60%' : '65%'
                        }
                    });
                    
                    console.log('✅ Chart Laporan selesai');
                }
            }, 300);
        }
        
        // Simpan data untuk filter
        window._laporanData = {
            stats: stats,
            pesanan: pesanan,
            layananList: layananList,
            topLayanan: topLayanan,
            totalPesanan: totalPesanan,
            pesananMenunggu: pesananMenunggu,
            pesananProses: pesananProses,
            pesananSelesai: pesananSelesai,
            pesananDiambil: pesananDiambil
        };
        
    } catch(e) {
        document.getElementById('pageContent').innerHTML = `
            <div style="color:#ef4444;padding:20px;font-size:0.9rem;text-align:center;">
                <i class="fas fa-exclamation-circle" style="font-size:24px;display:block;margin-bottom:10px;"></i>
                Error: ${e.message}
            </div>
        `;
        console.error('❌ Error loadLaporan:', e);
    }
}

// ============================================================
// FILTER LAPORAN
// ============================================================
window.applyLaporanFilters = function() {
    const startDate = document.getElementById('filterStart')?.value;
    const endDate = document.getElementById('filterEnd')?.value;
    const layananFilter = document.getElementById('filterLayanan')?.value;
    const statusFilter = document.getElementById('filterStatus')?.value;
    
    const data = window._laporanData;
    if (!data) return;
    
    let filtered = data.pesanan;
    
    if (startDate && endDate) {
        filtered = filtered.filter(p => {
            const tgl = p.tanggalPesan?.split('T')[0] || '';
            return tgl >= startDate && tgl <= endDate;
        });
    }
    
    if (layananFilter) {
        filtered = filtered.filter(p => p.layananId == layananFilter);
    }
    
    if (statusFilter) {
        filtered = filtered.filter(p => p.status === statusFilter);
    }
    
    const tbody = document.getElementById('laporanTableBody');
    if (tbody) {
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#64748b;">Tidak ada data yang sesuai filter</td></tr>`;
        } else {
            tbody.innerHTML = filtered.map(p => `
                <tr>
                    <td style="font-size:0.75rem;padding:8px 10px;"><strong>${p.kode}</strong></td>
                    <td style="font-size:0.75rem;padding:8px 10px;">${p.pelangganNama}</td>
                    <td style="font-size:0.75rem;padding:8px 10px;">${p.layananNama}</td>
                    <td style="font-size:0.75rem;padding:8px 10px;">${p.berat || 0} kg</td>
                    <td style="font-size:0.75rem;padding:8px 10px;font-weight:600;color:#10b981;">${formatRupiah(p.totalBayar || 0)}</td>
                    <td style="font-size:0.75rem;padding:8px 10px;">${getStatusBadge(p.status)}</td>
                    <td style="font-size:0.65rem;padding:8px 10px;color:#94a3b8;">${formatDate(p.tanggalPesan)}</td>
                </tr>
            `).join('');
        }
    }
    
    showToast('success', `✅ ${filtered.length} data ditemukan`);
};

window.resetLaporanFilters = function() {
    const today = new Date();
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    
    document.getElementById('filterStart').value = monthAgo.toISOString().split('T')[0];
    document.getElementById('filterEnd').value = today.toISOString().split('T')[0];
    document.getElementById('filterLayanan').value = '';
    document.getElementById('filterStatus').value = '';
    
    applyLaporanFilters();
    showToast('info', '🔄 Filter direset');
};

// ============================================================
// EXPORT LAPORAN - EXCEL
// ============================================================
window.exportLaporanToExcel = function() {
    const table = document.getElementById('laporanTable');
    if (!table) {
        showToast('warning', 'Tidak ada data untuk diexport');
        return;
    }
    
    const rows = table.querySelectorAll('tbody tr');
    if (rows.length === 0) {
        showToast('warning', 'Tidak ada data untuk diexport');
        return;
    }
    
    const data = [];
    const headers = ['Kode Pesanan', 'Pelanggan', 'Layanan', 'Berat (kg)', 'Total Bayar', 'Status', 'Tanggal'];
    data.push(headers);
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 7) {
            const rowData = [
                cells[0]?.textContent?.trim() || '',
                cells[1]?.textContent?.trim() || '',
                cells[2]?.textContent?.trim() || '',
                cells[3]?.textContent?.trim() || '',
                cells[4]?.textContent?.trim() || '',
                cells[5]?.textContent?.trim() || '',
                cells[6]?.textContent?.trim() || ''
            ];
            data.push(rowData);
        }
    });
    
    let csvContent = data.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `laporan_laundry_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('success', '✅ Laporan berhasil diexport!');
};

window.exportLaporanToPDF = function() {
    showToast('info', '📄 Fitur PDF akan segera hadir');
};

// ============ MANAJEMEN USER ============
// ============ MANAJEMEN USER ============
async function loadUsers() {
    try {
        const users = await LaundryAPI.getUsers();
        currentPageData.users = users;
        const html = `
            <div style="margin-bottom:1rem;">
                <button class="btn btn-primary" onclick="showTambahUser()">
                    <i class="fas fa-plus"></i> Tambah User
                </button>
            </div>
            <div class="glass-card">
                <div class="card-header">
                    <span><i class="fas fa-user-cog"></i> Daftar User</span>
                </div>
                <div class="card-body" style="padding:0;">
                    <div class="table-wrap">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Nama</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>No HP</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${users.map(u => `
                                    <tr>
                                        <td><strong>${u.nama}</strong></td>
                                        <td>${u.email}</td>
                                        <td>${getRoleBadge(u.role)}</td>
                                        <td>${u.no_hp || '-'}</td>
                                        <td class="action-buttons">
                                            <button class="btn btn-sm btn-primary" onclick="editUser(${u.id})">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="btn btn-sm btn-danger" onclick="hapusUser(${u.id})">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('pageContent').innerHTML = html;
    } catch(e) {
        document.getElementById('pageContent').innerHTML = `<div style="color:red;">Error: ${e.message}</div>`;
    }
}

window.showTambahUser = function() {
    const html = `<form><div class="form-group"><label class="form-label">Nama</label><input id="nama" class="form-control" required></div><div class="form-group"><label class="form-label">Email</label><input id="email" type="email" class="form-control" required></div><div class="form-group"><label class="form-label">Password</label><input id="password" type="password" class="form-control" required></div><div class="form-group"><label class="form-label">Role</label><select id="role" class="form-control"><option value="pelanggan">Pelanggan</option><option value="karyawan">Karyawan</option><option value="admin">Admin</option></select></div><div class="form-group"><label class="form-label">No HP</label><input id="no_hp" class="form-control"></div><div class="modal-footer"><button class="btn btn-outline" onclick="closeModal('dynamicModal')">Batal</button><button class="btn btn-primary" onclick="simpanUser()">Simpan</button></div></form>`;
    openModal(html, 'Tambah User');
    
    window.simpanUser = async function() {
    const nama = document.getElementById('nama').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;
    const no_hp = document.getElementById('no_hp').value.trim();
    
    // ✅ VALIDASI
    if (!nama) { showToast('error', 'Nama wajib diisi'); return; }
    if (!email) { showToast('error', 'Email wajib diisi'); return; }
    if (!password || password.length < 8) { 
        showToast('error', 'Password minimal 8 karakter'); 
        return; 
    }
    
    // ✅ TAMPILKAN LOADING
    showToast('info', '⏳ Menambahkan user...');
    
    try {
        // ✅ PAKAI LaundryAPI.register (BUKAN fetch langsung!)
        const result = await LaundryAPI.register({
            nama: nama,
            email: email,
            password: password,
            role: role,
            no_hp: no_hp || '',
            alamat: ''
        });
        
        console.log('✅ Hasil registrasi:', result);
        
        if (result && result.success) {
            closeModal('dynamicModal');
            showToast('success', `✅ User "${nama}" berhasil ditambahkan!`);
            await loadPage('users'); // Refresh halaman
        } else {
            showToast('error', result?.message || 'Gagal menambahkan user');
        }
        
    } catch (error) {
        console.error('❌ Error simpanUser:', error);
        showToast('error', '❌ Gagal menambahkan user: ' + (error.message || 'Unknown error'));
    }
};
};

window.hapusUser = async function(id) {
    if (confirm('Yakin hapus user ini?')) {
        try {
            await LaundryAPI.deleteUser(id);
            showToast('success', 'User dihapus');
            loadPage('users');
        } catch(e) { showToast('error', e.message); }
    }
};

// ============ EDIT USER ============
window.editUser = async function(id) {
    try {
        // Ambil data user
        const users = await LaundryAPI.getUsers();
        const user = users.find(u => u.id === id);
        
        if (!user) {
            showToast('error', 'User tidak ditemukan');
            return;
        }
        
        // Buat form edit
        const html = `
            <form id="editUserForm">
                <div class="form-group">
                    <label class="form-label">Nama</label>
                    <input id="editNama" class="form-control" value="${user.nama}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input id="editEmail" class="form-control" value="${user.email}" disabled readonly>
                    <small style="color:#64748b;">Email tidak bisa diubah</small>
                </div>
                <div class="form-group">
                    <label class="form-label">Role</label>
                    <select id="editRole" class="form-control">
                        <option value="pelanggan" ${user.role === 'pelanggan' ? 'selected' : ''}>👤 Pelanggan</option>
                        <option value="karyawan" ${user.role === 'karyawan' ? 'selected' : ''}>🔧 Karyawan</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>👑 Admin</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">No HP</label>
                    <input id="editNoHp" class="form-control" value="${user.no_hp || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Alamat</label>
                    <textarea id="editAlamat" class="form-control" rows="2">${user.alamat || ''}</textarea>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="closeModal('dynamicModal')">Batal</button>
                    <button class="btn btn-primary" onclick="updateUser(${id})">Update</button>
                </div>
            </form>
        `;
        
        openModal(html, 'Edit User');
        
    } catch (error) {
        console.error('❌ Error editUser:', error);
        showToast('error', 'Gagal memuat data user');
    }
};

// ============ UPDATE USER ============
window.updateUser = async function(id) {
    const nama = document.getElementById('editNama').value.trim();
    const role = document.getElementById('editRole').value;
    const no_hp = document.getElementById('editNoHp').value.trim();
    const alamat = document.getElementById('editAlamat').value.trim();
    
    if (!nama) {
        showToast('error', 'Nama wajib diisi');
        return;
    }
    
    showToast('info', '⏳ Mengupdate user...');
    
    try {
        const result = await LaundryAPI.updateUser(id, {
            nama: nama,
            role: role,
            no_hp: no_hp || '',
            alamat: alamat || ''
        });
        
        console.log('✅ Hasil update:', result);
        
        if (result && result.success) {
            closeModal('dynamicModal');
            showToast('success', `✅ User berhasil diupdate!`);
            await loadPage('users');
        } else {
            showToast('error', result?.message || 'Gagal mengupdate user');
        }
        
    } catch (error) {
        console.error('❌ Error updateUser:', error);
        showToast('error', '❌ Gagal mengupdate user: ' + (error.message || 'Unknown error'));
    }
};

// ============ SETTINGS / PENGATURAN ============
async function loadSettings() {
    let notificationSettings = { emailNotifications: true, smsNotifications: false, whatsappNotifications: true };
    try {
        notificationSettings = await LaundryAPI.getNotificationSettings();
    } catch(e) {}
    
    const html = `
        <div class="settings-section">
            <div class="settings-card">
                <div class="settings-header"><i class="fas fa-user-circle"></i> Profil Saya</div>
                <div class="settings-body">
                    <div class="profile-image">${currentUser.nama.charAt(0).toUpperCase()}</div>
                    <div class="form-group">
                        <label class="form-label">Nama Lengkap</label>
                        <input type="text" id="profileNama" class="form-control" value="${currentUser.nama}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" id="profileEmail" class="form-control" value="${currentUser.email}" readonly disabled>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nomor HP</label>
                        <input type="tel" id="profileNoHp" class="form-control" value="${currentUser.no_hp || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Alamat</label>
                        <textarea id="profileAlamat" class="form-control" rows="3">${currentUser.alamat || ''}</textarea>
                    </div>
                    <button class="btn btn-primary" onclick="updateProfileSettings()"><i class="fas fa-save"></i> Simpan Profil</button>
                </div>
            </div>
            
            <div class="settings-card">
                <div class="settings-header"><i class="fas fa-lock"></i> Ubah Password</div>
                <div class="settings-body">
                    <div class="form-group">
                        <label class="form-label">Password Saat Ini</label>
                        <input type="password" id="currentPassword" class="form-control" placeholder="Masukkan password saat ini">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password Baru</label>
                        <input type="password" id="newPassword" class="form-control" placeholder="Minimal 6 karakter">
                        <div class="password-strength" id="strengthBar"></div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Konfirmasi Password Baru</label>
                        <input type="password" id="confirmNewPassword" class="form-control" placeholder="Ulangi password baru">
                    </div>
                    <button class="btn btn-primary" onclick="changePasswordSettings()"><i class="fas fa-key"></i> Ubah Password</button>
                </div>
            </div>
            
            <div class="settings-card">
                <div class="settings-header"><i class="fas fa-bell"></i> Notifikasi</div>
                <div class="settings-body">
                    <div class="form-group">
                        <label class="form-label" style="display: flex; justify-content: space-between; align-items: center;">
                            <span><i class="fas fa-envelope"></i> Notifikasi Email</span>
                            <label class="toggle-switch">
                                <input type="checkbox" id="emailNotif" ${notificationSettings.emailNotifications ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="form-label" style="display: flex; justify-content: space-between; align-items: center;">
                            <span><i class="fab fa-whatsapp"></i> Notifikasi WhatsApp</span>
                            <label class="toggle-switch">
                                <input type="checkbox" id="waNotif" ${notificationSettings.whatsappNotifications ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </label>
                    </div>
                    <button class="btn btn-primary" onclick="saveNotificationSettings()"><i class="fas fa-save"></i> Simpan Pengaturan</button>
                </div>
            </div>
            
            <div class="settings-card">
                <div class="settings-header"><i class="fas fa-trash-alt" style="color: #EF4444;"></i> Hapus Akun</div>
                <div class="settings-body">
                    <p style="color: #94A3B8; margin-bottom: 15px;">Peringatan: Menghapus akun akan menghapus semua data Anda secara permanen.</p>
                    <button class="btn btn-danger" onclick="deleteAccountSettings()"><i class="fas fa-trash"></i> Hapus Akun Saya</button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('pageContent').innerHTML = html;
}

window.updateProfileSettings = async function() {
    const data = {
        nama: document.getElementById('profileNama').value,
        no_hp: document.getElementById('profileNoHp').value,
        alamat: document.getElementById('profileAlamat').value
    };
    try {
        const updatedUser = await LaundryAPI.updateProfile(data);
        currentUser = updatedUser;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        document.getElementById('userName').innerText = currentUser.nama;
        document.getElementById('userAvatar').innerText = currentUser.nama.charAt(0).toUpperCase();
        showToast('success', 'Profil berhasil diperbarui!');
        loadSettings();
    } catch(e) { showToast('error', e.message); }
};

window.changePasswordSettings = async function() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    
    if (!currentPassword) { showToast('error', 'Masukkan password saat ini'); return; }
    if (newPassword !== confirmPassword) { showToast('error', 'Konfirmasi password tidak cocok'); return; }
    if (newPassword.length < 6) { showToast('error', 'Password baru minimal 6 karakter'); return; }
    
    try {
        const result = await LaundryAPI.changePassword(currentPassword, newPassword);
        if (result.success) {
            showToast('success', result.message);
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmNewPassword').value = '';
        } else {
            showToast('error', result.message);
        }
    } catch(e) { showToast('error', e.message); }
};

window.saveNotificationSettings = async function() {
    const settings = {
        emailNotifications: document.getElementById('emailNotif').checked,
        smsNotifications: false,
        whatsappNotifications: document.getElementById('waNotif').checked
    };
    try {
        await LaundryAPI.saveNotificationSettings(settings);
        showToast('success', 'Pengaturan notifikasi disimpan');
    } catch(e) { showToast('error', e.message); }
};

window.deleteAccountSettings = async function() {
    const confirmed = confirm('⚠️ PERINGATAN! Apakah Anda yakin ingin menghapus akun? Semua data Anda akan hilang permanen.\n\nKetik "HAPUS" untuk konfirmasi:');
    if (!confirmed) return;
    
    const confirmation = prompt('Ketik "HAPUS" untuk mengkonfirmasi penghapusan akun:');
    if (confirmation !== 'HAPUS') { showToast('warning', 'Konfirmasi gagal'); return; }
    
    try {
        const result = await LaundryAPI.deleteAccount();
        if (result.success) {
            showToast('success', 'Akun berhasil dihapus. Anda akan logout...');
            setTimeout(() => { localStorage.clear(); window.location.href = '/login.html'; }, 2000);
        } else { showToast('error', result.message); }
    } catch(e) { showToast('error', e.message); }
};

// ============================================================
// PETA & TRACKING LOKASI
// ============================================================

async function loadMapPage() {
    const html = `
        <div class="glass-card">
            <div class="card-header">
                <span><i class="fas fa-map-marker-alt"></i> Peta Lokasi Pelanggan & Outlet</span>
                <div style="display:flex;gap:6px;">
                    <button class="btn btn-sm btn-outline" onclick="refreshTracking()">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="location-picker" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
                    <input type="text" id="addressSearch" placeholder="Cari alamat..." style="flex:1;min-width:160px;padding:8px 12px;border-radius:8px;background:rgba(255,255,255,0.06);border:1px solid rgba(59,130,246,0.15);color:white;font-size:0.85rem;">
                    <button class="btn btn-sm btn-primary" onclick="searchAddress()"><i class="fas fa-search"></i> Cari</button>
                    <button class="btn btn-sm btn-success" onclick="getMyLocation()"><i class="fas fa-location-dot"></i> Lokasi Saya</button>
                </div>
                <div id="map" class="map-container" style="width:100%;height:400px;border-radius:12px;overflow:hidden;margin-bottom:12px;"></div>
                <div id="locationInfo" style="padding:10px 14px;background:rgba(59,130,246,0.04);border-radius:8px;font-size:0.8rem;color:#94a3b8;">
                    <i class="fas fa-info-circle"></i> Klik pada peta untuk menentukan titik lokasi
                </div>
            </div>
        </div>
        <div class="glass-card">
            <div class="card-header">
                <span><i class="fas fa-truck"></i> Tracking Pesanan Aktif</span>
                <span style="font-size:0.7rem;color:#64748b;">Auto-refresh 30 detik</span>
            </div>
            <div class="card-body" id="trackingList">
                <div class="loading"><div class="spinner"></div>Memuat data pesanan...</div>
            </div>
        </div>
    `;
    
    document.getElementById('pageContent').innerHTML = html;
    
    setTimeout(() => {
        initMap();
        loadTrackingOrders();
        startAutoRefresh();
    }, 500);
}

function initMap() {
    if (typeof L === 'undefined') {
        console.error('❌ Leaflet tidak tersedia!');
        document.getElementById('locationInfo').innerHTML = 
            '<p style="color:#ef4444;">❌ Library peta tidak ditemukan. Refresh halaman.</p>';
        return;
    }
    
    if (map) {
        map.remove();
        map = null;
    }
    
    const defaultLocation = [-6.2088, 106.8456];
    
    try {
        map = L.map('map').setView(defaultLocation, 13);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CartoDB',
            subdomains: 'abcd',
            maxZoom: 19,
            minZoom: 3
        }).addTo(map);
        
        const outletLocation = [-6.2088, 106.8456];
        L.marker(outletLocation, {
            icon: L.divIcon({
                className: 'custom-div-icon',
                html: '<div style="background:#3B82F6;padding:4px 12px;border-radius:16px;color:white;font-weight:bold;font-size:0.75rem;white-space:nowrap;"><i class="fas fa-store"></i> Laundry int</div>',
                iconSize: [100, 26],
                popupAnchor: [0, -10]
            })
        }).addTo(map).bindPopup('<b>🏪 Laundry int</b><br>Jl. Laundry No.123, Jakarta<br>📍 Outlet Pusat').openPopup();
        
        map.on('click', async (e) => {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                const data = await response.json();
                const address = data.display_name || `${lat}, ${lng}`;
                document.getElementById('locationInfo').innerHTML = `
                    <p style="margin-bottom:4px;"><i class="fas fa-map-pin"></i> <strong>Lokasi dipilih:</strong></p>
                    <p style="font-size:0.7rem;color:#94a3b8;">Lat: ${lat.toFixed(6)} | Lng: ${lng.toFixed(6)}</p>
                    <p style="font-size:0.7rem;color:#64748b;">${address.substring(0, 150)}</p>
                    <button class="btn btn-sm btn-success" style="margin-top:6px;" onclick="copyLocationToClipboard('${lat}', '${lng}', '${address.replace(/'/g, "\\'")}')"><i class="fas fa-copy"></i> Salin Lokasi</button>
                `;
            } catch(e) {
                document.getElementById('locationInfo').innerHTML = `
                    <p>📍 Lat: ${lat.toFixed(6)} | Lng: ${lng.toFixed(6)}</p>
                    <button class="btn btn-sm btn-success" style="margin-top:6px;" onclick="copyLocationToClipboard('${lat}', '${lng}', '')">Salin Koordinat</button>
                `;
            }
        });
        
        setTimeout(() => { if (map) map.invalidateSize(); }, 500);
        
        console.log('✅ Peta berhasil diinisialisasi');
        
    } catch (error) {
        console.error('❌ Error init map:', error);
        document.getElementById('locationInfo').innerHTML = 
            '<p style="color:#ef4444;">❌ Gagal memuat peta: ' + error.message + '</p>';
    }
}

// ============================================================
// LOAD TRACKING ORDERS
// ============================================================
async function loadTrackingOrders() {
    try {
        const pesanan = await LaundryAPI.getPesanan();
        const activeOrders = pesanan.filter(p => p.status !== 'diambil');
        activeOrders.sort((a, b) => new Date(b.tanggalPesan) - new Date(a.tanggalPesan));
        
        if (activeOrders.length === 0) {
            document.getElementById('trackingList').innerHTML = `
                <div class="text-center" style="padding:20px;color:#64748b;">
                    <i class="fas fa-check-circle" style="font-size:32px;display:block;margin-bottom:10px;"></i>
                    <p>Tidak ada pesanan aktif saat ini</p>
                </div>
            `;
            return;
        }
        
        let trackingHtml = `
            <div style="max-height:450px;overflow-y:auto;">
                <div style="display:grid;gap:10px;">
        `;
        
        activeOrders.forEach((o) => {
            let lat = null;
            let lng = null;
            let cleanAddress = o.pelangganAlamat || 'Alamat belum diisi';
            
            if (cleanAddress) {
                const latMatch = cleanAddress.match(/Lat:\s*([-\d.]+)/);
                const lngMatch = cleanAddress.match(/Lng:\s*([-\d.]+)/);
                if (latMatch && lngMatch) {
                    lat = parseFloat(latMatch[1]);
                    lng = parseFloat(lngMatch[1]);
                    cleanAddress = cleanAddress.replace(/\(Lat:.*?\)/, '').trim();
                }
            }
            
            const statusColor = {
                'menunggu': '#f59e0b',
                'proses': '#3b82f6',
                'selesai': '#10b981'
            };
            
            const statusLabel = {
                'menunggu': '⏳ Menunggu Jemput',
                'proses': '🔄 Sedang Diproses',
                'selesai': '✅ Siap Diambil'
            };
            
            trackingHtml += `
                <div style="background:rgba(15,23,42,0.5);border-radius:12px;padding:14px 16px;border:1px solid rgba(59,130,246,0.08);">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px;">
                        <strong style="font-size:0.9rem;color:white;">
                            <i class="fas fa-receipt" style="color:#3b82f6;"></i> ${o.kode}
                        </strong>
                        <span style="font-size:0.7rem;padding:2px 10px;border-radius:20px;background:${statusColor[o.status] || '#64748b'}33;color:${statusColor[o.status] || '#94a3b8'};">
                            ${statusLabel[o.status] || o.status}
                        </span>
                    </div>
                    
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:0.8rem;color:#94a3b8;margin-bottom:6px;">
                        <div><i class="fas fa-user" style="width:16px;"></i> ${o.pelangganNama}</div>
                        <div><i class="fas fa-phone" style="width:16px;"></i> ${o.pelangganHp || '-'}</div>
                        <div style="grid-column:1/-1;">
                            <i class="fas fa-map-marker-alt" style="width:16px;"></i> 
                            ${cleanAddress.length > 60 ? cleanAddress.substring(0, 60) + '...' : cleanAddress}
                        </div>
                        ${o.berat ? `<div><i class="fas fa-weight-hanging"></i> ${o.berat} kg</div>` : ''}
                        ${o.totalBayar ? `<div><i class="fas fa-money-bill-wave"></i> ${formatRupiah(o.totalBayar)}</div>` : ''}
                    </div>
                    
                    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">
                        <button class="btn btn-sm btn-primary map-btn"
                            data-alamat="${(o.pelangganAlamat || '').replace(/"/g, '&quot;')}"
                            data-nama="${(o.pelangganNama || '').replace(/"/g, '&quot;')}"
                            data-kode="${o.kode}">
                            <i class="fas fa-map-pin"></i> Lihat di Peta
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="showOrderDetail('${o.kode}')">
                            <i class="fas fa-info-circle"></i> Detail
                        </button>
                        ${renderKurirButtonAdmin(o)}
                    </div>
                </div>
            `;
        });
        
        trackingHtml += `
                </div>
            </div>
            <div style="text-align:center;margin-top:10px;font-size:0.7rem;color:#64748b;">
                ${activeOrders.length} pesanan aktif • <span id="lastUpdate">${new Date().toLocaleTimeString('id-ID')}</span>
                <button class="btn btn-sm btn-outline" onclick="refreshTracking()" style="margin-left:8px;padding:2px 10px;">
                    <i class="fas fa-sync-alt"></i>
                </button>
            </div>
        `;
        
        document.getElementById('trackingList').innerHTML = trackingHtml;
        window._trackingOrders = activeOrders;
        
        document.getElementById('trackingList').addEventListener('click', function(e) {
            const btn = e.target.closest('.map-btn');
            if (btn) {
                const alamat = btn.getAttribute('data-alamat') || '';
                const nama = btn.getAttribute('data-nama') || '';
                const kode = btn.getAttribute('data-kode') || '';
                const existingModal = document.getElementById('orderDetailModal');
                if (existingModal) existingModal.remove();
                showLocationOnMap(alamat, nama, kode);
            }
        });
        
    } catch(e) {
        document.getElementById('trackingList').innerHTML = `
            <div style="text-align:center;padding:20px;color:#ef4444;">
                <i class="fas fa-exclamation-circle" style="font-size:24px;display:block;margin-bottom:8px;"></i>
                <p style="font-size:0.85rem;">${e.message}</p>
                <button class="btn btn-sm btn-primary" onclick="refreshTracking()" style="margin-top:8px;">
                    <i class="fas fa-sync-alt"></i> Coba Lagi
                </button>
            </div>
        `;
    }
}

// ============================================================
// REFRESH TRACKING
// ============================================================
window.refreshTracking = function() {
    showToast('info', '🔄 Memperbarui data...');
    loadTrackingOrders();
};

// ============================================================
// KIRIM KE KURIR + LIVE GPS (dipakai di kartu "Tracking Pesanan Aktif")
// ============================================================
function renderKurirButtonAdmin(o) {
    if (o.status !== 'selesai') return ''; // baru relevan kalau cucian sudah siap diantar
    if (o.courierStatus === 'on_the_way') {
        return `<button class="btn btn-sm btn-success" onclick="showKurirLiveOnMap(${o.id})"><i class="fas fa-truck-fast"></i> Kurir Live</button>`;
    }
    if (o.courierStatus === 'dikirim') {
        return `<button class="btn btn-sm btn-outline" onclick="kirimKeKurirAdmin(${o.id}, '${(o.pelangganNama || '').replace(/'/g, "\\'")}')"><i class="fas fa-truck"></i> Kirim Ulang Link</button>`;
    }
    return `<button class="btn btn-sm btn-primary" onclick="kirimKeKurirAdmin(${o.id}, '${(o.pelangganNama || '').replace(/'/g, "\\'")}')"><i class="fas fa-truck"></i> Kirim ke Kurir</button>`;
}

window.kirimKeKurirAdmin = async function(orderId, pelangganNama) {
    try {
        showToast('info', 'Membuat link kurir...');
        const result = await LaundryAPI.generateKurirLink(orderId);
        if (!result.success) { showToast('error', result.error || 'Gagal membuat link kurir'); return; }

        const pesan = `Halo Kurir, tolong antar pesanan *${result.kode}* a.n *${pelangganNama}*.\nBuka link ini untuk lihat alamat, rute, dan kirim lokasi live selama mengantar:\n${result.link}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(pesan)}`, '_blank');

        showToast('success', 'Link kurir dibuat. Kirim ke kurir lewat WhatsApp.');
        await loadTrackingOrders();
    } catch (e) {
        showToast('error', e.message);
    }
};

// Ambil posisi live kurir & taruh marker truk di peta Leaflet yang sudah ada
window.showKurirLiveOnMap = async function(orderId) {
    try {
        const data = await LaundryAPI.getTrackingOrder(orderId);
        if (!data.courierLat || !data.courierLng) {
            showToast('info', 'Kurir belum mulai mengirim lokasi live.');
            return;
        }
        if (!map || typeof L === 'undefined') {
            showToast('error', 'Peta belum siap. Buka halaman ini dulu dan tunggu peta termuat.');
            return;
        }

        const lat = parseFloat(data.courierLat);
        const lng = parseFloat(data.courierLng);

        map.invalidateSize();
        map.setView([lat, lng], 16);

        if (window._kurirMarker) map.removeLayer(window._kurirMarker);

        const lastPing = data.courierLastPing ? new Date(data.courierLastPing).toLocaleTimeString('id-ID') : '-';

        window._kurirMarker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background:#10B981;padding:6px 14px;border-radius:20px;color:white;font-weight:bold;font-size:0.75rem;white-space:nowrap;box-shadow:0 4px 16px rgba(16,185,129,0.5);">
                    <i class="fas fa-motorcycle"></i> Kurir
                </div>`,
                iconSize: [90, 32],
                popupAnchor: [0, -10]
            })
        }).addTo(map).bindPopup(`
            <b>🚚 Posisi Kurir Live</b><br>
            Update terakhir: ${lastPing}<br><br>
            <button class="btn btn-sm btn-primary" onclick="window.open('https://www.google.com/maps/search/?api=1&query=${lat},${lng}', '_blank')">
                <i class="fas fa-external-link-alt"></i> Buka di Google Maps
            </button>
        `).openPopup();

        document.getElementById('map')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast('success', '🚚 Posisi kurir ditemukan!');
    } catch (e) {
        showToast('error', e.message);
    }
};

// ============================================================
// SHOW ORDER DETAIL
// ============================================================
window.showOrderDetail = function(kode) {
    const order = (window._trackingOrders || []).find(o => o.kode === kode);
    if (!order) {
        showToast('error', 'Pesanan tidak ditemukan');
        return;
    }
    
    const statusLabel = {
        'menunggu': '⏳ Menunggu Jemput',
        'proses': '🔄 Sedang Diproses',
        'selesai': '✅ Siap Diambil',
        'diambil': '📦 Sudah Diambil'
    };
    
    const modalHtml = `
        <div class="modal active" id="orderDetailModal">
            <div class="modal-content" style="max-width:500px;">
                <div class="modal-header">
                    <h3 style="font-size:0.95rem;"><i class="fas fa-receipt"></i> Detail Pesanan</h3>
                    <button class="modal-close" onclick="closeModal('orderDetailModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="display:grid;gap:8px;font-size:0.85rem;">
                        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(59,130,246,0.06);">
                            <span style="color:#94a3b8;">Kode Pesanan</span>
                            <span style="font-weight:600;">${order.kode}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(59,130,246,0.06);">
                            <span style="color:#94a3b8;">Pelanggan</span>
                            <span>${order.pelangganNama}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(59,130,246,0.06);">
                            <span style="color:#94a3b8;">No HP</span>
                            <span>${order.pelangganHp || '-'}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(59,130,246,0.06);">
                            <span style="color:#94a3b8;">Layanan</span>
                            <span>${order.layananNama}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(59,130,246,0.06);">
                            <span style="color:#94a3b8;">Berat</span>
                            <span>${order.berat ? order.berat + ' kg' : 'Belum ditimbang'}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(59,130,246,0.06);">
                            <span style="color:#94a3b8;">Total Bayar</span>
                            <span style="font-weight:600;color:#10b981;">${formatRupiah(order.totalBayar || 0)}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(59,130,246,0.06);">
                            <span style="color:#94a3b8;">Status</span>
                            <span>${statusLabel[order.status] || order.status}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(59,130,246,0.06);">
                            <span style="color:#94a3b8;">Pembayaran</span>
                            <span>${order.statusPembayaran === 'lunas' ? '✅ Lunas' : '⏳ Belum Lunas'}</span>
                        </div>
                        ${order.jadwalJemput ? `
                        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(59,130,246,0.06);">
                            <span style="color:#94a3b8;">Jadwal Jemput</span>
                            <span>${order.jadwalJemput}</span>
                        </div>` : ''}
                        ${order.catatan ? `
                        <div style="display:flex;justify-content:space-between;padding:6px 0;">
                            <span style="color:#94a3b8;">Catatan</span>
                            <span style="text-align:right;max-width:55%;">${order.catatan}</span>
                        </div>` : ''}
                    </div>
                    
                    <div style="margin-top:14px;padding:10px;background:rgba(59,130,246,0.04);border-radius:8px;">
                        <div style="font-size:0.75rem;color:#94a3b8;">
                            <i class="fas fa-map-marker-alt"></i> Alamat: ${order.pelangganAlamat || 'Belum diisi'}
                        </div>
                    </div>
                    
                    <button class="btn btn-primary btn-block map-btn" style="margin-top:10px;"
                        data-alamat="${(order.pelangganAlamat || '').replace(/"/g, '&quot;')}"
                        data-nama="${(order.pelangganNama || '').replace(/"/g, '&quot;')}"
                        data-kode="${order.kode}">
                        <i class="fas fa-map-pin"></i> Lihat di Peta
                    </button>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="closeModal('orderDetailModal')">Tutup</button>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('orderDetailModal');
    if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    document.getElementById('orderDetailModal').addEventListener('click', function(e) {
        const btn = e.target.closest('.map-btn');
        if (btn) {
            const alamat = btn.getAttribute('data-alamat') || '';
            const nama = btn.getAttribute('data-nama') || '';
            const kode = btn.getAttribute('data-kode') || '';
            closeModal('orderDetailModal');
            showLocationOnMap(alamat, nama, kode);
        }
    });
};

// ============================================================
// SHOW LOCATION ON MAP
// ============================================================
window.showLocationOnMap = async function(alamat, nama, kode) {
    console.log('📍 showLocationOnMap called:', { alamat, nama, kode });
    
    if (!alamat) {
        showToast('warning', '⚠️ Pelanggan belum mengisi alamat lengkap');
        return;
    }
    
    if (!map) {
        console.error('❌ Map belum diinisialisasi!');
        showToast('error', '❌ Peta belum siap. Refresh halaman dan coba lagi.');
        return;
    }
    
    if (typeof L === 'undefined') {
        console.error('❌ Leaflet tidak tersedia!');
        showToast('error', '❌ Library peta tidak ditemukan.');
        return;
    }
    
    let lat = null;
    let lng = null;
    let cleanAddress = alamat;
    
    const latMatch = alamat.match(/Lat:\s*([-\d.]+)/i);
    const lngMatch = alamat.match(/Lng:\s*([-\d.]+)/i);
    
    if (latMatch && lngMatch) {
        lat = parseFloat(latMatch[1]);
        lng = parseFloat(lngMatch[1]);
        cleanAddress = alamat.replace(/\(Lat:.*?\)/i, '').trim();
        console.log('✅ Koordinat ditemukan dari alamat:', { lat, lng });
    }
    
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        try {
            map.invalidateSize();
            map.setView([lat, lng], 16);
            
            if (window._currentMarker) {
                map.removeLayer(window._currentMarker);
            }
            
            const marker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div style="background:#3B82F6;padding:6px 14px;border-radius:20px;color:white;font-weight:bold;font-size:0.75rem;white-space:nowrap;box-shadow:0 4px 16px rgba(59,130,246,0.5);">
                        <i class="fas fa-map-pin"></i> ${nama || 'Pelanggan'}
                    </div>`,
                    iconSize: [120, 32],
                    popupAnchor: [0, -10]
                })
            }).addTo(map);
            
            window._currentMarker = marker;
            
            marker.bindPopup(`
                <b>${nama || 'Pelanggan'}</b><br>
                ${cleanAddress.substring(0, 150)}<br>
                <small style="color:#64748b;">Kode: ${kode || '-'}</small>
                <br><br>
                <button class="btn btn-sm btn-primary" onclick="window.open('https://www.google.com/maps/search/?api=1&query=${lat},${lng}', '_blank')">
                    <i class="fas fa-external-link-alt"></i> Buka di Google Maps
                </button>
            `).openPopup();
            
            showToast('success', `📍 Lokasi ${nama || 'pelanggan'} ditemukan!`);
            document.getElementById('map')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
            
        } catch (error) {
            console.error('❌ Error menampilkan marker:', error);
            showToast('error', '❌ Gagal menampilkan lokasi di peta');
            window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
            return;
        }
    }
    
    try {
        showToast('info', '🔍 Mencari lokasi...');
        console.log('🔍 Mencari alamat via Nominatim:', cleanAddress);
        
        const encodedAddress = encodeURIComponent(cleanAddress);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`);
        const data = await response.json();
        
        console.log('📡 Nominatim response:', data);
        
        if (data && data.length > 0) {
            const foundLat = parseFloat(data[0].lat);
            const foundLng = parseFloat(data[0].lon);
            
            map.invalidateSize();
            map.setView([foundLat, foundLng], 16);
            
            if (window._currentMarker) {
                map.removeLayer(window._currentMarker);
            }
            
            const marker = L.marker([foundLat, foundLng], {
                icon: L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div style="background:#3B82F6;padding:6px 14px;border-radius:20px;color:white;font-weight:bold;font-size:0.75rem;white-space:nowrap;box-shadow:0 4px 16px rgba(59,130,246,0.5);">
                        <i class="fas fa-map-pin"></i> ${nama || 'Pelanggan'}
                    </div>`,
                    iconSize: [120, 32],
                    popupAnchor: [0, -10]
                })
            }).addTo(map);
            
            window._currentMarker = marker;
            
            marker.bindPopup(`
                <b>${nama || 'Pelanggan'}</b><br>
                ${data[0].display_name.substring(0, 150)}<br>
                <small style="color:#64748b;">Kode: ${kode || '-'}</small>
                <br><br>
                <button class="btn btn-sm btn-primary" onclick="window.open('https://www.google.com/maps/search/?api=1&query=${foundLat},${foundLng}', '_blank')">
                    <i class="fas fa-external-link-alt"></i> Buka di Google Maps
                </button>
            `).openPopup();
            
            showToast('success', `📍 Lokasi ${nama || 'pelanggan'} ditemukan!`);
            document.getElementById('map')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
        } else {
            showToast('error', '❌ Alamat tidak dapat ditemukan di peta');
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanAddress)}`, '_blank');
        }
        
    } catch (error) {
        console.error('❌ Geocoding error:', error);
        showToast('error', '❌ Gagal mencari lokasi: ' + error.message);
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanAddress)}`, '_blank');
    }
};

// ============================================================
// AUTO REFRESH TRACKING
// ============================================================
function startAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
        const currentPage = document.querySelector('.menu-item.active');
        if (currentPage && currentPage.getAttribute('data-page') === 'map') {
            loadTrackingOrders();
        }
    }, 30000);
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

// ============================================================
// FUNGSI PETA GLOBAL
// ============================================================
window.searchAddress = async function() {
    const address = document.getElementById('addressSearch').value;
    if (!address) {
        showToast('warning', 'Masukkan alamat yang ingin dicari');
        return;
    }
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
        const data = await response.json();
        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            map.setView([lat, lng], 15);
            L.marker([lat, lng]).addTo(map).bindPopup(`📍 ${data[0].display_name.substring(0, 100)}`).openPopup();
        } else {
            showToast('error', 'Alamat tidak ditemukan');
        }
    } catch(e) {
        showToast('error', 'Gagal mencari alamat');
    }
};

window.getMyLocation = function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                map.setView([lat, lng], 15);
                L.marker([lat, lng]).addTo(map).bindPopup('📍 Lokasi Anda saat ini').openPopup();
                showToast('success', 'Lokasi Anda ditemukan!');
            },
            (error) => { showToast('error', 'Gagal mendapatkan lokasi: ' + error.message); }
        );
    } else {
        showToast('error', 'Browser tidak support geolocation');
    }
};

window.copyLocationToClipboard = function(lat, lng, address) {
    const text = `Latitude: ${lat}, Longitude: ${lng}\nAlamat: ${address}`;
    navigator.clipboard.writeText(text).then(() => {
        showToast('success', 'Lokasi berhasil disalin!');
    }).catch(() => {
        showToast('error', 'Gagal menyalin ke clipboard');
    });
};

// Password strength
document.addEventListener('input', function(e) {
    if (e.target.id === 'newPassword') {
        const password = e.target.value;
        let strength = 0;
        if (password.length >= 6) strength++;
        if (password.length >= 10) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        
        const bar = document.getElementById('strengthBar');
        if (bar) {
            if (strength <= 2) bar.className = 'password-strength strength-weak';
            else if (strength <= 4) bar.className = 'password-strength strength-medium';
            else bar.className = 'password-strength strength-strong';
        }
    }
});

// ============ EXPOSE GLOBALS ============
window.loadPage = loadPage;
window.closeModal = closeModal;
window.openInputBeratAdmin = openInputBeratAdmin;
window.saveBeratAdmin = saveBeratAdmin;
window.exportLaporanToExcel = exportLaporanToExcel;
window.exportLaporanToPDF = exportLaporanToPDF;
window.exportToExcel = exportLaporanToExcel;
window.exportToPDF = exportLaporanToPDF;
window.searchAddress = searchAddress;
window.getMyLocation = getMyLocation;
window.copyLocationToClipboard = copyLocationToClipboard;
window.showLocationOnMap = showLocationOnMap;
window.refreshTracking = refreshTracking;
window.showOrderDetail = showOrderDetail;
window.startAutoRefresh = startAutoRefresh;
window.stopAutoRefresh = stopAutoRefresh;