// Application State
let user = JSON.parse(localStorage.getItem('user')) || null;
let ordersData = [], filteredOrdersData = [], expandedOrders = new Set();

// Debug logging
const debugLog = (msg, data = null) => console.log(`[${new Date().toISOString()}] DEBUG: ${msg}`, data || '');

// User Authentication
async function ensureUser() {
    debugLog('ensureUser called', { userExists: !!user, userRole: user?.role });
    
    if (user?.role === 'seller') return true;

    const token = localStorage.getItem('authToken');
    if (!token) {
        localStorage.clear();
        window.location.href = 'login.html';
        return false;
    }

    try {
        const resp = await fetch(`${BACKEND_URL}/api/profile`, { 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        
        if (!resp.ok) {
            localStorage.clear();
            window.location.href = 'login.html';
            return false;
        }
        
        user = await resp.json();
        localStorage.setItem('user', JSON.stringify(user));
        return true;
    } catch (err) {
        debugLog('Failed to recover user:', err);
        localStorage.clear();
        window.location.href = 'login.html';
        return false;
    }
}

// Image Handling
const DEFAULT_AVATAR = 'https://res.cloudinary.com/dwgvlwkyt/image/upload/v1751856106/default-avatar.jpg';
const DEFAULT_PRODUCT_IMAGE = 'https://res.cloudinary.com/dwgvlwkyt/image/upload/v1751856106/default-product.jpg';

const getValidProfilePicUrl = url => {
    if (!url?.trim()) return DEFAULT_AVATAR;
    try { new URL(url); return url; } catch { return DEFAULT_AVATAR; }
};

const getProductImage = productData => {
    if (!productData) return DEFAULT_PRODUCT_IMAGE;
    
    let img = productData.image || productData.imageUrl || productData.product_image;
    if (!img?.trim()) return DEFAULT_PRODUCT_IMAGE;
    if (img.startsWith('http')) return img;
    
    img = img.replace(/^\/+/, '').replace(/^v\d+\//, '');
    return `https://res.cloudinary.com/dwgvlwkyt/image/upload/v1751856106/${img}`;
};

// Load Seller Profile
async function loadSellerProfile() {
    try {
        const headers = { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` };
        if (user?.id) headers['X-User-ID'] = user.id;

        const response = await fetch(`${BACKEND_URL}/api/profile`, { headers });
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.clear();
                window.location.href = 'login.html';
            }
            return;
        }
        
        const profile = await response.json();
        
        const avatar = document.getElementById('seller-avatar');
        if (avatar) {
            avatar.src = getValidProfilePicUrl(profile.profile_pic);
            avatar.onerror = () => avatar.src = DEFAULT_AVATAR;
        }
        
        const name = document.getElementById('seller-name');
        const email = document.getElementById('seller-email');
        if (name) name.textContent = profile.name || 'Unknown User';
        if (email) email.textContent = profile.email || 'No email';
    } catch (error) {
        debugLog('Profile error:', error);
    }
}

// DOM Elements
const els = id => document.getElementById(id);
const ordersContainer = els('ordersContainer');
const expandAllBtn = els('expandAllBtn');
const alertContainer = els('alert-container');
const statusFilter = els('statusFilter');

// Filter state
let currentFilter = 'all';

// UI Functions
function initializeUI() {
    const sidebarToggle = els('sidebarToggle');
    sidebarToggle?.addEventListener('click', toggleSidebar);
    
    if (window.innerWidth <= 1200) createSidebarOverlay();
    window.addEventListener('resize', () => {
        if (window.innerWidth > 1200) {
            document.querySelector('.sidebar')?.classList.remove('show');
            document.querySelector('.sidebar-overlay')?.classList.remove('show');
        } else createSidebarOverlay();
    });
    
    expandAllBtn?.addEventListener('click', toggleAllOrders);
    
    // Setup status filter
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            currentFilter = e.target.value;
            renderOrders();
        });
    }
}

function toggleSidebar() {
    document.querySelector('.sidebar')?.classList.toggle('show');
    document.querySelector('.sidebar-overlay')?.classList.toggle('show');
}

function createSidebarOverlay() {
    if (!document.querySelector('.sidebar-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.onclick = toggleSidebar;
        document.body.appendChild(overlay);
    }
}

// Alert System
function showAlert(msg, type = 'info', duration = 4000) {
    if (!alertContainer) return console.warn('Alert:', msg);
    
    const icons = { success: 'check-circle', warning: 'exclamation-triangle', danger: 'times-circle', info: 'info-circle' };
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-${icons[type]} me-2"></i>
            <span>${msg}</span>
            <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert"></button>
        </div>`;
    
    alertContainer.appendChild(alert);
    const timeoutId = setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 300);
    }, duration);
    
    alert.querySelector('.btn-close').onclick = () => {
        clearTimeout(timeoutId);
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 300);
    };
}

// Data Fetching
async function fetchOrders() {
    try {
        ordersContainer.innerHTML = '<div class="loading-state"><div class="loading-spinner"><div class="spinner"></div></div><p>Loading orders...</p></div>';
        
        const headers = { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` };
        if (user?.id) headers['X-User-ID'] = user.id.toString();
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(`${BACKEND_URL}/api/seller/orders`, { headers, signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.clear();
                window.location.href = 'login.html';
                return;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        
        const orders = await response.json();
        ordersData = processOrdersData(orders);
        
        renderOrders();
        updateStatistics();
    } catch (error) {
        debugLog('fetchOrders error:', error);
        const errorMsg = error.name === 'AbortError' ? 'Request timed out' : error.message;
        ordersContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h5>Error Loading Orders</h5>
                <p>${errorMsg}</p>
                <button class="btn btn-primary mt-3" onclick="fetchOrders()"><i class="fas fa-redo me-2"></i>Try Again</button>
            </div>`;
        showAlert(`Failed to load orders: ${errorMsg}`, 'danger', 8000);
    }
}

async function fetchOrdersWithoutAuthCheck() {
    try {
        const headers = { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` };
        if (user?.id) headers['X-User-ID'] = user.id.toString();
        
        const response = await fetch(`${BACKEND_URL}/api/seller/orders`, { headers });
        if (response.ok) {
            ordersData = processOrdersData(await response.json());
            renderOrders();
            updateStatistics();
        }
    } catch (error) {
        debugLog('fetchOrdersWithoutAuthCheck error:', error);
    }
}

// Data Processing - Groups by grouped_order_id or individual order
function processOrdersData(orders) {
    const grouped = {};
    
    orders.forEach(order => {
        // Use grouped_order_id if it exists, otherwise use individual order id
        const groupKey = order.grouped_order_id || `single_${order.id}`;
        
        if (!grouped[groupKey]) {
            grouped[groupKey] = {
                orderId: order.grouped_order_id ? `GRP-${order.grouped_order_id}` : `ORD-${order.id}`,
                groupKey: groupKey,
                buyerId: order.buyer_id,
                buyerName: order.buyer_name,
                orderDate: order.order_date,
                formattedDate: formatDate(order.order_date),
                products: [],
                totalAmount: 0,
                isGrouped: !!order.grouped_order_id
            };
        }
        
        // Add product to this order group
        grouped[groupKey].products.push({
            productId: order.product_id,
            productName: order.product_name,
            totalPrice: parseFloat(order.total_price),
            status: order.status,
            quantity: order.quantity || 1,
            orderId: order.id,
            imageUrl: order.product_image || order.image || null
        });
        
        grouped[groupKey].totalAmount += parseFloat(order.total_price);
    });
    
    // Convert to array and sort by date (newest first)
    return Object.values(grouped).sort((a, b) => 
        new Date(b.orderDate) - new Date(a.orderDate)
    );
}

// Utility Functions
const formatDate = d => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

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
    
    animateNumber(els('totalRevenueCell'), totalRevenue, '₱', 2);
    animateNumber(els('totalOrdersCell'), totalOrders);
    animateNumber(els('pendingOrdersCell'), pendingOrders);
    animateNumber(els('deliveredOrdersCell'), deliveredOrders);
    
    const orderCount = els('orderCount');
    if (orderCount) orderCount.textContent = `${filteredOrdersData.length} order${filteredOrdersData.length !== 1 ? 's' : ''}`;
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
        el.textContent = prefix + (decimals > 0 ? current.toFixed(decimals) : Math.round(current));
    }, 16);
}

// Render Functions
function renderOrders() {
    // Apply filter
    if (currentFilter === 'all') {
        filteredOrdersData = [...ordersData];
    } else {
        filteredOrdersData = ordersData.filter(order => 
            order.products.some(product => product.status === currentFilter)
        );
    }
    
    if (ordersData.length === 0) {
        ordersContainer.innerHTML = '<div class="empty-state"><i class="fas fa-shopping-cart"></i><h5>No Orders Found</h5><p>Orders will appear here when customers make purchases.</p></div>';
        return;
    }
    
    if (filteredOrdersData.length === 0) {
        ordersContainer.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><h5>No Orders Found</h5><p>No orders match the selected filter.</p></div>';
        return;
    }
    
    ordersContainer.innerHTML = filteredOrdersData.map(order => {
        const isExpanded = expandedOrders.has(order.orderId);
        return `
            <div class="order-card ${isExpanded ? 'expanded' : ''}" data-order-id="${order.orderId}">
                <div class="order-header" onclick="toggleOrder('${order.orderId}')">
                    <div class="order-header-left">
                        <div class="order-id">${order.orderId}</div>
                        <div class="order-meta">
                            <div class="order-meta-item"><i class="fas fa-user"></i><span>${order.buyerName}</span></div>
                            <div class="order-meta-item"><i class="fas fa-calendar"></i><span>${order.formattedDate}</span></div>
                            <div class="order-meta-item"><i class="fas fa-box"></i><span>${order.products.length} item${order.products.length > 1 ? 's' : ''}</span></div>
                        </div>
                    </div>
                    <div class="order-header-right">
                        <div class="order-total">₱${order.totalAmount.toFixed(2)}</div>
                        <div class="collapse-icon"><i class="fas fa-chevron-down"></i></div>
                    </div>
                </div>
                <div class="order-body">
                    <div class="order-content">
                        <div class="products-section">
                            ${order.products.map(product => {
                                const statusSelectId = `status-${product.orderId}`;
                                return `
                                    <div class="product-item">
                                        <img src="${getProductImage(product)}" alt="${product.productName}" class="product-image" onerror="this.src='${DEFAULT_PRODUCT_IMAGE}'">
                                        <div class="product-info">
                                            <div class="product-name">${product.productName}</div>
                                            <div class="product-quantity">Quantity: ${product.quantity}</div>
                                        </div>
                                        <div class="product-actions">
                                            <span class="status-badge status-${product.status.toLowerCase()}">${product.status}</span>
                                            <div class="product-price">₱${product.totalPrice.toFixed(2)}</div>
                                            <select class="status-select" id="${statusSelectId}" data-current-status="${product.status}">
                                                <option value="Pending" ${product.status === 'Pending' ? 'selected' : ''} ${['Shipped', 'Delivered'].includes(product.status) ? 'disabled' : ''}>Pending</option>
                                                <option value="Shipped" ${product.status === 'Shipped' ? 'selected' : ''} ${product.status === 'Delivered' ? 'disabled' : ''}>Shipped</option>
                                                <option value="Delivered" ${product.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                                                <option value="Cancelled" ${product.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                                            </select>
                                            <button class="btn-update-status" onclick="updateProductStatus('${product.orderId}', '${statusSelectId}', '${product.productId}')">
                                                <i class="fas fa-save"></i> Update
                                            </button>
                                        </div>
                                    </div>`;
                            }).join('')}
                        </div>
                    </div>
                    <div class="order-actions">
                        <button class="btn-bulk-update btn-ship-all" onclick="bulkUpdateOrder('${order.orderId}', 'Shipped')">
                            <i class="fas fa-shipping-fast"></i> Ship All Items
                        </button>
                        <button class="btn-bulk-update btn-deliver-all" onclick="bulkUpdateOrder('${order.orderId}', 'Delivered')">
                            <i class="fas fa-check-circle"></i> Mark All Delivered
                        </button>
                    </div>
                </div>
            </div>`;
    }).join('');
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
        expandedOrders.clear();
        allCards.forEach(card => card.classList.remove('expanded'));
        if (expandAllBtn) expandAllBtn.innerHTML = '<i class="fas fa-expand-alt"></i><span class="btn-text">Expand All</span>';
    } else {
        filteredOrdersData.forEach(order => expandedOrders.add(order.orderId));
        allCards.forEach(card => card.classList.add('expanded'));
        if (expandAllBtn) expandAllBtn.innerHTML = '<i class="fas fa-compress-alt"></i><span class="btn-text">Collapse All</span>';
    }
}

// Status Update Functions
async function updateProductStatus(orderId, selectId, productId) {
    const selectElement = document.getElementById(selectId);
    if (!selectElement) return showAlert('Status selector not found', 'danger');
    
    const newStatus = selectElement.value;
    const currentStatus = selectElement.dataset.currentStatus;
    
    if (newStatus === currentStatus) return showAlert('Please select a different status', 'warning');
    if (!user?.id) return showAlert('User session expired - please refresh', 'danger');
    
    const orderIdsArray = [parseInt(orderId)];
    
    try {
        const headers = {
            'Content-Type': 'application/json',
            'X-User-ID': user.id.toString(),
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        };
        
        const response = await fetch(`${BACKEND_URL}/api/seller/orders/update-status`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ order_ids: orderIdsArray, status: newStatus })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `Server error (${response.status})`);
        }
        
        const result = await response.json();
        showAlert(`Successfully updated order to ${newStatus}`, 'success');
        
        selectElement.dataset.currentStatus = newStatus;
        const badge = selectElement.parentElement.querySelector('.status-badge');
        if (badge) {
            badge.textContent = newStatus;
            badge.className = `status-badge status-${newStatus.toLowerCase()}`;
        }
        
        await fetchOrdersWithoutAuthCheck();
    } catch (error) {
        debugLog('Error updating status:', error);
        showAlert(`Failed to update status: ${error.message}`, 'danger');
    }
}

async function bulkUpdateOrder(orderId, newStatus) {
    const order = filteredOrdersData.find(o => o.orderId === orderId);
    if (!order) return showAlert('Order not found', 'danger');
    
    const allOrderIds = order.products.map(p => p.orderId);
    if (allOrderIds.length === 0) return showAlert('No orders to update', 'warning');
    if (!confirm(`Mark all ${allOrderIds.length} item(s) as ${newStatus}?`)) return;
    if (!user?.id) return showAlert('User session expired - please refresh', 'danger');
    
    try {
        const headers = {
            'Content-Type': 'application/json',
            'X-User-ID': user.id.toString(),
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        };
        
        const response = await fetch(`${BACKEND_URL}/api/seller/orders/update-status`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ order_ids: allOrderIds, status: newStatus, bulk_operation: true })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        showAlert(`Updated ${result.orders_updated} order(s) to ${newStatus}. ${result.emails_sent} email(s) sent.`, 'success', 6000);
        
        await fetchOrdersWithoutAuthCheck();
    } catch (error) {
        debugLog('Error in bulk update:', error);
        showAlert(`Failed to update orders: ${error.message}`, 'danger');
    }
}

// Make functions globally available
window.toggleOrder = toggleOrder;
window.updateProductStatus = updateProductStatus;
window.bulkUpdateOrder = bulkUpdateOrder;

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    debugLog('Initializing application');
    try {
        if (!await ensureUser()) return;
        await loadSellerProfile();
        initializeUI();
        await fetchOrders();
        debugLog('Initialization completed');
    } catch (error) {
        debugLog('Initialization error:', error);
        showAlert('Failed to initialize: ' + error.message, 'danger', 10000);
    }
});