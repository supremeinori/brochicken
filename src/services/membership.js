// Bro Chicken Membership Service (Simulasi WhatsApp + Kupon Tanggal Tua)
const { getDb, getNextCustomerCode, getNextMemberCode, normalizePhone } = require('../db/database');
const eventHub = require('./eventHub');

const SIMULATION_PROVIDER = 'SIMULATION';
const VALID_SOURCES = ['DIRECT', 'GOFOOD', 'GRABFOOD', 'OTHER'];
const END_MONTH_WINDOW_DAYS = parseInt(process.env.END_MONTH_PROMO_DAYS || '3', 10);
const COUPON_VALID_DAYS = parseInt(process.env.END_MONTH_COUPON_DAYS || '7', 10);
const INACTIVE_DAYS = parseInt(process.env.MEMBER_INACTIVE_DAYS || '14', 10);

const BASE_CATALOG = [
  {
    id: 'HEMAT_KRISPI',
    name: 'Paket Hemat Krispi',
    items: 'Nasi + Ayam Krispi + Es Teh',
    price: 25000
  },
  {
    id: 'HEMAT_GEPREK',
    name: 'Paket Hemat Geprek',
    items: 'Nasi + Ayam Geprek + Es Teh',
    price: 27000
  },
  {
    id: 'HEMAT_BERDUA',
    name: 'Paket Hemat Berdua',
    items: '2 Nasi + 2 Ayam + 2 Es Teh',
    price: 50000
  }
];

const QR_CAMPAIGNS = {
  QR_OUTLET: {
    code: 'QR_OUTLET',
    label: 'QR Outlet Margonda',
    description: 'Pindai QR di meja atau area kasir outlet Bro Chicken Margonda.',
    promo_percent: 10
  },
  QR_PACKAGING: {
    code: 'QR_PACKAGING',
    label: 'QR Kemasan Pesanan',
    description: 'Pindai QR pada box kemasan pesanan Bro Chicken.',
    promo_percent: 10
  },
  QR_TABLE: {
    code: 'QR_TABLE',
    label: 'QR Meja Dine-In',
    description: 'Pindai QR di meja dine-in untuk membuka promo paket hemat.',
    promo_percent: 10
  }
};

function fail(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  throw err;
}

function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
}

function formatDateId(iso) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  });
}

function getCatalog(campaign = null) {
  const discount = campaign && campaign.promo_percent ? campaign.promo_percent : 0;
  return BASE_CATALOG.map((item) => ({
    ...item,
    promo_price: discount > 0 ? Math.round(item.price * (1 - discount / 100)) : null
  }));
}

function formatCatalog(catalog) {
  return catalog.map((item, idx) => {
    const normal = formatRupiah(item.price);
    const promo = item.promo_price ? ` | Harga promo ${formatRupiah(item.promo_price)}` : '';
    return `${idx + 1}. ${item.name} - ${item.items} (${normal}${promo})`;
  }).join('\n');
}

function getCampaign(code) {
  if (!code) return null;
  return QR_CAMPAIGNS[String(code).toUpperCase()] || null;
}

function listCampaigns() {
  return Object.values(QR_CAMPAIGNS).map((campaign) => ({
    ...campaign,
    catalog: getCatalog(campaign)
  }));
}

function buildWelcomeMessage(customer, membership) {
  return [
    `Halo Kak ${customer.name}, selamat datang di Bro Chicken Membership!`,
    '',
    'Katalog Paket Hemat:',
    formatCatalog(getCatalog()),
    '',
    `Kode member: ${membership.member_code}`,
    'Tunjukkan pesan ini di outlet Bro Chicken Margonda untuk menikmati paket hemat.'
  ].join('\n');
}

function buildQrPromoMessage(customer, membership, campaign) {
  return [
    `Halo Kak ${customer.name}, promo khusus ${campaign.label} sudah aktif!`,
    '',
    'Harga khusus paket hemat:',
    formatCatalog(getCatalog(campaign)),
    '',
    `Kode member: ${membership.member_code}`,
    'Tunjukkan pesan ini di kasir Bro Chicken Margonda. Promo hanya untuk member terdaftar.'
  ].join('\n');
}

function buildCouponMessage(customer, coupon) {
  return [
    `Halo Kak ${customer.name}, ini Promo Penyelamat Tanggal Tua dari Bro Chicken!`,
    '',
    `Diskon ${coupon.discount_percent}% untuk paket hemat.`,
    `Kode kupon: ${coupon.coupon_code}`,
    `Berlaku sampai: ${formatDateId(coupon.expires_at)}`,
    '',
    'Tunjukkan kode kupon ini ke kasir Bro Chicken Margonda sebelum masa berlaku berakhir.'
  ].join('\n');
}

function updateCustomerNameIfNeeded(db, customer, name, nowIso) {
  const providedName = name && name.trim() ? name.trim() : null;
  if (!providedName || providedName === customer.name) {
    return customer;
  }
  db.prepare('UPDATE customers SET name = ?, updated_at = ? WHERE id = ?')
    .run(providedName, nowIso, customer.id);
  return db.prepare('SELECT * FROM customers WHERE id = ?').get(customer.id);
}

function deliverMessage(db, { customer, messageType, body, campaignCode = null, couponId = null, couponCode = null, now }) {
  const nowIso = now.toISOString();
  const result = db.prepare(`
    INSERT INTO member_messages (
      customer_id, phone, message_type, body, status, provider,
      campaign_code, coupon_id, created_at, sent_at
    ) VALUES (?, ?, ?, ?, 'SENT', ?, ?, ?, ?, ?)
  `).run(
    customer.id,
    customer.phone,
    messageType,
    body,
    SIMULATION_PROVIDER,
    campaignCode,
    couponId,
    nowIso,
    nowIso
  );

  const message = db.prepare('SELECT * FROM member_messages WHERE id = ?').get(result.lastInsertRowid);

  // Push simulasi real-time ke tab pelanggan yang sedang terbuka.
  eventHub.sendToCustomer(customer.phone, 'member_message', {
    sender: 'system',
    message_type: messageType,
    message: body,
    coupon_code: couponCode,
    timestamp: nowIso
  });

  eventHub.broadcastToAdmins('member_message_sent', {
    customer_id: customer.id,
    customer_name: customer.name,
    phone: customer.phone,
    message_type: messageType,
    message: body,
    coupon_code: couponCode,
    timestamp: nowIso
  });

  return message;
}

function registerMember({ name, phone, campaignCode = null, consent, now = new Date() }) {
  const cleanName = name && name.trim() ? name.trim() : '';
  if (cleanName.length < 2) {
    fail('Nama member minimal 2 karakter.');
  }
  if (!consent) {
    fail('Persetujuan WhatsApp promotional wajib dicentang.');
  }

  const normalizedPhone = normalizePhone(phone);
  if (!/^62\d{8,15}$/.test(normalizedPhone)) {
    fail('Nomor WhatsApp tidak valid.');
  }

  const campaign = campaignCode ? getCampaign(campaignCode) : null;
  if (campaignCode && !campaign) {
    fail('Campaign QR tidak valid.');
  }

  const db = getDb();
  const nowIso = now.toISOString();
  let customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(normalizedPhone);
  let customerCreated = false;

  if (customer && customer.status === 'ARCHIVED') {
    fail('Pelanggan dengan nomor ini sedang diarsipkan. Hubungi admin Bro Chicken.');
  }

  if (!customer) {
    const customerCode = getNextCustomerCode(db);
    const result = db.prepare(`
      INSERT INTO customers (customer_code, name, phone, source, joined_at, notes, status, created_at, updated_at)
      VALUES (?, ?, ?, 'DIRECT', ?, ?, 'ACTIVE', ?, ?)
    `).run(
      customerCode,
      cleanName,
      normalizedPhone,
      nowIso,
      'Terdaftar sebagai member melalui ' + (campaign ? campaign.label : 'form membership'),
      nowIso,
      nowIso
    );
    customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
    customerCreated = true;
  } else {
    customer = updateCustomerNameIfNeeded(db, customer, cleanName, nowIso);
  }

  let membership = db.prepare('SELECT * FROM memberships WHERE customer_id = ?').get(customer.id);
  let membershipCreated = false;
  if (!membership) {
    const memberCode = getNextMemberCode(db);
    db.prepare(`
      INSERT INTO memberships (
        customer_id, member_code, status, registered_via, campaign_code,
        joined_at, welcome_sent_at, last_transaction_at, consent_at, created_at, updated_at
      ) VALUES (?, ?, 'ACTIVE', ?, ?, ?, NULL, NULL, ?, ?, ?)
    `).run(
      customer.id,
      memberCode,
      campaign ? campaign.code : 'MANUAL',
      campaign ? campaign.code : null,
      nowIso,
      nowIso,
      nowIso,
      nowIso
    );
    membership = db.prepare('SELECT * FROM memberships WHERE customer_id = ?').get(customer.id);
    membershipCreated = true;
  } else if (membership.status !== 'ACTIVE') {
    db.prepare("UPDATE memberships SET status = 'ACTIVE', updated_at = ? WHERE id = ?")
      .run(nowIso, membership.id);
    membership = db.prepare('SELECT * FROM memberships WHERE id = ?').get(membership.id);
  }

  const messages = [];

  if (!membership.welcome_sent_at) {
    const body = buildWelcomeMessage(customer, membership);
    const message = deliverMessage(db, {
      customer,
      messageType: 'WELCOME',
      body,
      now
    });
    db.prepare('UPDATE memberships SET welcome_sent_at = ?, updated_at = ? WHERE id = ?')
      .run(nowIso, nowIso, membership.id);
    messages.push(message);
    membership = db.prepare('SELECT * FROM memberships WHERE id = ?').get(membership.id);
  }

  if (campaign) {
    const alreadySent = db.prepare(`
      SELECT id FROM member_messages
      WHERE customer_id = ? AND message_type = 'QR_PROMO' AND campaign_code = ?
      LIMIT 1
    `).get(customer.id, campaign.code);

    if (!alreadySent) {
      const body = buildQrPromoMessage(customer, membership, campaign);
      const message = deliverMessage(db, {
        customer,
        messageType: 'QR_PROMO',
        body,
        campaignCode: campaign.code,
        now
      });
      messages.push(message);
    }
  }

  eventHub.broadcastToAdmins('member_registered', {
    customer,
    membership,
    campaign: campaign ? campaign.code : null,
    customer_created: customerCreated,
    membership_created: membershipCreated,
    timestamp: nowIso
  });

  return {
    customer,
    membership,
    campaign,
    messages,
    catalog: getCatalog(campaign),
    customer_created: customerCreated,
    membership_created: membershipCreated
  };
}

function recordTransaction({ customerId, occurredAt, channel = 'DIRECT', notes = '', userId = null, now = new Date() }) {
  const db = getDb();
  const membership = db.prepare('SELECT * FROM memberships WHERE customer_id = ?').get(customerId);
  if (!membership) {
    fail('Pelanggan ini belum terdaftar sebagai member.', 404);
  }

  const parsedDate = occurredAt ? new Date(occurredAt) : now;
  if (!Number.isFinite(parsedDate.getTime())) {
    fail('Tanggal transaksi tidak valid.');
  }
  if (parsedDate.getTime() > now.getTime()) {
    fail('Tanggal transaksi tidak boleh melebihi waktu sekarang.');
  }

  const validChannel = VALID_SOURCES.includes(channel) ? channel : 'DIRECT';
  const occurredIso = parsedDate.toISOString();
  const nowIso = now.toISOString();

  const result = db.prepare(`
    INSERT INTO member_transactions (customer_id, occurred_at, channel, notes, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(customerId, occurredIso, validChannel, String(notes || '').trim(), userId, nowIso);

  db.prepare(`
    UPDATE memberships
    SET last_transaction_at = CASE
      WHEN last_transaction_at IS NULL OR last_transaction_at < ? THEN ?
      ELSE last_transaction_at
    END,
    updated_at = ?
    WHERE customer_id = ?
  `).run(occurredIso, occurredIso, nowIso, customerId);

  return {
    transaction: db.prepare('SELECT * FROM member_transactions WHERE id = ?').get(result.lastInsertRowid),
    membership: db.prepare('SELECT * FROM memberships WHERE customer_id = ?').get(customerId)
  };
}

function listMembers({ search = '', status = '', page = 1, limit = 50 } = {}) {
  const db = getDb();
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (safePage - 1) * safeLimit;

  const where = [];
  const params = [];
  if (search && search.trim()) {
    where.push('(c.name LIKE ? OR c.phone LIKE ? OR m.member_code LIKE ?)');
    const like = `%${search.trim()}%`;
    params.push(like, like, like);
  }
  if (status && ['ACTIVE', 'INACTIVE'].includes(status)) {
    where.push('m.status = ?');
    params.push(status);
  }
  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const total = db.prepare(`
    SELECT COUNT(*) AS total
    FROM memberships m
    JOIN customers c ON c.id = m.customer_id
    ${whereSql}
  `).get(...params).total;

  const rows = db.prepare(`
    SELECT m.*, c.name, c.phone, c.customer_code, c.source, c.status AS customer_status,
      (SELECT COUNT(*) FROM member_coupons cp WHERE cp.customer_id = m.customer_id) AS coupon_count,
      (SELECT COUNT(*) FROM member_transactions mt WHERE mt.customer_id = m.customer_id) AS transaction_count
    FROM memberships m
    JOIN customers c ON c.id = m.customer_id
    ${whereSql}
    ORDER BY m.joined_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, safeLimit, offset);

  const nowMs = Date.now();
  const data = rows.map((row) => {
    const baseline = row.last_transaction_at || row.joined_at;
    const inactiveDays = Math.floor((nowMs - new Date(baseline).getTime()) / 86400000);
    return {
      ...row,
      inactive_days: inactiveDays,
      inactive_14: inactiveDays >= INACTIVE_DAYS
    };
  });

  return {
    data,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1
    }
  };
}

function getMemberDetail(customerId) {
  const db = getDb();
  const membership = db.prepare(`
    SELECT m.*, c.name, c.phone, c.customer_code, c.source, c.status AS customer_status, c.notes
    FROM memberships m
    JOIN customers c ON c.id = m.customer_id
    WHERE m.customer_id = ?
  `).get(customerId);
  if (!membership) return null;

  const transactions = db.prepare(`
    SELECT * FROM member_transactions
    WHERE customer_id = ?
    ORDER BY occurred_at DESC, id DESC
  `).all(customerId);

  const messages = db.prepare(`
    SELECT * FROM member_messages
    WHERE customer_id = ?
    ORDER BY created_at DESC, id DESC
  `).all(customerId);

  const coupons = db.prepare(`
    SELECT * FROM member_coupons
    WHERE customer_id = ?
    ORDER BY issued_at DESC, id DESC
  `).all(customerId);

  return { membership, transactions, messages, coupons };
}

function getMembershipStats(now = new Date()) {
  const db = getDb();
  expireCoupons(now);
  const nowIso = now.toISOString();
  const cutoff = new Date(now.getTime() - INACTIVE_DAYS * 86400000).toISOString();
  const monthStart = startOfMonthJakartaIso(now);

  const total = db.prepare('SELECT COUNT(*) AS c FROM memberships').get().c;
  const active = db.prepare("SELECT COUNT(*) AS c FROM memberships WHERE status = 'ACTIVE'").get().c;
  const newThisMonth = db.prepare('SELECT COUNT(*) AS c FROM memberships WHERE joined_at >= ?').get(monthStart).c;
  const inactive14 = db.prepare(`
    SELECT COUNT(*) AS c FROM memberships m
    JOIN customers c ON c.id = m.customer_id
    WHERE m.status = 'ACTIVE' AND c.status = 'ACTIVE'
      AND COALESCE(m.last_transaction_at, m.joined_at) <= ?
  `).get(cutoff).c;
  const couponsIssued = db.prepare('SELECT COUNT(*) AS c FROM member_coupons').get().c;
  const couponsUsed = db.prepare("SELECT COUNT(*) AS c FROM member_coupons WHERE status = 'USED'").get().c;
  const messagesSent = db.prepare("SELECT COUNT(*) AS c FROM member_messages WHERE status = 'SENT'").get().c;

  return {
    total_members: total,
    active_members: active,
    new_this_month: newThisMonth,
    inactive_14: inactive14,
    eligible_end_month: inactive14,
    coupons_issued: couponsIssued,
    coupons_used: couponsUsed,
    messages_sent: messagesSent,
    generated_at: nowIso
  };
}

function startOfMonthJakartaIso(now) {
  const jakarta = new Date(now.getTime() + 7 * 3600000);
  const year = jakarta.getUTCFullYear();
  const month = jakarta.getUTCMonth();
  return new Date(Date.UTC(year, month, 1) - 7 * 3600000).toISOString();
}

function getMonthEndInfo(now = new Date(), windowDays = END_MONTH_WINDOW_DAYS) {
  const jakarta = new Date(now.getTime() + 7 * 3600000);
  const year = jakarta.getUTCFullYear();
  const monthIndex = jakarta.getUTCMonth();
  const day = jakarta.getUTCDate();
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const month = monthIndex + 1;
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  return {
    year,
    month,
    day,
    last_day: lastDay,
    in_window: day > lastDay - windowDays,
    window_days: windowDays,
    month_key: monthKey,
    campaign_id: `END_MONTH_${monthKey}`
  };
}

function expireCoupons(now = new Date()) {
  const db = getDb();
  const nowIso = now.toISOString();
  return db.prepare(`
    UPDATE member_coupons
    SET status = 'EXPIRED'
    WHERE status = 'ISSUED' AND expires_at < ?
  `).run(nowIso).changes;
}

function listMessages({ limit = 50 } = {}) {
  const db = getDb();
  const safeLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
  return db.prepare(`
    SELECT mm.*, c.name AS customer_name, c.customer_code
    FROM member_messages mm
    JOIN customers c ON c.id = mm.customer_id
    ORDER BY mm.created_at DESC, mm.id DESC
    LIMIT ?
  `).all(safeLimit);
}

function listCoupons({ limit = 50, status = '' } = {}) {
  const db = getDb();
  expireCoupons();
  const safeLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
  const params = [];
  let where = '';
  if (status && ['ISSUED', 'USED', 'EXPIRED'].includes(status)) {
    where = 'WHERE mc.status = ?';
    params.push(status);
  }
  return db.prepare(`
    SELECT mc.*, c.name AS customer_name, c.phone, c.customer_code
    FROM member_coupons mc
    JOIN customers c ON c.id = mc.customer_id
    ${where}
    ORDER BY mc.issued_at DESC, mc.id DESC
    LIMIT ?
  `).all(...params, safeLimit);
}

function redeemCoupon(couponId, userId, now = new Date()) {
  const db = getDb();
  const coupon = db.prepare('SELECT * FROM member_coupons WHERE id = ?').get(couponId);
  if (!coupon) fail('Kupon tidak ditemukan.', 404);
  if (coupon.status === 'USED') fail('Kupon ini sudah digunakan.');
  if (coupon.status === 'EXPIRED' || new Date(coupon.expires_at).getTime() < now.getTime()) {
    db.prepare("UPDATE member_coupons SET status = 'EXPIRED' WHERE id = ?").run(coupon.id);
    fail('Kupon ini sudah kedaluwarsa.');
  }

  const nowIso = now.toISOString();
  db.prepare(`
    UPDATE member_coupons
    SET status = 'USED', used_at = ?, used_by = ?
    WHERE id = ?
  `).run(nowIso, userId, coupon.id);

  return db.prepare('SELECT * FROM member_coupons WHERE id = ?').get(coupon.id);
}

function runEndMonthPromo({ now = new Date(), force = false } = {}) {
  const db = getDb();
  expireCoupons(now);
  const monthInfo = getMonthEndInfo(now);
  if (!monthInfo.in_window && !force) {
    return {
      success: true,
      skipped: true,
      reason: 'Belum memasuki window akhir bulan.',
      campaign: monthInfo,
      eligible: 0,
      issued: 0
    };
  }

  const cutoff = new Date(now.getTime() - INACTIVE_DAYS * 86400000).toISOString();
  const eligible = db.prepare(`
    SELECT m.customer_id, m.joined_at, m.last_transaction_at, c.name, c.phone, c.customer_code
    FROM memberships m
    JOIN customers c ON c.id = m.customer_id
    WHERE m.status = 'ACTIVE' AND c.status = 'ACTIVE'
      AND COALESCE(m.last_transaction_at, m.joined_at) <= ?
      AND NOT EXISTS (
        SELECT 1 FROM member_coupons cp
        WHERE cp.customer_id = m.customer_id AND cp.campaign_id = ?
      )
    ORDER BY m.customer_id ASC
  `).all(cutoff, monthInfo.campaign_id);

  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + COUPON_VALID_DAYS * 86400000).toISOString();
  const issued = [];
  let messagesSent = 0;

  for (const member of eligible) {
    const couponCode = `BC-TU-${monthInfo.month_key.replace('-', '')}-${String(member.customer_id).padStart(4, '0')}`;
    const insert = db.prepare(`
      INSERT OR IGNORE INTO member_coupons (
        coupon_code, customer_id, campaign_id, discount_percent, status,
        issued_at, expires_at, used_at, used_by, created_at
      ) VALUES (?, ?, ?, 10, 'ISSUED', ?, ?, NULL, NULL, ?)
    `).run(couponCode, member.customer_id, monthInfo.campaign_id, nowIso, expiresAt, nowIso);

    if (insert.changes === 0) continue;

    const coupon = db.prepare('SELECT * FROM member_coupons WHERE id = ?').get(insert.lastInsertRowid);
    const customer = { id: member.customer_id, name: member.name, phone: member.phone };
    const body = buildCouponMessage(customer, coupon);
    deliverMessage(db, {
      customer,
      messageType: 'END_MONTH_COUPON',
      body,
      campaignCode: monthInfo.campaign_id,
      couponId: coupon.id,
      couponCode: coupon.coupon_code,
      now
    });
    issued.push({ ...coupon, customer_name: member.name, customer_code: member.customer_code });
    messagesSent++;
  }

  return {
    success: true,
    skipped: false,
    campaign: monthInfo,
    eligible: eligible.length,
    issued: issued.length,
    messages_sent: messagesSent,
    coupons: issued,
    timestamp: nowIso
  };
}

// Simulasi demo: paksa satu member menjadi pasif >14 hari, terbitkan kupon bulan ini,
// lalu kirim pesan simulasi. Kupon tetap maksimal satu per member per bulan.
function simulateEndMonthForMember(customerId, userId = null, now = new Date()) {
  const db = getDb();
  const member = db.prepare(`
    SELECT m.*, c.name, c.phone, c.customer_code, c.status AS customer_status
    FROM memberships m
    JOIN customers c ON c.id = m.customer_id
    WHERE m.customer_id = ?
  `).get(customerId);

  if (!member) fail('Member tidak ditemukan.', 404);
  if (member.status !== 'ACTIVE' || member.customer_status !== 'ACTIVE') {
    fail('Member harus berstatus aktif untuk simulasi tanggal tua.');
  }

  const nowIso = now.toISOString();
  const simulatedAt = new Date(now.getTime() - (INACTIVE_DAYS + 1) * 86400000).toISOString();
  db.prepare('UPDATE memberships SET last_transaction_at = ?, updated_at = ? WHERE id = ?')
    .run(simulatedAt, nowIso, member.id);

  const monthInfo = getMonthEndInfo(now);
  const couponCode = `BC-TU-${monthInfo.month_key.replace('-', '')}-${String(member.customer_id).padStart(4, '0')}`;
  let coupon = db.prepare('SELECT * FROM member_coupons WHERE customer_id = ? AND campaign_id = ?')
    .get(member.customer_id, monthInfo.campaign_id);
  let created = false;

  if (!coupon) {
    const expiresAt = new Date(now.getTime() + COUPON_VALID_DAYS * 86400000).toISOString();
    const insert = db.prepare(`
      INSERT INTO member_coupons (
        coupon_code, customer_id, campaign_id, discount_percent, status,
        issued_at, expires_at, used_at, used_by, created_at
      ) VALUES (?, ?, ?, 10, 'ISSUED', ?, ?, NULL, NULL, ?)
    `).run(couponCode, member.customer_id, monthInfo.campaign_id, nowIso, expiresAt, nowIso);
    coupon = db.prepare('SELECT * FROM member_coupons WHERE id = ?').get(insert.lastInsertRowid);
    created = true;
  } else if (coupon.status === 'USED') {
    fail('Kupon bulan ini sudah dipakai. Tunggu bulan berikutnya untuk kupon baru.');
  } else if (coupon.status === 'EXPIRED') {
    fail('Kupon bulan ini sudah kedaluwarsa. Tunggu bulan berikutnya untuk kupon baru.');
  }

  const customer = { id: member.customer_id, name: member.name, phone: member.phone };
  const body = buildCouponMessage(customer, coupon);
  const message = deliverMessage(db, {
    customer,
    messageType: 'END_MONTH_COUPON',
    body,
    campaignCode: monthInfo.campaign_id,
    couponId: coupon.id,
    couponCode: coupon.coupon_code,
    now
  });

  return {
    success: true,
    campaign: monthInfo,
    coupon,
    created,
    resent: !created,
    message,
    last_transaction_at: simulatedAt
  };
}

module.exports = {
  SIMULATION_PROVIDER,
  BASE_CATALOG,
  QR_CAMPAIGNS,
  getCatalog,
  getCampaign,
  listCampaigns,
  registerMember,
  recordTransaction,
  listMembers,
  getMemberDetail,
  getMembershipStats,
  listMessages,
  listCoupons,
  redeemCoupon,
  runEndMonthPromo,
  simulateEndMonthForMember,
  expireCoupons,
  getMonthEndInfo
};
