# Weather Dashboard

A fully-featured, responsive weather dashboard built with vanilla HTML, CSS, and JavaScript.  
No build step required — open `index.html` directly in any modern browser.

## Features

| Feature | Details |
|---|---|
| **Current weather** | Temperature, feels-like, humidity, wind, pressure, visibility, sunrise/sunset |
| **5-day forecast** | Daily high/low, weather icon & description |
| **Geolocation** | One-click "My Location" button to fetch weather for your current position |
| **Units toggle** | Switch between **°C** (metric) and **°F** (imperial) at any time |
| **Search history** | Last 8 searches persisted to `localStorage`; click any chip to reload |
| **Loading spinner** | Shown while API calls are in-flight |
| **Error handling** | Human-readable messages for network errors, unknown cities, invalid API key, rate limits |
| **Responsive design** | Works on mobile, tablet, and desktop |

## Quick Start

### 1. Get an API Key

Sign up for a free account at [openweathermap.org](https://openweathermap.org/api) and copy your API key.

### 2. Set Your API Key

**Option A — edit the HTML directly:**

Open `index.html` and replace the placeholder on this line:

```js
: 'YOUR_OPENWEATHERMAP_API_KEY';
```

with your actual key:

```js
: 'abc123yourkeyhere';
```

**Option B — create a `config.js` file (recommended, keeps the key out of the main file):**

```js
// config.js  (do not commit this file)
window.WEATHER_API_KEY = 'abc123yourkeyhere';
```

Then add a `<script src="config.js"></script>` tag **before** the closing `</body>` tag in `index.html`.

Add `config.js` to `.gitignore` so you never accidentally commit your key.

### 3. Open in Browser

```bash
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

Or serve it locally (avoids any potential CORS issues):

```bash
# Python 3
python -m http.server 8080

# Node.js (npx)
npx serve .
```

Then visit `http://localhost:8080`.

## Project Structure

```
weather-dashboard/
├── index.html      # Complete app (HTML + CSS + JS in one file)
└── README.md       # This file
```

## API Reference

This project uses the [OpenWeatherMap](https://openweathermap.org/api) free tier:

| Endpoint | Purpose |
|---|---|
| `GET /data/2.5/weather` | Current weather by city name or coordinates |
| `GET /data/2.5/forecast` | 5-day / 3-hour forecast by city name or coordinates |

The free tier allows up to **60 calls/minute** and **1,000,000 calls/month** — more than sufficient for personal use.

## Customization

- **Accent colour** — change `--accent` in the `:root` CSS block.
- **Dark/light mode** — swap the `--bg`, `--surface`, `--text` variables.
- **Max history entries** — change `MAX_HISTORY` (default: `8`).
- **Default units** — change the initial `unit` variable (`'metric'` or `'imperial'`).

## Security Notes

- Never hard-code your API key in a public repository.
- Use `config.js` (excluded from version control) or a server-side proxy for production use.
- The OpenWeatherMap free-tier key is only valid for the two endpoints listed above.
