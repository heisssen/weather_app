const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const weatherApiKey = process.env.WEATHER_API_KEY || 'd359ea899420410d878144608242009';

// Set the views directory explicitly using path.join
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Helper function to fetch forecast data for a city from WeatherAPI
const fetchForecastData = async (city, days = 3) => {
    const forecastUrl = `https://api.weatherapi.com/v1/forecast.json?key=${weatherApiKey}&q=${city}&days=${days}`;
    const response = await axios.get(forecastUrl);
    return response.data;
};

// Helper function to fetch pressure data from Met.no using latitude and longitude
const fetchPressureData = async (lat, lon) => {
    const metnoUrl = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;
    const response = await axios.get(metnoUrl, {
        headers: {
            'User-Agent': 'WeatherApp/1.0 (your-email@example.com)' // Met.no requires a User-Agent header
        }
    });
    const timeseries = response.data.properties.timeseries;
    const pressureData = timeseries.map(entry => ({
        time: entry.time,
        pressure: entry.data.instant.details.air_pressure_at_sea_level
    }));
    return pressureData;
};

// Error handling helper function
const handleError = (res, error) => {
    console.error('Error:', error.response ? error.response.data : error.message);
    res.render('error', { message: 'Error fetching data. Please try again.' });
};

// Store recent searches in memory
let recentSearches = [];

// Home route
app.get('/', (req, res) => {
    res.render('index', { recentSearches });
});

// Fetch forecast route (with Met.no pressure data)
app.get('/forecast', async (req, res) => {
    let city = req.query.city;
    const days = 3; // Limit to 3-day forecast

    if (!city) return res.redirect('/');

    try {
        // Fetch forecast data from WeatherAPI
        const forecastData = await fetchForecastData(city, days);
        const location = forecastData.location;

        // Fetch pressure data from Met.no using lat/lon
        const pressureData = await fetchPressureData(location.lat, location.lon);

        // Store recent searches (limit to 5)
        if (!recentSearches.includes(city)) {
            if (recentSearches.length >= 5) {
                recentSearches.shift(); // Remove the oldest search
            }
            recentSearches.push(city);
        }

        res.render('forecast', { city, forecastData, pressureData });
    } catch (error) {
        handleError(res, error);
    }
});

// Fetch detailed weather route for a specific day
app.get('/detailed/:dayIndex', async (req, res) => {
    const city = req.query.city;
    const dayIndex = req.params.dayIndex;

    if (!city || !dayIndex) return res.render('error', { message: 'Invalid request.' });

    try {
        const forecastData = await fetchForecastData(city);
        const location = forecastData.location;

        const selectedDayWeather = forecastData.forecast.forecastday[dayIndex];
        const hourlyWeather = selectedDayWeather.hour; // Extract hourly weather data

        // Fetch pressure data from Met.no
        const pressureData = await fetchPressureData(location.lat, location.lon);

        // Calculate the average pressure for the day
        const dailyPressure = pressureData.slice(dayIndex * 24, (dayIndex + 1) * 24); // 24-hour slice for the selected day
        const avgPressure = dailyPressure.reduce((sum, data) => sum + data.pressure, 0) / dailyPressure.length;

        res.render('detailed', { city, selectedDayWeather, hourlyWeather, pressureData, avgPressure });
    } catch (error) {
        handleError(res, error);
    }
});

// Error handling page
app.get('/error', (req, res) => {
    res.render('error', { message: 'An error occurred.' });
});

// Start server
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
