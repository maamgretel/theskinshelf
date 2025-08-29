// Enhanced Admin Dashboard JavaScript - REAL DATA ONLY
    const API_URL = 'https://backend-rj0a.onrender.com';
    let currentUser = null;
    let revenueChart = null;
    let orderStatusChart = null;

    document.addEventListener('DOMContentLoaded', function() {
      console.log('DOM Content Loaded');
      
      currentUser = JSON.parse(localStorage.getItem('user'));
      
      if (!currentUser || currentUser.role !== 'admin') {
        alert('Access denied. Admin login required.');
        window.location.href = '../login.html';
        return;
      }

      initializeDashboard();
      setupEventListeners();
      
      console.log('Dashboard initialization complete');
    });

    function initializeDashboard() {
      updateAdminProfile();
      loadDashboardStats();
      loadRecentActivity();
      setTimeout(initializeCharts, 100);
    }

    function navigateToPage(page) {
      console.log('Navigating to:', page);
      window.location.href = page;
    }

    function showRevenueDetails() {
      console.log('Revenue card clicked');
      showSuccessMessage('Revenue analytics coming soon!');
    }

    function setupEventListeners() {
      console.log('Setting up event listeners');
      
      const logoutBtn = document.getElementById('logoutButton');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
          e.preventDefault();
          logout();
        });
      }

      const createAdminBtn = document.getElementById('createAdminBtn');
      if (createAdminBtn) {
        createAdminBtn.addEventListener('click', createAdmin);
      }

      console.log('Event listeners setup complete');
    }

    function logout() {
      console.log('Logout function called');
      
      if (confirm('Are you sure you want to logout?')) {
        try {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          localStorage.clear();
          window.location.href = '../login.html';
        } catch (error) {
          console.error('Error during logout:', error);
          window.location.replace('../login.html');
        }
      }
    }

    function updateAdminProfile() {
      document.getElementById('userName').textContent = currentUser.name;
      if (currentUser.profile_pic) {
        document.getElementById('profilePic').src = currentUser.profile_pic;
      }
    }

    async function loadDashboardStats() {
      try {
        console.log('Loading dashboard stats...');
        
        showLoadingState();
        
        // Load basic stats with proper error handling - FIXED: Use /users endpoint for total users
        const [usersRes, productsRes, ordersRes] = await Promise.allSettled([
          fetch(`${API_URL}/api/admin/users`, {  // Changed from /sellers to /users
            headers: getAuthHeaders()
          }),
          fetch(`${API_URL}/api/admin/products`, {
            headers: getAuthHeaders()
          }),
          fetch(`${API_URL}/api/admin/orders`, {
            headers: getAuthHeaders()
          })
        ]);

        console.log('API responses:', { usersRes, productsRes, ordersRes });

        // Handle each response separately
        let usersData = { users: [] };  // Changed from sellers to users
        let productsData = { products: [] };
        let ordersData = { orders: [] };

        if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
          usersData = await usersRes.value.json();
        } else {
          console.error('Failed to fetch users:', usersRes.reason || usersRes.value?.status);
        }

        if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
          productsData = await productsRes.value.json();
        } else {
          console.error('Failed to fetch products:', productsRes.reason || productsRes.value?.status);
        }

        if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
          ordersData = await ordersRes.value.json();
        } else {
          console.error('Failed to fetch orders:', ordersRes.reason || ordersRes.value?.status);
        }

        console.log('Processed data:', { usersData, productsData, ordersData });

        // Filter out admin users - only count sellers and customers
        const allUsers = usersData.users || [];
        const sellers = allUsers.filter(user => user.role === 'seller').length || 0;
        const customers = allUsers.filter(user => user.role === 'customer').length || 0;
        const totalUsers = sellers + customers;  // Only sellers + customers, no admins
        
        const totalProducts = productsData.products?.length || 0;
        const totalOrders = ordersData.orders?.length || 0;

        console.log(`Total users: ${totalUsers} (${sellers} sellers, ${customers} customers)`);

        // Display total users count (sellers + customers only)
        document.getElementById('totalUsers').textContent = totalUsers;
        
        // Add breakdown info as tooltip only
        const userCardElement = document.getElementById('totalUsers').closest('.stat-card') || 
                               document.getElementById('totalUsers').parentElement;
        if (userCardElement) {
          userCardElement.title = `${totalUsers} users (${customers} customers, ${sellers} sellers)`;
        }
        document.getElementById('totalProducts').textContent = totalProducts;
        document.getElementById('totalOrders').textContent = totalOrders;

        // Calculate real revenue
        const revenue = ordersData.orders?.reduce((sum, order) => {
          return sum + parseFloat(order.total_price || 0);
        }, 0) || 0;
        
        document.getElementById('totalRevenue').textContent = `₱${revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        // Calculate and show growth percentages (simplified - you can enhance this)
        updateGrowthIndicators(totalUsers, totalProducts, totalOrders, revenue);

        // Update charts with real data
        updateChartsWithRealData(ordersData.orders || []);

        hideLoadingState();

      } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showErrorState();
      }
    }

    // Add function to load detailed user stats (optional enhancement)
    async function loadDetailedUserStats() {
      try {
        const [sellersRes, customersRes] = await Promise.allSettled([
          fetch(`${API_URL}/api/admin/sellers`, {
            headers: getAuthHeaders()
          }),
          fetch(`${API_URL}/api/admin/customers`, {
            headers: getAuthHeaders()
          })
        ]);

        let sellersData = { sellers: [] };
        let customersData = { customers: [] };

        if (sellersRes.status === 'fulfilled' && sellersRes.value.ok) {
          sellersData = await sellersRes.value.json();
        }

        if (customersRes.status === 'fulfilled' && customersRes.value.ok) {
          customersData = await customersRes.value.json();
        }

        // You can use this data to show detailed breakdowns
        console.log('Detailed stats:', {
          sellers: sellersData.sellers?.length || 0,
          customers: customersData.customers?.length || 0
        });

        // Optional: Update UI with detailed stats
        updateDetailedStatsDisplay(sellersData.sellers || [], customersData.customers || []);

      } catch (error) {
        console.error('Error loading detailed user stats:', error);
      }
    }

    function updateDetailedStatsDisplay(sellers, customers) {
      // Optional: Add detailed stats to your dashboard
      // For example, you could show seller/customer breakdown in tooltips or additional cards
      const totalUsers = sellers.length + customers.length;
      
      // Update tooltip or additional info
      const userCard = document.getElementById('totalUsers').closest('.stat-card');
      if (userCard) {
        userCard.title = `Total Users: ${totalUsers} (${sellers.length} sellers, ${customers.length} customers)`;
      }
    }

    function updateGrowthIndicators(users, products, orders, revenue) {
      // For now, we'll show 0% growth since we don't have historical data
      // You can enhance this by storing previous values and calculating real growth
      
      const indicators = [
        { id: 'usersChange', value: 0 },
        { id: 'productsChange', value: 0 },
        { id: 'ordersChange', value: 0 },
        { id: 'revenueChange', value: 0 }
      ];

      indicators.forEach(indicator => {
        updateGrowthIndicator(indicator.id, indicator.value);
      });
    }

    function updateGrowthIndicator(elementId, growthValue) {
      const element = document.getElementById(elementId);
      if (!element) return;

      const isPositive = growthValue >= 0;
      const icon = isPositive ? 'fas fa-arrow-up' : 'fas fa-arrow-down';
      const colorClass = isPositive ? 'positive' : 'negative';
      
      element.className = `stat-change ${colorClass}`;
      element.innerHTML = `<i class="${icon}"></i> <span>${Math.abs(growthValue).toFixed(1)}%</span>`;
    }

    function updateChartsWithRealData(orders) {
      console.log('Updating charts with real orders data:', orders);
      
      if (!orders || orders.length === 0) {
        console.log('No orders data available for charts');
        updateChartsWithEmptyState();
        return;
      }

      // Revenue chart data (last 7 days)
      const last7Days = getLast7Days();
      const revenueData = last7Days.map(date => {
        return orders
          .filter(order => {
            const orderDate = new Date(order.order_date);
            return orderDate.toDateString() === date.toDateString();
          })
          .reduce((sum, order) => sum + parseFloat(order.total_price || 0), 0);
      });

      // Order status data
      const statusCounts = orders.reduce((acc, order) => {
        const status = order.status || 'Unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      console.log('Chart data prepared:', { last7Days, revenueData, statusCounts });

      updateRevenueChart(last7Days, revenueData);
      updateOrderStatusChart(statusCounts);
    }

    function updateChartsWithEmptyState() {
      // Show charts with zero data
      const last7Days = getLast7Days();
      const emptyRevenueData = new Array(7).fill(0);
      const emptyStatusCounts = { 'No Orders': 1 };

      updateRevenueChart(last7Days, emptyRevenueData);
      updateOrderStatusChart(emptyStatusCounts);
    }

    function initializeCharts() {
      console.log('Initializing charts...');
      
      const revenueCanvas = document.getElementById('revenueChart');
      const statusCanvas = document.getElementById('orderStatusChart');
      
      if (!revenueCanvas || !statusCanvas) {
        console.error('Canvas elements not found!');
        return;
      }

      console.log('Canvas elements found, creating charts...');

      try {
        // Initialize revenue chart
        const revenueCtx = revenueCanvas.getContext('2d');
        revenueChart = new Chart(revenueCtx, {
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
              legend: {
                display: false
              },
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

        // Initialize order status chart
        const statusCtx = statusCanvas.getContext('2d');
        orderStatusChart = new Chart(statusCtx, {
          type: 'doughnut',
          data: {
            labels: [],
            datasets: [{
              data: [],
              backgroundColor: [
                '#10b981', // Success - Delivered
                '#3b82f6', // Info - Shipped  
                '#f59e0b', // Warning - Pending
                '#ef4444'  // Danger - Cancelled
              ],
              borderWidth: 2,
              borderColor: '#fff',
              hoverOffset: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
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
                cornerRadius: 8,
                callbacks: {
                  label: function(context) {
                    const label = context.label || '';
                    const value = context.parsed;
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                    return `${label}: ${value} (${percentage}%)`;
                  }
                }
              }
            }
          }
        });

        console.log('Charts initialized successfully');

      } catch (error) {
        console.error('Error initializing charts:', error);
        
        // Fallback: Show message in chart containers
        document.querySelector('#revenueChart').parentElement.innerHTML = 
          '<div class="text-center text-muted p-4"><i class="fas fa-chart-line fa-3x mb-3"></i><h5>Revenue Chart</h5><p>Unable to load chart</p></div>';
        document.querySelector('#orderStatusChart').parentElement.innerHTML = 
          '<div class="text-center text-muted p-4"><i class="fas fa-chart-pie fa-3x mb-3"></i><h5>Order Status</h5><p>Unable to load chart</p></div>';
      }
    }

    function updateRevenueChart(dates, data) {
      if (revenueChart) {
        console.log('Updating revenue chart with:', { dates, data });
        
        revenueChart.data.labels = dates.map(date => 
          date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        );
        revenueChart.data.datasets[0].data = data;
        revenueChart.update('active');
      } else {
        console.warn('Revenue chart not initialized');
      }
    }

    function updateOrderStatusChart(statusCounts) {
      if (orderStatusChart) {
        console.log('Updating order status chart with:', statusCounts);
        
        orderStatusChart.data.labels = Object.keys(statusCounts);
        orderStatusChart.data.datasets[0].data = Object.values(statusCounts);
        orderStatusChart.update('active');
      } else {
        console.warn('Order status chart not initialized');
      }
    }

    async function loadRecentActivity() {
      try {
        console.log('Loading recent activity...');
        const response = await fetch(`${API_URL}/api/admin/orders`, {
          headers: getAuthHeaders()
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch orders: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Recent activity data:', data);
        
        // Get recent orders (last 5)
        const recentOrders = (data.orders || [])
          .sort((a, b) => new Date(b.order_date) - new Date(a.order_date))
          .slice(0, 5);

        const activityList = document.getElementById('recentActivityList');
        
        if (recentOrders.length > 0) {
          activityList.innerHTML = recentOrders.map(order => createActivityItem(order)).join('');
        } else {
          // Show no activity message
          activityList.innerHTML = `
            <div class="text-center text-muted p-4">
              <i class="fas fa-inbox fa-3x mb-3"></i>
              <h5>No Recent Activity</h5>
              <p>No recent orders found in the system</p>
            </div>
          `;
        }

      } catch (error) {
        console.error('Error loading recent activity:', error);
        document.getElementById('recentActivityList').innerHTML = 
          `<div class="text-center text-danger p-4">
            <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
            <h6>Error Loading Activity</h6>
            <p class="small">Unable to load recent activity data</p>
            <button class="btn btn-sm btn-outline-primary" onclick="loadRecentActivity()">
              <i class="fas fa-redo"></i> Retry
            </button>
          </div>`;
      }
    }

    function createActivityItem(order) {
      const date = new Date(order.order_date);
      const timeAgo = getTimeAgo(date);
      
      return `
        <div class="activity-item">
          <div class="activity-icon bg-primary text-white">
            <i class="fas fa-shopping-cart"></i>
          </div>
          <div class="activity-content flex-grow-1">
            <h6>Order #${order.id}</h6>
            <small>Customer: ${order.customer_name || 'Unknown'} • Amount: ₱${parseFloat(order.total_price || 0).toFixed(2)} • ${timeAgo}</small>
          </div>
          <span class="badge badge-${getStatusBadgeClass(order.status)}">${order.status || 'Unknown'}</span>
        </div>
      `;
    }

    async function createAdmin() {
      const name = document.getElementById('adminName').value.trim();
      const email = document.getElementById('adminEmail').value.trim();
      const password = document.getElementById('adminPassword').value;

      if (!validateAdminForm(name, email, password)) return;

      const button = document.getElementById('createAdminBtn');
      const originalText = button.innerHTML;
      button.disabled = true;
      button.innerHTML = '<span class="loading-spinner"></span> Creating...';

      try {
        const response = await fetch(`${API_URL}/api/admin/create-admin-direct`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({ name, email, password })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.message || data.success) {
          $('#addAdminModal').modal('hide');
          document.getElementById('addAdminForm').reset();
          showSuccessMessage('Admin created successfully');
          loadDashboardStats(); // Refresh stats
        } else {
          throw new Error(data.error || 'Failed to create admin');
        }
      } catch (error) {
        console.error('Error creating admin:', error);
        alert('Error creating admin: ' + error.message);
      } finally {
        button.disabled = false;
        button.innerHTML = originalText;
      }
    }

    async function exportData(type) {
      try {
        console.log(`Exporting ${type} data...`);
        showSuccessMessage(`Preparing ${type} export...`);
        
        let endpoint;
        switch (type) {
          case 'users':
            endpoint = '/api/admin/users';  // Changed to use the users endpoint
            break;
          case 'orders':
            endpoint = '/api/admin/orders';
            break;
          case 'products':
            endpoint = '/api/admin/products';
            break;
          default:
            throw new Error('Unknown export type');
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
          headers: getAuthHeaders()
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch ${type}: ${response.status}`);
        }
        
        const data = await response.json();
        
        let exportData = [];
        switch (type) {
          case 'users':
            exportData = data.users || [];  // Changed from sellers to users
            break;
          case 'orders':
            exportData = data.orders || [];
            break;
          case 'products':
            exportData = data.products || [];
            break;
        }
        
        if (exportData.length > 0) {
          downloadCSV(exportData, `${type}_export_${new Date().toISOString().split('T')[0]}.csv`);
          showSuccessMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} exported successfully (${exportData.length} records)`);
        } else {
          alert(`No ${type} data available to export`);
        }
      } catch (error) {
        console.error(`Error exporting ${type}:`, error);
        alert(`Error exporting ${type}: ` + error.message);
      }
    }

    // Utility Functions
    function getAuthHeaders() {
      return {
        'Authorization': `Bearer ${currentUser.token}`,
        'Content-Type': 'application/json',
        'X-User-ID': currentUser.id.toString()
      };
    }

    function validateAdminForm(name, email, password) {
      if (!name || !email || !password) {
        alert('Please fill in all fields');
        return false;
      }

      if (!isValidEmail(email)) {
        alert('Please enter a valid email address');
        return false;
      }

      if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return false;
      }

      return true;
    }

    function isValidEmail(email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    }

    function getLast7Days() {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        days.push(date);
      }
      return days;
    }

    function getTimeAgo(date) {
      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);
      
      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
      return `${Math.floor(diffInSeconds / 86400)} days ago`;
    }

    function getStatusBadgeClass(status) {
      const statusClasses = {
        'Pending': 'warning',
        'Shipped': 'info',
        'Delivered': 'success',
        'Cancelled': 'danger'
      };
      return statusClasses[status] || 'secondary';
    }

    function showSuccessMessage(message) {
      document.getElementById('successMessage').textContent = message;
      $('#successModal').modal('show');
    }

    function showLoadingState() {
      const loadingElements = ['totalUsers', 'totalProducts', 'totalOrders', 'totalRevenue'];
      loadingElements.forEach(id => {
        const element = document.getElementById(id);
        if (element && (element.textContent === 'Loading...' || element.textContent === '0')) {
          element.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
          element.classList.add('loading-state');
        }
      });
    }

    function hideLoadingState() {
      const loadingElements = ['totalUsers', 'totalProducts', 'totalOrders', 'totalRevenue'];
      loadingElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
          element.classList.remove('loading-state');
        }
      });
    }

    function showErrorState() {
      const errorElements = ['totalUsers', 'totalProducts', 'totalOrders', 'totalRevenue'];
      errorElements.forEach(id => {
        const element = document.getElementById(id);
        if (element && element.innerHTML.includes('spinner')) {
          element.textContent = 'Error';
          element.classList.add('error-state');
          element.classList.remove('loading-state');
        }
      });
    }

    function downloadCSV(data, filename) {
      if (!data.length) return;

      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => 
          `"${String(row[header] || '').replace(/"/g, '""')}"`
        ).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }

    // Auto-refresh data every 5 minutes
    setInterval(() => {
      console.log('Auto-refreshing dashboard data...');
      loadDashboardStats();
      loadRecentActivity();
    }, 300000);

    // Make functions available globally for onclick handlers
    window.navigateToPage = navigateToPage;
    window.showRevenueDetails = showRevenueDetails;
    window.exportData = exportData;
    window.loadRecentActivity = loadRecentActivity;