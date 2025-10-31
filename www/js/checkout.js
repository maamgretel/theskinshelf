document.addEventListener('DOMContentLoaded', () => {
    const API = 'https://backend-rj0a.onrender.com';
    const user = JSON.parse(localStorage.getItem('user'));
    
    let cardSaved = false;
    let checkoutData = null;
    let isPlacingOrder = false;

    // Auth check
    if (!user || user.role !== 'customer') {
        window.location.href = 'login.html';
        return;
    }

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

    const hdr = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`,
        'X-User-ID': user.id.toString()
    });

    // Add dynamic CSS
    const addStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
            .quantity-controls { display: flex; align-items: center; gap: 8px; }
            .quantity-btn { width: 32px; height: 32px; border: 1px solid #ddd; }
            .quantity-display { min-width: 40px; text-align: center; padding: 4px 8px; }
            .loading-spinner { opacity: 0.6; pointer-events: none; }
            .update-btn { display: none; }
        `;
        document.head.appendChild(style);
    };

    // ============= MODALS =============
    
    const createStockModal = () => {
        if (document.getElementById('stockErrorModal')) return;
        
        const modalHTML = `
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
        </div>`;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    };

    const showStockError = (name, requested, available) => {
        createStockModal();
        document.getElementById('stockErrorProductName').textContent = name;
        document.getElementById('stockErrorRequested').textContent = requested;
        document.getElementById('stockErrorAvailable').textContent = available;
        $('#stockErrorModal').modal('show');
    };

    // ============= QUANTITY MANAGEMENT =============
    
    const updateQuantityOnServer = async (productId, quantity, productName) => {
        const btnSelector = `[data-product-id="${productId}"] .update-btn`;
        const btn = document.querySelector(btnSelector);
        
        try {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
            }

            const response = await fetch(`${API}/api/cart/update`, {
                method: 'PUT',
                headers: hdr(),
                body: JSON.stringify({ productId, quantity })
            });

            if (!response.ok) throw new Error('Update failed');

            const result = await response.json();
            
            // Check if quantity was adjusted due to stock limits
            if (result.adjustedQuantity && result.adjustedQuantity < quantity) {
                showStockError(
                    productName,
                    quantity,
                    result.maxStock || result.adjustedQuantity
                );
            }

            await fetchCheckoutData();
            
        } catch (error) {
            console.error('Quantity update error:', error);
            alert(`Failed to update quantity: ${error.message}`);
            await fetchCheckoutData();
        }
    };

    const updateQuantityLocal = (productId, quantity, productName, maxStock) => {
        if (quantity < 1) return;
        
        if (maxStock && quantity > maxStock) {
            showStockError(productName, quantity, maxStock);
            return;
        }
        
        const input = document.querySelector(`[data-product-id="${productId}"] .quantity-input`);
        if (input) input.value = quantity;
        
        const btn = document.querySelector(`[data-product-id="${productId}"] .update-btn`);
        if (btn) {
            btn.style.display = 'inline-block';
            btn.disabled = false;
            btn.innerHTML = 'Update';
        }
    };

    // Global functions for inline handlers
    window.updateItemQuantity = updateQuantityLocal;
    
    window.manualUpdateQuantity = (productId) => {
        const input = document.querySelector(`[data-product-id="${productId}"] .quantity-input`);
        if (!input) return;
        
        const quantity = parseInt(input.value);
        if (isNaN(quantity) || quantity < 1) {
            input.value = 1;
            return;
        }
        
        updateQuantityLocal(
            productId,
            quantity,
            input.dataset.productName,
            parseInt(input.dataset.maxStock)
        );
    };
    
    window.forceUpdateQuantity = async (productId) => {
        const input = document.querySelector(`[data-product-id="${productId}"] .quantity-input`);
        if (!input) return;
        
        await updateQuantityOnServer(
            productId,
            parseInt(input.value),
            input.dataset.productName
        );
    };

    // ============= ADDRESS MANAGEMENT =============
    
    const toggleAddressLoading = (isLoading, data = null) => {
        const fields = ['fullName', 'streetAddress', 'contactNumber'];
        
        fields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (!element) return;
            
            element.disabled = isLoading;
            element.style.backgroundColor = isLoading ? '#f8f9fa' : '';
            
            if (isLoading) {
                element.placeholder = 'Loading...';
            } else if (data) {
                if (fieldId === 'fullName') element.value = data.name || '';
                if (fieldId === 'streetAddress') element.value = data.address || '';
                if (fieldId === 'contactNumber') element.value = data.contact_number || '';
            }
        });
    };

    window.debugAddressModal = () => {
        $('#addressModal').modal('show');
        $('#addressModal').one('shown.bs.modal', () => {
            toggleAddressLoading(true);
            setTimeout(() => {
                toggleAddressLoading(false, checkoutData?.deliveryInfo);
            }, 500);
        });
    };

    // ============= DATA FETCHING & RENDERING =============
    
    const fetchCheckoutData = async () => {
        try {
            const response = await fetch(`${API}/api/checkout`, { headers: hdr() });
            
            if (!response.ok) throw new Error('Failed to fetch checkout data');
            
            checkoutData = await response.json();
            
            renderAddress(checkoutData.deliveryInfo);
            renderItems(checkoutData.items);
            calculateSummary(checkoutData.items, checkoutData.shippingOptions);
            
        } catch (error) {
            console.error('Fetch error:', error);
            if (els.items) {
                els.items.innerHTML = `
                    <div class="alert alert-danger">
                        <strong>Error:</strong> ${error.message}
                    </div>`;
            }
        }
    };

    const renderAddress = (deliveryInfo) => {
        if (!els.addr) return;
        
        const hasValidAddress = deliveryInfo?.address?.trim();
        
        if (hasValidAddress) {
            const contactDisplay = deliveryInfo.contact_number 
                ? `(${deliveryInfo.contact_number})` 
                : '<span class="text-muted">(No contact)</span>';
            
            const nameDisplay = deliveryInfo.name ? `${deliveryInfo.name} ` : '';
            
            els.addr.innerHTML = `
                <div class="border rounded p-3 mb-3">
                    <h6>Delivery Address</h6>
                    <p class="font-weight-bold">${nameDisplay}${contactDisplay}</p>
                    <p>${deliveryInfo.address}</p>
                    <button class="btn btn-sm btn-outline-secondary" onclick="debugAddressModal()">
                        Change Address
                    </button>
                </div>`;
        } else {
            els.addr.innerHTML = `
                <div class="border rounded p-3 mb-3 border-danger">
                    <h6 class="text-danger">Incomplete Delivery Information</h6>
                    <p class="text-danger">Please add a delivery address to continue.</p>
                    <button class="btn btn-primary" onclick="debugAddressModal()">
                        Add Delivery Address
                    </button>
                </div>`;
        }
    };

    const renderItems = (items) => {
        if (!els.items) return;
        
        if (!items || !items.length) {
            els.items.innerHTML = '<p class="p-3 text-center">Your cart is empty.</p>';
            if (els.placeBtn) els.placeBtn.disabled = true;
            return;
        }

        const itemRows = items.map(item => {
            const productId = item.product_id || item.id;
            const stock = item.stock || item.available_stock || 0;
            const isLowStock = stock <= 5 && stock > 0;
            const isOutOfStock = stock <= 0;
            
            let stockWarning = '';
            if (isOutOfStock) {
                stockWarning = '<div class="text-danger small">Out of stock</div>';
            } else if (isLowStock) {
                stockWarning = `<div class="text-warning small">Only ${stock} left</div>`;
            }

            const subtotal = (item.price * item.quantity).toFixed(2);
            const canDecrease = item.quantity > 1;
            const canIncrease = !isOutOfStock && item.quantity < stock;

            return `
                <tr data-product-id="${productId}">
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${item.image}" 
                                 alt="${item.name}" 
                                 style="width:50px;height:50px;object-fit:cover" 
                                 class="rounded">
                            <div class="ml-3">
                                <span>${item.name}</span>
                                ${stockWarning}
                            </div>
                        </div>
                    </td>
                    <td class="text-right">₱${parseFloat(item.price).toFixed(2)}</td>
                    <td class="text-center">
                        <div class="d-flex align-items-center justify-content-center gap-2">
                            <button class="btn btn-sm btn-outline-secondary" 
                                    onclick="updateItemQuantity('${productId}',${Math.max(1, item.quantity - 1)},'${item.name}',${stock})"
                                    ${!canDecrease ? 'disabled' : ''}>
                                -
                            </button>
                            <input type="number" 
                                   class="form-control quantity-input text-center" 
                                   style="width:70px" 
                                   value="${item.quantity}" 
                                   min="1" 
                                   max="${stock}"
                                   data-product-name="${item.name}"
                                   data-max-stock="${stock}"
                                   onchange="manualUpdateQuantity('${productId}')"
                                   onkeypress="if(event.key==='Enter') manualUpdateQuantity('${productId}')">
                            <button class="btn btn-sm btn-outline-secondary" 
                                    onclick="updateItemQuantity('${productId}',${item.quantity + 1},'${item.name}',${stock})"
                                    ${!canIncrease ? 'disabled' : ''}>
                                +
                            </button>
                        </div>
                        <button class="btn btn-sm btn-primary update-btn mt-1" 
                                onclick="forceUpdateQuantity('${productId}')">
                            Update
                        </button>
                    </td>
                    <td class="text-right">₱${subtotal}</td>
                </tr>`;
        }).join('');

        els.items.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th class="text-right">Unit Price</th>
                        <th class="text-center">Quantity</th>
                        <th class="text-right">Subtotal</th>
                    </tr>
                </thead>
                <tbody>${itemRows}</tbody>
            </table>`;
    };

    const calculateSummary = (items, shippingOptions) => {
        const merchandiseTotal = items.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);
        
        const taxAmount = merchandiseTotal * 0.12;
        const shippingFee = shippingOptions?.standard || 0;
        const totalAmount = merchandiseTotal + taxAmount + shippingFee;

        if (els.merch) els.merch.textContent = `₱${merchandiseTotal.toFixed(2)}`;
        if (els.tax) els.tax.textContent = `₱${taxAmount.toFixed(2)}`;
        if (els.ship) els.ship.textContent = `₱${shippingFee.toFixed(2)}`;
        if (els.total) els.total.textContent = `₱${totalAmount.toFixed(2)}`;
    };

    // ============= PAYMENT CARD MANAGEMENT =============
    
    const populateExpiryDates = () => {
        if (!els.expMonth || !els.expYear) return;
        
        // Populate months
        for (let month = 1; month <= 12; month++) {
            const monthStr = month.toString().padStart(2, '0');
            els.expMonth.add(new Option(monthStr, month));
        }
        
        // Populate years (current + 10 years)
        const currentYear = new Date().getFullYear();
        for (let i = 0; i <= 10; i++) {
            const year = currentYear + i;
            const yearShort = year.toString().slice(-2);
            els.expYear.add(new Option(yearShort, year));
        }
    };

    const updateCardDisplay = () => {
        if (els.cardNumDisp && els.cardNum) {
            els.cardNumDisp.textContent = els.cardNum.value || '#### #### #### ####';
        }
        
        if (els.cardHolderDisp && els.cardHolder) {
            els.cardHolderDisp.textContent = els.cardHolder.value.toUpperCase() || 'FULL NAME';
        }
        
        if (els.cardExpDisp && els.expMonth && els.expYear) {
            const month = els.expMonth.value || 'MM';
            const year = els.expYear.value || 'YY';
            els.cardExpDisp.textContent = `${month}/${year}`;
        }
    };

    const validateCardData = (cardData) => {
        const requiredFields = ['number', 'holder', 'expiryMonth', 'expiryYear', 'cvv'];
        const missingFields = requiredFields.filter(field => !cardData[field]?.trim());
        
        if (missingFields.length > 0) {
            alert(`Please fill in: ${missingFields.join(', ')}`);
            return false;
        }
        
        const cardNumberClean = cardData.number.replace(/\s/g, '');
        if (cardNumberClean.length < 13) {
            alert('Invalid card number. Must be at least 13 digits.');
            return false;
        }
        
        return true;
    };

    // ============= ORDER PLACEMENT =============
    
    const placeOrder = async () => {
        if (isPlacingOrder) return;

        // Check payment method
        if (els.bank?.checked && !cardSaved) {
            alert('Please add bank card details first.');
            $('#paymentModal').modal('show');
            return;
        }

        // Set processing state
        isPlacingOrder = true;
        if (els.placeBtn) {
            els.placeBtn.disabled = true;
            els.placeBtn.innerHTML = '<span class="spinner-border spinner-border-sm mr-2"></span>Processing Order...';
        }

        // Create timeout controller (30 seconds should be enough now)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
            const response = await fetch(`${API}/api/orders/place`, {
                method: 'POST',
                headers: hdr(),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to place order');
            }

            const orderData = await response.json();
            
            // Store order details for success page
            localStorage.setItem('orderTotal', els.total?.textContent.replace('₱', '') || '0');
            localStorage.setItem('orderNumber', orderData.orderNumber || `TSS-2025-${Date.now().toString().slice(-6)}`);
            localStorage.setItem('orderDate', new Date().toLocaleDateString());
            
            // Redirect to success page
            window.location.href = 'sucess.html';
            
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('Order placement error:', error);
            
            // Handle timeout specifically
            if (error.name === 'AbortError') {
                const shouldCheckOrders = confirm(
                    'The order is taking longer than expected.\n\n' +
                    'Your order may still be processing on our servers.\n\n' +
                    'Would you like to check your orders page to verify?'
                );
                
                if (shouldCheckOrders) {
                    window.location.href = 'orders.html';
                    return;
                }
            } else {
                alert(`Error placing order: ${error.message}`);
            }
            
            // Reset button state
            isPlacingOrder = false;
            if (els.placeBtn) {
                els.placeBtn.disabled = false;
                els.placeBtn.textContent = 'Place Order';
            }
        }
    };

    // ============= EVENT LISTENERS =============
    
    // Card number formatting
    if (els.cardNum) {
        els.cardNum.addEventListener('input', (e) => {
            // Remove non-digits and format with spaces every 4 digits
            const cleaned = e.target.value.replace(/[^\d]/g, '');
            e.target.value = cleaned.replace(/(.{4})/g, '$1 ').trim();
            updateCardDisplay();
        });
    }

    // Card display updates
    [els.cardHolder, els.expMonth, els.expYear].forEach(element => {
        if (element) {
            element.addEventListener('change', updateCardDisplay);
        }
    });

    // CVV focus - flip card
    if (els.cvv && els.cardFlip) {
        els.cvv.addEventListener('focus', () => {
            els.cardFlip.classList.add('is-flipped');
        });
        els.cvv.addEventListener('blur', () => {
            els.cardFlip.classList.remove('is-flipped');
        });
    }

    // Bank card selection
    if (els.bank) {
        els.bank.addEventListener('change', () => {
            if (els.bank.checked && !cardSaved) {
                $('#paymentModal').modal('show');
            }
        });
    }

    // Save payment button
    if (els.saveBtn) {
        els.saveBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const paymentForm = document.getElementById('payment-form');
            if (paymentForm && paymentForm.checkValidity() === false) {
                alert('Please fill in all card details correctly.');
                return;
            }

            const cardData = {
                number: els.cardNum?.value?.trim() || '',
                holder: els.cardHolder?.value?.trim() || '',
                expiryMonth: els.expMonth?.value?.trim() || '',
                expiryYear: els.expYear?.value?.trim() || '',
                cvv: els.cvv?.value?.trim() || ''
            };

            if (!validateCardData(cardData)) return;

            try {
                els.saveBtn.disabled = true;
                els.saveBtn.textContent = 'Requesting OTP...';

                const response = await fetch(`${API}/api/orders/request-otp-save-card`, {
                    method: 'POST',
                    headers: hdr(),
                    body: JSON.stringify({
                        email: user.email,
                        userId: user.id
                    })
                });

                if (!response.ok) throw new Error('Failed to send OTP');

                const data = await response.json();
                
                if (data.message?.includes('OTP sent') || data.success) {
                    // Close payment modal and open OTP modal
                    $('#paymentModal').modal('hide');
                    setTimeout(() => $('#otpModal').modal('show'), 300);
                    
                    // Store card data temporarily for verification
                    sessionStorage.setItem('tempCardData', JSON.stringify(cardData));
                    sessionStorage.setItem('tempUserEmail', user.email);
                    
                    // Focus OTP input
                    setTimeout(() => els.otpInput?.focus(), 800);
                } else {
                    throw new Error(data.error || 'Failed to send OTP');
                }
                
            } catch (error) {
                alert(`Error: ${error.message}`);
            } finally {
                els.saveBtn.disabled = false;
                els.saveBtn.textContent = 'Save Payment';
            }
        });
    }

    // Verify OTP button
    if (els.otpBtn) {
        els.otpBtn.addEventListener('click', async () => {
            const otp = els.otpInput?.value?.trim();
            
            if (!otp || otp.length !== 6) {
                alert('Please enter a valid 6-digit OTP.');
                return;
            }

            try {
                els.otpBtn.disabled = true;
                els.otpBtn.textContent = 'Verifying...';

                const cardData = JSON.parse(sessionStorage.getItem('tempCardData') || '{}');
                const email = sessionStorage.getItem('tempUserEmail');

                const response = await fetch(`${API}/api/orders/verify-otp-save-card`, {
                    method: 'POST',
                    headers: hdr(),
                    body: JSON.stringify({
                        email,
                        otp,
                        cardData,
                        userId: user.id
                    })
                });

                if (!response.ok) throw new Error('OTP verification failed');

                const data = await response.json();
                
                if (data.message?.includes('Card saved') || data.success) {
                    cardSaved = true;
                    
                    // Update bank card label
                    const bankLabel = document.querySelector('label[for="bankCard"]');
                    if (bankLabel) {
                        bankLabel.innerHTML = 'Bank Card <span class="text-success">✔ Saved</span>';
                    }
                    
                    $('#otpModal').modal('hide');
                    alert('Card saved successfully!');
                    
                    // Clear temporary data
                    sessionStorage.removeItem('tempCardData');
                    sessionStorage.removeItem('tempUserEmail');
                } else {
                    throw new Error(data.error || 'Verification failed');
                }
                
            } catch (error) {
                alert(`Error: ${error.message}`);
            } finally {
                els.otpBtn.disabled = false;
                els.otpBtn.textContent = 'Verify OTP';
            }
        });
    }

    // OTP input validation and Enter key
    if (els.otpInput) {
        els.otpInput.addEventListener('input', (e) => {
            // Only allow digits, max 6 characters
            e.target.value = e.target.value.replace(/\D/g, '').substring(0, 6);
        });
        
        els.otpInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !els.otpBtn?.disabled) {
                els.otpBtn?.click();
            }
        });
    }

    // Payment modal close handler
    if (typeof $ !== 'undefined') {
        $('#paymentModal').on('hidden.bs.modal', () => {
            // If card not saved, revert to COD
            if (!cardSaved && els.cod) {
                els.cod.checked = true;
            }
        });
    }

    // Place order button
    if (els.placeBtn) {
        els.placeBtn.addEventListener('click', placeOrder);
    }

    // ============= INITIALIZATION =============
    
    addStyles();
    populateExpiryDates();
    
    // Delay initial fetch to ensure DOM is ready
    setTimeout(fetchCheckoutData, 100);
});