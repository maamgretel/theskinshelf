document.addEventListener('DOMContentLoaded', initLogin);
document.addEventListener('deviceready', initLogin, false);

let isInitialized = false;

function initLogin() {
    if (isInitialized) return;
    isInitialized = true;

    const loginForm = document.getElementById('loginForm');
    const loginAlert = document.getElementById('login-alert');
    const backendUrl = 'https://backend-rj0a.onrender.com/api/auth/login';

    if (!loginForm) return;

    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        loginAlert.classList.add('d-none');

        const formData = new FormData(loginForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (response.ok) {
                // Save user object in localStorage
                localStorage.setItem('user', JSON.stringify(result.user));

                // If the user is a seller, also store their ID in sessionStorage
                if (result.user.role === 'seller') {
                    sessionStorage.setItem('sellerId', result.user.id);
                }

                showAlert('Login successful! Redirecting...', 'success');

                setTimeout(() => {
                    const userRole = result.user.role;
                    if (userRole === 'admin') {
                        window.location.href = 'admin_dashboard.html';
                    } else if (userRole === 'seller') {
                        window.location.href = 'seller_dashboard.html';
                    } else if(userRole === 'customer')
                    {
                        window.location.href = 'customer_dashboard.html';
                    }else {
                        // Redirect to a general index or customer page
                        window.location.href = '../index.html'; 
                    }
                }, 1500);

            } else {
                showAlert(result.error || 'An unknown error occurred.', 'danger');
            }
        } catch (error) {
            console.error('Login error:', error);
            showAlert('Cannot connect to the server. Please try again later.', 'danger');
        }
    });

    function showAlert(message, type) {
        if (!loginAlert) return;
        loginAlert.textContent = message;
        loginAlert.classList.remove('alert-danger', 'alert-success');
        loginAlert.classList.add(type === 'success' ? 'alert-success' : 'alert-danger');
        loginAlert.classList.remove('d-none');
    }
}