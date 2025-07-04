document.addEventListener('DOMContentLoaded', () => {
  const BACKEND_URL = 'https://backend-rj0a.onrender.com';
  const user = JSON.parse(localStorage.getItem('user'));

  if (!user || user.role !== 'seller') {
    localStorage.clear();
    alert('Access Denied. Please log in as a seller.');
    window.location.href = 'login.html';
    return;
  }

  document.getElementById('userName').textContent = user.name;
  const profilePic = document.getElementById('profilePic');
  profilePic.src = user.profile_pic || '../assets/default-avatar.png';

  // --- Load products with optional filters ---
  async function fetchSellerProducts(filters = {}) {
    try {
      const params = new URLSearchParams(filters);
      const response = await fetch(`${BACKEND_URL}/api/seller/products?${params}`, {
        headers: { 'X-User-ID': user.id }
      });
      if (!response.ok) throw new Error('Failed to fetch products');
      const products = await response.json();
      renderProducts(products);
    } catch (err) {
      console.error('Fetch error:', err);
      document.getElementById('productListRow').innerHTML =
        '<p class="text-danger text-center">Could not load products.</p>';
    }
  }

  // --- Display products ---
  function renderProducts(products) {
    const container = document.getElementById('productListRow');
    container.innerHTML = '';

    if (!products.length) {
      container.innerHTML =
        '<p class="text-center w-100">No products found. Add some!</p>';
      return;
    }

    products.forEach((p) => {
      const productImage = p.image || '../assets/default-product.png';
      const productPrice = parseFloat(p.price).toFixed(2);
      const cardHTML = `
        <div class="col-md-4 product-card">
          <div class="card mb-4 shadow-sm">
            <div class="card-body text-center">
              <img src="${productImage}" alt="${p.name}" class="img-fluid mb-2" />
              <h5 class="card-title">${p.name}</h5>
              <p class="mb-2"><span class="badge badge-info">${p.category_name || 'No Category'}</span></p>
              <p class="card-text text-muted">${p.description || ''}</p>
              <strong>₱${productPrice}</strong><br />
              <small>Stock: ${p.stock}</small><br />
              <div class="mt-2">
                <a href="edit_product.html?id=${p.id}" class="btn btn-sm btn-warning">✏️ Edit</a>
                <a href="#" class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id}, '${p.name}')">🗑 Delete</a>
              </div>
            </div>
          </div>
        </div>
      `;
      container.innerHTML += cardHTML;
    });
  }

  // --- Load category options ---
  async function loadCategories() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/categories`);
      if (!response.ok) return;
      const categories = await response.json();
      const categoryFilter = document.getElementById('categoryFilter');
      categories.forEach((cat) => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        categoryFilter.appendChild(option);
      });
    } catch (err) {
      console.warn('Failed to load categories:', err);
    }
  }

  // --- Apply filters ---
  document.getElementById('applyFiltersBtn').addEventListener('click', () => {
    const search = document.getElementById('searchInput').value.trim();
    const category = document.getElementById('categoryFilter').value;
    fetchSellerProducts({ search, category_id: category });
  });

  // --- Notification badge ---
  async function checkNotifications() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/notifications/unread-count`, {
        headers: { 'X-User-ID': user.id }
      });
      const data = await response.json();
      const badge = document.getElementById('notifBadge');
      if (data.count > 0) {
        badge.style.display = 'inline-block';
        badge.textContent = data.count > 9 ? '9+' : data.count;
      } else {
        badge.style.display = 'none';
      }
    } catch (e) {
      // Ignore errors silently
    }
  }

  // --- Logout ---
  document.getElementById('logoutButton').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    window.location.href = 'login.html';
  });

  // --- Initial load ---
  loadCategories();
  fetchSellerProducts();
  checkNotifications();
  setInterval(checkNotifications, 30000);
});

// Outside listener for inline onclick
function deleteProduct(productId, productName) {
  if (confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
    alert(`Product with ID ${productId} would be deleted. (Add backend logic)`);
  }
}