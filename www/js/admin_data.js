document.addEventListener('DOMContentLoaded', () => {

    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const user = JSON.parse(localStorage.getItem('user'));

    // --- Security Check ---
    if (!user || user.role !== 'admin') {
        alert("Access denied. You must be an admin to view this page.");
        window.location.href = 'login.html';
        return; // Stop execution if not an admin
    }

    /**
     * A reusable function to make authenticated API calls.
     */
    async function fetchData(endpoint) {
        try {
            const response = await fetch(`${BACKEND_URL}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': user.id.toString() // Assuming your backend needs this for auth
                }
            });

            if (!response.ok) {
                throw new Error(`Server returned status: ${response.status}`);
            }
            return await response.json();

        } catch (error) {
            console.error(`Error fetching from ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Load and display sellers in a paginated card layout.
     */
    async function loadAndDisplaySellers(container, paginationNav) {
        const SELLERS_PER_PAGE = 8;
        let currentPage = 1;
        let allSellers = [];

        function createSellerCard(seller) {
            const cardCol = document.createElement('div');
            cardCol.className = 'col-md-4 col-lg-3 mb-4';
            
            // ✅ CORRECTED IMAGE LOGIC: Use Cloudinary URL or a default
            const imageUrl = seller.profile_pic ? seller.profile_pic : '../assets/default-avatar.png';

            cardCol.innerHTML = `
                <div class="card seller-card h-100">
                    <div class="card-body text-center d-flex flex-column">
                        <img src="${imageUrl}" class="rounded-circle mb-3" width="80" height="80" alt="${seller.name}" style="object-fit: cover;">
                        <h5 class="card-title">${seller.name}</h5>
                        <p class="card-text text-muted small">${seller.email}</p>
                        <div class="mt-auto">
                           <p class="card-text mb-2"><small>Products: ${seller.product_count || 0}</small></p>
                        </div>
                    </div>
                </div>
            `;
            return cardCol;
        }
        
        // ... (rest of pagination logic can be added here if needed)

        try {
            const data = await fetchData('/api/admin/sellers'); // Assuming this is your endpoint for sellers
            allSellers = data || [];

            container.innerHTML = ''; // Clear loading state
            if (allSellers.length === 0) {
                container.innerHTML = '<div class="col-12 text-center text-muted">No sellers found.</div>';
                return;
            }
            allSellers.forEach(seller => {
                container.appendChild(createSellerCard(seller));
            });

        } catch (error) {
            container.innerHTML = '<div class="col-12 text-center text-danger">Error loading sellers. Please try again.</div>';
        }
    }

    /**
     * Load and display products in the products table.
     */
    async function loadAndDisplayProducts(tableBody) {
        try {
            const data = await fetchData('/api/admin/products');
            const products = data || []; // The API returns an array directly

            if (products.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No products found.</td></tr>';
                return;
            }

            tableBody.innerHTML = ''; // Clear loading spinner
            products.forEach(product => {
                const row = document.createElement('tr');
                
                // ✅ CORRECTED IMAGE LOGIC: Use Cloudinary URL or a default
                const imageUrl = product.image ? product.image : '../assets/default-product.png';

                row.innerHTML = `
                    <td>
                        <img src="${imageUrl}" width="50" height="50" style="object-fit: contain;" alt="${product.name}">
                    </td>
                    <td>${product.name}</td>
                    <td>${product.seller_name || 'N/A'}</td>
                    <td>$${parseFloat(product.price).toFixed(2)}</td>
                    <td>${product.stock}</td>
                `;
                tableBody.appendChild(row);
            });

        } catch (error) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading products. Please try again.</td></tr>';
        }
    }

    /**
     * Load and display orders in the orders table.
     */
    async function loadAndDisplayOrders(tableBody) {
        try {
            const data = await fetchData('/api/admin/orders');
            // ✅ The data is wrapped in an "orders" object
            const orders = data.orders || [];

            if (orders.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No orders found.</td></tr>';
                return;
            }

            tableBody.innerHTML = '';
            orders.forEach(order => {
                const row = document.createElement('tr');
                const date = new Date(order.order_date).toLocaleDateString();
                // ✅ Use 'total_price' as seen in your JSON response
                const price = parseFloat(order.total_price).toFixed(2);

                row.innerHTML = `
                    <td>#${order.id}</td>
                    <td>${order.customer_name}</td>
                    <td>$${price}</td>
                    <td><span class="badge badge-info">${order.status}</span></td>
                    <td>${date}</td>
                `;
                tableBody.appendChild(row);
            });

        } catch (error) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading orders. Please try again.</td></tr>';
        }
    }


    // --- This single listener starts everything ---
    // It checks which page is active and loads the correct data.
    const sellersContainer = document.getElementById('sellersContainer');
    const paginationNav = document.getElementById('paginationNav');
    const productTableBody = document.getElementById('productTableBody');
    const orderTableBody = document.getElementById('orderTableBody');

    if (sellersContainer && paginationNav) {
        loadAndDisplaySellers(sellersContainer, paginationNav);
    }
    
    if (productTableBody) {
        loadAndDisplayProducts(productTableBody);
    }
    
    if (orderTableBody) {
        loadAndDisplayOrders(orderTableBody);
    }
});