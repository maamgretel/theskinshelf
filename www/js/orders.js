document.addEventListener('DOMContentLoaded', () => {

    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const user = JSON.parse(localStorage.getItem('user'));
    let ordersData = [];
    let currentViewMode = 'auto'; // auto, regular, grouped

    // --- 1. Security Check ---
    if (!user || user.role !== 'seller') {
        localStorage.clear();
        alert('Access Denied. Please log in as a seller.');
        window.location.href = '../../pages/login.html';
        return;
    }

    const ordersTableBody = document.getElementById('ordersTableBody');
    const mobileOrdersContainer = document.getElementById('mobileOrdersContainer');
    const totalRevenueCell = document.getElementById('totalRevenueCell');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const toggleGroupBtn = document.getElementById('toggleGroupBtn');
    const bulkActionsDiv = document.getElementById('bulkActionsDiv');

    // --- 2. Mobile Detection ---
    function isMobileView() {
        return window.innerWidth <= 576;
    }

    // --- 3. Mobile Card Rendering ---
    function renderMobileOrders(orders) {
        if (!mobileOrdersContainer) return;
        
        mobileOrdersContainer.innerHTML = '';

        if (orders.length === 0) {
            mobileOrdersContainer.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
                    <p class="text-muted">You have no orders yet.</p>
                </div>
            `;
            return;
        }

        const statusOptions = ['Pending', 'Shipped', 'Delivered', 'Cancelled'];

        orders.forEach(order => {
            const optionsHTML = statusOptions.map(status => 
                `<option value="${status}" ${order.status === status ? 'selected' : ''}>${status}</option>`
            ).join('');

            const orderCard = document.createElement('div');
            orderCard.className = 'mobile-order-item';
            orderCard.innerHTML = `
                <div class="order-header">
                    <div class="product-name">${order.product_name}</div>
                    <span class="badge badge-${getStatusBadgeColor(order.status)}">${order.status}</span>
                </div>
                <div class="order-details">
                    <div class="detail-item">
                        <div class="detail-label">Buyer</div>
                        <div class="detail-value">${order.buyer_name}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Price</div>
                        <div class="detail-value">₱${parseFloat(order.total_price).toFixed(2)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Date</div>
                        <div class="detail-value">${order.formatted_date}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Time</div>
                        <div class="detail-value">${order.formatted_time}</div>
                    </div>
                </div>
                <div class="order-actions">
                    <select class="status-select mobile-status-select" data-order-id="${order.id}">
                        ${optionsHTML}
                    </select>
                    <button class="btn btn-primary update-btn mobile-update-btn" data-order-id="${order.id}">
                        Update
                    </button>
                </div>
            `;
            mobileOrdersContainer.appendChild(orderCard);
        });
    }

    function renderMobileGroupedOrders(groupedData) {
        if (!mobileOrdersContainer) return;
        
        mobileOrdersContainer.innerHTML = '';

        if (groupedData.length === 0) {
            mobileOrdersContainer.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
                    <p class="text-muted">You have no orders yet.</p>
                </div>
            `;
            return;
        }

        groupedData.forEach(group => {
            const pendingCount = group.orders.filter(o => o.status === 'Pending').length;
            const canBulkShip = pendingCount > 0;

            const groupCard = document.createElement('div');
            groupCard.className = 'mobile-group-card';
            groupCard.innerHTML = `
                <div class="group-header">
                    <div class="group-info">
                        <div class="buyer-name">👤 ${group.buyer_name}</div>
                        <div class="group-meta">
                            📅 ${group.formatted_date} • 
                            💰 ₱${group.total_amount.toFixed(2)} • 
                            📦 ${group.orders.length} items
                        </div>
                    </div>
                    <div class="group-actions">
                        ${canBulkShip ? 
                            `<button class="btn btn-success bulk-ship-btn" 
                                    data-buyer-id="${group.buyer_id}" 
                                    data-date="${group.order_date}"
                                    data-group-info='${JSON.stringify({buyer_id: group.buyer_id, order_date: group.order_date, buyer_name: group.buyer_name})}'>
                                📦 Ship ${pendingCount}
                            </button>` : 
                            '<small class="text-muted">All shipped</small>'
                        }
                    </div>
                </div>
                <div class="group-orders">
                    ${group.orders.map(order => `
                        <div class="group-order-item">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <div class="flex-grow-1">
                                    <div class="font-weight-bold">${order.product_name}</div>
                                    <small class="text-muted">${order.formatted_time}</small>
                                </div>
                                <div class="text-right">
                                    <div class="font-weight-bold">₱${order.total_price.toFixed(2)}</div>
                                    <span class="badge badge-${getStatusBadgeColor(order.status)} badge-sm">${order.status}</span>
                                </div>
                            </div>
                            <button class="btn btn-outline-primary btn-sm update-single-btn w-100" 
                                    data-order-id="${order.id}">
                                Update Individual Status
                            </button>
                        </div>
                    `).join('')}
                </div>
            `;
            mobileOrdersContainer.appendChild(groupCard);
        });
    }

    // --- 4. Progress Modal Functions ---
    function createProgressModal() {
        const modalHTML = `
            <div class="modal fade" id="progressModal" tabindex="-1" role="dialog" data-backdrop="static" data-keyboard="false">
                <div class="modal-dialog modal-dialog-centered" role="document">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">📦 Bulk Shipping Progress</h5>
                        </div>
                        <div class="modal-body">
                            <div class="text-center mb-3">
                                <div id="progressTitle" class="h5">Preparing to ship orders...</div>
                                <div id="progressSubtitle" class="text-muted">Please wait while we process your orders</div>
                            </div>
                            
                            <!-- Progress Bar -->
                            <div class="progress mb-3" style="height: 25px;">
                                <div id="progressBar" class="progress-bar progress-bar-striped progress-bar-animated bg-success" 
                                    role="progressbar" style="width: 0%">
                                    <span id="progressText">0%</span>
                                </div>
                            </div>
                            
                            <!-- Current Progress -->
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="card bg-light">
                                        <div class="card-body text-center py-2">
                                            <div id="currentProgress" class="h4 text-primary mb-0">0/0</div>
                                            <small class="text-muted">Progress</small>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="card bg-light">
                                        <div class="card-body text-center py-2">
                                            <div id="successCount" class="h4 text-success mb-0">0</div>
                                            <small class="text-muted">Completed</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Status Messages -->
                            <div id="statusMessages" class="mt-3" style="max-height: 200px; overflow-y: auto;">
                            </div>
                        </div>
                        <div class="modal-footer" id="modalFooter" style="display: none;">
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('progressModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        return $('#progressModal');
    }

    // Progress Update Functions
    function updateProgress(current, total, message = '') {
        const percentage = Math.round((current / total) * 100);
        
        // Update progress bar
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const currentProgress = document.getElementById('currentProgress');
        
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
            progressBar.setAttribute('aria-valuenow', percentage);
        }
        
        if (progressText) {
            progressText.textContent = `${percentage}%`;
        }
        
        if (currentProgress) {
            currentProgress.textContent = `${current}/${total}`;
        }
        
        // Add status message if provided
        if (message) {
            addStatusMessage(message, current === total ? 'success' : 'info');
        }
    }

    function addStatusMessage(message, type = 'info') {
        const statusMessages = document.getElementById('statusMessages');
        if (statusMessages) {
            const timestamp = new Date().toLocaleTimeString();
            const iconMap = {
                'info': '📋',
                'success': '✅',
                'warning': '⚠️',
                'danger': '❌'
            };
            
            const messageElement = document.createElement('div');
            messageElement.className = `alert alert-${type} alert-sm py-1 px-2 mb-1`;
            messageElement.innerHTML = `
                <small>
                    <span class="text-muted">${timestamp}</span> - 
                    ${iconMap[type]} ${message}
                </small>
            `;
            
            statusMessages.appendChild(messageElement);
            statusMessages.scrollTop = statusMessages.scrollHeight;
        }
    }

    function updateSuccessCount(count) {
        const successCount = document.getElementById('successCount');
        if (successCount) {
            successCount.textContent = count;
        }
    }

    function showProgressModal(title, subtitle) {
        const modal = createProgressModal();
        
        // Update titles
        document.getElementById('progressTitle').textContent = title;
        document.getElementById('progressSubtitle').textContent = subtitle;
        
        // Show modal
        modal.modal('show');
        
        return modal;
    }

    function completeProgress(success, message) {
        const progressBar = document.getElementById('progressBar');
        const progressTitle = document.getElementById('progressTitle');
        const modalFooter = document.getElementById('modalFooter');
        
        if (progressBar) {
            progressBar.classList.remove('progress-bar-animated', 'progress-bar-striped');
            progressBar.classList.add(success ? 'bg-success' : 'bg-danger');
        }
        
        if (progressTitle) {
            progressTitle.textContent = success ? '🎉 Bulk Shipping Complete!' : '❌ Bulk Shipping Failed';
        }
        
        if (modalFooter) {
            modalFooter.style.display = 'block';
        }
        
        addStatusMessage(message, success ? 'success' : 'danger');
    }

    // --- 5. Auto-Detection Logic ---
    function shouldUseGroupedView(orders) {
        if (orders.length === 0) return false;
        
        // Group orders by buyer and date
        const groups = {};
        orders.forEach(order => {
            const key = `${order.buyer_id}-${order.formatted_date}`;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(order);
        });
        
        // Check if there are any groups with multiple items
        const hasMultipleItemGroups = Object.values(groups).some(group => group.length > 1);
        
        // Use grouped view if there are multiple items from same buyer on same date
        return hasMultipleItemGroups;
    }

    // --- 6. Main Function to Fetch and Display Orders ---
    async function fetchAndDisplayOrders(forceMode = null) {
        try {
            // Always fetch regular orders first to analyze
            const response = await fetch(`${BACKEND_URL}/api/seller/orders`, {
                headers: { 'X-User-ID': user.id }
            });
            
            if (!response.ok) {
                throw new Error('Could not fetch orders from the server.');
            }
            
            const regularOrders = await response.json();
            
            // Determine view mode
            let useGroupedView = false;
            if (forceMode === 'grouped') {
                useGroupedView = true;
            } else if (forceMode === 'regular') {
                useGroupedView = false;
            } else {
                // Auto-detect
                useGroupedView = shouldUseGroupedView(regularOrders);
            }
            
            if (useGroupedView) {
                // Fetch grouped data
                const groupedResponse = await fetch(`${BACKEND_URL}/api/seller/orders?grouped=true`, {
                    headers: { 'X-User-ID': user.id }
                });
                
                if (groupedResponse.ok) {
                    ordersData = await groupedResponse.json();
                    renderGroupedOrders(ordersData);
                    updateToggleButton(true);
                } else {
                    // Fallback to regular view
                    ordersData = regularOrders;
                    renderOrders(ordersData);
                    updateToggleButton(false);
                }
            } else {
                ordersData = regularOrders;
                renderOrders(ordersData);
                updateToggleButton(false);
            }
            
            // Update statistics
            updateStatistics(regularOrders, useGroupedView);
            
        } catch (error) {
            console.error('Error fetching orders:', error);
            if (ordersTableBody) {
                ordersTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error loading orders.</td></tr>`;
            }
            if (mobileOrdersContainer) {
                mobileOrdersContainer.innerHTML = `
                    <div class="text-center py-5 text-danger">
                        <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                        <p>Error loading orders.</p>
                    </div>
                `;
            }
        }
    }

    // --- 7. Update Statistics Function ---
    function updateStatistics(orders, isGroupedView) {
        // Calculate statistics from the raw orders data
        const stats = {
            totalOrders: orders.length,
            pendingOrders: orders.filter(o => o.status === 'Pending').length,
            shippedOrders: orders.filter(o => o.status === 'Shipped').length,
            deliveredOrders: orders.filter(o => o.status === 'Delivered').length,
            cancelledOrders: orders.filter(o => o.status === 'Cancelled').length,
            totalRevenue: orders.reduce((sum, order) => sum + parseFloat(order.total_price || 0), 0)
        };
        
        // Debug logging
        console.log('Statistics calculated:', stats);
        console.log('Raw orders data:', orders);
        
        // Update DOM elements using the correct IDs from HTML
        const totalOrdersElement = document.getElementById('totalOrdersCell');
        const pendingOrdersElement = document.getElementById('pendingOrdersCell');
        const deliveredOrdersElement = document.getElementById('deliveredOrdersCell');
        
        // Update elements if they exist
        if (totalOrdersElement) {
            totalOrdersElement.textContent = stats.totalOrders;
            console.log('Updated total orders to:', stats.totalOrders);
        } else {
            console.log('totalOrdersCell element not found');
        }
        
        if (pendingOrdersElement) {
            pendingOrdersElement.textContent = stats.pendingOrders;
            console.log('Updated pending orders to:', stats.pendingOrders);
        } else {
            console.log('pendingOrdersCell element not found');
        }
        
        if (deliveredOrdersElement) {
            deliveredOrdersElement.textContent = stats.deliveredOrders;
            console.log('Updated delivered orders to:', stats.deliveredOrders);
        } else {
            console.log('deliveredOrdersCell element not found');
        }
        
        // Update revenue (this one was already working)
        if (totalRevenueCell) {
            totalRevenueCell.textContent = `₱${stats.totalRevenue.toFixed(2)}`;
            console.log('Updated revenue to:', `₱${stats.totalRevenue.toFixed(2)}`);
        }
        
        console.log('Statistics update completed');
    }

    // --- 8. Update Toggle Button ---
 function updateToggleButton(isGroupedView) {
    if (toggleGroupBtn) {
        if (isGroupedView) {
            toggleGroupBtn.innerHTML = '<i class="fas fa-list"></i> Show Individual View';
            toggleGroupBtn.className = 'btn btn-outline-info';
        } else {
            toggleGroupBtn.innerHTML = '<i class="fas fa-layer-group"></i> Show Grouped View';
            toggleGroupBtn.className = 'btn btn-info';
        }
    }
}
// Enhanced CSS to fix the layout consistency
const additionalCSS = `
<style>
/* Ensure consistent row heights and styling */
.table tbody tr.individual-order {
    background-color: white;
}

.table tbody tr.individual-order:hover {
    background-color: #f8f9ff;
}

.table tbody tr.group-header {
    background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%) !important;
    border-left: 4px solid #2196f3;
    font-weight: 600;
}

.table tbody tr.group-item {
    background: rgba(255,255,255,0.9) !important;
    border-left: 2px solid #e3f2fd;
}

.table tbody tr.group-item:hover {
    background: rgba(248, 249, 255, 0.9) !important;
}

/* Fix table borders for consistency */
.table td {
    border-bottom: 1px solid #f1f3f4;
    vertical-align: middle;
}

.table tbody tr.group-header td {
    border-bottom: 2px solid rgba(33, 150, 243, 0.2);
    padding: 1.25rem 1rem;
}

.table tbody tr.group-item td {
    border-bottom: 1px solid rgba(33, 150, 243, 0.1);
}

/* Ensure button consistency */
.btn-sm {
    font-size: 0.875rem;
    padding: 0.375rem 0.75rem;
}

.form-control-sm {
    font-size: 0.875rem;
    padding: 0.375rem 0.5rem;
}
</style>
`;

    // --- 9. Function to Render Regular Orders Table ---
  function renderOrders(orders) {
    // Clear both table and mobile containers
    if (ordersTableBody) ordersTableBody.innerHTML = '';
    if (mobileOrdersContainer) mobileOrdersContainer.innerHTML = '';

    if (orders.length === 0) {
        if (ordersTableBody) {
            ordersTableBody.innerHTML = `<tr><td colspan="7" class="text-center">You have no orders yet.</td></tr>`;
        }
        if (mobileOrdersContainer) {
            mobileOrdersContainer.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
                    <p class="text-muted">You have no orders yet.</p>
                </div>
            `;
        }
        return;
    }

    // Render ONLY individual table view
    if (ordersTableBody) {
        const statusOptions = ['Pending', 'Shipped', 'Delivered', 'Cancelled'];

        orders.forEach(order => {
            const row = document.createElement('tr');
            row.className = 'individual-order'; // Add consistent class
            
            const optionsHTML = statusOptions.map(status => 
                `<option value="${status}" ${order.status === status ? 'selected' : ''}>${status}</option>`
            ).join('');

            row.innerHTML = `
                <td>
                    <input type="checkbox" class="order-checkbox" data-order-id="${order.id}" data-buyer-id="${order.buyer_id}">
                </td>
                <td>${order.product_name}</td>
                <td><strong>${order.buyer_name}</strong></td>
                <td>₱${parseFloat(order.total_price).toFixed(2)}</td>
                <td>
                    <div>${order.formatted_date}</div>
                    <small class="text-muted">${order.formatted_time}</small>
                </td>
                <td>
                    <span class="badge badge-${getStatusBadgeColor(order.status)}">${order.status}</span>
                </td>
                <td>
                    <div class="form-inline">
                        <select class="form-control form-control-sm mr-2 status-select" data-order-id="${order.id}">
                            ${optionsHTML}
                        </select>
                        <button class="btn btn-sm btn-primary update-status-btn" data-order-id="${order.id}">Update</button>
                    </div>
                </td>
            `;
            ordersTableBody.appendChild(row);
        });
    }

    // Render mobile view
    renderMobileOrders(orders);
    updateBulkActions();
    
    // Update view indicator
    const viewModeIndicator = document.getElementById('viewModeIndicator');
    if (viewModeIndicator) {
        viewModeIndicator.textContent = 'Individual View';
    }
}

    // --- 10. Function to Render Grouped Orders ---
  function renderGroupedOrders(groupedData) {
    // Clear both table and mobile containers
    if (ordersTableBody) ordersTableBody.innerHTML = '';
    if (mobileOrdersContainer) mobileOrdersContainer.innerHTML = '';

    if (groupedData.length === 0) {
        if (ordersTableBody) {
            ordersTableBody.innerHTML = `<tr><td colspan="7" class="text-center">You have no orders yet.</td></tr>`;
        }
        if (mobileOrdersContainer) {
            mobileOrdersContainer.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
                    <p class="text-muted">You have no orders yet.</p>
                </div>
            `;
        }
        return;
    }

    // Render ONLY grouped table view - no mixed rendering
    if (ordersTableBody) {
        groupedData.forEach(group => {
            // Count pending orders
            const pendingCount = group.orders.filter(o => o.status === 'Pending').length;
            const canBulkShip = pendingCount > 0;

            // Create group header row
            const groupRow = document.createElement('tr');
            groupRow.className = 'table-primary group-header';
            groupRow.innerHTML = `
                <td colspan="7">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>👤 ${group.buyer_name}</strong> - 
                            📅 ${group.formatted_date} - 
                            <strong>₱${group.total_amount.toFixed(2)}</strong>
                            (${group.orders.length} items)
                        </div>
                        <div>
                            ${canBulkShip ? 
                                `<button class="btn btn-sm btn-success bulk-ship-btn" 
                                        data-buyer-id="${group.buyer_id}" 
                                        data-date="${group.order_date}"
                                        data-group-info='${JSON.stringify({buyer_id: group.buyer_id, order_date: group.order_date, buyer_name: group.buyer_name})}'>
                                    📦 Ship Pending (${pendingCount})
                                </button>` : 
                                '<span class="text-muted">All shipped</span>'
                            }
                        </div>
                    </div>
                </td>
            `;
            ordersTableBody.appendChild(groupRow);

            // Create individual order rows under the group
            group.orders.forEach(order => {
                const orderRow = document.createElement('tr');
                orderRow.className = 'table-light group-item';
                orderRow.innerHTML = `
                    <td></td>
                    <td class="pl-4">└ ${order.product_name}</td>
                    <td></td>
                    <td>₱${order.total_price.toFixed(2)}</td>
                    <td>
                        <small class="text-muted">${order.formatted_time}</small>
                    </td>
                    <td>
                        <span class="badge badge-${getStatusBadgeColor(order.status)}">${order.status}</span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary update-single-btn" 
                                data-order-id="${order.id}">
                            Update Individual
                        </button>
                    </td>
                `;
                ordersTableBody.appendChild(orderRow);
            });
        });
    }

    // Render mobile view
    renderMobileGroupedOrders(groupedData);

    // Hide bulk actions in grouped mode
    if (bulkActionsDiv) {
        bulkActionsDiv.style.display = 'none';
    }
    
    // Update view indicator
    const viewModeIndicator = document.getElementById('viewModeIndicator');
    if (viewModeIndicator) {
        viewModeIndicator.textContent = 'Grouped View';
    }
}

    // --- 11. Helper Functions ---
    function getStatusBadgeColor(status) {
        switch(status) {
            case 'Pending': return 'warning';
            case 'Shipped': return 'info';
            case 'Delivered': return 'success';
            case 'Cancelled': return 'danger';
            default: return 'secondary';
        }
    }

    function updateBulkActions() {
        const checkboxes = document.querySelectorAll('.order-checkbox');
        const selectedOrders = Array.from(checkboxes).filter(cb => cb.checked);
        
        if (bulkActionsDiv) {
            if (selectedOrders.length > 1) {
                const buyerIds = selectedOrders.map(cb => cb.dataset.buyerId);
                const uniqueBuyers = [...new Set(buyerIds)];
                
                if (uniqueBuyers.length === 1) {
                    bulkActionsDiv.innerHTML = `
                        <div class="alert alert-info">
                            <strong>${selectedOrders.length} orders selected</strong> from same buyer
                            <button class="btn btn-sm btn-primary ml-2" onclick="groupSelectedOrders()">
                                Group for Shipping
                            </button>
                        </div>
                    `;
                    bulkActionsDiv.style.display = 'block';
                } else {
                    bulkActionsDiv.innerHTML = `
                        <div class="alert alert-warning">
                            Cannot group orders from different buyers
                        </div>
                    `;
                    bulkActionsDiv.style.display = 'block';
                }
            } else {
                bulkActionsDiv.style.display = 'none';
            }
        }
    }

    // --- 12. Grouping Functions ---
    window.groupSelectedOrders = async function() {
        const checkboxes = document.querySelectorAll('.order-checkbox:checked');
        const orderIds = Array.from(checkboxes).map(cb => parseInt(cb.dataset.orderId));
        
        if (orderIds.length < 2) {
            alert('Please select at least 2 orders to group.');
            return;
        }

        try {
            showAlert('Grouping orders...', 'info');
            
            const response = await fetch(`${BACKEND_URL}/api/seller/orders/group`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': user.id
                },
                body: JSON.stringify({ order_ids: orderIds })
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to group orders.');
            }

            showAlert('Orders grouped successfully!', 'success');
            fetchAndDisplayOrders();
            
        } catch (error) {
            console.error('Error grouping orders:', error);
            showAlert(error.message, 'danger');
        }
    };

    // --- 13. Enhanced Bulk Shipping Functions with Progress ---
    async function bulkShipOrders(buyerId, date) {
        let progressModal;
        
        try {
            console.log('=== BULK SHIPPING START ===');
            console.log('Bulk shipping - buyerId:', buyerId, 'date:', date);
            
            // Find the group
            const group = ordersData.find(g => g.buyer_id == buyerId && g.order_date == date);
            
            if (!group) {
                console.error('Group not found for buyerId:', buyerId, 'date:', date);
                throw new Error('Order group not found.');
            }
            
            // Filter pending orders
            const pendingOrders = group.orders.filter(order => order.status === 'Pending');
            
            if (pendingOrders.length === 0) {
                throw new Error('No pending orders found to ship.');
            }
            
            const orderIds = pendingOrders.map(o => o.id);
            console.log('Order IDs to ship:', orderIds);
            
            // Show progress modal
            progressModal = showProgressModal(
                `Shipping ${pendingOrders.length} Orders`,
                `Processing orders for ${group.buyer_name}`
            );
            
            addStatusMessage(`Found ${pendingOrders.length} pending orders to ship`);
            
            // Try multiple bulk shipping approaches
            await attemptBulkShippingWithProgress(orderIds, buyerId, date, pendingOrders, progressModal);
            
        } catch (error) {
            console.error('=== BULK SHIPPING ERROR ===', error);
            
            if (progressModal) {
                completeProgress(false, `Failed: ${error.message}`);
            } else {
                showAlert(`Bulk shipping failed: ${error.message}`, 'danger');
            }
        }
    }

    async function attemptBulkShippingWithProgress(orderIds, buyerId, date, pendingOrders, progressModal) {
        console.log('=== ATTEMPTING BULK SHIPPING METHODS ===');
        
        // Method 1: Try direct bulk ship endpoint
        try {
            addStatusMessage('Attempting direct bulk ship method...');
            updateProgress(1, 4, 'Trying Method 1: Direct bulk ship');
            
            const directResponse = await fetch(`${BACKEND_URL}/api/seller/orders/bulk-ship-direct`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': user.id
                },
                body: JSON.stringify({ 
                    order_ids: orderIds,
                    buyer_id: buyerId,
                    order_date: date
                })
            });

            if (directResponse.ok) {
                const result = await directResponse.json();
                console.log('✓ Direct bulk ship successful:', result);
                
                updateProgress(4, 4, 'Direct bulk ship successful!');
                updateSuccessCount(pendingOrders.length);
                
                setTimeout(() => {
                    completeProgress(true, `Successfully shipped ${pendingOrders.length} orders via direct bulk method!`);
                    setTimeout(() => {
                        progressModal.modal('hide');
                        fetchAndDisplayOrders();
                    }, 2000);
                }, 500);
                
                return;
            }
            
            addStatusMessage('Direct bulk ship not available, trying next method...');
        } catch (error) {
            addStatusMessage(`Direct bulk ship error: ${error.message}`, 'warning');
        }

        // Method 2: Try bulk update endpoint  
        try {
            updateProgress(2, 4, 'Trying Method 2: Bulk update endpoint');
            addStatusMessage('Attempting bulk update method...');
            
            const bulkUpdateResponse = await fetch(`${BACKEND_URL}/api/seller/orders/bulk-update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': user.id
                },
                body: JSON.stringify({
                    order_ids: orderIds,
                    status: 'Shipped'
                })
            });

            if (bulkUpdateResponse.ok) {
                const result = await bulkUpdateResponse.json();
                console.log('✓ Bulk update successful:', result);
                
                updateProgress(4, 4, 'Bulk update successful!');
                updateSuccessCount(orderIds.length);
                
                setTimeout(() => {
                    completeProgress(true, `Successfully shipped ${orderIds.length} orders via bulk update!`);
                    setTimeout(() => {
                        progressModal.modal('hide');
                        fetchAndDisplayOrders();
                    }, 2000);
                }, 500);
                
                return;
            }
            
            addStatusMessage('Bulk update not available, trying next method...');
        } catch (error) {
            addStatusMessage(`Bulk update error: ${error.message}`, 'warning');
        }

        // Method 3: Try grouping approach
        try {
            updateProgress(3, 4, 'Trying Method 3: Enhanced grouping');
            await attemptGroupingApproachWithProgress(orderIds, buyerId, date, pendingOrders, progressModal);
            return;
        } catch (error) {
            addStatusMessage(`Grouping approach failed: ${error.message}`, 'warning');
        }

        // Method 4: Optimized batch updates (last resort)
        updateProgress(4, 4, 'Using Method 4: Batch processing');
        addStatusMessage('Using optimized batch processing as final method...');
        await performOptimizedBatchUpdatesWithProgress(orderIds, pendingOrders, progressModal);
    }

    async function attemptGroupingApproachWithProgress(orderIds, buyerId, date, pendingOrders, progressModal) {
        addStatusMessage('Starting enhanced grouping approach...');
        
        const groupRequestData = {
            order_ids: orderIds,
            buyer_id: buyerId,
            order_date: date,
            validate_pending: true
        };

        const groupResponse = await fetch(`${BACKEND_URL}/api/seller/orders/group`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-ID': user.id
            },
            body: JSON.stringify(groupRequestData)
        });

        if (!groupResponse.ok) {
            const errorData = await groupResponse.json().catch(() => ({ error: 'Could not parse error response' }));
            throw new Error(errorData.error || `Grouping failed with status ${groupResponse.status}`);
        }

        const groupResult = await groupResponse.json();
        addStatusMessage('Orders grouped successfully, now shipping...');
        
        // Now bulk ship using the group ID
        const shipResponse = await fetch(`${BACKEND_URL}/api/seller/orders/bulk-ship`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-User-ID': user.id
            },
            body: JSON.stringify({ 
                group_id: groupResult.group_id,
                order_ids: orderIds
            })
        });

        if (!shipResponse.ok) {
            const error = await shipResponse.json().catch(() => ({}));
            throw new Error(error.error || 'Failed to bulk ship orders after grouping.');
        }

        const shipResult = await shipResponse.json();
        console.log('✓ Bulk ship after grouping successful:', shipResult);
        
        updateProgress(4, 4, 'Grouping method successful!');
        updateSuccessCount(pendingOrders.length);
        
        setTimeout(() => {
            completeProgress(true, `Successfully shipped ${pendingOrders.length} orders via grouping method!`);
            setTimeout(() => {
                progressModal.modal('hide');
                fetchAndDisplayOrders();
            }, 2000);
        }, 500);
    }

    async function performOptimizedBatchUpdatesWithProgress(orderIds, pendingOrders, progressModal) {
        addStatusMessage('Starting batch processing of individual orders...');
        
        let successCount = 0;
        let failCount = 0;
        const failures = [];
        
        // Process in smaller batches
        const batchSize = 3;
        const batches = [];
        for (let i = 0; i < orderIds.length; i += batchSize) {
            batches.push(orderIds.slice(i, i + batchSize));
        }
        
        addStatusMessage(`Processing ${batches.length} batches of max ${batchSize} orders each`);
        
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            addStatusMessage(`Processing batch ${batchIndex + 1}/${batches.length}...`);
            
            const batchPromises = batch.map(async (orderId, orderIndex) => {
                try {
                    const response = await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-User-ID': user.id
                        },
                        body: JSON.stringify({ status: 'Shipped' })
                    });

                    if (response.ok) {
                        successCount++;
                        const globalOrderIndex = batchIndex * batchSize + orderIndex + 1;
                        updateProgress(globalOrderIndex, orderIds.length, `Order ${orderId} shipped successfully`);
                        updateSuccessCount(successCount);
                        return { success: true, orderId };
                    } else {
                        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
                        failCount++;
                        failures.push({ id: orderId, error: error.error });
                        addStatusMessage(`Order ${orderId} failed: ${error.error}`, 'warning');
                        return { success: false, orderId, error: error.error };
                    }
                } catch (error) {
                    failCount++;
                    failures.push({ id: orderId, error: error.message });
                    addStatusMessage(`Order ${orderId} error: ${error.message}`, 'danger');
                    return { success: false, orderId, error: error.message };
                }
            });
            
            // Wait for current batch to complete
            await Promise.all(batchPromises);
            
            // Delay between batches (except for the last batch)
            if (batchIndex < batches.length - 1) {
                addStatusMessage('Waiting before next batch...');
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
        
        // Show final results
        if (successCount === orderIds.length) {
            setTimeout(() => {
                completeProgress(true, `Successfully shipped all ${successCount} orders!`);
                setTimeout(() => {
                    progressModal.modal('hide');
                    fetchAndDisplayOrders();
                }, 2000);
            }, 500);
        } else if (successCount > 0) {
            setTimeout(() => {
                completeProgress(false, `Partially successful: ${successCount} shipped, ${failCount} failed`);
            }, 500);
        } else {
            setTimeout(() => {
                completeProgress(false, 'Failed to ship any orders. Check the messages above for details.');
            }, 500);
        }
    }

    // --- 14. Status Update Functions ---
    async function handleStatusUpdate(orderId) {
        const selectElement = document.querySelector(`.status-select[data-order-id='${orderId}']`);
        const newStatus = selectElement.value;

        showAlert('Updating status...', 'info');

        try {
            const response = await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': user.id
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Failed to update status.');
            }
            
            showAlert('Status updated successfully!', 'success');
            fetchAndDisplayOrders();

        } catch (error) {
            console.error('Error updating status:', error);
            showAlert(error.message, 'danger');
        }
    }

    async function updateSingleOrderInGroup(orderId, newStatus) {
        try {
            showAlert('Updating status...', 'info');
            
            const response = await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': user.id
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Failed to update status.');
            }
            
            showAlert('Status updated successfully!', 'success');
            fetchAndDisplayOrders();

        } catch (error) {
            console.error('Error updating status:', error);
            showAlert(error.message, 'danger');
        }
    }

    // --- 15. CSV Export Function ---
    function exportToCsv() {
        if (ordersData.length === 0) {
            alert('There are no orders to export.');
            return;
        }

        const headers = ['Product', 'Buyer', 'Total Price', 'Date', 'Time', 'Status'];
        const csvRows = [headers.join(',')];

        // Determine if current view is grouped
        const isGrouped = ordersData.some(item => item.orders);

        if (isGrouped) {
            ordersData.forEach(group => {
                group.orders.forEach(order => {
                    const row = [
                        `"${order.product_name.replace(/"/g, '""')}"`,
                        `"${group.buyer_name.replace(/"/g, '""')}"`,
                        order.total_price,
                        group.formatted_date,
                        order.formatted_time,
                        order.status
                    ];
                    csvRows.push(row.join(','));
                });
            });
        } else {
            ordersData.forEach(order => {
                const row = [
                    `"${order.product_name.replace(/"/g, '""')}"`,
                    `"${order.buyer_name.replace(/"/g, '""')}"`,
                    order.total_price,
                    order.formatted_date,
                    order.formatted_time,
                    order.status
                ];
                csvRows.push(row.join(','));
            });
        }

        const totalRevenue = totalRevenueCell.textContent;
        csvRows.push(['', 'Total Revenue', totalRevenue, '', '', ''].join(','));
        
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'my_product_orders.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // --- 16. Event Listeners ---
    
    // Main table/mobile container event delegation
    function setupEventListeners() {
        // Table events
        if (ordersTableBody) {
            ordersTableBody.addEventListener('click', (e) => {
                if (e.target && e.target.classList.contains('update-status-btn')) {
                    const orderId = e.target.getAttribute('data-order-id');
                    handleStatusUpdate(orderId);
                }
                
                if (e.target && e.target.classList.contains('bulk-ship-btn')) {
                    const buyerId = e.target.getAttribute('data-buyer-id');
                    const date = e.target.getAttribute('data-date');
                    
                    // Validation
                    if (!buyerId || !date) {
                        console.error('Missing bulk ship data - buyerId:', buyerId, 'date:', date);
                        showAlert('Error: Missing order information for bulk shipping.', 'danger');
                        return;
                    }
                    
                    console.log('Bulk ship button clicked - buyerId:', buyerId, 'date:', date);
                    bulkShipOrders(buyerId, date);
                }

                if (e.target && e.target.classList.contains('update-single-btn')) {
                    const orderId = e.target.getAttribute('data-order-id');
                    showStatusUpdateModal(orderId);
                }
            });

            ordersTableBody.addEventListener('change', (e) => {
                if (e.target && e.target.classList.contains('order-checkbox')) {
                    updateBulkActions();
                }
            });
        }

        // Mobile container events
        if (mobileOrdersContainer) {
            mobileOrdersContainer.addEventListener('click', (e) => {
                if (e.target && e.target.classList.contains('mobile-update-btn')) {
                    const orderId = e.target.getAttribute('data-order-id');
                    const selectElement = mobileOrdersContainer.querySelector(`.mobile-status-select[data-order-id='${orderId}']`);
                    if (selectElement) {
                        const newStatus = selectElement.value;
                        updateSingleOrderInGroup(orderId, newStatus);
                    }
                }
                
                if (e.target && e.target.classList.contains('bulk-ship-btn')) {
                    const buyerId = e.target.getAttribute('data-buyer-id');
                    const date = e.target.getAttribute('data-date');
                    
                    if (!buyerId || !date) {
                        console.error('Missing bulk ship data - buyerId:', buyerId, 'date:', date);
                        showAlert('Error: Missing order information for bulk shipping.', 'danger');
                        return;
                    }
                    
                    console.log('Mobile bulk ship button clicked - buyerId:', buyerId, 'date:', date);
                    bulkShipOrders(buyerId, date);
                }

                if (e.target && e.target.classList.contains('update-single-btn')) {
                    const orderId = e.target.getAttribute('data-order-id');
                    showStatusUpdateModal(orderId);
                }
            });
        }
    }

    // Manual toggle between views
    if (toggleGroupBtn) {
        toggleGroupBtn.addEventListener('click', () => {
            const isCurrentlyGrouped = toggleGroupBtn.textContent.includes('Individual');
            if (isCurrentlyGrouped) {
                fetchAndDisplayOrders('regular');
            } else {
                fetchAndDisplayOrders('grouped');
            }
        });
    }

    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', exportToCsv);
    }

    // --- 17. Helper Functions ---
    function showAlert(message, type = 'info', duration = 3000) {
        const alertContainer = document.getElementById('alert-container');
        if (alertContainer) {
            const alert = document.createElement('div');
            alert.className = `alert alert-${type}`;
            alert.textContent = message;
            alertContainer.prepend(alert);
            setTimeout(() => alert.remove(), duration);
        }
    }

    function showStatusUpdateModal(orderId) {
        // Get current status of the order to pre-select in dropdown
        let currentStatus = 'Pending';
        
        // Find the current status from ordersData
        if (ordersData && ordersData.length > 0) {
            // Check if it's grouped data
            const isGrouped = ordersData.some(item => item.orders);
            if (isGrouped) {
                // Search in grouped data
                for (const group of ordersData) {
                    const order = group.orders.find(o => o.id == orderId);
                    if (order) {
                        currentStatus = order.status;
                        break;
                    }
                }
            } else {
                // Search in regular data
                const order = ordersData.find(o => o.id == orderId);
                if (order) {
                    currentStatus = order.status;
                }
            }
        }

        // Create and show modal
        const modalHTML = `
            <div class="modal fade" id="statusModal" tabindex="-1" role="dialog">
                <div class="modal-dialog" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Update Order Status</h5>
                            <button type="button" class="close" data-dismiss="modal">
                                <span>&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="statusSelect">Select New Status:</label>
                                <select class="form-control" id="statusSelect">
                                    <option value="Pending" ${currentStatus === 'Pending' ? 'selected' : ''}>🕐 Pending</option>
                                    <option value="Shipped" ${currentStatus === 'Shipped' ? 'selected' : ''}>🚚 Shipped</option>
                                    <option value="Delivered" ${currentStatus === 'Delivered' ? 'selected' : ''}>✅ Delivered</option>
                                    <option value="Cancelled" ${currentStatus === 'Cancelled' ? 'selected' : ''}>❌ Cancelled</option>
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="confirmStatusUpdate(${orderId})">Update Status</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('statusModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Show modal using jQuery (since Bootstrap is loaded)
        $('#statusModal').modal('show');
        
        // Clean up modal after it's hidden
        $('#statusModal').on('hidden.bs.modal', function() {
            this.remove();
        });
    }

    // Global function for modal button
    window.confirmStatusUpdate = function(orderId) {
        const statusSelect = document.getElementById('statusSelect');
        const newStatus = statusSelect.value;
        
        if (newStatus) {
            $('#statusModal').modal('hide');
            updateSingleOrderInGroup(orderId, newStatus);
        }
    };

    // --- 18. Initialize ---
    setupEventListeners();
    fetchAndDisplayOrders();

    // Handle window resize for responsive behavior
    window.addEventListener('resize', () => {
        // You can add any resize-specific logic here if needed
        // For now, the CSS media queries handle the responsive behavior
    });
});