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

    // --- ENHANCED: Group orders by date, then by seller ---
    function groupOrdersByDateAndSeller(orders) {
        const dateGroups = {};
        
        // First, group by date
        orders.forEach(order => {
            const orderDate = new Date(order.order_date).toDateString();
            
            if (!dateGroups[orderDate]) {
                dateGroups[orderDate] = {
                    order_date: order.order_date,
                    date_string: orderDate,
                    sellers: {}
                };
            }
            
            // Then group by seller within each date
            const sellerId = order.seller_id;
            const sellerName = order.seller_name || 'Unknown Seller';
            
            if (!dateGroups[orderDate].sellers[sellerId]) {
                dateGroups[orderDate].sellers[sellerId] = {
                    seller_id: sellerId,
                    seller_name: sellerName,
                    status: order.status || 'pending',
                    order_ids: [],
                    products: [],
                    total_amount: 0
                };
            }
            
            // Add product to the seller group
            const productData = {
                id: order.id,
                name: order.product_name || 'Unknown Product',
                image: order.product_image || '/images/placeholder.jpg',
                quantity: 1, // Since API doesn't provide quantity
                price: parseFloat(order.total_price || 0),
                subtotal: parseFloat(order.total_price || 0)
            };
            
            dateGroups[orderDate].sellers[sellerId].products.push(productData);
            dateGroups[orderDate].sellers[sellerId].order_ids.push(order.id);
            dateGroups[orderDate].sellers[sellerId].total_amount += productData.subtotal;
            
            // Update status to most recent status in the seller group
            if (order.status) {
                dateGroups[orderDate].sellers[sellerId].status = order.status;
            }
        });
        
        return dateGroups;
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

    // --- ENHANCED: Function to create seller group card ---
    function createSellerGroupCard(sellerGroup) {
        const productsHTML = sellerGroup.products.map(product => 
            createProductItemHTML(product)
        ).join('');

        const productCount = sellerGroup.products.length;
        const productText = productCount === 1 ? 'item' : 'items';

        return `
            <div class="card mb-3 seller-group-card" style="margin-left: 20px; border-left: 4px solid #007bff;">
                <div class="card-header bg-light">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">
                                <i class="fas fa-store mr-2"></i>
                                ${sellerGroup.seller_name}
                            </h6>
                            <small class="text-muted">
                                ${productCount} ${productText}
                            </small>
                        </div>
                        <span class="badge ${getStatusBadgeClass(sellerGroup.status)}">
                            ${sellerGroup.status || 'Pending'}
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
                            <strong>Seller Total: ₱${sellerGroup.total_amount.toFixed(2)}</strong>
                        </div>
                        <div>
                            <button class="btn btn-outline-primary btn-sm mr-2" onclick="viewOrderDetails('${sellerGroup.order_ids.join(',')}')">
                                View Details
                            </button>
                            ${sellerGroup.status === 'delivered' ? 
                                '<button class="btn btn-primary btn-sm" onclick="reorderItems(\'' + sellerGroup.order_ids.join(',') + '\')">Reorder</button>' : 
                                ''
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // --- ENHANCED: Function to create date group card ---
    function createDateGroupCard(dateGroup) {
        const orderDate = new Date(dateGroup.order_date).toLocaleDateString('en-US', {
            year: 'numeric', 
            month: 'long', 
            day: 'numeric'
        });

        const orderTime = new Date(dateGroup.order_date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        // Calculate totals for the entire date
        let totalProducts = 0;
        let totalAmount = 0;
        const sellers = Object.values(dateGroup.sellers);
        
        sellers.forEach(seller => {
            totalProducts += seller.products.length;
            totalAmount += seller.total_amount;
        });

        // Create seller group cards
        const sellerGroupsHTML = sellers.map(sellerGroup => 
            createSellerGroupCard(sellerGroup)
        ).join('');

        const productText = totalProducts === 1 ? 'item' : 'items';
        const sellerText = sellers.length === 1 ? 'seller' : 'sellers';

        return `
            <div class="card mb-4 date-group-card">
                <div class="card-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h5 class="mb-1">
                                <i class="fas fa-calendar-day mr-2"></i>
                                Orders from ${orderDate}
                            </h5>
                            <small class="text-muted">
                                ${totalProducts} ${productText} from ${sellers.length} ${sellerText} • Placed at ${orderTime}
                            </small>
                        </div>
                        <div class="text-right">
                            <strong class="text-primary">₱${totalAmount.toFixed(2)}</strong>
                            <br>
                            <small class="text-muted">Daily Total</small>
                        </div>
                    </div>
                </div>
                <div class="card-body p-0">
                    ${sellerGroupsHTML}
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

            // Group by date and seller
            const groupedOrders = groupOrdersByDateAndSeller(orders);
            
            // Convert to array and sort by date (newest first)
            const sortedDateGroups = Object.values(groupedOrders)
                .sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
            
            // Create cards for each date group
            sortedDateGroups.forEach(dateGroup => {
                const dateCardHTML = createDateGroupCard(dateGroup);
                ordersContainer.insertAdjacentHTML('beforeend', dateCardHTML);
            });

            // Add summary stats
            const totalDays = sortedDateGroups.length;
            const totalSellers = new Set(orders.map(order => order.seller_id)).size;
            const totalAmount = orders.reduce((sum, order) => sum + parseFloat(order.total_price), 0);
            
            const summaryHTML = `
                <div class="alert alert-info mb-4">
                    <div class="row text-center">
                        <div class="col-md-3">
                            <h5>${orders.length}</h5>
                            <small>Total Orders</small>
                        </div>
                        <div class="col-md-3">
                            <h5>${totalDays}</h5>
                            <small>Order Days</small>
                        </div>
                        <div class="col-md-3">
                            <h5>${totalSellers}</h5>
                            <small>Different Sellers</small>
                        </div>
                        <div class="col-md-3">
                            <h5>₱${totalAmount.toFixed(2)}</h5>
                            <small>Total Spent</small>
                        </div>
                    </div>
                </div>
            `;
            
            ordersContainer.insertAdjacentHTML('afterbegin', summaryHTML);

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


    window.viewOrderDetails = function(orderIds) {
        console.log('View order details for:', orderIds);
        
        const firstId = typeof orderIds === 'string' ? orderIds.split(',')[0] : orderIds;
        window.location.href = `order_details.html?id=${firstId}`;
    };

    window.reorderItems = function(orderIds) {
        console.log('Reorder items for:', orderIds);
        if (confirm('Add these items to your cart again?')) {
            alert('Items added to cart!');
        }
    };


    fetchAndDisplayOrders();
});