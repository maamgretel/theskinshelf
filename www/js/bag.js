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
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');

    const fetchCartItems = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/cart`, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': user.id.toString(),
                },
            });
            if (!response.ok) {
                throw new Error('Failed to fetch cart items.');
            }
            const items = await response.json();
            renderCart(items);
        } catch (error) {
            console.error('Error fetching cart:', error);
            cartItemsContainer.innerHTML = `<div class="alert alert-danger">Could not load your bag. Please try again later.</div>`;
        }
    };

    const renderCart = (items) => {
        if (items.length === 0) {
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
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        subtotalEl.textContent = `₱${subtotal.toFixed(2)}`;
        totalEl.textContent = `₱${subtotal.toFixed(2)}`; // Assuming no shipping/taxes for now
    };

    const addEventListeners = () => {
        // For Remove Buttons
        document.querySelectorAll('.remove-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const itemId = e.currentTarget.getAttribute('data-item-id');
                await updateCartAPI('DELETE', itemId);
            });
        });

        // For Quantity Inputs
        document.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('change', async (e) => {
                const itemId = e.target.getAttribute('data-item-id');
                const quantity = e.target.value;
                await updateCartAPI('PUT', itemId, { quantity });
            });
        });
    };

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
        fetchCartItems();
        updateCartBadge();
    } catch (error) {
        // The alert is gone. Errors are now only logged to the console.
        console.error(`Error with ${method} request:`, error);
    }
};

    // Initial load
    fetchCartItems();
});