// Bro Chicken CRM - Frontend Application (Antislop-UI Compliant)
let currentUser = null;
let currentRoute = 'dashboard';
let currentSubId = null;

// Helper: Toast Notification
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast-error' : 'toast-success'}`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// Helper: Format Date Indonesia (Asia/Jakarta representation)
function formatDateIndo(isoStr) {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return isoStr;
  }
}

// Helper: Escape HTML agar teks dari pelanggan/admin tidak dieksekusi sebagai markup (cegah XSS)
function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Helper: Close Modal
function closeModal() {
  const container = document.getElementById('modal-container');
  container.innerHTML = '';
}

// Fixed Business Category & Status Labels
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

// Application Shell
function renderShell() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar-header">
        <img src="/images/logo.png" alt="Bro Chicken Logo" class="sidebar-logo">
        <div class="sidebar-title">
          <h1>Bro Chicken</h1>
          <p>Operasional CRM</p>
        </div>
      </div>

      <nav class="sidebar-nav">
        <a href="#dashboard" class="${currentRoute === 'dashboard' ? 'active' : ''}" onclick="navigate('dashboard')">
          <span>Beranda Operasional</span>
        </a>
        <a href="#customers" class="${currentRoute === 'customers' || currentRoute === 'customer-detail' ? 'active' : ''}" onclick="navigate('customers')">
          <span>Daftar Pelanggan</span>
        </a>
        <a href="#complaints" class="${currentRoute === 'complaints' || currentRoute === 'complaint-detail' ? 'active' : ''}" onclick="navigate('complaints')">
          <span>Keluhan & Tiket</span>
        </a>
        <a href="#whatsapp" class="${currentRoute === 'whatsapp' ? 'active' : ''}" onclick="navigate('whatsapp')">
          <span>Template WhatsApp</span>
        </a>
        <a href="#simulation" class="${currentRoute === 'simulation' ? 'active' : ''}" onclick="navigate('simulation')">
          <span>Simulasi WA (AI)</span>
          <span class="badge badge-warning" style="font-size: 10px; padding: 2px 6px; margin-left: auto;">AI Demo</span>
        </a>
        <a href="#membership" class="${currentRoute === 'membership' ? 'active' : ''}" onclick="navigate('membership')">
          <span>Member &amp; Promo</span>
          <span class="badge badge-success" style="font-size: 10px; padding: 2px 6px; margin-left: auto;">Baru</span>
        </a>
        <a href="#reports" class="${currentRoute === 'reports' ? 'active' : ''}" onclick="navigate('reports')">
          <span>Laporan & SLA</span>
        </a>
        ${currentUser.role === 'OWNER' ? `
          <a href="#admin" class="${currentRoute === 'admin' ? 'active' : ''}" onclick="navigate('admin')">
            <span>Kelola Akun Admin</span>
          </a>
          <a href="#settings" class="${currentRoute === 'settings' ? 'active' : ''}" onclick="navigate('settings')">
            <span>Pengaturan Sistem</span>
          </a>
        ` : ''}
      </nav>

      <div class="sidebar-user">
        <div class="user-meta">
          <span class="user-name">${currentUser.name}</span>
          <span class="user-role">${currentUser.role === 'OWNER' ? 'Pemilik (Owner)' : 'Staf Admin'}</span>
        </div>
        <button class="btn-logout" onclick="handleLogout()">Keluar</button>
      </div>
    </aside>

    <div class="main-wrapper">
      <header class="topbar">
        <div class="topbar-title" id="page-title">Bro Chicken CRM</div>
        <div class="topbar-actions" id="topbar-actions">
          <span class="badge badge-neutral" style="font-weight: 500;">
            Cabang Margonda &bull; ${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </header>

      <main class="content-body" id="content-area">
        <!-- Render View Konten -->
      </main>
    </div>
  `;
}

// Router Navigation
function navigate(route, id = null) {
  currentRoute = route;
  currentSubId = id;

  const links = document.querySelectorAll('.sidebar-nav a');
  links.forEach(l => l.classList.remove('active'));

  if (route === 'dashboard') {
    document.getElementById('page-title').innerText = 'Ringkasan Operasional CRM';
    renderDashboard();
  } else if (route === 'customers') {
    document.getElementById('page-title').innerText = 'Basis Data Pelanggan';
    renderCustomers();
  } else if (route === 'customer-detail') {
    document.getElementById('page-title').innerText = 'Detail Profil Pelanggan';
    renderCustomerDetail(id);
  } else if (route === 'complaints') {
    document.getElementById('page-title').innerText = 'Daftar Tiket & Keluhan Pelanggan';
    renderComplaints();
  } else if (route === 'complaint-detail') {
    document.getElementById('page-title').innerText = 'Detail & Tindak Lanjut Tiket';
    renderComplaintDetail(id);
  } else if (route === 'whatsapp') {
    document.getElementById('page-title').innerText = 'Studio Pesan WhatsApp';
    renderWhatsApp();
  } else if (route === 'simulation') {
    document.getElementById('page-title').innerText = 'Simulasi WhatsApp & AI Triage (Human-in-the-Loop)';
    renderSimulation();
  } else if (route === 'membership') {
    document.getElementById('page-title').innerText = 'Membership, QR Promo & Kupon Tanggal Tua';
    renderMembership();
  } else if (route === 'reports') {
    document.getElementById('page-title').innerText = 'Laporan Kinerja & Kepatuhan SLA';
    renderReports();
  } else if (route === 'admin') {
    document.getElementById('page-title').innerText = 'Manajemen Akun Staf Admin';
    renderAdmin();
  } else if (route === 'settings') {
    document.getElementById('page-title').innerText = 'Pengaturan Sistem & Database';
    renderSettings();
  }
}

// -------------------------------------------------------------
// 1. LOGIN VIEW
// -------------------------------------------------------------
function renderLogin() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="login-screen">
      <div class="login-card">
        <div class="login-header">
          <img src="/images/logo.png" alt="Bro Chicken Logo" class="login-logo">
          <h1>Bro Chicken CRM</h1>
          <p>Sistem Layanan Pelanggan & Penanganan Keluhan</p>
        </div>

        <form id="login-form" onsubmit="handleLoginSubmit(event)">
          <div class="form-group">
            <label class="form-label">Username</label>
            <input type="text" id="login-username" class="form-control" placeholder="Contoh: haji_rahmat atau budi_santoso" required>
          </div>
          <div class="form-group">
            <label class="form-label">Kata Sandi</label>
            <input type="password" id="login-password" class="form-control" placeholder="Masukkan kata sandi" required>
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%; padding: 10px; margin-top: 8px;">
            Masuk ke Sistem
          </button>
        </form>

        <div style="margin-top: 24px; padding: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; font-size: 11px; color: #64748B;">
          <strong>Kredensial Akun Pengujian:</strong><br>
          &bull; <strong>Owner:</strong> <code>owner</code> &bull; Sandi: <code>12345678</code><br>
          &bull; <strong>Admin:</strong> <code>admin</code> &bull; Sandi: <code>12345678</code>
        </div>
      </div>
    </div>
  `;
}

async function handleLoginSubmit(e) {
  e.preventDefault();
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
      navigate('dashboard');
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
// 2. DASHBOARD VIEW
// -------------------------------------------------------------
async function renderDashboard() {
  const content = document.getElementById('content-area');
  content.innerHTML = '<div class="empty-state">Memuat ringkasan data operasional...</div>';

  try {
    const res = await fetch('/api/dashboard?period=this_month');
    const json = await res.json();
    const d = json.data;

    content.innerHTML = `
      <div class="toolbar" style="margin-bottom: 20px;">
        <div class="toolbar-left">
          <label style="font-size: 13px; font-weight: 600; color: #334155;">Periode Filter:</label>
          <select class="form-control" style="width: 180px;" onchange="loadDashboardPeriod(this.value)">
            <option value="this_month" selected>Bulan Ini</option>
            <option value="today">Hari Ini</option>
            <option value="7days">7 Hari Terakhir</option>
            <option value="30days">30 Hari Terakhir</option>
          </select>
        </div>
        <div class="toolbar-right">
          <button class="btn btn-secondary btn-sm" onclick="openAddCustomerModal()">+ Tambah Pelanggan</button>
          <button class="btn btn-primary btn-sm" onclick="openCreateTicketModal()">+ Catat Keluhan</button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-card-title">Total Pelanggan Aktif</div>
          <div class="stat-card-value">${d.total_active_customers}</div>
          <div class="stat-card-sub">Terdaftar dalam database</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-title">Pelanggan Baru (Periode Ini)</div>
          <div class="stat-card-value" style="color: var(--primary);">${d.new_customers_in_period}</div>
          <div class="stat-card-sub">Bergabung bulan ini</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-title">Tiket Keluhan Aktif</div>
          <div class="stat-card-value">${d.tickets.new + d.tickets.in_progress}</div>
          <div class="stat-card-sub">${d.tickets.new} Baru &bull; ${d.tickets.in_progress} Diproses</div>
        </div>
        <div class="stat-card ${d.tickets.overdue > 0 ? 'stat-card-danger' : ''}">
          <div class="stat-card-title">Lewat Batas Respons SLA</div>
          <div class="stat-card-value">${d.tickets.overdue}</div>
          <div class="stat-card-sub">${d.tickets.overdue > 0 ? 'Memerlukan respons segera' : 'Seluruh tiket dalam batas waktu'}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h2>5 Keluhan Terbaru</h2>
            <p>Keluhan pelanggan terkini dan status batas waktu respons</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="navigate('complaints')">Lihat Semua Tiket</button>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>ID Tiket</th>
                <th>Nama Pelanggan</th>
                <th>Kategori</th>
                <th>Prioritas</th>
                <th>Status</th>
                <th>PIC Admin</th>
                <th>Batas Waktu Respons</th>
                <th style="text-align: right;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${d.recent_tickets.length > 0 ? d.recent_tickets.map(t => `
                <tr>
                  <td><strong>${t.ticket_code}</strong></td>
                  <td>${t.customer_name}</td>
                  <td>${categoryLabels[t.category] || t.category}</td>
                  <td>
                    <span class="badge ${t.priority === 'HIGH' ? 'badge-danger' : (t.priority === 'MEDIUM' ? 'badge-warning' : 'badge-neutral')}">
                      ${priorityLabels[t.priority] || t.priority}
                    </span>
                  </td>
                  <td>
                    <span class="badge ${t.status === 'NEW' ? 'badge-info' : (t.status === 'IN_PROGRESS' ? 'badge-warning' : 'badge-success')}">
                      ${statusLabels[t.status] || t.status}
                    </span>
                  </td>
                  <td>${t.assigned_to_name || '-'}</td>
                  <td>
                    <span class="badge ${t.sla_class}">${t.sla_label}</span>
                  </td>
                  <td style="text-align: right;">
                    <button class="btn btn-secondary btn-sm" onclick="navigate('complaint-detail', ${t.id})">Tindak Lanjut</button>
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="8">
                    <div class="empty-state">
                      Tidak ada keluhan yang tercatat pada periode ini.
                      <div class="empty-state-sub">Semua layanan pelanggan berjalan normal.</div>
                    </div>
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    content.innerHTML = '<div class="empty-state" style="color: #B91C1C;">Gagal memuat ringkasan data dashboard.</div>';
  }
}

async function loadDashboardPeriod(period) {
  renderDashboard();
}

// -------------------------------------------------------------
// 3. CUSTOMERS VIEW
// -------------------------------------------------------------
let customerSearchParams = { search: '', source: '', status: 'ACTIVE', page: 1 };

async function renderCustomers() {
  const content = document.getElementById('content-area');
  content.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-left">
        <input type="text" id="cust-search" class="form-control search-input" placeholder="Cari nama, nomor WA, ID..." value="${customerSearchParams.search}" oninput="handleCustomerSearch(this.value)">
        <select class="form-control" style="width: 150px;" onchange="handleCustomerSourceFilter(this.value)">
          <option value="">Semua Sumber</option>
          <option value="DIRECT" ${customerSearchParams.source === 'DIRECT' ? 'selected' : ''}>Langsung</option>
          <option value="GOFOOD" ${customerSearchParams.source === 'GOFOOD' ? 'selected' : ''}>GoFood</option>
          <option value="GRABFOOD" ${customerSearchParams.source === 'GRABFOOD' ? 'selected' : ''}>GrabFood</option>
          <option value="OTHER" ${customerSearchParams.source === 'OTHER' ? 'selected' : ''}>Lainnya</option>
        </select>
        <select class="form-control" style="width: 150px;" onchange="handleCustomerStatusFilter(this.value)">
          <option value="ACTIVE" ${customerSearchParams.status === 'ACTIVE' ? 'selected' : ''}>Status: Aktif</option>
          <option value="ARCHIVED" ${customerSearchParams.status === 'ARCHIVED' ? 'selected' : ''}>Status: Diarsipkan</option>
          <option value="" ${customerSearchParams.status === '' ? 'selected' : ''}>Semua Status</option>
        </select>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-primary" onclick="openAddCustomerModal()">+ Tambah Pelanggan</button>
      </div>
    </div>

    <div class="card" style="padding: 0; overflow: hidden;">
      <div class="table-container" style="border: none;">
        <table id="customer-table">
          <thead>
            <tr>
              <th>ID Pelanggan</th>
              <th>Nama Lengkap</th>
              <th>Nomor WhatsApp</th>
              <th>Sumber</th>
              <th>Terdaftar</th>
              <th>Status</th>
              <th style="text-align: right;">Aksi</th>
            </tr>
          </thead>
          <tbody id="customer-tbody">
            <tr><td colspan="7"><div class="empty-state">Memuat data pelanggan...</div></td></tr>
          </tbody>
        </table>
      </div>
      <div style="padding: 12px 20px; background: #F8FAFC; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center;" id="customer-pagination">
        <!-- Paginasi -->
      </div>
    </div>
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

  const q = new URLSearchParams(customerSearchParams).toString();
  try {
    const res = await fetch(`/api/customers?${q}`);
    const json = await res.json();
    const customers = json.data;
    const pag = json.pagination;

    if (!customers || customers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              Tidak ada data pelanggan yang sesuai dengan kriteria pencarian.
              <div class="empty-state-sub">Ubah kata kunci pencarian atau sesuaikan filter sumber dan status.</div>
            </div>
          </td>
        </tr>
      `;
      paginationDiv.innerHTML = '';
      return;
    }

    tbody.innerHTML = customers.map(c => `
      <tr>
        <td><strong>${c.customer_code}</strong></td>
        <td>
          <a href="#customer-detail" onclick="navigate('customer-detail', ${c.id})" style="color: var(--text-main); font-weight: 600; text-decoration: none;">
            ${c.name}
          </a>
        </td>
        <td>
          <a href="https://wa.me/${c.phone}" target="_blank" style="color: #15803D; text-decoration: none; font-weight: 500;">
            +${c.phone}
          </a>
        </td>
        <td>
          <span class="badge badge-neutral">${c.source}</span>
        </td>
        <td>${formatDateIndo(c.joined_at)}</td>
        <td>
          <span class="badge ${c.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'}">
            ${c.status === 'ACTIVE' ? 'Aktif' : 'Diarsipkan'}
          </span>
        </td>
        <td style="text-align: right;">
          <button class="btn btn-secondary btn-sm" onclick="navigate('customer-detail', ${c.id})">Detail</button>
          <button class="btn btn-secondary btn-sm" onclick="openEditCustomerModal(${c.id})">Ubah</button>
          ${c.status === 'ACTIVE'
            ? `<button class="btn btn-secondary btn-sm" style="color: #B91C1C;" onclick="openArchiveModal(${c.id}, '${c.name.replace(/'/g, "\\'")}')">Arsipkan</button>`
            : `<button class="btn btn-secondary btn-sm" style="color: #15803D;" onclick="handleActivateCustomer(${c.id})">Aktifkan</button>`
          }
        </td>
      </tr>
    `).join('');

    paginationDiv.innerHTML = `
      <span style="font-size: 12px; color: #64748B;">Menampilkan ${(pag.page - 1) * pag.limit + 1} - ${Math.min(pag.page * pag.limit, pag.total)} dari ${pag.total} pelanggan</span>
      <div style="display: flex; gap: 6px;">
        <button class="btn btn-secondary btn-sm" ${pag.page <= 1 ? 'disabled' : ''} onclick="changeCustomerPage(${pag.page - 1})">Sebelumnya</button>
        <button class="btn btn-secondary btn-sm" ${pag.page >= pag.totalPages ? 'disabled' : ''} onclick="changeCustomerPage(${pag.page + 1})">Selanjutnya</button>
      </div>
    `;
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state" style="color: #B91C1C;">Gagal memuat data pelanggan.</div></td></tr>';
  }
}

function changeCustomerPage(p) {
  customerSearchParams.page = p;
  loadCustomersData();
}

// Modal: Tambah Pelanggan
function openAddCustomerModal() {
  const container = document.getElementById('modal-container');
  container.innerHTML = `
    <div class="modal-scrim" onclick="if(event.target === this) closeModal()">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Tambah Pelanggan Baru</h3>
          <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <form onsubmit="handleAddCustomerSubmit(event)">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Nama Lengkap *</label>
              <input type="text" id="add-cust-name" class="form-control" placeholder="Contoh: Hendra Kusuma" required>
            </div>
            <div class="form-group">
              <label class="form-label">Nomor WhatsApp *</label>
              <input type="text" id="add-cust-phone" class="form-control" placeholder="Contoh: 08123456789 atau 628123456789" required>
              <div class="form-helper">Format dinormalisasi otomatis menjadi awalan 62 (contoh: 628123456789).</div>
            </div>
            <div class="form-group">
              <label class="form-label">Sumber Pemesanan *</label>
              <select id="add-cust-source" class="form-control" required>
                <option value="DIRECT">Langsung (Outlet)</option>
                <option value="GOFOOD">GoFood</option>
                <option value="GRABFOOD">GrabFood</option>
                <option value="OTHER">Lainnya</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Catatan Preferensi</label>
              <textarea id="add-cust-notes" class="form-control" placeholder="Catatan preferensi atau menu favorit pelanggan..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
            <button type="submit" class="btn btn-primary">Simpan Pelanggan</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

async function handleAddCustomerSubmit(e) {
  e.preventDefault();
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

// Modal: Ubah Data Pelanggan
async function openEditCustomerModal(id) {
  try {
    const res = await fetch(`/api/customers/${id}`);
    const data = await res.json();
    const c = data.customer;

    const container = document.getElementById('modal-container');
    container.innerHTML = `
      <div class="modal-scrim" onclick="if(event.target === this) closeModal()">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Ubah Data Pelanggan (${c.customer_code})</h3>
            <button class="modal-close" onclick="closeModal()">&times;</button>
          </div>
          <form onsubmit="handleEditCustomerSubmit(event, ${c.id})">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Nama Lengkap *</label>
                <input type="text" id="edit-cust-name" class="form-control" value="${c.name}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Nomor WhatsApp *</label>
                <input type="text" id="edit-cust-phone" class="form-control" value="${c.phone}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Sumber Pemesanan *</label>
                <select id="edit-cust-source" class="form-control" required>
                  <option value="DIRECT" ${c.source === 'DIRECT' ? 'selected' : ''}>Langsung (Outlet)</option>
                  <option value="GOFOOD" ${c.source === 'GOFOOD' ? 'selected' : ''}>GoFood</option>
                  <option value="GRABFOOD" ${c.source === 'GRABFOOD' ? 'selected' : ''}>GrabFood</option>
                  <option value="OTHER" ${c.source === 'OTHER' ? 'selected' : ''}>Lainnya</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Catatan Preferensi</label>
                <textarea id="edit-cust-notes" class="form-control">${c.notes || ''}</textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
              <button type="submit" class="btn btn-primary">Perbarui Data</button>
            </div>
          </form>
        </div>
      </div>
    `;
  } catch (err) {
    showToast('Gagal mengambil data pelanggan.', 'error');
  }
}

async function handleEditCustomerSubmit(e, id) {
  e.preventDefault();
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

// Modal: Konfirmasi Arsipkan Pelanggan
function openArchiveModal(id, name) {
  const container = document.getElementById('modal-container');
  container.innerHTML = `
    <div class="modal-scrim" onclick="if(event.target === this) closeModal()">
      <div class="modal-content" style="max-width: 440px;">
        <div class="modal-header">
          <h3>Konfirmasi Pengarsipan</h3>
          <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
          <p style="font-size: 13px; color: #334155; margin-bottom: 12px;">
            Apakah Anda yakin ingin menonaktifkan pelanggan <strong>${name}</strong>?
          </p>
          <div style="background: #FFFBEB; border: 1px solid #FDE68A; padding: 12px; border-radius: 6px; font-size: 12px; color: #92400E;">
            <strong>Ketentuan Integritas Data:</strong> Data pelanggan tidak dihapus permanen. Seluruh tiket keluhan tetap tersimpan dan dapat diaktifkan kembali sewaktu-waktu.
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
          <button type="button" class="btn btn-danger" onclick="confirmArchiveCustomer(${id})">Ya, Arsipkan</button>
        </div>
      </div>
    </div>
  `;
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
// 4. CUSTOMER DETAIL VIEW
// -------------------------------------------------------------
async function renderCustomerDetail(id) {
  const content = document.getElementById('content-area');
  content.innerHTML = '<div class="empty-state">Memuat profil pelanggan...</div>';

  try {
    const res = await fetch(`/api/customers/${id}`);
    const data = await res.json();
    const c = data.customer;
    const complaints = data.complaints;

    let memberInfo = null;
    try {
      const memberRes = await fetch(`/api/membership/members/${id}`);
      if (memberRes.ok) {
        const memberJson = await memberRes.json();
        if (memberJson.success) memberInfo = memberJson.data.membership;
      }
    } catch (e) {}

    const initials = c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    content.innerHTML = `
      <div style="margin-bottom: 16px;">
        <button class="btn btn-secondary btn-sm" onclick="navigate('customers')">Kembali ke Daftar Pelanggan</button>
      </div>

      <div class="card" style="margin-bottom: 24px;">
        <div style="display: flex; gap: 20px; align-items: flex-start; justify-content: space-between;">
          <div style="display: flex; gap: 16px; align-items: center;">
            <div style="width: 52px; height: 52px; border-radius: var(--radius-md); background: #FFEDD5; color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700;">
              ${initials}
            </div>
            <div>
              <h2 style="font-size: 18px; font-weight: 700; color: #0F172A; margin-bottom: 4px;">
                ${c.name}
                <span class="badge ${c.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'}" style="margin-left: 8px;">
                  ${c.status === 'ACTIVE' ? 'Aktif' : 'Diarsipkan'}
                </span>
                ${memberInfo ? `<span class="badge badge-gold" style="margin-left: 6px;">Member ${escapeHtml(memberInfo.member_code)}</span>` : ''}
              </h2>
              <div style="font-size: 13px; color: #64748B;">
                Kode: <strong>${c.customer_code}</strong> &bull; Terdaftar sejak ${formatDateIndo(c.joined_at)} &bull; Sumber: <span class="badge badge-neutral">${c.source}</span>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 10px;">
            <a href="https://wa.me/${c.phone}" target="_blank" class="btn btn-success btn-sm">
              Kirim Pesan WhatsApp (+${c.phone})
            </a>
            <button class="btn btn-secondary btn-sm" onclick="openEditCustomerModal(${c.id})">Ubah Profil</button>
            ${memberInfo ? `<button class="btn btn-primary btn-sm" onclick="openMemberDetail(${c.id})">Detail Member</button>` : ''}
            ${c.status === 'ACTIVE'
              ? `<button class="btn btn-secondary btn-sm" style="color: #B91C1C;" onclick="openArchiveModal(${c.id}, '${c.name.replace(/'/g, "\\'")}')">Arsipkan</button>`
              : `<button class="btn btn-secondary btn-sm" style="color: #15803D;" onclick="handleActivateCustomer(${c.id})">Aktifkan Kembali</button>`
            }
          </div>
        </div>

        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #E2E8F0;">
          <h4 style="font-size: 12px; font-weight: 600; color: #64748B; margin-bottom: 6px;">Catatan Preferensi Pelanggan</h4>
          <p style="font-size: 13px; color: #334155; background: #F8FAFC; padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid #E2E8F0;">
            ${c.notes || 'Tidak ada catatan preferensi khusus.'}
          </p>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h2>Riwayat Tiket Keluhan</h2>
            <p>Seluruh tiket keluhan yang tercatat atas nama pelanggan ini</p>
          </div>
          ${c.status === 'ACTIVE' ? `<button class="btn btn-primary btn-sm" onclick="openCreateTicketModal(${c.id})">+ Catat Keluhan Baru</button>` : ''}
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>ID Tiket</th>
                <th>Kategori</th>
                <th>Prioritas</th>
                <th>Deskripsi Keluhan</th>
                <th>Status</th>
                <th>PIC Admin</th>
                <th>Waktu Dibuat</th>
                <th style="text-align: right;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${complaints && complaints.length > 0 ? complaints.map(t => `
                <tr>
                  <td><strong>${t.ticket_code}</strong></td>
                  <td>${categoryLabels[t.category] || t.category}</td>
                  <td>
                    <span class="badge ${t.priority === 'HIGH' ? 'badge-danger' : (t.priority === 'MEDIUM' ? 'badge-warning' : 'badge-neutral')}">
                      ${priorityLabels[t.priority] || t.priority}
                    </span>
                  </td>
                  <td style="max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${t.description}</td>
                  <td>
                    <span class="badge ${t.status === 'NEW' ? 'badge-info' : (t.status === 'IN_PROGRESS' ? 'badge-warning' : 'badge-success')}">
                      ${statusLabels[t.status] || t.status}
                    </span>
                  </td>
                  <td>${t.assigned_to_name || '-'}</td>
                  <td>${formatDateIndo(t.created_at)}</td>
                  <td style="text-align: right;">
                    <button class="btn btn-secondary btn-sm" onclick="navigate('complaint-detail', ${t.id})">Lihat Detail</button>
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="8">
                    <div class="empty-state">
                      Pelanggan ini belum pernah memiliki keluhan.
                      <div class="empty-state-sub">Semua pesanan sebelumnya tercatat berjalan lancar.</div>
                    </div>
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    content.innerHTML = '<div class="empty-state" style="color: #B91C1C;">Gagal memuat profil pelanggan.</div>';
  }
}

// -------------------------------------------------------------
// 5. COMPLAINTS VIEW
// -------------------------------------------------------------
let complaintSearchParams = { search: '', status: '', priority: '', category: '', page: 1 };

async function renderComplaints() {
  const content = document.getElementById('content-area');
  content.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-left">
        <input type="text" class="form-control search-input" placeholder="Cari ID tiket, nama pelanggan..." value="${complaintSearchParams.search}" oninput="handleComplaintSearch(this.value)">
        <select class="form-control" style="width: 140px;" onchange="handleComplaintStatusFilter(this.value)">
          <option value="">Semua Status</option>
          <option value="NEW" ${complaintSearchParams.status === 'NEW' ? 'selected' : ''}>Baru</option>
          <option value="IN_PROGRESS" ${complaintSearchParams.status === 'IN_PROGRESS' ? 'selected' : ''}>Diproses</option>
          <option value="RESOLVED" ${complaintSearchParams.status === 'RESOLVED' ? 'selected' : ''}>Selesai</option>
        </select>
        <select class="form-control" style="width: 140px;" onchange="handleComplaintPriorityFilter(this.value)">
          <option value="">Semua Prioritas</option>
          <option value="HIGH" ${complaintSearchParams.priority === 'HIGH' ? 'selected' : ''}>Tinggi</option>
          <option value="MEDIUM" ${complaintSearchParams.priority === 'MEDIUM' ? 'selected' : ''}>Sedang</option>
          <option value="LOW" ${complaintSearchParams.priority === 'LOW' ? 'selected' : ''}>Rendah</option>
        </select>
        <select class="form-control" style="width: 180px;" onchange="handleComplaintCategoryFilter(this.value)">
          <option value="">Semua Kategori</option>
          <option value="FOOD_QUALITY">Kualitas Makanan</option>
          <option value="WRONG_ORDER">Pesanan Tidak Sesuai</option>
          <option value="DELIVERY_DELAY">Keterlambatan</option>
          <option value="SERVICE">Pelayanan Outlet</option>
          <option value="CLEANLINESS">Kebersihan</option>
          <option value="OTHER">Lainnya</option>
        </select>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-primary" onclick="openCreateTicketModal()">+ Catat Keluhan Baru</button>
      </div>
    </div>

    <div class="card" style="padding: 0; overflow: hidden;">
      <div class="table-container" style="border: none;">
        <table>
          <thead>
            <tr>
              <th>ID Tiket</th>
              <th>Pelanggan</th>
              <th>Kategori</th>
              <th>Prioritas</th>
              <th>Status</th>
              <th>PIC Admin</th>
              <th>Batas Waktu Respons</th>
              <th style="text-align: right;">Aksi</th>
            </tr>
          </thead>
          <tbody id="complaint-tbody">
            <tr><td colspan="8"><div class="empty-state">Memuat tiket...</div></td></tr>
          </tbody>
        </table>
      </div>
      <div style="padding: 12px 20px; background: #F8FAFC; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center;" id="complaint-pagination"></div>
    </div>
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

  const q = new URLSearchParams(complaintSearchParams).toString();
  try {
    const res = await fetch(`/api/complaints?${q}`);
    const json = await res.json();
    const tickets = json.data;
    const pag = json.pagination;

    if (!tickets || tickets.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              Tidak ada tiket keluhan yang sesuai dengan filter saat ini.
              <div class="empty-state-sub">Ubah filter status/kategori atau buat tiket keluhan baru.</div>
            </div>
          </td>
        </tr>
      `;
      paginationDiv.innerHTML = '';
      return;
    }

    tbody.innerHTML = tickets.map(t => `
      <tr>
        <td><strong>${t.ticket_code}</strong></td>
        <td>
          <a href="#customer-detail" onclick="navigate('customer-detail', ${t.customer_id})" style="color: var(--text-main); font-weight: 600; text-decoration: none;">
            ${t.customer_name}
          </a>
        </td>
        <td>${categoryLabels[t.category] || t.category}</td>
        <td>
          <span class="badge ${t.priority === 'HIGH' ? 'badge-danger' : (t.priority === 'MEDIUM' ? 'badge-warning' : 'badge-neutral')}">
            ${priorityLabels[t.priority] || t.priority}
          </span>
        </td>
        <td>
          <span class="badge ${t.status === 'NEW' ? 'badge-info' : (t.status === 'IN_PROGRESS' ? 'badge-warning' : 'badge-success')}">
            ${statusLabels[t.status] || t.status}
          </span>
        </td>
        <td>${t.assigned_to_name || '-'}</td>
        <td>
          <span class="badge ${t.sla_info.badgeClass}">${t.sla_info.label}</span>
        </td>
        <td style="text-align: right;">
          <button class="btn btn-secondary btn-sm" onclick="navigate('complaint-detail', ${t.id})">Tindak Lanjut</button>
        </td>
      </tr>
    `).join('');

    paginationDiv.innerHTML = `
      <span style="font-size: 12px; color: #64748B;">Menampilkan ${(pag.page - 1) * pag.limit + 1} - ${Math.min(pag.page * pag.limit, pag.total)} dari ${pag.total} tiket</span>
      <div style="display: flex; gap: 6px;">
        <button class="btn btn-secondary btn-sm" ${pag.page <= 1 ? 'disabled' : ''} onclick="changeComplaintPage(${pag.page - 1})">Sebelumnya</button>
        <button class="btn btn-secondary btn-sm" ${pag.page >= pag.totalPages ? 'disabled' : ''} onclick="changeComplaintPage(${pag.page + 1})">Selanjutnya</button>
      </div>
    `;
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state" style="color: #B91C1C;">Gagal memuat daftar keluhan.</div></td></tr>';
  }
}

function changeComplaintPage(p) {
  complaintSearchParams.page = p;
  loadComplaintsData();
}

// Modal: Catat Keluhan Baru
async function openCreateTicketModal(preSelectedCustomerId = null) {
  try {
    const custRes = await fetch('/api/customers?status=ACTIVE&limit=100');
    const custData = await custRes.json();
    const customers = custData.data || [];

    const container = document.getElementById('modal-container');
    container.innerHTML = `
      <div class="modal-scrim" onclick="if(event.target === this) closeModal()">
        <div class="modal-content" style="max-width: 560px;">
          <div class="modal-header">
            <h3>Catat Tiket Keluhan Baru</h3>
            <button class="modal-close" onclick="closeModal()">&times;</button>
          </div>
          <form onsubmit="handleCreateTicketSubmit(event)">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Pilih Pelanggan Terdaftar *</label>
                <select id="create-tck-customer" class="form-control" required>
                  <option value="">-- Pilih Pelanggan --</option>
                  ${customers.map(c => `
                    <option value="${c.id}" ${preSelectedCustomerId == c.id ? 'selected' : ''}>
                      ${c.name} (${c.customer_code} - +${c.phone})
                    </option>
                  `).join('')}
                </select>
                <div class="form-helper">Jika pelanggan baru, daftarkan pelanggan terlebih dahulu di menu Pelanggan.</div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group">
                  <label class="form-label">Kategori Keluhan *</label>
                  <select id="create-tck-category" class="form-control" required>
                    <option value="FOOD_QUALITY">Kualitas Makanan</option>
                    <option value="WRONG_ORDER">Pesanan Tidak Sesuai</option>
                    <option value="DELIVERY_DELAY">Keterlambatan Pengiriman</option>
                    <option value="SERVICE">Pelayanan Outlet</option>
                    <option value="CLEANLINESS">Kebersihan</option>
                    <option value="OTHER">Lainnya</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Tingkat Prioritas *</label>
                  <select id="create-tck-priority" class="form-control" required>
                    <option value="HIGH">Tinggi (Mendesak)</option>
                    <option value="MEDIUM" selected>Sedang (Standar)</option>
                    <option value="LOW">Rendah (Saran/Review)</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Deskripsi Rinci Keluhan *</label>
                <textarea id="create-tck-desc" class="form-control" placeholder="Jelaskan detail komplain dari pelanggan..." rows="3" required></textarea>
              </div>

              <div style="background: #FFFBEB; border: 1px solid #FDE68A; padding: 12px; border-radius: 6px; font-size: 12px; color: #92400E;">
                <strong>Batas Waktu Respons (SLA):</strong> Target penanganan awal tiket adalah <strong>60 menit</strong> sejak tiket dibuat.
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
              <button type="submit" class="btn btn-primary">Buat Tiket Keluhan</button>
            </div>
          </form>
        </div>
      </div>
    `;
  } catch (err) {
    showToast('Gagal membuka form keluhan.', 'error');
  }
}

async function handleCreateTicketSubmit(e) {
  e.preventDefault();
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
// 6. COMPLAINT DETAIL & STATUS UPDATE VIEW
// -------------------------------------------------------------
async function renderComplaintDetail(id) {
  const content = document.getElementById('content-area');
  content.innerHTML = '<div class="empty-state">Memuat detail tiket...</div>';

  try {
    const res = await fetch(`/api/complaints/${id}`);
    const data = await res.json();
    const t = data.data;

    let activeAdmins = [];
    try {
      const uRes = await fetch('/api/admin/users');
      if (uRes.ok) {
        const uData = await uRes.json();
        activeAdmins = (uData.data || []).filter(u => u.role === 'ADMIN' && u.is_active === 1);
      }
    } catch (e) {}

    content.innerHTML = `
      <div style="margin-bottom: 16px;">
        <button class="btn btn-secondary btn-sm" onclick="navigate('complaints')">Kembali ke Daftar Tiket</button>
      </div>

      <div class="sla-alert-banner ${t.sla_info.code === 'OVERDUE' ? 'banner-danger' : ''}">
        <div>
          <strong style="${t.sla_info.code === 'OVERDUE' ? 'color: #991B1B;' : 'color: #92400E;'}">
            Batas Waktu Respons: ${t.sla_info.label}
          </strong>
          <div style="font-size: 12px; color: #64748B; margin-top: 2px;">
            Dibuat: ${formatDateIndo(t.created_at)} &bull; Batas Respons: ${formatDateIndo(t.sla_due_at)}
            ${t.first_response_at ? `&bull; Respons Pertama: ${formatDateIndo(t.first_response_at)}` : ''}
            ${t.resolved_at ? `&bull; Selesai: ${formatDateIndo(t.resolved_at)}` : ''}
          </div>
        </div>
        <span class="badge ${t.sla_info.badgeClass}">${t.sla_info.label}</span>
      </div>

      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
        <!-- Left: Detail Keluhan & Timeline -->
        <div>
          <div class="card">
            <div class="card-header">
              <div>
                <h2>Informasi Tiket ${t.ticket_code}</h2>
                <p>Kategori: <strong>${categoryLabels[t.category] || t.category}</strong></p>
              </div>
              <div style="display: flex; gap: 8px;">
                <span class="badge ${t.priority === 'HIGH' ? 'badge-danger' : (t.priority === 'MEDIUM' ? 'badge-warning' : 'badge-neutral')}">
                  Prioritas ${priorityLabels[t.priority] || t.priority}
                </span>
                <span class="badge ${t.status === 'NEW' ? 'badge-info' : (t.status === 'IN_PROGRESS' ? 'badge-warning' : 'badge-success')}">
                  Status: ${statusLabels[t.status] || t.status}
                </span>
              </div>
            </div>

            <div style="margin-bottom: 16px;">
              <h4 style="font-size: 12px; font-weight: 600; color: #64748B; margin-bottom: 4px;">Uraian Keluhan</h4>
              <p style="font-size: 14px; color: #1E293B; background: #F8FAFC; padding: 12px; border-radius: var(--radius-md); border: 1px solid #E2E8F0; line-height: 1.6;">
                ${t.description}
              </p>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding-top: 14px; border-top: 1px solid #E2E8F0;">
              <div>
                <span style="font-size: 11px; color: #64748B;">Pelanggan:</span>
                <div style="font-weight: 600; color: #0F172A;">${t.customer_name} (${t.customer_code})</div>
                <div style="font-size: 12px; color: #15803D;">+${t.customer_phone}</div>
              </div>
              <div>
                <span style="font-size: 11px; color: #64748B;">Penanggung Jawab (PIC):</span>
                <div style="font-weight: 600; color: #0F172A;">${t.assigned_to_name || '-'}</div>
                <div style="font-size: 12px; color: #64748B;">Dibuat oleh: ${t.created_by_name || '-'}</div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h2>Riwayat Aktivitas & Tindak Lanjut</h2>
            </div>

            <div class="timeline" style="margin-bottom: 24px;">
              ${t.activities && t.activities.length > 0 ? t.activities.map(a => `
                <div class="timeline-item">
                  <div class="timeline-header">
                    <span>${a.user_name || 'Sistem'}</span>
                    <span class="timeline-time">${formatDateIndo(a.created_at)}</span>
                  </div>
                  <div class="timeline-body">${a.description}</div>
                </div>
              `).join('') : '<div class="empty-state">Belum ada catatan aktivitas.</div>'}
            </div>

            ${t.status !== 'RESOLVED' ? `
              <div style="padding-top: 16px; border-top: 1px solid #E2E8F0;">
                <h4 style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">Tambah Catatan Internal</h4>
                <form onsubmit="handleAddNoteSubmit(event, ${t.id})">
                  <textarea id="ticket-note-text" class="form-control" placeholder="Tuliskan catatan tindak lanjut..." rows="2" required></textarea>
                  <div style="text-align: right; margin-top: 8px;">
                    <button type="submit" class="btn btn-secondary btn-sm">Simpan Catatan</button>
                  </div>
                </form>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Right: Actions & Status Transition -->
        <div>
          <div class="card">
            <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">Pembaruan Status Tiket</h3>

            ${t.status === 'NEW' ? `
              <div style="background: #F0F9FF; border: 1px solid #BAE6FD; padding: 12px; border-radius: 6px; font-size: 12px; color: #0369A1; margin-bottom: 12px;">
                Tiket masih berstatus <strong>Baru</strong>. Klik tombol di bawah untuk memulai penanganan.
              </div>
              <button class="btn btn-primary" style="width: 100%; margin-bottom: 8px;" onclick="updateTicketStatus(${t.id}, 'IN_PROGRESS')">
                Ubah ke Diproses
              </button>
            ` : (t.status === 'IN_PROGRESS' ? `
              <div style="background: #FFFBEB; border: 1px solid #FDE68A; padding: 12px; border-radius: 6px; font-size: 12px; color: #92400E; margin-bottom: 12px;">
                Tiket sedang <strong>Diproses</strong>. Setelah keluhan tertangani, ubah status menjadi Selesai.
              </div>
              <button class="btn btn-success" style="width: 100%; margin-bottom: 8px;" onclick="updateTicketStatus(${t.id}, 'RESOLVED')">
                Tandai Selesai
              </button>
            ` : `
              <div style="background: #F0FDF4; border: 1px solid #BBF7D0; padding: 12px; border-radius: 6px; font-size: 12px; color: #15803D;">
                Tiket ini telah <strong>Selesai</strong>. Sesuai aturan sistem, tiket yang telah selesai tidak dapat dibuka kembali.
              </div>
            `)}

            ${t.status !== 'RESOLVED' && activeAdmins.length > 0 ? `
              <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #E2E8F0;">
                <h4 style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">Alihkan PIC Tiket</h4>
                <select id="reassign-pic-select" class="form-control" style="margin-bottom: 8px;">
                  ${activeAdmins.map(a => `
                    <option value="${a.id}" ${t.assigned_to === a.id ? 'selected' : ''}>${a.name}</option>
                  `).join('')}
                </select>
                <button class="btn btn-secondary btn-sm" style="width: 100%;" onclick="handleReassignPic(${t.id})">
                  Ganti PIC
                </button>
              </div>
            ` : ''}

            <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #E2E8F0;">
              <h4 style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">Komunikasi WhatsApp</h4>
              <p style="font-size: 11px; color: #64748B; margin-bottom: 10px;">
                Gunakan template balasan resmi untuk mengirim pesan langsung ke WhatsApp pelanggan.
              </p>
              <button class="btn btn-success btn-sm" style="width: 100%;" onclick="openWhatsAppWithTicket(${t.customer_id}, ${t.id})">
                Buka Template WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    content.innerHTML = '<div class="empty-state" style="color: #B91C1C;">Gagal memuat detail keluhan.</div>';
  }
}

async function updateTicketStatus(id, newStatus) {
  const note = prompt(`Masukkan catatan perubahan status (${newStatus === 'IN_PROGRESS' ? 'Diproses' : 'Selesai'}):`, '');
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
  const assigned_to = select.value;
  const note = prompt('Alasan pergantian PIC:', 'Pengalihan tugas staf operasional');

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

async function handleAddNoteSubmit(e, id) {
  e.preventDefault();
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

function openWhatsAppWithTicket(customerId, ticketId) {
  navigate('whatsapp');
  setTimeout(() => {
    loadWhatsAppStudio(customerId, ticketId);
  }, 100);
}

// -------------------------------------------------------------
// 7. WHATSAPP TEMPLATES STUDIO VIEW
// -------------------------------------------------------------
async function renderWhatsApp() {
  const content = document.getElementById('content-area');
  content.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <!-- Kiri: Pilihan Template & Pengikatan Data -->
      <div class="card">
        <h3 style="font-size: 15px; font-weight: 600; margin-bottom: 12px;">Pilihan Template Standar</h3>
        <p style="font-size: 12px; color: #64748B; margin-bottom: 16px;">
          Pilih salah satu dari 4 template pesan baku Bro Chicken.
        </p>

        <div id="template-list-container" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
          <!-- Diisi via JS -->
        </div>

        <div style="padding-top: 16px; border-top: 1px solid #E2E8F0;">
          <h4 style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">Kaitkan Pelanggan</h4>
          <div class="form-group">
            <select id="wa-customer-select" class="form-control" onchange="handleWaBindingChange()">
              <option value="">-- Pilih Pelanggan --</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Nomor Tiket Terkait (Opsional)</label>
            <input type="text" id="wa-ticket-input" class="form-control" placeholder="Contoh: TCK-2026-0045" oninput="handleWaBindingChange()">
          </div>
        </div>
      </div>

      <!-- Kanan: Pratinjau & Aksi Pengiriman -->
      <div class="card">
        <h3 style="font-size: 15px; font-weight: 600; margin-bottom: 12px;">Pratinjau Pesan yang Akan Dikirim</h3>
        <div class="form-group">
          <label class="form-label">Teks Pesan (Dapat Diubah Sementara)</label>
          <textarea id="wa-preview-text" class="form-control" rows="8" style="line-height: 1.6;"></textarea>
          <div class="form-helper">Perubahan teks hanya berlaku untuk pengiriman saat ini dan tidak mengubah template master.</div>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 16px;">
          <button class="btn btn-secondary" onclick="copyWaText()">Salin Pesan</button>
          <button class="btn btn-success" style="flex: 1;" onclick="openWhatsAppDirect()">Buka WhatsApp Web</button>
        </div>

        <div style="margin-top: 20px; padding: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; font-size: 11px; color: #64748B;">
          <strong>Pemberitahuan Operasional:</strong> Pengiriman pesan dilakukan manual oleh staf operasional melalui WhatsApp Web atau aplikasi WhatsApp desktop. Sistem tidak terhubung ke bot atau API pihak ketiga otomatis.
        </div>
      </div>
    </div>
  `;

  loadWhatsAppStudio();
}

let loadedTemplates = [];
let selectedTemplateId = 'COMPLAINT_RECEIVED';

async function loadWhatsAppStudio(preCustomerId = null, preTicketId = null) {
  try {
    const res = await fetch('/api/templates');
    const json = await res.json();
    loadedTemplates = json.data;

    const listDiv = document.getElementById('template-list-container');
    listDiv.innerHTML = loadedTemplates.map(t => `
      <div onclick="selectWaTemplate('${t.id}')" style="padding: 12px; border: 1px solid ${selectedTemplateId === t.id ? 'var(--primary)' : '#E2E8F0'}; background: ${selectedTemplateId === t.id ? '#FFF7ED' : '#FFFFFF'}; border-radius: var(--radius-md); cursor: pointer; transition: all 0.15s ease;">
        <div style="font-weight: 600; font-size: 13px; color: #0F172A; display: flex; justify-content: space-between;">
          <span>${t.title}</span>
          <span class="badge badge-neutral">${t.category}</span>
        </div>
        <div style="font-size: 11px; color: #64748B; margin-top: 4px;">${t.description}</div>
      </div>
    `).join('');

    // Load customers
    const custRes = await fetch('/api/customers?limit=100');
    const custData = await custRes.json();
    const custSelect = document.getElementById('wa-customer-select');
    custSelect.innerHTML = '<option value="">-- Pilih Pelanggan --</option>' + (custData.data || []).map(c => `
      <option value="${c.id}" data-name="${c.name}" data-phone="${c.phone}" ${preCustomerId == c.id ? 'selected' : ''}>
        ${c.name} (+${c.phone})
      </option>
    `).join('');

    if (preTicketId) {
      document.getElementById('wa-ticket-input').value = `TCK-2026-00${preTicketId}`;
    }

    updateWaPreview();
  } catch (err) {
    showToast('Gagal memuat template WhatsApp.', 'error');
  }
}

function selectWaTemplate(id) {
  selectedTemplateId = id;
  const listDiv = document.getElementById('template-list-container');
  listDiv.querySelectorAll('div[onclick]').forEach(el => {
    el.style.borderColor = '#E2E8F0';
    el.style.background = '#FFFFFF';
  });
  updateWaPreview();
}

function handleWaBindingChange() {
  updateWaPreview();
}

function updateWaPreview() {
  const current = loadedTemplates.find(t => t.id === selectedTemplateId) || loadedTemplates[0];
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
  const text = document.getElementById('wa-preview-text').value;
  navigator.clipboard.writeText(text);
  showToast('Teks pesan berhasil disalin ke clipboard!');
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
// 8. REPORTS VIEW
// -------------------------------------------------------------
async function renderReports() {
  const content = document.getElementById('content-area');
  content.innerHTML = '<div class="empty-state">Memuat data laporan...</div>';

  try {
    const res = await fetch('/api/reports?period=this_month');
    const json = await res.json();
    const d = json.data;
    const s = d.summary;

    content.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left">
          <label style="font-size: 13px; font-weight: 600; color: #334155;">Rentang Periode:</label>
          <select class="form-control" style="width: 180px;" onchange="loadReportPeriod(this.value)">
            <option value="this_month" selected>Bulan Ini</option>
            <option value="today">Hari Ini</option>
            <option value="7days">7 Hari Terakhir</option>
            <option value="30days">30 Hari Terakhir</option>
          </select>
        </div>
        <div class="toolbar-right">
          <a href="/api/reports/export-csv?period=this_month" class="btn btn-secondary" id="export-csv-btn">
            Unduh Laporan (CSV)
          </a>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-card-title">Pelanggan Baru</div>
          <div class="stat-card-value">${s.new_customers}</div>
          <div class="stat-card-sub">Dalam periode laporan</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-title">Total Keluhan Masuk</div>
          <div class="stat-card-value">${s.total_complaints}</div>
          <div class="stat-card-sub">${s.status_counts.RESOLVED} Selesai &bull; ${s.status_counts.IN_PROGRESS} Diproses</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-title">Rata-rata Respons Awal</div>
          <div class="stat-card-value">${s.avg_response_minutes} <span style="font-size: 14px; font-weight: 500;">menit</span></div>
          <div class="stat-card-sub">Target SLA: maksimal 60 menit</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-title">Tingkat Kepatuhan SLA</div>
          <div class="stat-card-value" style="color: #15803D;">${s.sla_compliance_rate}%</div>
          <div class="stat-card-sub">${s.overdue_complaints} tiket melewati batas SLA</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div class="card">
          <h3 style="font-size: 15px; font-weight: 600; margin-bottom: 16px;">Distribusi Kategori Keluhan</h3>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${Object.entries(d.category_distribution).map(([cat, count]) => {
              const pct = s.total_complaints > 0 ? Math.round((count / s.total_complaints) * 100) : 0;
              return `
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                    <span style="font-weight: 500;">${categoryLabels[cat] || cat}</span>
                    <span style="color: #64748B;">${count} tiket (${pct}%)</span>
                  </div>
                  <div style="width: 100%; height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${pct}%; height: 100%; background: var(--primary); border-radius: 4px;"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="card">
          <h3 style="font-size: 15px; font-weight: 600; margin-bottom: 16px;">Kinerja Staf PIC Admin</h3>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nama Staf</th>
                  <th>Tiket Ditangani</th>
                  <th>Tepat Waktu</th>
                  <th>Terlambat</th>
                  <th>Kepatuhan SLA</th>
                </tr>
              </thead>
              <tbody>
                ${d.pic_performance.map(p => `
                  <tr>
                    <td><strong>${p.name}</strong></td>
                    <td>${p.total_tickets}</td>
                    <td style="color: #15803D;">${p.on_time}</td>
                    <td style="color: #B91C1C;">${p.overdue}</td>
                    <td><span class="badge ${p.compliance_rate >= 90 ? 'badge-success' : 'badge-warning'}">${p.compliance_rate}%</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    content.innerHTML = '<div class="empty-state" style="color: #B91C1C;">Gagal memuat laporan.</div>';
  }
}

function loadReportPeriod(val) {
  renderReports();
}

// -------------------------------------------------------------
// 9. ADMIN MANAGEMENT VIEW (OWNER ONLY)
// -------------------------------------------------------------
async function renderAdmin() {
  if (currentUser.role !== 'OWNER') {
    document.getElementById('content-area').innerHTML = '<div class="empty-state" style="color: #B91C1C;">Akses khusus Pemilik (Owner).</div>';
    return;
  }

  const content = document.getElementById('content-area');
  content.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-left">
        <p style="font-size: 13px; color: #64748B;">Kelola hak akses dan akun operasional staf admin Bro Chicken.</p>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-primary" onclick="openAddAdminModal()">+ Tambah Akun Admin</button>
      </div>
    </div>

    <div class="card" style="padding: 0; overflow: hidden;">
      <div class="table-container" style="border: none;">
        <table>
          <thead>
            <tr>
              <th>Nama Pengguna</th>
              <th>Username</th>
              <th>Role</th>
              <th>Status Akun</th>
              <th>Tiket Berjalan</th>
              <th>Terdaftar</th>
              <th style="text-align: right;">Aksi</th>
            </tr>
          </thead>
          <tbody id="admin-tbody">
            <tr><td colspan="7"><div class="empty-state">Memuat data akun...</div></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  loadAdminUsers();
}

async function loadAdminUsers() {
  const tbody = document.getElementById('admin-tbody');
  try {
    const res = await fetch('/api/admin/users');
    const json = await res.json();
    const users = json.data;

    tbody.innerHTML = users.map(u => `
      <tr>
        <td><strong>${u.name}</strong></td>
        <td><code>${u.username}</code></td>
        <td>
          <span class="badge ${u.role === 'OWNER' ? 'badge-gold' : 'badge-info'}">
            ${u.role === 'OWNER' ? 'Pemilik (Owner)' : 'Staf Admin'}
          </span>
        </td>
        <td>
          <span class="badge ${u.is_active === 1 ? 'badge-success' : 'badge-danger'}">
            ${u.is_active === 1 ? 'Aktif' : 'Nonaktif'}
          </span>
        </td>
        <td>${u.active_tickets_count} tiket aktif</td>
        <td>${formatDateIndo(u.created_at)}</td>
        <td style="text-align: right;">
          ${u.role !== 'OWNER' ? `
            <button class="btn btn-secondary btn-sm" onclick="openResetPasswordModal(${u.id}, '${u.name}')">Reset Sandi</button>
            ${u.is_active === 1
              ? `<button class="btn btn-secondary btn-sm" style="color: #B91C1C;" onclick="toggleAdminStatus(${u.id}, 0)">Nonaktifkan</button>`
              : `<button class="btn btn-secondary btn-sm" style="color: #15803D;" onclick="toggleAdminStatus(${u.id}, 1)">Aktifkan</button>`
            }
          ` : '<span style="font-size: 11px; color: #64748B;">Akun Utama</span>'}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state" style="color: #B91C1C;">Gagal memuat daftar admin.</div></td></tr>';
  }
}

function openAddAdminModal() {
  const container = document.getElementById('modal-container');
  container.innerHTML = `
    <div class="modal-scrim" onclick="if(event.target === this) closeModal()">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Tambah Akun Staf Admin</h3>
          <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <form onsubmit="handleAddAdminSubmit(event)">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Nama Lengkap *</label>
              <input type="text" id="add-admin-name" class="form-control" placeholder="Contoh: Doni Pratama" required>
            </div>
            <div class="form-group">
              <label class="form-label">Username Login *</label>
              <input type="text" id="add-admin-username" class="form-control" placeholder="Contoh: doni_pratama" required>
            </div>
            <div class="form-group">
              <label class="form-label">Kata Sandi Awal *</label>
              <input type="password" id="add-admin-password" class="form-control" placeholder="Minimal 6 karakter" required>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
            <button type="submit" class="btn btn-primary">Buat Akun</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

async function handleAddAdminSubmit(e) {
  e.preventDefault();
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

function openResetPasswordModal(id, name) {
  const newPass = prompt(`Masukkan kata sandi baru untuk ${name} (minimal 6 karakter):`);
  if (!newPass) return;

  fetch(`/api/admin/users/${id}/reset-password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_password: newPass })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) showToast(data.message);
    else showToast(data.error, 'error');
  });
}

// -------------------------------------------------------------
// 10. SETTINGS VIEW (OWNER ONLY)
// -------------------------------------------------------------
async function renderSettings() {
  if (currentUser.role !== 'OWNER') {
    document.getElementById('content-area').innerHTML = '<div class="empty-state" style="color: #B91C1C;">Akses khusus Pemilik (Owner).</div>';
    return;
  }

  const content = document.getElementById('content-area');
  content.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <!-- Profil Outlet -->
      <div class="card">
        <h3 style="font-size: 15px; font-weight: 600; margin-bottom: 12px;">Profil Outlet & Kebijakan SLA</h3>
        <div class="form-group">
          <label class="form-label">Nama Outlet</label>
          <input type="text" class="form-control" value="Bro Chicken - Cabang Margonda" readonly>
        </div>
        <div class="form-group">
          <label class="form-label">Nomor Hotline Layanan</label>
          <input type="text" class="form-control" value="0812-9988-7766" readonly>
        </div>
        <div class="form-group">
          <label class="form-label">Target Batas Respons (SLA)</label>
          <input type="text" class="form-control" value="60 Menit Kalender (Baku Sesuai SOP)" readonly>
          <div class="form-helper">Waktu respons dihitung 60 menit sejak tiket dibuat dan tidak dapat diubah (FR-08.12).</div>
        </div>
      </div>

      <!-- Backup Database SQLite -->
      <div class="card">
        <h3 style="font-size: 15px; font-weight: 600; margin-bottom: 12px;">Pencadangan Database SQLite</h3>
        <p style="font-size: 12px; color: #64748B; margin-bottom: 16px;">
          Unduh salinan mentah file database <code>brochicken_crm.sqlite</code> langsung ke komputer lokal Anda untuk arsip cadangan (NFR-12).
        </p>

        <a href="/api/settings/backup" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px;">
          Unduh Salinan Database SQLite (.sqlite)
        </a>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #E2E8F0;">
          <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">Ubah Kata Sandi Pemilik</h4>
          <form onsubmit="handleChangeOwnerPassword(event)">
            <div class="form-group">
              <label class="form-label">Kata Sandi Saat Ini</label>
              <input type="password" id="owner-curr-pass" class="form-control" required>
            </div>
            <div class="form-group">
              <label class="form-label">Kata Sandi Baru</label>
              <input type="password" id="owner-new-pass" class="form-control" required>
            </div>
            <button type="submit" class="btn btn-secondary btn-sm">Perbarui Kata Sandi</button>
          </form>
        </div>
      </div>
    </div>
  `;
}

async function handleChangeOwnerPassword(e) {
  e.preventDefault();
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
// SIMULASI WHATSAPP & AI TRIAGE (HUMAN-IN-THE-LOOP & REAL-TIME 2-POV)
// -------------------------------------------------------------
let simMessages = [
  {
    sender: 'ai',
    text: 'Halo! Selamat datang di Layanan Pelanggan WhatsApp Bro Chicken. Silakan ketik keluhan pesanan atau pertanyaan Anda di sini. AI Triage kami akan menganalisis dan mendaftarkan tiket ke antrean operasional CRM.',
    time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }
];
let simSamples = [];
let lastSimAnalysis = null;
let lastSimTicket = null;
let lastSimCustomer = null;
let isSimLoading = false;
let adminSSE = null;

function initAdminSSE() {
  if (adminSSE) return;

  adminSSE = new EventSource('/api/simulation/admin/stream');

  // Event: Chat baru dari pelanggan via Web WhatsApp publik (/simulasi)
  adminSSE.addEventListener('new_customer_chat', (e) => {
    try {
      const data = JSON.parse(e.data);
      lastSimAnalysis = data.analysis;
      lastSimCustomer = data.customer;
      lastSimTicket = data.ticket;

      // Tambahkan chat pelanggan ke feed admin
      simMessages.push({
        sender: 'cust',
        name: data.customer ? data.customer.name : 'Pelanggan',
        text: data.message,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      });

      // Tambahkan auto-reply AI
      if (data.reply) {
        simMessages.push({
          sender: 'ai',
          text: data.reply,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        });
      }

      showToast(`🔔 Chat baru masuk dari ${data.customer ? data.customer.name : 'Pelanggan'}!`);

      // Perbarui tampilan
      const chatBody = document.getElementById('sim-chat-body');
      if (chatBody) {
        chatBody.innerHTML = renderSimChatBubbles();
        scrollSimChatToBottom();
      }

      const inspectorEl = document.getElementById('sim-inspector-content');
      if (inspectorEl) inspectorEl.innerHTML = renderSimInspectorContent();

      const ticketContentEl = document.getElementById('sim-ticket-content');
      if (ticketContentEl) ticketContentEl.innerHTML = renderSimTicketContent();
      startSimSlaTicker();

      const replyTargetEl = document.getElementById('admin-reply-target-name');
      if (replyTargetEl) replyTargetEl.innerText = data.customer ? data.customer.name : 'Pelanggan';
    } catch (err) {
      console.error('Error parse SSE new_customer_chat:', err);
    }
  });

  // Event: Admin lain membalas chat
  adminSSE.addEventListener('admin_reply_sent', (e) => {
    try {
      const data = JSON.parse(e.data);
      // Hindari duplikasi jika admin saat ini yang mengirim
      const exists = simMessages.some(m => m.sender === 'admin' && m.text === data.message);
      if (!exists) {
        simMessages.push({
          sender: 'admin',
          name: data.admin_name,
          text: data.message,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        });
        const chatBody = document.getElementById('sim-chat-body');
        if (chatBody) {
          chatBody.innerHTML = renderSimChatBubbles();
          scrollSimChatToBottom();
        }
      }

      // Sinkronkan status tiket di kartu CRM bila admin lain membalas tiket yang sama
      if (lastSimTicket && data.ticket_id && Number(data.ticket_id) === Number(lastSimTicket.id)) {
        lastSimTicket.status = 'IN_PROGRESS';
        if (!lastSimTicket.first_response_at) lastSimTicket.first_response_at = data.timestamp || new Date().toISOString();
        const ticketContentEl = document.getElementById('sim-ticket-content');
        if (ticketContentEl) {
          ticketContentEl.innerHTML = renderSimTicketContent();
          startSimSlaTicker();
        }
      }
    } catch (err) {}
  });

  // Event: Member baru terdaftar dari halaman publik /daftar-member
  adminSSE.addEventListener('member_registered', (e) => {
    try {
      const data = JSON.parse(e.data);
      const name = data.customer ? data.customer.name : 'Member baru';
      showToast(`Member baru terdaftar: ${name}`);
      if (currentRoute === 'membership') loadMembershipData();
    } catch (err) {}
  });

  // Event: Pesan simulasi membership terkirim (welcome, promo QR, kupon)
  adminSSE.addEventListener('member_message_sent', (e) => {
    try {
      const data = JSON.parse(e.data);
      const labels = {
        WELCOME: 'Welcome message',
        QR_PROMO: 'Promo QR',
        END_MONTH_COUPON: 'Kupon tanggal tua'
      };
      showToast(`${labels[data.message_type] || 'Pesan member'} terkirim ke ${data.customer_name || data.phone}.`);
      if (currentRoute === 'membership') loadMembershipData();
    } catch (err) {}
  });

  // Event: Kupon ditandai sudah dipakai
  adminSSE.addEventListener('coupon_redeemed', (e) => {
    try {
      const data = JSON.parse(e.data);
      showToast(`Kupon ${data.coupon_code} ditandai sudah dipakai.`);
      if (currentRoute === 'membership') loadMembershipData();
    } catch (err) {}
  });

  // Event: Promo tanggal tua dijalankan (manual atau scheduler)
  adminSSE.addEventListener('end_month_promo_run', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (!data.skipped) {
        showToast(`Promo tanggal tua: ${data.issued} kupon diterbitkan.`);
      }
      if (currentRoute === 'membership') loadMembershipData();
    } catch (err) {}
  });
}

function renderSimChatBubbles() {
  let html = simMessages.map(msg => {
    if (msg.sender === 'cust') {
      return `
        <div class="wa-bubble wa-bubble-cust">
          <div class="wa-bubble-sender">${escapeHtml(msg.name || 'Pelanggan')}</div>
          <div>${escapeHtml(msg.text)}</div>
          <div class="wa-time">
            <span>${msg.time}</span>
            <span style="color: #38BDF8;">&check;&check;</span>
          </div>
        </div>
      `;
    } else if (msg.sender === 'admin') {
      return `
        <div class="wa-bubble wa-bubble-ai" style="border-left: 3px solid var(--primary); background: #FFF7ED;">
          <div class="wa-bubble-sender" style="color: #EA580C; display: flex; align-items: center; gap: 4px;">
            <span>${escapeHtml(msg.name || 'Admin')}</span>
            <span class="badge badge-warning" style="font-size: 9px; padding: 1px 4px;">Human-in-the-Loop</span>
          </div>
          <div>${escapeHtml(msg.text)}</div>
          <div class="wa-time">
            <span>${msg.time}</span>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="wa-bubble wa-bubble-ai">
          <div class="wa-bubble-sender">Bro Chicken Assistant (AI)</div>
          <div>${escapeHtml(msg.text)}</div>
          <div class="wa-time">
            <span>${msg.time}</span>
          </div>
        </div>
      `;
    }
  }).join('');

  if (isSimLoading) {
    html += `
      <div class="typing-indicator">
        <span>AI sedang menganalisis pesan & mendaftarkan tiket CRM...</span>
      </div>
    `;
  }

  return html;
}

function renderSimInspectorContent() {
  if (!lastSimAnalysis) {
    return `
      <div style="padding: 16px 0; text-align: center; color: var(--text-muted); font-size: 12.5px;">
        Belum ada pesan yang dianalisis.<br>
        Buka <a href="/simulasi" target="_blank" style="color: var(--primary); font-weight: 600;">Layar Pelanggan (/simulasi)</a> di tab sebelah untuk mencoba kirim chat secara live!
      </div>
    `;
  }

  const isComplaint = lastSimAnalysis.is_complaint;
  const catLabel = categoryLabels[lastSimAnalysis.category] || lastSimAnalysis.category;
  const prioLabel = priorityLabels[lastSimAnalysis.priority] || lastSimAnalysis.priority;
  const prioBadgeClass = lastSimAnalysis.priority === 'HIGH' ? 'badge-danger' : (lastSimAnalysis.priority === 'MEDIUM' ? 'badge-warning' : 'badge-info');

  return `
    <div class="inspector-row">
      <span class="inspector-label">Tipe Pesan</span>
      <span class="inspector-value">
        <span class="badge ${isComplaint ? 'badge-danger' : 'badge-success'}">
          ${isComplaint ? 'KELUHAN RESMI (Tiket Dibuat)' : 'PERTANYAAN / SAPAAN UMUM'}
        </span>
      </span>
    </div>
    <div class="inspector-row">
      <span class="inspector-label">Kategori Masalah</span>
      <span class="inspector-value"><strong>${escapeHtml(catLabel)}</strong></span>
    </div>
    <div class="inspector-row">
      <span class="inspector-label">Tingkat Prioritas</span>
      <span class="inspector-value"><span class="badge ${prioBadgeClass}">${escapeHtml(prioLabel)}</span></span>
    </div>
    <div class="inspector-row">
      <span class="inspector-label">Sentimen Pelanggan</span>
      <span class="inspector-value">
        <span class="badge ${lastSimAnalysis.sentiment === 'NEGATIVE' ? 'badge-danger' : (lastSimAnalysis.sentiment === 'POSITIVE' ? 'badge-success' : 'badge-neutral')}">
          ${escapeHtml(lastSimAnalysis.sentiment)}
        </span>
      </span>
    </div>
    <div class="inspector-row" style="flex-direction: column; align-items: flex-start; gap: 4px;">
      <span class="inspector-label">Ringkasan Masalah yang Diekstrak AI:</span>
      <span class="inspector-value" style="text-align: left; font-weight: 500; color: #1E293B; background: #F8FAFC; padding: 6px 10px; border-radius: 4px; width: 100%; border: 1px solid #E2E8F0;">
        ${escapeHtml(lastSimAnalysis.extracted_problem || '-')}
      </span>
    </div>
  `;
}

// Helper: Hitung sisa waktu SLA 60 menit
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

let simSlaTicker = null;

function updateSimSlaCountdown() {
  const el = document.getElementById('sim-sla-countdown');
  if (!el || !lastSimTicket || !lastSimTicket.sla_due_at) {
    if (simSlaTicker) {
      clearInterval(simSlaTicker);
      simSlaTicker = null;
    }
    return;
  }
  const sla = getSlaRemaining(lastSimTicket.sla_due_at);
  el.className = `badge ${sla.badgeClass}`;
  el.innerText = sla.label;
}

function startSimSlaTicker() {
  if (simSlaTicker) clearInterval(simSlaTicker);
  simSlaTicker = setInterval(updateSimSlaCountdown, 1000);
  updateSimSlaCountdown();
}

function renderSimTicketContent() {
  if (!lastSimTicket) {
    return `
      <div style="padding: 14px 0; text-align: center; color: var(--text-muted); font-size: 12.5px;">
        Tiket belum dibuat. Kirim pesan yang berisi komplain agar AI otomatis men-generate tiket keluhan resmi.
      </div>
    `;
  }

  const status = lastSimTicket.status || 'NEW';
  const statusLabel = statusLabels[status] || status;
  const statusClass = status === 'RESOLVED' ? 'badge-success' : (status === 'IN_PROGRESS' ? 'badge-warning' : 'badge-info');
  const sla = getSlaRemaining(lastSimTicket.sla_due_at);

  return `
    <div class="ticket-sync-box">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 8px;">
        <span style="font-weight: 700; font-size: 14px; color: var(--primary);">
          #${escapeHtml(lastSimTicket.ticket_code)}
        </span>
        <span class="badge ${statusClass}">Status: ${escapeHtml(statusLabel)}</span>
      </div>
      <div style="font-size: 12px; color: var(--text-body); margin-bottom: 4px;">
        <strong>Pelanggan:</strong> ${escapeHtml(lastSimCustomer ? lastSimCustomer.name : 'Pelanggan')} (${escapeHtml(lastSimCustomer ? lastSimCustomer.customer_code : '-')})
      </div>
      <div style="font-size: 12px; color: var(--text-body); margin-bottom: 4px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
        <strong>Batas Respons (SLA):</strong> 60 Menit
        <span id="sim-sla-countdown" class="badge ${sla.badgeClass}">${escapeHtml(sla.label)}</span>
      </div>
      <div style="font-size: 12px; color: var(--text-body); margin-bottom: 8px;">
        <strong>PIC Ditugaskan:</strong> ${escapeHtml(lastSimTicket.assigned_to_name || 'Admin')}
      </div>
      <button class="btn btn-primary" style="width: 100%; font-size: 12.5px; padding: 8px; font-weight: 600;" onclick="navigate('complaint-detail', ${Number(lastSimTicket.id)})">
        Buka & Tindak Lanjuti di CRM (Human-in-the-Loop) &rarr;
      </button>
    </div>
  `;
}

function scrollSimChatToBottom() {
  setTimeout(() => {
    const el = document.getElementById('sim-chat-body');
    if (el) el.scrollTop = el.scrollHeight;
  }, 50);
}

function applySimulationSample(idx) {
  const sample = simSamples[idx];
  if (!sample) return;

  document.getElementById('sim-name').value = sample.name;
  document.getElementById('sim-phone').value = sample.phone;
  document.getElementById('sim-source').value = sample.source;
  document.getElementById('sim-chat-input').value = sample.message;
  document.getElementById('sim-chat-input').focus();
}

async function handleSimSend() {
  if (isSimLoading) return;

  const inputEl = document.getElementById('sim-chat-input');
  const message = inputEl.value.trim();
  if (!message) return;

  const name = document.getElementById('sim-name').value.trim() || 'Pelanggan';
  const phone = document.getElementById('sim-phone').value.trim() || '081299887711';
  const source = document.getElementById('sim-source').value;

  const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  // Tambahkan chat pelanggan ke riwayat
  simMessages.push({
    sender: 'cust',
    name: name,
    text: message,
    time: nowTime
  });

  inputEl.value = '';
  isSimLoading = true;

  const chatBody = document.getElementById('sim-chat-body');
  if (chatBody) {
    chatBody.innerHTML = renderSimChatBubbles();
    scrollSimChatToBottom();
  }

  try {
    const res = await fetch('/api/simulation/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, source, message })
    });

    const data = await res.json();
    isSimLoading = false;

    if (data.success) {
      lastSimAnalysis = data.analysis;
      lastSimCustomer = data.customer;
      lastSimTicket = data.ticket;

      // Tambahkan respon AI ke chat
      simMessages.push({
        sender: 'ai',
        text: data.reply,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      });

      if (data.ticket) {
        showToast(`Tiket #${data.ticket.ticket_code} berhasil dibuat oleh AI Triage!`);
      } else {
        showToast('Pesan direspons oleh AI Assistant.');
      }
    } else {
      showToast(data.error || 'Gagal memproses simulasi.', 'error');
    }
  } catch (err) {
    isSimLoading = false;
    showToast('Terjadi kendala koneksi ke server simulasi.', 'error');
  }

  // Render ulang komponen
  const updatedChatBody = document.getElementById('sim-chat-body');
  if (updatedChatBody) {
    updatedChatBody.innerHTML = renderSimChatBubbles();
    scrollSimChatToBottom();
  }

  const inspectorEl = document.getElementById('sim-inspector-content');
  if (inspectorEl) {
    inspectorEl.innerHTML = renderSimInspectorContent();
  }

  const engineBadgeEl = document.getElementById('sim-engine-badge');
  if (engineBadgeEl && lastSimAnalysis) {
    engineBadgeEl.innerText = lastSimAnalysis.engine;
  }

  const ticketContentEl = document.getElementById('sim-ticket-content');
  if (ticketContentEl) {
    ticketContentEl.innerHTML = renderSimTicketContent();
  }

  const ticketBadgeEl = document.getElementById('sim-ticket-badge');
  if (ticketBadgeEl && lastSimTicket) {
    ticketBadgeEl.innerText = `Terdaftar #${lastSimTicket.ticket_code}`;
  }
}

// Handler: Kirim Balasan Manual Staf Admin ke Pelanggan (Human-in-the-Loop)
async function handleSendAdminReply() {
  const replyInput = document.getElementById('admin-reply-input');
  if (!replyInput) return;

  const message = replyInput.value.trim();
  if (!message) {
    showToast('Ketik pesan balasan terlebih dahulu.', 'error');
    return;
  }

  const targetPhone = lastSimCustomer ? lastSimCustomer.phone : '081299887711';
  const ticketId = lastSimTicket ? lastSimTicket.id : null;

  try {
    const res = await fetch('/api/simulation/admin/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: targetPhone,
        ticket_id: ticketId,
        message: message
      })
    });

    const data = await res.json();
    if (data.success) {
      simMessages.push({
        sender: 'admin',
        name: currentUser.name,
        text: message,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      });

      replyInput.value = '';

      // Respons admin menandai tiket IN_PROGRESS secara optimistis (server juga mencatat first_response_at)
      if (lastSimTicket) {
        lastSimTicket.status = 'IN_PROGRESS';
        if (!lastSimTicket.first_response_at) {
          lastSimTicket.first_response_at = new Date().toISOString();
        }
      }

      const chatBody = document.getElementById('sim-chat-body');
      if (chatBody) {
        chatBody.innerHTML = renderSimChatBubbles();
        scrollSimChatToBottom();
      }

      const ticketContentEl = document.getElementById('sim-ticket-content');
      if (ticketContentEl) {
        ticketContentEl.innerHTML = renderSimTicketContent();
        startSimSlaTicker();
      }

      showToast('Balasan langsung terkirim ke WhatsApp pelanggan secara real-time!');
    } else {
      showToast(data.error || 'Gagal mengirim balasan admin.', 'error');
    }
  } catch (err) {
    showToast('Kendala jaringan mengirim balasan admin.', 'error');
  }
}

function setAdminQuickReply(text) {
  const replyInput = document.getElementById('admin-reply-input');
  if (replyInput) {
    replyInput.value = text;
    replyInput.focus();
  }
}

async function renderSimulation() {
  const container = document.getElementById('content-area');

  // Inisialisasi SSE listener untuk Admin
  initAdminSSE();

  if (simSamples.length === 0) {
    try {
      const res = await fetch('/api/simulation/samples');
      const data = await res.json();
      if (data.success) {
        simSamples = data.data;
      }
    } catch (e) {}
  }

  container.innerHTML = `
    <!-- Top Banner Split-Screen / 2 POV Mode -->
    <div style="background: #0F172A; color: #FFFFFF; padding: 12px 18px; border-radius: var(--radius-md); margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
      <div>
        <div style="font-weight: 700; font-size: 13.5px; display: flex; align-items: center; gap: 8px;">
          <span class="badge badge-warning" style="font-size: 10px; padding: 2px 6px;">POV: ADMIN OPERASIONAL CRM</span>
          <span>Konsol Live Chat & Real-Time Human-in-the-Loop</span>
        </div>
        <div style="font-size: 12px; color: #94A3B8; margin-top: 2px;">
          Tiap pesan yang dikirim pelanggan dari WhatsApp publik akan langsung muncul di sini secara real-time.
        </div>
      </div>
      <a href="/simulasi" target="_blank" class="btn btn-primary" style="font-size: 12px; padding: 8px 14px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
        <span>🌐 Buka Layar Pelanggan (Tab Baru)</span> &nearr;
      </a>
    </div>

    <!-- Quick Scenario Presets -->
    <div style="margin-bottom: 16px;">
      <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.05em;">
        PILIH SKENARIO SIMULASI CEPAT:
      </div>
      <div class="preset-chips-container" id="sim-preset-chips">
        ${simSamples.map((s, idx) => `
          <button class="preset-chip" onclick="applySimulationSample(${idx})">
            <span>${escapeHtml(s.title)}</span> &bull; <span class="badge ${s.badgeClass}" style="font-size: 9.5px; padding: 1px 5px;">${escapeHtml(s.badge)}</span>
          </button>
        `).join('')}
      </div>
    </div>

    <div class="simulation-grid">
      <!-- Kolom Kiri: Layar Mockup WhatsApp -->
      <div class="wa-phone-mockup">
        <div class="wa-header">
          <div class="wa-header-left">
            <img src="/images/logo.png" alt="Bro Chicken Logo" class="wa-avatar">
            <div>
              <div class="wa-name">Bro Chicken Customer Care</div>
              <div class="wa-status">
                <span class="wa-status-dot"></span>
                <span>Online &bull; Live Connected via SSE</span>
              </div>
            </div>
          </div>
          <span class="badge badge-success" style="font-size: 10.5px; background: rgba(255,255,255,0.2); color: #fff; border: 1px solid rgba(255,255,255,0.3);">
            Official WhatsApp
          </span>
        </div>

        <div class="wa-profile-bar">
          <div class="wa-profile-field">
            <label>Nama Pelanggan</label>
            <input type="text" id="sim-name" value="Rian Pratama">
          </div>
          <div class="wa-profile-field">
            <label>Nomor WhatsApp</label>
            <input type="text" id="sim-phone" value="081299887711">
          </div>
          <div class="wa-profile-field">
            <label>Kanal Pembelian</label>
            <select id="sim-source">
              <option value="GOFOOD">GoFood</option>
              <option value="GRABFOOD">GrabFood</option>
              <option value="DIRECT">Beli Langsung</option>
              <option value="OTHER">Lainnya</option>
            </select>
          </div>
        </div>

        <div class="wa-chat-body" id="sim-chat-body">
          ${renderSimChatBubbles()}
        </div>

        <div class="wa-input-bar">
          <input type="text" id="sim-chat-input" placeholder="Ketik pesan keluhan atau pertanyaan pelanggan..." onkeydown="if(event.key === 'Enter') handleSimSend()">
          <button class="wa-btn-send" onclick="handleSimSend()" id="sim-btn-send">
            Kirim
          </button>
        </div>
      </div>

      <!-- Kolom Kanan: Live CRM Inspector & Human-in-the-Loop Console -->
      <div>
        <!-- AI Inspector Card -->
        <div class="inspector-card">
          <div class="inspector-header">
            <div class="inspector-title">
              <span>Analisis AI Triage Real-Time</span>
            </div>
            <span class="badge badge-warning" id="sim-engine-badge">
              ${escapeHtml(lastSimAnalysis ? lastSimAnalysis.engine : 'Gemini 3.5 Flash Lite')}
            </span>
          </div>

          <div id="sim-inspector-content">
            ${renderSimInspectorContent()}
          </div>
        </div>

        <!-- Live CRM Ticket Card -->
        <div class="inspector-card" style="border-left: 4px solid var(--primary);">
          <div class="inspector-header">
            <div class="inspector-title">
              <span>Tiket CRM Bro Chicken</span>
            </div>
            <span class="badge badge-info" id="sim-ticket-badge">
              ${lastSimTicket ? 'Terhubung Otomatis' : 'Menunggu Input'}
            </span>
          </div>

          <div id="sim-ticket-content">
            ${renderSimTicketContent()}
          </div>
        </div>

        <!-- Human-in-the-Loop Direct Reply Card -->
        <div class="inspector-card" style="border-left: 4px solid #10B981;">
          <div class="inspector-header">
            <div class="inspector-title">
              <span style="color: #047857;">Balas Langsung ke WhatsApp Pelanggan</span>
            </div>
            <span class="badge badge-success" style="font-size: 10px;">Human-in-the-Loop</span>
          </div>

          <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 6px;">
            Target Pelanggan: <strong id="admin-reply-target-name">${escapeHtml(lastSimCustomer ? lastSimCustomer.name : 'Rian Pratama')}</strong>
          </div>

          <textarea id="admin-reply-input" class="admin-reply-textarea" placeholder="Tulis balasan langsung dari staf admin untuk pelanggan..."></textarea>

          <div class="quick-reply-chips">
            <button type="button" class="quick-reply-btn" onclick="setAdminQuickReply('Baik Kak, kami konfirmasi ke dapur dan segera kirimkan porsi ayam baru sekarang ya.')">🍗 Kirim Pengganti Dapur</button>
            <button type="button" class="quick-reply-btn" onclick="setAdminQuickReply('Mohon maaf atas ketidaknyamanannya, kami proses pengembalian dana (refund) sekarang ya Kak.')">💰 Proses Refund</button>
            <button type="button" class="quick-reply-btn" onclick="setAdminQuickReply('Mohon infokan detail nomor pesanan dan foto paket yang Kakak terima ya.')">📸 Minta Foto Pesanan</button>
          </div>

          <button class="btn btn-primary" style="width: 100%; margin-top: 8px; font-weight: 600;" onclick="handleSendAdminReply()">
            Kirim Balasan Manual ke WhatsApp Pelanggan &rarr;
          </button>
        </div>

        <!-- Architecture Explainer Card -->
        <div class="card" style="background: #F8FAFC; border: 1px dashed var(--card-border);">
          <div style="font-weight: 700; font-size: 13px; color: var(--text-main); margin-bottom: 8px;">
            Alur Dua Arah Real-Time (2 POV):
          </div>
          <ol style="padding-left: 18px; font-size: 12px; color: var(--text-body); line-height: 1.6;">
            <li><strong>POV 1 (Pelanggan):</strong> Membuka <code>/simulasi</code> di tab terpisah, kirim komplain tanpa login.</li>
            <li><strong>AI Triage & SQLite:</strong> Gemini mengklasifikasikan masalah & tiket dibuat dengan timer SLA 60 menit.</li>
            <li><strong>POV 2 (Admin Live):</strong> Chat pelanggan muncul seketika via SSE di layar Admin CRM.</li>
            <li><strong>Human-in-the-Loop:</strong> Admin mengetik balasan manual di atas, dan seketika muncul di layar WhatsApp pelanggan!</li>
          </ol>
        </div>
      </div>
    </div>
  `;

  scrollSimChatToBottom();
  startSimSlaTicker();
}

// -------------------------------------------------------------
// MEMBERSHIP, QR PROMO & KUPON TANGGAL TUA
// -------------------------------------------------------------
let membershipSearch = '';
let membershipStatus = '';
let membershipSearchTimer = null;

function membershipBadge(status) {
  if (status === 'ACTIVE') return '<span class="badge badge-success">Aktif</span>';
  if (status === 'INACTIVE') return '<span class="badge badge-neutral">Nonaktif</span>';
  return `<span class="badge badge-neutral">${escapeHtml(status)}</span>`;
}

function couponBadge(status) {
  if (status === 'ISSUED') return '<span class="badge badge-warning">Terbit</span>';
  if (status === 'USED') return '<span class="badge badge-success">Dipakai</span>';
  if (status === 'EXPIRED') return '<span class="badge badge-neutral">Kedaluwarsa</span>';
  return `<span class="badge badge-neutral">${escapeHtml(status)}</span>`;
}

function messageTypeLabel(type) {
  const labels = {
    WELCOME: 'Welcome',
    QR_PROMO: 'Promo QR',
    END_MONTH_COUPON: 'Kupon Tanggal Tua'
  };
  return labels[type] || type;
}

async function renderMembership() {
  const content = document.getElementById('content-area');
  initAdminSSE();

  content.innerHTML = `
    <div class="membership-banner">
      <div>
        <div class="membership-banner-title">
          <span class="badge badge-success" style="font-size: 10px; padding: 2px 6px;">SIMULASI WHATSAPP</span>
          <span>Membership &amp; Promo Tanggal Tua</span>
        </div>
        <div class="membership-banner-sub">
          Welcome message, promo QR, dan kupon 10% dikirim sebagai simulasi. Semua pesan tersimpan di outbox CRM.
        </div>
      </div>
      <a href="/daftar-member" target="_blank" class="btn btn-primary" style="font-size: 12px; padding: 8px 14px; text-decoration: none;">
        Buka Halaman Daftar Member &nearr;
      </a>
    </div>

    <div class="stats-grid" id="membership-stats">
      <div class="stat-card"><div class="stat-card-title">Total Member</div><div class="stat-card-value">-</div></div>
      <div class="stat-card"><div class="stat-card-title">Member Baru Bulan Ini</div><div class="stat-card-value">-</div></div>
      <div class="stat-card"><div class="stat-card-title">Pasif &gt; 14 Hari</div><div class="stat-card-value">-</div></div>
      <div class="stat-card"><div class="stat-card-title">Kupon Terbit / Terpakai</div><div class="stat-card-value">-</div></div>
    </div>

    <div class="toolbar" style="margin-bottom: 16px;">
      <div class="toolbar-left">
        <input type="text" class="form-control" style="width: 240px;" placeholder="Cari nama, nomor, atau kode member..." oninput="handleMembershipSearch(this.value)">
        <select class="form-control" style="width: 160px;" onchange="handleMembershipStatus(this.value)">
          <option value="">Semua Status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="INACTIVE">Nonaktif</option>
        </select>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-secondary" onclick="loadMembershipData()">Muat Ulang</button>
        <button class="btn btn-primary" onclick="handleRunEndMonthPromo()">Jalankan Promo Tanggal Tua</button>
      </div>
    </div>

    <div class="card" style="padding: 0; overflow: hidden;">
      <div class="card-header" style="padding: 16px 20px; margin-bottom: 0;">
        <div>
          <h2>Daftar Member</h2>
          <p>Klik detail untuk melihat riwayat transaksi, pesan, dan kupon.</p>
        </div>
        <span class="badge badge-info" id="membership-count-badge">-</span>
      </div>
      <div class="table-container" style="border: none; border-top: 1px solid var(--card-border); border-radius: 0;">
        <table>
          <thead>
            <tr>
              <th>Kode Member</th>
              <th>Nama</th>
              <th>Nomor WhatsApp</th>
              <th>Status</th>
              <th>Transaksi Terakhir</th>
              <th>Tidak Aktif</th>
              <th style="text-align: right;">Aksi</th>
            </tr>
          </thead>
          <tbody id="membership-tbody">
            <tr><td colspan="7"><div class="empty-state">Memuat data member...</div></td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="membership-grid">
      <div class="card">
        <div class="card-header">
          <div>
            <h2>QR Campaign</h2>
            <p>Unduh QR untuk outlet, kemasan, dan meja dine-in.</p>
          </div>
        </div>
        <div id="membership-campaigns" class="campaign-list">
          <div class="empty-state">Memuat QR campaign...</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h2>Kupon Tanggal Tua</h2>
            <p>Diskon 10%, berlaku 7 hari sejak diterbitkan.</p>
          </div>
        </div>
        <div class="table-container" style="border: none;">
          <table>
            <thead>
              <tr>
                <th>Kode Kupon</th>
                <th>Member</th>
                <th>Berlaku Sampai</th>
                <th>Status</th>
                <th style="text-align: right;">Aksi</th>
              </tr>
            </thead>
            <tbody id="membership-coupons">
              <tr><td colspan="5"><div class="empty-state">Memuat kupon...</div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div>
          <h2>Outbox Pesan Simulasi</h2>
          <p>Semua welcome message, promo QR, dan kupon yang dikirim sistem.</p>
        </div>
        <span class="badge badge-neutral">Provider: SIMULATION</span>
      </div>
      <div class="table-container" style="border: none;">
        <table>
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Tujuan</th>
              <th>Jenis</th>
              <th>Isi Pesan</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="membership-messages">
            <tr><td colspan="5"><div class="empty-state">Memuat outbox pesan...</div></td></tr>
          </tbody>
        </table>
      </div>
    </div>
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
    box.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-title">Total Member</div>
        <div class="stat-card-value">${d.total_members}</div>
        <div class="stat-card-sub">${d.active_members} member aktif</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-title">Member Baru Bulan Ini</div>
        <div class="stat-card-value" style="color: var(--primary);">${d.new_this_month}</div>
        <div class="stat-card-sub">Bergabung bulan berjalan</div>
      </div>
      <div class="stat-card ${d.inactive_14 > 0 ? 'stat-card-danger' : ''}">
        <div class="stat-card-title">Pasif &gt; 14 Hari</div>
        <div class="stat-card-value">${d.inactive_14}</div>
        <div class="stat-card-sub">Kandidat kupon tanggal tua</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-title">Kupon Terbit / Terpakai</div>
        <div class="stat-card-value">${d.coupons_issued} / ${d.coupons_used}</div>
        <div class="stat-card-sub">Window: 3 hari terakhir bulan ${monthEnd.in_window ? '(aktif)' : '(belum aktif)'}</div>
      </div>
    `;
  } catch (err) {
    box.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">${escapeHtml(err.message)}</div>`;
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
    const res = await fetch('/api/membership/members?' + params.toString());
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Gagal memuat member.');
    const rows = json.data || [];
    if (countBadge) countBadge.innerText = `${json.pagination ? json.pagination.total : rows.length} member`;

    if (rows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              Belum ada member yang sesuai.
              <div class="empty-state-sub">Bagikan QR campaign atau buka halaman /daftar-member untuk menambah member.</div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rows.map(m => `
      <tr>
        <td><strong>${escapeHtml(m.member_code)}</strong></td>
        <td>${escapeHtml(m.name)}</td>
        <td>+${escapeHtml(m.phone)}</td>
        <td>${membershipBadge(m.status)}</td>
        <td>${m.last_transaction_at ? formatDateIndo(m.last_transaction_at) : '<span style="color: var(--text-muted);">Belum ada</span>'}</td>
        <td>
          <span class="badge ${m.inactive_14 ? 'badge-danger' : 'badge-neutral'}">
            ${m.inactive_days} hari
          </span>
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn btn-secondary btn-sm" onclick="openMemberDetail(${m.customer_id})">Detail</button>
          <button class="btn btn-primary btn-sm" onclick="openTransactionModal(${m.customer_id})">Catat Transaksi</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">${escapeHtml(err.message)}</div></td></tr>`;
  }
}

async function loadMembershipCampaigns() {
  const box = document.getElementById('membership-campaigns');
  if (!box) return;
  try {
    const res = await fetch('/api/membership/campaigns');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Gagal memuat campaign.');
    box.innerHTML = (json.data || []).map(c => `
      <div class="campaign-card">
        <img src="/api/membership/qr/${encodeURIComponent(c.code)}.svg" alt="QR ${escapeHtml(c.label)}" class="campaign-qr">
        <div class="campaign-body">
          <div class="campaign-code">${escapeHtml(c.code)}</div>
          <div class="campaign-label">${escapeHtml(c.label)}</div>
          <div class="campaign-desc">${escapeHtml(c.description)}</div>
          <div class="campaign-actions">
            <a class="btn btn-secondary btn-sm" href="/api/membership/qr/${encodeURIComponent(c.code)}.png" download="${escapeHtml(c.code)}.png">Unduh PNG</a>
            <a class="btn btn-primary btn-sm" href="/daftar-member?campaign=${encodeURIComponent(c.code)}" target="_blank">Buka Form</a>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    box.innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
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
      tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">Belum ada kupon. Jalankan promo tanggal tua untuk demo.</div></td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(c => `
      <tr>
        <td><strong style="font-family: monospace; font-size: 12px;">${escapeHtml(c.coupon_code)}</strong></td>
        <td>${escapeHtml(c.customer_name)}</td>
        <td>${formatDateIndo(c.expires_at)}</td>
        <td>${couponBadge(c.status)}</td>
        <td style="text-align: right;">
          ${c.status === 'ISSUED'
            ? `<button class="btn btn-primary btn-sm" onclick="redeemMemberCoupon(${c.id})">Tandai Dipakai</button>`
            : '<span style="font-size: 11.5px; color: var(--text-muted);">-</span>'}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">${escapeHtml(err.message)}</div></td></tr>`;
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
      tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state">Belum ada pesan simulasi.</div></td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(m => `
      <tr>
        <td style="white-space: nowrap;">${formatDateIndo(m.sent_at || m.created_at)}</td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(m.customer_name)}</div>
          <div style="font-size: 11.5px; color: var(--text-muted);">+${escapeHtml(m.phone)}</div>
        </td>
        <td><span class="badge ${m.message_type === 'END_MONTH_COUPON' ? 'badge-gold' : 'badge-info'}">${messageTypeLabel(m.message_type)}</span></td>
        <td><div class="outbox-body">${escapeHtml(m.body)}</div></td>
        <td>
          <span class="badge badge-success">${escapeHtml(m.status)}</span>
          <div style="font-size: 10.5px; color: var(--text-muted); margin-top: 2px;">${escapeHtml(m.provider)}</div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">${escapeHtml(err.message)}</div></td></tr>`;
  }
}

async function openMemberDetail(customerId) {
  const container = document.getElementById('modal-container');
  container.innerHTML = `
    <div class="modal-scrim" onclick="if(event.target === this) closeModal()">
      <div class="modal-content" style="max-width: 780px;">
        <div class="modal-header">
          <h3>Detail Member</h3>
          <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body"><div class="empty-state">Memuat detail member...</div></div>
      </div>
    </div>
  `;

  try {
    const res = await fetch(`/api/membership/members/${customerId}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Gagal memuat detail.');
    const { membership, transactions, messages, coupons } = json.data;

    const txnRows = transactions.length === 0
      ? '<tr><td colspan="4"><div class="empty-state">Belum ada transaksi tercatat.</div></td></tr>'
      : transactions.map(t => `
          <tr>
            <td>${formatDateIndo(t.occurred_at)}</td>
            <td><span class="badge badge-neutral">${escapeHtml(t.channel)}</span></td>
            <td>${escapeHtml(t.notes || '-')}</td>
            <td>${formatDateIndo(t.created_at)}</td>
          </tr>
        `).join('');

    const couponRows = coupons.length === 0
      ? '<tr><td colspan="4"><div class="empty-state">Belum ada kupon.</div></td></tr>'
      : coupons.map(c => `
          <tr>
            <td><strong style="font-family: monospace; font-size: 12px;">${escapeHtml(c.coupon_code)}</strong></td>
            <td>${escapeHtml(c.campaign_id)}</td>
            <td>${formatDateIndo(c.expires_at)}</td>
            <td>
              ${couponBadge(c.status)}
              ${c.status === 'ISSUED' ? `<button class="btn btn-secondary btn-sm" style="margin-left: 6px;" onclick="redeemMemberCoupon(${c.id}, ${customerId})">Pakai</button>` : ''}
            </td>
          </tr>
        `).join('');

    const messageRows = messages.length === 0
      ? '<tr><td colspan="3"><div class="empty-state">Belum ada pesan.</div></td></tr>'
      : messages.map(m => `
          <tr>
            <td style="white-space: nowrap;">${formatDateIndo(m.sent_at || m.created_at)}</td>
            <td><span class="badge badge-info">${messageTypeLabel(m.message_type)}</span></td>
            <td><div class="outbox-body">${escapeHtml(m.body)}</div></td>
          </tr>
        `).join('');

    container.querySelector('.modal-content').innerHTML = `
      <div class="modal-header">
        <div>
          <h3 style="margin-bottom: 2px;">${escapeHtml(membership.name)}</h3>
          <div style="font-size: 12px; color: var(--text-muted);">${escapeHtml(membership.member_code)} &bull; +${escapeHtml(membership.phone)}</div>
        </div>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="member-detail-meta">
          <div><span class="meta-label">Status</span>${membershipBadge(membership.status)}</div>
          <div><span class="meta-label">Terdaftar Via</span><span class="badge badge-neutral">${escapeHtml(membership.registered_via)}</span></div>
          <div><span class="meta-label">Bergabung</span>${formatDateIndo(membership.joined_at)}</div>
          <div><span class="meta-label">Transaksi Terakhir</span>${membership.last_transaction_at ? formatDateIndo(membership.last_transaction_at) : 'Belum ada'}</div>
        </div>

        <div class="member-detail-section">
          <div class="member-detail-section-head">
            <h4>Riwayat Transaksi Manual</h4>
            <button class="btn btn-primary btn-sm" onclick="openTransactionModal(${customerId})">+ Catat Transaksi</button>
          </div>
          <div class="table-container">
            <table>
              <thead><tr><th>Tanggal</th><th>Kanal</th><th>Catatan</th><th>Dicatat</th></tr></thead>
              <tbody>${txnRows}</tbody>
            </table>
          </div>
        </div>

        <div class="member-detail-section">
          <div class="member-detail-section-head">
            <h4>Kupon</h4>
          </div>
          <div class="table-container">
            <table>
              <thead><tr><th>Kode</th><th>Campaign</th><th>Berlaku Sampai</th><th>Status</th></tr></thead>
              <tbody>${couponRows}</tbody>
            </table>
          </div>
        </div>

        <div class="member-detail-section">
          <div class="member-detail-section-head">
            <h4>Pesan Simulasi</h4>
          </div>
          <div class="table-container">
            <table>
              <thead><tr><th>Waktu</th><th>Jenis</th><th>Isi</th></tr></thead>
              <tbody>${messageRows}</tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <a class="btn btn-secondary" href="/simulasi?phone=${encodeURIComponent(membership.phone)}&name=${encodeURIComponent(membership.name)}" target="_blank">Buka WhatsApp Simulasi</a>
        <button class="btn btn-primary" onclick="closeModal()">Tutup</button>
      </div>
    `;
  } catch (err) {
    container.querySelector('.modal-body').innerHTML = `<div class="empty-state">${escapeHtml(err.message)}</div>`;
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
  } catch (e) {}

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const defaultDate = `${yyyy}-${mm}-${dd}`;

  const container = document.getElementById('modal-container');
  container.innerHTML = `
    <div class="modal-scrim" onclick="if(event.target === this) closeModal()">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Catat Transaksi Member</h3>
          <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <form onsubmit="handleTransactionSubmit(event, ${customerId})">
          <div class="modal-body">
            <div class="member-alert member-alert-info" style="margin-bottom: 14px;">
              Transaksi manual hanya mencatat tanggal aktivitas. Tidak ada pembayaran, POS, atau stok.
            </div>
            <div class="form-group">
              <label class="form-label">Member</label>
              <input type="text" class="form-control" value="${escapeHtml(customerName)}" disabled>
            </div>
            <div class="form-group">
              <label class="form-label">Tanggal Transaksi *</label>
              <input type="date" id="txn-date" class="form-control" value="${defaultDate}" max="${defaultDate}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Kanal</label>
              <select id="txn-channel" class="form-control">
                <option value="DIRECT">Langsung (Outlet)</option>
                <option value="GOFOOD">GoFood</option>
                <option value="GRABFOOD">GrabFood</option>
                <option value="OTHER">Lainnya</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Catatan</label>
              <textarea id="txn-notes" class="form-control" placeholder="Contoh: Beli paket hemat berdua di outlet Margonda."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>
            <button type="submit" class="btn btn-primary">Simpan Transaksi</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

async function handleTransactionSubmit(e, customerId) {
  e.preventDefault();
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

async function handleRunEndMonthPromo() {
  const confirmed = window.confirm('Jalankan promo tanggal tua sekarang? Mode demo memaksa penerbitan kupon meskipun di luar 3 hari terakhir bulan.');
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
        navigate('dashboard');
        return;
      }
    }
  } catch (e) {}

  renderLogin();
}

window.addEventListener('DOMContentLoaded', initApp);
