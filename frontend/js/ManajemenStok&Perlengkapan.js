let inventory = [
    { id: "inv1", name: "Deterjen", quantity: 50, unit: "kg", price: 15000, supplier: "PT Kimia" },
    { id: "inv2", name: "Pewangi", quantity: 30, unit: "liter", price: 25000, supplier: "PT Wangi" },
    { id: "inv3", name: "Kantong Plastik", quantity: 500, unit: "pcs", price: 500, supplier: "Supplier Plastik" }
];

// Fungsi update stok
function updateStock(itemId, quantity) {
    let item = inventory.find(i => i.id === itemId);
    if (item) {
        item.quantity -= quantity;
        if (item.quantity < 10) {
            showNotification(`Stok ${item.name} menipis!`, "warning");
        }
    }
}