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

    // --- Helper function to group orders by date (since no seller info available) ---
    function groupOrdersByDate(orders) {
        const grouped = {};
        
        orders.forEach(order => {
            // Group by order date (same day)
            const orderDate = new Date(order.order_date).toDateString();
            
            if (!grouped[orderDate]) {
                grouped[orderDate] = {
                    order_date: order.order_date,
                    date_string: orderDate,
                    status: order.status || 'pending',
                    order_ids: [],
                    products: [],
                    total_amount: 0
                };
            }
            
            // Add product to the group
            const productData = {
                id: order.id,
                name: order.product_name || 'Unknown Product',
                image: order.product_image || '/images/placeholder.jpg',
                quantity: 1, // Since API doesn't provide quantity
                price: parseFloat(order.total_price || 0),
                subtotal: parseFloat(order.total_price || 0)
            };
            
            grouped[orderDate].products.push(productData);
            grouped[orderDate].order_ids.push(order.id);
            
            // Add to total amount
            grouped[orderDate].total_amount += productData.subtotal;
            
            // Update status to most recent status in the group
            if (order.status) {
                grouped[orderDate].status = order.status;
            }
        });
        
        return Object.values(grouped);
    }

    // --- Function to create product item HTML ---
    function createProductItemHTML(product) {
        return `
            <div class="d-flex align-items-center mb-2 pb-2 border-bottom">
                <img src="${product.image}" 
                     alt="${product.name}" 
                     class="product-image mr-3"
                     style="width: 60px; height: 60px; object-fit: cover; border-radius: 0.25rem;"
                     onerror="this.src='/images/placeholder.jpg'">
                <div class="flex-grow-1">
                    <h6 class="mb-1">${product.name}</h6>
                    <small class="text-muted">Individual Order</small>
                </div>
                <div class="text-right">
                    <strong>₱${product.subtotal.toFixed(2)}</strong>
                </div>
            </div>
        `;
    }

    // --- Function to create grouped order card ---
    function createGroupedOrderCard(orderGroup) {
        const orderDate = new Date(orderGroup.order_date).toLocaleDateString('en-US', {
            year: 'numeric', 
            month: 'long', 
            day: 'numeric'
        });

        const orderTime = new Date(orderGroup.order_date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const productsHTML = orderGroup.products.map(product => 
            createProductItemHTML(product)
        ).join('');

        const productCount = orderGroup.products.length;
        const productText = productCount === 1 ? 'item' : 'items';

        return `
            <div class="card mb-4 order-card">
                <div class="card-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h5 class="mb-1">
                                <i class="fas fa-calendar-day mr-2"></i>
                                Order from ${orderDate}
                            </h5>
                            <small class="text-muted">
                                ${productCount} ${productText} • Placed at ${orderTime}
                            </small>
                        </div>
                        <span class="badge ${getStatusBadgeClass(orderGroup.status)} badge-lg">
                            ${orderGroup.status || 'Pending'}
                        </span>
                    </div>
                </div>
                <div class="card-body">
                    <div class="products-list">
                        ${productsHTML}
                    </div>
                    <hr>
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>Total Amount: ₱${orderGroup.total_amount.toFixed(2)}</strong>
                        </div>
                        <div>
                            <button class="btn btn-outline-primary btn-sm mr-2" onclick="viewOrderDetails('${orderGroup.order_ids.join(',')}')">
                                View Details
                            </button>
                            ${orderGroup.status === 'delivered' ? 
                                '<button class="btn btn-primary btn-sm" onclick="reorderItems(\'' + orderGroup.order_ids.join(',') + '\')">Reorder</button>' : 
                                ''
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // --- Alternative: Show individual orders (no grouping) ---
    function createIndividualOrderCard(order) {
        const orderDate = new Date(order.order_date).toLocaleDateString('en-US', {
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="card mb-3 order-card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <div>
                        <strong>Order #${order.id}</strong>
                        <small class="text-muted d-block">Placed on ${orderDate}</small>
                    </div>
                    <span class="badge ${getStatusBadgeClass(order.status)}">${order.status || 'Pending'}</span>
                </div>
                <div class="card-body">
                    <div class="d-flex align-items-center">
                        <img src="${order.product_image}" 
                             alt="${order.product_name}" 
                             class="product-image mr-3"
                             style="width: 80px; height: 80px; object-fit: cover; border-radius: 0.25rem;"
                             onerror="this.src='/images/placeholder.jpg'">
                        <div class="flex-grow-1">
                            <h5 class="card-title mb-1">${order.product_name}</h5>
                            <p class="card-text font-weight-bold">₱${parseFloat(order.total_price).toFixed(2)}</p>
                        </div>
                        <div>
                            <button class="btn btn-outline-primary btn-sm mr-2" onclick="viewOrderDetails(${order.id})">
                                View Details
                            </button>
                            ${order.status === 'delivered' ? 
                                '<button class="btn btn-primary btn-sm" onclick="reorderItems(' + order.id + ')">Reorder</button>' : 
                                ''
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // --- Main function to fetch and display orders ---
    async function fetchAndDisplayOrders() {
        ordersContainer.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div><p class="mt-2">Loading your orders...</p></div>';

        try {
            const response = await fetch(`${BACKEND_URL}/api/orders`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'X-User-ID': user.id 
                }
            });

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
                ordersContainer.innerHTML = `
                    <div class="text-center py-5">
                        <i class="fas fa-shopping-bag fa-3x text-muted mb-3"></i>
                        <h4>No Orders Yet</h4>
                        <p class="text-muted">You haven't placed any orders yet. Start shopping to see your orders here!</p>
                        <a href="products.html" class="btn btn-primary">Start Shopping</a>
                    </div>
                `;
                return;
            }

            // Sort orders by date (newest first)
            orders.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));

            // Option 1: Group by date (recommended since no seller info)
            const useGrouping = true; // Set to false for individual order cards
            
            if (useGrouping) {
                const groupedOrders = groupOrdersByDate(orders);
                groupedOrders.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
                
                groupedOrders.forEach(orderGroup => {
                    const orderCardHTML = createGroupedOrderCard(orderGroup);
                    ordersContainer.insertAdjacentHTML('beforeend', orderCardHTML);
                });

                // Add summary stats
                const totalOrders = groupedOrders.length;
                const totalAmount = groupedOrders.reduce((sum, order) => sum + order.total_amount, 0);
                
                const summaryHTML = `
                    <div class="alert alert-info mb-4">
                        <div class="row text-center">
                            <div class="col-md-4">
                                <h5>${orders.length}</h5>
                                <small>Total Items</small>
                            </div>
                            <div class="col-md-4">
                                <h5>${totalOrders}</h5>
                                <small>Order Days</small>
                            </div>
                            <div class="col-md-4">
                                <h5>₱${totalAmount.toFixed(2)}</h5>
                                <small>Total Spent</small>
                            </div>
                        </div>
                    </div>
                `;
                
                ordersContainer.insertAdjacentHTML('afterbegin', summaryHTML);
                
            } else {
                // Option 2: Show individual orders (original style)
                orders.forEach(order => {
                    const orderCardHTML = createIndividualOrderCard(order);
                    ordersContainer.insertAdjacentHTML('beforeend', orderCardHTML);
                });

                // Add summary stats
                const totalAmount = orders.reduce((sum, order) => sum + parseFloat(order.total_price), 0);
                
                const summaryHTML = `
                    <div class="alert alert-info mb-4">
                        <div class="row text-center">
                            <div class="col-md-6">
                                <h5>${orders.length}</h5>
                                <small>Total Orders</small>
                            </div>
                            <div class="col-md-6">
                                <h5>₱${totalAmount.toFixed(2)}</h5>
                                <small>Total Spent</small>
                            </div>
                        </div>
                    </div>
                `;
                
                ordersContainer.insertAdjacentHTML('afterbegin', summaryHTML);
            }

        } catch (error) {
            console.error('Error fetching orders:', error);
            ordersContainer.innerHTML = `
                <div class="alert alert-danger text-center">
                    <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                    <h5>Could not load your orders</h5>
                    <p>Please check your connection and try again.</p>
                    <p><small>Error: ${error.message}</small></p>
                    <button class="btn btn-danger" onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    }

    // --- Helper functions for order actions ---
    window.viewOrderDetails = function(orderIds) {
        console.log('View order details for:', orderIds);
        // If multiple IDs, show the first one or create a combined view
        const firstId = typeof orderIds === 'string' ? orderIds.split(',')[0] : orderIds;
        window.location.href = `order_details.html?id=${firstId}`;
    };

    window.reorderItems = function(orderIds) {
        console.log('Reorder items for:', orderIds);
        if (confirm('Add these items to your cart again?')) {
            alert('Items added to cart!');
        }
    };

    // --- Initial call to start the process ---
    fetchAndDisplayOrders();
});