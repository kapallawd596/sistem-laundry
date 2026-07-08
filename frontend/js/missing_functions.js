/**
 * MISSING FUNCTIONS - Laundry int
 * Semua fungsi yang belum di-implement tapi di-call di berbagai file
 */

// ============ PAYMENT HELPER FUNCTIONS (Pelanggan) ============
window.processPayment = async function(orderId, method) {
    try {
        const order = myOrders.find(o => o.id === orderId);
        if (!order) {
            showToast('error', 'Pesanan tidak ditemukan');
            return;
        }
        
        showToast('info', `Memproses pembayaran via ${method}...`);
        
        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Update pesanan status_pembayaran to 'lunas'
        await LaundryAPI.updatePesanan(orderId, { 
            statusPembayaran: 'lunas',
            status: 'selesai'
        });
        
        showToast('success', `Pembayaran ${method} berhasil! Pesanan siap diantar.`);
        closeModal('paymentModal');
        
        // Reload data
        await loadData();
        await renderPesanan();
    } catch(e) {
        showToast('error', `Gagal memproses pembayaran: ${e.message}`);
    }
};

window.copyBankAccount = function(bank, account) {
    const text = `${bank} - ${account}`;
    navigator.clipboard.writeText(text).then(() => {
        showToast('success', `${bank} (${account}) disalin ke clipboard!`);
    }).catch(() => {
        showToast('error', 'Gagal menyalin ke clipboard');
    });
};

// ============ ORDER TRACKING (Pelanggan) ============
window.trackOrder = function(orderId) {
    const order = myOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const statusFlow = [
        { status: 'menunggu', label: 'Pesanan Dibuat', icon: '📋', completed: true },
        { status: 'proses', label: 'Sedang Diproses', icon: '🔄', completed: order.status !== 'menunggu' },
        { status: 'selesai', label: 'Selesai Dicuci', icon: '✅', completed: ['selesai', 'diambil'].includes(order.status) },
        { status: 'diambil', label: 'Sudah Diambil', icon: '📦', completed: order.status === 'diambil' }
    ];
    
    const timelineHtml = statusFlow.map((s, idx) => `
        <div style="display: flex; gap: 15px; margin-bottom: ${idx < statusFlow.length - 1 ? '20px' : '0'};">
            <div style="text-align: center;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: ${s.completed ? '#10B981' : '#64748B'}; display: flex; align-items: center; justify-content: center; font-size: 20px;">${s.icon}</div>
                ${idx < statusFlow.length - 1 ? `<div style="width: 2px; height: 30px; background: ${s.completed ? '#10B981' : '#e2e8f0'}; margin: 5px auto;"></div>` : ''}
            </div>
            <div style="flex: 1; padding-top: 5px;">
                <div style="font-weight: 600; color: ${s.completed ? '#10B981' : '#94A3B8'};">${s.label}</div>
                <div style="font-size: 12px; color: #64748B;">
                    ${s.status === 'menunggu' && order.tanggalPesan ? `Tanggal: ${formatDate(order.tanggalPesan)}` : ''}
                    ${s.status === 'proses' && order.tanggalMasuk ? `Tanggal: ${formatDate(order.tanggalMasuk)}` : ''}
                    ${s.status === 'selesai' && order.tanggalSelesai ? `Tanggal: ${formatDate(order.tanggalSelesai)}` : ''}
                    ${s.status === 'diambil' ? '✓ Selesai' : ''}
                </div>
            </div>
        </div>
    `).join('');
    
    const modalHtml = `
        <div class="modal active" id="trackingModal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-map-marker-alt"></i> Tracking Pesanan</h3>
                    <button class="modal-close" onclick="closeModal('trackingModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="background: rgba(59,130,246,0.1); padding: 15px; border-radius: 12px; margin-bottom: 20px;">
                        <div style="font-size: 12px; color: #94A3B8;">Kode Pesanan</div>
                        <div style="font-size: 18px; font-weight: bold; color: white;">${order.kode}</div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        ${timelineHtml}
                    </div>
                    
                    <div style="background: rgba(59,130,246,0.1); padding: 15px; border-radius: 12px;">
                        <div style="font-weight: 600; margin-bottom: 10px;">📞 Hubungi Kami</div>
                        <p style="font-size: 12px; color: #94A3B8;">Jika ada pertanyaan tentang pesanan Anda</p>
                        <div style="display: flex; gap: 10px; margin-top: 10px;">
                            <button class="btn btn-sm btn-primary" onclick="window.open('tel:+62212345678')">
                                <i class="fas fa-phone"></i> Telepon
                            </button>
                            <button class="btn btn-sm btn-outline" onclick="window.open('https://wa.me/62212345678')">
                                <i class="fab fa-whatsapp"></i> WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="closeModal('trackingModal')">Tutup</button>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('trackingModal');
    if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// ============ PROFILE MANAGEMENT (Pelanggan) ============
window.renderProfile = async function() {
    if (!currentUser) return;
    
    const html = `
        <div class="glass-card">
            <div class="card-header"><span><i class="fas fa-user"></i> Profil Saya</span></div>
            <div class="card-body">
                <div style="max-width: 500px;">
                    <form id="profileForm">
                        <div class="form-group">
                            <label class="form-label">Nama Lengkap</label>
                            <input type="text" id="inputNama" class="form-control" value="${currentUser.nama || ''}" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <input type="email" class="form-control" value="${currentUser.email || ''}" disabled>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Nomor HP</label>
                            <input type="tel" id="inputNoHp" class="form-control" value="${currentUser.no_hp || ''}" required>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Alamat</label>
                            <textarea id="inputAlamat" class="form-control" style="resize: vertical; min-height: 100px;" required>${currentUser.alamat || ''}</textarea>
                        </div>
                        
                        <button type="submit" class="btn btn-primary" onclick="updateProfile()">
                            <i class="fas fa-save"></i> Simpan Perubahan
                        </button>
                    </form>
                </div>
            </div>
        </div>
        
        <div class="glass-card">
            <div class="card-header"><span><i class="fas fa-key"></i> Keamanan</span></div>
            <div class="card-body">
                <button class="btn btn-warning" onclick="showChangePassword()">
                    <i class="fas fa-lock"></i> Ubah Password
                </button>
                <button class="btn btn-danger" style="margin-top: 10px;" onclick="deleteAccount()">
                    <i class="fas fa-trash"></i> Hapus Akun
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('pageContent').innerHTML = html;
};

window.updateProfile = async function() {
    try {
        const nama = document.getElementById('inputNama').value;
        const no_hp = document.getElementById('inputNoHp').value;
        const alamat = document.getElementById('inputAlamat').value;
        
        if (!nama || !no_hp || !alamat) {
            showToast('error', 'Lengkapi semua field!');
            return;
        }
        
        await LaundryAPI.updateProfile({ nama, no_hp, alamat });
        
        // Update localStorage
        currentUser.nama = nama;
        currentUser.no_hp = no_hp;
        currentUser.alamat = alamat;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        showToast('success', 'Profil berhasil diperbarui!');
        await loadPage('profile');
    } catch(e) {
        showToast('error', `Error: ${e.message}`);
    }
};

window.showChangePassword = function() {
    const modalHtml = `
        <div class="modal active" id="changePassModal">
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3><i class="fas fa-lock"></i> Ubah Password</h3>
                    <button class="modal-close" onclick="closeModal('changePassModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Password Saat Ini</label>
                        <input type="password" id="currentPass" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password Baru</label>
                        <input type="password" id="newPass" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Konfirmasi Password Baru</label>
                        <input type="password" id="confirmPass" class="form-control" required>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="closeModal('changePassModal')">Batal</button>
                    <button class="btn btn-primary" onclick="submitChangePassword()">Ubah Password</button>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('changePassModal');
    if (existingModal) existingModal.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.submitChangePassword = async function() {
    try {
        const currentPass = document.getElementById('currentPass').value;
        const newPass = document.getElementById('newPass').value;
        const confirmPass = document.getElementById('confirmPass').value;
        
        if (!currentPass || !newPass || !confirmPass) {
            showToast('error', 'Lengkapi semua field!');
            return;
        }
        
        if (newPass !== confirmPass) {
            showToast('error', 'Password baru tidak cocok!');
            return;
        }
        
        if (newPass.length < 6) {
            showToast('error', 'Password minimal 6 karakter!');
            return;
        }
        
        await LaundryAPI.changePassword(currentPass, newPass);
        showToast('success', 'Password berhasil diubah!');
        closeModal('changePassModal');
    } catch(e) {
        showToast('error', `Error: ${e.message}`);
    }
};

window.deleteAccount = async function() {
    if (!confirm('⚠️ Apakah Anda yakin ingin menghapus akun? Tindakan ini tidak dapat dibatalkan!')) {
        return;
    }
    
    if (!confirm('✋ Konfirmasi sekali lagi: Semua data Anda akan DIHAPUS SELAMANYA!')) {
        return;
    }
    
    try {
        await LaundryAPI.deleteAccount();
        localStorage.removeItem('currentUser');
        localStorage.removeItem('token');
        showToast('success', 'Akun berhasil dihapus!');
        window.location.href = '/login.html';
    } catch(e) {
        showToast('error', `Error: ${e.message}`);
    }
};

// ============ ORDER TRACKING PAGE (Pelanggan) ============
async function renderTracking() {
    await loadData();
    
    const html = `
        <div class="glass-card">
            <div class="card-header"><span><i class="fas fa-map-marker-alt"></i> Tracking Pesanan Aktif</span></div>
            <div class="card-body">
                <div class="table-wrapper">
                    <table class="table">
                        <thead>
                            <tr><th>Kode</th><th>Layanan</th><th>Status</th><th>Progress</th><th>Aksi</th></tr>
                        </thead>
                        <tbody>
                            ${myOrders.map(o => {
                                const progress = {
                                    'menunggu': 25,
                                    'proses': 50,
                                    'selesai': 75,
                                    'diambil': 100
                                };
                                const pct = progress[o.status] || 0;
                                
                                return `
                                    <tr>
                                        <td><strong>${o.kode}</strong></td>
                                        <td>${o.layananNama}</td>
                                        <td>${getStatusBadge(o.status)}</td>
                                        <td>
                                            <div style="background: rgba(59,130,246,0.1); border-radius: 10px; height: 8px; overflow: hidden;">
                                                <div style="background: linear-gradient(90deg, #3b82f6, #06b6d4); width: ${pct}%; height: 100%; transition: width 0.3s;"></div>
                                            </div>
                                            <small style="color: #94A3B8;">${pct}%</small>
                                        </td>
                                        <td>
                                            <button class="btn btn-sm btn-primary" onclick="trackOrder(${o.id})">
                                                <i class="fas fa-map-marker-alt"></i> Lihat
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                            ${myOrders.length === 0 ? '<tr><td colspan="5" class="text-center">Belum ada pesanan</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('pageContent').innerHTML = html;
}

// ============ ADMIN HELPERS (Admin Dashboard) ============
window.editPesanan = async function(pesananId) {
    const pesanan = currentPageData.pesanan?.find(p => p.id === pesananId);
    if (!pesanan) return;
    
    const modalHtml = `
        <form onsubmit="return false;">
            <div class="form-group">
                <label class="form-label">Status</label>
                <select id="editStatus" class="form-control">
                    <option value="menunggu">Menunggu</option>
                    <option value="proses">Proses</option>
                    <option value="selesai">Selesai</option>
                    <option value="diambil">Diambil</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Status Pembayaran</label>
                <select id="editPaymentStatus" class="form-control">
                    <option value="belum">Belum Lunas</option>
                    <option value="lunas">Lunas</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Catatan</label>
                <textarea id="editCatatan" class="form-control" style="min-height: 80px;"></textarea>
            </div>
        </form>
    `;
    
    openModal(modalHtml, 'Edit Pesanan');
    
    document.getElementById('editStatus').value = pesanan.status || 'menunggu';
    document.getElementById('editPaymentStatus').value = pesanan.statusPembayaran || 'belum';
    document.getElementById('editCatatan').value = pesanan.catatan || '';
    
    // Add save button
    document.querySelector('.modal-footer').innerHTML = `
        <button class="btn btn-outline" onclick="closeModal('dynamicModal')">Batal</button>
        <button class="btn btn-primary" onclick="savePesananEdit(${pesananId})">Simpan</button>
    `;
};

window.savePesananEdit = async function(pesananId) {
    try {
        const updates = {
            status: document.getElementById('editStatus').value,
            status_pembayaran: document.getElementById('editPaymentStatus').value,
            catatan: document.getElementById('editCatatan').value
        };
        
        await LaundryAPI.updatePesanan(pesananId, updates);
        showToast('success', 'Pesanan berhasil diupdate!');
        closeModal('dynamicModal');
        await loadPage('pesanan');
    } catch(e) {
        showToast('error', `Error: ${e.message}`);
    }
};

window.hapusPesanan = async function(pesananId) {
    if (!confirm('Yakin ingin menghapus pesanan ini?')) return;
    
    try {
        await LaundryAPI.deletePesanan(pesananId);
        showToast('success', 'Pesanan berhasil dihapus!');
        await loadPage('pesanan');
    } catch(e) {
        showToast('error', `Error: ${e.message}`);
    }
};

// Export semua functions
window.processPayment = processPayment;
window.copyBankAccount = copyBankAccount;
window.trackOrder = trackOrder;
window.renderProfile = renderProfile;
window.updateProfile = updateProfile;
window.showChangePassword = showChangePassword;
window.submitChangePassword = submitChangePassword;
window.deleteAccount = deleteAccount;
window.renderTracking = renderTracking;
window.editPesanan = editPesanan;
window.savePesananEdit = savePesananEdit;
window.hapusPesanan = hapusPesanan;
