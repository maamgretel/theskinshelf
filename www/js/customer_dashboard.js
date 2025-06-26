document.addEventListener('DOMContentLoaded', () => {
    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const user = JSON.parse(localStorage.getItem('user'));

    // --- 1. Security Check ---
    if (!user || user.role !== 'customer') {
        localStorage.clear();
        // Use the new toast for this alert as well
        showToast('Access Denied. Please log in as a customer.', 'error');
        window.location.href = 'login.html';
        return;
    }

    // --- DOM Element References ---
    const productListContainer = document.getElementById('productListContainer');
    const filterForm = document.getElementById('filterForm');
    const quantityModal = document.getElementById('quantityModal');
    const modalProductName = document.getElementById('modalProductName');
    const modalProductStock = document.getElementById('modalProductStock');
    const quantityInput = document.getElementById('quantityInput');
    const quantityError = document.getElementById('quantityError');
    const confirmPurchaseBtn = document.getElementById('confirmPurchaseBtn');

    // --- NEW: Helper function for modern toast notifications ---
    function showToast(message, type = 'success') {
        // Remove any existing toasts first
        const existingToasts = document.querySelectorAll('.toast-notification');
        existingToasts.forEach(toast => toast.remove());

        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 9999;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        if (type === 'success') {
            toast.style.backgroundColor = '#28a745';
        } else if (type === 'error') {
            toast.style.backgroundColor = '#dc3545';
        } else {
            toast.style.backgroundColor = '#17a2b8';
        }
        
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 10);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 4000);
    }

    // --- Modal Management Functions ---
    function showModal(modal) {
        modal.style.display = 'block';
        modal.classList.add('show');
        document.body.classList.add('modal-open');
        
        // Create backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        backdrop.id = 'modal-backdrop';
        document.body.appendChild(backdrop);
    }

    function hideModal(modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
        
        // Remove backdrop
        const backdrop = document.getElementById('modal-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
    }

    // --- 2. Initial Page Setup ---
    document.getElementById('userName').textContent = user.name;
    // EDITED: Corrected image path for Cordova
    const profilePicUrl = user.profile_pic ? `${BACKEND_URL}/uploads/${user.profile_pic}` : '../img/default-avatar.png';
    document.getElementById('profilePic').src = profilePicUrl;

    // --- 3. Main Function to Fetch and Display Products ---
    async function fetchAndDisplayProducts() {
        const params = new URLSearchParams(window.location.search);
        document.getElementById('searchInput').value = params.get('search') || '';
        document.getElementById('minPriceInput').value = params.get('min_price') || '';
        document.getElementById('maxPriceInput').value = params.get('max_price') || '';
        productListContainer.innerHTML = '<div class="col-12 text-center"><p>Loading products...</p></div>';
        try {
            const response = await fetch(`${BACKEND_URL}/api/products?${params.toString()}`);
            if (!response.ok) throw new Error('Could not fetch products.');
            const products = await response.json();
            renderProducts(products);
        } catch (error) {
            console.error('Error fetching products:', error);
            productListContainer.innerHTML = '<div class="col-12 text-center text-danger"><p>Error loading products.</p></div>';
            showToast('Error loading products from the server.', 'error');
        }
    }

    // --- 4. Function to Render the Product Cards (More Secure) ---
    function renderProducts(products) {
        productListContainer.innerHTML = '';
        if (products.length === 0) {
            productListContainer.innerHTML = '<div class="col-12 text-center"><p>No products found.</p></div>';
            return;
        }

        products.forEach(p => {
            // EDITED: Corrected image path for Cordova
            const productImage = p.image ? `${BACKEND_URL}/uploads/${p.image}` : '../img/default-product.png';

            // --- Create elements safely to prevent XSS ---
            const cardContainer = document.createElement('div');
            cardContainer.className = 'col-12 col-sm-6 col-lg-4 mb-4 product-card';

            const card = document.createElement('div');
            card.className = 'card shadow-sm';

            const img = document.createElement('img');
            img.src = productImage;
            img.className = 'card-img-top';
            img.alt = p.name;
            img.style.height = '150px';
            img.style.objectFit = 'contain';

            const cardBody = document.createElement('div');
            cardBody.className = 'card-body text-center d-flex flex-column';

            const title = document.createElement('h5');
            title.className = 'card-title';
            title.textContent = p.name;

            const description = document.createElement('p');
            description.className = 'card-text text-muted';
            description.textContent = p.description || '';

            const seller = document.createElement('p');
            seller.className = 'card-text text-muted';
            const sellerSmall = document.createElement('small');
            sellerSmall.textContent = `Seller: ${p.seller_name}`;
            seller.appendChild(sellerSmall);

            const footerDiv = document.createElement('div');
            footerDiv.className = 'mt-auto';

            const price = document.createElement('h4');
            price.className = 'card-text font-weight-bold';
            price.textContent = `$${parseFloat(p.price).toFixed(2)}`;

            const stock = document.createElement('p');
            stock.className = 'card-text';
            const stockSmall = document.createElement('small');
            stockSmall.textContent = `Stock: ${p.stock}`;
            stock.appendChild(stockSmall);

            const buyButton = document.createElement('a');
            buyButton.href = '#';
            buyButton.className = 'btn btn-success mt-2 buy-now-btn';
            buyButton.textContent = 'Buy Now';
            buyButton.dataset.productId = p.id;
            buyButton.dataset.productName = p.name;
            buyButton.dataset.productStock = p.stock;

            // --- Append elements to build the card ---
            footerDiv.append(price, stock, buyButton);
            cardBody.append(title, description, seller, footerDiv);
            card.append(img, cardBody);
            cardContainer.appendChild(card);
            productListContainer.appendChild(cardContainer);
        });
    }

    // --- 5. Function to Handle the Purchase (via Modal) ---
    async function handlePurchase() {
        const productId = confirmPurchaseBtn.dataset.productId;
        const stock = parseInt(confirmPurchaseBtn.dataset.productStock, 10);
        const quantity = parseInt(quantityInput.value, 10);

        quantityInput.classList.remove('is-invalid');
        quantityError.textContent = '';
        
        if (isNaN(quantity) || quantity <= 0) {
            quantityError.textContent = 'Please enter a valid, positive quantity.';
            quantityInput.classList.add('is-invalid');
            return;
        }
        if (quantity > stock) {
            quantityError.textContent = `Quantity cannot exceed available stock (${stock}).`;
            quantityInput.classList.add('is-invalid');
            return;
        }

        confirmPurchaseBtn.disabled = true;
        confirmPurchaseBtn.textContent = 'Processing...';

        try {
            const response = await fetch(`${BACKEND_URL}/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-User-ID': user.id },
                body: JSON.stringify({ product_id: productId, quantity: quantity })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Could not place order.');

            // EDITED: Use toast notification instead of alert
            showToast('Order placed successfully! Thank you.');
            hideModal(quantityModal);
            fetchAndDisplayProducts();

        } catch (error) {
            console.error('Purchase error:', error);
            // EDITED: Use toast notification instead of alert
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            confirmPurchaseBtn.disabled = false;
            confirmPurchaseBtn.textContent = 'Confirm Purchase';
        }
    }

    // --- 6. Event Listeners ---
    filterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const params = new URLSearchParams(new FormData(filterForm));
        history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
        fetchAndDisplayProducts();
    });

    productListContainer.addEventListener('click', (e) => {
        // Find the button if the user clicked on an element inside it
        const buyButton = e.target.closest('.buy-now-btn');
        if (buyButton) {
            e.preventDefault();
            const { productId, productName, productStock } = buyButton.dataset;
            modalProductName.textContent = productName;
            modalProductStock.textContent = productStock;
            quantityInput.value = '1';
            quantityInput.max = productStock;
            quantityInput.classList.remove('is-invalid');
            quantityError.textContent = '';
            confirmPurchaseBtn.dataset.productId = productId;
            confirmPurchaseBtn.dataset.productStock = productStock;
            showModal(quantityModal);
        }
    });

    confirmPurchaseBtn.addEventListener('click', handlePurchase);

    // Modal close event listeners
    const closeButtons = quantityModal.querySelectorAll('[data-dismiss="modal"], .close');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            hideModal(quantityModal);
        });
    });

    // Close modal when clicking on backdrop
    document.addEventListener('click', (e) => {
        if (e.target.id === 'modal-backdrop') {
            hideModal(quantityModal);
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && quantityModal.classList.contains('show')) {
            hideModal(quantityModal);
        }
    });

    document.getElementById('logoutButton').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'login.html';
    });

    // --- Initial Call ---
    fetchAndDisplayProducts();
});