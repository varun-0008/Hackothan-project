document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-links .nav-item');
    const logoutLink = document.getElementById('logout-link');
    const indicator = document.querySelector('.nav-indicator');
    const activeLink = document.querySelector('.nav-links .nav-item.active');

    function moveIndicator(element) {
        if (!element) return;
        indicator.style.width = `${element.offsetWidth}px`;
        indicator.style.left = `${element.offsetLeft}px`;
    }

    // Set initial position to the active link
    moveIndicator(activeLink);

    navLinks.forEach(link => {
        link.addEventListener('mouseover', (e) => {
            moveIndicator(e.currentTarget);
        });
    });

    // When mouse leaves the entire nav, return to the active link
    const nav = document.querySelector('.nav-links');
    nav.addEventListener('mouseleave', () => {
        moveIndicator(activeLink);
    });

    // Logout functionality
    logoutLink.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent navigating to '#'
        fetch('/api/logout', { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    window.location.href = '/index.html'; // Redirect to login page
                } else {
                    alert(data.message);
                }
            })
            .catch(err => console.error('Logout failed:', err));
    });
});