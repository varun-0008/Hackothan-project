document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.querySelector('.signup-form');

    signupForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent form from submitting

        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        const mobile = document.getElementById('mobile').value.trim();
        const confirmPassword = document.getElementById('confirm-password').value.trim();

        // Validation checks
        if (username === '' || email === '' || mobile === '' || password === '' || confirmPassword === '') {
            alert('Please fill in all fields.');
            return;
        }
 
        if (password !== confirmPassword) {
            alert('Passwords do not match. Please try again.');
            return;
        }

        // Send data to the backend
        fetch('/api/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, mobile, password }),
        })
        .then(res => res.json())
        .then(data => {
            alert(data.message); // Show message from server
            if (data.success) {
                window.location.href = '/index.html'; // Redirect to login on success
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        });
    });
});