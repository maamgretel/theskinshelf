document.addEventListener('DOMContentLoaded', () => {

    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const ordersContainer = document.getElementById('orders-list-container');
    const user = JSON.parse(localStorage.getItem('user'));

    // --- 1. Security Check ---
    if (!user) {
        alert('Access Denied. Please log in.');
        window.location.href = 'login.html';
        return;
    }

    // --- Helper Functions ---
    
    function getStatusBadgeClass(status) {
        status = (status || 'pending').toLowerCase();
        if (status === 'delivered') return 'badge-success';
        if (status === 'shipped') return 'badge-primary';
        if (status === 'cancelled') return 'badge-danger';
        return 'badge-warning';
    }

    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function formatTime(dateString) {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function generateOrderNumber(orderId, date) {
        const dateObj = new Date(date);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `ORD-${year}${month}${day}-${String(orderId).padStart(4, '0')}`;
    }

    // --- Group orders by grouped_order_id OR by time if grouped_order_id is null ---
    function groupOrdersByOrderNumber(orders) {
        const orderGroups = {};
        
        orders.forEach(order => {
            let groupKey;
            
            if (order.grouped_order_id && order.grouped_order_id !== null) {
                // Use the grouped_order_id from backend if it exists
                groupKey = order.grouped_order_id;
            } else {
                // Group by customer_id and time (within 2 minutes) if grouped_order_id is null
                const orderTime = new Date(order.order_date).getTime();
                const customerId = order.customer_id;
                
                // Find existing time-based group within 2 minutes (120000ms)
                let foundGroup = null;
                for (const key in orderGroups) {
                    const group = orderGroups[key];
                    if (group.temp_customer_id === customerId && 
                        Math.abs(orderTime - group.temp_timestamp) <= 120000) {
                        foundGroup = key;
                        break;
                    }
                }
                
                if (foundGroup) {
                    groupKey = foundGroup;
                } else {
                    // Create new time-based group
                    groupKey = `TIME_GROUP_${customerId}_${orderTime}`;
                }
            }
            
            if (!orderGroups[groupKey]) {
                const isTimeGroup = groupKey.startsWith('TIME_GROUP_');
                orderGroups[groupKey] = {
                    order_id: groupKey,
                    order_number: order.grouped_order_id || (isTimeGroup ? `ORD-${order.id.toString().padStart(6, '0')}` : `ORD-${order.id.toString().padStart(6, '0')}`),
                    order_date: order.order_date,
                    overall_status: order.status || 'pending',
                    sellers: {},
                    total_amount: 0,
                    total_items: 0,
                    order_ids: [],
                    temp_customer_id: order.customer_id, // For time-based grouping
                    temp_timestamp: new Date(order.order_date).getTime() // For time-based grouping
                };
            }
            
            // Add this order ID to the group
            orderGroups[groupKey].order_ids.push(order.id);
            
            // Group by seller within the order
            const sellerId = order.seller_id || 'unknown';
            const sellerName = order.seller_name || 'Unknown Seller';
            
            if (!orderGroups[groupKey].sellers[sellerId]) {
                orderGroups[groupKey].sellers[sellerId] = {
                    seller_id: sellerId,
                    seller_name: sellerName,
                    status: order.status || 'pending',
                    products: [],
                    seller_total: 0
                };
            }
            
            // Add product to the seller group
            const productData = {
                id: order.id,
                name: order.product_name || 'Unknown Product',
                image: order.product_image || '/images/placeholder.jpg',
                quantity: order.quantity || 1,
                price: parseFloat(order.total_price || 0),
                subtotal: parseFloat(order.total_price || 0)
            };
            
            orderGroups[groupKey].sellers[sellerId].products.push(productData);
            orderGroups[groupKey].sellers[sellerId].seller_total += productData.subtotal;
            orderGroups[groupKey].total_amount += productData.subtotal;
            orderGroups[groupKey].total_items += productData.quantity;
            
            // Use the earliest order date for the group
            if (new Date(order.order_date) < new Date(orderGroups[groupKey].order_date)) {
                orderGroups[groupKey].order_date = order.order_date;
            }
            
            // Update overall status - prioritize pending/processing over delivered
            const currentStatus = orderGroups[groupKey].overall_status;
            const newStatus = order.status || 'pending';
            
            // Status priority: cancelled > pending > shipped > delivered
            const statusPriority = {
                'cancelled': 4,
                'pending': 3,
                'shipped': 2,
                'delivered': 1
            };
            
            if ((statusPriority[newStatus] || 3) > (statusPriority[currentStatus] || 3)) {
                orderGroups[groupKey].overall_status = newStatus;
            }
        });
        
        return orderGroups;
    }

    // --- Create product item HTML ---
    function createProductItemHTML(product) {
        return `
            <div class="product-item d-flex align-items-center">
                <img src="${product.image}" 
                    alt="${product.name}" 
                    class="product-image mr-3"
                    onerror="this.src='/images/placeholder.jpg'">
                <div class="flex-grow-1">
                    <h6 class="mb-1">${product.name}</h6>
                    <small class="text-muted">Qty: ${product.quantity}</small>
                </div>
                <div class="text-right">
                    <strong>₱${product.subtotal.toFixed(2)}</strong>
                </div>
            </div>
        `;
    }

    // --- Create seller section HTML (non-collapsible, always visible when order is expanded) ---
    function createSellerSectionHTML(seller) {
        const productsHTML = seller.products.map(product => 
            createProductItemHTML(product)
        ).join('');

        const productCount = seller.products.length;
        const productText = productCount === 1 ? 'item' : 'items';

        return `
            <div class="seller-section">
                <div class="seller-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">
                                <i class="fas fa-store mr-2"></i>
                                ${seller.seller_name}
                            </h6>
                            <small class="text-muted">${productCount} ${productText}</small>
                        </div>
                        <div class="text-right">
                            <span class="badge ${getStatusBadgeClass(seller.status)} badge-lg mr-2">
                                ${seller.status || 'Pending'}
                            </span>
                            <strong>₱${seller.seller_total.toFixed(2)}</strong>
                        </div>
                    </div>
                </div>
                <div class="seller-content">
                    ${productsHTML}
                </div>
            </div>
        `;
    }

    // --- Create order card HTML (order header is collapsible) ---
    function createOrderCardHTML(orderGroup) {
        const sellers = Object.values(orderGroup.sellers);
        const sellerSectionsHTML = sellers.map(seller => 
            createSellerSectionHTML(seller)
        ).join('');

        const itemText = orderGroup.total_items === 1 ? 'item' : 'items';
        const sellerText = sellers.length === 1 ? 'seller' : 'sellers';
        const orderId = `order-${orderGroup.order_number.replace(/[^a-zA-Z0-9]/g, '')}`;

        return `
            <div class="card order-card" data-order-status="${orderGroup.overall_status}">
                <button class="order-header collapsed" 
                        type="button" 
                        data-toggle="collapse" 
                        data-target="#${orderId}" 
                        aria-expanded="false" 
                        aria-controls="${orderId}">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            <i class="fas fa-chevron-down collapse-icon mr-3"></i>
                            <div>
                                <h5 class="mb-1">
                                    <i class="fas fa-receipt mr-2"></i>
                                    ${orderGroup.order_number}
                                </h5>
                                <small class="opacity-75">
                                    ${formatDate(orderGroup.order_date)} at ${formatTime(orderGroup.order_date)}
                                </small>
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="badge ${getStatusBadgeClass(orderGroup.overall_status)} badge-lg mb-1">
                                ${orderGroup.overall_status || 'Pending'}
                            </span>
                            <br>
                            <strong class="text-white">₱${orderGroup.total_amount.toFixed(2)}</strong>
                        </div>
                    </div>
                </button>
                
                <div class="collapse" id="${orderId}">
                    <div class="order-summary">
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                ${orderGroup.total_items} ${itemText} from ${sellers.length} ${sellerText}
                            </small>
                            <strong class="text-primary">
                                Order Total: ₱${orderGroup.total_amount.toFixed(2)}
                            </strong>
                        </div>
                    </div>

                    <div class="card-body p-0">
                        ${sellerSectionsHTML}
                    </div>

                    <div class="order-actions">
                        <div class="d-flex justify-content-between align-items-center">
                        
                            ${orderGroup.overall_status === 'delivered' ? 
                                `<button class="btn btn-primary btn-sm" data-order-id="${orderGroup.order_ids.join(',')}">
                                    <i class="fas fa-redo mr-1"></i>Reorder
                                </button>` : 
                                ''
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // --- Event Handlers ---
    function setupEventHandlers() {
        // Tab filter functionality
        const tabItems = document.querySelectorAll('.tab-item');
        
        tabItems.forEach(tab => {
            tab.addEventListener('click', function() {
                // Remove active class from all tabs
                tabItems.forEach(t => t.classList.remove('active'));
                // Add active class to clicked tab
                this.classList.add('active');
                
                // Filter orders
                const selectedStatus = this.getAttribute('data-status').toLowerCase();
                filterOrdersByStatus(selectedStatus);
            });
        });

        // Sort functionality
        document.getElementById('sortOptions').addEventListener('change', function() {
            const sortValue = this.value;
            const container = document.getElementById('orders-list-container');
            const orderCards = Array.from(container.querySelectorAll('.order-card'));
            const summaryAlert = container.querySelector('.alert-info');
            
            orderCards.sort((a, b) => {
                const aDate = new Date(getOrderDate(a));
                const bDate = new Date(getOrderDate(b));
                const aAmount = getOrderAmount(a);
                const bAmount = getOrderAmount(b);
                
                switch (sortValue) {
                    case 'oldest':
                        return aDate - bDate;
                    case 'amount_high':
                        return bAmount - aAmount;
                    case 'amount_low':
                        return aAmount - bAmount;
                    case 'newest':
                    default:
                        return bDate - aDate;
                }
            });
            
            // Clear container and re-append in sorted order
            container.innerHTML = '';
            if (summaryAlert) {
                container.appendChild(summaryAlert);
            }
            orderCards.forEach(card => container.appendChild(card));
        });

        // Order action buttons
        ordersContainer.addEventListener('click', function(e) {
            const target = e.target.closest('button[data-order-id]');
            if (!target) return;
            
            const orderId = target.getAttribute('data-order-id');
            
            if (target.textContent.includes('View Details')) {
                viewOrderDetails(orderId);
            } else if (target.textContent.includes('Reorder')) {
                reorderItems(orderId);
            }
        });
    }
    
    // --- Filter function ---
    function filterOrdersByStatus(selectedStatus) {
        const orderCards = document.querySelectorAll('.order-card');
        let visibleCount = 0;
        
        orderCards.forEach(card => {
            const cardStatus = card.getAttribute('data-order-status').toLowerCase();
            
            if (!selectedStatus || cardStatus === selectedStatus) {
                card.style.display = 'block';
                card.style.animation = 'fadeIn 0.3s ease-out';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });
        
        // Update summary stats for filtered view
        updateFilteredSummary(selectedStatus, visibleCount);
    }
    
    // --- Update summary for filtered view ---
    function updateFilteredSummary(status, visibleCount) {
        const summaryAlert = document.querySelector('.alert-info');
        if (!summaryAlert) return;
        
        const statusText = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'All';
        const orderText = visibleCount === 1 ? 'Order' : 'Orders';
        
        // You can update the summary to show filtered stats if needed
        // For now, we'll keep the original totals
    }

    // --- Helper functions for sorting ---
    function getOrderDate(card) {
        const dateText = card.querySelector('.order-header small').textContent;
        const dateMatch = dateText.match(/(\w+ \d+, \d+)/);
        return dateMatch ? new Date(dateMatch[1]) : new Date();
    }

    function getOrderAmount(card) {
        const amountText = card.querySelector('.order-summary strong').textContent;
        const amountMatch = amountText.match(/₱([\d,]+\.?\d*)/);
        return amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : 0;
    }

    // --- Action Functions ---
    function viewOrderDetails(orderId) {
        console.log('View order details for:', orderId);
        // If orderId contains multiple IDs, use the first one
        const firstId = String(orderId).split(',')[0];
        window.location.href = `order_details.html?id=${firstId}`;
    }

    function reorderItems(orderId) {
        console.log('Reorder items for:', orderId);
        if (confirm('Add these items to your cart again?')) {
            // Here you would typically send the order_ids array to your reorder API
            alert('Items added to cart!');
        }
    }

    // --- Main function to fetch and display orders ---
    async function fetchAndDisplayOrders() {
        ordersContainer.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border" role="status">
                    <span class="sr-only">Loading...</span>
                </div>
                <p class="mt-2">Loading your orders...</p>
            </div>
        `;

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
                    <div class="text-center py-5 empty-state">
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

            // Group by order number
            const groupedOrders = groupOrdersByOrderNumber(orders);
            
            // Convert to array and sort by date (newest first)
            const sortedOrderGroups = Object.values(groupedOrders)
                .sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
            
            // Create cards for each order group
            sortedOrderGroups.forEach(orderGroup => {
                const orderCardHTML = createOrderCardHTML(orderGroup);
                ordersContainer.insertAdjacentHTML('beforeend', orderCardHTML);
            });

            // Add summary stats
            const totalOrders = sortedOrderGroups.length;
            const totalSellers = new Set(orders.map(order => order.seller_id)).size;
            const totalAmount = orders.reduce((sum, order) => sum + parseFloat(order.total_price || 0), 0);
            const totalItems = orders.length;
            
            const summaryHTML = `
                <div class="alert alert-info mb-4">
                    <div class="row text-center">
                        <div class="col-md-3 col-6 mb-2 mb-md-0">
                            <h5>${totalOrders}</h5>
                            <small>Total Orders</small>
                        </div>
                        <div class="col-md-3 col-6 mb-2 mb-md-0">
                            <h5>${totalItems}</h5>
                            <small>Total Items</small>
                        </div>
                        <div class="col-md-3 col-6">
                            <h5>${totalSellers}</h5>
                            <small>Different Sellers</small>
                        </div>
                        <div class="col-md-3 col-6">
                            <h5>₱${totalAmount.toFixed(2)}</h5>
                            <small>Total Spent</small>
                        </div>
                    </div>
                </div>
            `;
            
            ordersContainer.insertAdjacentHTML('afterbegin', summaryHTML);

            // Setup event handlers after content is loaded
            setupEventHandlers();

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

    // Initialize
    fetchAndDisplayOrders();
});