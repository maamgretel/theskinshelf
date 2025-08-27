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

  // --- Create Stock Management Modal ---
  function createStockModal() {
    const modalHTML = `
      <div class="modal fade" id="addStockModal" tabindex="-1" role="dialog" aria-labelledby="addStockModalLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="addStockModalLabel">Add Stock</h5>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close" onclick="closeModal('addStockModal')">
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
              <button type="button" class="btn btn-secondary" onclick="closeModal('addStockModal')">Cancel</button>
              <button type="button" class="btn btn-success" id="confirmAddStock">
                <i class="fas fa-plus"></i> Add Stock
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

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

  // --- Create Edit Product Modal - STOCK FIELD HIDDEN ---
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
                    
                    <!-- STOCK FIELD REMOVED/HIDDEN -->
                    <!-- <div class="form-group" style="display: none;">
                      <label for="editProductStock">Current Stock:</label>
                      <input type="number" class="form-control" id="editProductStock" name="stock" readonly style="background-color: #f8f9fa;">
                      <small class="form-text text-muted">Stock is managed through the "Add Stock" button. This field shows current inventory.</small>
                    </div> -->
                    
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
});

// Global variables for stock management
let currentProductId = null;
let currentEditProductId = null;

// Open Add Stock Modal
function openAddStockModal(productId, productName, currentStock) {
  console.log(`[DEBUG] Opening stock modal for:`, { productId, productName, currentStock });
  
  currentProductId = productId;
  document.getElementById('modalProductName').value = productName;
  document.getElementById('modalCurrentStock').value = currentStock;
  document.getElementById('modalStockToAdd').value = '';
  document.getElementById('modalNewTotalStock').value = currentStock;
  document.getElementById('modalStockNote').value = '';
  
  showModal('addStockModal');
}

// Open Edit Product Modal - STOCK FIELD HANDLING REMOVED
async function openEditProductModal(productId) {
  console.log(`[DEBUG] Opening edit modal for product ID:`, productId);
  
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
      console.log(`[DEBUG] Error fetching product:`, errorText);
      throw new Error(`Could not fetch product data: ${response.status} - ${errorText}`);
    }
    
    const response_data = await response.json();
    console.log(`[DEBUG] Product data loaded:`, response_data);
    
    const product = response_data.details || response_data;
    
    // Populate form with product data - STOCK FIELD REMOVED
    document.getElementById('editProductModalLabel').textContent = `Edit Product: ${product.name}`;
    document.getElementById('editProductName').value = product.name || '';
    document.getElementById('editProductDescription').value = product.description || '';
    document.getElementById('editProductPrice').value = product.price || '';
    // Stock field is now hidden, so no need to populate it
    
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

// Handle Edit Product - UPDATED WITH BETTER MODAL CLOSING
// Handle Edit Product - UPDATED WITH STOCK PRESERVATION
async function handleEditProduct() {
  const BACKEND_URL = 'https://backend-rj0a.onrender.com';
  const user = JSON.parse(localStorage.getItem('user'));
  
  const confirmBtn = document.getElementById('confirmEditProduct');
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

  try {
    const form = document.getElementById('editProductForm');
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
    
    console.log(`[DEBUG] Updating product ${currentEditProductId} - stock preservation enabled`);
    
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
    
    // Add a small delay before redirect to ensure modal is properly closed
    setTimeout(() => {
      window.location.href = 'seller_dashboard.html';
    }, 500);

  } catch (error) {
    console.error('Update error:', error);
    alert(`Error: ${error.message}`);
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = '<i class="fas fa-save"></i> Update Product';
  }
}

// Handle Add Stock - IMPROVED VERSION
// Handle Add Stock - CORRECTED VERSION
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
    // Use the correct dedicated add-stock endpoint
    const payload = {
      product_id: currentProductId,
      stock_to_add: stockToAdd,
      note: note
    };

    console.log(`[DEBUG] Adding stock using dedicated endpoint:`, payload);

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
      console.log(`[DEBUG] add-stock endpoint failed (${response.status}):`, errorText);
      throw new Error(`Failed to add stock: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`[DEBUG] Add stock successful:`, result);
    
    alert(`Successfully added ${stockToAdd} items to stock. New total: ${result.new_stock}`);
    
    closeModal('addStockModal');
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

// IMPROVED Modal Management Functions - Fixed Bootstrap compatibility
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  
  // Try Bootstrap 5 first
  if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
    try {
      const bootstrapModal = new bootstrap.Modal(modal);
      bootstrapModal.show();
      return;
    } catch (error) {
      console.log('[DEBUG] Bootstrap 5 modal failed:', error);
    }
  }
  
  // Try Bootstrap 4/jQuery
  if (typeof $ !== 'undefined' && $.fn.modal) {
    try {
      $(`#${modalId}`).modal('show');
      return;
    } catch (error) {
      console.log('[DEBUG] jQuery modal failed:', error);
    }
  }
  
  // Fallback to manual modal display
  console.log('[DEBUG] Using manual modal display');
  modal.style.display = 'block';
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  
  // Create backdrop
  let backdrop = document.getElementById(`modal-backdrop-${modalId}`);
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade show';
    backdrop.id = `modal-backdrop-${modalId}`;
    document.body.appendChild(backdrop);
    
    // Close modal when clicking backdrop
    backdrop.addEventListener('click', () => closeModal(modalId));
  }
  
  // Close modal with Escape key
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal(modalId);
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
}

// Close Modal Function - Fixed Bootstrap compatibility
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  
  // Try Bootstrap 5 first
  if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
    try {
      const bootstrapModal = bootstrap.Modal.getInstance(modal);
      if (bootstrapModal) {
        bootstrapModal.hide();
        return;
      }
    } catch (error) {
      console.log('[DEBUG] Bootstrap 5 modal close failed:', error);
    }
  }
  
  // Try Bootstrap 4/jQuery
  if (typeof $ !== 'undefined' && $.fn.modal) {
    try {
      $(`#${modalId}`).modal('hide');
      return;
    } catch (error) {
      console.log('[DEBUG] jQuery modal close failed:', error);
    }
  }
  
  // Fallback to manual modal close
  console.log('[DEBUG] Using manual modal close');
  modal.style.display = 'none';
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  
  // Remove backdrop
  const backdrop = document.getElementById(`modal-backdrop-${modalId}`);
  if (backdrop) {
    backdrop.remove();
  }
  
  // Remove any lingering modal-open class and backdrops
  setTimeout(() => {
    document.body.classList.remove('modal-open');
    const allBackdrops = document.querySelectorAll('.modal-backdrop');
    allBackdrops.forEach(b => {
      if (b.id.includes(modalId)) {
        b.remove();
      }
    });
  }, 150);
}

// Delete product function - IMPROVED VERSION
async function deleteProduct(productId, productName) {
  console.log(`[DEBUG] Delete product called:`, { productId, productName });
  
  if (!confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
    return;
  }
  
  const BACKEND_URL = 'https://backend-rj0a.onrender.com';
  const user = JSON.parse(localStorage.getItem('user'));
  
  try {
    const methods = ['DELETE', 'POST']; // Try DELETE first, then POST as fallback
    let success = false;
    
    for (const method of methods) {
      try {
        console.log(`[DEBUG] Trying to delete with ${method} method...`);
        
        let requestOptions = {
          method: method,
          headers: { 'X-User-ID': user.id }
        };
        
        // For POST method, include action in body
        if (method === 'POST') {
          requestOptions.headers['Content-Type'] = 'application/json';
          requestOptions.body = JSON.stringify({ action: 'delete' });
        }
        
        const response = await window.safeFetch(`${BACKEND_URL}/api/products/${productId}`, requestOptions);
        
        if (response.ok) {
          console.log(`[DEBUG] Delete successful with ${method}`);
          success = true;
          break;
        } else {
          const errorText = await response.text();
          console.log(`[DEBUG] Delete failed with ${method} (${response.status}):`, errorText);
          
          if (response.status === 405 && method !== 'POST') {
            continue; // Try next method
          }
        }
      } catch (error) {
        console.log(`[DEBUG] Delete ${method} error:`, error.message);
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