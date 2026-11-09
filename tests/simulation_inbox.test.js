// Test Suite: WhatsApp Inbox rooms, persistent history, unread state, and admin replies
try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile();
  }
} catch (e) {}

const app = require('../src/server');
const { getDb, getNextCustomerCode, normalizePhone } = require('../src/db/database');

async function runTest() {
  console.log('=== MEMULAI TEST KOTAK MASUK WHATSAPP ADMIN ===\n');

  const server = app.listen(3097);
  const baseUrl = 'http://127.0.0.1:3097';

  try {
    // 1. Login admin
    console.log('[1] Login sebagai Admin...');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '12345678' })
    });
    const cookie = (loginRes.headers.get('set-cookie') || '').split(';')[0];
    if (!cookie) throw new Error('Login admin gagal.');
    console.log('[PASS] Cookie sesi admin diterima.');

    // 2. Endpoint ruang wajib login
    console.log('[2] Memastikan daftar ruang hanya untuk admin...');
    const unauthRes = await fetch(`${baseUrl}/api/simulation/rooms`);
    if (unauthRes.status !== 401) {
      throw new Error(`Endpoint ruang tanpa login harus 401, ditemukan ${unauthRes.status}.`);
    }
    console.log('[PASS] Daftar ruang menolak akses tanpa sesi admin.');

    // 3. Siapkan pelanggan tanpa pesan untuk membuktikan ruang kosong tetap muncul
    console.log('[3] Menyiapkan pelanggan tanpa pesan...');
    const db = getDb();
    const suffix = String(Date.now()).slice(-8);
    const emptyPhone = normalizePhone(`0899${suffix}`);
    const emptyCode = getNextCustomerCode(db);
    const nowIso = new Date().toISOString();
    const emptyInsert = db.prepare(`
      INSERT INTO customers (customer_code, name, phone, source, joined_at, notes, status, created_at, updated_at)
      VALUES (?, ?, ?, 'DIRECT', ?, 'Pelanggan uji ruang kosong', 'ACTIVE', ?, ?)
    `).run(emptyCode, `Pelanggan Ruang Kosong ${suffix}`, emptyPhone, nowIso, nowIso, nowIso);
    const emptyCustomerId = Number(emptyInsert.lastInsertRowid);

    const roomsRes = await fetch(`${baseUrl}/api/simulation/rooms`, { headers: { Cookie: cookie } });
    const roomsData = await roomsRes.json();
    if (!roomsData.success || !Array.isArray(roomsData.rooms) || roomsData.rooms.length === 0) {
      throw new Error('Daftar ruang tidak berhasil dimuat.');
    }
    const emptyRoom = roomsData.rooms.find((room) => Number(room.customer_id) === emptyCustomerId);
    if (!emptyRoom) throw new Error('Pelanggan tanpa pesan tidak tampil sebagai ruang.');
    if (emptyRoom.last_message !== null || Number(emptyRoom.unread_count) !== 0) {
      throw new Error('Ruang kosong tidak boleh memiliki pesan atau unread.');
    }
    console.log(`[PASS] ${roomsData.rooms.length} pelanggan tampil sebagai ruang, termasuk ruang tanpa pesan.`);

    // 4. Kirim pesan pertama dari halaman publik
    console.log('[4] Mengirim pesan pertama dari /simulasi publik...');
    const phone = `0813${suffix}`;
    const firstMessage = 'Min, ayam geprek pesanan saya dingin dan sambalnya tumpah. Tolong dibantu ya.';
    const chatRes = await fetch(`${baseUrl}/api/simulation/public/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Pelanggan Inbox ${suffix}`, phone, source: 'GOFOOD', message: firstMessage })
    });
    const chatData = await chatRes.json();
    if (!chatData.success) throw new Error(chatData.error || 'Chat publik gagal.');
    if (!chatData.customer || !chatData.customer.id) throw new Error('Respons chat tidak membawa pelanggan.');
    if (!chatData.message_id || !Array.isArray(chatData.messages) || chatData.messages.length < 2) {
      throw new Error('Respons chat tidak membawa ID dan record pesan tersimpan.');
    }
    const customerId = Number(chatData.customer.id);
    console.log(`[PASS] Pesan pelanggan dan balasan AI tersimpan untuk pelanggan #${customerId}.`);

    // 5. Ruang baru muncul dengan pesan terakhir dan unread
    console.log('[5] Memeriksa ruang baru, pesan terakhir, dan unread...');
    const roomsRes2 = await fetch(`${baseUrl}/api/simulation/rooms`, { headers: { Cookie: cookie } });
    const roomsData2 = await roomsRes2.json();
    const room = roomsData2.rooms.find((item) => Number(item.customer_id) === customerId);
    if (!room) throw new Error('Ruang baru tidak muncul di daftar.');
    if (!room.last_message || room.last_message.sender_type !== 'AI') {
      throw new Error('Pesan terakhir ruang harus balasan AI yang baru disimpan.');
    }
    if (Number(room.unread_count) < 1) {
      throw new Error('Pesan pelanggan baru harus dihitung sebagai belum dibaca.');
    }
    if (Number(roomsData2.rooms[0].customer_id) !== customerId) {
      throw new Error('Ruang dengan pesan terbaru harus berada di urutan pertama.');
    }
    console.log('[PASS] Ruang baru berada di urutan teratas dengan unread dan pesan terakhir AI.');

    // 6. Isi percakapan lengkap dengan analisis dan tiket
    console.log('[6] Memuat isi percakapan ruang...');
    const threadRes = await fetch(`${baseUrl}/api/simulation/rooms/${customerId}/messages`, {
      headers: { Cookie: cookie }
    });
    const threadData = await threadRes.json();
    if (!threadData.success) throw new Error(threadData.error || 'Gagal memuat percakapan.');
    if (threadData.messages.length < 2) throw new Error('Percakapan harus memuat pesan masuk dan balasan AI.');
    const inbound = threadData.messages.find((item) => item.direction === 'IN');
    const aiReply = threadData.messages.find((item) => item.sender_type === 'AI');
    if (!inbound || inbound.body !== firstMessage) throw new Error('Pesan pelanggan tidak tersimpan sesuai isi.');
    if (!aiReply || !aiReply.body) throw new Error('Balasan AI tidak tersimpan.');
    if (!threadData.analysis || threadData.analysis.is_complaint !== true) {
      throw new Error('Analisis triage tidak tersimpan bersama percakapan.');
    }
    if (!threadData.latest_ticket || !threadData.latest_ticket.ticket_code) {
      throw new Error('Tiket terbaru tidak ikut dimuat di percakapan.');
    }
    console.log(`[PASS] Riwayat lengkap dimuat bersama tiket #${threadData.latest_ticket.ticket_code}.`);

    // 7. Tandai ruang dibaca
    console.log('[7] Menandai ruang sudah dibaca...');
    const readRes = await fetch(`${baseUrl}/api/simulation/rooms/${customerId}/read`, {
      method: 'POST',
      headers: { Cookie: cookie }
    });
    const readData = await readRes.json();
    if (!readData.success || Number(readData.marked) < 1) {
      throw new Error('Penandaan ruang dibaca gagal.');
    }
    const roomsRes3 = await fetch(`${baseUrl}/api/simulation/rooms`, { headers: { Cookie: cookie } });
    const roomsData3 = await roomsRes3.json();
    const roomAfterRead = roomsData3.rooms.find((item) => Number(item.customer_id) === customerId);
    if (Number(roomAfterRead.unread_count) !== 0) {
      throw new Error('Unread harus kembali 0 setelah ruang dibaca.');
    }
    console.log('[PASS] Status belum dibaca dibersihkan secara global untuk ruang.');

    // 8. Riwayat publik berdasarkan nomor telepon
    console.log('[8] Memuat riwayat dari endpoint publik...');
    const historyRes = await fetch(`${baseUrl}/api/simulation/public/history?phone=${encodeURIComponent(phone)}`);
    const historyData = await historyRes.json();
    if (!historyData.success || !Array.isArray(historyData.messages) || historyData.messages.length < 2) {
      throw new Error('Riwayat publik tidak memuat percakapan tersimpan.');
    }
    if (!historyData.messages.some((item) => item.body === firstMessage)) {
      throw new Error('Riwayat publik tidak memuat pesan pelanggan.');
    }
    console.log('[PASS] Halaman publik dapat memuat ulang riwayat berdasarkan nomor telepon.');

    // 9. Balasan admin ikut tersimpan
    console.log('[9] Mengirim balasan admin dan memeriksa persistensi...');
    const adminMessage = 'Halo Kak, mohon maaf. Tim dapur kami siapkan porsi pengganti sekarang ya.';
    const replyRes = await fetch(`${baseUrl}/api/simulation/admin/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        phone,
        ticket_id: threadData.latest_ticket.id,
        message: adminMessage
      })
    });
    const replyData = await replyRes.json();
    if (!replyData.success || !replyData.message_id) {
      throw new Error('Balasan admin tidak tersimpan ke ruang simulasi.');
    }
    const threadRes2 = await fetch(`${baseUrl}/api/simulation/rooms/${customerId}/messages`, {
      headers: { Cookie: cookie }
    });
    const threadData2 = await threadRes2.json();
    if (!threadData2.messages.some((item) => item.sender_type === 'ADMIN' && item.body === adminMessage)) {
      throw new Error('Pesan admin tidak muncul di riwayat ruang.');
    }
    const roomsRes4 = await fetch(`${baseUrl}/api/simulation/rooms`, { headers: { Cookie: cookie } });
    const roomsData4 = await roomsRes4.json();
    const roomAfterReply = roomsData4.rooms.find((item) => Number(item.customer_id) === customerId);
    if (!roomAfterReply.last_message || roomAfterReply.last_message.sender_type !== 'ADMIN') {
      throw new Error('Pesan terakhir ruang harus balasan admin.');
    }
    const stored = db.prepare(
      "SELECT COUNT(*) AS total FROM simulation_messages WHERE customer_id = ? AND sender_type = 'ADMIN'"
    ).get(customerId);
    if (Number(stored.total) < 1) throw new Error('Balasan admin tidak ada di tabel simulation_messages.');
    console.log('[PASS] Balasan admin tersimpan dan menjadi pesan terakhir ruang.');

    console.log('\n=== SELURUH PENGUJIAN KOTAK MASUK WHATSAPP BERHASIL 100% ===');
  } finally {
    server.close();
  }
}

runTest().catch((err) => {
  console.error('\n[ERROR]', err.message);
  process.exit(1);
});
