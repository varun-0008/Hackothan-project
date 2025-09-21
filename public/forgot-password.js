document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('forgot-password-form');
    const messageEl = document.getElementById('form-message');
    const submitButton = form.querySelector('button');

    // --- Initialize EmailJS with your Public Key ---
    emailjs.init('0D5wjgaHD29bSO_uq');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';

        try {
            const email = document.getElementById('email').value.trim();

            // Step 1: Ask our secure backend to generate a reset token
            const serverResponse = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            if (!serverResponse.ok) {
                throw new Error(`Server responded with status: ${serverResponse.status}`);
            }

            const serverData = await serverResponse.json();
            messageEl.textContent = serverData.message;
            messageEl.className = 'form-message success'; // Always show success

            // Step 2: If a token was generated, use EmailJS to send it
            if (serverData.success && serverData.token) {
                const resetLink = `http://localhost:3000/reset-password.html?token=${serverData.token}`;
                const templateParams = {
                    to_email: email, // This is sent to the user's email address
                    reset_link: resetLink,
                    reply_to: 'noreply@yourapp.com' // This sets the reply-to address
                };

                // Step 3: Send the email via EmailJS (this can still fail if template is misconfigured)
                await emailjs.send('service_9ej2kb6', 'template_jx2m5n7', templateParams);
                console.log('EmailJS SUCCESS!');
            }
        } catch (error) {
            console.error('An error occurred:', error);
            // Display a more specific error if it's from EmailJS
            const errorMessage = error.text ? `Could not send email. Error: ${error.text}` : 'An unexpected error occurred. Please try again.';
            messageEl.textContent = errorMessage;
            messageEl.className = 'form-message error';
        } finally {
            // This block will always run, whether there was an error or not
            submitButton.disabled = false;
            submitButton.textContent = 'Send Reset Link';
            form.reset();
        }
    });
});