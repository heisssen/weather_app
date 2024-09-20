const express = require('express');
const axios = require('axios');
const path = require('path');
const session = require('express-session');

const app = express();
const weatherApiKey = process.env.WEATHER_API_KEY || 'd359ea899420410d878144608242009';

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'weather-app-secret', resave: false, saveUninitialized: true }));

// Set up views
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

// Function to fetch forecast data, including air quality and alerts
const fetchForecastData = async (city, days = 3) => {
    try {
        const forecastUrl = `https://api.weatherapi.com/v1/forecast.json?key=${weatherApiKey}&q=${city}&days=${days}&aqi=yes&alerts=yes`;
        const response = await axios.get(forecastUrl);
        return response.data;
    } catch (error) {
        console.error('Error fetching weather data:', error.message);
        throw new Error('Could not fetch weather data.');
    }
};

// Function to fetch pressure data (placeholder for testing purposes)
const fetchPressureData = async (lat, lon) => {
    try {
        return Array(24).fill({ pressure: Math.floor(Math.random() * 20 + 1000) }); // Sample pressure data
    } catch (error) {
        console.error('Error fetching pressure data:', error.message);
        throw new Error('Could not fetch pressure data.');
    }
};

// Home route - index page
app.get('/', (req, res) => {
    if (!req.session.recentSearches) req.session.recentSearches = [];
    res.render('index', { recentSearches: req.session.recentSearches });
});

// Settings route - display settings page
app.get('/settings', (req, res) => {
    res.render('settings', {
        preferences: req.session.preferences || {
            showTemperature: true,
            showPressure: true,
            showWindSpeed: true,
            showHumidity: true,
            showUvIndex: true,
            showAirQuality: true,
            showAlerts: true
        }
    });
});

// Route to save display settings
app.post('/save-settings', (req, res) => {
    req.session.preferences = {
        showTemperature: !!req.body.showTemperature,
        showPressure: !!req.body.showPressure,
        showWindSpeed: !!req.body.showWindSpeed,
        showHumidity: !!req.body.showHumidity,
        showUvIndex: !!req.body.showUvIndex,
        showAirQuality: !!req.body.showAirQuality,
        showAlerts: !!req.body.showAlerts
    };
    res.redirect('/');
});

// Route to display weather forecast
app.get('/forecast', async (req, res) => {
    const city = req.query.city;
    const lat = req.query.lat;
    const lon = req.query.lon;
    let forecastData;

    try {
        if (lat && lon) {
            forecastData = await fetchForecastData(`${lat},${lon}`);
        } else if (city) {
            forecastData = await fetchForecastData(city);
        } else {
            throw new Error('City or location is required.');
        }

        const location = forecastData.location;
        const pressureData = await fetchPressureData(location.lat, location.lon);

        if (!req.session.recentSearches.includes(city)) {
            req.session.recentSearches.push(city);
            if (req.session.recentSearches.length > 5) req.session.recentSearches.shift();
        }

        res.render('forecast', {
            city: location.name,
            forecastData,
            pressureData,
            preferences: req.session.preferences || {
                showTemperature: true,
                showPressure: true,
                showWindSpeed: true,
                showHumidity: true
            }
        });
    } catch (error) {
        console.error('Error fetching forecast:', error.message);
        res.render('error', { message: 'Could not load weather data. Please try again later.' });
    }
});

// Route to display detailed weather information
app.get('/detailed/:dayIndex', async (req, res) => {
    const city = req.query.city;
    const dayIndex = req.params.dayIndex;
    let forecastData;

    try {
        if (!city) {
            throw new Error('City is required.');
        }

        forecastData = await fetchForecastData(city);
        const selectedDayWeather = forecastData.forecast.forecastday[dayIndex];
        const pressureData = await fetchPressureData(forecastData.location.lat, forecastData.location.lon);
        const airQuality = forecastData.current.air_quality.pm2_5;
        const weatherAlerts = forecastData.alerts.alert;

        const avgPressure = pressureData.reduce((sum, data) => sum + data.pressure, 0) / pressureData.length;

        res.render('detailed', {
            city,
            selectedDayWeather,
            hourlyWeather: selectedDayWeather.hour,
            pressureData,
            airQuality,
            avgPressure,
            weatherAlerts,
            preferences: req.session.preferences || {}
        });
    } catch (error) {
        console.error('Error fetching detailed weather:', error.message);
        res.render('error', { message: 'Could not load detailed weather data. Please try again later.' });
    }
});

// Error page route
app.get('/error', (req, res) => {
    res.render('error', { message: 'An unexpected error occurred. Please try again.' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
