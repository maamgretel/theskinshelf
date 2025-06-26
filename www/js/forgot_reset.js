document.addEventListener('DOMContentLoaded', () => {
  const forgotForm = document.getElementById('forgotForm');
  const resetForm = document.getElementById('resetForm');
  const alertBox = document.getElementById('alertBox');
  const spinner = document.getElementById('loadingSpinner');
  const BACKEND_URL = 'https://backend-rj0a.onrender.com';

  // 🔹 FORGOT PASSWORD FLOW
  if (forgotForm) {
    forgotForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const email = document.getElementById('email').value;

      alertBox.classList.add('d-none');
      spinner.classList.remove('d-none');

      const res = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      spinner.classList.add('d-none');
      const result = await res.json();
      alertBox.classList.remove('d-none', 'alert-danger', 'alert-success');

      if (res.ok) {
        alertBox.classList.add('alert-success');
        alertBox.textContent = result.message;
        localStorage.setItem('resetEmail', email);

        // Redirect to OTP page after 1 sec
        setTimeout(() => {
          window.location.href = 'verify_otp.html';
        }, 1000);
      } else {
        alertBox.classList.add('alert-danger');
        alertBox.textContent = result.error || 'Something went wrong.';
      }
    });
  }

  // 🔹 VERIFY OTP + RESET PASSWORD FLOW
  if (resetForm) {
    resetForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const email = localStorage.getItem('resetEmail');
      const otp = document.getElementById('otp').value;
      const newPassword = document.getElementById('newPassword').value;

      alertBox.classList.add('d-none');
      spinner.classList.remove('d-none');

      if (!email) {
        spinner.classList.add('d-none');
        alertBox.classList.remove('d-none');
        alertBox.classList.add('alert-danger');
        alertBox.textContent = 'Missing email. Please go back and request an OTP again.';
        return;
      }

      const res = await fetch(`${BACKEND_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, new_password: newPassword })
      });

      spinner.classList.add('d-none');
      const result = await res.json();
      alertBox.classList.remove('d-none', 'alert-danger', 'alert-success');

      if (res.ok) {
        alertBox.classList.add('alert-success');
        alertBox.textContent = result.message;
        localStorage.removeItem('resetEmail');
      } else {
        alertBox.classList.add('alert-danger');
        alertBox.textContent = result.error || 'OTP invalid or expired.';
      }
    });
  }
});
