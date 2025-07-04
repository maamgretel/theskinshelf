document.addEventListener('DOMContentLoaded', () => {

    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const user = JSON.parse(localStorage.getItem('user'));

    // --- 1. Security Check ---
    if (!user) {
        alert('Access Denied. Please log in.');
        window.location.href = 'login.html';
        return;
    }

    // --- DOM Element References ---
    const profileForm = document.getElementById('profileForm');
    const updateButton = document.getElementById('updateButton');
    const profilePicPreview = document.getElementById('profilePicPreview');
    const backButton = document.getElementById('backButton');

    // --- 2. Function to Fetch and Populate Profile Data ---
    async function fetchAndPopulateProfile() {
        try {
            // The auth decorator on the backend now handles user lookup
            const response = await fetch(`${BACKEND_URL}/api/profile`, {
                headers: {
                    // Assuming your auth decorator uses a token from localStorage
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'X-User-ID': user.id // Keep sending this if your decorator needs it
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    alert('Session expired or invalid. Please log in again.');
                    localStorage.clear(); // Clear all stale data
                    window.location.href = 'login.html';
                    return;
                }
                throw new Error('Could not fetch profile data.');
            }

            const profileData = await response.json();
            populateForm(profileData);

        } catch (error) {
            console.error('Error fetching profile:', error);
            showAlert(error.message, 'danger');
        }
    }

    // --- 3. Function to Fill the Form with Data ---
    function populateForm(data) {
        document.getElementById('name').value = data.name || '';
        document.getElementById('email').value = data.email || '';
        document.getElementById('contact_number').value = data.contact_number || '';
        document.getElementById('address').value = data.address || '';
        
        // =================================================================
        // ✅ UPDATED: This is the only change needed.
        // =================================================================
        // The backend now sends a full, absolute URL from Cloudinary.
        // We just need to use that URL directly.
        profilePicPreview.src = data.profile_pic 
            ? data.profile_pic // This now contains the full URL like "https://res.cloudinary.com/..."
            : '../assets/default-avatar.png'; // The fallback to a local default avatar is still correct.
        // =================================================================
        
        // Set the correct "Back" button URL based on user role
        backButton.href = `${data.role}_dashboard.html`;
    }

    // --- 4. Event Listener for Form Submission ---
    // This section is already correct and does not need changes.
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Show loading state
        updateButton.disabled = true;
        updateButton.textContent = 'Updating...';

        // Create a FormData object from the form to handle file upload
        const formData = new FormData(profileForm);
        
        try {
            const response = await fetch(`${BACKEND_URL}/api/profile`, {
                method: 'PUT',
                headers: {
                    // Your auth decorator will handle user identification from the token
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'X-User-ID': user.id // Keep sending if needed
                },
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to update profile.');
            }

            // --- IMPORTANT: Update localStorage with the new user data ---
            // This now includes the new Cloudinary URL for the profile_pic
            localStorage.setItem('user', JSON.stringify(result.user));

            showAlert('Profile updated successfully!', 'success');
            // Re-populate the form with the fresh data from the server
            populateForm(result.user);

        } catch (error) {
            console.error('Update error:', error);
            showAlert(error.message, 'danger');
        } finally {
            // Restore button state
            updateButton.disabled = false;
            updateButton.textContent = 'Update Profile';
        }
    });

    // --- Helper for showing alerts ---
    function showAlert(message, type = 'info', duration = 4000) {
        const alertContainer = document.getElementById('alert-container');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.role = 'alert';
        alert.innerHTML = `
            ${message}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        `;
        alertContainer.innerHTML = ''; // Clear previous alerts
        alertContainer.append(alert);

        if (type === 'success') {
            setTimeout(() => {
                const alertNode = alertContainer.querySelector('.alert');
                if (alertNode) {
                    alertNode.classList.remove('show');
                }
            }, duration);
        }
    }

    // --- Initial Call to load the profile data ---
    fetchAndPopulateProfile();
});