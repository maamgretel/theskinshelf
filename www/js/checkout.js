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


    // --- PAYMENT MODAL LOGIC ---
    const populateDateDropdowns = () => {
        // Populate months (01-12)
        for (let i = 1; i <= 12; i++) {
            const month = i.toString().padStart(2, '0');
            expiryMonthSelect.add(new Option(month, month));
        }
        // Populate years (current year to +10 years)
        const currentYear = new Date().getFullYear();
        for (let i = 0; i <= 10; i++) {
            const year = currentYear + i;
            // Use the two-digit year for display text, but could use full year for value
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
        const label = document.querySelector('label[for="bankCard"]');
        label.innerHTML = 'Bank Card <span class="text-success font-weight-bold">✔</span>';
        $('#paymentModal').modal('hide');
    });

    // --- Other page functions (fetch data, render items, etc.) ---
    const fetchCheckoutData = async () => { /* ... */ };
    const handlePlaceOrder = async () => {
        if (bankCardRadio.checked && !cardDetailsSaved) {
            alert('Please add your bank card details before placing the order.');
            $('#paymentModal').modal('show');
            return;
        }
        // ... rest of the function is unchanged
    };
    
    // --- INITIALIZATION ---
    placeOrderBtn.addEventListener('click', handlePlaceOrder);
    populateDateDropdowns();
});