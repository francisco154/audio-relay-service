# F14 Desktop

Android screen streaming & control via USB/ADB with dual display support (DeX/Desktop Mode).

## Features

- **Desktop/DeX Mode**: Creates a virtual display on Android device and streams it to browser
- **Mirror/Control Mode**: Streams the main phone display with keyboard/mouse control
- **WebUSB Connection**: Plug-and-play USB connection, no installation needed
- **Quality Settings**: Resolution, DPI, bitrate, FPS, codec selection
- **Input Control**: Mouse, keyboard, special keys (Back, Home, Power, etc.)

## Tech Stack

- Next.js 16 + React 19 + TypeScript
- @yume-chan/adb (WebUSB ADB protocol)
- @yume-chan/scrcpy (screen streaming)
- Tailwind CSS 4
- WebCodecs API for hardware-accelerated video decoding

## Requirements

- Chrome or Edge browser (WebUSB support)
- Android device with USB debugging enabled
- USB cable

## Development

```bash
npm install
npm run dev
```

## Deployment

Deployed on Render: https://f14-desktop.onrender.com
