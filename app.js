// Import required packages
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const port = 3000;

// OpenWeather API key (replace with your actual key)
const API_KEY = 'd782c9950fa15d52bc08574a17b5cb07';

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files (CSS)
app.use(express.static(path.join(__dirname, 'public')));

// Home route to render the weather form
app.get('/', (req, res) => {
    res.render('index', { weatherData: null, error: null });
});

// Handle weather form submission to fetch current weather data
app.get('/weather', async (req, res) => {
    const city = req.query.city;

    if (!city) {
        return res.render('index', { weatherData: null, error: 'Please provide a city name!' });
    }

    try {
        // Fetch current weather data from OpenWeather
        const url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`;
        const response = await axios.get(url);

        if (response.data.cod !== 200) {
            return res.render('index', { weatherData: null, error: 'City not found. Please try again.' });
        }

        const weather = response.data;

        // Prepare data for rendering
        const weatherData = {
            city: weather.name,
            country: weather.sys.country,
            temp: weather.main.temp,
            description: weather.weather[0].description,
            humidity: weather.main.humidity,
            windSpeed: weather.wind.speed,
        };

        res.render('index', { weatherData, error: null });
    } catch (error) {
        // Handle errors and display appropriate messages
        if (error.response) {
            if (error.response.status === 404) {
                return res.render('index', { weatherData: null, error: 'City not found. Please try again.' });
            } else if (error.response.status === 401) {
                return res.render('index', { weatherData: null, error: 'Invalid API key. Please check your API key.' });
            } else if (error.response.status === 429) {
                return res.render('index', { weatherData: null, error: 'API rate limit exceeded. Try again later.' });
            } else {
                return res.render('index', { weatherData: null, error: `Error: ${error.response.data.message}` });
            }
        } else {
            return res.render('index', { weatherData: null, error: 'Unable to fetch data. Please try again later.' });
        }
    }
});

// Start the Express server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
