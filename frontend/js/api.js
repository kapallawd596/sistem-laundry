const API_BASE = 'http://localhost:3000/api';

// Token storage
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

class LaundryAPI {
  static async request(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Terjadi kesalahan');
    }
    
    return response.json();
  }
  
  // Auth
  static async login(email, password) {
    const result = await this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (result.success) {
      currentUser = result.user;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      localStorage.setItem('token', result.token);
    }
    return result;
  }
  
  static async register(data) {
    return this.request('/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  static logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    window.location.href = '/login.html';
  }
  
  static getCurrentUser() {
    return currentUser;
  }
  
  // Pelanggan
  static async getPelanggan() {
    return this.request('/pelanggan');
  }
  
  static async addPelanggan(data) {
    return this.request('/pelanggan', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  static async updatePelanggan(id, data) {
    return this.request(`/pelanggan/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  
  static async deletePelanggan(id) {
    return this.request(`/pelanggan/${id}`, {
      method: 'DELETE'
    });
  }
  
  // Layanan
  static async getLayanan() {
    return this.request('/layanan');
  }
  
  static async addLayanan(data) {
    return this.request('/layanan', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  static async updateLayanan(id, data) {
    return this.request(`/layanan/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  
  static async deleteLayanan(id) {
    return this.request(`/layanan/${id}`, {
      method: 'DELETE'
    });
  }
  
  // Pesanan
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
  
  static async deletePesanan(id) {
    return this.request(`/pesanan/${id}`, {
      method: 'DELETE'
    });
  }
  
  // Statistik
  static async getStatistik() {
    return this.request('/statistik');
  }
  
  static async getAktivitas() {
    return this.request('/aktivitas');
  }
  
  static async getUsers() {
    return this.request('/users');
  }
}