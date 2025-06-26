document.addEventListener('DOMContentLoaded', () => {

    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    // Get the logged-in user from localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    // A variable to store the orders data globally for easy access by different functions
    let ordersData = [];

    // --- 1. Security Check ---
    if (!user || user.role !== 'seller') {
        localStorage.clear();
        alert('Access Denied. Please log in as a seller.');
        window.location.href = '../../pages/login.html';
        return;
    }

    const ordersTableBody = document.getElementById('ordersTableBody');
    const totalRevenueCell = document.getElementById('totalRevenueCell');
    const exportCsvBtn = document.getElementById('exportCsvBtn');

    // --- 2. Main Function to Fetch and Display Orders ---
    async function fetchAndDisplayOrders() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/seller/orders`, {
                headers: { 'X-User-ID': user.id }
            });
            if (!response.ok) {
                throw new Error('Could not fetch orders from the server.');
            }
            ordersData = await response.json(); // Store data globally
            renderOrders(ordersData);
            calculateTotalRevenue(ordersData);
        } catch (error) {
            console.error('Error fetching orders:', error);
            ordersTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error loading orders.</td></tr>`;
        }
    }

    // --- 3. Function to Render the Orders Table ---
    function renderOrders(orders) {
        ordersTableBody.innerHTML = ''; // Clear "Loading..." message

        if (orders.length === 0) {
            ordersTableBody.innerHTML = `<tr><td colspan="6" class="text-center">You have no orders yet.</td></tr>`;
            return;
        }

        const statusOptions = ['Pending', 'Shipped', 'Delivered', 'Cancelled'];

        orders.forEach(order => {
            const row = document.createElement('tr');
            
            // Generate the status dropdown, selecting the current status
            const optionsHTML = statusOptions.map(status => 
                `<option value="${status}" ${order.status === status ? 'selected' : ''}>${status}</option>`
            ).join('');

            row.innerHTML = `
                <td>${order.product_name}</td>
                <td>${order.buyer_name}</td>
                <td>$${parseFloat(order.total_price).toFixed(2)}</td>
                <td>${new Date(order.order_date).toLocaleDateString()}</td>
                <td>${order.status}</td>
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

    // --- 4. Function to Calculate Total Revenue ---
    function calculateTotalRevenue(orders) {
        const total = orders.reduce((sum, order) => sum + parseFloat(order.total_price), 0);
        totalRevenueCell.textContent = `$${total.toFixed(2)}`;
    }

    // --- 5. Function to Handle Status Updates ---
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
            // Refresh the entire order list to ensure data is consistent
            fetchAndDisplayOrders();

        } catch (error) {
            console.error('Error updating status:', error);
            showAlert(error.message, 'danger');
        }
    }

    // --- 6. Function to Handle CSV Export ---
    function exportToCsv() {
        if (ordersData.length === 0) {
            alert('There are no orders to export.');
            return;
        }

        const headers = ['Product', 'Buyer', 'Total Price', 'Date', 'Status'];
        const csvRows = [headers.join(',')]; // Start with the header row

        // Add a row for each order
        ordersData.forEach(order => {
            const row = [
                `"${order.product_name.replace(/"/g, '""')}"`, // Handle quotes in names
                `"${order.buyer_name.replace(/"/g, '""')}"`,
                order.total_price,
                new Date(order.order_date).toLocaleDateString(),
                order.status
            ];
            csvRows.push(row.join(','));
        });

        // Add total revenue row
        const totalRevenue = ordersData.reduce((sum, order) => sum + parseFloat(order.total_price), 0).toFixed(2);
        csvRows.push(['', 'Total Revenue', totalRevenue, '', ''].join(','));
        
        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        
        // Create a temporary link to trigger the download
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'my_product_orders.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    // --- 7. Event Listeners ---

    // Use event delegation for the "Update" buttons
    ordersTableBody.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('update-status-btn')) {
            const orderId = e.target.getAttribute('data-order-id');
            handleStatusUpdate(orderId);
        }
    });

    exportCsvBtn.addEventListener('click', exportToCsv);

    // --- Helper for showing alerts ---
    function showAlert(message, type = 'info', duration = 3000) {
        const alertContainer = document.getElementById('alert-container');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        alertContainer.prepend(alert);
        setTimeout(() => alert.remove(), duration);
    }

    // --- Initial Call ---
    fetchAndDisplayOrders();
});
