document.addEventListener('DOMContentLoaded', () => {
    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const productContainer = document.getElementById('product-container');
    const loadingSpinner = document.getElementById('loading-spinner');
    const relatedProductsContainer = document.getElementById('related-products-container');
    const relatedProductsSection = document.getElementById('related-products-section');

    // ⭐ ADDED: Get the user from localStorage
    const user = JSON.parse(localStorage.getItem('user'));

    // ⭐ ADDED: Security check
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
        productContainer.innerHTML = '<div class="alert alert-danger">Product ID not found.</div>';
        loadingSpinner.style.display = 'none';
        return;
    }

    // ⭐ NEW: Function to show cart exists modal
    const showCartExistsModal = (existingQuantity, requestedQuantity, productName, productStock, onConfirm) => {
        console.log('Showing cart exists modal:', existingQuantity, requestedQuantity, productName, productStock);
        
        // Remove existing modal if any
        const existingModal = document.getElementById('cartExistsModal');
        if (existingModal) {
            existingModal.remove();
        }

        const totalQuantity = existingQuantity + requestedQuantity;
        const willExceedStock = totalQuantity > productStock;

        // Create modal element
        const modalDiv = document.createElement('div');
        modalDiv.id = 'cartExistsModal';
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
                    padding: 0; 
                    max-width: 550px; 
                    width: 90%; 
                    max-height: 90vh; 
                    overflow: auto;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
                ">
                    <div class="modal-header" style="padding: 20px; border-bottom: 1px solid #dee2e6; background-color: #f8f9fa;">
                        <h5 class="modal-title ${willExceedStock ? 'text-warning' : 'text-info'}" style="margin: 0; display: flex; align-items: center;">
                            <i class="fas fa-${willExceedStock ? 'exclamation-triangle' : 'info-circle'} mr-2"></i>
                            ${willExceedStock ? 'Stock Limit Warning' : 'Item Already in Bag'}
                        </h5>
                        <button type="button" id="closeCartModalBtn" style="
                            background: none; 
                            border: none; 
                            font-size: 24px; 
                            cursor: pointer; 
                            color: #6c757d;
                            padding: 0;
                            width: 30px;
                            height: 30px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">&times;</button>
                    </div>
                    <div class="modal-body" style="padding: 30px 20px;">
                        <div class="text-center mb-3">
                            <i class="fas fa-shopping-bag" style="font-size: 3rem; color: #007bff; margin-bottom: 1rem;"></i>
                        </div>
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
                            <h6 style="margin: 0 0 10px 0; color: #495057;">Current Status:</h6>
                            <p style="margin: 0; font-size: 14px; line-height: 1.4;">
                                You have <strong>${existingQuantity}</strong> ${existingQuantity === 1 ? 'item' : 'items'} of 
                                "<strong>${productName}</strong>" in your bag.
                            </p>
                        </div>
                        <div style="text-align: center; margin-bottom: 20px;">
                            <p style="font-size: 16px; margin-bottom: 10px;">
                                You're trying to add <strong>${requestedQuantity}</strong> more ${requestedQuantity === 1 ? 'item' : 'items'}.
                            </p>
                            <p style="font-size: 16px; margin-bottom: 15px;">
                                Total would be: <strong>${totalQuantity}</strong> ${totalQuantity === 1 ? 'item' : 'items'}
                            </p>
                            ${willExceedStock ? `
                                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; color: #856404;">
                                    <i class="fas fa-exclamation-triangle mr-2"></i>
                                    <strong>Warning:</strong> Only <strong>${productStock}</strong> ${productStock === 1 ? 'item is' : 'items are'} available in stock.
                                    Adding ${requestedQuantity} more would exceed available inventory.
                                </div>
                            ` : `
                                <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 6px; color: #0c5460;">
                                    <i class="fas fa-check-circle mr-2"></i>
                                    Stock available: <strong>${productStock}</strong> ${productStock === 1 ? 'item' : 'items'}
                                </div>
                            `}
                        </div>
                    </div>
                    <div class="modal-footer" style="padding: 20px; border-top: 1px solid #dee2e6; display: flex; justify-content: center; gap: 10px;">
                        ${willExceedStock ? `
                            <button type="button" class="btn btn-secondary" id="cancelCartModalBtn" style="
                                background-color: #6c757d; 
                                border-color: #6c757d; 
                                color: white; 
                                padding: 8px 24px; 
                                border-radius: 4px; 
                                border: 1px solid transparent; 
                                cursor: pointer;
                                font-size: 14px;
                                margin-right: 5px;
                            ">
                                <i class="fas fa-times mr-2"></i>Cancel
                            </button>
                        ` : `
                            <button type="button" class="btn btn-secondary" id="cancelCartModalBtn" style="
                                background-color: #6c757d; 
                                border-color: #6c757d; 
                                color: white; 
                                padding: 8px 24px; 
                                border-radius: 4px; 
                                border: 1px solid transparent; 
                                cursor: pointer;
                                font-size: 14px;
                                margin-right: 5px;
                            ">
                                <i class="fas fa-times mr-2"></i>Cancel
                            </button>
                            <button type="button" class="btn btn-success" id="confirmCartModalBtn" style="
                                background-color: #28a745; 
                                border-color: #28a745; 
                                color: white; 
                                padding: 8px 24px; 
                                border-radius: 4px; 
                                border: 1px solid transparent; 
                                cursor: pointer;
                                font-size: 14px;
                            ">
                                <i class="fas fa-plus mr-2"></i>Yes, Add ${requestedQuantity} More
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(modalDiv);
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Close modal function
        const closeModal = () => {
            console.log('Closing cart exists modal');
            modalDiv.remove();
            document.body.style.overflow = 'auto';
        };
        
        // Add event listeners
        const closeBtn = document.getElementById('closeCartModalBtn');
        const cancelBtn = document.getElementById('cancelCartModalBtn');
        const confirmBtn = document.getElementById('confirmCartModalBtn');
        
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                closeModal();
                onConfirm();
            });
        }
        
        // Close on backdrop click
        modalDiv.addEventListener('click', (e) => {
            if (e.target === modalDiv) {
                closeModal();
            }
        });
        
        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    };

    // ⭐ EXISTING: Simple and reliable modal function for stock errors
    const showStockError = (requestedQuantity, availableStock, productName) => {
        console.log('Showing stock error modal:', requestedQuantity, availableStock, productName);
        
        // Remove existing modal if any
        const existingModal = document.getElementById('stockErrorModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal element
        const modalDiv = document.createElement('div');
        modalDiv.id = 'stockErrorModal';
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
                    padding: 0; 
                    max-width: 500px; 
                    width: 90%; 
                    max-height: 90vh; 
                    overflow: auto;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
                ">
                    <div class="modal-header" style="padding: 20px; border-bottom: 1px solid #dee2e6;">
                        <h5 class="modal-title text-danger" style="margin: 0;">
                            <i class="fas fa-exclamation-triangle mr-2"></i>Insufficient Stock
                        </h5>
                        <button type="button" id="closeModalBtn" style="
                            background: none; 
                            border: none; 
                            font-size: 24px; 
                            cursor: pointer; 
                            color: #6c757d;
                            padding: 0;
                            width: 30px;
                            height: 30px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">&times;</button>
                    </div>
                    <div class="modal-body text-center" style="padding: 30px 20px;">
                        <div class="mb-3">
                            <i class="fas fa-box-open" style="font-size: 3rem; color: #6c757d; margin-bottom: 1rem;"></i>
                        </div>
                        <p class="mb-2" style="font-size: 16px; line-height: 1.5;">
                            You requested <strong>${requestedQuantity}</strong> ${requestedQuantity > 1 ? 'items' : 'item'} of "<strong>${productName}</strong>", 
                            but we only have <strong>${availableStock}</strong> ${availableStock > 1 ? 'items' : 'item'} in stock.
                        </p>
                        <p style="color: #6c757d; font-size: 14px; margin: 0;">
                            Available stock: ${availableStock} ${availableStock > 1 ? 'items' : 'item'}
                        </p>
                    </div>
                    <div class="modal-footer" style="padding: 20px; border-top: 1px solid #dee2e6; text-align: center;">
                        <button type="button" class="btn btn-primary" id="confirmModalBtn" style="
                            background-color: #007bff; 
                            border-color: #007bff; 
                            color: white; 
                            padding: 8px 24px; 
                            border-radius: 4px; 
                            border: 1px solid transparent; 
                            cursor: pointer;
                            font-size: 14px;
                        ">
                            <i class="fas fa-check mr-2"></i>Got it
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(modalDiv);
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Close modal function
        const closeModal = () => {
            console.log('Closing modal');
            modalDiv.remove();
            document.body.style.overflow = 'auto';
            
            // Auto-adjust quantity input to max available
            const quantityInput = document.getElementById('quantity-input');
            if (quantityInput && availableStock > 0) {
                quantityInput.value = Math.min(availableStock, parseInt(quantityInput.value) || 1);
            }
        };
        
        // Add event listeners
        const closeBtn = document.getElementById('closeModalBtn');
        const confirmBtn = document.getElementById('confirmModalBtn');
        
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (confirmBtn) confirmBtn.addEventListener('click', closeModal);
        
        // Close on backdrop click
        modalDiv.addEventListener('click', (e) => {
            if (e.target === modalDiv) {
                closeModal();
            }
        });
        
        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    };

    // ⭐ NEW: Function to check if product exists in cart
    const checkCartForProduct = async (productId) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/cart`, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': user.id.toString()
                }
            });
            
            if (response.ok) {
                const cartItems = await response.json();
                const existingItem = cartItems.find(item => item.product_id.toString() === productId.toString());
                return existingItem ? existingItem.quantity : 0;
            }
            return 0;
        } catch (error) {
            console.error('Error checking cart:', error);
            return 0;
        }
    };

    // Helper function to update stock display
    const updateStockDisplay = (newStock) => {
        const stockSpan = document.querySelector('.quantity-selector .text-muted');
        if (stockSpan) {
            stockSpan.textContent = `Stock: ${newStock}${newStock <= 5 ? ' (Limited stock!)' : ''}`;
            
            // Update max quantity in the input
            const quantityInput = document.getElementById('quantity-input');
            if (quantityInput) {
                quantityInput.max = newStock;
                if (parseInt(quantityInput.value) > newStock) {
                    quantityInput.value = newStock;
                }
            }
            
            // Update button state if stock is 0
            const addToBagBtn = document.getElementById('add-to-bag-btn');
            if (addToBagBtn && newStock <= 0) {
                addToBagBtn.disabled = true;
            }
        }
    };

    const fetchProductData = async () => {
        try {
            // ⭐ MODIFIED: Added headers to the fetch request for authorization
            const response = await fetch(`${BACKEND_URL}/api/products/${productId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': user.id.toString()
                }
            });
            
            if (response.status === 401) {
                throw new Error('Unauthorized. Please log in again.');
            }
            if (!response.ok) {
                throw new Error('Product not found or server error.');
            }
            const data = await response.json();
            renderProduct(data);

        } catch (error) {
            productContainer.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
        } finally {
            loadingSpinner.style.display = 'none';
        }
    };

    const renderProduct = (data) => {
        const product = data.details;
        const related = data.related;
        // Ensure stock is a number (fallback to 0 when missing)
        const stockValue = (product && product.stock != null) ? Number(product.stock) : 0;

        document.title = product.name;

        productContainer.innerHTML = `
            <div class="row">
                <div class="col-md-5">
                    <img src="${product.image || '../assets/default-product.png'}" alt="${product.name}" class="product-image-main">
                </div>
                <div class="col-md-7">
                    <h1 class="product-title">${product.name}</h1>
                    <div class="d-flex align-items-center my-3">
                        <div class="text-warning">
                            <i class="fas fa-star"></i> <i class="fas fa-star"></i> <i class="fas fa-star"></i> <i class="fas fa-star"></i> <i class="fas fa-star-half-alt"></i>
                        </div>
                        <span class="text-muted ml-2">(Ratings placeholder)</span>
                    </div>
                    <div class="price-section my-4">
                        <h2 class="current-price">₱${parseFloat(product.price).toFixed(2)}</h2>
                    </div>
                    <div class="form-group row">
                        <label class="col-sm-3 col-form-label">Quantity</label>
                        <div class="col-sm-9 quantity-selector">
                            <button class="btn btn-light" type="button" id="minus-btn">-</button>
                            <input type="number" class="form-control" id="quantity-input" value="1" min="1" max="${stockValue}">
                            <button class="btn btn-light" type="button" id="plus-btn">+</button>
                            <span class="ml-3 text-muted ${stockValue <= 5 ? 'text-warning' : ''}">
                                Stock: ${stockValue}
                                ${stockValue <= 5 ? ' (Limited stock!)' : ''}
                            </span>
                        </div>
                    </div>
                    <div class="action-buttons mt-4">
                        <button class="btn btn-outline-primary" id="add-to-bag-btn" ${product.stock <= 0 ? 'disabled' : ''}>
                            <i class="fas fa-shopping-bag mr-2"></i>Add to Bag
                        </button>
                    </div>
                </div>
            </div>
            <div class="row mt-5">
                <div class="col-12">
                    <div class="product-description-section">
                        <h4>Product Description</h4>
                        <hr>
                        <p>${product.description ? product.description.replace(/\n/g, '<br>') : 'No description available.'}</p>
                    </div>
                </div>
            </div>
        `;

        if (related && related.length > 0) {
            relatedProductsSection.style.display = 'block';
            relatedProductsContainer.innerHTML = related.map(p => `
                <div class="col-6 col-md-3 mb-4">
                    <a href="product_view.html?id=${p.id}" class="card-link text-decoration-none text-dark">
                        <div class="card h-100 related-product-card">
                            <img src="${p.image || '../assets/default-product.png'}" class="card-img-top p-2" alt="${p.name}">
                            <div class="card-body">
                                <h6 class="card-title small">${p.name}</h6>
                                <p class="card-text font-weight-bold">₱${parseFloat(p.price).toFixed(2)}</p>
                            </div>
                        </div>
                    </a>
                </div>
            `).join('');
        }

        // Pass numeric stock to controls and handlers
        addQuantityControls(stockValue, product.name);
        addEventListenerToBagButton(product.id, product.name, stockValue);
    };

    const addQuantityControls = (maxStock, productName) => {
        const minusBtn = document.getElementById('minus-btn');
        const plusBtn = document.getElementById('plus-btn');
        const quantityInput = document.getElementById('quantity-input');
        

        console.log('Setting up quantity controls for:', productName, 'Max stock:', maxStock);

        // ⭐ MODIFIED: Enhanced quantity validation with modal trigger
        const validateQuantity = (showModalOnError = false, originalValue = null) => {
            const currentValue = parseInt(quantityInput.value) || 0;
            const rawValue = quantityInput.value;
            const valueToCheck = originalValue || currentValue;
            const addToBagBtn = document.getElementById('add-to-bag-btn');
            
            console.log('Validating quantity:', valueToCheck, 'vs max:', maxStock, 'Show modal:', showModalOnError);
            
            // Don't validate if input is empty (user is typing)
            if (rawValue === '' && !showModalOnError) {
                console.log('Empty input, skipping validation');
                return;
            }
            
            if (valueToCheck > maxStock && maxStock > 0) {
                console.log('Quantity exceeds stock, showing modal:', showModalOnError);
                
                if (showModalOnError) {
                    showStockError(valueToCheck, maxStock, productName);
                }
                
                quantityInput.value = maxStock;
                quantityInput.classList.add('is-invalid');
                setTimeout(() => quantityInput.classList.remove('is-invalid'), 2000);
            } else if (currentValue < 1 && rawValue !== '') {
                // Only auto-correct to 1 if not empty
                quantityInput.value = 1;
            }
            
            // Update button state
            if (addToBagBtn) {
                const finalValue = parseInt(quantityInput.value) || 0;
                addToBagBtn.disabled = maxStock <= 0 || finalValue > maxStock || finalValue < 1;
            }
        };

        // Button event listeners
        minusBtn.addEventListener('click', () => {
            let currentValue = parseInt(quantityInput.value);
            if (currentValue > 1) {
                quantityInput.value = currentValue - 1;
                validateQuantity(false);
            }
        });

        plusBtn.addEventListener('click', () => {
            let currentValue = parseInt(quantityInput.value);
            if (currentValue < maxStock) {
                quantityInput.value = currentValue + 1;
                validateQuantity(false);
            }
        });

        // ⭐ ENHANCED: Track user input before validation changes it
        quantityInput.addEventListener('focus', () => {
            console.log('Input focused');
            userInputValue = parseInt(quantityInput.value) || 0;
        });

        quantityInput.addEventListener('input', (e) => {
            console.log('Input event triggered');
            const currentValue = parseInt(e.target.value) || 0;
            const rawValue = e.target.value; // Get the raw string value
            
            // Allow empty input temporarily (user might be typing)
            if (rawValue === '' || rawValue === '0') {
                console.log('User cleared input, allowing temporarily');
                return; // Don't validate yet, let user continue typing
            }
            
            // ⭐ NEW: Show modal IMMEDIATELY when user types over limit
            if (currentValue > maxStock && maxStock > 0) {
                console.log('User typed over limit:', currentValue, 'Showing modal immediately');
                showStockError(currentValue, maxStock, productName);
                
                // Auto-correct the input after showing modal
                setTimeout(() => {
                    quantityInput.value = maxStock;
                    quantityInput.classList.add('is-invalid');
                    setTimeout(() => quantityInput.classList.remove('is-invalid'), 2000);
                }, 100); // Small delay to let modal show first
                return;
            }
            
            // Only validate if there's a meaningful value
            if (currentValue > 0) {
                validateQuantity(false); // Real-time validation without modal
            }
        });

        quantityInput.addEventListener('blur', () => {
            console.log('Blur event triggered');
            
            const currentValue = parseInt(quantityInput.value) || 0;
            const rawValue = quantityInput.value;
            
            // If input is empty or 0, set to 1
            if (rawValue === '' || currentValue === 0) {
                console.log('Empty input on blur, setting to 1');
                quantityInput.value = 1;
            }
            
            // Just validate without modal (modal already shown in input event)
            validateQuantity(false);
        });

        quantityInput.addEventListener('change', () => {
            console.log('Change event triggered');
            // Just validate without modal (modal already shown in input event)
            validateQuantity(false);
        });

        // ⭐ ENHANCED: Better Enter key handling
        quantityInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                console.log('Enter key pressed, userInputValue:', userInputValue);
                const currentValue = parseInt(quantityInput.value) || 0;
                
                if (currentValue > maxStock && maxStock > 0) {
                    console.log('Will show modal on Enter with value:', currentValue);
                    showStockError(currentValue, maxStock, productName);
                    quantityInput.value = maxStock;
                    quantityInput.classList.add('is-invalid');
                    setTimeout(() => quantityInput.classList.remove('is-invalid'), 2000);
                }
                quantityInput.blur(); // Remove focus
            }
        });
    };

    // ⭐ ENHANCED: Modified add to bag function with cart checking
    const addEventListenerToBagButton = (productId, productName, productStock) => {
        const addToBagBtn = document.getElementById('add-to-bag-btn');
        if (addToBagBtn) {
            addToBagBtn.addEventListener('click', async () => {
                const quantityInput = document.getElementById('quantity-input');
                const quantity = parseInt(quantityInput.value) || 0;
                
                console.log('Add to bag clicked with quantity:', quantity, 'vs stock:', productStock);
                
                // ⭐ VALIDATION: Pre-validation before API call
                if (quantity > productStock) {
                    console.log('Showing stock modal from add to bag button');
                    showStockError(quantity, productStock, productName);
                    return;
                }

                if (quantity <= 0) {
                    alert('Please select a valid quantity.');
                    return;
                }
                
                // ⭐ NEW: Check if product already exists in cart
                const existingQuantity = await checkCartForProduct(productId);
                
                if (existingQuantity > 0) {
                    const totalQuantity = existingQuantity + quantity;
                    
                    // Show the cart exists modal
                    showCartExistsModal(
                        existingQuantity, 
                        quantity, 
                        productName, 
                        productStock,
                        () => {
                            // This callback runs when user confirms they want to add more
                            if (totalQuantity <= productStock) {
                                performAddToBag(productId, quantity, productName, productStock);
                            } else {
                                // Show stock error if total would exceed stock
                                showStockError(totalQuantity, productStock, productName);
                            }
                        }
                    );
                    return; // Exit early to wait for user decision
                }
                
                // If product doesn't exist in cart, proceed normally
                performAddToBag(productId, quantity, productName, productStock);
            });
        }
    };

    // ⭐ NEW: Separated the actual add to bag functionality
    const performAddToBag = async (productId, quantity, productName, productStock) => {
        const addToBagBtn = document.getElementById('add-to-bag-btn');
        
        // Show loading state immediately
        addToBagBtn.disabled = true;
        addToBagBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Adding...';

        try {
            // First update the stock
            const updateStockResponse = await fetch(`${BACKEND_URL}/api/products/${productId}/stock`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': user.id.toString()
                },
                body: JSON.stringify({
                    quantity: quantity,
                    operation: 'deduct'
                })
            });

            // Check for stock update errors
            if (!updateStockResponse.ok) {
                const stockError = await updateStockResponse.json();
                throw new Error(stockError.message || 'Failed to update stock');
            }

            // Add to cart after successful stock update
            const cartResponse = await fetch(`${BACKEND_URL}/api/cart`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': user.id.toString()
                },
                body: JSON.stringify({
                    product_id: productId,
                    quantity: quantity
                })
            });

            // Check for cart update errors
            if (!cartResponse.ok) {
                // If cart update fails, we should try to revert the stock update
                const revertStockResponse = await fetch(`${BACKEND_URL}/api/products/${productId}/stock`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-ID': user.id.toString()
                    },
                    body: JSON.stringify({
                        quantity: quantity,
                        operation: 'add'  // Add the quantity back
                    })
                });
                throw new Error('Failed to add item to cart');
            }

            // Get updated stock from server
            const stockResponse = await fetch(`${BACKEND_URL}/api/products/${productId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': user.id.toString()
                }
            });

            const productData = await stockResponse.json();
            // Server may return either { stock: X } or { details: { stock: X } }
            let newStock = 0;
            if (productData) {
                if (productData.stock != null) {
                    newStock = Number(productData.stock);
                } else if (productData.details && productData.details.stock != null) {
                    newStock = Number(productData.details.stock);
                }
            }

            // Success feedback
            addToBagBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Added!';
            addToBagBtn.classList.remove('btn-outline-primary');
            addToBagBtn.classList.add('btn-success');
            
            // Update cart badge if function exists
            if (typeof updateCartBadge === 'function') {
                updateCartBadge();
            }

            // Update the displayed stock quantity
            const stockSpan = document.querySelector('.quantity-selector .text-muted');
            if (stockSpan) {
                stockSpan.textContent = `Stock: ${newStock}${newStock <= 5 ? ' (Limited stock!)' : ''}`;
            }
            
            // Update max quantity in the input
            const quantityInput = document.getElementById('quantity-input');
            if (quantityInput) {
                quantityInput.max = newStock;
                if (parseInt(quantityInput.value) > newStock) {
                    quantityInput.value = newStock;
                }
            }
            
            // Reset button after 1 second
            setTimeout(() => {
                addToBagBtn.innerHTML = '<i class="fas fa-shopping-bag mr-2"></i>Add to Bag';
                addToBagBtn.classList.remove('btn-success');
                addToBagBtn.classList.add('btn-outline-primary');
                
                // Disable add to bag button if stock is 0
                if (newStock <= 0) {
                    addToBagBtn.disabled = true;
                }
            }, 1000);

        } catch (error) {
            console.error('Failed to add item to bag:', error);
            alert('An error occurred. Please try again.');
        } finally {
            // Re-enable button
            addToBagBtn.disabled = false;
            if (addToBagBtn.innerHTML.includes('Adding...')) {
                addToBagBtn.innerHTML = '<i class="fas fa-shopping-bag mr-2"></i>Add to Bag';
            }
        }
    };

    fetchProductData();
});