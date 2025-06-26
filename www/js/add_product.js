document.addEventListener('DOMContentLoaded', () => {

    const BACKEND_URL = 'https://backend-rj0a.onrender.com';

    // --- MODIFIED: We only need the user object ---
    const user = JSON.parse(localStorage.getItem('user'));

    // Security check is now simpler
    if (!user || user.role !== 'seller') {
        alert('Access Denied. Please log in as a seller.');
        window.location.href = '../login.html';
        return;
    }

    const addProductForm = document.getElementById('addProductForm');
    const submitButton = document.getElementById('submitButton');
    const formAlert = document.getElementById('form-alert');

    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(addProductForm);

        submitButton.disabled = true;
        submitButton.textContent = 'Uploading...';
        showAlert('', 'd-none');

        try {
            const response = await fetch(`${BACKEND_URL}/api/products`, {
                method: 'POST',
                // --- MODIFIED: Headers now send the User ID ---
                headers: {
                    // No 'Authorization' header needed.
                    // We send the user's ID in a custom header.
                    'X-User-ID': user.id
                },
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                showAlert('Product added successfully! Redirecting...', 'success');
                setTimeout(() => {
                    // Corrected redirection path
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
});