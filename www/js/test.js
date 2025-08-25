// orders.js - Order Management System JavaScript

// Global variables
let currentOrderId = null;
let allCustomerOrders = [];
let allSellerOrders = [];
let userRole = 'customer'; // This should be set based on actual user authentication

// API Base URL - adjust according to your Flask server
const API_BASE = 'https://backend-rj0a.onrender.com'; // Change this to your server URL

// Authentication token - should be retrieved from your auth system
let authToken = localStorage.getItem('authToken') || '';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    // Load initial data based on active tab
    loadCustomerOrders();
    
    // Set user role based on authentication (mock implementation)
    determineUserRole();
}

function setupEventListeners() {
    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.onclick = function() {
            closeModal(this.closest('.modal').id);
        }
    });

    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    }
}

// Authentication and API helpers
function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
    };
}

async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(API_BASE + url, {
            ...options,
            headers: {
                ...getAuthHeaders(),
                ...options.headers
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Request failed:', error);
        showError('Request failed: ' + error.message);
        throw error;
    }
}

// Tab switching functionality
function switchTab(tabName) {
    // Remove active class from all tabs and panes
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

    // Add active class to selected tab and pane
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');

    // Load data for the selected tab
    switch(tabName) {
        case 'customer-orders':
            loadCustomerOrders();
            break;
        case 'seller-orders':
            loadSellerOrders();
            break;
        case 'checkout':
            loadCheckoutDetails();
            break;
    }
}

// Customer Orders Functions
async function loadCustomerOrders() {
    const container = document.getElementById('customer-orders-content');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading customer orders...</div>';

    try {
        const orders = await apiRequest('/orders');
        allCustomerOrders = orders;
        displayCustomerOrders(orders);
    } catch (error) {
        container.innerHTML = `<div class="error">Failed to load customer orders: ${error.message}</div>`;
    }
}

function displayCustomerOrders(orders) {
    const container = document.getElementById('customer-orders-content');
    
    if (!orders || orders.length === 0) {
        container.innerHTML = '<div class="loading">No orders found</div>';
        return;
    }

    const orderCards = orders.map(order => createOrderCard(order, 'customer')).join('');
    container.innerHTML = orderCards;
}

// Seller Orders Functions
async function loadSellerOrders(grouped = false) {
    const container = document.getElementById('seller-orders-content');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading seller orders...</div>';

    try {
        const url = grouped ? '/seller/orders?grouped=true' : '/seller/orders';
        const orders = await apiRequest(url);
        allSellerOrders = orders;
        displaySellerOrders(orders, grouped);
    } catch (error) {
        container.innerHTML = `<div class="error">Failed to load seller orders: ${error.message}</div>`;
    }
}

function displaySellerOrders(orders, isGrouped = false) {
    const container = document.getElementById('seller-orders-content');
    
    if (!orders || orders.length === 0) {
        container.innerHTML = '<div class="loading">No orders found</div>';
        return;
    }

    const orderCards = orders.map(order => createOrderCard(order, 'seller', isGrouped)).join('');
    container.innerHTML = orderCards;
}

// Order Card Creation
function createOrderCard(order, type, isGrouped = false) {
    const statusClass = `status-${order.status.toLowerCase().replace(/\s+/g, '-')}`;
    const orderDate = new Date(order.order_date).toLocaleString();
    
    let cardContent = `
        <div class="order-card">
            <div class="order-header">
                <div class="order-id">
                    ${isGrouped ? `Group: ${order.grouped_order_id}` : `Order #${order.id}`}
                </div>
                <div class="status-badge ${statusClass}">
                    ${order.status}
                </div>
            </div>
            <div class="order-details">
                <div class="detail-item">
                    <div class="detail-label">Product</div>
                    <div class="detail-value">${order.product_name || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Price</div>
                    <div class="detail-value">₱${parseFloat(order.total_price).toFixed(2)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Date</div>
                    <div class="detail-value">${orderDate}</div>
                </div>
    `;

    if (type === 'seller') {
        cardContent += `
                <div class="detail-item">
                    <div class="detail-label">Customer</div>
                    <div class="detail-value">${order.customer_name || 'N/A'}</div>
                </div>
        `;
    }

    if (isGrouped) {
        cardContent += `
                <div class="detail-item">
                    <div class="detail-label">Orders Count</div>
                    <div class="detail-value">${order.order_count || 1}</div>
                </div>
        `;
    }

    cardContent += `
            </div>
            <div class="order-actions">
    `;

    if (type === 'seller') {
        if (!isGrouped) {
            cardContent += `
                <button class="btn btn-primary" onclick="openStatusModal(${order.id})">
                    <i class="fas fa-edit"></i> Update Status
                </button>
            `;
        } else if (order.status === 'Pending') {
            cardContent += `
                <button class="btn btn-success" onclick="bulkShipOrders('${order.grouped_order_id}')">
                    <i class="fas fa-shipping-fast"></i> Ship Group
                </button>
            `;
        }
    }

    cardContent += `
                <button class="btn btn-warning" onclick="viewOrderDetails('${order.id}')">
                    <i class="fas fa-eye"></i> View Details
                </button>
            </div>
        </div>
    `;

    return cardContent;
}

// Checkout Functions
async function loadCheckoutDetails() {
    const container = document.getElementById('checkout-content');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading checkout details...</div>';

    try {
        const checkoutData = await apiRequest('/checkout');
        displayCheckoutDetails(checkoutData);
    } catch (error) {
        container.innerHTML = `<div class="error">Failed to load checkout details: ${error.message}</div>`;
    }
}

function displayCheckoutDetails(data) {
    const container = document.getElementById('checkout-content');
    
    let checkoutHtml = `
        <div style="max-width: 800px; margin: 0 auto;">
            <h2>Checkout</h2>
            
            <div class="order-card">
                <h3>Delivery Information</h3>
                <div class="order-details">
                    <div class="detail-item">
                        <div class="detail-label">Name</div>
                        <div class="detail-value">${data.deliveryInfo.name || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Contact</div>
                        <div class="detail-value">${data.deliveryInfo.contact_number || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Address</div>
                        <div class="detail-value">${data.deliveryInfo.address || 'Please add delivery address'}</div>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="updateDeliveryInfo()">
                    <i class="fas fa-edit"></i> Update Address
                </button>
            </div>

            <div class="order-card">
                <h3>Cart Items</h3>
    `;

    if (data.items && data.items.length > 0) {
        let total = 0;
        data.items.forEach(item => {
            const itemTotal = parseFloat(item.price) * item.quantity;
            total += itemTotal;
            checkoutHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #eee;">
                    <div>
                        <strong>${item.name}</strong><br>
                        <small>₱${parseFloat(item.price).toFixed(2)} × ${item.quantity}</small>
                    </div>
                    <div>₱${itemTotal.toFixed(2)}</div>
                </div>
            `;
        });

        checkoutHtml += `
                <div style="text-align: right; margin-top: 20px; font-size: 18px; font-weight: bold;">
                    Total: ₱${total.toFixed(2)}
                </div>
            </div>

            <div style="text-align: center; margin-top: 30px;">
                <button class="btn btn-success" onclick="placeOrder()" style="font-size: 18px; padding: 15px 40px;">
                    <i class="fas fa-check-circle"></i> Place Order
                </button>
            </div>
        `;
    } else {
        checkoutHtml += '<div class="loading">Your cart is empty</div>';
    }

    checkoutHtml += '</div>';
    container.innerHTML = checkoutHtml;
}

// Order Management Functions
async function placeOrder() {
    try {
        showLoading('Placing your order...');
        const result = await apiRequest('/orders/place', {
            method: 'POST'
        });
        
        showSuccess(result.message);
        loadCheckoutDetails(); // Refresh checkout
        loadCustomerOrders(); // Refresh customer orders
    } catch (error) {
        showError('Failed to place order: ' + error.message);
    }
}

function openStatusModal(orderId) {
    currentOrderId = orderId;
    document.getElementById('statusModal').style.display = 'block';
}

async function updateOrderStatus() {
    if (!currentOrderId) return;

    const newStatus = document.getElementById('statusSelect').value;
    
    try {
        showLoading('Updating order status...');
        const result = await apiRequest(`/orders/${currentOrderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });

        showSuccess(result.message);
        closeModal('statusModal');
        loadSellerOrders(); // Refresh seller orders
    } catch (error) {
        showError('Failed to update status: ' + error.message);
    }
}

// Group Orders Functions
function openGroupModal() {
    if (!allSellerOrders || allSellerOrders.length === 0) {
        showError('No orders available for grouping');
        return;
    }

    const pendingOrders = allSellerOrders.filter(order => 
        order.status === 'Pending' && !order.grouped_order_id
    );

    if (pendingOrders.length < 2) {
        showError('At least 2 pending orders are required for grouping');
        return;
    }

    const groupList = document.getElementById('groupOrdersList');
    groupList.innerHTML = pendingOrders.map(order => `
        <div class="checkbox-item">
            <input type="checkbox" id="order-${order.id}" value="${order.id}">
            <label for="order-${order.id}">
                Order #${order.id} - ${order.product_name} - ₱${parseFloat(order.total_price).toFixed(2)}
            </label>
        </div>
    `).join('');

    document.getElementById('groupModal').style.display = 'block';
}

async function groupSelectedOrders() {
    const checkboxes = document.querySelectorAll('#groupOrdersList input[type="checkbox"]:checked');
    const orderIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

    if (orderIds.length < 2) {
        showError('Please select at least 2 orders to group');
        return;
    }

    try {
        showLoading('Grouping orders...');
        const result = await apiRequest('/seller/orders/group', {
            method: 'POST',
            body: JSON.stringify({ order_ids: orderIds })
        });

        showSuccess(result.message);
        closeModal('groupModal');
        loadSellerOrders(); // Refresh seller orders
    } catch (error) {
        showError('Failed to group orders: ' + error.message);
    }
}

async function bulkShipOrders(groupId) {
    try {
        showLoading('Shipping grouped orders...');
        const result = await apiRequest('/seller/orders/bulk-ship', {
            method: 'PUT',
            body: JSON.stringify({ group_id: groupId })
        });

        showSuccess(result.message);
        loadSellerOrders(true); // Refresh grouped orders
    } catch (error) {
        showError('Failed to ship orders: ' + error.message);
    }
}

// Search and Filter Functions
function filterOrders(type) {
    const searchTerm = event.target.value.toLowerCase();
    const orders = type === 'customer' ? allCustomerOrders : allSellerOrders;
    
    if (!orders) return;

    const filteredOrders = orders.filter(order => {
        return (
            order.product_name?.toLowerCase().includes(searchTerm) ||
            order.status.toLowerCase().includes(searchTerm) ||
            order.customer_name?.toLowerCase().includes(searchTerm) ||
            order.id.toString().includes(searchTerm)
        );
    });

    if (type === 'customer') {
        displayCustomerOrders(filteredOrders);
    } else {
        displaySellerOrders(filteredOrders);
    }
}

// Utility Functions
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    currentOrderId = null;
}

function showError(message) {
    // Remove existing alerts
    removeAlerts();
    
    const alert = document.createElement('div');
    alert.className = 'error';
    alert.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    const container = document.querySelector('.tab-content');
    container.insertBefore(alert, container.firstChild);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    }, 5000);
}

function showSuccess(message) {
    // Remove existing alerts
    removeAlerts();
    
    const alert = document.createElement('div');
    alert.className = 'success';
    alert.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    
    const container = document.querySelector('.tab-content');
    container.insertBefore(alert, container.firstChild);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    }, 3000);
}

function showLoading(message) {
    // Remove existing alerts
    removeAlerts();
    
    const alert = document.createElement('div');
    alert.className = 'loading';
    alert.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${message}`;
    
    const container = document.querySelector('.tab-content');
    container.insertBefore(alert, container.firstChild);
}

function removeAlerts() {
    const alerts = document.querySelectorAll('.error, .success, .loading');
    alerts.forEach(alert => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    });
}

function viewOrderDetails(orderId) {
    // This function can be expanded to show detailed order information
    // For now, it will show an alert with basic info
    const order = [...allCustomerOrders, ...allSellerOrders].find(o => o.id == orderId);
    if (order) {
        alert(`Order Details:\nID: ${order.id}\nProduct: ${order.product_name}\nPrice: ₱${parseFloat(order.total_price).toFixed(2)}\nStatus: ${order.status}\nDate: ${new Date(order.order_date).toLocaleString()}`);
    }
}

async function updateDeliveryInfo() {
    const name = prompt('Enter your full name:');
    const contactNumber = prompt('Enter your contact number:');
    const address = prompt('Enter your delivery address:');
    
    if (!name || !contactNumber || !address) {
        showError('All fields are required');
        return;
    }

    try {
        showLoading('Updating delivery information...');
        const result = await apiRequest('/checkout/address', {
            method: 'PUT',
            body: JSON.stringify({
                address: address,
                contact_number: contactNumber
            })
        });

        showSuccess(result.message);
        loadCheckoutDetails(); // Refresh checkout details
    } catch (error) {
        showError('Failed to update delivery info: ' + error.message);
    }
}

// User role determination (mock implementation)
function determineUserRole() {
    // In a real application, this would be determined by your authentication system
    // For now, we'll use a simple approach
    const role = localStorage.getItem('userRole') || 'customer';
    userRole = role;
    
    // Show/hide tabs based on user role
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        const tabText = tab.textContent.toLowerCase();
        if (role === 'customer' && tabText.includes('seller')) {
            tab.style.display = 'none';
        } else if (role === 'seller' && (tabText.includes('customer') || tabText.includes('checkout'))) {
            tab.style.display = 'none';
        }
    });
}

// OTP Functions for card saving (if needed)
async function requestOTPForCard(email) {
    try {
        const result = await apiRequest('/orders/request-otp-save-card', {
            method: 'POST',
            body: JSON.stringify({ email: email })
        });
        
        showSuccess(result.message);
        return true;
    } catch (error) {
        showError('Failed to send OTP: ' + error.message);
        return false;
    }
}

async function verifyOTPAndSaveCard(email, otp, cardData) {
    try {
        const result = await apiRequest('/orders/verify-otp-save-card', {
            method: 'POST',
            body: JSON.stringify({
                email: email,
                otp: otp,
                cardData: cardData
            })
        });
        
        showSuccess(result.message);
        return true;
    } catch (error) {
        showError('OTP verification failed: ' + error.message);
        return false;
    }
}

// Export functions for external use if needed
window.OrderManager = {
    loadCustomerOrders,
    loadSellerOrders,
    loadCheckoutDetails,
    placeOrder,
    updateOrderStatus,
    groupSelectedOrders,
    bulkShipOrders,
    switchTab,
    setAuthToken: (token) => { authToken = token; },
    setUserRole: (role) => { userRole = role; determineUserRole(); }
};

// Auto-refresh orders every 30 seconds
setInterval(() => {
    const activeTab = document.querySelector('.tab-pane.active');
    if (activeTab) {
        switch(activeTab.id) {
            case 'customer-orders':
                loadCustomerOrders();
                break;
            case 'seller-orders':
                // Don't auto-refresh seller orders to avoid disrupting user interaction
                break;
            case 'checkout':
                // Don't auto-refresh checkout to avoid disrupting user input
                break;
        }
    }
}, 30000);

// Handle page visibility change to refresh data when user returns to tab
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        const activeTab = document.querySelector('.tab-pane.active');
        if (activeTab && activeTab.id === 'customer-orders') {
            loadCustomerOrders();
        }
    }
});