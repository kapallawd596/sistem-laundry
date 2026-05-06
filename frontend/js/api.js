const API_BASE = 'http://localhost:3000/api';

class LaundryAPI {
    static async request(endpoint, options = {}) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Terjadi kesalahan');
        }
        return response.json();
    }

    // USERS
    static async getUsers() {
        return this.request('/users');
    }

    static async updateUser(id, data) {
        return this.request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // PELANGGAN
    static async getPelanggan() {
        return this.request('/pelanggan');
    }

    // LAYANAN
    static async getLayanan() {
        return this.request('/layanan');
    }

    // PESANAN
    static async getPesanan(params = {}) {
        const query = new URLSearchParams(params).toString();
        const endpoint = query ? `/pesanan?${query}` : '/pesanan';
        return this.request(endpoint);
    }

    static async addPesanan(data) {
        return this.request('/pesanan', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    static async updatePesanan(id, data) {
        return this.request(`/pesanan/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
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