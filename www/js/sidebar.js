// sidebar-nav.js - Reusable Sidebar Navigation Component

class SidebarNavigation {
    constructor(config = {}) {
        this.config = {
            userRole: 'seller',
            currentPage: '',
            logoText: 'Seller Hub',
            logoIcon: 'fas fa-store',
            ...config
        };
        
        this.menuItems = this.getMenuItems();
        this.init();
    }

    getMenuItems() {
        const menuConfig = {
            seller: [
                { 
                    id: 'dashboard', 
                    label: 'Dashboard', 
                    icon: 'fas fa-tachometer-alt', 
                    href: 'seller_dashboard.html',
                    badge: null
                },
                { 
                    id: 'orders', 
                    label: 'Orders', 
                    icon: 'fas fa-shopping-cart', 
                    href: 'orders.html',
                    badge: { text: 'New', type: 'warning' }
                },
                { 
                    id: 'products', 
                    label: 'Products', 
                    icon: 'fas fa-box', 
                    href: 'product_seller.html',
                    badge: null
                },
              
                { 
                    id: 'analytics', 
                    label: 'Analytics', 
                    icon: 'fas fa-chart-line', 
                    href: 'analytics.html',
                    badge: null
                },
                { 
                    id: 'customers', 
                    label: 'Customers', 
                    icon: 'fas fa-users', 
                    href: 'customers.html',
                    badge: null
                },
            
            ],
            admin: [
                // Add admin menu items here
            ]
        };

        return menuConfig[this.config.userRole] || menuConfig.seller;
    }

    init() {
        this.createSidebar();
        this.attachEventListeners();
        this.setActivePage();
        this.handleResponsive();
    }

    createSidebar() {
        // Check if sidebar already exists
        const existingSidebar = document.querySelector('.sidebar');
        if (existingSidebar) {
            existingSidebar.remove();
        }

        const sidebarHTML = `
            <nav class="sidebar" id="sidebar">
                <div class="sidebar-header">
                    <h4>
                        <i class="${this.config.logoIcon}"></i> 
                        ${this.config.logoText}
                    </h4>
                </div>
                <ul class="sidebar-menu">
                    ${this.menuItems.map(item => this.createMenuItem(item)).join('')}
                </ul>
                <div class="sidebar-footer">
                    <div class="user-info">
                        <div class="user-avatar">
                            <i class="fas fa-user-circle"></i>
                        </div>
                        <div class="user-details">
                            <a href="profile_seller.html" style="color:inherit; text-decoration:none;">
                                <div class="user-name">${this.getUserName()}</div>
                                <div class="user-role">${this.config.userRole}</div>
                            </a>
                        </div>
                    </div>
                    <hr class="sidebar-divider">
                    <ul class="sidebar-menu">
                        <li>
                            <a href="#" onclick="handleLogout()">
                                <i class="fas fa-sign-out-alt"></i> 
                                Logout
                            </a>
                        </li>
                    </ul>
                </div>
            </nav>
        `;

        // Insert sidebar at the beginning of body
        document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
        
        // Create overlay for mobile
        this.createOverlay();
        
        // Adjust main content margin
        this.adjustMainContent();
    }

    createMenuItem(item) {
        const badge = item.badge ? 
            `<span class="badge badge-${item.badge.type} ml-auto">${item.badge.text}</span>` : '';
        
        return `
            <li data-page="${item.id}">
                <a href="${item.href}">
                    <i class="${item.icon}"></i> 
                    ${item.label}
                    ${badge}
                </a>
            </li>
        `;
    }

    createOverlay() {
        if (!document.querySelector('.sidebar-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            overlay.id = 'sidebarOverlay';
            document.body.appendChild(overlay);
        }
    }

    adjustMainContent() {
        const mainContent = document.querySelector('.main-content') || 
                          document.querySelector('main') || 
                          document.querySelector('.container-fluid') ||
                          document.body;
        
        if (mainContent && !mainContent.classList.contains('sidebar-adjusted')) {
            mainContent.classList.add('sidebar-adjusted');
            mainContent.style.marginLeft = window.innerWidth > 1200 ? '280px' : '0';
            mainContent.style.transition = 'margin-left 0.3s ease';
        }
    }

    attachEventListeners() {
        // Toggle sidebar on mobile
        document.addEventListener('click', (e) => {
            if (e.target.closest('.sidebar-toggle')) {
                this.toggleSidebar();
            }
            
            if (e.target.closest('.sidebar-overlay')) {
                this.closeSidebar();
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResponsive();
        });

        // Handle navigation clicks
        document.addEventListener('click', (e) => {
            const menuLink = e.target.closest('.sidebar-menu a');
            if (menuLink && !menuLink.getAttribute('onclick')) {
                // Add active state animation
                const listItem = menuLink.parentElement;
                listItem.classList.add('nav-clicked');
                setTimeout(() => {
                    listItem.classList.remove('nav-clicked');
                }, 200);
            }
        });
    }

    setActivePage() {
        // Get current page from URL or config
        const currentPage = this.config.currentPage || this.getCurrentPageFromURL();
        
        // Remove existing active states
        document.querySelectorAll('.sidebar-menu li').forEach(li => {
            li.classList.remove('active');
        });

        // Set active state
        const activeItem = document.querySelector(`[data-page="${currentPage}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    getCurrentPageFromURL() {
        const path = window.location.pathname;
        const filename = path.split('/').pop().replace('.html', '');
        
        // Map filenames to page IDs
        const pageMap = {
            'seller_dashboard': 'dashboard',
            'orders': 'orders',
            'products': 'products',
            'inventory': 'inventory',
            
            'customers': 'customers',
           
        };

        return pageMap[filename] || 'dashboard';
    }

    getUserName() {
        // Get user from localStorage or return default
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            return user?.name || user?.username || 'User';
        } catch {
            return 'User';
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        if (sidebar && overlay) {
            sidebar.classList.toggle('show');
            overlay.classList.toggle('show');
        }
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        if (sidebar && overlay) {
            sidebar.classList.remove('show');
            overlay.classList.remove('show');
        }
    }

    handleResponsive() {
        const mainContent = document.querySelector('.sidebar-adjusted');
        
        if (window.innerWidth > 1200) {
            if (mainContent) {
                mainContent.style.marginLeft = '280px';
            }
            this.closeSidebar();
        } else {
            if (mainContent) {
                mainContent.style.marginLeft = '0';
            }
        }
    }

    // Public method to update badge
    updateBadge(pageId, badgeConfig) {
        const menuItem = document.querySelector(`[data-page="${pageId}"] a`);
        if (menuItem) {
            const existingBadge = menuItem.querySelector('.badge');
            if (existingBadge) {
                existingBadge.remove();
            }
            
            if (badgeConfig) {
                const badge = document.createElement('span');
                badge.className = `badge badge-${badgeConfig.type} ml-auto`;
                badge.textContent = badgeConfig.text;
                menuItem.appendChild(badge);
            }
        }
    }
}

// Global logout function
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        window.location.href = '../../pages/login.html';
    }
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get configuration from page
    const config = window.sidebarConfig || {};
    new SidebarNavigation(config);
});

// Export for manual initialization
window.SidebarNavigation = SidebarNavigation;