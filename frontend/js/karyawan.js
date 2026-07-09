/**
 * KARYAWAN DASHBOARD - Laundry int
 * Fitur: Input berat setelah timbang di toko, update status pesanan
 * ⚠️ KARYAWAN TIDAK BISA UPDATE PEMBAYARAN (hanya admin & pelanggan)
 */

let currentUser = null;
let allOrders = [];
let pelangganList = [];
let layananList = [];
let currentPage = 'dashboard';

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = auth.getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'karyawan') {
        window.location.href = '/login.html';
        return;
    }
    
    document.getElementById('userName').innerText = currentUser.nama;
    document.getElementById('userAvatar').innerText = currentUser.nama.charAt(0).toUpperCase();
    
    await loadData();
    await loadDashboard();
    
    document.querySelectorAll('.menu-item[data-page]').forEach(item => {
        item.addEventListener('click', () => loadPage(item.getAttribute('data-page')));
    });
    
    document.getElementById('logoutBtn').addEventListener('click', () => auth.logout());
    
    setInterval(updateDateTime, 1000);
    updateDateTime();
    createParticles();
});

async function loadData() {
    try {
        allOrders = await LaundryAPI.getPesanan();
        pelangganList = await LaundryAPI.getPelanggan();
        layananList = await LaundryAPI.getLayanan();
    } catch(e) {
        console.error('Error loading data:', e);
    }
}

async function loadPage(page) {
    currentPage = page;
    
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`[data-page="${page}"]`).classList.add('active');
    
    const titles = {
        dashboard: 'Dashboard Karyawan', 
        pesanan: 'Kelola Pesanan',
        pelanggan: 'Data Pelanggan'
    };
    document.getElementById('pageTitle').innerHTML = `<i class="fas ${page === 'dashboard' ? 'fa-chart-line' : page === 'pesanan' ? 'fa-receipt' : 'fa-users'}"></i> ${titles[page]}`;
    
    document.getElementById('pageContent').innerHTML = '<div class="loading"><div class="spinner"></div>Memuat data...</div>';
    
    if (page === 'dashboard') await loadDashboard();
    else if (page === 'pesanan') await loadPesanan();
    else if (page === 'pelanggan') await loadPelanggan();
}

// ============ DASHBOARD KARYAWAN ============
async function loadDashboard() {
    try {
        const stats = await LaundryAPI.getStatistik();
        await loadData();
        
        const today = new Date().toISOString().split('T')[0];
        const todayOrders = allOrders.filter(p => p.tanggalMasuk === today || p.tanggalPesan === today);
        const pendingPickup = allOrders.filter(p => p.status === 'selesai');
        const menungguOrders = allOrders.filter(p => p.status === 'menunggu');
        
        const html = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-calendar-day"></i></div>
                    <div class="stat-value">${todayOrders.length}</div>
                    <div class="stat-label">Pesanan Hari Ini</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-clock"></i></div>
                    <div class="stat-value">${menungguOrders.length}</div>
                    <div class="stat-label">Menunggu Jemput</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-spinner"></i></div>
                    <div class="stat-value">${stats.pesananProses || 0}</div>
                    <div class="stat-label">Sedang Diproses</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-box-open"></i></div>
                    <div class="stat-value">${pendingPickup.length}</div>
                    <div class="stat-label">Siap Diambil/Diantar</div>
                </div>
            </div>
            
            <div class="glass-card">
                <div class="card-header"><span><i class="fas fa-truck"></i> Pesanan Menunggu Jemput</span></div>
                <div class="card-body" style="padding:0;">
                    <div class="table-wrapper">
                        <table class="table">
                            <thead><tr><th>Kode</th><th>Pelanggan</th><th>Alamat</th><th>Layanan</th><th>Jadwal Jemput</th><th>Aksi</th></tr></thead>
                            <tbody>
                                ${menungguOrders.map(p => `
                                    <tr>
                                        <td><strong>${p.kode}</strong></td>
                                        <td>${p.pelangganNama}</td>
                                        <td>${p.pelangganAlamat || '-'}</td>
                                        <td>${p.layananNama}</td>
                                        <td>${p.jadwalJemput || '-'}</td>
                                        <td><button class="btn btn-sm btn-primary" onclick="openInputBerat(${p.id})"><i class="fas fa-weight-hanging"></i> Input Berat</button>
                                        </td>
                                    </tr>
                                `).join('')}
                                ${menungguOrders.length === 0 ? '<tr><td colspan="6" class="text-center">Tidak ada pesanan menunggu jemput</td>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <div class="glass-card">
                <div class="card-header"><span><i class="fas fa-box"></i> Pesanan Siap Diambil/Diantar</span></div>
                <div class="card-body" style="padding:0;">
                    <div class="table-wrapper">
                        <table class="table">
                            <thead><tr><th>Kode</th><th>Pelanggan</th><th>Total</th><th>Pembayaran</th><th>Alamat</th><th>Aksi</th></tr></thead>
                            <tbody>
                                ${pendingPickup.map(p => `
                                    <tr>
                                        <td><strong>${p.kode}</strong></td>
                                        <td>${p.pelangganNama}</td>
                                        <td>${formatRupiah(p.totalBayar)}</td>
                                        <td>${getPaymentBadge(p.statusPembayaran)}</td>
                                        <td>${p.pelangganAlamat || '-'}</td>
                                        <td>
                                            <button class="btn btn-sm btn-success" onclick="markAsDelivered(${p.id})"><i class="fas fa-check"></i> Sudah Diambil/Diantar</button>
                                        </td>
                                    </tr>
                                `).join('')}
                                ${pendingPickup.length === 0 ? '<tr><td colspan="6" class="text-center">Tidak ada pesanan siap diambil</td>' : ''}
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

// ============ INPUT BERAT (FITUR UTAMA KARYAWAN) ============
window.openInputBerat = function(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const html = `
        <form id="inputBeratForm">
            <div class="form-group">
                <label class="form-label">Kode Pesanan</label>
                <input type="text" class="form-control" value="${order.kode}" readonly disabled>
            </div>
            <div class="form-group">
                <label class="form-label">Pelanggan</label>
                <input type="text" class="form-control" value="${order.pelangganNama}" readonly disabled>
            </div>
            <div class="form-group">
                <label class="form-label">Layanan</label>
                <input type="text" class="form-control" value="${order.layananNama} - ${formatRupiah(order.hargaPerKg)}/kg" readonly disabled>
            </div>
            <div class="form-group">
                <label class="form-label required">Berat (kg)</label>
                <input type="number" id="berat" class="form-control" step="0.1" min="0.1" placeholder="Contoh: 3.5" required>
                <small style="color:#64748B;">Timbang pakaian di toko, lalu input beratnya</small>
            </div>
            <div class="form-group">
                <label class="form-label">Total Harga (Otomatis)</label>
                <input type="text" id="totalDisplay" class="form-control" readonly disabled>
            </div>
        </form>
        <div class="modal-footer">
            <button class="btn btn-outline" onclick="closeModal('dynamicModal')">Batal</button>
            <button class="btn btn-primary" onclick="saveBerat(${orderId})">Simpan & Proses</button>
        </div>
    `;
    
    openModal(html, 'Input Berat Pesanan');
    
    document.getElementById('berat').addEventListener('input', function() {
        const berat = parseFloat(this.value) || 0;
        const total = berat * order.hargaPerKg;
        document.getElementById('totalDisplay').value = formatRupiah(total);
    });
};

window.saveBerat = async function(orderId) {
    const berat = parseFloat(document.getElementById('berat').value);
    if (!berat || berat <= 0) {
        showToast('error', 'Masukkan berat yang valid!');
        return;
    }
    
    const order = allOrders.find(o => o.id === orderId);
    const totalHarga = berat * order.hargaPerKg;
    
    try {
        await LaundryAPI.updatePesanan(orderId, {
            berat: berat,
            totalHarga: totalHarga,
            totalBayar: totalHarga,
            status: 'proses',
            tanggalMasuk: new Date().toISOString().split('T')[0]
        });
        closeModal('dynamicModal');
        showToast('success', `Berat ${berat} kg disimpan! Total: ${formatRupiah(totalHarga)}`);
        await loadData();
        await loadPage('pesanan');
    } catch(e) {
        showToast('error', e.message);
    }
};

// ============ KELOLA PESANAN ============
async function loadPesanan() {
    try {
        await loadData();
        
        const html = `
            <div class="search-filter">
                <input type="text" id="searchPesanan" placeholder="🔍 Cari kode atau pelanggan..." onkeyup="filterPesanan()">
                <select id="statusFilter" onchange="filterPesanan()">
                    <option value="">Semua Status</option>
                    <option value="menunggu">Menunggu</option>
                    <option value="proses">Proses</option>
                    <option value="selesai">Selesai</option>
                    <option value="diambil">Diambil</option>
                </select>
                <button class="btn btn-primary" onclick="showTambahPesanan()"><i class="fas fa-plus"></i> Tambah Pesanan</button>
            </div>
            <div class="glass-card">
                <div class="card-header"><span><i class="fas fa-receipt"></i> Daftar Pesanan</span></div>
                <div class="card-body" style="padding:0;">
                    <div class="table-wrapper">
                        <table class="table">
                            <thead>
                                <tr><th>Kode</th><th>Pelanggan</th><th>Layanan</th><th>Berat</th><th>Total</th><th>Status</th><th>Pembayaran</th><th>Aksi</th></tr>
                            </thead>
                            <tbody id="pesananTableBody">
                                ${allOrders.map(p => renderPesananRow(p)).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('pageContent').innerHTML = html;
        window.filterPesanan = filterPesanan;
    } catch(e) {
        document.getElementById('pageContent').innerHTML = `<div style="color:red;">Error: ${e.message}</div>`;
    }
}

function renderPesananRow(p) {
    return `
        <tr>
            <td><strong>${p.kode}</strong></td>
            <td>${p.pelangganNama}</td>
            <td>${p.layananNama}</td>
            <td>${p.berat ? p.berat + ' kg' : '<span style="color:#F59E0B;">Belum ditimbang</span>'}</td>
            <td>${p.totalBayar ? formatRupiah(p.totalBayar) : '-'}</td>
            <td>${getStatusBadge(p.status)}</td>
            <td>${getPaymentBadge(p.statusPembayaran)}       <!-- Hanya TAMPIL, tidak bisa diklik -->
            <td class="action-buttons">
                ${!p.berat ? `<button class="btn btn-sm btn-primary" onclick="openInputBerat(${p.id})"><i class="fas fa-weight-hanging"></i> Timbang</button>` : ''}
                <select class="status-select" onchange="updateStatus(${p.id}, this.value)" style="background:rgba(6,182,212,0.2); border:1px solid #06B6D4; border-radius:8px; padding:5px 10px; color:white;">
                    <option value="menunggu" ${p.status === 'menunggu' ? 'selected' : ''}>⏳ Menunggu</option>
                    <option value="proses" ${p.status === 'proses' ? 'selected' : ''}>🔄 Proses</option>
                    <option value="selesai" ${p.status === 'selesai' ? 'selected' : ''}>✅ Selesai</option>
                    <option value="diambil" ${p.status === 'diambil' ? 'selected' : ''}>📦 Diambil</option>
                </select>
                ${p.statusPembayaran === 'menunggu_verifikasi' ? `<button class="btn btn-sm btn-success" onclick="konfirmasiLunasKaryawan(${p.id})"><i class="fas fa-check-circle"></i> Konfirmasi Lunas</button>` : ''}
            </td>
        </tr>
    `;
}

window.konfirmasiLunasKaryawan = async function(orderId) {
    if (!confirm('Pastikan sudah cek bukti transfer (WA/mutasi) dan uang benar-benar masuk. Konfirmasi sebagai Lunas?')) return;
    try {
        await LaundryAPI.updatePesanan(orderId, { status_pembayaran: 'lunas' });
        showToast('success', '✅ Pembayaran dikonfirmasi lunas');
        await loadPesanan();
    } catch (e) {
        showToast('error', e.message || 'Gagal konfirmasi pembayaran');
    }
};

function filterPesanan() {
    const search = document.getElementById('searchPesanan')?.value.toLowerCase() || '';
    const status = document.getElementById('statusFilter')?.value || '';
    const filtered = allOrders.filter(p => {
        const matchSearch = p.kode.toLowerCase().includes(search) || p.pelangganNama.toLowerCase().includes(search);
        const matchStatus = !status || p.status === status;
        return matchSearch && matchStatus;
    });
    const tbody = document.getElementById('pesananTableBody');
    if (tbody) {
        tbody.innerHTML = filtered.map(p => renderPesananRow(p)).join('');
        if (filtered.length === 0) tbody.innerHTML = '<tr><td colspan="8" class="text-center">Tidak ada data</td>' ;
    }
}

// ============ UPDATE STATUS (Karyawan hanya update status cucian) ============
window.updateStatus = async function(orderId, newStatus) {
    try {
        await LaundryAPI.updatePesanan(orderId, { status: newStatus });
        showToast('success', `Status pesanan berhasil diupdate menjadi ${newStatus}`);
        await loadData();
        await loadPage('pesanan');
    } catch(e) {
        showToast('error', e.message);
    }
};

window.markAsDelivered = async function(orderId) {
    try {
        await LaundryAPI.updatePesanan(orderId, { status: 'diambil' });
        showToast('success', 'Pesanan sudah diambil/diantar ke pelanggan');
        await loadData();
        await loadPage('dashboard');
    } catch(e) {
        showToast('error', e.message);
    }
};

// ============ TAMBAH PESANAN (Karyawan bantu customer) ============
window.showTambahPesanan = async function() {
    await loadData();
    
    const html = `
        <form id="tambahPesananForm">
            <div class="form-group">
                <label class="form-label required">Pelanggan</label>
                <select id="pelangganId" class="form-control" required>
                    <option value="">Pilih Pelanggan</option>
                    ${pelangganList.map(p => `<option value="${p.id}" data-nama="${p.nama}" data-hp="${p.no_hp}" data-alamat="${p.alamat}">${p.nama} - ${p.no_hp}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label required">Layanan</label>
                <select id="layananId" class="form-control" required>
                    <option value="">Pilih Layanan</option>
                    ${layananList.map(l => `<option value="${l.id}" data-nama="${l.nama}" data-harga="${l.harga}">${l.nama} - ${formatRupiah(l.harga)}/kg</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label required">Berat (kg)</label>
                <input type="number" id="berat" class="form-control" step="0.1" min="0.1" required>
            </div>
            <div class="form-group">
                <label class="form-label">Catatan</label>
                <textarea id="catatan" class="form-control" rows="2"></textarea>
            </div>
        </form>
        <div class="modal-footer">
            <button class="btn btn-outline" onclick="closeModal('dynamicModal')">Batal</button>
            <button class="btn btn-primary" onclick="simpanTambahPesanan()">Simpan</button>
        </div>
    `;
    
    openModal(html, 'Tambah Pesanan');
};

window.simpanTambahPesanan = async function() {
    const pelangganId = document.getElementById('pelangganId').value;
    const layananId = document.getElementById('layananId').value;
    const berat = parseFloat(document.getElementById('berat').value);
    const catatan = document.getElementById('catatan').value;
    
    if (!pelangganId || !layananId || !berat) {
        showToast('error', 'Lengkapi semua data!');
        return;
    }
    
    const pelanggan = pelangganList.find(p => p.id == pelangganId);
    const layanan = layananList.find(l => l.id == layananId);
    const totalHarga = layanan.harga * berat;
    
    const newPesanan = {
        pelangganId: parseInt(pelangganId),
        pelangganNama: pelanggan.nama,
        pelangganHp: pelanggan.no_hp,
        pelangganAlamat: pelanggan.alamat,
        layananId: parseInt(layananId),
        layananNama: layanan.nama,
        hargaPerKg: layanan.harga,
        berat: berat,
        totalHarga: totalHarga,
        totalBayar: totalHarga,
        status: 'proses',
        statusPembayaran: 'belum',
        tanggalMasuk: new Date().toISOString().split('T')[0],
        catatan: catatan
    };
    
    try {
        await LaundryAPI.addPesanan(newPesanan);
        closeModal('dynamicModal');
        showToast('success', 'Pesanan berhasil ditambahkan!');
        await loadData();
        await loadPage('pesanan');
    } catch(e) {
        showToast('error', e.message);
    }
};

// ============ DATA PELANGGAN ============
async function loadPelanggan() {
    try {
        await loadData();
        
        const html = `
            <div style="margin-bottom:1rem;">
                <button class="btn btn-primary" onclick="showTambahPelanggan()"><i class="fas fa-plus"></i> Tambah Pelanggan</button>
            </div>
            <div class="glass-card">
                <div class="card-header"><span><i class="fas fa-users"></i> Daftar Pelanggan</span></div>
                <div class="card-body" style="padding:0;">
                    <div class="table-wrapper">
                        <table class="table">
                            <thead><tr><th>Nama</th><th>Email</th><th>No HP</th><th>Alamat</th><th>Poin</th><th>Aksi</th></tr></thead>
                            <tbody>
                                ${pelangganList.map(p => `
                                    <tr>
                                        <td><strong>${p.nama}</strong></td>
                                        <td>${p.email || '-'}</td>
                                        <td>${p.no_hp}</td>
                                        <td>${p.alamat || '-'}</td>
                                        <td>${p.poin || 0} poin</span></td>
                                        <td><button class="btn btn-sm btn-primary" onclick="editPelanggan(${p.id})"><i class="fas fa-edit"></i> Edit</button>
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

window.showTambahPelanggan = function() {
    const html = `
        <form id="tambahPelangganForm">
            <div class="form-group"><label class="form-label">Nama</label><input id="nama" class="form-control" required></div>
            <div class="form-group"><label class="form-label">Email</label><input id="email" type="email" class="form-control"></div>
            <div class="form-group"><label class="form-label">No HP</label><input id="no_hp" class="form-control" required></div>
            <div class="form-group"><label class="form-label">Alamat</label><textarea id="alamat" class="form-control" rows="2"></textarea></div>
        </form>
        <div class="modal-footer">
            <button class="btn btn-outline" onclick="closeModal('dynamicModal')">Batal</button>
            <button class="btn btn-primary" onclick="simpanTambahPelanggan()">Simpan</button>
        </div>
    `;
    
    openModal(html, 'Tambah Pelanggan');
};

window.simpanTambahPelanggan = async function() {
    const data = {
        nama: document.getElementById('nama').value,
        email: document.getElementById('email').value,
        no_hp: document.getElementById('no_hp').value,
        alamat: document.getElementById('alamat').value
    };
    try {
        await LaundryAPI.addPelanggan(data);
        closeModal('dynamicModal');
        showToast('success', 'Pelanggan berhasil ditambahkan!');
        await loadData();
        await loadPage('pelanggan');
    } catch(e) {
        showToast('error', e.message);
    }
};

window.editPelanggan = async function(id) {
    const p = pelangganList.find(p => p.id === id);
    if (!p) return;
    
    const html = `
        <form id="editPelangganForm">
            <div class="form-group"><label class="form-label">Nama</label><input id="nama" class="form-control" value="${p.nama}" required></div>
            <div class="form-group"><label class="form-label">Email</label><input id="email" type="email" class="form-control" value="${p.email || ''}"></div>
            <div class="form-group"><label class="form-label">No HP</label><input id="no_hp" class="form-control" value="${p.no_hp}" required></div>
            <div class="form-group"><label class="form-label">Alamat</label><textarea id="alamat" class="form-control" rows="2">${p.alamat || ''}</textarea></div>
        </form>
        <div class="modal-footer">
            <button class="btn btn-outline" onclick="closeModal('dynamicModal')">Batal</button>
            <button class="btn btn-primary" onclick="updateEditPelanggan(${id})">Update</button>
        </div>
    `;
    
    openModal(html, 'Edit Pelanggan');
};

window.updateEditPelanggan = async function(id) {
    const data = {
        nama: document.getElementById('nama').value,
        email: document.getElementById('email').value,
        no_hp: document.getElementById('no_hp').value,
        alamat: document.getElementById('alamat').value
    };
    try {
        await LaundryAPI.updatePelanggan(id, data);
        closeModal('dynamicModal');
        showToast('success', 'Data pelanggan berhasil diupdate!');
        await loadData();
        await loadPage('pelanggan');
    } catch(e) {
        showToast('error', e.message);
    }
};

window.loadPage = loadPage;
window.filterPesanan = filterPesanan;
window.openInputBerat = openInputBerat;
window.saveBerat = saveBerat;
window.updateStatus = updateStatus;
window.markAsDelivered = markAsDelivered;
window.showTambahPesanan = showTambahPesanan;
window.simpanTambahPesanan = simpanTambahPesanan;
window.showTambahPelanggan = showTambahPelanggan;
window.simpanTambahPelanggan = simpanTambahPelanggan;
window.editPelanggan = editPelanggan;
window.updateEditPelanggan = updateEditPelanggan;