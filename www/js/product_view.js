document.addEventListener('DOMContentLoaded', () => {
    const API = 'https://backend-rj0a.onrender.com';
    const pc = document.getElementById('product-container');
    const ls = document.getElementById('loading-spinner');
    const rpc = document.getElementById('related-products-container');
    const rps = document.getElementById('related-products-section');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user) return window.location.href = 'login.html';

    const pid = new URLSearchParams(window.location.search).get('id');
    if (!pid) {
        pc.innerHTML = '<div class="alert alert-danger">Product ID not found.</div>';
        return ls.style.display = 'none';
    }

    const showModal = (html, handlers) => {
        const existing = document.getElementById('modal');
        if (existing) existing.remove();

        const m = document.createElement('div');
        m.id = 'modal';
        m.innerHTML = `<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center">${html}</div>`;
        document.body.appendChild(m);
        document.body.style.overflow = 'hidden';

        const close = () => {
            m.remove();
            document.body.style.overflow = 'auto';
        };

        Object.entries(handlers).forEach(([id, fn]) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', fn === 'close' ? close : () => { close(); fn(); });
        });

        m.addEventListener('click', e => e.target === m && close());
        const esc = e => e.key === 'Escape' && (close(), document.removeEventListener('keydown', esc));
        document.addEventListener('keydown', esc);
    };

    const showCartModal = (eq, rq, name, stock, onConfirm) => {
        const total = eq + rq;
        const exceed = total > stock;
        showModal(`<div style="background:white;border-radius:8px;max-width:550px;width:90%;box-shadow:0 10px 25px rgba(0,0,0,0.3)">
            <div style="padding:20px;border-bottom:1px solid #dee2e6;background:#f8f9fa;display:flex;justify-content:space-between;align-items:center">
                <h5 class="${exceed ? 'text-warning' : 'text-info'}" style="margin:0"><i class="fas fa-${exceed ? 'exclamation-triangle' : 'info-circle'} mr-2"></i>${exceed ? 'Stock Limit Warning' : 'Item Already in Bag'}</h5>
                <button id="closeBtn" style="background:none;border:none;font-size:24px;cursor:pointer;color:#6c757d">&times;</button>
            </div>
            <div style="padding:30px 20px">
                <div class="text-center mb-3"><i class="fas fa-shopping-bag" style="font-size:3rem;color:#007bff"></i></div>
                <div style="background:#f8f9fa;padding:20px;border-radius:6px;margin-bottom:20px">
                    <h6 style="margin:0 0 10px 0">Current Status:</h6>
                    <p style="margin:0;font-size:14px">You have <strong>${eq}</strong> ${eq === 1 ? 'item' : 'items'} of "<strong>${name}</strong>" in your bag.</p>
                </div>
                <div style="text-align:center;margin-bottom:20px">
                    <p style="font-size:16px;margin-bottom:10px">You're trying to add <strong>${rq}</strong> more.</p>
                    <p style="font-size:16px;margin-bottom:15px">Total would be: <strong>${total}</strong></p>
                    <div style="background:${exceed ? '#fff3cd' : '#d1ecf1'};border:1px solid ${exceed ? '#ffeaa7' : '#bee5eb'};padding:15px;border-radius:6px;color:${exceed ? '#856404' : '#0c5460'}">
                        <i class="fas fa-${exceed ? 'exclamation-triangle' : 'check-circle'} mr-2"></i>
                        ${exceed ? `<strong>Warning:</strong> Only <strong>${stock}</strong> in stock. Adding ${rq} more would exceed inventory.` : `Stock available: <strong>${stock}</strong>`}
                    </div>
                </div>
            </div>
            <div style="padding:20px;border-top:1px solid #dee2e6;display:flex;justify-content:center;gap:10px">
                <button id="cancelBtn" class="btn btn-secondary"><i class="fas fa-times mr-2"></i>Cancel</button>
                ${!exceed ? `<button id="confirmBtn" class="btn btn-success"><i class="fas fa-plus mr-2"></i>Yes, Add ${rq} More</button>` : ''}
            </div>
        </div>`, { closeBtn: 'close', cancelBtn: 'close', ...(exceed ? {} : { confirmBtn: onConfirm }) });
    };

    const showStockError = (rq, stock, name) => {
        showModal(`<div style="background:white;border-radius:8px;max-width:500px;width:90%;box-shadow:0 10px 25px rgba(0,0,0,0.3)">
            <div style="padding:20px;border-bottom:1px solid #dee2e6;display:flex;justify-content:space-between;align-items:center">
                <h5 class="text-danger" style="margin:0"><i class="fas fa-exclamation-triangle mr-2"></i>Insufficient Stock</h5>
                <button id="closeBtn" style="background:none;border:none;font-size:24px;cursor:pointer;color:#6c757d">&times;</button>
            </div>
            <div class="text-center" style="padding:30px 20px">
                <i class="fas fa-box-open" style="font-size:3rem;color:#6c757d;margin-bottom:1rem"></i>
                <p style="font-size:16px">You requested <strong>${rq}</strong> ${rq > 1 ? 'items' : 'item'} of "<strong>${name}</strong>", but we only have <strong>${stock}</strong> in stock.</p>
            </div>
            <div style="padding:20px;border-top:1px solid #dee2e6;text-align:center">
                <button id="okBtn" class="btn btn-primary"><i class="fas fa-check mr-2"></i>Got it</button>
            </div>
        </div>`, { closeBtn: 'close', okBtn: 'close' });

        setTimeout(() => {
            const qi = document.getElementById('quantity-input');
            if (qi && stock > 0) qi.value = Math.min(stock, parseInt(qi.value) || 1);
        }, 100);
    };

    const checkCart = async (pid) => {
        try {
            const r = await fetch(`${API}/api/cart`, { headers: { 'Content-Type': 'application/json', 'X-User-ID': user.id.toString() } });
            if (r.ok) {
                const items = await r.json();
                const item = items.find(i => i.product_id.toString() === pid.toString());
                return item ? item.quantity : 0;
            }
        } catch (e) { console.error('Cart check error:', e); }
        return 0;
    };

    const fetchProduct = async () => {
        try {
            const r = await fetch(`${API}/api/products/${pid}`, { headers: { 'Content-Type': 'application/json', 'X-User-ID': user.id.toString() } });
            if (r.status === 401) throw new Error('Unauthorized. Please log in again.');
            if (!r.ok) throw new Error('Product not found or server error.');
            renderProduct(await r.json());
        } catch (e) {
            pc.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
        } finally {
            ls.style.display = 'none';
        }
    };

    const renderProduct = (data) => {
        const p = data.details;
        const rel = data.related;
        const stock = Number(p?.stock || 0);

        document.title = p.name;

        pc.innerHTML = `<div class="row"><div class="col-md-5"><img src="${p.image || '../assets/default-product.png'}" alt="${p.name}" class="product-image-main"></div>
            <div class="col-md-7"><h1 class="product-title">${p.name}</h1>
                <div class="d-flex align-items-center my-3"><div class="text-warning"><i class="fas fa-star"></i> <i class="fas fa-star"></i> <i class="fas fa-star"></i> <i class="fas fa-star"></i> <i class="fas fa-star-half-alt"></i></div>
                <span class="text-muted ml-2">(Ratings placeholder)</span></div>
                <div class="price-section my-4"><h2 class="current-price">₱${parseFloat(p.price).toFixed(2)}</h2></div>
                <div class="form-group row"><label class="col-sm-3 col-form-label">Quantity</label>
                    <div class="col-sm-9 quantity-selector"><button class="btn btn-light" id="minus-btn">-</button>
                        <input type="number" class="form-control" id="quantity-input" value="1" min="1" max="${stock}">
                        <button class="btn btn-light" id="plus-btn">+</button>
                        <span class="ml-3 text-muted ${stock <= 5 ? 'text-warning' : ''}">Stock: ${stock}${stock <= 5 ? ' (Limited stock!)' : ''}</span>
                    </div></div>
                <div class="action-buttons mt-4"><button class="btn btn-outline-primary" id="add-to-bag-btn" ${stock <= 0 ? 'disabled' : ''}><i class="fas fa-shopping-bag mr-2"></i>Add to Bag</button></div>
            </div></div>
            <div class="row mt-5"><div class="col-12"><div class="product-description-section"><h4>Product Description</h4><hr><p>${p.description ? p.description.replace(/\n/g, '<br>') : 'No description available.'}</p></div></div></div>`;

        if (rel?.length > 0) {
            rps.style.display = 'block';
            rpc.innerHTML = rel.map(r => `<div class="col-6 col-md-3 mb-4"><a href="product_view.html?id=${r.id}" class="card-link text-decoration-none text-dark">
                <div class="card h-100 related-product-card"><img src="${r.image || '../assets/default-product.png'}" class="card-img-top p-2" alt="${r.name}">
                    <div class="card-body"><h6 class="card-title small">${r.name}</h6><p class="card-text font-weight-bold">₱${parseFloat(r.price).toFixed(2)}</p></div>
                </div></a></div>`).join('');
        }

        setupQuantity(stock, p.name);
        setupAddToBag(p.id, p.name, stock);
    };

    const setupQuantity = (max, name) => {
        const mb = document.getElementById('minus-btn');
        const pb = document.getElementById('plus-btn');
        const qi = document.getElementById('quantity-input');

        const validate = (showModal = false) => {
            const v = parseInt(qi.value) || 0;
            const btn = document.getElementById('add-to-bag-btn');

            if (qi.value === '' && !showModal) return;

            if (v > max && max > 0) {
                if (showModal) showStockError(v, max, name);
                qi.value = max;
                qi.classList.add('is-invalid');
                setTimeout(() => qi.classList.remove('is-invalid'), 2000);
            } else if (v < 1 && qi.value !== '') qi.value = 1;

            if (btn) btn.disabled = max <= 0 || v > max || v < 1;
        };

        mb.addEventListener('click', () => { const v = parseInt(qi.value); if (v > 1) { qi.value = v - 1; validate(); } });
        pb.addEventListener('click', () => { const v = parseInt(qi.value); if (v < max) { qi.value = v + 1; validate(); } });

        qi.addEventListener('input', e => {
            const v = parseInt(e.target.value) || 0;
            if (e.target.value === '' || e.target.value === '0') return;
            if (v > max && max > 0) {
                showStockError(v, max, name);
                setTimeout(() => { qi.value = max; qi.classList.add('is-invalid'); setTimeout(() => qi.classList.remove('is-invalid'), 2000); }, 100);
            } else if (v > 0) validate();
        });

        qi.addEventListener('blur', () => { if (qi.value === '' || parseInt(qi.value) === 0) qi.value = 1; validate(); });
        qi.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                const v = parseInt(qi.value) || 0;
                if (v > max && max > 0) { showStockError(v, max, name); qi.value = max; qi.classList.add('is-invalid'); setTimeout(() => qi.classList.remove('is-invalid'), 2000); }
                qi.blur();
            }
        });
    };

    const setupAddToBag = (pid, name, stock) => {
        const btn = document.getElementById('add-to-bag-btn');
        if (!btn) return;

        let isProcessing = false; // Prevent multiple clicks

        btn.addEventListener('click', async () => {
            if (isProcessing) return; // Block if already processing
            
            const qty = parseInt(document.getElementById('quantity-input').value) || 0;

            if (qty > stock) return showStockError(qty, stock, name);
            if (qty <= 0) return alert('Please select a valid quantity.');

            // Set loading state immediately
            isProcessing = true;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Adding...';

            try {
                const eq = await checkCart(pid);
                if (eq > 0) {
                    const total = eq + qty;
                    // Reset loading state for modal
                    isProcessing = false;
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-shopping-bag mr-2"></i>Add to Bag';
                    return showCartModal(eq, qty, name, stock, () => addToBag(pid, qty, name, stock));
                }

                await addToBag(pid, qty, name, stock);
            } catch (e) {
                console.error('Error:', e);
                alert('An error occurred. Please try again.');
                // Reset on error
                isProcessing = false;
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-shopping-bag mr-2"></i>Add to Bag';
            }
        });
    };

    const addToBag = async (pid, qty, name, stock) => {
        const btn = document.getElementById('add-to-bag-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Adding...';

        try {
            const sr = await fetch(`${API}/api/products/${pid}/stock`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-User-ID': user.id.toString() },
                body: JSON.stringify({ quantity: qty, operation: 'deduct' })
            });
            if (!sr.ok) throw new Error((await sr.json()).message || 'Failed to update stock');

            const cr = await fetch(`${API}/api/cart`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-ID': user.id.toString() },
                body: JSON.stringify({ product_id: pid, quantity: qty })
            });
            if (!cr.ok) {
                await fetch(`${API}/api/products/${pid}/stock`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-User-ID': user.id.toString() },
                    body: JSON.stringify({ quantity: qty, operation: 'add' })
                });
                throw new Error('Failed to add item to cart');
            }

            const pr = await fetch(`${API}/api/products/${pid}`, { headers: { 'Content-Type': 'application/json', 'X-User-ID': user.id.toString() } });
            const pd = await pr.json();
            const ns = Number(pd?.stock || pd?.details?.stock || 0);

            btn.innerHTML = '<i class="fas fa-check mr-2"></i>Added!';
            btn.classList.replace('btn-outline-primary', 'btn-success');
            if (typeof updateCartBadge === 'function') updateCartBadge();

            const ss = document.querySelector('.quantity-selector .text-muted');
            if (ss) ss.textContent = `Stock: ${ns}${ns <= 5 ? ' (Limited stock!)' : ''}`;

            const qi = document.getElementById('quantity-input');
            if (qi) { qi.max = ns; if (parseInt(qi.value) > ns) qi.value = ns; }

            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-shopping-bag mr-2"></i>Add to Bag';
                btn.classList.replace('btn-success', 'btn-outline-primary');
                btn.disabled = ns <= 0; // Only disable if out of stock
            }, 1000);
        } catch (e) {
            console.error('Add to bag error:', e);
            alert('An error occurred. Please try again.');
            btn.innerHTML = '<i class="fas fa-shopping-bag mr-2"></i>Add to Bag';
            btn.disabled = false;
        }
    };

    fetchProduct();
});