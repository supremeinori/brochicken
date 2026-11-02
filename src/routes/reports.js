const express = require('express');
const { getDb } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function getPeriodDateRange(period, startDate, endDate) {
  const now = new Date();
  let start = new Date();
  let end = new Date(now.getTime() + 86400000);

  if (period === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (period === '7days') {
    start = new Date(now.getTime() - 7 * 86400000);
  } else if (period === '30days') {
    start = new Date(now.getTime() - 30 * 86400000);
  } else if (period === 'this_month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'custom' && startDate && endDate) {
    start = new Date(startDate);
    end = new Date(new Date(endDate).getTime() + 86400000);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString()
  };
}

// GET /api/reports
router.get('/', (req, res) => {
  const db = getDb();
  const period = req.query.period || 'this_month';
  const { startIso, endIso } = getPeriodDateRange(period, req.query.start_date, req.query.end_date);

  // 1. Pelanggan baru dalam periode
  const newCustomers = db.prepare(
    "SELECT COUNT(*) as count FROM customers WHERE created_at >= ? AND created_at <= ?"
  ).get(startIso, endIso).count;

  // 2. Tiket dalam periode
  const tickets = db.prepare(`
    SELECT c.*, cust.name as customer_name, u.name as assigned_to_name
    FROM complaints c
    JOIN customers cust ON c.customer_id = cust.id
    LEFT JOIN users u ON c.assigned_to = u.id
    WHERE c.created_at >= ? AND c.created_at <= ?
  `).all(startIso, endIso);

  const totalComplaints = tickets.length;

  // Status breakdown
  const statusCounts = {
    NEW: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0
  };
  tickets.forEach(t => {
    if (statusCounts[t.status] !== undefined) statusCounts[t.status]++;
  });

  // Category breakdown
  const categoryCounts = {
    FOOD_QUALITY: 0,
    WRONG_ORDER: 0,
    DELIVERY_DELAY: 0,
    SERVICE: 0,
    CLEANLINESS: 0,
    OTHER: 0
  };
  tickets.forEach(t => {
    if (categoryCounts[t.category] !== undefined) categoryCounts[t.category]++;
  });

  // SLA calculations:
  // Tickets with first response
  const respondedTickets = tickets.filter(t => t.first_response_at !== null);
  let totalResponseTimeMins = 0;
  let compliantCount = 0;
  let overdueCount = 0;

  respondedTickets.forEach(t => {
    const createdMs = new Date(t.created_at).getTime();
    const respMs = new Date(t.first_response_at).getTime();
    const dueMs = new Date(t.sla_due_at).getTime();
    const durationMins = Math.max(1, Math.round((respMs - createdMs) / 60000));
    totalResponseTimeMins += durationMins;

    if (respMs <= dueMs) {
      compliantCount++;
    } else {
      overdueCount++;
    }
  });

  // Also check tickets not yet responded but already overdue
  const nowMs = Date.now();
  tickets.filter(t => t.first_response_at === null && t.status !== 'RESOLVED').forEach(t => {
    const dueMs = new Date(t.sla_due_at).getTime();
    if (nowMs > dueMs) {
      overdueCount++;
    }
  });

  const avgResponseTime = respondedTickets.length > 0
    ? Math.round(totalResponseTimeMins / respondedTickets.length)
    : 0;

  const slaComplianceRate = respondedTickets.length > 0
    ? parseFloat(((compliantCount / respondedTickets.length) * 100).toFixed(1))
    : 100.0;

  // PIC Performance breakdown
  const picStats = {};
  const activeAdmins = db.prepare("SELECT id, name FROM users WHERE role = 'ADMIN'").all();
  activeAdmins.forEach(adm => {
    picStats[adm.id] = {
      id: adm.id,
      name: adm.name,
      total_tickets: 0,
      on_time: 0,
      overdue: 0,
      compliance_rate: 100.0
    };
  });

  tickets.forEach(t => {
    if (t.assigned_to && picStats[t.assigned_to]) {
      picStats[t.assigned_to].total_tickets++;
      if (t.first_response_at) {
        const respMs = new Date(t.first_response_at).getTime();
        const dueMs = new Date(t.sla_due_at).getTime();
        if (respMs <= dueMs) {
          picStats[t.assigned_to].on_time++;
        } else {
          picStats[t.assigned_to].overdue++;
        }
      }
    }
  });

  Object.values(picStats).forEach(p => {
    const totalHandled = p.on_time + p.overdue;
    p.compliance_rate = totalHandled > 0 ? parseFloat(((p.on_time / totalHandled) * 100).toFixed(1)) : 100.0;
  });

  res.json({
    success: true,
    data: {
      period,
      summary: {
        new_customers: newCustomers,
        total_complaints: totalComplaints,
        avg_response_minutes: avgResponseTime,
        sla_compliance_rate: slaComplianceRate,
        overdue_complaints: overdueCount,
        status_counts: statusCounts
      },
      category_distribution: categoryCounts,
      pic_performance: Object.values(picStats)
    }
  });
});

// GET /api/reports/export-csv
router.get('/export-csv', (req, res) => {
  const db = getDb();
  const period = req.query.period || 'this_month';
  const { startIso, endIso } = getPeriodDateRange(period, req.query.start_date, req.query.end_date);

  const tickets = db.prepare(`
    SELECT
      c.ticket_code,
      cust.name as customer_name,
      cust.phone as customer_phone,
      c.category,
      c.priority,
      c.status,
      u.name as assigned_to_name,
      c.created_at,
      c.sla_due_at,
      c.first_response_at,
      c.resolved_at,
      c.description
    FROM complaints c
    JOIN customers cust ON c.customer_id = cust.id
    LEFT JOIN users u ON c.assigned_to = u.id
    WHERE c.created_at >= ? AND c.created_at <= ?
    ORDER BY c.created_at DESC
  `).all(startIso, endIso);

  const categoryNames = {
    FOOD_QUALITY: 'Kualitas Makanan',
    WRONG_ORDER: 'Pesanan Tidak Sesuai',
    DELIVERY_DELAY: 'Keterlambatan Pengiriman',
    SERVICE: 'Pelayanan',
    CLEANLINESS: 'Kebersihan',
    OTHER: 'Lainnya'
  };

  const statusNames = {
    NEW: 'Baru',
    IN_PROGRESS: 'Diproses',
    RESOLVED: 'Selesai'
  };

  const priorityNames = {
    LOW: 'Rendah',
    MEDIUM: 'Sedang',
    HIGH: 'Tinggi'
  };

  let csvContent = 'ID Tiket,Nama Pelanggan,No WhatsApp,Kategori,Prioritas,Status,PIC,Waktu Dibuat,Batas SLA,Respons Pertama,Waktu Selesai,Status SLA,Deskripsi\n';

  tickets.forEach(t => {
    let slaStatus = 'Tepat Waktu';
    const dueMs = new Date(t.sla_due_at).getTime();
    if (t.first_response_at) {
      const respMs = new Date(t.first_response_at).getTime();
      if (respMs > dueMs) slaStatus = 'Terlambat';
    } else if (Date.now() > dueMs && t.status !== 'RESOLVED') {
      slaStatus = 'Terlambat';
    }

    // Mask phone number for privacy per NFR-08 (e.g. 62812****7890)
    const phone = t.customer_phone;
    const maskedPhone = phone && phone.length > 7
      ? phone.substring(0, 5) + '****' + phone.substring(phone.length - 3)
      : phone;

    const row = [
      `"${t.ticket_code}"`,
      `"${t.customer_name.replace(/"/g, '""')}"`,
      `"${maskedPhone}"`,
      `"${categoryNames[t.category] || t.category}"`,
      `"${priorityNames[t.priority] || t.priority}"`,
      `"${statusNames[t.status] || t.status}"`,
      `"${(t.assigned_to_name || '-').replace(/"/g, '""')}"`,
      `"${t.created_at}"`,
      `"${t.sla_due_at}"`,
      `"${t.first_response_at || '-'}"`,
      `"${t.resolved_at || '-'}"`,
      `"${slaStatus}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`
    ];
    csvContent += row.join(',') + '\n';
  });

  const filename = `laporan_crm_brochicken_${period}_${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('\uFEFF' + csvContent); // Add UTF-8 BOM for Excel compatibility
});

module.exports = router;
