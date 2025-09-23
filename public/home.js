document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-links .nav-item');
    const logoutLink = document.getElementById('logout-link');
    const indicator = document.querySelector('.nav-indicator');
    const activeLink = document.querySelector('.nav-links .nav-item.active');

    function moveIndicator(element) {
        if (!element) return;
        // This is the correct logic for the vertical side navbar.
        indicator.style.height = `${element.offsetHeight}px`;
        indicator.style.top = `${element.offsetTop}px`;
    }

    // Set initial position to the active link
    moveIndicator(activeLink);

    navLinks.forEach(link => {
        link.addEventListener('mouseover', (e) => moveIndicator(e.currentTarget));
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

    // --- Weather Widget Logic ---
    const weatherInfoEl = document.getElementById('weather-info');

    function getWeatherIcon(conditionCode) {
        // Mapping from weatherapi.com condition codes to Font Awesome icons
        const code = parseInt(conditionCode);
        if (code === 1000) return 'fa-sun'; // Clear
        if ([1003, 1006, 1009].includes(code)) return 'fa-cloud-sun'; // Partly cloudy, Cloudy, Overcast
        if ([1063, 1180, 1183, 1186, 1189, 1192, 1195].includes(code)) return 'fa-cloud-showers-heavy'; // Rain
        if ([1066, 1210, 1213, 1216, 1219, 1222, 1225].includes(code)) return 'fa-snowflake'; // Snow
        if ([1030, 1135, 1147].includes(code)) return 'fa-smog'; // Mist, Fog
        if ([1087, 1273, 1276].includes(code)) return 'fa-bolt'; // Thunder
        return 'fa-cloud'; // Default
    }

    function renderWeather(data) {
        if (!data || !data.current) {
            weatherInfoEl.innerHTML = '<p>Could not retrieve weather data.</p>';
            return;
        }
        const conditions = data.current;
        const temp = Math.round(conditions.temp_c);
        const description = conditions.condition.text;
        const iconClass = getWeatherIcon(conditions.condition.code);
        const feelsLike = Math.round(conditions.feelslike_c);
        const humidity = conditions.humidity;
        const windSpeed = Math.round(conditions.wind_kph);
        const windDir = conditions.wind_dir;

        weatherInfoEl.innerHTML = `
            <div class="weather-main">
                <i class="fas ${iconClass} weather-icon"></i>
                <p class="weather-temp">${temp}°C</p>
            </div>
            <p class="weather-desc">${description}</p>
            <div class="weather-details">
                <div class="weather-detail-item">
                    <i class="fas fa-temperature-half"></i>
                    <span>Feels like: ${feelsLike}°C</span>
                </div>
                <div class="weather-detail-item">
                    <i class="fas fa-tint"></i>
                    <span>Humidity: ${humidity}%</span>
                </div>
                <div class="weather-detail-item">
                    <i class="fas fa-wind"></i>
                    <span>Wind: ${windSpeed} km/h</span>
                </div>
                <div class="weather-detail-item">
                    <i class="fas fa-compass"></i>
                    <span>Direction: ${windDir}</span>
                </div>
            </div>
        `;
    }

    function fetchWeather() {
        if (!navigator.geolocation) {
            weatherInfoEl.innerHTML = '<p>Geolocation is not supported by your browser.</p>';
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                
                fetch(`/api/weather?lat=${latitude}&lon=${longitude}`)
                    .then(res => {
                        if (!res.ok) throw new Error('Weather data request failed');
                        return res.json();
                    })
                    .then(data => {
                        if (data.success) {
                            renderWeather(data.weather);
                        } else {
                            weatherInfoEl.innerHTML = `<p>Error: ${data.message}</p>`;
                        }
                    })
                    .catch(err => {
                        console.error('Error fetching weather:', err);
                        weatherInfoEl.innerHTML = '<p>Could not fetch weather data.</p>';
                    });
            },
            () => {
                weatherInfoEl.innerHTML = '<p>Unable to retrieve your location. Please allow location access.</p>';
            }
        );
    }

    fetchWeather();
});