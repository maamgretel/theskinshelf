    document.addEventListener('DOMContentLoaded', () => {
        const BACKEND_URL = 'https://backend-rj0a.onrender.com';
        let user = JSON.parse(localStorage.getItem('user'));

        // --- 1. Security Check ---
        if (!user || user.role !== 'customer') {
            localStorage.clear();
            window.location.href = 'login.html';
            return;
        }

        // --- DOM Element References ---
        const productListContainer = document.getElementById('productListContainer');
        const filterForm = document.getElementById('filterForm');
        const categoryFilterDropdown = document.getElementById('categoryFilterDropdown');
        const quantityModal = document.getElementById('quantityModal');
        const modalProductName = document.getElementById('modalProductName');
        const modalProductStock = document.getElementById('modalProductStock');
        const quantityInput = document.getElementById('quantityInput');
        const quantityError = document.getElementById('quantityError');
        const confirmPurchaseBtn = document.getElementById('confirmPurchaseBtn');

        // Store current product info for purchase
        let currentProductId = null;
        let currentProductStock = 0;

        // =================== REVISED SECTION START ===================
        const profilePic = document.getElementById('profilePic');
        const userNameEl = document.getElementById('userName');

        async function initializeUserProfile() {
            userNameEl.textContent = user.name || 'User';
            profilePic.src = user.profile_pic || 'https://via.placeholder.com/40';

            try {
                const response = await fetch(`${BACKEND_URL}/api/profile`, {
                    headers: {
                        'X-User-ID': user.id.toString()
                    }
                });

                if (!response.ok) {
                    console.error('Could not refresh profile from server.');
                    return;
                }

                const updatedUser = await response.json();
                profilePic.src = updatedUser.profile_pic;
                userNameEl.textContent = updatedUser.name;
                localStorage.setItem('user', JSON.stringify(updatedUser));
                user = updatedUser;

            } catch (error) {
                console.error('Error initializing user profile:', error);
            }
        }
        // =================== REVISED SECTION END ===================


        // --- Helper Functions ---
        function showToast(message, type = 'success') {
            const toast = document.createElement('div');
            toast.className = `alert alert-${type} position-fixed`;
            toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.remove();
            }, 3000);
        }

        function showModal() {
            quantityModal.style.display = 'block';
            quantityModal.classList.add('show');
            document.body.classList.add('modal-open');
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            backdrop.id = 'modal-backdrop';
            document.body.appendChild(backdrop);
        }

        function hideModal() {
            quantityModal.style.display = 'none';
            quantityModal.classList.remove('show');
            document.body.classList.remove('modal-open');
            const backdrop = document.getElementById('modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            quantityInput.value = '1';
            quantityInput.classList.remove('is-invalid');
            quantityError.textContent = '';
        }

        async function loadCategories() {
            try {
                const response = await fetch(`${BACKEND_URL}/api/categories`);
                if (!response.ok) return;
                const categories = await response.json();
                categories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.id;
                    option.textContent = cat.name;
                    categoryFilterDropdown.appendChild(option);
                });
            } catch (error) {
                console.error('Failed to load categories:', error);
            }
        }

        // --- 3. Main Function to Fetch and Display Products ---
        async function fetchAndDisplayProducts() {
            const params = new URLSearchParams(window.location.search);
            document.getElementById('searchInput').value = params.get('search') || '';
            document.getElementById('minPriceInput').value = params.get('min_price') || '';
            document.getElementById('maxPriceInput').value = params.get('max_price') || '';
            if (categoryFilterDropdown) {
                categoryFilterDropdown.value = params.get('category_id') || '';
            }
            productListContainer.innerHTML = '<div class="col-12 text-center"><p>Loading products...</p></div>';
            try {
                const response = await fetch(`${BACKEND_URL}/api/products?${params.toString()}`);
                if (!response.ok) throw new Error('Could not fetch products.');
                const products = await response.json();
                renderProducts(products);
            } catch (error) {
                console.error('Error fetching products:', error);
                productListContainer.innerHTML = '<div class="col-12 text-center text-danger"><p>Error loading products.</p></div>';
            }
        }

        // --- 4. Function to Render the Product Cards ---
      function renderProducts(products) {
    productListContainer.innerHTML = ''; // Clear previous products
    if (products.length === 0) {
        productListContainer.innerHTML = '<div class="col-12 text-center"><p>No products found matching your criteria.</p></div>';
        return;
    }

    products.forEach(p => {
        const productImage = p.image ? p.image : '../assets/default-product.png';
        const categoryBadge = p.category_name ? `<span class="badge badge-secondary mb-2">${p.category_name}</span>` : '';
        const cardContainer = document.createElement('div');
        cardContainer.className = 'col-12 col-sm-6 col-lg-4 mb-4 product-card';

        // ⭐ CHANGE: The entire card is now wrapped in an anchor <a> tag.
        // The href points to the product_view.html page with the product's ID.
        cardContainer.innerHTML = `
            <a href="product_view.html?id=${p.id}" class="text-decoration-none text-dark">
                <div class="card shadow-sm h-100">
                    <img src="${productImage}" class="card-img-top" alt="${p.name}" style="height: 150px; object-fit: contain;">
                    <div class="card-body text-center d-flex flex-column">
                        <h5 class="card-title">${p.name}</h5>
                        ${categoryBadge}
                        <p class="card-text text-muted"><small>Seller: ${p.seller_name}</small></p>
                        <div class="mt-auto">
                            <h4 class="card-text font-weight-bold">₱${parseFloat(p.price).toFixed(2)}</h4>
                            <p class="card-text"><small>Stock: ${p.stock}</small></p>
                            
                            </div>
                    </div>
                </div>
            </a>
        `;
        productListContainer.appendChild(cardContainer);
    });

    // ⭐ IMPORTANT: The code that attached event listeners to the buttons is now gone.
}
        // --- 5. Event Listeners ---
        filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(filterForm);
            const params = new URLSearchParams();
            for (const [key, value] of formData.entries()) {
                if (value) {
                    params.append(key, value);
                }
            }
            history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
            fetchAndDisplayProducts();
        });

        document.querySelectorAll('[data-dismiss="modal"]').forEach(closeBtn => {
            closeBtn.addEventListener('click', hideModal);
        });

        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'modal-backdrop') {
                hideModal();
            }
        });

        quantityInput.addEventListener('input', () => {
            const quantity = parseInt(quantityInput.value);
            quantityInput.classList.remove('is-invalid');
            quantityError.textContent = '';
            if (quantity < 1) {
                quantityInput.classList.add('is-invalid');
                quantityError.textContent = 'Quantity must be at least 1';
            } else if (quantity > currentProductStock) {
                quantityInput.classList.add('is-invalid');
                quantityError.textContent = `Only ${currentProductStock} items available`;
            }
        });

        confirmPurchaseBtn.addEventListener('click', async () => {
            const quantity = parseInt(quantityInput.value);
            if (quantity < 1 || quantity > currentProductStock) {
                quantityInput.classList.add('is-invalid');
                quantityError.textContent = quantity < 1 ? 'Quantity must be at least 1' : `Only ${currentProductStock} items available`;
                return;
            }
            confirmPurchaseBtn.disabled = true;
            confirmPurchaseBtn.textContent = 'Processing...';
            try {
                const response = await fetch(`${BACKEND_URL}/api/orders`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-ID': user.id.toString()
                    },
                    body: JSON.stringify({
                        product_id: parseInt(currentProductId),
                        quantity: quantity
                    })
                });
                if (response.ok) {
                    showToast('Order placed successfully!', 'success');
                    hideModal();
                    fetchAndDisplayProducts();
                } else {
                    const errorData = await response.json();
                    showToast(errorData.message || 'Failed to place order', 'danger');
                }
            } catch (error) {
                console.error('Error placing order:', error);
                showToast('Error placing order. Please try again.', 'danger');
            } finally {
                confirmPurchaseBtn.disabled = false;
                confirmPurchaseBtn.textContent = 'Add to Bag';
            }
        });

        document.getElementById('logoutButton').addEventListener('click', (e) => {a
            e.preventDefault();
            localStorage.clear();
            window.location.href = 'login.html';
        });


        // --- Initial Calls ---
        initializeUserProfile();
        loadCategories();
        fetchAndDisplayProducts();
    });