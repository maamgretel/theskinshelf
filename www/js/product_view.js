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
                            <input type="number" class="form-control" id="quantity-input" value="1" min="1" max="${product.stock}">
                            <button class="btn btn-light" type="button" id="plus-btn">+</button>
                            <span class="ml-3 text-muted">Stock: ${product.stock}</span>
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

        addQuantityControls(product.stock);
    };

    const addQuantityControls = (maxStock) => {
        const minusBtn = document.getElementById('minus-btn');
        const plusBtn = document.getElementById('plus-btn');
        const quantityInput = document.getElementById('quantity-input');

        minusBtn.addEventListener('click', () => {
            let currentValue = parseInt(quantityInput.value);
            if (currentValue > 1) {
                quantityInput.value = currentValue - 1;
            }
        });

        plusBtn.addEventListener('click', () => {
            let currentValue = parseInt(quantityInput.value);
            if (currentValue < maxStock) {
                quantityInput.value = currentValue + 1;
            }
        });
    };

    fetchProductData();
});