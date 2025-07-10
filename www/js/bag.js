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

    // --- KEY CHANGE: We will keep a local copy of the cart ---
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
            // Store the fetched items in our local variable
            localCartItems = items;
            // Render the cart using our local data
            renderCart(localCartItems);
        } catch (error) {
            console.error('Error fetching cart:', error);
            cartItemsContainer.innerHTML = `<div class="alert alert-danger">Could not load your bag. Please try again later.</div>`;
        }
    };

    // This function now renders based on the local data provided to it
    const renderCart = (items) => {
        if (!items || items.length === 0) {
            emptyCartMessage.style.display = 'block';
            cartItemsContainer.style.display = 'none';
            updateSummary([]);
            return;
        }

        emptyCartMessage.style.display = 'none';
        cartItemsContainer.style.display = 'block';
        cartItemsContainer.innerHTML = ''; // Clear previous content

        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'card mb-3';
            itemElement.innerHTML = `
                <div class="row no-gutters">
                    <div class="col-md-2 d-flex align-items-center justify-content-center">
                        <img src="${item.image || '../assets/default-product.png'}" class="img-fluid p-2" alt="${item.name}" style="max-height: 100px; object-fit: contain;">
                    </div>
                    <div class="col-md-5">
                        <div class="card-body">
                            <h5 class="card-title">${item.name}</h5>
                            <p class="card-text font-weight-bold">₱${parseFloat(item.price).toFixed(2)}</p>
                        </div>
                    </div>
                    <div class="col-md-3 d-flex align-items-center">
                        <input type="number" class="form-control quantity-input" value="${item.quantity}" min="1" data-item-id="${item.id}">
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
    };

    const updateSummary = (items) => {
        const summaryDetailsEl = document.getElementById('order-summary-details');
        const subtotalEl = document.getElementById('cart-subtotal');
        const totalEl = document.getElementById('cart-total');

        summaryDetailsEl.innerHTML = '';
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        items.forEach(item => {
            const itemTotal = item.price * item.quantity;
            const itemSummaryLine = document.createElement('div');
            itemSummaryLine.className = 'd-flex justify-content-between text-muted small';
            itemSummaryLine.innerHTML = `
                <span>${item.name} x ${item.quantity}</span>
                <span>₱${itemTotal.toFixed(2)}</span>
            `;
            summaryDetailsEl.appendChild(itemSummaryLine);
        });

        subtotalEl.textContent = `₱${subtotal.toFixed(2)}`;
        totalEl.textContent = `₱${subtotal.toFixed(2)}`;
    };

  const addEventListeners = () => {
    // --- Listener for the "Remove" button ---
    document.querySelectorAll('.remove-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            // Added a confirmation dialog to prevent accidental deletion
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

    // --- Listener for the quantity input field ---
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const itemId = e.target.getAttribute('data-item-id');
            let quantity = parseInt(e.target.value, 10);

            // Added validation to ensure quantity is a positive number
            if (isNaN(quantity) || quantity < 1) {
                quantity = 1; // Reset to a valid quantity
                e.target.value = 1; // Visually update the input box for the user
            }

            // Instantly find and update the item in the local array
            const itemToUpdate = localCartItems.find(item => item.id.toString() === itemId);
            if (itemToUpdate) {
                itemToUpdate.quantity = quantity;
            }
            
            // Instantly update the summary UI
            updateSummary(localCartItems);
            
            // Update backend in the background
            updateCartAPI('PUT', itemId, { quantity });
        });
    });
};

// Add this code inside your js/bag.js file

const checkoutBtn = document.getElementById('checkout-btn');

if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
        // This tells the browser to navigate to the checkout page
        window.location.href = 'checkout.html';
    });
}

    // --- KEY CHANGE: This function no longer re-fetches the cart ---
    // It just sends the update to the server and trusts the local UI.
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
                // If the update fails, you could optionally re-fetch to sync with the server's true state
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