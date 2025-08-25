document.addEventListener('DOMContentLoaded', () => {
    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const user = JSON.parse(localStorage.getItem('user'));

    // --- Security Check ---
    if (!user || user.role !== 'customer') {
        window.location.href = 'login.html';
        return;
    }

    const cartItemsContainer = document.getElementById('cart-items-container');
    const emptyCartMessage = document.getElementById('empty-cart-message');
    const selectAllContainer = document.getElementById('select-all-container');
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    const checkoutBtn = document.getElementById('checkout-btn');

    // --- Keep a local copy of the cart with selection state ---
    let localCartItems = [];

    const fetchCartItems = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/cart`, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': user.id.toString(),
                },
            });
            if (!response.ok) throw new Error('Failed to fetch cart items.');

            const items = await response.json();
            // Store the fetched items with selection state and stock info
            localCartItems = items.map(item => ({
                ...item,
                selected: true, // Default all items to selected
                stock: item.stock || 0 // Stock info should now come from backend
            }));
            renderCart(localCartItems);
        } catch (error) {
            console.error('Error fetching cart:', error);
            cartItemsContainer.innerHTML = `<div class="alert alert-danger">Could not load your bag. Please try again later.</div>`;
        }
    };

    const renderCart = (items) => {
        if (!items || items.length === 0) {
            emptyCartMessage.style.display = 'block';
            cartItemsContainer.style.display = 'none';
            selectAllContainer.style.display = 'none';
            updateSummary([]);
            return;
        }

        emptyCartMessage.style.display = 'none';
        cartItemsContainer.style.display = 'block';
        selectAllContainer.style.display = 'block';
        cartItemsContainer.innerHTML = '';

        items.forEach(item => {
            const isOutOfStock = item.stock <= 0;
            const isLowStock = item.stock <= 10 && item.stock > 0;
            const exceedsStock = item.quantity > item.stock;
            
            const itemElement = document.createElement('div');
            itemElement.className = `card mb-3 ${isOutOfStock ? 'out-of-stock' : ''}`;
            
            let stockDisplay = '';
            if (isOutOfStock) {
                stockDisplay = '<div class="stock-warning"><i class="fas fa-times-circle"></i> Out of Stock</div>';
            } else if (isLowStock) {
                stockDisplay = `<div class="stock-info low-stock"><i class="fas fa-exclamation-triangle"></i> Only ${item.stock} left in stock</div>`;
            } else {
                stockDisplay = `<div class="stock-info">${item.stock} available</div>`;
            }

            let quantityWarning = '';
            if (exceedsStock && !isOutOfStock) {
                quantityWarning = '<div class="stock-warning mt-1"><i class="fas fa-exclamation-circle"></i> Quantity exceeds available stock</div>';
            }

            itemElement.innerHTML = `
                <div class="row no-gutters">
                    <div class="col-md-1 d-flex align-items-center justify-content-center">
                        <input type="checkbox" class="item-checkbox" data-item-id="${item.id}" ${item.selected ? 'checked' : ''} ${isOutOfStock ? 'disabled' : ''}>
                    </div>
                    <div class="col-md-2 d-flex align-items-center justify-content-center">
                        <img src="${item.image || '../assets/default-product.png'}" class="img-fluid p-2" alt="${item.name}" style="max-height: 100px; object-fit: contain;">
                    </div>
                    <div class="col-md-4">
                        <div class="card-body">
                            <h5 class="card-title">${item.name}</h5>
                            <p class="card-text font-weight-bold">₱${parseFloat(item.price).toFixed(2)}</p>
                            ${stockDisplay}
                            ${quantityWarning}
                        </div>
                    </div>
                    <div class="col-md-3 d-flex align-items-center">
                        <div class="quantity-controls">
                            <button class="quantity-btn decrease-btn" data-item-id="${item.id}" ${isOutOfStock || item.quantity <= 1 ? 'disabled' : ''}>
                                <i class="fas fa-minus"></i>
                            </button>
                            <input type="number" class="form-control quantity-input" value="${item.quantity}" min="1" max="${item.stock}" data-item-id="${item.id}" ${isOutOfStock ? 'disabled' : ''}>
                            <button class="quantity-btn increase-btn" data-item-id="${item.id}" ${isOutOfStock || item.quantity >= item.stock ? 'disabled' : ''}>
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
                    <div class="col-md-2 d-flex align-items-center justify-content-center">
                        <button class="btn btn-outline-danger remove-btn" data-item-id="${item.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            cartItemsContainer.appendChild(itemElement);
        });

        addEventListeners();
        updateSummary(items);
        updateSelectAllCheckbox();
    };

    const updateSummary = (items) => {
        const selectedItems = items.filter(item => item.selected && item.stock > 0);
        const summaryDetailsEl = document.getElementById('order-summary-details');
        const subtotalEl = document.getElementById('cart-subtotal');
        const totalEl = document.getElementById('cart-total');
        const selectedCountEl = document.getElementById('selected-items-count');
        const checkoutCountEl = document.getElementById('checkout-count');

        summaryDetailsEl.innerHTML = '';
        const subtotal = selectedItems.reduce((sum, item) => sum + (item.price * Math.min(item.quantity, item.stock)), 0);

        selectedItems.forEach(item => {
            const effectiveQuantity = Math.min(item.quantity, item.stock);
            const itemTotal = item.price * effectiveQuantity;
            const itemSummaryLine = document.createElement('div');
            itemSummaryLine.className = 'd-flex justify-content-between text-muted small';
            itemSummaryLine.innerHTML = `
                <span>${item.name} x ${effectiveQuantity}</span>
                <span>₱${itemTotal.toFixed(2)}</span>
            `;
            summaryDetailsEl.appendChild(itemSummaryLine);
        });

        selectedCountEl.textContent = selectedItems.length;
        checkoutCountEl.textContent = selectedItems.length;
        subtotalEl.textContent = `₱${subtotal.toFixed(2)}`;
        totalEl.textContent = `₱${subtotal.toFixed(2)}`;

        // Enable/disable checkout button
        checkoutBtn.disabled = selectedItems.length === 0;
    };

    const updateSelectAllCheckbox = () => {
        const availableItems = localCartItems.filter(item => item.stock > 0);
        const selectedAvailableItems = availableItems.filter(item => item.selected);
        
        if (availableItems.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (selectedAvailableItems.length === availableItems.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else if (selectedAvailableItems.length > 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }
    };

    const showStockWarning = (message) => {
        document.getElementById('stock-warning-message').textContent = message;
        $('#stockWarningModal').modal('show');
    };

    const validateQuantity = (item, newQuantity) => {
        if (newQuantity > item.stock) {
            showStockWarning(`Sorry! Only ${item.stock} units of "${item.name}" are available in stock.`);
            return false;
        }
        return true;
    };

    const addEventListeners = () => {
        // Select All checkbox
        selectAllCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            localCartItems.forEach(item => {
                if (item.stock > 0) {
                    item.selected = isChecked;
                }
            });
            
            // Update individual checkboxes
            document.querySelectorAll('.item-checkbox').forEach(checkbox => {
                const itemId = checkbox.getAttribute('data-item-id');
                const item = localCartItems.find(item => item.id.toString() === itemId);
                if (item && item.stock > 0) {
                    checkbox.checked = isChecked;
                }
            });
            
            updateSummary(localCartItems);
        });

        // Individual item checkboxes
        document.querySelectorAll('.item-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const itemId = e.target.getAttribute('data-item-id');
                const item = localCartItems.find(item => item.id.toString() === itemId);
                if (item) {
                    item.selected = e.target.checked;
                    updateSummary(localCartItems);
                    updateSelectAllCheckbox();
                }
            });
        });

        // --- Listener for the "Remove" button ---
        document.querySelectorAll('.remove-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                if (window.confirm('Are you sure you want to remove this item?')) {
                    const itemId = e.currentTarget.getAttribute('data-item-id');
                    
                    // Instantly remove the item from the local array
                    localCartItems = localCartItems.filter(item => item.id.toString() !== itemId);
                    
                    // Instantly re-render the UI
                    renderCart(localCartItems);
                    
                    // Update backend in the background
                    updateCartAPI('DELETE', itemId);
                }
            });
        });

        // --- Decrease quantity button ---
        document.querySelectorAll('.decrease-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const itemId = e.currentTarget.getAttribute('data-item-id');
                const item = localCartItems.find(item => item.id.toString() === itemId);
                if (item && item.quantity > 1) {
                    item.quantity--;
                    renderCart(localCartItems);
                    updateCartAPI('PUT', itemId, { quantity: item.quantity });
                }
            });
        });

        // --- Increase quantity button ---
        document.querySelectorAll('.increase-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const itemId = e.currentTarget.getAttribute('data-item-id');
                const item = localCartItems.find(item => item.id.toString() === itemId);
                if (item && validateQuantity(item, item.quantity + 1)) {
                    item.quantity++;
                    renderCart(localCartItems);
                    updateCartAPI('PUT', itemId, { quantity: item.quantity });
                }
            });
        });

        // --- Listener for the quantity input field ---
        document.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const itemId = e.target.getAttribute('data-item-id');
                let quantity = parseInt(e.target.value, 10);
                const item = localCartItems.find(item => item.id.toString() === itemId);

                // Added validation to ensure quantity is a positive number
                if (isNaN(quantity) || quantity < 1) {
                    quantity = 1;
                    e.target.value = 1;
                }

                if (item) {
                    if (validateQuantity(item, quantity)) {
                        item.quantity = quantity;
                        updateSummary(localCartItems);
                        updateCartAPI('PUT', itemId, { quantity });
                    } else {
                        e.target.value = item.quantity; // Reset to previous value
                    }
                }
            });
        });
    };

    // --- Checkout button event listener ---
    checkoutBtn.addEventListener('click', () => {
        const selectedItems = localCartItems.filter(item => item.selected && item.stock > 0);
        if (selectedItems.length > 0) {
            // Store selected items for checkout
            sessionStorage.setItem('selectedCartItems', JSON.stringify(selectedItems));
            window.location.href = 'checkout.html';
        }
    });

    // --- This function updates the backend but doesn't re-fetch ---
    const updateCartAPI = async (method, itemId, body = null) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/cart/${itemId}`, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': user.id.toString(),
                },
                body: body ? JSON.stringify(body) : null,
            });

            if (!response.ok) {
                // If the update fails, re-fetch to sync with the server's true state
                console.error('Failed to update cart on the server. Re-syncing.');
                fetchCartItems(); 
                throw new Error('Failed to update cart.');
            }
            // On success, we do nothing, because the UI is already updated.
        } catch (error) {
            console.error(`Error with ${method} request:`, error);
        }
    };

    // Initial load
    fetchCartItems();
});