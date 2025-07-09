document.addEventListener('DOMContentLoaded', function() {
    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const user = JSON.parse(localStorage.getItem('user'));

    // --- Security Check ---
    if (!user || user.role !== 'admin') {
        alert("Access denied. You must be an admin to view this page.");
        window.location.href = 'login.html';
        return;
    }

    // --- Element References ---
    const sellersContainer = document.getElementById('sellersContainer');
    const paginationNav = document.getElementById('paginationNav');
    const modalProductList = document.getElementById('modalProductList');
    const productsModalLabel = document.getElementById('productsModalLabel');
    // NEW: Reference to the new modal's body from your HTML
    const sellerDetailsBody = document.getElementById('sellerDetailsBody');

    // --- State Variables ---
    const SELLERS_PER_PAGE = 8;
    let currentPage = 1;
    let allSellers = [];

    // NEW: Currency formatter for Philippine Peso
    const pesoFormatter = new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    });

    // =================================================================
    // FUNCTION DEFINITIONS
    // =================================================================

    /**
     * Renders the seller cards for the current active page.
     */
    function renderSellerCards() {
        sellersContainer.innerHTML = '';
        if (allSellers.length === 0) {
            sellersContainer.innerHTML = `<div class="loading-container">No sellers found.</div>`;
            return;
        }

        const startIndex = (currentPage - 1) * SELLERS_PER_PAGE;
        const sellersOnPage = allSellers.slice(startIndex, startIndex + SELLERS_PER_PAGE);

        sellersOnPage.forEach(seller => {
            const cardCol = document.createElement('div');
            cardCol.className = 'col-md-4 col-lg-3 mb-4 d-flex';
            const profilePic = seller.profile_pic || 'https://res.cloudinary.com/dwgvlwkyt/image/upload/v1751856106/default-avatar.jpg';

            // The HTML for the cards remains the same
            cardCol.innerHTML = `
                <div class="card seller-card w-100">
                    <div class="card-body text-center d-flex flex-column">
                        <div class="flex-grow-1">
                            <img src="${profilePic}" class="rounded-circle mb-3 seller-img" alt="${seller.name}" onerror="this.src='https://res.cloudinary.com/dwgvlwkyt/image/upload/v1751856106/default-avatar.jpg';">
                            <h5 class="card-title">${seller.name}</h5>
                            <p class="card-text text-muted small">${seller.email}</p>
                            <p class="card-text">
                                <strong>Phone:</strong> ${seller.contact_number || 'N/A'}
                            </p>
                            <p class="card-text">
                                <strong>Products Listed:</strong>
                                <span class="badge badge-primary">${seller.product_count}</span>
                            </p>
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="btn-group w-100" role="group">
                            <button class="btn btn-sm btn-outline-secondary action-btn" data-action="view" data-seller-id="${seller.id}" title="View Details"><i class="fas fa-eye"></i></button>
                            <button class="btn btn-sm btn-outline-info action-btn" data-action="products" data-seller-id="${seller.id}" data-seller-name="${seller.name}" title="View Products"><i class="fas fa-box-open"></i></button>
                            <button class="btn btn-sm btn-outline-warning action-btn" data-action="edit" data-seller-id="${seller.id}" title="Edit Seller"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-outline-danger action-btn" data-action="delete" data-seller-id="${seller.id}" title="Delete Seller"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </div>
                </div>`;
            sellersContainer.appendChild(cardCol);
        });
    }

    /**
     * Renders pagination controls.
     */
    function renderPaginationControls() {
        paginationNav.innerHTML = '';
        const pageCount = Math.ceil(allSellers.length / SELLERS_PER_PAGE);
        if (pageCount <= 1) return;

        let ulHTML = '<ul class="pagination">';
        ulHTML += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a></li>`;
        for (let i = 1; i <= pageCount; i++) {
            ulHTML += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        }
        ulHTML += `<li class="page-item ${currentPage === pageCount ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${currentPage + 1}">Next</a></li>`;
        ulHTML += '</ul>';
        paginationNav.innerHTML = ulHTML;
    }

    /**
     * Renders the entire page content.
     */
    function render() {
        renderSellerCards();
        renderPaginationControls();
    }

    /**
     * Fetches all sellers from the backend.
     */
    async function fetchSellers() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/admin/sellers`);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            allSellers = data.sellers || [];
            render();
        } catch (error) {
            console.error("Failed to fetch sellers:", error);
            sellersContainer.innerHTML = `<div class="error-container text-danger">Failed to load sellers. Please try again later.</div>`;
        }
    }

    /**
     * Fetches and displays a seller's products in a modal.
     */
    async function showProductsModal(sellerId, sellerName) {
        productsModalLabel.textContent = `Products from ${sellerName}`;
        modalProductList.innerHTML = '<div class="d-flex justify-content-center"><div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div></div>';
        $('#productsModal').modal('show');

        try {
            const response = await fetch(`${BACKEND_URL}/api/admin/sellers/${sellerId}/products`);
            if (!response.ok) throw new Error('Failed to fetch products');
            const data = await response.json();
            if (data.products && data.products.length > 0) {
                modalProductList.innerHTML = data.products.map(p => `...`).join(''); // This logic is unchanged
            } else {
                modalProductList.innerHTML = '<p class="text-center">This seller has no products listed.</p>';
            }
        } catch (error) {
            console.error("Error fetching products:", error);
            modalProductList.innerHTML = '<p class="text-center text-danger">Could not load products.</p>';
        }
    }
    
    // ========================================================
    // NEW: Function to show the seller details modal
    // ========================================================
    async function showSellerDetailsModal(sellerId) {
        // Set a loading state inside the modal body
        sellerDetailsBody.innerHTML = '<div class="text-center p-4"><div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div></div>';
        $('#sellerDetailsModal').modal('show');

        try {
            const response = await fetch(`${BACKEND_URL}/api/admin/sellers/${sellerId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch seller details.');
            }
            const seller = await response.json();

            // Populate the modal with the fetched data
            sellerDetailsBody.innerHTML = `
                <div class="details-modal-body">
                    <img src="${seller.profile_pic}" class="rounded-circle" alt="${seller.name}" onerror="this.src='https://res.cloudinary.com/dwgvlwkyt/image/upload/v1751856106/default-avatar.jpg';">
                    <div>
                        <ul class="details-list">
                            <li><strong>Name:</strong> ${seller.name}</li>
                            <li><strong>Email:</strong> ${seller.email}</li>
                            <li><strong>Phone:</strong> ${seller.contact_number || 'N/A'}</li>
                            <li><hr></li>
                            <li><strong>Total Sales:</strong> <span class="text-success font-weight-bold">${pesoFormatter.format(seller.total_sales)}</span></li>
                        </ul>
                    </div>
                </div>
            `;
        } catch (error) {
            sellerDetailsBody.innerHTML = `<p class="text-danger text-center p-4">${error.message}</p>`;
            console.error('Error fetching seller details:', error);
        }
    }

    /**
     * Deletes a seller after confirmation.
     */
    async function deleteSeller(sellerId) {
        if (!confirm(`Are you sure you want to delete seller ID: ${sellerId}?`)) return;
        try {
            const response = await fetch(`${BACKEND_URL}/api/admin/sellers/${sellerId}`, { method: 'DELETE' });
            if (response.ok) {
                alert('Seller deleted successfully.');
                fetchSellers(); // Refresh
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete seller.');
            }
        } catch (error) {
            console.error('Deletion failed:', error);
            alert(`Error: ${error.message}`);
        }
    }

    /**
     * Handles clicks on any of the action buttons on a seller card.
     */
    function handleActionClick(e) {
        const button = e.target.closest('.action-btn');
        if (!button) return;

        const action = button.dataset.action;
        const sellerId = button.dataset.sellerId;

        switch (action) {
            case 'view':
                // UPDATED: Call the new function
                showSellerDetailsModal(sellerId);
                break;
            case 'products':
                const sellerName = button.dataset.sellerName;
                showProductsModal(sellerId, sellerName);
                break;
            case 'edit':
                alert(`Editing seller ID: ${sellerId}.`);
                break;
            case 'delete':
                deleteSeller(sellerId);
                break;
        }
    }

    // --- Event Listeners ---
    sellersContainer.addEventListener('click', handleActionClick);

    paginationNav.addEventListener('click', function(e) {
        e.preventDefault();
        const link = e.target.closest('a[data-page]');
        if (link) {
            const page = parseInt(link.dataset.page, 10);
            if (page >= 1 && page <= Math.ceil(allSellers.length / SELLERS_PER_PAGE)) {
                currentPage = page;
                render();
            }
        }
    });

    // --- Initial Load ---
    fetchSellers();
});