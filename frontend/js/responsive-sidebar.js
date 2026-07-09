/* =================================================================
   LAUNDRYINT — RESPONSIVE SIDEBAR + BOTTOM NAV v4.0
   Berfungsi di admin.html, karyawan.html, pelanggan.html
   ================================================================= */
(function () {
  'use strict';

  var sidebar, overlay, menuBtn, mobileHeader;

  // ── Sidebar open / close ────────────────────────────────────────
  function openSidebar() {
    if (sidebar)  sidebar.classList.add('open');
    if (overlay)  overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    if (sidebar)  sidebar.classList.remove('open');
    if (overlay)  overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  // ── ESC closes sidebar ──────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeSidebar(); closeActiveModal(); }
  });

  // ── Click-outside closes modal ──────────────────────────────────
  function closeActiveModal() {
    var m = document.querySelector('.modal.active');
    if (m) { m.classList.remove('active'); document.body.style.overflow = ''; }
  }
  document.addEventListener('click', function (e) {
    if (e.target && e.target.classList.contains('modal') && e.target.classList.contains('active')) {
      closeActiveModal();
    }
  });

  // ── Page navigation (menu-item + bottom-nav sync) ───────────────
  function navigateTo(page) {
    if (!page) return;

    // Sidebar items
    document.querySelectorAll('.menu-item[data-page]').forEach(function (el) {
      el.classList.toggle('active', el.dataset.page === page);
    });
    // Bottom nav items
    document.querySelectorAll('.bottom-nav-item[data-page]').forEach(function (el) {
      el.classList.toggle('active', el.dataset.page === page);
    });

    // Update mobile header title
    var activeItem = document.querySelector('.menu-item[data-page="' + page + '"]');
    if (activeItem && mobileHeader) {
      var icon = activeItem.querySelector('i');
      var text = activeItem.textContent.trim();
      var hIcon = document.getElementById('mobileHeaderIcon');
      var hText = document.getElementById('mobileTitleText');
      if (hIcon && icon) { hIcon.className = icon.className; }
      if (hText) { hText.textContent = text; }
    }

    // Close sidebar on mobile after navigating
    if (window.innerWidth <= 768) { closeSidebar(); }

    // Trigger page load if global loadPage exists
    if (typeof window.loadPage === 'function') { window.loadPage(page); }
    else if (typeof window.showPage === 'function') { window.showPage(page); }
  }

  // ── Table wrap: auto-wrap all tables in .table-wrap ─────────────
  function wrapTables(root) {
    (root || document).querySelectorAll('table').forEach(function (tbl) {
      if (tbl.closest('.table-wrap')) return;
      var wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      tbl.parentNode.insertBefore(wrap, tbl);
      wrap.appendChild(tbl);
    });
  }

  // ── Particle generator (optimised) ──────────────────────────────
  function initParticles() {
    var container = document.getElementById('particles');
    if (!container || container.children.length > 0) return;
    var count = window.innerWidth < 600 ? 35 : 70;
    var frag  = document.createDocumentFragment();
    for (var i = 0; i < count; i++) {
      var p = document.createElement('div');
      p.className = 'particle';
      p.style.cssText = 'left:' + (Math.random()*100).toFixed(1) + '%;'
        + '--dl:' + (Math.random()*16).toFixed(1) + 's;'
        + '--pd:' + (Math.random()*10 + 12).toFixed(1) + 's;';
      frag.appendChild(p);
    }
    container.appendChild(frag);
  }

  // ── Clock ────────────────────────────────────────────────────────
  function updateClock() {
    var now   = new Date();
    var tEl   = document.getElementById('currentTime');
    var dEl   = document.getElementById('currentDate');
    if (tEl) tEl.textContent = now.toLocaleTimeString('id-ID');
    if (dEl) dEl.textContent = now.toLocaleDateString('id-ID', {
      weekday:'long', day:'numeric', month:'long', year:'numeric'
    });
  }

  // ── Observe dynamic content (tables added by JS) ─────────────────
  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      m.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        wrapTables(node);
      });
    });
  });

  // ── INIT ─────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    sidebar      = document.getElementById('sidebar') || document.querySelector('.sidebar');
    overlay      = document.getElementById('sidebarOverlay');
    menuBtn      = document.getElementById('mobileMenuBtn');
    mobileHeader = document.getElementById('mobileHeader');

    // Hamburger
    if (menuBtn) {
      menuBtn.addEventListener('click', function () {
        sidebar && sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
      });
    }

    // Overlay click
    if (overlay) {
      overlay.addEventListener('click', closeSidebar);
    }

    // Sidebar menu items
    document.querySelectorAll('.menu-item[data-page]').forEach(function (el) {
      el.addEventListener('click', function () {
        navigateTo(el.dataset.page);
      });
    });

    // Bottom nav items
    document.querySelectorAll('.bottom-nav-item[data-page]').forEach(function (el) {
      el.addEventListener('click', function () {
        navigateTo(el.dataset.page);
      });
    });

    // Initial active sync
    var firstActive = document.querySelector('.menu-item.active');
    if (firstActive && firstActive.dataset.page) {
      var page = firstActive.dataset.page;
      // sync bottom nav
      document.querySelectorAll('.bottom-nav-item[data-page]').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.page === page);
      });
    }

    // Tables
    wrapTables();
    observer.observe(document.body, { childList:true, subtree:true });

    // Particles
    initParticles();

    // Clock
    updateClock();
    setInterval(updateClock, 1000);

    // Close sidebar when resized to desktop
    window.addEventListener('resize', function () {
      if (window.innerWidth > 768) { closeSidebar(); }
    });
  });

  // Expose helpers globally
  window.closeSidebar   = closeSidebar;
  window.openSidebar    = openSidebar;
  window.navigateTo     = navigateTo;
  window.wrapTables     = wrapTables;

})();