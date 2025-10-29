// js/customers.js - Dedicated script for customers page
// BACKEND_URL is already declared in shared.js, so we don't redeclare it

class CustomersPageAPI {
    constructor(baseURL, userId) {
        this.baseURL = baseURL;
        this.userId = userId;
    }

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
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
            const contentType = response.headers.get('content-type') || '';
            
            let data = null;
            if (contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                console.warn(`Non-JSON response from ${endpoint}. Response:`, text);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            if (!response.ok) {
                const message = (data && (data.message || data.error)) || `HTTP ${response.status}`;
                throw new Error(message);
            }

            return data;
        } catch (error) {
            console.error(`Error calling ${endpoint}:`, error);
            throw error;
        }
    }

    async getCustomerInsights(limit = 10) {
        return await this.apiCall(`/api/seller/dashboard/customers?limit=${limit}`);
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

let customersAPI;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Customers page loaded, initializing...');
    
    // Get seller ID
    const sellerId = sessionStorage.getItem('sellerId');
    if (!sellerId) {
        console.error('No seller ID found, redirecting to login');
        window.location.href = 'login.html';
        return;
    }
    
    console.log('Seller ID found:', sellerId);
    // Use BACKEND_URL from shared.js
    customersAPI = new CustomersPageAPI(BACKEND_URL, sellerId);
    
    // Load customers data immediately
    console.log('Loading customers data...');
    loadCustomersData();
});

// Load customers data
async function loadCustomersData() {
    console.log('loadCustomersData called');
    
    try {
        // Show loading state
        const loadingEl = document.getElementById('customers-loading');
        const tableEl = document.getElementById('customers-table');
        
        if (loadingEl) loadingEl.style.display = 'flex';
        if (tableEl) tableEl.style.display = 'none';
        
        console.log('Fetching customer insights...');
        const response = await customersAPI.getCustomerInsights(10);
        console.log('API Response:', response);
        
        const customers = response.data;
        console.log('Customers data:', customers);
        
        const tbody = document.getElementById('customers-body');
        if (!tbody) {
            console.error('customers-body element not found!');
            return;
        }
        
        tbody.innerHTML = '';
        
        if (!customers || customers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No customers found</td></tr>';
            console.log('No customers to display');
        } else {
            console.log(`Displaying ${customers.length} customers`);
            customers.forEach((customer, index) => {
                console.log(`Adding customer ${index + 1}:`, customer);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <div class="fw-medium">${customer.customer_name}</div>
                        <small class="text-muted">ID: ${customer.customer_id}</small>
                    </td>
                    <td>${customer.customer_email}</td>
                    <td>${customer.total_orders}</td>
                    <td>${customersAPI.formatCurrency(customer.total_spent)}</td>
                    <td><small>${customersAPI.formatDate(customer.last_order_date)}</small></td>
                `;
                tbody.appendChild(row);
            });
        }
        
        // Hide loading, show table
        if (loadingEl) loadingEl.style.display = 'none';
        if (tableEl) tableEl.style.display = 'block';
        
        console.log('Customers loaded successfully');
        showSuccess(`Loaded ${customers.length} customers`);
        
    } catch (error) {
        console.error('Failed to load customers data:', error);
        
        // Hide loading
        const loadingEl = document.getElementById('customers-loading');
        if (loadingEl) loadingEl.style.display = 'none';
        
        showError('Failed to load customer data: ' + error.message);
    }
}

function showError(message) {
    console.error('Error:', message);
    const toast = document.createElement('div');
    toast.className = 'alert alert-danger alert-dismissible fade show position-fixed';
    toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    toast.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
}

function showSuccess(message) {
    console.log('Success:', message);
    const toast = document.createElement('div');
    toast.className = 'alert alert-success alert-dismissible fade show position-fixed';
    toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    toast.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 3000);
}

// Make loadCustomersData global for the refresh button
window.loadCustomersData = loadCustomersData;

console.log('customers.js loaded successfully');