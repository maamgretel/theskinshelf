/**
 * This is the main function that contains all of your app's logic. It will be
 * called by the event listeners at the bottom of the file once the app is ready.
 */
function startApp() {
    console.log("Application is ready. Starting up...");

    // --- ADDED: This function will run first to ask for permission on mobile ---
    checkAndRequestStoragePermission();

    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const user = JSON.parse(localStorage.getItem('user'));

    // --- 1. Security & Initial Setup ---
    if (!user || user.role !== 'admin') {
        localStorage.clear();
        alert('Access Denied. Please log in as an admin.');
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('userName').textContent = user.name;
    const profilePic = document.getElementById('profilePic');
    if (profilePic) {
        const imagePath = `../uploads/${user.profile_pic || 'default-avatar.png'}`;
        profilePic.src = imagePath;
        profilePic.onerror = function() {
            this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2MzY2RjEiLz4KPHN2ZyB4PSI4IiB5PSI4IiB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPgo8cGF0aCBkPSJNMTIgMTJjMi4yMSAwIDQtMS43OSA0LTRzLTEuNzktNC00LTQtNCAxLjc5LTQgNCAxLjc5IDQgNCA0em0wIDJjLTIuNjcgMC04IDEuMzQtOCA0djJoMTZ2LTJjMC0yLjY2LTUuMzMtNC04LTR6Ii8+Cjwvc3ZnPgo8L3N2Zz4K';
        };
    }

    // --- 3. Fetch Dashboard Data ---
    async function fetchDashboardData() {
        showLoadingState();
        try {
            const response = await fetch(`${BACKEND_URL}/api/admin/dashboard-data`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-User-ID': user.id.toString()
                },
                mode: 'cors'
            });

            if (!response.ok) throw new Error('Could not fetch dashboard data.');
            const data = await response.json();
            updateAnalytics(data.analytics);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            showLoadingError();
            showErrorNotification(error.message);
        }
    }

    // --- 4. Show Loading State ---
    function showLoadingState() {
        const elements = ['totalUsers', 'totalProducts', 'totalOrders', 'totalSales'];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '<div class="spinner"></div>';
        });
    }

    // --- 5. Update Analytics on Page ---
    function updateAnalytics(analytics) {
        animateNumber(document.getElementById('totalUsers'), analytics.total_users || 0);
        animateNumber(document.getElementById('totalProducts'), analytics.total_products || 0);
        animateNumber(document.getElementById('totalOrders'), analytics.total_orders || 0);

        const totalSalesEl = document.getElementById('totalSales');
        if (totalSalesEl) {
            const salesAmount = parseFloat(analytics.total_sales || 0);
            totalSalesEl.innerHTML = `₱${salesAmount.toFixed(2)}`;
        }
    }

    // --- 6. Animate Numbers ---
    function animateNumber(element, targetValue) {
        if (!element) return;
        let currentValue = 0;
        const duration = 1000;
        const stepTime = 16;
        const increment = targetValue / (duration / stepTime);

        const timer = setInterval(() => {
            currentValue += increment;
            if (currentValue >= targetValue) {
                currentValue = targetValue;
                clearInterval(timer);
            }
            element.textContent = Math.floor(currentValue);
        }, stepTime);
    }

    // --- 7/8. Notifications ---
    function showErrorNotification(message) {
        let errorDiv = document.getElementById('error-notification');
        if (errorDiv) errorDiv.remove();
        
        errorDiv = document.createElement('div');
        errorDiv.id = 'error-notification';
        errorDiv.style.cssText = `position: fixed; top: 20px; right: 20px; background: #f8d7da; color: #721c24; padding: 12px 20px; border: 1px solid #f5c6cb; border-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); z-index: 1050; max-width: 300px; font-size: 14px;`;
        document.body.appendChild(errorDiv);
        
        errorDiv.innerHTML = `<strong>Error:</strong><br>${message}<button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; font-size: 18px; color: #721c24; cursor: pointer;">&times;</button>`;
        setTimeout(() => { if (errorDiv && errorDiv.parentElement) errorDiv.remove(); }, 8000);
    }
    
    function showSuccessNotification(message) {
        let successDiv = document.getElementById('success-notification');
        if (successDiv) successDiv.remove();

        successDiv = document.createElement('div');
        successDiv.id = 'success-notification';
        successDiv.style.cssText = `position: fixed; top: 20px; right: 20px; background: #d4edda; color: #155724; padding: 12px 20px; border: 1px solid #c3e6cb; border-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); z-index: 1050; max-width: 300px; font-size: 14px;`;
        document.body.appendChild(successDiv);

        successDiv.innerHTML = `<strong>Success!</strong><br>${message}<button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; font-size: 18px; color: #155724; cursor: pointer;">&times;</button>`;
        setTimeout(() => { if (successDiv && successDiv.parentElement) successDiv.remove(); }, 5000);
    }

    // --- 9. Show loading error ---
    function showLoadingError() {
        const elements = ['totalUsers', 'totalProducts', 'totalOrders', 'totalSales'];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = 'Error';
        });
    }

    // --- 10. Logout ---
    function logout() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.clear();
            window.location.href = 'login.html';
        }
    }
    
    // --- 11. CSV EXPORT LOGIC ---
    async function handleExport(type) {
        const button = type === 'users' ? document.getElementById('exportUsersBtn') : document.getElementById('exportOrdersBtn');
        if (!button) return;

        const originalText = button.innerHTML;
        button.innerHTML = `<span class="spinner-small"></span> Generating...`;
        button.disabled = true;

        try {
            const response = await fetch(`${BACKEND_URL}/api/admin/export/${type}`, {
                method: 'GET',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-User-ID': user.id.toString()
                },
                mode: 'cors'
            });

            if (!response.ok) throw new Error(`Failed to fetch ${type} data from server.`);

            const data = await response.json();
            if (!data || data.length === 0) {
                alert(`No ${type} data available to export.`);
                return;
            }

            downloadAsCsv(data, `${type}_export_${new Date().toISOString().split('T')[0]}.csv`);

        } catch (error) {
            alert(`Error exporting ${type}: ${error.message}`);
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    // --- 12. CSV DOWNLOAD FUNCTION (with Cordova support) ---
    function downloadAsCsv(data, filename) {
        const csvString = convertJsonToCsv(data);
        if (!csvString) {
            alert('Error: Could not create CSV data.');
            return;
        }
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

        if (window.cordova && window.cordova.file) {
            saveWithCordovaFilePlugin(blob, filename);
        } else {
            saveWithBrowser(blob, filename);
        }
    }

    function saveWithCordovaFilePlugin(blob, filename) {
        const storageLocation = cordova.file.externalRootDirectory + 'Download/';
        window.resolveLocalFileSystemURL(storageLocation,
            (dirEntry) => {
                dirEntry.getFile(filename, { create: true, exclusive: false }, (fileEntry) => {
                    writeFile(fileEntry, blob);
                }, (err) => { showErrorNotification("Could not create file. Error code: " + err.code); console.error(err); });
            },
            (err) => { showErrorNotification("Could not access storage. Check app permissions. Error code: " + err.code); console.error(err); }
        );
    }

    function writeFile(fileEntry, dataBlob) {
        fileEntry.createWriter((fileWriter) => {
            fileWriter.onwriteend = () => {
                showSuccessNotification(`Export complete! Saved to your Downloads folder.`);
            };
            fileWriter.onerror = (e) => {
                showErrorNotification("A problem occurred while saving the file.");
                console.error("File write error:", e);
            };
            fileWriter.write(dataBlob);
        });
    }

    function saveWithBrowser(blob, filename) {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showSuccessNotification('Export completed successfully!');
    }

    function convertJsonToCsv(data) {
        if (!data || data.length === 0) return '';
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header] ?? '';
                const escaped = String(value).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        });
        return csvRows.join('\n');
    }

    // --- ADDED: This function uses the permissions plugin to ask the user to allow storage access. ---
    function checkAndRequestStoragePermission() {
        if (window.cordova && window.cordova.plugins && window.cordova.plugins.permissions) {
            const permissions = cordova.plugins.permissions;
            const requiredPermission = permissions.WRITE_EXTERNAL_STORAGE;

            permissions.checkPermission(requiredPermission, (status) => {
                // If the app does not have permission...
                if (!status.hasPermission) {
                    console.log("Storage permission not yet granted. Requesting now...");
                    // ...ask the user for it.
                    permissions.requestPermission(requiredPermission, (requestStatus) => {
                        if (requestStatus.hasPermission) {
                            console.log("Storage permission granted by user.");
                        } else {
                            console.warn("Storage permission was denied by user.");
                            alert("Storage permission is required to save export files. You can grant it later in your phone's app settings.");
                        }
                    });
                } else {
                    console.log("Storage permission already exists.");
                }
            });
        }
    }

    // --- Attach Event Listeners & Initialize ---
    document.getElementById('logoutButton')?.addEventListener('click', logout);
    document.getElementById('exportUsersBtn')?.addEventListener('click', () => handleExport('users'));
    document.getElementById('exportOrdersBtn')?.addEventListener('click', () => handleExport('orders'));
    
    fetchDashboardData();

} // --- End of startApp function ---


/**
 * Startup listener. Ensures the app logic only runs once the
 * device (for mobile) or the page (for web) is fully ready.
 */
let appHasInitialized = false;

function onAppReady() {
    if (appHasInitialized) return;
    appHasInitialized = true;
    startApp();
}

document.addEventListener('DOMContentLoaded', onAppReady);
document.addEventListener('deviceready', onAppReady, false);