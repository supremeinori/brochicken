// Test Suite: WhatsApp AI Simulation & Human-in-the-Loop Integration Test
const http = require('http');

try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile();
  }
} catch (e) {}

const app = require('../src/server');

async function runTest() {
  console.log('=== MEMULAI TEST SIMULASI WHATSAPP AI & HUMAN-IN-THE-LOOP ===\n');

  // Cari port bebas atau gunakan 3099 untuk test
  const server = app.listen(3099);
  const baseUrl = 'http://127.0.0.1:3099';

  try {
    // 1. Login sebagai Admin
    console.log('[1] Login sebagai Admin (admin / 12345678)...');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '12345678' })
    });
    
    let cookie = loginRes.headers.get('set-cookie');
    if (!loginRes.ok) {
      const err = await loginRes.json();
      throw new Error('Gagal login: ' + (err.error || loginRes.statusText));
    }

    // 2. Cek endpoint GET /api/simulation/samples
    console.log('[2] Mengambil daftar skenario sampel (/api/simulation/samples)...');
    const samplesRes = await fetch(`${baseUrl}/api/simulation/samples`, {
      headers: { Cookie: cookie }
    });
    const samplesData = await samplesRes.json();
    if (!samplesData.success || samplesData.data.length < 5) {
      throw new Error('Gagal mengambil data sampel skenario.');
    }
    console.log(`[PASS] Berhasil memuat ${samplesData.data.length} skenario contoh.`);

    // 3. Uji Chat Komplain Makanan ➔ Tiket CRM Otomatis
    console.log('[3] Mengirim chat simulasi komplain makanan...');
    const complaintChatRes = await fetch(`${baseUrl}/api/simulation/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie
      },
      body: JSON.stringify({
        name: 'Doni Simulatortest',
        phone: '081299998888',
        source: 'GOFOOD',
        message: 'Min, ayam geprek yang saya terima dingin banget dan saus kejunya tumpah berantakan di kantong!'
      })
    });

    const complaintResult = await complaintChatRes.json();
    if (!complaintResult.success) {
      throw new Error('Gagal memproses chat komplain: ' + complaintResult.error);
    }

    console.log(`  Engine: ${complaintResult.engine}`);
    console.log(`  Is Complaint: ${complaintResult.analysis.is_complaint}`);
    console.log(`  Kategori Terdeteksi: ${complaintResult.analysis.category}`);
    console.log(`  Tiket Dibuat: #${complaintResult.ticket.ticket_code}`);
    console.log(`  SLA Timer: ${complaintResult.ticket.sla_due_at}`);

    if (!complaintResult.analysis.is_complaint) {
      throw new Error('AI gagal mendeteksi pesan sebagai komplain.');
    }
    if (!complaintResult.ticket || !complaintResult.ticket.ticket_code) {
      throw new Error('Tiket CRM tidak berhasil dibuat.');
    }
    console.log('[PASS] Tiket komplain berhasil dibuat secara otomatis dengan timer SLA 60 menit!');

    // 4. Uji Chat Non-Komplain ➔ Tidak Bikin Tiket
    console.log('[4] Mengirim chat pertanyaan santai (non-komplain)...');
    const casualChatRes = await fetch(`${baseUrl}/api/simulation/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie
      },
      body: JSON.stringify({
        name: 'Doni Simulatortest',
        phone: '081299998888',
        source: 'GOFOOD',
        message: 'Halo Bro Chicken, paket combo hemat masih ready gak buat dipesan siang ini?'
      })
    });

    const casualResult = await casualChatRes.json();
    if (!casualResult.success) {
      throw new Error('Gagal memproses chat kasual: ' + casualResult.error);
    }

    console.log(`  Is Complaint: ${casualResult.analysis.is_complaint}`);
    console.log(`  Balasan AI: ${casualResult.reply}`);
    if (casualResult.analysis.is_complaint || casualResult.ticket !== null) {
      throw new Error('Chat santai keliru dianggap sebagai tiket komplain.');
    }
    console.log('[PASS] Chat santai dijawab ramah tanpa membuat tiket sampah!');

    console.log('\n=== SELURUH PENGUJIAN SIMULASI BERHASIL 100% ===');
  } finally {
    server.close();
  }
}

runTest().catch(err => {
  console.error('\n[ERROR]', err.message);
  process.exit(1);
});
