document.addEventListener('DOMContentLoaded', function() {
    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const DEFAULT_AVATAR = 'https://res.cloudinary.com/dwgvlwkyt/image/upload/v1751856106/default-avatar.jpg';
    const user = JSON.parse(localStorage.getItem('user'));

    // Security check
    if (!user || user.role !== 'admin') {
        alert("Access denied. You must be an admin to view this page.");
        window.location.href = 'login.html';
        return;
    }

    // State management
    const USERS_PER_PAGE = 12;
    let currentTab = 'sellers';
    let currentPage = 1;
    let allSellers = [];
    let allCustomers = [];
    let allUsers = [];
    let filteredSellers = [];
    let filteredCustomers = [];
    let filteredAllUsers = [];

    // Currency formatter
    const pesoFormatter = new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    });

    // Initialize the page
    init();

    async function init() {
        setupTabListeners();
        await loadAllData();
        renderCurrentTab();
    }

    function setupTabListeners() {
        $('#userTabs a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
            const target = $(e.target).attr("href").substring(1);
            currentTab = target === 'all-users' ? 'allUsers' : target;
            currentPage = 1;
            renderCurrentTab();
        });
    }

    async function loadAllData() {
        await Promise.all([
            fetchSellers(),
            fetchCustomers(),
            fetchAllUsers()
        ]);
    }

    async function fetchSellers() {
        showLoading('sellers');
        try {
            const response = await fetch(`${BACKEND_URL}/api/admin/sellers`);
            if (!response.ok) throw new Error('Failed to fetch sellers');
            const data = await response.json();
            allSellers = data.sellers || [];
            filteredSellers = [...allSellers];
            updateTabCount('sellersCount', allSellers.length);
        } catch (error) {
            console.error('Error fetching sellers:', error);
            showErrorState('sellers', 'Failed to load sellers');
        }
    }

    async function fetchCustomers() {
        showLoading('customers');
        try {
            const response = await fetch(`${BACKEND_URL}/api/admin/customers`);
            if (!response.ok) throw new Error('Failed to fetch customers');
            const data = await response.json();
            allCustomers = data.customers || [];
            filteredCustomers = [...allCustomers];
            updateTabCount('customersCount', allCustomers.length);
        } catch (error) {
            console.error('Error fetching customers:', error);
            showErrorState('customers', 'Failed to load customers');
        }
    }

    async function fetchAllUsers() {
        showLoading('allUsers');
        try {
            const response = await fetch(`${BACKEND_URL}/api/admin/users`);
            if (!response.ok) throw new Error('Failed to fetch users');
            const data = await response.json();
            // Filter out admin users from the all users list
            allUsers = (data.users || []).filter(user => user.role !== 'admin');
            filteredAllUsers = [...allUsers];
            updateTabCount('allUsersCount', allUsers.length);
        } catch (error) {
            console.error('Error fetching all users:', error);
            showErrorState('allUsers', 'Failed to load users');
        }
    }

    function showLoading(tab) {
        const spinner = document.getElementById(`${tab}LoadingSpinner`);
        const container = document.getElementById(`${tab}Container`);
        if (spinner) spinner.style.display = 'flex';
        if (container) container.style.display = 'none';
    }

    function hideLoading(tab) {
        const spinner = document.getElementById(`${tab}LoadingSpinner`);
        const container = document.getElementById(`${tab}Container`);
        if (spinner) spinner.style.display = 'none';
        if (container) container.style.display = 'flex';
    }

    function showErrorState(tab, message) {
        const container = document.getElementById(`${tab}Container`);
        if (!container) return;
        
        container.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error Loading Data</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            </div>`;
        hideLoading(tab);
    }

    function updateTabCount(countId, count) {
        const countElement = document.getElementById(countId);
        if (countElement) {
            countElement.textContent = count;
        }
    }

    function renderCurrentTab() {
        switch (currentTab) {
            case 'sellers':
                renderUsers(filteredSellers, 'sellers', 'seller');
                break;
            case 'customers':
                renderUsers(filteredCustomers, 'customers', 'customer');
                break;
            case 'allUsers':
                renderUsers(filteredAllUsers, 'allUsers', 'all');
                break;
        }
    }

    function renderUsers(users, containerType, userType) {
        const container = document.getElementById(`${containerType}Container`);
        const pagination = document.getElementById(`${containerType}Pagination`);
        
        if (!container) return;

        container.innerHTML = '';
        
        if (!users || users.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>No ${userType === 'all' ? 'Users' : userType.charAt(0).toUpperCase() + userType.slice(1)} Found</h3>
                        <p>No ${userType === 'all' ? 'users' : userType + 's'} match your current filters.</p>
                    </div>
                </div>`;
            hideLoading(containerType);
            return;
        }

        const startIndex = (currentPage - 1) * USERS_PER_PAGE;
        const usersOnPage = users.slice(startIndex, startIndex + USERS_PER_PAGE);

        usersOnPage.forEach(user => {
            const cardCol = document.createElement('div');
            cardCol.className = 'col-md-4 col-lg-3 mb-4 d-flex';
            
            const profilePic = user.profile_pic || DEFAULT_AVATAR;
            const userRole = user.role || 'customer';
            const badgeClass = userRole === 'seller' ? '' : 'customer';
            
            // User stats based on role
            let statsHtml = '';
            if (userRole === 'seller') {
                statsHtml = `
                    <div class="user-stats">
                        <div class="user-stat">
                            <i class="fas fa-box"></i>
                            <span>${user.product_count || 0} Products</span>
                        </div>
                        <div class="user-stat">
                            <i class="fas fa-peso-sign"></i>
                            <span>${pesoFormatter.format(user.total_sales || 0)}</span>
                        </div>
                    </div>`;
            } else if (userRole === 'customer') {
                statsHtml = `
                    <div class="user-stats">
                        <div class="user-stat">
                            <i class="fas fa-shopping-cart"></i>
                            <span>${user.total_orders || 0} Orders</span>
                        </div>
                        <div class="user-stat">
                            <i class="fas fa-peso-sign"></i>
                            <span>${pesoFormatter.format(user.total_spent || 0)}</span>
                        </div>
                    </div>`;
            }

            // Action buttons based on role
            let actionButtons = `
                <button class="btn btn-sm action-btn" data-action="view" data-user-id="${user.id}" data-user-role="${userRole}" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm action-btn" data-action="edit" data-user-id="${user.id}" data-user-role="${userRole}" title="Edit User">
                    <i class="fas fa-edit"></i>
                </button>`;
            
            if (userRole === 'seller') {
                actionButtons += `
                    <button class="btn btn-sm action-btn" data-action="products" data-user-id="${user.id}" data-user-name="${user.name}" title="View Products">
                        <i class="fas fa-box-open"></i>
                    </button>`;
            } else if (userRole === 'customer') {
                actionButtons += `
                    <button class="btn btn-sm action-btn" data-action="orders" data-user-id="${user.id}" data-user-name="${user.name}" title="View Orders">
                        <i class="fas fa-shopping-cart"></i>
                    </button>`;
            }
            
            // Remove the check for admin role since we've already filtered them out
            actionButtons += `
                <button class="btn btn-sm action-btn" data-action="delete" data-user-id="${user.id}" data-user-role="${userRole}" title="Delete User">
                    <i class="fas fa-trash-alt"></i>
                </button>`;

            cardCol.innerHTML = `
                <div class="card user-card w-100">
                    <div class="card-body text-center d-flex flex-column">
                        <div class="flex-grow-1">
                            <img src="${profilePic}" class="user-img mb-3" alt="${user.name}" onerror="this.src='${DEFAULT_AVATAR}';">
                            <div class="user-role-badge ${badgeClass}">${userRole.toUpperCase()}</div>
                            <h5 class="user-name">${user.name}</h5>
                            <p class="user-email">${user.email}</p>
                            ${statsHtml}
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="btn-group w-100" role="group">
                            ${actionButtons}
                        </div>
                    </div>
                </div>`;
            
            container.appendChild(cardCol);
        });

        renderPagination(users, containerType);
        hideLoading(containerType);
    }

    function renderPagination(users, containerType) {
        const pagination = document.getElementById(`${containerType}Pagination`);
        if (!pagination) return;

        const pageCount = Math.ceil(users.length / USERS_PER_PAGE);
        if (pageCount <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHtml = '<ul class="pagination">';
        
        // Previous button
        paginationHtml += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage - 1}" data-container="${containerType}">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>`;
        
        // Page numbers
        for (let i = 1; i <= pageCount; i++) {
            paginationHtml += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}" data-container="${containerType}">${i}</a>
                </li>`;
        }
        
        // Next button
        paginationHtml += `
            <li class="page-item ${currentPage === pageCount ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage + 1}" data-container="${containerType}">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>`;
        
        paginationHtml += '</ul>';
        pagination.innerHTML = paginationHtml;

        // Add click listeners
        pagination.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const page = parseInt(this.dataset.page);
                const container = this.dataset.container;
                
                if (page >= 1 && page <= pageCount && page !== currentPage) {
                    currentPage = page;
                    renderCurrentTab();
                    document.querySelector('.header-section').scrollIntoView({ 
                        behavior: 'smooth' 
                    });
                }
            });
        });
    }

    // Event delegation for action buttons
    document.addEventListener('click', function(e) {
        const button = e.target.closest('.action-btn');
        if (!button) return;

        const action = button.dataset.action;
        const userId = button.dataset.userId;
        const userRole = button.dataset.userRole;
        const userName = button.dataset.userName;

        switch (action) {
            case 'view':
                showUserDetails(userId, userRole);
                break;
            case 'edit':
                openEditModal(userId, userRole);
                break;
            case 'products':
                showUserProducts(userId, userName);
                break;
            case 'orders':
                showUserOrders(userId, userName);
                break;
            case 'delete':
                deleteUser(userId, userRole);
                break;
        }
    });

    async function showUserDetails(userId, userRole) {
        const modalBody = document.getElementById('userDetailsBody');
        modalBody.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <div class="loading-text">Loading user details...</div>
            </div>`;
        
        $('#userDetailsModal').modal('show');

        try {
            const endpoint = userRole === 'seller' ? 
                `${BACKEND_URL}/api/admin/sellers/${userId}` :
                `${BACKEND_URL}/api/admin/users/${userId}`;
                
            const response = await fetch(endpoint);
            if (!response.ok) throw new Error('Failed to fetch user details');
            
            const userData = await response.json();
            const profilePic = userData.profile_pic || DEFAULT_AVATAR;

            let detailsHtml = `
                <div class="text-center mb-4">
                    <img src="${profilePic}" class="rounded-circle mb-3" alt="${userData.name}" 
                         style="width: 100px; height: 100px; object-fit: cover;" 
                         onerror="this.src='${DEFAULT_AVATAR}';">
                    <h5>${userData.name}</h5>
                    <p class="text-muted">${userData.email}</p>
                    <span class="badge badge-${userData.role === 'seller' ? 'dark' : 'secondary'} p-2">
                        ${userData.role.toUpperCase()}
                    </span>
                </div>`;

            if (userData.role === 'seller') {
                detailsHtml += `
                    <div class="user-detail-stats">
                        <div class="stat-item">
                            <div class="stat-value">${pesoFormatter.format(userData.total_sales || 0)}</div>
                            <div class="stat-label">Total Sales</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${userData.total_products_sold || 0}</div>
                            <div class="stat-label">Products Sold</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${userData.product_count || 0}</div>
                            <div class="stat-label">Total Products</div>
                        </div>
                    </div>`;
                    
                if (userData.top_selling_products && userData.top_selling_products.length > 0) {
                    detailsHtml += `
                        <h6 class="mt-4"><i class="fas fa-trophy text-warning me-2"></i>Top Selling Products</h6>
                        <div class="list-group list-group-flush">`;
                    
                    userData.top_selling_products.forEach(product => {
                        detailsHtml += `
                            <div class="list-group-item d-flex justify-content-between align-items-center">
                                ${product.name}
                                <span class="badge badge-primary">${product.units_sold} sold</span>
                            </div>`;
                    });
                    
                    detailsHtml += '</div>';
                }
            } else if (userData.role === 'customer') {
                detailsHtml += `
                    <div class="user-detail-stats">
                        <div class="stat-item">
                            <div class="stat-value">${pesoFormatter.format(userData.total_spent || 0)}</div>
                            <div class="stat-label">Total Spent</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${userData.total_orders || 0}</div>
                            <div class="stat-label">Total Orders</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${userData.avg_order_value ? pesoFormatter.format(userData.avg_order_value) : pesoFormatter.format(0)}</div>
                            <div class="stat-label">Avg Order Value</div>
                        </div>
                    </div>`;
            }

            // Contact information
            if (userData.contact_number || userData.address) {
                detailsHtml += `
                    <hr>
                    <h6><i class="fas fa-address-book me-2"></i>Contact Information</h6>
                    <div class="row">`;
                
                if (userData.contact_number) {
                    detailsHtml += `
                        <div class="col-md-6">
                            <strong>Phone:</strong><br>
                            <span class="text-muted">${userData.contact_number}</span>
                        </div>`;
                }
                
                if (userData.address) {
                    detailsHtml += `
                        <div class="col-md-6">
                            <strong>Address:</strong><br>
                            <span class="text-muted">${userData.address}</span>
                        </div>`;
                }
                
                detailsHtml += '</div>';
            }

            modalBody.innerHTML = detailsHtml;
        } catch (error) {
            console.error('Error fetching user details:', error);
            modalBody.innerHTML = `<p class="text-danger text-center">Error loading user details: ${error.message}</p>`;
        }
    }

    async function openEditModal(userId, userRole) {
        try {
            const endpoint = userRole === 'seller' ? 
                `${BACKEND_URL}/api/admin/sellers/${userId}` :
                `${BACKEND_URL}/api/admin/users/${userId}`;
                
            const response = await fetch(endpoint);
            if (!response.ok) throw new Error('Failed to fetch user data');
            
            const userData = await response.json();
            
            document.getElementById('editUserId').value = userData.id;
            document.getElementById('editUserRole').value = userData.role;
            document.getElementById('editUserName').value = userData.name || '';
            document.getElementById('editUserEmail').value = userData.email || '';
            document.getElementById('editUserPhone').value = userData.contact_number || '';
            document.getElementById('editUserAddress').value = userData.address || '';
            document.getElementById('editUserPassword').value = '';
            
            $('#editUserModal').modal('show');
        } catch (error) {
            console.error('Error opening edit modal:', error);
            alert('Could not load user data for editing. Please try again.');
        }
    }

    async function showUserProducts(userId, userName) {
        const modalBody = document.getElementById('modalProductList');
        const modalLabel = document.getElementById('productsModalLabel');
        
        modalLabel.textContent = `Products from ${userName}`;
        modalBody.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <div class="loading-text">Loading products...</div>
            </div>`;
        
        $('#productsModal').modal('show');

        try {
            const response = await fetch(`${BACKEND_URL}/api/admin/sellers/${userId}/products`);
            if (!response.ok) throw new Error('Failed to fetch products');
            const data = await response.json();

            if (data.products && data.products.length > 0) {
                modalBody.innerHTML = data.products.map(product => {
                    const productImage = product.image || 'path/to/default-product.png';
                    return `
                        <div class="product-list-item mb-3 p-3" style="border: 1px solid var(--shein-border);">
                            <div class="d-flex align-items-center gap-3">
                                <img src="${productImage}" alt="${product.name}" 
                                     style="width: 60px; height: 60px; object-fit: cover; border: 1px solid var(--shein-border);"
                                     onerror="this.src='path/to/default-product.png';">
                                <div class="flex-grow-1">
                                    <h6 class="mb-1">${product.name}</h6>
                                    <div class="d-flex gap-2">
                                        <span class="badge badge-success">${pesoFormatter.format(product.price)}</span>
                                        <span class="badge badge-info">${product.stock} in stock</span>
                                        ${product.stock < 10 ? '<span class="badge badge-warning">Low Stock</span>' : ''}
                                    </div>
                                </div>
                            </div>
                        </div>`;
                }).join('');
            } else {
                modalBody.innerHTML = '<p class="text-center text-muted">This seller has no products listed.</p>';
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            modalBody.innerHTML = '<p class="text-center text-danger">Could not load products.</p>';
        }
    }

    async function showUserOrders(userId, userName) {
        const modalBody = document.getElementById('modalOrderList');
        const modalLabel = document.getElementById('ordersModalLabel');
        
        modalLabel.textContent = `Orders from ${userName}`;
        modalBody.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <div class="loading-text">Loading orders...</div>
            </div>`;
        
        $('#ordersModal').modal('show');

        try {
            const response = await fetch(`${BACKEND_URL}/api/admin/customers/${userId}/orders`);
            if (!response.ok) throw new Error('Failed to fetch orders');
            const data = await response.json();

            if (data.orders && data.orders.length > 0) {
                modalBody.innerHTML = data.orders.map(order => {
                    const statusColor = getStatusColor(order.status);
                    const orderDate = new Date(order.order_date).toLocaleDateString();
                    
                    return `
                        <div class="order-list-item mb-3 p-3" style="border: 1px solid var(--shein-border);">
                            <div class="d-flex justify-content-between align-items-start">
                                <div class="flex-grow-1">
                                    <h6 class="mb-1">Order #${order.id}</h6>
                                    <p class="mb-1 text-muted">${order.product_name}</p>
                                    <small class="text-muted">Ordered on ${orderDate}</small>
                                </div>
                                <div class="text-right">
                                    <div class="mb-2">
                                        <span class="badge badge-${statusColor}">${order.status}</span>
                                    </div>
                                    <strong>${pesoFormatter.format(order.total_price)}</strong>
                                </div>
                            </div>
                        </div>`;
                }).join('');
            } else {
                modalBody.innerHTML = '<p class="text-center text-muted">This customer has no orders.</p>';
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
            modalBody.innerHTML = '<p class="text-center text-danger">Could not load orders.</p>';
        }
    }

    async function deleteUser(userId, userRole) {
        const confirmMessage = `Are you sure you want to delete this ${userRole}?\n\nThis action cannot be undone.`;
        if (!confirm(confirmMessage)) return;
        
        try {
            const endpoint = userRole === 'seller' ? 
                `${BACKEND_URL}/api/admin/sellers/${userId}` :
                `${BACKEND_URL}/api/admin/users/${userId}`;
                
            const response = await fetch(endpoint, { method: 'DELETE' });
            
            if (response.ok) {
                showSuccessMessage(`${userRole.charAt(0).toUpperCase() + userRole.slice(1)} deleted successfully!`);
                await loadAllData();
                renderCurrentTab();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Deletion failed:', error);
            alert(`Error: ${error.message}`);
        }
    }

    // Form submission for editing users
    document.getElementById('editUserForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const submitBtn = document.querySelector('#editUserModal button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';
        submitBtn.disabled = true;

        const userId = document.getElementById('editUserId').value;
        const userRole = document.getElementById('editUserRole').value;
        
        const payload = {
            name: document.getElementById('editUserName').value.trim(),
            email: document.getElementById('editUserEmail').value.trim(),
            contact_number: document.getElementById('editUserPhone').value.trim() || null,
            address: document.getElementById('editUserAddress').value.trim() || null,
        };

        const password = document.getElementById('editUserPassword').value.trim();
        if (password) {
            if (password.length < 6) {
                alert('Password must be at least 6 characters long.');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                return;
            }
            payload.password = password;
        }

        try {
            const endpoint = userRole === 'seller' ? 
                `${BACKEND_URL}/api/admin/sellers/${userId}` :
                `${BACKEND_URL}/api/admin/users/${userId}`;
                
            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Failed to update user');
            }

            showSuccessMessage('User updated successfully!');
            $('#editUserModal').modal('hide');
            await loadAllData();
            renderCurrentTab();
        } catch (error) {
            console.error('Failed to update user:', error);
            alert(`Update failed: ${error.message}`);
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });

    // Filter functions
    window.applySellerFilters = function() {
        const search = document.getElementById('sellerSearch').value.toLowerCase();
        const sort = document.getElementById('sellerSort').value;
        
        filteredSellers = [...allSellers];
        
        if (search) {
            filteredSellers = filteredSellers.filter(seller => 
                seller.name.toLowerCase().includes(search) ||
                seller.email.toLowerCase().includes(search)
            );
        }
        
        filteredSellers.sort((a, b) => {
            switch (sort) {
                case 'name': return a.name.localeCompare(b.name);
                case 'products': return (b.product_count || 0) - (a.product_count || 0);
                case 'sales': return (b.total_sales || 0) - (a.total_sales || 0);
                case 'date': return new Date(b.created_at) - new Date(a.created_at);
                default: return 0;
            }
        });
        
        currentPage = 1;
        renderCurrentTab();
    };

    window.clearSellerFilters = function() {
        document.getElementById('sellerSearch').value = '';
        document.getElementById('sellerSort').value = 'name';
        filteredSellers = [...allSellers];
        currentPage = 1;
        renderCurrentTab();
    };

    window.applyCustomerFilters = function() {
        const search = document.getElementById('customerSearch').value.toLowerCase();
        const sort = document.getElementById('customerSort').value;
        
        filteredCustomers = [...allCustomers];
        
        if (search) {
            filteredCustomers = filteredCustomers.filter(customer => 
                customer.name.toLowerCase().includes(search) ||
                customer.email.toLowerCase().includes(search)
            );
        }
        
        filteredCustomers.sort((a, b) => {
            switch (sort) {
                case 'name': return a.name.localeCompare(b.name);
                case 'orders': return (b.total_orders || 0) - (a.total_orders || 0);
                case 'spent': return (b.total_spent || 0) - (a.total_spent || 0);
                case 'date': return new Date(b.created_at) - new Date(a.created_at);
                default: return 0;
            }
        });
        
        currentPage = 1;
        renderCurrentTab();
    };

    window.clearCustomerFilters = function() {
        document.getElementById('customerSearch').value = '';
        document.getElementById('customerSort').value = 'name';
        filteredCustomers = [...allCustomers];
        currentPage = 1;
        renderCurrentTab();
    };

    window.applyAllUsersFilters = function() {
        const search = document.getElementById('allUsersSearch').value.toLowerCase();
        const role = document.getElementById('roleFilter').value;
        const sort = document.getElementById('allUsersSort').value;
        
        filteredAllUsers = [...allUsers];
        
        if (search) {
            filteredAllUsers = filteredAllUsers.filter(user => 
                user.name.toLowerCase().includes(search) ||
                user.email.toLowerCase().includes(search)
            );
        }
        
        if (role) {
            filteredAllUsers = filteredAllUsers.filter(user => user.role === role);
        }
        
        filteredAllUsers.sort((a, b) => {
            switch (sort) {
                case 'name': return a.name.localeCompare(b.name);
                case 'role': return a.role.localeCompare(b.role);
                case 'date': return new Date(b.created_at) - new Date(a.created_at);
                default: return 0;
            }
        });
        
        currentPage = 1;
        renderCurrentTab();
    };

    window.clearAllUsersFilters = function() {
        document.getElementById('allUsersSearch').value = '';
        document.getElementById('roleFilter').value = '';
        document.getElementById('allUsersSort').value = 'name';
        filteredAllUsers = [...allUsers];
        currentPage = 1;
        renderCurrentTab();
    };

    // Utility functions
    function getStatusColor(status) {
        const statusColors = {
            'Pending': 'warning',
            'Processing': 'info',
            'Shipped': 'primary',
            'Delivered': 'success',
            'Cancelled': 'danger'
        };
        return statusColors[status] || 'secondary';
    }

    function showSuccessMessage(message) {
        const toast = document.createElement('div');
        toast.className = 'alert alert-success position-fixed';
        toast.style.cssText = `
            top: 20px; right: 20px; z-index: 9999; 
            border: none; background: var(--shein-black);
            color: var(--shein-white); font-weight: 600;
        `;
        toast.innerHTML = `<i class="fas fa-check-circle me-2"></i>${message}`;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), 3000);
    }

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft' && currentPage > 1) {
            currentPage--;
            renderCurrentTab();
        } else if (e.key === 'ArrowRight') {
            const currentData = currentTab === 'sellers' ? filteredSellers : 
                               currentTab === 'customers' ? filteredCustomers : filteredAllUsers;
            const maxPages = Math.ceil(currentData.length / USERS_PER_PAGE);
            
            if (currentPage < maxPages) {
                currentPage++;
                renderCurrentTab();
            }
        }
    });

    // Add smooth modal animations
    $(document).ready(function() {
        $('.modal').on('show.bs.modal', function() {
            $(this).find('.modal-dialog').css({
                'transform': 'scale(0.8)',
                'opacity': '0'
            });
            setTimeout(() => {
                $(this).find('.modal-dialog').css({
                    'transform': 'scale(1)',
                    'opacity': '1',
                    'transition': 'all 0.3s ease'
                });
            }, 50);
        });

        $('.modal').on('hidden.bs.modal', function() {
            $(this).find('.modal-dialog').css({
                'transform': '',
                'opacity': '',
                'transition': ''
            });
        });
    });
});