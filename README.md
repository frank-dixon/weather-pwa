# Weather PWA

Installable local weather forecast (plain HTML/CSS/JS) powered by [Open-Meteo](https://open-meteo.com/) — no API key.

**Live:** [https://frank-dixon.github.io/weather-pwa/](https://frank-dixon.github.io/weather-pwa/)

On every cold start the app tries **browser geolocation** first (“Near me”). If permission is denied, times out, or is unavailable, it falls back to the last saved place, then **Springfield, MA** (42.1015, −72.5898). Temperatures in °F.

## Features

- Current conditions: temperature, feels like, high/low, humidity, wind
- Hourly strip (next ~24 hours) and 7-day outlook
- **Favorites** — ★ Save next to the place name; chips under search to load or remove. Stored in `localStorage` (`weather-pwa:favorites`)
- **Install / Add to Home Screen** button in the header (Chrome/Android via `beforeinstallprompt`; iOS Safari shows short Share → Add to Home Screen steps). Shows “Installed” when running standalone
- Progressive Web App: web manifest, 192/512 icons, service worker
- Offline: app shell cached; last forecast kept in the Cache API + `localStorage`

## Install (as an app)

1. Open the [Pages URL](https://frank-dixon.github.io/weather-pwa/) in Chrome, Edge, Safari, or another modern browser.
2. Tap **Add to Home Screen** / **Install** in the app header when offered.
3. **Desktop (Chrome/Edge):** install icon in the address bar also works.
4. **iOS (Safari):** use the in-app hint — Share → *Add to Home Screen*.

After install, the app opens standalone and can show the last cached forecast offline.

## Local preview

Serve the folder over HTTP (service workers need a secure context / localhost):

```bash
cd weather-pwa
python3 -m http.server 8080
```

Then open `http://localhost:8080/`.

## GitHub Pages

This repo is configured for **GitHub Pages** from the `main` branch, site root (`/`).

Project site URL: `https://frank-dixon.github.io/weather-pwa/`

All asset links use relative URLs (`./…`) so the project-pages base path works.

## Stack

- Static files only (no bundler, React, or TypeScript)
- Forecast + geocoding: Open-Meteo public APIs
- Design: cream `#F3EEE4`, ink text, dark turquoise `#0B8A8F`

## License

Personal project · weather data © Open-Meteo contributors
