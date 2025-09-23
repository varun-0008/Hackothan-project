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

    // --- Market Data Fetching and Rendering ---
    const marketContainer = document.getElementById('market-data-container');
    const marketTitle = document.getElementById('market-location-title');

    function renderMarketData(marketData) {
        marketTitle.textContent = `Today's Market - ${marketData.location}`;
        
        // Clear loading message
        marketContainer.innerHTML = '';

        if (!marketData.data || marketData.data.length === 0) {
            marketContainer.innerHTML = '<p>No market data available for your location at this time.</p>';
            return;
        }

        // Create and append the table
        const table = document.createElement('table');
        table.className = 'market-table';
        
        const thead = `
            <thead>
                <tr>
                    <th>Commodity</th>
                    <th>Price (per Quintal)</th>
                </tr>
            </thead>
        `;
        
        const tableBody = marketData.data.map(item => `
            <tr>
                <td>${item.commodity}</td>
                <td>₹ ${item.price.toLocaleString('en-IN')}</td>
            </tr>
        `).join('');

        table.innerHTML = `${thead}<tbody>${tableBody}</tbody>`;
        marketContainer.appendChild(table);
    }

    function fetchMarketData() {
        if (!navigator.geolocation) {
            marketContainer.innerHTML = '<p>Geolocation is not supported by your browser.</p>';
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                marketContainer.innerHTML = '<p>Fetching local market prices...</p>';
                
                fetch(`/api/market-data?lat=${latitude}&lon=${longitude}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            renderMarketData(data.marketData);
                        } else {
                            marketContainer.innerHTML = `<p>Error: ${data.message}</p>`;
                        }
                    });
            },
            () => {
                marketContainer.innerHTML = '<p>Unable to retrieve your location. Please allow location access to see local market prices.</p>';
            }
        );
    }

    // Initial fetch
    fetchMarketData();
});