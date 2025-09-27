// Application State - Remove duplicate BACKEND_URL declaration
// const BACKEND_URL = 'https://backend-rj0a.onrender.com'; // REMOVED - using from shared.js
let user = JSON.parse(localStorage.getItem('user')) || null;
console.debug('orders.js loaded', { user, authToken: localStorage.getItem('authToken') });
let ordersData = [], filteredOrdersData = [], expandedOrders = new Set(), currentFilter = 'all';

// Enhanced debugging function
function debugLog(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] DEBUG: ${message}`, data || '');
}

// We'll ensure user is available during initialization. If missing, try to fetch profile
// using an existing auth token. If that fails, redirect to login.

async function ensureUser() {
    debugLog('ensureUser called', { userExists: !!user, userRole: user?.role });
    
    // If user exists and is seller, we're good
    if (user && user.role === 'seller') {
        debugLog('ensureUser: user present and role seller', user);
        return true;
    }

    // Try to recover from authToken
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
    
    let imageUrl = productData.image || productData.imageUrl || productData.product_image;
    
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

// Data Fetching - Enhanced with better error handling
async function fetchOrders() {
    debugLog('fetchOrders called');
    try {
        showLoadingState();
        
        // Build headers
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
        
        // Add a timeout to the fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch(fetchUrl, { 
            headers,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        debugLog('fetchOrders: response received', { 
            status: response.status, 
            ok: response.ok,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
        });
        
        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            let errorText = 'Unknown error';
            
            if (contentType?.includes('application/json')) {
                try {
                    const errorData = await response.json();
                    errorText = errorData.message || errorData.error || JSON.stringify(errorData);
                    debugLog('fetchOrders: JSON error response', errorData);
                } catch (e) {
                    debugLog('fetchOrders: failed to parse JSON error', e);
                }
            } else {
                try {
                    errorText = await response.text();
                    debugLog('fetchOrders: text error response', errorText);
                } catch (e) {
                    debugLog('fetchOrders: failed to get error text', e);
                }
            }
            
            // Handle specific error cases
            if (response.status === 401) {
                debugLog('fetchOrders: 401 Unauthorized - clearing storage and redirecting');
                localStorage.clear();
                window.location.href = 'login.html';
                return;
            } else if (response.status === 403) {
                throw new Error('Access forbidden - you may not have seller permissions');
            } else if (response.status === 404) {
                throw new Error('Orders endpoint not found - check API configuration');
            } else if (response.status >= 500) {
                throw new Error(`Server error (${response.status}): ${errorText}`);
            } else {
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
        }
        
        // Try to parse the response
        let orders;
        try {
            orders = await response.json();
            debugLog('fetchOrders: successfully parsed JSON response', { 
                ordersCount: Array.isArray(orders) ? orders.length : 'not array',
                firstOrder: Array.isArray(orders) && orders.length > 0 ? orders[0] : null
            });
        } catch (parseError) {
            debugLog('fetchOrders: JSON parsing failed', parseError);
            throw new Error('Invalid JSON response from server');
        }
        
        // Validate the response structure
        if (!Array.isArray(orders)) {
            debugLog('fetchOrders: response is not an array', orders);
            throw new Error('Expected an array of orders from server');
        }
        
        debugLog('Raw orders from backend:', orders);
        ordersData = processOrdersData(orders);
        debugLog('Processed orders data:', { count: ordersData.length, firstProcessed: ordersData[0] });
        
        hideLoadingState();
        renderOrders();
        updateStatistics();
        
        debugLog('fetchOrders completed successfully');
        
    } catch (error) {
        debugLog('fetchOrders error:', error);
        hideLoadingState();
        
        // Show more specific error messages
        let errorMessage = error.message;
        if (error.name === 'AbortError') {
            errorMessage = 'Request timed out - server may be slow to respond';
        } else if (error instanceof TypeError && error.message.includes('fetch')) {
            errorMessage = 'Network error - check your internet connection';
        }
        
        showErrorState(errorMessage);
        showAlert(`Failed to load orders: ${errorMessage}`, 'danger', 8000);
    }
}

function showLoadingState() {
    debugLog('showLoadingState called');
    if (ordersContainer) {
        ordersContainer.innerHTML = '<div class="loading-state"><div class="loading-spinner"><div class="spinner"></div></div><p>Loading orders...</p></div>';
    }
}

function hideLoadingState() {
    debugLog('hideLoadingState called');
    ordersContainer?.querySelector('.loading-state')?.remove();
}

function showErrorState(msg) {
    debugLog('showErrorState called', msg);
    if (ordersContainer) {
        ordersContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h5>Error Loading Orders</h5>
                <p>Failed to load: ${msg}</p>
                <button class="btn btn-primary mt-3" onclick="retryFetchOrders()"><i class="fas fa-redo me-2"></i>Try Again</button>
                <button class="btn btn-outline-secondary mt-2 ms-2" onclick="showDebugInfo()"><i class="fas fa-bug me-2"></i>Show Debug Info</button>
            </div>`;
    }
}

// Add retry function
function retryFetchOrders() {
    debugLog('retryFetchOrders called');
    fetchOrders();
}

// Add debug info function
function showDebugInfo() {
    const debugInfo = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        currentURL: window.location.href,
        backendURL: BACKEND_URL,
        user: user,
        hasAuthToken: !!localStorage.getItem('authToken'),
        authTokenLength: localStorage.getItem('authToken')?.length || 0,
        localStorage: Object.keys(localStorage),
        sessionStorage: Object.keys(sessionStorage)
    };
    
    console.log('=== DEBUG INFORMATION ===');
    console.log(JSON.stringify(debugInfo, null, 2));
    alert('Debug information has been logged to console. Please check the browser console (F12) and share this with the developer.');
}

// Make functions globally available
window.retryFetchOrders = retryFetchOrders;
window.showDebugInfo = showDebugInfo;

// Data Processing
function processOrdersData(orders) {
    debugLog('Processing orders data', { inputCount: orders.length });
    
    const grouped = {};
    orders.forEach((order, index) => {
        debugLog(`Processing order ${index + 1}/${orders.length}:`, {
            id: order.id,
            product_name: order.product_name,
            status: order.status,
            image: order.product_image
        });
        
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
    
    // Convert Map to Array and log the results
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
        const filterText = currentFilter === 'all' ? 'orders' : `${currentFilter} orders`;
        ordersContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i><h5>No ${filterText.charAt(0).toUpperCase() + filterText.slice(1)} Found</h5>
                <p>No orders match the selected filter.</p>
            </div>`;
        return;
    }
    
    // Simple rendering for now
    const ordersHtml = filteredOrdersData.map(order => {
        return `
            <div class="order-card mb-3 p-3 border rounded">
                <div class="order-header">
                    <h5 class="text-primary">${order.orderId}</h5>
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Buyer:</strong> ${order.buyerName}</p>
                            <p><strong>Date:</strong> ${order.formattedDate}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Total:</strong> ₱${order.totalAmount.toFixed(2)}</p>
                            <p><strong>Products:</strong> ${order.products.length} items</p>
                        </div>
                    </div>
                    <div class="products-list mt-2">
                        ${order.products.map(product => `
                            <div class="product-item d-flex justify-content-between align-items-center p-2 bg-light rounded mb-2">
                                <div>
                                    <strong>${product.productName}</strong> 
                                    ${product.quantity > 1 ? `(×${product.quantity})` : ''}
                                </div>
                                <div>
                                    <span class="badge bg-${getStatusBadgeColor(product.status)} me-2">${product.status}</span>
                                    <strong>₱${product.totalPrice.toFixed(2)}</strong>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>`;
    }).join('');
    
    ordersContainer.innerHTML = ordersHtml;
}

function updateOrderCount() {
    if (orderCount) {
        orderCount.textContent = `${filteredOrdersData.length} order groups`;
    }
}

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