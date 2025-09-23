document.addEventListener('DOMContentLoaded', () => {
    // --- Navigation Indicator Logic (copied from home.js for consistency) ---
    const navLinks = document.querySelectorAll('.nav-links .nav-item');
    const indicator = document.querySelector('.nav-indicator');
    const activeLink = document.querySelector('.nav-links .nav-item.active');

    function moveIndicator(element) {
        if (!element) return;
        // Vertical navigation logic
        indicator.style.height = `${element.offsetHeight}px`;
        indicator.style.top = `${element.offsetTop}px`;
    }

    // Set initial position to the active link
    moveIndicator(activeLink);

    navLinks.forEach(link => {
        link.addEventListener('mouseover', (e) => moveIndicator(e.currentTarget));
    });

    const nav = document.querySelector('.nav-links');
    nav.addEventListener('mouseleave', () => moveIndicator(activeLink));

    // --- Profile Page Specific Logic ---
    const usernameEl = document.getElementById('profile-username');
    const emailEl = document.getElementById('profile-email');
    const mobileEl = document.getElementById('profile-mobile');

    const passwordForm = document.getElementById('change-password-form');
    const passwordMessageEl = document.getElementById('password-message');
    const deleteBtn = document.getElementById('delete-account-btn');
    const logoutLink = document.getElementById('logout-link');

    // Fetch and display user profile data
    fetch('/api/user/profile')
        .then(res => {
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) window.location.href = '/index.html';
                return res.json().then(err => Promise.reject(err));
            }
            return res.json();
        })
        .then(data => {
            if (data.success) {
                usernameEl.textContent = data.user.username;
                emailEl.textContent = data.user.email;
                mobileEl.textContent = data.user.mobile || 'Not set'; // Handle null mobile numbers
            } else {
                alert('Could not load profile data: ' + data.message);
            }
        });

    // Handle password change
    passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;

        fetch('/api/user/password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword }),
        })
        .then(res => res.json())
        .then(data => {
            passwordMessageEl.textContent = data.message;
            passwordMessageEl.className = data.success ? 'form-message success' : 'form-message error';
            if (data.success) {
                passwordForm.reset();
            }
        });
    });

    // Handle account deletion
    deleteBtn.addEventListener('click', () => {
        if (confirm('Are you absolutely sure you want to delete your account? This action is irreversible.')) {
            fetch('/api/user/account', { method: 'DELETE' })
                .then(res => res.json())
                .then(data => {
                    alert(data.message);
                    if (data.success) {
                        window.location.href = '/index.html';
                    }
                });
        }
    });

    // Handle logout
    logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        fetch('/api/logout', { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    window.location.href = '/index.html';
                } else {
                    alert(data.message);
                }
            })
            .catch(err => console.error('Logout failed:', err));
    });
});