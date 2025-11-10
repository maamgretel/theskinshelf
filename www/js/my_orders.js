document.addEventListener('DOMContentLoaded', () => {

    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const ordersContainer = document.getElementById('orders-list-container');
    const user = JSON.parse(localStorage.getItem('user'));

    // --- Security Check ---
    if (!user) {
        showModal('Access Denied', 'Please log in to view your orders.', 'error', () => {
            window.location.href = 'login.html';
        });
        return;
    }

    // --- Modal System ---
    function createModal() {
        const modalHTML = `
            <div class="modal fade" id="customModal" tabindex="-1" role="dialog" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered" role="document">
                    <div class="modal-content">
                        <div class="modal-header" id="modalHeader">
                            <h5 class="modal-title" id="modalTitle"></h5>
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body" id="modalBody"></div>
                        <div class="modal-footer" id="modalFooter"></div>
                    </div>
                </div>
            </div>
        `;
        
        if (!document.getElementById('customModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
    }

    function cleanupModals() {
        // Force cleanup of any existing modal state
        const modal = $('#customModal');
        modal.modal('hide');
        $('.modal-backdrop').remove();
        $('body').removeClass('modal-open').css('padding-right', '');
    }

    function showModal(title, message, type = 'info', onConfirm = null, onCancel = null) {
        // Clean up first
        cleanupModals();
        
        setTimeout(() => {
            createModal();
            
            const modal = $('#customModal');
            const modalHeader = document.getElementById('modalHeader');
            const modalTitle = document.getElementById('modalTitle');
            const modalBody = document.getElementById('modalBody');
            const modalFooter = document.getElementById('modalFooter');

            // Set colors based on type
            const colors = {
                success: { bg: '#27ae60', icon: 'fa-check-circle' },
                error: { bg: '#e74c3c', icon: 'fa-exclamation-circle' },
                warning: { bg: '#f39c12', icon: 'fa-exclamation-triangle' },
                info: { bg: '#3498db', icon: 'fa-info-circle' },
                confirm: { bg: '#2c3e50', icon: 'fa-question-circle' }
            };

            const color = colors[type] || colors.info;
            
            modalHeader.style.backgroundColor = color.bg;
            modalHeader.style.color = 'white';
            
            modalTitle.innerHTML = `<i class="fas ${color.icon} mr-2"></i>${title}`;
            modalBody.innerHTML = `<p class="mb-0">${message}</p>`;

            // Clear footer
            modalFooter.innerHTML = '';

            if (type === 'confirm' && onConfirm) {
                // Confirmation modal with Yes/No buttons
                modalFooter.innerHTML = `
                    <button type="button" class="btn btn-secondary" data-dismiss="modal" id="modalCancelBtn">
                        <i class="fas fa-times mr-1"></i>Cancel
                    </button>
                    <button type="button" class="btn btn-danger" id="modalConfirmBtn">
                        <i class="fas fa-check mr-1"></i>Confirm
                    </button>
                `;

                document.getElementById('modalConfirmBtn').addEventListener('click', () => {
                    modal.modal('hide');
                    if (onConfirm) {
                        // Wait for modal to fully hide before executing callback
                        setTimeout(() => {
                            onConfirm();
                        }, 400);
                    }
                });

                document.getElementById('modalCancelBtn').addEventListener('click', () => {
                    if (onCancel) onCancel();
                });
            } else {
                // Simple OK button
                modalFooter.innerHTML = `
                    <button type="button" class="btn btn-primary" data-dismiss="modal">
                        <i class="fas fa-check mr-1"></i>OK
                    </button>
                `;

                if (onConfirm) {
                    modal.on('hidden.bs.modal', function() {
                        setTimeout(() => {
                            onConfirm();
                        }, 100);
                        modal.off('hidden.bs.modal');
                    });
                }
            }

            modal.modal({
                backdrop: 'static',
                keyboard: true,
                show: true
            });
        }, 100);
    }

    function showLoadingModal(message = 'Processing...') {
        // Force cleanup
        cleanupModals();
        
        setTimeout(() => {
            createModal();
            
            const modal = $('#customModal');
            const modalHeader = document.getElementById('modalHeader');
            const modalTitle = document.getElementById('modalTitle');
            const modalBody = document.getElementById('modalBody');
            const modalFooter = document.getElementById('modalFooter');

            modalHeader.style.backgroundColor = '#3498db';
            modalHeader.style.color = 'white';
            
            modalTitle.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>Please Wait`;
            modalBody.innerHTML = `
                <div class="text-center py-3">
                    <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;">
                        <span class="sr-only">Loading...</span>
                    </div>
                    <p class="mb-0 font-weight-bold">${message}</p>
                </div>
            `;
            modalFooter.innerHTML = '';

            // Remove close button for loading modal
            const closeBtn = modalHeader.querySelector('.close');
            if (closeBtn) closeBtn.style.display = 'none';

            // Prevent closing
            modal.modal({
                backdrop: 'static',
                keyboard: false,
                show: true
            });
        }, 100);
    }

    function hideModal() {
        const modal = $('#customModal');
        modal.modal('hide');
        setTimeout(() => {
            $('.modal-backdrop').remove();
            $('body').removeClass('modal-open').css('padding-right', '');
        }, 300);
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

    // --- Group orders by grouped_order_id OR by time ---
    function groupOrdersByOrderNumber(orders) {
        const orderGroups = {};
        
        orders.forEach(order => {
            let groupKey;
            
            if (order.grouped_order_id && order.grouped_order_id !== null) {
                groupKey = order.grouped_order_id;
            } else {
                const orderTime = new Date(order.order_date).getTime();
                const customerId = order.customer_id;
                
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
                    temp_customer_id: order.customer_id,
                    temp_timestamp: new Date(order.order_date).getTime()
                };
            }
            
            orderGroups[groupKey].order_ids.push(order.id);
            
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
            
            if (new Date(order.order_date) < new Date(orderGroups[groupKey].order_date)) {
                orderGroups[groupKey].order_date = order.order_date;
            }
            
            const currentStatus = orderGroups[groupKey].overall_status;
            const newStatus = order.status || 'pending';
            
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

    // --- Create seller section HTML ---
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

    // --- Create order card HTML ---
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
                            ${orderGroup.overall_status.toLowerCase() === 'pending' ? 
                                `<button class="btn btn-danger btn-sm cancel-order-btn" data-order-ids="${orderGroup.order_ids.join(',')}" data-order-number="${orderGroup.order_number}">
                                    <i class="fas fa-times mr-1"></i>Cancel Order
                                </button>` : 
                                ''
                            }
                            ${orderGroup.overall_status.toLowerCase() === 'delivered' ? 
                                `<button class="btn btn-primary btn-sm reorder-btn" data-order-ids="${orderGroup.order_ids.join(',')}">
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
                tabItems.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                const selectedStatus = this.getAttribute('data-status').toLowerCase();
                filterOrdersByStatus(selectedStatus);
            });
        });

        // Sort functionality
        const sortSelect = document.getElementById('sortOptions');
        if (sortSelect) {
            sortSelect.addEventListener('change', function() {
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
                
                container.innerHTML = '';
                if (summaryAlert) {
                    container.appendChild(summaryAlert);
                }
                orderCards.forEach(card => container.appendChild(card));
            });
        }

        // Order action buttons
        ordersContainer.addEventListener('click', function(e) {
            const cancelBtn = e.target.closest('.cancel-order-btn');
            const reorderBtn = e.target.closest('.reorder-btn');
            
            if (cancelBtn) {
                const orderIds = cancelBtn.getAttribute('data-order-ids');
                const orderNumber = cancelBtn.getAttribute('data-order-number');
                cancelOrder(orderIds, orderNumber, cancelBtn);
            } else if (reorderBtn) {
                const orderIds = reorderBtn.getAttribute('data-order-ids');
                reorderItems(orderIds);
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
    async function cancelOrder(orderIds, orderNumber, buttonElement) {
        const orderIdArray = orderIds.split(',').map(id => parseInt(id));
        const orderCount = orderIdArray.length;
        const itemText = orderCount === 1 ? 'item' : 'items';
        
        showModal(
            'Cancel Order',
            `Are you sure you want to cancel order <strong>${orderNumber}</strong>?<br><br>
            <div class="alert alert-warning mb-0">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                This will cancel <strong>${orderCount} ${itemText}</strong> and this action cannot be undone.
            </div>`,
            'confirm',
            async () => {
                // Show loading modal
                showLoadingModal('Cancelling your order...');

                // Small delay to ensure loading modal is fully rendered
                setTimeout(async () => {
                    try {
                        const response = await fetch(`${BACKEND_URL}/api/orders/cancel`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                                'Content-Type': 'application/json',
                                'X-User-ID': user.id
                            },
                            body: JSON.stringify({ order_ids: orderIdArray })
                        });

                        const contentType = response.headers.get('content-type');
                        if (!contentType || !contentType.includes('application/json')) {
                            throw new Error('Server returned an invalid response. Please contact support.');
                        }

                        const result = await response.json();

                        hideModal();

                        if (!response.ok) {
                            throw new Error(result.error || 'Failed to cancel order');
                        }

                        // Wait for modal to hide before showing success
                        setTimeout(() => {
                            showModal(
                                'Success!',
                                `Order ${orderNumber} has been cancelled successfully.<br><br>
                                <i class="fas fa-check-circle text-success mr-1"></i> ${result.orders_cancelled || orderCount} ${itemText} cancelled`,
                                'success',
                                () => {
                                    fetchAndDisplayOrders();
                                }
                            );
                        }, 100);

                    } catch (error) {
                        hideModal();
                        console.error('Error cancelling order:', error);
                        
                        setTimeout(() => {
                            showModal(
                                'Cancellation Failed',
                                `<div class="alert alert-danger mb-2">
                                    <i class="fas fa-exclamation-circle mr-2"></i><strong>Error:</strong> ${error.message}
                                </div>
                                <p class="mb-0">Please try again or contact support if the problem persists.</p>`,
                                'error'
                            );
                        }, 100);
                    }
                }, 200);
            },
            () => {
                // User cancelled
                console.log('Order cancellation aborted by user');
            }
        );
    }

    function reorderItems(orderIds) {
        const orderIdArray = orderIds.split(',');
        const itemCount = orderIdArray.length;
        const itemText = itemCount === 1 ? 'item' : 'items';
        
        showModal(
            'Reorder Items',
            `Add ${itemCount} ${itemText} to your cart again?<br><br>
            <i class="fas fa-shopping-cart text-primary mr-1"></i> These items will be added to your current cart.`,
            'confirm',
            () => {
                showLoadingModal('Adding items to cart...');
                
                // Simulate API call
                setTimeout(() => {
                    hideModal();
                    
                    setTimeout(() => {
                        showModal(
                            'Success!',
                            `<i class="fas fa-check-circle text-success mr-2"></i>${itemCount} ${itemText} added to your cart!<br><br>
                            <a href="cart.html" class="btn btn-primary btn-sm mt-2">
                                <i class="fas fa-shopping-cart mr-1"></i>View Cart
                            </a>`,
                            'success'
                        );
                    }, 100);
                }, 1500);
            }
        );
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
                    showModal(
                        'Session Expired',
                        'Your session has expired. Please log in again to continue.',
                        'warning',
                        () => {
                            localStorage.clear();
                            window.location.href = 'login.html';
                        }
                    );
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
                        <a href="products.html" class="btn btn-primary">
                            <i class="fas fa-shopping-cart mr-2"></i>Start Shopping
                        </a>
                    </div>
                `;
                return;
            }

            orders.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
            const groupedOrders = groupOrdersByOrderNumber(orders);
            const sortedOrderGroups = Object.values(groupedOrders)
                .sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
            
            sortedOrderGroups.forEach(orderGroup => {
                const orderCardHTML = createOrderCardHTML(orderGroup);
                ordersContainer.insertAdjacentHTML('beforeend', orderCardHTML);
            });

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
            setupEventHandlers();

        } catch (error) {
            console.error('Error fetching orders:', error);
            ordersContainer.innerHTML = `
                <div class="alert alert-danger text-center">
                    <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                    <h5>Could not load your orders</h5>
                    <p>Please check your connection and try again.</p>
                    <p><small>Error: ${error.message}</small></p>
                    <button class="btn btn-danger" onclick="location.reload()">
                        <i class="fas fa-redo mr-2"></i>Retry
                    </button>
                </div>
            `;
        }
    }

    fetchAndDisplayOrders();
});