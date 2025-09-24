// js/shared.js

const BACKEND_URL = 'https://backend-rj0a.onrender.com';

async function updateCartBadge() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return; // Don't run if user isn't logged in

    const badge = document.getElementById('cart-badge');
    if (!badge) return;

    try {
        const response = await fetch(`${BACKEND_URL}/api/cart/count`, {
            headers: { 'X-User-ID': user.id.toString() }
        });
        if (!response.ok) throw new Error('Failed to fetch cart count');

        const data = await response.json();
        const count = data.count;

        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    } catch (error) {
        console.error("Could not update cart badge:", error);
        badge.style.display = 'none';
    }
}

// Handle logout functionality
function setupLogout() {
    console.log('Setting up logout functionality...');
    
    // Wait a short moment to ensure Bootstrap is fully loaded
    setTimeout(() => {
        const logoutBtn = document.getElementById('logoutBtn');
        const modalElement = document.getElementById('logoutModal');
        const confirmLogoutBtn = document.getElementById('confirmLogout');

        console.log('Found elements:', {
            logoutBtn: !!logoutBtn,
            modalElement: !!modalElement,
            confirmLogoutBtn: !!confirmLogoutBtn
        });

        if (!logoutBtn || !modalElement || !confirmLogoutBtn) {
            console.error('Required logout elements not found');
            return;
        }

        // Make sure Bootstrap is available
        if (!window.bootstrap) {
            console.error('Bootstrap is not loaded!');
            return;
        }

        // Initialize the Bootstrap modal
        let logoutModal;
        try {
            logoutModal = new bootstrap.Modal(modalElement);
            console.log('Modal initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Bootstrap modal:', error);
            return;
        }

        // Add click handler for the logout button
        logoutBtn.addEventListener('click', function(e) {
            console.log('Logout button clicked');
            e.preventDefault();
            try {
                logoutModal.show();
                console.log('Modal shown successfully');
            } catch (error) {
                console.error('Failed to show modal:', error);
                // Fallback: if modal fails, just do direct logout
                if (confirm('Are you sure you want to log out?')) {
                    localStorage.removeItem('user');
                    sessionStorage.removeItem('sellerId');
                    window.location.href = 'login.html';
                }
            }
        });

        // Add click handler for the confirm logout button
        confirmLogoutBtn.addEventListener('click', function() {
            console.log('Confirm logout clicked');
            // Clear all stored data
            localStorage.removeItem('user');
            sessionStorage.removeItem('sellerId');
            // Redirect to login page
            window.location.href = 'login.html';
        });
    }, 500); // Give a 500ms delay to ensure everything is loaded
}

// Update the badge and setup logout when any page loads
document.addEventListener('DOMContentLoaded', function() {
    updateCartBadge();
    setupLogout();
});