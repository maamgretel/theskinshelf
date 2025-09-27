// Dynamic Sidebar Navigation
document.addEventListener('DOMContentLoaded', function() {
    // Function to set active navigation item
    function setActiveNav() {
        // Get current page from URL
        const currentPath = window.location.pathname;
        const currentPage = currentPath.substring(currentPath.lastIndexOf('/') + 1);
        
        // Remove active class from all nav links
        document.querySelectorAll('.sidebar .nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Define page mappings
        const pageMapping = {
            'seller_dashboard.html': 'dashboard',
            'orders.html': 'orders', 
            'product_seller.html': 'products',
            'add_product.html': 'products', // Also highlight products for add product page
            'customers.html': 'customers',
            'profile_seller.html': 'profile'
        };
        
        // Get the section for current page
        const currentSection = pageMapping[currentPage] || 'dashboard';
        
        // Find and activate the corresponding nav link
        const activeLink = document.querySelector(`.sidebar .nav-link[data-section="${currentSection}"], .sidebar .nav-link[href="${currentPage}"]`);
        
        if (activeLink) {
            activeLink.classList.add('active');
        } else {
            // Fallback: if no specific match found, check by href
            document.querySelectorAll('.sidebar .nav-link').forEach(link => {
                const href = link.getAttribute('href');
                if (href && (href === currentPage || href.includes(currentPage))) {
                    link.classList.add('active');
                }
            });
        }
        
        // If still no active link and we're on dashboard, activate dashboard
        if (!document.querySelector('.sidebar .nav-link.active') && 
            (currentPage === 'seller_dashboard.html' || currentPage === '' || currentSection === 'dashboard')) {
            const dashboardLink = document.querySelector('.sidebar .nav-link[href="seller_dashboard.html"]');
            if (dashboardLink) {
                dashboardLink.classList.add('active');
            }
        }
    }
    
    // Set active nav on page load
    setActiveNav();
    
    // Optional: Add click handlers to nav links for immediate feedback
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            // Don't prevent default navigation
            // Just remove active class from others and add to clicked one
            document.querySelectorAll('.sidebar .nav-link').forEach(l => {
                l.classList.remove('active');
            });
            this.classList.add('active');
        });
    });
    
    // Update active state when user navigates back/forward
    window.addEventListener('popstate', setActiveNav);
});