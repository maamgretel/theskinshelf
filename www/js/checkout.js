document.addEventListener('DOMContentLoaded', () => {
    const API = 'https://backend-rj0a.onrender.com';
    const user = JSON.parse(localStorage.getItem('user'));
    
    let cardSaved = false;
    let checkoutData = null;

    if (!user || user.role !== 'customer') return window.location.href = 'login.html';

    // DOM cache
    const els = {
        addr: document.getElementById('delivery-address-container'),
        items: document.getElementById('checkout-items-container'),
        merch: document.getElementById('merchandise-subtotal'),
        ship: document.getElementById('shipping-subtotal'),
        tax: document.getElementById('tax-subtotal'),
        total: document.getElementById('total-payment'),
        placeBtn: document.getElementById('place-order-btn'),
        cod: document.getElementById('cod'),
        bank: document.getElementById('bankCard'),
        cardNum: document.getElementById('modalCardNumber'),
        cardHolder: document.getElementById('modalCardHolder'),
        expMonth: document.getElementById('modalExpiryMonth'),
        expYear: document.getElementById('modalExpiryYear'),
        cvv: document.getElementById('modalCvv'),
        cardNumDisp: document.getElementById('cardNumberDisplay'),
        cardHolderDisp: document.getElementById('cardHolderDisplay'),
        cardExpDisp: document.getElementById('cardExpiresDisplay'),
        cardFlip: document.getElementById('cardFlipper'),
        saveBtn: document.getElementById('save-payment-btn'),
        otpBtn: document.getElementById('verifyOtpBtn'),
        otpInput: document.getElementById('otpInput')
    };

    const hdr = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}`, 'X-User-ID': user.id.toString() });

    // Add CSS
    const s = document.createElement('style');
    s.textContent = '.quantity-controls{display:flex;align-items:center;gap:8px}.quantity-btn{width:32px;height:32px;border:1px solid #ddd}.quantity-display{min-width:40px;text-align:center;padding:4px 8px}.loading-spinner{opacity:0.6;pointer-events:none}';
    document.head.appendChild(s);

    // Stock error modal
    const createStockModal = () => {
        if (document.getElementById('stockErrorModal')) return;
        document.body.insertAdjacentHTML('beforeend', `
        <div class="modal fade" id="stockErrorModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title">Stock Limitation</h5>
                        <button type="button" class="close text-white" data-dismiss="modal">&times;</button>
                    </div>
                    <div class="modal-body text-center">
                        <i class="fas fa-box-open fa-3x text-danger mb-3"></i>
                        <p class="font-weight-bold text-danger">Insufficient Stock Available</p>
                        <div class="alert alert-info">
                            <strong id="stockErrorProductName"></strong><br>
                            Requested: <strong id="stockErrorRequested">0</strong><br>
                            Available: <strong id="stockErrorAvailable">0</strong>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" data-dismiss="modal">I Understand</button>
                    </div>
                </div>
            </div>
        </div>`);
    };

    const showStockError = (name, req, avail) => {
        createStockModal();
        document.getElementById('stockErrorProductName').textContent = name;
        document.getElementById('stockErrorRequested').textContent = req;
        document.getElementById('stockErrorAvailable').textContent = avail;
        $('#stockErrorModal').modal('show');
    };

    // Quantity update
    const updateQty = async (pid, qty, name) => {
        try {
            const btn = document.querySelector(`[data-product-id="${pid}"] .update-btn`);
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
            }

            const r = await fetch(`${API}/api/cart/update`, {
                method: 'PUT', headers: hdr(), body: JSON.stringify({ productId: pid, quantity: qty })
            });

            if (!r.ok) throw new Error('Update failed');

            const res = await r.json();
            if (res.adjustedQuantity && res.adjustedQuantity < qty) {
                showStockError(name, qty, res.maxStock || res.adjustedQuantity);
            }

            await fetchData();
        } catch (e) {
            alert(`Failed: ${e.message}`);
            await fetchData();
        }
    };

    const updateQtyLocal = (pid, qty, name, max) => {
        if (qty < 1) return;
        if (max && qty > max) return showStockError(name, qty, max);
        
        const inp = document.querySelector(`[data-product-id="${pid}"] .quantity-input`);
        if (inp) inp.value = qty;
        
        const btn = document.querySelector(`[data-product-id="${pid}"] .update-btn`);
        if (btn) {
            btn.style.display = 'inline-block';
            btn.disabled = false;
            btn.innerHTML = 'Update';
        }
    };

    window.updateItemQuantity = updateQtyLocal;
    
    window.manualUpdateQuantity = (pid) => {
        const inp = document.querySelector(`[data-product-id="${pid}"] .quantity-input`);
        if (!inp) return;
        
        const qty = parseInt(inp.value);
        if (isNaN(qty) || qty < 1) return inp.value = 1;
        
        updateQtyLocal(pid, qty, inp.dataset.productName, parseInt(inp.dataset.maxStock));
    };
    
    window.forceUpdateQuantity = async (pid) => {
        const inp = document.querySelector(`[data-product-id="${pid}"] .quantity-input`);
        if (!inp) return;
        await updateQty(pid, parseInt(inp.value), inp.dataset.productName);
    };

    // Address modal
    const toggleAddrLoading = (loading, data = null) => {
        ['fullName', 'streetAddress', 'contactNumber'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.disabled = loading;
            el.style.backgroundColor = loading ? '#f8f9fa' : '';
            if (loading) el.placeholder = 'Loading...';
            else if (data) {
                if (id === 'fullName') el.value = data.name || '';
                if (id === 'streetAddress') el.value = data.address || '';
                if (id === 'contactNumber') el.value = data.contact_number || '';
            }
        });
    };

    window.debugAddressModal = () => {
        $('#addressModal').modal('show');
        $('#addressModal').one('shown.bs.modal', () => {
            toggleAddrLoading(true);
            setTimeout(() => toggleAddrLoading(false, checkoutData?.deliveryInfo), 500);
        });
    };

    // Fetch data
    const fetchData = async () => {
        try {
            const r = await fetch(`${API}/api/checkout`, { headers: hdr() });
            if (!r.ok) throw new Error('Fetch failed');
            
            checkoutData = await r.json();
            renderAddr(checkoutData.deliveryInfo);
            renderItems(checkoutData.items);
            calcSummary(checkoutData.items, checkoutData.shippingOptions);
        } catch (e) {
            console.error(e);
            if (els.items) els.items.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
        }
    };

    const renderAddr = (info) => {
        if (!els.addr) return;
        
        const valid = info?.address?.trim();
        
        if (valid) {
            const contact = info.contact_number ? `(${info.contact_number})` : '<span class="text-muted">(No contact)</span>';
            const name = info.name ? `${info.name} ` : '';
            
            els.addr.innerHTML = `<div class="border rounded p-3 mb-3">
                <h6>Delivery Address</h6>
                <p class="font-weight-bold">${name}${contact}</p>
                <p>${info.address}</p>
                <button class="btn btn-sm btn-outline-secondary" onclick="debugAddressModal()">Change Address</button>
            </div>`;
        } else {
            els.addr.innerHTML = `<div class="border rounded p-3 mb-3 border-danger">
                <h6 class="text-danger">Incomplete Delivery Information</h6>
                <p class="text-danger">Please add a delivery address to continue.</p>
                <button class="btn btn-primary" onclick="debugAddressModal()">Add Delivery Address</button>
            </div>`;
        }
    };

    const renderItems = (items) => {
        if (!els.items) return;
        if (!items?.length) {
            els.items.innerHTML = '<p class="p-3 text-center">Your cart is empty.</p>';
            if (els.placeBtn) els.placeBtn.disabled = true;
            return;
        }

        const rows = items.map(i => {
            const stock = i.stock || i.available_stock || 0;
            const low = stock <= 5 && stock > 0;
            const out = stock <= 0;
            
            let warn = '';
            if (out) warn = '<div class="text-danger small">Out of stock</div>';
            else if (low) warn = `<div class="text-warning small">Only ${stock} left</div>`;

            return `<tr data-product-id="${i.product_id || i.id}">
                <td><div class="d-flex align-items-center">
                    <img src="${i.image}" alt="${i.name}" style="width:50px;height:50px;object-fit:cover" class="rounded">
                    <div class="ml-3"><span>${i.name}</span>${warn}</div>
                </div></td>
                <td class="text-right">₱${parseFloat(i.price).toFixed(2)}</td>
                <td class="text-center">
                    <div class="d-flex align-items-center justify-content-center gap-2">
                        <button class="btn btn-sm btn-outline-secondary" onclick="updateItemQuantity('${i.product_id || i.id}',${Math.max(1,i.quantity-1)},'${i.name}',${stock})" ${i.quantity<=1?'disabled':''}>-</button>
                        <input type="number" class="form-control quantity-input text-center" style="width:70px" value="${i.quantity}" min="1" max="${stock}" data-product-name="${i.name}" data-max-stock="${stock}" onchange="manualUpdateQuantity('${i.product_id || i.id}')" onkeypress="if(event.key==='Enter') manualUpdateQuantity('${i.product_id || i.id}')">
                        <button class="btn btn-sm btn-outline-secondary" onclick="updateItemQuantity('${i.product_id || i.id}',${i.quantity+1},'${i.name}',${stock})" ${out||i.quantity>=stock?'disabled':''}>+</button>
                    </div>
                    <button class="btn btn-sm btn-primary update-btn mt-1" style="display:none" onclick="forceUpdateQuantity('${i.product_id || i.id}')">Update</button>
                </td>
                <td class="text-right">₱${(i.price*i.quantity).toFixed(2)}</td>
            </tr>`;
        }).join('');

        els.items.innerHTML = `<table class="table">
            <thead><tr><th>Product</th><th class="text-right">Unit Price</th><th class="text-center">Quantity</th><th class="text-right">Subtotal</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
    };

    const calcSummary = (items, ship) => {
        const merch = items.reduce((s, i) => s + (i.price * i.quantity), 0);
        const tax = merch * 0.12;
        const shipFee = ship?.standard || 0;
        const total = merch + tax + shipFee;

        if (els.merch) els.merch.textContent = `₱${merch.toFixed(2)}`;
        if (els.tax) els.tax.textContent = `₱${tax.toFixed(2)}`;
        if (els.ship) els.ship.textContent = `₱${shipFee.toFixed(2)}`;
        if (els.total) els.total.textContent = `₱${total.toFixed(2)}`;
    };

    // Payment
    const populateDates = () => {
        if (!els.expMonth || !els.expYear) return;
        
        for (let i = 1; i <= 12; i++) {
            els.expMonth.add(new Option(i.toString().padStart(2, '0'), i));
        }
        
        const y = new Date().getFullYear();
        for (let i = 0; i <= 10; i++) {
            const yr = y + i;
            els.expYear.add(new Option(yr.toString().slice(-2), yr));
        }
    };

    const updateCardDisp = () => {
        if (els.cardNumDisp && els.cardNum) els.cardNumDisp.textContent = els.cardNum.value || '#### #### #### ####';
        if (els.cardHolderDisp && els.cardHolder) els.cardHolderDisp.textContent = els.cardHolder.value.toUpperCase() || 'FULL NAME';
        if (els.cardExpDisp && els.expMonth && els.expYear) {
            els.cardExpDisp.textContent = `${els.expMonth.value || 'MM'}/${els.expYear.value || 'YY'}`;
        }
    };

    const validateCard = (data) => {
        const req = ['number', 'holder', 'expiryMonth', 'expiryYear', 'cvv'];
        const miss = req.filter(f => !data[f]?.trim());
        
        if (miss.length) {
            alert(`Fill in: ${miss.join(', ')}`);
            return false;
        }
        
        if (data.number.replace(/\s/g, '').length < 13) {
            alert('Invalid card number');
            return false;
        }
        
        return true;
    };

    // Place order
    let isPlacingOrder = false; // Prevent multiple clicks

    const placeOrder = async () => {
        if (isPlacingOrder) return; // Block if already processing

        if (els.bank?.checked && !cardSaved) {
            alert('Please add bank card details first.');
            return $('#paymentModal').modal('show');
        }

        // Set loading state immediately
        isPlacingOrder = true;
        if (els.placeBtn) {
            els.placeBtn.disabled = true;
            els.placeBtn.textContent = 'Placing Order...';
        }

        try {
            const r = await fetch(`${API}/api/orders/place`, { method: 'POST', headers: hdr() });

            if (!r.ok) {
                const err = await r.json();
                throw new Error(err.error || 'Failed to place order');
            }

            const ord = await r.json();
            
            localStorage.setItem('orderTotal', els.total?.textContent.replace('₱', '') || '0');
            localStorage.setItem('orderNumber', ord.orderNumber || 'TSS-2025-' + Date.now().toString().slice(-6));
            localStorage.setItem('orderDate', new Date().toLocaleDateString());
            
            window.location.href = 'sucess.html';
        } catch (e) {
            console.error('Order error:', e);
            alert(`Error: ${e.message}`);
            
            // Reset button state on error
            isPlacingOrder = false;
            if (els.placeBtn) {
                els.placeBtn.disabled = false;
                els.placeBtn.textContent = 'Place Order';
            }
        }
    };

    // Event listeners
    if (els.cardNum) {
        els.cardNum.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^\d]/g, '').replace(/(.{4})/g, '$1 ').trim();
            updateCardDisp();
        });
    }

    [els.cardHolder, els.expMonth, els.expYear].forEach(el => {
        if (el) el.addEventListener('change', updateCardDisp);
    });

    if (els.cvv && els.cardFlip) {
        els.cvv.addEventListener('focus', () => els.cardFlip.classList.add('is-flipped'));
        els.cvv.addEventListener('blur', () => els.cardFlip.classList.remove('is-flipped'));
    }

    if (els.bank) {
        els.bank.addEventListener('change', () => {
            if (els.bank.checked && !cardSaved) $('#paymentModal').modal('show');
        });
    }

    // Save payment
    if (els.saveBtn) {
        els.saveBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const form = document.getElementById('payment-form');
            if (form?.checkValidity() === false) return alert('Fill in all card details.');

            const card = {
                number: els.cardNum?.value?.trim() || '',
                holder: els.cardHolder?.value?.trim() || '',
                expiryMonth: els.expMonth?.value?.trim() || '',
                expiryYear: els.expYear?.value?.trim() || '',
                cvv: els.cvv?.value?.trim() || ''
            };

            if (!validateCard(card)) return;

            try {
                els.saveBtn.disabled = true;
                els.saveBtn.textContent = 'Requesting OTP...';

                const r = await fetch(`${API}/api/orders/request-otp-save-card`, {
                    method: 'POST', headers: hdr(), body: JSON.stringify({ email: user.email, userId: user.id })
                });

                if (!r.ok) throw new Error('Failed to send OTP');

                const d = await r.json();
                if (d.message?.includes('OTP sent') || d.success) {
                    $('#paymentModal').modal('hide');
                    setTimeout(() => $('#otpModal').modal('show'), 300);
                    
                    sessionStorage.setItem('tempCardData', JSON.stringify(card));
                    sessionStorage.setItem('tempUserEmail', user.email);
                    
                    setTimeout(() => els.otpInput?.focus(), 800);
                } else {
                    throw new Error(d.error || 'Failed to send OTP');
                }
            } catch (e) {
                alert(`Error: ${e.message}`);
            } finally {
                els.saveBtn.disabled = false;
                els.saveBtn.textContent = 'Save Payment';
            }
        });
    }

    // Verify OTP
    if (els.otpBtn) {
        els.otpBtn.addEventListener('click', async () => {
            const otp = els.otpInput?.value?.trim();
            if (!otp || otp.length !== 6) return alert('Enter valid 6-digit OTP.');

            try {
                els.otpBtn.disabled = true;
                els.otpBtn.textContent = 'Verifying...';

                const card = JSON.parse(sessionStorage.getItem('tempCardData') || '{}');
                const email = sessionStorage.getItem('tempUserEmail');

                const r = await fetch(`${API}/api/orders/verify-otp-save-card`, {
                    method: 'POST', headers: hdr(), body: JSON.stringify({ email, otp, cardData: card, userId: user.id })
                });

                if (!r.ok) throw new Error('Verification failed');

                const d = await r.json();
                if (d.message?.includes('Card saved') || d.success) {
                    cardSaved = true;
                    const lbl = document.querySelector('label[for="bankCard"]');
                    if (lbl) lbl.innerHTML = 'Bank Card <span class="text-success">✔ Saved</span>';
                    
                    $('#otpModal').modal('hide');
                    alert('Card saved successfully!');
                    
                    sessionStorage.removeItem('tempCardData');
                    sessionStorage.removeItem('tempUserEmail');
                } else {
                    throw new Error(d.error || 'Verification failed');
                }
            } catch (e) {
                alert(`Error: ${e.message}`);
            } finally {
                els.otpBtn.disabled = false;
                els.otpBtn.textContent = 'Verify OTP';
            }
        });
    }

    if (els.otpInput) {
        els.otpInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !els.otpBtn?.disabled) els.otpBtn?.click();
        });
        
        els.otpInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').substring(0, 6);
        });
    }

    // Modal handlers
    if (typeof $ !== 'undefined') {
        $('#paymentModal').on('hidden.bs.modal', () => {
            if (!cardSaved && els.cod) els.cod.checked = true;
        });
    }

    // Init
    if (els.placeBtn) els.placeBtn.addEventListener('click', placeOrder);
    populateDates();
    setTimeout(fetchData, 100);
});