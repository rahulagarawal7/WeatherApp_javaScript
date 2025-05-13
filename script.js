// API Key - Using OpenWeatherMap API
const API_KEY = '7f2594b404cc0841125d7ccf7f34fa94'; // Replace with your actual API key
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
const FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';

// DOM Elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const currentLocationBtn = document.getElementById('currentLocationBtn');
const recentCitiesDropdown = document.getElementById('recentCitiesDropdown');
const currentWeather = document.getElementById('currentWeather');
const forecastContainer = document.getElementById('forecastContainer');
const errorMessage = document.getElementById('errorMessage');

// Recent cities array (loaded from localStorage)
let recentCities = JSON.parse(localStorage.getItem('recentCities')) || [];

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Load recent cities if any
    updateRecentCitiesDropdown();
    
    // Event listeners
    searchBtn.addEventListener('click', handleSearch);
    currentLocationBtn.addEventListener('click', handleCurrentLocation);
    cityInput.addEventListener('focus', showRecentCitiesDropdown);
    cityInput.addEventListener('blur', () => {
        setTimeout(() => recentCitiesDropdown.classList.add('hidden'), 200);
    });
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
});

// Handle city search
function handleSearch() {
    const city = cityInput.value.trim();
    
    if (!city) {
        showError('Please enter a city name');
        return;
    }
    
    fetchWeather(city);
}

// Handle current location
function handleCurrentLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            fetchWeatherByCoords(latitude, longitude);
        },
        (error) => {
            showError('Unable to retrieve your location');
            console.error(error);
        }
    );
}

// Fetch weather by city name
function fetchWeather(city) {
    const url = `${BASE_URL}?q=${city}&units=metric&appid=${API_KEY}`;
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('City not found');
            }
            return response.json();
        })
        .then(data => {
            updateRecentCities(city);
            displayCurrentWeather(data);
            fetchForecast(data.coord.lat, data.coord.lon);
            hideError();
        })
        .catch(error => {
            showError(error.message);
            console.error('Error fetching weather:', error);
        });
}

// Fetch weather by coordinates
function fetchWeatherByCoords(lat, lon) {
    const url = `${BASE_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Location not found');
            }
            return response.json();
        })
        .then(data => {
            updateRecentCities(data.name);
            displayCurrentWeather(data);
            fetchForecast(lat, lon);
            hideError();
        })
        .catch(error => {
            showError(error.message);
            console.error('Error fetching weather:', error);
        });
}

// Fetch 5-day forecast
function fetchForecast(lat, lon) {
    const url = `${FORECAST_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Forecast not available');
            }
            return response.json();
        })
        .then(data => {
            displayForecast(data);
        })
        .catch(error => {
            console.error('Error fetching forecast:', error);
        });
}

// Display current weather
function displayCurrentWeather(data) {
    const { name, dt, weather, main, wind } = data;
    
    // Format date
    const date = new Date(dt * 1000);
    const formattedDate = date.toISOString().split('T')[0];
    
    // Update DOM
    document.getElementById('locationName').textContent = name;
    document.getElementById('currentDate').textContent = `(${formattedDate})`;
    document.getElementById('temperature').textContent = `${main.temp.toFixed(1)}°C`;
    document.getElementById('weatherDescription').textContent = weather[0].description;
    document.getElementById('windSpeed').textContent = `Wind: ${wind.speed.toFixed(2)} M/S`;
    document.getElementById('humidity').textContent = `Humidity: ${main.humidity}%`;
    
    // Set weather icon
    const icon = getWeatherIcon(weather[0].icon);
    document.getElementById('weatherIcon').innerHTML = icon;
    
    // Show current weather section
    currentWeather.classList.remove('hidden');
}

// Display 5-day forecast
function displayForecast(data) {
    const forecastContainer = document.getElementById('forecastContainer');
    const forecastCardsContainer = forecastContainer.querySelector('div');
    
    // Clear previous forecast
    forecastCardsContainer.innerHTML = '';
    
    // Group forecast by day (API returns data every 3 hours)
    const dailyForecasts = {};
    data.list.forEach(item => {
        const date = item.dt_txt.split(' ')[0];
        if (!dailyForecasts[date]) {
            dailyForecasts[date] = item;
        }
    });
    
    // Get next 5 days (skip today)
    const forecastDates = Object.keys(dailyForecasts).slice(1, 6);
    
    // Create forecast cards
    forecastDates.forEach(date => {
        const forecast = dailyForecasts[date];
        const { weather, main, wind } = forecast;
        
        const card = document.createElement('div');
        card.className = 'bg-white rounded-lg shadow-md p-4 text-center';
        card.innerHTML = `
            <div class="font-semibold text-blue-800 mb-2">(${date})</div>
            <div class="text-4xl mb-2">${getWeatherIcon(weather[0].icon)}</div>
            <div class="text-xl font-bold mb-1">${main.temp.toFixed(1)}°C</div>
            <div class="text-gray-600 mb-1">Wind: ${wind.speed.toFixed(2)} M/S</div>
            <div class="text-gray-600">Humidity: ${main.humidity}%</div>
        `;
        
        forecastCardsContainer.appendChild(card);
    });
    
    // Show forecast container
    forecastContainer.classList.remove('hidden');
}

// Update recent cities list
function updateRecentCities(city) {
    // Add city to recent cities if not already there
    if (!recentCities.includes(city)) {
        recentCities.unshift(city);
        // Keep only the last 5 cities
        if (recentCities.length > 5) {
            recentCities.pop();
        }
        // Save to localStorage
        localStorage.setItem('recentCities', JSON.stringify(recentCities));
        // Update dropdown
        updateRecentCitiesDropdown();
    }
}

// Update recent cities dropdown
function updateRecentCitiesDropdown() {
    recentCitiesDropdown.innerHTML = '';
    
    if (recentCities.length === 0) {
        recentCitiesDropdown.classList.add('hidden');
        return;
    }
    
    recentCities.forEach(city => {
        const item = document.createElement('div');
        item.className = 'px-4 py-2 hover:bg-gray-100 cursor-pointer';
        item.textContent = city;
        item.addEventListener('click', () => {
            cityInput.value = city;
            fetchWeather(city);
            recentCitiesDropdown.classList.add('hidden');
        });
        recentCitiesDropdown.appendChild(item);
    });
}

// Show recent cities dropdown
function showRecentCitiesDropdown() {
    if (recentCities.length > 0) {
        recentCitiesDropdown.classList.remove('hidden');
    }
}

// Get weather icon based on OpenWeatherMap icon code
function getWeatherIcon(iconCode) {
    const iconMap = {
        '01d': 'fas fa-sun text-yellow-500',
        '01n': 'fas fa-moon text-gray-400',
        '02d': 'fas fa-cloud-sun text-yellow-300',
        '02n': 'fas fa-cloud-moon text-gray-300',
        '03d': 'fas fa-cloud text-gray-400',
        '03n': 'fas fa-cloud text-gray-400',
        '04d': 'fas fa-cloud text-gray-500',
        '04n': 'fas fa-cloud text-gray-500',
        '09d': 'fas fa-cloud-rain text-blue-400',
        '09n': 'fas fa-cloud-rain text-blue-400',
        '10d': 'fas fa-cloud-sun-rain text-blue-400',
        '10n': 'fas fa-cloud-moon-rain text-blue-400',
        '11d': 'fas fa-bolt text-yellow-500',
        '11n': 'fas fa-bolt text-yellow-500',
        '13d': 'fas fa-snowflake text-blue-200',
        '13n': 'fas fa-snowflake text-blue-200',
        '50d': 'fas fa-smog text-gray-400',
        '50n': 'fas fa-smog text-gray-400'
    };
    
    return `<i class="${iconMap[iconCode] || 'fas fa-question'}"></i>`;
}

// Show error message
function showError(message) {
    errorMessage.classList.remove('hidden');
    document.getElementById('errorText').textContent = message;
}

// Hide error message
function hideError() {
    errorMessage.classList.add('hidden');
}