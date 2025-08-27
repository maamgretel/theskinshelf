document.addEventListener('DOMContentLoaded', () => {
    // Configuration
    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const user = JSON.parse(localStorage.getItem('user'));
    
    // State
    let cardDetailsSaved = false;
    let globalCheckoutData = null;

    // Security check
    if (!user || user.role !== 'customer') {
        window.location.href = 'login.html';
        return;
    }

    // DOM elements
    const addressContainer = document.getElementById('delivery-address-container');
    const itemsContainer = document.getElementById('checkout-items-container');
    const merchandiseSubtotalEl = document.getElementById('merchandise-subtotal');
    const shippingSubtotalEl = document.getElementById('shipping-subtotal');
    const totalPaymentEl = document.getElementById('total-payment');
    const placeOrderBtn = document.getElementById('place-order-btn');
    const codRadio = document.getElementById('cod');
    const bankCardRadio = document.getElementById('bankCard');
    const taxSubtotalEl = document.getElementById('tax-subtotal');

    // Payment modal elements
    const paymentForm = document.getElementById('payment-form');
    const savePaymentBtn = document.getElementById('save-payment-btn');
    const cardNumberInput = document.getElementById('modalCardNumber');
    const cardHolderInput = document.getElementById('modalCardHolder');
    const expiryMonthSelect = document.getElementById('modalExpiryMonth');
    const expiryYearSelect = document.getElementById('modalExpiryYear');
    const cvvInput = document.getElementById('modalCvv');
    const cardNumberDisplay = document.getElementById('cardNumberDisplay');
    const cardHolderDisplay = document.getElementById('cardHolderDisplay');
    const cardExpiresDisplay = document.getElementById('cardExpiresDisplay');
    const cardFlipper = document.getElementById('cardFlipper');
    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    const otpInput = document.getElementById('otpInput');

    // Utility functions
    const debug = (msg, data) => console.log(`[DEBUG] ${msg}`, data || '');
    const showAlert = (msg) => alert(msg);
    const apiHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}`,
        'X-User-ID': user.id.toString()
    });

    // Add basic loading CSS for modals
    const addModalCSS = () => {
        const style = document.createElement('style');
        style.textContent = `
            .quantity-controls { display: flex; align-items: center; gap: 8px; }
            .quantity-btn { width: 32px; height: 32px; border: 1px solid #ddd; }
            .quantity-display { min-width: 40px; text-align: center; padding: 4px 8px; }
            .loading-spinner { opacity: 0.6; pointer-events: none; }
        `;
        document.head.appendChild(style);
    };
    addModalCSS();

    // Create stock error modal
    const createStockErrorModal = () => {
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
                            <strong id="stockErrorProductName">Product Name</strong><br>
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

    const showStockError = (productName, requestedQty, availableStock) => {
        createStockErrorModal();
        document.getElementById('stockErrorProductName').textContent = productName;
        document.getElementById('stockErrorRequested').textContent = requestedQty;
        document.getElementById('stockErrorAvailable').textContent = availableStock;
        $('#stockErrorModal').modal('show');
    };

    // Simple quantity update function
    const updateQuantity = async (productId, newQuantity, productName) => {
        try {
            const updateBtn = document.querySelector(`[data-product-id="${productId}"] .update-btn`);
            const quantityInput = document.querySelector(`[data-product-id="${productId}"] .quantity-input`);
            
            if (updateBtn) {
                updateBtn.disabled = true;
                updateBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
            }

            const response = await fetch(`${BACKEND_URL}/api/cart/update`, {
                method: 'PUT',
                headers: apiHeaders(),
                body: JSON.stringify({ productId, quantity: newQuantity })
            });

            if (!response.ok) throw new Error('Failed to update quantity');

            const result = await response.json();
            if (result.adjustedQuantity && result.adjustedQuantity < newQuantity) {
                showStockError(productName, newQuantity, result.maxStock || result.adjustedQuantity);
            }

            await fetchCheckoutData();
        } catch (error) {
            showAlert(`Failed to update quantity: ${error.message}`);
            await fetchCheckoutData();
        }
    };
    
    const updateQuantityLocal = (productId, newQuantity, productName, maxStock) => {
        if (newQuantity < 1) return;
        if (maxStock && newQuantity > maxStock) {
            showStockError(productName, newQuantity, maxStock);
            return;
        }
        
        // Update local display
        const quantityInput = document.querySelector(`[data-product-id="${productId}"] .quantity-input`);
        if (quantityInput) quantityInput.value = newQuantity;
        
        // Show update button
        const updateBtn = document.querySelector(`[data-product-id="${productId}"] .update-btn`);
        if (updateBtn) {
            updateBtn.style.display = 'inline-block';
            updateBtn.disabled = false;
            updateBtn.innerHTML = 'Update';
        }
    };
    
    window.updateItemQuantity = updateQuantityLocal;
    
    window.manualUpdateQuantity = (productId) => {
        const quantityInput = document.querySelector(`[data-product-id="${productId}"] .quantity-input`);
        if (!quantityInput) return;
        
        const newQuantity = parseInt(quantityInput.value);
        const productName = quantityInput.dataset.productName;
        const maxStock = parseInt(quantityInput.dataset.maxStock);
        
        if (isNaN(newQuantity) || newQuantity < 1) {
            quantityInput.value = 1;
            return;
        }
        
        updateQuantityLocal(productId, newQuantity, productName, maxStock);
    };
    
    window.forceUpdateQuantity = async (productId) => {
        const quantityInput = document.querySelector(`[data-product-id="${productId}"] .quantity-input`);
        if (!quantityInput) return;
        
        const newQuantity = parseInt(quantityInput.value);
        const productName = quantityInput.dataset.productName;
        
        await updateQuantity(productId, newQuantity, productName);
    };

    // Address modal functions
    const showAddressLoading = () => {
        const fullNameInput = document.getElementById('fullName');
        const addressInput = document.getElementById('streetAddress');
        const contactInput = document.getElementById('contactNumber');
        
        [fullNameInput, addressInput, contactInput].forEach(input => {
            if (input) {
                input.disabled = true;
                input.style.backgroundColor = '#f8f9fa';
                input.placeholder = 'Loading...';
            }
        });
    };

    const hideAddressLoading = (deliveryData = null) => {
        const fullNameInput = document.getElementById('fullName');
        const addressInput = document.getElementById('streetAddress');
        const contactInput = document.getElementById('contactNumber');
        
        if (fullNameInput) {
            fullNameInput.disabled = false;
            fullNameInput.value = deliveryData?.name || '';
            fullNameInput.style.backgroundColor = '';
        }
        if (addressInput) {
            addressInput.disabled = false;
            addressInput.value = deliveryData?.address || '';
            addressInput.style.backgroundColor = '';
        }
        if (contactInput) {
            contactInput.disabled = false;
            contactInput.value = deliveryData?.contact_number || '';
            contactInput.style.backgroundColor = '';
        }
    };

    window.debugAddressModal = () => {
        const modal = document.getElementById('addressModal');
        if (!modal) {
            showAlert('Address modal not found');
            return;
        }
        $('#addressModal').modal('show');
        $('#addressModal').one('shown.bs.modal', () => {
            showAddressLoading();
            setTimeout(() => {
                hideAddressLoading(globalCheckoutData?.deliveryInfo);
            }, 500);
        });
    };

    // Data fetching
    const fetchCheckoutData = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/checkout`, { headers: apiHeaders() });
            if (!response.ok) throw new Error('Failed to fetch checkout data');
            
            const checkoutData = await response.json();
            globalCheckoutData = checkoutData;
            
            renderAddress(checkoutData.deliveryInfo);
            renderItems(checkoutData.items);
            calculateSummary(checkoutData.items, checkoutData.shippingOptions);
        } catch (error) {
            console.error('Error:', error);
            if (itemsContainer) {
                itemsContainer.innerHTML = `<div class="alert alert-danger">Error loading checkout details: ${error.message}</div>`;
            }
        }
    };

    const renderAddress = (deliveryInfo) => {
        if (!addressContainer) return;
        
        const hasValidAddress = deliveryInfo?.address?.trim();
        
        if (hasValidAddress) {
            const contactDisplay = deliveryInfo.contact_number ? `(${deliveryInfo.contact_number})` : '<span class="text-muted">(No contact)</span>';
            const nameDisplay = deliveryInfo.name ? `${deliveryInfo.name} ` : '';
            
            addressContainer.innerHTML = `
                <div class="border rounded p-3 mb-3">
                    <h6>Delivery Address</h6>
                    <p class="font-weight-bold">${nameDisplay}${contactDisplay}</p>
                    <p>${deliveryInfo.address}</p>
                    <button class="btn btn-sm btn-outline-secondary" onclick="debugAddressModal()">Change Address</button>
                </div>`;
        } else {
            addressContainer.innerHTML = `
                <div class="border rounded p-3 mb-3 border-danger">
                    <h6 class="text-danger">Incomplete Delivery Information</h6>
                    <p class="text-danger">Please add a delivery address to continue.</p>
                    <button class="btn btn-primary" onclick="debugAddressModal()">Add Delivery Address</button>
                </div>`;
        }
    };

    const renderItems = (items) => {
        if (!itemsContainer) return;
        if (!items?.length) {
            itemsContainer.innerHTML = '<p class="p-3 text-center">Your cart is empty.</p>';
            if (placeOrderBtn) placeOrderBtn.disabled = true;
            return;
        }

        const tableRows = items.map(item => {
            const stockInfo = item.stock || item.available_stock || 0;
            const isLowStock = stockInfo <= 5 && stockInfo > 0;
            const isOutOfStock = stockInfo <= 0;
            
            let stockWarning = '';
            if (isOutOfStock) stockWarning = '<div class="text-danger small">Out of stock</div>';
            else if (isLowStock) stockWarning = `<div class="text-warning small">Only ${stockInfo} left</div>`;

            return `
                <tr data-product-id="${item.product_id || item.id}">
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover;" class="rounded">
                            <div class="ml-3">
                                <span>${item.name}</span>
                                ${stockWarning}
                            </div>
                        </div>
                    </td>
                    <td class="text-right">₱${parseFloat(item.price).toFixed(2)}</td>
                    <td class="text-center">
                        <div class="d-flex align-items-center justify-content-center gap-2">
                            <button class="btn btn-sm btn-outline-secondary" onclick="updateItemQuantity('${item.product_id || item.id}', ${Math.max(1, item.quantity - 5)}, '${item.name}', ${stockInfo})">--</button>
                            <button class="btn btn-sm btn-outline-secondary" onclick="updateItemQuantity('${item.product_id || item.id}', ${Math.max(1, item.quantity - 1)}, '${item.name}', ${stockInfo})" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                            <input type="number" 
                                   class="form-control quantity-input text-center" 
                                   style="width: 70px;" 
                                   value="${item.quantity}" 
                                   min="1" 
                                   max="${stockInfo}"
                                   data-product-name="${item.name}"
                                   data-max-stock="${stockInfo}"
                                   onchange="manualUpdateQuantity('${item.product_id || item.id}')"
                                   onkeypress="if(event.key==='Enter') manualUpdateQuantity('${item.product_id || item.id}')">
                            <button class="btn btn-sm btn-outline-secondary" onclick="updateItemQuantity('${item.product_id || item.id}', ${item.quantity + 1}, '${item.name}', ${stockInfo})" ${isOutOfStock || item.quantity >= stockInfo ? 'disabled' : ''}>+</button>
                            <button class="btn btn-sm btn-outline-secondary" onclick="updateItemQuantity('${item.product_id || item.id}', ${Math.min(stockInfo, item.quantity + 5)}, '${item.name}', ${stockInfo})" ${isOutOfStock || item.quantity >= stockInfo ? 'disabled' : ''}>++</button>
                        </div>
                        <button class="btn btn-sm btn-primary update-btn mt-1" 
                                style="display: none;" 
                                onclick="forceUpdateQuantity('${item.product_id || item.id}')">
                            Update
                        </button>
                    </td>
                    <td class="text-right">₱${(item.price * item.quantity).toFixed(2)}</td>
                </tr>`;
        }).join('');

        itemsContainer.innerHTML = `
            <table class="table">
                <thead>
                    <tr><th>Product</th><th class="text-right">Unit Price</th><th class="text-center">Quantity</th><th class="text-right">Subtotal</th></tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>`;
    };

    const calculateSummary = (items, shippingOptions) => {
        const merchandiseSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = merchandiseSubtotal * 0.12;
        const shippingFee = shippingOptions?.standard || 0;
        const totalPayment = merchandiseSubtotal + tax + shippingFee;

        if (merchandiseSubtotalEl) merchandiseSubtotalEl.textContent = `₱${merchandiseSubtotal.toFixed(2)}`;
        if (taxSubtotalEl) taxSubtotalEl.textContent = `₱${tax.toFixed(2)}`;
        if (shippingSubtotalEl) shippingSubtotalEl.textContent = `₱${shippingFee.toFixed(2)}`;
        if (totalPaymentEl) totalPaymentEl.textContent = `₱${totalPayment.toFixed(2)}`;
    };

    // Payment functions
    const populateDateDropdowns = () => {
        if (!expiryMonthSelect || !expiryYearSelect) return;
        
        for (let i = 1; i <= 12; i++) {
            expiryMonthSelect.add(new Option(i.toString().padStart(2, '0'), i));
        }
        
        const currentYear = new Date().getFullYear();
        for (let i = 0; i <= 10; i++) {
            const year = currentYear + i;
            expiryYearSelect.add(new Option(year.toString().slice(-2), year));
        }
    };

    const updateCardDisplay = () => {
        if (cardNumberDisplay && cardNumberInput) {
            cardNumberDisplay.textContent = cardNumberInput.value || '#### #### #### ####';
        }
        if (cardHolderDisplay && cardHolderInput) {
            cardHolderDisplay.textContent = cardHolderInput.value.toUpperCase() || 'FULL NAME';
        }
        if (cardExpiresDisplay && expiryMonthSelect && expiryYearSelect) {
            const month = expiryMonthSelect.value || 'MM';
            const year = expiryYearSelect.value || 'YY';
            cardExpiresDisplay.textContent = `${month}/${year}`;
        }
    };

    const validateCardData = (cardData) => {
        const required = ['number', 'holder', 'expiryMonth', 'expiryYear', 'cvv'];
        const missing = required.filter(field => !cardData[field]?.trim());
        
        if (missing.length > 0) {
            showAlert(`Please fill in: ${missing.join(', ')}`);
            return false;
        }
        
        if (cardData.number.replace(/\s/g, '').length < 13) {
            showAlert('Please enter a valid card number');
            return false;
        }
        
        return true;
    };

    // Order placement
    const handlePlaceOrder = async () => {
        if (bankCardRadio?.checked && !cardDetailsSaved) {
            showAlert('Please add your bank card details first.');
            $('#paymentModal').modal('show');
            return;
        }

        if (placeOrderBtn) {
            placeOrderBtn.disabled = true;
            placeOrderBtn.textContent = 'Placing Order...';
        }

        try {
            const response = await fetch(`${BACKEND_URL}/api/orders/place`, {
                method: 'POST',
                headers: apiHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to place order');
            }

            const orderData = await response.json();
            
            localStorage.setItem('orderTotal', totalPaymentEl?.textContent.replace('₱', '') || '0');
            localStorage.setItem('orderNumber', orderData.orderNumber || 'TSS-2025-' + Date.now().toString().slice(-6));
            localStorage.setItem('orderDate', new Date().toLocaleDateString());
            
            window.location.href = 'sucess.html';
        } catch (error) {
            showAlert(`Error: ${error.message}`);
            if (placeOrderBtn) {
                placeOrderBtn.disabled = false;
                placeOrderBtn.textContent = 'Place Order';
            }
        }
    };

    // Event listeners
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^\d]/g, '').replace(/(.{4})/g, '$1 ').trim();
            updateCardDisplay();
        });
    }

    [cardHolderInput, expiryMonthSelect, expiryYearSelect].forEach(el => {
        if (el) el.addEventListener('change', updateCardDisplay);
    });

    if (cvvInput && cardFlipper) {
        cvvInput.addEventListener('focus', () => cardFlipper.classList.add('is-flipped'));
        cvvInput.addEventListener('blur', () => cardFlipper.classList.remove('is-flipped'));
    }

    if (bankCardRadio) {
        bankCardRadio.addEventListener('change', () => {
            if (bankCardRadio.checked && !cardDetailsSaved) {
                $('#paymentModal').modal('show');
            }
        });
    }

    // Payment OTP functionality
    if (savePaymentBtn) {
        savePaymentBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            if (paymentForm?.checkValidity() === false) {
                showAlert('Please fill in all card details correctly.');
                return;
            }

            const cardData = {
                number: cardNumberInput?.value?.trim() || '',
                holder: cardHolderInput?.value?.trim() || '',
                expiryMonth: expiryMonthSelect?.value?.trim() || '',
                expiryYear: expiryYearSelect?.value?.trim() || '',
                cvv: cvvInput?.value?.trim() || ''
            };

            if (!validateCardData(cardData)) return;

            try {
                savePaymentBtn.disabled = true;
                savePaymentBtn.textContent = 'Requesting OTP...';

                const response = await fetch(`${BACKEND_URL}/api/orders/request-otp-save-card`, {
                    method: 'POST',
                    headers: apiHeaders(),
                    body: JSON.stringify({ email: user.email, userId: user.id })
                });

                if (!response.ok) throw new Error('Failed to send OTP');

                const data = await response.json();
                if (data.message?.includes('OTP sent') || data.success) {
                    $('#paymentModal').modal('hide');
                    setTimeout(() => $('#otpModal').modal('show'), 300);
                    
                    sessionStorage.setItem('tempCardData', JSON.stringify(cardData));
                    sessionStorage.setItem('tempUserEmail', user.email);
                    
                    setTimeout(() => otpInput?.focus(), 800);
                } else {
                    throw new Error(data.error || 'Failed to send OTP');
                }
            } catch (error) {
                showAlert(`Error: ${error.message}`);
            } finally {
                savePaymentBtn.disabled = false;
                savePaymentBtn.textContent = 'Save Payment';
            }
        });
    }

    if (verifyOtpBtn) {
        verifyOtpBtn.addEventListener('click', async () => {
            const otp = otpInput?.value?.trim();
            if (!otp || otp.length !== 6) {
                showAlert('Please enter a valid 6-digit OTP.');
                return;
            }

            try {
                verifyOtpBtn.disabled = true;
                verifyOtpBtn.textContent = 'Verifying...';

                const cardData = JSON.parse(sessionStorage.getItem('tempCardData') || '{}');
                const email = sessionStorage.getItem('tempUserEmail');

                const response = await fetch(`${BACKEND_URL}/api/orders/verify-otp-save-card`, {
                    method: 'POST',
                    headers: apiHeaders(),
                    body: JSON.stringify({ email, otp, cardData, userId: user.id })
                });

                if (!response.ok) throw new Error('Verification failed');

                const data = await response.json();
                if (data.message?.includes('Card saved') || data.success) {
                    cardDetailsSaved = true;
                    const bankCardLabel = document.querySelector('label[for="bankCard"]');
                    if (bankCardLabel) {
                        bankCardLabel.innerHTML = 'Bank Card <span class="text-success">✔ Saved</span>';
                    }
                    
                    $('#otpModal').modal('hide');
                    showAlert('Card saved successfully!');
                    
                    sessionStorage.removeItem('tempCardData');
                    sessionStorage.removeItem('tempUserEmail');
                } else {
                    throw new Error(data.error || 'Verification failed');
                }
            } catch (error) {
                showAlert(`Error: ${error.message}`);
            } finally {
                verifyOtpBtn.disabled = false;
                verifyOtpBtn.textContent = 'Verify OTP';
            }
        });
    }

    if (otpInput) {
        otpInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !verifyOtpBtn?.disabled) {
                verifyOtpBtn?.click();
            }
        });
        
        otpInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').substring(0, 6);
        });
    }

    // Modal event handlers
    if (typeof $ !== 'undefined') {
        $('#paymentModal').on('hidden.bs.modal', () => {
            if (!cardDetailsSaved && codRadio) codRadio.checked = true;
        });
    }

    // Initialize
    if (placeOrderBtn) placeOrderBtn.addEventListener('click', handlePlaceOrder);
    populateDateDropdowns();
    setTimeout(() => fetchCheckoutData(), 100);
});