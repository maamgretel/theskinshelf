
        // Seller Dashboard API - Embedded directly
        class SellerDashboardAPI {
            constructor(baseURL = 'https://backend-rj0a.onrender.com', userId = null) {
                this.baseURL = baseURL;
                this.userId = userId;
            }

            setUserId(userId) {
                this.userId = userId;
            }

            getHeaders() {
                const headers = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Origin': window.location.origin
                };
                
                if (this.userId) {
                    headers['X-User-ID'] = this.userId.toString();
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

                    const response = await fetch(url, config);
                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
                    }

                    return data;

                } catch (error) {
                    console.error(`Error calling ${endpoint}:`, error);
                    throw error;
                }
            }

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
        }

        // Global variables
        let api;
        let salesChart, statusChart, categoryChart;
        const SELLER_ID = 4; // Replace with dynamic seller ID

        // Initialize dashboard
        document.addEventListener('DOMContentLoaded', function() {
            api = new SellerDashboardAPI('https://backend-rj0a.onrender.com', SELLER_ID);
            initializeDashboard();
            setupEventListeners();
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
            document.getElementById('sidebarToggle')?.addEventListener('click', function() {
                document.querySelector('.sidebar').classList.toggle('show');
            });
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
                showError('Failed to load dashboard data. Please refresh the page.');
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
            
            // Update notification badge
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
            // Add loading overlay if needed
            console.log('Loading...');
        }

        function hideLoading() {
            // Remove loading overlay if needed
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
                await initializeDashboard();
            } catch (error) {
                showError('Failed to refresh dashboard');
            }
        }

        // Auto-refresh every 5 minutes
        setInterval(() => {
            api.getQuickStats().then(response => {
                updateStats(response.data);
            }).catch(error => {
                console.error('Auto-refresh failed:', error);
            });
        }, 300000); // 5 minutes

        // Test function - call this in console to test API
        window.testAPI = async function() {
            try {
                console.log('Testing API...');
                const overview = await api.getDashboardOverview();
                console.log('✅ API test successful:', overview);
                showSuccess('API test successful!');
                return overview;
            } catch (error) {
                console.error('❌ API test failed:', error);
                showError('API test failed: ' + error.message);
                return null;
            }
        };

        // Export api for console debugging
        window.api = api;
