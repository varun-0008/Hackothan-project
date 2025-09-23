document.addEventListener('DOMContentLoaded', () => {
    // --- Navigation Indicator Logic ---
    const navLinks = document.querySelectorAll('.nav-links .nav-item');
    const indicator = document.querySelector('.nav-indicator');
    const activeLink = document.querySelector('.nav-links .nav-item.active');

    function moveIndicator(element) {
        if (!element) return;
        indicator.style.height = `${element.offsetHeight}px`;
        indicator.style.top = `${element.offsetTop}px`;
    }

    moveIndicator(activeLink);
    navLinks.forEach(link => link.addEventListener('mouseover', (e) => moveIndicator(e.currentTarget)));
    const nav = document.querySelector('.nav-links');
    nav.addEventListener('mouseleave', () => moveIndicator(activeLink));

    // --- Logout Logic ---
    const logoutLink = document.getElementById('logout-link');
    logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        fetch('/api/logout', { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.success) window.location.href = '/index.html';
                else alert(data.message);
            })
            .catch(err => console.error('Logout failed:', err));
    });

    // --- Chat Logic ---
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatWindow = document.getElementById('chat-window');
    const micBtn = document.getElementById('mic-btn');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-IN';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        micBtn.addEventListener('click', () => {
            recognition.start();
            micBtn.classList.add('listening');
        });

        recognition.addEventListener('result', (e) => {
            const transcript = e.results[0][0].transcript;
            chatInput.value = transcript;
        });

        recognition.addEventListener('speechend', () => {
            recognition.stop();
        });

        recognition.addEventListener('end', () => {
            micBtn.classList.remove('listening');
        });

        recognition.addEventListener('error', (e) => {
            console.error('Speech recognition error:', e.error);
            micBtn.classList.remove('listening');
        });
    } else {
        micBtn.style.display = 'none'; // Hide mic button if not supported
    }

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (message) {
            displayMessage(message, 'user');
            sendMessageToAI(message);
            chatInput.value = '';
        }
    });

    function displayMessage(message, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}-message`;
        const p = document.createElement('p');
        p.innerHTML = message.replace(/\n/g, '<br>');
        messageDiv.appendChild(p);
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    async function sendMessageToAI(message) {
        displayMessage('...', 'ai'); // Typing indicator

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    language: localStorage.getItem('language') || 'en'
                })
            });
            const data = await response.json();
            const typingIndicator = chatWindow.querySelector('.ai-message:last-child');

            if (data.success) {
                typingIndicator.querySelector('p').innerHTML = data.reply.replace(/\n/g, '<br>');
            } else {
                typingIndicator.querySelector('p').textContent = `Error: ${data.message}`;
            }
        } catch (error) {
            const typingIndicator = chatWindow.querySelector('.ai-message:last-child');
            if (typingIndicator) {
                typingIndicator.querySelector('p').textContent = 'Error: Could not connect to the AI assistant.';
            }
            console.error('Error sending message to AI:', error);
        }
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }
});