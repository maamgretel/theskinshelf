// js/admin_sellers_page.js

document.addEventListener('DOMContentLoaded', function() {
    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const user = JSON.parse(localStorage.getItem('user'));

    // --- Security Check ---
    if (!user || user.role !== 'admin') {
        alert("Access denied. You must be an admin to view this page.");
        window.location.href = 'login.html';
        return; // Stop execution if not an admin
    }

    const sellersContainer = document.getElementById('sellersContainer');
    const paginationNav = document.getElementById('paginationNav');

    const SELLERS_PER_PAGE = 8;
    let currentPage = 1;
    let allSellers = []; // This will hold the full list of sellers from the API

    /**
     * Fetches sellers from the backend API.
     */
    async function fetchSellers() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/admin/sellers`, {
                headers: { 'X-User-ID': user.id.toString() }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            allSellers = data.sellers || [];
            render(); // Initial render after fetching data
        } catch (error) {
            console.error("Failed to fetch sellers:", error);
            sellersContainer.innerHTML = `<div class="error-container text-danger">Failed to load sellers. Please try again later.</div>`;
        }
    }

    /**
     * Renders the cards and pagination for the current page.
     */
    function render() {
        renderSellerCards();
        renderPaginationControls();
    }

    /**
     * Renders the seller cards for the current active page.
     */
    function renderSellerCards() {
        sellersContainer.innerHTML = ''; // Clear existing content
        if (allSellers.length === 0) {
            sellersContainer.innerHTML = `<div class="loading-container">No sellers found.</div>`;
            return;
        }

        const startIndex = (currentPage - 1) * SELLERS_PER_PAGE;
        const endIndex = startIndex + SELLERS_PER_PAGE;
        const sellersOnPage = allSellers.slice(startIndex, endIndex);

        sellersOnPage.forEach(seller => {
            const cardCol = document.createElement('div');
            cardCol.className = 'col-md-4 col-lg-3 mb-4';

            const profilePic = seller.profile_pic ? `../uploads/${seller.profile_pic}` : '../uploads/default-avatar.png';

            // THIS IS THE CORRECTED LINE THAT FIXES THE INFINITE LOOP
            cardCol.innerHTML = `
                <div class="card seller-card">
                    <div class="card-body text-center">
                        <div>
                            <img src="${profilePic}" class="rounded-circle mb-3 seller-img" alt="${seller.name}" onerror="this.onerror=null; this.src='../uploads/default-avatar.png';">
                            <h5 class="card-title">${seller.name}</h5>
                            <p class="card-text text-muted small">${seller.email}</p>
                        </div>
                        <div class="mt-3">
                            <p class="card-text mb-2">
                                <strong>Phone:</strong> ${seller.contact_number || 'N/A'}
                            </p>
                            <p class="card-text mb-2">
                                <strong>Products Listed:</strong>
                                <span class="badge badge-primary">${seller.product_count}</span>
                            </p>
                        </div>
                    </div>
                </div>
            `;
            sellersContainer.appendChild(cardCol);
        });
    }

    /**
     * Renders ONLY the pagination controls (buttons), without adding listeners.
     */
    function renderPaginationControls() {
        paginationNav.innerHTML = ''; // Clear old buttons
        const pageCount = Math.ceil(allSellers.length / SELLERS_PER_PAGE);
        if (pageCount <= 1) return;

        const ul = document.createElement('ul');
        ul.className = 'pagination';
        
        ul.innerHTML += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a></li>`;
        for (let i = 1; i <= pageCount; i++) {
            ul.innerHTML += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        }
        ul.innerHTML += `<li class="page-item ${currentPage === pageCount ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${currentPage + 1}">Next</a></li>`;

        paginationNav.appendChild(ul);
    }
    
    // Attach ONE event listener when the page loads
    paginationNav.addEventListener('click', function(e) {
        e.preventDefault();
        
        if (e.target.tagName === 'A' && e.target.dataset.page) {
            const page = parseInt(e.target.dataset.page);
            if (page === currentPage || !page) return;
            currentPage = page;
            render();
        }
    });

    // --- Initial Load ---
    fetchSellers();
}); 