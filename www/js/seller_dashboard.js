document.addEventListener('DOMContentLoaded', () => {
  const BACKEND_URL = 'https://backend-rj0a.onrender.com';
  const user = JSON.parse(localStorage.getItem('user'));

  // Debug logging function
  function debugLog(message, data = null) {
    console.log(`[SELLER DASHBOARD DEBUG] ${message}`, data);
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
      debugLog('Fetch URL:', url);
      debugLog('Headers:', { 'X-User-ID': user.id });

      // Add loading indicator
      const container = document.getElementById('productListRow');
      container.innerHTML = '<div class="col-12 text-center"><div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div><p class="mt-2">Loading products...</p></div>';

      const response = await fetch(url, {
        headers: { 
          'X-User-ID': user.id,
          'Content-Type': 'application/json'
        }
      });

      debugLog('Response status:', response.status);
      debugLog('Response ok:', response.ok);
      debugLog('Response headers:', Object.fromEntries(response.headers.entries()));

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
            <button class="btn btn-primary btn-sm" onclick="location.reload()">Try Again</button>
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
    } else if (stockNum <= 5) { // Low stock threshold
      return {
        status: 'low-stock',
        badgeClass: 'badge-warning',
        cardClass: 'border-warning',
        stockText: `Low Stock: ${stockNum} ⚠️`,
        alert: stockNum <= 3 // Alert for very low stock (3 or less)
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
      
      // Count stock issues for alerts
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

    // Show stock alerts
    showStockAlerts(outOfStockCount, lowStockCount);
    debugLog('Products rendered successfully');
  }

  // --- Show stock alerts ---
  function showStockAlerts(outOfStockCount, lowStockCount) {
    // Remove existing alerts
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
      const response = await fetch(`${BACKEND_URL}/api/categories`);
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

  // --- Notification badge ---
  async function checkNotifications() {
    debugLog('Checking notifications...');
    try {
      const response = await fetch(`${BACKEND_URL}/api/notifications/unread-count`, {
        headers: { 'X-User-ID': user.id }
      });
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
      debugLog('Notification check failed:', e);
      // Ignore errors silently
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
      const response = await fetch(`${BACKEND_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      debugLog('Backend health check:', {
        status: response.status,
        ok: response.ok,
        url: response.url
      });
    } catch (error) {
      debugLog('Backend connection test failed:', error);
    }
  }

  // --- Initial load ---
  debugLog('Starting initial load sequence...');
  
  // Test connection first
  testBackendConnection();
  
  // Load data
  loadCategories();
  fetchSellerProducts();
  checkNotifications();
  setInterval(checkNotifications, 30000);

  debugLog('Initialization complete');

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
  
  // Use vanilla JavaScript instead of jQuery
  const modal = document.getElementById('addStockModal');
  if (typeof bootstrap !== 'undefined') {
    // Bootstrap 5
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
  } else if (typeof $ !== 'undefined') {
    // Bootstrap 4 with jQuery
    $('#addStockModal').modal('show');
  } else {
    // Fallback - show modal manually
    modal.style.display = 'block';
    modal.classList.add('show');
    document.body.classList.add('modal-open');
    
    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    backdrop.id = 'modal-backdrop';
    document.body.appendChild(backdrop);
  }
}

// Handle Add Stock
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

    const response = await fetch(`${BACKEND_URL}/api/seller/add-stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': user.id
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log(`[DEBUG] Add stock response:`, result);
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to add stock');
    }

    alert(`Successfully added ${stockToAdd} items to stock. New total: ${result.new_stock}`);
    
    // Close modal using vanilla JavaScript
    const modal = document.getElementById('addStockModal');
    if (typeof bootstrap !== 'undefined') {
      // Bootstrap 5
      const bootstrapModal = bootstrap.Modal.getInstance(modal);
      bootstrapModal.hide();
    } else if (typeof $ !== 'undefined') {
      // Bootstrap 4 with jQuery
      $('#addStockModal').modal('hide');
    } else {
      // Fallback - hide modal manually
      modal.style.display = 'none';
      modal.classList.remove('show');
      document.body.classList.remove('modal-open');
      
      // Remove backdrop
      const backdrop = document.getElementById('modal-backdrop');
      if (backdrop) backdrop.remove();
    }
    
    // Refresh the products list to show updated stock
    location.reload();

  } catch (error) {
    console.error('Add stock error:', error);
    alert(`Error adding stock: ${error.message}`);
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = '<i class="fas fa-plus"></i> Add Stock';
  }
}

// Close Modal Function
function closeModal() {
  const modal = document.getElementById('addStockModal');
  if (typeof bootstrap !== 'undefined') {
    // Bootstrap 5
    const bootstrapModal = bootstrap.Modal.getInstance(modal);
    if (bootstrapModal) bootstrapModal.hide();
  } else if (typeof $ !== 'undefined') {
    // Bootstrap 4 with jQuery
    $('#addStockModal').modal('hide');
  } else {
    // Fallback - hide modal manually
    modal.style.display = 'none';
    modal.classList.remove('show');
    document.body.classList.remove('modal-open');
    
    // Remove backdrop
    const backdrop = document.getElementById('modal-backdrop');
    if (backdrop) backdrop.remove();
  }
}

// Outside listener for inline onclick
function deleteProduct(productId, productName) {
  console.log(`[DEBUG] Delete product called:`, { productId, productName });
  if (confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
    alert(`Product with ID ${productId} would be deleted. (Add backend logic)`);
  }
}