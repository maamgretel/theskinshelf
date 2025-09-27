// Seller Dashboard API - Enhanced with Notifications
class SellerDashboardAPI {
    constructor(baseURL = 'https://backend-rj0a.onrender.com', userId = null) {
        this.baseURL = baseURL;
        this.userId = userId;
        this.authToken = null; // You'll need to set this based on your auth system
    }

    setUserId(userId) {
        this.userId = userId;
    }

    setAuthToken(token) {
        this.authToken = token;
    }

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };
        
        if (this.userId) {
            headers['X-User-ID'] = this.userId.toString();
        }
        
        // Add authorization header if token exists
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        
        return headers;
    }

    async apiCall(endpoint, options = {}) {
        try {
            const url = `${this.baseURL}${endpoint}`;
            const config = {
                method: 'GET',
                headers: this.getHeaders(),
                ...options
            };

            // Normalize method
            const method = (config.method || 'GET').toUpperCase();

            // If GET with no body, remove Content-Type to avoid server attempting to parse empty JSON
            if ((!config.body || config.body === null) && method === 'GET') {
                if (config.headers && config.headers['Content-Type']) {
                    delete config.headers['Content-Type'];
                }
            }

            // If body is FormData, remove Content-Type so browser sets boundary
            if (config.body instanceof FormData && config.headers && config.headers['Content-Type']) {
                delete config.headers['Content-Type'];
            }

            const response = await fetch(url, config);

            // Try to determine if response is JSON before parsing
            const contentType = response.headers.get('content-type') || '';
            let data = null;

            if (contentType.includes('application/json')) {
                try {
                    data = await response.json();
                } catch (jsonErr) {
                    // If parsing fails, read raw text for debugging
                    const text = await response.text();
                    console.error(`Failed to parse JSON from ${endpoint}:`, jsonErr, 'Raw response text:', text);
                    throw new Error(`Invalid JSON response from ${endpoint}: ${jsonErr.message}\nResponse body: ${text}`);
                }
            } else {
                // Non-JSON response (likely an HTML error page). Capture text for debugging.
                const text = await response.text();
                console.warn(`Non-JSON response from ${endpoint}. Status: ${response.status}. Response body:`, text);
                // Attach the raw text to the thrown error so callers can display or log it
                const err = new Error(`HTTP ${response.status}: ${response.statusText}`);
                err.raw = text;
                err.status = response.status;
                throw err;
            }

            if (!response.ok) {
                // If API follows { message } error shape, include it; otherwise include status
                const message = (data && (data.message || data.error)) ? (data.message || data.error) : `HTTP ${response.status}: ${response.statusText}`;
                const err = new Error(message);
                err.status = response.status;
                err.response = data;
                throw err;
            }

            return data;

        } catch (error) {
            console.error(`Error calling ${endpoint}:`, error);
            throw error;
        }
    }

    // Existing methods
    async getDashboardOverview() {
        return await this.apiCall('/api/seller/dashboard/overview');
    }

    async getRecentOrders(limit = 10) {
        return await this.apiCall(`/api/seller/dashboard/recent-orders?limit=${limit}`);
    }

    async getTopSellingProducts(limit = 5) {
        return await this.apiCall(`/api/seller/dashboard/top-products?limit=${limit}`);
    }

    async getLowStockProducts(threshold = 10) {
        return await this.apiCall(`/api/seller/dashboard/low-stock?threshold=${threshold}`);
    }

    async getSalesAnalytics(days = 30) {
        return await this.apiCall(`/api/seller/dashboard/analytics?days=${days}`);
    }

    async getCustomerInsights(limit = 10) {
        return await this.apiCall(`/api/seller/dashboard/customers?limit=${limit}`);
    }

    async getQuickStats() {
        return await this.apiCall('/api/seller/dashboard/quick-stats');
    }

    // NEW: Notification methods
    async getNotifications() {
        return await this.apiCall('/api/notifications');
    }

    async markNotificationsAsRead() {
        return await this.apiCall('/api/notifications/mark-as-read', {
            method: 'POST'
        });
    }

    async deleteNotification(notificationId) {
        return await this.apiCall(`/api/notifications/${notificationId}`, {
            method: 'DELETE'
        });
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(amount);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatTimeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diffInMs = now - date;
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInDays < 7) return `${diffInDays}d ago`;
        return this.formatDate(dateString);
    }
}

// Global variables
let api;
let salesChart, statusChart, categoryChart;
let notifications = [];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Get seller ID from sessionStorage where it's stored during login
    const sellerId = sessionStorage.getItem('sellerId');
    if (!sellerId) {
        // If no seller ID is found, redirect to login page
        window.location.href = 'login.html';
        return;
    }
    
    api = new SellerDashboardAPI('https://backend-rj0a.onrender.com', sellerId);
    // Set auth token from localStorage or from stored user object if present
    const storedToken = localStorage.getItem('authToken') || (localStorage.getItem('user') ? (JSON.parse(localStorage.getItem('user')).token || null) : null);
    if (storedToken) {
        api.setAuthToken(storedToken);
        console.log('Auth token set from localStorage');
    } else {
        console.log('No auth token found in localStorage');
    }
    
    initializeDashboard();
    setupEventListeners();
    loadNotifications();
    
    // Auto-refresh notifications every 2 minutes
    setInterval(loadNotifications, 120000);
});

// Setup event listeners
function setupEventListeners() {
    // Sidebar navigation
    document.querySelectorAll('[data-section]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            showSection(section);
            
            // Update active state
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Mobile sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            document.querySelector('.sidebar').classList.toggle('show');
        });
    }

    // Logout button handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Clear all stored data
            localStorage.removeItem('user');
            sessionStorage.removeItem('sellerId');
            // Redirect to login page
            window.location.href = 'login.html';
        });
    }

    // Fixed: Notification dropdown event listeners
    const notificationDropdown = document.getElementById('notificationDropdown');
    if (notificationDropdown) {
        // Load notifications when dropdown is clicked
        notificationDropdown.addEventListener('click', function(e) {
            e.preventDefault();
            loadNotifications();
        });

        // Mark notifications as read when dropdown is shown
        notificationDropdown.addEventListener('shown.bs.dropdown', function() {
            setTimeout(() => {
                markAllNotificationsAsRead();
            }, 1000); // Delay to allow user to see notifications first
        });
    }
}

// NEW: Load notifications with improved error handling
async function loadNotifications() {
    try {
        console.log('Loading notifications...');
        const response = await api.getNotifications();
        console.log('Raw API Response:', response);
        
        // Reset notifications array
        notifications = [];
        
        // Handle different possible response structures
        if (response) {
            if (Array.isArray(response)) {
                // Response is directly an array
                notifications = response;
                console.log('Response is array:', notifications);
            } else if (response.success && response.data) {
                // Response has success flag and data property
                if (Array.isArray(response.data)) {
                    notifications = response.data;
                } else if (response.data.notifications && Array.isArray(response.data.notifications)) {
                    notifications = response.data.notifications;
                }
                console.log('Response has data property:', notifications);
            } else if (response.notifications && Array.isArray(response.notifications)) {
                // Response has notifications property
                notifications = response.notifications;
                console.log('Response has notifications property:', notifications);
            } else if (response.data && Array.isArray(response.data)) {
                // Response has data as array
                notifications = response.data;
                console.log('Response data is array:', notifications);
            } else {
                // Check if response itself has notification properties
                console.log('Checking response structure:', Object.keys(response));
                
                // If response has message/status properties, it might be a single notification
                if (response.message || response.title) {
                    notifications = [response];
                    console.log('Response seems to be single notification:', notifications);
                } else {
                    console.log('Unknown response structure, setting empty array');
                    notifications = [];
                }
            }
        } else {
            console.log('No response received');
            notifications = [];
        }
        
        console.log('Final processed notifications:', notifications);
        console.log('Number of notifications:', notifications.length);
        
        // Update UI
        updateNotificationBadge();
        updateNotificationDropdown();
        
    } catch (error) {
        console.error('Failed to load notifications:', error);
        console.error('Error details:', error.message);
        
        // If server returned raw HTML (err.raw), log it for debugging
        if (error.raw) {
            console.error('Server raw response:', error.raw);
        }

        // Set empty array on error
        notifications = [];
        updateNotificationBadge();
        updateNotificationDropdown();
        
        // Show error to user
        showError('Failed to load notifications: ' + error.message);
    }
}

// NEW: Update notification badge
function updateNotificationBadge() {
    const badge = document.getElementById('notification-badge');
    if (!badge) {
        console.log('Notification badge element not found');
        return;
    }
    
    console.log('Updating badge with notifications:', notifications);
    console.log('Notification count:', notifications.length);
    
    if (!notifications || !Array.isArray(notifications)) {
        console.log('Notifications is not an array:', typeof notifications);
        badge.style.display = 'none';
        return;
    }
    
    // Count unread notifications with better logging
    const unreadNotifications = notifications.filter(n => {
        const isUnread = n.is_read === false || n.is_read === 0 || n.is_read === '0' || !n.is_read;
        console.log('Notification:', n.id || 'no-id', 'is_read:', n.is_read, 'isUnread:', isUnread);
        return isUnread;
    });
    
    const unreadCount = unreadNotifications.length;
    console.log('Unread notifications:', unreadNotifications);
    console.log('Unread count:', unreadCount);
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.style.display = 'block';
        console.log('Badge updated to show:', badge.textContent);
    } else {
        badge.style.display = 'none';
        console.log('Badge hidden - no unread notifications');
    }
}

// NEW: Update notification dropdown with improved structure
function updateNotificationDropdown() {
    const content = document.getElementById('notification-content');
    if (!content) {
        console.log('Notification content element not found');
        return;
    }

    console.log('Updating dropdown with notifications:', notifications);

    // Clear existing content
    content.innerHTML = '';

    if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
        content.innerHTML = '<div class="notification-item text-center text-muted">No new notifications</div>';
        console.log('Showing no notifications message');
        return;
    }

    // Add mark all as read button if there are unread notifications
    const unreadCount = notifications.filter(n => n.is_read === false || n.is_read === 0).length;
    if (unreadCount > 0) {
        const markAllReadBtn = document.createElement('button');
        markAllReadBtn.className = 'mark-all-read-btn';
        markAllReadBtn.innerHTML = `
            <i class="bi bi-check2-all me-2"></i>Mark all as read (${unreadCount})
        `;
        markAllReadBtn.onclick = markAllNotificationsAsRead;
        content.appendChild(markAllReadBtn);
    }

    // Add notifications (show most recent 15 since we have scroll now)
    const recentNotifications = notifications.slice(0, 15);
    recentNotifications.forEach(notification => {
        const item = document.createElement('div');
        const isRead = notification.is_read === true || notification.is_read === 1;
        item.className = `notification-item ${!isRead ? 'unread' : ''}`;
        
        const notificationType = getNotificationType(notification.message);
        const timeAgo = notification.created_at ? api.formatTimeAgo(notification.created_at) : 'Recently';
        
        item.innerHTML = `
            <div class="d-flex align-items-start">
                <div class="notification-icon ${getNotificationColor(notificationType)} me-3">
                    ${getNotificationIcon(notificationType)}
                </div>
                <div class="flex-grow-1 min-w-0">
                    <div class="notification-title">${getNotificationTitle(notification.message)}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${timeAgo}</div>
                </div>
                ${!isRead ? '<div class="notification-unread-dot"></div>' : ''}
            </div>
        `;
        content.appendChild(item);
    });

    // Add "View all" footer if there are more notifications
    if (notifications.length > 15) {
        const footer = document.createElement('div');
        footer.className = 'notification-footer';
        footer.innerHTML = `
            <a href="#" class="text-primary text-decoration-none" onclick="showAllNotifications()">
                View all ${notifications.length} notifications
            </a>
        `;
        content.appendChild(footer);
    }

    console.log('Dropdown updated with', recentNotifications.length, 'notifications');
}

// DEBUG: Test notification loading specifically
window.debugNotifications = async function() {
    console.log('=== DEBUGGING NOTIFICATIONS ===');
    
    try {
        console.log('1. Testing API endpoint...');
        const rawResponse = await fetch(`${api.baseURL}/api/notifications`, {
            method: 'GET',
            headers: api.getHeaders()
        });
        
        console.log('2. Raw fetch response status:', rawResponse.status);
        console.log('3. Raw fetch response ok:', rawResponse.ok);
        
        const responseText = await rawResponse.text();
        console.log('4. Raw response text:', responseText);
        
        let parsedResponse;
        try {
            parsedResponse = JSON.parse(responseText);
            console.log('5. Parsed response:', parsedResponse);
        } catch (parseError) {
            console.error('6. JSON parse error:', parseError);
            return;
        }
        
        console.log('7. Response type:', typeof parsedResponse);
        console.log('8. Response keys:', Object.keys(parsedResponse));
        
        if (Array.isArray(parsedResponse)) {
            console.log('9. Response is array with length:', parsedResponse.length);
        } else if (parsedResponse.data) {
            console.log('9. Response has data property:', typeof parsedResponse.data);
            if (Array.isArray(parsedResponse.data)) {
                console.log('10. Data is array with length:', parsedResponse.data.length);
            }
        }
        
        // Force update with this response
        notifications = [];
        if (Array.isArray(parsedResponse)) {
            notifications = parsedResponse;
        } else if (parsedResponse.data && Array.isArray(parsedResponse.data)) {
            notifications = parsedResponse.data;
        } else if (parsedResponse.notifications && Array.isArray(parsedResponse.notifications)) {
            notifications = parsedResponse.notifications;
        }
        
        console.log('11. Final notifications array:', notifications);
        updateNotificationBadge();
        updateNotificationDropdown();
        
        return parsedResponse;
        
    } catch (error) {
        console.error('Debug failed:', error);
    }
};

// NEW: Mark all notifications as read
async function markAllNotificationsAsRead() {
    try {
        await api.markNotificationsAsRead();
        
        // Update local notifications state
        notifications.forEach(n => n.is_read = true);
        
        updateNotificationBadge();
        updateNotificationDropdown();
        
        showSuccess('All notifications marked as read');
        
    } catch (error) {
        console.error('Failed to mark notifications as read:', error);
        showError('Failed to update notifications');
    }
}

// NEW: Get notification type from message content
function getNotificationType(message) {
    if (!message) return 'system';
    
    const msg = message.toLowerCase();
    if (msg.includes('order') || msg.includes('📦')) return 'order';
    if (msg.includes('stock') || msg.includes('inventory')) return 'low_stock';
    if (msg.includes('payment') || msg.includes('💰')) return 'payment';
    if (msg.includes('message') || msg.includes('💬')) return 'message';
    if (msg.includes('promotion') || msg.includes('📢')) return 'promotion';
    
    return 'system';
}

// NEW: Extract a title from the message
function getNotificationTitle(message) {
    if (!message) return 'Notification';
    
    if (message.includes('📦') && message.includes('New order')) {
        return 'New Order';
    }
    if (message.includes('stock')) {
        return 'Stock Alert';
    }
    if (message.includes('payment')) {
        return 'Payment Update';
    }
    if (message.includes('message')) {
        return 'New Message';
    }
    if (message.includes('promotion')) {
        return 'Promotion';
    }
    
    // Default: use first 30 characters of message as title
    return message.length > 30 ? message.substring(0, 30) + '...' : message;
}

// NEW: Get notification icon based on type
function getNotificationIcon(type) {
    const icons = {
        'order': '<i class="bi bi-box-seam"></i>',
        'low_stock': '<i class="bi bi-exclamation-triangle"></i>',
        'payment': '<i class="bi bi-credit-card"></i>',
        'system': '<i class="bi bi-gear"></i>',
        'message': '<i class="bi bi-chat-dots"></i>',
        'promotion': '<i class="bi bi-megaphone"></i>'
    };
    return icons[type] || '<i class="bi bi-bell"></i>';
}

// NEW: Get notification color based on type
function getNotificationColor(type) {
    const colors = {
        'order': 'primary',
        'low_stock': 'warning',
        'payment': 'success',
        'system': 'info',
        'message': 'primary',
        'promotion': 'success'
    };
    return colors[type] || 'secondary';
}

// NEW: Show all notifications (you can implement a modal or separate page)
function showAllNotifications() {
    // For now, just reload the dropdown
    loadNotifications();
    showSuccess('Showing all notifications in dropdown');
}

// Show specific section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('[id$="-section"]').forEach(section => {
        section.style.display = 'none';
    });

    // Show selected section
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.style.display = 'block';
        
        // Load section-specific data
        loadSectionData(sectionName);
    }
}

// Load section-specific data
function loadSectionData(section) {
    switch(section) {
        case 'analytics':
            loadAnalyticsData();
            break;
        case 'customers':
            loadCustomersData();
            break;
        case 'dashboard':
            // Dashboard data is loaded on init
            break;
    }
}

// Initialize dashboard
async function initializeDashboard() {
    try {
        showLoading();
        
        // Load overview data
        const overview = await api.getDashboardOverview();
        updateSellerInfo(overview.data.seller_info);
        updateStats(overview.data.stats);
        
        // Load other dashboard components
        await Promise.all([
            loadRecentOrders(),
            loadLowStockProducts(),
            loadSalesChart(),
            loadStatusChart()
        ]);
        
        hideLoading();
        showSuccess('Dashboard loaded successfully!');
        
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        if (error.raw) {
            console.error('Server raw response during dashboard init:', error.raw);
            showError('Failed to load dashboard data. Server response: ' + (error.message || error.status) );
        } else {
            showError('Failed to load dashboard data. Please refresh the page.');
        }
    }
}

// Update seller info
function updateSellerInfo(sellerInfo) {
    document.getElementById('seller-avatar').src = sellerInfo.profile_pic;
    document.getElementById('seller-name').textContent = sellerInfo.name;
    document.getElementById('seller-email').textContent = sellerInfo.email;
}

// Update stats cards
function updateStats(stats) {
    document.getElementById('stat-products').textContent = stats.total_products;
    document.getElementById('stat-revenue').textContent = api.formatCurrency(stats.total_revenue);
    document.getElementById('stat-orders').textContent = stats.total_orders;
    document.getElementById('stat-pending').textContent = stats.pending_orders;
    
    // Update notification badge (this will be overridden by loadNotifications)
    const notifBadge = document.getElementById('notification-badge');
    if (stats.unread_notifications > 0) {
        notifBadge.textContent = stats.unread_notifications;
        notifBadge.style.display = 'block';
    } else {
        notifBadge.style.display = 'none';
    }
}

// Load recent orders
async function loadRecentOrders() {
    try {
        document.getElementById('recent-orders-loading').style.display = 'flex';
        document.getElementById('recent-orders-table').style.display = 'none';
        
        const response = await api.getRecentOrders(10);
        const orders = response.data;
        
        const tbody = document.getElementById('recent-orders-body');
        tbody.innerHTML = '';
        
        orders.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${order.id}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${order.product_image}" class="product-img rounded me-2" alt="">
                        <span>${order.product_name}</span>
                    </div>
                </td>
                <td>
                    <div>
                        <div class="fw-medium">${order.customer_name}</div>
                        <small class="text-muted">${order.customer_email}</small>
                    </div>
                </td>
                <td>${api.formatCurrency(order.total_price)}</td>
                <td>
                    <span class="badge ${getStatusBadgeClass(order.status)}">
                        <span class="status-dot status-${order.status.toLowerCase()}"></span>
                        ${order.status}
                    </span>
                </td>
                <td><small>${api.formatDate(order.order_date)}</small></td>
            `;
            tbody.appendChild(row);
        });
        
        document.getElementById('recent-orders-loading').style.display = 'none';
        document.getElementById('recent-orders-table').style.display = 'block';
        
    } catch (error) {
        console.error('Failed to load recent orders:', error);
        showError('Failed to load recent orders');
    }
}

// Load low stock products
async function loadLowStockProducts() {
    try {
        document.getElementById('low-stock-loading').style.display = 'flex';
        
        const response = await api.getLowStockProducts(10);
        const products = response.data;
        
        const container = document.getElementById('low-stock-list');
        container.innerHTML = '';
        
        if (products.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">No low stock products</p>';
        } else {
            products.forEach(product => {
                const item = document.createElement('div');
                item.className = 'mb-3 p-2 border rounded';
                item.innerHTML = `
                    <div class="d-flex align-items-center">
                        <img src="${product.image}" class="product-img rounded me-2" alt="">
                        <div class="flex-grow-1">
                            <div class="fw-medium">${product.name}</div>
                            <small class="text-danger">Stock: ${product.stock}</small>
                        </div>
                        <div class="text-end">
                            <small class="text-muted">${api.formatCurrency(product.price)}</small>
                        </div>
                    </div>
                `;
                container.appendChild(item);
            });
        }
        
        document.getElementById('low-stock-loading').style.display = 'none';
        
    } catch (error) {
        console.error('Failed to load low stock products:', error);
    }
}

// Load sales chart
async function loadSalesChart() {
    try {
        const response = await api.getSalesAnalytics(30);
        const analytics = response.data;
        
        const ctx = document.getElementById('salesChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (salesChart) {
            salesChart.destroy();
        }
        
        const dailySales = analytics.daily_sales.reverse(); // Show chronological order
        
        salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dailySales.map(day => new Date(day.order_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })),
                datasets: [{
                    label: 'Daily Revenue',
                    data: dailySales.map(day => day.daily_revenue),
                    borderColor: 'rgb(99, 102, 241)',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₱' + value.toLocaleString();
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Revenue: ₱' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Failed to load sales chart:', error);
    }
}

// Load status chart
async function loadStatusChart() {
    try {
        const response = await api.getSalesAnalytics(30);
        const analytics = response.data;
        
        const ctx = document.getElementById('statusChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (statusChart) {
            statusChart.destroy();
        }
        
        const statusData = analytics.status_breakdown;
        const colors = {
            'Pending': '#f59e0b',
            'Shipped': '#6366f1',
            'Delivered': '#10b981',
            'Cancelled': '#ef4444'
        };
        
        statusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: statusData.map(status => status.status),
                datasets: [{
                    data: statusData.map(status => status.count),
                    backgroundColor: statusData.map(status => colors[status.status] || '#6b7280'),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Failed to load status chart:', error);
    }
}

// Load analytics data
async function loadAnalyticsData() {
    try {
        const response = await api.getSalesAnalytics(30);
        const analytics = response.data;
        
        const ctx = document.getElementById('categoryChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (categoryChart) {
            categoryChart.destroy();
        }
        
        const categoryData = analytics.category_performance;
        
        categoryChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: categoryData.map(cat => cat.category_name),
                datasets: [{
                    label: 'Revenue',
                    data: categoryData.map(cat => cat.revenue),
                    backgroundColor: 'rgba(99, 102, 241, 0.8)',
                    borderColor: 'rgb(99, 102, 241)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₱' + value.toLocaleString();
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Revenue: ₱' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Failed to load analytics data:', error);
    }
}

// Load customers data
async function loadCustomersData() {
    try {
        document.getElementById('customers-loading').style.display = 'flex';
        document.getElementById('customers-table').style.display = 'none';
        
        const response = await api.getCustomerInsights(10);
        const customers = response.data;
        
        const tbody = document.getElementById('customers-body');
        tbody.innerHTML = '';
        
        customers.forEach(customer => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="fw-medium">${customer.customer_name}</div>
                    <small class="text-muted">ID: ${customer.customer_id}</small>
                </td>
                <td>${customer.customer_email}</td>
                <td>${customer.total_orders}</td>
                <td>${api.formatCurrency(customer.total_spent)}</td>
                <td><small>${api.formatDate(customer.last_order_date)}</small></td>
            `;
            tbody.appendChild(row);
        });
        
        document.getElementById('customers-loading').style.display = 'none';
        document.getElementById('customers-table').style.display = 'block';
        
    } catch (error) {
        console.error('Failed to load customers data:', error);
        showError('Failed to load customer data');
    }
}

// Helper functions
function getStatusBadgeClass(status) {
    const classes = {
        'Pending': 'badge-warning',
        'Shipped': 'badge-info',
        'Delivered': 'badge-success',
        'Cancelled': 'badge-danger'
    };
    return classes[status] || 'badge-secondary';
}

function showLoading() {
    console.log('Loading...');
}

function hideLoading() {
    console.log('Loading complete');
}

function showSuccess(message) {
    showToast(message, 'success');
}

function showError(message) {
    showToast(message, 'danger');
}

function showToast(message, type = 'info') {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    toast.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
}

// Refresh dashboard
async function refreshDashboard() {
    try {
        showSuccess('Refreshing dashboard...');
        await Promise.all([
            initializeDashboard(),
            loadNotifications() // Also refresh notifications
        ]);
    } catch (error) {
        showError('Failed to refresh dashboard');
    }
}

// Auto-refresh every 5 minutes
setInterval(() => {
    Promise.all([
        api.getQuickStats().then(response => {
            updateStats(response.data);
        }),
        loadNotifications() // Also auto-refresh notifications
    ]).catch(error => {
        console.error('Auto-refresh failed:', error);
    });
}, 300000); // 5 minutes

// Test function - call this in console to test API
window.testAPI = async function() {
    try {
        console.log('Testing API...');
        const overview = await api.getDashboardOverview();
        console.log('✅ Dashboard API test successful:', overview);
        
        const notifications = await api.getNotifications();
        console.log('✅ Notifications API test successful:', notifications);
        
        showSuccess('API test successful!');
        return { overview, notifications };
    } catch (error) {
        console.error('❌ API test failed:', error);
        showError('API test failed: ' + error.message);
        return null;
    }
};

// Test notifications specifically
window.testNotifications = async function() {
    try {
        console.log('Testing notifications...');
        await loadNotifications();
        console.log('Current notifications:', notifications);
        showSuccess('Notifications loaded successfully!');
        return notifications;
    } catch (error) {
        console.error('❌ Notifications test failed:', error);
        showError('Notifications test failed: ' + error.message);
        return null;
    }
};

// Export api for console debugging
window.api = api;