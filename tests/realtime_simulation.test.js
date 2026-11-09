// Test Suite: Real-Time 2-POV WhatsApp & Admin Simulation Test (termasuk verifikasi SSE)
try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile();
  }
} catch (e) {}

const app = require('../src/server');
const { getDb } = require('../src/db/database');

// Klien SSE minimal berbasis fetch + ReadableStream (tanpa dependensi tambahan)
function createSSEClient(url, headers = {}) {
  const controller = new AbortController();
  const decoder = new TextDecoder();
  let reader = null;
  let buffer = '';

  const ready = fetch(url, {
    headers: { Accept: 'text/event-stream', ...headers },
    signal: controller.signal
  }).then((res) => {
    if (!res.ok) {
      throw new Error(`Koneksi SSE ${url} gagal dengan status ${res.status}`);
    }
    reader = res.body.getReader();
    return res;
  });

  async function nextEvent(eventName, timeoutMs = 10000) {
    await ready;
    const deadline = Date.now() + timeoutMs;

    while (true) {
      const boundary = buffer.indexOf('\n\n');
      if (boundary !== -1) {
        const rawEvent = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        let event = 'message';
        const dataLines = [];
        for (const line of rawEvent.split(/\r?\n/)) {
          if (line.startsWith('event:')) {
            event = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trimStart());
          }
        }

        if (event === eventName) {
          if (dataLines.length === 0) return null;
          const rawData = dataLines.join('\n');
          try {
            return JSON.parse(rawData);
          } catch (e) {
            return rawData;
          }
        }
        continue;
      }

      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        throw new Error(`Timeout menunggu event SSE "${eventName}" dari ${url}`);
      }

      let timer;
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Timeout menunggu event SSE "${eventName}" dari ${url}`));
        }, remaining);
      });

      try {
        const { value, done } = await Promise.race([reader.read(), timeoutPromise]);
        if (done) {
          throw new Error(`Stream SSE ${url} ditutup sebelum event "${eventName}" diterima.`);
        }
        buffer += decoder.decode(value, { stream: true });
      } finally {
        clearTimeout(timer);
      }
    }
  }

  function close() {
    try {
      controller.abort();
    } catch (e) {}
  }

  return { nextEvent, close, ready };
}

async function runTest() {
  console.log('=== MEMULAI TEST 2-POV REAL-TIME SIMULASI WHATSAPP & CRM ===\n');

  const server = app.listen(3098);
  const baseUrl = 'http://127.0.0.1:3098';
  let adminSSE = null;
  let customerSSE = null;

  try {
    // 1. Uji Akses Halaman Publik Pelanggan (/simulasi) Tanpa Login
    console.log('[1] Menguji akses halaman publik /simulasi (POV Pelanggan tanpa login)...');
    const pageRes = await fetch(`${baseUrl}/simulasi`);
    if (pageRes.status !== 200) {
      throw new Error(`Akses /simulasi gagal dengan status ${pageRes.status}`);
    }
    const htmlText = await pageRes.text();
    if (!htmlText.includes('POV: PELANGGAN (PUBLIK)') || !htmlText.includes('Bro Chicken Customer Care')) {
      throw new Error('Halaman /simulasi tidak memuat konten WhatsApp pelanggan.');
    }
    console.log('[PASS] Halaman publik /simulasi sukses diakses tanpa login (200 OK).');

    // 2. Login POV Admin
    console.log('[2] Login sebagai Admin untuk POV 2...');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '12345678' })
    });
    const adminCookie = loginRes.headers.get('set-cookie');
    if (!adminCookie) {
      throw new Error('Login admin gagal.');
    }

    // 3. Buka stream SSE Admin, lalu pastikan koneksi terdaftar di event hub
    console.log('[3] Membuka koneksi SSE Admin...');
    const adminSessionCookie = adminCookie.split(';')[0];
    adminSSE = createSSEClient(`${baseUrl}/api/simulation/admin/stream`, {
      Cookie: adminSessionCookie
    });
    const adminConnected = await adminSSE.nextEvent('connected');
    if (!adminConnected || adminConnected.role !== 'ADMIN') {
      throw new Error('Event connected admin tidak diterima dengan benar.');
    }
    console.log('[PASS] SSE Admin terhubung dan terdaftar di event hub.');

    // 4. Buka stream SSE Pelanggan sebelum mengirim chat
    console.log('[4] Membuka koneksi SSE Pelanggan...');
    const customerPhone = '081299112233';
    customerSSE = createSSEClient(
      `${baseUrl}/api/simulation/public/stream?phone=${encodeURIComponent(customerPhone)}`
    );
    const customerConnected = await customerSSE.nextEvent('connected');
    if (!customerConnected || customerConnected.role !== 'CUSTOMER') {
      throw new Error('Event connected pelanggan tidak diterima dengan benar.');
    }
    console.log('[PASS] SSE Pelanggan terhubung dan terdaftar di event hub.');

    // 5. Kirim chat komplain dari POV Pelanggan TANPA cookie sesi
    console.log('[5] Mengirim chat komplain via endpoint publik /api/simulation/public/chat...');
    const chatMessage = 'Min, ayam gepreknya asin banget dan sambalnya kurang banyak!';
    const publicChatRes = await fetch(`${baseUrl}/api/simulation/public/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rina Publik 2POV',
        phone: customerPhone,
        source: 'GRABFOOD',
        message: chatMessage
      })
    });

    const publicChatData = await publicChatRes.json();
    if (!publicChatData.success || !publicChatData.analysis.is_complaint) {
      throw new Error('Gagal memproses chat publik komplain: ' + JSON.stringify(publicChatData));
    }

    const createdTicket = publicChatData.ticket;
    if (!createdTicket || !createdTicket.ticket_code) {
      throw new Error('Tiket tidak berhasil dibuat dari endpoint publik.');
    }
    console.log(`[PASS] Tiket #${createdTicket.ticket_code} berhasil dibuat otomatis via endpoint publik!`);

    // 6. Verifikasi event SSE new_customer_chat diterima Admin
    console.log('[6] Menunggu event SSE new_customer_chat di sisi Admin...');
    const adminChatEvent = await adminSSE.nextEvent('new_customer_chat');
    if (!adminChatEvent || adminChatEvent.message !== chatMessage) {
      throw new Error('Admin tidak menerima event SSE new_customer_chat dengan isi pesan yang benar.');
    }
    if (!adminChatEvent.ticket || adminChatEvent.ticket.id !== createdTicket.id) {
      throw new Error('Event SSE Admin tidak membawa tiket yang sama dengan respons HTTP.');
    }
    if (!adminChatEvent.analysis || adminChatEvent.analysis.is_complaint !== true) {
      throw new Error('Event SSE Admin tidak membawa hasil analisis AI Triage.');
    }
    console.log('[PASS] Admin menerima chat pelanggan secara real-time via SSE, lengkap dengan tiket & analisis AI.');

    // 7. Admin membalas manual (Human-in-the-Loop)
    console.log('[7] Admin membalas pesan ke pelanggan via /api/simulation/admin/reply...');
    const replyMessage = 'Halo Kak Rina, mohon maaf atas rasa asinnya. Tim dapur kami segera buatkan dan kirimkan porsi baru ya Kak.';
    const replyRes = await fetch(`${baseUrl}/api/simulation/admin/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminSessionCookie
      },
      body: JSON.stringify({
        phone: customerPhone,
        ticket_id: createdTicket.id,
        message: replyMessage
      })
    });

    const replyData = await replyRes.json();
    if (!replyData.success) {
      throw new Error('Gagal mengirim balasan admin: ' + (replyData.error || 'Unknown'));
    }
    if (replyData.delivered_to_stream !== true) {
      throw new Error('Server tidak mendeteksi stream pelanggan aktif saat mengirim balasan admin.');
    }

    // 8. Verifikasi event SSE admin_reply diterima Pelanggan
    console.log('[8] Menunggu event SSE admin_reply di sisi Pelanggan...');
    const customerReplyEvent = await customerSSE.nextEvent('admin_reply');
    if (!customerReplyEvent || customerReplyEvent.message !== replyMessage) {
      throw new Error('Pelanggan tidak menerima event SSE admin_reply dengan isi balasan yang benar.');
    }
    if (customerReplyEvent.sender !== 'admin') {
      throw new Error('Event SSE admin_reply tidak memiliki sender admin.');
    }
    console.log('[PASS] Pelanggan menerima balasan manual admin secara real-time via SSE!');

    // 9. Verifikasi Integritas Database SQLite
    console.log('[9] Memeriksa status tiket dan log aktivitas di SQLite...');
    const db = getDb();
    const updatedTicket = db.prepare('SELECT * FROM complaints WHERE id = ?').get(createdTicket.id);

    if (updatedTicket.status !== 'IN_PROGRESS') {
      throw new Error(`Status tiket harusnya IN_PROGRESS setelah respons admin, tapi ditemukan: ${updatedTicket.status}`);
    }
    if (!updatedTicket.first_response_at) {
      throw new Error('first_response_at harus terisi setelah respons admin.');
    }

    const activities = db.prepare('SELECT * FROM complaint_activities WHERE complaint_id = ? ORDER BY id ASC').all(createdTicket.id);
    const hasAdminNote = activities.some(a => a.description.includes('Balasan Admin via WhatsApp'));
    if (!hasAdminNote) {
      throw new Error('Log aktivitas balasan admin tidak tercatat di SQLite.');
    }
    console.log('[PASS] Tiket otomatis berpindah ke IN_PROGRESS dengan first_response_at tercatat & audit log tersimpan!');

    console.log('\n=== SELURUH PENGUJIAN 2-POV REAL-TIME BERHASIL 100% ===');
  } finally {
    if (adminSSE) adminSSE.close();
    if (customerSSE) customerSSE.close();
    server.close();
  }
}

runTest().catch(err => {
  console.error('\n[ERROR]', err.message);
  process.exit(1);
});
