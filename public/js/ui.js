// Bro Chicken CRM - shared UI component layer
// All app views render through these helpers so spacing, hierarchy, dialogs,
// and feedback stay consistent across modules.

const UI = (() => {
  const ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
  }

  function formatDateIndo(isoStr) {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      if (Number.isNaN(d.getTime())) return String(isoStr);
      return d.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      return String(isoStr);
    }
  }

  function toast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const tone = type === 'error' ? 'error' : (type === 'info' ? 'info' : 'success');
    const el = document.createElement('div');
    el.className = `toast toast--${tone}`;
    el.setAttribute('role', 'status');
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.remove();
    }, 4200);
  }

  let modalState = null;

  function closeModal(silent = false) {
    const container = document.getElementById('modal-container');
    const state = modalState;
    modalState = null;

    if (state && state.keyHandler) {
      document.removeEventListener('keydown', state.keyHandler);
    }
    if (container) container.innerHTML = '';
    document.body.classList.remove('modal-open');

    if (!silent && state && state.previousFocus && typeof state.previousFocus.focus === 'function') {
      const previous = state.previousFocus;
      setTimeout(() => previous.focus(), 0);
    }
    if (!silent && state && typeof state.onClose === 'function') {
      state.onClose();
    }
  }

  function openModal(options = {}) {
    const {
      title = '',
      subtitle = '',
      body = '',
      footer = '',
      size = '',
      onMount = null,
      onClose = null
    } = options;

    closeModal(true);

    const container = document.getElementById('modal-container');
    if (!container) return null;

    const previousFocus = document.activeElement;
    const sizeClass = size ? ` modal-${size}` : '';
    container.innerHTML = `
      <div class="modal-scrim" data-modal-scrim>
        <div class="modal${sizeClass}" role="dialog" aria-modal="true" aria-labelledby="ui-modal-title">
          <div class="modal-header">
            <div>
              <h2 class="modal-title" id="ui-modal-title">${escapeHtml(title)}</h2>
              ${subtitle ? `<p class="modal-subtitle">${escapeHtml(subtitle)}</p>` : ''}
            </div>
            <button type="button" class="modal-close" aria-label="Tutup dialog" onclick="closeModal()">&times;</button>
          </div>
          <div class="modal-body">${body}</div>
          ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
        </div>
      </div>
    `;

    document.body.classList.add('modal-open');

    const scrim = container.querySelector('[data-modal-scrim]');
    const modal = container.querySelector('.modal');

    if (scrim) {
      scrim.addEventListener('mousedown', (event) => {
        if (event.target === scrim) closeModal();
      });
    }

    function focusables() {
      if (!modal) return [];
      return Array.from(modal.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter((el) => el.offsetParent !== null || el === document.activeElement);
    }

    function keyHandler(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    modalState = { previousFocus, keyHandler, onClose };
    document.addEventListener('keydown', keyHandler);

    if (typeof onMount === 'function') onMount(modal);

    const autoFocus = modal && modal.querySelector('input:not([type="hidden"]), select, textarea, button');
    if (autoFocus) autoFocus.focus();

    return modal;
  }

  function confirm(options = {}) {
    const {
      title = 'Konfirmasi tindakan',
      message = '',
      confirmLabel = 'Lanjutkan',
      cancelLabel = 'Batal',
      danger = false,
      note = ''
    } = options;

    return new Promise((resolve) => {
      let settled = false;
      const settle = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      const modal = openModal({
        title,
        size: 'sm',
        body: `
          <p class="confirm-message">${escapeHtml(message)}</p>
          ${note ? `<div class="notice notice-warning">${escapeHtml(note)}</div>` : ''}
        `,
        footer: `
          <button type="button" class="btn btn-secondary" data-confirm-cancel>${escapeHtml(cancelLabel)}</button>
          <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-confirm-ok>${escapeHtml(confirmLabel)}</button>
        `,
        onClose: () => settle(false)
      });

      if (!modal) {
        settle(false);
        return;
      }
      const cancelBtn = modal.querySelector('[data-confirm-cancel]');
      const okBtn = modal.querySelector('[data-confirm-ok]');
      if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal());
      if (okBtn) okBtn.addEventListener('click', () => {
        settle(true);
        if (modalState) modalState.onClose = null;
        closeModal();
      });
    });
  }

  function prompt(options = {}) {
    const {
      title = 'Masukkan data',
      label = '',
      value = '',
      placeholder = '',
      help = '',
      confirmLabel = 'Simpan',
      required = true,
      multiline = false
    } = options;

    return new Promise((resolve) => {
      let settled = false;
      const settle = (result) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };

      const modal = openModal({
        title,
        body: `
          <form id="ui-prompt-form">
            <div class="field">
              ${label ? `<label class="label" for="ui-prompt-input">${escapeHtml(label)}</label>` : ''}
              ${multiline
                ? `<textarea id="ui-prompt-input" class="textarea" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value)}</textarea>`
                : `<input id="ui-prompt-input" class="input" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}">`}
              ${help ? `<p class="helper">${escapeHtml(help)}</p>` : ''}
            </div>
          </form>
        `,
        footer: `
          <button type="button" class="btn btn-secondary" data-prompt-cancel>Batal</button>
          <button type="submit" class="btn btn-primary" form="ui-prompt-form">${escapeHtml(confirmLabel)}</button>
        `,
        onClose: () => settle(null)
      });

      if (!modal) {
        settle(null);
        return;
      }

      const form = modal.querySelector('#ui-prompt-form');
      const input = modal.querySelector('#ui-prompt-input');
      const cancelBtn = modal.querySelector('[data-prompt-cancel]');

      if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal());
      if (form && input) {
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          const text = input.value.trim();
          if (required && !text) {
            input.focus();
            return;
          }
          settle(text);
          if (modalState) modalState.onClose = null;
          closeModal();
        });
      }
    });
  }

  function pageHeader({ title, description = '', actions = '' }) {
    return `
      <div class="page-header">
        <div class="page-header-main">
          <h1 class="page-title">${escapeHtml(title)}</h1>
          ${description ? `<p class="page-description">${escapeHtml(description)}</p>` : ''}
        </div>
        ${actions ? `<div class="page-actions">${actions}</div>` : ''}
      </div>
    `;
  }

  function recordHeader({ backLabel = '', backAction = '', initials = '', title = '', meta = '', actions = '' }) {
    return `
      ${backLabel ? `<button type="button" class="back-link" onclick="${backAction}">&larr; ${escapeHtml(backLabel)}</button>` : ''}
      <div class="record-header">
        <div class="record-identity">
          ${initials ? `<span class="avatar" aria-hidden="true">${escapeHtml(initials)}</span>` : ''}
          <div>
            <div class="record-title">${title}</div>
            ${meta ? `<div class="record-meta">${meta}</div>` : ''}
          </div>
        </div>
        ${actions ? `<div class="page-actions">${actions}</div>` : ''}
      </div>
    `;
  }

  function section({ title = '', description = '', actions = '', body = '', className = '' }) {
    return `
      <section class="section ${className}">
        ${(title || actions) ? `
          <div class="section-head">
            <div class="section-head-main">
              ${title ? `<h2 class="section-title">${escapeHtml(title)}</h2>` : ''}
              ${description ? `<p class="section-description">${escapeHtml(description)}</p>` : ''}
            </div>
            ${actions ? `<div class="section-actions">${actions}</div>` : ''}
          </div>
        ` : ''}
        ${body}
      </section>
    `;
  }

  function metricItems(items = []) {
    return items.map((item) => `
      <div class="metric${item.tone ? ` metric--${item.tone}` : ''}">
        <div class="metric-label">${escapeHtml(item.label)}</div>
        <div class="metric-value">${item.value}${item.unit ? `<span class="metric-value-unit">${escapeHtml(item.unit)}</span>` : ''}</div>
        ${item.note ? `<div class="metric-note">${escapeHtml(item.note)}</div>` : ''}
      </div>
    `).join('');
  }

  function metrics(items = []) {
    return `<div class="metrics">${metricItems(items)}</div>`;
  }

  function badge(text, tone = 'neutral') {
    return `<span class="badge badge-${tone}">${escapeHtml(text)}</span>`;
  }

  function state({ title = '', hint = '', action = '', tone = '' }) {
    return `
      <div class="state${tone ? ` state--${tone}` : ''}">
        <div class="state-title">${escapeHtml(title)}</div>
        ${hint ? `<p class="state-hint">${escapeHtml(hint)}</p>` : ''}
        ${action ? `<div class="state-action">${action}</div>` : ''}
      </div>
    `;
  }

  function loading(hint = 'Memuat data...') {
    return `
      <div class="state">
        <div class="loading-line"><span class="spinner" aria-hidden="true"></span>${escapeHtml(hint)}</div>
      </div>
    `;
  }

  function tableState(colspan, options) {
    return `<tr><td colspan="${colspan}">${state(options)}</td></tr>`;
  }

  function pagination({ page, totalPages, total, limit, label, handler }) {
    if (!total) return '';
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    return `
      <div class="pagination-info">Menampilkan ${start} - ${end} dari ${total} ${escapeHtml(label)}</div>
      <div class="pagination-actions">
        <button type="button" class="btn btn-secondary btn-sm" ${page <= 1 ? 'disabled' : ''} onclick="${handler}(${page - 1})">Sebelumnya</button>
        <button type="button" class="btn btn-secondary btn-sm" ${page >= totalPages ? 'disabled' : ''} onclick="${handler}(${page + 1})">Selanjutnya</button>
      </div>
    `;
  }

  return {
    escapeHtml,
    formatDateIndo,
    toast,
    openModal,
    closeModal,
    confirm,
    prompt,
    pageHeader,
    recordHeader,
    section,
    metrics,
    metricItems,
    badge,
    state,
    loading,
    tableState,
    pagination
  };
})();
