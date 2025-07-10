document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const user = JSON.parse(localStorage.getItem('user'));

    // --- SECURITY CHECK ---
    if (!user || user.role !== 'customer') {
        window.location.href = 'login.html';
        return;
    }

    // --- DOM ELEMENT REFERENCES ---
    const addressContainer = document.getElementById('delivery-address-container');
    const itemsContainer = document.getElementById('checkout-items-container');
    const merchandiseSubtotalEl = document.getElementById('merchandise-subtotal');
    const shippingSubtotalEl = document.getElementById('shipping-subtotal');
    const totalPaymentEl = document.getElementById('total-payment');
    const placeOrderBtn = document.getElementById('place-order-btn');
    const saveAddressBtn = document.getElementById('save-address-btn');
    const contactNumberInput = document.getElementById('contactNumber');
    const fullAddressInput = document.getElementById('fullAddress');

    let checkoutData = null; // To store all checkout data globally

    /**
     * Main function to fetch all necessary data for the checkout page.
     */
    const fetchCheckoutData = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/checkout`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`, // Assuming token-based auth
                    'X-User-ID': user.id.toString()
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch checkout data.');
            }

            checkoutData = await response.json();

            // Render all sections of the page
            renderAddress(checkoutData.deliveryInfo);
            renderItems(checkoutData.items);
            calculateSummary(checkoutData.items, checkoutData.shippingOptions);

        } catch (error) {
            console.error('Error:', error);
            itemsContainer.innerHTML = `<div class="alert alert-danger">Could not load checkout page. Please try again.</div>`;
        }
    };

    /**
     * Renders the delivery address section.
     * @param {object} deliveryInfo - The user's address details.
     */
    const renderAddress = (deliveryInfo) => {
        if (deliveryInfo && deliveryInfo.address && deliveryInfo.contact_number) {
            addressContainer.innerHTML = `
                <p class="font-weight-bold mb-0">${deliveryInfo.name} (${deliveryInfo.contact_number})</p>
                <p>${deliveryInfo.address}</p>
                <button class="btn btn-sm btn-outline-secondary" data-toggle="modal" data-target="#addressModal">
                    Change
                </button>
            `;
            // Pre-fill the modal for easy editing
            contactNumberInput.value = deliveryInfo.contact_number;
            fullAddressInput.value = deliveryInfo.address;
        } else {
            addressContainer.innerHTML = `
                <p class="text-danger">No delivery address found.</p>
                <button class="btn btn-primary" data-toggle="modal" data-target="#addressModal">
                    Add Address
                </button>
            `;
            // Automatically open the modal if no address exists
            $('#addressModal').modal('show');
        }
    };

    /**
     * Renders the list of products being ordered.
     * @param {Array} items - The list of items from the cart.
     */
    const renderItems = (items) => {
        if (!items || items.length === 0) {
            itemsContainer.innerHTML = '<p class="p-3">No items to check out.</p>';
            placeOrderBtn.disabled = true;
            return;
        }

        const tableHeader = `
            <table class="table">
                <thead>
                    <tr>
                        <th scope="col">Product</th>
                        <th scope="col" class="text-right">Unit Price</th>
                        <th scope="col" class="text-center">Quantity</th>
                        <th scope="col" class="text-right">Item Subtotal</th>
                    </tr>
                </thead>
                <tbody>
        `;

        const tableFooter = `</tbody></table>`;

        const itemRows = items.map(item => {
            const itemSubtotal = item.price * item.quantity;
            return `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${item.image}" alt="${item.name}" class="img-fluid rounded" style="width: 50px; height: 50px; object-fit: cover;">
                            <span class="ml-3">${item.name}</span>
                        </div>
                    </td>
                    <td class="text-right">₱${parseFloat(item.price).toFixed(2)}</td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-right">₱${itemSubtotal.toFixed(2)}</td>
                </tr>
            `;
        }).join('');

        itemsContainer.innerHTML = tableHeader + itemRows + tableFooter;
    };

    /**
     * Calculates and displays the final order summary.
     * @param {Array} items - The list of items.
     * @param {object} shippingOptions - Available shipping options.
     */
    const calculateSummary = (items, shippingOptions) => {
        const merchandiseSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shippingFee = shippingOptions.standard || 0; // Default shipping fee
        const totalPayment = merchandiseSubtotal + shippingFee;

        merchandiseSubtotalEl.textContent = `₱${merchandiseSubtotal.toFixed(2)}`;
        shippingSubtotalEl.textContent = `₱${shippingFee.toFixed(2)}`;
        totalPaymentEl.textContent = `₱${totalPayment.toFixed(2)}`;
    };

    /**
     * Handles the click event for the "Save Address" button in the modal.
     */
    const handleSaveAddress = async () => {
        const contactNumber = contactNumberInput.value.trim();
        const address = fullAddressInput.value.trim();

        if (!contactNumber || !address) {
            alert('Please fill out both fields.');
            return;
        }

        try {
            const response = await fetch(`${BACKEND_URL}/api/checkout/address`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`,
                    'X-User-ID': user.id.toString()
                },
                body: JSON.stringify({ contact_number: contactNumber, address: address })
            });

            if (!response.ok) {
                throw new Error('Failed to save address.');
            }

            // Hide the modal and reload the page to show the new address
            $('#addressModal').modal('hide');
            location.reload();

        } catch (error) {
            console.error('Error saving address:', error);
            alert('Could not save address. Please try again.');
        }
    };
    
    /**
     * Handles the click event for the "Place Order" button.
     */
    const handlePlaceOrder = async () => {
        placeOrderBtn.disabled = true;
        placeOrderBtn.textContent = 'Placing Order...';

        try {
            const response = await fetch(`${BACKEND_URL}/api/orders/place`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`,
                    'X-User-ID': user.id.toString()
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to place order.');
            }

            alert('Order placed successfully!');
            // Redirect to an order history or dashboard page
            window.location.href = 'customer_dashboard.html'; 

        } catch (error) {
            console.error('Error placing order:', error);
            alert(`Error: ${error.message}`);
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = 'Place Order';
        }
    };

    // --- INITIALIZATION ---
    saveAddressBtn.addEventListener('click', handleSaveAddress);
    placeOrderBtn.addEventListener('click', handlePlaceOrder);
    fetchCheckoutData(); // Fetch data when the page loads
});