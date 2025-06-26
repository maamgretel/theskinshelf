document.addEventListener('DOMContentLoaded', () => {

    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const user = JSON.parse(localStorage.getItem('user'));

    // --- 1. Security Check ---
    if (!user) {
        alert('Access Denied. Please log in.');
        window.location.href = 'login.html';
        return;
    }

    const notificationList = document.getElementById('notificationList');
    const backButton = document.getElementById('backButton');

    // Set the "Back" button's link based on the user's role
    if (user.role) {
        backButton.href = `${user.role}_dashboard.html`;
    } else {
        backButton.style.display = 'none'; // Hide if role is unknown
    }
    
    // --- 2. Function to Mark Notifications as Read ---
    async function markAsRead() {
        try {
            // This is a "fire-and-forget" request. We don't need to wait for the response
            // to continue loading the page content.
            fetch(`${BACKEND_URL}/api/notifications/mark-as-read`, {
                method: 'POST',
                headers: { 'X-User-ID': user.id }
            });
        } catch (error) {
            // If this fails, it's not critical, so we just log it.
            console.error('Could not mark notifications as read:', error);
        }
    }

    // --- 3. Function to Fetch and Display All Notifications ---
    async function fetchAndDisplayNotifications() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/notifications`, {
                headers: { 'X-User-ID': user.id }
            });
            if (!response.ok) {
                throw new Error('Could not fetch notifications.');
            }
            const notifications = await response.json();
            renderNotifications(notifications);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            notificationList.innerHTML = `<li class="list-group-item text-center text-danger">Failed to load notifications.</li>`;
        }
    }

    // --- 4. Function to Render the Notification List ---
    function renderNotifications(notifications) {
        notificationList.innerHTML = ''; // Clear the "Loading..." message

        if (notifications.length === 0) {
            notificationList.innerHTML = `<li class="list-group-item text-center">You have no notifications.</li>`;
            return;
        }

        notifications.forEach(n => {
            const li = document.createElement('li');
            li.className = 'list-group-item';

            // Format the date for better readability
            const formattedDate = new Date(n.created_at).toLocaleString();

            li.innerHTML = `
                ${n.message}<br>
                <small class="text-muted">${formattedDate}</small>
            `;
            notificationList.appendChild(li);
        });
    }

    // --- Initial Calls When Page Loads ---
    markAsRead(); // Tell the backend to mark as read immediately
    fetchAndDisplayNotifications(); // Fetch and display the content
});
