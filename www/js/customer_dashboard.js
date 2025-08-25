// Replace the entire customer_dashboard.js file with this:

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

    // --- 3. Main Function to Fetch and Display Products (FIXED) ---
    async function fetchAndDisplayProducts() {
        // Read current values from form inputs instead of URL
        const categoryId = categoryFilterDropdown.value;
        const minPrice = document.getElementById('minPriceInput').value;
        const maxPrice = document.getElementById('maxPriceInput').value;
        const searchTerm = document.getElementById('searchInput').value;
        
        // Build URLSearchParams from current form values
        const params = new URLSearchParams();
        
        if (searchTerm) params.append('search', searchTerm);
        if (categoryId) params.append('category_id', categoryId);
        if (minPrice) params.append('min_price', minPrice);
        if (maxPrice) params.append('max_price', maxPrice);
        
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

    // Make fetchAndDisplayProducts globally accessible
    window.fetchAndDisplayProducts = fetchAndDisplayProducts;

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
    }

    // --- 5. Real-time filtering setup ---
    function setupRealTimeFiltering() {
        const minPriceInput = document.getElementById('minPriceInput');
        const maxPriceInput = document.getElementById('maxPriceInput');
        
        // Debounce function to avoid too many API calls
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
        
        // Function to trigger search
        function triggerSearch() {
            // Get current values from form inputs
            const categoryId = categoryFilterDropdown.value;
            const minPrice = minPriceInput.value;
            const maxPrice = maxPriceInput.value;
            
            const params = new URLSearchParams();
            
            if (categoryId) params.append('category_id', categoryId);
            if (minPrice) params.append('min_price', minPrice);
            if (maxPrice) params.append('max_price', maxPrice);
            
            // Update URL without page reload
            const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
            history.pushState({}, '', newUrl);
            
            // Call the fetch function
            fetchAndDisplayProducts();
        }
        
        // Add real-time search listeners with debounce
        const debouncedSearch = debounce(triggerSearch, 300);
        
        categoryFilterDropdown.addEventListener('change', triggerSearch);
        minPriceInput.addEventListener('input', debouncedSearch);
        maxPriceInput.addEventListener('input', debouncedSearch);
    }

    // --- 6. Event Listeners ---
    filterForm.addEventListener('submit', (e) => {
        e.preventDefault();
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

    document.getElementById('logoutButton').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = 'login.html';
    });

    // --- Initial Calls ---
    initializeUserProfile();
    loadCategories().then(() => {
        // Set up real-time filtering after categories are loaded
        setupRealTimeFiltering();
        // Initial load with URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('category_id')) {
            categoryFilterDropdown.value = urlParams.get('category_id');
        }
        if (urlParams.get('min_price')) {
            document.getElementById('minPriceInput').value = urlParams.get('min_price');
        }
        if (urlParams.get('max_price')) {
            document.getElementById('maxPriceInput').value = urlParams.get('max_price');
        }
        fetchAndDisplayProducts();
    });
});