document.addEventListener('DOMContentLoaded', () => {

    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const user = JSON.parse(localStorage.getItem('user'));

    // Security check
    if (!user || user.role !== 'seller') {
        localStorage.clear();
        alert('Access Denied. Please log in as a seller.');
        window.location.href = 'login.html';
        return;
    }

    // --- Populate Page ---
    document.getElementById('userName').textContent = user.name;
    document.getElementById('profilePic').src = `/uploads/${user.profile_pic || 'default-avatar.png'}`;

    // --- Main function to get products from the API ---
    async function fetchSellerProducts() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/seller/products`, {
                headers: { 'X-User-ID': user.id }
            });

            if (!response.ok) {
                // This will be caught by the catch block below
                throw new Error('Failed to fetch products from server.');
            }
            
            const products = await response.json();
            // Call the function to display the products
            renderProducts(products);

        } catch (error) {
            console.error('Error fetching products:', error);
            document.getElementById('productListRow').innerHTML = '<p class="text-danger text-center">Could not load products.</p>';
        }
    }

    // --- THIS IS THE FUNCTION THAT DISPLAYS YOUR PRODUCTS ---
    function renderProducts(products) {
        const container = document.getElementById('productListRow');
        if (!container) {
            console.error("Error: The container with ID 'productListRow' was not found in the HTML.");
            return;
        }
        
        container.innerHTML = ''; // Clear loading message

        if (products.length === 0) {
            container.innerHTML = '<p class="text-center w-100">You have not added any products yet. Use the "Add Product" page to create one!</p>';
            return;
        }

        products.forEach(p => {
            const productImage = p.image ? `/uploads/${p.image}` : `/assets/default-product.png`;
            const productPrice = parseFloat(p.price).toFixed(2);

            const cardHTML = `
                <div class="col-md-4 product-card">
                    <div class="card mb-4 shadow-sm">
                        <div class="card-body text-center">
                            <img src="${productImage}" alt="${p.name}" class="img-fluid mb-2" style="height: 150px; object-fit: contain;">
                            <h5 class="card-title">${p.name}</h5>
                            <p class="card-text text-muted">${p.description || ''}</p>
                            <strong>$${productPrice}</strong><br>
                            <small>Stock: ${p.stock}</small><br>
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

    // --- Notification checking function ---
    async function checkNotifications() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/notifications/unread-count`, {
                headers: { 'X-User-ID': user.id }
            });
            if (!response.ok) return;
            const data = await response.json();
            const badge = document.getElementById('notifBadge');
            if (data.count > 0) {
                badge.style.display = 'inline-block';
                badge.textContent = data.count > 9 ? '9+' : data.count;
            } else {
                badge.style.display = 'none';
            }
        } catch (error) {
            // Fails silently
        }
    }

    // --- Logout button ---
    document.getElementById('logoutButton').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = 'login.html';
    });
    
    // --- Initial function calls when page loads ---
    fetchSellerProducts();
    checkNotifications();
    setInterval(checkNotifications, 30000);
});

// --- This function needs to be outside the DOMContentLoaded event listener to be accessible by onclick ---
function deleteProduct(productId, productName) {
    if (confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
        // Here you would add the real fetch call to your DELETE endpoint
        alert(`Product with ID ${productId} would be deleted. (Implement backend logic)`);
    }
}