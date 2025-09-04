// Application State
const BACKEND_URL = 'https://backend-rj0a.onrender.com';
const user = JSON.parse(localStorage.getItem('user'));
let ordersData = [], filteredOrdersData = [], expandedOrders = new Set(), currentFilter = 'all';

// Security check
if (!user || user.role !== 'seller') {
    localStorage.clear();
    alert('Access Denied. Please log in as a seller.');
    window.location.href = '../../pages/login.html';
}

// Profile Management
const DEFAULT_AVATAR = 'https://res.cloudinary.com/dwgvlwkyt/image/upload/v1751856106/default-avatar.jpg';
const DEFAULT_PRODUCT_IMAGE = 'https://res.cloudinary.com/dwgvlwkyt/image/upload/v1751856106/default-product.jpg';

function getValidProfilePicUrl(url) {
    if (!url?.trim()) return DEFAULT_AVATAR;
    try { new URL(url); return url; } catch { return DEFAULT_AVATAR; }
}

function getProductImage(productData) {
    // Handle null/undefined productData
    if (!productData) return DEFAULT_PRODUCT_IMAGE;
    
    let imageUrl = productData.image || productData.imageUrl || productData.product_image;
    
    // If no image URL at all, return default
    if (!imageUrl?.trim()) {
        return DEFAULT_PRODUCT_IMAGE;
    }
    
    // If it's already a full URL (starts with http), use it directly
    if (imageUrl.startsWith('http')) {
        return imageUrl;
    }
    
    // If it's a Cloudinary public ID or path, construct the full URL
    imageUrl = imageUrl.replace(/^\/+/, '').replace(/^v\d+\//, '');
    
    return `https://res.cloudinary.com/dwgvlwkyt/image/upload/v1751856106/${imageUrl}`;
}

async function loadSellerProfile() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/profile`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}`, 'X-User-ID': user.id }
        });
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.clear();
                window.location.href = 'login.html';
                return;
            }
            throw new Error(`Status: ${response.status}`);
        }
        const profile = await response.json();
        const avatar = document.getElementById('seller-avatar');
        const name = document.getElementById('seller-name');
        const email = document.getElementById('seller-email');
        if (avatar) {
            avatar.src = getValidProfilePicUrl(profile.profile_pic);
            avatar.onerror = () => avatar.src = DEFAULT_AVATAR;
        }
        if (name) name.textContent = profile.name || 'Unknown User';
        if (email) email.textContent = profile.email || 'No email';
    } catch (error) {
        console.error('Profile error:', error);
        const name = document.getElementById('seller-name');
        const email = document.getElementById('seller-email');
        if (name && user.name) name.textContent = user.name;
        if (email && user.email) email.textContent = user.email;
    }
}

// DOM Elements
const ordersContainer = document.getElementById('ordersContainer');
const [totalRevenueCell, totalOrdersCell, pendingOrdersCell, deliveredOrdersCell] = 
    ['totalRevenueCell', 'totalOrdersCell', 'pendingOrdersCell', 'deliveredOrdersCell'].map(id => document.getElementById(id));
const orderCount = document.getElementById('orderCount');
const [expandAllBtn, exportCsvBtn, alertContainer, sidebarToggle] = 
    ['expandAllBtn', 'exportCsvBtn', 'alert-container', 'sidebarToggle'].map(id => document.getElementById(id));

// UI Functions
function initializeUI() {
    sidebarToggle?.addEventListener('click', toggleSidebar);
    if (window.innerWidth <= 1200) createSidebarOverlay();
    window.addEventListener('resize', handleWindowResize);
    document.addEventListener('click', handleSmoothScroll);
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    sidebar?.classList.toggle('show');
    overlay?.classList.toggle('show');
}

function createSidebarOverlay() {
    if (!document.querySelector('.sidebar-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.onclick = toggleSidebar;
        document.body.appendChild(overlay);
    }
}

function handleWindowResize() {
    if (window.innerWidth > 1200) {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        sidebar?.classList.remove('show');
        overlay?.classList.remove('show');
    } else createSidebarOverlay();
}

function handleSmoothScroll(e) {
    if (e.target.hash) {
        e.preventDefault();
        document.querySelector(e.target.hash)?.scrollIntoView({ behavior: 'smooth' });
    }
}

// Alert System
function showAlert(msg, type = 'info', duration = 4000) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    const icons = { success: 'check-circle', warning: 'exclamation-triangle', danger: 'times-circle', info: 'info-circle' };
    alert.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-${icons[type]} me-2"></i>
            <span>${msg}</span>
            <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert"></button>
        </div>`;
    alertContainer.appendChild(alert);
    const timeoutId = setTimeout(() => {
        if (alert.parentNode) {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 300);
        }
    }, duration);
    alert.querySelector('.btn-close').onclick = () => {
        clearTimeout(timeoutId);
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 300);
    };
}

// Filter System
function addFilterUI() {
    const navbarRight = document.querySelector('.navbar-right .action-buttons');
    const filterContainer = document.createElement('div');
    filterContainer.className = 'filter-container';
    filterContainer.innerHTML = `
        <div class="filter-dropdown">
            <label for="statusFilter" class="filter-label"><i class="fas fa-filter"></i> Filter:</label>
            <select id="statusFilter" class="form-select status-filter">
                <option value="all">All Orders</option>
                <option value="pending">Pending Only</option>
                <option value="shipped">Shipped Only</option>
                <option value="delivered">Delivered Only</option>
                <option value="cancelled">Cancelled Only</option>
            </select>
        </div>`;
    navbarRight.insertBefore(filterContainer, navbarRight.firstChild);
    document.getElementById('statusFilter').onchange = handleStatusFilter;
}

function handleStatusFilter(e) {
    currentFilter = e.target.value;
    applyStatusFilter();
    updateFilteredStatistics();
    if (currentFilter !== 'all') {
        showAlert(`Filter applied: ${e.target.options[e.target.selectedIndex].text}`, 'info', 2000);
    }
}

function applyStatusFilter() {
    if (currentFilter === 'all') {
        filteredOrdersData = [...ordersData];
    } else {
        filteredOrdersData = ordersData.filter(order => 
            order.products.some(product => product.status === currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1))
        ).map(order => ({
            ...order,
            products: order.products.filter(product => 
                product.status === currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1)
            )
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

// Utility Functions
const getStatusBadgeColor = status => ({ Pending: 'warning', Shipped: 'info', Delivered: 'success', Cancelled: 'danger' })[status] || 'secondary';
const formatDate = d => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
const formatTime = d => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

// Progress Modal Functions
function showProgressModal(title, subtitle) {
    document.getElementById('progressTitle').textContent = title;
    document.getElementById('progressSubtitle').textContent = subtitle;
    const progressBar = document.getElementById('progressBar');
    const modalFooter = document.getElementById('modalFooter');
    const statusMessages = document.getElementById('statusMessages');
    progressBar.style.width = '0%';
    progressBar.classList.add('progress-bar-animated');
    progressBar.classList.remove('bg-success', 'bg-danger');
    modalFooter.style.display = 'none';
    statusMessages.innerHTML = '';
    document.getElementById('successCount').textContent = '0';
    new bootstrap.Modal(document.getElementById('progressModal')).show();
}

function updateProgress(current, total, msg = '') {
    const percentage = Math.round((current / total) * 100);
    document.getElementById('progressBar').style.width = `${percentage}%`;
    document.getElementById('progressText').textContent = `${percentage}%`;
    document.getElementById('currentProgress').textContent = `${current}/${total}`;
    if (msg) addStatusMessage(msg, 'info');
}

function addStatusMessage(msg, type = 'info') {
    const statusMessages = document.getElementById('statusMessages');
    const icons = { info: 'info-circle text-info', success: 'check-circle text-success', 
                   warning: 'exclamation-triangle text-warning', danger: 'times-circle text-danger' };
    const msgEl = document.createElement('div');
    msgEl.className = `alert alert-${type} alert-sm py-2 px-3 mb-2`;
    msgEl.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-${icons[type]}"></i>
            <small class="ms-2"><span class="text-muted">${new Date().toLocaleTimeString()}</span> - ${msg}</small>
        </div>`;
    statusMessages.appendChild(msgEl);
    statusMessages.scrollTop = statusMessages.scrollHeight;
}

function completeProgress(success, msg) {
    const progressBar = document.getElementById('progressBar');
    const progressTitle = document.getElementById('progressTitle');
    const modalFooter = document.getElementById('modalFooter');
    progressBar.classList.remove('progress-bar-animated');
    progressBar.classList.add(success ? 'bg-success' : 'bg-danger');
    progressTitle.innerHTML = success ? '<i class="fas fa-check-circle me-2"></i>Process Complete!' : '<i class="fas fa-times-circle me-2"></i>Process Failed';
    modalFooter.style.display = 'block';
    addStatusMessage(msg, success ? 'success' : 'danger');
}

// Data Fetching
async function fetchOrders() {
    try {
        showLoadingState();
        const response = await fetch(`${BACKEND_URL}/api/seller/orders`, { headers: { 'X-User-ID': user.id } });
        if (!response.ok) throw new Error('Failed to fetch orders');
        const orders = await response.json();
        console.log('Raw orders from backend:', orders);
        ordersData = processOrdersData(orders);
        hideLoadingState();
        renderOrders();
        updateStatistics();
    } catch (error) {
        console.error('Error:', error);
        hideLoadingState();
        showErrorState(error.message);
    }
}

function showLoadingState() {
    ordersContainer.innerHTML = '<div class="loading-state"><div class="loading-spinner"><div class="spinner"></div></div><p>Loading orders...</p></div>';
}

function hideLoadingState() {
    ordersContainer.querySelector('.loading-state')?.remove();
}

function showErrorState(msg) {
    ordersContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-triangle"></i>
            <h5>Error Loading Orders</h5>
            <p>Failed to load: ${msg}</p>
            <button class="btn btn-primary mt-3" onclick="fetchOrders()"><i class="fas fa-redo me-2"></i>Try Again</button>
        </div>`;
}

// Data Processing
function processOrdersData(orders) {
    console.log('Processing orders data:', orders);
    
    const grouped = {};
    orders.forEach(order => {
        console.log('Processing order:', order.id, 'Image:', order.product_image);
        
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
            const existing = grouped[key].products.get(productKey);
            existing.quantity += 1;
            existing.totalPrice += parseFloat(order.total_price);
            existing.orders.push({ 
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
                // Fix: Make sure to capture the image URL properly
                imageUrl: order.product_image || order.image || null
            });
        }
        
        grouped[key].totalAmount += parseFloat(order.total_price);
        if (order.status !== 'Shipped') grouped[key].hasAllShipped = false;
        if (order.status !== 'Delivered') grouped[key].hasAllDelivered = false;
        if (order.status === 'Pending') grouped[key].hasPending = true;
    });
    
    // Convert Map to Array and log the results
    Object.values(grouped).forEach(order => { 
        order.products = Array.from(order.products.values());
        console.log('Processed order products:', order.products);
    });
    
    return Object.values(grouped);
}

// Statistics
function updateStatistics() {
    let totalRevenue = 0, totalOrders = 0, pendingOrders = 0, deliveredOrders = 0;
    ordersData.forEach(order => {
        order.products.forEach(product => {
            totalRevenue += product.totalPrice;
            totalOrders += product.quantity;
            if (product.status === 'Pending') pendingOrders += product.quantity;
            if (product.status === 'Delivered') deliveredOrders += product.quantity;
        });
    });
    animateNumber(totalRevenueCell, totalRevenue, '₱', 2);
    animateNumber(totalOrdersCell, totalOrders);
    animateNumber(pendingOrdersCell, pendingOrders);
    animateNumber(deliveredOrdersCell, deliveredOrders);
    updateOrderCount();
}

function updateFilteredStatistics() {
    let totalRevenue = 0, totalOrders = 0, pendingOrders = 0, deliveredOrders = 0;
    if (currentFilter === 'all') {
        ordersData.forEach(order => {
            order.products.forEach(product => {
                totalRevenue += product.totalPrice; totalOrders += product.quantity;
                if (product.status === 'Pending') pendingOrders += product.quantity;
                if (product.status === 'Delivered') deliveredOrders += product.quantity;
            });
        });
    } else {
        const filteredOrderIds = new Set(filteredOrdersData.map(order => order.orderId));
        ordersData.forEach(order => {
            if (filteredOrderIds.has(order.orderId)) {
                order.products.forEach(product => {
                    totalRevenue += product.totalPrice; totalOrders += product.quantity;
                    if (product.status === 'Pending') pendingOrders += product.quantity;
                    if (product.status === 'Delivered') deliveredOrders += product.quantity;
                });
            }
        });
    }
    animateNumber(totalRevenueCell, totalRevenue, '₱', 2);
    animateNumber(totalOrdersCell, totalOrders);
    animateNumber(pendingOrdersCell, pendingOrders);
    animateNumber(deliveredOrdersCell, deliveredOrders);
}

function updateOrderCount() {
    const filterSelect = document.getElementById('statusFilter');
    if (currentFilter === 'all') {
        orderCount.textContent = `${ordersData.length} order groups`;
    } else {
        const filterText = filterSelect?.options[filterSelect.selectedIndex].text || '';
        orderCount.textContent = `${filteredOrdersData.length} order groups (${filterText})`;
    }
}

function animateNumber(el, target, prefix = '', decimals = 0) {
    const start = parseFloat(el.textContent.replace(/[^0-9.-]+/g, '')) || 0;
    const increment = (target - start) / 30;
    let current = start;
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
            current = target;
            clearInterval(timer);
        }
        const formatted = decimals > 0 ? current.toFixed(decimals) : Math.round(current);
        el.textContent = prefix + formatted;
    }, 16);
}

// Rendering
function renderOrders() {
    filteredOrdersData = [...ordersData];
    if (ordersData.length === 0) {
        ordersContainer.innerHTML = '<div class="empty-state"><i class="fas fa-shopping-cart"></i><h5>No Orders Found</h5><p>Orders will appear here when customers make purchases.</p></div>';
        return;
    }
    applyStatusFilter();
}

function renderFilteredOrders() {
    if (filteredOrdersData.length === 0) {
        const filterText = currentFilter === 'all' ? 'orders' : `${currentFilter} orders`;
        ordersContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i><h5>No ${filterText.charAt(0).toUpperCase() + filterText.slice(1)} Found</h5>
                <p>No orders match the selected filter.</p>
                <button class="btn btn-outline-primary mt-3" onclick="clearFilter()"><i class="fas fa-times me-2"></i>Clear Filter</button>
            </div>`;
        return;
    }
    const ordersHtml = filteredOrdersData.map(order => {
        const isExpanded = expandedOrders.has(order.orderId);
        const totalQuantity = order.products.reduce((sum, product) => sum + product.quantity, 0);
        return createOrderCardHTML(order, isExpanded, totalQuantity);
    }).join('');
    ordersContainer.innerHTML = ordersHtml;
    const orderCards = ordersContainer.querySelectorAll('.order-card');
    orderCards.forEach((card, index) => {
        card.style.opacity = '0'; card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.4s ease';
            card.style.opacity = '1'; card.style.transform = 'translateY(0)';
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
        </div>`;
}

function createProductsHTML(products) {
    return products.map(product => {
        // Get the correct image URL
        const imageUrl = getProductImage(product);
        
        console.log('Product:', product.productName, 'Image URL:', imageUrl, 'Raw image data:', product.imageUrl);
        
        return `
        <div class="product-item">
            <div class="product-image-container" style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; background-color: #f8f9fa; border-radius: 8px; overflow: hidden;">
                <img class="product-image" 
                     src="${imageUrl}" 
                     alt="${product.productName}" 
                     style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" 
                     onerror="this.onerror=null; this.src='${DEFAULT_PRODUCT_IMAGE}';" />
            </div>
            <div class="product-content">
                <div class="product-header">
                    <div class="product-name">${product.productName}${product.quantity > 1 ? `<span class="quantity-badge">×${product.quantity}</span>` : ''}</div>
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
        </div>`;
    }).join('');
}

function createBulkActionsHTML(order) {
    return `
        <div class="bulk-actions">
            <div class="d-flex flex-wrap gap-2">
                <h6 class="w-100 mb-2"><i class="fas fa-layer-group"></i> Bulk Actions</h6>
                <div class="d-flex flex-wrap gap-2 w-100">
                    ${order.hasPending ? `<button class="btn btn-success btn-sm bulk-ship-btn" data-order-id="${order.orderId}"><i class="fas fa-shipping-fast me-1"></i> Ship All Pending</button>` : ''}
                    <button class="btn btn-info btn-sm bulk-deliver-btn" data-order-id="${order.orderId}"><i class="fas fa-check-circle me-1"></i> Mark All Delivered</button>
                </div>
            </div>
        </div>`;
}

// Toggle functionality
function toggleOrder(orderId) {
    const orderElement = document.getElementById(`order-${orderId}`);
    const headerElement = orderElement.previousElementSibling;
    if (expandedOrders.has(orderId)) {
        expandedOrders.delete(orderId);
        bootstrap.Collapse.getOrCreateInstance(orderElement).hide();
        headerElement.classList.add('collapsed');
    } else {
        expandedOrders.add(orderId);
        bootstrap.Collapse.getOrCreateInstance(orderElement).show();
        headerElement.classList.remove('collapsed');
    }
}

// Order Management
async function updateProductStatus(orderIds, newStatus) {
    const orders = orderIds.split(',').map(id => parseInt(id));
    try {
        showAlert(`Updating status for ${orders.length} item(s)...`, 'info');
        let successCount = 0, errorCount = 0;
        for (const orderId of orders) {
            try {
                const response = await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'X-User-ID': user.id },
                    body: JSON.stringify({ status: newStatus })
                });
                response.ok ? successCount++ : errorCount++;
            } catch { errorCount++; }
        }
        if (successCount > 0) showAlert(`Successfully updated ${successCount} item(s) to ${newStatus}!`, 'success');
        if (errorCount > 0) showAlert(`Failed to update ${errorCount} item(s)`, 'warning');
        fetchOrders();
    } catch (error) {
        showAlert('Failed to update status', 'danger');
    }
}

async function bulkUpdateOrder(orderId, action) {
    const order = (currentFilter === 'all' ? ordersData : filteredOrdersData).find(o => o.orderId === orderId);
    if (!order) return;
    let allOrderIds = [];
    if (action === 'ship') {
        order.products.forEach(product => {
            if (product.status === 'Pending') allOrderIds = allOrderIds.concat(product.orders.map(o => o.id));
        });
    } else {
        order.products.forEach(product => allOrderIds = allOrderIds.concat(product.orders.map(o => o.id)));
    }
    if (allOrderIds.length === 0) { showAlert('No applicable products found', 'warning'); return; }
    const targetStatus = action === 'ship' ? 'Shipped' : 'Delivered';
    const actionName = action === 'ship' ? 'Shipping' : 'Delivering';
    showProgressModal(`${actionName} ${allOrderIds.length} Items`, `Processing order ${orderId}`);
    let successCount = 0;
    for (let i = 0; i < allOrderIds.length; i++) {
        try {
            const response = await fetch(`${BACKEND_URL}/api/orders/${allOrderIds[i]}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-User-ID': user.id },
                body: JSON.stringify({ status: targetStatus })
            });
            if (response.ok) {
                successCount++;
                updateProgress(i + 1, allOrderIds.length, `Item ${i + 1} updated to ${targetStatus}`);
                document.getElementById('successCount').textContent = successCount;
            }
        } catch (error) { addStatusMessage(`Error updating item ${i + 1}: ${error.message}`, 'danger'); }
        if (i < allOrderIds.length - 1) await new Promise(resolve => setTimeout(resolve, 200));
    }
    setTimeout(() => {
        const wasSuccessful = successCount === allOrderIds.length;
        completeProgress(wasSuccessful, wasSuccessful ? `Successfully ${action === 'ship' ? 'shipped' : 'delivered'} ${successCount} items!` : `Completed with ${successCount}/${allOrderIds.length} successful updates`);
        setTimeout(() => {
            bootstrap.Modal.getInstance(document.getElementById('progressModal'))?.hide();
            fetchOrders();
        }, 2000);
    }, 500);
}

// CSV Export
function exportFilteredToCsv() {
    const dataToExport = currentFilter === 'all' ? ordersData : filteredOrdersData;
    if (dataToExport.length === 0) { showAlert('No orders to export', 'warning'); return; }
    const headers = ['Order ID', 'Product', 'Buyer', 'Quantity', 'Total Price', 'Price Per Item', 'Date', 'Time', 'Status'];
    const csvRows = [headers.join(',')];
    dataToExport.forEach(order => {
        order.products.forEach(product => {
            csvRows.push([order.orderId, `"${product.productName.replace(/"/g, '""')}"`, `"${order.buyerName.replace(/"/g, '""')}"`,
                         product.quantity, product.totalPrice.toFixed(2), (product.totalPrice / product.quantity).toFixed(2),
                         order.formattedDate, product.orders[0].formattedTime, product.status].join(','));
        });
    });
    const totalRevenue = dataToExport.reduce((sum, order) => sum + order.products.reduce((pSum, product) => pSum + product.totalPrice, 0), 0);
    const totalItems = dataToExport.reduce((sum, order) => sum + order.products.reduce((pSum, product) => pSum + product.quantity, 0), 0);
    csvRows.push(['', 'SUMMARY', '', '', '', '', '', '', ''].join(','));
    const filterSelect = document.getElementById('statusFilter');
    const filterText = filterSelect?.options[filterSelect.selectedIndex].text || 'All Orders';
    csvRows.push(['', `Filter: ${filterText}`, '', '', '', '', '', '', ''].join(','));
    csvRows.push(['', 'Total Revenue', '', '', totalRevenue.toFixed(2), '', '', '', ''].join(','));
    csvRows.push(['', 'Total Items', '', totalItems, '', '', '', '', ''].join(','));
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const filterSuffix = currentFilter === 'all' ? '' : `_${currentFilter}`;
    link.download = `seller_orders${filterSuffix}_${new Date().toISOString().split('T')[0]}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    const filterDisplayText = currentFilter === 'all' ? 'All orders' : `${currentFilter} orders`;
    showAlert(`${filterDisplayText} exported successfully!`, 'success');
}

// Event Listeners
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('update-btn')) {
        const orderIds = e.target.dataset.productOrders;
        const selectElement = document.querySelector(`.status-select[data-product-orders="${orderIds}"]`);
        updateProductStatus(orderIds, selectElement.value);
    }
    if (e.target.classList.contains('bulk-ship-btn')) {
        bulkUpdateOrder(e.target.dataset.orderId, 'ship');
    }
    if (e.target.classList.contains('bulk-deliver-btn')) {
        bulkUpdateOrder(e.target.dataset.orderId, 'deliver');
    }
});

// Expand/Collapse
function setupExpandAllButton() {
    expandAllBtn.addEventListener('click', () => {
        const dataToUse = currentFilter === 'all' ? ordersData : filteredOrdersData;
        const shouldExpandAll = expandedOrders.size < dataToUse.length;
        if (shouldExpandAll) {
            dataToUse.forEach(order => expandedOrders.add(order.orderId));
            expandAllBtn.innerHTML = '<i class="fas fa-compress-alt"></i> <span class="btn-text">Collapse All</span>';
            dataToUse.forEach((order, index) => {
                setTimeout(() => {
                    const orderElement = document.getElementById(`order-${order.orderId}`);
                    const headerElement = orderElement?.previousElementSibling;
                    if (headerElement?.classList.contains('collapsed')) {
                        bootstrap.Collapse.getOrCreateInstance(orderElement).show();
                        headerElement.classList.remove('collapsed');
                    }
                }, index * 100);
            });
        } else {
            expandedOrders.clear();
            expandAllBtn.innerHTML = '<i class="fas fa-expand-alt"></i> <span class="btn-text">Expand All</span>';
            dataToUse.forEach((order, index) => {
                setTimeout(() => {
                    const orderElement = document.getElementById(`order-${order.orderId}`);
                    const headerElement = orderElement?.previousElementSibling;
                    if (headerElement && !headerElement.classList.contains('collapsed')) {
                        bootstrap.Collapse.getOrCreateInstance(orderElement).hide();
                        headerElement.classList.add('collapsed');
                    }
                }, index * 100);
            });
        }
    });
}

// Keyboard Shortcuts
function addKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'e': e.preventDefault(); exportCsvBtn.click(); break;
                case 'r': e.preventDefault(); fetchOrders(); showAlert('Orders refreshed!', 'info', 2000); break;
                case 'f': e.preventDefault(); document.getElementById('statusFilter')?.focus(); break;
            }
        }
        if (e.altKey && !e.ctrlKey && !e.metaKey) {
            const filters = { '1': 'all', '2': 'pending', '3': 'shipped', '4': 'delivered', '5': 'cancelled' };
            if (filters[e.key]) { e.preventDefault(); setFilter(filters[e.key]); }
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
        const filterText = filterSelect.options[filterSelect.selectedIndex].text;
        showAlert(`Filter applied: ${filterText}`, 'info', 2000);
    }
}

// Global functions
window.toggleOrder = toggleOrder;
window.clearFilter = clearFilter;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadSellerProfile();
    initializeUI();
    setupExpandAllButton();
    exportCsvBtn?.addEventListener('click', exportFilteredToCsv);
    setTimeout(() => { addFilterUI(); addKeyboardShortcuts(); }, 100);
    fetchOrders();
    setInterval(fetchOrders, 300000); // Auto-refresh every 5 minutes
});