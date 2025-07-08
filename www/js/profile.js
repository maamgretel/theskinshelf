document.addEventListener('DOMContentLoaded', () => {

    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const DEFAULT_AVATAR_URL = 'https://res.cloudinary.com/dwgvlwkyt/image/upload/v1751856106/default-avatar.jpg';
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
    const profilePicInput = document.getElementById('profile_pic');

    // --- Helper function to ensure valid profile picture URL ---
    function getValidProfilePicUrl(profilePicUrl) {
        // Check if the URL is valid and not empty
        if (!profilePicUrl || profilePicUrl.trim() === '') {
            console.log('🖼️ [IMAGE] No profile pic URL provided, using default avatar');
            return DEFAULT_AVATAR_URL;
        }
        
        // Check if it's a valid URL
        try {
            new URL(profilePicUrl);
            console.log('🖼️ [IMAGE] Valid profile pic URL provided:', profilePicUrl);
            return profilePicUrl;
        } catch (e) {
            console.log('🖼️ [IMAGE] Invalid profile pic URL, using default avatar');
            return DEFAULT_AVATAR_URL;
        }
    }

    // --- Helper function to handle image loading errors ---
    function setupImageFallback(imgElement) {
        imgElement.addEventListener('error', function() {
            console.log('🖼️ [IMAGE ERROR] Failed to load image, switching to default avatar');
            if (this.src !== DEFAULT_AVATAR_URL) {
                this.src = DEFAULT_AVATAR_URL;
            }
        });
    }

    // --- 2. Function to Fetch and Populate Profile Data ---
    async function fetchAndPopulateProfile() {
        console.log('🚀 [FETCH START] Attempting to fetch user profile...');
        try {
            const response = await fetch(`${BACKEND_URL}/api/profile`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'X-User-ID': user.id
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.error('❌ [FETCH FAILED] Unauthorized (401). Redirecting to login.');
                    alert('Session expired or invalid. Please log in again.');
                    localStorage.clear();
                    window.location.href = 'login.html';
                    return;
                }
                throw new Error(`Could not fetch profile data. Status: ${response.status}`);
            }

            const profileData = await response.json();
            
            console.log('✅ [FETCH SUCCESS] Raw profile data received from server:', profileData);
            console.log('✅ [FETCH SUCCESS] Profile pic URL from server is:', profileData.profile_pic);

            populateForm(profileData);

        } catch (error) {
            console.error('❌ [FETCH FAILED] A critical error occurred:', error);
            showAlert(error.message, 'danger');
        }
    }

    // --- 3. Function to Fill the Form with Data ---
    function populateForm(data) {
        console.log('🎨 [POPULATE FORM] Starting to populate form fields...');
        
        // Populate text fields
        document.getElementById('name').value = data.name || '';
        document.getElementById('email').value = data.email || '';
        document.getElementById('contact_number').value = data.contact_number || '';
        document.getElementById('address').value = data.address || '';
        
        // Handle profile picture with improved logic
        const validImageUrl = getValidProfilePicUrl(data.profile_pic);
        
        console.log('🎨 [POPULATE FORM] Final image URL to be used:', validImageUrl);
        
        // Set the image source
        profilePicPreview.src = validImageUrl;
        
        // Setup fallback handling
        setupImageFallback(profilePicPreview);
        
        // Set the correct "Back" button URL based on user role
        console.log(`🎨 [POPULATE FORM] Setting back button to: ${data.role}_dashboard.html`);
        backButton.href = `${data.role}_dashboard.html`;
    }

    // --- 4. Preview uploaded image before form submission ---
    profilePicInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // Check file type
            if (!file.type.startsWith('image/')) {
                showAlert('Please select a valid image file.', 'warning');
                this.value = '';
                return;
            }
            
            // Check file size (limit to 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showAlert('Image file is too large. Please choose a file smaller than 5MB.', 'warning');
                this.value = '';
                return;
            }
            
            // Create preview
            const reader = new FileReader();
            reader.onload = function(e) {
                profilePicPreview.src = e.target.result;
                console.log('🖼️ [PREVIEW] New image preview loaded');
            };
            reader.readAsDataURL(file);
        }
    });

    // --- 5. Event Listener for Form Submission ---
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('🚀 [UPDATE START] Form submitted. Attempting to update profile...');

        // Show loading state
        updateButton.disabled = true;
        updateButton.textContent = 'Updating...';

        const formData = new FormData(profileForm);
        
        try {
            const response = await fetch(`${BACKEND_URL}/api/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'X-User-ID': user.id
                },
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Failed to update profile. Status: ${response.status}`);
            }
            
            console.log('💾 [UPDATE SUCCESS] New user data received from server:', result.user);
            
            // Update localStorage with the new user data
            localStorage.setItem('user', JSON.stringify(result.user));
            console.log('💾 [UPDATE SUCCESS] localStorage has been updated.');

            showAlert('Profile updated successfully!', 'success');
            
            // Re-populate the form with the fresh data from the server
            populateForm(result.user);

            // Clear the file input after successful upload
            profilePicInput.value = '';

        } catch (error) {
            console.error('❌ [UPDATE FAILED] An error occurred during profile update:', error);
            showAlert(error.message, 'danger');
        } finally {
            // Restore button state
            updateButton.disabled = false;
            updateButton.textContent = 'Update Profile';
            console.log('🔄 [UPDATE END] Process finished. Button restored.');
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

    // --- Initial setup ---
    // Set up image fallback handling immediately
    setupImageFallback(profilePicPreview);
    
    // Set default avatar as fallback while loading
    profilePicPreview.src = DEFAULT_AVATAR_URL;
    
    // Initial call to load the profile data
    fetchAndPopulateProfile();
});