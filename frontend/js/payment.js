// Tambahkan di script.js
let paymentMethods = [
    { id: "pm1", name: "Tunai", icon: "fa-money-bill" },
    { id: "pm2", name: "QRIS", icon: "fa-qrcode" },
    { id: "pm3", name: "Transfer Bank", icon: "fa-university" },
    { id: "pm4", name: "E-Wallet (OVO/DANA)", icon: "fa-mobile-alt" }
];

// Fitur pembayaran di dashboard admin
function renderPaymentReport() {
    let qrisTotal = orders.filter(o => o.paymentMethod === "qris").reduce((s,o) => s + o.totalPrice, 0);
    let cashTotal = orders.filter(o => o.paymentMethod === "cash").reduce((s,o) => s + o.totalPrice, 0);
    // Tampilkan grafik perbandingan
}