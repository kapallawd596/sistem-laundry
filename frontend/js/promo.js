let promos = [
    { id: "p1", code: "NEW10", discount: 10, minOrder: 50000, expiry: "2025-05-01" },
    { id: "p2", code: "FLASH20", discount: 20, minOrder: 100000, expiry: "2025-04-25" }
];

// Fungsi apply diskon
function applyDiscount(orderTotal, promoCode) {
    let promo = promos.find(p => p.code === promoCode && new Date(p.expiry) > new Date());
    if (promo && orderTotal >= promo.minOrder) {
        return orderTotal * (1 - promo.discount/100);
    }
    return orderTotal;
}