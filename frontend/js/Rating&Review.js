let reviews = [
    { id: "r1", orderId: "ORD001", rating: 5, comment: "Sangat puas, cucian bersih dan wangi!", date: "2025-04-20" },
    { id: "r2", orderId: "ORD002", rating: 4, comment: "Cepat dan rapi", date: "2025-04-21" }
];

// Fungsi tambah review
function addReview(orderId, rating, comment) {
    if (orders.find(o => o.id === orderId && o.userId === currentUser.id)) {
        reviews.push({ id: generateId("r"), orderId, rating, comment, date: new Date().toISOString().split("T")[0] });
        showNotification("Terima kasih atas review Anda! ⭐");
        saveData();
    }
}