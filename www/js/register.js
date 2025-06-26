// Wait for either deviceready (Cordova) or DOMContentLoaded (web browser)
document.addEventListener('deviceready', initRegister, false);
document.addEventListener('DOMContentLoaded', initRegister, false);

let isInitialized = false;

function initRegister() {
    if (isInitialized) return; // Prevent double initialization
    isInitialized = true;

    const registerForm = document.getElementById('registerForm');
    const alertBox = document.getElementById('alert-box');

    if (!registerForm) {
        console.error('Register form not found');
        return;
    }

    registerForm.addEventListener('submit', async function (e) {
        e.preventDefault(); // Stop the form from submitting the traditional way

        // Clear previous alerts
        alertBox.classList.add('d-none');
        alertBox.classList.remove('alert-success', 'alert-danger');

        // Get form data
        const formData = new FormData(registerForm);
        const data = Object.fromEntries(formData.entries());

        // Simple validation to ensure role is selected
        if (!data.role) {
            showAlert('Please select a user role.', 'danger');
            return;
        }

        try {
            // Send data to the backend API
            const response = await fetch('https://backend-rj0a.onrender.com/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (response.ok) {
                // Handle success
                showAlert('Registration successful! Redirecting to login...', 'success');
                registerForm.reset(); // Clear the form fields
                setTimeout(() => {
                    window.location.href = 'login.html'; // Redirect to login page
                }, 2000); // 2-second delay
            } else {
                // Handle errors from the API (e.g., email already exists)
                showAlert(result.error || 'An unknown error occurred.', 'danger');
            }
        } catch (error) {
            // Handle network errors (e.g., backend is not running)
            console.error('Registration error:', error);
            showAlert('Could not connect to the server. Please try again later.', 'danger');
        }
    });

    /**
     * Helper function to display messages in the alert box.
     * @param {string} message - The message to display.
     * @param {string} type - 'success' or 'danger' for styling.
     */
    function showAlert(message, type) {
        if (!alertBox) return;
        
        alertBox.textContent = message;
        alertBox.classList.remove('d-none');
        alertBox.classList.add(`alert-${type}`);
    }
}