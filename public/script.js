document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('.login-form');

    loginForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent the default form submission behavior.

        const loginIdentifier = document.getElementById('loginIdentifier').value.trim();
        const password = document.getElementById('password').value.trim();

        if (loginIdentifier === '' || password === '') {
            alert('Please fill in both username and password.');
            return; // Stop the function if validation fails
        }

        // Send data to the backend
        fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ loginIdentifier, password }),
        })
        .then(res => res.json())
        .then(data => {
            alert(data.message); // Show success or error message from the server
            if (data.success) {
                window.location.href = '/home.html'; // Redirect to the protected home page
            }
        })
        .catch(error => console.error('Error:', error));
    });
});