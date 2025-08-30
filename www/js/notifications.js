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

    // --- 2. Local Storage Functions for Read State (Temporary) ---
    function getLocalReadNotifications() {
        return JSON.parse(localStorage.getItem(`readNotifications_${user.id}`) || '[]');
    }

    function markNotificationAsReadLocally(notificationId) {
        const readNotifications = getLocalReadNotifications();
        if (!readNotifications.includes(notificationId)) {
            readNotifications.push(notificationId);
            localStorage.setItem(`readNotifications_${user.id}`, JSON.stringify(readNotifications));
        }
    }

    function isNotificationReadLocally(notificationId) {
        const readNotifications = getLocalReadNotifications();
        return readNotifications.includes(notificationId);
    }

    function clearLocalReadNotifications() {
        localStorage.removeItem(`readNotifications_${user.id}`);
    }
    
    // --- 3. Function to Mark Individual Notification as Read (Backend) ---
    async function markNotificationAsRead(notificationId) {
        try {
            const response = await fetch(`${BACKEND_URL}/api/notifications/${notificationId}/read`, {
                method: 'POST',
                headers: { 'X-User-ID': user.id }
            });
            return response.ok;
        } catch (error) {
            console.error('Could not mark notification as read:', error);
            return false;
        }
    }

    // --- 4. Function to Mark All Notifications as Read ---
    async function markAllAsRead() {
        try {
            fetch(`${BACKEND_URL}/api/notifications/mark-as-read`, {
                method: 'POST',
                headers: { 'X-User-ID': user.id }
            });
        } catch (error) {
            console.error('Could not mark notifications as read:', error);
        }
    }

    // --- 5. Function to Fetch and Display All Notifications ---
    async function fetchAndDisplayNotifications() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/notifications`, {
                headers: { 'X-User-ID': user.id }
            });
            if (!response.ok) {
                throw new Error('Could not fetch notifications.');
            }
            const notifications = await response.json();
            
            // Clear local read state since we're getting fresh data from backend
            clearLocalReadNotifications();
            
            renderNotifications(notifications);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            notificationList.innerHTML = `<li class="list-group-item text-center text-danger">Failed to load notifications.</li>`;
        }
    }

    // --- 6. Function to Show Notification Modal ---
    function showNotificationModal(notification) {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'notificationModal';
        modal.tabIndex = -1;
        modal.setAttribute('role', 'dialog');
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-bell text-primary mr-2"></i>
                            Notification Details
                        </h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="notification-detail">
                            <p class="mb-3">${notification.message}</p>
                            <small class="text-muted">
                                <i class="far fa-clock mr-1"></i>
                                ${new Date(notification.created_at).toLocaleString()}
                            </small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" data-dismiss="modal">
                            <i class="fas fa-check mr-1"></i>
                            Mark as Read
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        $(modal).modal('show');
        
        // Remove modal from DOM when hidden
        $(modal).on('hidden.bs.modal', function() {
            modal.remove();
        });
    }

    // --- 7. Function to Render the Notification List ---
    function renderNotifications(notifications) {
        notificationList.innerHTML = ''; // Clear the "Loading..." message

        if (notifications.length === 0) {
            notificationList.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-bell-slash text-muted mb-3" style="font-size: 3rem;"></i>
                    <h5 class="text-muted">No notifications yet</h5>
                    <p class="text-muted">You're all caught up! Check back later for updates.</p>
                </div>
            `;
            return;
        }

        notifications.forEach((n, index) => {
            const li = document.createElement('li');
            
            // Check for unread status - prioritize backend state, use local only for immediate feedback
            const isUnreadBackend = n.is_read === false || 
                           n.is_read === 0 || 
                           n.read_at === null || 
                           n.read_at === undefined || 
                           n.status === 'unread' ||
                           !n.hasOwnProperty('is_read');
            
            const isReadLocally = isNotificationReadLocally(n.id);
            
            // Show as unread only if backend says unread AND not marked locally as read
            const isUnread = isUnreadBackend && !isReadLocally;
            
            li.className = `list-group-item notification-item border-0 mb-2 ${isUnread ? 'unread-notification' : ''} ${isReadLocally ? 'notification-read-locally' : ''}`;

            // Format the date for better readability
            const date = new Date(n.created_at);
            const now = new Date();
            const timeDiff = now - date;
            const minutes = Math.floor(timeDiff / (1000 * 60));
            const hours = Math.floor(timeDiff / (1000 * 60 * 60));
            const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

            let timeAgo;
            if (minutes < 1) {
                timeAgo = 'Just now';
            } else if (minutes < 60) {
                timeAgo = `${minutes}m ago`;
            } else if (hours < 24) {
                timeAgo = `${hours}h ago`;
            } else if (days < 7) {
                timeAgo = `${days}d ago`;
            } else {
                timeAgo = date.toLocaleDateString();
            }

            // Determine notification type and icon
            let icon = 'fas fa-info-circle';
            let iconColor = 'text-primary';
            let borderColor = 'border-left-primary';

            if (n.message.toLowerCase().includes('order')) {
                icon = 'fas fa-shopping-bag';
                iconColor = 'text-success';
                borderColor = 'border-left-success';
            } else if (n.message.toLowerCase().includes('payment') || n.message.toLowerCase().includes('paid')) {
                icon = 'fas fa-credit-card';
                iconColor = 'text-warning';
                borderColor = 'border-left-warning';
            } else if (n.message.toLowerCase().includes('delivery') || n.message.toLowerCase().includes('shipped')) {
                icon = 'fas fa-truck';
                iconColor = 'text-info';
                borderColor = 'border-left-info';
            } else if (n.message.toLowerCase().includes('cancel') || n.message.toLowerCase().includes('failed')) {
                icon = 'fas fa-exclamation-triangle';
                iconColor = 'text-danger';
                borderColor = 'border-left-danger';
            }

            // Add some styling for better appearance
            li.innerHTML = `
                <div class="notification-card ${borderColor} ${isUnread ? 'unread-card' : ''}">
                    <div class="d-flex align-items-start">
                        <div class="notification-icon ${iconColor} mr-3">
                            <i class="${icon}"></i>
                            ${isUnread ? '<div class="unread-dot"></div>' : ''}
                        </div>
                        <div class="flex-grow-1">
                            <div class="notification-content">
                                <p class="mb-1 notification-message ${isUnread ? 'font-weight-bold' : ''}">${n.message}</p>
                                <div class="d-flex justify-content-between align-items-center">
                                    <small class="text-muted notification-time">
                                        <i class="far fa-clock mr-1"></i>${timeAgo}
                                        ${isUnread ? '<span class="badge badge-primary badge-pill ml-2">New</span>' : ''}
                                    </small>
                                    ${isUnread ? `
                                        <button class="btn btn-sm btn-outline-primary read-btn" data-notification-id="${n.id}">
                                            <i class="fas fa-eye mr-1"></i>Read
                                        </button>
                                    ` : '<small class="text-success"><i class="fas fa-check mr-1"></i>Read</small>'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Add click event for the read button
            const readBtn = li.querySelector('.read-btn');
            if (readBtn) {
                readBtn.addEventListener('click', async function(e) {
                    e.stopPropagation();
                    const notificationId = this.getAttribute('data-notification-id');
                    
                    // Immediately mark as read locally and update UI
                    markNotificationAsReadLocally(notificationId);
                    
                    // Remove unread styling immediately
                    li.classList.remove('unread-notification');
                    li.classList.add('notification-read-locally');
                    
                    // Update the notification card
                    const card = li.querySelector('.notification-card');
                    card.classList.remove('unread-card');
                    
                    // Remove unread dot and badge
                    const unreadDot = li.querySelector('.unread-dot');
                    const badge = li.querySelector('.badge');
                    if (unreadDot) unreadDot.remove();
                    if (badge) badge.remove();
                    
                    // Replace read button with "Read" text
                    const buttonContainer = this.parentElement;
                    buttonContainer.innerHTML = '<small class="text-success"><i class="fas fa-check mr-1"></i>Read</small>';
                    
                    // Make message not bold
                    const message = li.querySelector('.notification-message');
                    message.classList.remove('font-weight-bold');
                    
                    // Mark as read on backend (non-blocking)
                    markNotificationAsRead(notificationId).then(success => {
                        if (!success) {
                            console.warn('Failed to mark notification as read on backend');
                        }
                    });
                });
            }

            // Add click event for unread notifications (modal)
            if (isUnread) {
                li.style.cursor = 'pointer';
                li.addEventListener('click', function(e) {
                    // Don't trigger if clicking on the read button
                    if (!e.target.closest('.read-btn')) {
                        showNotificationModal(n);
                    }
                });
            }

            notificationList.appendChild(li);
        });
    }

    // --- Initial Calls When Page Loads ---
    fetchAndDisplayNotifications(); // Fetch and display the content
});