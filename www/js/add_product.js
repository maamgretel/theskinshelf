document.addEventListener('DOMContentLoaded', () => {

    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const user = JSON.parse(localStorage.getItem('user'));

    // Security check
    if (!user || user.role !== 'seller') {
        alert('Access Denied. Please log in as a seller.');
        window.location.href = '../login.html';
        return;
    }

    const addProductForm = document.getElementById('addProductForm');
    const submitButton = document.getElementById('submitButton');
    const formAlert = document.getElementById('form-alert');
    const categoryDropdown = document.getElementById('categoryDropdown');

    // ✅ NEW: This function fetches categories and populates the dropdown
    async function loadCategories() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/categories`);
            if (!response.ok) throw new Error('Could not load categories.');
            
            const categories = await response.json();

            // Clear the "Loading..." text
            categoryDropdown.innerHTML = '<option value="">Select a Category</option>'; 
            
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.name;
                categoryDropdown.appendChild(option);
            });
        } catch (error) {
            console.error(error);
            categoryDropdown.innerHTML = '<option value="">Error loading categories</option>';
        }
    }

    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(addProductForm);

        submitButton.disabled = true;
        submitButton.textContent = 'Uploading...';
        showAlert('', 'd-none');

        try {
            const response = await fetch(`${BACKEND_URL}/api/products`, {
                method: 'POST',
                headers: {
                    'X-User-ID': user.id
                },
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                showAlert('Product added successfully! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'seller_dashboard.html'; 
                }, 2000);
            } else {
                throw new Error(result.error || 'An unknown error occurred.');
            }
        } catch (error) {
            showAlert(error.message, 'danger');
            submitButton.disabled = false;
            submitButton.textContent = 'Add Product';
        }
    });
    
    function showAlert(message, type) {
        if(!formAlert) return;
        formAlert.textContent = message;
        formAlert.className = 'alert';
        if (type !== 'd-none') {
            formAlert.classList.add(type === 'success' ? 'alert-success' : 'alert-danger');
        }
    }

    // ✅ Initial call to populate the categories dropdown when the page loads
    loadCategories();
});