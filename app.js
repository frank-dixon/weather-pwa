(() => {
  "use strict";

  const DEFAULT = {
    name: "Springfield, MA",
    latitude: 42.1015,
    longitude: -72.5898,
    timezone: "America/New_York",
  };

  const CACHE_KEY = "weather-pwa:last-forecast";
  const PLACE_KEY = "weather-pwa:place";

  const WMO = {
    0: "Clear",
    1: "Mostly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Dense drizzle",
    56: "Freezing drizzle",
    57: "Freezing drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Freezing rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Showers",
    81: "Showers",
    82: "Violent showers",
    85: "Snow showers",
    86: "Snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm & hail",
    99: "Thunderstorm & hail",
  };

  const els = {
    status: document.getElementById("status"),
    current: document.getElementById("current"),
    hourlySection: document.getElementById("hourly-section"),
    dailySection: document.getElementById("daily-section"),
    place: document.getElementById("place-name"),
    updated: document.getElementById("updated"),
    condition: document.getElementById("condition"),
    temp: document.getElementById("temp"),
    feels: document.getElementById("feels"),
    hiLo: document.getElementById("hi-lo"),
    humidity: document.getElementById("humidity"),
    wind: document.getElementById("wind"),
    hourly: document.getElementById("hourly"),
    daily: document.getElementById("daily"),
    form: document.getElementById("search-form"),
    input: document.getElementById("city-input"),
    results: document.getElementById("search-results"),
    geoBtn: document.getElementById("geo-btn"),
  };

  let place = loadPlace() || DEFAULT;

  function loadPlace() {
    try {
      const raw = localStorage.getItem(PLACE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function savePlace(p) {
    try {
      localStorage.setItem(PLACE_KEY, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  }

  function weatherLabel(code) {
    return WMO[code] || "Weather";
  }

  function formatTemp(n) {
    if (n == null || Number.isNaN(n)) return "—";
    return `${Math.round(n)}°`;
  }

  function windDir(deg) {
    if (deg == null) return "";
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return dirs[Math.round(deg / 45) % 8];
  }

  function formatTime(iso, opts) {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: place.timezone && place.timezone !== "auto"
          ? place.timezone
          : "America/New_York",
        ...opts,
      }).format(new Date(iso));
    } catch {
      return "";
    }
  }

  function setStatus(msg, kind) {
    els.status.textContent = msg || "";
    els.status.className = "status" + (kind ? ` ${kind}` : "");
    els.status.hidden = !msg;
  }

  function forecastUrl(lat, lon, tz) {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      timezone: tz || "America/New_York",
      temperature_unit: "fahrenheit",
      wind_speed_unit: "mph",
      precipitation_unit: "inch",
      current: [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "weather_code",
        "wind_speed_10m",
        "wind_direction_10m",
        "is_day",
      ].join(","),
      hourly: [
        "temperature_2m",
        "weather_code",
        "precipitation_probability",
      ].join(","),
      daily: [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_probability_max",
      ].join(","),
      forecast_days: "7",
    });
    return `https://api.open-meteo.com/v1/forecast?${params}`;
  }

  async function fetchForecast(p) {
    const url = forecastUrl(p.latitude, p.longitude, p.timezone);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Forecast failed (${res.status})`);
    return res.json();
  }

  function cacheForecast(p, data) {
    const payload = { place: p, data, savedAt: Date.now() };
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {
      /* ignore quota */
    }
  }

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function render(data, p, { cached } = {}) {
    place = p;
    if (data.timezone && (!p.timezone || p.timezone === "auto")) {
      place = { ...p, timezone: data.timezone };
    }

    const cur = data.current;
    const daily = data.daily;
    const hourly = data.hourly;

    els.place.textContent = place.name;
    els.condition.textContent = weatherLabel(cur.weather_code);
    els.temp.textContent = formatTemp(cur.temperature_2m);
    els.feels.textContent = formatTemp(cur.apparent_temperature);
    els.hiLo.textContent = `${formatTemp(daily.temperature_2m_max[0])} / ${formatTemp(daily.temperature_2m_min[0])}`;
    els.humidity.textContent = `${Math.round(cur.relative_humidity_2m)}%`;
    els.wind.textContent = `${Math.round(cur.wind_speed_10m)} mph ${windDir(cur.wind_direction_10m)}`.trim();

    const when = formatTime(cur.time, {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
    els.updated.textContent = cached
      ? `Offline cache · ${when}`
      : `Updated ${when}`;

    const now = Date.now();
    const hours = [];
    for (let i = 0; i < hourly.time.length; i++) {
      const t = new Date(hourly.time[i]).getTime();
      if (t >= now - 45 * 60 * 1000) hours.push(i);
      if (hours.length >= 24) break;
    }

    els.hourly.innerHTML = hours
      .map((i) => {
        const label = formatTime(hourly.time[i], { hour: "numeric" });
        const wx = weatherLabel(hourly.weather_code[i]);
        const pop = hourly.precipitation_probability?.[i];
        const popBit = pop != null && pop > 0 ? ` · ${pop}%` : "";
        return `<article class="hour">
          <p class="t">${label}</p>
          <p class="deg">${formatTemp(hourly.temperature_2m[i])}</p>
          <p class="wx">${wx}${popBit}</p>
        </article>`;
      })
      .join("");

    els.daily.innerHTML = daily.time
      .map((day, i) => {
        const name =
          i === 0
            ? "Today"
            : formatTime(`${day}T12:00:00`, { weekday: "short" });
        const wx = weatherLabel(daily.weather_code[i]);
        const pop = daily.precipitation_probability_max?.[i];
        const popBit = pop != null && pop > 0 ? ` · ${pop}%` : "";
        return `<li>
          <span class="day-name">${name}</span>
          <span class="day-wx">${wx}${popBit}</span>
          <span class="day-temps">${formatTemp(daily.temperature_2m_max[i])}<span>${formatTemp(daily.temperature_2m_min[i])}</span></span>
        </li>`;
      })
      .join("");

    els.current.hidden = false;
    els.hourlySection.hidden = false;
    els.dailySection.hidden = false;
    setStatus(
      cached ? "Showing last saved forecast (offline or fetch failed)." : "",
      cached ? "cached" : ""
    );
  }

  async function load(p, { quiet } = {}) {
    if (!quiet) setStatus(`Loading ${p.name}…`);
    try {
      const data = await fetchForecast(p);
      const refined = {
        ...p,
        timezone: data.timezone || p.timezone || "America/New_York",
      };
      cacheForecast(refined, data);
      savePlace(refined);
      render(data, refined);
    } catch (err) {
      const cached = readCache();
      if (cached?.data) {
        render(cached.data, cached.place || p, { cached: true });
      } else {
        setStatus(err.message || "Could not load weather.", "error");
        els.current.hidden = true;
        els.hourlySection.hidden = true;
        els.dailySection.hidden = true;
      }
    }
  }

  async function searchCities(q) {
    const params = new URLSearchParams({
      name: q,
      count: "6",
      language: "en",
      format: "json",
    });
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?${params}`
    );
    if (!res.ok) throw new Error("Search failed");
    const json = await res.json();
    return json.results || [];
  }

  function showResults(results) {
    els.input.setAttribute("aria-expanded", results.length ? "true" : "false");
    if (!results.length) {
      els.results.hidden = true;
      els.results.innerHTML = "";
      return;
    }
    els.results.hidden = false;
    els.results.innerHTML = results
      .map((r, i) => {
        const bits = [r.name, r.admin1, r.country_code].filter(Boolean).join(", ");
        return `<li role="option"><button type="button" data-i="${i}">${bits}</button></li>`;
      })
      .join("");
    els.results.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const r = results[Number(btn.dataset.i)];
        const next = {
          name: [r.name, r.admin1 || r.country_code].filter(Boolean).join(", "),
          latitude: r.latitude,
          longitude: r.longitude,
          timezone: r.timezone || "America/New_York",
        };
        els.results.hidden = true;
        els.input.setAttribute("aria-expanded", "false");
        els.input.value = "";
        load(next);
      });
    });
  }

  els.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = els.input.value.trim();
    if (!q) return;
    setStatus(`Searching “${q}”…`);
    try {
      const results = await searchCities(q);
      if (!results.length) {
        setStatus("No cities found.", "error");
        showResults([]);
        return;
      }
      setStatus("");
      showResults(results);
    } catch (err) {
      setStatus(err.message || "Search failed.", "error");
    }
  });

  document.addEventListener("click", (e) => {
    if (!els.results.contains(e.target) && e.target !== els.input) {
      els.results.hidden = true;
      els.input.setAttribute("aria-expanded", "false");
    }
  });

  els.geoBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      setStatus("Geolocation not available on this device.", "error");
      return;
    }
    els.geoBtn.disabled = true;
    setStatus("Getting your location…");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          await load({
            name: "Near me",
            latitude,
            longitude,
            timezone: "auto",
          });
          const cached = readCache();
          if (cached?.data?.timezone) {
            const refined = {
              name: `Near me · ${cached.data.timezone.replace(/_/g, " ")}`,
              latitude,
              longitude,
              timezone: cached.data.timezone,
            };
            savePlace(refined);
            els.place.textContent = refined.name;
            place = refined;
          }
        } finally {
          els.geoBtn.disabled = false;
        }
      },
      (err) => {
        els.geoBtn.disabled = false;
        setStatus(err.message || "Location permission denied.", "error");
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
    );
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        /* optional on unsupported origins */
      });
    });
  }

  load(place);
})();
