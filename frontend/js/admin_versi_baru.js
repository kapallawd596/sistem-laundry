/**
 * ADMIN DASHBOARD - LaundryPro
 * Fitur: Full management (pesanan, pelanggan, layanan, users, laporan)
 * ✅ ADMIN BISA TIMBANG (input berat) seperti karyawan!
 */

let currentUser = null;
let currentPageData = {};

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = auth.getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = '/login.html';
        return;
    }
    
    document.getElementById('userName').innerText = currentUser.nama;
    document.getElementById('userAvatar').innerText = currentUser.nama.charAt(0).toUpperCase();
    
    await loadDashboard();
    
    document.querySelectorAll('.menu-item[data-page]').forEach(item => {
        item.addEventListener('click', () => loadPage(item.getAttribute('data-page')));
    });
    
    document.getElementById('logoutBtn').addEventListener('click', () => auth.logout());
    
    setInterval(updateDateTime, 1000);
    updateDateTime();
    createParticles();
});

async function loadPage(page) {
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`[data-page="${page}"]`).classList.add('active');
    
    const titles = {
        dashboard: 'Dashboard', pesanan: 'Manajemen Pesanan',
        pelanggan: 'Data Pelanggan', layanan: 'Kelola Layanan',
        laporan: 'Laporan & Statistik', users: 'Manajemen User'
    };
    document.getElementById('pageTitle').innerHTML = `<i class="fas ${page === 'dashboard' ? 'fa-chart-line' : page === 'pesanan' ? 'fa-receipt' : page === 'pelanggan' ? 'fa-users' : page === 'layanan' ? 'fa-tags' : 'fa-chart-pie'}"></i> ${titles[page]}`;
    
    document.getElementById('pageContent').innerHTML = '<div class="loading"><div class="spinner"></div>Memuat data...</div>';
    
    if (page === 'dashboard') await loadDashboard();
    else if (page === 'pesanan') await loadPesanan();
    else if (page === 'pelanggan') await loadPelanggan();
    else if (page === 'layanan') await loadLayanan();
    else if (page === 'laporan') await loadLaporan();
    else if (page === 'users') await loadUsers();
}

// ============ DASHBOARD ADMIN ============
async function loadDashboard() {
    try {
        const stats = await LaundryAPI.getStatistik();
        const aktivitas = await LaundryAPI.getAktivitas();
        const pesananTerbaru = await LaundryAPI.getPesanan({ limit: 5 });
        
        const html = `
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-receipt"></i></div><div class="stat-value">${stats.totalPesanan || 0}</div><div class="stat-label">Total Pesanan</div></div>
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-money-bill-wave"></i></div><div class="stat-value">${formatRupiah(stats.totalPendapatan || 0)}</div><div class="stat-label">Total Pendapatan</div></div>
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-spinner"></i></div><div class="stat-value">${stats.pesananProses || 0}</div><div class="stat-label">Dalam Proses</div></div>
                <div class="stat-card"><div class="stat-icon"><i class="fas fa-users"></i></div><div class="stat-value">${stats.totalPelanggan || 0}</div><div class="stat-label">Total Pelanggan</div></div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                <div class="glass-card"><div class="card-header"><span><i class="fas fa-chart-line"></i> Pendapatan 7 Hari</span></div><div class="card-body"><canvas id="revenueChart" style="max-height: 250px;"></canvas></div></div>
                <div class="glass-card"><div class="card-header"><span><i class="fas fa-chart-pie"></i> Status Pesanan</span></div><div class="card-body"><canvas id="statusChart" style="max-height: 250px;"></canvas></div></div>
            </div>
            
            <div class="glass-card"><div class="card-header"><span><i class="fas fa-clock"></i> Pesanan Terbaru</span><button class="btn btn-sm btn-outline" onclick="loadPage('pesanan')">Lihat Semua</button></div>
            <div class="card-body" style="padding:0;"><div class="table-wrapper"><table class="table"><thead><tr><th>Kode</th><th>Pelanggan</th><th>Total</th><th>Status</th><th>Tanggal</th></tr></thead><tbody>
                ${pesananTerbaru.map(p => `<tr><td><strong>${p.kode}</strong></td><td>${p.pelangganNama}</td><td>${formatRupiah(p.totalBayar)}</td><td>${getStatusBadge(p.status)}</td><td>${p.tanggalMasuk || p.tanggalPesan}</td>`).join('')}
                ${pesananTerbaru.length === 0 ? '<tr><td colspan="5" class="text-center">Belum ada pesanan</td>' : ''}
            </tbody></table></div></div></div>
            
            <div class="glass-card"><div class="card-header"><span><i class="fas fa-history"></i> Aktivitas Terkini</span></div><div class="card-body">
                ${aktivitas.slice(0, 10).map(a => `<p style="margin-bottom:12px;">📌 ${a.deskripsi} <span style="color:#64748B; font-size:11px;">- ${formatDateTime(a.createdAt)}</span></p>`).join('')}
                ${aktivitas.length === 0 ? '<p class="text-muted">Belum ada aktivitas</p>' : ''}
            </div></div>
        `;
        
        document.getElementById('pageContent').innerHTML = html;
        
        if (typeof Chart !== 'undefined') {
            new Chart(document.getElementById('revenueChart'), {
                type: 'line',
                data: { labels: stats.pendapatanPerHari?.map(d=>d.tanggal) || [], datasets: [{ label: 'Pendapatan', data: stats.pendapatanPerHari?.map(d=>d.total) || [], borderColor: '#3B82F6', tension: 0.4, fill: true, backgroundColor: 'rgba(59,130,246,0.1)' }] }
            });
            new Chart(document.getElementById('statusChart'), {
                type: 'doughnut',
                data: { labels: ['Menunggu', 'Proses', 'Selesai', 'Diambil'], datasets: [{ data: [stats.pesananMenunggu||0, stats.pesananProses||0, stats.pesananSelesai||0, stats.pesananDiambil||0], backgroundColor: ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6'] }] }
            });
        }
    } catch(e) {
        document.getElementById('pageContent').innerHTML = `<div style="color:red;">Error: ${e.message}</div>`;
    }
}

// ============ MANAJEMEN PESANAN (DENGAN FITUR TIMBANG) ============
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
            <div class="card-body" style="padding:0;"><div class="table-wrapper"><table class="table"><thead><tr><th>Kode</th><th>Pelanggan</th><th>Layanan</th><th>Berat</th><th>Total</th><th>Status</th><th>Pembayaran</th><th>Aksi</th><tr></thead><tbody id="pesananTableBody">${pesanan.map(p => renderPesananRow(p)).join('')}</tbody></table></div></div></div>
        `;
        document.getElementById('pageContent').innerHTML = html;
        window.filterPesanan = filterPesanan;
    } catch(e) {
        document.getElementById('pageContent').innerHTML = `<div style="color:red;">Error: ${e.message}</div>`;
    }
}

// RENDER PESANAN ROW - DENGAN TOMBOL TIMBANG UNTUK ADMIN
function renderPesananRow(p) {
    return `
        <tr>
            <td><strong>${p.kode}</strong></td>
            <td>${p.pelangganNama}<br><small class="text-muted">${p.pelangganHp || ''}</small></td>
            <td>${p.layananNama}</td>
            <td>${p.berat ? p.berat + ' kg' : '<span style="color:#F59E0B;">Belum ditimbang</span>'}</td>
            <td>${p.totalBayar ? formatRupiah(p.totalBayar) : '-'}</td>
            <td>${getStatusBadge(p.status)}</td>
            <td>${getPaymentBadge(p.statusPembayaran)}</td>
            <td class="action-buttons">
                ${!p.berat ? `<button class="btn btn-sm btn-warning" onclick="openInputBeratAdmin(${p.id})"><i class="fas fa-weight-hanging"></i> Timbang</button>` : ''}
                <button class="btn btn-sm btn-primary" onclick="editPesanan(${p.id})"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn btn-sm btn-danger" onclick="hapusPesanan(${p.id})"><i class="fas fa-trash"></i> Hapus</button>
            </td>
        </tr>
    `;
}

function filterPesanan() {
    const search = document.getElementById('searchPesanan')?.value.toLowerCase() || '';
    const status = document.getElementById('statusFilter')?.value || '';
    const filtered = (currentPageData.pesanan || []).filter(p => {
        const matchSearch = p.kode.toLowerCase().includes(search) || p.pelangganNama.toLowerCase().includes(search);
        const matchStatus = !status || p.status === status;
        return matchSearch && matchStatus;
    });
    const tbody = document.getElementById('pesananTableBody');
    if (tbody) tbody.innerHTML = filtered.map(p => renderPesananRow(p)).join('') || '<tr><td colspan="8" class="text-center">Tidak ada数据</td>';
}

// ============ FITUR TIMBANG UNTUK ADMIN ============
window.openInputBeratAdmin = function(orderId) {
    const pesanan = currentPageData.pesanan || [];
    const order = pesanan.find(p => p.id === orderId);
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
            <button class="btn btn-primary" onclick="saveBeratAdmin(${orderId})">Simpan & Proses</button>
        </div>
    `;
    
    openModal(html, 'Input Berat Pesanan (Admin)');
    
    document.getElementById('berat').addEventListener('input', function() {
        const berat = parseFloat(this.value) || 0;
        const total = berat * order.hargaPerKg;
        document.getElementById('totalDisplay').value = formatRupiah(total);
    });
};

window.saveBeratAdmin = async function(orderId) {
    const berat = parseFloat(document.getElementById('berat').value);
    if (!berat || berat <= 0) {
        showToast('error', 'Masukkan berat yang valid!');
        return;
    }
    
    const pesanan = currentPageData.pesanan || [];
    const order = pesanan.find(p => p.id === orderId);
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
        loadPage('pesanan');
    } catch(e) {
        showToast('error', e.message);
    }
};

// ============ CRUD PESANAN LAINNYA ============
window.showTambahPesanan = async function() {
    const pelanggan = await LaundryAPI.getPelanggan();
    const layanan = await LaundryAPI.getLayanan();
    const html = `
        <form id="formPesanan">
            <div class="form-group"><label class="form-label">Pelanggan</label><select id="pelangganId" class="form-control" required><option value="">Pilih Pelanggan</option>${pelanggan.map(p => `<option value="${p.id}" data-nama="${p.nama}" data-hp="${p.no_hp}">${p.nama} - ${p.no_hp}</option>`).join('')}</select></div>
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
        pelangganId: parseInt(pelangganId), pelangganNama: selectedPelanggan.nama, pelangganHp: selectedPelanggan.no_hp,
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
    const html = `
        <form><div class="form-group"><label class="form-label">Status</label><select id="status" class="form-control"><option ${p.status==='menunggu'?'selected':''}>menunggu</option><option ${p.status==='proses'?'selected':''}>proses</option><option ${p.status==='selesai'?'selected':''}>selesai</option><option ${p.status==='diambil'?'selected':''}>diambil</option></select></div>
        <div class="form-group"><label class="form-label">Status Pembayaran</label><select id="statusPembayaran" class="form-control"><option ${p.statusPembayaran==='belum'?'selected':''}>belum</option><option ${p.statusPembayaran==='lunas'?'selected':''}>lunas</option></select></div>
        <div class="form-group"><label class="form-label">Catatan</label><textarea id="catatan" class="form-control" rows="2">${p.catatan || ''}</textarea></div></form>
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
            <div class="card-body" style="padding:0;"><div class="table-wrapper"><table class="table"><thead><tr><th>Nama</th><th>Email</th><th>No HP</th><th>Alamat</th><th>Poin</th><th>Aksi</th></tr></thead><tbody id="pelangganTableBody">${pelanggan.map(p => renderPelangganRow(p)).join('')}</tbody></table></div></div></div>
        `;
        document.getElementById('pageContent').innerHTML = html;
        window.filterPelanggan = filterPelanggan;
    } catch(e) { document.getElementById('pageContent').innerHTML = `<div style="color:red;">Error: ${e.message}</div>`; }
}

function renderPelangganRow(p) {
    return `<tr><td><strong>${p.nama}</strong></td><td>${p.email || '-'}</td><td>${p.no_hp}</td><td>${p.alamat || '-'}</td><td>${p.poin || 0}</td><td class="action-buttons"><button class="btn btn-sm btn-primary" onclick="editPelanggan(${p.id})"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger" onclick="hapusPelanggan(${p.id})"><i class="fas fa-trash"></i></button></td></td>`;
}

function filterPelanggan() {
    const search = document.getElementById('searchPelanggan')?.value.toLowerCase() || '';
    const filtered = (currentPageData.pelanggan || []).filter(p => p.nama.toLowerCase().includes(search) || p.no_hp.includes(search));
    const tbody = document.getElementById('pelangganTableBody');
    if (tbody) tbody.innerHTML = filtered.map(p => renderPelangganRow(p)).join('') || '<tr><td colspan="6" class="text-center">Tidak ada数据</td>';
}

window.showTambahPelanggan = function() {
    const html = `<form><div class="form-group"><label class="form-label">Nama</label><input id="nama" class="form-control" required></div><div class="form-group"><label class="form-label">Email</label><input id="email" type="email" class="form-control"></div><div class="form-group"><label class="form-label">No HP</label><input id="no_hp" class="form-control" required></div><div class="form-group"><label class="form-label">Alamat</label><textarea id="alamat" class="form-control" rows="2"></textarea></div><div class="modal-footer"><button class="btn btn-outline" onclick="closeModal('dynamicModal')">Batal</button><button class="btn btn-primary" onclick="simpanPelanggan()">Simpan</button></div></form>`;
    openModal(html, 'Tambah Pelanggan');
    window.simpanPelanggan = async function() {
        const data = { nama: document.getElementById('nama').value, email: document.getElementById('email').value, no_hp: document.getElementById('no_hp').value, alamat: document.getElementById('alamat').value };
        try {
            await LaundryAPI.addPelanggan(data);
            closeModal('dynamicModal');
            showToast('success', 'Pelanggan ditambahkan');
            loadPage('pelanggan');
        } catch(e) { showToast('error', e.message); }
    };
};

window.editPelanggan = async function(id) {
    const pelanggan = await LaundryAPI.getPelanggan();
    const p = pelanggan.find(p => p.id === id);
    const html = `<form><div class="form-group"><label class="form-label">Nama</label><input id="nama" class="form-control" value="${p.nama}" required></div><div class="form-group"><label class="form-label">Email</label><input id="email" class="form-control" value="${p.email || ''}"></div><div class="form-group"><label class="form-label">No HP</label><input id="no_hp" class="form-control" value="${p.no_hp}" required></div><div class="form-group"><label class="form-label">Alamat</label><textarea id="alamat" class="form-control" rows="2">${p.alamat || ''}</textarea></div><div class="modal-footer"><button class="btn btn-outline" onclick="closeModal('dynamicModal')">Batal</button><button class="btn btn-primary" onclick="updatePelanggan(${id})">Update</button></div></form>`;
    openModal(html, 'Edit Pelanggan');
    window.updatePelanggan = async function(pelId) {
        const data = { nama: document.getElementById('nama').value, email: document.getElementById('email').value, no_hp: document.getElementById('no_hp').value, alamat: document.getElementById('alamat').value };
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
            <div class="card-body" style="padding:0;"><div class="table-wrapper"><table class="table"><thead><tr><th>Nama</th><th>Harga/kg</th><th>Estimasi</th><th>Deskripsi</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${layanan.map(l => renderLayananRow(l)).join('')}</tbody></table></div></div></div>
        `;
        document.getElementById('pageContent').innerHTML = html;
    } catch(e) { document.getElementById('pageContent').innerHTML = `<div style="color:red;">Error: ${e.message}</div>`; }
}

function renderLayananRow(l) {
    return `<tr><td><strong>${l.nama}</strong></td><td>${formatRupiah(l.harga)}</td><td>${l.estimasi}</td><td>${l.deskripsi || '-'}</td><td>${getStatusBadge(l.status)}</td><td class="action-buttons"><button class="btn btn-sm btn-primary" onclick="editLayanan(${l.id})"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger" onclick="hapusLayanan(${l.id})"><i class="fas fa-trash"></i></button></td></tr>`;
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
        const stats = await LaundryAPI.getStatistik();
        const pesanan = await LaundryAPI.getPesanan();
        const layananCount = {};
        pesanan.forEach(p => { layananCount[p.layananNama] = (layananCount[p.layananNama] || 0) + 1; });
        const topLayanan = Object.entries(layananCount).sort((a,b)=>b[1]-a[1]).slice(0,5);
        
        const html = `
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-value">${stats.totalPesanan || 0}</div><div class="stat-label">Total Pesanan</div></div>
                <div class="stat-card"><div class="stat-value">${formatRupiah(stats.totalPendapatan || 0)}</div><div class="stat-label">Total Pendapatan</div></div>
                <div class="stat-card"><div class="stat-value">${stats.totalPelanggan || 0}</div><div class="stat-label">Pelanggan</div></div>
                <div class="stat-card"><div class="stat-value">${stats.totalLayanan || 0}</div><div class="stat-label">Layanan</div></div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                <div class="glass-card"><div class="card-header"><span><i class="fas fa-chart-pie"></i> Status Pesanan</span></div><div class="card-body"><canvas id="laporanChart"></canvas></div></div>
                <div class="glass-card"><div class="card-header"><span><i class="fas fa-trophy"></i> Layanan Terpopuler</span></div><div class="card-body">${topLayanan.map(([nama,count]) => `<div style="margin-bottom:1rem;"><div>${nama} - ${count} pesanan</div><div class="progress" style="height:8px; background:#334155; border-radius:4px; margin-top:5px;"><div style="width:${(count/pesanan.length)*100}%; height:100%; background:#3B82F6; border-radius:4px;"></div></div></div>`).join('')}${topLayanan.length===0?'<p class="text-center">Belum ada data</p>':''}</div></div>
            </div>
            <div class="glass-card" style="margin-top:1.5rem;"><div class="card-header"><span><i class="fas fa-download"></i> Export Laporan</span></div><div class="card-body"><div style="display:flex; gap:1rem;"><button class="btn btn-outline" onclick="exportToPDF()"><i class="fas fa-file-pdf"></i> PDF</button><button class="btn btn-outline" onclick="exportToExcel()"><i class="fas fa-file-excel"></i> Excel</button><button class="btn btn-outline" onclick="window.print()"><i class="fas fa-print"></i> Print</button></div></div></div>
        `;
        document.getElementById('pageContent').innerHTML = html;
        if (typeof Chart !== 'undefined') {
            new Chart(document.getElementById('laporanChart'), {
                type: 'doughnut',
                data: { labels: ['Menunggu', 'Proses', 'Selesai', 'Diambil'], datasets: [{ data: [stats.pesananMenunggu||0, stats.pesananProses||0, stats.pesananSelesai||0, stats.pesananDiambil||0], backgroundColor: ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6'] }] }
            });
        }
    } catch(e) { document.getElementById('pageContent').innerHTML = `<div style="color:red;">Error: ${e.message}</div>`; }
}

function exportToPDF() { alert('Fitur export PDF akan segera hadir'); }
function exportToExcel() { alert('Fitur export Excel akan segera hadir'); }

// ============ MANAJEMEN USER ============
async function loadUsers() {
    try {
        const users = await LaundryAPI.getUsers();
        currentPageData.users = users;
        const html = `
            <div style="margin-bottom:1rem;"><button class="btn btn-primary" onclick="showTambahUser()"><i class="fas fa-plus"></i> Tambah User</button></div>
            <div class="glass-card"><div class="card-header"><span><i class="fas fa-user-cog"></i> Daftar User</span></div>
            <div class="card-body" style="padding:0;"><div class="table-wrapper"><table class="table"><thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>No HP</th><th>Aksi</th></tr></thead><tbody>${users.map(u => `<tr><td><strong>${u.nama}</strong></td><td>${u.email}</td><td>${getRoleBadge(u.role)}</td><td>${u.no_hp || '-'}</td><td class="action-buttons"><button class="btn btn-sm btn-danger" onclick="hapusUser(${u.id})"><i class="fas fa-trash"></i></button></td></tr>`).join('')}</tbody></table></div></div></div>
        `;
        document.getElementById('pageContent').innerHTML = html;
    } catch(e) { document.getElementById('pageContent').innerHTML = `<div style="color:red;">Error: ${e.message}</div>`; }
}

window.showTambahUser = function() {
    const html = `<form><div class="form-group"><label class="form-label">Nama</label><input id="nama" class="form-control" required></div><div class="form-group"><label class="form-label">Email</label><input id="email" type="email" class="form-control" required></div><div class="form-group"><label class="form-label">Password</label><input id="password" type="password" class="form-control" required></div><div class="form-group"><label class="form-label">Role</label><select id="role" class="form-control"><option value="pelanggan">Pelanggan</option><option value="karyawan">Karyawan</option><option value="admin">Admin</option></select></div><div class="form-group"><label class="form-label">No HP</label><input id="no_hp" class="form-control"></div><div class="modal-footer"><button class="btn btn-outline" onclick="closeModal('dynamicModal')">Batal</button><button class="btn btn-primary" onclick="simpanUser()">Simpan</button></div></form>`;
    openModal(html, 'Tambah User');
    window.simpanUser = async function() {
        const data = { nama: document.getElementById('nama').value, email: document.getElementById('email').value, password: document.getElementById('password').value, role: document.getElementById('role').value, no_hp: document.getElementById('no_hp').value };
        const response = await fetch('http://localhost:3000/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const result = await response.json();
        if (result.success) { closeModal('dynamicModal'); showToast('success', 'User ditambahkan'); loadPage('users'); }
        else showToast('error', result.message);
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

window.loadPage = loadPage;
window.closeModal = closeModal;
window.openInputBeratAdmin = openInputBeratAdmin;
window.saveBeratAdmin = saveBeratAdmin;