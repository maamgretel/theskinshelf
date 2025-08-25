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

    // --- Local Cart Manager ---
    const LocalCart = {
        // Get local cart data
        getCart() {
            const cart = localStorage.getItem(`cart_${user.id}`);
            return cart ? JSON.parse(cart) : {};
        },

        // Save cart to local storage
        saveCart(cart) {
            localStorage.setItem(`cart_${user.id}`, JSON.stringify(cart));
        },

        // Convert cart object to array format for rendering
        getCartArray() {
            const cart = this.getCart();
            return Object.values(cart).map(item => ({
                id: item.product_id,
                name: item.name,
                price: parseFloat(item.price),
                quantity: item.quantity,
                image: item.image || '../assets/default-product.png',
                stock: item.stock || 999, // Default high stock for local items
                selected: true // Default selected
            }));
        },

        // Update item quantity
        updateQuantity(productId, newQuantity) {
            const cart = this.getCart();
            if (cart[productId]) {
                if (newQuantity <= 0) {
                    delete cart[productId];
                } else {
                    cart[productId].quantity = newQuantity;
                }
                this.saveCart(cart);
                this.updateCartBadge();
            }
        },

        // Remove item from cart
        removeItem(productId) {
            const cart = this.getCart();
            delete cart[productId];
            this.saveCart(cart);
            this.updateCartBadge();
        },

        // Get total items count
        getTotalItems() {
            const cart = this.getCart();
            return Object.values(cart).reduce((total, item) => total + item.quantity, 0);
        },

        // Update cart badge
        updateCartBadge() {
            const totalItems = this.getTotalItems();
            const badge = document.querySelector('.cart-badge');
            
            if (badge) {
                badge.textContent = totalItems;
                badge.style.display = totalItems > 0 ? 'inline' : 'none';
            }

            // Also update navigation badge if it exists
            const navBadge = document.querySelector('.badge-pill');
            if (navBadge) {
                navBadge.textContent = totalItems;
                navBadge.style.display = totalItems > 0 ? 'inline' : 'none';
            }
        },

        // Clear selected items (after checkout)
        clearSelectedItems(selectedIds) {
            const cart = this.getCart();
            selectedIds.forEach(id => {
                delete cart[id.toString()];
            });
            this.saveCart(cart);
            this.updateCartBadge();
        }
    };

    // --- Keep a local copy of the cart with selection state ---
    let localCartItems = [];

    // --- Sync local cart to backend ---
    const syncCartToBackend = async () => {
        try {
            const localCart = LocalCart.getCart();
            const cartItems = Object.values(localCart);

            if (cartItems.length === 0) {
                console.log('No items to sync');
                return;
            }

            console.log('Syncing cart to backend:', cartItems);

            const response = await fetch(`${BACKEND_URL}/api/cart/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': user.id.toString(),
                },
                body: JSON.stringify({ items: cartItems })
            });

            if (!response.ok) {
                throw new Error('Failed to sync cart to backend');
            }

            console.log('Cart synced successfully');
        } catch (error) {
            console.error('Failed to sync cart:', error);
        }
    };

    // --- Fetch cart items from backend after sync ---
    const fetchCartItems = async () => {
        try {
            // First sync local cart to backend
            await syncCartToBackend();

            // Then fetch from backend to get updated stock info
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
            // Fallback to local cart if backend fails
            console.log('Falling back to local cart');
            loadFromLocalCart();
        }
    };

    // --- Fallback: Load from local cart ---
    const loadFromLocalCart = () => {
        try {
            // Load from local storage instead of backend
            const items = LocalCart.getCartArray();
            localCartItems = items.map(item => ({
                ...item,
                selected: true // Default all items to selected
            }));
            renderCart(localCartItems);
            console.log('Loaded cart items from local storage:', localCartItems);
        } catch (error) {
            console.error('Error loading cart:', error);
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

        if (summaryDetailsEl) summaryDetailsEl.innerHTML = '';
        const subtotal = selectedItems.reduce((sum, item) => sum + (item.price * Math.min(item.quantity, item.stock)), 0);

        selectedItems.forEach(item => {
            const effectiveQuantity = Math.min(item.quantity, item.stock);
            const itemTotal = item.price * effectiveQuantity;
            if (summaryDetailsEl) {
                const itemSummaryLine = document.createElement('div');
                itemSummaryLine.className = 'd-flex justify-content-between text-muted small';
                itemSummaryLine.innerHTML = `
                    <span>${item.name} x ${effectiveQuantity}</span>
                    <span>₱${itemTotal.toFixed(2)}</span>
                `;
                summaryDetailsEl.appendChild(itemSummaryLine);
            }
        });

        if (selectedCountEl) selectedCountEl.textContent = selectedItems.length;
        if (checkoutCountEl) checkoutCountEl.textContent = selectedItems.length;
        if (subtotalEl) subtotalEl.textContent = `₱${subtotal.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `₱${subtotal.toFixed(2)}`;

        // Enable/disable checkout button
        if (checkoutBtn) checkoutBtn.disabled = selectedItems.length === 0;
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
        const existingModal = document.getElementById('stockWarningModalDiv');
        if (existingModal) {
            existingModal.remove();
        }

        const modalDiv = document.createElement('div');
        modalDiv.id = 'stockWarningModalDiv';
        modalDiv.innerHTML = `
            <div style="
                position: fixed; 
                top: 0; 
                left: 0; 
                width: 100%; 
                height: 100%; 
                background-color: rgba(0,0,0,0.5); 
                z-index: 9999; 
                display: flex; 
                align-items: center; 
                justify-content: center;
            ">
                <div style="
                    background: white; 
                    border-radius: 8px; 
                    padding: 20px; 
                    max-width: 400px; 
                    width: 90%; 
                    text-align: center;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
                ">
                    <h5 class="text-danger mb-3"><i class="fas fa-exclamation-triangle mr-2"></i>Stock Warning</h5>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="this.closest('#stockWarningModalDiv').remove()">OK</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modalDiv);
        document.body.style.overflow = 'hidden';
        
        // Auto close after 3 seconds
        setTimeout(() => {
            if (modalDiv.parentNode) {
                modalDiv.remove();
                document.body.style.overflow = 'auto';
            }
        }, 3000);
    };

    const validateQuantity = (item, newQuantity) => {
        if (newQuantity > item.stock) {
            showStockWarning(`Sorry! Only ${item.stock} units of "${item.name}" are available in stock.`);
            return false;
        }
        return true;
    };

    // --- Backend API Update Function ---
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
                throw new Error('Failed to update cart.');
            }
            
            console.log(`Successfully ${method}ed item ${itemId} on backend`);
            return true;
        } catch (error) {
            console.error(`Error with ${method} request:`, error);
            return false;
        }
    };

    const addEventListeners = () => {
        // Select All checkbox
        if (selectAllCheckbox) {
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
        }

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

        // Remove button listeners - UPDATE BACKEND
        document.querySelectorAll('.remove-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                if (window.confirm('Are you sure you want to remove this item?')) {
                    const itemId = e.currentTarget.getAttribute('data-item-id');
                    
                    // Show loading state
                    const originalHtml = button.innerHTML;
                    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    button.disabled = true;
                    
                    // Update backend first
                    const success = await updateCartAPI('DELETE', itemId);
                    
                    if (success) {
                        // Remove from local storage
                        LocalCart.removeItem(itemId);
                        
                        // Remove from local array
                        localCartItems = localCartItems.filter(item => item.id.toString() !== itemId);
                        
                        // Re-render
                        renderCart(localCartItems);
                        
                        // Show success message
                        showSuccessToast('Item removed from bag');
                    } else {
                        // Reset button on failure
                        button.innerHTML = originalHtml;
                        button.disabled = false;
                        alert('Failed to remove item. Please try again.');
                    }
                }
            });
        });

        // Decrease quantity buttons - UPDATE BACKEND
        document.querySelectorAll('.decrease-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const itemId = e.currentTarget.getAttribute('data-item-id');
                const item = localCartItems.find(item => item.id.toString() === itemId);
                if (item && item.quantity > 1) {
                    const newQuantity = item.quantity - 1;
                    
                    // Show loading state
                    button.disabled = true;
                    
                    // Update backend first
                    const success = await updateCartAPI('PUT', itemId, { quantity: newQuantity });
                    
                    if (success) {
                        // Update local data
                        item.quantity = newQuantity;
                        LocalCart.updateQuantity(itemId, newQuantity);
                        renderCart(localCartItems);
                    } else {
                        button.disabled = false;
                        alert('Failed to update quantity. Please try again.');
                    }
                }
            });
        });

        // Increase quantity buttons - UPDATE BACKEND
        document.querySelectorAll('.increase-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const itemId = e.currentTarget.getAttribute('data-item-id');
                const item = localCartItems.find(item => item.id.toString() === itemId);
                if (item && validateQuantity(item, item.quantity + 1)) {
                    const newQuantity = item.quantity + 1;
                    
                    // Show loading state
                    button.disabled = true;
                    
                    // Update backend first
                    const success = await updateCartAPI('PUT', itemId, { quantity: newQuantity });
                    
                    if (success) {
                        // Update local data
                        item.quantity = newQuantity;
                        LocalCart.updateQuantity(itemId, newQuantity);
                        renderCart(localCartItems);
                    } else {
                        button.disabled = false;
                        alert('Failed to update quantity. Please try again.');
                    }
                }
            });
        });

        // Quantity input listeners - UPDATE BACKEND
        document.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('change', async (e) => {
                const itemId = e.target.getAttribute('data-item-id');
                let quantity = parseInt(e.target.value, 10);
                const item = localCartItems.find(item => item.id.toString() === itemId);

                if (isNaN(quantity) || quantity < 1) {
                    quantity = 1;
                    e.target.value = 1;
                }

                if (item) {
                    if (validateQuantity(item, quantity)) {
                        // Show loading state
                        input.disabled = true;
                        
                        // Update backend first
                        const success = await updateCartAPI('PUT', itemId, { quantity });
                        
                        if (success) {
                            // Update local data
                            item.quantity = quantity;
                            LocalCart.updateQuantity(itemId, quantity);
                            updateSummary(localCartItems);
                        } else {
                            e.target.value = item.quantity; // Reset to previous value
                            alert('Failed to update quantity. Please try again.');
                        }
                        
                        input.disabled = false;
                    } else {
                        e.target.value = item.quantity; // Reset to previous value
                    }
                }
            });
        });
    };

    // Checkout button event listener - BACKEND INTEGRATION
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', async () => {
            const selectedItems = localCartItems.filter(item => item.selected && item.stock > 0);
            if (selectedItems.length > 0) {
                try {
                    // Send selected items to backend for checkout preparation
                    const response = await fetch(`${BACKEND_URL}/api/checkout/prepare`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-User-ID': user.id.toString(),
                        },
                        body: JSON.stringify({
                            selectedItems: selectedItems.map(item => ({
                                id: item.id,
                                quantity: Math.min(item.quantity, item.stock)
                            }))
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Failed to prepare checkout');
                    }

                    const checkoutData = await response.json();
                    
                    // Store both local and backend data for checkout
                    sessionStorage.setItem('selectedCartItems', JSON.stringify(selectedItems));
                    sessionStorage.setItem('checkoutData', JSON.stringify(checkoutData));
                    
                    window.location.href = 'checkout.html';
                } catch (error) {
                    console.error('Checkout preparation failed:', error);
                    // Fallback to local checkout
                    sessionStorage.setItem('selectedCartItems', JSON.stringify(selectedItems));
                    window.location.href = 'checkout.html';
                }
            }
        });
    }

    // Success toast notification
    const showSuccessToast = (message) => {
        const existingToast = document.getElementById('successToast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.id = 'successToast';
        toast.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: #28a745;
                color: white;
                padding: 12px 20px;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                display: flex;
                align-items: center;
                font-size: 14px;
                opacity: 0;
                transform: translateX(100px);
                transition: all 0.3s ease;
            ">
                <i class="fas fa-check-circle mr-2"></i>
                ${message}
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            const toastEl = toast.firstElementChild;
            toastEl.style.opacity = '1';
            toastEl.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            const toastEl = toast.firstElementChild;
            toastEl.style.opacity = '0';
            toastEl.style.transform = 'translateX(100px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // Listen for storage changes (when items are added from other pages)
    window.addEventListener('storage', (e) => {
        if (e.key === `cart_${user.id}`) {
            console.log('Cart updated from another page, reloading...');
            fetchCartItems();
        }
    });

    // Custom event listener for same-page cart updates
    window.addEventListener('cartUpdated', () => {
        console.log('Cart updated, reloading...');
        fetchCartItems();
    });

    // Expose LocalCart globally
    window.LocalCart = LocalCart;

    // Initial load - Try backend first, fallback to local
    fetchCartItems();
    
    // Update badge on load
    LocalCart.updateCartBadge();
});