const express = require('express');
const { getDb } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function getPeriodDateRange(period, startDate, endDate) {
  const now = new Date();
  let start = new Date();
  let end = new Date(now.getTime() + 86400000); // end of today

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
    // default to this_month per SRS FR-02
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString()
  };
}

// GET /api/dashboard
router.get('/', (req, res) => {
  const db = getDb();
  const period = req.query.period || 'this_month';
  const { startIso, endIso } = getPeriodDateRange(period, req.query.start_date, req.query.end_date);

  // 1. Total Pelanggan Aktif (keseluruhan)
  const totalActiveCustomers = db.prepare(
    "SELECT COUNT(*) as count FROM customers WHERE status = 'ACTIVE'"
  ).get().count;

  // 2. Pelanggan Baru pada Periode Filter
  const newCustomersInPeriod = db.prepare(
    "SELECT COUNT(*) as count FROM customers WHERE created_at >= ? AND created_at <= ?"
  ).get(startIso, endIso).count;

  // 3. Tiket berdasarkan status pada periode
  const ticketsByStatus = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'NEW' THEN 1 ELSE 0 END) as count_new,
      SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as count_in_progress,
      SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as count_resolved,
      COUNT(*) as count_total
    FROM complaints
    WHERE created_at >= ? AND created_at <= ?
  `).get(startIso, endIso);

  // 4. Tiket lewat SLA (belum ada first_response_at dan sekarang > sla_due_at)
  const nowIso = new Date().toISOString();
  const overdueTickets = db.prepare(`
    SELECT COUNT(*) as count
    FROM complaints
    WHERE status != 'RESOLVED'
      AND first_response_at IS NULL
      AND sla_due_at < ?
  `).get(nowIso).count;

  // 5. Lima Tiket Terbaru
  const recentTickets = db.prepare(`
    SELECT
      c.id, c.ticket_code, c.category, c.priority, c.status,
      c.created_at, c.sla_due_at, c.first_response_at, c.resolved_at,
      cust.name as customer_name, cust.phone as customer_phone,
      u.name as assigned_to_name
    FROM complaints c
    JOIN customers cust ON c.customer_id = cust.id
    LEFT JOIN users u ON c.assigned_to = u.id
    ORDER BY c.created_at DESC
    LIMIT 5
  `).all();

  const now = Date.now();
  const enrichedRecentTickets = recentTickets.map(t => {
    const dueTime = new Date(t.sla_due_at).getTime();
    let slaLabel = '';
    let slaClass = '';

    if (t.status === 'RESOLVED') {
      const respTime = t.first_response_at ? new Date(t.first_response_at).getTime() : new Date(t.resolved_at).getTime();
      const isLate = respTime > dueTime;
      slaLabel = isLate ? 'Lewat batas waktu' : 'Tepat waktu';
      slaClass = isLate ? 'badge-danger' : 'badge-success';
    } else {
      const diffMins = Math.round((dueTime - now) / 60000);
      if (diffMins < 0) {
        slaLabel = `Lewat ${Math.abs(diffMins)} mnt`;
        slaClass = 'badge-danger';
      } else if (diffMins <= 15) {
        slaLabel = `Sisa ${diffMins} mnt`;
        slaClass = 'badge-warning';
      } else {
        slaLabel = `Sisa ${diffMins} mnt`;
        slaClass = 'badge-info';
      }
    }

    return {
      ...t,
      sla_label: slaLabel,
      sla_class: slaClass
    };
  });

  res.json({
    success: true,
    data: {
      period,
      total_active_customers: totalActiveCustomers,
      new_customers_in_period: newCustomersInPeriod,
      tickets: {
        new: ticketsByStatus.count_new || 0,
        in_progress: ticketsByStatus.count_in_progress || 0,
        resolved: ticketsByStatus.count_resolved || 0,
        total: ticketsByStatus.count_total || 0,
        overdue: overdueTickets
      },
      recent_tickets: enrichedRecentTickets
    }
  });
});

module.exports = router;
