const cityInput = document.getElementById('city-input');
const suggestionsBox = document.getElementById('suggestions');

// Fetch city suggestions from Nominatim
async function getCitySuggestions(query) {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&addressdetails=1&limit=10`);
    const data = await response.json();
    return data.map(city => `${city.display_name}`);
}

// Display suggestions in the dropdown
function showSuggestions(suggestions) {
    suggestionsBox.innerHTML = '';
    if (suggestions.length === 0) {
        suggestionsBox.style.display = 'none';
        return;
    }
    suggestionsBox.style.display = 'block';
    suggestions.forEach(city => {
        const suggestionItem = document.createElement('div');
        suggestionItem.textContent = city;
        suggestionItem.addEventListener('click', () => {
            cityInput.value = city;
            suggestionsBox.innerHTML = '';
            suggestionsBox.style.display = 'none';
        });
        suggestionsBox.appendChild(suggestionItem);
    });
}

// Event listener for input changes
cityInput.addEventListener('input', async () => {
    const query = cityInput.value.trim();
    if (query.length >= 2) {
        const suggestions = await getCitySuggestions(query);
        showSuggestions(suggestions);
    } else {
        suggestionsBox.style.display = 'none';
    }
});
