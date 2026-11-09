const express = require('express');
const QRCode = require('qrcode');
const { requireAuth } = require('../middleware/auth');
const membership = require('../services/membership');

const router = express.Router();

function handleError(res, err) {
  const status = err.status || 500;
  if (status >= 500) {
    console.error('[Membership] Error:', err);
  }
  res.status(status).json({ success: false, error: err.message || 'Terjadi kesalahan pada membership.' });
}

// -------------------------------------------------------------
// ENDPOINT PUBLIK (TANPA LOGIN) - Halaman /daftar-member
// -------------------------------------------------------------

// GET /api/membership/public/campaign/:code
router.get('/public/campaign/:code', (req, res) => {
  try {
    const campaign = membership.getCampaign(req.params.code);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign QR tidak valid.' });
    }
    res.json({
      success: true,
      data: { ...campaign, catalog: membership.getCatalog(campaign) }
    });
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/membership/public/catalog
router.get('/public/catalog', (req, res) => {
  const campaign = membership.getCampaign(req.query.campaign);
  res.json({ success: true, data: membership.getCatalog(campaign) });
});

// POST /api/membership/public/register
router.post('/public/register', (req, res) => {
  try {
    const { name, phone, campaign, campaign_code, consent } = req.body || {};
    const result = membership.registerMember({
      name,
      phone,
      campaignCode: campaign_code || campaign || null,
      consent: consent === true || consent === 'true' || consent === 'on' || consent === 1
    });

    res.json({
      success: true,
      message: result.membership_created
        ? 'Pendaftaran member berhasil.'
        : 'Data member berhasil diperbarui.',
      data: {
        customer: result.customer,
        membership: result.membership,
        campaign: result.campaign,
        catalog: result.catalog,
        messages: result.messages,
        customer_created: result.customer_created,
        membership_created: result.membership_created
      }
    });
  } catch (err) {
    handleError(res, err);
  }
});

// -------------------------------------------------------------
// ENDPOINT ADMIN (BUTUH LOGIN)
// -------------------------------------------------------------
router.use(requireAuth);

// GET /api/membership/stats
router.get('/stats', (req, res) => {
  try {
    const scheduler = require('../services/membershipScheduler');
    res.json({
      success: true,
      data: {
        ...membership.getMembershipStats(),
        month_end: membership.getMonthEndInfo(),
        scheduler: scheduler.getSchedulerStatus()
      }
    });
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/membership/members
router.get('/members', (req, res) => {
  try {
    const result = membership.listMembers({
      search: req.query.search || '',
      status: req.query.status || '',
      page: req.query.page,
      limit: req.query.limit
    });
    res.json({ success: true, ...result });
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/membership/members/:customerId
router.get('/members/:customerId', (req, res) => {
  try {
    const detail = membership.getMemberDetail(parseInt(req.params.customerId, 10));
    if (!detail) {
      return res.status(404).json({ success: false, error: 'Member tidak ditemukan.' });
    }
    res.json({ success: true, data: detail });
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/membership/members/:customerId/transactions
router.post('/members/:customerId/transactions', (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId, 10);
    const { occurred_at, channel, notes } = req.body || {};
    const result = membership.recordTransaction({
      customerId,
      occurredAt: occurred_at || null,
      channel,
      notes,
      userId: req.session.user.id
    });
    res.json({
      success: true,
      message: 'Transaksi member berhasil dicatat.',
      data: result
    });
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/membership/messages
router.get('/messages', (req, res) => {
  try {
    res.json({ success: true, data: membership.listMessages({ limit: req.query.limit }) });
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/membership/coupons
router.get('/coupons', (req, res) => {
  try {
    res.json({
      success: true,
      data: membership.listCoupons({ limit: req.query.limit, status: req.query.status || '' })
    });
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/membership/coupons/:id/redeem
router.post('/coupons/:id/redeem', (req, res) => {
  try {
    const coupon = membership.redeemCoupon(parseInt(req.params.id, 10), req.session.user.id);
    const eventHub = require('../services/eventHub');
    eventHub.broadcastToAdmins('coupon_redeemed', {
      coupon_id: coupon.id,
      coupon_code: coupon.coupon_code,
      customer_id: coupon.customer_id,
      timestamp: new Date().toISOString()
    });
    res.json({ success: true, message: 'Kupon ditandai sudah dipakai.', data: coupon });
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/membership/campaigns
router.get('/campaigns', (req, res) => {
  try {
    res.json({ success: true, data: membership.listCampaigns() });
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/membership/qr/:code.svg
router.get('/qr/:code.svg', async (req, res) => {
  try {
    const campaign = membership.getCampaign(req.params.code);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign QR tidak valid.' });
    }
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const targetUrl = `${baseUrl}/daftar-member?campaign=${encodeURIComponent(campaign.code)}`;
    const svg = await QRCode.toString(targetUrl, {
      type: 'svg',
      margin: 1,
      width: 320,
      color: { dark: '#0F172A', light: '#FFFFFF' }
    });
    res.type('image/svg+xml').send(svg);
  } catch (err) {
    handleError(res, err);
  }
});

// GET /api/membership/qr/:code.png
router.get('/qr/:code.png', async (req, res) => {
  try {
    const campaign = membership.getCampaign(req.params.code);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign QR tidak valid.' });
    }
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const targetUrl = `${baseUrl}/daftar-member?campaign=${encodeURIComponent(campaign.code)}`;
    const buffer = await QRCode.toBuffer(targetUrl, {
      type: 'png',
      margin: 1,
      width: 420,
      color: { dark: '#0F172A', light: '#FFFFFF' }
    });
    res.type('image/png').send(buffer);
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/membership/members/:customerId/simulate-end-month
// Demo: paksa member pasif >14 hari, terbitkan kupon, dan kirim pesan simulasi.
router.post('/members/:customerId/simulate-end-month', (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId, 10);
    const result = membership.simulateEndMonthForMember(customerId, req.session.user.id);
    const eventHub = require('../services/eventHub');
    eventHub.broadcastToAdmins('end_month_promo_run', {
      campaign: result.campaign.campaign_id,
      eligible: 1,
      issued: result.created ? 1 : 0,
      skipped: false,
      customer_id: customerId,
      timestamp: new Date().toISOString()
    });
    res.json({
      success: true,
      message: result.created
        ? 'Member disimulasikan pasif dan kupon tanggal tua berhasil dikirim.'
        : 'Kupon bulan ini sudah ada. Pesan kupon dikirim ulang.',
      data: result
    });
  } catch (err) {
    handleError(res, err);
  }
});

// POST /api/membership/campaigns/end-month/run
router.post('/campaigns/end-month/run', (req, res) => {
  try {
    const force = req.body && (req.body.force === true || req.body.force === 'true');
    const result = membership.runEndMonthPromo({ force });
    const eventHub = require('../services/eventHub');
    eventHub.broadcastToAdmins('end_month_promo_run', {
      campaign: result.campaign ? result.campaign.campaign_id : null,
      eligible: result.eligible,
      issued: result.issued,
      skipped: Boolean(result.skipped),
      timestamp: new Date().toISOString()
    });
    res.json({
      success: true,
      message: result.skipped
        ? result.reason
        : `Promo tanggal tua selesai. ${result.issued} kupon diterbitkan.`,
      data: result
    });
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
