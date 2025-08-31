// Application State - Backend compatibility maintained
const BACKEND_URL = 'https://backend-rj0a.onrender.com';
const user = JSON.parse(localStorage.getItem('user'));
let ordersData = [];
let filteredOrdersData = [];
let expandedOrders = new Set();
let currentFilter = 'all';

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
            <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert" aria-label="Close"></button>
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
    alert.querySelector('.btn-close').addEventListener('click', () => {
        clearTimeout(timeoutId);
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 300);
    });
}

// Status Filtering System
function addFilterUI() {
    const navbarRight = document.querySelector('.navbar-right .action-buttons');
    
    // Create filter dropdown
    const filterContainer = document.createElement('div');
    filterContainer.className = 'filter-container';
    filterContainer.innerHTML = `
        <div class="filter-dropdown">
            <label for="statusFilter" class="filter-label">
                <i class="fas fa-filter"></i> Filter:
            </label>
            <select id="statusFilter" class="form-select status-filter">
                <option value="all">All Orders</option>
                <option value="pending">Pending Only</option>
                <option value="shipped">Shipped Only</option>
                <option value="delivered">Delivered Only</option>
                <option value="cancelled">Cancelled Only</option>
            </select>
        </div>
    `;
    
    // Insert before existing buttons
    navbarRight.insertBefore(filterContainer, navbarRight.firstChild);
    
    // Add event listener
    document.getElementById('statusFilter').addEventListener('change', handleStatusFilter);
}

function handleStatusFilter(e) {
    currentFilter = e.target.value;
    applyStatusFilter();
    updateFilteredStatistics();
    
    // Add visual feedback
    const filterText = e.target.options[e.target.selectedIndex].text;
    if (currentFilter !== 'all') {
        showAlert(`Filter applied: ${filterText}`, 'info', 2000);
    }
}

function applyStatusFilter() {
    if (currentFilter === 'all') {
        filteredOrdersData = [...ordersData];
    } else {
        filteredOrdersData = ordersData.filter(order => {
            return order.products.some(product => {
                switch (currentFilter) {
                    case 'pending':
                        return product.status === 'Pending';
                    case 'shipped':
                        return product.status === 'Shipped';
                    case 'delivered':
                        return product.status === 'Delivered';
                    case 'cancelled':
                        return product.status === 'Cancelled';
                    default:
                        return true;
                }
            });
        });
        
        // Filter products within each order
        filteredOrdersData = filteredOrdersData.map(order => ({
            ...order,
            products: order.products.filter(product => {
                switch (currentFilter) {
                    case 'pending':
                        return product.status === 'Pending';
                    case 'shipped':
                        return product.status === 'Shipped';
                    case 'delivered':
                        return product.status === 'Delivered';
                    case 'cancelled':
                        return product.status === 'Cancelled';
                    default:
                        return true;
                }
            })
        })).filter(order => order.products.length > 0);
    }
    
    renderFilteredOrders();
    updateOrderCount();
}

function clearFilter() {
    currentFilter = 'all';
    document.getElementById('statusFilter').value = 'all';
    applyStatusFilter();
    updateFilteredStatistics();
    showAlert('Filter cleared', 'info', 2000);
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

// Fixed Progress Modal Functions (Bootstrap 5 compatible)
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
    
    // Bootstrap 5 way to show modal (NO JQUERY)
    const progressModal = new bootstrap.Modal(document.getElementById('progressModal'));
    progressModal.show();
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
            <small class="ms-2">
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
        ? '<i class="fas fa-check-circle me-2"></i>Process Complete!' 
        : '<i class="fas fa-times-circle me-2"></i>Process Failed';
    
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
                <i class="fas fa-redo me-2"></i>Try Again
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
    
    updateOrderCount();
}

function updateFilteredStatistics() {
    let totalRevenue = 0;
    let totalOrders = 0;
    let pendingOrders = 0;
    let deliveredOrders = 0;
    
    if (currentFilter === 'all') {
        // Show all statistics when no filter is applied
        ordersData.forEach(order => {
            order.products.forEach(product => {
                totalRevenue += product.totalPrice;
                totalOrders += product.quantity;
                if (product.status === 'Pending') pendingOrders += product.quantity;
                if (product.status === 'Delivered') deliveredOrders += product.quantity;
            });
        });
    } else {
        // When filtering, show stats for ALL products in the filtered orders,
        // not just the products that match the filter
        const filteredOrderIds = new Set(filteredOrdersData.map(order => order.orderId));
        
        ordersData.forEach(order => {
            // Only include orders that appear in the filtered results
            if (filteredOrderIds.has(order.orderId)) {
                order.products.forEach(product => {
                    totalRevenue += product.totalPrice;
                    totalOrders += product.quantity;
                    if (product.status === 'Pending') pendingOrders += product.quantity;
                    if (product.status === 'Delivered') deliveredOrders += product.quantity;
                });
            }
        });
    }
    
    // Animate number changes
    animateNumber(totalRevenueCell, totalRevenue, '₱', 2);
    animateNumber(totalOrdersCell, totalOrders);
    animateNumber(pendingOrdersCell, pendingOrders);
    animateNumber(deliveredOrdersCell, deliveredOrders);
    
    // Remove visual indicator classes (no more "Filtered View" labels)
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.classList.remove('filtered');
    });
}

function updateOrderCount() {
    const orderCountElement = document.getElementById('orderCount');
    const filterSelect = document.getElementById('statusFilter');
    
    if (currentFilter === 'all') {
        orderCountElement.textContent = `${ordersData.length} order groups`;
    } else {
        const filterText = filterSelect ? filterSelect.options[filterSelect.selectedIndex].text : '';
        orderCountElement.textContent = `${filteredOrdersData.length} order groups (${filterText})`;
    }
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

// Enhanced rendering with filtering support
function renderOrders() {
    // Initialize filtered data
    filteredOrdersData = [...ordersData];
    
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

    // Apply current filter if any
    applyStatusFilter();
}

function renderFilteredOrders() {
    if (filteredOrdersData.length === 0) {
        const filterText = currentFilter === 'all' ? 'orders' : `${currentFilter} orders`;
        ordersContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h5>No ${filterText.charAt(0).toUpperCase() + filterText.slice(1)} Found</h5>
                <p>There are no orders matching the selected filter criteria.</p>
                <button class="btn btn-outline-primary mt-3" onclick="clearFilter()">
                    <i class="fas fa-times me-2"></i>Clear Filter
                </button>
            </div>
        `;
        return;
    }

    const ordersHtml = filteredOrdersData.map(order => {
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
        <div class="order-card ${currentFilter !== 'all' ? 'filtered' : ''}">
            <div class="order-header ${isExpanded ? '' : 'collapsed'}" onclick="toggleOrder('${order.orderId}')">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="order-summary">
                        <div class="order-number">${order.orderId}</div>
                        <div class="order-meta">
                            <span><i class="fas fa-user me-1"></i><strong>${order.buyerName}</strong></span>
                            <span><i class="fas fa-calendar me-1"></i>${order.formattedDate}</span>
                            <span><i class="fas fa-money-bill-wave me-1"></i>₱${order.totalAmount.toFixed(2)}</span>
                            <span><i class="fas fa-box me-1"></i>${totalQuantity} items</span>
                        </div>
                    </div>
                    <div class="d-flex align-items-center">
                        <div class="me-3">
                            ${order.hasAllDelivered ? '<span class="badge bg-success">All Delivered</span>' : ''}
                            ${order.hasAllShipped && !order.hasAllDelivered ? '<span class="badge bg-info">All Shipped</span>' : ''}
                            ${order.hasPending ? '<span class="badge bg-warning">Has Pending</span>' : ''}
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
                    <div><i class="fas fa-clock me-1"></i><strong>Time:</strong> ${product.orders[0].formattedTime}</div>
                    <div><i class="fas fa-info-circle me-1"></i><strong>Status:</strong> <span class="badge bg-${getStatusBadgeColor(product.status)}">${product.status}</span></div>
                    ${product.quantity > 1 ? `<div><i class="fas fa-box me-1"></i><strong>Quantity:</strong> ${product.quantity} items</div>` : ''}
                    ${product.quantity > 1 ? `<div><i class="fas fa-calculator me-1"></i><strong>Per Item:</strong> ₱${(product.totalPrice / product.quantity).toFixed(2)}</div>` : ''}
                </div>
                <div class="status-update-form">
                    <select class="form-select status-select" data-product-orders="${product.orders.map(o => o.id).join(',')}">
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
                            <i class="fas fa-shipping-fast me-1"></i> Ship All Pending
                        </button>
                    ` : ''}
                    <button class="btn btn-info btn-sm bulk-deliver-btn" 
                            data-order-id="${order.orderId}">
                        <i class="fas fa-check-circle me-1"></i> Mark All Delivered
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Fixed Toggle functionality for Bootstrap 5
function toggleOrder(orderId) {
    const orderElement = document.getElementById(`order-${orderId}`);
    const headerElement = orderElement.previousElementSibling;
    
    if (expandedOrders.has(orderId)) {
        expandedOrders.delete(orderId);
        
        // Bootstrap 5 way to hide collapse
        const bsCollapse = bootstrap.Collapse.getOrCreateInstance(orderElement);
        bsCollapse.hide();
        
        headerElement.classList.add('collapsed');
    } else {
        expandedOrders.add(orderId);
        
        // Bootstrap 5 way to show collapse
        const bsCollapse = bootstrap.Collapse.getOrCreateInstance(orderElement);
        bsCollapse.show();
        
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
    const order = currentFilter === 'all' 
        ? ordersData.find(o => o.orderId === orderId)
        : filteredOrdersData.find(o => o.orderId === orderId);
        
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
            const progressModal = bootstrap.Modal.getInstance(document.getElementById('progressModal'));
            if (progressModal) {
                progressModal.hide();
            }
            fetchOrders(); // Refresh the display
        }, 2000);
    }, 500);
}

// Enhanced CSV export with filtering support
function exportFilteredToCsv() {
    const dataToExport = currentFilter === 'all' ? ordersData : filteredOrdersData;
    
    if (dataToExport.length === 0) {
        showAlert('No orders to export with current filter', 'warning');
        return;
    }

    const headers = ['Order ID', 'Product', 'Buyer', 'Quantity', 'Total Price', 'Price Per Item', 'Date', 'Time', 'Status'];
    const csvRows = [headers.join(',')];

    dataToExport.forEach(order => {
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

    // Add summary for filtered data
    const totalRevenue = dataToExport.reduce((sum, order) => 
        sum + order.products.reduce((pSum, product) => pSum + product.totalPrice, 0), 0
    );
    const totalItems = dataToExport.reduce((sum, order) => 
        sum + order.products.reduce((pSum, product) => pSum + product.quantity, 0), 0
    );
    
    csvRows.push(['', 'SUMMARY', '', '', '', '', '', '', ''].join(','));
    const filterSelect = document.getElementById('statusFilter');
    const filterText = filterSelect ? filterSelect.options[filterSelect.selectedIndex].text : 'All Orders';
    csvRows.push(['', `Filter: ${filterText}`, '', '', '', '', '', '', ''].join(','));
    csvRows.push(['', 'Total Revenue', '', '', totalRevenue.toFixed(2), '', '', '', ''].join(','));
    csvRows.push(['', 'Total Items', '', totalItems, '', '', '', '', ''].join(','));
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const filterSuffix = currentFilter === 'all' ? '' : `_${currentFilter}`;
    link.setAttribute('download', `seller_orders${filterSuffix}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    const filterDisplayText = currentFilter === 'all' ? 'All orders' : `${currentFilter} orders`;
    showAlert(`${filterDisplayText} exported successfully!`, 'success');
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

// Fixed expand/collapse functionality for Bootstrap 5
function setupExpandAllButton() {
    expandAllBtn.addEventListener('click', () => {
        const dataToUse = currentFilter === 'all' ? ordersData : filteredOrdersData;
        const shouldExpandAll = expandedOrders.size < dataToUse.length;
        
        if (shouldExpandAll) {
            dataToUse.forEach(order => expandedOrders.add(order.orderId));
            expandAllBtn.innerHTML = '<i class="fas fa-compress-alt"></i> <span class="btn-text">Collapse All</span>';
            
            // Bootstrap 5 compatible expansion
            dataToUse.forEach((order, index) => {
                setTimeout(() => {
                    const orderElement = document.getElementById(`order-${order.orderId}`);
                    const headerElement = orderElement ? orderElement.previousElementSibling : null;
                    
                    if (headerElement && headerElement.classList.contains('collapsed')) {
                        const bsCollapse = bootstrap.Collapse.getOrCreateInstance(orderElement);
                        bsCollapse.show();
                        headerElement.classList.remove('collapsed');
                    }
                }, index * 100);
            });
        } else {
            expandedOrders.clear();
            expandAllBtn.innerHTML = '<i class="fas fa-expand-alt"></i> <span class="btn-text">Expand All</span>';
            
            // Bootstrap 5 compatible collapse
            dataToUse.forEach((order, index) => {
                setTimeout(() => {
                    const orderElement = document.getElementById(`order-${order.orderId}`);
                    const headerElement = orderElement ? orderElement.previousElementSibling : null;
                    
                    if (headerElement && !headerElement.classList.contains('collapsed')) {
                        const bsCollapse = bootstrap.Collapse.getOrCreateInstance(orderElement);
                        bsCollapse.hide();
                        headerElement.classList.add('collapsed');
                    }
                }, index * 100);
            });
        }
    });
}

// Keyboard shortcuts with filter support
function addKeyboardShortcuts() {
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
                case 'f':
                    e.preventDefault();
                    const filterSelect = document.getElementById('statusFilter');
                    if (filterSelect) filterSelect.focus();
                    break;
            }
        }
        
        // Quick filter shortcuts (Alt + number)
        if (e.altKey && !e.ctrlKey && !e.metaKey) {
            switch (e.key) {
                case '1':
                    e.preventDefault();
                    setFilter('all');
                    break;
                case '2':
                    e.preventDefault();
                    setFilter('pending');
                    break;
                case '3':
                    e.preventDefault();
                    setFilter('shipped');
                    break;
                case '4':
                    e.preventDefault();
                    setFilter('delivered');
                    break;
                case '5':
                    e.preventDefault();
                    setFilter('cancelled');
                    break;
            }
        }
    });
}

function setFilter(filterValue) {
    const filterSelect = document.getElementById('statusFilter');
    if (filterSelect) {
        filterSelect.value = filterValue;
        currentFilter = filterValue;
        applyStatusFilter();
        updateFilteredStatistics();
        
        // Show feedback
        const filterText = filterSelect.options[filterSelect.selectedIndex].text;
        showAlert(`Filter applied: ${filterText}`, 'info', 2000);
    }
}

// Global functions
window.toggleOrder = toggleOrder;
window.clearFilter = clearFilter;

// Enhanced initialization
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    
    // Setup buttons
    setupExpandAllButton();
    
    // Replace export button functionality
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', exportFilteredToCsv);
    }
    
    // Add filter UI and keyboard shortcuts
    setTimeout(() => {
        addFilterUI();
        addKeyboardShortcuts();
    }, 100);
    
    // Load orders
    fetchOrders();
    
    // Auto-refresh every 5 minutes
    setInterval(() => {
        fetchOrders();
    }, 300000);
});