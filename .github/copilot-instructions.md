# Project Guidelines

## Code Style
- Frontend is React + TypeScript under `src/ui/` (Vite root). Keep UI code in TS/TSX and align with existing hooks/components in `src/ui/components/` and `src/ui/*.ts`.
- Backend/server files use CommonJS (`require`) and plain JS (see `src/server.js`, `src/server-prod.js`). Avoid ESM syntax there.
- TypeScript is `strict` per `tsconfig.json` — favor typed props and avoid `any` in new UI code.

## Architecture
- Dev server: `src/server.js` runs Express + Vite middleware over HTTPS on port **52390** and sets up the Copilot WebSocket proxy.
- Prod server: `src/server-prod.js` serves static files from `dist/` and uses the same HTTPS certs.
- UI bundle output is `dist/` (configured in `vite.config.js`); Vite root is `src/ui/`.
- Office add-in wiring is in `manifest.xml` pointing to `https://localhost:52390`.

## Build and Test
- Install: `npm install`
- Dev server (hot reload): `npm run dev`
- Prod server: `npm run start`
- Tray app (local): `npm run start:tray`
- Build UI: `npm run build`
- Installers: `npm run build:installer`, `npm run build:installer:win`, `npm run build:installer:mac`

## Project Conventions
- Local HTTPS is required; certs live in `certs/` and are validated in `vite.config.js` and `src/server-prod.js`.
- Tool implementations for Office actions live in `src/ui/tools/` and are documented in `TOOLS_CATALOG.md`.
- Register/unregister scripts (`register.ps1`, `register.sh`) trust the dev cert and register the manifest.

## Integration Points
- Office add-in manifest: `manifest.xml` (hosts Document/Workbook/Presentation).
- Copilot SDK + proxy: `@github/copilot-sdk` and `src/copilotProxy.js` (WebSocket proxy hooked into the HTTPS server).
- Electron tray app entry: `src/tray/main.js` (started via `npm run start:tray`).

## Tool Addition
- Excel tool guide: `docs/excel_tool_addition.md`
- Word tool guide: `docs/word_tool_addition.md`
- PowerPoint tool guide: `docs/powerpoint_tool_addition.md`
- When adding or changing tools, update `TOOLS_CATALOG.md` to keep the tool list in sync.

## Security
- TLS certs are self-signed for localhost only (`certs/README.md`), trusted via register scripts; do not repurpose for production.
- The `/api/fetch` endpoint proxies external GET requests (see `src/server.js` / `src/server-prod.js`); keep it constrained to GET and avoid widening scope without review.