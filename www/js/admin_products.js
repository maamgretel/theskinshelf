// Products Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const user = JSON.parse(localStorage.getItem('user'));

    // Security Check
    if (!user || user.role !== 'admin') {
        alert("Access denied. You must be an admin to view this page.");
        window.location.href = 'login.html';
        return;
    }

    // Elements
    const productTableBody = document.getElementById('productTableBody');

    // Currency formatter for Philippine Peso
    const pesoFormatter = new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    });

    // Load products on page load
    loadProducts();

    /**
     * Fetches and displays all products
     */
    async function loadProducts() {
        try {
            showLoading();
            
            console.log('Fetching products from:', `${BACKEND_URL}/api/admin/products`);
            
            const response = await fetch(`${BACKEND_URL}/api/admin/products`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Products data received:', data);
            
            displayProducts(data.products || []);
            
        } catch (error) {
            console.error('Error loading products:', error);
            showError(error.message);
        }
    }

    /**
     * Display products in the table
     */
    function displayProducts(products) {
        // Update statistics cards
        updateProductStats(products);

        if (!products || products.length === 0) {
            productTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted p-4">
                        <i class="fas fa-box-open fa-2x mb-2"></i>
                        <div>No products found</div>
                    </td>
                </tr>
            `;
            return;
        }

        productTableBody.innerHTML = products.map(product => {
            const price = parseFloat(product.price) || 0;
            const stock = parseInt(product.stock) || 0;
            const status = getStockStatus(stock);
            
            return `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            ${product.image ? `
                                <img src="${product.image}" alt="${product.name}" 
                                     class="rounded me-2" style="width: 40px; height: 40px; object-fit: cover;"
                                     onerror="this.style.display='none'">
                            ` : ''}
                            <div>
                                <strong>${escapeHtml(product.name)}</strong>
                                <br>
                                <small class="text-muted">
                                    Seller: ${escapeHtml(product.seller_name || 'Unknown')}
                                </small>
                            </div>
                        </div>
                    </td>
                    <td>${escapeHtml(product.category_name || 'Uncategorized')}</td>
                    <td>${pesoFormatter.format(price)}</td>
                    <td>
                        <span class="badge badge-${status.class}">
                            ${status.text} (${stock})
                        </span>
                        ${product.low_stock_alert ? '<i class="fas fa-exclamation-triangle text-warning ml-1" title="Low stock alert"></i>' : ''}
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Update product statistics cards
     */
    function updateProductStats(products) {
        const totalProducts = products.length;
        let inStock = 0;
        let lowStock = 0;
        let outOfStock = 0;

        products.forEach(product => {
            const stock = parseInt(product.stock) || 0;
            if (stock <= 0) {
                outOfStock++;
            } else if (stock < 10) {
                lowStock++;
            } else {
                inStock++;
            }
        });

        // Animate count up
        animateCountUp('totalProducts', totalProducts);
        animateCountUp('inStockProducts', inStock);
        animateCountUp('lowStockProducts', lowStock);
        animateCountUp('outOfStockProducts', outOfStock);
    }

    /**
     * Animate count up effect
     */
    function animateCountUp(elementId, targetValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const startValue = parseInt(element.textContent) || 0;
        const duration = 800;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            
            const currentValue = Math.round(startValue + (targetValue - startValue) * easedProgress);
            element.textContent = currentValue;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * Get stock status based on quantity
     */
    function getStockStatus(stock) {
        if (stock <= 0) {
            return { class: 'danger', text: 'Out of Stock' };
        } else if (stock < 10) {
            return { class: 'warning', text: 'Low Stock' };
        } else {
            return { class: 'success', text: 'In Stock' };
        }
    }

    /**
     * Show loading state
     */
    function showLoading() {
        productTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center p-4">
                    <div class="spinner-border spinner-border-sm text-primary" role="status">
                        <span class="sr-only">Loading...</span>
                    </div>
                    <div class="mt-2">Loading products...</div>
                </td>
            </tr>
        `;
    }

    /**
     * Show error state
     */
    function showError(message) {
        productTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-danger p-4">
                    <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                    <div>Error loading products</div>
                    <small>${escapeHtml(message)}</small>
                    <div class="mt-2">
                        <button class="btn btn-sm btn-outline-primary" onclick="location.reload()">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Make loadProducts available globally for retry button
    window.loadProducts = loadProducts;
});