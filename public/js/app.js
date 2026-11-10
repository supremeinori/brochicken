// Bro Chicken CRM - Frontend application
// Views render through the shared UI layer in /js/ui.js.

let currentUser = null;
let currentRoute = 'dashboard';
let currentSubId = null;
let dashboardPeriod = 'this_month';
let reportPeriod = 'this_month';

const categoryLabels = {
  FOOD_QUALITY: 'Kualitas Makanan',
  WRONG_ORDER: 'Pesanan Tidak Sesuai',
  DELIVERY_DELAY: 'Keterlambatan Pengiriman',
  SERVICE: 'Pelayanan Outlet',
  CLEANLINESS: 'Kebersihan',
  OTHER: 'Lainnya'
};

const priorityLabels = {
  LOW: 'Rendah',
  MEDIUM: 'Sedang',
  HIGH: 'Tinggi'
};

const statusLabels = {
  NEW: 'Baru',
  IN_PROGRESS: 'Diproses',
  RESOLVED: 'Selesai'
};

const sourceLabels = {
  DIRECT: 'Langsung',
  GOFOOD: 'GoFood',
  GRABFOOD: 'GrabFood',
  OTHER: 'Lainnya'
};

const escapeHtml = UI.escapeHtml;
const formatDateIndo = UI.formatDateIndo;

function showToast(message, type = 'success') {
  UI.toast(message, type);
}

function closeModal() {
  UI.closeModal();
}

function priorityBadge(priority) {
  const tone = priority === 'HIGH' ? 'danger' : (priority === 'MEDIUM' ? 'warning' : 'neutral');
  return UI.badge(priorityLabels[priority] || priority, tone);
}

function statusBadge(status) {
  const tone = status === 'NEW' ? 'info' : (status === 'IN_PROGRESS' ? 'warning' : 'success');
  return UI.badge(statusLabels[status] || status, tone);
}

function slaBadge(badgeClass, label) {
  const toneMap = {
    'badge-danger': 'danger',
    'badge-warning': 'warning',
    'badge-success': 'success',
    'badge-info': 'info',
    'badge-neutral': 'neutral'
  };
  return `<span class="badge ${badgeClass || 'badge-neutral'}">${escapeHtml(label)}</span>`;
}

function initialsOf(name) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

// -------------------------------------------------------------
// APP SHELL AND ROUTER
// -------------------------------------------------------------
function renderShell() {
  const app = document.getElementById('app');
  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <img src="/images/logo.png" alt="" class="sidebar-logo">
          <div>
            <div class="sidebar-title">Bro Chicken</div>
            <div class="sidebar-subtitle">Operasional CRM</div>
          </div>
        </div>

        <nav class="sidebar-nav" aria-label="Navigasi utama">
          <div class="nav-group">
            <div class="nav-group-label">Operasional</div>
            <a class="nav-link" data-route="dashboard" href="#dashboard" onclick="navigate('dashboard')">Beranda</a>
            <a class="nav-link" data-route="customers" href="#customers" onclick="navigate('customers')">Pelanggan</a>
            <a class="nav-link" data-route="complaints" href="#complaints" onclick="navigate('complaints')">Keluhan &amp; tiket</a>
          </div>

          <div class="nav-group">
            <div class="nav-group-label">Komunikasi</div>
            <a class="nav-link" data-route="whatsapp" href="#whatsapp" onclick="navigate('whatsapp')">Template WhatsApp</a>
            <a class="nav-link" data-route="simulation" href="#simulation" onclick="navigate('simulation')">Kotak masuk WhatsApp</a>
          </div>

          <div class="nav-group">
            <div class="nav-group-label">Program pelanggan</div>
            <a class="nav-link" data-route="membership" href="#membership" onclick="navigate('membership')">Member &amp; promo</a>
            <a class="nav-link" data-route="reports" href="#reports" onclick="navigate('reports')">Laporan &amp; SLA</a>
          </div>

          ${currentUser.role === 'OWNER' ? `
            <div class="nav-group">
              <div class="nav-group-label">Administrasi</div>
              <a class="nav-link" data-route="admin" href="#admin" onclick="navigate('admin')">Akun admin</a>
              <a class="nav-link" data-route="settings" href="#settings" onclick="navigate('settings')">Pengaturan sistem</a>
            </div>
          ` : ''}
        </nav>

        <div class="sidebar-foot">
          <div class="sidebar-user">
            <div class="sidebar-user-name">${escapeHtml(currentUser.name)}</div>
            <div class="sidebar-user-role">${currentUser.role === 'OWNER' ? 'Pemilik' : 'Staf admin'}</div>
          </div>
          <button type="button" class="btn-sidebar" onclick="handleLogout()">Keluar</button>
        </div>
      </aside>

      <div class="sidebar-scrim" id="sidebar-scrim" onclick="toggleSidebar(false)"></div>

      <div class="workspace">
        <header class="utility-bar">
          <div class="utility-left">
            <button type="button" class="btn btn-quiet menu-toggle" aria-label="Buka navigasi" onclick="toggleSidebar()">Menu</button>
            <span class="utility-strong">Cabang Margonda</span>
            <span class="utility-text">${escapeHtml(today)}</span>
          </div>
          <div class="utility-right">
            <span class="utility-text">${escapeHtml(currentUser.role === 'OWNER' ? 'Akses pemilik' : 'Akses staf')}</span>
          </div>
        </header>

        <main class="page" id="content-area"></main>
      </div>
    </div>
  `;
}

function toggleSidebar(force) {
  const sidebar = document.getElementById('sidebar');
  const scrim = document.getElementById('sidebar-scrim');
  if (!sidebar || !scrim) return;
  const open = typeof force === 'boolean' ? force : !sidebar.classList.contains('is-open');
  sidebar.classList.toggle('is-open', open);
  scrim.classList.toggle('is-open', open);
}

function closeSidebar() {
  toggleSidebar(false);
}

function parseHash() {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return { route: 'dashboard', id: null };
  const parts = raw.split('/');
  const route = parts[0] || 'dashboard';
  const idPart = parts[1];
  const id = idPart != null && idPart !== '' && !Number.isNaN(Number(idPart)) ? Number(idPart) : (idPart || null);
  return { route, id };
}

function navigate(route, id = null) {
  const hash = id != null ? `#${route}/${id}` : `#${route}`;
  if (window.location.hash === hash) {
    renderRoute(route, id);
  } else {
    window.location.hash = hash;
  }
}

function updateActiveNav() {
  document.querySelectorAll('.nav-link').forEach((link) => {
    const route = link.dataset.route;
    const active = route === currentRoute
      || (currentRoute === 'customer-detail' && route === 'customers')
      || (currentRoute === 'complaint-detail' && route === 'complaints');
    link.classList.toggle('active', active);
  });
}

function renderRouteFromHash() {
  const { route, id } = parseHash();
  renderRoute(route, id);
}

function renderRoute(route, id) {
  if (!currentUser) return;
  currentRoute = route;
  currentSubId = id;
  updateActiveNav();
  closeSidebar();

  if (route === 'customers') renderCustomers();
  else if (route === 'customer-detail' && id != null) renderCustomerDetail(id);
  else if (route === 'complaints') renderComplaints();
  else if (route === 'complaint-detail' && id != null) renderComplaintDetail(id);
  else if (route === 'whatsapp') renderWhatsApp();
  else if (route === 'simulation') renderSimulation(id);
  else if (route === 'membership') renderMembership();
  else if (route === 'reports') renderReports();
  else if (route === 'admin') renderAdmin();
  else if (route === 'settings') renderSettings();
  else renderDashboard();
}

window.addEventListener('hashchange', renderRouteFromHash);

// -------------------------------------------------------------
// LOGIN
// -------------------------------------------------------------
function renderLogin() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="login-screen">
      <div class="login-panel">
        <div class="login-brand">
          <img src="/images/logo.png" alt="" class="login-logo">
          <h1 class="login-title">Bro Chicken CRM</h1>
          <p class="login-subtitle">Layanan pelanggan dan penanganan keluhan</p>
        </div>

        <form id="login-form" onsubmit="handleLoginSubmit(event)">
          <div class="field">
            <label class="label" for="login-username">Username</label>
            <input type="text" id="login-username" class="input" placeholder="Contoh: haji_rahmat" autocomplete="username" required>
          </div>
          <div class="field">
            <label class="label" for="login-password">Kata sandi</label>
            <input type="password" id="login-password" class="input" placeholder="Masukkan kata sandi" autocomplete="current-password" required>
          </div>
          <button type="submit" class="btn btn-primary btn-block">Masuk ke sistem</button>
        </form>

        <details class="login-demo">
          <summary>Akun pengujian</summary>
          <div>Owner: <code>owner</code> / <code>12345678</code></div>
          <div>Admin: <code>admin</code> / <code>12345678</code></div>
        </details>
      </div>
    </div>
  `;
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      showToast(data.message);
      renderShell();
      renderRouteFromHash();
    } else {
      showToast(data.error, 'error');
    }
  } catch (err) {
    showToast('Gagal terhubung ke server.', 'error');
  }
}

async function handleLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    currentUser = null;
    showToast('Berhasil keluar dari sistem.');
    renderLogin();
  } catch (err) {
    showToast('Gagal keluar sesi.', 'error');
  }
}

// -------------------------------------------------------------
// DASHBOARD
// -------------------------------------------------------------
async function renderDashboard() {
  const content = document.getElementById('content-area');
  content.innerHTML = UI.loading('Memuat ringkasan operasional...');

  try {
    const res = await fetch(`/api/dashboard?period=${encodeURIComponent(dashboardPeriod)}`);
    const json = await res.json();
    const d = json.data;

    const periodOptions = [
      ['this_month', 'Bulan ini'],
      ['today', 'Hari ini'],
      ['7days', '7 hari terakhir'],
      ['30days', '30 hari terakhir']
    ].map(([value, label]) => `<option value="${value}" ${dashboardPeriod === value ? 'selected' : ''}>${label}</option>`).join('');

    const tickets = d.recent_tickets && d.recent_tickets.length > 0
      ? d.recent_tickets.map((t) => `
          <tr>
            <td class="cell-nowrap"><strong>${escapeHtml(t.ticket_code)}</strong></td>
            <td>${escapeHtml(t.customer_name)}</td>
            <td>${escapeHtml(categoryLabels[t.category] || t.category)}</td>
            <td>${priorityBadge(t.priority)}</td>
            <td>${statusBadge(t.status)}</td>
            <td>${escapeHtml(t.assigned_to_name || '-')}</td>
            <td>${slaBadge(t.sla_class, t.sla_label)}</td>
            <td class="cell-actions">
              <button type="button" class="btn btn-secondary btn-sm" onclick="navigate('complaint-detail', ${t.id})">Tindak lanjut</button>
            </td>
          </tr>
        `).join('')
      : UI.tableState(8, {
          title: 'Belum ada keluhan pada periode ini',
          hint: 'Semua layanan pelanggan berjalan normal.'
        });

    content.innerHTML = `
      ${UI.pageHeader({
        title: 'Ringkasan operasional',
        description: 'Pantau antrean keluhan, batas respons, dan pertumbuhan pelanggan.',
        actions: `<button type="button" class="btn btn-secondary" onclick="openAddCustomerModal()">Tambah pelanggan</button>
          <button type="button" class="btn btn-primary" onclick="openCreateTicketModal()">Catat keluhan</button>`
      })}

      <div class="toolbar">
        <div class="toolbar-group">
          <label class="toolbar-label" for="dashboard-period">Periode</label>
          <select id="dashboard-period" class="select control-auto" onchange="loadDashboardPeriod(this.value)">${periodOptions}</select>
        </div>
      </div>

      ${UI.metrics([
        {
          label: 'Pelanggan aktif',
          value: d.total_active_customers,
          note: 'Terdaftar dalam database'
        },
        {
          label: 'Pelanggan baru',
          value: d.new_customers_in_period,
          note: 'Bergabung pada periode ini'
        },
        {
          label: 'Tiket aktif',
          value: d.tickets.new + d.tickets.in_progress,
          note: `${d.tickets.new} baru, ${d.tickets.in_progress} diproses`
        },
        {
          label: 'Lewat batas respons',
          value: d.tickets.overdue,
          tone: d.tickets.overdue > 0 ? 'danger' : '',
          note: d.tickets.overdue > 0 ? 'Perlu respons segera' : 'Seluruh tiket dalam batas waktu'
        }
      ])}

      ${UI.section({
        title: 'Keluhan terbaru',
        description: 'Lima tiket terakhir pada periode terpilih.',
        actions: `<button type="button" class="btn btn-secondary btn-sm" onclick="navigate('complaints')">Lihat semua tiket</button>`,
        body: `
          <div class="table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>ID tiket</th>
                  <th>Pelanggan</th>
                  <th>Kategori</th>
                  <th>Prioritas</th>
                  <th>Status</th>
                  <th>PIC</th>
                  <th>Batas respons</th>
                  <th class="cell-actions">Aksi</th>
                </tr>
              </thead>
              <tbody>${tickets}</tbody>
            </table>
          </div>
        `
      })}
    `;
  } catch (err) {
    content.innerHTML = UI.state({
      title: 'Gagal memuat ringkasan',
      hint: 'Server tidak merespons. Muat ulang halaman atau periksa koneksi.',
      tone: 'error',
      action: `<button type="button" class="btn btn-secondary" onclick="renderDashboard()">Coba lagi</button>`
    });
  }
}

function loadDashboardPeriod(period) {
  dashboardPeriod = period;
  renderDashboard();
}

// -------------------------------------------------------------
// CUSTOMERS
// -------------------------------------------------------------
let customerSearchParams = { search: '', source: '', status: 'ACTIVE', page: 1 };

function renderCustomers() {
  const content = document.getElementById('content-area');
  const statusOptions = [
    ['ACTIVE', 'Status: aktif'],
    ['ARCHIVED', 'Status: diarsipkan'],
    ['', 'Semua status']
  ].map(([value, label]) => `<option value="${value}" ${customerSearchParams.status === value ? 'selected' : ''}>${label}</option>`).join('');

  const sourceOptions = [
    ['', 'Semua sumber'],
    ['DIRECT', 'Langsung'],
    ['GOFOOD', 'GoFood'],
    ['GRABFOOD', 'GrabFood'],
    ['OTHER', 'Lainnya']
  ].map(([value, label]) => `<option value="${value}" ${customerSearchParams.source === value ? 'selected' : ''}>${label}</option>`).join('');

  content.innerHTML = `
    ${UI.pageHeader({
      title: 'Pelanggan',
      description: 'Cari, perbarui, dan arsipkan data pelanggan outlet.',
      actions: `<button type="button" class="btn btn-primary" onclick="openAddCustomerModal()">Tambah pelanggan</button>`
    })}

    <div class="toolbar">
      <div class="toolbar-group">
        <input type="text" id="cust-search" class="input search-input" placeholder="Cari nama, nomor WhatsApp, atau kode" value="${escapeHtml(customerSearchParams.search)}" oninput="handleCustomerSearch(this.value)" aria-label="Cari pelanggan">
        <select class="select control-auto" onchange="handleCustomerSourceFilter(this.value)" aria-label="Filter sumber">${sourceOptions}</select>
        <select class="select control-auto" onchange="handleCustomerStatusFilter(this.value)" aria-label="Filter status">${statusOptions}</select>
      </div>
    </div>

    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Nama</th>
            <th>WhatsApp</th>
            <th>Sumber</th>
            <th>Terdaftar</th>
            <th>Status</th>
            <th class="cell-actions">Aksi</th>
          </tr>
        </thead>
        <tbody id="customer-tbody">
          ${UI.tableState(7, { title: 'Memuat data pelanggan' })}
        </tbody>
      </table>
    </div>
    <div class="table-foot" id="customer-pagination"></div>
  `;

  loadCustomersData();
}

let searchDebounceTimer = null;

function handleCustomerSearch(val) {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    customerSearchParams.search = val;
    customerSearchParams.page = 1;
    loadCustomersData();
  }, 300);
}

function handleCustomerSourceFilter(val) {
  customerSearchParams.source = val;
  customerSearchParams.page = 1;
  loadCustomersData();
}

function handleCustomerStatusFilter(val) {
  customerSearchParams.status = val;
  customerSearchParams.page = 1;
  loadCustomersData();
}

async function loadCustomersData() {
  const tbody = document.getElementById('customer-tbody');
  const paginationDiv = document.getElementById('customer-pagination');
  if (!tbody) return;

  const query = new URLSearchParams(customerSearchParams).toString();

  try {
    const res = await fetch(`/api/customers?${query}`);
    const json = await res.json();
    const customers = json.data;
    const pag = json.pagination;

    if (!customers || customers.length === 0) {
      tbody.innerHTML = UI.tableState(7, {
        title: 'Tidak ada pelanggan yang cocok',
        hint: 'Ubah kata kunci atau filter sumber dan status.'
      });
      if (paginationDiv) paginationDiv.innerHTML = '';
      return;
    }

    tbody.innerHTML = customers.map((c) => `
      <tr>
        <td class="cell-nowrap"><strong>${escapeHtml(c.customer_code)}</strong></td>
        <td>
          <a class="link-strong" href="#customer-detail/${c.id}" onclick="navigate('customer-detail', ${c.id})">${escapeHtml(c.name)}</a>
        </td>
        <td>
          <a class="link-phone" href="https://wa.me/${escapeHtml(c.phone)}" target="_blank" rel="noopener">+${escapeHtml(c.phone)}</a>
        </td>
        <td>${UI.badge(sourceLabels[c.source] || c.source, 'neutral')}</td>
        <td class="cell-nowrap">${formatDateIndo(c.joined_at)}</td>
        <td>${UI.badge(c.status === 'ACTIVE' ? 'Aktif' : 'Diarsipkan', c.status === 'ACTIVE' ? 'success' : 'neutral')}</td>
        <td class="cell-actions">
          <div class="row-actions">
            <button type="button" class="btn btn-secondary btn-sm" onclick="navigate('customer-detail', ${c.id})">Detail</button>
            <button type="button" class="btn btn-quiet btn-sm" onclick="openEditCustomerModal(${c.id})">Ubah</button>
            ${c.status === 'ACTIVE'
              ? `<button type="button" class="btn btn-danger-quiet btn-sm" data-name="${escapeHtml(c.name)}" onclick="openArchiveModal(${c.id}, this.dataset.name)">Arsipkan</button>`
              : `<button type="button" class="btn btn-quiet btn-sm" onclick="handleActivateCustomer(${c.id})">Aktifkan</button>`}
          </div>
        </td>
      </tr>
    `).join('');

    if (paginationDiv) {
      paginationDiv.innerHTML = UI.pagination({
        page: pag.page,
        totalPages: pag.totalPages,
        total: pag.total,
        limit: pag.limit,
        label: 'pelanggan',
        handler: 'changeCustomerPage'
      });
    }
  } catch (err) {
    tbody.innerHTML = UI.tableState(7, {
      title: 'Gagal memuat pelanggan',
      hint: 'Periksa koneksi lalu coba lagi.',
      tone: 'error'
    });
  }
}

function changeCustomerPage(page) {
  customerSearchParams.page = page;
  loadCustomersData();
}

function openAddCustomerModal() {
  UI.openModal({
    title: 'Tambah pelanggan',
    subtitle: 'Nomor WhatsApp menjadi identitas utama pelanggan.',
    body: `
      <form id="add-customer-form" onsubmit="handleAddCustomerSubmit(event)">
        <div class="field">
          <label class="label" for="add-cust-name">Nama lengkap</label>
          <input type="text" id="add-cust-name" class="input" placeholder="Contoh: Hendra Kusuma" required>
        </div>
        <div class="field">
          <label class="label" for="add-cust-phone">Nomor WhatsApp</label>
          <input type="text" id="add-cust-phone" class="input" placeholder="Contoh: 08123456789" required>
          <p class="helper">Format dinormalisasi menjadi awalan 62, contoh 628123456789.</p>
        </div>
        <div class="field">
          <label class="label" for="add-cust-source">Sumber pemesanan</label>
          <select id="add-cust-source" class="select" required>
            <option value="DIRECT">Langsung (outlet)</option>
            <option value="GOFOOD">GoFood</option>
            <option value="GRABFOOD">GrabFood</option>
            <option value="OTHER">Lainnya</option>
          </select>
        </div>
        <div class="field">
          <label class="label" for="add-cust-notes">Catatan preferensi</label>
          <textarea id="add-cust-notes" class="textarea" placeholder="Menu favorit, alergi, atau catatan lain."></textarea>
        </div>
      </form>
    `,
    footer: `
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
      <button type="submit" class="btn btn-primary" form="add-customer-form">Simpan pelanggan</button>
    `
  });
}

async function handleAddCustomerSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('add-cust-name').value;
  const phone = document.getElementById('add-cust-phone').value;
  const source = document.getElementById('add-cust-source').value;
  const notes = document.getElementById('add-cust-notes').value;

  try {
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, source, notes })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      closeModal();
      if (currentRoute === 'customers') loadCustomersData();
    } else {
      showToast(data.error, 'error');
    }
  } catch (err) {
    showToast('Gagal menambahkan pelanggan.', 'error');
  }
}

async function openEditCustomerModal(id) {
  try {
    const res = await fetch(`/api/customers/${id}`);
    const data = await res.json();
    const c = data.customer;

    UI.openModal({
      title: 'Ubah data pelanggan',
      subtitle: c.customer_code,
      body: `
        <form id="edit-customer-form" onsubmit="handleEditCustomerSubmit(event, ${c.id})">
          <div class="field">
            <label class="label" for="edit-cust-name">Nama lengkap</label>
            <input type="text" id="edit-cust-name" class="input" value="${escapeHtml(c.name)}" required>
          </div>
          <div class="field">
            <label class="label" for="edit-cust-phone">Nomor WhatsApp</label>
            <input type="text" id="edit-cust-phone" class="input" value="${escapeHtml(c.phone)}" required>
          </div>
          <div class="field">
            <label class="label" for="edit-cust-source">Sumber pemesanan</label>
            <select id="edit-cust-source" class="select" required>
              <option value="DIRECT" ${c.source === 'DIRECT' ? 'selected' : ''}>Langsung (outlet)</option>
              <option value="GOFOOD" ${c.source === 'GOFOOD' ? 'selected' : ''}>GoFood</option>
              <option value="GRABFOOD" ${c.source === 'GRABFOOD' ? 'selected' : ''}>GrabFood</option>
              <option value="OTHER" ${c.source === 'OTHER' ? 'selected' : ''}>Lainnya</option>
            </select>
          </div>
          <div class="field">
            <label class="label" for="edit-cust-notes">Catatan preferensi</label>
            <textarea id="edit-cust-notes" class="textarea">${escapeHtml(c.notes || '')}</textarea>
          </div>
        </form>
      `,
      footer: `
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
        <button type="submit" class="btn btn-primary" form="edit-customer-form">Perbarui data</button>
      `
    });
  } catch (err) {
    showToast('Gagal mengambil data pelanggan.', 'error');
  }
}

async function handleEditCustomerSubmit(event, id) {
  event.preventDefault();
  const name = document.getElementById('edit-cust-name').value;
  const phone = document.getElementById('edit-cust-phone').value;
  const source = document.getElementById('edit-cust-source').value;
  const notes = document.getElementById('edit-cust-notes').value;

  try {
    const res = await fetch(`/api/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, source, notes })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      closeModal();
      if (currentRoute === 'customers') loadCustomersData();
      if (currentRoute === 'customer-detail') renderCustomerDetail(id);
    } else {
      showToast(data.error, 'error');
    }
  } catch (err) {
    showToast('Gagal memperbarui data.', 'error');
  }
}

function openArchiveModal(id, name) {
  UI.confirm({
    title: 'Arsipkan pelanggan',
    message: `Nonaktifkan ${name}? Data pelanggan tidak dihapus permanen.`,
    confirmLabel: 'Arsipkan',
    danger: true,
    note: 'Seluruh tiket keluhan tetap tersimpan dan pelanggan dapat diaktifkan kembali.'
  }).then((ok) => {
    if (ok) confirmArchiveCustomer(id);
  });
}

async function confirmArchiveCustomer(id) {
  try {
    const res = await fetch(`/api/customers/${id}/archive`, { method: 'PATCH' });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      closeModal();
      if (currentRoute === 'customers') loadCustomersData();
      if (currentRoute === 'customer-detail') renderCustomerDetail(id);
    } else {
      showToast(data.error, 'error');
    }
  } catch (err) {
    showToast('Gagal mengarsipkan pelanggan.', 'error');
  }
}

async function handleActivateCustomer(id) {
  try {
    const res = await fetch(`/api/customers/${id}/activate`, { method: 'PATCH' });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      if (currentRoute === 'customers') loadCustomersData();
      if (currentRoute === 'customer-detail') renderCustomerDetail(id);
    } else {
      showToast(data.error, 'error');
    }
  } catch (err) {
    showToast('Gagal mengaktifkan pelanggan.', 'error');
  }
}

// -------------------------------------------------------------
// CUSTOMER DETAIL
// -------------------------------------------------------------
async function renderCustomerDetail(id) {
  const content = document.getElementById('content-area');
  content.innerHTML = UI.loading('Memuat profil pelanggan...');

  try {
    const res = await fetch(`/api/customers/${id}`);
    const data = await res.json();
    const c = data.customer;
    const complaints = data.complaints || [];

    let memberInfo = null;
    try {
      const memberRes = await fetch(`/api/membership/members/${id}`);
      if (memberRes.ok) {
        const memberJson = await memberRes.json();
        if (memberJson.success) memberInfo = memberJson.data.membership;
      }
    } catch (err) {}

    const tickets = complaints.length > 0
      ? complaints.map((t) => `
          <tr>
            <td class="cell-nowrap"><strong>${escapeHtml(t.ticket_code)}</strong></td>
            <td>${escapeHtml(categoryLabels[t.category] || t.category)}</td>
            <td>${priorityBadge(t.priority)}</td>
            <td class="cell-truncate">${escapeHtml(t.description)}</td>
            <td>${statusBadge(t.status)}</td>
            <td>${escapeHtml(t.assigned_to_name || '-')}</td>
            <td class="cell-nowrap">${formatDateIndo(t.created_at)}</td>
            <td class="cell-actions">
              <button type="button" class="btn btn-secondary btn-sm" onclick="navigate('complaint-detail', ${t.id})">Lihat detail</button>
            </td>
          </tr>
        `).join('')
      : UI.tableState(8, {
          title: 'Belum ada keluhan',
          hint: 'Pelanggan ini belum pernah memiliki tiket keluhan.'
        });

    content.innerHTML = `
      ${UI.recordHeader({
        backLabel: 'Kembali ke pelanggan',
        backAction: "navigate('customers')",
        initials: initialsOf(c.name),
        title: `
          ${escapeHtml(c.name)}
          ${UI.badge(c.status === 'ACTIVE' ? 'Aktif' : 'Diarsipkan', c.status === 'ACTIVE' ? 'success' : 'neutral')}
          ${memberInfo ? UI.badge(`Member ${memberInfo.member_code}`, 'brand') : ''}
        `,
        meta: `
          <span>Kode ${escapeHtml(c.customer_code)}</span>
          <span>Terdaftar ${formatDateIndo(c.joined_at)}</span>
          <span>${UI.badge(sourceLabels[c.source] || c.source, 'neutral')}</span>
          <span>+${escapeHtml(c.phone)}</span>
        `,
        actions: `
          <a class="btn btn-secondary btn-sm" href="https://wa.me/${escapeHtml(c.phone)}" target="_blank" rel="noopener">Kirim WhatsApp</a>
          <button type="button" class="btn btn-secondary btn-sm" onclick="openEditCustomerModal(${c.id})">Ubah profil</button>
          ${memberInfo ? `<button type="button" class="btn btn-primary btn-sm" onclick="openMemberDetail(${c.id})">Detail member</button>` : ''}
          ${c.status === 'ACTIVE'
            ? `<button type="button" class="btn btn-danger-quiet btn-sm" data-name="${escapeHtml(c.name)}" onclick="openArchiveModal(${c.id}, this.dataset.name)">Arsipkan</button>`
            : `<button type="button" class="btn btn-quiet btn-sm" onclick="handleActivateCustomer(${c.id})">Aktifkan kembali</button>`}
        `
      })}

      ${UI.section({
        title: 'Catatan preferensi',
        body: `<p class="meta-value">${c.notes ? escapeHtml(c.notes) : '<span class="empty-value">Tidak ada catatan preferensi khusus.</span>'}</p>`
      })}

      ${UI.section({
        title: 'Riwayat tiket keluhan',
        description: 'Seluruh tiket yang tercatat atas nama pelanggan ini.',
        actions: c.status === 'ACTIVE'
          ? `<button type="button" class="btn btn-primary btn-sm" onclick="openCreateTicketModal(${c.id})">Catat keluhan baru</button>`
          : '',
        body: `
          <div class="table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>ID tiket</th>
                  <th>Kategori</th>
                  <th>Prioritas</th>
                  <th>Deskripsi</th>
                  <th>Status</th>
                  <th>PIC</th>
                  <th>Dibuat</th>
                  <th class="cell-actions">Aksi</th>
                </tr>
              </thead>
              <tbody>${tickets}</tbody>
            </table>
          </div>
        `
      })}
    `;
  } catch (err) {
    content.innerHTML = UI.state({
      title: 'Gagal memuat profil pelanggan',
      hint: 'Data tidak dapat diambil dari server.',
      tone: 'error',
      action: `<button type="button" class="btn btn-secondary" onclick="navigate('customers')">Kembali ke daftar</button>`
    });
  }
}

// -------------------------------------------------------------
// COMPLAINTS
// -------------------------------------------------------------
let complaintSearchParams = { search: '', status: '', priority: '', category: '', page: 1 };

function renderComplaints() {
  const content = document.getElementById('content-area');

  const optionList = (items, current) => items.map(([value, label]) =>
    `<option value="${value}" ${current === value ? 'selected' : ''}>${label}</option>`
  ).join('');

  content.innerHTML = `
    ${UI.pageHeader({
      title: 'Keluhan & tiket',
      description: 'Kelola antrean keluhan, prioritas, dan batas respons 60 menit.',
      actions: `<button type="button" class="btn btn-primary" onclick="openCreateTicketModal()">Catat keluhan baru</button>`
    })}

    <div class="toolbar">
      <div class="toolbar-group">
        <input type="text" class="input search-input" placeholder="Cari ID tiket atau nama pelanggan" value="${escapeHtml(complaintSearchParams.search)}" oninput="handleComplaintSearch(this.value)" aria-label="Cari tiket">
        <select class="select control-auto" onchange="handleComplaintStatusFilter(this.value)" aria-label="Filter status">
          ${optionList([['', 'Semua status'], ['NEW', 'Baru'], ['IN_PROGRESS', 'Diproses'], ['RESOLVED', 'Selesai']], complaintSearchParams.status)}
        </select>
        <select class="select control-auto" onchange="handleComplaintPriorityFilter(this.value)" aria-label="Filter prioritas">
          ${optionList([['', 'Semua prioritas'], ['HIGH', 'Tinggi'], ['MEDIUM', 'Sedang'], ['LOW', 'Rendah']], complaintSearchParams.priority)}
        </select>
        <select class="select control-auto" onchange="handleComplaintCategoryFilter(this.value)" aria-label="Filter kategori">
          ${optionList([
            ['', 'Semua kategori'],
            ['FOOD_QUALITY', 'Kualitas makanan'],
            ['WRONG_ORDER', 'Pesanan tidak sesuai'],
            ['DELIVERY_DELAY', 'Keterlambatan'],
            ['SERVICE', 'Pelayanan outlet'],
            ['CLEANLINESS', 'Kebersihan'],
            ['OTHER', 'Lainnya']
          ], complaintSearchParams.category)}
        </select>
      </div>
    </div>

    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th>ID tiket</th>
            <th>Pelanggan</th>
            <th>Kategori</th>
            <th>Prioritas</th>
            <th>Status</th>
            <th>PIC</th>
            <th>Batas respons</th>
            <th class="cell-actions">Aksi</th>
          </tr>
        </thead>
        <tbody id="complaint-tbody">
          ${UI.tableState(8, { title: 'Memuat tiket keluhan' })}
        </tbody>
      </table>
    </div>
    <div class="table-foot" id="complaint-pagination"></div>
  `;

  loadComplaintsData();
}

function handleComplaintSearch(val) {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    complaintSearchParams.search = val;
    complaintSearchParams.page = 1;
    loadComplaintsData();
  }, 300);
}

function handleComplaintStatusFilter(val) {
  complaintSearchParams.status = val;
  complaintSearchParams.page = 1;
  loadComplaintsData();
}

function handleComplaintPriorityFilter(val) {
  complaintSearchParams.priority = val;
  complaintSearchParams.page = 1;
  loadComplaintsData();
}

function handleComplaintCategoryFilter(val) {
  complaintSearchParams.category = val;
  complaintSearchParams.page = 1;
  loadComplaintsData();
}

async function loadComplaintsData() {
  const tbody = document.getElementById('complaint-tbody');
  const paginationDiv = document.getElementById('complaint-pagination');
  if (!tbody) return;

  const query = new URLSearchParams(complaintSearchParams).toString();

  try {
    const res = await fetch(`/api/complaints?${query}`);
    const json = await res.json();
    const tickets = json.data;
    const pag = json.pagination;

    if (!tickets || tickets.length === 0) {
      tbody.innerHTML = UI.tableState(8, {
        title: 'Tidak ada tiket yang cocok',
        hint: 'Ubah filter status, prioritas, atau kategori.'
      });
      if (paginationDiv) paginationDiv.innerHTML = '';
      return;
    }

    tbody.innerHTML = tickets.map((t) => `
      <tr>
        <td class="cell-nowrap"><strong>${escapeHtml(t.ticket_code)}</strong></td>
        <td>
          <a class="link-strong" href="#customer-detail/${t.customer_id}" onclick="navigate('customer-detail', ${t.customer_id})">${escapeHtml(t.customer_name)}</a>
        </td>
        <td>${escapeHtml(categoryLabels[t.category] || t.category)}</td>
        <td>${priorityBadge(t.priority)}</td>
        <td>${statusBadge(t.status)}</td>
        <td>${escapeHtml(t.assigned_to_name || '-')}</td>
        <td>${slaBadge(t.sla_info.badgeClass, t.sla_info.label)}</td>
        <td class="cell-actions">
          <button type="button" class="btn btn-secondary btn-sm" onclick="navigate('complaint-detail', ${t.id})">Tindak lanjut</button>
        </td>
      </tr>
    `).join('');

    if (paginationDiv) {
      paginationDiv.innerHTML = UI.pagination({
        page: pag.page,
        totalPages: pag.totalPages,
        total: pag.total,
        limit: pag.limit,
        label: 'tiket',
        handler: 'changeComplaintPage'
      });
    }
  } catch (err) {
    tbody.innerHTML = UI.tableState(8, {
      title: 'Gagal memuat tiket',
      hint: 'Periksa koneksi lalu coba lagi.',
      tone: 'error'
    });
  }
}

function changeComplaintPage(page) {
  complaintSearchParams.page = page;
  loadComplaintsData();
}

async function openCreateTicketModal(preSelectedCustomerId = null) {
  try {
    const custRes = await fetch('/api/customers?status=ACTIVE&limit=100');
    const custData = await custRes.json();
    const customers = custData.data || [];

    UI.openModal({
      title: 'Catat keluhan baru',
      subtitle: 'Tiket masuk ke antrean operasional dengan batas respons 60 menit.',
      size: 'lg',
      body: `
        <form id="create-ticket-form" onsubmit="handleCreateTicketSubmit(event)">
          <div class="field">
            <label class="label" for="create-tck-customer">Pelanggan terdaftar</label>
            <select id="create-tck-customer" class="select" required>
              <option value="">Pilih pelanggan</option>
              ${customers.map((c) => `
                <option value="${c.id}" ${preSelectedCustomerId == c.id ? 'selected' : ''}>
                  ${escapeHtml(c.name)} (${escapeHtml(c.customer_code)} - +${escapeHtml(c.phone)})
                </option>
              `).join('')}
            </select>
            <p class="helper">Pelanggan baru harus didaftarkan lebih dulu di menu Pelanggan.</p>
          </div>

          <div class="form-grid">
            <div class="field">
              <label class="label" for="create-tck-category">Kategori keluhan</label>
              <select id="create-tck-category" class="select" required>
                <option value="FOOD_QUALITY">Kualitas makanan</option>
                <option value="WRONG_ORDER">Pesanan tidak sesuai</option>
                <option value="DELIVERY_DELAY">Keterlambatan pengiriman</option>
                <option value="SERVICE">Pelayanan outlet</option>
                <option value="CLEANLINESS">Kebersihan</option>
                <option value="OTHER">Lainnya</option>
              </select>
            </div>
            <div class="field">
              <label class="label" for="create-tck-priority">Prioritas</label>
              <select id="create-tck-priority" class="select" required>
                <option value="HIGH">Tinggi</option>
                <option value="MEDIUM" selected>Sedang</option>
                <option value="LOW">Rendah</option>
              </select>
            </div>
          </div>

          <div class="field">
            <label class="label" for="create-tck-desc">Deskripsi keluhan</label>
            <textarea id="create-tck-desc" class="textarea" placeholder="Jelaskan detail komplain dari pelanggan." rows="4" required></textarea>
          </div>

          <div class="notice notice-warning">
            <strong>Batas respons SLA.</strong> Target penanganan awal adalah 60 menit sejak tiket dibuat.
          </div>
        </form>
      `,
      footer: `
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
        <button type="submit" class="btn btn-primary" form="create-ticket-form">Buat tiket</button>
      `
    });
  } catch (err) {
    showToast('Gagal membuka form keluhan.', 'error');
  }
}

async function handleCreateTicketSubmit(event) {
  event.preventDefault();
  const customer_id = document.getElementById('create-tck-customer').value;
  const category = document.getElementById('create-tck-category').value;
  const priority = document.getElementById('create-tck-priority').value;
  const description = document.getElementById('create-tck-desc').value;

  try {
    const res = await fetch('/api/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id, category, priority, description })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      closeModal();
      if (currentRoute === 'complaints') loadComplaintsData();
      if (currentRoute === 'dashboard') renderDashboard();
      if (currentRoute === 'customer-detail') renderCustomerDetail(customer_id);
    } else {
      showToast(data.error, 'error');
    }
  } catch (err) {
    showToast('Gagal membuat tiket.', 'error');
  }
}

// -------------------------------------------------------------
// COMPLAINT DETAIL
// -------------------------------------------------------------
async function renderComplaintDetail(id) {
  const content = document.getElementById('content-area');
  content.innerHTML = UI.loading('Memuat detail tiket...');

  try {
    const res = await fetch(`/api/complaints/${id}`);
    const data = await res.json();
    const t = data.data;

    let activeAdmins = [];
    try {
      const uRes = await fetch('/api/admin/users');
      if (uRes.ok) {
        const uData = await uRes.json();
        activeAdmins = (uData.data || []).filter((u) => u.role === 'ADMIN' && u.is_active === 1);
      }
    } catch (err) {}

    const overdue = t.sla_info.code === 'OVERDUE';

    const statusAction = t.status === 'NEW'
      ? `<div class="notice notice-info">Tiket masih berstatus <strong>baru</strong>. Mulai penanganan untuk mencatat respons pertama.</div>
         <button type="button" class="btn btn-primary btn-block" onclick="updateTicketStatus(${t.id}, 'IN_PROGRESS')">Ubah ke diproses</button>`
      : (t.status === 'IN_PROGRESS'
        ? `<div class="notice notice-warning">Tiket sedang <strong>diproses</strong>. Tandai selesai setelah keluhan tertangani.</div>
           <button type="button" class="btn btn-success btn-block" onclick="updateTicketStatus(${t.id}, 'RESOLVED')">Tandai selesai</button>`
        : `<div class="notice notice-success">Tiket telah <strong>selesai</strong>. Tiket selesai tidak dapat dibuka kembali.</div>`);

    const reassignBlock = t.status !== 'RESOLVED' && activeAdmins.length > 0
      ? `<div class="panel-block">
          <div class="panel-block-title">Alihkan PIC</div>
          <select id="reassign-pic-select" class="select">
            ${activeAdmins.map((a) => `<option value="${a.id}" ${t.assigned_to === a.id ? 'selected' : ''}>${escapeHtml(a.name)}</option>`).join('')}
          </select>
          <button type="button" class="btn btn-secondary btn-block" onclick="handleReassignPic(${t.id})">Ganti PIC</button>
        </div>`
      : '';

    content.innerHTML = `
      ${UI.recordHeader({
        backLabel: 'Kembali ke daftar tiket',
        backAction: "navigate('complaints')",
        title: `
          ${escapeHtml(t.ticket_code)}
          ${statusBadge(t.status)}
          ${priorityBadge(t.priority)}
        `,
        meta: `
          <span>${escapeHtml(categoryLabels[t.category] || t.category)}</span>
          <span>${escapeHtml(t.customer_name)} (${escapeHtml(t.customer_code)})</span>
          <span>Dibuat ${formatDateIndo(t.created_at)}</span>
        `,
        actions: `<button type="button" class="btn btn-secondary btn-sm" onclick="navigate('customer-detail', ${t.customer_id})">Lihat pelanggan</button>`
      })}

      <div class="notice ${overdue ? 'notice-danger' : 'notice-warning'}">
        <div class="sla-summary">
          <div class="sla-summary-main">
            <div class="sla-summary-title">Batas respons: ${escapeHtml(t.sla_info.label)}</div>
            <div class="sla-summary-meta">
              Dibuat ${formatDateIndo(t.created_at)} &middot; Batas ${formatDateIndo(t.sla_due_at)}
              ${t.first_response_at ? ` &middot; Respons pertama ${formatDateIndo(t.first_response_at)}` : ''}
              ${t.resolved_at ? ` &middot; Selesai ${formatDateIndo(t.resolved_at)}` : ''}
            </div>
          </div>
          ${slaBadge(t.sla_info.badgeClass, t.sla_info.label)}
        </div>
      </div>

      <div class="split">
        <div>
          ${UI.section({
            title: 'Uraian keluhan',
            body: `
              <p class="meta-value">${escapeHtml(t.description)}</p>
              <div class="meta-grid mt-4">
                <div>
                  <span class="meta-label">Pelanggan</span>
                  <div class="meta-value">
                    ${escapeHtml(t.customer_name)} (${escapeHtml(t.customer_code)})<br>
                    <a class="link-phone" href="https://wa.me/${escapeHtml(t.customer_phone)}" target="_blank" rel="noopener">+${escapeHtml(t.customer_phone)}</a>
                  </div>
                </div>
                <div>
                  <span class="meta-label">Penanggung jawab</span>
                  <div class="meta-value">${escapeHtml(t.assigned_to_name || 'Belum ditugaskan')}</div>
                  <span class="meta-label mt-2">Dibuat oleh</span>
                  <div class="meta-value">${escapeHtml(t.created_by_name || '-')}</div>
                </div>
              </div>
            `
          })}

          ${UI.section({
            title: 'Riwayat aktivitas',
            body: `
              <div class="timeline">
                ${t.activities && t.activities.length > 0
                  ? t.activities.map((a) => `
                      <div class="timeline-item">
                        <div class="timeline-head">
                          <span class="timeline-author">${escapeHtml(a.user_name || 'Sistem')}</span>
                          <span class="timeline-time">${formatDateIndo(a.created_at)}</span>
                        </div>
                        <div class="timeline-body">${escapeHtml(a.description)}</div>
                      </div>
                    `).join('')
                  : UI.state({ title: 'Belum ada aktivitas', hint: 'Catatan tindak lanjut akan muncul di sini.' })}
              </div>
              ${t.status !== 'RESOLVED' ? `
                <hr class="section-divider">
                <form onsubmit="handleAddNoteSubmit(event, ${t.id})">
                  <div class="field">
                    <label class="label" for="ticket-note-text">Tambah catatan internal</label>
                    <textarea id="ticket-note-text" class="textarea" placeholder="Tuliskan tindak lanjut yang sudah dilakukan." rows="3" required></textarea>
                  </div>
                  <div class="preview-actions">
                    <button type="submit" class="btn btn-secondary btn-sm">Simpan catatan</button>
                  </div>
                </form>
              ` : ''}
            `
          })}
        </div>

        <div>
          <div class="panel status-panel">
            <div class="panel-head">
              <div class="panel-title">Status tiket</div>
            </div>
            <div class="panel-block">
              ${statusAction}
            </div>
            ${reassignBlock}
            <div class="panel-block">
              <div class="panel-block-title">Komunikasi WhatsApp</div>
              <p class="helper">Susun balasan dari template resmi, lalu kirim manual melalui WhatsApp.</p>
              <button type="button" class="btn btn-secondary btn-block" onclick="openWhatsAppWithTicket(${t.customer_id}, '${escapeHtml(t.ticket_code)}')">Buka template WhatsApp</button>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    content.innerHTML = UI.state({
      title: 'Gagal memuat detail tiket',
      hint: 'Tiket mungkin sudah berubah atau server tidak merespons.',
      tone: 'error',
      action: `<button type="button" class="btn btn-secondary" onclick="navigate('complaints')">Kembali ke daftar</button>`
    });
  }
}

async function updateTicketStatus(id, newStatus) {
  const note = await UI.prompt({
    title: newStatus === 'IN_PROGRESS' ? 'Mulai penanganan tiket' : 'Tandai tiket selesai',
    label: 'Catatan perubahan status',
    placeholder: newStatus === 'IN_PROGRESS' ? 'Contoh: Menghubungi pelanggan dan menyiapkan pengganti.' : 'Contoh: Pelanggan menerima penggantian dan menyatakan selesai.',
    help: 'Catatan tersimpan pada riwayat aktivitas tiket.',
    confirmLabel: 'Simpan status',
    required: false
  });
  if (note === null) return;

  try {
    const res = await fetch(`/api/complaints/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, note: note || '' })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      renderComplaintDetail(id);
    } else {
      showToast(data.error, 'error');
    }
  } catch (err) {
    showToast('Gagal mengubah status tiket.', 'error');
  }
}

async function handleReassignPic(id) {
  const select = document.getElementById('reassign-pic-select');
  if (!select) return;
  const assigned_to = select.value;

  const note = await UI.prompt({
    title: 'Alihkan PIC tiket',
    label: 'Alasan pergantian PIC',
    value: 'Pengalihan tugas staf operasional',
    confirmLabel: 'Ganti PIC',
    required: false
  });
  if (note === null) return;

  try {
    const res = await fetch(`/api/complaints/${id}/assign`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to, note: note || '' })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      renderComplaintDetail(id);
    } else {
      showToast(data.error, 'error');
    }
  } catch (err) {
    showToast('Gagal mengalihkan PIC.', 'error');
  }
}

async function handleAddNoteSubmit(event, id) {
  event.preventDefault();
  const text = document.getElementById('ticket-note-text').value;

  try {
    const res = await fetch(`/api/complaints/${id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: text })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      renderComplaintDetail(id);
    } else {
      showToast(data.error, 'error');
    }
  } catch (err) {
    showToast('Gagal menyimpan catatan.', 'error');
  }
}

function openWhatsAppWithTicket(customerId, ticketCode) {
  navigate('whatsapp');
  setTimeout(() => {
    loadWhatsAppStudio(customerId, ticketCode);
  }, 120);
}

// -------------------------------------------------------------
// WHATSAPP STUDIO
// -------------------------------------------------------------
let loadedTemplates = [];
let selectedTemplateId = 'COMPLAINT_RECEIVED';

function renderWhatsApp() {
  const content = document.getElementById('content-area');

  content.innerHTML = `
    ${UI.pageHeader({
      title: 'Template WhatsApp',
      description: 'Susun pesan standar, kaitkan data pelanggan, lalu kirim manual melalui WhatsApp.',
      actions: `<button type="button" class="btn btn-secondary" onclick="navigate('simulation')">Buka simulasi</button>`
    })}

    <div class="studio-grid">
      ${UI.section({
        title: 'Template pesan',
        description: 'Pilih satu template standar Bro Chicken.',
        body: `
          <div id="template-list-container" class="choice-list"></div>

          <div class="template-binding">
            <div class="field">
              <label class="label" for="wa-customer-select">Pelanggan</label>
              <select id="wa-customer-select" class="select" onchange="handleWaBindingChange()">
                <option value="">Pilih pelanggan</option>
              </select>
            </div>
            <div class="field">
              <label class="label" for="wa-ticket-input">Nomor tiket terkait (opsional)</label>
              <input type="text" id="wa-ticket-input" class="input" placeholder="Contoh: TK091126001" oninput="handleWaBindingChange()">
            </div>
          </div>
        `
      })}

      ${UI.section({
        title: 'Pratinjau pesan',
        description: 'Perubahan teks hanya berlaku untuk pengiriman saat ini.',
        body: `
          <div class="field">
            <label class="label" for="wa-preview-text">Teks pesan</label>
            <textarea id="wa-preview-text" class="textarea preview-textarea"></textarea>
            <p class="helper">Template master tidak berubah saat teks pratinjau diedit.</p>
          </div>
          <div class="preview-actions">
            <button type="button" class="btn btn-secondary" onclick="copyWaText()">Salin pesan</button>
            <button type="button" class="btn btn-primary" onclick="openWhatsAppDirect()">Buka WhatsApp Web</button>
          </div>
          <div class="notice notice-info preview-note">
            <strong>Pengiriman manual.</strong> Staf mengirim pesan melalui WhatsApp Web atau aplikasi desktop. Sistem tidak terhubung ke bot atau API pihak ketiga.
          </div>
        `
      })}
    </div>
  `;

  loadWhatsAppStudio();
}

async function loadWhatsAppStudio(preCustomerId = null, preTicketCode = null) {
  try {
    const res = await fetch('/api/templates');
    const json = await res.json();
    loadedTemplates = json.data || [];

    const listDiv = document.getElementById('template-list-container');
    if (listDiv) {
      listDiv.innerHTML = loadedTemplates.map((t) => `
        <button type="button" class="choice ${selectedTemplateId === t.id ? 'is-selected' : ''}" data-template-id="${escapeHtml(t.id)}" onclick="selectWaTemplate(this.dataset.templateId)">
          <span class="choice-body">
            <span class="choice-title">${escapeHtml(t.title)}</span>
            <span class="choice-desc">${escapeHtml(t.description)}</span>
          </span>
          ${UI.badge(t.category, 'neutral')}
        </button>
      `).join('');
    }

    const custRes = await fetch('/api/customers?limit=100');
    const custData = await custRes.json();
    const custSelect = document.getElementById('wa-customer-select');
    if (custSelect) {
      custSelect.innerHTML = '<option value="">Pilih pelanggan</option>' + (custData.data || []).map((c) => `
        <option value="${c.id}" data-name="${escapeHtml(c.name)}" data-phone="${escapeHtml(c.phone)}" ${preCustomerId == c.id ? 'selected' : ''}>
          ${escapeHtml(c.name)} (+${escapeHtml(c.phone)})
        </option>
      `).join('');
    }

    if (preTicketCode) {
      const ticketInput = document.getElementById('wa-ticket-input');
      if (ticketInput) ticketInput.value = preTicketCode;
    }

    updateWaPreview();
  } catch (err) {
    showToast('Gagal memuat template WhatsApp.', 'error');
  }
}

function selectWaTemplate(id) {
  selectedTemplateId = id;
  document.querySelectorAll('#template-list-container .choice').forEach((el) => {
    el.classList.toggle('is-selected', el.dataset.templateId === id);
  });
  updateWaPreview();
}

function handleWaBindingChange() {
  updateWaPreview();
}

function updateWaPreview() {
  const current = loadedTemplates.find((t) => t.id === selectedTemplateId) || loadedTemplates[0];
  if (!current) return;

  const select = document.getElementById('wa-customer-select');
  const selectedOpt = select ? select.options[select.selectedIndex] : null;
  const nameVal = selectedOpt && selectedOpt.value ? selectedOpt.dataset.name : '{nama}';
  const ticketInput = document.getElementById('wa-ticket-input');
  const ticketVal = ticketInput && ticketInput.value.trim() ? ticketInput.value.trim() : '{ticket_id}';

  let text = current.template;
  text = text.replace(/\{nama\}/g, nameVal);
  text = text.replace(/\{ticket_id\}/g, ticketVal);
  text = text.replace(/\{nama_bisnis\}/g, 'Bro Chicken');

  const previewBox = document.getElementById('wa-preview-text');
  if (previewBox) previewBox.value = text;
}

function copyWaText() {
  const box = document.getElementById('wa-preview-text');
  if (!box) return;
  navigator.clipboard.writeText(box.value);
  showToast('Teks pesan disalin ke clipboard.');
}

function openWhatsAppDirect() {
  const select = document.getElementById('wa-customer-select');
  const selectedOpt = select ? select.options[select.selectedIndex] : null;
  const phone = selectedOpt && selectedOpt.value ? selectedOpt.dataset.phone : '';
  const text = encodeURIComponent(document.getElementById('wa-preview-text').value);

  if (phone) {
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  } else {
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }
}

// -------------------------------------------------------------
// REPORTS
// -------------------------------------------------------------
async function renderReports() {
  const content = document.getElementById('content-area');
  content.innerHTML = UI.loading('Memuat laporan...');

  try {
    const res = await fetch(`/api/reports?period=${encodeURIComponent(reportPeriod)}`);
    const json = await res.json();
    const d = json.data;
    const s = d.summary;

    const periodOptions = [
      ['this_month', 'Bulan ini'],
      ['today', 'Hari ini'],
      ['7days', '7 hari terakhir'],
      ['30days', '30 hari terakhir']
    ].map(([value, label]) => `<option value="${value}" ${reportPeriod === value ? 'selected' : ''}>${label}</option>`).join('');

    const categoryBars = Object.entries(d.category_distribution || {}).map(([cat, count]) => {
      const pct = s.total_complaints > 0 ? Math.round((count / s.total_complaints) * 100) : 0;
      return `
        <div>
          <div class="bar-head">
            <span class="bar-label">${escapeHtml(categoryLabels[cat] || cat)}</span>
            <span class="bar-meta">${count} tiket (${pct}%)</span>
          </div>
          <div class="bar-track"><div class="bar-fill" style="width: ${pct}%;"></div></div>
        </div>
      `;
    }).join('');

    const picRows = (d.pic_performance || []).map((p) => `
      <tr>
        <td><strong>${escapeHtml(p.name)}</strong></td>
        <td class="num">${p.total_tickets}</td>
        <td class="num text-success">${p.on_time}</td>
        <td class="num text-danger">${p.overdue}</td>
        <td>${UI.badge(`${p.compliance_rate}%`, p.compliance_rate >= 90 ? 'success' : 'warning')}</td>
      </tr>
    `).join('');

    content.innerHTML = `
      ${UI.pageHeader({
        title: 'Laporan & SLA',
        description: 'Ringkasan volume keluhan, kecepatan respons, dan kepatuhan batas waktu.',
        actions: `<a class="btn btn-secondary" id="export-csv-btn" href="/api/reports/export-csv?period=${encodeURIComponent(reportPeriod)}">Unduh CSV</a>`
      })}

      <div class="toolbar">
        <div class="toolbar-group">
          <label class="toolbar-label" for="report-period">Periode</label>
          <select id="report-period" class="select control-auto" onchange="loadReportPeriod(this.value)">${periodOptions}</select>
        </div>
      </div>

      ${UI.metrics([
        { label: 'Pelanggan baru', value: s.new_customers, note: 'Dalam periode laporan' },
        { label: 'Keluhan masuk', value: s.total_complaints, note: `${s.status_counts.RESOLVED} selesai, ${s.status_counts.IN_PROGRESS} diproses` },
        { label: 'Rata-rata respons', value: s.avg_response_minutes, unit: 'menit', note: 'Target SLA maksimal 60 menit' },
        { label: 'Kepatuhan SLA', value: `${s.sla_compliance_rate}%`, tone: s.sla_compliance_rate >= 90 ? 'success' : 'danger', note: `${s.overdue_complaints} tiket melewati batas` }
      ])}

      <div class="split-even">
        ${UI.section({
          title: 'Distribusi kategori',
          description: 'Komposisi keluhan pada periode terpilih.',
          body: `<div class="bar-list">${categoryBars || UI.state({ title: 'Belum ada keluhan', hint: 'Distribusi kategori muncul setelah ada tiket.' })}</div>`
        })}

        ${UI.section({
          title: 'Kinerja staf PIC',
          description: 'Jumlah tiket dan kepatuhan SLA per admin.',
          body: `
            <div class="table-wrap">
              <table class="data">
                <thead>
                  <tr>
                    <th>Staf</th>
                    <th>Tiket</th>
                    <th>Tepat waktu</th>
                    <th>Terlambat</th>
                    <th>Kepatuhan</th>
                  </tr>
                </thead>
                <tbody>${picRows || UI.tableState(5, { title: 'Belum ada data PIC' })}</tbody>
              </table>
            </div>
          `
        })}
      </div>
    `;
  } catch (err) {
    content.innerHTML = UI.state({
      title: 'Gagal memuat laporan',
      hint: 'Server tidak merespons. Coba muat ulang.',
      tone: 'error',
      action: `<button type="button" class="btn btn-secondary" onclick="renderReports()">Coba lagi</button>`
    });
  }
}

function loadReportPeriod(period) {
  reportPeriod = period;
  renderReports();
}

// -------------------------------------------------------------
// ADMIN MANAGEMENT (OWNER ONLY)
// -------------------------------------------------------------
function renderAdmin() {
  if (currentUser.role !== 'OWNER') {
    document.getElementById('content-area').innerHTML = UI.state({
      title: 'Akses khusus pemilik',
      hint: 'Halaman ini hanya dapat dibuka oleh akun pemilik.',
      tone: 'error'
    });
    return;
  }

  const content = document.getElementById('content-area');
  content.innerHTML = `
    ${UI.pageHeader({
      title: 'Akun admin',
      description: 'Kelola akun dan hak akses staf operasional.',
      actions: `<button type="button" class="btn btn-primary" onclick="openAddAdminModal()">Tambah akun admin</button>`
    })}

    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th>Nama</th>
            <th>Username</th>
            <th>Peran</th>
            <th>Status</th>
            <th>Tiket berjalan</th>
            <th>Terdaftar</th>
            <th class="cell-actions">Aksi</th>
          </tr>
        </thead>
        <tbody id="admin-tbody">
          ${UI.tableState(7, { title: 'Memuat akun admin' })}
        </tbody>
      </table>
    </div>
  `;

  loadAdminUsers();
}

async function loadAdminUsers() {
  const tbody = document.getElementById('admin-tbody');
  if (!tbody) return;

  try {
    const res = await fetch('/api/admin/users');
    const json = await res.json();
    const users = json.data || [];

    tbody.innerHTML = users.map((u) => `
      <tr>
        <td><strong>${escapeHtml(u.name)}</strong></td>
        <td><code>${escapeHtml(u.username)}</code></td>
        <td>${UI.badge(u.role === 'OWNER' ? 'Pemilik' : 'Staf admin', u.role === 'OWNER' ? 'brand' : 'info')}</td>
        <td>${UI.badge(u.is_active === 1 ? 'Aktif' : 'Nonaktif', u.is_active === 1 ? 'success' : 'danger')}</td>
        <td>${u.active_tickets_count} tiket</td>
        <td class="cell-nowrap">${formatDateIndo(u.created_at)}</td>
        <td class="cell-actions">
          ${u.role !== 'OWNER' ? `
            <div class="row-actions">
              <button type="button" class="btn btn-secondary btn-sm" data-name="${escapeHtml(u.name)}" onclick="openResetPasswordModal(${u.id}, this.dataset.name)">Reset sandi</button>
              ${u.is_active === 1
                ? `<button type="button" class="btn btn-danger-quiet btn-sm" onclick="toggleAdminStatus(${u.id}, 0)">Nonaktifkan</button>`
                : `<button type="button" class="btn btn-quiet btn-sm" onclick="toggleAdminStatus(${u.id}, 1)">Aktifkan</button>`}
            </div>
          ` : '<span class="muted">Akun utama</span>'}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = UI.tableState(7, {
      title: 'Gagal memuat akun',
      hint: 'Periksa koneksi lalu coba lagi.',
      tone: 'error'
    });
  }
}

function openAddAdminModal() {
  UI.openModal({
    title: 'Tambah akun admin',
    subtitle: 'Akun baru langsung dapat masuk setelah dibuat.',
    body: `
      <form id="add-admin-form" onsubmit="handleAddAdminSubmit(event)">
        <div class="field">
          <label class="label" for="add-admin-name">Nama lengkap</label>
          <input type="text" id="add-admin-name" class="input" placeholder="Contoh: Doni Pratama" required>
        </div>
        <div class="field">
          <label class="label" for="add-admin-username">Username</label>
          <input type="text" id="add-admin-username" class="input" placeholder="Contoh: doni_pratama" autocomplete="off" required>
        </div>
        <div class="field">
          <label class="label" for="add-admin-password">Kata sandi awal</label>
          <input type="password" id="add-admin-password" class="input" placeholder="Minimal 6 karakter" autocomplete="new-password" required>
        </div>
      </form>
    `,
    footer: `
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
      <button type="submit" class="btn btn-primary" form="add-admin-form">Buat akun</button>
    `
  });
}

async function handleAddAdminSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('add-admin-name').value;
  const username = document.getElementById('add-admin-username').value;
  const password = document.getElementById('add-admin-password').value;

  try {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username, password })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      closeModal();
      loadAdminUsers();
    } else {
      showToast(data.error, 'error');
    }
  } catch (err) {
    showToast('Gagal membuat akun admin.', 'error');
  }
}

async function toggleAdminStatus(id, newStatus) {
  try {
    const res = await fetch(`/api/admin/users/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      loadAdminUsers();
    } else {
      showToast(data.error, 'error');
    }
  } catch (err) {
    showToast('Gagal memperbarui status akun.', 'error');
  }
}

async function openResetPasswordModal(id, name) {
  const newPass = await UI.prompt({
    title: 'Reset kata sandi',
    label: `Kata sandi baru untuk ${name}`,
    placeholder: 'Minimal 6 karakter',
    help: 'Pemilik tidak dapat melihat kata sandi lama. Kata sandi baru langsung berlaku.',
    confirmLabel: 'Reset sandi'
  });
  if (!newPass) return;

  try {
    const res = await fetch(`/api/admin/users/${id}/reset-password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_password: newPass })
    });
    const data = await res.json();
    if (data.success) showToast(data.message);
    else showToast(data.error, 'error');
  } catch (err) {
    showToast('Gagal mereset kata sandi.', 'error');
  }
}

// -------------------------------------------------------------
// SETTINGS (OWNER ONLY)
// -------------------------------------------------------------
function renderSettings() {
  if (currentUser.role !== 'OWNER') {
    document.getElementById('content-area').innerHTML = UI.state({
      title: 'Akses khusus pemilik',
      hint: 'Halaman ini hanya dapat dibuka oleh akun pemilik.',
      tone: 'error'
    });
    return;
  }

  const content = document.getElementById('content-area');
  content.innerHTML = `
    ${UI.pageHeader({
      title: 'Pengaturan sistem',
      description: 'Profil outlet, kebijakan SLA, dan pencadangan database.',
      actions: ''
    })}

    <div class="split-even">
      ${UI.section({
        title: 'Profil outlet',
        description: 'Nilai baku sesuai SOP operasional.',
        body: `
          <div class="field">
            <label class="label" for="setting-outlet-name">Nama outlet</label>
            <input type="text" id="setting-outlet-name" class="input" value="Bro Chicken - Cabang Margonda" readonly>
          </div>
          <div class="field">
            <label class="label" for="setting-hotline">Hotline layanan</label>
            <input type="text" id="setting-hotline" class="input" value="0812-9988-7766" readonly>
          </div>
          <div class="field">
            <label class="label" for="setting-sla">Target batas respons</label>
            <input type="text" id="setting-sla" class="input" value="60 menit kalender" readonly>
            <p class="helper">Dihitung sejak tiket dibuat dan tidak dapat diubah (FR-08.12).</p>
          </div>
        `
      })}

      ${UI.section({
        title: 'Database dan keamanan',
        description: 'Cadangkan database SQLite atau ubah kata sandi pemilik.',
        body: `
          <div class="panel">
            <div class="panel-block">
              <div class="panel-block-title">Pencadangan database</div>
              <p class="helper">Unduh salinan file database untuk arsip lokal (NFR-12).</p>
              <a class="btn btn-primary" href="/api/settings/backup">Unduh database SQLite</a>
            </div>
            <div class="panel-block">
              <div class="panel-block-title">Ubah kata sandi pemilik</div>
              <form onsubmit="handleChangeOwnerPassword(event)">
                <div class="field">
                  <label class="label" for="owner-curr-pass">Kata sandi saat ini</label>
                  <input type="password" id="owner-curr-pass" class="input" autocomplete="current-password" required>
                </div>
                <div class="field">
                  <label class="label" for="owner-new-pass">Kata sandi baru</label>
                  <input type="password" id="owner-new-pass" class="input" autocomplete="new-password" required>
                </div>
                <button type="submit" class="btn btn-secondary btn-sm">Perbarui kata sandi</button>
              </form>
            </div>
          </div>
        `
      })}
    </div>
  `;
}

async function handleChangeOwnerPassword(event) {
  event.preventDefault();
  const current_password = document.getElementById('owner-curr-pass').value;
  const new_password = document.getElementById('owner-new-pass').value;

  try {
    const res = await fetch('/api/settings/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password, new_password })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      document.getElementById('owner-curr-pass').value = '';
      document.getElementById('owner-new-pass').value = '';
    } else {
      showToast(data.error, 'error');
    }
  } catch (err) {
    showToast('Gagal memperbarui kata sandi.', 'error');
  }
}

// -------------------------------------------------------------
// WHATSAPP INBOX (ADMIN POV)
// -------------------------------------------------------------
let simRooms = [];
let simRoomQuery = '';
let simActiveCustomerId = null;
let simThread = { customer: null, messages: [], analysis: null, latest_ticket: null };
let simContextCollapsed = false;
let simThreadLoading = false;
let simRoomsLoading = false;
let simRenderToken = 0;
let adminSSE = null;
let simSlaTicker = null;

function initAdminSSE() {
  if (adminSSE) return;

  adminSSE = new EventSource('/api/simulation/admin/stream');

  adminSSE.addEventListener('new_customer_chat', (event) => {
    try {
      const data = JSON.parse(event.data);
      const customerName = data.customer ? data.customer.name : 'Pelanggan';
      showToast(`Pesan baru dari ${customerName}.`);

      if (currentRoute === 'simulation') {
        refreshSimulationInbox({ reloadThread: true });
      }
    } catch (err) {
      console.error('Gagal membaca event new_customer_chat.', err);
    }
  });

  adminSSE.addEventListener('admin_reply_sent', (event) => {
    try {
      JSON.parse(event.data);
      if (currentRoute === 'simulation') {
        refreshSimulationInbox({ reloadThread: true, quiet: true });
      }
    } catch (err) {}
  });

  adminSSE.addEventListener('member_registered', (event) => {
    try {
      const data = JSON.parse(event.data);
      const name = data.customer ? data.customer.name : 'Member baru';
      showToast(`Member baru terdaftar: ${name}.`);
      if (currentRoute === 'membership') loadMembershipData();
    } catch (err) {}
  });

  adminSSE.addEventListener('member_message_sent', (event) => {
    try {
      const data = JSON.parse(event.data);
      const labels = {
        WELCOME: 'Welcome message',
        QR_PROMO: 'Promo QR',
        END_MONTH_COUPON: 'Kupon tanggal tua'
      };
      showToast(`${labels[data.message_type] || 'Pesan member'} terkirim ke ${data.customer_name || data.phone}.`);
      if (currentRoute === 'membership') loadMembershipData();
    } catch (err) {}
  });

  adminSSE.addEventListener('coupon_redeemed', (event) => {
    try {
      const data = JSON.parse(event.data);
      showToast(`Kupon ${data.coupon_code} ditandai sudah dipakai.`);
      if (currentRoute === 'membership') loadMembershipData();
    } catch (err) {}
  });

  adminSSE.addEventListener('end_month_promo_run', (event) => {
    try {
      const data = JSON.parse(event.data);
      if (!data.skipped) {
        showToast(`Promo tanggal tua: ${data.issued} kupon diterbitkan.`);
      }
      if (currentRoute === 'membership') loadMembershipData();
    } catch (err) {}
  });
}

function currentSimRoom() {
  return simRooms.find((room) => Number(room.customer_id) === Number(simActiveCustomerId)) || null;
}

function formatSimClock(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function formatSimRoomTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return formatSimClock(iso);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function formatSimDay(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  if (date.toDateString() === today.toDateString()) return 'Hari ini';
  if (date.toDateString() === yesterday.toDateString()) return 'Kemarin';
  return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function roomPreviewText(room) {
  if (!room.last_message) return 'Belum ada pesan';
  const body = String(room.last_message.body || '').replace(/\s+/g, ' ').trim();
  if (!body) return 'Pesan kosong';
  const prefix = room.last_message.sender_type === 'ADMIN'
    ? 'Anda: '
    : (room.last_message.sender_type === 'AI' ? 'Asisten: ' : '');
  return prefix + body;
}

function filteredSimRooms() {
  const query = simRoomQuery.trim().toLowerCase();
  if (!query) return simRooms;
  return simRooms.filter((room) => {
    return String(room.name || '').toLowerCase().includes(query)
      || String(room.phone || '').includes(query)
      || String(room.customer_code || '').toLowerCase().includes(query);
  });
}

function renderSimulationRoomList() {
  const listEl = document.getElementById('sim-room-list');
  if (!listEl) return;

  const countEl = document.getElementById('sim-room-count');
  if (countEl) {
    const unread = simRooms.reduce((sum, room) => sum + (Number(room.unread_count) || 0), 0);
    countEl.innerText = `${simRooms.length} ruang${unread > 0 ? ` · ${unread} belum dibaca` : ' · semua terbaca'}`;
  }

  if (simRoomsLoading && simRooms.length === 0) {
    listEl.innerHTML = UI.loading('Memuat kotak masuk...');
    return;
  }

  const rooms = filteredSimRooms();
  if (rooms.length === 0) {
    listEl.innerHTML = UI.state({
      title: simRooms.length === 0 ? 'Belum ada pelanggan' : 'Tidak ada hasil',
      hint: simRooms.length === 0
        ? 'Ruang chat dibuat otomatis saat pelanggan pertama mengirim pesan dari halaman /simulasi.'
        : 'Coba kata kunci lain atau hapus filter pencarian.'
    });
    return;
  }

  listEl.innerHTML = rooms.map((room) => {
    const active = Number(room.customer_id) === Number(simActiveCustomerId);
    const unread = Number(room.unread_count) || 0;
    const archived = room.status === 'ARCHIVED';
    return `
      <button type="button" class="room-row${active ? ' is-active' : ''}${archived ? ' is-archived' : ''}" onclick="openSimulationRoom(${Number(room.customer_id)})">
        <span class="room-avatar" aria-hidden="true">${escapeHtml(initialsOf(room.name))}</span>
        <span class="room-main">
          <span class="room-top">
            <span class="room-name">${escapeHtml(room.name)}</span>
            <span class="room-time">${escapeHtml(room.last_message ? formatSimRoomTime(room.last_message.created_at) : '')}</span>
          </span>
          <span class="room-preview">${escapeHtml(roomPreviewText(room))}</span>
          <span class="room-meta">
            <span class="room-source">${escapeHtml(sourceLabels[room.source] || room.source || 'Lainnya')}</span>
            ${archived ? '<span class="room-archived">Diarsipkan</span>' : ''}
          </span>
        </span>
        ${unread > 0 ? `<span class="room-unread" aria-label="${unread} pesan belum dibaca">${unread > 99 ? '99+' : unread}</span>` : ''}
      </button>
    `;
  }).join('');
}

function renderSimulationBubble(message) {
  const sender = escapeHtml(message.sender_name || 'Pelanggan');
  const body = escapeHtml(message.body || '');
  const time = escapeHtml(formatSimClock(message.created_at));

  if (message.direction === 'IN') {
    return `
      <div class="wa-bubble wa-in">
        <div class="wa-sender">${sender}</div>
        <div class="wa-text">${body}</div>
        <div class="wa-time">${time} &middot; masuk</div>
      </div>
    `;
  }

  if (message.sender_type === 'AI') {
    return `
      <div class="wa-bubble wa-out wa-auto">
        <div class="wa-sender">Bro Chicken Assistant &middot; otomatis</div>
        <div class="wa-text">${body}</div>
        <div class="wa-time">${time} &middot; terkirim</div>
      </div>
    `;
  }

  return `
    <div class="wa-bubble wa-out">
      <div class="wa-sender">${sender} &middot; staf Bro Chicken</div>
      <div class="wa-text">${body}</div>
      <div class="wa-time">${time} &middot; terkirim</div>
    </div>
  `;
}

function renderSimulationThreadMessages() {
  const messages = simThread.messages || [];
  if (messages.length === 0) {
    const name = simThread.customer ? simThread.customer.name : 'Pelanggan ini';
    return `
      <div class="thread-empty">
        <div class="thread-empty-title">Belum ada pesan</div>
        <p class="thread-empty-text">${escapeHtml(name)} sudah memiliki ruang chat. Percakapan akan muncul saat pelanggan mengirim pesan dari halaman simulasi pelanggan.</p>
        <a class="btn btn-secondary btn-sm" href="/simulasi${simThread.customer ? `?phone=${encodeURIComponent(simThread.customer.phone)}&name=${encodeURIComponent(simThread.customer.name)}` : ''}" target="_blank" rel="noopener">Buka layar pelanggan</a>
      </div>
    `;
  }

  let lastDay = '';
  return messages.map((message) => {
    const day = formatSimDay(message.created_at);
    const divider = day && day !== lastDay ? `<div class="wa-day">${escapeHtml(day)}</div>` : '';
    lastDay = day;
    return divider + renderSimulationBubble(message);
  }).join('');
}

function renderSimulationThread() {
  const panel = document.getElementById('sim-thread-panel');
  if (!panel) return;

  const room = currentSimRoom();
  if (!room) {
    panel.innerHTML = `
      <div class="thread-empty thread-empty--room">
        <div class="thread-empty-inner">
          <div class="thread-empty-title">Pilih percakapan</div>
          <p class="thread-empty-text">Semua pelanggan di database tampil sebagai ruang chat. Pilih satu ruang untuk membaca percakapan dan membalas sebagai admin.</p>
        </div>
      </div>
    `;
    return;
  }

  const customer = simThread.customer || room;
  const archived = room.status === 'ARCHIVED';

  panel.innerHTML = `
    <div class="thread-head">
      <div class="thread-head-main">
        <button type="button" class="btn btn-quiet btn-sm thread-back" onclick="closeSimulationRoom()" aria-label="Kembali ke daftar chat">&larr;</button>
        <span class="room-avatar room-avatar--head" aria-hidden="true">${escapeHtml(initialsOf(customer.name))}</span>
        <div class="thread-identity">
          <div class="thread-name">${escapeHtml(customer.name)}</div>
          <div class="thread-meta">
            ${escapeHtml(customer.phone)}
            <span class="thread-meta-sep">&middot;</span>
            ${escapeHtml(customer.customer_code || '-')}
            ${archived ? '<span class="badge badge-warning badge-inline">Diarsipkan</span>' : ''}
          </div>
        </div>
      </div>
      <div class="thread-head-actions">
        <a class="btn btn-secondary btn-sm thread-customer-link" href="/simulasi?phone=${encodeURIComponent(customer.phone)}&name=${encodeURIComponent(customer.name)}" target="_blank" rel="noopener">Layar pelanggan</a>
        <button type="button" class="btn btn-quiet btn-sm" onclick="toggleSimulationContext()" aria-expanded="${simContextCollapsed ? 'false' : 'true'}">
          ${simContextCollapsed ? 'Info CRM' : 'Tutup info'}
        </button>
      </div>
    </div>

    <div class="thread-feed" id="sim-thread-feed">
      ${simThreadLoading ? UI.loading('Memuat percakapan...') : renderSimulationThreadMessages()}
    </div>

    <form class="thread-composer" onsubmit="handleSendAdminReply(event)">
      <input type="text" id="sim-admin-reply" placeholder="Balas sebagai ${escapeHtml(currentUser ? currentUser.name : 'admin')}..." autocomplete="off">
      <button type="submit" class="wa-send" id="sim-reply-button">Kirim</button>
    </form>
  `;

  scrollSimulationThreadToBottom();
}

function renderSimulationContext() {
  const panel = document.getElementById('sim-context-panel');
  if (!panel) return;

  const room = currentSimRoom();
  if (!room) {
    panel.innerHTML = `
      <div class="context-head">
        <div>
          <div class="context-eyebrow">Konteks CRM</div>
          <div class="context-title">Belum ada ruang dipilih</div>
        </div>
      </div>
      <div class="context-body">
        ${UI.state({
          title: 'Pilih percakapan',
          hint: 'Profil pelanggan, analisis triage, dan tiket terbaru muncul di sini.'
        })}
      </div>
    `;
    return;
  }

  const customer = simThread.customer || room;
  const analysis = simThread.analysis;
  const ticket = simThread.latest_ticket;

  const analysisHtml = !analysis ? `
    ${UI.state({
      title: 'Belum ada analisis',
      hint: 'Triage berjalan saat pelanggan mengirim pesan dari halaman simulasi.'
    })}
  ` : (() => {
    const isComplaint = analysis.is_complaint;
    const category = categoryLabels[analysis.category] || analysis.category || '-';
    const priority = priorityLabels[analysis.priority] || analysis.priority || '-';
    const priorityTone = analysis.priority === 'HIGH' ? 'danger' : (analysis.priority === 'MEDIUM' ? 'warning' : 'info');
    const sentimentTone = analysis.sentiment === 'NEGATIVE' ? 'danger' : (analysis.sentiment === 'POSITIVE' ? 'success' : 'neutral');
    return `
      <div class="inspector">
        <div class="inspector-row">
          <span class="inspector-label">Tipe pesan</span>
          <span class="inspector-value">${UI.badge(isComplaint ? 'Keluhan resmi' : 'Pertanyaan umum', isComplaint ? 'danger' : 'success')}</span>
        </div>
        <div class="inspector-row">
          <span class="inspector-label">Kategori</span>
          <span class="inspector-value">${escapeHtml(category)}</span>
        </div>
        <div class="inspector-row">
          <span class="inspector-label">Prioritas</span>
          <span class="inspector-value">${UI.badge(priority, priorityTone)}</span>
        </div>
        <div class="inspector-row">
          <span class="inspector-label">Sentimen</span>
          <span class="inspector-value">${UI.badge(analysis.sentiment || '-', sentimentTone)}</span>
        </div>
        <div class="inspector-block">
          <div class="inspector-title">Ringkasan masalah</div>
          <div class="notice">${escapeHtml(analysis.extracted_problem || '-')}</div>
        </div>
        <div class="inspector-foot">Mesin: ${escapeHtml(analysis.engine || 'rule-based')}</div>
      </div>
    `;
  })();

  const ticketHtml = !ticket ? `
    ${UI.state({
      title: 'Belum ada tiket',
      hint: 'Tiket CRM dibuat otomatis saat triage mendeteksi keluhan.'
    })}
  ` : (() => {
    const sla = getSlaRemaining(ticket.sla_due_at);
    return `
      <div class="ticket-summary">
        <div class="ticket-code">#${escapeHtml(ticket.ticket_code)}</div>
        <div class="ticket-badge-row">${statusBadge(ticket.status)} ${priorityBadge(ticket.priority)}</div>
        <div class="ticket-line"><strong>PIC:</strong> ${escapeHtml(ticket.assigned_to_name || 'Admin')}</div>
        <div class="ticket-line">
          <strong>Batas respons:</strong>
          <span id="sim-sla-countdown" class="badge ${sla.badgeClass}">${escapeHtml(sla.label)}</span>
        </div>
        <button type="button" class="btn btn-secondary btn-block mt-2" onclick="navigate('complaint-detail', ${Number(ticket.id)})">Buka tiket di CRM</button>
      </div>
    `;
  })();

  panel.innerHTML = `
    <div class="context-head">
      <div>
        <div class="context-eyebrow">Konteks CRM</div>
        <div class="context-title">${escapeHtml(customer.name)}</div>
      </div>
      <button type="button" class="btn btn-quiet btn-sm" onclick="toggleSimulationContext()">Tutup</button>
    </div>
    <div class="context-body">
      <div class="context-profile">
        <span class="avatar" aria-hidden="true">${escapeHtml(initialsOf(customer.name))}</span>
        <div class="context-profile-main">
          <div class="context-profile-name">${escapeHtml(customer.name)}</div>
          <div class="context-profile-phone">${escapeHtml(customer.phone)}</div>
        </div>
      </div>

      <div class="context-meta-grid">
        <div class="context-meta-item">
          <span class="context-meta-label">Kode pelanggan</span>
          <span class="context-meta-value">${escapeHtml(customer.customer_code || '-')}</span>
        </div>
        <div class="context-meta-item">
          <span class="context-meta-label">Kanal</span>
          <span class="context-meta-value">${escapeHtml(sourceLabels[customer.source] || customer.source || '-')}</span>
        </div>
        <div class="context-meta-item">
          <span class="context-meta-label">Status</span>
          <span class="context-meta-value">${customer.status === 'ARCHIVED' ? UI.badge('Diarsipkan', 'warning') : UI.badge('Aktif', 'success')}</span>
        </div>
        <div class="context-meta-item">
          <span class="context-meta-label">Bergabung</span>
          <span class="context-meta-value">${escapeHtml(UI.formatDateIndo(customer.joined_at))}</span>
        </div>
      </div>

      <button type="button" class="btn btn-secondary btn-block" onclick="navigate('customer-detail', ${Number(customer.id || customer.customer_id)})">Buka profil pelanggan</button>

      <div class="context-section">
        <div class="context-section-title">Analisis triage</div>
        ${analysisHtml}
      </div>

      <div class="context-section">
        <div class="context-section-title">Tiket terbaru</div>
        ${ticketHtml}
      </div>
    </div>
  `;

  startSimSlaTicker();
}

function syncSimulationInboxClasses() {
  const inbox = document.getElementById('sim-inbox');
  if (!inbox) return;
  inbox.classList.toggle('has-active-room', simActiveCustomerId != null);
  inbox.classList.toggle('is-context-collapsed', simContextCollapsed);
  inbox.classList.toggle('is-context-open', !simContextCollapsed && simActiveCustomerId != null);
}

function scrollSimulationThreadToBottom() {
  setTimeout(() => {
    const el = document.getElementById('sim-thread-feed');
    if (el) el.scrollTop = el.scrollHeight;
  }, 50);
}

function toggleSimulationContext() {
  setSimulationContext(simContextCollapsed);
}

function setSimulationContext(open) {
  simContextCollapsed = !open;
  syncSimulationInboxClasses();
  const threadPanel = document.querySelector('.thread-head-actions button[aria-expanded]');
  if (threadPanel) threadPanel.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) renderSimulationContext();
}

function handleSimRoomSearch(value) {
  simRoomQuery = value || '';
  renderSimulationRoomList();
}

async function loadSimulationRooms() {
  simRoomsLoading = true;
  if (simRooms.length === 0) renderSimulationRoomList();

  try {
    const res = await fetch('/api/simulation/rooms');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Gagal memuat ruang chat.');
    simRooms = data.rooms || data.data || [];
  } catch (err) {
    showToast(err.message || 'Gagal memuat kotak masuk.', 'error');
  } finally {
    simRoomsLoading = false;
    renderSimulationRoomList();
  }
}

async function loadSimulationThread(customerId, options = {}) {
  const requestedId = Number(customerId);
  simThreadLoading = true;
  renderSimulationThread();

  try {
    const res = await fetch(`/api/simulation/rooms/${requestedId}/messages`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Gagal memuat percakapan.');

    if (Number(simActiveCustomerId) !== requestedId) return;

    simThread = {
      customer: data.customer,
      messages: data.messages || [],
      analysis: data.analysis || null,
      latest_ticket: data.latest_ticket || null
    };

    const room = currentSimRoom();
    if (room) {
      room.latest_ticket = data.latest_ticket || room.latest_ticket;
      const unread = Number(room.unread_count) || 0;
      if (unread > 0 && options.markRead !== false) {
        markSimulationRoomRead(requestedId);
      }
    }
  } catch (err) {
    if (Number(simActiveCustomerId) === requestedId) {
      showToast(err.message || 'Gagal memuat percakapan.', 'error');
    }
  } finally {
    if (Number(simActiveCustomerId) === requestedId) {
      simThreadLoading = false;
      renderSimulationThread();
      renderSimulationContext();
      syncSimulationInboxClasses();
    }
  }
}

async function markSimulationRoomRead(customerId) {
  try {
    const res = await fetch(`/api/simulation/rooms/${Number(customerId)}/read`, { method: 'POST' });
    const data = await res.json();
    if (!data.success) return;
    const room = simRooms.find((item) => Number(item.customer_id) === Number(customerId));
    if (room) room.unread_count = 0;
    renderSimulationRoomList();
  } catch (err) {}
}

async function openSimulationRoom(customerId, options = {}) {
  const room = simRooms.find((item) => Number(item.customer_id) === Number(customerId));
  if (!room) {
    showToast('Ruang chat tidak ditemukan.', 'error');
    return;
  }

  simActiveCustomerId = Number(customerId);
  simThread = {
    customer: room,
    messages: [],
    analysis: null,
    latest_ticket: room.latest_ticket || null
  };
  simContextCollapsed = window.innerWidth < 1280;

  if (options.updateHash !== false) {
    const hash = `#simulation/${Number(customerId)}`;
    if (window.location.hash !== hash) {
      window.history.pushState({ route: 'simulation', id: Number(customerId) }, '', hash);
    }
  }

  renderSimulationRoomList();
  renderSimulationThread();
  renderSimulationContext();
  syncSimulationInboxClasses();
  await loadSimulationThread(customerId);
}

function closeSimulationRoom() {
  simActiveCustomerId = null;
  simThread = { customer: null, messages: [], analysis: null, latest_ticket: null };
  simContextCollapsed = window.innerWidth < 1280;
  if (window.location.hash !== '#simulation') {
    window.history.pushState({ route: 'simulation' }, '', '#simulation');
  }
  renderSimulationRoomList();
  renderSimulationThread();
  renderSimulationContext();
  syncSimulationInboxClasses();
}

async function refreshSimulationInbox(options = {}) {
  if (currentRoute !== 'simulation') return;
  const activeId = simActiveCustomerId;
  await loadSimulationRooms();

  if (activeId && simRooms.some((room) => Number(room.customer_id) === Number(activeId))) {
    if (options.reloadThread !== false) {
      await loadSimulationThread(activeId, { markRead: false });
    }
  } else if (activeId) {
    simActiveCustomerId = null;
    simThread = { customer: null, messages: [], analysis: null, latest_ticket: null };
    renderSimulationThread();
    renderSimulationContext();
  }

  syncSimulationInboxClasses();
  if (!options.quiet) renderSimulationRoomList();
}

function getSlaRemaining(dueIso) {
  const due = new Date(dueIso).getTime();
  if (!Number.isFinite(due)) {
    return { label: 'SLA tidak tersedia', badgeClass: 'badge-neutral', expired: false };
  }
  const diffMs = due - Date.now();
  if (diffMs <= 0) {
    return { label: 'SLA terlampaui', badgeClass: 'badge-danger', expired: true };
  }
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const timeText = hours > 0
    ? `${hours}j ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}d`
    : `${minutes}m ${String(seconds).padStart(2, '0')}d`;
  return {
    label: `Sisa ${timeText}`,
    badgeClass: diffMs <= 15 * 60000 ? 'badge-warning' : 'badge-info',
    expired: false
  };
}

function updateSimSlaCountdown() {
  const el = document.getElementById('sim-sla-countdown');
  const ticket = simThread.latest_ticket;
  if (!el || !ticket || !ticket.sla_due_at) {
    if (simSlaTicker && !el) {
      clearInterval(simSlaTicker);
      simSlaTicker = null;
    }
    return;
  }
  const sla = getSlaRemaining(ticket.sla_due_at);
  el.className = `badge ${sla.badgeClass}`;
  el.innerText = sla.label;
}

function startSimSlaTicker() {
  if (simSlaTicker) clearInterval(simSlaTicker);
  simSlaTicker = setInterval(updateSimSlaCountdown, 1000);
  updateSimSlaCountdown();
}

async function handleSendAdminReply(event) {
  if (event) event.preventDefault();
  const replyInput = document.getElementById('sim-admin-reply');
  if (!replyInput) return;

  const room = currentSimRoom();
  if (!room) {
    showToast('Pilih ruang chat terlebih dahulu.', 'error');
    return;
  }

  const message = replyInput.value.trim();
  if (!message) {
    showToast('Ketik pesan balasan terlebih dahulu.', 'error');
    replyInput.focus();
    return;
  }

  const button = document.getElementById('sim-reply-button');
  if (button) button.disabled = true;

  try {
    const res = await fetch('/api/simulation/admin/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: room.phone,
        ticket_id: simThread.latest_ticket ? simThread.latest_ticket.id : null,
        message
      })
    });

    const data = await res.json();
    if (!data.success) {
      showToast(data.error || 'Gagal mengirim balasan admin.', 'error');
      return;
    }

    replyInput.value = '';
    await refreshSimulationInbox({ reloadThread: true, quiet: true });
    showToast(`Balasan terkirim ke ${room.name}.`);
    const nextInput = document.getElementById('sim-admin-reply');
    if (nextInput) nextInput.focus();
  } catch (err) {
    showToast('Kendala jaringan saat mengirim balasan.', 'error');
  } finally {
    if (button) button.disabled = false;
  }
}

async function renderSimulation(customerId) {
  const container = document.getElementById('content-area');
  if (!container) return;
  initAdminSSE();

  const token = ++simRenderToken;
  simRoomsLoading = true;

  container.innerHTML = `
    ${UI.pageHeader({
      title: 'Kotak masuk WhatsApp',
      description: 'Percakapan pelanggan Bro Chicken dalam satu kotak masuk admin.',
      actions: `<a class="btn btn-secondary" href="/simulasi" target="_blank" rel="noopener">Buka layar pelanggan</a>`
    })}
    <div class="notice notice-info inbox-notice">
      <strong>Mode simulasi.</strong> Pesan masuk hanya dari halaman publik <code>/simulasi</code>. Tidak ada koneksi ke WhatsApp API asli.
    </div>
    <div class="panel">${UI.loading('Memuat kotak masuk...')}</div>
  `;

  await loadSimulationRooms();
  if (token !== simRenderToken || currentRoute !== 'simulation') return;

  const requestedId = customerId != null ? Number(customerId) : null;
  const available = requestedId != null && simRooms.some((room) => Number(room.customer_id) === requestedId);
  simActiveCustomerId = available ? requestedId : null;
  simThread = { customer: null, messages: [], analysis: null, latest_ticket: null };
  simThreadLoading = false;
  simContextCollapsed = window.innerWidth < 1280;

  container.innerHTML = `
    ${UI.pageHeader({
      title: 'Kotak masuk WhatsApp',
      description: 'Percakapan pelanggan Bro Chicken dalam satu kotak masuk admin.',
      actions: `<a class="btn btn-secondary" href="/simulasi" target="_blank" rel="noopener">Buka layar pelanggan</a>`
    })}

    <div class="notice notice-info inbox-notice">
      <strong>Mode simulasi.</strong> Pesan masuk hanya dari halaman publik <code>/simulasi</code>. Tidak ada koneksi ke WhatsApp API asli.
    </div>

    <div class="inbox" id="sim-inbox">
      <aside class="inbox-list" aria-label="Daftar ruang chat">
        <div class="inbox-list-head">
          <div class="inbox-list-title-row">
            <div>
              <div class="inbox-eyebrow">Kotak masuk</div>
              <div class="inbox-count" id="sim-room-count">Memuat...</div>
            </div>
            <button type="button" class="btn btn-quiet btn-sm" onclick="refreshSimulationInbox({ reloadThread: true })">Muat ulang</button>
          </div>
          <label class="inbox-search">
            <span class="sr-only">Cari ruang chat</span>
            <input type="search" id="sim-room-search" placeholder="Cari nama, nomor, atau kode" value="${escapeHtml(simRoomQuery)}" oninput="handleSimRoomSearch(this.value)">
          </label>
        </div>
        <div class="room-list" id="sim-room-list"></div>
      </aside>

      <section class="inbox-thread" id="sim-thread-panel" aria-label="Percakapan"></section>

      <aside class="inbox-context" id="sim-context-panel" aria-label="Konteks CRM"></aside>
      <div class="inbox-context-scrim" onclick="setSimulationContext(false)"></div>
    </div>
  `;

  renderSimulationRoomList();
  renderSimulationThread();
  renderSimulationContext();
  syncSimulationInboxClasses();

  if (simActiveCustomerId) {
    await loadSimulationThread(simActiveCustomerId);
  }
}

// -------------------------------------------------------------
// MEMBERSHIP
// -------------------------------------------------------------
let membershipSearch = '';
let membershipStatus = '';
let membershipSearchTimer = null;

function membershipBadge(status) {
  if (status === 'ACTIVE') return UI.badge('Aktif', 'success');
  if (status === 'INACTIVE') return UI.badge('Nonaktif', 'neutral');
  return UI.badge(status, 'neutral');
}

function couponBadge(status) {
  if (status === 'ISSUED') return UI.badge('Terbit', 'warning');
  if (status === 'USED') return UI.badge('Dipakai', 'success');
  if (status === 'EXPIRED') return UI.badge('Kedaluwarsa', 'neutral');
  return UI.badge(status, 'neutral');
}

function messageTypeLabel(type) {
  const labels = {
    WELCOME: 'Welcome',
    QR_PROMO: 'Promo QR',
    END_MONTH_COUPON: 'Kupon tanggal tua'
  };
  return labels[type] || type;
}

function renderMembership() {
  const content = document.getElementById('content-area');
  initAdminSSE();

  content.innerHTML = `
    ${UI.pageHeader({
      title: 'Member & promo',
      description: 'Kelola member, QR campaign, kupon tanggal tua, dan outbox pesan simulasi.',
      actions: `
        <a class="btn btn-secondary" href="/daftar-member" target="_blank" rel="noopener">Halaman daftar member</a>
        <button type="button" class="btn btn-primary" onclick="handleRunEndMonthPromo()">Jalankan promo tanggal tua</button>
      `
    })}

    <div class="notice notice-info dashboard-note">
      <strong>Semua pesan bersifat simulasi.</strong> Welcome message, promo QR, dan kupon disimpan di outbox CRM. Tombol Kirim Kupon pada tabel member memaksa satu member menjadi pasif 15 hari lalu menerbitkan kupon.
    </div>

    <div class="metrics" id="membership-stats">
      ${UI.metricItems([
        { label: 'Total member', value: '-' },
        { label: 'Member baru bulan ini', value: '-' },
        { label: 'Pasif lebih dari 14 hari', value: '-' },
        { label: 'Kupon terbit / terpakai', value: '-' }
      ])}
    </div>

    <div class="toolbar">
      <div class="toolbar-group">
        <input type="text" id="membership-search" class="input search-input" placeholder="Cari nama, nomor, atau kode member" oninput="handleMembershipSearch(this.value)" aria-label="Cari member">
        <select class="select control-auto" onchange="handleMembershipStatus(this.value)" aria-label="Filter status member">
          <option value="">Semua status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="INACTIVE">Nonaktif</option>
        </select>
      </div>
      <div class="toolbar-group">
        <button type="button" class="btn btn-secondary" onclick="loadMembershipData()">Muat ulang</button>
      </div>
    </div>

    ${UI.section({
      title: 'Daftar member',
      description: 'Klik detail untuk melihat transaksi, pesan, dan kupon.',
      actions: `<span class="badge badge-neutral" id="membership-count-badge">-</span>`,
      body: `
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama</th>
                <th>WhatsApp</th>
                <th>Status</th>
                <th>Transaksi terakhir</th>
                <th>Tidak aktif</th>
                <th class="cell-actions">Aksi</th>
              </tr>
            </thead>
            <tbody id="membership-tbody">
              ${UI.tableState(7, { title: 'Memuat data member' })}
            </tbody>
          </table>
        </div>
      `
    })}

    <div class="split-even">
      ${UI.section({
        title: 'QR campaign',
        description: 'Unduh QR untuk outlet, kemasan, dan meja dine-in.',
        body: `<div id="membership-campaigns" class="campaign-list">${UI.loading('Memuat campaign...')}</div>`
      })}

      ${UI.section({
        title: 'Kupon tanggal tua',
        description: 'Diskon 10 persen, berlaku 7 hari sejak diterbitkan.',
        body: `
          <div class="table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Member</th>
                  <th>Berlaku sampai</th>
                  <th>Status</th>
                  <th class="cell-actions">Aksi</th>
                </tr>
              </thead>
              <tbody id="membership-coupons">
                ${UI.tableState(5, { title: 'Memuat kupon' })}
              </tbody>
            </table>
          </div>
        `
      })}
    </div>

    ${UI.section({
      title: 'Outbox pesan simulasi',
      description: 'Welcome message, promo QR, dan kupon yang dikirim sistem.',
      actions: UI.badge('Provider: simulasi', 'neutral'),
      body: `
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Tujuan</th>
                <th>Jenis</th>
                <th>Isi pesan</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="membership-messages">
              ${UI.tableState(5, { title: 'Memuat outbox pesan' })}
            </tbody>
          </table>
        </div>
      `
    })}
  `;

  loadMembershipData();
}

function handleMembershipSearch(val) {
  clearTimeout(membershipSearchTimer);
  membershipSearchTimer = setTimeout(() => {
    membershipSearch = val;
    loadMembershipMembers();
  }, 300);
}

function handleMembershipStatus(val) {
  membershipStatus = val;
  loadMembershipMembers();
}

async function loadMembershipData() {
  await Promise.all([
    loadMembershipStats(),
    loadMembershipMembers(),
    loadMembershipCampaigns(),
    loadMembershipCoupons(),
    loadMembershipMessages()
  ]);
}

async function loadMembershipStats() {
  const box = document.getElementById('membership-stats');
  if (!box) return;

  try {
    const res = await fetch('/api/membership/stats');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Gagal memuat statistik.');
    const d = json.data;
    const monthEnd = d.month_end || {};

    box.innerHTML = UI.metricItems([
      {
        label: 'Total member',
        value: d.total_members,
        note: `${d.active_members} member aktif`
      },
      {
        label: 'Member baru bulan ini',
        value: d.new_this_month,
        note: 'Bergabung bulan berjalan'
      },
      {
        label: 'Pasif lebih dari 14 hari',
        value: d.inactive_14,
        tone: d.inactive_14 > 0 ? 'danger' : '',
        note: 'Kandidat kupon tanggal tua'
      },
      {
        label: 'Kupon terbit / terpakai',
        value: `${d.coupons_issued} / ${d.coupons_used}`,
        note: monthEnd.in_window ? 'Window akhir bulan aktif' : 'Window akhir bulan belum aktif'
      }
    ]);
  } catch (err) {
    box.innerHTML = `<div class="state span-full">${escapeHtml(err.message)}</div>`;
  }
}

async function loadMembershipMembers() {
  const tbody = document.getElementById('membership-tbody');
  const countBadge = document.getElementById('membership-count-badge');
  if (!tbody) return;

  const params = new URLSearchParams({
    search: membershipSearch,
    status: membershipStatus,
    limit: '100'
  });

  try {
    const res = await fetch(`/api/membership/members?${params.toString()}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Gagal memuat member.');
    const rows = json.data || [];
    if (countBadge) countBadge.innerText = `${json.pagination ? json.pagination.total : rows.length} member`;

    if (rows.length === 0) {
      tbody.innerHTML = UI.tableState(7, {
        title: 'Belum ada member yang cocok',
        hint: 'Bagikan QR campaign atau buka halaman daftar member untuk menambah member.'
      });
      return;
    }

    tbody.innerHTML = rows.map((m) => `
      <tr>
        <td class="cell-nowrap"><strong>${escapeHtml(m.member_code)}</strong></td>
        <td>${escapeHtml(m.name)}</td>
        <td>+${escapeHtml(m.phone)}</td>
        <td>${membershipBadge(m.status)}</td>
        <td class="cell-nowrap">${m.last_transaction_at ? formatDateIndo(m.last_transaction_at) : '<span class="empty-value">Belum ada</span>'}</td>
        <td>${UI.badge(`${m.inactive_days} hari`, m.inactive_14 ? 'danger' : 'neutral')}</td>
        <td class="cell-actions">
          <div class="row-actions">
            <button type="button" class="btn btn-secondary btn-sm" onclick="openMemberDetail(${m.customer_id})">Detail</button>
            <button type="button" class="btn btn-quiet btn-sm" onclick="openTransactionModal(${m.customer_id})">Catat transaksi</button>
            <button type="button" class="btn btn-quiet btn-sm" onclick="simulateMemberEndMonth(${m.customer_id})">Kirim kupon</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = UI.tableState(7, {
      title: 'Gagal memuat member',
      hint: err.message,
      tone: 'error'
    });
  }
}

async function loadMembershipCampaigns() {
  const box = document.getElementById('membership-campaigns');
  if (!box) return;

  try {
    const res = await fetch('/api/membership/campaigns');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Gagal memuat campaign.');

    box.innerHTML = (json.data || []).map((c) => `
      <div class="campaign">
        <img src="/api/membership/qr/${encodeURIComponent(c.code)}.svg" alt="QR ${escapeHtml(c.label)}" class="campaign-qr">
        <div class="campaign-body">
          <div class="campaign-code">${escapeHtml(c.code)}</div>
          <div class="campaign-label">${escapeHtml(c.label)}</div>
          <div class="campaign-desc">${escapeHtml(c.description)}</div>
          <div class="campaign-actions">
            <a class="btn btn-secondary btn-sm" href="/api/membership/qr/${encodeURIComponent(c.code)}.png" download="${escapeHtml(c.code)}.png">Unduh PNG</a>
            <a class="btn btn-quiet btn-sm" href="/daftar-member?campaign=${encodeURIComponent(c.code)}" target="_blank" rel="noopener">Buka form</a>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    box.innerHTML = UI.state({ title: 'Gagal memuat campaign', hint: err.message, tone: 'error' });
  }
}

async function loadMembershipCoupons() {
  const tbody = document.getElementById('membership-coupons');
  if (!tbody) return;

  try {
    const res = await fetch('/api/membership/coupons?limit=20');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Gagal memuat kupon.');
    const rows = json.data || [];

    if (rows.length === 0) {
      tbody.innerHTML = UI.tableState(5, {
        title: 'Belum ada kupon',
        hint: 'Jalankan promo tanggal tua untuk menerbitkan kupon.'
      });
      return;
    }

    tbody.innerHTML = rows.map((c) => `
      <tr>
        <td class="cell-nowrap"><code>${escapeHtml(c.coupon_code)}</code></td>
        <td>${escapeHtml(c.customer_name)}</td>
        <td class="cell-nowrap">${formatDateIndo(c.expires_at)}</td>
        <td>${couponBadge(c.status)}</td>
        <td class="cell-actions">
          ${c.status === 'ISSUED'
            ? `<button type="button" class="btn btn-primary btn-sm" onclick="redeemMemberCoupon(${c.id})">Tandai dipakai</button>`
            : '<span class="empty-value">-</span>'}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = UI.tableState(5, { title: 'Gagal memuat kupon', hint: err.message, tone: 'error' });
  }
}

async function loadMembershipMessages() {
  const tbody = document.getElementById('membership-messages');
  if (!tbody) return;

  try {
    const res = await fetch('/api/membership/messages?limit=20');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Gagal memuat pesan.');
    const rows = json.data || [];

    if (rows.length === 0) {
      tbody.innerHTML = UI.tableState(5, { title: 'Belum ada pesan simulasi' });
      return;
    }

    tbody.innerHTML = rows.map((m) => `
      <tr>
        <td class="cell-nowrap">${formatDateIndo(m.sent_at || m.created_at)}</td>
        <td>
          <div class="cell-strong">${escapeHtml(m.customer_name)}</div>
          <div class="helper">+${escapeHtml(m.phone)}</div>
        </td>
        <td>${UI.badge(messageTypeLabel(m.message_type), m.message_type === 'END_MONTH_COUPON' ? 'brand' : 'info')}</td>
        <td><div class="outbox-body">${escapeHtml(m.body)}</div></td>
        <td>
          ${UI.badge(m.status, 'success')}
          <div class="helper">${escapeHtml(m.provider)}</div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = UI.tableState(5, { title: 'Gagal memuat pesan', hint: err.message, tone: 'error' });
  }
}

async function openMemberDetail(customerId) {
  UI.openModal({
    title: 'Detail member',
    size: 'lg',
    body: `<div id="member-detail-body">${UI.loading('Memuat detail member...')}</div>`,
    footer: `<div id="member-detail-footer" class="row-actions"></div>`
  });

  try {
    const res = await fetch(`/api/membership/members/${customerId}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Gagal memuat detail.');
    const { membership, transactions, messages, coupons } = json.data;

    const txnRows = transactions.length === 0
      ? UI.tableState(4, { title: 'Belum ada transaksi' })
      : transactions.map((t) => `
          <tr>
            <td class="cell-nowrap">${formatDateIndo(t.occurred_at)}</td>
            <td>${UI.badge(t.channel, 'neutral')}</td>
            <td>${escapeHtml(t.notes || '-')}</td>
            <td class="cell-nowrap">${formatDateIndo(t.created_at)}</td>
          </tr>
        `).join('');

    const couponRows = coupons.length === 0
      ? UI.tableState(4, { title: 'Belum ada kupon' })
      : coupons.map((c) => `
          <tr>
            <td class="cell-nowrap"><code>${escapeHtml(c.coupon_code)}</code></td>
            <td>${escapeHtml(c.campaign_id)}</td>
            <td class="cell-nowrap">${formatDateIndo(c.expires_at)}</td>
            <td>
              ${couponBadge(c.status)}
              ${c.status === 'ISSUED' ? `<button type="button" class="btn btn-quiet btn-sm" onclick="redeemMemberCoupon(${c.id}, ${customerId})">Pakai</button>` : ''}
            </td>
          </tr>
        `).join('');

    const messageRows = messages.length === 0
      ? UI.tableState(3, { title: 'Belum ada pesan' })
      : messages.map((m) => `
          <tr>
            <td class="cell-nowrap">${formatDateIndo(m.sent_at || m.created_at)}</td>
            <td>${UI.badge(messageTypeLabel(m.message_type), 'info')}</td>
            <td><div class="outbox-body">${escapeHtml(m.body)}</div></td>
          </tr>
        `).join('');

    const body = document.getElementById('member-detail-body');
    if (body) {
      body.innerHTML = `
        <div class="record-header pt-0">
          <div class="record-identity">
            <span class="avatar">${escapeHtml(initialsOf(membership.name))}</span>
            <div>
              <div class="record-title">${escapeHtml(membership.name)} ${membershipBadge(membership.status)}</div>
              <div class="record-meta">
                <span>${escapeHtml(membership.member_code)}</span>
                <span>+${escapeHtml(membership.phone)}</span>
                <span>Bergabung ${formatDateIndo(membership.joined_at)}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="meta-grid meta-grid-3 member-summary">
          <div>
            <span class="meta-label">Status</span>
            <div class="meta-value">${membershipBadge(membership.status)}</div>
          </div>
          <div>
            <span class="meta-label">Terdaftar via</span>
            <div class="meta-value">${UI.badge(membership.registered_via, 'neutral')}</div>
          </div>
          <div>
            <span class="meta-label">Transaksi terakhir</span>
            <div class="meta-value">${membership.last_transaction_at ? formatDateIndo(membership.last_transaction_at) : 'Belum ada'}</div>
          </div>
        </div>

        ${UI.section({
          title: 'Riwayat transaksi manual',
          actions: `<button type="button" class="btn btn-primary btn-sm" onclick="openTransactionModal(${customerId})">Catat transaksi</button>`,
          body: `
            <div class="table-wrap">
              <table class="data">
                <thead><tr><th>Tanggal</th><th>Kanal</th><th>Catatan</th><th>Dicatat</th></tr></thead>
                <tbody>${txnRows}</tbody>
              </table>
            </div>
          `
        })}

        ${UI.section({
          title: 'Kupon',
          body: `
            <div class="table-wrap">
              <table class="data">
                <thead><tr><th>Kode</th><th>Campaign</th><th>Berlaku sampai</th><th>Status</th></tr></thead>
                <tbody>${couponRows}</tbody>
              </table>
            </div>
          `
        })}

        ${UI.section({
          title: 'Pesan simulasi',
          body: `
            <div class="table-wrap">
              <table class="data">
                <thead><tr><th>Waktu</th><th>Jenis</th><th>Isi</th></tr></thead>
                <tbody>${messageRows}</tbody>
              </table>
            </div>
          `
        })}
      `;
    }

    const footer = document.getElementById('member-detail-footer');
    if (footer) {
      footer.innerHTML = `
        <a class="btn btn-secondary" href="/simulasi?phone=${encodeURIComponent(membership.phone)}&name=${encodeURIComponent(membership.name)}" target="_blank" rel="noopener">Buka WhatsApp simulasi</a>
        <button type="button" class="btn btn-secondary" onclick="simulateMemberEndMonth(${customerId}, true)">Simulasi tanggal tua</button>
        <button type="button" class="btn btn-primary" onclick="closeModal()">Tutup</button>
      `;
    }
  } catch (err) {
    const body = document.getElementById('member-detail-body');
    if (body) body.innerHTML = UI.state({ title: 'Gagal memuat detail member', hint: err.message, tone: 'error' });
  }
}

async function openTransactionModal(customerId) {
  let customerName = 'Member';
  try {
    const res = await fetch(`/api/membership/members/${customerId}`);
    const json = await res.json();
    if (json.success && json.data && json.data.membership) {
      customerName = json.data.membership.name;
    }
  } catch (err) {}

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const defaultDate = `${yyyy}-${mm}-${dd}`;

  UI.openModal({
    title: 'Catat transaksi member',
    subtitle: 'Pencatatan manual tanggal aktivitas. Tidak ada pembayaran atau stok.',
    body: `
      <form id="transaction-form" onsubmit="handleTransactionSubmit(event, ${customerId})">
        <div class="field">
          <label class="label" for="txn-member">Member</label>
          <input type="text" id="txn-member" class="input" value="${escapeHtml(customerName)}" disabled>
        </div>
        <div class="field">
          <label class="label" for="txn-date">Tanggal transaksi</label>
          <input type="date" id="txn-date" class="input" value="${defaultDate}" max="${defaultDate}" required>
        </div>
        <div class="field">
          <label class="label" for="txn-channel">Kanal</label>
          <select id="txn-channel" class="select">
            <option value="DIRECT">Langsung (outlet)</option>
            <option value="GOFOOD">GoFood</option>
            <option value="GRABFOOD">GrabFood</option>
            <option value="OTHER">Lainnya</option>
          </select>
        </div>
        <div class="field">
          <label class="label" for="txn-notes">Catatan</label>
          <textarea id="txn-notes" class="textarea" placeholder="Contoh: Beli paket hemat berdua di outlet Margonda."></textarea>
        </div>
      </form>
    `,
    footer: `
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
      <button type="submit" class="btn btn-primary" form="transaction-form">Simpan transaksi</button>
    `
  });
}

async function handleTransactionSubmit(event, customerId) {
  event.preventDefault();
  const date = document.getElementById('txn-date').value;
  const channel = document.getElementById('txn-channel').value;
  const notes = document.getElementById('txn-notes').value;

  if (!date) {
    showToast('Tanggal transaksi wajib diisi.', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/membership/members/${customerId}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        occurred_at: new Date(`${date}T00:00:00`).toISOString(),
        channel,
        notes
      })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Gagal menyimpan transaksi.');
    showToast(json.message);
    closeModal();
    if (currentRoute === 'membership') loadMembershipData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function redeemMemberCoupon(couponId, reopenCustomerId = null) {
  try {
    const res = await fetch(`/api/membership/coupons/${couponId}/redeem`, { method: 'POST' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Gagal memakai kupon.');
    showToast(json.message);
    if (currentRoute === 'membership') loadMembershipData();
    if (reopenCustomerId) openMemberDetail(reopenCustomerId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function simulateMemberEndMonth(customerId, reopenDetail = false) {
  const confirmed = await UI.confirm({
    title: 'Kirim kupon tanggal tua',
    message: 'Simulasikan tanggal tua untuk member ini?',
    confirmLabel: 'Kirim kupon',
    note: 'Sistem mengubah transaksi terakhir menjadi 15 hari lalu, menerbitkan kupon 10 persen, dan mengirim pesan simulasi.'
  });
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/membership/members/${customerId}/simulate-end-month`, { method: 'POST' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Gagal mengirim kupon.');
    showToast(json.message);
    loadMembershipData();
    if (reopenDetail) openMemberDetail(customerId);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleRunEndMonthPromo() {
  const confirmed = await UI.confirm({
    title: 'Jalankan promo tanggal tua',
    message: 'Terbitkan kupon untuk seluruh member yang memenuhi syarat sekarang?',
    confirmLabel: 'Jalankan promo',
    note: 'Mode demo memaksa penerbitan kupon meskipun di luar 3 hari terakhir bulan.'
  });
  if (!confirmed) return;

  try {
    const res = await fetch('/api/membership/campaigns/end-month/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: true })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Gagal menjalankan promo.');
    showToast(json.message);
    loadMembershipData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// -------------------------------------------------------------
// APP INIT
// -------------------------------------------------------------
async function initApp() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        currentUser = data.user;
        renderShell();
        renderRouteFromHash();
        return;
      }
    }
  } catch (err) {}

  renderLogin();
}

window.addEventListener('DOMContentLoaded', initApp);
