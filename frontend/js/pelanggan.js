/**
 * PELANGGAN DASHBOARD - Laundry int
 * Fitur: Pesan Laundry (tanpa berat), Tracking, Struk, PEMBAYARAN LENGKAP
 */

let currentUser = null;
let myOrders = [];
let layananList = [];
let currentPage = 'dashboard';

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = auth.getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'pelanggan') {
        window.location.href = '/login.html';
        return;
    }
    
    document.getElementById('userName').innerText = currentUser.nama;
    document.getElementById('userAvatar').innerText = currentUser.nama.charAt(0).toUpperCase();
    
    await loadData();
    await renderDashboard();
    
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
        myOrders = await LaundryAPI.getPesanan();
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
        dashboard: 'Dashboard Saya', order: 'Pesan Laundry',
        pesanan: 'Pesanan Saya', tracking: 'Tracking Pesanan', profile: 'Profil Saya'
    };
    document.getElementById('pageTitle').innerHTML = `<i class="fas ${page === 'dashboard' ? 'fa-chart-line' : page === 'order' ? 'fa-cart-plus' : page === 'pesanan' ? 'fa-receipt' : page === 'tracking' ? 'fa-map-marker-alt' : 'fa-user'}"></i> ${titles[page]}`;
    
    document.getElementById('pageContent').innerHTML = '<div class="loading"><div class="spinner"></div>Memuat data...</div>';
    
    if (page === 'dashboard') await renderDashboard();
    else if (page === 'order') await renderOrderForm();
    else if (page === 'pesanan') await renderPesanan();
    else if (page === 'tracking') await renderTracking();
    else if (page === 'profile') await renderProfile();
}

// ============ DASHBOARD ============
async function renderDashboard() {
    await loadData();
    
    const stats = {
        total: myOrders.length,
        menunggu: myOrders.filter(o => o.status === 'menunggu').length,
        proses: myOrders.filter(o => o.status === 'proses').length,
        selesai: myOrders.filter(o => o.status === 'selesai' || o.status === 'diambil').length
    };
    const latestOrders = myOrders.slice(0, 5);
    
    const html = `
        <div style="background: linear-gradient(135deg, rgba(59,130,246,0.2), rgba(6,182,212,0.1)); border-radius: 20px; padding: 25px; margin-bottom: 25px;">
            <h1 style="font-size: 28px; margin-bottom: 8px;">${getGreeting()}, ${currentUser.nama}! 👋</h1>
            <p style="color: #94A3B8;">Pesan laundry, kami jemput, cuci bersih, antar kembali!</p>
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
            <div class="card-body" style="padding:0;">
                <div class="table-wrapper">
                    <table class="table">
                        <thead><tr><th>Kode</th><th>Layanan</th><th>Berat</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead>
                        <tbody>
                            ${latestOrders.map(o => `
                                <tr>
                                    <td><strong>${o.kode}</strong></td>
                                    <td>${o.layananNama}</td>
                                    <td>${o.berat ? o.berat + ' kg' : '-'}</td>
                                    <td>${o.totalBayar ? formatRupiah(o.totalBayar) : '-'}</td>
                                    <td>${getStatusBadge(o.status)}</td>
                                    <td><button class="btn btn-sm btn-primary" onclick="trackOrder(${o.id})"><i class="fas fa-map-marker-alt"></i> Tracking</button>
                                        <td>
                                </tr>
                            `).join('')}
                            ${latestOrders.length === 0 ? '<tr><td colspan="6" class="text-center">Belum ada pesanan. Klik "Pesan Laundry"!</td>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <div class="glass-card">
            <div class="card-header"><span><i class="fas fa-info-circle"></i> Info Layanan</span></div>
            <div class="card-body">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div><i class="fas fa-truck" style="color: #60A5FA;"></i> Antar Jemput Gratis</div>
                    <div><i class="fas fa-clock" style="color: #60A5FA;"></i> Express 3 Jam</div>
                    <div><i class="fas fa-gem" style="color: #60A5FA;"></i> Deterjen Premium</div>
                    <div><i class="fas fa-shield-alt" style="color: #60A5FA;"></i> Garansi 100%</div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('pageContent').innerHTML = html;
}

// ============ FORM PESAN LAUNDRY (TANPA BERAT) ============
async function renderOrderForm() {
    await loadData();
    
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
                        <small style="color:#64748B;">Pilih tanggal karyawan kami menjemput pakaian Anda</small>
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
                        <label class="form-label">Estimasi Selesai</label>
                        <div id="estimasiDisplay" style="padding: 12px; background: rgba(59,130,246,0.1); border-radius: 12px; color: #60A5FA;">
                            Pilih layanan terlebih dahulu
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Catatan (opsional)</label>
                        <textarea id="catatan" class="form-control" rows="2" placeholder="Contoh: pakaian banyak noda, hati-hati dengan pakaian putih, dll"></textarea>
                    </div>
                    
                    <div style="background: rgba(59,130,246,0.08); padding: 15px; border-radius: 12px; margin-bottom: 20px;">
                        <p style="margin-bottom: 5px;"><i class="fas fa-info-circle"></i> <strong>Informasi Penting:</strong></p>
                        <ul style="margin-left: 20px; color: #94A3B8; font-size: 12px;">
                            <li>Berat akan ditimbang oleh karyawan di toko setelah penjemputan</li>
                            <li>Total harga akan dihitung setelah timbangan</li>
                            <li>Anda bisa lihat struk & total bayar di menu "Pesanan Saya"</li>
                            <li>Pembayaran bisa COD atau via QRIS/E-Wallet/Transfer</li>
                        </ul>
                    </div>
                    
                    <button type="submit" class="btn btn-primary btn-block" style="width:100%;"><i class="fas fa-paper-plane"></i> Pesan Sekarang</button>
                </form>
            </div>
        </div>
    `;
    
    document.getElementById('pageContent').innerHTML = html;
    
    window.hitungEstimasi = function() {
        const select = document.getElementById('layananId');
        const estimasi = select.options[select.selectedIndex]?.dataset?.estimasi || '';
        document.getElementById('estimasiDisplay').innerHTML = estimasi ? `⏱️ Estimasi selesai: ${estimasi}` : 'Pilih layanan terlebih dahulu';
    };
    
    document.getElementById('orderForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const layananId = document.getElementById('layananId').value;
        const jadwalJemputDate = document.getElementById('jadwalJemput').value;
        const jamJemput = document.getElementById('jamJemput').value;
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
        
        try {
            await LaundryAPI.addPesanan(newPesanan);
            showToast('success', 'Pesanan berhasil! Karyawan akan menjemput sesuai jadwal.');
            setTimeout(() => loadPage('pesanan'), 1500);
        } catch(e) {
            showToast('error', e.message);
        }
    });
}

// ============ DAFTAR PESANAN (dengan tombol Bayar) ============
async function renderPesanan() {
    await loadData();
    
    const html = `
        <div class="glass-card">
            <div class="card-header"><span><i class="fas fa-receipt"></i> Semua Pesanan Saya</span></div>
            <div class="card-body" style="padding:0;">
                <div class="table-wrapper">
                    <table class="table">
                        <thead><tr><th>Kode</th><th>Layanan</th><th>Berat</th><th>Total</th><th>Status</th><th>Pembayaran</th><th>Tanggal</th><th>Aksi</th></tr></thead>
                        <tbody>
                            ${myOrders.map(o => `
                                <tr>
                                    <td><strong>${o.kode}</strong></td>
                                    <td>${o.layananNama}</td>
                                    <td>${o.berat ? o.berat + ' kg' : '<span style="color:#F59E0B;">Belum ditimbang</span>'}</td>
                                    <td>${o.totalBayar ? formatRupiah(o.totalBayar) : '-'}</td>
                                    <td>${getStatusBadge(o.status)}</td>
                                    <td>${getPaymentBadge(o.statusPembayaran)}</td>
                                    <td>${formatDate(o.tanggalPesan)}</td>
                                    <td class="action-buttons">
                                        <button class="btn btn-sm btn-primary" onclick="showStruk(${o.id})"><i class="fas fa-file-invoice"></i> Struk</button>
                                        ${o.status === 'selesai' && o.statusPembayaran === 'belum' ? 
                                            `<button class="btn btn-sm btn-success" onclick="showPayment(${o.id})"><i class="fas fa-credit-card"></i> Bayar</button>` : ''}
                                        <button class="btn btn-sm btn-outline" onclick="trackOrder(${o.id})"><i class="fas fa-map-marker-alt"></i> Tracking</button>
                                    </td>
                                </table>
                            `).join('')}
                            ${myOrders.length === 0 ? '<tr><td colspan="8" class="text-center">Belum ada pesanan. Klik "Pesan Laundry" untuk memesan!</td>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('pageContent').innerHTML = html;
}

// ============ STRUK DIGITAL ============
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
            <div class="modal-content" style="max-width: 550px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3><i class="fas fa-file-invoice"></i> Struk Pesanan</h3>
                    <button class="modal-close" onclick="closeModal('strukModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="struk-container" id="strukContainer">
                        <div class="struk-header">
                            <i class="fas fa-tshirt" style="font-size: 40px; color: #3B82F6;"></i>
                            <h3>LAUNDRY INT</h3>
                            <p style="font-size: 12px;">Jl. Laundry No.123, Jakarta<br>Telp: (021) 1234 5678</p>
                        </div>
                        <div class="struk-divider"></div>
                        
                        <div class="struk-row"><span><strong>Kode Pesanan</strong></span><span><strong>${order.kode}</strong></span></div>
                        <div class="struk-row"><span>Tanggal Pesan</span><span>${formatDate(order.tanggalPesan)}</span></div>
                        <div class="struk-row"><span>Status</span><span>${statusText[order.status] || order.status}</span></div>
                        
                        <div class="struk-divider"></div>
                        
                        <div class="struk-row"><span><strong>Data Pelanggan</strong></span><span></span></div>
                        <div class="struk-row"><span>Nama</span><span>${order.pelangganNama}</span></div>
                        <div class="struk-row"><span>No HP</span><span>${order.pelangganHp}</span></div>
                        <div class="struk-row"><span>Alamat</span><span style="text-align:right;">${order.pelangganAlamat || '-'}</span></div>
                        
                        <div class="struk-divider"></div>
                        
                        <div class="struk-row"><span><strong>Detail Layanan</strong></span><span></span></div>
                        <div class="struk-row"><span>Layanan</span><span>${order.layananNama}</span></div>
                        <div class="struk-row"><span>Berat</span><span>${order.berat ? order.berat + ' kg' : '<span style="color:#F59E0B;">Belum ditimbang</span>'}</span></div>
                        <div class="struk-row"><span>Harga/kg</span><span>${formatRupiah(order.hargaPerKg)}</span></div>
                        
                        <div class="struk-divider"></div>
                        
                        <div class="struk-row"><span><strong>Perhitungan</strong></span><span></span></div>
                        <div class="struk-row"><span>Total Harga</span><span>${order.totalHarga ? formatRupiah(order.totalHarga) : '-'}</span></div>
                        <div class="struk-row"><span>Diskon</span><span>${formatRupiah(order.diskon || 0)}</span></div>
                        <div class="struk-row struk-total"><span><strong>TOTAL BAYAR</strong></span><span><strong>${order.totalBayar ? formatRupiah(order.totalBayar) : '-'}</strong></span></div>
                        
                        <div class="struk-divider"></div>
                        
                        <div class="struk-row"><span>Status Pembayaran</span><span>${order.statusPembayaran === 'lunas' ? '✅ LUNAS' : '⏳ BELUM LUNAS'}</span></div>
                        
                        ${order.jadwalJemput ? `<div class="struk-divider"></div><div class="struk-row"><span><strong>Jadwal Jemput</strong></span><span>${order.jadwalJemput}</span></div>` : ''}
                        ${order.catatan ? `<div class="struk-row"><span>Catatan</span><span>${order.catatan}</span></div>` : ''}
                        
                        <div class="struk-divider"></div>
                        <div class="struk-header"><p style="font-size: 11px;">Terima Kasih telah menggunakan Laundry int!<br>⭐ ⭐ ⭐ ⭐ ⭐</p></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="printStruk()"><i class="fas fa-print"></i> Cetak</button>
                    <button class="btn btn-primary" onclick="downloadStrukPDF()"><i class="fas fa-file-pdf"></i> Download PDF</button>
                    <button class="btn btn-outline" onclick="closeModal('strukModal')">Tutup</button>
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
        printWindow.document.write(`
            <html><head><title>Struk Laundry int - ${order.kode}</title>
            <style>body { font-family: Arial; padding: 20px; } .struk-container { max-width: 400px; margin: 0 auto; } .struk-header { text-align: center; } .struk-divider { border-top: 1px dashed #ccc; margin: 10px 0; } .struk-row { display: flex; justify-content: space-between; margin-bottom: 8px; } .struk-total { font-weight: bold; }</style>
            </head><body>${printContent}</body></html>
        `);
        printWindow.document.close();
        printWindow.print();
    };
    
    window.downloadStrukPDF = function() {
        const element = document.getElementById('strukContainer');
        html2pdf().set({ margin: 0.5, filename: `Struk_${order.kode}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } }).from(element).save();
    };
};

// ============ PEMBAYARAN LENGKAP (QRIS, E-WALLET, BANK, COD) ============
window.showPayment = function(orderId) {
    const order = myOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const modalHtml = `
        <div class="modal active" id="paymentModal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-credit-card"></i> Metode Pembayaran</h3>
                    <button class="modal-close" onclick="closeModal('paymentModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 28px; font-weight: bold; color: #60A5FA;">${formatRupiah(order.totalBayar)}</div>
                        <div style="color: #64748B;">Kode Pesanan: ${order.kode}</div>
                    </div>
                    
                    <!-- QRIS -->
                    <div class="payment-section" style="margin-bottom: 20px;">
                        <div class="section-title" style="font-weight: bold; margin-bottom: 10px;"><i class="fas fa-qrcode"></i> QRIS</div>
                        <div style="background: #1E293B; padding: 15px; border-radius: 12px; text-align: center;">
                            <div style="background: white; display: inline-block; padding: 10px; border-radius: 12px; margin-bottom: 10px;">
                                <i class="fas fa-qrcode" style="font-size: 100px; color: black;"></i>
                            </div>
                            <p style="font-size: 12px; color: #94A3B8;">Scan QRIS menggunakan OVO, Dana, GoPay, ShopeePay, LinkAja</p>
                        </div>
                    </div>
                    
                    <!-- E-WALLET -->
                    <div class="payment-section" style="margin-bottom: 20px;">
                        <div class="section-title" style="font-weight: bold; margin-bottom: 10px;"><i class="fas fa-mobile-alt"></i> E-Wallet</div>
                        <div class="payment-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                            <div class="payment-option" onclick="processPayment(${orderId}, 'OVO')" style="background: rgba(59,130,246,0.1); padding: 12px; border-radius: 10px; text-align: center; cursor: pointer;">
                                <i class="fab fa-ovino" style="font-size: 24px;"></i><br>OVO
                            </div>
                            <div class="payment-option" onclick="processPayment(${orderId}, 'GoPay')" style="background: rgba(59,130,246,0.1); padding: 12px; border-radius: 10px; text-align: center; cursor: pointer;">
                                <i class="fas fa-wallet" style="font-size: 24px;"></i><br>GoPay
                            </div>
                            <div class="payment-option" onclick="processPayment(${orderId}, 'Dana')" style="background: rgba(59,130,246,0.1); padding: 12px; border-radius: 10px; text-align: center; cursor: pointer;">
                                <i class="fas fa-money-bill" style="font-size: 24px;"></i><br>Dana
                            </div>
                            <div class="payment-option" onclick="processPayment(${orderId}, 'LinkAja')" style="background: rgba(59,130,246,0.1); padding: 12px; border-radius: 10px; text-align: center; cursor: pointer;">
                                <i class="fas fa-link" style="font-size: 24px;"></i><br>LinkAja
                            </div>
                            <div class="payment-option" onclick="processPayment(${orderId}, 'ShopeePay')" style="background: rgba(59,130,246,0.1); padding: 12px; border-radius: 10px; text-align: center; cursor: pointer;">
                                <i class="fas fa-shopping-cart" style="font-size: 24px;"></i><br>ShopeePay
                            </div>
                        </div>
                    </div>
                    
                    <!-- TRANSFER BANK -->
                    <div class="payment-section" style="margin-bottom: 20px;">
                        <div class="section-title" style="font-weight: bold; margin-bottom: 10px;"><i class="fas fa-university"></i> Transfer Bank</div>
                        <div class="bank-list">
                            <div class="bank-item" onclick="copyBankAccount('BCA', '1234567890')" style="background: rgba(59,130,246,0.1); padding: 12px; border-radius: 10px; margin-bottom: 8px; cursor: pointer; display: flex; justify-content: space-between;">
                                <span><i class="fas fa-building"></i> BCA - 1234567890 a.n Laundry int</span>
                                <span style="color: #60A5FA;"><i class="fas fa-copy"></i> Salin</span>
                            </div>
                            <div class="bank-item" onclick="copyBankAccount('BNI', '1234567891')" style="background: rgba(59,130,246,0.1); padding: 12px; border-radius: 10px; margin-bottom: 8px; cursor: pointer; display: flex; justify-content: space-between;">
                                <span><i class="fas fa-building"></i> BNI - 1234567891 a.n Laundry int</span>
                                <span style="color: #60A5FA;"><i class="fas fa-copy"></i> Salin</span>
                            </div>
                            <div class="bank-item" onclick="copyBankAccount('BRI', '1234567892')" style="background: rgba(59,130,246,0.1); padding: 12px; border-radius: 10px; margin-bottom: 8px; cursor: pointer; display: flex; justify-content: space-between;">
                                <span><i class="fas fa-building"></i> BRI - 1234567892 a.n Laundry int</span>
                                <span style="color: #60A5FA;"><i class="fas fa-copy"></i> Salin</span>
                            </div>
                            <div class="bank-item" onclick="copyBankAccount('Mandiri', '1234567893')" style="background: rgba(59,130,246,0.1); padding: 12px; border-radius: 10px; margin-bottom: 8px; cursor: pointer; display: flex; justify-content: space-between;">
                                <span><i class="fas fa-building"></i> Mandiri - 1234567893 a.n Laundry int</span>
                                <span style="color: #60A5FA;"><i class="fas fa-copy"></i> Salin</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- COD -->
                    <div class="payment-section" style="margin-bottom: 20px;">
                        <div class="section-title" style="font-weight: bold; margin-bottom: 10px;"><i class="fas fa-hand-holding-usd"></i> COD (Cash on Delivery)</div>
                        <div class="payment-option" onclick="processPayment(${orderId}, 'COD')" style="background: rgba(59,130,246,0.1); padding: 12px; border-radius: 10px; text-align: center; cursor: pointer;">
                            Bayar di tempat saat pakaian diantar/diambil
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('paymentModal');
    if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// Fungsi copy nomor rekening
window.copyBankAccount = function(bank, accountNumber) {
    navigator.clipboard.writeText(accountNumber);
    showToast('success', `No Rekening ${bank} (${accountNumber}) sudah disalin!`);
};

// Proses pembayaran
window.processPayment = async function(orderId, method) {
    try {
        await LaundryAPI.updatePesanan(orderId, { statusPembayaran: 'lunas' });
        closeModal('paymentModal');
        showToast('success', `Pembayaran via ${method} berhasil! Terima kasih.`);
        setTimeout(() => loadPage('pesanan'), 1500);
    } catch(e) {
        showToast('error', e.message);
    }
};

// ============ TRACKING PESANAN (Shopee Style) ==========
async function renderTracking() {
    await loadData();
    
    const activeOrders = myOrders.filter(o => o.status !== 'diambil');
    
    const html = `
        <div class="glass-card">
            <div class="card-header"><span><i class="fas fa-map-marker-alt"></i> Tracking Pesanan Aktif</span></div>
            <div class="card-body">
                ${activeOrders.length === 0 ? '<p class="text-center" style="color:#64748B;">Tidak ada pesanan aktif</p>' : 
                    activeOrders.map(o => `
                        <div class="tracking-card" style="background: rgba(255,255,255,0.03); border-radius: 16px; padding: 20px; margin-bottom: 20px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                                <div><strong>${o.kode}</strong><br><small>${o.layananNama}</small></div>
                                ${getStatusBadge(o.status)}
                            </div>
                            
                            <div class="tracking-steps" style="margin: 20px 0;">
                                <div class="tracking-line"><div class="line-fill" style="width: ${getProgressWidth(o.status)}%"></div></div>
                                ${getTrackingSteps(o.status)}
                            </div>
                            
                            ${o.berat ? `<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);"><small>⚖️ Berat: ${o.berat} kg | 💰 Total: ${formatRupiah(o.totalBayar)}</small></div>` : ''}
                            ${o.jadwalJemput ? `<div style="margin-top: 8px;"><small><i class="fas fa-truck"></i> Jadwal Jemput: ${o.jadwalJemput}</small></div>` : ''}
                            
                            <div style="display: flex; gap: 10px; margin-top: 20px;">
                                <button class="btn btn-sm btn-primary" onclick="showStruk(${o.id})"><i class="fas fa-file-invoice"></i> Lihat Struk</button>
                                ${o.status === 'selesai' && o.statusPembayaran === 'belum' ? `<button class="btn btn-sm btn-success" onclick="showPayment(${o.id})"><i class="fas fa-credit-card"></i> Bayar Sekarang</button>` : ''}
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

function getTrackingSteps(currentStatus) {
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

// ============ TRACKING ORDER (Popup) ==========
window.trackOrder = function(orderId) {
    const order = myOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const modalHtml = `
        <div class="modal active" id="trackingModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-map-marker-alt"></i> Tracking - ${order.kode}</h3>
                    <button class="modal-close" onclick="closeModal('trackingModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="tracking-steps" style="margin: 20px 0;">
                        <div class="tracking-line"><div class="line-fill" style="width: ${getProgressWidth(order.status)}%"></div></div>
                        ${getTrackingSteps(order.status)}
                    </div>
                    <div class="order-detail" style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 15px;">
                        <h4>Detail Pesanan</h4>
                        <div class="struk-row"><span>Layanan</span><span>${order.layananNama}</span></div>
                        <div class="struk-row"><span>Berat</span><span>${order.berat ? order.berat + ' kg' : 'Belum ditimbang'}</span></div>
                        <div class="struk-row"><span>Total</span><span>${order.totalBayar ? formatRupiah(order.totalBayar) : '-'}</span></div>
                        <div class="struk-row"><span>Jadwal Jemput</span><span>${order.jadwalJemput || '-'}</span></div>
                        ${order.catatan ? `<div class="struk-row"><span>Catatan</span><span>${order.catatan}</span></div>` : ''}
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
};

// ============ PROFIL ==========
async function renderProfile() {
    await loadData();
    
    const html = `
        <div class="glass-card">
            <div class="card-header"><span><i class="fas fa-user-circle"></i> Profil Saya</span><button class="btn btn-sm btn-outline" onclick="editProfile()"><i class="fas fa-edit"></i> Edit Profil</button></div>
            <div class="card-body">
                <div class="struk-row"><span style="color:#60A5FA;">Nama Lengkap</span><span>${currentUser.nama}</span></div>
                <div class="struk-row"><span style="color:#60A5FA;">Email</span><span>${currentUser.email}</span></div>
                <div class="struk-row"><span style="color:#60A5FA;">Nomor HP</span><span>${currentUser.no_hp || '-'}</span></div>
                <div class="struk-row"><span style="color:#60A5FA;">Alamat</span><span>${currentUser.alamat || '<span style="color:#64748B;">Belum diisi</span>'}</span></div>
            </div>
        </div>
        
        <div class="glass-card">
            <div class="card-header"><span><i class="fas fa-chart-simple"></i> Statistik Saya</span></div>
            <div class="card-body">
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); text-align: center;">
                    <div><div class="stat-value" style="font-size: 24px;">${myOrders.length}</div><div class="stat-label">Total Pesanan</div></div>
                    <div><div class="stat-value" style="font-size: 24px;">${myOrders.filter(o => o.status === 'selesai' || o.status === 'diambil').length}</div><div class="stat-label">Selesai</div></div>
                    <div><div class="stat-value" style="font-size: 24px;">${myOrders.reduce((sum, o) => sum + (o.totalBayar || 0), 0).toLocaleString()}</div><div class="stat-label">Total Belanja</div></div>
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
                    <h3><i class="fas fa-user-edit"></i> Edit Profil</h3>
                    <button class="modal-close" onclick="closeModal('profileModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="editProfileForm">
                        <div class="form-group"><label class="form-label">Nama Lengkap</label><input id="nama" class="form-control" value="${currentUser.nama}" required></div>
                        <div class="form-group"><label class="form-label">Nomor HP</label><input id="no_hp" class="form-control" value="${currentUser.no_hp || ''}" required></div>
                        <div class="form-group"><label class="form-label">Alamat</label><textarea id="alamat" class="form-control" rows="3">${currentUser.alamat || ''}</textarea></div>
                    </form>
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
        await LaundryAPI.updateProfile(data);
        currentUser = { ...currentUser, ...data };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        document.getElementById('userName').innerText = currentUser.nama;
        document.getElementById('userAvatar').innerText = currentUser.nama.charAt(0).toUpperCase();
        closeModal('profileModal');
        showToast('success', 'Profil berhasil diperbarui!');
        await renderProfile();
    } catch(e) {
        showToast('error', e.message);
    }
};

window.loadPage = loadPage;
window.trackOrder = trackOrder;
window.showStruk = showStruk;
window.showPayment = showPayment;
window.processPayment = processPayment;
window.copyBankAccount = copyBankAccount;