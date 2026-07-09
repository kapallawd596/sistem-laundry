/**
 * PELANGGAN DASHBOARD - Laundry int
 * Fitur: Pesan Laundry, Tracking, Struk, PEMBAYARAN LENGKAP
 * FIXED: Hapus duplikasi currentUser, myOrders, layananList, map
 * Semua logika app ada di sini; pelanggan.html hanya muat file ini
 */

// ============ VARIABLES (hanya dideklarasi 1x di sini) ============
let currentUser = null;
let myOrders = [];
let layananList = [];
let currentPage = 'dashboard';
let map = null;

// ============ HELPER FUNCTIONS ============
function formatRupiah(angka) {
    if (angka === undefined || angka === null) return 'Rp 0';
    return 'Rp ' + Number(angka).toLocaleString('id-ID');
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

function getStatusBadge(status) {
    const map = {
        'menunggu': '<span class="badge badge-warning">⏳ Menunggu</span>',
        'proses': '<span class="badge badge-info">🔄 Diproses</span>',
        'selesai': '<span class="badge badge-success">✅ Selesai</span>',
        'diambil': '<span class="badge badge-success">📦 Diambil</span>'
    };
    return map[status] || `<span class="badge">${status}</span>`;
}

function getPaymentBadge(status) {
    return status === 'lunas'
        ? '<span class="badge badge-success">✅ Lunas</span>'
        : '<span class="badge badge-warning">⏳ Belum Lunas</span>';
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'Selamat Pagi';
    if (hour >= 11 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
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

function updateDateTime() {
    const now = new Date();
    const timeEl = document.getElementById('currentTime');
    const dateEl = document.getElementById('currentDate');
    if (timeEl) timeEl.innerText = now.toLocaleTimeString('id-ID', { hour12: false });
    if (dateEl) dateEl.innerText = now.toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
}

function syncBottomNav(page) {
    document.querySelectorAll('.bottom-nav-item').forEach(function(b) {
        b.classList.remove('active');
    });
    const btn = document.querySelector(`.bottom-nav-item[data-page="${page}"]`);
    if (btn) btn.classList.add('active');
}

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', async () => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try { currentUser = JSON.parse(savedUser); } catch(e) {}
    }

    if (!currentUser || currentUser.role !== 'pelanggan') {
        window.location.href = '/login.html';
        return;
    }

    // Update UI dengan data user
    const userNameEl = document.getElementById('userName');
    const userAvatarEl = document.getElementById('userAvatar');
    const mobileUserNameEl = document.getElementById('mobileUserName');
    const mobileUserAvatarEl = document.getElementById('mobileUserAvatar');

    if (userNameEl) userNameEl.innerText = currentUser.nama || 'Pelanggan';
    if (userAvatarEl) userAvatarEl.innerText = (currentUser.nama || 'P').charAt(0).toUpperCase();
    if (mobileUserNameEl) mobileUserNameEl.innerText = currentUser.nama || 'Pelanggan';
    if (mobileUserAvatarEl) mobileUserAvatarEl.innerText = (currentUser.nama || 'P').charAt(0).toUpperCase();

    await loadData();
    await renderDashboard();

    // Sidebar menu navigation
    document.querySelectorAll('.menu-item[data-page]').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.getAttribute('data-page');
            loadPage(page);
        });
    });

    // Bottom nav navigation
    document.querySelectorAll('.bottom-nav-item[data-page]').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.getAttribute('data-page');
            loadPage(page);
        });
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            window.location.href = '/login.html';
        });
    }

    setInterval(updateDateTime, 1000);
    updateDateTime();
    createParticles();
});

async function loadData() {
    try {
        myOrders = await LaundryAPI.getPesanan();
        layananList = await LaundryAPI.getLayanan();
    } catch(e) {
        console.error('Error loading data:', e);
        myOrders = myOrders || [];
        layananList = layananList || [];
    }
}

// ============================================================
// PAGE LOADER
// ============================================================
async function loadPage(page) {
    currentPage = page;

    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    const menuItem = document.querySelector(`.menu-item[data-page="${page}"]`);
    if (menuItem) menuItem.classList.add('active');

    syncBottomNav(page);

    const titles = {
        dashboard: 'Dashboard Saya',
        order: 'Pesan Laundry',
        pesanan: 'Pesanan Saya',
        tracking: 'Tracking Pesanan',
        profile: 'Profil Saya',
        map: 'Cek Lokasi Laundry',
        settings: 'Pengaturan Akun'
    };

    const icons = {
        dashboard: 'fa-chart-line',
        order: 'fa-cart-plus',
        pesanan: 'fa-receipt',
        tracking: 'fa-map-marker-alt',
        profile: 'fa-user',
        map: 'fa-location-dot',
        settings: 'fa-cog'
    };

    const pageTitleEl = document.getElementById('pageTitle');
    if (pageTitleEl) {
        pageTitleEl.innerHTML = `<i class="fas ${icons[page] || 'fa-home'}"></i> ${titles[page] || 'Dashboard'}`;
    }

    const mobileTitleEl = document.getElementById('mobileTitleText');
    const mobileIconEl = document.getElementById('mobileHeaderIcon');
    if (mobileTitleEl) mobileTitleEl.innerText = titles[page] || 'Dashboard';
    if (mobileIconEl) mobileIconEl.className = `fas ${icons[page] || 'fa-home'}`;

    const pageContent = document.getElementById('pageContent');
    if (pageContent) {
        pageContent.innerHTML = '<div class="loading"><div class="spinner"></div>Memuat data...</div>';
    }

    await loadData();

    if (page === 'dashboard') await renderDashboard();
    else if (page === 'order') await renderOrderForm();
    else if (page === 'pesanan') await renderPesanan();
    else if (page === 'tracking') await renderTracking();
    else if (page === 'profile') await renderProfile();
    else if (page === 'map') await renderMap();
    else if (page === 'settings') await loadSettings();
}

// ============================================================
// DASHBOARD
// ============================================================
async function renderDashboard() {
    const stats = {
        total: myOrders.length,
        menunggu: myOrders.filter(o => o.status === 'menunggu').length,
        proses: myOrders.filter(o => o.status === 'proses').length,
        selesai: myOrders.filter(o => o.status === 'selesai' || o.status === 'diambil').length
    };
    const latestOrders = myOrders.slice(0, 5);

    const html = `
        <div style="background:linear-gradient(135deg,rgba(59,130,246,0.12),rgba(6,182,212,0.06));border-radius:14px;padding:16px 18px;margin-bottom:16px;">
            <h2 style="font-size:1.2rem;margin-bottom:2px;">${getGreeting()}, ${currentUser.nama}! 👋</h2>
            <p style="color:#94a3b8;font-size:0.8rem;">Pesan laundry, kami jemput, cuci bersih, antar kembali!</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card"><div class="stat-value">${stats.total}</div><div class="stat-label">Total Pesanan</div></div>
            <div class="stat-card"><div class="stat-value">${stats.menunggu}</div><div class="stat-label">Menunggu</div></div>
            <div class="stat-card"><div class="stat-value">${stats.proses}</div><div class="stat-label">Diproses</div></div>
            <div class="stat-card"><div class="stat-value">${stats.selesai}</div><div class="stat-label">Selesai</div></div>
        </div>

        <div class="glass-card">
            <div class="card-header">
                <span><i class="fas fa-clock"></i> Pesanan Terbaru</span>
                <button class="btn btn-sm btn-outline" onclick="loadPage('pesanan')">Lihat Semua</button>
            </div>
            <div class="card-body">
                <div class="table-wrap">
                    <table>
                        <thead><tr><th>Kode</th><th>Layanan</th><th>Berat</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead>
                        <tbody>
                            ${latestOrders.map(o => `
                                <tr>
                                    <td><strong>${o.kode}</strong></td>
                                    <td>${o.layananNama || '-'}</td>
                                    <td>${o.berat ? o.berat + ' kg' : '-'}</td>
                                    <td>${o.totalBayar ? formatRupiah(o.totalBayar) : '-'}</td>
                                    <td>${getStatusBadge(o.status)}</td>
                                    <td><button class="btn btn-sm btn-primary" onclick="trackOrder(${o.id})"><i class="fas fa-map-marker-alt"></i> Tracking</button></td>
                                </tr>
                            `).join('')}
                            ${latestOrders.length === 0 ? '<tr><td colspan="6" class="text-center" style="padding:16px;color:#64748b;">Belum ada pesanan. Klik "Pesan Laundry"!</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
}

// ============================================================
// ORDER FORM
// ============================================================
async function renderOrderForm() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    const html = `
        <div class="glass-card">
            <div class="card-header"><span><i class="fas fa-cart-plus"></i> Form Pemesanan Laundry</span></div>
            <div class="card-body">
                <form id="orderForm">
                    <div class="form-group">
                        <label class="form-label required">Pilih Layanan</label>
                        <select id="layananId" class="form-control" required onchange="hitungEstimasi()">
                            <option value="">Pilih Layanan</option>
                            ${layananList.map(l => `<option value="${l.id}" data-harga="${l.harga}" data-estimasi="${l.estimasi}">${l.nama} - ${formatRupiah(l.harga)}/kg (${l.estimasi})</option>`).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label required">Tanggal Jemput</label>
                        <input type="date" id="jadwalJemput" class="form-control" min="${minDate}" required>
                        <small class="text-muted" style="font-size:0.65rem;">Pilih tanggal karyawan kami menjemput pakaian Anda</small>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Jam Jemput (estimasi)</label>
                        <select id="jamJemput" class="form-control">
                            <option value="08:00 - 10:00">08:00 - 10:00 (Pagi)</option>
                            <option value="10:00 - 12:00">10:00 - 12:00 (Siang)</option>
                            <option value="13:00 - 15:00">13:00 - 15:00 (Sore)</option>
                            <option value="15:00 - 17:00">15:00 - 17:00 (Sore Akhir)</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Alamat Lengkap</label>
                        <textarea id="alamatLengkap" class="form-control" rows="3" placeholder="Jl. Contoh No. 123, RT/RW, Kelurahan, Kecamatan, Kota">${currentUser.alamat || ''}</textarea>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Estimasi Selesai</label>
                        <div id="estimasiDisplay" style="padding:8px 12px;background:rgba(59,130,246,0.06);border-radius:8px;color:#60A5FA;font-size:0.8rem;">
                            Pilih layanan terlebih dahulu
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Catatan (opsional)</label>
                        <textarea id="catatan" class="form-control" rows="2" placeholder="Contoh: pakaian banyak noda, hati-hati dengan pakaian putih, dll"></textarea>
                    </div>

                    <button type="submit" class="btn btn-primary btn-block"><i class="fas fa-paper-plane"></i> Pesan Sekarang</button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;

    window.hitungEstimasi = function() {
        const select = document.getElementById('layananId');
        const estimasi = select.options[select.selectedIndex]?.dataset?.estimasi || '';
        document.getElementById('estimasiDisplay').innerHTML = estimasi
            ? `⏱️ Estimasi selesai: ${estimasi}`
            : 'Pilih layanan terlebih dahulu';
    };

    document.getElementById('orderForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const layananId = document.getElementById('layananId').value;
        const jadwalJemputDate = document.getElementById('jadwalJemput').value;
        const jamJemput = document.getElementById('jamJemput').value;
        const alamatLengkap = document.getElementById('alamatLengkap').value;
        const catatan = document.getElementById('catatan').value;

        if (!layananId || !jadwalJemputDate) {
            showToast('error', 'Lengkapi semua data yang diperlukan!');
            return;
        }

        const selectedLayanan = layananList.find(l => l.id == layananId);
        const jadwalJemput = `${jadwalJemputDate} ${jamJemput}`;

        const newPesanan = {
            layananId: parseInt(layananId),
            layananNama: selectedLayanan.nama,
            hargaPerKg: selectedLayanan.harga,
            jadwalJemput: jadwalJemput,
            catatan: catatan,
            diskon: 0
        };

        if (alamatLengkap !== currentUser.alamat) {
            try {
                await LaundryAPI.updateProfile({ nama: currentUser.nama, no_hp: currentUser.no_hp, alamat: alamatLengkap });
                currentUser.alamat = alamatLengkap;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            } catch(e) {}
        }

        try {
            await LaundryAPI.addPesanan(newPesanan);
            showToast('success', 'Pesanan berhasil! Karyawan akan menjemput sesuai jadwal.');
            setTimeout(() => loadPage('pesanan'), 1500);
        } catch(e) {
            showToast('error', e.message);
        }
    });
}

// ============================================================
// DAFTAR PESANAN
// ============================================================
async function renderPesanan() {
    const html = `
        <div class="glass-card">
            <div class="card-header"><span><i class="fas fa-receipt"></i> Semua Pesanan Saya</span></div>
            <div class="card-body" style="padding:0;">
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr><th>Kode</th><th>Layanan</th><th>Berat</th><th>Total</th><th>Status</th><th>Pembayaran</th><th>Tanggal</th><th>Aksi</th></tr>
                        </thead>
                        <tbody>
                            ${myOrders.map(o => `
                                <tr>
                                    <td><strong>${o.kode}</strong></td>
                                    <td>${o.layananNama || '-'}</td>
                                    <td>${o.berat ? o.berat + ' kg' : '<span style="color:#f59e0b;font-size:0.65rem;">Belum ditimbang</span>'}</td>
                                    <td>${o.totalBayar ? formatRupiah(o.totalBayar) : '-'}</td>
                                    <td>${getStatusBadge(o.status)}</td>
                                    <td>${getPaymentBadge(o.statusPembayaran)}</td>
                                    <td style="font-size:0.7rem;">${formatDate(o.tanggalPesan)}</td>
                                    <td class="action-buttons">
                                        <button class="btn btn-sm btn-primary" onclick="showStruk(${o.id})"><i class="fas fa-file-invoice"></i> Struk</button>
                                        ${o.statusPembayaran === 'belum' && o.totalBayar ?
                                            `<button class="btn btn-sm btn-success" onclick="showPayment(${o.id})"><i class="fas fa-credit-card"></i> Bayar</button>` : ''}
                                        <button class="btn btn-sm btn-outline" onclick="trackOrder(${o.id})"><i class="fas fa-map-marker-alt"></i> Tracking</button>
                                    </td>
                                </tr>
                            `).join('')}
                            ${myOrders.length === 0 ? '<tr><td colspan="8" class="text-center" style="padding:16px;color:#64748b;">Belum ada pesanan. Klik "Pesan Laundry" untuk memesan!</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
}

// ============================================================
// STRUK
// ============================================================
window.showStruk = function(orderId) {
    const order = myOrders.find(o => o.id === orderId);
    if (!order) return;

    const statusText = {
        'menunggu': 'Menunggu Konfirmasi',
        'proses': 'Sedang Diproses',
        'selesai': 'Selesai - Siap Diantar',
        'diambil': 'Selesai - Sudah Diambil'
    };

    const modalHtml = `
        <div class="modal active" id="strukModal">
            <div class="modal-content" style="max-width:520px;">
                <div class="modal-header">
                    <h3 style="font-size:0.95rem;"><i class="fas fa-file-invoice"></i> Struk Pesanan</h3>
                    <button class="modal-close" onclick="closeModal('strukModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="struk-container" id="strukContainer">
                        <div class="struk-header">
                            <i class="fas fa-tshirt" style="font-size:28px;color:#3B82F6;"></i>
                            <h3 style="font-size:0.95rem;">LAUNDRY INT</h3>
                            <p style="font-size:0.6rem;color:#64748b;">Jl. Laundry No.123, Jakarta<br>Telp: (021) 1234 5678</p>
                        </div>
                        <div class="struk-divider"></div>
                        <div class="struk-row"><span><strong>Kode Pesanan</strong></span><span><strong>${order.kode}</strong></span></div>
                        <div class="struk-row"><span>Tanggal Pesan</span><span>${formatDate(order.tanggalPesan)}</span></div>
                        <div class="struk-row"><span>Status</span><span>${statusText[order.status] || order.status}</span></div>
                        <div class="struk-divider"></div>
                        <div class="struk-row"><span><strong>Data Pelanggan</strong></span><span></span></div>
                        <div class="struk-row"><span>Nama</span><span>${order.pelangganNama}</span></div>
                        <div class="struk-row"><span>No HP</span><span>${order.pelangganHp}</span></div>
                        <div class="struk-row"><span>Alamat</span><span style="text-align:right;max-width:55%;font-size:0.7rem;">${order.pelangganAlamat || '-'}</span></div>
                        <div class="struk-divider"></div>
                        <div class="struk-row"><span><strong>Detail Layanan</strong></span><span></span></div>
                        <div class="struk-row"><span>Layanan</span><span>${order.layananNama}</span></div>
                        <div class="struk-row"><span>Berat</span><span>${order.berat ? order.berat + ' kg' : '<span style="color:#f59e0b;">Belum ditimbang</span>'}</span></div>
                        <div class="struk-row"><span>Harga/kg</span><span>${formatRupiah(order.hargaPerKg)}</span></div>
                        <div class="struk-divider"></div>
                        <div class="struk-row"><span>Total Harga</span><span>${order.totalHarga ? formatRupiah(order.totalHarga) : '-'}</span></div>
                        <div class="struk-row"><span>Diskon</span><span>${formatRupiah(order.diskon || 0)}</span></div>
                        <div class="struk-row struk-total"><span><strong>TOTAL BAYAR</strong></span><span><strong>${order.totalBayar ? formatRupiah(order.totalBayar) : '-'}</strong></span></div>
                        <div class="struk-divider"></div>
                        <div class="struk-row"><span>Status Pembayaran</span><span>${order.statusPembayaran === 'lunas' ? '✅ LUNAS' : '⏳ BELUM LUNAS'}</span></div>
                        ${order.jadwalJemput ? `<div class="struk-divider"></div><div class="struk-row"><span><strong>Jadwal Jemput</strong></span><span>${order.jadwalJemput}</span></div>` : ''}
                        ${order.catatan ? `<div class="struk-row"><span>Catatan</span><span style="text-align:right;max-width:55%;font-size:0.7rem;">${order.catatan}</span></div>` : ''}
                        <div class="struk-divider"></div>
                        <div class="struk-header"><p style="font-size:0.55rem;color:#64748b;">Terima Kasih telah menggunakan Laundry int!<br>⭐ ⭐ ⭐ ⭐ ⭐</p></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-sm btn-outline" onclick="printStruk()"><i class="fas fa-print"></i> Cetak</button>
                    <button class="btn btn-sm btn-primary" onclick="downloadStrukPDF()"><i class="fas fa-file-pdf"></i> PDF</button>
                    <button class="btn btn-sm btn-outline" onclick="closeModal('strukModal')">Tutup</button>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('strukModal');
    if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    window.printStruk = function() {
        const printContent = document.getElementById('strukContainer').outerHTML;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`<html><head><title>Struk Laundry int - ${order.kode}</title></head><body>${printContent}</body></html>`);
        printWindow.document.close();
        printWindow.print();
    };

    window.downloadStrukPDF = function() {
        const element = document.getElementById('strukContainer');
        if (typeof html2pdf !== 'undefined') {
            html2pdf().set({
                margin: 0.5,
                filename: `Struk_${order.kode}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
            }).from(element).save();
        } else {
            showToast('warning', 'Library PDF sedang dimuat, coba lagi');
        }
    };
};
// ============================================================
// PEMBAYARAN — LANGSUNG TAMPIL MODAL MANUAL (Midtrans sebagai opsi)
// ============================================================
window.showPayment = function(orderId) {
    const order = myOrders.find(o => o.id === orderId);
    if (!order) return;

    // Langsung tampilkan modal manual (Midtrans sebagai opsi di dalamnya)
    _showManualPayment(order);
};

// ============================================================
// MODAL PEMBAYARAN MANUAL (dengan tombol Midtrans di dalamnya)
// ============================================================
function _showManualPayment(order) {
    const fallbackQR = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=LAUNDRY_INT%7C${order.kode}%7C${order.totalBayar}`;

    const modalHtml = `
        <div class="modal active" id="paymentModal">
            <div class="modal-content" style="max-width:500px;">
                <div class="modal-header">
                    <h3 style="font-size:0.95rem;"><i class="fas fa-credit-card"></i> Metode Pembayaran</h3>
                    <button class="modal-close" onclick="closeModal('paymentModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <!-- Informasi Pesanan -->
                    <div style="text-align:center;margin-bottom:14px;">
                        <div style="font-size:22px;font-weight:700;color:#60A5FA;">${formatRupiah(order.totalBayar)}</div>
                        <div style="color:#64748b;font-size:0.75rem;">Kode Pesanan: ${order.kode}</div>
                    </div>

                    <!-- 🔥 TOMBOL MIDTRANS (opsi utama) -->
                    <button class="btn btn-primary btn-block" style="margin-bottom:14px;padding:12px;" onclick="processMidtransPayment(${order.id})">
                        <i class="fas fa-bolt"></i> Bayar via Midtrans (GoPay, OVO, DANA, Kartu)
                    </button>

                    <div style="text-align:center;color:#64748b;font-size:0.7rem;margin-bottom:14px;">— atau pilih metode manual —</div>

                    <!-- QRIS -->
                    <div style="margin-bottom:14px;">
                        <div style="font-weight:600;margin-bottom:6px;font-size:0.8rem;"><i class="fas fa-qrcode"></i> Scan QRIS</div>
                        <div style="background:#1E293B;padding:10px;border-radius:10px;text-align:center;">
                            <img src="/images/QR.jpeg" onerror="this.src='${fallbackQR}'" style="max-width:140px;border-radius:10px;background:white;padding:6px;margin:0 auto;display:block;">
                            <p style="font-size:0.6rem;color:#94a3b8;margin-top:4px;">Scan menggunakan OVO, Dana, GoPay, ShopeePay, LinkAja</p>
                        </div>
                    </div>

                    <!-- Transfer Bank -->
                    <div style="margin-bottom:14px;">
                        <div style="font-weight:600;margin-bottom:4px;font-size:0.8rem;"><i class="fas fa-university"></i> Transfer Bank</div>
                        <div onclick="copyBankAccount('BCA', '1234567890')" style="background:rgba(59,130,246,0.04);padding:8px 12px;border-radius:8px;margin-bottom:4px;cursor:pointer;display:flex;justify-content:space-between;font-size:0.75rem;">
                            <span><i class="fas fa-building"></i> BCA - 1234567890</span>
                            <span style="color:#60A5FA;"><i class="fas fa-copy"></i> Salin</span>
                        </div>
                        <div onclick="copyBankAccount('BNI', '1234567891')" style="background:rgba(59,130,246,0.04);padding:8px 12px;border-radius:8px;cursor:pointer;display:flex;justify-content:space-between;font-size:0.75rem;">
                            <span><i class="fas fa-building"></i> BNI - 1234567891</span>
                            <span style="color:#60A5FA;"><i class="fas fa-copy"></i> Salin</span>
                        </div>
                        <button class="btn btn-primary btn-block" style="margin-top:6px;" onclick="processPayment(${order.id}, 'TRANSFER')">✅ Saya Sudah Transfer</button>
                    </div>

                    <!-- COD -->
                    <div>
                        <div style="font-weight:600;margin-bottom:4px;font-size:0.8rem;"><i class="fas fa-hand-holding-usd"></i> COD (Cash on Delivery)</div>
                        <button class="btn btn-warning btn-block" onclick="processCOD(${order.id})">💰 Bayar di Tempat (COD)</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('paymentModal');
    if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// ============================================================
// PROSES MIDTRANS (dipanggil dari tombol di modal manual)
// ============================================================
window.processMidtransPayment = async function(orderId) {
    const order = myOrders.find(o => o.id === orderId);
    if (!order) {
        showToast('error', 'Pesanan tidak ditemukan');
        return;
    }

    // Cek apakah Snap tersedia
    const snapReady = (typeof snap !== 'undefined' && typeof snap.pay === 'function')
                   || (typeof window.snap !== 'undefined' && typeof window.snap.pay === 'function');

    if (!snapReady) {
        showToast('error', '❌ Midtrans tidak tersedia. Silakan gunakan metode manual.');
        return;
    }

    showToast('info', '⏳ Menyiapkan pembayaran Midtrans...');

    try {
        const result = await LaundryAPI.createPaymentToken(orderId);

        if (result && result.success && result.token) {
            const snapObj = (typeof snap !== 'undefined' && typeof snap.pay === 'function')
                ? snap : window.snap;

            snapObj.pay(result.token, {
                onSuccess: function(res) {
                    showToast('success', '✅ Pembayaran berhasil! Terima kasih.');
                    closeModal('paymentModal');
                    setTimeout(() => { loadData(); loadPage('pesanan'); }, 1500);
                },
                onPending: function(res) {
                    showToast('warning', '⏳ Menunggu konfirmasi pembayaran...');
                    closeModal('paymentModal');
                    setTimeout(() => loadPage('pesanan'), 1000);
                },
                onError: function(res) {
                    showToast('error', '❌ Pembayaran gagal: ' + (res.status_message || 'Coba lagi'));
                    // Kembali ke modal manual
                    _showManualPayment(order);
                },
                onClose: function() {
                    showToast('info', 'ℹ️ Popup pembayaran ditutup');
                    // Kembali ke modal manual
                    _showManualPayment(order);
                }
            });
        } else {
            showToast('error', '❌ Gagal membuat pembayaran: ' + (result.error || result.message || ''));
            // Kembali ke modal manual
            _showManualPayment(order);
        }
    } catch (error) {
        console.error('Midtrans error:', error);
        showToast('error', '❌ ' + (error.message || 'Gagal memproses pembayaran'));
        // Kembali ke modal manual
        _showManualPayment(order);
    }
};

// ============================================================
// FUNGSI LAINNYA (tetap sama)
// ============================================================
window.retryMidtrans = async function(orderId) {
    // Tutup modal, lalu buka ulang dengan proses Midtrans
    closeModal('paymentModal');
    await window.processMidtransPayment(orderId);
};

window.copyEWallet = function(wallet, number) {
    navigator.clipboard.writeText(number).then(() => {
        showToast('success', `Nomor ${wallet} (${number}) sudah disalin!`);
    }).catch(() => {
        showToast('error', 'Gagal menyalin ke clipboard');
    });
};

window.copyBankAccount = function(bank, number) {
    navigator.clipboard.writeText(number).then(() => {
        showToast('success', `No Rekening ${bank} (${number}) sudah disalin!`);
    }).catch(() => {
        showToast('error', 'Gagal menyalin ke clipboard');
    });
};

window.processCOD = async function(orderId) {
    closeModal('paymentModal');
    showToast('info', 'Pesanan akan diproses. Bayar saat pesanan diantar/diambil ya!');
};

window.processPayment = async function(orderId, method) {
    try {
        await LaundryAPI.updatePesanan(orderId, { statusPembayaran: 'lunas' });
        closeModal('paymentModal');
        showToast('success', 'Pembayaran berhasil! Terima kasih.');
        await loadData();
        await loadPage('pesanan');
    } catch(e) {
        showToast('error', e.message);
    }
};

// ============================================================
// TRACKING
// ============================================================
async function renderTracking() {
    const activeOrders = myOrders.filter(o => o.status !== 'diambil');

    const html = `
        <div class="glass-card">
            <div class="card-header"><span><i class="fas fa-map-marker-alt"></i> Tracking Pesanan Aktif</span></div>
            <div class="card-body">
                ${activeOrders.length === 0
                    ? '<p class="text-center" style="color:#64748b;padding:16px;">Tidak ada pesanan aktif</p>'
                    : activeOrders.map(o => `
                        <div style="background:rgba(255,255,255,0.02);border-radius:12px;padding:14px;margin-bottom:14px;border:1px solid rgba(59,130,246,0.04);">
                            <div style="display:flex;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:6px;">
                                <div><strong style="font-size:0.9rem;">${o.kode}</strong><br><small style="color:#94a3b8;font-size:0.7rem;">${o.layananNama}</small></div>
                                ${getStatusBadge(o.status)}
                            </div>

                            <div class="tracking-steps">
                                <div class="tracking-line"><div class="line-fill" style="width:${getProgressWidth(o.status)}%;height:100%;background:linear-gradient(90deg,#10B981,#3B82F6);transition:width 0.3s;"></div></div>
                                <div style="display:flex;justify-content:space-between;position:relative;z-index:2;width:100%;">
                                    ${getTrackingStepsHTML(o.status)}
                                </div>
                            </div>

                            ${o.berat ? `<div style="margin-top:6px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.04);font-size:0.7rem;color:#94a3b8;">⚖️ Berat: ${o.berat} kg | 💰 Total: ${formatRupiah(o.totalBayar)}</div>` : ''}
                            ${o.jadwalJemput ? `<div style="margin-top:2px;font-size:0.65rem;color:#64748b;"><i class="fas fa-truck"></i> Jadwal Jemput: ${o.jadwalJemput}</div>` : ''}

                            <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
                                <button class="btn btn-sm btn-primary" onclick="showStruk(${o.id})"><i class="fas fa-file-invoice"></i> Struk</button>
                                ${o.status === 'selesai' && o.statusPembayaran === 'belum' && o.totalBayar ?
                                    `<button class="btn btn-sm btn-success" onclick="showPayment(${o.id})"><i class="fas fa-credit-card"></i> Bayar</button>` : ''}
                            </div>
                        </div>
                    `).join('')
                }
            </div>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
}

function getProgressWidth(status) {
    const steps = ['menunggu', 'proses', 'selesai', 'diambil'];
    const idx = steps.indexOf(status);
    if (idx === -1) return 0;
    return (idx / 3) * 100;
}

function getTrackingStepsHTML(currentStatus) {
    const steps = [
        { status: 'menunggu', icon: 'fa-receipt', label: 'Diterima' },
        { status: 'proses', icon: 'fa-spinner', label: 'Diproses' },
        { status: 'selesai', icon: 'fa-check-circle', label: 'Selesai' },
        { status: 'diambil', icon: 'fa-box', label: 'Diambil' }
    ];

    const currentIdx = steps.findIndex(s => s.status === currentStatus);

    return steps.map((step, idx) => {
        let stepClass = '';
        if (idx <= currentIdx) stepClass = 'completed';
        if (idx === currentIdx && currentStatus !== 'diambil') stepClass = 'active';

        return `
            <div class="tracking-step ${stepClass}">
                <div class="step-icon"><i class="fas ${step.icon}"></i></div>
                <div class="step-label">${step.label}</div>
            </div>
        `;
    }).join('');
}

//----Fungsi tarcorder-------//

window.trackOrder = function(orderId) {
    const order = myOrders.find(o => o.id === orderId);
    if (!order) return;

    const modalHtml = `
        <div class="modal active" id="trackingModal">
            <div class="modal-content" style="max-width:480px;max-height:90vh;overflow-y:auto;">
                <div class="modal-header">
                    <h3 style="font-size:0.95rem;"><i class="fas fa-map-marker-alt"></i> Tracking - ${order.kode}</h3>
                    <button class="modal-close" onclick="closeModal('trackingModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="tracking-steps" style="margin:16px 0;position:relative;">
                        <div class="tracking-line" style="position:absolute;top:17px;left:0;right:0;height:2px;background:#334155;z-index:1;">
                            <div class="line-fill" style="width:${getProgressWidth(order.status)}%;height:100%;background:linear-gradient(90deg,#10B981,#3B82F6);"></div>
                        </div>
                        <div style="display:flex;justify-content:space-between;position:relative;z-index:2;width:100%;">
                            ${getTrackingStepsHTML(order.status)}
                        </div>
                    </div>
                    
                    <div style="background:rgba(255,255,255,0.02);border-radius:10px;padding:12px;margin-top:10px;">
                        <h4 style="font-size:0.8rem;margin-bottom:6px;">Detail Pesanan</h4>
                        <div class="struk-row" style="font-size:0.75rem;"><span style="color:#94a3b8;">Layanan</span><span>${order.layananNama}</span></div>
                        <div class="struk-row" style="font-size:0.75rem;"><span style="color:#94a3b8;">Berat</span><span>${order.berat ? order.berat + ' kg' : 'Belum ditimbang'}</span></div>
                        <div class="struk-row" style="font-size:0.75rem;"><span style="color:#94a3b8;">Total</span><span>${order.totalBayar ? formatRupiah(order.totalBayar) : '-'}</span></div>
                        <div class="struk-row" style="font-size:0.75rem;"><span style="color:#94a3b8;">Jadwal Jemput</span><span>${order.jadwalJemput || '-'}</span></div>
                        ${order.catatan ? `<div class="struk-row" style="font-size:0.75rem;"><span style="color:#94a3b8;">Catatan</span><span style="text-align:right;max-width:50%;">${order.catatan}</span></div>` : ''}
                    </div>
                    
                    <!-- ✅ PETA LOKASI -->
                    <div style="margin-top:12px;">
                        <div id="trackingMapContainer" style="width:100%;height:200px;border-radius:10px;overflow:hidden;margin-bottom:8px;background:#1e293b;"></div>
                        <button class="btn btn-primary btn-block" onclick="openMapForAddress('${order.pelangganAlamat || ''}')">
                            <i class="fas fa-location-dot"></i> Lihat Lokasi di Peta
                        </button>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="closeModal('trackingModal')">Tutup</button>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('trackingModal');
    if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // ✅ Inisialisasi peta setelah modal tampil
    setTimeout(() => {
        initTrackingMap(order);
    }, 300);
};



// ============================================================
// PETA DI MODAL TRACKING
// ============================================================
function initTrackingMap(order) {
    const container = document.getElementById('trackingMapContainer');
    if (!container) return;
    
    if (typeof L === 'undefined') {
        container.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:20px;">⚠️ Peta tidak tersedia</p>';
        return;
    }
    
    if (container._leaflet_map) {
        container._leaflet_map.remove();
    }
    
    let lat = -6.2088;
    let lng = 106.8456;
    let address = order.pelangganAlamat || '';
    
    if (address) {
        const latMatch = address.match(/Lat:\s*([-\d.]+)/);
        const lngMatch = address.match(/Lng:\s*([-\d.]+)/);
        if (latMatch && lngMatch) {
            lat = parseFloat(latMatch[1]);
            lng = parseFloat(lngMatch[1]);
        }
    }
    
    try {
        const map = L.map(container).setView([lat, lng], 15);
        container._leaflet_map = map;
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);
        
        L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'custom-div-icon',
                html: '<div style="background:#3B82F6;padding:4px 10px;border-radius:14px;color:white;font-weight:bold;font-size:0.7rem;white-space:nowrap;"><i class="fas fa-map-pin"></i> Lokasi</div>',
                iconSize: [70, 24],
                popupAnchor: [0, -10]
            })
        }).addTo(map).bindPopup(`<b>${order.pelangganNama}</b><br>${address.substring(0, 100)}`).openPopup();
        
        setTimeout(() => map.invalidateSize(), 500);
        
    } catch (error) {
        console.error('Error init tracking map:', error);
        container.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:20px;">⚠️ Gagal memuat peta</p>';
    }
}
// ============================================================
// MAP
// ============================================================
async function renderMap() {
    const html = `
        <div class="glass-card">
            <div class="card-header"><span><i class="fas fa-map-marker-alt"></i> Cek Lokasi Laundry int</span></div>
            <div class="card-body">
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
                    <input type="text" id="addressSearch" placeholder="Cari alamat Anda..." style="flex:1;min-width:140px;padding:6px 10px;border-radius:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(59,130,246,0.12);color:white;font-size:0.8rem;">
                    <button class="btn btn-sm btn-primary" onclick="searchAddress()"><i class="fas fa-search"></i> Cari</button>
                    <button class="btn btn-sm btn-success" onclick="getMyLocation()"><i class="fas fa-location-dot"></i> Lokasi</button>
                </div>
                <div id="map" class="map-container"></div>
                <div id="locationInfo" style="padding:8px 12px;background:rgba(59,130,246,0.04);border-radius:8px;font-size:0.75rem;color:#94a3b8;">
                    <i class="fas fa-info-circle"></i> Klik pada peta untuk menentukan titik lokasi Anda
                </div>
                <button class="btn btn-primary btn-block" onclick="saveLocationToProfile()" style="margin-top:10px;"><i class="fas fa-save"></i> Simpan Lokasi</button>
            </div>
        </div>
    `;
    document.getElementById('pageContent').innerHTML = html;
    setTimeout(() => initMap(), 500);
}

function initMap() {
    if (map) map.remove();
    const defaultLocation = [-6.2088, 106.8456];
    map = L.map('map').setView(defaultLocation, 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    L.marker(defaultLocation, {
        icon: L.divIcon({
            className: 'custom-div-icon',
            html: '<div style="background:#3B82F6;padding:3px 10px;border-radius:14px;color:white;font-weight:bold;font-size:0.7rem;white-space:nowrap;"><i class="fas fa-store"></i> Laundry int</div>',
            iconSize: [90, 24],
            popupAnchor: [0, -10]
        })
    }).addTo(map).bindPopup('<b>🏪 Laundry int</b><br>Jl. Laundry No.123, Jakarta').openPopup();

    let selectedLat = null;
    let selectedLng = null;
    let selectedAddress = '';

    map.on('click', async (e) => {
        selectedLat = e.latlng.lat;
        selectedLng = e.latlng.lng;
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${selectedLat}&lon=${selectedLng}`);
            const data = await response.json();
            selectedAddress = data.display_name || `${selectedLat}, ${selectedLng}`;
            document.getElementById('locationInfo').innerHTML = `
                <p style="margin-bottom:2px;"><i class="fas fa-map-pin"></i> <strong>Lokasi dipilih:</strong></p>
                <p style="font-size:0.65rem;color:#94a3b8;">Lat: ${selectedLat.toFixed(6)} | Lng: ${selectedLng.toFixed(6)}</p>
                <p style="font-size:0.65rem;color:#64748b;">${selectedAddress.substring(0, 120)}</p>
            `;
            L.marker([selectedLat, selectedLng]).addTo(map).bindPopup('📍 Lokasi Anda').openPopup();
        } catch(e) {
            document.getElementById('locationInfo').innerHTML = `<p>📍 Lat: ${selectedLat.toFixed(6)} | Lng: ${selectedLng.toFixed(6)}</p>`;
        }
    });

    window.selectedLocation = () => ({ lat: selectedLat, lng: selectedLng, address: selectedAddress });
}

window.searchAddress = async function() {
    const address = document.getElementById('addressSearch').value;
    if (!address) { showToast('warning', 'Masukkan alamat yang ingin dicari'); return; }
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

window.openMapForAddress = function(alamat) {
    if (!alamat) { showToast('warning', 'Alamat belum diisi'); return; }
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(alamat)}`, '_blank');
};

window.saveLocationToProfile = async function() {
    const loc = window.selectedLocation ? window.selectedLocation() : null;
    if (!loc || !loc.lat) { showToast('warning', 'Klik dulu di peta untuk menentukan lokasi'); return; }
    const fullAddress = `${loc.address}\n(Lat: ${loc.lat.toFixed(6)}, Lng: ${loc.lng.toFixed(6)})`;
    try {
        await LaundryAPI.updateProfile({ nama: currentUser.nama, no_hp: currentUser.no_hp, alamat: fullAddress });
        currentUser.alamat = fullAddress;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showToast('success', 'Lokasi berhasil disimpan!');
    } catch(e) { showToast('error', e.message); }
};

// ============================================================
// PROFILE
// ============================================================
async function renderProfile() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) { try { currentUser = JSON.parse(savedUser); } catch(e) {} }

    const html = `
        <div class="glass-card">
            <div class="card-header"><span><i class="fas fa-user-circle"></i> Profil Saya</span><button class="btn btn-sm btn-outline" onclick="editProfile()"><i class="fas fa-edit"></i> Edit</button></div>
            <div class="card-body">
                <div class="struk-row" style="font-size:0.85rem;"><span style="color:#60A5FA;">Nama Lengkap</span><span>${currentUser.nama}</span></div>
                <div class="struk-row" style="font-size:0.85rem;"><span style="color:#60A5FA;">Email</span><span>${currentUser.email}</span></div>
                <div class="struk-row" style="font-size:0.85rem;"><span style="color:#60A5FA;">Nomor HP</span><span>${currentUser.no_hp || '-'}</span></div>
                <div class="struk-row" style="font-size:0.85rem;"><span style="color:#60A5FA;">Alamat</span><span style="text-align:right;max-width:50%;font-size:0.75rem;">${currentUser.alamat || '<span style="color:#64748b;">Belum diisi</span>'}</span></div>
            </div>
        </div>

        <div class="glass-card">
            <div class="card-header"><span><i class="fas fa-chart-simple"></i> Statistik Saya</span></div>
            <div class="card-body">
                <div style="display:grid;grid-template-columns:repeat(3,1fr);text-align:center;gap:6px;">
                    <div><div class="stat-value" style="font-size:20px;">${myOrders.length}</div><div class="stat-label" style="font-size:10px;">Total Pesanan</div></div>
                    <div><div class="stat-value" style="font-size:20px;">${myOrders.filter(o => o.status === 'selesai' || o.status === 'diambil').length}</div><div class="stat-label" style="font-size:10px;">Selesai</div></div>
                    <div><div class="stat-value" style="font-size:20px;">${formatRupiah(myOrders.reduce((sum, o) => sum + (o.totalBayar || 0), 0))}</div><div class="stat-label" style="font-size:10px;">Total Belanja</div></div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('pageContent').innerHTML = html;
}

window.editProfile = function() {
    const modalHtml = `
        <div class="modal active" id="profileModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 style="font-size:0.95rem;"><i class="fas fa-user-edit"></i> Edit Profil</h3>
                    <button class="modal-close" onclick="closeModal('profileModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group"><label class="form-label">Nama Lengkap</label><input id="nama" class="form-control" value="${currentUser.nama}" required></div>
                    <div class="form-group"><label class="form-label">Nomor HP</label><input id="no_hp" class="form-control" value="${currentUser.no_hp || ''}" required></div>
                    <div class="form-group"><label class="form-label">Alamat</label><textarea id="alamat" class="form-control" rows="3">${currentUser.alamat || ''}</textarea></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="closeModal('profileModal')">Batal</button>
                    <button class="btn btn-primary" onclick="saveProfile()">Simpan</button>
                </div>
            </div>
        </div>
    `;
    const existingModal = document.getElementById('profileModal');
    if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.saveProfile = async function() {
    const data = {
        nama: document.getElementById('nama').value,
        no_hp: document.getElementById('no_hp').value,
        alamat: document.getElementById('alamat').value
    };
    try {
        const updatedUser = await LaundryAPI.updateProfile(data);
        currentUser = updatedUser;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        const userNameEl = document.getElementById('userName');
        const userAvatarEl = document.getElementById('userAvatar');
        const mobileNameEl = document.getElementById('mobileUserName');
        const mobileAvatarEl = document.getElementById('mobileUserAvatar');
        if (userNameEl) userNameEl.innerText = currentUser.nama;
        if (userAvatarEl) userAvatarEl.innerText = currentUser.nama.charAt(0).toUpperCase();
        if (mobileNameEl) mobileNameEl.innerText = currentUser.nama;
        if (mobileAvatarEl) mobileAvatarEl.innerText = currentUser.nama.charAt(0).toUpperCase();
        closeModal('profileModal');
        showToast('success', 'Profil berhasil diperbarui!');
        await renderProfile();
    } catch(e) { showToast('error', e.message); }
};

// ============================================================
// SETTINGS
// ============================================================
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
                    <div class="form-group"><label class="form-label">Nama Lengkap</label><input type="text" id="profileNama" class="form-control" value="${currentUser.nama}"></div>
                    <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-control" value="${currentUser.email}" disabled></div>
                    <div class="form-group"><label class="form-label">Nomor HP</label><input type="tel" id="profileNoHp" class="form-control" value="${currentUser.no_hp || ''}"></div>
                    <div class="form-group"><label class="form-label">Alamat</label><textarea id="profileAlamat" class="form-control" rows="3">${currentUser.alamat || ''}</textarea></div>
                    <button class="btn btn-primary" onclick="updateProfileSettings()"><i class="fas fa-save"></i> Simpan</button>
                </div>
            </div>

            <div class="settings-card">
                <div class="settings-header"><i class="fas fa-lock"></i> Ubah Password</div>
                <div class="settings-body">
                    <div class="form-group"><label class="form-label">Password Saat Ini</label><input type="password" id="currentPassword" class="form-control" placeholder="Masukkan password saat ini"></div>
                    <div class="form-group"><label class="form-label">Password Baru</label><input type="password" id="newPassword" class="form-control" placeholder="Minimal 6 karakter" oninput="updateStrength()"><div class="password-strength" id="strengthBar"></div><small id="strengthText" style="color:#64748b;font-size:0.65rem;">Ketik password baru</small></div>
                    <div class="form-group"><label class="form-label">Konfirmasi Password Baru</label><input type="password" id="confirmNewPassword" class="form-control" placeholder="Ulangi password baru"></div>
                    <button class="btn btn-primary" onclick="changePasswordSettings()"><i class="fas fa-key"></i> Ubah Password</button>
                </div>
            </div>

            <div class="settings-card">
                <div class="settings-header"><i class="fas fa-bell"></i> Notifikasi</div>
                <div class="settings-body">
                    <div class="form-group"><label style="display:flex;justify-content:space-between;align-items:center;font-size:0.8rem;color:#f8fafc;"><span><i class="fas fa-envelope"></i> Notifikasi Email</span><label class="toggle-switch"><input type="checkbox" id="emailNotif" ${notificationSettings.emailNotifications ? 'checked' : ''}><span class="toggle-slider"></span></label></label></div>
                    <div class="form-group"><label style="display:flex;justify-content:space-between;align-items:center;font-size:0.8rem;color:#f8fafc;"><span><i class="fab fa-whatsapp"></i> Notifikasi WhatsApp</span><label class="toggle-switch"><input type="checkbox" id="waNotif" ${notificationSettings.whatsappNotifications ? 'checked' : ''}><span class="toggle-slider"></span></label></label></div>
                    <button class="btn btn-primary" onclick="saveNotificationSettings()"><i class="fas fa-save"></i> Simpan</button>
                </div>
            </div>

            <div class="settings-card">
                <div class="settings-header" style="color:#ef4444;"><i class="fas fa-trash-alt"></i> Hapus Akun</div>
                <div class="settings-body">
                    <p style="color:#94a3b8;font-size:0.75rem;margin-bottom:10px;">Peringatan: Menghapus akun akan menghapus semua data Anda secara permanen.</p>
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
        const userNameEl = document.getElementById('userName');
        const userAvatarEl = document.getElementById('userAvatar');
        const mobileNameEl = document.getElementById('mobileUserName');
        const mobileAvatarEl = document.getElementById('mobileUserAvatar');
        if (userNameEl) userNameEl.innerText = currentUser.nama;
        if (userAvatarEl) userAvatarEl.innerText = currentUser.nama.charAt(0).toUpperCase();
        if (mobileNameEl) mobileNameEl.innerText = currentUser.nama;
        if (mobileAvatarEl) mobileAvatarEl.innerText = currentUser.nama.charAt(0).toUpperCase();
        showToast('success', 'Profil berhasil diperbarui!');
        loadSettings();
    } catch(e) { showToast('error', e.message); }
};

window.updateStrength = function() {
    const password = document.getElementById('newPassword').value;
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    const bar = document.getElementById('strengthBar');
    const text = document.getElementById('strengthText');

    if (strength <= 2) {
        bar.className = 'password-strength strength-weak';
        text.innerHTML = '🔴 Password lemah';
        text.style.color = '#ef4444';
    } else if (strength <= 4) {
        bar.className = 'password-strength strength-medium';
        text.innerHTML = '🟡 Password sedang';
        text.style.color = '#f59e0b';
    } else {
        bar.className = 'password-strength strength-strong';
        text.innerHTML = '🟢 Password kuat';
        text.style.color = '#10b981';
    }
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
    const confirmed = confirm('⚠️ PERINGATAN! Apakah Anda yakin ingin menghapus akun? Semua data Anda akan hilang permanen.');
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
// EXPOSE GLOBALS
// ============================================================
window.loadPage             = loadPage;
window.trackOrder           = trackOrder;
window.showStruk            = showStruk;
window.showPayment          = showPayment;
window.retryMidtrans        = retryMidtrans;
window.processPayment       = processPayment;
window.processCOD           = processCOD;
window.copyBankAccount      = copyBankAccount;
window.copyEWallet          = copyEWallet;
window.editProfile          = editProfile;
window.saveProfile          = saveProfile;
window.openMapForAddress    = openMapForAddress;
window.searchAddress        = searchAddress;
window.getMyLocation        = getMyLocation;
window.saveLocationToProfile = saveLocationToProfile;
window.updateProfileSettings = updateProfileSettings;
window.updateStrength       = updateStrength;
window.changePasswordSettings = changePasswordSettings;
window.saveNotificationSettings = saveNotificationSettings;
window.deleteAccountSettings = deleteAccountSettings;
window.formatRupiah         = formatRupiah;
window.formatDate           = formatDate;
window.formatDateTime       = formatDateTime;
window.getStatusBadge       = getStatusBadge;
window.getPaymentBadge      = getPaymentBadge;
window.showToast            = showToast;
window.closeModal           = closeModal;
window.initTrackingMap = initTrackingMap;