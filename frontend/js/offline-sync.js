/**
 * OFFLINE SYNC MANAGER - Laundry int
 * Untuk mendukung mode offline di APK
 */

class OfflineSyncManager {
    constructor() {
        this.dbName = 'LaundryOfflineDB';
        this.dbVersion = 2;
        this.db = null;
        this.isOnline = navigator.onLine;
        this.pendingSync = [];
        this.init();
    }

    async init() {
        await this.openDatabase();
        await this.loadPendingSync();
        this.setupEventListeners();
        console.log('📱 Offline Sync Manager initialized');
    }

    async openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('offlineOrders')) {
                    const orderStore = db.createObjectStore('offlineOrders', { keyPath: 'id', autoIncrement: true });
                    orderStore.createIndex('kode', 'kode', { unique: false });
                    orderStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('syncQueue')) {
                    const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
                    syncStore.createIndex('type', 'type', { unique: false });
                    syncStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };
        });
    }

    async loadPendingSync() {
        if (!this.db) return;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['syncQueue'], 'readonly');
            const store = transaction.objectStore('syncQueue');
            const request = store.getAll();
            
            request.onsuccess = () => {
                this.pendingSync = request.result;
                console.log(`📱 Loaded ${this.pendingSync.length} pending sync items`);
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    setupEventListeners() {
        window.addEventListener('online', async () => {
            console.log('🟢 App is online - Syncing data...');
            this.isOnline = true;
            await this.syncAll();
            if (typeof showToast === 'function') {
                showToast('success', 'Koneksi kembali! Data sedang disinkronkan.');
            }
        });
        
        window.addEventListener('offline', () => {
            console.log('🔴 App is offline - Saving data locally');
            this.isOnline = false;
            if (typeof showToast === 'function') {
                showToast('warning', 'Mode offline: Data akan disimpan lokal.');
            }
        });
    }

    async saveOfflineOrder(orderData) {
        if (!this.db) return false;
        
        const offlineOrder = {
            ...orderData,
            createdAt: new Date().toISOString(),
            isOffline: true,
            synced: false
        };
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['offlineOrders'], 'readwrite');
            const store = transaction.objectStore('offlineOrders');
            const request = store.add(offlineOrder);
            
            request.onsuccess = () => {
                this.addToSyncQueue('order', offlineOrder);
                if (typeof showToast === 'function') {
                    showToast('info', '📱 Pesanan disimpan offline.');
                }
                resolve(true);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async addToSyncQueue(type, data) {
        if (!this.db) return;
        
        const syncItem = {
            type: type,
            data: data,
            createdAt: new Date().toISOString(),
            retryCount: 0
        };
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');
            const request = store.add(syncItem);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async syncAll() {
        if (!this.isOnline || this.pendingSync.length === 0) return;
        
        console.log(`🔄 Syncing ${this.pendingSync.length} items...`);
        
        for (const item of this.pendingSync) {
            try {
                await this.syncItem(item);
                await this.removeFromSyncQueue(item.id);
                console.log(`✅ Synced: ${item.type} - ${item.id}`);
            } catch (error) {
                console.error(`❌ Failed to sync: ${item.type}`, error);
                await this.incrementRetryCount(item.id);
            }
        }
        
        await this.loadPendingSync();
        
        if (this.pendingSync.length === 0 && typeof showToast === 'function') {
            showToast('success', '✅ Semua data berhasil disinkronkan!');
        }
    }

    async syncItem(item) {
        const token = localStorage.getItem('token');
        
        switch(item.type) {
            case 'order':
                const response = await fetch('https://laundry-backend-api.vercel.app/api/sync-offline', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token
                    },
                    body: JSON.stringify({
                        offlineOrders: [item.data],
                        offlineTimestamp: item.createdAt
                    })
                });
                
                if (!response.ok) throw new Error('Sync failed');
                return await response.json();
                
            default:
                throw new Error(`Unknown sync type: ${item.type}`);
        }
    }

    async removeFromSyncQueue(id) {
        if (!this.db) return;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async incrementRetryCount(id) {
        if (!this.db) return;
        
        const item = this.pendingSync.find(i => i.id === id);
        if (item && item.retryCount < 5) {
            item.retryCount++;
            
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['syncQueue'], 'readwrite');
                const store = transaction.objectStore('syncQueue');
                const request = store.put(item);
                
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } else if (item && item.retryCount >= 5) {
            console.warn(`⚠️ Max retry reached for sync item ${id}, removing`);
            await this.removeFromSyncQueue(id);
        }
    }

    async getOfflineOrders() {
        if (!this.db) return [];
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['offlineOrders'], 'readonly');
            const store = transaction.objectStore('offlineOrders');
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async clearOfflineData() {
        if (!this.db) return;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['offlineOrders', 'syncQueue'], 'readwrite');
            
            transaction.objectStore('offlineOrders').clear();
            transaction.objectStore('syncQueue').clear();
            
            transaction.oncomplete = () => {
                this.pendingSync = [];
                resolve();
            };
            transaction.onerror = () => reject(transaction.error);
        });
    }
}

// Initialize offline sync
window.offlineSync = new OfflineSyncManager();

// Modified LaundryAPI to support offline mode
if (typeof LaundryAPI !== 'undefined') {
    const originalAddPesanan = LaundryAPI.addPesanan;
    LaundryAPI.addPesanan = async function(data) {
        if (!navigator.onLine) {
            const orderData = {
                ...data,
                kode: `OFFLINE_${Date.now()}`,
                tanggal_pesan: new Date().toISOString().split('T')[0],
                pelanggan_nama: data.pelangganNama || (window.currentUser ? window.currentUser.nama : ''),
                pelanggan_hp: data.pelangganHp || (window.currentUser ? window.currentUser.no_hp : '')
            };
            await window.offlineSync.saveOfflineOrder(orderData);
            return { success: true, offline: true, kode: orderData.kode };
        }
        return originalAddPesanan.call(this, data);
    };
}