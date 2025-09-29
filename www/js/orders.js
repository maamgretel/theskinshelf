// Application State
let user = JSON.parse(localStorage.getItem('user')) || null;
console.debug('orders.js loaded', { user, authToken: localStorage.getItem('authToken') });
let ordersData = [], filteredOrdersData = [], expandedOrders = new Set(), currentFilter = 'all';

// Enhanced debugging function
function debugLog(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] DEBUG: ${message}`, data || '');
}

async function ensureUser() {
    debugLog('ensureUser called', { userExists: !!user, userRole: user?.role });
    
    if (user && user.role === 'seller') {
        debugLog('ensureUser: user present and role seller', user);
        return true;
    }

    const token = localStorage.getItem('authToken');
    debugLog('ensureUser: checking authToken', { tokenExists: !!token, tokenLength: token?.length });
    
    if (!token) {
        debugLog('ensureUser: no token found, redirecting to login');
        localStorage.clear();
        window.location.href = 'login.html';
        return false;
    }

    try {
        debugLog('ensureUser: attempting to recover profile using authToken');
        const resp = await fetch(`${BACKEND_URL}/api/profile`, { 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        debugLog('ensureUser: profile response', { status: resp.status, ok: resp.ok, url: resp.url });
        
        if (!resp.ok) {
            const text = await resp.text().catch(() => '');
            debugLog('ensureUser: profile fetch failed', { status: resp.status, responseText: text });
            localStorage.clear();
            window.location.href = 'login.html';
            return false;
        }
        
        const profile = await resp.json();
        user = profile;
        try { localStorage.setItem('user', JSON.stringify(user)); } catch(e) { debugLog('localStorage error:', e); }
        debugLog('ensureUser: recovered user', user);
        return true;
    } catch (err) {
        debugLog('Failed to recover user from authToken:', err);
        localStorage.clear();
        window.location.href = 'login.html';
        return false;
    }
}

// Profile Management
const DEFAULT_AVATAR = 'https://res.cloudinary.com/dwgvlwkyt/image/upload/v1751856106/default-avatar.jpg';
const DEFAULT_PRODUCT_IMAGE = 'https://res.cloudinary.com/dwgvlwkyt/image/upload/v1751856106/default-product.jpg';

function getValidProfilePicUrl(url) {
    if (!url?.trim()) return DEFAULT_AVATAR;
    try { new URL(url); return url; } catch { return DEFAULT_AVATAR; }
}

function getProductImage(productData) {
    if (!productData) return DEFAULT_PRODUCT_IMAGE;
    
    let imageUrl = productData.image || productData.imageUrl || productData.product_image || productData.imageUrl;
    
    if (!imageUrl?.trim()) {
        return DEFAULT_PRODUCT_IMAGE;
    }
    
    if (imageUrl.startsWith('http')) {
        return imageUrl;
    }
    
    imageUrl = imageUrl.replace(/^\/+/, '').replace(/^v\d+\//, '');
    
    return `https://res.cloudinary.com/dwgvlwkyt/image/upload/v1751856106/${imageUrl}`;
}

async function loadSellerProfile() {
    debugLog('loadSellerProfile called');
    try {
        const headers = {};
        const token = localStorage.getItem('authToken');
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (user && user.id) headers['X-User-ID'] = user.id;

        debugLog('loadSellerProfile: making request', { headers, url: `${BACKEND_URL}/api/profile` });
        const response = await fetch(`${BACKEND_URL}/api/profile`, { headers });
        debugLog('loadSellerProfile: response received', { status: response.status, ok: response.ok });
        
        if (!response.ok) {
            if (response.status === 401) {
                debugLog('loadSellerProfile: 401 unauthorized, clearing storage');
                localStorage.clear();
                window.location.href = 'login.html';
                return;
            }
            throw new Error(`Status: ${response.status}`);
        }
        
        const profile = await response.json();
        debugLog('loadSellerProfile: profile data received', profile);
        
        const avatar = document.getElementById('seller-avatar');
        const name = document.getElementById('seller-name');
        const email = document.getElementById('seller-email');
        
        if (avatar) {
            avatar.src = getValidProfilePicUrl(profile.profile_pic);
            avatar.onerror = () => avatar.src = DEFAULT_AVATAR;
        }
        if (name) name.textContent = profile.name || 'Unknown User';
        if (email) email.textContent = profile.email || 'No email';
        
        debugLog('loadSellerProfile: DOM updated successfully');
    } catch (error) {
        debugLog('Profile error:', error);
        const name = document.getElementById('seller-name');
        const email = document.getElementById('seller-email');
        if (name && user?.name) name.textContent = user.name;
        if (email && user?.email) email.textContent = user.email;
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
    debugLog('initializeUI called');
    sidebarToggle?.addEventListener('click', toggleSidebar);
    if (window.innerWidth <= 1200) createSidebarOverlay();
    window.addEventListener('resize', handleWindowResize);
    document.addEventListener('click', handleSmoothScroll);
    
    // Expand/Collapse All Button
    if (expandAllBtn) {
        expandAllBtn.addEventListener('click', toggleAllOrders);
    }
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
    debugLog(`showAlert: ${type}`, msg);
    if (!alertContainer) {
        console.warn('Alert container not found, using console log instead:', msg);
        return;
    }
    
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

// Data Fetching
async function fetchOrders() {
    debugLog('fetchOrders called');
    try {
        showLoadingState();
        
        const headers = {};
        const token = localStorage.getItem('authToken');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            debugLog('fetchOrders: using Bearer token', { tokenLength: token.length });
        }
        if (user && user.id) {
            headers['X-User-ID'] = user.id.toString();
            debugLog('fetchOrders: using X-User-ID', user.id);
        }
        
        const fetchUrl = `${BACKEND_URL}/api/seller/orders`;
        debugLog('fetchOrders: making request', { 
            url: fetchUrl, 
            headers: Object.keys(headers),
            userInfo: { id: user?.id, role: user?.role }
        });
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(fetchUrl, { 
            headers,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        debugLog('fetchOrders: response received', { 
            status: response.status, 
            ok: response.ok,
            statusText: response.statusText
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                debugLog('fetchOrders: 401 Unauthorized - clearing storage and redirecting');
                localStorage.clear();
                window.location.href = 'login.html';
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        
        const orders = await response.json();
        debugLog('fetchOrders: successfully parsed JSON response', { ordersCount: orders.length });
        
        debugLog('Raw orders from backend:', orders);
        ordersData = processOrdersData(orders);
        debugLog('Processed orders data:', { count: ordersData.length });
        
        hideLoadingState();
        renderOrders();
        updateStatistics();
        
        debugLog('fetchOrders completed successfully');
        
    } catch (error) {
        debugLog('fetchOrders error:', error);
        hideLoadingState();
        
        let errorMessage = error.message;
        if (error.name === 'AbortError') {
            errorMessage = 'Request timed out - server may be slow to respond';
        }
        
        showErrorState(errorMessage);
        showAlert(`Failed to load orders: ${errorMessage}`, 'danger', 8000);
    }
}

// NEW: Fetch orders without auth redirect (for refreshing after updates)
async function fetchOrdersWithoutAuthCheck() {
    debugLog('fetchOrdersWithoutAuthCheck called');
    try {
        const headers = {};
        const token = localStorage.getItem('authToken');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        if (user && user.id) {
            headers['X-User-ID'] = user.id.toString();
        }
        
        const fetchUrl = `${BACKEND_URL}/api/seller/orders`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(fetchUrl, { 
            headers,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            // Don't redirect on error, just log it
            debugLog('fetchOrdersWithoutAuthCheck: error response', { status: response.status });
            throw new Error(`HTTP ${response.status}`);
        }
        
        const orders = await response.json();
        ordersData = processOrdersData(orders);
        
        // Re-render with current expanded state preserved
        renderOrders();
        updateStatistics();
        
        debugLog('fetchOrdersWithoutAuthCheck completed successfully');
        
    } catch (error) {
        debugLog('fetchOrdersWithoutAuthCheck error:', error);
        // Don't show error alert, just log it
    }
}

function showLoadingState() {
    if (ordersContainer) {
        ordersContainer.innerHTML = '<div class="loading-state"><div class="loading-spinner"><div class="spinner"></div></div><p>Loading orders...</p></div>';
    }
}

function hideLoadingState() {
    ordersContainer?.querySelector('.loading-state')?.remove();
}

function showErrorState(msg) {
    if (ordersContainer) {
        ordersContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h5>Error Loading Orders</h5>
                <p>Failed to load: ${msg}</p>
                <button class="btn btn-primary mt-3" onclick="retryFetchOrders()"><i class="fas fa-redo me-2"></i>Try Again</button>
            </div>`;
    }
}

function retryFetchOrders() {
    fetchOrders();
}

window.retryFetchOrders = retryFetchOrders;

// Data Processing
function processOrdersData(orders) {
    debugLog('Processing orders data', { inputCount: orders.length });
    
    const grouped = {};
    orders.forEach((order, index) => {
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
                imageUrl: order.product_image || order.image || null
            });
        }
        
        grouped[key].totalAmount += parseFloat(order.total_price);
        if (order.status !== 'Shipped') grouped[key].hasAllShipped = false;
        if (order.status !== 'Delivered') grouped[key].hasAllDelivered = false;
        if (order.status === 'Pending') grouped[key].hasPending = true;
    });
    
    const result = Object.values(grouped);
    result.forEach(order => { 
        order.products = Array.from(order.products.values());
    });
    
    debugLog('processOrdersData completed', { outputCount: result.length });
    return result;
}

// Utility Functions
const getStatusBadgeColor = status => ({ Pending: 'warning', Shipped: 'info', Delivered: 'success', Cancelled: 'danger' })[status] || 'secondary';
const formatDate = d => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
const formatTime = d => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

// Statistics functions
function updateStatistics() {
    debugLog('updateStatistics called');
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

function animateNumber(el, target, prefix = '', decimals = 0) {
    if (!el) return;
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

// Render Functions
function renderOrders() {
    debugLog('renderOrders called');
    filteredOrdersData = [...ordersData];
    if (ordersData.length === 0) {
        if (ordersContainer) {
            ordersContainer.innerHTML = '<div class="empty-state"><i class="fas fa-shopping-cart"></i><h5>No Orders Found</h5><p>Orders will appear here when customers make purchases.</p></div>';
        }
        return;
    }
    renderFilteredOrders();
    updateOrderCount();
}

function renderFilteredOrders() {
    debugLog('renderFilteredOrders called', { count: filteredOrdersData.length });
    if (!ordersContainer) return;
    
    if (filteredOrdersData.length === 0) {
        ordersContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i><h5>No Orders Found</h5>
                <p>No orders match the selected filter.</p>
            </div>`;
        return;
    }
    
    const ordersHtml = filteredOrdersData.map(order => createOrderCardHTML(order)).join('');
    ordersContainer.innerHTML = ordersHtml;
    
    // Attach event listeners
    attachOrderEventListeners();
}

function createOrderCardHTML(order) {
    const isExpanded = expandedOrders.has(order.orderId);
    
    return `
        <div class="order-card ${isExpanded ? 'expanded' : ''}" data-order-id="${order.orderId}">
            <div class="order-header" onclick="toggleOrder('${order.orderId}')">
                <div class="order-header-left">
                    <div class="order-id">${order.orderId}</div>
                    <div class="order-meta">
                        <div class="order-meta-item">
                            <i class="fas fa-user"></i>
                            <span>${order.buyerName}</span>
                        </div>
                        <div class="order-meta-item">
                            <i class="fas fa-calendar"></i>
                            <span>${order.formattedDate}</span>
                        </div>
                        <div class="order-meta-item">
                            <i class="fas fa-box"></i>
                            <span>${order.products.length} item${order.products.length > 1 ? 's' : ''}</span>
                        </div>
                    </div>
                </div>
                <div class="order-header-right">
                    <div class="order-total">₱${order.totalAmount.toFixed(2)}</div>
                    <div class="collapse-icon">
                        <i class="fas fa-chevron-down"></i>
                    </div>
                </div>
            </div>
            
            <div class="order-body">
                <div class="order-content">
                    <div class="products-section">
                        ${order.products.map(product => createProductItemHTML(product, order.orderId)).join('')}
                    </div>
                </div>
                
                <div class="order-actions">
                    <button class="btn-bulk-update btn-ship-all" onclick="bulkUpdateOrder('${order.orderId}', 'Shipped')">
                        <i class="fas fa-shipping-fast"></i>
                        Ship All Items
                    </button>
                    <button class="btn-bulk-update btn-deliver-all" onclick="bulkUpdateOrder('${order.orderId}', 'Delivered')">
                        <i class="fas fa-check-circle"></i>
                        Mark All Delivered
                    </button>
                </div>
            </div>
        </div>
    `;
}

function createProductItemHTML(product, orderId) {
    const orderIds = product.orders.map(o => o.id).join(',');
    const statusSelectId = `status-${orderId}-${product.productId}`;
    
    return `
        <div class="product-item">
            <img src="${getProductImage(product)}" alt="${product.productName}" class="product-image" 
                 onerror="this.src='${DEFAULT_PRODUCT_IMAGE}'">
            <div class="product-info">
                <div class="product-name">${product.productName}</div>
                <div class="product-quantity">Quantity: ${product.quantity}</div>
            </div>
            <div class="product-actions">
                <span class="status-badge status-${product.status.toLowerCase()}">${product.status}</span>
                <div class="product-price">₱${product.totalPrice.toFixed(2)}</div>
                <select class="status-select" id="${statusSelectId}" data-current-status="${product.status}">
                    <option value="Pending" ${product.status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="Shipped" ${product.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="Delivered" ${product.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="Cancelled" ${product.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
                <button class="btn-update-status" onclick="updateProductStatus('${orderIds}', '${statusSelectId}', '${product.productId}')">
                    <i class="fas fa-save"></i>
                    Update
                </button>
            </div>
        </div>
    `;
}

function attachOrderEventListeners() {
    // Event listeners are handled via onclick attributes for simplicity
    debugLog('Order event listeners attached');
}

function toggleOrder(orderId) {
    const card = document.querySelector(`[data-order-id="${orderId}"]`);
    if (!card) return;
    
    if (expandedOrders.has(orderId)) {
        expandedOrders.delete(orderId);
        card.classList.remove('expanded');
    } else {
        expandedOrders.add(orderId);
        card.classList.add('expanded');
    }
}

function toggleAllOrders() {
    const allCards = document.querySelectorAll('.order-card');
    
    if (expandedOrders.size === filteredOrdersData.length) {
        // Collapse all
        expandedOrders.clear();
        allCards.forEach(card => card.classList.remove('expanded'));
        if (expandAllBtn) {
            expandAllBtn.innerHTML = '<i class="fas fa-expand-alt"></i><span class="btn-text">Expand All</span>';
        }
    } else {
        // Expand all
        filteredOrdersData.forEach(order => expandedOrders.add(order.orderId));
        allCards.forEach(card => card.classList.add('expanded'));
        if (expandAllBtn) {
            expandAllBtn.innerHTML = '<i class="fas fa-compress-alt"></i><span class="btn-text">Collapse All</span>';
        }
    }
}

// Status Update Functions
async function updateProductStatus(orderIds, selectId, productId) {
    const selectElement = document.getElementById(selectId);
    if (!selectElement) {
        showAlert('Status selector not found', 'danger');
        return;
    }
    
    const newStatus = selectElement.value;
    const currentStatus = selectElement.dataset.currentStatus;
    
    if (newStatus === currentStatus) {
        showAlert('Please select a different status', 'warning');
        return;
    }
    
    // Convert orderIds string to array
    const orderIdsArray = orderIds.split(',').map(id => parseInt(id.trim()));
    
    debugLog('Updating product status', { 
        orderIds: orderIdsArray, 
        newStatus, 
        productId, 
        user
    });
    
    try {
        // Check if user exists
        if (!user || !user.id) {
            showAlert('User session expired - please refresh the page', 'danger');
            debugLog('User object missing:', { user });
            return;
        }
        
        // Build headers - match the pattern used in fetchOrders
        const headers = {
            'Content-Type': 'application/json',
            'X-User-ID': user.id.toString()
        };
        
        // Add Authorization header if token exists (optional)
        const token = localStorage.getItem('authToken');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Prepare request body - match backend expectations
        const requestBody = {
            order_ids: orderIdsArray,
            status: newStatus
            // Note: product_id is optional based on backend code
        };
        
        debugLog('Making update request', { 
            headers: Object.keys(headers), 
            body: requestBody,
            url: `${BACKEND_URL}/api/seller/orders/update-status`,
            userId: user.id 
        });
        
        const response = await fetch(`${BACKEND_URL}/api/seller/orders/update-status`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });
        
        debugLog('Update status response', { status: response.status, ok: response.ok });
        
        if (!response.ok) {
            let errorData;
            const contentType = response.headers.get('content-type');
            
            try {
                if (contentType && contentType.includes('application/json')) {
                    errorData = await response.json();
                } else {
                    const textError = await response.text();
                    errorData = { error: textError || 'Unknown error' };
                }
            } catch (parseError) {
                debugLog('Failed to parse error response', parseError);
                errorData = { error: 'Server error - could not parse response' };
            }
            
            debugLog('Update failed with error', errorData);
            
            // Show more specific error message
            let errorMsg = errorData.error || errorData.message || `Server error (${response.status})`;
            throw new Error(errorMsg);
        }
        
        const result = await response.json();
        debugLog('Status update response', result);
        
        showAlert(`Successfully updated ${result.orders_updated || orderIdsArray.length} order(s) to ${newStatus}`, 'success');
        
        // Update the current status in the select element
        selectElement.dataset.currentStatus = newStatus;
        
        // Update the badge next to the select
        const badge = selectElement.parentElement.querySelector('.status-badge');
        if (badge) {
            badge.textContent = newStatus;
            badge.className = `status-badge status-${newStatus.toLowerCase()}`;
        }
        
        // Refresh orders WITHOUT re-checking auth (to prevent logout)
        await fetchOrdersWithoutAuthCheck();
        
    } catch (error) {
        debugLog('Error updating status:', error);
        showAlert(`Failed to update status: ${error.message}`, 'danger');
    }
}

async function bulkUpdateOrder(orderId, newStatus) {
    const order = filteredOrdersData.find(o => o.orderId === orderId);
    if (!order) {
        showAlert('Order not found', 'danger');
        return;
    }
    
    // Collect all order IDs from all products in this order
    const allOrderIds = [];
    order.products.forEach(product => {
        product.orders.forEach(o => allOrderIds.push(o.id));
    });
    
    if (allOrderIds.length === 0) {
        showAlert('No orders to update', 'warning');
        return;
    }
    
    debugLog('Bulk updating order', { orderId, newStatus, orderIds: allOrderIds, user });
    
    if (!confirm(`Are you sure you want to mark all ${allOrderIds.length} item(s) in this order as ${newStatus}?`)) {
        return;
    }
    
    try {
        // Check if user exists
        if (!user || !user.id) {
            showAlert('User session expired - please refresh the page', 'danger');
            debugLog('User object missing:', { user });
            return;
        }
        
        // Build headers - match the pattern used in fetchOrders
        const headers = {
            'Content-Type': 'application/json',
            'X-User-ID': user.id.toString()
        };
        
        // Add Authorization header if token exists (optional)
        const token = localStorage.getItem('authToken');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        debugLog('Making bulk update request', { 
            headers: Object.keys(headers),
            url: `${BACKEND_URL}/api/seller/orders/update-status`,
            userId: user.id,
            orderCount: allOrderIds.length
        });
        
        const response = await fetch(`${BACKEND_URL}/api/seller/orders/update-status`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                order_ids: allOrderIds,
                status: newStatus,
                bulk_operation: true
            })
        });
        
        debugLog('Bulk update response status', { status: response.status, ok: response.ok });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            debugLog('Bulk update failed with error', errorData);
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        debugLog('Bulk update response', result);
        
        showAlert(
            `Successfully updated ${result.orders_updated} order(s) to ${newStatus}. ` +
            `${result.emails_sent} email(s) sent to ${result.customers_notified} customer(s).`,
            'success',
            6000
        );
        
        // Refresh orders WITHOUT re-checking auth (to prevent logout)
        await fetchOrdersWithoutAuthCheck();
        
    } catch (error) {
        debugLog('Error in bulk update:', error);
        showAlert(`Failed to update orders: ${error.message}`, 'danger');
    }
}

function updateOrderCount() {
    if (orderCount) {
        orderCount.textContent = `${filteredOrdersData.length} order group${filteredOrdersData.length !== 1 ? 's' : ''}`;
    }
}

// Make functions globally available
window.toggleOrder = toggleOrder;
window.updateProductStatus = updateProductStatus;
window.bulkUpdateOrder = bulkUpdateOrder;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    debugLog('DOMContentLoaded event fired');
    (async () => {
        debugLog('Starting initialization sequence');
        
        try {
            const ok = await ensureUser();
            if (!ok) {
                debugLog('ensureUser failed, stopping initialization');
                return;
            }
            
            debugLog('User ensured, loading profile');
            await loadSellerProfile();
            
            debugLog('Initializing UI');
            initializeUI();
            
            debugLog('Fetching orders');
            await fetchOrders();
            
            debugLog('Initialization completed successfully');
        } catch (error) {
            debugLog('Initialization error:', error);
            showAlert('Failed to initialize the application: ' + error.message, 'danger', 10000);
        }
    })();
});