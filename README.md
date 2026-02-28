# Printer Bridge

A monorepo for sending print jobs to local printers (ESC/POS thermal/receipt printers) from web applications. It consists of a backend bridge service, a JavaScript client library, a React integration library, and an example app.

## Packages

| Package | Path | Description |
|---------|------|-------------|
| `@printer-bridge/bridge` | `bridge/` | Backend service that manages printers and processes print jobs |
| `@printer-bridge/client` | `client/` | JavaScript client for communicating with the bridge over HTTP and WebSocket |
| `@printer-bridge/react` | `react-lib/` | React hooks and context provider for UI integration |
| `@printer-bridge/example` | `example/` | Example React app demonstrating the full workflow |

## Getting Started

### Prerequisites

- Node.js (ES2022 compatible)
- npm

### Install

```bash
npm install
```

### Run

Start the bridge server (port 9120):

```bash
npm --workspace=@printer-bridge/bridge run dev
```

Start the example web app (port 3000) in a separate terminal:

```bash
npm --workspace=@printer-bridge/example run dev
```

### Build

```bash
npm run build
```

## Architecture

The **bridge** runs as a local service that discovers system printers, manages a print job queue with retries, and exposes an HTTP + WebSocket API. The **client** library wraps that API with auto-reconnecting WebSocket support. The **react-lib** provides `BridgeProvider`, `useBridge`, `usePrinters`, and `usePrint` hooks for React apps.

### API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status` | GET | Bridge status and uptime |
| `/api/printers/available` | GET | List system printers |
| `/api/printers/configured` | GET | List configured printers |
| `/api/printers` | POST | Add or update a printer |
| `/api/printers/:id` | DELETE | Remove a printer |
| `/api/print` | POST | Send a print job (base64 data) |
| `/api/jobs/recent` | GET | Recent job history |

WebSocket events: `bridge:status`, `printer:status`, `printer:missing`, `job:queued`, `job:started`, `job:completed`, `job:failed`, `job:retry`.

## Configuration

The bridge stores its config file using OS-standard paths:

- **macOS:** `~/Library/Preferences/printer-bridge/config.json`
- **Linux:** `~/.config/printer-bridge/config.json`
- **Windows:** `%APPDATA%\printer-bridge\config.json`

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BRIDGE_PORT` | `9120` | Port for the bridge server |
| `NO_TRAY` | — | Set to `1` to disable the system tray icon |

---

> **Note:** Please keep this README up to date when adding or changing endpoints, environment variables, configuration options, or package structure.
