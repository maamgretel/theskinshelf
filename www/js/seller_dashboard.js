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

    // Merge options, but don't override Content-Type for FormData
    const fetchOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };

    // Remove Content-Type header for FormData requests to let browser set it
    if (options.body instanceof FormData) {
      delete fetchOptions.headers['Content-Type'];
    }

    // Add credentials for CORS
    fetchOptions.credentials = 'omit';

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
      
      if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
        debugLog('Attempting CORS workaround...');
        
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
                <button class="btn btn-sm btn-warning" onclick="openEditProductModal(${p.id})">✏️ Edit</button>
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

      const editCategoryDropdown = document.getElementById('editCategoryDropdown');
      if (editCategoryDropdown) {
        editCategoryDropdown.innerHTML = '<option value="">Select a Category</option>';
        categories.forEach((cat) => {
          const option = document.createElement('option');
          option.value = cat.id;
          option.textContent = cat.name;
          editCategoryDropdown.appendChild(option);
        });
      }
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
        return;
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
      const isConnected = await testBackendConnection();
      if (!isConnected) {
        debugLog('Backend connection failed during initialization');
      }
      
      await Promise.allSettled([
        loadCategories(),
        fetchSellerProducts(),
        checkNotifications()
      ]);
      
      setInterval(checkNotifications, 60000);
      
      debugLog('Initialization complete');
    } catch (error) {
      debugLog('Initialization error:', error);
    }
  }

  initializeDashboard();

  // --- Create Stock Management Modal with Add/Subtract Tabs ---
  function createStockModal() {
    const modalHTML = `
      <div class="modal fade" id="addStockModal" tabindex="-1" role="dialog" aria-labelledby="addStockModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="addStockModalLabel">Manage Stock</h5>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close" onclick="closeModal('addStockModal')">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <!-- Product Info -->
              <div class="row mb-3">
                <div class="col-md-6">
                  <label for="modalProductName">Product:</label>
                  <input type="text" class="form-control" id="modalProductName" readonly>
                </div>
                <div class="col-md-6">
                  <label for="modalCurrentStock">Current Stock:</label>
                  <input type="text" class="form-control" id="modalCurrentStock" readonly>
                </div>
              </div>

              <!-- Tab Navigation -->
              <ul class="nav nav-tabs" id="stockTabs" role="tablist">
                <li class="nav-item" role="presentation">
                  <button class="nav-link active" id="add-tab" data-bs-toggle="tab" data-bs-target="#add-panel" type="button" role="tab">
                    <i class="fas fa-plus me-1"></i> Add Stock
                  </button>
                </li>
                <li class="nav-item" role="presentation">
                  <button class="nav-link" id="subtract-tab" data-bs-toggle="tab" data-bs-target="#subtract-panel" type="button" role="tab">
                    <i class="fas fa-minus me-1"></i> Remove Stock
                  </button>
                </li>
              </ul>

              <!-- Tab Content -->
              <div class="tab-content mt-3" id="stockTabsContent">
                <!-- Add Stock Tab -->
                <div class="tab-pane fade show active" id="add-panel" role="tabpanel">
                  <form id="addStockForm">
                    <div class="form-group mb-3">
                      <label for="modalStockToAdd">Stock to Add: <span class="text-danger">*</span></label>
                      <input type="number" class="form-control" id="modalStockToAdd" min="1" required>
                      <small class="form-text text-muted">Enter the number of items to add to your inventory.</small>
                    </div>
                    <div class="form-group mb-3">
                      <label for="modalNewTotalStockAdd">New Total Stock:</label>
                      <input type="text" class="form-control" id="modalNewTotalStockAdd" readonly>
                    </div>
                    <div class="form-group mb-3">
                      <label for="modalAddNote">Note (Optional):</label>
                      <textarea class="form-control" id="modalAddNote" rows="2" placeholder="Add a note about this stock addition..."></textarea>
                    </div>
                  </form>
                </div>

                <!-- Remove Stock Tab -->
                <div class="tab-pane fade" id="subtract-panel" role="tabpanel">
                  <form id="subtractStockForm">
                    <div class="form-group mb-3">
                      <label for="modalStockToSubtract">Stock to Remove: <span class="text-danger">*</span></label>
                      <input type="number" class="form-control" id="modalStockToSubtract" min="1" required>
                      <small class="form-text text-muted">Enter the number of items to remove from inventory.</small>
                    </div>
                    <div class="form-group mb-3">
                      <label for="modalNewTotalStockSubtract">New Total Stock:</label>
                      <input type="text" class="form-control" id="modalNewTotalStockSubtract" readonly>
                    </div>
                    <div class="form-group mb-3">
                      <label for="modalSubtractReason">Reason: <span class="text-danger">*</span></label>
                      <select class="form-control" id="modalSubtractReason" required>
                        <option value="">Select reason...</option>
                        <option value="damaged">Damaged items</option>
                        <option value="expired">Expired products</option>
                        <option value="sold_offline">Sold offline</option>
                        <option value="returned">Customer returns</option>
                        <option value="lost">Lost/stolen</option>
                        <option value="adjustment">Inventory adjustment</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div class="form-group mb-3">
                      <label for="modalSubtractNote">Additional Notes (Optional):</label>
                      <textarea class="form-control" id="modalSubtractNote" rows="2" placeholder="Add details about this stock removal..."></textarea>
                    </div>
                    <div class="alert alert-warning">
                      <i class="fas fa-exclamation-triangle me-1"></i>
                      <strong>Warning:</strong> This will permanently remove items from your inventory.
                    </div>
                  </form>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="closeModal('addStockModal')">Cancel</button>
              <button type="button" class="btn btn-success" id="confirmAddStock" style="display: block;">
                <i class="fas fa-plus"></i> Add Stock
              </button>
              <button type="button" class="btn btn-danger" id="confirmSubtractStock" style="display: none;">
                <i class="fas fa-minus"></i> Remove Stock
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Handle input changes for real-time calculation
    document.addEventListener('input', (e) => {
      const currentStock = parseInt(document.getElementById('modalCurrentStock').value) || 0;
      
      if (e.target.id === 'modalStockToAdd') {
        const stockToAdd = parseInt(e.target.value) || 0;
        document.getElementById('modalNewTotalStockAdd').value = currentStock + stockToAdd;
      }
      
      if (e.target.id === 'modalStockToSubtract') {
        const stockToSubtract = parseInt(e.target.value) || 0;
        const newTotal = Math.max(0, currentStock - stockToSubtract);
        document.getElementById('modalNewTotalStockSubtract').value = newTotal;
        
        // Show warning if trying to subtract more than available
        const input = e.target;
        if (stockToSubtract > currentStock) {
          input.classList.add('is-invalid');
          if (!input.nextElementSibling || !input.nextElementSibling.classList.contains('invalid-feedback')) {
            const feedback = document.createElement('div');
            feedback.className = 'invalid-feedback';
            feedback.textContent = `Cannot remove more than ${currentStock} items`;
            input.parentNode.appendChild(feedback);
          }
        } else {
          input.classList.remove('is-invalid');
          const feedback = input.parentNode.querySelector('.invalid-feedback');
          if (feedback) feedback.remove();
        }
      }
    });

    // Handle tab switching
    document.addEventListener('click', (e) => {
      if (e.target.id === 'add-tab' || e.target.closest('#add-tab')) {
        document.getElementById('confirmAddStock').style.display = 'block';
        document.getElementById('confirmSubtractStock').style.display = 'none';
        document.getElementById('addStockModalLabel').textContent = 'Add Stock';
      }
      
      if (e.target.id === 'subtract-tab' || e.target.closest('#subtract-tab')) {
        document.getElementById('confirmAddStock').style.display = 'none';
        document.getElementById('confirmSubtractStock').style.display = 'block';
        document.getElementById('addStockModalLabel').textContent = 'Remove Stock';
      }
      
      if (e.target.id === 'confirmAddStock') {
        handleAddStock();
      }
      
      if (e.target.id === 'confirmSubtractStock') {
        handleSubtractStock();
      }
    });
  }

  // --- Create Edit Product Modal ---
  function createEditProductModal() {
    const modalHTML = `
      <div class="modal fade" id="editProductModal" tabindex="-1" role="dialog" aria-labelledby="editProductModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="editProductModalLabel">Edit Product</h5>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close" onclick="closeModal('editProductModal')">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <form id="editProductForm" enctype="multipart/form-data">
                <div class="row">
                  <div class="col-md-6">
                    <div class="form-group">
                      <label for="editProductName">Product Name: <span class="text-danger">*</span></label>
                      <input type="text" class="form-control" id="editProductName" name="name" required>
                    </div>
                    
                    <div class="form-group">
                      <label for="editProductDescription">Description:</label>
                      <textarea class="form-control" id="editProductDescription" name="description" rows="3"></textarea>
                    </div>
                    
                    <div class="form-group">
                      <label for="editProductPrice">Price (₱): <span class="text-danger">*</span></label>
                      <input type="number" class="form-control" id="editProductPrice" name="price" step="0.01" min="0" required>
                    </div>
                    
                    <div class="form-group">
                      <label for="editCategoryDropdown">Category:</label>
                      <select class="form-control" id="editCategoryDropdown" name="category_id">
                        <option value="">Select a Category</option>
                      </select>
                    </div>
                  </div>
                  
                  <div class="col-md-6">
                    <div class="form-group">
                      <label for="editProductImage">Product Image:</label>
                      <input type="file" class="form-control-file" id="editProductImage" name="image" accept="image/*">
                      <small class="form-text text-muted">Leave empty to keep current image</small>
                    </div>
                    
                    <div class="form-group">
                      <label>Current Image:</label>
                      <div id="editImagePreviewContainer" style="text-align: center;">
                        <img id="editImagePreview" src="" alt="Product Image" class="img-fluid" style="max-height: 200px; display: none;">
                        <div id="editNoImageText" class="text-muted">No image uploaded</div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="closeModal('editProductModal')">Cancel</button>
              <button type="button" class="btn btn-primary" id="confirmEditProduct">
                <i class="fas fa-save"></i> Update Product
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.addEventListener('click', async (e) => {
      if (e.target.id === 'confirmEditProduct') {
        await handleEditProduct();
      }
    });

    document.addEventListener('change', (e) => {
      if (e.target.id === 'editProductImage') {
        const file = e.target.files[0];
        const preview = document.getElementById('editImagePreview');
        const noImageText = document.getElementById('editNoImageText');
        
        if (file) {
          const reader = new FileReader();
          reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            noImageText.style.display = 'none';
          };
          reader.readAsDataURL(file);
        }
      }
    });
  }

  createStockModal();
  createEditProductModal();
  window.safeFetch = safeFetch;
  
  // Make functions globally available
  window.fetchSellerProducts = fetchSellerProducts;
});

// Global variables for stock and modal management
let currentProductId = null;
let currentEditProductId = null;
let stockModalInstance = null;
let isStockOperationInProgress = false;

// Modal Management Functions
function showModal(modalId) {
  debugLog(`Showing modal: ${modalId}`);
  const modal = document.getElementById(modalId);
  
  if (!modal) {
    console.error(`Modal ${modalId} not found`);
    return;
  }

  // Clean approach: use Bootstrap 5 with proper event handling
  if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
    try {
      let modalInstance = bootstrap.Modal.getInstance(modal);
      if (!modalInstance) {
        modalInstance = new bootstrap.Modal(modal, {
          backdrop: 'static',
          keyboard: false
        });
      }
      
      if (modalId === 'addStockModal') {
        stockModalInstance = modalInstance;
      }
      
      modalInstance.show();
      return;
    } catch (error) {
      console.error('Bootstrap modal error:', error);
    }
  }
  
  // Fallback manual approach
  modal.style.display = 'block';
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  
  // Create backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop fade show';
  backdrop.id = `backdrop-${modalId}`;
  document.body.appendChild(backdrop);
}

function closeModal(modalId) {
  debugLog(`Closing modal: ${modalId}`);
  const modal = document.getElementById(modalId);
  
  if (!modal) {
    console.error(`Modal ${modalId} not found`);
    return;
  }

  // Use Bootstrap if available
  if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
    try {
      const modalInstance = bootstrap.Modal.getInstance(modal);
      if (modalInstance) {
        modalInstance.hide();
        return;
      }
    } catch (error) {
      console.error('Bootstrap modal close error:', error);
    }
  }
  
  // Fallback manual approach
  modal.style.display = 'none';
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  
  // Remove backdrop
  const backdrop = document.getElementById(`backdrop-${modalId}`);
  if (backdrop) {
    backdrop.remove();
  }
}

// Open Add Stock Modal
function openAddStockModal(productId, productName, currentStock) {
  debugLog('Opening stock modal for:', { productId, productName, currentStock });
  
  if (isStockOperationInProgress) {
    debugLog('Stock operation already in progress, ignoring request');
    return;
  }
  
  currentProductId = productId;
  
  // Reset product info
  document.getElementById('modalProductName').value = productName;
  document.getElementById('modalCurrentStock').value = currentStock;
  
  // Reset Add Stock tab
  document.getElementById('modalStockToAdd').value = '';
  document.getElementById('modalNewTotalStockAdd').value = currentStock;
  document.getElementById('modalAddNote').value = '';
  
  // Reset Subtract Stock tab
  document.getElementById('modalStockToSubtract').value = '';
  document.getElementById('modalNewTotalStockSubtract').value = currentStock;
  document.getElementById('modalSubtractReason').value = '';
  document.getElementById('modalSubtractNote').value = '';
  
  // Clear any validation states
  document.getElementById('modalStockToSubtract').classList.remove('is-invalid');
  const feedback = document.querySelector('#modalStockToSubtract').parentNode.querySelector('.invalid-feedback');
  if (feedback) feedback.remove();
  
  // Reset to Add tab
  const addTab = document.getElementById('add-tab');
  const subtractTab = document.getElementById('subtract-tab');
  const addPanel = document.getElementById('add-panel');
  const subtractPanel = document.getElementById('subtract-panel');
  
  addTab.classList.add('active');
  subtractTab.classList.remove('active');
  addPanel.classList.add('show', 'active');
  subtractPanel.classList.remove('show', 'active');
  
  // Show correct button
  document.getElementById('confirmAddStock').style.display = 'block';
  document.getElementById('confirmSubtractStock').style.display = 'none';
  document.getElementById('addStockModalLabel').textContent = 'Add Stock';
  
  showModal('addStockModal');
}

// Open Edit Product Modal
async function openEditProductModal(productId) {
  debugLog('Opening edit modal for product ID:', productId);
  
  currentEditProductId = productId;
  const BACKEND_URL = 'https://backend-rj0a.onrender.com';
  const user = JSON.parse(localStorage.getItem('user'));
  
  try {
    document.getElementById('editProductModalLabel').textContent = 'Loading Product...';
    showModal('editProductModal');
    
    const response = await window.safeFetch(`${BACKEND_URL}/api/products/${productId}`, {
      headers: { 'X-User-ID': user.id }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      debugLog('Error fetching product:', errorText);
      throw new Error(`Could not fetch product data: ${response.status} - ${errorText}`);
    }
    
    const response_data = await response.json();
    debugLog('Product data loaded:', response_data);
    
    const product = response_data.details || response_data;
    
    // Populate form with product data
    document.getElementById('editProductModalLabel').textContent = `Edit Product: ${product.name}`;
    document.getElementById('editProductName').value = product.name || '';
    document.getElementById('editProductDescription').value = product.description || '';
    document.getElementById('editProductPrice').value = product.price || '';
    
    // Set category if available
    const categoryDropdown = document.getElementById('editCategoryDropdown');
    if (product.category_id) {
      categoryDropdown.value = product.category_id;
    } else {
      categoryDropdown.value = '';
    }
    
    // Handle image preview
    const imagePreview = document.getElementById('editImagePreview');
    const noImageText = document.getElementById('editNoImageText');
    
    if (product.image) {
      imagePreview.src = product.image;
      imagePreview.style.display = 'block';
      noImageText.style.display = 'none';
    } else {
      imagePreview.style.display = 'none';
      noImageText.style.display = 'block';
    }
    
  } catch (error) {
    console.error('Error fetching product:', error);
    alert(`Error loading product: ${error.message}`);
    closeModal('editProductModal');
  }
}

// Handle Edit Product
async function handleEditProduct() {
  const BACKEND_URL = 'https://backend-rj0a.onrender.com';
  const user = JSON.parse(localStorage.getItem('user'));
  
  const confirmBtn = document.getElementById('confirmEditProduct');
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

  try {
    const formData = new FormData();
    
    // Add only the fields we want to update (excluding stock)
    formData.append('name', document.getElementById('editProductName').value);
    formData.append('description', document.getElementById('editProductDescription').value);
    formData.append('price', document.getElementById('editProductPrice').value);
    formData.append('category_id', document.getElementById('editCategoryDropdown').value);
    
    // Only add image if a new one is selected
    const imageInput = document.getElementById('editProductImage');
    if (imageInput.files && imageInput.files[0]) {
      formData.append('image', imageInput.files[0]);
    }
    
    debugLog('Updating product:', currentEditProductId);
    
    const response = await fetch(`${BACKEND_URL}/api/products/${currentEditProductId}`, {
      method: 'POST',
      headers: { 'X-User-ID': user.id },
      body: formData
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to update product.');
    }
    
    alert('Product updated successfully! Stock has been preserved.');
    closeModal('editProductModal');
    
    // Delayed reload to ensure modal closes properly
    setTimeout(() => {
      window.location.href = 'seller_dashboard.html';
    }, 800);

  } catch (error) {
    console.error('Update error:', error);
    alert(`Error: ${error.message}`);
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = '<i class="fas fa-save"></i> Update Product';
  }
}

// Handle Add Stock - COMPLETELY FIXED VERSION
async function handleAddStock() {
  const stockToAdd = parseInt(document.getElementById('modalStockToAdd').value);
  const note = document.getElementById('modalAddNote').value.trim();
  const user = JSON.parse(localStorage.getItem('user'));
  const BACKEND_URL = 'https://backend-rj0a.onrender.com';
  
  if (!stockToAdd || stockToAdd < 1) {
    alert('Please enter a valid amount of stock to add.');
    return;
  }

  if (isStockOperationInProgress) {
    debugLog('Stock operation already in progress, ignoring duplicate request');
    return;
  }

  isStockOperationInProgress = true;
  const confirmBtn = document.getElementById('confirmAddStock');
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

  try {
    const payload = {
      product_id: currentProductId,
      stock_to_add: stockToAdd,
      note: note
    };

    debugLog('Adding stock with payload:', payload);

    const response = await window.safeFetch(`${BACKEND_URL}/api/seller/add-stock`, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': user.id
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      debugLog('Add stock failed:', { status: response.status, error: errorText });
      throw new Error(`Failed to add stock: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    debugLog('Add stock successful:', result);
    
    // Show success modal instead of alert
    showStockSuccessModal(stockToAdd, result.new_stock, 'added');
    
    // Close the add stock modal
    closeModal('addStockModal');

  } catch (error) {
    debugLog('Add stock error:', error);
    
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
    isStockOperationInProgress = false;
  }
}

// Handle Subtract Stock - NEW FUNCTION
// Handle Subtract Stock - FIXED to use stock-only endpoint
async function handleSubtractStock() {
  const stockToSubtract = parseInt(document.getElementById('modalStockToSubtract').value);
  const reason = document.getElementById('modalSubtractReason').value;
  const note = document.getElementById('modalSubtractNote').value.trim();
  const currentStock = parseInt(document.getElementById('modalCurrentStock').value) || 0;
  const user = JSON.parse(localStorage.getItem('user'));
  const BACKEND_URL = 'https://backend-rj0a.onrender.com';
  
  // Validation
  if (!stockToSubtract || stockToSubtract < 1) {
    alert('Please enter a valid amount of stock to remove.');
    return;
  }
  
  if (!reason) {
    alert('Please select a reason for removing stock.');
    return;
  }
  
  if (stockToSubtract > currentStock) {
    alert(`Cannot remove ${stockToSubtract} items. Only ${currentStock} items available in stock.`);
    return;
  }

  if (isStockOperationInProgress) {
    debugLog('Stock operation already in progress, ignoring duplicate request');
    return;
  }

  // Additional confirmation for stock removal
  if (!confirm(`Are you sure you want to remove ${stockToSubtract} items from stock?\n\nReason: ${reason}\nThis action cannot be undone.`)) {
    return;
  }

  isStockOperationInProgress = true;
  const confirmBtn = document.getElementById('confirmSubtractStock');
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Removing...';

  try {
    // Calculate new stock value
    const newStock = currentStock - stockToSubtract;
    
    const payload = {
      stock: newStock
    };

    debugLog('Removing stock using stock endpoint with payload:', payload);

    // Use the existing stock-only update endpoint
    const response = await window.safeFetch(`${BACKEND_URL}/api/products/${currentProductId}/stock`, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': user.id
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      debugLog('Subtract stock failed:', { status: response.status, error: errorText });
      throw new Error(`Failed to remove stock: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    debugLog('Subtract stock successful:', result);
    
    // Log the stock removal for tracking purposes
    console.log(`Stock removed: Product ${currentProductId}, Removed: ${stockToSubtract}, Reason: ${reason}, Note: ${note}, New Total: ${newStock}`);
    
    // Show success modal
    showStockSuccessModal(stockToSubtract, newStock, 'removed');
    
    // Close the stock modal
    closeModal('addStockModal');

  } catch (error) {
    debugLog('Subtract stock error:', error);
    
    let errorMessage = 'Failed to remove stock. ';
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
    confirmBtn.innerHTML = '<i class="fas fa-minus"></i> Remove Stock';
    isStockOperationInProgress = false;
  }
}

// Show success modal for stock updates
function showStockSuccessModal(changedItems, newTotal, operation = 'added') {
  debugLog('Showing stock success modal:', { changedItems, newTotal, operation });
  
  // Create success modal if it doesn't exist
  if (!document.getElementById('stockSuccessModal')) {
    const successModalHTML = `
      <div class="modal fade" id="stockSuccessModal" tabindex="-1" aria-labelledby="stockSuccessModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header" id="stockSuccessHeader">
              <h5 class="modal-title" id="stockSuccessModalLabel">
                <i class="fas fa-check-circle me-2"></i>Stock Updated Successfully
              </h5>
            </div>
            <div class="modal-body text-center">
              <div class="mb-3">
                <i id="stockSuccessIcon" class="fas fa-check-circle text-success" style="font-size: 3rem;"></i>
              </div>
              <h4 class="mb-3 text-success">Success!</h4>
              <p id="stockSuccessMessage" class="lead mb-3"></p>
              <div class="alert alert-info">
                <small><i class="fas fa-info-circle me-1"></i>Your inventory has been updated.</small>
              </div>
            </div>
            <div class="modal-footer justify-content-center">
              <button type="button" class="btn btn-success btn-lg" onclick="handleStockSuccessClose()">
                <i class="fas fa-check me-2"></i>Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', successModalHTML);
  }
  
  // Update message and styling based on operation
  const messageElement = document.getElementById('stockSuccessMessage');
  const headerElement = document.getElementById('stockSuccessHeader');
  const iconElement = document.getElementById('stockSuccessIcon');
  
  if (operation === 'added') {
    messageElement.textContent = `Successfully added ${changedItems} items to stock. New total: ${newTotal}`;
    headerElement.className = 'modal-header bg-success text-white';
    iconElement.className = 'fas fa-plus-circle text-success';
  } else if (operation === 'removed') {
    messageElement.textContent = `Successfully removed ${changedItems} items from stock. New total: ${newTotal}`;
    headerElement.className = 'modal-header bg-warning text-white';
    iconElement.className = 'fas fa-minus-circle text-warning';
  }
  
  showModal('stockSuccessModal');
}

// Handle stock success modal close
function handleStockSuccessClose() {
  debugLog('Handling stock success modal close');
  closeModal('stockSuccessModal');
  
  // Wait for modal to close completely, then refresh
  setTimeout(() => {
    debugLog('Refreshing page after stock update...');
    window.fetchSellerProducts();
  }, 500);
}

// Delete product function
async function deleteProduct(productId, productName) {
  debugLog('Delete product called:', { productId, productName });
  
  if (!confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
    return;
  }
  
  const BACKEND_URL = 'https://backend-rj0a.onrender.com';
  const user = JSON.parse(localStorage.getItem('user'));
  
  try {
    const methods = ['DELETE', 'POST'];
    let success = false;
    
    for (const method of methods) {
      try {
        debugLog(`Trying to delete with ${method} method...`);
        
        let requestOptions = {
          method: method,
          headers: { 'X-User-ID': user.id }
        };
        
        if (method === 'POST') {
          requestOptions.headers['Content-Type'] = 'application/json';
          requestOptions.body = JSON.stringify({ action: 'delete' });
        }
        
        const response = await window.safeFetch(`${BACKEND_URL}/api/products/${productId}`, requestOptions);
        
        if (response.ok) {
          debugLog(`Delete successful with ${method}`);
          success = true;
          break;
        } else {
          const errorText = await response.text();
          debugLog(`Delete failed with ${method} (${response.status}):`, errorText);
          
          if (response.status === 405 && method !== 'POST') {
            continue;
          }
        }
      } catch (error) {
        debugLog(`Delete ${method} error:`, error.message);
        continue;
      }
    }
    
    if (success) {
      alert(`"${productName}" has been deleted successfully.`);
      location.reload();
    } else {
      alert(`Failed to delete "${productName}". Please try again or contact support.`);
    }
    
  } catch (error) {
    console.error('Delete error:', error);
    alert(`Error deleting product: ${error.message}`);
  }
}

// Test function for modal
function testStockModal() {
  debugLog('Testing stock modal...');
  showStockSuccessModal(19, 150, 'added');
}

// Refresh dashboard function
function refreshDashboard() {
  debugLog('Refreshing dashboard...');
  window.fetchSellerProducts();
}

// Debug log function (make sure it's available globally)
function debugLog(message, data = null) {
  console.log(`[SELLER DASHBOARD DEBUG] ${message}`, data);
}