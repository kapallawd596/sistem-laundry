/**
 * USER/CUSTOMER PAGE - LaundryPro
 */

let currentUser = null;
let myOrders = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Ambil user dari auth
    currentUser = auth.getCurrentUser();
    
    if (!currentUser) {
        window.location.href = '/login.html';
        return;
    }
    
    if (currentUser.role !== 'customer') {
        alert('Halaman ini khusus untuk pelanggan');
        window.location.href = '/login.html';
        return;
    }
    
    // Tampilkan info user
    document.getElementById('userName').innerText = currentUser.nama;
    document.getElementById('userAvatar').innerText = currentUser.nama.charAt(0).toUpperCase();
    document.getElementById('pageTitle').innerText = 'Dashboard Saya';
    
    // Load data
    await loadOrders();
    await renderDashboard();
    
    // Event listeners menu
    document.querySelectorAll('.menu-item[data-page]').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.getAttribute('data-page');
            navigateTo(page);
        });
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        auth.logout();
    });
});

async function loadOrders() {
    try {
        myOrders = await LaundryAPI.getPesanan({ customerId: currentUser.id });
        console.log('Orders loaded:', myOrders);
    } catch (error) {
        console.error('Error loading orders:', error);
        myOrders = [];
    }
}

async function navigateTo(page) {
    // Update active menu
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`[data-page="${page}"]`).classList.add('active');
    
    const titles = {
        dashboard: 'Dashboard Saya',
        pesanan: 'Pesanan Saya',
        tracking: 'Tracking Pesanan',
        profile: 'Profil Saya'
    };
    document.getElementById('pageTitle').innerText = titles[page] || page;
    
    // Render page
    if (page === 'dashboard') await renderDashboard();
    else if (page === 'pesanan') await renderPesanan();
    else if (page === 'tracking') await renderTracking();
    else if (page === 'profile') await renderProfile();
}

async function renderDashboard() {
    const stats = {
        total: myOrders.length,
        menunggu: myOrders.filter(o => o.status === 'menunggu').length,
        proses: myOrders.filter(o => o.status === 'proses').length,
        selesai: myOrders.filter(o => o.status === 'selesai').length
    };
    const latestOrders = myOrders.slice(0, 5);
    
    const html = `
        <div style="background: linear-gradient(135deg, #4361ee, #3730a3); border-radius: 12px; padding: 20px; color: white; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h2 style="margin: 0;">Halo, ${currentUser.nama}!</h2>
                    <p style="margin: 8px 0 0;">${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <div style="width: 50px; height: 50px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px;">${currentUser.nama.charAt(0).toUpperCase()}</div>
            </div>
        </div>
        
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 15px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between;">
                <div><i class="fas fa-map-marker-alt" style="color: #10b981;"></i> <strong>Alamat Antar Jemput</strong></div>
                <button onclick="window.openEditAlamat()" style="background: none; border: none; color: #4361ee; cursor: pointer;"><i class="fas fa-edit"></i> Edit</button>
            </div>
            <p style="margin-top: 8px;">${currentUser.alamat || '<span style="color: gray;">Belum diisi</span>'}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-value">${stats.total}</div><div class="stat-label">Total Pesanan</div></div>
            <div class="stat-card"><div class="stat-value">${stats.menunggu}</div><div class="stat-label">Menunggu</div></div>
            <div class="stat-card"><div class="stat-value">${stats.selesai}</div><div class="stat-label">Selesai</div></div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <span><i class="fas fa-clock"></i> Pesanan Terbaru</span>
                <button class="btn btn-sm btn-outline" onclick="window.navigateTo('pesanan')">Lihat Semua <i class="fas fa-arrow-right"></i></button>
            </div>
            <div class="card-body" style="padding: 0;">
                <table class="table">
                    <thead><tr><th>Kode</th><th>Layanan</th><th>Berat</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead>
                    <tbody>
                        ${latestOrders.map(o => `
                            <tr>
                                <td><strong>${o.kode}</strong></td>
                                <td>${o.layananNama}</td>
                                <td>${o.berat} kg</td>
                                <td>${formatRupiah(o.totalBayar)}</td>
                                <td>${getStatusBadge(o.status)}</td>
                                <td><button class="btn btn-sm btn-primary" onclick="window.trackOrder(${o.id})"><i class="fas fa-map-marker-alt"></i> Tracking</button></td>
                            </tr>
                        `).join('')}
                        ${latestOrders.length === 0 ? '<tr><td colspan="6" style="text-align:center;">Belum ada pesanan</td>' : ''}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = html;
}

async function renderPesanan() {
    const html = `
        <div class="card">
            <div class="card-header"><span><i class="fas fa-shopping-bag"></i> Semua Pesanan</span></div>
            <div class="card-body" style="padding: 0;">
                <table class="table">
                    <thead><tr><th>Kode</th><th>Layanan</th><th>Berat</th><th>Total</th><th>Status</th><th>Tanggal</th><th>Aksi</th></tr></thead>
                    <tbody>
                        ${myOrders.map(o => `
                            <tr>
                                <td><strong>${o.kode}</strong></td>
                                <td>${o.layananNama}</td>
                                <td>${o.berat} kg</td>
                                <td>${formatRupiah(o.totalBayar)}</td>
                                <td>${getStatusBadge(o.status)}</td>
                                <td>${o.tanggalMasuk}</td>
                                <td><button class="btn btn-sm btn-primary" onclick="window.trackOrder(${o.id})"><i class="fas fa-map-marker-alt"></i> Tracking</button></td>
                            </tr>
                        `).join('')}
                        ${myOrders.length === 0 ? '<tr><td colspan="7" style="text-align:center;">Belum ada pesanan</td>' : ''}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = html;
}

async function renderTracking() {
    const active = myOrders.filter(o => o.status !== 'diambil');
    const history = myOrders.filter(o => o.status === 'diambil');
    
    const html = `
        <div class="card">
            <div class="card-header"><span><i class="fas fa-spinner fa-spin"></i> Pesanan Aktif</span></div>
            <div class="card-body">
                ${active.map(o => `
                    <div style="background: #f8fafc; border-radius: 8px; padding: 12px; margin-bottom: 10px; cursor: pointer;" onclick="window.trackOrder(${o.id})">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div><strong>${o.kode}</strong><br><small>${o.layananNama} - ${o.berat} kg</small></div>
                            ${getStatusBadge(o.status)}
                        </div>
                    </div>
                `).join('')}
                ${active.length === 0 ? '<p style="text-align:center; color:gray;">Tidak ada pesanan aktif</p>' : ''}
            </div>
        </div>
        <div class="card">
            <div class="card-header"><span><i class="fas fa-history"></i> Riwayat Pesanan</span></div>
            <div class="card-body">
                ${history.map(o => `
                    <div style="background: #f8fafc; border-radius: 8px; padding: 12px; margin-bottom: 10px; opacity: 0.7;">
                        <div><strong>${o.kode}</strong><br><small>${o.layananNama} - ${o.berat} kg</small></div>
                        <div>${getStatusBadge(o.status)}</div>
                    </div>
                `).join('')}
                ${history.length === 0 ? '<p style="text-align:center; color:gray;">Belum ada riwayat</p>' : ''}
            </div>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = html;
}

async function renderProfile() {
    const html = `
        <div class="card">
            <div class="card-header"><span><i class="fas fa-user-circle"></i> Profil Saya</span></div>
            <div class="card-body">
                <div style="margin-bottom: 15px;"><strong>Nama</strong><br>${currentUser.nama}</div>
                <div style="margin-bottom: 15px;"><strong>Email</strong><br>${currentUser.email}</div>
                <div style="margin-bottom: 15px;"><strong>No HP</strong><br>${currentUser.no_hp || '-'}</div>
                <div style="margin-bottom: 15px;"><strong>Alamat</strong><br>${currentUser.alamat || '-'}</div>
                <button class="btn btn-primary" onclick="window.openEditAlamat()"><i class="fas fa-map-marker-alt"></i> Edit Alamat</button>
            </div>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = html;
}

function trackOrder(orderId) {
    const order = myOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const steps = [
        { status: 'menunggu', title: 'Pesanan Diterima', icon: 'fa-receipt', desc: 'Pesanan Anda telah kami terima' },
        { status: 'proses', title: 'Sedang Diproses', icon: 'fa-spinner', desc: 'Pakaian sedang dicuci' },
        { status: 'selesai', title: 'Selesai', icon: 'fa-check-circle', desc: 'Pakaian siap diambil/diantar' }
    ];
    
    let html = `<div style="padding: 10px;">`;
    steps.forEach((step, idx) => {
        let isActive = order.status === step.status;
        let isCompleted = steps.findIndex(s => s.status === order.status) > idx;
        let color = isCompleted ? '#10b981' : (isActive ? '#4361ee' : '#cbd5e1');
        
        html += `
            <div style="display: flex; margin-bottom: 20px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: ${color}; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                    <i class="fas ${step.icon}" style="color: white;"></i>
                </div>
                <div>
                    <div style="font-weight: 600;">${step.title}</div>
                    <div style="font-size: 12px; color: #64748b;">${step.desc}</div>
                    ${isActive ? '<div style="font-size: 11px; color: #4361ee; margin-top: 4px;">Status saat ini</div>' : ''}
                </div>
            </div>
        `;
    });
    html += `<hr><div><strong>Detail:</strong><br>Kode: ${order.kode}<br>Total: ${formatRupiah(order.totalBayar)}<br>Tanggal: ${order.tanggalMasuk}</div></div>`;
    
    document.getElementById('trackingBody').innerHTML = html;
    openModal('trackingModal');
}

function openEditAlamat() {
    document.getElementById('alamatInput').value = currentUser.alamat || '';
    openModal('alamatModal');
}

async function simpanAlamat() {
    const newAlamat = document.getElementById('alamatInput').value.trim();
    if (!newAlamat) {
        alert('Alamat tidak boleh kosong');
        return;
    }
    try {
        await LaundryAPI.updateUser(currentUser.id, { alamat: newAlamat });
        currentUser.alamat = newAlamat;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        closeModal('alamatModal');
        alert('Alamat berhasil diperbarui');
        await loadOrders();
        await renderDashboard();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function formatRupiah(angka) {
    return 'Rp ' + (angka || 0).toLocaleString('id-ID');
}

function getStatusBadge(status) {
    const map = {
        'menunggu': '<span class="badge badge-warning">⏳ Menunggu</span>',
        'proses': '<span class="badge badge-info">🔄 Diproses</span>',
        'selesai': '<span class="badge badge-success">✅ Selesai</span>',
        'diambil': '<span class="badge badge-success">📦 Diambil</span>'
    };
    return map[status] || `<span class="badge">${status}</span>`;
}

// Export ke window
window.navigateTo = navigateTo;
window.trackOrder = trackOrder;
window.openEditAlamat = openEditAlamat;
window.simpanAlamat = simpanAlamat;
window.openModal = openModal;
window.closeModal = closeModal;
window.formatRupiah = formatRupiah;
window.getStatusBadge = getStatusBadge;