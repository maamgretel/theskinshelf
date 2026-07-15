/* ============================================================
   The Skin Shelf — shared store front-end module (TSS)
   Header, footer, toasts, cart + wishlist state, helpers.
   Depends on config.js (window.API_BASE) loaded first.
   ============================================================ */
(function () {
  const API = window.API_BASE;
  const inPages = location.pathname.replace(/\\/g, '/').includes('/pages/');

  const TSS = {
    API,
    // ---- path helpers (work from / and /pages/) ----
    page(name) { return inPages ? name : 'pages/' + name; },
    home() { return inPages ? '../index.html' : 'index.html'; },

    // ---- auth ----
    user() { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } },
    isLoggedIn() { return !!(this.user() && this.user().id); },
    authHeaders() {
      const u = this.user();
      return u ? { 'X-User-ID': String(u.id), 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
    },
    requireLogin(msg) {
      if (this.isLoggedIn()) return true;
      this.toast(msg || 'Please sign in to continue', 'info');
      sessionStorage.setItem('returnTo', location.href);
      setTimeout(() => { location.href = this.page('login.html'); }, 900);
      return false;
    },
    logout() {
      localStorage.removeItem('user');
      sessionStorage.removeItem('sellerId');
      location.href = this.page('login.html');
    },

    // ---- formatting ----
    money(n) {
      const v = Number(n || 0);
      return '₱' + v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    // stable pseudo-rating (no ratings table yet) — deterministic per product
    rating(id) {
      const seed = Number(id) || 1;
      const r = 4.2 + ((seed * 37) % 8) / 10; // 4.2 – 4.9
      const count = 12 + ((seed * 53) % 240);
      return { stars: Math.round(r * 2) / 2, value: r.toFixed(1), count };
    },
    starHtml(stars) {
      let h = '';
      for (let i = 1; i <= 5; i++) {
        if (stars >= i) h += '★';
        else if (stars >= i - 0.5) h += '⯨';
        else h += '☆';
      }
      return h.replace(/⯨/g, '★'); // half rounds up visually
    },

    // ---- wishlist (localStorage) ----
    wishlist() { try { return JSON.parse(localStorage.getItem('wishlist')) || []; } catch { return []; } },
    inWishlist(id) { return this.wishlist().includes(Number(id)); },
    toggleWishlist(id) {
      id = Number(id);
      let w = this.wishlist();
      const has = w.includes(id);
      w = has ? w.filter(x => x !== id) : [...w, id];
      localStorage.setItem('wishlist', JSON.stringify(w));
      this.updateBadges();
      this.toast(has ? 'Removed from wishlist' : 'Saved to wishlist ♥', has ? 'info' : 'success');
      return !has;
    },

    // ---- cart ----
    async cartCount() {
      if (!this.isLoggedIn()) return 0;
      try {
        const r = await fetch(`${API}/api/cart/count`, { headers: this.authHeaders() });
        if (!r.ok) return 0;
        const d = await r.json();
        return d.count || 0;
      } catch { return 0; }
    },
    async addToCart(productId, qty = 1, btn) {
      if (!this.requireLogin('Please sign in to add items to your bag')) return false;
      if (btn) { btn.disabled = true; btn.dataset._t = btn.innerHTML; btn.innerHTML = '…'; }
      try {
        const r = await fetch(`${API}/api/cart`, {
          method: 'POST', headers: this.authHeaders(),
          body: JSON.stringify({ product_id: Number(productId), quantity: Number(qty) })
        });
        const d = await r.json().catch(() => ({}));
        if (r.ok) {
          this.toast('Added to your bag', 'success');
          await this.updateBadges();
          return true;
        }
        this.toast(d.message || d.error || 'Could not add to bag', 'error');
        return false;
      } catch {
        this.toast('Network error — is the backend running?', 'error');
        return false;
      } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = btn.dataset._t || '+'; }
      }
    },

    // ---- toast ----
    toast(message, type = 'success', ms = 2600) {
      let wrap = document.querySelector('.toast-wrap');
      if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
      const el = document.createElement('div');
      el.className = `toast ${type}`;
      const icon = type === 'success' ? '✓' : type === 'error' ? '!' : 'i';
      el.innerHTML = `<span class="ic">${icon}</span><span>${message}</span>`;
      wrap.appendChild(el);
      requestAnimationFrame(() => el.classList.add('show'));
      setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, ms);
    },

    // ---- badges (cart + wishlist counts in header) ----
    async updateBadges() {
      const wc = this.wishlist().length;
      const wEl = document.getElementById('wish-count');
      if (wEl) { wEl.textContent = wc; wEl.style.display = wc ? 'flex' : 'none'; }
      const cEl = document.getElementById('cart-count');
      if (cEl) {
        const c = await this.cartCount();
        cEl.textContent = c; cEl.style.display = c ? 'flex' : 'none';
      }
    },

    // ---- header ----
    mountHeader(active) {
      const host = document.getElementById('app-header');
      if (!host) return;
      const u = this.user();
      const DEFAULT_AV = 'https://res.cloudinary.com/dwgvlwkyt/image/upload/v1751856106/default-avatar.jpg';
      const account = u
        ? `<a class="avatar-chip" href="${this.page('profile.html')}" title="Account">
             <img src="${u.profile_pic || DEFAULT_AV}" onerror="this.src='${DEFAULT_AV}'" alt="">
             <span class="nm">${u.name || 'Account'}</span>
           </a>
           <button class="icon-btn" id="hdr-logout" title="Sign out" aria-label="Sign out">${ICON.logout}</button>`
        : `<a class="btn btn-primary btn-sm" href="${this.page('login.html')}">Sign in</a>`;

      host.innerHTML = `
      <header class="site-header">
        <div class="container bar">
          <a class="brand" href="${this.home()}"><span class="dot"></span> The Skin Shelf</a>
          <nav class="nav-links">
            <a href="${this.home()}" data-nav="home">Home</a>
            <a href="${this.page('customer_dashboard.html')}" data-nav="shop">Shop</a>
            <a href="${this.page('my_orders.html')}" data-nav="orders">Orders</a>
            <a href="${this.home()}#about" data-nav="about">About</a>
          </nav>
          <div class="header-actions">
            <a class="icon-btn" href="${this.page('customer_dashboard.html')}#wishlist" title="Wishlist" aria-label="Wishlist">
              ${ICON.heart}<span class="count" id="wish-count" style="display:none">0</span>
            </a>
            <a class="icon-btn" href="${this.page('bag.html')}" title="Bag" aria-label="Bag">
              ${ICON.bag}<span class="count" id="cart-count" style="display:none">0</span>
            </a>
            ${account}
          </div>
        </div>
      </header>`;

      const navEl = host.querySelector(`[data-nav="${active}"]`);
      if (navEl) navEl.classList.add('active');
      const lo = document.getElementById('hdr-logout');
      if (lo) lo.addEventListener('click', () => this.logout());
      this.updateBadges();
    },

    // ---- product card ----
    productCardHTML(p) {
      const r = this.rating(p.id);
      const stock = Number(p.stock || 0);
      const cat = p.category_name || 'Skincare';
      const wished = this.inWishlist(p.id) ? 'active' : '';
      const badge = stock <= 0
        ? '<span class="pc-badge out">Sold out</span>'
        : stock <= 5 ? `<span class="pc-badge low">Only ${stock} left</span>` : '';
      const img = p.image || window.TSS_PLACEHOLDER;
      const link = this.page('product_view.html') + '?id=' + p.id;
      return `
      <article class="product-card" data-id="${p.id}">
        <a class="pc-media" href="${link}">
          <span class="pc-cat">${cat}</span>
          <img src="${img}" alt="${(p.name || '').replace(/"/g, '&quot;')}" loading="lazy"
               onerror="this.src=window.TSS_PLACEHOLDER">
          ${badge}
        </a>
        <button class="pc-wish ${wished}" data-wish="${p.id}" aria-label="Save to wishlist" title="Save to wishlist">♥</button>
        <div class="pc-body">
          <div class="pc-rating"><span class="pc-stars">${this.starHtml(r.stars)}</span><span>${r.value} (${r.count})</span></div>
          <a href="${link}" class="pc-title">${p.name || 'Product'}</a>
          <div class="pc-foot">
            <span class="pc-price">${this.money(p.price)}</span>
            <button class="pc-add" data-add="${p.id}" ${stock <= 0 ? 'disabled' : ''}
                    aria-label="Add to bag" title="Add to bag">${stock <= 0 ? '×' : '+'}</button>
          </div>
        </div>
      </article>`;
    },
    bindProductGrid(container) {
      if (!container || container._bound) return;
      container._bound = true;
      container.addEventListener('click', (e) => {
        const addBtn = e.target.closest('[data-add]');
        if (addBtn) { e.preventDefault(); this.addToCart(addBtn.dataset.add, 1, addBtn); return; }
        const wishBtn = e.target.closest('[data-wish]');
        if (wishBtn) {
          e.preventDefault();
          const now = this.toggleWishlist(wishBtn.dataset.wish);
          wishBtn.classList.toggle('active', now);
        }
      });
    },

    // ---- footer ----
    mountFooter() {
      const host = document.getElementById('app-footer');
      if (!host) return;
      host.innerHTML = `
      <footer class="site-footer">
        <div class="container cols">
          <div>
            <div class="brand"><span class="dot"></span> The Skin Shelf</div>
            <p style="max-width:34ch">Clean, effective skincare — thoughtfully curated for your daily ritual. Glow, naturally.</p>
          </div>
          <div>
            <h4>Shop</h4>
            <a href="${this.page('customer_dashboard.html')}">All products</a>
            <a href="${this.page('customer_dashboard.html')}?category=3">Serums</a>
            <a href="${this.page('customer_dashboard.html')}?category=4">Moisturizers</a>
            <a href="${this.page('customer_dashboard.html')}?category=5">Sunscreen</a>
          </div>
          <div>
            <h4>Account</h4>
            <a href="${this.page('profile.html')}">My profile</a>
            <a href="${this.page('my_orders.html')}">My orders</a>
            <a href="${this.page('bag.html')}">My bag</a>
          </div>
          <div>
            <h4>Help</h4>
            <a href="${this.home()}#about">About us</a>
            <a href="${this.home()}#about">Shipping</a>
            <a href="${this.home()}#about">Returns</a>
          </div>
        </div>
        <div class="container fine">
          <span>© 2026 The Skin Shelf. A student project.</span>
          <span>Made with care in Cebu 🇵🇭</span>
        </div>
      </footer>`;
    }
  };

  const ICON = {
    heart: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
    bag: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
    logout: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>'
  };

  window.TSS = TSS;
  document.addEventListener('DOMContentLoaded', () => TSS.updateBadges());
})();
