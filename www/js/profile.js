document.addEventListener('DOMContentLoaded', () => {

    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const DEFAULT_AVATAR_URL = 'https://res.cloudinary.com/dwgvlwkyt/image/upload/v1751856106/default-avatar.jpg';
    const user = JSON.parse(localStorage.getItem('user'));

    // --- OTP Related Variables ---
    let otpVerificationInProgress = false;
    let pendingProfileUpdate = null;
    let otpTimer = null;
    let otpCountdown = 300; // 5 minutes in seconds

    // --- 1. Security Check ---
    if (!user) {
        alert('Access Denied. Please log in.');
        window.location.href = 'login.html';
        return;
    }

    // --- DOM Element References ---
    const profileForm = document.getElementById('profileForm');
    const passwordForm = document.getElementById('passwordForm');
    const updateButton = document.getElementById('updateButton');
    const changePasswordButton = document.getElementById('changePasswordButton');
    const profilePicPreview = document.getElementById('profilePicPreview');
    const backButton = document.getElementById('backButton');
    const profilePicInput = document.getElementById('profile_pic');

    // --- Helper function to ensure valid profile picture URL ---
    function getValidProfilePicUrl(profilePicUrl) {
        if (!profilePicUrl || profilePicUrl.trim() === '') {
            console.log('🖼️ [IMAGE] No profile pic URL provided, using default avatar');
            return DEFAULT_AVATAR_URL;
        }
        
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

    // --- Helper function to parse address string into components ---
    function parseAddress(addressString) {
        const addressData = {
            street_address: '',
            barangay: '',
            city: '',
            province: '',
            postal_code: '',
            landmark: ''
        };

        if (!addressString || addressString.trim() === '') {
            return addressData;
        }

        const parts = addressString.split(',').map(part => part.trim()).filter(part => part !== '');
        
        if (parts.length > 0) addressData.street_address = parts[0] || '';
        if (parts.length > 1) addressData.barangay = parts[1] || '';
        if (parts.length > 2) addressData.city = parts[2] || '';
        if (parts.length > 3) addressData.province = parts[3] || '';
        if (parts.length > 4) addressData.postal_code = parts[4] || '';
        if (parts.length > 5) addressData.landmark = parts[5] || '';

        return addressData;
    }

    // --- Helper function to combine address fields into single string ---
    function combineAddressFields() {
        const streetAddress = document.getElementById('street_address').value.trim();
        const barangay = document.getElementById('barangay').value.trim();
        const city = document.getElementById('city').value.trim();
        const province = document.getElementById('province').value.trim();
        const postalCode = document.getElementById('postal_code').value.trim();
        const landmark = document.getElementById('landmark').value.trim();
        
        const addressParts = [streetAddress, barangay, city, province, postalCode, landmark]
            .filter(part => part !== '');
        
        const combinedAddress = addressParts.join(', ');
        console.log('🏠 [ADDRESS] Combined address:', combinedAddress);
        
        return combinedAddress;
    }

    // --- 🔐 OTP VERIFICATION FUNCTIONS ---

    // Create OTP Modal HTML
    function createOTPModal() {
        const modalHTML = `
            <div id="otpModal" class="modal fade" tabindex="-1" role="dialog" data-backdrop="static" data-keyboard="false">
                <div class="modal-dialog modal-dialog-centered" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">🔐 Verify Your Identity</h5>
                        </div>
                        <div class="modal-body">
                            <div id="otpRequestSection">
                                <p>To protect your account, we need to verify your identity before making changes to your profile.</p>
                                <p><strong>An OTP will be sent to:</strong> ${user.email}</p>
                                <button id="sendOTPButton" class="btn btn-primary btn-block">Send OTP</button>
                            </div>
                            
                            <div id="otpVerificationSection" style="display: none;">
                                <p>Enter the 6-digit OTP sent to your email:</p>
                                <div class="form-group">
                                    <input type="text" id="otpInput" class="form-control text-center" 
                                           placeholder="000000" maxlength="6" 
                                           style="font-size: 24px; letter-spacing: 5px;">
                                </div>
                                <div id="otpTimer" class="text-center mb-3">
                                    <small class="text-muted">OTP expires in: <span id="otpCountdownDisplay">5:00</span></small>
                                </div>
                                <button id="verifyOTPButton" class="btn btn-success btn-block">Verify OTP</button>
                                <button id="resendOTPButton" class="btn btn-link btn-block">Resend OTP</button>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button id="cancelOTPButton" class="btn btn-secondary">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if present
        const existingModal = document.getElementById('otpModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add event listeners
        document.getElementById('sendOTPButton').addEventListener('click', requestOTP);
        document.getElementById('verifyOTPButton').addEventListener('click', verifyOTP);
        document.getElementById('resendOTPButton').addEventListener('click', requestOTP);
        document.getElementById('cancelOTPButton').addEventListener('click', cancelOTPVerification);

        // Auto-focus on OTP input when it becomes visible
        document.getElementById('otpInput').addEventListener('input', function(e) {
            // Only allow numbers
            this.value = this.value.replace(/[^0-9]/g, '');
            
            // Auto-verify when 6 digits are entered
            if (this.value.length === 6) {
                setTimeout(() => verifyOTP(), 500);
            }
        });
    }

    // Request OTP from server
    async function requestOTP() {
        console.log('🔐 [OTP REQUEST] Requesting OTP...');
        
        const sendButton = document.getElementById('sendOTPButton');
        const resendButton = document.getElementById('resendOTPButton');
        
        // Show loading state
        if (sendButton) {
            sendButton.disabled = true;
            sendButton.textContent = 'Sending OTP...';
        }
        if (resendButton) {
            resendButton.disabled = true;
            resendButton.textContent = 'Sending...';
        }

        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/request-password-otp`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'X-User-ID': user.id,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: user.email,
                    purpose: 'profile_update'
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to send OTP');
            }

            console.log('✅ [OTP REQUEST] OTP sent successfully');
            
            // Switch to verification section
            document.getElementById('otpRequestSection').style.display = 'none';
            document.getElementById('otpVerificationSection').style.display = 'block';
            
            // Start countdown timer
            startOTPCountdown();
            
            // Focus on OTP input
            document.getElementById('otpInput').focus();
            
            showAlert('OTP sent to your email address!', 'success');

        } catch (error) {
            console.error('❌ [OTP REQUEST] Failed to send OTP:', error);
            showAlert(error.message, 'danger');
        } finally {
            // Restore button states
            if (sendButton) {
                sendButton.disabled = false;
                sendButton.textContent = 'Send OTP';
            }
            if (resendButton) {
                resendButton.disabled = false;
                resendButton.textContent = 'Resend OTP';
            }
        }
    }

    // Verify OTP with server
 async function verifyOTP() {
    const otpInput = document.getElementById('otpInput');
    const otpCode = otpInput.value.trim();

    if (!otpCode || otpCode.length !== 6) {
        showAlert('Please enter a valid 6-digit OTP', 'warning');
        otpInput.focus();
        return;
    }

    console.log('🔐 [OTP VERIFY] Verifying OTP...');

    const verifyButton = document.getElementById('verifyOTPButton');
    verifyButton.disabled = true;
    verifyButton.textContent = 'Verifying...';

    // Get user from localStorage
    let user = null;
    try {
        user = JSON.parse(localStorage.getItem('user'));
    } catch (e) {
        console.warn('⚠️ Could not parse user from localStorage:', e);
    }

    if (!user?.email || !user?.id) {
        showAlert('User authentication error. Please log in again.', 'danger');
        verifyButton.disabled = false;
        verifyButton.textContent = 'Verify OTP';
        return;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/api/auth/verify-password-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-ID': user.id
            },
            body: JSON.stringify({
                email: user.email,
                otp: otpCode,
                purpose: 'profile_update'
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'OTP verification failed');
        }

        console.log('✅ [OTP VERIFY] OTP verified successfully');
        console.log('🔑 [OTP VERIFY] New token from server:', result.token);

        // ✅ Save new authToken and user info
        if (result.token) {
            localStorage.setItem('authToken', result.token);
            console.log('🔑 [OTP VERIFY] Token saved to localStorage');
        } else {
            console.warn('⚠️ [OTP VERIFY] No token received from server');
        }

        if (result.user) {
            localStorage.setItem('user', JSON.stringify(result.user));
            console.log('👤 [OTP VERIFY] User data updated in localStorage');
        }

        // Close modal and proceed
        $('#otpModal').modal('hide');
        otpVerificationInProgress = false;

        if (otpTimer) {
            clearInterval(otpTimer);
            otpTimer = null;
        }

        showAlert('Identity verified successfully!', 'success');

        // 👉 Continue to profile update or password change - pass the token directly
        if (pendingPasswordChange) {
            console.log('🔐 [OTP SUCCESS] Proceeding with password change...');
            // Pass the token directly to avoid localStorage issues
            await executePasswordChange(pendingPasswordChange, result.token);
            pendingPasswordChange = null;
        } else if (pendingProfileUpdate) {
            console.log('🔐 [OTP SUCCESS] Proceeding with profile update...');
            await executeProfileUpdate(pendingProfileUpdate);
            pendingProfileUpdate = null;
        }

    } catch (error) {
        console.error('❌ [OTP VERIFY] OTP verification failed:', error);
        showAlert(error.message, 'danger');
        otpInput.value = '';
        otpInput.focus();
    } finally {
        verifyButton.disabled = false;
        verifyButton.textContent = 'Verify OTP';
    }
}

    // Cancel OTP verification
  function cancelOTPVerification() {
    console.log('🔐 [OTP CANCEL] User cancelled OTP verification');
    
    $('#otpModal').modal('hide');
    otpVerificationInProgress = false;
    pendingProfileUpdate = null;
    pendingPasswordChange = null; // Clear password change data too
    
    // Clear the timer
    if (otpTimer) {
        clearInterval(otpTimer);
        otpTimer = null;
    }
    
    // Restore form button states
    updateButton.disabled = false;
    updateButton.textContent = 'Update Profile';
    
    changePasswordButton.disabled = false;
    changePasswordButton.textContent = 'Change Password';
}


    // Start OTP countdown timer
    function startOTPCountdown() {
        otpCountdown = 300; // Reset to 5 minutes
        
        if (otpTimer) {
            clearInterval(otpTimer);
        }
        
        otpTimer = setInterval(() => {
            otpCountdown--;
            
            const minutes = Math.floor(otpCountdown / 60);
            const seconds = otpCountdown % 60;
            const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            const countdownElement = document.getElementById('otpCountdownDisplay');
            if (countdownElement) {
                countdownElement.textContent = display;
            }
            
            if (otpCountdown <= 0) {
                clearInterval(otpTimer);
                otpTimer = null;
                
                // Show expired message
                showAlert('OTP has expired. Please request a new one.', 'warning');
                
                // Reset to request section
                document.getElementById('otpVerificationSection').style.display = 'none';
                document.getElementById('otpRequestSection').style.display = 'block';
            }
        }, 1000);
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
        
        // Parse and populate address fields
        const addressData = parseAddress(data.address || '');
        console.log('🏠 [ADDRESS] Parsed address data:', addressData);
        
        document.getElementById('street_address').value = addressData.street_address;
        document.getElementById('barangay').value = addressData.barangay;
        document.getElementById('city').value = addressData.city;
        document.getElementById('province').value = addressData.province;
        document.getElementById('postal_code').value = addressData.postal_code;
        document.getElementById('landmark').value = addressData.landmark;
        
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

    // --- 5. Enhanced Event Listener for Profile Form Submission with OTP ---
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        console.log('🚀 [UPDATE START] Profile form submitted. Checking if OTP verification is needed...');

        // Check if significant changes are being made that require OTP
        const requiresOTP = await checkIfOTPRequired();
        
        if (requiresOTP && !otpVerificationInProgress) {
            console.log('🔐 [OTP REQUIRED] Significant changes detected, OTP verification required');
            
            // Store the form data for later execution
            pendingProfileUpdate = {
                formData: new FormData(profileForm),
                combinedAddress: combineAddressFields(),
                profilePicFile: profilePicInput.files[0]
            };
            
            // Show OTP modal
            createOTPModal();
            $('#otpModal').modal('show');
            
            // Set flag to prevent double submission
            otpVerificationInProgress = true;
            
            return; // Exit here, will continue after OTP verification
        }

        // If no OTP required or already verified, proceed with update
        const formData = new FormData();
        formData.append('name', document.getElementById('name').value);
        formData.append('email', document.getElementById('email').value);
        formData.append('contact_number', document.getElementById('contact_number').value);
        formData.append('address', combineAddressFields());
        
        if (profilePicInput.files[0]) {
            formData.append('profile_pic', profilePicInput.files[0]);
        }
        
        await executeProfileUpdate({ formData, combinedAddress: combineAddressFields(), profilePicFile: profilePicInput.files[0] });
    });

    // Check if OTP is required for current changes
    async function checkIfOTPRequired() {
        try {
            // Get current user data
            const currentEmail = user.email;
            const currentName = user.name;
            
            // Get form data
            const formEmail = document.getElementById('email').value;
            const formName = document.getElementById('name').value;
            const hasNewProfilePic = profilePicInput.files[0] !== undefined;
            
            // Check if email or name is changing, or if new profile picture is being uploaded
            const emailChanged = currentEmail !== formEmail;
            const nameChanged = currentName !== formName;
            
            return emailChanged || nameChanged || hasNewProfilePic;
        } catch (error) {
            console.error('❌ [OTP CHECK] Error checking OTP requirement:', error);
            return true; // Default to requiring OTP if there's an error
        }
    }

    // Execute the actual profile update
    async function executeProfileUpdate(updateData) {
        console.log('🚀 [UPDATE EXECUTE] Executing profile update...');
        
        // Show loading state
        updateButton.disabled = true;
        updateButton.textContent = 'Updating...';

        try {
            const response = await fetch(`${BACKEND_URL}/api/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'X-User-ID': user.id
                },
                body: updateData.formData
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
    }

    // --- 6. Enhanced Password Change with OTP ---
    passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('🔐 [PASSWORD CHANGE START] Password form submitted. Requiring OTP verification...');

    // Password changes always require OTP
    const currentPassword = document.getElementById('current_password').value;
    const newPassword = document.getElementById('new_password').value;
    const confirmPassword = document.getElementById('confirm_password').value;

    // Client-side validation
    if (newPassword !== confirmPassword) {
        showAlert('New passwords do not match!', 'danger');
        return;
    }

    if (newPassword.length < 8) {
        showAlert('New password must be at least 8 characters long!', 'danger');
        return;
    }

    if (currentPassword === newPassword) {
        showAlert('New password must be different from current password!', 'warning');
        return;
    }

    // Store password change data in the correct variable
    pendingPasswordChange = {
        currentPassword,
        newPassword
    };

    // Clear profile update pending data
    pendingProfileUpdate = null;

    // Show OTP modal
    createOTPModal();
    $('#otpModal').modal('show');
    
    otpVerificationInProgress = true;
});

   // Execute password change after OTP verification
async function executePasswordChange(passwordData, otpToken = null) {
    console.log('🔐 [PASSWORD CHANGE EXECUTE] Executing password change...');

    // Disable the button while processing
    const changePasswordButton = document.getElementById('changePasswordButton');
    const passwordForm = document.getElementById('passwordForm');
    changePasswordButton.disabled = true;
    changePasswordButton.textContent = 'Changing Password...';

    // Try to get token from parameter first, then localStorage
    let token = otpToken || localStorage.getItem('authToken');
    let user = null;

    try {
        user = JSON.parse(localStorage.getItem('user'));
    } catch (err) {
        console.warn('⚠️ Could not parse user from localStorage:', err);
    }

    console.log('📦 Token (from parameter):', otpToken);
    console.log('📦 Token (from localStorage):', localStorage.getItem('authToken'));
    console.log('📦 Final token being used:', token);
    console.log('👤 User:', user);

    // Abort if token or user ID is missing
    if (!token || !user || !user.id) {
        showAlert('🔒 Authentication error. Please log in again.', 'danger');
        changePasswordButton.disabled = false;
        changePasswordButton.textContent = 'Change Password';
        
        // If no token, redirect to login
        if (!token) {
            console.error('❌ [PASSWORD CHANGE] No valid token found, redirecting to login');
            setTimeout(() => {
                localStorage.clear();
                window.location.href = 'login.html';
            }, 2000);
        }
        return;
    }

    try {
        console.log('🚀 [PASSWORD CHANGE] Making API call to change password...');
        
        const response = await fetch(`${BACKEND_URL}/api/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-User-ID': user.id
            },
            body: JSON.stringify({
                current_password: passwordData.currentPassword,
                new_password: passwordData.newPassword
            })
        });

        console.log('📡 [PASSWORD CHANGE] API Response status:', response.status);
        
        const result = await response.json();
        console.log('📡 [PASSWORD CHANGE] API Response data:', result);

        if (!response.ok) {
            throw new Error(result.error || 'Failed to change password.');
        }

        console.log('✅ [PASSWORD CHANGE SUCCESS] Password changed successfully');
        showAlert('✅ Password changed successfully!', 'success');
        if (passwordForm) passwordForm.reset();

    } catch (err) {
        console.error('❌ [PASSWORD CHANGE FAILED]', err);
        showAlert(err.message || 'Something went wrong. Please try again.', 'danger');
    } finally {
        changePasswordButton.disabled = false;
        changePasswordButton.textContent = 'Change Password';
        console.log('🔄 [PASSWORD CHANGE END] Button restored.');
    }
}




    // --- Modified executeProfileUpdate to handle both profile and password changes ---
    async function executeProfileUpdate(updateData) {
        if (updateData.isPasswordChange) {
            await executePasswordChange(updateData);
            return;
        }

        // Original profile update logic
        console.log('🚀 [UPDATE EXECUTE] Executing profile update...');
        
        updateButton.disabled = true;
        updateButton.textContent = 'Updating...';

        try {
            const response = await fetch(`${BACKEND_URL}/api/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'X-User-ID': user.id
                },
                body: updateData.formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Failed to update profile. Status: ${response.status}`);
            }
            
            console.log('💾 [UPDATE SUCCESS] New user data received from server:', result.user);
            
            localStorage.setItem('user', JSON.stringify(result.user));
            console.log('💾 [UPDATE SUCCESS] localStorage has been updated.');

            showAlert('Profile updated successfully!', 'success');
            populateForm(result.user);
            profilePicInput.value = '';

        } catch (error) {
            console.error('❌ [UPDATE FAILED] An error occurred during profile update:', error);
            showAlert(error.message, 'danger');
        } finally {
            updateButton.disabled = false;
            updateButton.textContent = 'Update Profile';
            console.log('🔄 [UPDATE END] Process finished. Button restored.');
        }
    }

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
        alertContainer.appendChild(alert);

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
    setupImageFallback(profilePicPreview);
    profilePicPreview.src = DEFAULT_AVATAR_URL;
    fetchAndPopulateProfile();
});