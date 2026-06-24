// Tambahkan di orders
let orderTypes = [
    { id: "ot1", name: "Antar Sendiri", fee: 0 },
    { id: "ot2", name: "Pickup (Jemput)", fee: 5000 },
    { id: "ot3", name: "Delivery (Antar)", fee: 10000 }
];

// Fitur tracking
function trackOrder(orderId) {
    // Simulasi tracking dengan status waktu
    let statusHistory = [
        { status: "Pesanan Dibuat", time: "10:00" },
        { status: "Laundry Diproses", time: "10:30" },
        { status: "Sedang Dicuci", time: "11:00" },
        { status: "Siap Diambil", time: "13:00" }
    ];
    return statusHistory;
}