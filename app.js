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
  const FAV_KEY = "weather-pwa:favorites";

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
    favBtn: document.getElementById("fav-btn"),
    favorites: document.getElementById("favorites"),
    favoritesList: document.getElementById("favorites-list"),
    installBtn: document.getElementById("install-btn"),
    installDetails: document.getElementById("install-details"),
  };

  let place = DEFAULT;
  let deferredPrompt = null;

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

  function roundCoord(n) {
    return Math.round(Number(n) * 100) / 100;
  }

  function samePlace(a, b) {
    return (
      roundCoord(a.latitude) === roundCoord(b.latitude) &&
      roundCoord(a.longitude) === roundCoord(b.longitude)
    );
  }

  function loadFavorites() {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  function saveFavorites(list) {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(list));
    } catch {
      /* ignore */
    }
  }

  function isFavorite(p) {
    return loadFavorites().some((f) => samePlace(f, p));
  }

  function addFavorite(p) {
    const list = loadFavorites().filter((f) => !samePlace(f, p));
    list.unshift({
      name: p.name,
      latitude: p.latitude,
      longitude: p.longitude,
      timezone: p.timezone || "America/New_York",
    });
    saveFavorites(list);
    renderFavorites();
    updateFavBtn();
  }

  function removeFavorite(p) {
    saveFavorites(loadFavorites().filter((f) => !samePlace(f, p)));
    renderFavorites();
    updateFavBtn();
  }

  function updateFavBtn() {
    if (!els.favBtn || !place) return;
    const saved = isFavorite(place);
    els.favBtn.classList.toggle("is-saved", saved);
    els.favBtn.setAttribute(
      "aria-label",
      saved ? "Remove favorite" : "Save favorite"
    );
    els.favBtn.title = saved ? "Remove favorite" : "Save favorite";
    els.favBtn.textContent = saved ? "★ Saved" : "★ Save";
  }

  function renderFavorites() {
    const list = loadFavorites();
    if (!list.length) {
      els.favorites.hidden = true;
      els.favoritesList.innerHTML = "";
      return;
    }
    els.favorites.hidden = false;
    els.favoritesList.innerHTML = list
      .map((f, i) => {
        const active = samePlace(f, place) ? " is-active" : "";
        const label = escapeHtml(f.name);
        return `<li class="fav-chip${active}">
          <button type="button" class="fav-load" data-i="${i}">${label}</button>
          <button type="button" class="fav-remove" data-i="${i}" aria-label="Remove ${label}">×</button>
        </li>`;
      })
      .join("");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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
    updateFavBtn();
    renderFavorites();
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

  const GEO_TIMEOUT_MS = 5500;

  function getCurrentPosition(timeoutMs = GEO_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not available"));
        return;
      }
      const nativeTimeout = Math.max(timeoutMs, 1000);
      const geoPromise = new Promise((res, rej) => {
        navigator.geolocation.getCurrentPosition(res, rej, {
          enableHighAccuracy: false,
          timeout: nativeTimeout,
          maximumAge: 300000,
        });
      });
      const timer = new Promise((_, rej) => {
        setTimeout(
          () => rej(new Error("Location request timed out")),
          timeoutMs
        );
      });
      Promise.race([geoPromise, timer]).then(resolve, reject);
    });
  }

  async function placeFromCoords(latitude, longitude) {
    const base = {
      name: "Near me",
      latitude,
      longitude,
      timezone: "auto",
    };
    try {
      const data = await fetchForecast(base);
      const tz = data.timezone || "auto";
      const label =
        tz && tz !== "auto"
          ? `Near me · ${tz.replace(/_/g, " ")}`
          : "Near me";
      return {
        name: label,
        latitude,
        longitude,
        timezone: tz,
        _forecast: data,
      };
    } catch {
      return base;
    }
  }

  async function loadNearMe() {
    const pos = await getCurrentPosition();
    const { latitude, longitude } = pos.coords;
    const next = await placeFromCoords(latitude, longitude);
    if (next._forecast) {
      const data = next._forecast;
      delete next._forecast;
      const refined = {
        ...next,
        timezone: data.timezone || next.timezone || "America/New_York",
      };
      cacheForecast(refined, data);
      savePlace(refined);
      render(data, refined);
    } else {
      await load(next);
    }
  }

  async function coldStart() {
    // Paint cached forecast immediately so the UI never sits blank on geo.
    const cached = readCache();
    let showedCache = false;
    if (cached?.data && cached?.place) {
      render(cached.data, cached.place, { cached: true });
      showedCache = true;
      setStatus("Updating from your location…");
    } else {
      setStatus("Finding your location…");
    }

    try {
      await loadNearMe();
      return;
    } catch {
      /* permission denied / timeout / unavailable */
    }

    const saved = loadPlace();
    if (saved) {
      // If we already showed this place from cache, refresh quietly; else load.
      if (showedCache && cached?.place && samePlace(saved, cached.place)) {
        await load(saved, { quiet: true });
      } else {
        await load(saved);
      }
      return;
    }
    if (showedCache) {
      await load(cached.place, { quiet: true });
      return;
    }
    await load(DEFAULT);
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

  els.geoBtn.addEventListener("click", async () => {
    els.geoBtn.disabled = true;
    setStatus("Getting your location…");
    try {
      await loadNearMe();
    } catch (err) {
      const msg =
        err && err.code === 1
          ? "Location permission denied."
          : err?.message || "Could not get your location.";
      setStatus(msg, "error");
    } finally {
      els.geoBtn.disabled = false;
    }
  });

  els.favBtn.addEventListener("click", () => {
    if (!place || place.latitude == null) return;
    if (isFavorite(place)) {
      removeFavorite(place);
    } else {
      addFavorite(place);
    }
  });

  els.favoritesList.addEventListener("click", (e) => {
    const removeBtn = e.target.closest(".fav-remove");
    const loadBtn = e.target.closest(".fav-load");
    if (removeBtn) {
      const f = loadFavorites()[Number(removeBtn.dataset.i)];
      if (f) removeFavorite(f);
      return;
    }
    if (loadBtn) {
      const f = loadFavorites()[Number(loadBtn.dataset.i)];
      if (f) load(f);
    }
  });

  /* ——— Install / Add to Home Screen (footer details) ——— */
  function isStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches ||
      navigator.standalone === true
    );
  }

  function setInstallUI() {
    if (!els.installBtn) return;
    if (isStandalone()) {
      els.installBtn.hidden = true;
      els.installBtn.disabled = true;
      els.installBtn.classList.remove("is-installed");
      return;
    }
    els.installBtn.disabled = false;
    els.installBtn.classList.remove("is-installed");
    if (deferredPrompt) {
      els.installBtn.hidden = false;
      els.installBtn.textContent = "Install";
      return;
    }
    // No deferred prompt (typical iOS / unsupported) — hide Install button;
    // Safari steps remain visible inside the footer details.
    els.installBtn.hidden = true;
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    setInstallUI();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    setInstallUI();
  });

  els.installBtn.addEventListener("click", async () => {
    if (isStandalone() || !deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } catch {
      /* ignore */
    }
    deferredPrompt = null;
    setInstallUI();
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        /* optional on unsupported origins */
      });
    });
  }

  renderFavorites();
  setInstallUI();
  coldStart();
})();
