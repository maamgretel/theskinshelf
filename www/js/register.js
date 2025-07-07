// register.js - (Updated JavaScript Logic)

// Wait for either deviceready (Cordova) or DOMContentLoaded (web browser)
document.addEventListener('deviceready', initRegister, false);
document.addEventListener('DOMContentLoaded', initRegister, false);

let isInitialized = false;

function initRegister() {
    if (isInitialized) return; // Prevent double initialization
    isInitialized = true;

    // Get both forms and the alert box
    const registerForm = document.getElementById('registerForm');
    const verifyForm = document.getElementById('verifyForm');
    const alertBox = document.getElementById('alert-box');

    // Make sure elements exist
    if (!registerForm || !verifyForm || !alertBox) {
        console.error('One or more required form elements are missing.');
        return;
    }

    // == STEP 1: Handle the initial registration form submission ==
    registerForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        clearAlert();

        const formData = new FormData(registerForm);
        const data = Object.fromEntries(formData.entries());

        if (!data.role) {
            return showAlert('Please select a user role.', 'danger');
        }

        try {
            // Send data to the backend to request OTP
            const response = await fetch('https://backend-rj0a.onrender.com/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (response.ok) {
                // Success: OTP was sent
                showAlert(result.message, 'info'); // "Verification OTP sent..."
                
                // Hide register form, show verify form
                registerForm.classList.add('d-none');
                verifyForm.classList.remove('d-none');
                
                // Store the email in the hidden field of the verify form
                document.getElementById('verifyEmail').value = data.email;
            } else {
                // Handle errors (e.g., email already exists)
                showAlert(result.error || 'An unknown error occurred.', 'danger');
            }
        } catch (error) {
            console.error('Registration request error:', error);
            showAlert('Could not connect to the server. Please try again later.', 'danger');
        }
    });

    // == STEP 2: Handle the OTP verification form submission ==
    verifyForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        clearAlert();
        
        const formData = new FormData(verifyForm);
        const data = Object.fromEntries(formData.entries());

        if (!data.otp || data.otp.length < 6) {
             return showAlert('Please enter a valid 6-digit OTP.', 'danger');
        }

        try {
            // Send email and OTP to the new verification endpoint
            const response = await fetch('https://backend-rj0a.onrender.com/api/auth/verify-registration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (response.ok) {
                // Final success!
                showAlert('Registration successful! Redirecting to login...', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html'; // Redirect to login page
                }, 2000);
            } else {
                // Handle errors (e.g., invalid OTP)
                showAlert(result.error || 'Verification failed.', 'danger');
            }

        } catch (error) {
            console.error('Verification error:', error);
            showAlert('Could not connect to the server for verification.', 'danger');
        }
    });

    /** Helper function to display messages in the alert box. */
    function showAlert(message, type) {
        alertBox.textContent = message;
        alertBox.className = `alert alert-${type}`; // Replaces all classes
    }
    
    /** Helper function to clear previous alerts */
    function clearAlert(){
        alertBox.className = 'alert d-none';
    }
}