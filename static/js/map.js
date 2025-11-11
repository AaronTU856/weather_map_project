// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("🗺️ Initializing weather map...");
  console.log("🔍 Leaflet available:", typeof L !== "undefined");
  console.log(
    "🔍 Map element exists:",
    document.getElementById("map") !== null,
  );

  // Check if Leaflet is loaded
  if (typeof L === "undefined") {
    console.error("❌ Leaflet library not loaded!");
    alert(
      "Error: Leaflet mapping library not loaded. Please check your internet connection.",
    );
    return;
  }

  // Check if map container exists
  const mapElement = document.getElementById("map");
  if (!mapElement) {
    console.error("❌ Map container element not found!");
    alert("Error: Map container not found in the page.");
    return;
  }

  // Initialize map centered on Europe
  const map = L.map("map").setView([48.8566, 2.3522], 3);
  console.log("✅ Map container initialized");

  // Add OpenStreetMap tiles
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(map);
  console.log("✅ Map tiles added");

  // Marker clustering (improves performance when many markers are present)
  let markerClusterGroup;
  try {
    markerClusterGroup = L.markerClusterGroup();
    map.addLayer(markerClusterGroup);
    console.log("✅ MarkerClusterGroup added to map");
  } catch (err) {
    console.warn("⚠️ MarkerCluster plugin not available, falling back to direct markers", err);
    markerClusterGroup = null;
  }

  // Store markers for reference
  const markers = {};
  // Store basic city list for search
  let citiesList = [];
  // Temperature unit preference: 'C' or 'F'
  let tempUnit = localStorage.getItem("tempUnit") || "C";

  // Custom icon for city markers
  const cityIcon = L.divIcon({
    className: "custom-div-icon",
    html: `<div style="
            background-color: #667eea; 
            width: 30px; 
            height: 30px; 
            border-radius: 50%; 
            border: 3px solid white; 
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: all 0.3s ease;
        "></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  // Fetch and display cities
  async function loadCities() {
    console.log("📍 Loading cities...");
    console.log("🌐 Fetching from URL:", "api/cities/");

    try {
      const response = await fetch("api/cities/");
      console.log("📡 Response status:", response.status);
      console.log("📡 Response headers:", response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Response error:", errorText);
        throw new Error(
          `Failed to fetch cities: ${response.status} - ${errorText}`,
        );
      }

  const cities = await response.json();
      console.log(`✅ Loaded ${cities.length} cities:`, cities);

      if (cities.length === 0) {
        console.warn(
          "⚠️ No cities found in database. Please run: python manage.py populate_cities",
        );
        alert("No cities found! Please run the populate_cities command first.");
        return;
      }

      console.log("🎯 Starting to add markers for each city...");
      // Save for search and create markers
      citiesList = cities.map((c) => ({
        id: c.id,
        name: c.name,
        country: c.country,
        latitude: c.latitude,
        longitude: c.longitude,
      }));

      citiesList.forEach((city, index) => {
        console.log(`🔄 Processing city ${index + 1}/${citiesList.length}:`, city);
        addCityMarker(city);
      });

      console.log("✅ All city markers added to map");
      console.log(`📊 Total markers created: ${Object.keys(markers).length}`);
    } catch (error) {
      console.error("❌ Error loading cities:", error);
      console.error("❌ Error details:", error.message);
      console.error("❌ Error stack:", error.stack);

      // Show user-friendly error message
      const errorMsg = `Failed to load cities: ${error.message}`;
      alert(errorMsg);

      // Also display error on map
      const errorPopup = L.popup()
        .setLatLng([48.8566, 2.3522])
        .setContent(
          `<div style="color: red; font-weight: bold;">Error: ${error.message}</div>`,
        )
        .openOn(map);
    }
  }

  // Add a marker for a city
  function addCityMarker(city) {
    console.log(`📍 Adding marker for ${city.name}, ${city.country}`);
    console.log(`📍 Coordinates: lat=${city.latitude}, lon=${city.longitude}`);
    console.log(`📍 City object:`, city);

    try {
      const marker = L.marker([city.latitude, city.longitude], {
        icon: cityIcon,
        title: `${city.name}, ${city.country}`,
      });
      // Add marker to cluster group if available, otherwise add directly to map
      if (markerClusterGroup) markerClusterGroup.addLayer(marker);
      else marker.addTo(map);

      // Attach city metadata and a small weather cache
      marker.cityData = {
        id: city.id,
        name: city.name,
        country: city.country,
        latitude: city.latitude,
        longitude: city.longitude,
      };
      marker.weatherCache = null; // will store last fetched weather data (metric)

      // Show loading popup on click and fetch weather (if not cached)
      marker.on("click", () => {
        console.log(`🖱️ Clicked on ${city.name}`);
        // If cached, display immediately, otherwise fetch
        if (marker.weatherCache) {
          displayWeatherPopup(marker.weatherCache, marker);
        } else {
          fetchWeatherData(city.id, marker);
        }
      });

      // Store marker reference
      markers[city.id] = marker;
      console.log(
        `✅ Marker added for ${city.name} at [${city.latitude}, ${city.longitude}]`,
      );
    } catch (error) {
      console.error(`❌ Error creating marker for ${city.name}:`, error);
    }
  }

  // Fetch weather data for a city
  async function fetchWeatherData(cityId, marker) {
    console.log(`🌤️ Fetching weather for city ID: ${cityId}`);
    console.log(
      "🌐 Weather URL:",
      `api/weather/${cityId}/`,
    );
    showLoading();

    try {
      const response = await fetch(
        `/api/weather/${cityId}/`,
      );
      console.log("📡 Weather response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Weather response error:", errorText);
        throw new Error(
          `Failed to fetch weather data: ${response.status} - ${errorText}`,
        );
      }

  const data = await response.json();
  console.log("✅ Weather data received:", data);
  // Cache metric data on marker for future unit toggles
  marker.weatherCache = Object.assign({}, data, { cached_at: Date.now() });
  displayWeatherPopup(marker.weatherCache, marker);
    } catch (error) {
      console.error("❌ Error fetching weather:", error);
      displayErrorPopup(marker, error.message);
    } finally {
      hideLoading();
    }
  }

  // Display weather information in popup
  function displayWeatherPopup(data, marker) {
    const iconUrl = `https://openweathermap.org/img/wn/${data.icon}@2x.png`;

    // Add indicator for mock data
    const dataSourceIndicator = data.mock_data
      ? `<div style="background: #ffeaa7; padding: 4px 8px; border-radius: 4px; margin-bottom: 8px; font-size: 12px;">
                📡 ${data.error_reason || "Using simulated data (API unavailable)"}
               </div>`
      : `<div style="background: #00b894; color: white; padding: 4px 8px; border-radius: 4px; margin-bottom: 8px; font-size: 12px;">
                🌐 Live weather data
               </div>`;

  // Helper to format temperature according to unit
  function formatTemp(tempC) {
    if (tempUnit === "C") return `${tempC.toFixed(1)}°C`;
    const f = (tempC * 9) / 5 + 32;
    return `${f.toFixed(1)}°F`;
  }

  const popupContent = `
            <div class="weather-popup">
                <h3>${data.city}, ${data.country}</h3>

                ${dataSourceIndicator}

                <div class="weather-icon-container">
                    <img src="${iconUrl}" alt="${data.description}" ${data.mock_data ? 'style="opacity: 0.8;"' : ""}>
                    <div class="weather-description">${data.description}</div>
                </div>

                <div class="weather-info">
                    <div class="weather-item">
                        <div>
                            <strong>🌡️ Temperature</strong>
              <span>${formatTemp(data.temperature)}</span>
                        </div>
                    </div>

                    <div class="weather-item">
                        <div>
                            <strong>🤔 Feels Like</strong>
              <span>${formatTemp(data.feels_like)}</span>
                        </div>
                    </div>

                    <div class="weather-item">
                        <div>
                            <strong>💧 Humidity</strong>
                            <span>${data.humidity}%</span>
                        </div>
                    </div>

                    <div class="weather-item">
                        <div>
                            <strong>🌪️ Wind Speed</strong>
                            <span>${data.wind_speed} m/s</span>
                        </div>
                    </div>

                    <div class="weather-item">
                        <div>
                            <strong>🔽 Pressure</strong>
                            <span>${data.pressure} hPa</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

    marker
      .bindPopup(popupContent, {
        maxWidth: 320,
        className: "weather-popup-container",
      })
      .openPopup();

    console.log(
      `✅ Weather popup displayed for ${data.city} (${data.mock_data ? "mock" : "real"} data)`,
    );
  }

  // Display error message in popup
  function displayErrorPopup(marker, errorMessage = "Unknown error") {
    const errorContent = `
            <div class="weather-popup">
                <h3>❌ Error</h3>
                <div class="error-message">
                    Unable to fetch weather data: ${errorMessage}
                    <br><br>
                    Please try again later.
                </div>
            </div>
        `;

    marker.bindPopup(errorContent).openPopup();
    console.log("❌ Error popup displayed");
  }

  // Show loading overlay
  function showLoading() {
    const loadingEl = document.getElementById("loading");
    if (loadingEl) {
      loadingEl.classList.add("active");
      console.log("⏳ Loading overlay shown");
    }
  }

  // Hide loading overlay
  function hideLoading() {
    const loadingEl = document.getElementById("loading");
    if (loadingEl) {
      loadingEl.classList.remove("active");
      console.log("✅ Loading overlay hidden");
    }
  }

  // Initialize the application
  console.log("🚀 Starting weather map application...");
  loadCities();

  // --- Search UI & behavior ---
  const searchInput = document.getElementById("city-search");
  const suggestionsEl = document.getElementById("search-suggestions");
  const unitToggle = document.getElementById("unit-toggle");

  // Set initial unit button state
  function applyUnitToButton() {
    if (!unitToggle) return;
    unitToggle.textContent = tempUnit === "C" ? "°C" : "°F";
    unitToggle.setAttribute("aria-pressed", tempUnit === "F" ? "true" : "false");
  }
  applyUnitToButton();

  // Debounce helper
  function debounce(fn, delay = 250) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // Render suggestions under input
  function renderSuggestions(matches) {
    if (!suggestionsEl) return;
    suggestionsEl.innerHTML = "";
    if (!matches || matches.length === 0) {
      suggestionsEl.classList.remove("visible");
      return;
    }
    matches.slice(0, 6).forEach((m) => {
      const li = document.createElement("li");
      li.textContent = `${m.name}, ${m.country}`;
      li.setAttribute("role", "option");
      li.addEventListener("click", () => {
        // center map and open popup
        const marker = markers[m.id];
        if (marker) {
          map.setView([m.latitude, m.longitude], 10);
          // trigger click programmatically to open popup / fetch
          marker.fire("click");
        }
        suggestionsEl.classList.remove("visible");
      });
      suggestionsEl.appendChild(li);
    });
    suggestionsEl.classList.add("visible");
  }

  // Filter cities and show suggestions
  const onSearchInput = debounce((ev) => {
    const q = (ev.target.value || "").trim().toLowerCase();
    if (q.length === 0) {
      renderSuggestions([]);
      return;
    }
    const matches = citiesList.filter((c) => c.name.toLowerCase().includes(q));
    renderSuggestions(matches);
  }, 180);

  if (searchInput) {
    searchInput.addEventListener("input", onSearchInput);
    searchInput.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        const q = (ev.target.value || "").trim().toLowerCase();
        if (!q) return;
        const exact = citiesList.find((c) => c.name.toLowerCase() === q);
        const first = exact || citiesList.find((c) => c.name.toLowerCase().includes(q));
        if (first) {
          const marker = markers[first.id];
          if (marker) {
            map.setView([first.latitude, first.longitude], 10);
            marker.fire("click");
          }
        } else {
          alert("No city matched your search.");
        }
        // hide suggestions
        if (suggestionsEl) suggestionsEl.classList.remove("visible");
      }
    });
  }

  // Unit toggle behavior
  if (unitToggle) {
    unitToggle.addEventListener("click", () => {
      tempUnit = tempUnit === "C" ? "F" : "C";
      localStorage.setItem("tempUnit", tempUnit);
      applyUnitToButton();
      // If any marker has an open popup, update popup contents
      Object.values(markers).forEach((m) => {
        if (m.getPopup && m.getPopup() && map.hasLayer(m.getPopup())) {
          // If cached weather exists, redisplay using cache to apply conversions
          if (m.weatherCache) displayWeatherPopup(m.weatherCache, m);
        }
      });
    });
  }

  // Close suggestions when clicking outside
  document.addEventListener("click", (ev) => {
    if (!document.getElementById("search-container")) return;
    const sc = document.getElementById("search-container");
    if (!sc.contains(ev.target)) {
      if (suggestionsEl) suggestionsEl.classList.remove("visible");
    }
  });

  // Add some helpful debugging
  window.debugMap = {
    map: map,
    markers: markers,
    loadCities: loadCities,
    reloadCities: () => {
      // Clear cluster group if available, otherwise remove marker layers
      if (markerClusterGroup) {
        markerClusterGroup.clearLayers();
      } else {
        Object.values(markers).forEach((marker) => map.removeLayer(marker));
      }
      Object.keys(markers).forEach((key) => delete markers[key]);
      loadCities();
    },
  };

  console.log("🎯 Weather map initialized! Use window.debugMap for debugging.");
});
