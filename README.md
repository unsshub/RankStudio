# RankStudio

Single-user dark-themed studio for creating 9:16 **Video Ranking** videos with pixel-identical Remotion live preview and local H.264 MP4 export.

## Architecture

- **Frontend (`apps/web`)**: Static Vite + React 19 SPA deployed to GitHub Pages (and optionally served locally by the engine at `http://127.0.0.1:4000/` for offline use).
- **Local Engine (`apps/engine`)**: Fastify server on `127.0.0.1:4000` handling SQLite storage, local uploads, SFX indexing, `ffmpeg`/`ffprobe` ingest, optional Gemini AI voiceover, and Remotion rendering.
- **Shared Composition (`packages/composition`)**: Single `RankingVideo` 1080×1920 @ 30 fps composition + Zod schema + 25 bundled `@fontsource/*` offline fonts.

## Setup

1. Copy environment templates and configure `SFX_DIR` and `ALLOWED_ORIGINS`:
   ```bash
   cp .env.example .env
   cp apps/web/.env.example apps/web/.env
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the local engine:
   ```bash
   npm run engine
   ```
   Copy the **Pair code** (or click the **Pair link**) printed in the terminal.
4. For local development (web + engine together):
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173/RankStudio/` and paste your pair code once.

## GitHub Pages Deployment

1. Push to `main` and enable **Settings → Pages → Source: GitHub Actions**.
2. Add your `https://<your-user>.github.io` origin to `ALLOWED_ORIGINS` in `.env`.
3. If your repository is not named `RankStudio`, update `base` in `apps/web/vite.config.ts`.

## Browser Compatibility

- **Chrome, Edge, Firefox**: Supported (`https://` pages can connect to `http://127.0.0.1`). Chrome 142+ prompts once to allow local network access — click **Allow**.
- **Safari**: Not supported for GitHub Pages → localhost; use Chrome, Edge, or Firefox (or open `http://127.0.0.1:4000/` directly).

## Verification Commands

```bash
npm run typecheck && npm run lint
npm run test
npm run test:render
npm run e2e
```
