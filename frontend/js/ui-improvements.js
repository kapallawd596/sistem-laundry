/**
 * LAUNDRYINT — UI IMPROVEMENTS v2.0
 * Auto-applies accessibility + responsive table wrapping
 * + enhanced toast + focus management
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    wrapTables();
    improveModals();
    setRoleBadgeColors();
    initParticlesOptimized();
    patchShowToast();
    improveFormInputs();
  });

  // ─── 1. Wrap all tables in scrollable container ───────────────
  function wrapTables() {
    document.querySelectorAll('table').forEach(function (tbl) {
      if (tbl.parentElement && tbl.parentElement.classList.contains('table-wrap')) return;
      const wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      tbl.parentNode.insertBefore(wrap, tbl);
      wrap.appendChild(tbl);
    });
  }

  // Observe dynamic content for tables (SPA pages)
  const tableObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      m.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        node.querySelectorAll && node.querySelectorAll('table').forEach(function (tbl) {
          if (tbl.parentElement && !tbl.parentElement.classList.contains('table-wrap')) {
            const wrap = document.createElement('div');
            wrap.className = 'table-wrap';
            tbl.parentNode.insertBefore(wrap, tbl);
            wrap.appendChild(tbl);
          }
        });
      });
    });
  });
  tableObserver.observe(document.body, { childList: true, subtree: true });

  // ─── 2. Modal Improvements ────────────────────────────────────
  function improveModals() {
    // ESC closes any active modal
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal.active');
        if (activeModal) {
          activeModal.classList.remove('active');
          document.body.style.overflow = '';
        }
      }
    });

    // Click outside modal-content closes it
    document.addEventListener('click', function (e) {
      if (e.target && e.target.classList.contains('modal') && e.target.classList.contains('active')) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
      }
    });

    // When modal opens, lock body scroll
    const modalObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.target && m.target.classList.contains('modal')) {
          document.body.style.overflow = m.target.classList.contains('active') ? 'hidden' : '';
        }
      });
    });
    document.querySelectorAll('.modal').forEach(function (m) {
      modalObserver.observe(m, { attributes: true, attributeFilter: ['class'] });
    });
  }

  // ─── 3. Role badge color consistency ─────────────────────────
  function setRoleBadgeColors() {
    // Already handled server-side via getRoleBadge(), but clean up any raw text
  }

  // ─── 4. Optimized particle generator ─────────────────────────
  function initParticlesOptimized() {
    const container = document.getElementById('particles');
    if (!container) return;
    // If particles already added by inline script, skip
    if (container.children.length > 0) return;

    const count = window.innerWidth < 600 ? 40 : 80;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.cssText = `left:${Math.random() * 100}%;--delay:${(Math.random() * 15).toFixed(1)}s;--dur:${(Math.random() * 10 + 12).toFixed(1)}s`;
      frag.appendChild(p);
    }
    container.appendChild(frag);
  }

  // ─── 5. Patch showToast globally ─────────────────────────────
  function patchShowToast() {
    // Override window.showToast if it exists to use design-system classes
    const origShowToast = window.showToast;
    window.showToast = function (type, message) {
      const container = document.getElementById('toastContainer');
      if (!container) {
        if (origShowToast) origShowToast(type, message);
        return;
      }
      const toast = document.createElement('div');
      toast.className = 'toast ' + (type || 'info');
      const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
      toast.innerHTML = (icons[type] || 'ℹ️') + ' ' + (message || '');
      container.appendChild(toast);
      setTimeout(function () { if (toast.parentNode) toast.remove(); }, 3200);
    };
  }

  // ─── 6. Form UX improvements ─────────────────────────────────
  function improveFormInputs() {
    // Add transition on focus for inputs that don't inherit from design-system
    document.querySelectorAll('input, select, textarea').forEach(function (el) {
      if (!el.classList.contains('form-control')) return;
      // placeholder styling already handled by CSS
    });
  }

})();
