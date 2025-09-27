// mobile-nav.js - Reusable Mobile Navigation Component with Dot Badge

class MobileNavigation {
    constructor(options = {}) {
        this.options = {
            activeRoute: options.activeRoute || '',
            cartBadgeId: options.cartBadgeId || 'cart-badge',
            notifBadgeId: options.notifBadgeId || 'notifBadge',
            showOrdersInHeader: options.showOrdersInHeader !== false, // default true
            customNavItems: options.customNavItems || null,
            ...options
        };
        
        this.init();
    }

    // Check if device is mobile
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               window.innerWidth <= 767;
    }

    // Generate mobile navigation HTML
    generateMobileNav() {
        const navItems = this.options.customNavItems || [
            { 
                href: 'customer_dashboard.html', 
                icon: 'fas fa-home', 
                label: 'Home', 
                key: 'home',
                active: ['dashboard', 'home', 'index']
            },
            { 
                href: 'bag.html', 
                icon: 'fas fa-shopping-bag', 
                label: 'Bag', 
                key: 'bag',
                badge: 'mobile-cart-badge',
                badgeType: 'number',
                active: ['bag', 'cart']
            },
            { 
                href: 'notifications.html', 
                icon: 'fas fa-bell', 
                label: 'Notifications', 
                key: 'notifications',
                badge: 'mobile-notif-badge',
                badgeType: 'dot',
                active: ['notifications', 'notif']
            },
            { 
                href: 'profile_seller.html', 
                icon: 'fas fa-user-circle', 
                label: 'Profile', 
                key: 'profile',
                active: ['profile', 'account']
            }
        ];

        const navItemsHTML = navItems.map(item => {
            let badgeHTML = '';
            if (item.badge) {
                if (item.badgeType === 'dot') {
                    badgeHTML = `<span id="${item.badge}" class="badge badge-dot" style="display: none;"></span>`;
                } else {
                    badgeHTML = `<span id="${item.badge}" class="badge badge-danger" style="display: none;"></span>`;
                }
            }
            
            return `
                <li class="nav-item">
                    <a class="nav-link position-relative" href="${item.href}" data-nav-key="${item.key}">
                        <i class="${item.icon}"></i>
                        <span>${item.label}</span>
                        ${badgeHTML}
                    </a>
                </li>
            `;
        }).join('');

        return `
            <nav class="mobile-bottom-nav">
                <ul class="nav">
                    ${navItemsHTML}
                </ul>
            </nav>
        `;
    }

    // Generate mobile header icons
    generateMobileHeaderIcons() {
        if (!this.options.showOrdersInHeader) return '';
        
        return `
            <div class="mobile-header-icons" style="display: none;">
                <a href="orders.html" class="nav-link px-2 text-dark" title="My Orders">
                    <i class="fas fa-receipt"></i>
                </a>
                <a href="profile_seller.html" class="nav-link px-2 text-dark">
                    <i class="fas fa-user-circle"></i>
                </a>
            </div>
        `;
    }

    // Add CSS styles
    addStyles() {
        if (document.getElementById('mobile-nav-styles')) return;
        
        const styles = `
            <style id="mobile-nav-styles">
                :root {
                    --bottom-nav-height: 70px;
                }

                .is-mobile {
                    padding-bottom: var(--bottom-nav-height) !important;
                }

                .mobile-bottom-nav {
                    display: none;
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: #ffffff;
                    border-top: 1px solid #e9ecef;
                    height: var(--bottom-nav-height);
                    z-index: 1040;
                    box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
                }

                .mobile-bottom-nav .nav {
                    height: 100%;
                    display: flex;
                    justify-content: space-around;
                    align-items: center;
                }

                .mobile-bottom-nav .nav-item {
                    flex: 1;
                    text-align: center;
                }

                .mobile-bottom-nav .nav-link {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: #6c757d;
                    text-decoration: none;
                    padding: 8px 4px;
                    font-size: 0.7rem;
                    transition: all 0.2s ease;
                    position: relative;
                }

                .mobile-bottom-nav .nav-link.active {
                    color: #007bff;
                    background-color: rgba(0, 123, 255, 0.05);
                }

                .mobile-bottom-nav .nav-link:hover {
                    color: #007bff;
                    text-decoration: none;
                }

                .mobile-bottom-nav .nav-link i {
                    font-size: 1.2rem;
                    margin-bottom: 2px;
                }

                .mobile-bottom-nav .nav-link .badge {
                    position: absolute;
                    top: 8px;
                    right: 50%;
                    transform: translateX(50%);
                    font-size: 0.6rem;
                    padding: 2px 5px;
                    border-radius: 10px;
                }

                /* Dot badge specific styling */
                .mobile-bottom-nav .nav-link .badge-dot {
                    width: 8px;
                    height: 8px;
                    background-color: #dc3545;
                    border-radius: 50%;
                    padding: 0;
                    min-width: 8px;
                    top: 6px;
                    right: 45%;
                    transform: translateX(50%);
                    border: 2px solid #ffffff;
                    box-shadow: 0 0 3px rgba(220, 53, 69, 0.5);
                }

                .mobile-header-icons {
                    display: none !important;
                    align-items: center;
                    gap: 10px;
                }

                .mobile-header-icons .nav-link {
                    padding: 6px;
                    color: #343a40;
                    text-decoration: none;
                }

                @media (max-width: 767.98px) {
                    .mobile-bottom-nav {
                        display: block !important;
                    }

                    .desktop-nav-items {
                        display: none !important;
                    }

                    .mobile-header-icons {
                        display: flex !important;
                    }
                }

                @supports (padding: max(0px)) {
                    .mobile-bottom-nav {
                        padding-bottom: max(0px, env(safe-area-inset-bottom));
                    }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    // Initialize the mobile navigation
    init() {
        this.addStyles();
        
        // Add mobile navigation to body
        const mobileNavHTML = this.generateMobileNav();
        document.body.insertAdjacentHTML('beforeend', mobileNavHTML);
        
        // Add mobile header icons if they don't exist
        const headerContainer = document.querySelector('.fixed-top .container .d-flex');
        if (headerContainer && !document.querySelector('.mobile-header-icons')) {
            const mobileHeaderHTML = this.generateMobileHeaderIcons();
            headerContainer.insertAdjacentHTML('beforeend', mobileHeaderHTML);
        }
        
        // Initialize mobile features
        this.initializeMobileFeatures();
        
        // Set up event listeners
        this.setupEventListeners();
    }

    // Initialize mobile-specific features
    initializeMobileFeatures() {
        if (this.isMobileDevice()) {
            document.body.classList.add('is-mobile');
            this.syncBadges();
            this.updateActiveNavState();
        }
    }

    // Sync badges between header and mobile nav
    syncBadges() {
        this.syncCartBadges();
        this.syncNotificationBadges();
    }

    syncCartBadges() {
        const headerBadge = document.getElementById(this.options.cartBadgeId);
        const mobileBadge = document.getElementById('mobile-cart-badge');
        
        if (headerBadge && mobileBadge) {
            if (headerBadge.style.display !== 'none' && headerBadge.textContent) {
                mobileBadge.textContent = headerBadge.textContent;
                mobileBadge.style.display = 'block';
            } else {
                mobileBadge.style.display = 'none';
            }
        }
    }

    syncNotificationBadges() {
        const headerBadge = document.getElementById(this.options.notifBadgeId);
        const mobileBadge = document.getElementById('mobile-notif-badge');
        
        if (headerBadge && mobileBadge) {
            // For notification dot, just show/hide based on whether there are notifications
            if (headerBadge.style.display !== 'none' && headerBadge.textContent && parseInt(headerBadge.textContent) > 0) {
                mobileBadge.style.display = 'block';
                // Don't set textContent for dot badge
            } else {
                mobileBadge.style.display = 'none';
            }
        }
    }

    // Update active navigation state
    updateActiveNavState() {
        const currentPath = window.location.pathname;
        const currentPage = this.options.activeRoute || this.getCurrentPageFromPath();
        const navLinks = document.querySelectorAll('.mobile-bottom-nav .nav-link');
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            const navKey = link.getAttribute('data-nav-key');
            
            // Check if current page matches this nav item
            if (this.isCurrentPage(currentPage, navKey)) {
                link.classList.add('active');
            }
        });
    }

    getCurrentPageFromPath() {
        const path = window.location.pathname;
        const filename = path.split('/').pop().replace('.html', '');
        return filename || 'home';
    }

    isCurrentPage(currentPage, navKey) {
        const navItems = {
            'home': ['dashboard', 'home', 'index', 'customer_dashboard'],
            'bag': ['bag', 'cart', 'shopping'],
            'notifications': ['notifications', 'notif'],
            'profile': ['profile', 'account', 'settings']
        };

        const matchingPages = navItems[navKey] || [navKey];
        return matchingPages.some(page => 
            currentPage.includes(page) || 
            page.includes(currentPage)
        );
    }

    // Set up event listeners
    setupEventListeners() {
        // Re-initialize on window resize
        window.addEventListener('resize', () => {
            this.initializeMobileFeatures();
        });
        
        // Periodically sync badges
        setInterval(() => {
            if (this.isMobileDevice()) {
                this.syncBadges();
            }
        }, 1000);

        // Handle Cordova deviceready event
        if (typeof window.cordova !== 'undefined') {
            document.addEventListener('deviceready', () => {
                console.log('Cordova device ready');
                this.initializeMobileFeatures();
                
                // Handle hardware back button
                document.addEventListener('backbutton', (e) => {
                    e.preventDefault();
                    this.handleBackButton();
                }, false);
            }, false);
        }

        // Prevent zoom on input focus (iOS)
        document.addEventListener('touchstart', () => {
            document.querySelectorAll('input, select, textarea').forEach(element => {
                element.style.fontSize = '16px';
            });
        });
    }

    // Handle hardware back button
    handleBackButton() {
        // Override this method in your implementation if needed
        const currentPage = this.getCurrentPageFromPath();
        
        if (currentPage === 'home' || currentPage === 'dashboard' || currentPage === 'customer_dashboard') {
            // Exit app or show exit confirmation
            if (navigator.app && navigator.app.exitApp) {
                navigator.app.exitApp();
            }
        } else {
            // Navigate to previous page or home
            window.location.href = 'customer_dashboard.html';
        }
    }

    // Update badge manually
    updateCartBadge(count) {
        const headerBadge = document.getElementById(this.options.cartBadgeId);
        const mobileBadge = document.getElementById('mobile-cart-badge');
        
        [headerBadge, mobileBadge].forEach(badge => {
            if (badge) {
                if (count > 0) {
                    badge.textContent = count;
                    badge.style.display = 'block';
                } else {
                    badge.style.display = 'none';
                }
            }
        });
    }

    updateNotificationBadge(count) {
        const headerBadge = document.getElementById(this.options.notifBadgeId);
        const mobileBadge = document.getElementById('mobile-notif-badge');
        
        // Update header badge with number
        if (headerBadge) {
            if (count > 0) {
                headerBadge.textContent = count;
                headerBadge.style.display = 'block';
            } else {
                headerBadge.style.display = 'none';
            }
        }
        
        // Update mobile badge as dot (no text content)
        if (mobileBadge) {
            if (count > 0) {
                mobileBadge.style.display = 'block';
                // Don't set textContent for dot badge
            } else {
                mobileBadge.style.display = 'none';
            }
        }
    }

    // Show notification dot (convenience method)
    showNotificationDot() {
        const mobileBadge = document.getElementById('mobile-notif-badge');
        if (mobileBadge) {
            mobileBadge.style.display = 'block';
        }
    }

    // Hide notification dot (convenience method)
    hideNotificationDot() {
        const mobileBadge = document.getElementById('mobile-notif-badge');
        if (mobileBadge) {
            mobileBadge.style.display = 'none';
        }
    }

    // Refresh navigation state
    refresh() {
        this.initializeMobileFeatures();
    }

    // Destroy the navigation
    destroy() {
        const mobileNav = document.querySelector('.mobile-bottom-nav');
        const mobileHeaderIcons = document.querySelector('.mobile-header-icons');
        const styles = document.getElementById('mobile-nav-styles');
        
        if (mobileNav) mobileNav.remove();
        if (mobileHeaderIcons) mobileHeaderIcons.remove();
        if (styles) styles.remove();
        
        document.body.classList.remove('is-mobile');
    }
}

// Usage examples and initialization
const initializeMobileNav = (pageType = 'home', options = {}) => {
    const defaultOptions = {
        activeRoute: pageType,
        cartBadgeId: 'cart-badge',
        notifBadgeId: 'notifBadge',
        showOrdersInHeader: true
    };

    return new MobileNavigation({ ...defaultOptions, ...options });
};

// Auto-initialize if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Auto-detect page type and initialize
        const pageType = window.location.pathname.split('/').pop().replace('.html', '') || 'home';
        window.mobileNav = initializeMobileNav(pageType);
    });
} else {
    // DOM is already loaded
    const pageType = window.location.pathname.split('/').pop().replace('.html', '') || 'home';
    window.mobileNav = initializeMobileNav(pageType);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MobileNavigation, initializeMobileNav };
}