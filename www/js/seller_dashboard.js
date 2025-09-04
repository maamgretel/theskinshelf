document.addEventListener('DOMContentLoaded', () => {
  const BACKEND_URL = 'https://backend-rj0a.onrender.com';
  const user = JSON.parse(localStorage.getItem('user'));

  // Debug logging
  function debugLog(message, data = null) {
    console.log(`[SELLER DASHBOARD DEBUG] ${message}`, data);
  }

  // Custom notification modal system
  function createNotificationModal() {
    const modalHTML = `
      <div class="modal fade" id="notificationModal" tabindex="-1" style="z-index: 9999;">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header" id="notificationHeader">
              <h5 class="modal-title" id="notificationTitle">Notification</h5>
              <button type="button" class="close" onclick="closeNotificationModal()">
                <span>&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <div class="d-flex align-items-center">
                <div id="notificationIcon" class="mr-3"></div>
                <div id="notificationMessage"></div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn" id="notificationBtn" onclick="closeNotificationModal()">OK</button>
            </div>
          </div>
        </div>
      </div>`;
    
    if (!document.getElementById('notificationModal')) {
      document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
  }

  // Show notification modal
  function showNotification(message, type = 'info', callback = null) {
    createNotificationModal();
    
    const modal = document.getElementById('notificationModal');
    const header = document.getElementById('notificationHeader');
    const title = document.getElementById('notificationTitle');
    const icon = document.getElementById('notificationIcon');
    const messageEl = document.getElementById('notificationMessage');
    const btn = document.getElementById('notificationBtn');
    
    // Reset classes
    header.className = 'modal-header';
    btn.className = 'btn';
    
    switch (type) {
      case 'success':
        header.classList.add('bg-success', 'text-white');
        btn.classList.add('btn-success');
        title.textContent = 'Success';
        icon.innerHTML = '<i class="fas fa-check-circle text-success" style="font-size: 2rem;"></i>';
        break;
      case 'error':
        header.classList.add('bg-danger', 'text-white');
        btn.classList.add('btn-danger');
        title.textContent = 'Error';
        icon.innerHTML = '<i class="fas fa-exclamation-triangle text-danger" style="font-size: 2rem;"></i>';
        break;
      case 'warning':
        header.classList.add('bg-warning', 'text-dark');
        btn.classList.add('btn-warning');
        title.textContent = 'Warning';
        icon.innerHTML = '<i class="fas fa-exclamation-circle text-warning" style="font-size: 2rem;"></i>';
        break;
      default:
        header.classList.add('bg-info', 'text-white');
        btn.classList.add('btn-info');
        title.textContent = 'Information';
        icon.innerHTML = '<i class="fas fa-info-circle text-info" style="font-size: 2rem;"></i>';
    }
    
    messageEl.innerHTML = message;
    
    // Store callback for later use
    window.notificationCallback = callback;
    
    showModal('notificationModal');
  }

  // Confirmation modal
  function createConfirmationModal() {
    const modalHTML = `
      <div class="modal fade" id="confirmationModal" tabindex="-1" style="z-index: 9999;">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-warning text-dark">
              <h5 class="modal-title">Confirm Action</h5>
              <button type="button" class="close" onclick="closeConfirmationModal(false)">
                <span>&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <div class="d-flex align-items-center">
                <div class="mr-3">
                  <i class="fas fa-question-circle text-warning" style="font-size: 2rem;"></i>
                </div>
                <div id="confirmationMessage"></div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="closeConfirmationModal(false)">Cancel</button>
              <button type="button" class="btn btn-warning" onclick="closeConfirmationModal(true)">Confirm</button>
            </div>
          </div>
        </div>
      </div>`;
    
    if (!document.getElementById('confirmationModal')) {
      document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
  }

  // Show confirmation modal
  function showConfirmation(message, callback) {
    createConfirmationModal();
    
    document.getElementById('confirmationMessage').innerHTML = message;
    window.confirmationCallback = callback;
    
    showModal('confirmationModal');
  }

  // Close notification modal
  window.closeNotificationModal = function() {
    closeModal('notificationModal');
    if (window.notificationCallback) {
      window.notificationCallback();
      window.notificationCallback = null;
    }
  };

  // Close confirmation modal
  window.closeConfirmationModal = function(confirmed) {
    closeModal('confirmationModal');
    if (window.confirmationCallback) {
      window.confirmationCallback(confirmed);
      window.confirmationCallback = null;
    }
  };

  // Enhanced fetch with error handling
  async function safeFetch(url, options = {}) {
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': user?.id
      },
      credentials: 'omit'
    };

    const fetchOptions = { ...defaultOptions, ...options };
    if (options.body instanceof FormData) {
      delete fetchOptions.headers['Content-Type'];
    }

    try {
      return await fetch(url, fetchOptions);
    } catch (error) {
      if (error.message.includes('CORS') && (!options.method || options.method === 'GET')) {
        return await fetch(url, { method: 'GET', mode: 'cors', credentials: 'omit' });
      }
      throw error;
    }
  }

  // User validation
  if (!user || user.role !== 'seller') {
    localStorage.clear();
    showNotification('Access Denied. Please log in as a seller.', 'error', () => {
      window.location.href = 'login.html';
    });
    return;
  }

  // Initialize user display
  document.getElementById('userName').textContent = user.name;
  document.getElementById('profilePic').src = user.profile_pic || '../assets/default-avatar.png';

  // Stock status helper
  function getStockStatus(stock) {
    const stockNum = parseInt(stock) || 0;
    
    if (stockNum === 0) {
      return { status: 'out-of-stock', badgeClass: 'badge-danger', cardClass: 'border-danger', 
               stockText: 'Out of Stock ⚠️', alert: true };
    } else if (stockNum <= 5) {
      return { status: 'low-stock', badgeClass: 'badge-warning', cardClass: 'border-warning',
               stockText: `Low Stock: ${stockNum} ⚠️`, alert: stockNum <= 3 };
    } else {
      return { status: 'in-stock', badgeClass: 'badge-success', cardClass: '',
               stockText: `Stock: ${stockNum}`, alert: false };
    }
  }

  // Fetch and render products
  async function fetchSellerProducts(filters = {}) {
    const container = document.getElementById('productListRow');
    
    try {
      container.innerHTML = '<div class="col-12 text-center"><div class="spinner-border"></div><p class="mt-2">Loading...</p></div>';
      
      const params = new URLSearchParams(filters);
      const response = await safeFetch(`${BACKEND_URL}/api/seller/products?${params}`);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      
      const products = await response.json();
      renderProducts(products);
    } catch (err) {
      container.innerHTML = `
        <div class="col-12">
          <div class="alert alert-danger">
            <h5>Could not load products</h5>
            <p><strong>Error:</strong> ${err.message}</p>
            <button class="btn btn-primary btn-sm me-2" onclick="location.reload()">Try Again</button>
            <button class="btn btn-info btn-sm" onclick="testBackendDirectly()">Test Backend</button>
          </div>
        </div>`;
    }
  }

  // Render products
  function renderProducts(products) {
    const container = document.getElementById('productListRow');
    container.innerHTML = '';

    if (!products.length) {
      container.innerHTML = `
        <div class="col-12 text-center">
          <div class="alert alert-info">
            <h5>No products found</h5>
            <p>You haven't added any products yet.</p>
            <a href="add_product.html" class="btn btn-primary">Add Your First Product</a>
          </div>
        </div>`;
      return;
    }

    let outOfStockCount = 0, lowStockCount = 0;

    products.forEach(p => {
      const stockInfo = getStockStatus(p.stock);
      if (stockInfo.status === 'out-of-stock') outOfStockCount++;
      if (stockInfo.status === 'low-stock') lowStockCount++;

      container.innerHTML += `
        <div class="col-md-4">
          <div class="card mb-4 shadow-sm ${stockInfo.cardClass}">
            <div class="card-body text-center">
              <img src="${p.image || '../assets/default-product.png'}" alt="${p.name}" class="img-fluid mb-2" />
              <h5 class="card-title">${p.name}</h5>
              <p class="mb-2"><span class="badge category-badge">${p.category_name || 'No Category'}</span></p>
              <p class="card-text text-muted">${p.description || ''}</p>
              <div class="price-text mb-2">₱${parseFloat(p.price).toFixed(2)}</div>
              
              <div class="stock-info-container ${stockInfo.status}">
                <span class="badge ${stockInfo.badgeClass}">${stockInfo.stockText}</span>
              </div>
              
              <div class="mt-3">
                <button class="btn btn-sm btn-warning" onclick="openEditProductModal(${p.id})">✏️ Edit</button>
                <button class="btn btn-sm btn-success" onclick="openAddStockModal(${p.id}, '${p.name}', ${p.stock})">📦 Add Stock</button>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id}, '${p.name}')">🗑 Delete</button>
              </div>
            </div>
          </div>
        </div>`;
    });

    showStockAlerts(outOfStockCount, lowStockCount);
  }

  // Show stock alerts
  function showStockAlerts(outOfStockCount, lowStockCount) {
    document.querySelectorAll('.stock-alert').forEach(alert => alert.remove());
    
    if (outOfStockCount > 0 || lowStockCount > 0) {
      const alertContainer = document.createElement('div');
      alertContainer.className = 'stock-alert mb-4';
      
      let alertHTML = '';
      if (outOfStockCount > 0) {
        alertHTML += `<div class="alert alert-danger">⚠️ Stock Alert: ${outOfStockCount} product${outOfStockCount > 1 ? 's are' : ' is'} out of stock!</div>`;
      }
      if (lowStockCount > 0) {
        alertHTML += `<div class="alert alert-warning">📦 Low Stock: ${lowStockCount} product${lowStockCount > 1 ? 's have' : ' has'} low stock levels.</div>`;
      }
      
      alertContainer.innerHTML = alertHTML;
      document.getElementById('productListRow').parentElement.insertBefore(alertContainer, document.getElementById('productListRow'));
    }
  }

  // Load categories
  async function loadCategories() {
    try {
      const response = await safeFetch(`${BACKEND_URL}/api/categories`);
      if (!response.ok) return;
      
      const categories = await response.json();
      const categoryFilter = document.getElementById('categoryFilter');
      const editCategoryDropdown = document.getElementById('editCategoryDropdown');
      
      categories.forEach(cat => {
        categoryFilter.appendChild(new Option(cat.name, cat.id));
        if (editCategoryDropdown) editCategoryDropdown.appendChild(new Option(cat.name, cat.id));
      });
    } catch (err) {
      console.warn('Failed to load categories:', err);
    }
  }

  // Check notifications
  async function checkNotifications() {
    try {
      const response = await safeFetch(`${BACKEND_URL}/api/notifications/unread-count`);
      if (!response.ok) return;
      
      const data = await response.json();
      const badge = document.getElementById('notifBadge');
      
      if (data.count > 0) {
        badge.style.display = 'inline-block';
        badge.textContent = data.count > 9 ? '9+' : data.count;
      } else {
        badge.style.display = 'none';
      }
    } catch (e) {
      debugLog('Notification check failed:', e);
    }
  }

  // Test backend connectivity
  async function testBackendConnection() {
    const endpoints = ['/health', '/api/health', '/'];
    
    for (const endpoint of endpoints) {
      try {
        const response = await safeFetch(`${BACKEND_URL}${endpoint}`);
        if (response.ok) return true;
      } catch (error) {
        continue;
      }
    }
    return false;
  }

  // Modal management
  function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'block';
    modal.classList.add('show');
    document.body.classList.add('modal-open');
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'none';
    modal.classList.remove('show');
    document.body.classList.remove('modal-open');
  }

  // Create stock modal
  function createStockModal() {
    const modalHTML = `
      <div class="modal fade" id="addStockModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="addStockModalLabel">Manage Stock</h5>
              <button type="button" class="close" onclick="closeModal('addStockModal')">
                <span>&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <div class="row mb-3">
                <div class="col-md-6">
                  <label>Product:</label>
                  <input type="text" class="form-control" id="modalProductName" readonly>
                </div>
                <div class="col-md-6">
                  <label>Current Stock:</label>
                  <input type="text" class="form-control" id="modalCurrentStock" readonly>
                </div>
              </div>

              <ul class="nav nav-tabs" id="stockTabs">
                <li class="nav-item">
                  <button class="nav-link active" id="add-tab" type="button">Add Stock</button>
                </li>
                <li class="nav-item">
                  <button class="nav-link" id="subtract-tab" type="button">Remove Stock</button>
                </li>
              </ul>

              <div class="tab-content mt-3">
                <div class="tab-pane fade show active" id="add-panel">
                  <form id="addStockForm">
                    <div class="form-group mb-3">
                      <label>Stock to Add:</label>
                      <input type="number" class="form-control" id="modalStockToAdd" min="1" required>
                    </div>
                    <div class="form-group mb-3">
                      <label>New Total Stock:</label>
                      <input type="text" class="form-control" id="modalNewTotalStockAdd" readonly>
                    </div>
                    <div class="form-group mb-3">
                      <label>Note (Optional):</label>
                      <textarea class="form-control" id="modalAddNote" rows="2"></textarea>
                    </div>
                  </form>
                </div>

                <div class="tab-pane fade" id="subtract-panel">
                  <form id="subtractStockForm">
                    <div class="form-group mb-3">
                      <label>Stock to Remove:</label>
                      <input type="number" class="form-control" id="modalStockToSubtract" min="1" required>
                    </div>
                    <div class="form-group mb-3">
                      <label>New Total Stock:</label>
                      <input type="text" class="form-control" id="modalNewTotalStockSubtract" readonly>
                    </div>
                    <div class="form-group mb-3">
                      <label>Reason:</label>
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
                      <label>Additional Notes:</label>
                      <textarea class="form-control" id="modalSubtractNote" rows="2"></textarea>
                    </div>
                  </form>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="closeModal('addStockModal')">Cancel</button>
              <button type="button" class="btn btn-success" id="confirmAddStock">Add Stock</button>
              <button type="button" class="btn btn-danger" id="confirmSubtractStock" style="display: none;">Remove Stock</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Tab switching
    document.addEventListener('click', (e) => {
      if (e.target.id === 'add-tab') {
        document.getElementById('confirmAddStock').style.display = 'block';
        document.getElementById('confirmSubtractStock').style.display = 'none';
        document.getElementById('add-panel').classList.add('show', 'active');
        document.getElementById('subtract-panel').classList.remove('show', 'active');
        e.target.classList.add('active');
        document.getElementById('subtract-tab').classList.remove('active');
      }
      
      if (e.target.id === 'subtract-tab') {
        document.getElementById('confirmAddStock').style.display = 'none';
        document.getElementById('confirmSubtractStock').style.display = 'block';
        document.getElementById('add-panel').classList.remove('show', 'active');
        document.getElementById('subtract-panel').classList.add('show', 'active');
        e.target.classList.add('active');
        document.getElementById('add-tab').classList.remove('active');
      }
      
      if (e.target.id === 'confirmAddStock') handleAddStock();
      if (e.target.id === 'confirmSubtractStock') handleSubtractStock();
    });

    // Real-time calculation
    document.addEventListener('input', (e) => {
      const currentStock = parseInt(document.getElementById('modalCurrentStock').value) || 0;
      
      if (e.target.id === 'modalStockToAdd') {
        const stockToAdd = parseInt(e.target.value) || 0;
        document.getElementById('modalNewTotalStockAdd').value = currentStock + stockToAdd;
      }
      
      if (e.target.id === 'modalStockToSubtract') {
        const stockToSubtract = parseInt(e.target.value) || 0;
        document.getElementById('modalNewTotalStockSubtract').value = Math.max(0, currentStock - stockToSubtract);
      }
    });
  }

  // Create edit product modal
  function createEditProductModal() {
    const modalHTML = `
      <div class="modal fade" id="editProductModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="editProductModalLabel">Edit Product</h5>
              <button type="button" class="close" onclick="closeModal('editProductModal')">
                <span>&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <form id="editProductForm">
                <div class="row">
                  <div class="col-md-6">
                    <div class="form-group mb-3">
                      <label>Product Name:</label>
                      <input type="text" class="form-control" id="editProductName" required>
                    </div>
                    <div class="form-group mb-3">
                      <label>Description:</label>
                      <textarea class="form-control" id="editProductDescription" rows="3"></textarea>
                    </div>
                    <div class="form-group mb-3">
                      <label>Price (₱):</label>
                      <input type="number" class="form-control" id="editProductPrice" step="0.01" required>
                    </div>
                    <div class="form-group mb-3">
                      <label>Category:</label>
                      <select class="form-control" id="editCategoryDropdown">
                        <option value="">Select a Category</option>
                      </select>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="form-group mb-3">
                      <label>Product Image:</label>
                      <input type="file" class="form-control-file" id="editProductImage" accept="image/*">
                    </div>
                    <div class="form-group">
                      <label>Current Image:</label>
                      <div id="editImagePreviewContainer" class="text-center">
                        <img id="editImagePreview" class="img-fluid" style="max-height: 200px; display: none;">
                        <div id="editNoImageText" class="text-muted">No image uploaded</div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="closeModal('editProductModal')">Cancel</button>
              <button type="button" class="btn btn-primary" id="confirmEditProduct">Update Product</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.addEventListener('click', (e) => {
      if (e.target.id === 'confirmEditProduct') handleEditProduct();
    });

    document.addEventListener('change', (e) => {
      if (e.target.id === 'editProductImage') {
        const file = e.target.files[0];
        const preview = document.getElementById('editImagePreview');
        const noImageText = document.getElementById('editNoImageText');
        
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            preview.src = e.target.result;
            preview.style.display = 'block';
            noImageText.style.display = 'none';
          };
          reader.readAsDataURL(file);
        }
      }
    });
  }

  // Event listeners
  document.getElementById('applyFiltersBtn').addEventListener('click', () => {
    const search = document.getElementById('searchInput').value.trim();
    const category = document.getElementById('categoryFilter').value;
    fetchSellerProducts({ search, category_id: category });
  });

  document.getElementById('logoutButton').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = 'login.html';
  });

  // Global functions for external use
  window.testBackendDirectly = async function() {
    const isConnected = await testBackendConnection();
    showNotification(
      isConnected ? '✅ Backend is reachable!' : '❌ Cannot reach backend server.',
      isConnected ? 'success' : 'error'
    );
  };

  window.closeModal = closeModal;
  window.showModal = showModal;
  window.safeFetch = safeFetch;
  window.fetchSellerProducts = fetchSellerProducts;
  window.debugLog = debugLog;
  window.showNotification = showNotification;
  window.showConfirmation = showConfirmation;

  // Initialize
  createStockModal();
  createEditProductModal();

  async function initializeDashboard() {
    try {
      await Promise.allSettled([loadCategories(), fetchSellerProducts(), checkNotifications()]);
      setInterval(checkNotifications, 60000);
    } catch (error) {
      debugLog('Initialization error:', error);
    }
  }

  initializeDashboard();
});

// Global variables
let currentProductId = null;
let currentEditProductId = null;
let isStockOperationInProgress = false;

// Global functions
function openAddStockModal(productId, productName, currentStock) {
  if (isStockOperationInProgress) return;
  
  currentProductId = productId;
  
  // Reset form
  document.getElementById('modalProductName').value = productName;
  document.getElementById('modalCurrentStock').value = currentStock;
  document.getElementById('modalStockToAdd').value = '';
  document.getElementById('modalNewTotalStockAdd').value = currentStock;
  document.getElementById('modalAddNote').value = '';
  document.getElementById('modalStockToSubtract').value = '';
  document.getElementById('modalNewTotalStockSubtract').value = currentStock;
  document.getElementById('modalSubtractReason').value = '';
  document.getElementById('modalSubtractNote').value = '';
  
  // Reset to Add tab
  document.getElementById('add-tab').classList.add('active');
  document.getElementById('subtract-tab').classList.remove('active');
  document.getElementById('add-panel').classList.add('show', 'active');
  document.getElementById('subtract-panel').classList.remove('show', 'active');
  document.getElementById('confirmAddStock').style.display = 'block';
  document.getElementById('confirmSubtractStock').style.display = 'none';
  
  window.showModal('addStockModal');
}

async function openEditProductModal(productId) {
  currentEditProductId = productId;
  const BACKEND_URL = 'https://backend-rj0a.onrender.com';
  const user = JSON.parse(localStorage.getItem('user'));
  
  try {
    window.showModal('editProductModal');
    
    const response = await window.safeFetch(`${BACKEND_URL}/api/products/${productId}`, {
      headers: { 'X-User-ID': user.id }
    });
    
    if (!response.ok) throw new Error('Could not fetch product data');
    
    const data = await response.json();
    const product = data.details || data;
    
    // Populate form
    document.getElementById('editProductModalLabel').textContent = `Edit Product: ${product.name}`;
    document.getElementById('editProductName').value = product.name || '';
    document.getElementById('editProductDescription').value = product.description || '';
    document.getElementById('editProductPrice').value = product.price || '';
    document.getElementById('editCategoryDropdown').value = product.category_id || '';
    
    // Handle image
    const preview = document.getElementById('editImagePreview');
    const noImageText = document.getElementById('editNoImageText');
    
    if (product.image) {
      preview.src = product.image;
      preview.style.display = 'block';
      noImageText.style.display = 'none';
    } else {
      preview.style.display = 'none';
      noImageText.style.display = 'block';
    }
    
  } catch (error) {
    window.showNotification(`Error loading product: ${error.message}`, 'error', () => {
      window.closeModal('editProductModal');
    });
  }
}

async function handleEditProduct() {
  const BACKEND_URL = 'https://backend-rj0a.onrender.com';
  const user = JSON.parse(localStorage.getItem('user'));
  const confirmBtn = document.getElementById('confirmEditProduct');
  
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = 'Updating...';

  try {
    const formData = new FormData();
    formData.append('name', document.getElementById('editProductName').value);
    formData.append('description', document.getElementById('editProductDescription').value);
    formData.append('price', document.getElementById('editProductPrice').value);
    formData.append('category_id', document.getElementById('editCategoryDropdown').value);
    
    const imageInput = document.getElementById('editProductImage');
    if (imageInput.files[0]) formData.append('image', imageInput.files[0]);
    
    const response = await fetch(`${BACKEND_URL}/api/products/${currentEditProductId}`, {
      method: 'POST',
      headers: { 'X-User-ID': user.id },
      body: formData
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Failed to update product');
    
    window.showNotification('Product updated successfully!', 'success', () => {
      window.closeModal('editProductModal');
      setTimeout(() => window.location.href = 'seller_dashboard.html', 800);
    });

  } catch (error) {
    window.showNotification(`Error: ${error.message}`, 'error');
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = 'Update Product';
  }
}

async function handleAddStock() {
  const stockToAdd = parseInt(document.getElementById('modalStockToAdd').value);
  const note = document.getElementById('modalAddNote').value.trim();
  
  if (!stockToAdd || stockToAdd < 1) {
    window.showNotification('Please enter a valid amount of stock to add.', 'warning');
    return;
  }

  if (isStockOperationInProgress) return;
  isStockOperationInProgress = true;

  const confirmBtn = document.getElementById('confirmAddStock');
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = 'Adding...';

  try {
    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const user = JSON.parse(localStorage.getItem('user'));
    
    const response = await window.safeFetch(`${BACKEND_URL}/api/seller/add-stock`, {
      method: 'POST',
      body: JSON.stringify({
        product_id: currentProductId,
        stock_to_add: stockToAdd,
        note: note
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': user.id
      }
    });

    if (!response.ok) throw new Error('Failed to add stock');

    const result = await response.json();
    window.showNotification(
      `Successfully added ${stockToAdd} items. New total: ${result.new_stock}`, 
      'success', 
      () => {
        window.closeModal('addStockModal');
        window.fetchSellerProducts();
      }
    );

  } catch (error) {
    window.showNotification(`Error: ${error.message}`, 'error');
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = 'Add Stock';
    isStockOperationInProgress = false;
  }
}

async function handleSubtractStock() {
  const stockToSubtract = parseInt(document.getElementById('modalStockToSubtract').value);
  const reason = document.getElementById('modalSubtractReason').value;
  const currentStock = parseInt(document.getElementById('modalCurrentStock').value) || 0;
  
  if (!stockToSubtract || stockToSubtract < 1) {
    window.showNotification('Please enter a valid amount of stock to remove.', 'warning');
    return;
  }
  
  if (!reason) {
    window.showNotification('Please select a reason for removing stock.', 'warning');
    return;
  }
  
  if (stockToSubtract > currentStock) {
    window.showNotification(
      `Cannot remove ${stockToSubtract} items. Only ${currentStock} available.`,
      'error'
    );
    return;
  }

  // Show confirmation dialog
  window.showConfirmation(
    `Remove ${stockToSubtract} items from stock?<br><br><strong>Reason:</strong> ${reason}`,
    async (confirmed) => {
      if (!confirmed) return;

      if (isStockOperationInProgress) return;
      isStockOperationInProgress = true;

      const confirmBtn = document.getElementById('confirmSubtractStock');
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = 'Removing...';

      try {
        const BACKEND_URL = 'https://backend-rj0a.onrender.com';
        const user = JSON.parse(localStorage.getItem('user'));
        const newStock = currentStock - stockToSubtract;
        
        const response = await window.safeFetch(`${BACKEND_URL}/api/products/${currentProductId}/stock`, {
          method: 'POST',
          body: JSON.stringify({ stock: newStock }),
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': user.id
          }
        });

        if (!response.ok) throw new Error('Failed to remove stock');

        window.showNotification(
          `Successfully removed ${stockToSubtract} items. New total: ${newStock}`,
          'success',
          () => {
            window.closeModal('addStockModal');
            window.fetchSellerProducts();
          }
        );

      } catch (error) {
        window.showNotification(`Error: ${error.message}`, 'error');
      } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = 'Remove Stock';
        isStockOperationInProgress = false;
      }
    }
  );
}

async function deleteProduct(productId, productName) {
  window.showConfirmation(
    `Delete "<strong>${productName}</strong>"?<br><br>⚠️ <em>This action cannot be undone.</em>`,
    async (confirmed) => {
      if (!confirmed) return;

      const BACKEND_URL = 'https://backend-rj0a.onrender.com';
      const user = JSON.parse(localStorage.getItem('user'));
      
      try {
        const methods = ['DELETE', 'POST'];
        let success = false;
        
        for (const method of methods) {
          try {
            const options = {
              method: method,
              headers: { 'X-User-ID': user.id }
            };
            
            if (method === 'POST') {
              options.headers['Content-Type'] = 'application/json';
              options.body = JSON.stringify({ action: 'delete' });
            }
            
            const response = await window.safeFetch(`${BACKEND_URL}/api/products/${productId}`, options);
            
            if (response.ok) {
              success = true;
              break;
            }
            
            if (response.status !== 405) break;
          } catch (error) {
            continue;
          }
        }
        
        if (success) {
          window.showNotification(
            `"<strong>${productName}</strong>" has been deleted successfully.`,
            'success',
            () => {
              setTimeout(() => location.reload(), 500);
            }
          );
        } else {
          window.showNotification(`Failed to delete "${productName}".`, 'error');
        }
        
      } catch (error) {
        window.showNotification(`Error deleting product: ${error.message}`, 'error');
      }
    }
  );
}