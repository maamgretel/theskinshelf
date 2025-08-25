document.addEventListener('DOMContentLoaded', () => {
  const BACKEND_URL = 'https://backend-rj0a.onrender.com';
  const user = JSON.parse(localStorage.getItem('user'));

  // Debug logging function
  function debugLog(message, data = null) {
    console.log(`[SELLER DASHBOARD DEBUG] ${message}`, data);
  }

  // Enhanced fetch function with better error handling and CORS support
  async function safeFetch(url, options = {}) {
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': user?.id
      }
    };

    // Merge options
    const fetchOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };

    // Add credentials for CORS
    fetchOptions.credentials = 'omit'; // Try without credentials first

    debugLog('Safe fetch request:', { url, options: fetchOptions });

    try {
      const response = await fetch(url, fetchOptions);
      debugLog('Safe fetch response:', {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      return response;
    } catch (error) {
      debugLog('Safe fetch error:', error);
      
      // If it's a CORS error, try with different approach
      if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
        debugLog('Attempting CORS workaround...');
        
        // Try without custom headers for GET requests
        if (!options.method || options.method === 'GET') {
          const simpleOptions = {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit'
          };
          
          try {
            return await fetch(url, simpleOptions);
          } catch (secondError) {
            debugLog('CORS workaround failed:', secondError);
          }
        }
      }
      
      throw error;
    }
  }

  debugLog('Page loaded, starting initialization...');
  debugLog('Backend URL:', BACKEND_URL);
  debugLog('User from localStorage:', user);

  if (!user || user.role !== 'seller') {
    debugLog('User validation failed', { user, role: user?.role });
    localStorage.clear();
    alert('Access Denied. Please log in as a seller.');
    window.location.href = 'login.html';
    return;
  }

  debugLog('User validation passed');

  document.getElementById('userName').textContent = user.name;
  const profilePic = document.getElementById('profilePic');
  profilePic.src = user.profile_pic || '../assets/default-avatar.png';

  // --- Load products with optional filters ---
  async function fetchSellerProducts(filters = {}) {
    debugLog('Starting fetchSellerProducts', filters);
    
    try {
      const params = new URLSearchParams(filters);
      const url = `${BACKEND_URL}/api/seller/products?${params}`;

      // Add loading indicator
      const container = document.getElementById('productListRow');
      container.innerHTML = '<div class="col-12 text-center"><div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div><p class="mt-2">Loading products...</p></div>';

      const response = await safeFetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        debugLog('Error response text:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const products = await response.json();
      debugLog('Products received:', products);
      debugLog('Products count:', products.length);
      
      renderProducts(products);
    } catch (err) {
      debugLog('Fetch error details:', {
        name: err.name,
        message: err.message,
        stack: err.stack
      });
      console.error('Fetch error:', err);
      
      const container = document.getElementById('productListRow');
      container.innerHTML = `
        <div class="col-12">
          <div class="alert alert-danger">
            <h5>Could not load products</h5>
            <p><strong>Error:</strong> ${err.message}</p>
            <p><strong>Possible causes:</strong></p>
            <ul>
              <li>Backend server is down or unreachable</li>
              <li>Network connectivity issues</li>
              <li>CORS policy blocking the request</li>
              <li>Invalid user authentication</li>
            </ul>
            <div class="mt-3">
              <button class="btn btn-primary btn-sm me-2" onclick="location.reload()">Try Again</button>
              <button class="btn btn-info btn-sm" onclick="testBackendDirectly()">Test Backend</button>
            </div>
          </div>
        </div>
      `;
    }
  }

  // --- Get stock status and styling ---
  function getStockStatus(stock) {
    const stockNum = parseInt(stock) || 0;
    
    if (stockNum === 0) {
      return {
        status: 'out-of-stock',
        badgeClass: 'badge-danger',
        cardClass: 'border-danger',
        stockText: 'Out of Stock ⚠️',
        alert: true
      };
    } else if (stockNum <= 5) {
      return {
        status: 'low-stock',
        badgeClass: 'badge-warning',
        cardClass: 'border-warning',
        stockText: `Low Stock: ${stockNum} ⚠️`,
        alert: stockNum <= 3
      };
    } else {
      return {
        status: 'in-stock',
        badgeClass: 'badge-success',
        cardClass: '',
        stockText: `Stock: ${stockNum}`,
        alert: false
      };
    }
  }

  // --- Display products ---
  function renderProducts(products) {
    debugLog('Rendering products', { count: products.length });
    const container = document.getElementById('productListRow');
    container.innerHTML = '';

    if (!products.length) {
      container.innerHTML = `
        <div class="col-12 text-center">
          <div class="alert alert-info">
            <h5>No products found</h5>
            <p>You haven't added any products yet, or no products match your current filters.</p>
            <a href="add_product.html" class="btn btn-primary">Add Your First Product</a>
          </div>
        </div>
      `;
      return;
    }

    let outOfStockCount = 0;
    let lowStockCount = 0;

    products.forEach((p, index) => {
      debugLog(`Rendering product ${index + 1}:`, p);
      
      const productImage = p.image || '../assets/default-product.png';
      const productPrice = parseFloat(p.price).toFixed(2);
      const stockInfo = getStockStatus(p.stock);
      
      if (stockInfo.status === 'out-of-stock') outOfStockCount++;
      if (stockInfo.status === 'low-stock') lowStockCount++;

      const cardHTML = `
        <div class="col-md-4 product-card">
          <div class="card mb-4 shadow-sm ${stockInfo.cardClass}" ${stockInfo.status === 'out-of-stock' ? 'style="box-shadow: 0 0 15px rgba(220, 53, 69, 0.3) !important;"' : ''}>
            <div class="card-body text-center">
              ${stockInfo.status === 'out-of-stock' ? '<div class="position-absolute" style="top: 10px; right: 10px; font-size: 24px; color: #dc3545;">❗</div>' : ''}
              <img src="${productImage}" alt="${p.name}" class="img-fluid mb-2" ${stockInfo.status === 'out-of-stock' ? 'style="opacity: 0.6; filter: grayscale(50%);"' : ''} />
              <h5 class="card-title">${p.name}</h5>
              <p class="mb-2"><span class="badge badge-info">${p.category_name || 'No Category'}</span></p>
              <p class="card-text text-muted">${p.description || ''}</p>
              <strong>₱${productPrice}</strong><br />
              <small class="badge ${stockInfo.badgeClass} mt-1">${stockInfo.stockText}</small><br />
              <div class="mt-2">
                <a href="edit_product.html?id=${p.id}" class="btn btn-sm btn-warning">✏️ Edit</a>
                <button class="btn btn-sm btn-success" onclick="openAddStockModal(${p.id}, '${p.name}', ${p.stock})">📦 Add Stock</button>
                <a href="#" class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id}, '${p.name}')">🗑 Delete</a>
              </div>
            </div>
          </div>
        </div>
      `;
      container.innerHTML += cardHTML;
    });

    showStockAlerts(outOfStockCount, lowStockCount);
    debugLog('Products rendered successfully');
  }

  // --- Show stock alerts ---
  function showStockAlerts(outOfStockCount, lowStockCount) {
    const existingAlerts = document.querySelectorAll('.stock-alert');
    existingAlerts.forEach(alert => alert.remove());

    const container = document.getElementById('productListRow').parentElement;
    
    if (outOfStockCount > 0 || lowStockCount > 0) {
      const alertContainer = document.createElement('div');
      alertContainer.className = 'stock-alert mb-4';
      
      let alertHTML = '';
      
      if (outOfStockCount > 0) {
        alertHTML += `
          <div class="alert alert-danger d-flex align-items-center" role="alert">
            <strong>⚠️ Stock Alert:</strong>&nbsp;
            <span>${outOfStockCount} product${outOfStockCount > 1 ? 's are' : ' is'} out of stock and need immediate restocking!</span>
          </div>
        `;
      }
      
      if (lowStockCount > 0) {
        alertHTML += `
          <div class="alert alert-warning d-flex align-items-center" role="alert">
            <strong>📦 Low Stock:</strong>&nbsp;
            <span>${lowStockCount} product${lowStockCount > 1 ? 's have' : ' has'} low stock levels. Consider restocking soon.</span>
          </div>
        `;
      }
      
      alertContainer.innerHTML = alertHTML;
      container.insertBefore(alertContainer, document.getElementById('productListRow'));
    }
  }

  // --- Load category options ---
  async function loadCategories() {
    debugLog('Loading categories...');
    try {
      const response = await safeFetch(`${BACKEND_URL}/api/categories`);
      debugLog('Categories response status:', response.status);
      
      if (!response.ok) return;
      
      const categories = await response.json();
      debugLog('Categories loaded:', categories);
      
      const categoryFilter = document.getElementById('categoryFilter');
      categories.forEach((cat) => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        categoryFilter.appendChild(option);
      });
    } catch (err) { 
      debugLog('Failed to load categories:', err);
      console.warn('Failed to load categories:', err);
    }
  }

  // --- Apply filters ---
  document.getElementById('applyFiltersBtn').addEventListener('click', () => {
    const search = document.getElementById('searchInput').value.trim();
    const category = document.getElementById('categoryFilter').value;
    debugLog('Applying filters:', { search, category_id: category });
    fetchSellerProducts({ search, category_id: category });
  });

  // --- Notification badge with better error handling ---
  async function checkNotifications() {
    debugLog('Checking notifications...');
    try {
      const response = await safeFetch(`${BACKEND_URL}/api/notifications/unread-count`);
      
      if (!response.ok) {
        debugLog('Notifications endpoint not available:', response.status);
        return; // Silently fail if notifications aren't implemented
      }
      
      const data = await response.json();
      debugLog('Notifications data:', data);
      
      const badge = document.getElementById('notifBadge');
      if (data.count > 0) {
        badge.style.display = 'inline-block';
        badge.textContent = data.count > 9 ? '9+' : data.count;
      } else {
        badge.style.display = 'none';
      }
    } catch (e) {
      debugLog('Notification check failed (will retry):', e);
      // Silently ignore errors for notifications
    }
  }

  // --- Logout ---
  document.getElementById('logoutButton').addEventListener('click', (e) => {
    e.preventDefault();
    debugLog('User logging out');
    localStorage.clear();
    window.location.href = 'login.html';
  });

  // --- Test backend connectivity ---
  async function testBackendConnection() {
    debugLog('Testing backend connection...');
    try {
      // Try multiple endpoints to test connectivity
      const endpoints = ['/health', '/api/health', '/'];
      
      for (const endpoint of endpoints) {
        try {
          const response = await safeFetch(`${BACKEND_URL}${endpoint}`);
          debugLog(`Backend test ${endpoint}:`, {
            status: response.status,
            ok: response.ok,
            url: response.url
          });
          
          if (response.ok) {
            debugLog(`Backend is reachable via ${endpoint}`);
            return true;
          }
        } catch (error) {
          debugLog(`Backend test ${endpoint} failed:`, error);
          continue;
        }
      }
      
      debugLog('All backend connectivity tests failed');
      return false;
    } catch (error) {
      debugLog('Backend connection test failed:', error);
      return false;
    }
  }

  // Global function for testing backend directly
  window.testBackendDirectly = async function() {
    const isConnected = await testBackendConnection();
    if (isConnected) {
      alert('✅ Backend is reachable! Try refreshing the page.');
    } else {
      alert('❌ Cannot reach backend server. Please check:\n\n1. Backend server is running\n2. CORS is properly configured\n3. Network connection is stable');
    }
  };

  // --- Initial load with better error handling ---
  debugLog('Starting initial load sequence...');
  
  async function initializeDashboard() {
    try {
      // Test connection first
      const isConnected = await testBackendConnection();
      if (!isConnected) {
        debugLog('Backend connection failed during initialization');
        // Continue anyway - individual functions will handle their own errors
      }
      
      // Load data with error handling for each
      await Promise.allSettled([
        loadCategories(),
        fetchSellerProducts(),
        checkNotifications()
      ]);
      
      // Set up periodic notification checks (less frequent to reduce load)
      setInterval(checkNotifications, 60000); // Check every minute instead of 30 seconds
      
      debugLog('Initialization complete');
    } catch (error) {
      debugLog('Initialization error:', error);
    }
  }

  // Start initialization
  initializeDashboard();

  // --- Create Stock Management Modal ---
  function createStockModal() {
    const modalHTML = `
      <div class="modal fade" id="addStockModal" tabindex="-1" role="dialog" aria-labelledby="addStockModalLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="addStockModalLabel">Add Stock</h5>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close" onclick="closeModal()">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <form id="addStockForm">
                <div class="form-group">
                  <label for="modalProductName">Product:</label>
                  <input type="text" class="form-control" id="modalProductName" readonly>
                </div>
                <div class="form-group">
                  <label for="modalCurrentStock">Current Stock:</label>
                  <input type="text" class="form-control" id="modalCurrentStock" readonly>
                </div>
                <div class="form-group">
                  <label for="modalStockToAdd">Stock to Add: <span class="text-danger">*</span></label>
                  <input type="number" class="form-control" id="modalStockToAdd" min="1" required>
                  <small class="form-text text-muted">Enter the number of items to add to your inventory.</small>
                </div>
                <div class="form-group">
                  <label for="modalNewTotalStock">New Total Stock:</label>
                  <input type="text" class="form-control" id="modalNewTotalStock" readonly>
                </div>
                <div class="form-group">
                  <label for="modalStockNote">Note (Optional):</label>
                  <textarea class="form-control" id="modalStockNote" rows="2" placeholder="Add a note about this stock addition..."></textarea>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
              <button type="button" class="btn btn-success" id="confirmAddStock">
                <i class="fas fa-plus"></i> Add Stock
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add event listeners for the modal
    document.addEventListener('input', (e) => {
      if (e.target.id === 'modalStockToAdd') {
        const currentStock = parseInt(document.getElementById('modalCurrentStock').value) || 0;
        const stockToAdd = parseInt(e.target.value) || 0;
        document.getElementById('modalNewTotalStock').value = currentStock + stockToAdd;
      }
    });

    document.addEventListener('click', async (e) => {
      if (e.target.id === 'confirmAddStock') {
        await handleAddStock();
      }
    });
  }

  // Create modal on page load
  createStockModal();

  // Make safeFetch available globally for stock management
  window.safeFetch = safeFetch;
});

// Global variables for stock management
let currentProductId = null;

// Open Add Stock Modal
function openAddStockModal(productId, productName, currentStock) {
  console.log(`[DEBUG] Opening stock modal for:`, { productId, productName, currentStock });
  
  currentProductId = productId;
  document.getElementById('modalProductName').value = productName;
  document.getElementById('modalCurrentStock').value = currentStock;
  document.getElementById('modalStockToAdd').value = '';
  document.getElementById('modalNewTotalStock').value = currentStock;
  document.getElementById('modalStockNote').value = '';
  
  const modal = document.getElementById('addStockModal');
  if (typeof bootstrap !== 'undefined') {
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
  } else if (typeof $ !== 'undefined') {
    $('#addStockModal').modal('show');
  } else {
    modal.style.display = 'block';
    modal.classList.add('show');
    document.body.classList.add('modal-open');
    
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    backdrop.id = 'modal-backdrop';
    document.body.appendChild(backdrop);
  }
}

// Handle Add Stock with better error handling
async function handleAddStock() {
  const stockToAdd = parseInt(document.getElementById('modalStockToAdd').value);
  const note = document.getElementById('modalStockNote').value.trim();
  const user = JSON.parse(localStorage.getItem('user'));
  const BACKEND_URL = 'https://backend-rj0a.onrender.com';
  
  if (!stockToAdd || stockToAdd < 1) {
    alert('Please enter a valid amount of stock to add.');
    return;
  }

  const confirmBtn = document.getElementById('confirmAddStock');
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

  try {
    const payload = {
      product_id: currentProductId,
      stock_to_add: stockToAdd,
      note: note
    };

    console.log(`[DEBUG] Adding stock:`, payload);

    // Use the safeFetch function for better CORS handling
    let response = await window.safeFetch(`${BACKEND_URL}/api/seller/add-stock`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    let result;
    
    if (!response.ok) {
      console.log(`[DEBUG] add-stock endpoint failed (${response.status}), trying fallback method...`);
      
      // Fallback: Use the existing edit product endpoint
      const currentStock = parseInt(document.getElementById('modalCurrentStock').value) || 0;
      const newStock = currentStock + stockToAdd;
      
      const formData = new FormData();
      formData.append('stock', newStock.toString());
      if (note) {
        formData.append('note', `Added ${stockToAdd} items. Note: ${note}`);
      }
      
      response = await window.safeFetch(`${BACKEND_URL}/products/${currentProductId}`, {
        method: 'POST',
        body: formData,
        headers: {} // Remove Content-Type for FormData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`[DEBUG] Fallback failed:`, errorText);
        throw new Error(`Failed to update stock: ${response.status} ${errorText}`);
      }
      
      result = await response.json();
      result.new_stock = newStock;
      console.log(`[DEBUG] Fallback successful:`, result);
    } else {
      result = await response.json();
    }
    
    console.log(`[DEBUG] Add stock response:`, result);
    
    alert(`Successfully added ${stockToAdd} items to stock. New total: ${result.new_stock}`);
    
    // Close modal
    const modal = document.getElementById('addStockModal');
    if (typeof bootstrap !== 'undefined') {
      const bootstrapModal = bootstrap.Modal.getInstance(modal);
      bootstrapModal.hide();
    } else if (typeof $ !== 'undefined') {
      $('#addStockModal').modal('hide');
    } else {
      modal.style.display = 'none';
      modal.classList.remove('show');
      document.body.classList.remove('modal-open');
      
      const backdrop = document.getElementById('modal-backdrop');
      if (backdrop) backdrop.remove();
    }
    
    // Refresh the products list
    location.reload();

  } catch (error) {
    console.error('Add stock error:', error);
    
    let errorMessage = 'Failed to add stock. ';
    if (error.message.includes('CORS')) {
      errorMessage += 'CORS configuration issue. Please contact system administrator.';
    } else if (error.message.includes('Failed to fetch')) {
      errorMessage += 'Network error. Please check your connection and try again.';
    } else {
      errorMessage += error.message;
    }
    
    alert(errorMessage);
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = '<i class="fas fa-plus"></i> Add Stock';
  }
}

// Close Modal Function
function closeModal() {
  const modal = document.getElementById('addStockModal');
  if (typeof bootstrap !== 'undefined') {
    const bootstrapModal = bootstrap.Modal.getInstance(modal);
    if (bootstrapModal) bootstrapModal.hide();
  } else if (typeof $ !== 'undefined') {
    $('#addStockModal').modal('hide');
  } else {
    modal.style.display = 'none';
    modal.classList.remove('show');
    document.body.classList.remove('modal-open');
    
    const backdrop = document.getElementById('modal-backdrop');
    if (backdrop) backdrop.remove();
  }
}

// Delete product function
function deleteProduct(productId, productName) {
  console.log(`[DEBUG] Delete product called:`, { productId, productName });
  if (confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
    // You'll need to implement the actual delete logic here
    alert(`Product deletion would be implemented here for ID: ${productId}`);
  }
}