// Enhanced Admin Dashboard JavaScript
document.addEventListener('DOMContentLoaded', () => {
    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const user = JSON.parse(localStorage.getItem('user'));

    // Security Check
    if (!user || user.role !== 'admin') {
        alert("Access denied. You must be an admin to view this page.");
        window.location.href = 'login.html';
        return;
    }

    // Initialize Dashboard
    const AdminDashboard = {
        charts: {},
        refreshInterval: null,
        
        init() {
            this.setupEventListeners();
            this.loadDashboardData();
            this.initializeCharts();
            this.startAutoRefresh();
        },

        setupEventListeners() {
            // Modal triggers
            document.getElementById('addAdminBtn')?.addEventListener('click', () => {
                $('#addAdminModal').modal('show');
            });

            // Form submissions
            document.getElementById('createAdminBtn')?.addEventListener('click', this.createAdmin.bind(this));
            
            // Export buttons
            document.getElementById('exportUsersBtn')?.addEventListener('click', () => this.exportData('users'));
            document.getElementById('exportOrdersBtn')?.addEventListener('click', () => this.exportData('orders'));
            document.getElementById('exportProductsBtn')?.addEventListener('click', () => this.exportData('products'));

            // Logout
            document.getElementById('logoutButton')?.addEventListener('click', this.logout);

            // Stat card click-to-refresh
            document.querySelectorAll('.stat-card').forEach(card => {
                card.addEventListener('click', () => {
                    this.animateCardRefresh(card);
                    this.loadDashboardData();
                });
            });

            // Search functionality
            this.setupSearchFunctionality();
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

        async loadDashboardData() {
            try {
                this.showLoadingState();
                
                // Load comprehensive dashboard data
                const dashboardData = await this.fetchData('/api/admin/dashboard-data');
                
                if (dashboardData.analytics) {
                    this.updateStatCards(dashboardData.analytics);
                    this.updateCharts(dashboardData.analytics);
                }

                // Load individual data for fallback
                await this.loadIndividualData();
                
                this.hideLoadingState();
            } catch (error) {
                console.error('Error loading dashboard data:', error);
                this.showErrorState();
                await this.loadIndividualData(); // Fallback to individual endpoints
            }
        },

        async loadIndividualData() {
            try {
                const [sellersData, productsData, ordersData] = await Promise.all([
                    this.fetchData('/api/admin/sellers'),
                    this.fetchData('/api/admin/products'),
                    this.fetchData('/api/admin/orders')
                ]);

                // Update basic stats if dashboard endpoint failed
                if (!document.getElementById('totalUsers').textContent.includes('Error')) {
                    this.updateBasicStats(sellersData, productsData, ordersData);
                }

                // Load recent activity
                this.loadRecentActivity(ordersData.orders || []);
                
            } catch (error) {
                console.error('Error loading individual data:', error);
                this.showErrorState();
            }
        },

        updateStatCards(analytics) {
            // Update stat values with animations
            this.animateCountUp('totalUsers', analytics.total_users);
            this.animateCountUp('totalProducts', analytics.total_products);
            this.animateCountUp('totalOrders', analytics.total_orders);
            
            // Format and update revenue
            const revenueElement = document.getElementById('totalRevenue') || document.getElementById('totalSales');
            if (revenueElement) {
                this.animateCountUp(revenueElement.id, analytics.total_sales, true);
            }

            // Update growth indicators
            this.updateGrowthIndicator('usersChange', analytics.user_growth);
            this.updateGrowthIndicator('productsChange', analytics.product_growth);
            this.updateGrowthIndicator('ordersChange', analytics.order_growth);
            this.updateGrowthIndicator('revenueChange', analytics.revenue_growth);
        },

        updateBasicStats(sellersData, productsData, ordersData) {
            const totalUsers = sellersData.sellers?.length || 0;
            const totalProducts = productsData.products?.length || 0;
            const totalOrders = ordersData.orders?.length || 0;
            const totalRevenue = ordersData.orders?.reduce((sum, order) => 
                sum + parseFloat(order.total_price || 0), 0) || 0;

            this.animateCountUp('totalUsers', totalUsers);
            this.animateCountUp('totalProducts', totalProducts);
            this.animateCountUp('totalOrders', totalOrders);
            
            const revenueElement = document.getElementById('totalRevenue') || document.getElementById('totalSales');
            if (revenueElement) {
                this.animateCountUp(revenueElement.id, totalRevenue, true);
            }
        },

        animateCountUp(elementId, targetValue, isCurrency = false) {
            const element = document.getElementById(elementId);
            if (!element) return;

            const startValue = parseInt(element.textContent.replace(/[^\d]/g, '')) || 0;
            const duration = 1000;
            const startTime = performance.now();

            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing function
                const easedProgress = 1 - Math.pow(1 - progress, 3);
                
                const currentValue = Math.round(startValue + (targetValue - startValue) * easedProgress);
                
                if (isCurrency) {
                    element.textContent = `₱${currentValue.toLocaleString()}.00`;
                } else {
                    element.textContent = currentValue.toLocaleString();
                }

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);
        },

        updateGrowthIndicator(elementId, growthValue) {
            const element = document.getElementById(elementId);
            if (!element) return;

            const isPositive = growthValue >= 0;
            const icon = isPositive ? 'fas fa-arrow-up' : 'fas fa-arrow-down';
            const colorClass = isPositive ? 'positive' : 'negative';
            
            element.className = `stat-change ${colorClass}`;
            element.innerHTML = `<i class="${icon}"></i> <span>${Math.abs(growthValue).toFixed(1)}%</span>`;
        },

        initializeCharts() {
            // Initialize revenue chart
            const revenueCtx = document.getElementById('revenueChart')?.getContext('2d');
            if (revenueCtx) {
                this.charts.revenue = new Chart(revenueCtx, {
                    type: 'line',
                    data: {
                        labels: [],
                        datasets: [{
                            label: 'Revenue (₱)',
                            data: [],
                            borderColor: '#6366f1',
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            tension: 0.4,
                            fill: true,
                            pointBackgroundColor: '#6366f1',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2,
                            pointRadius: 5
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                backgroundColor: 'rgba(0,0,0,0.8)',
                                titleColor: '#fff',
                                bodyColor: '#fff',
                                borderColor: '#6366f1',
                                borderWidth: 1,
                                cornerRadius: 8,
                                callbacks: {
                                    label: function(context) {
                                        return 'Revenue: ₱' + context.parsed.y.toLocaleString();
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                grid: { display: false },
                                ticks: { color: '#6b7280' }
                            },
                            y: {
                                beginAtZero: true,
                                grid: { color: 'rgba(0,0,0,0.1)' },
                                ticks: {
                                    color: '#6b7280',
                                    callback: function(value) {
                                        return '₱' + value.toLocaleString();
                                    }
                                }
                            }
                        },
                        interaction: {
                            intersect: false,
                            mode: 'index'
                        }
                    }
                });
            }

            // Initialize order status chart
            const statusCtx = document.getElementById('orderStatusChart')?.getContext('2d');
            if (statusCtx) {
                this.charts.orderStatus = new Chart(statusCtx, {
                    type: 'doughnut',
                    data: {
                        labels: [],
                        datasets: [{
                            data: [],
                            backgroundColor: [
                                '#10b981', // Success - Delivered
                                '#f59e0b', // Warning - Pending
                                '#3b82f6', // Info - Shipped
                                '#ef4444'  // Danger - Cancelled
                            ],
                            borderWidth: 2,
                            borderColor: '#fff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        cutout: '60%',
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    padding: 20,
                                    usePointStyle: true,
                                    font: { size: 12 }
                                }
                            },
                            tooltip: {
                                backgroundColor: 'rgba(0,0,0,0.8)',
                                titleColor: '#fff',
                                bodyColor: '#fff',
                                borderColor: '#6366f1',
                                borderWidth: 1,
                                cornerRadius: 8
                            }
                        }
                    }
                });
            }
        },

        updateCharts(analytics) {
            // Update revenue chart
            if (this.charts.revenue && analytics.daily_revenue) {
                const labels = analytics.daily_revenue.map(item => 
                    new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                );
                const data = analytics.daily_revenue.map(item => item.revenue);
                
                this.charts.revenue.data.labels = labels;
                this.charts.revenue.data.datasets[0].data = data;
                this.charts.revenue.update('active');
            }

            // Update order status chart
            if (this.charts.orderStatus && analytics.order_status_distribution) {
                const statusData = analytics.order_status_distribution;
                this.charts.orderStatus.data.labels = Object.keys(statusData);
                this.charts.orderStatus.data.datasets[0].data = Object.values(statusData);
                this.charts.orderStatus.update('active');
            }
        },

        async loadRecentActivity(orders = []) {
            const activityContainer = document.getElementById('recentActivityList');
            if (!activityContainer) return;

            try {
                // If no orders provided, fetch them
                if (!orders.length) {
                    const ordersData = await this.fetchData('/api/admin/orders');
                    orders = ordersData.orders || [];
                }

                // Get recent orders (last 5)
                const recentOrders = orders
                    .sort((a, b) => new Date(b.order_date) - new Date(a.order_date))
                    .slice(0, 5);

                if (recentOrders.length === 0) {
                    activityContainer.innerHTML = this.getEmptyActivityHTML();
                    return;
                }

                activityContainer.innerHTML = recentOrders
                    .map(order => this.createActivityItemHTML(order))
                    .join('');

            } catch (error) {
                console.error('Error loading recent activity:', error);
                activityContainer.innerHTML = this.getErrorActivityHTML();
            }
        },

        createActivityItemHTML(order) {
            const date = new Date(order.order_date);
            const timeAgo = this.getTimeAgo(date);
            const statusClass = this.getStatusClass(order.status);
            
            return `
                <div class="activity-item" data-order-id="${order.id}">
                    <div class="activity-icon bg-primary text-white">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div class="activity-content flex-grow-1">
                        <h6>New Order #${order.id}</h6>
                        <small class="text-muted">
                            Customer: ${order.customer_name || 'Unknown'} • 
                            Amount: ₱${parseFloat(order.total_price || 0).toLocaleString()} • 
                            ${timeAgo}
                        </small>
                    </div>
                    <span class="badge badge-${statusClass}">${order.status}</span>
                </div>
            `;
        },

        getEmptyActivityHTML() {
            return `
                <div class="text-center text-muted p-4">
                    <i class="fas fa-inbox fa-3x mb-3"></i>
                    <h5>No Recent Activity</h5>
                    <p>No recent orders found</p>
                </div>
            `;
        },

        getErrorActivityHTML() {
            return `
                <div class="text-center text-danger p-4">
                    <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                    <h6>Error Loading Activity</h6>
                    <button class="btn btn-sm btn-outline-primary" onclick="AdminDashboard.loadRecentActivity()">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        },

        async createAdmin() {
            const name = document.getElementById('adminName')?.value.trim();
            const email = document.getElementById('adminEmail')?.value.trim();
            const password = document.getElementById('adminPassword')?.value;

            if (!this.validateAdminForm(name, email, password)) return;

            const button = document.getElementById('createAdminBtn');
            const originalHTML = button.innerHTML;
            
            try {
                button.disabled = true;
                button.innerHTML = '<span class="loading-spinner"></span> Creating...';

                await this.fetchData('/api/admin/create-admin-direct', {
                    method: 'POST',
                    body: JSON.stringify({ name, email, password })
                });

                // Success
                $('#addAdminModal').modal('hide');
                document.getElementById('addAdminForm').reset();
                this.showSuccessMessage('Admin created successfully!');
                
                // Refresh dashboard data
                this.loadDashboardData();

            } catch (error) {
                console.error('Error creating admin:', error);
                this.showErrorMessage(error.message || 'Failed to create admin');
            } finally {
                button.disabled = false;
                button.innerHTML = originalHTML;
            }
        },

        validateAdminForm(name, email, password) {
            if (!name || !email || !password) {
                this.showErrorMessage('Please fill in all fields');
                return false;
            }

            if (!this.isValidEmail(email)) {
                this.showErrorMessage('Please enter a valid email address');
                return false;
            }

            if (password.length < 6) {
                this.showErrorMessage('Password must be at least 6 characters long');
                return false;
            }

            return true;
        },

        async exportData(type) {
            try {
                this.showLoadingToast(`Exporting ${type}...`);
                
                const data = await this.fetchData(`/api/admin/export/${type}`);
                
                if (data && Array.isArray(data) && data.length > 0) {
                    this.downloadCSV(data, `${type}_export_${new Date().toISOString().split('T')[0]}.csv`);
                    this.showSuccessMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} exported successfully!`);
                } else {
                    this.showErrorMessage(`No ${type} data available to export`);
                }
                
            } catch (error) {
                console.error(`Error exporting ${type}:`, error);
                this.showErrorMessage(`Failed to export ${type}: ${error.message}`);
            }
        },

        downloadCSV(data, filename) {
            if (!data.length) return;

            const headers = Object.keys(data[0]);
            const csvContent = [
                headers.join(','),
                ...data.map(row => headers.map(header => {
                    const value = row[header] || '';
                    // Escape quotes and wrap in quotes if contains comma, quote, or newline
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

        setupSearchFunctionality() {
            // Add search functionality if search elements exist
            const searchInput = document.getElementById('dashboardSearch');
            if (searchInput) {
                searchInput.addEventListener('input', this.debounce((e) => {
                    this.handleSearch(e.target.value);
                }, 300));
            }
        },

        handleSearch(query) {
            // Implement search functionality for dashboard items
            const activityItems = document.querySelectorAll('.activity-item');
            const lowerQuery = query.toLowerCase();

            activityItems.forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(lowerQuery) ? 'flex' : 'none';
            });
        },

        startAutoRefresh() {
            // Auto-refresh every 5 minutes
            this.refreshInterval = setInterval(() => {
                this.loadDashboardData();
            }, 5 * 60 * 1000);
        },

        stopAutoRefresh() {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
                this.refreshInterval = null;
            }
        },

        // UI State Management
        showLoadingState() {
            const statValues = document.querySelectorAll('.stat-value');
            statValues.forEach(el => {
                if (el.textContent !== '0') return; // Don't override existing values
                el.innerHTML = '<div class="loading-spinner"></div>';
            });
        },

        hideLoadingState() {
            // Loading state will be hidden by the count-up animations
        },

        showErrorState() {
            const statValues = document.querySelectorAll('.stat-value');
            statValues.forEach(el => {
                if (el.innerHTML.includes('loading-spinner')) {
                    el.textContent = 'Error';
                    el.style.color = '#ef4444';
                }
            });
        },

        animateCardRefresh(card) {
            card.style.transform = 'scale(0.98)';
            card.style.opacity = '0.7';
            
            setTimeout(() => {
                card.style.transform = 'scale(1)';
                card.style.opacity = '1';
            }, 200);
        },

        // Utility Functions
        getTimeAgo(date) {
            const now = new Date();
            const diffInSeconds = Math.floor((now - date) / 1000);
            
            if (diffInSeconds < 60) return 'Just now';
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
            return `${Math.floor(diffInSeconds / 86400)}d ago`;
        },

        getStatusClass(status) {
            const statusClasses = {
                'Pending': 'warning',
                'Shipped': 'info',
                'Delivered': 'success',
                'Cancelled': 'danger'
            };
            return statusClasses[status] || 'secondary';
        },

        isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
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
        },

        // Message Functions
        showSuccessMessage(message) {
            const modal = document.getElementById('successModal');
            const messageEl = document.getElementById('successMessage');
            
            if (modal && messageEl) {
                messageEl.textContent = message;
                $(modal).modal('show');
            } else {
                // Fallback to alert
                alert(message);
            }
        },

        showErrorMessage(message) {
            // You can implement a custom error modal or use alert
            alert(message);
        },

        showLoadingToast(message) {
            // Implement loading toast notification
            console.log(message); // Placeholder
        },

        logout() {
            if (confirm('Are you sure you want to logout?')) {
                this.stopAutoRefresh();
                localStorage.removeItem('user');
                window.location.href = '../login.html';
            }
        }
    };

    // Initialize dashboard
    AdminDashboard.init();

    // Make AdminDashboard available globally for onclick handlers
    window.AdminDashboard = AdminDashboard;

    // Handle page visibility change to pause/resume auto-refresh
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            AdminDashboard.stopAutoRefresh();
        } else {
            AdminDashboard.startAutoRefresh();
        }
    });

    // Handle window unload to clean up
    window.addEventListener('beforeunload', () => {
        AdminDashboard.stopAutoRefresh();
    });
});