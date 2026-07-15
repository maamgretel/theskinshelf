/* ============================================================
   The Skin Shelf — seller studio module
   Depends on config.js + store.js (TSS.*) loaded first.
   ============================================================ */
(function () {
  const S = {
    // Block the page unless a seller is signed in.
    requireSeller() {
      const u = TSS.user();
      if (!u || !u.id) {
        sessionStorage.setItem('returnTo', location.href);
        location.href = 'login.html';
        return false;
      }
      if (u.role !== 'seller') {
        TSS.toast('Seller account required', 'error');
        setTimeout(() => { location.href = u.role === 'admin' ? 'admin_dashboard.html' : 'customer_dashboard.html'; }, 900);
        return false;
      }
      return true;
    },

    mountTopbar(active) {
      const host = document.getElementById('seller-header');
      if (!host) return;
      const u = TSS.user() || {};
      const DEFAULT_AV = 'https://res.cloudinary.com/dwgvlwkyt/image/upload/v1751856106/default-avatar.jpg';
      host.innerHTML = `
      <header class="seller-topbar">
        <div class="container bar">
          <a class="brand" href="seller_dashboard.html"><span class="dot"></span> The Skin Shelf</a>
          <span class="mode">Seller Studio</span>
          <nav>
            <a href="seller_dashboard.html" data-nav="dashboard">Dashboard</a>
            <a href="product_seller.html" data-nav="products">Products</a>
            <a href="orders.html" data-nav="orders">Orders</a>
            <a href="notifications.html" data-nav="notifications">Notifications</a>
          </nav>
          <div class="actions">
            <a class="view-store" href="customer_dashboard.html" title="See your shop as customers do">View store ↗</a>
            <a class="avatar-chip" href="profile_seller.html" title="Profile">
              <img src="${u.profile_pic || DEFAULT_AV}" onerror="this.src='${DEFAULT_AV}'" alt="">
              <span class="nm">${u.name || 'Seller'}</span>
            </a>
            <button class="icon-btn" id="seller-logout" title="Sign out" aria-label="Sign out">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>
            </button>
          </div>
        </div>
      </header>`;
      const nav = host.querySelector(`[data-nav="${active}"]`);
      if (nav) nav.classList.add('active');
      document.getElementById('seller-logout').onclick = () => TSS.logout();
    },

    // ---- admin ----
    requireAdmin() {
      const u = TSS.user();
      if (!u || !u.id) { sessionStorage.setItem('returnTo', location.href); location.href = 'login.html'; return false; }
      if (u.role !== 'admin') {
        TSS.toast('Admin account required', 'error');
        setTimeout(() => { location.href = u.role === 'seller' ? 'seller_dashboard.html' : 'customer_dashboard.html'; }, 900);
        return false;
      }
      return true;
    },

    mountAdminTopbar(active) {
      const host = document.getElementById('admin-header');
      if (!host) return;
      const u = TSS.user() || {};
      const DEFAULT_AV = 'https://res.cloudinary.com/dwgvlwkyt/image/upload/v1751856106/default-avatar.jpg';
      host.innerHTML = `
      <header class="seller-topbar admin">
        <div class="container bar">
          <a class="brand" href="admin_dashboard.html"><span class="dot"></span> The Skin Shelf</a>
          <span class="mode">Admin</span>
          <nav>
            <a href="admin_dashboard.html" data-nav="dashboard">Dashboard</a>
            <a href="admin_orders.html" data-nav="orders">Orders</a>
            <a href="sellers.html" data-nav="sellers">Sellers</a>
            <a href="customer.html" data-nav="customers">Customers</a>
            <a href="products.html" data-nav="products">Products</a>
          </nav>
          <div class="actions">
            <a class="view-store" href="customer_dashboard.html">View store ↗</a>
            <span class="avatar-chip"><img src="${u.profile_pic || DEFAULT_AV}" onerror="this.src='${DEFAULT_AV}'" alt=""><span class="nm">${u.name || 'Admin'}</span></span>
            <button class="icon-btn" id="admin-logout" title="Sign out" aria-label="Sign out">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>
            </button>
          </div>
        </div>
      </header>`;
      const nav = host.querySelector(`[data-nav="${active}"]`);
      if (nav) nav.classList.add('active');
      document.getElementById('admin-logout').onclick = () => TSS.logout();
    },

    statusBadge(status) {
      const map = {
        'Pending':   'badge-warn',
        'Shipped':   'badge-info',
        'Delivered': 'badge-success',
        'Cancelled': 'badge-danger',
      };
      return `<span class="badge ${map[status] || 'badge-muted'}">${status || '—'}</span>`;
    },

    stockBadge(stock) {
      const s = Number(stock || 0);
      if (s <= 0)  return '<span class="badge badge-danger">Out of stock</span>';
      if (s <= 10) return `<span class="badge badge-warn">${s} left</span>`;
      return `<span class="badge badge-success">${s} in stock</span>`;
    },

    // Simple modal. Returns a close() function; wire your own buttons inside html.
    modal(html) {
      const veil = document.createElement('div');
      veil.className = 'modal-veil';
      veil.innerHTML = `<div class="modal-box">${html}</div>`;
      document.body.appendChild(veil);
      const close = () => veil.remove();
      veil.addEventListener('click', (e) => { if (e.target === veil) close(); });
      return { el: veil, close };
    },

    confirm(title, sub, okLabel, danger = false) {
      return new Promise(resolve => {
        const m = this.modal(`
          <h3>${title}</h3>
          <div class="sub">${sub}</div>
          <div class="modal-actions">
            <button class="btn btn-soft" data-x="no">Cancel</button>
            <button class="btn ${danger ? 'btn-accent' : 'btn-primary'}" data-x="yes">${okLabel}</button>
          </div>`);
        m.el.querySelector('[data-x="no"]').onclick = () => { m.close(); resolve(false); };
        m.el.querySelector('[data-x="yes"]').onclick = () => { m.close(); resolve(true); };
      });
    },

    fmtDate(d) {
      try { return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }); }
      catch { return d || '—'; }
    },

    async api(path, opts = {}) {
      const r = await fetch(`${TSS.API}${path}`, { headers: TSS.authHeaders(), ...opts });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || d.message || `Request failed (${r.status})`);
      return d;
    },
  };

  window.SELLER = S;
})();
