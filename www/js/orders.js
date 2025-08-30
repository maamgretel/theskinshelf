// Application State - Backend compatibility maintained
const BACKEND_URL = 'https://backend-rj0a.onrender.com';
const user = JSON.parse(localStorage.getItem('user'));
let ordersData = [];
let expandedOrders = new Set();

// Security check
if (!user || user.role !== 'seller') {
    localStorage.clear();
    alert('Access Denied. Please log in as a seller.');
    window.location.href = '../../pages/login.html';
}

// DOM Elements
const ordersContainer = document.getElementById('ordersContainer');
const totalRevenueCell = document.getElementById('totalRevenueCell');
const totalOrdersCell = document.getElementById('totalOrdersCell');
const pendingOrdersCell = document.getElementById('pendingOrdersCell');
const deliveredOrdersCell = document.getElementById('deliveredOrdersCell');
const orderCount = document.getElementById('orderCount');
const expandAllBtn = document.getElementById('expandAllBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const alertContainer = document.getElementById('alert-container');
const sidebarToggle = document.getElementById('sidebarToggle');

// Enhanced UI Functions
function initializeUI() {
    // Sidebar toggle functionality
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }

    // Add sidebar overlay for mobile
    if (window.innerWidth <= 1200) {
        createSidebarOverlay();
    }

    // Handle window resize
    window.addEventListener('resize', handleWindowResize);
    
    // Add smooth scrolling for anchor links
    document.addEventListener('click', handleSmoothScroll);
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    if (sidebar) {
        sidebar.classList.toggle('show');
        if (overlay) overlay.classList.toggle('show');
    }
}

function createSidebarOverlay() {
    if (!document.querySelector('.sidebar-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.addEventListener('click', () => {
            toggleSidebar();
        });
        document.body.appendChild(overlay);
    }
}

function handleWindowResize() {
    if (window.innerWidth > 1200) {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        if (sidebar) sidebar.classList.remove('show');
        if (overlay) overlay.classList.remove('show');
    } else {
        createSidebarOverlay();
    }
}

function handleSmoothScroll(e) {
    if (e.target.hash) {
        e.preventDefault();
        const target = document.querySelector(e.target.hash);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

// Enhanced Alert System
function showAlert(message, type = 'info', duration = 4000) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    
    // Enhanced alert icons
    const icons = {
        success: '<i class="fas fa-check-circle me-2"></i>',
        warning: '<i class="fas fa-exclamation-triangle me-2"></i>',
        danger: '<i class="fas fa-times-circle me-2"></i>',
        info: '<i class="fas fa-info-circle me-2"></i>'
    };
    
    alert.innerHTML = `
        <div class="d-flex align-items-center">
            ${icons[type] || icons.info}
            <span>${message}</span>
            <button type="button" class="close ml-auto" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
    `;
    
    alertContainer.appendChild(alert);
    
    // Auto dismiss
    const timeoutId = setTimeout(() => {
        if (alert.parentNode) {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 300);
        }
    }, duration);
    
    // Manual dismiss
    alert.querySelector('.close').addEventListener('click', () => {
        clearTimeout(timeoutId);
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 300);
    });
}

// Original utility functions maintained for backend compatibility
function getStatusBadgeColor(status) {
    const colors = {
        'Pending': 'warning',
        'Shipped': 'info', 
        'Delivered': 'success',
        'Cancelled': 'danger'
    };
    return colors[status] || 'secondary';
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getProductImage(productName, productId) {
    return `${BACKEND_URL}/uploads/products/${productId}.jpg`;
}

function createImageElement(src, alt, productId) {
    const img = document.createElement('img');
    img.className = 'product-image';
    img.alt = alt;
    
    const placeholder = document.createElement('div');
    placeholder.className = 'product-image placeholder';
    placeholder.innerHTML = '<i class="fas fa-image"></i>';
    
    img.onload = function() {
        placeholder.replaceWith(img);
    };
    
    img.onerror = function() {
        // Keep placeholder if image fails to load
    };
    
    img.src = src;
    return placeholder;
}

// Enhanced Progress Modal Functions
function showProgressModal(title, subtitle) {
    document.getElementById('progressTitle').textContent = title;
    document.getElementById('progressSubtitle').textContent = subtitle;
    
    // Reset modal state
    const progressBar = document.getElementById('progressBar');
    const modalFooter = document.getElementById('modalFooter');
    const statusMessages = document.getElementById('statusMessages');
    
    progressBar.style.width = '0%';
    progressBar.classList.add('progress-bar-animated');
    progressBar.classList.remove('bg-success', 'bg-danger');
    modalFooter.style.display = 'none';
    statusMessages.innerHTML = '';
    document.getElementById('successCount').textContent = '0';
    
    $('#progressModal').modal('show');
}

function updateProgress(current, total, message = '') {
    const percentage = Math.round((current / total) * 100);
    
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const currentProgress = document.getElementById('currentProgress');
    
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${percentage}%`;
    currentProgress.textContent = `${current}/${total}`;
    
    if (message) addStatusMessage(message, 'info');
}

function addStatusMessage(message, type = 'info') {
    const statusMessages = document.getElementById('statusMessages');
    const timestamp = new Date().toLocaleTimeString();
    
    const icons = { 
        'info': '<i class="fas fa-info-circle text-info"></i>', 
        'success': '<i class="fas fa-check-circle text-success"></i>', 
        'warning': '<i class="fas fa-exclamation-triangle text-warning"></i>', 
        'danger': '<i class="fas fa-times-circle text-danger"></i>' 
    };
    
    const messageElement = document.createElement('div');
    messageElement.className = `alert alert-${type} alert-sm py-2 px-3 mb-2`;
    messageElement.innerHTML = `
        <div class="d-flex align-items-center">
            ${icons[type]}
            <small class="ml-2">
                <span class="text-muted">${timestamp}</span> - ${message}
            </small>
        </div>
    `;
    
    statusMessages.appendChild(messageElement);
    statusMessages.scrollTop = statusMessages.scrollHeight;
}

function completeProgress(success, message) {
    const progressBar = document.getElementById('progressBar');
    const progressTitle = document.getElementById('progressTitle');
    const modalFooter = document.getElementById('modalFooter');
    const modalIcon = document.querySelector('.modal-icon i');
    
    progressBar.classList.remove('progress-bar-animated');
    progressBar.classList.add(success ? 'bg-success' : 'bg-danger');
    
    progressTitle.innerHTML = success 
        ? '<i class="fas fa-check-circle mr-2"></i>Process Complete!' 
        : '<i class="fas fa-times-circle mr-2"></i>Process Failed';
    
    if (modalIcon) {
        modalIcon.className = success 
            ? 'fas fa-check-circle' 
            : 'fas fa-times-circle';
        modalIcon.classList.remove('fa-spin');
    }
    
    modalFooter.style.display = 'block';
    addStatusMessage(message, success ? 'success' : 'danger');
}

// Data fetching maintained for backend compatibility
async function fetchOrders() {
    try {
        showLoadingState();
        
        const response = await fetch(`${BACKEND_URL}/api/seller/orders`, {
            headers: { 'X-User-ID': user.id }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch orders');
        }
        
        const orders = await response.json();
        ordersData = processOrdersData(orders);
        
        hideLoadingState();
        renderOrders();
        updateStatistics();
        
    } catch (error) {
        console.error('Error fetching orders:', error);
        hideLoadingState();
        showErrorState(error.message);
    }
}

function showLoadingState() {
    ordersContainer.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner">
                <div class="spinner"></div>
            </div>
            <p>Loading your orders...</p>
        </div>
    `;
}

function hideLoadingState() {
    const loadingState = ordersContainer.querySelector('.loading-state');
    if (loadingState) {
        loadingState.remove();
    }
}

function showErrorState(errorMessage) {
    ordersContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h5>Error Loading Orders</h5>
            <p>Failed to load orders: ${errorMessage}</p>
            <button class="btn btn-primary mt-3" onclick="fetchOrders()">
                <i class="fas fa-redo mr-2"></i>Try Again
            </button>
        </div>
    `;
}

// Data processing maintained for backend compatibility
function processOrdersData(orders) {
    const grouped = {};
    
    orders.forEach(order => {
        const key = `${order.buyer_id}-${formatDate(order.order_date)}`;
        
        if (!grouped[key]) {
            grouped[key] = {
                orderId: `ORD-${Date.now()}-${Object.keys(grouped).length + 1}`,
                buyerId: order.buyer_id,
                buyerName: order.buyer_name,
                orderDate: order.order_date,
                formattedDate: formatDate(order.order_date),
                products: new Map(),
                totalAmount: 0,
                hasAllShipped: true,
                hasAllDelivered: true,
                hasPending: false
            };
        }
        
        const productKey = `${order.product_name}-${order.status}`;
        
        if (grouped[key].products.has(productKey)) {
            const existingProduct = grouped[key].products.get(productKey);
            existingProduct.quantity += 1;
            existingProduct.totalPrice += parseFloat(order.total_price);
            existingProduct.orders.push({
                id: order.id,
                individualPrice: parseFloat(order.total_price),
                formattedTime: formatTime(order.order_date)
            });
        } else {
            grouped[key].products.set(productKey, {
                productId: order.product_id,
                productName: order.product_name,
                totalPrice: parseFloat(order.total_price),
                status: order.status,
                quantity: 1,
                orders: [{
                    id: order.id,
                    individualPrice: parseFloat(order.total_price),
                    formattedTime: formatTime(order.order_date)
                }],
                image: order.product_image || null
            });
        }
        
        grouped[key].totalAmount += parseFloat(order.total_price);
        
        if (order.status !== 'Shipped') grouped[key].hasAllShipped = false;
        if (order.status !== 'Delivered') grouped[key].hasAllDelivered = false;
        if (order.status === 'Pending') grouped[key].hasPending = true;
    });
    
    Object.values(grouped).forEach(order => {
        order.products = Array.from(order.products.values());
    });
    
    return Object.values(grouped);
}

function updateStatistics() {
    let totalRevenue = 0;
    let totalOrders = 0;
    let pendingOrders = 0;
    let deliveredOrders = 0;
    
    ordersData.forEach(order => {
        order.products.forEach(product => {
            totalRevenue += product.totalPrice;
            totalOrders += product.quantity;
            if (product.status === 'Pending') pendingOrders += product.quantity;
            if (product.status === 'Delivered') deliveredOrders += product.quantity;
        });
    });
    
    // Animate number changes
    animateNumber(totalRevenueCell, totalRevenue, '₱', 2);
    animateNumber(totalOrdersCell, totalOrders);
    animateNumber(pendingOrdersCell, pendingOrders);
    animateNumber(deliveredOrdersCell, deliveredOrders);
    
    orderCount.textContent = `${ordersData.length} order groups`;
}

function animateNumber(element, targetValue, prefix = '', decimals = 0) {
    const startValue = parseFloat(element.textContent.replace(/[^0-9.-]+/g, '')) || 0;
    const increment = (targetValue - startValue) / 30;
    let currentValue = startValue;
    
    const timer = setInterval(() => {
        currentValue += increment;
        if ((increment > 0 && currentValue >= targetValue) || 
            (increment < 0 && currentValue <= targetValue)) {
            currentValue = targetValue;
            clearInterval(timer);
        }
        
        const formattedValue = decimals > 0 
            ? currentValue.toFixed(decimals)
            : Math.round(currentValue);
        
        element.textContent = prefix + formattedValue;
    }, 16);
}

// Enhanced rendering with maintained functionality
function renderOrders() {
    if (ordersData.length === 0) {
        ordersContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-cart"></i>
                <h5>No Orders Found</h5>
                <p>Orders will appear here when customers make purchases. Start promoting your products to get your first orders!</p>
            </div>
        `;
        return;
    }

    const ordersHtml = ordersData.map(order => {
        const isExpanded = expandedOrders.has(order.orderId);
        const totalQuantity = order.products.reduce((sum, product) => sum + product.quantity, 0);
        
        return createOrderCardHTML(order, isExpanded, totalQuantity);
    }).join('');

    ordersContainer.innerHTML = ordersHtml;
    
    // Add staggered animation
    const orderCards = ordersContainer.querySelectorAll('.order-card');
    orderCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.4s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

function createOrderCardHTML(order, isExpanded, totalQuantity) {
    return `
        <div class="order-card">
            <div class="order-header ${isExpanded ? '' : 'collapsed'}" onclick="toggleOrder('${order.orderId}')">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="order-summary">
                        <div class="order-number">${order.orderId}</div>
                        <div class="order-meta">
                            <span><i class="fas fa-user mr-1"></i><strong>${order.buyerName}</strong></span>
                            <span><i class="fas fa-calendar mr-1"></i>${order.formattedDate}</span>
                            <span><i class="fas fa-money-bill-wave mr-1"></i>₱${order.totalAmount.toFixed(2)}</span>
                            <span><i class="fas fa-box mr-1"></i>${totalQuantity} items</span>
                        </div>
                    </div>
                    <div class="d-flex align-items-center">
                        <div class="mr-3">
                            ${order.hasAllDelivered ? '<span class="badge badge-success">All Delivered</span>' : ''}
                            ${order.hasAllShipped && !order.hasAllDelivered ? '<span class="badge badge-info">All Shipped</span>' : ''}
                            ${order.hasPending ? '<span class="badge badge-warning">Has Pending</span>' : ''}
                        </div>
                        <i class="fas fa-chevron-down collapse-icon"></i>
                    </div>
                </div>
            </div>
            
            <div class="collapse ${isExpanded ? 'show' : ''}" id="order-${order.orderId}">
                <div class="order-content">
                    ${createProductsHTML(order.products)}
                    ${createBulkActionsHTML(order)}
                </div>
            </div>
        </div>
    `;
}

function createProductsHTML(products) {
    return products.map(product => `
        <div class="product-item">
            ${createImageElement(
                getProductImage(product.productName, product.productId), 
                product.productName,
                product.productId
            ).outerHTML}
            
            <div class="product-content">
                <div class="product-header">
                    <div class="product-name">
                        ${product.productName}
                        ${product.quantity > 1 ? `<span class="quantity-badge">×${product.quantity}</span>` : ''}
                    </div>
                    <div class="product-price">₱${product.totalPrice.toFixed(2)}</div>
                </div>
                <div class="product-details">
                    <div><i class="fas fa-clock mr-1"></i><strong>Time:</strong> ${product.orders[0].formattedTime}</div>
                    <div><i class="fas fa-info-circle mr-1"></i><strong>Status:</strong> <span class="badge badge-${getStatusBadgeColor(product.status)}">${product.status}</span></div>
                    ${product.quantity > 1 ? `<div><i class="fas fa-box mr-1"></i><strong>Quantity:</strong> ${product.quantity} items</div>` : ''}
                    ${product.quantity > 1 ? `<div><i class="fas fa-calculator mr-1"></i><strong>Per Item:</strong> ₱${(product.totalPrice / product.quantity).toFixed(2)}</div>` : ''}
                </div>
                <div class="status-update-form">
                    <select class="form-control status-select" data-product-orders="${product.orders.map(o => o.id).join(',')}">
                        <option value="Pending" ${product.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Shipped" ${product.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="Delivered" ${product.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="Cancelled" ${product.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                    <button class="btn btn-primary btn-sm update-btn" data-product-orders="${product.orders.map(o => o.id).join(',')}">
                        Update ${product.quantity > 1 ? `All (${product.quantity})` : ''}
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function createBulkActionsHTML(order) {
    return `
        <div class="bulk-actions">
            <div class="d-flex flex-wrap gap-2">
                <h6 class="w-100 mb-2">
                    <i class="fas fa-layer-group"></i> Bulk Actions
                </h6>
                <div class="d-flex flex-wrap gap-2 w-100">
                    ${order.hasPending ? `
                        <button class="btn btn-success btn-sm bulk-ship-btn" 
                                data-order-id="${order.orderId}">
                            <i class="fas fa-shipping-fast mr-1"></i> Ship All Pending
                        </button>
                    ` : ''}
                    <button class="btn btn-info btn-sm bulk-deliver-btn" 
                            data-order-id="${order.orderId}">
                        <i class="fas fa-check-circle mr-1"></i> Mark All Delivered
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Toggle functionality maintained for backend compatibility
function toggleOrder(orderId) {
    const orderElement = document.getElementById(`order-${orderId}`);
    const headerElement = orderElement.previousElementSibling;
    
    if (expandedOrders.has(orderId)) {
        expandedOrders.delete(orderId);
        $(orderElement).collapse('hide');
        headerElement.classList.add('collapsed');
    } else {
        expandedOrders.add(orderId);
        $(orderElement).collapse('show');
        headerElement.classList.remove('collapsed');
    }
}

// Order management functions - maintained for backend compatibility
async function updateProductStatus(orderIds, newStatus) {
    const orders = orderIds.split(',').map(id => parseInt(id));
    
    try {
        showAlert(`Updating status for ${orders.length} item(s)...`, 'info');
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const orderId of orders) {
            try {
                const response = await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-ID': user.id
                    },
                    body: JSON.stringify({ status: newStatus })
                });

                if (response.ok) {
                    successCount++;
                } else {
                    errorCount++;
                    console.error(`Failed to update order ${orderId}`);
                }
            } catch (error) {
                errorCount++;
                console.error(`Error updating order ${orderId}:`, error);
            }
        }
        
        if (successCount > 0) {
            showAlert(`Successfully updated ${successCount} item(s) to ${newStatus}!`, 'success');
        }
        
        if (errorCount > 0) {
            showAlert(`Failed to update ${errorCount} item(s)`, 'warning');
        }
        
        fetchOrders(); // Refresh the display
        
    } catch (error) {
        console.error('Error updating status:', error);
        showAlert('Failed to update status', 'danger');
    }
}

async function bulkUpdateOrder(orderId, action) {
    const order = ordersData.find(o => o.orderId === orderId);
    if (!order) return;

    let allOrderIds = [];
    
    if (action === 'ship') {
        order.products.forEach(product => {
            if (product.status === 'Pending') {
                allOrderIds = allOrderIds.concat(product.orders.map(o => o.id));
            }
        });
    } else {
        order.products.forEach(product => {
            allOrderIds = allOrderIds.concat(product.orders.map(o => o.id));
        });
    }

    if (allOrderIds.length === 0) {
        showAlert('No applicable products found for this action', 'warning');
        return;
    }

    const targetStatus = action === 'ship' ? 'Shipped' : 'Delivered';
    const actionName = action === 'ship' ? 'Shipping' : 'Delivering';
    
    showProgressModal(
        `${actionName} ${allOrderIds.length} Items`,
        `Processing order ${orderId}`
    );

    let successCount = 0;
    
    for (let i = 0; i < allOrderIds.length; i++) {
        const orderItemId = allOrderIds[i];
        
        try {
            const response = await fetch(`${BACKEND_URL}/api/orders/${orderItemId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': user.id
                },
                body: JSON.stringify({ status: targetStatus })
            });

            if (response.ok) {
                successCount++;
                updateProgress(i + 1, allOrderIds.length, `Item ${i + 1} updated to ${targetStatus}`);
                document.getElementById('successCount').textContent = successCount;
            } else {
                const error = await response.json();
                addStatusMessage(`Failed to update item ${i + 1}: ${error.error}`, 'warning');
            }
        } catch (error) {
            addStatusMessage(`Error updating item ${i + 1}: ${error.message}`, 'danger');
        }
        
        if (i < allOrderIds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
    
    setTimeout(() => {
        const wasSuccessful = successCount === allOrderIds.length;
        completeProgress(
            wasSuccessful, 
            wasSuccessful 
                ? `Successfully ${action === 'ship' ? 'shipped' : 'delivered'} ${successCount} items!`
                : `Completed with ${successCount}/${allOrderIds.length} successful updates`
        );
        
        setTimeout(() => {
            $('#progressModal').modal('hide');
            fetchOrders(); // Refresh the display
        }, 2000);
    }, 500);
}

// Enhanced CSV export with maintained functionality
function exportToCsv() {
    if (ordersData.length === 0) {
        showAlert('No orders to export', 'warning');
        return;
    }

    const headers = ['Order ID', 'Product', 'Buyer', 'Quantity', 'Total Price', 'Price Per Item', 'Date', 'Time', 'Status'];
    const csvRows = [headers.join(',')];

    ordersData.forEach(order => {
        order.products.forEach(product => {
            const row = [
                order.orderId,
                `"${product.productName.replace(/"/g, '""')}"`,
                `"${order.buyerName.replace(/"/g, '""')}"`,
                product.quantity,
                product.totalPrice.toFixed(2),
                (product.totalPrice / product.quantity).toFixed(2),
                order.formattedDate,
                product.orders[0].formattedTime,
                product.status
            ];
            csvRows.push(row.join(','));
        });
    });

    // Add summary
    const totalRevenue = ordersData.reduce((sum, order) => 
        sum + order.products.reduce((pSum, product) => pSum + product.totalPrice, 0), 0
    );
    const totalItems = ordersData.reduce((sum, order) => 
        sum + order.products.reduce((pSum, product) => pSum + product.quantity, 0), 0
    );
    
    csvRows.push(['', 'SUMMARY', '', '', '', '', '', '', ''].join(','));
    csvRows.push(['', 'Total Revenue', '', '', totalRevenue.toFixed(2), '', '', '', ''].join(','));
    csvRows.push(['', 'Total Items', '', totalItems, '', '', '', '', ''].join(','));
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `seller_orders_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showAlert('Orders exported successfully! Check your downloads folder.', 'success');
}

// Enhanced Event Listeners
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('update-btn')) {
        const orderIds = e.target.dataset.productOrders;
        const selectElement = document.querySelector(`.status-select[data-product-orders="${orderIds}"]`);
        const newStatus = selectElement.value;
        updateProductStatus(orderIds, newStatus);
    }
    
    if (e.target.classList.contains('bulk-ship-btn')) {
        const orderId = e.target.dataset.orderId;
        bulkUpdateOrder(orderId, 'ship');
    }
    
    if (e.target.classList.contains('bulk-deliver-btn')) {
        const orderId = e.target.dataset.orderId;
        bulkUpdateOrder(orderId, 'deliver');
    }
});

// Enhanced expand/collapse functionality
expandAllBtn.addEventListener('click', () => {
    const shouldExpandAll = expandedOrders.size < ordersData.length;
    
    if (shouldExpandAll) {
        ordersData.forEach(order => expandedOrders.add(order.orderId));
        expandAllBtn.innerHTML = '<i class="fas fa-compress-alt"></i> <span class="btn-text">Collapse All</span>';
        
        // Animate expansion
        const collapsedElements = document.querySelectorAll('.order-header.collapsed');
        collapsedElements.forEach((header, index) => {
            setTimeout(() => {
                header.click();
            }, index * 100);
        });
    } else {
        expandedOrders.clear();
        expandAllBtn.innerHTML = '<i class="fas fa-expand-alt"></i> <span class="btn-text">Expand All</span>';
        
        // Animate collapse
        const expandedElements = document.querySelectorAll('.order-header:not(.collapsed)');
        expandedElements.forEach((header, index) => {
            setTimeout(() => {
                header.click();
            }, index * 100);
        });
    }
});

exportCsvBtn.addEventListener('click', exportToCsv);

// Global function for toggling orders (called from onclick)
window.toggleOrder = toggleOrder;

// Enhanced initialization
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    fetchOrders();
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'e':
                    e.preventDefault();
                    exportCsvBtn.click();
                    break;
                case 'r':
                    e.preventDefault();
                    fetchOrders();
                    showAlert('Orders refreshed!', 'info', 2000);
                    break;
            }
        }
    });
    
    // Auto-refresh every 5 minutes
    setInterval(() => {
        fetchOrders();
    }, 300000);
});