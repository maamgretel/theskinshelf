// Enhanced Admin Dashboard JavaScript - True Local Storage Caching
document.addEventListener('DOMContentLoaded', () => {
    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const user = JSON.parse(localStorage.getItem('user'));

    // Security Check
    if (!user || user.role !== 'admin') {
        alert("Access denied. You must be an admin to view this page.");
        window.location.href = 'login.html';
        return;
    }

    // Enhanced Admin Dashboard with True Local Storage
    const AdminDashboard = {
        charts: {},
        refreshInterval: null,
        isInitialized: false,
        
        // Local Storage Configuration
        STORAGE_KEYS: {
            DASHBOARD_DATA: 'admin_dashboard_cache',
            LAST_FETCH: 'admin_last_fetch',
            ANALYTICS_DATA: 'admin_analytics_cache',
            SELLERS_DATA: 'admin_sellers_cache',
            PRODUCTS_DATA: 'admin_products_cache',
            ORDERS_DATA: 'admin_orders_cache',
            CACHE_VERSION: 'admin_cache_version'
        },
        
        // Cache settings - much longer durations
        CACHE_SETTINGS: {
            DEFAULT_CACHE_TIME: 30 * 60 * 1000,     // 30 minutes default
            ORDERS_CACHE_TIME: 15 * 60 * 1000,      // 15 minutes for orders
            MAX_CACHE_AGE: 2 * 60 * 60 * 1000,      // 2 hours maximum
            CACHE_VERSION: '1.0'                     // Increment to force refresh
        },
        
        init() {
            console.log('🚀 Initializing Admin Dashboard with Local Storage...');
            this.setupEventListeners();
            this.loadDashboardFromCache();
            this.initializeCharts();
            this.setupPeriodicCheck();
            this.isInitialized = true;
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
            document.getElementById('logoutButton')?.addEventListener('click', this.logout.bind(this));

            // Force refresh button
            this.addRefreshButton();

            // Search functionality
            this.setupSearchFunctionality();
        },

        // Main loading method - prioritize local storage
        async loadDashboardFromCache() {
            const startTime = performance.now();
            
            try {
                console.log('📦 Checking local storage...');
                
                // Step 1: Try to load from cache immediately
                const cachedData = this.getFromCache();
                
                if (cachedData.isValid) {
                    console.log('✅ Loading from cache - no API call needed!');
                    this.displayData(cachedData.data);
                    this.showCacheStatus('Using cached data', 'success');
                    this.logPerformance('Cache load', startTime);
                    return; // Exit early - no API call needed!
                }
                
                // Step 2: Cache is invalid or missing - fetch from API
                console.log('🌐 Cache invalid/missing, fetching from API...');
                this.showLoadingState();
                await this.fetchAndCacheData();
                this.hideLoadingState();
                
                this.logPerformance('API fetch and cache', startTime);
                
            } catch (error) {
                console.error('❌ Error loading dashboard:', error);
                this.handleError(error);
            }
        },

        // Check if cached data is valid
        getFromCache() {
            try {
                const lastFetch = localStorage.getItem(this.STORAGE_KEYS.LAST_FETCH);
                const cacheVersion = localStorage.getItem(this.STORAGE_KEYS.CACHE_VERSION);
                const dashboardData = localStorage.getItem(this.STORAGE_KEYS.DASHBOARD_DATA);
                
                // Check if we have basic required data
                if (!lastFetch || !dashboardData) {
                    console.log('📭 No cached data found');
                    return { isValid: false, data: null };
                }
                
                // Check cache version
                if (cacheVersion !== this.CACHE_SETTINGS.CACHE_VERSION) {
                    console.log('🔄 Cache version outdated, clearing...');
                    this.clearAllCache();
                    return { isValid: false, data: null };
                }
                
                const cacheAge = Date.now() - parseInt(lastFetch);
                const maxAge = this.CACHE_SETTINGS.MAX_CACHE_AGE;
                
                // Check if cache is too old
                if (cacheAge > maxAge) {
                    console.log(`⏰ Cache too old (${Math.round(cacheAge / 60000)}min), needs refresh`);
                    return { isValid: false, data: null };
                }
                
                // Parse cached data
                const parsedData = JSON.parse(dashboardData);
                
                // Validate data structure
                if (!this.isValidDataStructure(parsedData)) {
                    console.log('🚫 Invalid data structure, clearing cache');
                    this.clearAllCache();
                    return { isValid: false, data: null };
                }
                
                console.log(`✅ Cache is valid (${Math.round(cacheAge / 60000)}min old)`);
                return { isValid: true, data: parsedData };
                
            } catch (error) {
                console.error('❌ Error reading cache:', error);
                this.clearAllCache();
                return { isValid: false, data: null };
            }
        },

        // Validate data structure
        isValidDataStructure(data) {
            return data && 
                   typeof data === 'object' && 
                   (data.analytics || (data.sellers && data.products && data.orders));
        },

        // Fetch fresh data from API and cache it
        async fetchAndCacheData() {
            try {
                console.log('🔄 Fetching fresh data from API...');
                this.showCacheStatus('Fetching fresh data...', 'info');
                
                let dashboardData = null;
                
                // Strategy 1: Try comprehensive dashboard endpoint
                try {
                    const response = await fetch(`${BACKEND_URL}/api/admin/dashboard-data`, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${user.token}`,
                            'X-User-ID': user.id.toString()
                        }
                    });

                    if (response.ok) {
                        dashboardData = await response.json();
                        console.log('✅ Got comprehensive dashboard data');
                    }
                } catch (error) {
                    console.log('⚠️ Comprehensive endpoint failed, trying individual requests...');
                }

                // Strategy 2: Individual requests if comprehensive failed
                if (!dashboardData) {
                    const [sellersRes, productsRes, ordersRes] = await Promise.all([
                        this.fetchEndpoint('/api/admin/sellers'),
                        this.fetchEndpoint('/api/admin/products'),
                        this.fetchEndpoint('/api/admin/orders')
                    ]);

                    dashboardData = {
                        sellers: sellersRes,
                        products: productsRes,
                        orders: ordersRes,
                        analytics: this.calculateAnalytics(sellersRes, productsRes, ordersRes)
                    };
                    console.log('✅ Got individual data and calculated analytics');
                }

                // Cache the data
                this.cacheData(dashboardData);
                
                // Display the data
                this.displayData(dashboardData);
                this.showCacheStatus('Data updated successfully', 'success');
                
            } catch (error) {
                console.error('❌ Error fetching data:', error);
                this.showCacheStatus('Failed to fetch data', 'error');
                throw error;
            }
        },

        // Fetch individual endpoint
        async fetchEndpoint(endpoint) {
            const response = await fetch(`${BACKEND_URL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`,
                    'X-User-ID': user.id.toString()
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch ${endpoint}: ${response.status}`);
            }

            return await response.json();
        },

        // Cache data to localStorage
        cacheData(data) {
            try {
                console.log('💾 Caching data to localStorage...');
                
                // Store main dashboard data
                localStorage.setItem(this.STORAGE_KEYS.DASHBOARD_DATA, JSON.stringify(data));
                
                // Store individual components for flexibility
                if (data.sellers) {
                    localStorage.setItem(this.STORAGE_KEYS.SELLERS_DATA, JSON.stringify(data.sellers));
                }
                if (data.products) {
                    localStorage.setItem(this.STORAGE_KEYS.PRODUCTS_DATA, JSON.stringify(data.products));
                }
                if (data.orders) {
                    localStorage.setItem(this.STORAGE_KEYS.ORDERS_DATA, JSON.stringify(data.orders));
                }
                if (data.analytics) {
                    localStorage.setItem(this.STORAGE_KEYS.ANALYTICS_DATA, JSON.stringify(data.analytics));
                }
                
                // Store cache metadata
                localStorage.setItem(this.STORAGE_KEYS.LAST_FETCH, Date.now().toString());
                localStorage.setItem(this.STORAGE_KEYS.CACHE_VERSION, this.CACHE_SETTINGS.CACHE_VERSION);
                
                console.log('✅ Data cached successfully');
                
            } catch (error) {
                console.error('❌ Error caching data:', error);
                // If localStorage is full, try to clear old data
                this.clearOldCache();
            }
        },

        // Display data in the UI
        displayData(data) {
            console.log('🎨 Updating UI with data...');
            
            const analytics = data.analytics || this.calculateAnalytics(data.sellers, data.products, data.orders);
            
            if (analytics) {
                this.updateStatCards(analytics);
                this.updateCharts(analytics);
            }

            // Update recent activity
            const orders = data.orders?.orders || data.orders || [];
            if (orders.length > 0) {
                this.updateRecentActivity(orders);
            }
        },

        // Calculate analytics from raw data
        calculateAnalytics(sellersData, productsData, ordersData) {
            if (!sellersData || !productsData || !ordersData) {
                return null;
            }

            const sellers = sellersData.sellers || sellersData || [];
            const products = productsData.products || productsData || [];
            const orders = ordersData.orders || ordersData || [];

            const totalRevenue = orders.reduce((sum, order) => 
                sum + parseFloat(order.total_price || 0), 0);

            return {
                total_users: sellers.length,
                total_products: products.length,
                total_orders: orders.length,
                total_sales: totalRevenue,
                user_growth: this.calculateGrowthRate(sellers, 'created_at'),
                product_growth: this.calculateGrowthRate(products, 'created_at'),
                order_growth: this.calculateGrowthRate(orders, 'order_date'),
                revenue_growth: this.calculateRevenueGrowth(orders),
                daily_revenue: this.calculateDailyRevenue(orders),
                order_status_distribution: this.calculateOrderStatusDistribution(orders)
            };
        },

        // Calculate growth rate
        calculateGrowthRate(data, dateField) {
            if (!data || data.length < 2) return 0;

            const now = new Date();
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());

            const thisMonth = data.filter(item => {
                const date = new Date(item[dateField]);
                return date >= lastMonth;
            }).length;

            const previousMonth = data.filter(item => {
                const date = new Date(item[dateField]);
                return date >= twoMonthsAgo && date < lastMonth;
            }).length;

            if (previousMonth === 0) return thisMonth > 0 ? 100 : 0;
            return ((thisMonth - previousMonth) / previousMonth) * 100;
        },

        calculateRevenueGrowth(orders) {
            if (!orders || orders.length < 2) return 0;

            const now = new Date();
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());

            const thisMonthRevenue = orders
                .filter(order => new Date(order.order_date) >= lastMonth)
                .reduce((sum, order) => sum + parseFloat(order.total_price || 0), 0);

            const previousMonthRevenue = orders
                .filter(order => {
                    const date = new Date(order.order_date);
                    return date >= twoMonthsAgo && date < lastMonth;
                })
                .reduce((sum, order) => sum + parseFloat(order.total_price || 0), 0);

            if (previousMonthRevenue === 0) return thisMonthRevenue > 0 ? 100 : 0;
            return ((thisMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;
        },

        calculateDailyRevenue(orders) {
            const dailyRevenue = {};
            const last7Days = [];
            
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                dailyRevenue[dateStr] = 0;
                last7Days.push(dateStr);
            }

            orders.forEach(order => {
                if (order.order_date && order.total_price) {
                    const orderDate = new Date(order.order_date).toISOString().split('T')[0];
                    if (dailyRevenue.hasOwnProperty(orderDate)) {
                        dailyRevenue[orderDate] += parseFloat(order.total_price);
                    }
                }
            });

            return last7Days.map(date => ({
                date,
                revenue: dailyRevenue[date]
            }));
        },

        calculateOrderStatusDistribution(orders) {
            const distribution = {};
            orders.forEach(order => {
                const status = order.status || 'Unknown';
                distribution[status] = (distribution[status] || 0) + 1;
            });
            return distribution;
        },

        // Force refresh - clear cache and fetch fresh data
        async forceRefresh() {
            console.log('🔄 Force refresh triggered');
            this.showLoadingState();
            this.showCacheStatus('Refreshing data...', 'info');
            
            try {
                this.clearAllCache();
                await this.fetchAndCacheData();
                this.showCacheStatus('Data refreshed!', 'success');
            } catch (error) {
                console.error('❌ Force refresh failed:', error);
                this.showCacheStatus('Refresh failed', 'error');
            } finally {
                this.hideLoadingState();
            }
        },

        // Update stat cards with animations
        updateStatCards(analytics) {
            if (!analytics) return;

            requestAnimationFrame(() => {
                this.animateCountUp('totalUsers', analytics.total_users);
                this.animateCountUp('totalProducts', analytics.total_products);
                this.animateCountUp('totalOrders', analytics.total_orders);
                
                const revenueElement = document.getElementById('totalRevenue') || document.getElementById('totalSales');
                if (revenueElement) {
                    this.animateCountUp(revenueElement.id, analytics.total_sales, true);
                }

                this.updateGrowthIndicator('usersChange', analytics.user_growth);
                this.updateGrowthIndicator('productsChange', analytics.product_growth);
                this.updateGrowthIndicator('ordersChange', analytics.order_growth);
                this.updateGrowthIndicator('revenueChange', analytics.revenue_growth);
            });
        },

        // Animate count up effect
        animateCountUp(elementId, targetValue, isCurrency = false) {
            const element = document.getElementById(elementId);
            if (!element) return;

            const startValue = parseInt(element.textContent.replace(/[^\d]/g, '')) || 0;
            const duration = 1000;
            const startTime = performance.now();

            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easedProgress = progress * progress * (3 - 2 * progress);
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

        // Update growth indicators
        updateGrowthIndicator(elementId, growthValue) {
            const element = document.getElementById(elementId);
            if (!element) return;

            const isPositive = growthValue >= 0;
            const icon = isPositive ? 'fas fa-arrow-up' : 'fas fa-arrow-down';
            const colorClass = isPositive ? 'positive' : 'negative';
            
            element.className = `stat-change ${colorClass}`;
            element.innerHTML = `<i class="${icon}"></i> <span>${Math.abs(growthValue).toFixed(1)}%</span>`;
        },

        // Update recent activity
        updateRecentActivity(orders) {
            const container = document.getElementById('recentActivityList');
            if (!container) return;

            try {
                const recentOrders = orders
                    .sort((a, b) => new Date(b.order_date) - new Date(a.order_date))
                    .slice(0, 5);

                if (recentOrders.length === 0) {
                    container.innerHTML = this.getEmptyActivityHTML();
                    return;
                }

                const fragment = document.createDocumentFragment();
                recentOrders.forEach(order => {
                    const div = document.createElement('div');
                    div.innerHTML = this.createActivityItemHTML(order);
                    fragment.appendChild(div.firstChild);
                });

                container.innerHTML = '';
                container.appendChild(fragment);

            } catch (error) {
                console.error('Error updating recent activity:', error);
                container.innerHTML = this.getErrorActivityHTML();
            }
        },

        // Create activity item HTML
        createActivityItemHTML(order) {
            const date = new Date(order.order_date);
            const timeAgo = this.getTimeAgo(date);
            const statusClass = this.getStatusClass(order.status);
            
            return `
                <div class="activity-item">
                    <div class="activity-icon bg-primary text-white">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div class="activity-content flex-grow-1">
                        <h6>Order #${order.id}</h6>
                        <small class="text-muted">
                            Customer: ${order.customer_name || 'Unknown'} • 
                            ₱${parseFloat(order.total_price || 0).toLocaleString()} • 
                            ${timeAgo}
                        </small>
                    </div>
                    <span class="badge badge-${statusClass}">${order.status}</span>
                </div>
            `;
        },

        // Initialize charts
        initializeCharts() {
            // Chart initialization code here
            console.log('📊 Initializing charts...');
        },

        // Update charts
        updateCharts(analytics) {
            if (!analytics) return;
            console.log('📊 Updating charts with analytics data');
            // Chart update code here
        },

        // Add refresh button
        addRefreshButton() {
            const header = document.querySelector('.page-header') || document.querySelector('.dashboard-header');
            if (header && !document.getElementById('forceRefreshBtn')) {
                const refreshBtn = document.createElement('button');
                refreshBtn.id = 'forceRefreshBtn';
                refreshBtn.className = 'btn btn-outline-primary btn-sm';
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
                refreshBtn.title = 'Force refresh data from server';
                refreshBtn.style.marginLeft = '10px';
                refreshBtn.addEventListener('click', () => this.forceRefresh());
                header.appendChild(refreshBtn);
            }
        },

        // Setup periodic check (much less frequent)
        setupPeriodicCheck() {
            // Check every 15 minutes if data needs updating
            this.refreshInterval = setInterval(() => {
                const cachedData = this.getFromCache();
                if (!cachedData.isValid) {
                    console.log('⏰ Periodic check: Cache invalid, fetching fresh data');
                    this.fetchAndCacheData().catch(console.error);
                }
            }, 15 * 60 * 1000); // 15 minutes
        },

        // Show cache status indicator
        showCacheStatus(message, type = 'info') {
            let indicator = document.getElementById('cacheStatus');
            
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'cacheStatus';
                indicator.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 10px 15px;
                    border-radius: 5px;
                    font-size: 14px;
                    z-index: 9999;
                    transition: all 0.3s ease;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                `;
                document.body.appendChild(indicator);
            }

            const colors = {
                success: { bg: '#10b981', color: '#fff' },
                info: { bg: '#3b82f6', color: '#fff' },
                error: { bg: '#ef4444', color: '#fff' },
                warning: { bg: '#f59e0b', color: '#fff' }
            };

            const color = colors[type] || colors.info;
            indicator.style.backgroundColor = color.bg;
            indicator.style.color = color.color;
            indicator.style.display = 'block';
            indicator.style.opacity = '1';
            indicator.textContent = message;

            // Auto hide after 3 seconds
            setTimeout(() => {
                indicator.style.opacity = '0';
                setTimeout(() => indicator.style.display = 'none', 300);
            }, 3000);
        },

        // Clear all cache
        clearAllCache() {
            console.log('🧹 Clearing all cached data...');
            Object.values(this.STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
        },

        // Clear only old cache entries
        clearOldCache() {
            try {
                // Remove items older than max age
                const keys = Object.values(this.STORAGE_KEYS);
                keys.forEach(key => {
                    const item = localStorage.getItem(key);
                    if (item && key === this.STORAGE_KEYS.LAST_FETCH) {
                        const age = Date.now() - parseInt(item);
                        if (age > this.CACHE_SETTINGS.MAX_CACHE_AGE) {
                            localStorage.removeItem(key);
                        }
                    }
                });
            } catch (error) {
                console.error('Error clearing old cache:', error);
            }
        },

        // Handle errors
        handleError(error) {
            console.error('❌ Dashboard error:', error);
            
            // Try to load any available cached data as fallback
            try {
                const dashboardData = localStorage.getItem(this.STORAGE_KEYS.DASHBOARD_DATA);
                if (dashboardData) {
                    console.log('🔄 Using fallback cached data...');
                    const data = JSON.parse(dashboardData);
                    this.displayData(data);
                    this.showCacheStatus('Using cached data (network error)', 'warning');
                    return;
                }
            } catch (cacheError) {
                console.error('❌ Fallback cache also failed:', cacheError);
            }
            
            this.showErrorState();
            this.showCacheStatus('Failed to load dashboard data', 'error');
        },

        // UI State management
        showLoadingState() {
            const statCards = document.querySelectorAll('.stat-value');
            statCards.forEach(card => {
                if (card.textContent === '0' || card.textContent.includes('Error')) {
                    card.innerHTML = '<div class="loading-spinner"></div>';
                }
            });
        },

        hideLoadingState() {
            // Loading will be replaced by animations
        },

        showErrorState() {
            const statCards = document.querySelectorAll('.stat-value');
            statCards.forEach(card => {
                if (card.innerHTML.includes('loading-spinner')) {
                    card.textContent = 'Error';
                    card.style.color = '#ef4444';
                }
            });
        },

        // Setup search functionality
        setupSearchFunctionality() {
            const searchInput = document.getElementById('dashboardSearch');
            if (searchInput) {
                searchInput.addEventListener('input', this.debounce((e) => {
                    this.handleSearch(e.target.value);
                }, 300));
            }
        },

        handleSearch(query) {
            // Implement search functionality
            console.log('🔍 Searching for:', query);
        },

        // Create admin
        async createAdmin() {
            const name = document.getElementById('adminName')?.value.trim();
            const email = document.getElementById('adminEmail')?.value.trim();
            const password = document.getElementById('adminPassword')?.value;

            if (!name || !email || !password) {
                alert('Please fill in all fields');
                return;
            }

            const button = document.getElementById('createAdminBtn');
            const originalHTML = button.innerHTML;
            
            try {
                button.disabled = true;
                button.innerHTML = '<span class="loading-spinner"></span> Creating...';

                const response = await fetch(`${BACKEND_URL}/api/admin/create-admin-direct`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user.token}`,
                        'X-User-ID': user.id.toString()
                    },
                    body: JSON.stringify({ name, email, password })
                });

                if (!response.ok) {
                    throw new Error('Failed to create admin');
                }

                $('#addAdminModal').modal('hide');
                document.getElementById('addAdminForm').reset();
                this.showCacheStatus('Admin created successfully!', 'success');
                
                // Clear users cache to refresh data
                localStorage.removeItem(this.STORAGE_KEYS.SELLERS_DATA);
                
            } catch (error) {
                console.error('Error creating admin:', error);
                alert('Failed to create admin: ' + error.message);
            } finally {
                button.disabled = false;
                button.innerHTML = originalHTML;
            }
        },

        // Export data
        async exportData(type) {
            try {
                this.showCacheStatus(`Exporting ${type}...`, 'info');
                
                const response = await fetch(`${BACKEND_URL}/api/admin/export/${type}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user.token}`,
                        'X-User-ID': user.id.toString()
                    }
                });
                
                if (!response.ok) throw new Error('Export failed');
                
                const data = await response.json();
                this.downloadCSV(data, `${type}_export_${new Date().toISOString().split('T')[0]}.csv`);
                this.showCacheStatus(`${type} exported successfully!`, 'success');
                
            } catch (error) {
                console.error(`Error exporting ${type}:`, error);
                this.showCacheStatus(`Failed to export ${type}`, 'error');
            }
        },

        // Download CSV
        downloadCSV(data, filename) {
            if (!data || data.length === 0) return;
            
            const headers = Object.keys(data[0]);
            const csvContent = [
                headers.join(','),
                ...data.map(row => headers.map(header => {
                    const value = row[header] || '';
                    return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
                        ? `"${value.replace(/"/g, '""')}"` : value;
                }).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            link.href = url;
            link.download = filename;
            link.click();
            
            window.URL.revokeObjectURL(url);
        },

        // Logout
        logout() {
            if (confirm('Are you sure you want to logout?')) {
                this.clearAllCache();
                localStorage.removeItem('user');
                window.location.href = '../pages/login.html';
            }
        },

        // Utility functions
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
                    <button class="btn btn-sm btn-outline-primary" onclick="AdminDashboard.forceRefresh()">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
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

        logPerformance(operation, startTime) {
            const endTime = performance.now();
            const duration = endTime - startTime;
            const color = duration < 100 ? '🟢' : duration < 500 ? '🟡' : '🔴';
            console.log(`${color} ${operation}: ${duration.toFixed(2)}ms`);
        },

        // Cleanup methods
        stopAutoRefresh() {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
                this.refreshInterval = null;
            }
        },

        cleanup() {
            this.stopAutoRefresh();
            // Remove event listeners if needed
        }
    };

    // Initialize dashboard
    const initStart = performance.now();
    AdminDashboard.init();
    AdminDashboard.logPerformance('🚀 Dashboard initialization', initStart);

    // Make AdminDashboard available globally
    window.AdminDashboard = AdminDashboard;

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            AdminDashboard.stopAutoRefresh();
        } else {
            AdminDashboard.setupPeriodicCheck();
            // Quick check when tab becomes visible
            setTimeout(() => {
                const cachedData = AdminDashboard.getFromCache();
                if (!cachedData.isValid) {
                    console.log('👁️ Tab visible: Cache invalid, refreshing...');
                    AdminDashboard.fetchAndCacheData().catch(console.error);
                }
            }, 1000);
        }
    });

    // Handle storage events (cross-tab synchronization)
    window.addEventListener('storage', (e) => {
        if (e.key && e.key.includes('admin_')) {
            console.log('🔄 Storage updated in another tab, refreshing UI...');
            const cachedData = AdminDashboard.getFromCache();
            if (cachedData.isValid) {
                AdminDashboard.displayData(cachedData.data);
            }
        }
    });

    // Network status handling
    window.addEventListener('online', () => {
        console.log('🌐 Network restored');
        AdminDashboard.showCacheStatus('Network restored', 'success');
        // Check if cache needs updating when back online
        const cachedData = AdminDashboard.getFromCache();
        if (!cachedData.isValid) {
            AdminDashboard.fetchAndCacheData().catch(console.error);
        }
    });

    window.addEventListener('offline', () => {
        console.log('📡 Network lost - using cached data');
        AdminDashboard.showCacheStatus('Offline - using cached data', 'warning');
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        AdminDashboard.cleanup();
    });

    // Add CSS styles for the interface
    const styles = document.createElement('style');
    styles.textContent = `
        /* Loading spinner animation */
        .loading-spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #007bff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* Stat change indicators */
        .stat-change {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 0.875rem;
            font-weight: 600;
            margin-top: 4px;
        }
        
        .stat-change.positive {
            color: #10b981;
        }
        
        .stat-change.negative {
            color: #ef4444;
        }
        
        /* Activity items */
        .activity-item {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            border-bottom: 1px solid #e5e7eb;
            gap: 12px;
            transition: background-color 0.2s ease;
        }
        
        .activity-item:hover {
            background-color: #f8fafc;
        }
        
        .activity-item:last-child {
            border-bottom: none;
        }
        
        .activity-icon {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            flex-shrink: 0;
        }
        
        .activity-content {
            flex-grow: 1;
            min-width: 0;
        }
        
        .activity-content h6 {
            margin: 0 0 4px 0;
            font-size: 14px;
            font-weight: 600;
            color: #1f2937;
        }
        
        .activity-content small {
            font-size: 12px;
            color: #6b7280;
            line-height: 1.3;
        }
        
        /* Status badges */
        .badge-warning { 
            background-color: #f59e0b; 
            color: white;
        }
        .badge-info { 
            background-color: #3b82f6; 
            color: white;
        }
        .badge-success { 
            background-color: #10b981; 
            color: white;
        }
        .badge-danger { 
            background-color: #ef4444; 
            color: white;
        }
        .badge-secondary { 
            background-color: #6b7280; 
            color: white;
        }
        
        /* Stat cards hover effect */
        .stat-card {
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        /* Cache status indicator */
        #cacheStatus {
            font-weight: 500;
            backdrop-filter: blur(10px);
        }
        
        /* Force refresh button */
        #forceRefreshBtn {
            position: relative;
            overflow: hidden;
        }
        
        #forceRefreshBtn:hover {
            transform: translateY(-1px);
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
            #cacheStatus {
                top: 10px;
                right: 10px;
                font-size: 12px;
                padding: 8px 10px;
            }
            
            .activity-item {
                padding: 10px 12px;
            }
            
            .activity-icon {
                width: 32px;
                height: 32px;
                font-size: 12px;
            }
        }
        
        /* Loading state for stat cards */
        .stat-value {
            min-height: 1.5em;
            display: flex;
            align-items: center;
            justify-content: flex-start;
        }
        
        /* Empty state styling */
        .text-center.text-muted i {
            opacity: 0.5;
        }
        
        /* Error state styling */
        .text-center.text-danger i {
            color: #ef4444;
        }
        
        /* Smooth transitions */
        .stat-card, .activity-item, .badge {
            transition: all 0.2s ease;
        }
    `;
    document.head.appendChild(styles);

    // Console log for debugging
    console.log('✅ Enhanced Admin Dashboard with True Local Storage initialized');
    console.log('📝 Cache settings:', AdminDashboard.CACHE_SETTINGS);
    console.log('🔑 Storage keys:', AdminDashboard.STORAGE_KEYS);
});y