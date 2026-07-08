// backend/test-midtrans.js
require('dotenv').config({ path: __dirname + '/.env' });

const midtransClient = require('midtrans-client');

console.log('========================================');
console.log('🔍 TESTING MIDTRANS CONNECTION - SANDBOX');
console.log('========================================\n');

const serverKey = process.env.MIDTRANS_SERVER_KEY;
const clientKey = process.env.MIDTRANS_CLIENT_KEY;

console.log('📌 Server Key:', serverKey);
console.log('📌 Client Key:', clientKey);
console.log('📌 Environment: SANDBOX 🧪');
console.log('');

if (serverKey && serverKey.startsWith('SB-Mid-server')) {
    console.log('✅ Server Key format: SANDBOX (BENAR)');
} else {
    console.log('❌ Server Key format: TIDAK SESUAI untuk Sandbox');
}
console.log('');

const snap = new midtransClient.Snap({
    isProduction: false,
    serverKey: serverKey,
    clientKey: clientKey
});

async function testTransaction() {
    try {
        const orderId = `TEST-${Date.now()}`;
        console.log(`📦 Creating test transaction: ${orderId}`);
        console.log('📦 Amount: Rp 10,000');
        console.log('');
        
        const parameter = {
            transaction_details: {
                order_id: orderId,
                gross_amount: 10000
            },
            customer_details: {
                first_name: 'Test Customer',
                email: 'test@example.com',
                phone: '081234567890'
            },
            item_details: [
                {
                    id: 'TEST-1',
                    price: 10000,
                    quantity: 1,
                    name: 'Test Item'
                }
            ]
        };
        
        console.log('📤 Sending to Midtrans Sandbox...');
        const transaction = await snap.createTransaction(parameter);
        
        console.log('');
        console.log('✅ SUCCESS!');
        console.log('========================================');
        console.log('📌 Token:', transaction.token);
        console.log('📌 Redirect URL:', transaction.redirect_url);
        console.log('========================================');
        console.log('');
        console.log('🔗 Buka link di browser untuk test:');
        console.log(transaction.redirect_url);
        console.log('');
        console.log('💳 Kartu Testing Sandbox:');
        console.log('   VISA: 4811 1111 1111 1114');
        console.log('   CVV: 123');
        console.log('   Expiry: 01/25 (atau future date)');
        console.log('   3DS: 112233');
        
    } catch (error) {
        console.error('');
        console.error('❌ ERROR:', error.message);
        console.error('');
        
        if (error.httpStatusCode === 401) {
            console.error('🔴 UNAUTHORIZED!');
            console.error('   Server Key tidak valid untuk Sandbox!');
            console.error('   Pastikan:');
            console.error('   1. Server Key dari dashboard SANDBOX');
            console.error('   2. Format: SB-Mid-server-xxxxxxxxxxxx');
            console.error('   3. Key masih aktif');
        }
        
        if (error.ApiResponse) {
            console.error('📌 Midtrans Response:', JSON.stringify(error.ApiResponse, null, 2));
        }
    }
}

testTransaction();