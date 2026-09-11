# Weather PWA

Installable local weather forecast (plain HTML/CSS/JS) powered by [Open-Meteo](https://open-meteo.com/) — no API key.

**Live:** [https://frank-dixon.github.io/weather-pwa/](https://frank-dixon.github.io/weather-pwa/)

Default location: **Springfield, MA** (42.1015, −72.5898), °F, `America/New_York`. Optional city search and browser geolocation.

## Features

- Current conditions: temperature, feels like, high/low, humidity, wind
- Hourly strip (next ~24 hours) and 7-day outlook
- Progressive Web App: web manifest, 192/512 icons, service worker
- Offline: app shell cached; last forecast kept in the Cache API + `localStorage`

## Install (as an app)

1. Open the [Pages URL](https://frank-dixon.github.io/weather-pwa/) in Chrome, Edge, Safari, or another modern browser.
2. **Desktop (Chrome/Edge):** use the install icon in the address bar, or *Menu → Install Weather…*
3. **Android (Chrome):** *Menu → Install app* / *Add to Home screen*
4. **iOS (Safari):** Share → *Add to Home Screen*

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
