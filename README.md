# 🌦️ Weather Map Project

A Django web app that displays real-time weather information for selected cities on an interactive map. Cities are shown as markers; clicking a marker fetches current weather from the OpenWeatherMap API and displays it in a styled popup. The map includes a searchable city list and a temperature unit toggle (Celsius / Fahrenheit).

## Project Overview

This project demonstrates a small full-stack mapping application built with Django (backend) and Leaflet (frontend). The backend exposes a small API to list cities and to fetch weather for a given city; the frontend displays them on a Leaflet map and provides search and unit toggle features.

## Features

- Interactive Leaflet map with city markers
- Click a marker to fetch and display current weather (temperature, feels like, humidity, wind, pressure, description)
- Search box with suggestions: type a city and jump to it (map zooms and opens popup)
- Temperature unit toggle (Celsius / Fahrenheit) persisted in localStorage
- Robust frontend error handling with friendly messages
 - Marker clustering (Leaflet.markercluster) enabled to improve performance with many markers

## Technologies Used

- Django 5.x
- Leaflet.js
- OpenWeatherMap API
- Vanilla JavaScript, HTML, CSS
- SQLite (default development DB)

## Setup Instructions

1. Clone the repository

```bash
git clone https://github.com/AaronTU856/weather_map_project.git
cd weather_map_project
```

2. Create a virtual environment and install dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

3. Create a `.env` file in the project root with these variables (example):

```
SECRET_KEY=your_django_secret_key_here
OPENWEATHERMAP_API_KEY=your_openweathermap_api_key_here
ENVIRONMENT=development
USE_HTTPS=False
```

4. Run migrations and populate example cities

```bash
python manage.py migrate
python manage.py populate_cities
```

5. Run the development server

```bash
python manage.py runserver
```

6. Open `http://127.0.0.1:8000/` in your browser.

## API Keys

This app uses OpenWeatherMap. Create an account at https://openweathermap.org/ and get an API key. Put it in the `.env` file as `OPENWEATHERMAP_API_KEY`. The Django settings read this via `python-decouple` so the key is not hardcoded into source control.

## Challenges Faced

- Intermittent API failures — solved by catching request exceptions, displaying friendly error popups, and providing a small mock indicator when needed.
- UI placement for search suggestions — fixed by adding a suggestions container in the header and CSS to position it above the map.

## Future Improvements

- Add Leaflet marker clustering for large numbers of cities
- Server-side caching of weather responses to reduce API usage
- User accounts and saved favorites
- Historical weather storage and plots

## How to verify

- Ensure `populate_cities` has been run. Visit the homepage, use the search box to find a city, press Enter or click a suggestion to zoom. Click a marker to fetch weather. Toggle unit with the button in the header.

## Notes

- Keep `.env` out of source control (already in `.gitignore`).
- If the map or the weather icons don't show, check browser console for errors and that Leaflet CDN resources are reachable.
