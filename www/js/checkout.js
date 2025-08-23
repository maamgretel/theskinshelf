document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const user = JSON.parse(localStorage.getItem('user'));

    // --- STATE ---
    let cardDetailsSaved = false;
    let globalCheckoutData = null;

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

    // --- ENHANCED ADDRESS MODAL LOADING WITH NAME FIELD SPINNER ---
    
    // Add CSS for loading animations
    const addLoadingCSS = () => {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse-loading {
                0% { 
                    background-color: #f8f9fa; 
                    transform: scale(1);
                }
                50% { 
                    background-color: #e3f2fd; 
                    transform: scale(1.01);
                }
                100% { 
                    background-color: #f8f9fa; 
                    transform: scale(1);
                }
            }

            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }

            .loading-state {
                position: relative;
                overflow: hidden;
            }

            .loading-state::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
                animation: shimmer 1.5s infinite;
            }

            .name-loading-spinner {
                animation: fadeIn 0.3s ease;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    };

    // Initialize CSS
    addLoadingCSS();

    // Enhanced loading function with focus on name field
    const showAddressModalLoading = () => {
        debugLog('ADDRESS_MODAL', 'Showing enhanced loading with name field spinner');
        
        const fullNameInput = document.getElementById('fullName');
        const addressInput = document.getElementById('streetAddress');
        const contactInput = document.getElementById('contactNumber');
        
        if (fullNameInput) {
            fullNameInput.value = '';
            fullNameInput.placeholder = 'Loading your name...';
            fullNameInput.disabled = true;
            
            // Enhanced loading spinner specifically for name field
            const nameGroup = fullNameInput.closest('.form-group') || fullNameInput.parentElement;
            let nameSpinner = nameGroup.querySelector('.name-loading-spinner');
            
            if (!nameSpinner) {
                nameSpinner = document.createElement('div');
                nameSpinner.className = 'name-loading-spinner d-flex align-items-center mt-2 p-2 bg-light border-left border-primary rounded';
                nameSpinner.innerHTML = `
                    <div class="spinner-border spinner-border-sm text-primary mr-2" role="status" style="width: 1.2rem; height: 1.2rem;">
                        <span class="sr-only">Loading name...</span>
                    </div>
                    <small class="text-primary font-weight-medium">
                        <i class="fas fa-user mr-1"></i>Fetching your name data...
                    </small>
                `;
                
                // Insert after the input field
                if (fullNameInput.nextSibling) {
                    nameGroup.insertBefore(nameSpinner, fullNameInput.nextSibling);
                } else {
                    nameGroup.appendChild(nameSpinner);
                }
            }
            
            // Add enhanced loading visual state for name field
            fullNameInput.classList.add('loading-state');
            fullNameInput.style.backgroundColor = '#f8f9fa';
            fullNameInput.style.borderColor = '#007bff';
            fullNameInput.style.borderWidth = '2px';
            fullNameInput.style.transition = 'all 0.3s ease';
            fullNameInput.style.animation = 'pulse-loading 1.5s infinite';
        }
        
        // Handle other fields with simpler loading states
        if (addressInput) {
            addressInput.disabled = true;
            addressInput.placeholder = 'Loading address...';
            addressInput.classList.add('loading-state');
            addressInput.style.backgroundColor = '#f8f9fa';
        }
        
        if (contactInput) {
            contactInput.disabled = true;
            contactInput.placeholder = 'Loading contact...';
            contactInput.classList.add('loading-state');
            contactInput.style.backgroundColor = '#f8f9fa';
        }
        
        // Disable save button during loading
        const modalSaveBtn = document.getElementById('save-address-btn');
        if (modalSaveBtn) {
            modalSaveBtn.disabled = true;
            modalSaveBtn.innerHTML = `
                <span class="spinner-border spinner-border-sm mr-2" role="status"></span>
                Loading data...
            `;
        }
    };

    // Hide loading and populate fields
    const hideAddressModalLoading = (deliveryData = null) => {
        debugLog('ADDRESS_MODAL', 'Hiding loading and populating fields', deliveryData);
        
        const fullNameInput = document.getElementById('fullName');
        const addressInput = document.getElementById('streetAddress');
        const contactInput = document.getElementById('contactNumber');
        
        if (fullNameInput) {
            fullNameInput.disabled = false;
            fullNameInput.placeholder = 'Enter your full name';
            fullNameInput.value = (deliveryData && deliveryData.name) ? deliveryData.name : '';
            
            // Remove loading visual state
            fullNameInput.classList.remove('loading-state');
            fullNameInput.style.backgroundColor = '';
            fullNameInput.style.borderColor = '';
            fullNameInput.style.borderWidth = '';
            fullNameInput.style.animation = '';
            
            // Handle spinner with success/completion animation
            const nameGroup = fullNameInput.closest('.form-group') || fullNameInput.parentElement;
            const nameSpinner = nameGroup.querySelector('.name-loading-spinner');
            if (nameSpinner) {
                if (deliveryData && deliveryData.name) {
                    // Show success message
                    nameSpinner.innerHTML = `
                        <div class="d-flex align-items-center mt-2 p-2 bg-light border-left border-success rounded">
                            <i class="fas fa-check-circle text-success mr-2"></i>
                            <small class="text-success font-weight-medium">Name loaded: ${deliveryData.name}</small>
                        </div>
                    `;
                    
                    // Add success border to name field temporarily
                    fullNameInput.style.borderColor = '#28a745';
                    fullNameInput.style.borderWidth = '2px';
                    
                    setTimeout(() => {
                        fullNameInput.style.borderColor = '';
                        fullNameInput.style.borderWidth = '';
                    }, 2000);
                    
                    // Remove after showing success
                    setTimeout(() => {
                        nameSpinner.style.opacity = '0';
                        nameSpinner.style.transition = 'opacity 0.5s ease';
                        setTimeout(() => {
                            if (nameSpinner.parentNode) {
                                nameSpinner.remove();
                            }
                        }, 500);
                    }, 2000);
                } else {
                    // No data, just fade out
                    nameSpinner.style.opacity = '0';
                    nameSpinner.style.transition = 'opacity 0.3s ease';
                    setTimeout(() => {
                        if (nameSpinner.parentNode) {
                            nameSpinner.remove();
                        }
                    }, 300);
                }
            }
        }
        
        if (addressInput) {
            addressInput.disabled = false;
            addressInput.placeholder = 'e.g., Purok 5, near Daghan Copra';
            addressInput.value = (deliveryData && deliveryData.address) ? deliveryData.address : '';
            addressInput.classList.remove('loading-state');
            addressInput.style.backgroundColor = '';
        }
        
        if (contactInput) {
            contactInput.disabled = false;
            contactInput.placeholder = '09XXXXXXXXX (Optional)';
            contactInput.value = (deliveryData && deliveryData.contact_number) ? deliveryData.contact_number : '';
            contactInput.classList.remove('loading-state');
            contactInput.style.backgroundColor = '';
        }
        
        // Re-enable save button
        const modalSaveBtn = document.getElementById('save-address-btn');
        if (modalSaveBtn) {
            modalSaveBtn.disabled = false;
            modalSaveBtn.innerHTML = '<i class="fas fa-save"></i> Save Address';
        }
    };

    // Hide loading with error
    const hideAddressModalLoadingWithError = (errorMessage) => {
        debugLog('ADDRESS_MODAL', 'Hiding loading with error', errorMessage);
        
        const fullNameInput = document.getElementById('fullName');
        const addressInput = document.getElementById('streetAddress');
        const contactInput = document.getElementById('contactNumber');
        
        if (fullNameInput) {
            fullNameInput.disabled = false;
            fullNameInput.placeholder = 'Enter your full name';
            fullNameInput.value = '';
            
            // Remove loading state
            fullNameInput.classList.remove('loading-state');
            fullNameInput.style.backgroundColor = '';
            fullNameInput.style.borderColor = '';
            fullNameInput.style.borderWidth = '';
            fullNameInput.style.animation = '';
            
            // Show error for name field
            const nameGroup = fullNameInput.closest('.form-group') || fullNameInput.parentElement;
            const nameSpinner = nameGroup.querySelector('.name-loading-spinner');
            if (nameSpinner) {
                nameSpinner.innerHTML = `
                    <div class="d-flex align-items-center mt-2 p-2 bg-light border-left border-warning rounded">
                        <i class="fas fa-exclamation-triangle text-warning mr-2"></i>
                        <small class="text-warning font-weight-bold">${errorMessage}</small>
                    </div>
                `;
                
                // Add warning border
                fullNameInput.style.borderColor = '#ffc107';
                fullNameInput.style.borderWidth = '2px';
                
                // Auto-remove after 4 seconds
                setTimeout(() => {
                    if (nameSpinner) {
                        nameSpinner.style.opacity = '0';
                        nameSpinner.style.transition = 'opacity 0.5s ease';
                        setTimeout(() => {
                            if (nameSpinner.parentNode) {
                                nameSpinner.remove();
                            }
                            fullNameInput.style.borderColor = '';
                            fullNameInput.style.borderWidth = '';
                        }, 500);
                    }
                }, 4000);
            }
        }
        
        // Handle other fields
        if (addressInput) {
            addressInput.disabled = false;
            addressInput.placeholder = 'e.g., Purok 5, near Daghan Copra';
            addressInput.value = '';
            addressInput.classList.remove('loading-state');
            addressInput.style.backgroundColor = '';
        }
        
        if (contactInput) {
            contactInput.disabled = false;
            contactInput.placeholder = '09XXXXXXXXX (Optional)';
            contactInput.value = '';
            contactInput.classList.remove('loading-state');
            contactInput.style.backgroundColor = '';
        }
        
        // Re-enable save button
        const modalSaveBtn = document.getElementById('save-address-btn');
        if (modalSaveBtn) {
            modalSaveBtn.disabled = false;
            modalSaveBtn.innerHTML = '<i class="fas fa-save"></i> Save Address';
        }
    };

    // Enhanced fetch function with realistic loading time
    const fetchAddressForModal = async () => {
        debugLog('ADDRESS_MODAL', 'Loading address data with enhanced name field loading');
        
        try {
            showAddressModalLoading();
            
            // Realistic loading time for better UX
            const minLoadingTime = new Promise(resolve => setTimeout(resolve, 1500));
            
            await minLoadingTime;
            
            // Check if we have global checkout data
            if (!globalCheckoutData || !globalCheckoutData.deliveryInfo) {
                debugLog('ADDRESS_MODAL', 'No global checkout data available');
                hideAddressModalLoading(null);
                return;
            }
            
            const deliveryData = globalCheckoutData.deliveryInfo;
            debugLog('ADDRESS_MODAL', 'Using existing delivery data', deliveryData);
            
            hideAddressModalLoading(deliveryData);
            
        } catch (error) {
            debugLog('ADDRESS_MODAL', 'Error loading address data', error);
            console.error('Error loading delivery info:', error);
            hideAddressModalLoadingWithError('Failed to load name data');
        }
    };

    // Enhanced address modal handler
    window.debugAddressModal = () => {
        debugLog('ADDRESS', 'Debug address modal called with enhanced name loading');
        const modal = document.getElementById('addressModal');
        
        if (!modal) {
            console.error('Address modal element not found!');
            alert('Address modal not found in HTML. Check console for details.');
            return;
        }
        
        debugLog('ADDRESS', 'Modal element found', {
            id: modal.id,
            classes: modal.className
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
        
        debugLog('ADDRESS', 'Showing modal and fetching address data with name field focus');
        
        // Show modal first
        $('#addressModal').modal('show');
        
        // Fetch address data when modal is shown
        $('#addressModal').on('shown.bs.modal', function (e) {
            if (!e.target.classList.contains('data-fetched')) {
                e.target.classList.add('data-fetched');
                fetchAddressForModal();
            }
        });
        
        // Clean up when modal is hidden
        $('#addressModal').on('hidden.bs.modal', function (e) {
            e.target.classList.remove('data-fetched');
            hideAddressModalLoading();
        });
    };

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
            
            // Store data globally for modal use
            globalCheckoutData = checkoutData;
            debugLog('FETCH', 'Data stored globally for modal use', globalCheckoutData.deliveryInfo);
            
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

    // Show loading spinner for address
    const showAddressLoading = () => {
        debugLog('ADDRESS', 'Showing address loading spinner');
        
        if (!addressContainer) {
            debugLog('ADDRESS', 'ERROR: Address container not found in DOM');
            return;
        }
        
        addressContainer.innerHTML = `
            <div class="border rounded p-3 mb-3">
                <h6 class="mb-2">Delivery Address</h6>
                <div class="d-flex align-items-center justify-content-center py-3">
                    <div class="spinner-border spinner-border-sm text-primary mr-2" role="status">
                        <span class="sr-only">Loading...</span>
                    </div>
                    <span class="text-muted">Loading address information...</span>
                </div>
            </div>
        `;
    };

    // Show loading spinner for items
    const showItemsLoading = () => {
        debugLog('ITEMS', 'Showing items loading spinner');
        
        if (!itemsContainer) {
            debugLog('ITEMS', 'ERROR: Items container not found');
            return;
        }
        
        itemsContainer.innerHTML = `
            <div class="d-flex align-items-center justify-content-center py-4">
                <div class="spinner-border spinner-border-sm text-primary mr-2" role="status">
                    <span class="sr-only">Loading...</span>
                </div>
                <span class="text-muted">Loading cart items...</span>
            </div>
        `;
    };

    // Render address
    const renderAddress = (deliveryInfo) => {
        debugLog('ADDRESS', 'Rendering address', deliveryInfo);
        
        if (!addressContainer) {
            debugLog('ADDRESS', 'ERROR: Address container not found in DOM');
            return;
        }

        const addressModal = document.getElementById('addressModal');
        debugLog('ADDRESS', 'Address modal exists', !!addressModal);
        
        const hasValidAddress = deliveryInfo && 
                               deliveryInfo.address && 
                               deliveryInfo.address.trim() !== '';
        
        debugLog('ADDRESS', 'Address validation', {
            hasDeliveryInfo: !!deliveryInfo,
            hasAddress: deliveryInfo ? (deliveryInfo.address && deliveryInfo.address.trim() !== '') : false,
            hasName: deliveryInfo ? (deliveryInfo.name && deliveryInfo.name.trim() !== '') : false,
            hasContact: deliveryInfo ? (deliveryInfo.contact_number && deliveryInfo.contact_number.trim() !== '') : false,
            isValid: hasValidAddress
        });
        
        if (hasValidAddress) {
            debugLog('ADDRESS', 'Valid delivery info found, rendering address');
            
            const contactDisplay = (deliveryInfo.contact_number && deliveryInfo.contact_number.trim() !== '') 
                ? `(${deliveryInfo.contact_number})` 
                : '<span class="text-muted">(No contact number)</span>';
            
            const nameDisplay = (deliveryInfo.name && deliveryInfo.name.trim() !== '') 
                ? `${deliveryInfo.name} ` 
                : '';
            
            addressContainer.innerHTML = `
                <div class="border rounded p-3 mb-3">
                    <h6 class="mb-2">Delivery Address</h6>
                    <p class="font-weight-bold mb-1">${nameDisplay}${contactDisplay}</p>
                    <p class="mb-2">${deliveryInfo.address}</p>
                    ${(!deliveryInfo.contact_number || deliveryInfo.contact_number.trim() === '') ? 
                        '<small class="text-warning">⚠️ Consider adding a contact number for delivery updates</small><br>' : ''}
                    ${(!deliveryInfo.name || deliveryInfo.name.trim() === '') ? 
                        '<small class="text-info">💡 You can add a recipient name for better delivery experience</small><br>' : ''}
                    <button class="btn btn-sm btn-outline-secondary address-change-btn" 
                            data-toggle="modal" 
                            data-target="#addressModal"
                            onclick="debugAddressModal()">
                        Change Address
                    </button>
                </div>
            `;
            
            const changeBtn = addressContainer.querySelector('.address-change-btn');
            if (changeBtn) {
                changeBtn.addEventListener('click', (e) => {
                    debugLog('ADDRESS', 'Change button clicked');
                    if (!addressModal) {
                        alert('Address modal not found. Please refresh the page.');
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
            
        } else {
            debugLog('ADDRESS', 'No valid delivery info, showing add address option');
            
            let missingInfo = [];
            if (!deliveryInfo) {
                missingInfo.push('delivery information');
            } else {
                if (!deliveryInfo.address || deliveryInfo.address.trim() === '') missingInfo.push('address');
            }
            
            addressContainer.innerHTML = `
                <div class="border rounded p-3 mb-3 border-danger">
                    <h6 class="mb-2 text-danger">Incomplete Delivery Information</h6>
                    <p class="text-danger mb-2">Missing: ${missingInfo.join(', ')}. Please add a delivery address to continue.</p>
                    <button class="btn btn-primary address-add-btn" 
                            data-toggle="modal" 
                            data-target="#addressModal"
                            onclick="debugAddressModal()">
                        Add Delivery Address
                    </button>
                </div>
            `;
            
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
        const tax = merchandiseSubtotal * 0.12;
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

    // --- PAYMENT OTP FUNCTIONALITY ---

    // Get DOM elements for payment OTP functionality
    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    const otpInput = document.getElementById('otpInput');

    // Function to get user email
    function getUserEmail() {
        debugLog('PAYMENT', 'Getting user email from existing user object', user);
        
        if (user && user.email) {
            debugLog('PAYMENT', 'Email found in user object', user.email);
            return user.email;
        }
        
        throw new Error('No email found in user data');
    }

    // Validate card data
    function validateCardData(cardData) {
        const required = ['number', 'holder', 'expiryMonth', 'expiryYear', 'cvv'];
        const missing = required.filter(field => !cardData[field] || !cardData[field].trim());
        
        if (missing.length > 0) {
            alert(`Please fill in all card details: ${missing.join(', ')}`);
            return false;
        }
        
        if (cardData.number.replace(/\s/g, '').length < 13) {
            alert('Please enter a valid card number');
            return false;
        }
        
        if (cardData.cvv.length < 3) {
            alert('Please enter a valid CVV');
            return false;
        }
        
        return true;
    }

    // Save payment button handler
    if (savePaymentBtn) {
        debugLog('PAYMENT', 'Setting up save payment button handler');
        
        // Remove any existing event listeners first
        const newSaveBtn = savePaymentBtn.cloneNode(true);
        savePaymentBtn.parentNode.replaceChild(newSaveBtn, savePaymentBtn);
        
        // Update the reference
        const simplifiedSavePaymentBtn = document.getElementById('save-payment-btn');
        
        if (simplifiedSavePaymentBtn) {
            simplifiedSavePaymentBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                
                const originalText = simplifiedSavePaymentBtn.textContent;
                
                try {
                    debugLog('PAYMENT', 'Save payment button clicked');
                    
                    // Validate the form
                    if (paymentForm && paymentForm.checkValidity() === false) {
                        alert('Please fill in all card details correctly.');
                        paymentForm.classList.add('was-validated');
                        return;
                    }
                    
                    // Collect card data
                    const cardData = {
                        number: cardNumberInput?.value?.trim() || '',
                        holder: cardHolderInput?.value?.trim() || '',
                        expiryMonth: expiryMonthSelect?.value?.trim() || '',
                        expiryYear: expiryYearSelect?.value?.trim() || '',
                        cvv: cvvInput?.value?.trim() || ''
                    };

                    debugLog('PAYMENT', 'Card data collected', {
                        hasNumber: !!cardData.number,
                        hasHolder: !!cardData.holder,
                        hasExpiry: !!(cardData.expiryMonth && cardData.expiryYear),
                        hasCvv: !!cardData.cvv
                    });

                    // Validate card data
                    if (!validateCardData(cardData)) {
                        return;
                    }

                    debugLog('PAYMENT', 'Requesting OTP for card save...');
                    
                    // Get user email
                    let userEmail;
                    try {
                        userEmail = getUserEmail();
                        debugLog('PAYMENT', 'User email obtained', userEmail);
                    } catch (error) {
                        console.error('Failed to get user email:', error);
                        alert('Unable to get your email. Please refresh the page and try again.');
                        return;
                    }

                    // Show loading state
                    simplifiedSavePaymentBtn.disabled = true;
                    simplifiedSavePaymentBtn.textContent = 'Requesting OTP...';

                    // Request OTP
                    const requestBody = {
                        email: userEmail,
                        userId: user?.id
                    };

                    debugLog('PAYMENT', 'Sending OTP request', requestBody);

                    const response = await fetch(`${BACKEND_URL}/api/orders/request-otp-save-card`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'X-User-ID': user.id.toString()
                        },
                        body: JSON.stringify(requestBody)
                    });

                    debugLog('PAYMENT', 'OTP request response', {
                        status: response.status,
                        ok: response.ok,
                        statusText: response.statusText
                    });

                    // Handle response
                    if (!response.ok) {
                        const errorText = await response.text();
                        debugLog('PAYMENT', 'OTP request error response', errorText);
                        throw new Error(`Request failed: ${response.status} - ${errorText}`);
                    }

                    const data = await response.json();
                    debugLog('PAYMENT', 'OTP Response data', data);
                    
                    if (data.message?.includes('OTP sent') || data.success || data.status === 'success') {
                        // Success - show OTP modal
                        debugLog('PAYMENT', 'OTP sent successfully, showing OTP modal');
                        
                        $('#paymentModal').modal('hide');
                        
                        // Wait for the first modal to close, then show OTP modal
                        setTimeout(() => {
                            $('#otpModal').modal('show');
                        }, 300);
                        
                        // Store card data temporarily
                        sessionStorage.setItem('tempCardData', JSON.stringify(cardData));
                        sessionStorage.setItem('tempUserEmail', userEmail);
                        
                        // Focus on OTP input after modal is shown
                        setTimeout(() => {
                            if (otpInput) {
                                otpInput.focus();
                                otpInput.value = '';
                            }
                        }, 800);
                        
                    } else {
                        throw new Error(data.error || data.message || 'Failed to send OTP');
                    }
                    
                } catch (error) {
                    console.error('[ERROR] OTP request failed:', error);
                    
                    if (error.message.includes('network') || error.message.includes('Failed to fetch')) {
                        alert('Network error. Please check your connection and try again.');
                    } else {
                        alert(`Error: ${error.message || 'Failed to send OTP. Please try again.'}`);
                    }
                } finally {
                    // Reset button state
                    simplifiedSavePaymentBtn.disabled = false;
                    simplifiedSavePaymentBtn.textContent = originalText;
                }
            });
            
            debugLog('PAYMENT', 'Save payment button handler set up successfully');
        }
    }

    // OTP verification handler
    if (verifyOtpBtn) {
        debugLog('PAYMENT', 'Setting up OTP verification handler');
        
        verifyOtpBtn.addEventListener('click', async () => {
            const originalText = verifyOtpBtn.textContent;
            
            try {
                const otp = otpInput?.value?.trim();

                if (!otp) {
                    alert("Please enter the OTP.");
                    otpInput?.focus();
                    return;
                }

                if (otp.length !== 6 || !/^\d+$/.test(otp)) {
                    alert("Please enter a valid 6-digit OTP.");
                    otpInput?.focus();
                    return;
                }

                debugLog('PAYMENT', 'Verifying OTP...');

                // Show loading state
                verifyOtpBtn.disabled = true;
                verifyOtpBtn.textContent = 'Verifying...';

                // Get stored email and card data
                const storedEmail = sessionStorage.getItem('tempUserEmail');
                const cardDataStr = sessionStorage.getItem('tempCardData');
                
                if (!storedEmail) {
                    throw new Error('Email data expired. Please try saving your card again.');
                }
                
                if (!cardDataStr) {
                    throw new Error('Card data expired. Please try saving your card again.');
                }

                const cardData = JSON.parse(cardDataStr);
                
                // Verify OTP
                const requestBody = {
                    email: storedEmail,
                    otp: otp,
                    cardData: cardData,
                    userId: user?.id
                };

                debugLog('PAYMENT', 'Sending OTP verification', {
                    email: storedEmail,
                    otp: otp,
                    hasCardData: !!cardData,
                    userId: user?.id
                });

                const response = await fetch(`${BACKEND_URL}/api/orders/verify-otp-save-card`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-User-ID': user.id.toString()
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Verification failed: ${response.status} - ${errorText}`);
                }

                const data = await response.json();
                debugLog('PAYMENT', 'OTP Verification response', { status: response.status, data });
                
                if (data.message?.includes('Card saved') || data.success || data.status === 'success') {
                    // Success - update the UI
                    cardDetailsSaved = true;
                    
                    const bankCardLabel = document.querySelector('label[for="bankCard"]');
                    if (bankCardLabel) {
                        bankCardLabel.innerHTML = 'Bank Card <span class="text-success font-weight-bold">✔ Saved</span>';
                    }
                    
                    $('#otpModal').modal('hide');
                    alert("✅ Card saved successfully!");
                    
                    // Clean up
                    sessionStorage.removeItem('tempCardData');
                    sessionStorage.removeItem('tempUserEmail');
                    if (otpInput) otpInput.value = '';
                    
                } else {
                    throw new Error(data.error || data.message || 'Verification failed');
                }
                
            } catch (error) {
                console.error('[ERROR] OTP verification failed:', error);
                
                if (error.message.includes('data expired')) {
                    $('#otpModal').modal('hide');
                    setTimeout(() => {
                        $('#paymentModal').modal('show');
                    }, 300);
                }
                
                alert(error.message || 'Error verifying OTP. Please try again.');
                
            } finally {
                // Reset button state
                verifyOtpBtn.disabled = false;
                verifyOtpBtn.textContent = originalText;
            }
        });
    }

    // Add enter key support for OTP input
    if (otpInput) {
        otpInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && verifyOtpBtn && !verifyOtpBtn.disabled) {
                verifyOtpBtn.click();
            }
        });
        
        // Auto-format OTP input (numbers only, max 6 digits)
        otpInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').substring(0, 6);
        });
    }

    // Modal event handlers
    if (typeof $ !== 'undefined') {
        // Clean up when payment modal is hidden
        $('#paymentModal').on('hidden.bs.modal', () => {
            debugLog('PAYMENT', 'Payment modal hidden');
            if (!cardDetailsSaved && codRadio) {
                codRadio.checked = true;
            }
        });

        // Clean up when OTP modal is hidden
        $('#otpModal').on('hidden.bs.modal', () => {
            debugLog('PAYMENT', 'OTP modal hidden');
            setTimeout(() => {
                const tempCardData = sessionStorage.getItem('tempCardData');
                const tempEmail = sessionStorage.getItem('tempUserEmail');
                if ((tempCardData || tempEmail) && !cardDetailsSaved) {
                    sessionStorage.removeItem('tempCardData');
                    sessionStorage.removeItem('tempUserEmail');
                    debugLog('PAYMENT', 'Cleaned up temporary data');
                }
            }, 1000);
        });
    }

    // Clean up temporary data on page unload
    window.addEventListener('beforeunload', () => {
        sessionStorage.removeItem('tempCardData');
        sessionStorage.removeItem('tempUserEmail');
    });

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
    
    debugLog('INIT', 'Initialization complete with enhanced name field loading');
});