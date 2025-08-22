document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const user = JSON.parse(localStorage.getItem('user'));

    // --- STATE ---
    let cardDetailsSaved = false;

    // --- DEBUGGING HELPER ---
    const debugLog = (section, message, data = null) => {
        console.log(`[DEBUG - ${section}]`, message, data ? data : '');
    };

    // --- SECURITY CHECK ---
    if (!user || user.role !== 'customer') {
        debugLog('SECURITY', 'User not authenticated or not customer', user);
        window.location.href = 'login.html';
        return;
    }

    debugLog('INIT', 'User authenticated', { userId: user.id, role: user.role });

    // --- DOM REFERENCES (Main Page) ---
    const addressContainer = document.getElementById('delivery-address-container');
    const itemsContainer = document.getElementById('checkout-items-container');
    const merchandiseSubtotalEl = document.getElementById('merchandise-subtotal');
    const shippingSubtotalEl = document.getElementById('shipping-subtotal');
    const totalPaymentEl = document.getElementById('total-payment');
    const placeOrderBtn = document.getElementById('place-order-btn');
    const codRadio = document.getElementById('cod');
    const bankCardRadio = document.getElementById('bankCard');
    const taxSubtotalEl = document.getElementById('tax-subtotal');


    // Check if critical DOM elements exist
    debugLog('DOM', 'Critical elements check', {
        addressContainer: !!addressContainer,
        itemsContainer: !!itemsContainer,
        placeOrderBtn: !!placeOrderBtn
    });

    // --- DOM REFERENCES (Payment Modal) ---
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

    // --- DATA FETCHING & RENDERING ---

    const fetchCheckoutData = async () => {
        debugLog('FETCH', 'Starting checkout data fetch');
        
        try {
            const requestHeaders = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.token}`,
                'X-User-ID': user.id.toString()
            };
            
            debugLog('FETCH', 'Request headers', requestHeaders);
            debugLog('FETCH', 'Fetching from URL', `${BACKEND_URL}/api/checkout`);
            
            const response = await fetch(`${BACKEND_URL}/api/checkout`, {
                headers: requestHeaders
            });
            
            debugLog('FETCH', 'Response status', { 
                status: response.status, 
                statusText: response.statusText,
                ok: response.ok 
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                debugLog('FETCH', 'Response error', errorText);
                throw new Error(`Failed to fetch checkout data. Status: ${response.status}`);
            }
            
            const checkoutData = await response.json();
            debugLog('FETCH', 'Checkout data received', checkoutData);
            
            // Check the structure of the received data
            debugLog('FETCH', 'Data structure analysis', {
                hasDeliveryInfo: !!checkoutData.deliveryInfo,
                hasItems: !!checkoutData.items,
                hasShippingOptions: !!checkoutData.shippingOptions,
                deliveryInfoKeys: checkoutData.deliveryInfo ? Object.keys(checkoutData.deliveryInfo) : null,
                itemsCount: checkoutData.items ? checkoutData.items.length : 0
            });
            
            renderAddress(checkoutData.deliveryInfo);
            renderItems(checkoutData.items);
            calculateSummary(checkoutData.items, checkoutData.shippingOptions);
            
        } catch (error) {
            debugLog('FETCH', 'Error occurred', error.message);
            console.error('Error:', error);
            
            if (itemsContainer) {
                itemsContainer.innerHTML = `
                    <div class="alert alert-danger p-3">
                        <strong>Error:</strong> Could not load checkout details. 
                        <br><small>Details: ${error.message}</small>
                        <br><button class="btn btn-sm btn-primary mt-2" onclick="location.reload()">Retry</button>
                    </div>`;
            }
        }
    };

    const renderAddress = (deliveryInfo) => {
        debugLog('ADDRESS', 'Rendering address', deliveryInfo);
        
        if (!addressContainer) {
            debugLog('ADDRESS', 'ERROR: Address container not found in DOM');
            return;
        }

        // Check if address modal exists in DOM
        const addressModal = document.getElementById('addressModal');
        debugLog('ADDRESS', 'Address modal exists', !!addressModal);
        
        // Check if we have essential delivery info (address and name are minimum requirements)
        const hasValidAddress = deliveryInfo && 
                               deliveryInfo.address && 
                               deliveryInfo.address.trim() !== '' &&
                               deliveryInfo.name && 
                               deliveryInfo.name.trim() !== '';
        
        debugLog('ADDRESS', 'Address validation', {
            hasDeliveryInfo: !!deliveryInfo,
            hasAddress: deliveryInfo ? (deliveryInfo.address && deliveryInfo.address.trim() !== '') : false,
            hasName: deliveryInfo ? (deliveryInfo.name && deliveryInfo.name.trim() !== '') : false,
            hasContact: deliveryInfo ? (deliveryInfo.contact_number && deliveryInfo.contact_number.trim() !== '') : false,
            isValid: hasValidAddress
        });
        
        if (hasValidAddress) {
            debugLog('ADDRESS', 'Valid delivery info found, rendering address');
            
            // Handle missing or empty contact number gracefully
            const contactDisplay = (deliveryInfo.contact_number && deliveryInfo.contact_number.trim() !== '') 
                ? `(${deliveryInfo.contact_number})` 
                : '<span class="text-muted">(No contact number)</span>';
            
            addressContainer.innerHTML = `
                <div class="border rounded p-3 mb-3">
                    <h6 class="mb-2">Delivery Address</h6>
                    <p class="font-weight-bold mb-1">${deliveryInfo.name} ${contactDisplay}</p>
                    <p class="mb-2">${deliveryInfo.address}</p>
                    ${(!deliveryInfo.contact_number || deliveryInfo.contact_number.trim() === '') ? 
                        '<small class="text-warning">⚠️ Consider adding a contact number for delivery updates</small><br>' : ''}
                    <button class="btn btn-sm btn-outline-secondary address-change-btn" 
                            data-toggle="modal" 
                            data-target="#addressModal"
                            onclick="debugAddressModal()">
                        ${(!deliveryInfo.contact_number || deliveryInfo.contact_number.trim() === '') ? 'Update Address' : 'Change Address'}
                    </button>
                </div>
            `;
            
            // Add event listener as backup
            const changeBtn = addressContainer.querySelector('.address-change-btn');
            if (changeBtn) {
                changeBtn.addEventListener('click', (e) => {
                    debugLog('ADDRESS', 'Change button clicked');
                    if (!addressModal) {
                        alert('Address modal not found. Please refresh the page.');
                        return;
                    }
                    // Try manual modal opening if Bootstrap modal fails
                    try {
                        $('#addressModal').modal('show');
                    } catch (err) {
                        debugLog('ADDRESS', 'Bootstrap modal failed', err);
                        addressModal.style.display = 'block';
                        addressModal.classList.add('show');
                    }
                });
            }
            
        } else {
            debugLog('ADDRESS', 'No valid delivery info, showing add address option');
            
            let missingInfo = [];
            if (!deliveryInfo) {
                missingInfo.push('delivery information');
            } else {
                if (!deliveryInfo.name || deliveryInfo.name.trim() === '') missingInfo.push('name');
                if (!deliveryInfo.address || deliveryInfo.address.trim() === '') missingInfo.push('address');
            }
            
            addressContainer.innerHTML = `
                <div class="border rounded p-3 mb-3 border-danger">
                    <h6 class="mb-2 text-danger">Incomplete Delivery Information</h6>
                    <p class="text-danger mb-2">Missing: ${missingInfo.join(', ')}. Please add complete delivery information to continue.</p>
                    <button class="btn btn-primary address-add-btn" 
                            data-toggle="modal" 
                            data-target="#addressModal"
                            onclick="debugAddressModal()">
                        Add Delivery Address
                    </button>
                </div>
            `;
            
            // Add event listener as backup
            const addBtn = addressContainer.querySelector('.address-add-btn');
            if (addBtn) {
                addBtn.addEventListener('click', (e) => {
                    debugLog('ADDRESS', 'Add address button clicked');
                    if (!addressModal) {
                        alert('Address modal not found. Please check if the modal HTML exists on the page.');
                        return;
                    }
                    try {
                        $('#addressModal').modal('show');
                    } catch (err) {
                        debugLog('ADDRESS', 'Bootstrap modal failed', err);
                        addressModal.style.display = 'block';
                        addressModal.classList.add('show');
                    }
                });
            }
        }
    };

    // Global debug function for address modal
    window.debugAddressModal = () => {
        debugLog('ADDRESS', 'Debug address modal called');
        const modal = document.getElementById('addressModal');
        
        if (!modal) {
            console.error('Address modal element not found! Make sure you have:');
            console.error('<div class="modal fade" id="addressModal" ...>');
            alert('Address modal not found in HTML. Check console for details.');
            return;
        }
        
        debugLog('ADDRESS', 'Modal element found', {
            id: modal.id,
            classes: modal.className,
            display: modal.style.display
        });
        
        // Check if Bootstrap is loaded
        if (typeof $ === 'undefined') {
            console.error('jQuery not loaded!');
            alert('jQuery is required for Bootstrap modals.');
            return;
        }
        
        if (typeof $.fn.modal === 'undefined') {
            console.error('Bootstrap modal plugin not loaded!');
            alert('Bootstrap modal plugin not loaded.');
            return;
        }
        
        debugLog('ADDRESS', 'Attempting to show modal');
        $('#addressModal').modal('show');
    };

    const renderItems = (items) => {
        debugLog('ITEMS', 'Rendering items', { itemCount: items ? items.length : 0 });
        
        if (!itemsContainer) {
            debugLog('ITEMS', 'ERROR: Items container not found');
            return;
        }
        
        if (!items || items.length === 0) {
            itemsContainer.innerHTML = '<p class="p-3 text-center">Your cart is empty.</p>';
            if (placeOrderBtn) placeOrderBtn.disabled = true;
            return;
        }
        
        const tableRows = items.map(item => {
            const itemSubtotal = item.price * item.quantity;
            return `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${item.image}" alt="${item.name}" class="img-fluid rounded" style="width: 50px; height: 50px; object-fit: cover;">
                            <span class="ml-3">${item.name}</span>
                        </div>
                    </td>
                    <td class="text-right">₱${parseFloat(item.price).toFixed(2)}</td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-right">₱${itemSubtotal.toFixed(2)}</td>
                </tr>`;
        }).join('');

        itemsContainer.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th scope="col">Product</th>
                        <th scope="col" class="text-right">Unit Price</th>
                        <th scope="col" class="text-center">Quantity</th>
                        <th scope="col" class="text-right">Item Subtotal</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>`;
        
        debugLog('ITEMS', 'Items rendered successfully');
    };

    
    const calculateSummary = (items, shippingOptions) => {
    debugLog('SUMMARY', 'Calculating summary', { 
        itemCount: items ? items.length : 0,
        shippingOptions 
    });
    
    const merchandiseSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = merchandiseSubtotal * 0.12; // ✅ 12% VAT
    const shippingFee = shippingOptions.standard || 0;
    const totalPayment = merchandiseSubtotal + tax + shippingFee;
    
    debugLog('SUMMARY', 'Calculations', {
        merchandiseSubtotal,
        tax,
        shippingFee,
        totalPayment
    });
    
    if (merchandiseSubtotalEl) merchandiseSubtotalEl.textContent = `₱${merchandiseSubtotal.toFixed(2)}`;
    if (taxSubtotalEl) taxSubtotalEl.textContent = `₱${tax.toFixed(2)}`;
    if (shippingSubtotalEl) shippingSubtotalEl.textContent = `₱${shippingFee.toFixed(2)}`;
    if (totalPaymentEl) totalPaymentEl.textContent = `₱${totalPayment.toFixed(2)}`;
};


    // --- PAYMENT MODAL LOGIC ---

    const populateDateDropdowns = () => {
        debugLog('PAYMENT', 'Populating date dropdowns');
        
        if (!expiryMonthSelect || !expiryYearSelect) {
            debugLog('PAYMENT', 'Date dropdown elements not found');
            return;
        }
        
        for (let i = 1; i <= 12; i++) {
            const month = i.toString().padStart(2, '0');
            expiryMonthSelect.add(new Option(month, month));
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
            const month = expiryMonthSelect.value ? expiryMonthSelect.options[expiryMonthSelect.selectedIndex].text : 'MM';
            const year = expiryYearSelect.value ? expiryYearSelect.options[expiryYearSelect.selectedIndex].text : 'YY';
            cardExpiresDisplay.textContent = `${month}/${year}`;
        }
    };

    // Payment modal event listeners
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^\d]/g, '').replace(/(.{4})/g, '$1 ').trim();
            updateCardDisplay();
        });
    }

    if (cardHolderInput) cardHolderInput.addEventListener('input', updateCardDisplay);
    if (expiryMonthSelect) expiryMonthSelect.addEventListener('change', updateCardDisplay);
    if (expiryYearSelect) expiryYearSelect.addEventListener('change', updateCardDisplay);
    if (cvvInput && cardFlipper) {
        cvvInput.addEventListener('focus', () => cardFlipper.classList.add('is-flipped'));
        cvvInput.addEventListener('blur', () => cardFlipper.classList.remove('is-flipped'));
    }

    if (bankCardRadio) {
        bankCardRadio.addEventListener('change', () => {
            if (bankCardRadio.checked && !cardDetailsSaved) {
                debugLog('PAYMENT', 'Bank card selected, showing payment modal');
                $('#paymentModal').modal('show');
            }
        });
    }

    // Payment modal close handler
    $('#paymentModal').on('hidden.bs.modal', () => {
        if (!cardDetailsSaved && codRadio) {
            codRadio.checked = true;
        }
    });

    if (savePaymentBtn && paymentForm) {
        savePaymentBtn.addEventListener('click', () => {
            if (paymentForm.checkValidity() === false) {
                alert('Please fill in all card details correctly.');
                paymentForm.classList.add('was-validated');
                return;
            }
            cardDetailsSaved = true;
            const bankCardLabel = document.querySelector('label[for="bankCard"]');
            if (bankCardLabel) {
                bankCardLabel.innerHTML = 'Bank Card <span class="text-success font-weight-bold">✔</span>';
            }
            $('#paymentModal').modal('hide');
        });
    }

    // --- ORDER PLACEMENT ---

    const handlePlaceOrder = async () => {
        debugLog('ORDER', 'Place order clicked');
        
        if (bankCardRadio && bankCardRadio.checked && !cardDetailsSaved) {
            alert('Please add your bank card details before placing the order.');
            $('#paymentModal').modal('show');
            return;
        }
        
        if (placeOrderBtn) {
            placeOrderBtn.disabled = true;
            placeOrderBtn.textContent = 'Placing Order...';
        }
        
        try {
            debugLog('ORDER', 'Sending order request');
            
            const response = await fetch(`${BACKEND_URL}/api/orders/place`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${user.token}`, 
                    'X-User-ID': user.id.toString() 
                }
            });
            
            debugLog('ORDER', 'Order response', { status: response.status, ok: response.ok });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to place order.');
            }
            
            const orderData = await response.json();
            debugLog('ORDER', 'Order placed successfully', orderData);
            
            // Store order details for the success page
            localStorage.setItem('orderTotal', totalPaymentEl ? totalPaymentEl.textContent.replace('₱', '') : '0');
            localStorage.setItem('orderNumber', orderData.orderNumber || 'TSS-2025-' + Date.now().toString().slice(-6));
            localStorage.setItem('orderDate', new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }));
            
            // Redirect to success page
            window.location.href = 'sucess.html'; 
            
        } catch (error) {
            debugLog('ORDER', 'Order error', error.message);
            console.error('Error placing order:', error);
            alert(`Error: ${error.message}`);
            
            if (placeOrderBtn) {
                placeOrderBtn.disabled = false;
                placeOrderBtn.textContent = 'Place Order';
            }
        }
    };

    // --- INITIALIZATION ---
    debugLog('INIT', 'Setting up event listeners and initializing');
    
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', handlePlaceOrder);
    }
    
    populateDateDropdowns();
    
    // Add DOM check before fetching data
    setTimeout(() => {
        debugLog('INIT', 'DOM fully loaded, fetching checkout data');
        fetchCheckoutData();
    }, 100);
    
    debugLog('INIT', 'Initialization complete');
});