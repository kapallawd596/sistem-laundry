/**
 * API CALLS - Laundry int
 * Semua fungsi untuk berkomunikasi dengan backend
 */

const API_BASE = 'http://localhost:3000/api';

class LaundryAPI {
    static async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token || ''
            },
            ...options
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || error.message || 'Terjadi kesalahan');
        }
        return response.json();
    }

    // AUTH
    static async login(email, password) {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        return response.json();
    }

    static async register(data) {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    }

    // USERS (Admin only)
    static async getUsers() {
        return this.request('/users');
    }

    static async deleteUser(id) {
        return this.request(`/users/${id}`, { method: 'DELETE' });
    }

    static async updateProfile(data) {
        return this.request('/profile', { method: 'PUT', body: JSON.stringify(data) });
    }

    // PELANGGAN
    static async getPelanggan() {
        return this.request('/pelanggan');
    }

    static async addPelanggan(data) {
        return this.request('/pelanggan', { method: 'POST', body: JSON.stringify(data) });
    }

    static async updatePelanggan(id, data) {
        return this.request(`/pelanggan/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    }

    static async deletePelanggan(id) {
        return this.request(`/pelanggan/${id}`, { method: 'DELETE' });
    }

    // LAYANAN
    static async getLayanan() {
        return this.request('/layanan');
    }

    static async addLayanan(data) {
        return this.request('/layanan', { method: 'POST', body: JSON.stringify(data) });
    }

    static async updateLayanan(id, data) {
        return this.request(`/layanan/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    }

    static async deleteLayanan(id) {
        return this.request(`/layanan/${id}`, { method: 'DELETE' });
    }

    // PESANAN
    static async getPesanan(params = {}) {
        const query = new URLSearchParams(params).toString();
        const endpoint = query ? `/pesanan?${query}` : '/pesanan';
        return this.request(endpoint);
    }

    static async addPesanan(data) {
        return this.request('/pesanan', { method: 'POST', body: JSON.stringify(data) });
    }

    static async updatePesanan(id, data) {
        return this.request(`/pesanan/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    }

    static async deletePesanan(id) {
        return this.request(`/pesanan/${id}`, { method: 'DELETE' });
    }

    // STATISTIK
    static async getStatistik() {
        return this.request('/statistik');
    }

    static async getAktivitas() {
        return this.request('/aktivitas');
    }
}

window.LaundryAPI = LaundryAPI;