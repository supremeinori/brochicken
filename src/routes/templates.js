const express = require('express');
const { getDb } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const STATIC_TEMPLATES = [
  {
    id: 'COMPLAINT_RECEIVED',
    title: 'Konfirmasi Penerimaan Keluhan',
    category: 'Keluhan',
    description: 'Dikirim saat tiket keluhan baru dicatat untuk mengonfirmasi penanganan.',
    template: 'Halo Kak {nama}, kami telah menerima keluhan Kakak dengan nomor tiket #{ticket_id}. Tim Bro Chicken sedang menindaklanjuti keluhan ini. Kami akan segera menghubungi Kakak kembali. Mohon ditunggu ya, Kak.'
  },
  {
    id: 'COMPLAINT_RESOLVED',
    title: 'Informasi Penyelesaian Keluhan',
    category: 'Keluhan',
    description: 'Dikirim setelah keluhan berhasil diselesaikan untuk konfirmasi ke pelanggan.',
    template: 'Halo Kak {nama}, tiket keluhan #{ticket_id} telah selesai ditindaklanjuti oleh tim Bro Chicken. Mohon maaf atas ketidaknyamanan yang terjadi. Kami berterima kasih atas masukan Kakak dan terus berusaha memberikan yang terbaik. Ada hal lain yang bisa kami bantu?'
  },
  {
    id: 'GREETING',
    title: 'Sambutan Pelanggan Baru',
    category: 'Relasi',
    description: 'Menyapa pelanggan yang baru pertama kali terdaftar dalam basis data CRM.',
    template: 'Halo Kak {nama}, terima kasih telah menjadi pelanggan setia Bro Chicken! Simpan nomor ini untuk info menu spesial dan promo menarik dari kami ya. Selamat menikmati sajian krispi Bro Chicken!'
  },
  {
    id: 'REVIEW_REQUEST',
    title: 'Permintaan Ulasan Pelanggan',
    category: 'Relasi',
    description: 'Mengajak pelanggan memberikan masukan pengalaman bersantap.',
    template: 'Halo Kak {nama}, bagaimana pengalaman Kakak menikmati hidangan Bro Chicken hari ini? Kami sangat menghargai jika Kakak berkenan memberikan ulasan singkat agar kami bisa terus melayani lebih baik lagi. Terima kasih!'
  }
];

// GET /api/templates
router.get('/', (req, res) => {
  const customerId = req.query.customer_id ? parseInt(req.query.customer_id, 10) : null;
  const ticketId = req.query.ticket_id ? parseInt(req.query.ticket_id, 10) : null;

  const db = getDb();
  let customer = null;
  let ticket = null;

  if (customerId && !isNaN(customerId)) {
    customer = db.prepare('SELECT id, name, phone, customer_code FROM customers WHERE id = ?').get(customerId);
  }

  if (ticketId && !isNaN(ticketId)) {
    ticket = db.prepare('SELECT id, ticket_code, customer_id FROM complaints WHERE id = ?').get(ticketId);
    if (!customer && ticket) {
      customer = db.prepare('SELECT id, name, phone, customer_code FROM customers WHERE id = ?').get(ticket.customer_id);
    }
  }

  const renderedTemplates = STATIC_TEMPLATES.map(tmpl => {
    let text = tmpl.template;
    const nameVal = customer ? customer.name : '{nama}';
    const ticketVal = ticket ? ticket.ticket_code : (ticketId ? `TCK-${ticketId}` : '{ticket_id}');

    text = text.replace(/\{nama\}/g, nameVal);
    text = text.replace(/\{ticket_id\}/g, ticketVal);
    text = text.replace(/\{nama_bisnis\}/g, 'Bro Chicken');

    return {
      ...tmpl,
      renderedText: text
    };
  });

  res.json({
    success: true,
    data: renderedTemplates,
    customer,
    ticket
  });
});

module.exports = router;
