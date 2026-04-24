// ============ GLOBAL FUNCTIONS ============

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? '#27AE60' : type === 'error' ? '#DC2626' : '#F7C35C';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 12px 20px;
        border-radius: 50px;
        font-weight: 500;
        z-index: 2000;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 5px 20px rgba(0,0,0,0.2);
    `;
    notification.innerHTML = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============ QUEUE SYSTEM ============
function getQueue() {
    const queue = localStorage.getItem('laundry_queue');
    if (queue) return JSON.parse(queue);
    return { current: 1, list: [] };
}

function saveQueue(queue) {
    localStorage.setItem('laundry_queue', JSON.stringify(queue));
}

function addToQueue(customerName, laundryId, userId) {
    const queue = getQueue();
    const newQueueNumber = queue.list.length + 1;
    queue.list.push({
        id: laundryId,
        queueNumber: newQueueNumber,
        customerName: customerName,
        userId: userId,
        addedAt: new Date().toISOString()
    });
    saveQueue(queue);
    return newQueueNumber;
}

// ============ LAUNDRY ORDER ============
function placeOrder(customerName, weight, serviceType, userId) {
    const prices = { reguler: 8000, express: 12000, setrika: 5000 };
    const total = weight * prices[serviceType];
    
    const newId = Date.now();
    const queueNumber = addToQueue(customerName, newId, userId);
    
    const newOrder = {
        id: newId,
        customerName: customerName,
        weight: parseFloat(weight),
        serviceType: serviceType,
        status: 'menunggu',
        paymentStatus: 'unpaid',
        notificationSent: false,
        date: new Date().toISOString().split('T')[0],
        queueNumber: queueNumber,
        userId: userId
    };
    
    const orders = JSON.parse(localStorage.getItem('laundryClean') || '[]');
    orders.unshift(newOrder);
    localStorage.setItem('laundryClean', JSON.stringify(orders));
    
    return { orderId: newId, queueNumber: queueNumber, total: total };
}

// ============ USER BALANCE ============
function getUserBalance(userId) {
    const balances = JSON.parse(localStorage.getItem('laundry_balances') || '{}');
    return balances[userId] || 0;
}

function updateUserBalanceDisplay() {
    const currentUser = JSON.parse(localStorage.getItem('laundry_current_user') || '{}');
    if (currentUser.id && document.getElementById('userBalanceDisplay')) {
        const balance = getUserBalance(currentUser.id);
        document.getElementById('userBalanceDisplay').innerHTML = 'Rp ' + balance.toLocaleString('id-ID');
    }
}

function topUpBalance(userId, amount) {
    const balances = JSON.parse(localStorage.getItem('laundry_balances') || '{}');
    balances[userId] = (balances[userId] || 0) + amount;
    localStorage.setItem('laundry_balances', JSON.stringify(balances));
    updateUserBalanceDisplay();
    return balances[userId];
}

// Event listener untuk order di halaman user
document.getElementById('orderBtn')?.addEventListener('click', () => {
    const customerName = document.getElementById('orderName')?.value.trim();
    const weight = parseFloat(document.getElementById('orderWeight')?.value);
    const serviceType = document.getElementById('orderService')?.value;
    const currentUser = JSON.parse(localStorage.getItem('laundry_current_user') || '{}');
    
    if (!customerName) {
        showNotification('Nama harus diisi!', 'error');
        return;
    }
    if (!weight || weight <= 0) {
        showNotification('Berat harus diisi dan lebih dari 0!', 'error');
        return;
    }
    
    const result = placeOrder(customerName, weight, serviceType, currentUser.id);
    showNotification(`✅ Pesanan berhasil! Nomor antrian: ${result.queueNumber}`, 'success');
    
    // Reset form
    document.getElementById('orderName').value = '';
    document.getElementById('orderWeight').value = '';
    
    // Refresh orders table
    if (typeof renderUserOrders === 'function') renderUserOrders();
    if (typeof updateMyQueueNumber === 'function') updateMyQueueNumber();
});

// Top up modal handlers
document.getElementById('topUpBtn')?.addEventListener('click', () => {
    const currentUser = JSON.parse(localStorage.getItem('laundry_current_user') || '{}');
    const balance = getUserBalance(currentUser.id);
    document.getElementById('currentBalance').innerHTML = 'Rp ' + balance.toLocaleString('id-ID');
    document.getElementById('topupModal').classList.add('active');
});

document.getElementById('closeTopupBtn')?.addEventListener('click', () => {
    document.getElementById('topupModal').classList.remove('active');
});

document.getElementById('confirmTopupBtn')?.addEventListener('click', () => {
    const amount = parseInt(document.getElementById('topupAmount')?.value);
    if (!amount || amount < 10000) {
        showNotification('Minimal top up Rp 10.000!', 'error');
        return;
    }
    const currentUser = JSON.parse(localStorage.getItem('laundry_current_user') || '{}');
    topUpBalance(currentUser.id, amount);
    showNotification(`✅ Top up Rp ${amount.toLocaleString('id-ID')} berhasil!`, 'success');
    document.getElementById('topupAmount').value = '';
    document.getElementById('topupModal').classList.remove('active');
});

// Close modal on outside click
document.getElementById('topupModal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('topupModal')) {
        document.getElementById('topupModal').classList.remove('active');
    }
});

// Animation styles
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(styleSheet);

// Logout handler
document.getElementById('logoutBtnUser')?.addEventListener('click', () => {
    localStorage.removeItem('laundry_current_user');
    window.location.href = 'login.html';
});

document.getElementById('logoutBtnAdmin')?.addEventListener('click', () => {
    localStorage.removeItem('laundry_current_user');
    window.location.href = 'login.html';
});