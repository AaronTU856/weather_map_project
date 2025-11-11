# Reflection — Weather Map Project

This document answers the reflection questions requested in the assignment.

## 1) Architecture (data flow)

User action flow when clicking a marker:

- Frontend (Browser / Leaflet)
  - The user clicks a marker on the Leaflet map. The marker has metadata (`marker.cityData`) with coordinates and the city id.
  - The marker's click handler calls the frontend function `fetchWeatherData(cityId, marker)`.

- Backend (Django)
  - The frontend sends an HTTP GET request to the Django endpoint `/api/weather/<city_id>/` (view: `weathermap.views.get_weather`).
  - The Django view looks up the city in the database (model: `weathermap.models.City`) and then calls the OpenWeatherMap API using the server-side `requests` library. The request includes the server's API key (from `.env` via `python-decouple`).
  - Django returns a JSON response with the weather data (temperature, feels_like, humidity, pressure, wind speed, description and icon id).

- Frontend
  - The browser receives the JSON and the frontend renders a popup on the marker with the weather details. The frontend also caches the response in `marker.weatherCache` for the session to avoid repeated requests while the page is open.

Components involved: Browser (Leaflet + JS), Django views/URLs, City model, OpenWeatherMap external API.

## 2) Security

Implemented measures:

- API key is stored in `.env` and read by Django's `settings.py` using `python-decouple`. The key is not embedded into client-side JS.
- `.env` is listed in `.gitignore` so API keys aren't committed.
- Backend acts as a proxy for OpenWeatherMap requests which avoids exposing the API key to users.

Additional recommended measures:

- Rate limiting on the weather endpoint to avoid abuse.
- Server-side caching of weather responses (Redis or in-memory TTL cache) to reduce API calls and protect the key from overuse.
- Use HTTPS in production and set `USE_HTTPS=True` and proper ALLOWED_HOSTS.
- Add logging and alerting for suspicious request patterns.
- Secure admin and database credentials and follow least-privilege principles for deployed environments.

## 3) Performance

Potential bottlenecks:

- Loading and rendering many markers (DOM/Leaflet overhead) — Leaflet performance drops with thousands of markers.
- Many repeated API calls to OpenWeatherMap if users click many different markers frequently.
- Slow response from OpenWeatherMap could delay popups and block perceived UI responsiveness.

Optimizations for 1000+ cities:

- Use marker clustering (Leaflet.markercluster) to group markers and only render details for clusters when zoomed in.
- Server-side caching of weather responses with TTL (e.g., cache each city's weather for 5–10 minutes) to avoid repeated API calls and speed up responses.
- Paginate or lazily load cities if the dataset is extremely large, or use vector tiles / server-side rendered tiles.
- Use background jobs to pre-fetch and store weather snapshots in a DB for commonly viewed cities.
- Debounce and batch UI operations; use WebWorkers if heavy client-side processing is required.

## 4) Error Handling

Points where errors can occur:

- Database lookup: City may not exist (handled by returning 404 in the view)
- Network errors: failures when calling OpenWeatherMap (handled by try/except in the view and returning 500 with explanatory message)
- Unexpected API response shape (KeyError) — view catches KeyError and returns 500
- Frontend fetch errors/timeouts — frontend catches exceptions and displays friendly error popups and hides loading spinner
- Missing or invalid API key — the view will receive an error from OpenWeatherMap and return an error to the frontend

Improvements:

- Add more graceful fallback UI on the frontend (retry with exponential backoff, or show cached/stale data if available)
- Provide clearer UI messages for rate limit errors vs network problems vs invalid key
- Centralize logging (Sentry, similar) for backend and frontend errors to detect issues in production

## 5) Scalability (user accounts, favorites, history)

If we add user accounts and persistent favorites:

- Add Django `User` model (or use `AUTH_USER_MODEL`) and create a `FavoriteCity` model linking User -> City (ManyToMany or separate model with timestamps).
- Create endpoints to list/add/remove favorites; secure them behind authentication (session-based or token-based API).
- For historical weather storage, create a `WeatherSnapshot` model that stores city, timestamp, temperature, and relevant fields. Use a background worker (Celery + Redis) to poll OpenWeatherMap for a set of cities at regular intervals and store snapshots.
- To serve many users, move DB to PostgreSQL, add read replicas if necessary, and use caching layers (Redis) for frequently requested endpoints.
- Use CDN and optimized static asset pipeline for frontend files.

---

Notes: The frontend intentionally caches weather per marker during the page session to reduce duplicate calls. For production, a short server-side cache with explicit TTL and cache invalidation is preferred.
