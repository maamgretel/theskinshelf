document.addEventListener('DOMContentLoaded', () => {

    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const user = JSON.parse(localStorage.getItem('user'));

    // --- 1. Get Product ID from URL ---
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    // --- DOM Element References ---
    const editProductForm = document.getElementById('editProductForm');
    const updateButton = document.getElementById('updateButton');
    const productNameTitle = document.getElementById('productNameTitle');
    const imagePreview = document.getElementById('imagePreview');
    const noImageText = document.getElementById('noImageText');
    const mainContent = document.getElementById('main-content');

    // --- 2. Security & Validation Checks ---
    if (!user || user.role !== 'seller') {
        alert('Access Denied. Please log in as a seller.');
        window.location.href = '../login.html';
        return;
    }
    if (!productId) {
        mainContent.innerHTML = '<div class="alert alert-danger">No product ID specified. Please go back to the dashboard and select a product to edit.</div>';
        return;
    }

    // --- 3. Function to Fetch and Populate Product Data ---
    async function fetchAndPopulateProduct() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/products/${productId}`, {
                headers: { 'X-User-ID': user.id }
            });
            if (!response.ok) {
                throw new Error('Could not fetch product data. You may not be the owner.');
            }
            const product = await response.json();
            populateForm(product);
        } catch (error) {
            console.error('Error fetching product:', error);
            mainContent.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
        }
    }

    // --- 4. Function to Fill the Form with Data ---
    function populateForm(product) {
        productNameTitle.textContent = `Edit Product: ${product.name}`;
        document.getElementById('name').value = product.name;
        document.getElementById('description').value = product.description;
        document.getElementById('price').value = product.price;
        document.getElementById('stock').value = product.stock;
        
        if (product.image) {
            imagePreview.src = `../../uploads/${product.image}`;
            imagePreview.style.display = 'block';
            noImageText.style.display = 'none';
        } else {
            imagePreview.style.display = 'none';
            noImageText.style.display = 'block';
        }
    }

    // --- 5. Event Listener for Form Submission ---
    editProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        updateButton.disabled = true;
        updateButton.textContent = 'Updating...';
        
        const formData = new FormData(editProductForm);

        try {
            // Using POST to handle multipart/form-data easily
            const response = await fetch(`${BACKEND_URL}/api/products/${productId}`, {
                method: 'POST', 
                headers: { 'X-User-ID': user.id },
                body: formData
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Failed to update product.');
            }
            
            showAlert('Product updated successfully! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'seller_dashboard.html';
            }, 2000);

        } catch (error) {
            console.error('Update error:', error);
            showAlert(error.message, 'danger');
            updateButton.disabled = false;
            updateButton.textContent = 'Update Product';
        }
    });

    // --- Helper function for displaying alerts ---
    function showAlert(message, type = 'info', duration = 3000) {
        const alertContainer = document.getElementById('alert-container');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        alertContainer.innerHTML = ''; // Clear previous alerts
        alertContainer.append(alert);
        if (type === 'success') {
            setTimeout(() => {
                const alertNode = alertContainer.querySelector('.alert');
                if (alertNode) alertNode.remove();
            }, duration);
        }
    }

    // --- Initial Call ---
    fetchAndPopulateProduct();
});
