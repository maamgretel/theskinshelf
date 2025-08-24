// Admin Orders JavaScript
document.addEventListener('DOMContentLoaded', () => {
    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const user = JSON.parse(localStorage.getItem('user'));

    // Security Check
    if (!user || user.role !== 'admin') {
        alert("Access denied. You must be an admin to view this page.");
        window.location.href = 'login.html';
        return;
    }

    // Orders Management
    const OrdersManager = {
        orders: [],
        filteredOrders: [],
        currentPage: 1,
        itemsPerPage: 10,
        
        init() {
            this.setupEventListeners();
            this.loadOrders();
        },

        setupEventListeners() {
            // Search functionality
            const searchInput = document.getElementById('searchOrders');
            if (searchInput) {
                searchInput.addEventListener('input', this.debounce((e) => {
                    this.handleSearch(e.target.value);
                }, 300));
            }

            // Status filter
            const statusFilter = document.getElementById('statusFilter');
            if (statusFilter) {
                statusFilter.addEventListener('change', () => {
                    this.handleStatusFilter(statusFilter.value);
                });
            }

            // Date filter
            const dateFilter = document.getElementById('dateFilter');
            if (dateFilter) {
                dateFilter.addEventListener('change', () => {
                    this.handleDateFilter(dateFilter.value);
                });
            }

            // Refresh button
            const refreshBtn = document.getElementById('refreshOrders');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    this.loadOrders();
                });
            }

            // Export button
            const exportBtn = document.getElementById('exportOrders');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => {
                    this.exportOrders();
                });
            }
        },

        async fetchData(endpoint, options = {}) {
            try {
                const response = await fetch(`${BACKEND_URL}${endpoint}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user.token}`,
                        'X-User-ID': user.id.toString(),
                        ...options.headers
                    },
                    ...options
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Server error: ${response.status}`);
                }
                
                return await response.json();
            } catch (error) {
                console.error(`Error fetching from ${endpoint}:`, error);
                throw error;
            }
        },

        async loadOrders() {
            try {
                this.showLoadingState();
                
                const data = await this.fetchData('/api/admin/orders');
                
                if (data && data.orders) {
                    this.orders = data.orders;
                    this.filteredOrders = [...this.orders];
                    this.updateOrdersTable();
                    this.updateOrdersStats();
                } else {
                    this.showEmptyState();
                }
                
            } catch (error) {
                console.error('Error loading orders:', error);
                this.showErrorState(error.message);
            }
        },

        updateOrdersTable() {
            const tbody = document.getElementById('orderTableBody');
            if (!tbody) return;

            if (this.filteredOrders.length === 0) {
                tbody.innerHTML = this.getEmptyOrdersHTML();
                return;
            }

            // Calculate pagination
            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            const paginatedOrders = this.filteredOrders.slice(startIndex, endIndex);

            tbody.innerHTML = paginatedOrders
                .map(order => this.createOrderRowHTML(order))
                .join('');

            this.updatePaginationInfo();
        },

        createOrderRowHTML(order) {
            const date = new Date(order.order_date);
            const formattedDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const statusBadgeClass = this.getStatusBadgeClass(order.status);
            const totalPrice = parseFloat(order.total_price || 0).toLocaleString();

            return `
                <tr class="order-row" data-order-id="${order.id}">
                    <td class="order-id">#${order.id}</td>
                    <td class="customer-info">
                        <div class="customer-name">${order.customer_name || 'Unknown'}</div>
                        <small class="text-muted">ID: ${order.customer_id}</small>
                    </td>
                    <td class="product-info">
                        <div class="product-name">${order.product_name || 'Unknown Product'}</div>
                        <small class="text-muted">by ${order.seller_name || 'Unknown Seller'}</small>
                    </td>
                    <td class="order-total">₱${totalPrice}</td>
                    <td class="order-status">
                        <span class="badge ${statusBadgeClass}">${order.status}</span>
                    </td>
                    <td class="order-date">
                        <div>${formattedDate}</div>
                        <small class="text-muted">${this.getTimeAgo(date)}</small>
                    </td>
                    <td class="order-actions">
                        <div class="btn-group btn-group-sm" role="group">
                            <button type="button" class="btn btn-outline-primary" 
                                    onclick="OrdersManager.viewOrderDetails(${order.id})" 
                                    title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button type="button" class="btn btn-outline-secondary" 
                                    onclick="OrdersManager.updateOrderStatus(${order.id}, '${order.status}')" 
                                    title="Update Status">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        },

        getEmptyOrdersHTML() {
            return `
                <tr>
                    <td colspan="7" class="empty-state">
                        <div class="text-center py-5">
                            <i class="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
                            <h5 class="text-muted">No Orders Found</h5>
                            <p class="text-muted">No orders match your current filters.</p>
                            <button class="btn btn-outline-primary" onclick="OrdersManager.clearFilters()">
                                Clear Filters
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        },

        updateOrdersStats() {
            const totalOrders = this.orders.length;
            const pendingOrders = this.orders.filter(o => o.status === 'Pending').length;
            const totalRevenue = this.orders.reduce((sum, order) => 
                sum + parseFloat(order.total_price || 0), 0
            );

            // Update stats if elements exist
            this.updateStatElement('totalOrdersCount', totalOrders);
            this.updateStatElement('pendingOrdersCount', pendingOrders);
            this.updateStatElement('totalRevenueAmount', `₱${totalRevenue.toLocaleString()}`);
        },

        updateStatElement(elementId, value) {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = value;
            }
        },

        handleSearch(query) {
            if (!query.trim()) {
                this.filteredOrders = [...this.orders];
            } else {
                const lowerQuery = query.toLowerCase();
                this.filteredOrders = this.orders.filter(order => 
                    order.id.toString().includes(lowerQuery) ||
                    (order.customer_name && order.customer_name.toLowerCase().includes(lowerQuery)) ||
                    (order.product_name && order.product_name.toLowerCase().includes(lowerQuery)) ||
                    (order.seller_name && order.seller_name.toLowerCase().includes(lowerQuery))
                );
            }
            
            this.currentPage = 1;
            this.updateOrdersTable();
        },

        handleStatusFilter(status) {
            if (status === 'all') {
                this.filteredOrders = [...this.orders];
            } else {
                this.filteredOrders = this.orders.filter(order => 
                    order.status.toLowerCase() === status.toLowerCase()
                );
            }
            
            this.currentPage = 1;
            this.updateOrdersTable();
        },

        handleDateFilter(period) {
            const now = new Date();
            let filteredByDate = [...this.orders];

            switch (period) {
                case 'today':
                    filteredByDate = this.orders.filter(order => {
                        const orderDate = new Date(order.order_date);
                        return orderDate.toDateString() === now.toDateString();
                    });
                    break;
                case 'week':
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    filteredByDate = this.orders.filter(order => 
                        new Date(order.order_date) >= weekAgo
                    );
                    break;
                case 'month':
                    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    filteredByDate = this.orders.filter(order => 
                        new Date(order.order_date) >= monthAgo
                    );
                    break;
                default:
                    filteredByDate = [...this.orders];
            }

            this.filteredOrders = filteredByDate;
            this.currentPage = 1;
            this.updateOrdersTable();
        },

        clearFilters() {
            // Reset all filters
            const searchInput = document.getElementById('searchOrders');
            const statusFilter = document.getElementById('statusFilter');
            const dateFilter = document.getElementById('dateFilter');

            if (searchInput) searchInput.value = '';
            if (statusFilter) statusFilter.value = 'all';
            if (dateFilter) dateFilter.value = 'all';

            this.filteredOrders = [...this.orders];
            this.currentPage = 1;
            this.updateOrdersTable();
        },

        async viewOrderDetails(orderId) {
            const order = this.orders.find(o => o.id === orderId);
            if (!order) return;

            // You can implement a modal or redirect to order details page
            alert(`Order Details:\n\nOrder ID: #${order.id}\nCustomer: ${order.customer_name}\nProduct: ${order.product_name}\nTotal: ₱${order.total_price}\nStatus: ${order.status}\nDate: ${order.order_date}`);
        },

        async updateOrderStatus(orderId, currentStatus) {
            const newStatus = prompt(`Update status for Order #${orderId}:\n\nCurrent Status: ${currentStatus}\n\nEnter new status (Pending, Shipped, Delivered, Cancelled):`);
            
            if (!newStatus || newStatus === currentStatus) return;

            const validStatuses = ['Pending', 'Shipped', 'Delivered', 'Cancelled'];
            if (!validStatuses.includes(newStatus)) {
                alert('Invalid status. Please use: Pending, Shipped, Delivered, or Cancelled');
                return;
            }

            try {
                await this.fetchData(`/api/admin/orders/${orderId}/status`, {
                    method: 'PUT',
                    body: JSON.stringify({ status: newStatus })
                });

                // Update local data
                const order = this.orders.find(o => o.id === orderId);
                if (order) {
                    order.status = newStatus;
                    order.status_color = this.getStatusColor(newStatus);
                }

                this.updateOrdersTable();
                this.updateOrdersStats();
                
                alert(`Order #${orderId} status updated to ${newStatus}`);
                
            } catch (error) {
                console.error('Error updating order status:', error);
                alert('Failed to update order status: ' + error.message);
            }
        },

        async exportOrders() {
            try {
                const data = await this.fetchData('/api/admin/export/orders');
                
                if (data && Array.isArray(data) && data.length > 0) {
                    this.downloadCSV(data, `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
                    alert('Orders exported successfully!');
                } else {
                    alert('No order data available to export');
                }
                
            } catch (error) {
                console.error('Error exporting orders:', error);
                alert('Failed to export orders: ' + error.message);
            }
        },

        downloadCSV(data, filename) {
            if (!data.length) return;

            const headers = Object.keys(data[0]);
            const csvContent = [
                headers.join(','),
                ...data.map(row => headers.map(header => {
                    const value = row[header] || '';
                    if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            window.URL.revokeObjectURL(url);
        },

        updatePaginationInfo() {
            const totalPages = Math.ceil(this.filteredOrders.length / this.itemsPerPage);
            const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
            const endItem = Math.min(this.currentPage * this.itemsPerPage, this.filteredOrders.length);
            
            const paginationInfo = document.getElementById('paginationInfo');
            if (paginationInfo) {
                paginationInfo.textContent = `Showing ${startItem}-${endItem} of ${this.filteredOrders.length} orders`;
            }
        },

        // UI State Management
        showLoadingState() {
            const tbody = document.getElementById('orderTableBody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-5">
                            <div class="spinner-border spinner-border-sm me-2" role="status">
                                <span class="sr-only">Loading...</span>
                            </div>
                            Loading orders...
                        </td>
                    </tr>
                `;
            }
        },

        showEmptyState() {
            const tbody = document.getElementById('orderTableBody');
            if (tbody) {
                tbody.innerHTML = this.getEmptyOrdersHTML();
            }
        },

        showErrorState(message) {
            const tbody = document.getElementById('orderTableBody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-5">
                            <div class="text-danger">
                                <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                                <h6>Error Loading Orders</h6>
                                <p>${message}</p>
                                <button class="btn btn-outline-primary" onclick="OrdersManager.loadOrders()">
                                    <i class="fas fa-redo"></i> Retry
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }
        },

        // Utility Functions
        getStatusBadgeClass(status) {
            const statusClasses = {
                'Pending': 'badge-warning',
                'Shipped': 'badge-info',
                'Delivered': 'badge-success',
                'Cancelled': 'badge-danger'
            };
            return statusClasses[status] || 'badge-secondary';
        },

        getStatusColor(status) {
            const statusColors = {
                'Pending': 'warning',
                'Shipped': 'info',
                'Delivered': 'success',
                'Cancelled': 'danger'
            };
            return statusColors[status] || 'secondary';
        },

        getTimeAgo(date) {
            const now = new Date();
            const diffInSeconds = Math.floor((now - date) / 1000);
            
            if (diffInSeconds < 60) return 'Just now';
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
            return `${Math.floor(diffInSeconds / 86400)}d ago`;
        },

        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
    };

    // Initialize Orders Manager
    OrdersManager.init();

    // Make OrdersManager available globally for onclick handlers
    window.OrdersManager = OrdersManager;
});