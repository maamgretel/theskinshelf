document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const BACKEND_URL = 'https://backend-rj0a.onrender.com';
    const user = JSON.parse(localStorage.getItem('user'));

    // --- STATE ---
    let cardDetailsSaved = false;

    // --- SECURITY CHECK ---
    if (!user || user.role !== 'customer') {
        window.location.href = 'login.html';
        return;
    }

    // --- DOM REFERENCES (Main Page) ---
    const addressContainer = document.getElementById('delivery-address-container');
    const itemsContainer = document.getElementById('checkout-items-container');
    const merchandiseSubtotalEl = document.getElementById('merchandise-subtotal');
    const shippingSubtotalEl = document.getElementById('shipping-subtotal');
    const totalPaymentEl = document.getElementById('total-payment');
    const placeOrderBtn = document.getElementById('place-order-btn');
    const codRadio = document.getElementById('cod');
    const bankCardRadio = document.getElementById('bankCard');

    // --- DOM REFERENCES (Payment Modal) ---
    const paymentForm = document.getElementById('payment-form');
    const savePaymentBtn = document.getElementById('save-payment-btn');
    const cardNumberInput = document.getElementById('modalCardNumber');
    const cardHolderInput = document.getElementById('modalCardHolder');
    const expiryMonthSelect = document.getElementById('modalExpiryMonth');
    const expiryYearSelect = document.getElementById('modalExpiryYear');
    const cvvInput = document.getElementById('modalCvv');
    const cardNumberDisplay = document.getElementById('cardNumberDisplay');
    const cardHolderDisplay = document.getElementById('cardHolderDisplay');
    const cardExpiresDisplay = document.getElementById('cardExpiresDisplay');
    const cardFlipper = document.getElementById('cardFlipper');

    // --- DATA FETCHING & RENDERING ---

    const fetchCheckoutData = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/checkout`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`,
                    'X-User-ID': user.id.toString()
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch checkout data.');
            }
            const checkoutData = await response.json();
            renderAddress(checkoutData.deliveryInfo);
            renderItems(checkoutData.items);
            calculateSummary(checkoutData.items, checkoutData.shippingOptions);
        } catch (error) {
            console.error('Error:', error);
            itemsContainer.innerHTML = `<div class="alert alert-danger p-3">Could not load checkout details. Please try again later.</div>`;
        }
    };

    const renderAddress = (deliveryInfo) => {
        if (deliveryInfo && deliveryInfo.address && deliveryInfo.contact_number) {
            addressContainer.innerHTML = `
                <p class="font-weight-bold mb-0">${deliveryInfo.name} (${deliveryInfo.contact_number})</p>
                <p>${deliveryInfo.address}</p>
                <button class="btn btn-sm btn-outline-secondary" data-toggle="modal" data-target="#addressModal">Change</button>
            `;
        } else {
            addressContainer.innerHTML = `
                <p class="text-danger">No delivery address found.</p>
                <button class="btn btn-primary" data-toggle="modal" data-target="#addressModal">Add Address</button>
            `;
        }
    };

    const renderItems = (items) => {
        if (!items || items.length === 0) {
            itemsContainer.innerHTML = '<p class="p-3 text-center">Your cart is empty.</p>';
            placeOrderBtn.disabled = true;
            return;
        }
        const tableRows = items.map(item => {
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
                </tr>`;
        }).join('');

        itemsContainer.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th scope="col">Product</th>
                        <th scope="col" class="text-right">Unit Price</th>
                        <th scope="col" class="text-center">Quantity</th>
                        <th scope="col" class="text-right">Item Subtotal</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>`;
    };

    const calculateSummary = (items, shippingOptions) => {
        const merchandiseSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shippingFee = shippingOptions.standard || 0;
        const totalPayment = merchandiseSubtotal + shippingFee;
        merchandiseSubtotalEl.textContent = `₱${merchandiseSubtotal.toFixed(2)}`;
        shippingSubtotalEl.textContent = `₱${shippingFee.toFixed(2)}`;
        totalPaymentEl.textContent = `₱${totalPayment.toFixed(2)}`;
    };


    // --- PAYMENT MODAL LOGIC ---

    const populateDateDropdowns = () => {
        for (let i = 1; i <= 12; i++) {
            const month = i.toString().padStart(2, '0');
            expiryMonthSelect.add(new Option(month, month));
        }
        const currentYear = new Date().getFullYear();
        for (let i = 0; i <= 10; i++) {
            const year = currentYear + i;
            expiryYearSelect.add(new Option(year.toString().slice(-2), year));
        }
    };

    const updateCardDisplay = () => {
        cardNumberDisplay.textContent = cardNumberInput.value || '#### #### #### ####';
        cardHolderDisplay.textContent = cardHolderInput.value.toUpperCase() || 'FULL NAME';
        const month = expiryMonthSelect.value ? expiryMonthSelect.options[expiryMonthSelect.selectedIndex].text : 'MM';
        const year = expiryYearSelect.value ? expiryYearSelect.options[expiryYearSelect.selectedIndex].text : 'YY';
        cardExpiresDisplay.textContent = `${month}/${year}`;
    };

    cardNumberInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^\d]/g, '').replace(/(.{4})/g, '$1 ').trim();
        updateCardDisplay();
    });

    cardHolderInput.addEventListener('input', updateCardDisplay);
    expiryMonthSelect.addEventListener('change', updateCardDisplay);
    expiryYearSelect.addEventListener('change', updateCardDisplay);
    cvvInput.addEventListener('focus', () => cardFlipper.classList.add('is-flipped'));
    cvvInput.addEventListener('blur', () => cardFlipper.classList.remove('is-flipped'));

    bankCardRadio.addEventListener('change', () => {
        if (bankCardRadio.checked && !cardDetailsSaved) {
            $('#paymentModal').modal('show');
        }
    });

    $('#paymentModal').on('hidden.bs.modal', () => {
        if (!cardDetailsSaved) {
            codRadio.checked = true;
        }
    });

    savePaymentBtn.addEventListener('click', () => {
        if (paymentForm.checkValidity() === false) {
            alert('Please fill in all card details correctly.');
            paymentForm.classList.add('was-validated');
            return;
        }
        cardDetailsSaved = true;
        document.querySelector('label[for="bankCard"]').innerHTML = 'Bank Card <span class="text-success font-weight-bold">✔</span>';
        $('#paymentModal').modal('hide');
    });


    // --- ORDER PLACEMENT ---

    const handlePlaceOrder = async () => {
        if (bankCardRadio.checked && !cardDetailsSaved) {
            alert('Please add your bank card details before placing the order.');
            $('#paymentModal').modal('show');
            return;
        }
        placeOrderBtn.disabled = true;
        placeOrderBtn.textContent = 'Placing Order...';
        try {
            const response = await fetch(`${BACKEND_URL}/api/orders/place`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}`, 'X-User-ID': user.id.toString() }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to place order.');
            }
            alert('Order placed successfully!');
            window.location.href = 'customer_dashboard.html';
        } catch (error) {
            console.error('Error placing order:', error);
            alert(`Error: ${error.message}`);
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = 'Place Order';
        }
    };

    // --- INITIALIZATION ---
    placeOrderBtn.addEventListener('click', handlePlaceOrder);
    populateDateDropdowns();
    fetchCheckoutData(); // <-- This is now active and will run on page load.
});