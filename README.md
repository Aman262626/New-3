# CAPTCHA Bypasser - Chrome Extension

A Chrome extension that automatically detects and solves CAPTCHAs (reCAPTCHA v2/v3, hCaptcha, Cloudflare Turnstile) with one click.

## Features

- **Auto-Detect & Solve** - Automatically finds CAPTCHAs on any webpage and attempts to solve them
- **reCAPTCHA v2** - Clicks the checkbox, handles audio challenges
- **hCaptcha** - Auto-clicks the verification checkbox
- **Cloudflare Turnstile** - Automatic click-through
- **Human Simulation** - Random delays and mouse movements to mimic human behavior
- **Audio Mode** - Prefers audio challenges for faster solving
- **Stats Tracking** - Tracks solved/failed counts and success rate
- **Dark UI** - Clean, modern dark-themed popup interface

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked**
5. Select the project folder
6. The extension icon will appear in your toolbar

## Usage

- **Auto-Solve**: Enabled by default. CAPTCHAs are solved automatically when detected.
- **Solve Now**: Click the extension icon and hit "Solve Now" to manually trigger solving on the current page.
- **Settings**: Toggle Auto-Solve, Audio Mode, and Human Simulation from the popup.

## Project Structure

```
├── manifest.json              # Extension manifest (MV3)
├── background/
│   └── service-worker.js      # Background service worker
├── content/
│   └── detector.js            # Content script - detects & solves CAPTCHAs
├── popup/
│   ├── popup.html             # Extension popup UI
│   ├── popup.css              # Popup styles
│   └── popup.js               # Popup logic
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## How It Works

1. **Detection**: Content script runs on every page and scans for CAPTCHA iframes/widgets
2. **DOM Observer**: Watches for dynamically loaded CAPTCHAs
3. **Solving**: Simulates human-like mouse movements and clicks on CAPTCHA elements
4. **Audio Fallback**: If image challenge appears, switches to audio mode
5. **Badge Updates**: Shows solve status on the extension icon

## Supported CAPTCHAs

| Type | Support |
|------|---------|
| reCAPTCHA v2 (Checkbox) | Full |
| reCAPTCHA v2 (Audio) | Partial |
| reCAPTCHA v3 | Detection |
| hCaptcha | Full |
| Cloudflare Turnstile | Full |

## License

MIT
