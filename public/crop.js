document.addEventListener('DOMContentLoaded', () => {
    // --- Navigation Indicator Logic ---
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

    // --- Logout Logic ---
    const logoutLink = document.getElementById('logout-link');

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

    // --- Form Logic ---
    const cropForm = document.getElementById('crop-form');
    const cropMessageEl = document.getElementById('crop-message');
    const aiFeedbackBox = document.getElementById('ai-feedback-box');
    const submitButton = cropForm.querySelector('button');

    cropForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            cropName: document.getElementById('crop-name').value,
            variety: document.getElementById('crop-variety').value,
            sowingDate: document.getElementById('sowing-date').value,
            harvestDate: document.getElementById('harvest-date').value,
            landArea: document.getElementById('land-area').value,
            soilType: document.getElementById('soil-type').value,
            irrigationMethod: document.getElementById('irrigation-method').value,
        };

        if (!formData.cropName || !formData.soilType) {
            cropMessageEl.textContent = 'Please fill in at least Crop Name and Soil Type.';
            cropMessageEl.className = 'form-message error';
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Getting Feedback...';
        cropMessageEl.textContent = 'Analyzing your crop plan...';
        cropMessageEl.className = 'form-message'; // Reset class
        aiFeedbackBox.innerHTML = ''; // Clear previous feedback

        try {
            const response = await fetch('/api/crop-feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    formData: formData,
                    language: localStorage.getItem('language') || 'en'
                })
            });
            const data = await response.json();

            if (data.success) {
                aiFeedbackBox.textContent = data.feedback; // Use textContent to prevent rendering markdown/html
                cropMessageEl.textContent = 'Feedback generated successfully!';
                cropMessageEl.className = 'form-message success';
            } else {
                cropMessageEl.textContent = data.message;
                cropMessageEl.className = 'form-message error';
            }
        } catch (error) {
            console.error('Error fetching AI feedback:', error);
            cropMessageEl.textContent = 'An error occurred while contacting the AI assistant.';
            cropMessageEl.className = 'form-message error';
        } finally {
            submitButton.disabled = false;
            setLanguage(localStorage.getItem('language')); // Re-apply translation to button
        }
    });
});