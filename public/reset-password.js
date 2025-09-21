document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('reset-password-form');
    const messageEl = document.getElementById('form-message');

    // Get the token from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        messageEl.textContent = 'Invalid or missing password reset token.';
        messageEl.className = 'form-message error';
        form.style.display = 'none'; // Hide form if no token
        return;
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) {
            messageEl.textContent = 'Passwords do not match.';
            messageEl.className = 'form-message error';
            return;
        }

        fetch('/api/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword }),
        })
        .then(res => res.json())
        .then(data => {
            messageEl.textContent = data.message;
            messageEl.className = data.success ? 'form-message success' : 'form-message error';
            if (data.success) {
                setTimeout(() => window.location.href = '/index.html', 3000);
            }
        });
    });
});