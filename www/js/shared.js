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

// Update the badge when any page loads
document.addEventListener('DOMContentLoaded', updateCartBadge);