document.addEventListener('DOMContentLoaded', () => {

    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const ordersContainer = document.getElementById('orders-list-container');
    const user = JSON.parse(localStorage.getItem('user'));

    // --- 1. Security Check (Matches profile.js) ---
    if (!user) {
        alert('Access Denied. Please log in.');
        window.location.href = 'login.html';
        return;
    }

    // --- Helper function to determine badge color based on status ---
    function getStatusBadgeClass(status) {
        status = (status || 'pending').toLowerCase();
        if (status === 'delivered') return 'badge-success';
        if (status === 'shipped') return 'badge-primary';
        if (status === 'cancelled') return 'badge-danger';
        return 'badge-warning'; // For 'pending' or other statuses
    }

    // --- Main function to fetch and display orders ---
    async function fetchAndDisplayOrders() {
        ordersContainer.innerHTML = '<p class="text-center">Loading your orders...</p>';

        try {
            const response = await fetch(`${BACKEND_URL}/api/orders`, {
                headers: {
                    // --- CORRECTED: Added both required headers ---
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'X-User-ID': user.id 
                }
            });

            // --- CORRECTED: Error handling now matches profile.js ---
            if (!response.ok) {
                if (response.status === 401) {
                    alert('Session expired or invalid. Please log in again.');
                    localStorage.clear();
                    window.location.href = 'login.html';
                    return;
                }
                throw new Error(`Failed to fetch orders. Status: ${response.status}`);
            }

            const orders = await response.json();
            ordersContainer.innerHTML = '';

            if (orders.length === 0) {
                ordersContainer.innerHTML = '<p class="text-center text-muted">You have no orders yet.</p>';
                return;
            }

            // Loop through and display each order card
            orders.forEach(order => {
                const orderDate = new Date(order.order_date).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'
                });

                const orderCard = document.createElement('div');
                orderCard.className = 'card mb-3 order-card';
                orderCard.innerHTML = `
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <div>
                            <strong>Order #${order.id}</strong>
                            <small class="text-muted d-block">Placed on ${orderDate}</small>
                        </div>
                        <span class="badge ${getStatusBadgeClass(order.status)}">${order.status || 'Pending'}</span>
                    </div>
                    <div class="card-body">
                        <div class="d-flex align-items-center">
                            <img src="${order.product_image}" alt="${order.product_name}" class="product-image mr-3">
                            <div class="flex-grow-1">
                                <h5 class="card-title mb-1">${order.product_name}</h5>
                                <p class="card-text font-weight-bold">₱${parseFloat(order.total_price).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                `;
                ordersContainer.appendChild(orderCard);
            });

        } catch (error) {
            console.error('Error fetching orders:', error);
            ordersContainer.innerHTML = `<p class="text-center text-danger">Could not load your orders. Please try again later.</p>`;
        }
    }

    // --- Initial call to start the process ---
    fetchAndDisplayOrders();
});