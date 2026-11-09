const express = require('express');
const { getDb, getNextCustomerCode, getNextTicketCode, normalizePhone } = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const { triageCustomerMessage } = require('../services/aiTriage');
const eventHub = require('../services/eventHub');

const router = express.Router();

const SAMPLES = [
  {
    id: 1,
    title: 'Ayam Dingin & Saus Tumpah',
    badge: 'Kualitas Makanan (Tinggi)',
    badgeClass: 'badge-danger',
    name: 'Rian Pratama',
    phone: '081299887711',
    source: 'GOFOOD',
    message: 'Min, ayam geprek paha atas yang saya terima di GoFood dingin banget dan saus kejunya tumpah berantakan di kantong plastik. Tolong solusinya dong min!'
  },
  {
    id: 2,
    title: 'Sambal & Nasi Ketinggalan',
    badge: 'Pesanan Kurang (Sedang)',
    badgeClass: 'badge-warning',
    name: 'Siti Rahma',
    phone: '081377665544',
    source: 'GRABFOOD',
    message: 'Halo Bro Chicken, saya pesan 2 box paket combo via GrabFood tapi sambal bawangnya gak ada sama sekali, padahal saya sudah bayar ekstra sambal 2 porsi.'
  },
  {
    id: 3,
    title: 'Pengiriman Driver Telat Lama',
    badge: 'Pengiriman (Sedang)',
    badgeClass: 'badge-warning',
    name: 'Dewi Lestari',
    phone: '085711223344',
    source: 'GRABFOOD',
    message: 'Min sudah 55 menit status pesanan masih disiapkan resto, kata driver abangnya sudah nunggu lama banget di kasir outlet Margonda belum selesai juga.'
  },
  {
    id: 4,
    title: 'Pelayanan Staf Kasir Kurang Ramah',
    badge: 'Pelayanan (Sedang)',
    badgeClass: 'badge-info',
    name: 'Fajar Nugraha',
    phone: '081288776655',
    source: 'DIRECT',
    message: 'Tadi sore jam 17.00 saya beli langsung di outlet Margonda, staf kasirnya jutek banget pas ditanya promo paket hemat dan struknya gak dikasih.'
  },
  {
    id: 5,
    title: 'Tanya Paket Catering (Non-Komplain)',
    badge: 'Pertanyaan Biasa',
    badgeClass: 'badge-neutral',
    name: 'Bambang Kusuma',
    phone: '081900112233',
    source: 'DIRECT',
    message: 'Halo Bro Chicken, selamat siang! Mau tanya apakah untuk besok siang bisa pesan paket nasi ayam geprek 30 box untuk acara kantor?'
  }
];

// Helper: normalisasi hasil analisis yang tersimpan sebagai JSON.
function parseAnalysisJson(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
}

// Helper: bentuk pesan simulasi yang aman dikirim ke klien.
function serializeSimulationMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    customer_id: row.customer_id,
    phone: row.phone,
    direction: row.direction,
    sender_type: row.sender_type,
    sender_name: row.sender_name,
    body: row.body,
    ticket_id: row.ticket_id,
    analysis: parseAnalysisJson(row.analysis_json),
    read_at: row.read_at,
    created_at: row.created_at
  };
}

// Helper: simpan satu pesan ke ruang simulasi pelanggan.
function insertSimulationMessage(db, data) {
  const createdAt = data.createdAt || new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO simulation_messages (
      customer_id, phone, direction, sender_type, sender_name, body,
      ticket_id, analysis_json, read_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.customerId,
    data.phone,
    data.direction,
    data.senderType,
    data.senderName,
    data.body,
    data.ticketId || null,
    data.analysis ? JSON.stringify(data.analysis) : null,
    data.readAt || null,
    createdAt
  );

  return db.prepare('SELECT * FROM simulation_messages WHERE id = ?').get(result.lastInsertRowid);
}

// Helper: daftar ruang chat. Satu pelanggan selalu menjadi satu ruang.
function listSimulationRooms(db) {
  const rows = db.prepare(`
    SELECT
      c.id AS customer_id,
      c.customer_code,
      c.name,
      c.phone,
      c.source,
      c.status,
      c.joined_at,
      lm.id AS last_message_id,
      lm.body AS last_message_body,
      lm.sender_type AS last_message_sender_type,
      lm.direction AS last_message_direction,
      lm.created_at AS last_message_at,
      COALESCE(unread.unread_count, 0) AS unread_count,
      lt.id AS latest_ticket_id,
      lt.ticket_code AS latest_ticket_code,
      lt.status AS latest_ticket_status,
      lt.priority AS latest_ticket_priority,
      lt.sla_due_at AS latest_ticket_sla_due_at,
      lt.created_at AS latest_ticket_created_at
    FROM customers c
    LEFT JOIN (
      SELECT m.*
      FROM simulation_messages m
      INNER JOIN (
        SELECT customer_id, MAX(id) AS max_id
        FROM simulation_messages
        GROUP BY customer_id
      ) latest ON latest.max_id = m.id
    ) lm ON lm.customer_id = c.id
    LEFT JOIN (
      SELECT customer_id, COUNT(*) AS unread_count
      FROM simulation_messages
      WHERE direction = 'IN' AND read_at IS NULL
      GROUP BY customer_id
    ) unread ON unread.customer_id = c.id
    LEFT JOIN (
      SELECT x.*
      FROM complaints x
      INNER JOIN (
        SELECT customer_id, MAX(id) AS max_id
        FROM complaints
        GROUP BY customer_id
      ) latest_ticket ON latest_ticket.max_id = x.id
    ) lt ON lt.customer_id = c.id
    ORDER BY CASE WHEN lm.id IS NULL THEN 1 ELSE 0 END ASC,
      lm.id DESC,
      c.name COLLATE NOCASE ASC
  `).all();

  return rows.map((row) => ({
    customer_id: row.customer_id,
    customer_code: row.customer_code,
    name: row.name,
    phone: row.phone,
    source: row.source,
    status: row.status,
    joined_at: row.joined_at,
    unread_count: Number(row.unread_count) || 0,
    last_message: row.last_message_id ? {
      id: row.last_message_id,
      body: row.last_message_body,
      sender_type: row.last_message_sender_type,
      direction: row.last_message_direction,
      created_at: row.last_message_at
    } : null,
    latest_ticket: row.latest_ticket_id ? {
      id: row.latest_ticket_id,
      ticket_code: row.latest_ticket_code,
      status: row.latest_ticket_status,
      priority: row.latest_ticket_priority,
      sla_due_at: row.latest_ticket_sla_due_at,
      created_at: row.latest_ticket_created_at
    } : null
  }));
}

// Helper: Proses Chat Pelanggan (Bisa dipanggil dari rute publik maupun privat)
async function processCustomerChat(req, res) {
  try {
    const { name, phone, source, message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Pesan chat tidak boleh kosong.' });
    }

    const customerName = (name && name.trim()) ? name.trim() : 'Pelanggan Bro Chicken';
    const providedName = (name && name.trim()) ? name.trim() : null;
    const rawPhone = (phone && phone.trim()) ? phone.trim() : '081299990001';
    const normalizedPhone = normalizePhone(rawPhone);
    const validSource = ['DIRECT', 'GOFOOD', 'GRABFOOD', 'OTHER'].includes(source) ? source : 'GOFOOD';

    const db = getDb();

    // 1. Cari atau buat pelanggan di database
    let customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(normalizedPhone);
    if (!customer) {
      const customerCode = getNextCustomerCode(db);
      const now = new Date().toISOString();
      const insertCust = db.prepare(`
        INSERT INTO customers (customer_code, name, phone, source, joined_at, notes, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
      `);
      const custResult = insertCust.run(
        customerCode,
        customerName,
        normalizedPhone,
        validSource,
        now,
        `Ditambahkan otomatis melalui simulasi WhatsApp (${validSource})`,
        now,
        now
      );
      customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(custResult.lastInsertRowid);
    } else if (providedName && providedName !== customer.name) {
      // Nomor telepon adalah identitas unik pelanggan. Jangan buat data baru;
      // cukup perbarui nama dengan nama terbaru yang dikirim pelanggan.
      const now = new Date().toISOString();
      db.prepare('UPDATE customers SET name = ?, updated_at = ? WHERE id = ?')
        .run(providedName, now, customer.id);
      customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer.id);
    }

    // 2. Analisis AI Triage (Gemini 3.5 Flash Lite dengan fallback Rule-Based NLP)
    const analysis = await triageCustomerMessage(message, customer.name);

    let ticket = null;
    let autoReplyText = analysis.ai_auto_reply;

    // 3. Jika AI mendeteksi KOMPLAIN ➔ Otomatis Generate Tiket CRM & SLA 60 Menit
    if (analysis.is_complaint) {
      const ticketCode = getNextTicketCode(db);
      const now = new Date();
      const createdAt = now.toISOString();
      const slaDueAt = new Date(now.getTime() + 60 * 60000).toISOString();

      // Pilih Admin PIC aktif
      const activeAdmin = db.prepare("SELECT id, name FROM users WHERE role = 'ADMIN' AND is_active = 1 LIMIT 1").get();
      const assignedTo = activeAdmin ? activeAdmin.id : 1;
      const createdBy = (req.session && req.session.user) ? req.session.user.id : assignedTo;

      const insertTicket = db.prepare(`
        INSERT INTO complaints (
          ticket_code, customer_id, category, description, priority, status,
          assigned_to, created_by, created_at, sla_due_at, first_response_at, resolved_at
        ) VALUES (?, ?, ?, ?, ?, 'NEW', ?, ?, ?, ?, NULL, NULL)
      `);

      const ticketResult = insertTicket.run(
        ticketCode,
        customer.id,
        analysis.category,
        message,
        analysis.priority,
        assignedTo,
        createdBy,
        createdAt,
        slaDueAt
      );

      // Catat log aktivitas pembuatan tiket
      const insertActivity = db.prepare(`
        INSERT INTO complaint_activities (complaint_id, user_id, activity_type, description, created_at)
        VALUES (?, ?, 'CREATED', ?, ?)
      `);
      insertActivity.run(
        ticketResult.lastInsertRowid,
        createdBy,
        `Tiket dibuat otomatis oleh WhatsApp AI Triage (${analysis.engine}). Isu: ${analysis.extracted_problem}`,
        createdAt
      );

      // Sisipkan kode tiket asli ke balasan chat WhatsApp
      autoReplyText = autoReplyText.replace('#{ticket_code}', `#${ticketCode}`).replace('{ticket_id}', `#${ticketCode}`);

      // Ambil tiket yang baru dibuat beserta data PIC
      ticket = db.prepare(`
        SELECT c.*, u.name as assigned_to_name, u.username as assigned_to_username
        FROM complaints c
        LEFT JOIN users u ON c.assigned_to = u.id
        WHERE c.id = ?
      `).get(ticketResult.lastInsertRowid);

      ticket.sla_info = {
        code: 'ON_TRACK',
        label: 'Sisa 60 mnt',
        badgeClass: 'badge-info',
        minutesRemaining: 60
      };
    }

    // 4. Simpan percakapan ke ruang simulasi agar tetap ada setelah halaman dimuat ulang
    const inboundCreatedAt = new Date().toISOString();
    const inboundRecord = insertSimulationMessage(db, {
      customerId: customer.id,
      phone: customer.phone,
      direction: 'IN',
      senderType: 'CUSTOMER',
      senderName: customer.name,
      body: message.trim(),
      ticketId: ticket ? ticket.id : null,
      analysis,
      createdAt: inboundCreatedAt
    });

    const replyRecord = insertSimulationMessage(db, {
      customerId: customer.id,
      phone: customer.phone,
      direction: 'OUT',
      senderType: 'AI',
      senderName: 'Bro Chicken Assistant',
      body: autoReplyText,
      ticketId: ticket ? ticket.id : null,
      analysis,
      createdAt: new Date(Date.now() + 1).toISOString()
    });

    const payload = {
      success: true,
      customer,
      customer_id: customer.id,
      message_id: inboundRecord.id,
      messages: [
        serializeSimulationMessage(inboundRecord),
        serializeSimulationMessage(replyRecord)
      ],
      ticket,
      analysis,
      message,
      reply: autoReplyText,
      engine: analysis.engine,
      timestamp: new Date().toISOString()
    };

    // 5. REAL-TIME BROADCAST: Kirim event chat baru ke seluruh Admin yang sedang aktif
    eventHub.broadcastToAdmins('new_customer_chat', payload);

    res.json(payload);
  } catch (err) {
    console.error('Error processCustomerChat:', err);
    res.status(500).json({ success: false, error: 'Gagal memproses simulasi chat: ' + err.message });
  }
}

// -------------------------------------------------------------
// ENDPOINT PUBLIK (POV PELANGGAN - TANPA LOGIN)
// -------------------------------------------------------------

// GET /api/simulation/samples (Publik)
router.get('/samples', (req, res) => {
  res.json({ success: true, data: SAMPLES });
});

// GET /api/simulation/public/stream (SSE Listener untuk Pelanggan)
router.get('/public/stream', (req, res) => {
  const rawPhone = req.query.phone || '081299990001';
  const normalizedPhone = normalizePhone(rawPhone);
  eventHub.registerCustomer(normalizedPhone, res);
});

// GET /api/simulation/public/history?phone= (Riwayat chat pelanggan, tanpa login)
router.get('/public/history', (req, res) => {
  try {
    const rawPhone = req.query.phone;
    if (!rawPhone || !String(rawPhone).trim()) {
      return res.json({ success: true, customer: null, messages: [] });
    }

    const phone = normalizePhone(rawPhone);
    const db = getDb();
    const customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
    if (!customer) {
      return res.json({ success: true, customer: null, messages: [] });
    }

    const messages = db.prepare(`
      SELECT * FROM simulation_messages
      WHERE customer_id = ?
      ORDER BY id ASC
    `).all(customer.id).map(serializeSimulationMessage);

    res.json({
      success: true,
      customer,
      messages,
      data: { customer, messages }
    });
  } catch (err) {
    console.error('Error /api/simulation/public/history:', err);
    res.status(500).json({ success: false, error: 'Gagal memuat riwayat chat: ' + err.message });
  }
});

// POST /api/simulation/public/chat (Kirim Chat Pelanggan ke Sistem)
router.post('/public/chat', (req, res) => {
  processCustomerChat(req, res);
});

// POST /api/simulation/chat (Kompatibilitas rute sebelumnya)
router.post('/chat', (req, res) => {
  processCustomerChat(req, res);
});

// -------------------------------------------------------------
// ENDPOINT TERPROTEKSI (POV ADMIN - BUTUH LOGIN)
// -------------------------------------------------------------

// GET /api/simulation/admin/stream (SSE Listener untuk Admin)
router.get('/admin/stream', requireAuth, (req, res) => {
  eventHub.registerAdmin(res);
});

// GET /api/simulation/rooms (Daftar seluruh ruang chat pelanggan)
router.get('/rooms', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const rooms = listSimulationRooms(db);
    res.json({
      success: true,
      data: rooms,
      rooms,
      total: rooms.length,
      total_unread: rooms.reduce((sum, room) => sum + room.unread_count, 0)
    });
  } catch (err) {
    console.error('Error /api/simulation/rooms:', err);
    res.status(500).json({ success: false, error: 'Gagal memuat daftar ruang chat: ' + err.message });
  }
});

// GET /api/simulation/rooms/:customerId/messages (Isi percakapan satu ruang)
router.get('/rooms/:customerId/messages', requireAuth, (req, res) => {
  try {
    const customerId = Number(req.params.customerId);
    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({ success: false, error: 'ID pelanggan tidak valid.' });
    }

    const db = getDb();
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Pelanggan tidak ditemukan.' });
    }

    const rows = db.prepare(`
      SELECT * FROM simulation_messages
      WHERE customer_id = ?
      ORDER BY id ASC
    `).all(customerId);

    const messages = rows.map(serializeSimulationMessage);
    const latestAnalysis = [...messages].reverse()
      .map((item) => item.analysis)
      .find(Boolean) || null;

    const latestTicket = db.prepare(`
      SELECT c.*, u.name AS assigned_to_name
      FROM complaints c
      LEFT JOIN users u ON c.assigned_to = u.id
      WHERE c.customer_id = ?
      ORDER BY c.id DESC
      LIMIT 1
    `).get(customerId) || null;

    res.json({
      success: true,
      customer,
      messages,
      analysis: latestAnalysis,
      latest_ticket: latestTicket,
      data: {
        customer,
        messages,
        analysis: latestAnalysis,
        latest_ticket: latestTicket
      }
    });
  } catch (err) {
    console.error('Error /api/simulation/rooms/:customerId/messages:', err);
    res.status(500).json({ success: false, error: 'Gagal memuat percakapan: ' + err.message });
  }
});

// POST /api/simulation/rooms/:customerId/read (Tandai ruang sudah dibaca admin)
router.post('/rooms/:customerId/read', requireAuth, (req, res) => {
  try {
    const customerId = Number(req.params.customerId);
    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({ success: false, error: 'ID pelanggan tidak valid.' });
    }

    const db = getDb();
    const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, error: 'Pelanggan tidak ditemukan.' });
    }

    const nowIso = new Date().toISOString();
    const result = db.prepare(`
      UPDATE simulation_messages
      SET read_at = ?
      WHERE customer_id = ? AND direction = 'IN' AND read_at IS NULL
    `).run(nowIso, customerId);

    res.json({ success: true, marked: Number(result.changes) || 0, read_at: nowIso });
  } catch (err) {
    console.error('Error /api/simulation/rooms/:customerId/read:', err);
    res.status(500).json({ success: false, error: 'Gagal menandai ruang dibaca: ' + err.message });
  }
});

// POST /api/simulation/admin/reply (Admin Membalas Chat Pelanggan Secara Manual)
router.post('/admin/reply', requireAuth, (req, res) => {
  try {
    const { phone, ticket_id, message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Pesan balasan admin tidak boleh kosong.' });
    }

    if (!phone) {
      return res.status(400).json({ success: false, error: 'Nomor telepon tujuan tidak valid.' });
    }

    const normalizedPhone = normalizePhone(phone);
    const db = getDb();
    const adminUser = req.session.user;
    const nowIso = new Date().toISOString();
    const customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(normalizedPhone);

    // Jika terkait tiket, catat aktivitas di database dan update SLA first response jika perlu
    let ticket = null;
    if (ticket_id) {
      ticket = db.prepare('SELECT * FROM complaints WHERE id = ?').get(ticket_id);
      if (ticket) {
        // Catat aktivitas balasan WhatsApp oleh admin
        db.prepare(`
          INSERT INTO complaint_activities (complaint_id, user_id, activity_type, description, created_at)
          VALUES (?, ?, 'NOTE_ADDED', ?, ?)
        `).run(ticket.id, adminUser.id, `Balasan Admin via WhatsApp: ${message}`, nowIso);

        // Jika status masih NEW, tandai respons pertama dan ubah status jadi IN_PROGRESS
        if (ticket.status === 'NEW') {
          db.prepare(`
            UPDATE complaints
            SET status = 'IN_PROGRESS', first_response_at = ?
            WHERE id = ?
          `).run(nowIso, ticket.id);
        }
      }
    }

    // Simpan balasan ke ruang simulasi bila nomor terdaftar sebagai pelanggan.
    const messageRecord = customer ? insertSimulationMessage(db, {
      customerId: customer.id,
      phone: normalizedPhone,
      direction: 'OUT',
      senderType: 'ADMIN',
      senderName: adminUser.name,
      body: message.trim(),
      ticketId: ticket ? ticket.id : null,
      createdAt: nowIso
    }) : null;

    const payload = {
      sender: 'admin',
      admin_name: adminUser.name,
      message: message.trim(),
      ticket_id: ticket ? ticket.id : null,
      ticket_code: ticket ? ticket.ticket_code : null,
      timestamp: nowIso,
      customer_id: customer ? customer.id : null,
      message_id: messageRecord ? messageRecord.id : null,
      simulation_message: serializeSimulationMessage(messageRecord)
    };

    // 1. Kirim balasan real-time langsung ke SSE tab browser pelanggan
    const delivered = eventHub.sendToCustomer(normalizedPhone, 'admin_reply', payload);

    // 2. Broadcast ke semua tab admin lainnya untuk sinkronisasi
    eventHub.broadcastToAdmins('admin_reply_sent', {
      ...payload,
      phone: normalizedPhone
    });

    res.json({
      success: true,
      delivered_to_stream: delivered,
      ...payload,
      message: 'Balasan berhasil dikirimkan ke pelanggan.'
    });
  } catch (err) {
    console.error('Error /api/simulation/admin/reply:', err);
    res.status(500).json({ success: false, error: 'Gagal mengirim balasan admin: ' + err.message });
  }
});

module.exports = router;
