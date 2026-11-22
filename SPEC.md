# RankStudio — Specification

## Problem Statement

Creators who make 9:16 vertical **Video Ranking** videos (countdown or ranked clip compilations with styled titles, rank numbers, transitions, sound effects, and voiceovers) currently have to rely on hosted SaaS editors that upload large video files to third-party servers, lock features behind accounts/subscriptions, or suffer from mismatched previews and exports. At the same time, static hosting like GitHub Pages cannot store large video clips (up to 500 MB), run `ffmpeg`, or render H.264 MP4s reliably in-browser across browsers without sacrificing CSS fidelity and rendering speed.

The user needs a single-user, dark-themed Video Ranking studio that can be accessed from a static GitHub Pages site (or locally offline) while keeping all media, sound effects, processing, and rendering entirely on their own machine—and guaranteeing that the live preview matches the final exported MP4.

## Solution

**RankStudio** splits the application into two coordinated parts:

1. **RankStudio Web App (Static SPA):** Hosted on GitHub Pages (and optionally served locally by the engine for offline use). It provides the dark-themed workspace, sidebar shell, Video Ranking editor, live 9:16 preview player, and Library.
2. **RankStudio Engine (Local Server):** A lightweight local background server running on `127.0.0.1:4000` on the user's machine. It manages local SQLite storage, uploaded clips, the user's local Sound Effects folder, `ffmpeg`/`ffprobe` media ingestion, optional Gemini AI voiceover generation, and headless Remotion MP4 rendering.

Both the live preview in the browser and the final MP4 render on the engine use the exact same Remotion composition (`RankingVideo`) and bundled offline fonts, so what the user sees in the editor is what they download. Access to the local engine is secured by localhost-only binding, an origin allowlist, and a one-time pairing token.

## User Stories

### Setup, Connectivity & Security
1. As a creator, I want the RankStudio Engine to bind only to `127.0.0.1`, so that no other device on my network can access my local files or rendering server.
2. As a creator, I want the engine to generate a random pairing token on first start and print both the pair code and a one-click pairing link in the terminal, so that I can pair my browser quickly without manual account setup.
3. As a creator, I want the engine to reject requests missing a valid pairing token and reject requests from origins outside my configured allowlist, so that arbitrary websites in my browser cannot access my local engine.
4. As a creator, I want the engine to return the Private Network Access preflight header (`Access-Control-Allow-Private-Network: true`), so that Chrome 142+ can connect from GitHub Pages to `127.0.0.1` after I grant permission once.
5. As a creator, I want the app to detect when the local engine is offline and display an "Engine offline" screen with the exact command to start it, so that I immediately know how to get back up and running.
6. As a creator, I want the app to automatically reconnect when I start the engine again, so that I do not have to manually reload or reconfigure anything.
7. As a creator, I want the app to show a "Not paired" screen when the engine is running but my browser lacks a valid token, so that I can paste my pairing token once to connect.
8. As a creator, I want to open a Settings dialog to view or change the engine URL and pairing token (persisted in localStorage), so that I can re-pair or point to a different local port if needed.
9. As a creator, I want the local engine to optionally serve the built frontend at `http://127.0.0.1:4000/`, so that I can still use RankStudio completely offline without internet or GitHub Pages.
10. As a creator, I want the engine's file-serving endpoint to resolve real paths and block path traversal or symlink escapes outside my configured data and SFX directories, so that the engine can never expose unrelated files on my machine.

### Navigation, Shell & Workspace Ergonomics
11. As a creator, I want a dark-themed interface with a collapsible sidebar (persisted in localStorage) divided into Core and Tools sections, so that I can maximize editor space while keeping navigation accessible.
12. As a creator, I want hash-based routing for all pages (Home, Library, Tutorial, Free Course, Video Ranking new/edit, Settings, and Tool placeholders), so that deep links and page refreshes work cleanly on GitHub Pages without 404 hacks.
13. As a creator, I want placeholder "Coming soon" pages for the other 7 tools in the sidebar, so that the workspace shell reflects the full tool suite while focusing v1 on Video Ranking.
14. As a creator, I want a Tutorial page with clear usage instructions, so that I can reference how to set up and use RankStudio inside the app.
15. As a creator, I want to see a warning if my viewport is narrower than 1024 px in the editor, so that I know the editor is designed for desktop screens.
16. As a creator, I want keyboard shortcuts for play/pause (`Space`) and undo/redo (`Ctrl+Z` / `Ctrl+Shift+Z`), so that I can edit quickly without reaching for buttons.
17. As a creator, I want toast notifications, clear empty states, and an unsaved-change guard when leaving the editor, so that I receive clear feedback and do not accidentally lose work.

### Project Management & Autosave
18. As a creator, I want clicking "Video Ranking" to create a new draft project initialized with sensible defaults, so that I can start editing immediately.
19. As a creator, I want my edits in the Video Ranking editor to autosave to the local engine after a short debounce (800 ms) with a "Saving… / Saved" status indicator, so that my progress is continuously preserved.
20. As a creator, I want full undo/redo history for my project edits, so that I can experiment freely with styling, layout, and clip settings.
21. As a creator, I want to see a "Recently Created" section for quick access to my recent Video Ranking projects, so that I can jump back into ongoing drafts.
22. As a creator, I want an explicit "Save as Draft" action alongside autosave, so that I can deliberately commit my draft state before leaving.

### Rich-Text Title & On-Canvas Manipulation
23. As a creator, I want a rich-text title editor that supports styling individual words or selections with different fonts, sizes, bold, italic, text colors, highlight colors, and alignment, so that my ranking title stands out visually.
24. As a creator, I want to choose from a curated set of 25 bundled offline fonts (including Anton aliased as "Ranking Font"), so that my titles look identical in preview and final render with zero internet dependency.
25. As a creator, I want a color picker with preset swatches plus recent and custom colors saved in localStorage, so that I can reuse my brand or video color palette easily.
26. As a creator, I want an offline emoji picker inside the title editor, so that I can add emojis to my ranking title without external network requests.
27. As a creator, I want global title stroke controls (stroke color and width from 0 to 20), so that my title remains legible over any video background.
28. As a creator, I want to drag the title directly on the 9:16 preview canvas, so that I can position it visually instead of guessing coordinates.
29. As a creator, I want to drag and resize the rank number list directly on the canvas (when number dragging is enabled), so that I can place and scale the rank overlay cleanly.
30. As a creator, I want to drag and resize an individual clip's video box on the canvas, synced with percentage box insets, so that I can frame each clip precisely inside the 9:16 canvas.

### General Settings & Playback Order
31. As a creator, I want to adjust the global video height percentage (30%–100%, default 80%) and canvas background hex color (default `#2B2A2A`), so that I can control how much space the video and title occupy.
32. As a creator, I want a global Captions toggle that generates timed 3-word caption chunks from each clip's voiceover script spread evenly across the voice audio duration (styled in white with black stroke), so that I can add captions without requiring any AI service.
33. As a creator, I want playback order to default to a countdown from N down to 1 when custom ordering is disabled, so that standard ranking countdowns work out of the box.
34. As a creator, I want to enable custom playback order in either Manual mode (drag-and-drop sortable list) or Shuffle mode (seeded shuffle so preview and final render play in the exact same order), so that I can customize reveal pacing.
35. As a creator, I want a "Sync All" button that resets the playback order to N → 1 and a status pill showing either "All N clips in order" or how many clips are missing from the order, so that I never accidentally omit clips from my video.

### Clip Management, Media Upload & Trimming
36. As a creator, I want collapsible rank slot accordions where I can expand clips, reorder them up/down, delete clips, and click "+ Add More Video" to append new rank slots, so that I can build rankings of any length.
37. As a creator, I want to upload local MP4, MOV, or WebM clips up to 500 MB via a dropzone with an upload progress bar and client-side size check, so that I can bring my own footage into the project.
38. As a creator, I want the engine to automatically ingest uploaded videos—probing metadata, transcoding non-browser-safe codecs to an H.264/AAC `yuv420p` faststart proxy, generating a tiled filmstrip sprite, and extracting a 400-peak audio waveform—so that every clip scrubs smoothly in preview.
39. As a creator, I want live ingest status updates (pending, ready, failed) via Server-Sent Events and the ability to re-upload a clip, so that I know immediately when a clip is ready to trim.
40. As a creator, I want a visual clip trimmer displaying the filmstrip and audio waveform with draggable green Start and red End handles, 0.1 s arrow-key nudging, and a clip volume slider (0–100%), so that I can make frame-accurate trims and balance audio levels.

### Per-Clip Customization Tabs
41. As a creator, I want a **Video Title** tab per clip to set the clip's label text and full text styling (font, size, bold, italic, color, highlight, stroke color, stroke width), so that each ranked item displays a clear label when it starts.
42. As a creator, I want a **Number Appearance** tab per clip to customize that rank number's color, font, bold weight, stroke color, and stroke width, so that top ranks (like #1) can stand out visually.
43. As a creator, I want a **Size & Position** tab per clip to inspect and adjust percentage box insets (top, right, bottom, left), so that I can fine-tune clip framing numerically or visually.
44. As a creator, I want a **Voiceover** tab per clip where I can enable voiceover, write a manual script, and upload my own voice audio file, so that I can narrate clips without paying for or configuring any AI API.
45. As a creator, I want a clip whose voiceover is longer than its trimmed video to hold on its last video frame until the voiceover finishes (with a minimum clip length of 0.5 s), so that narration is never cut off abruptly.
46. As a creator, I want an optional AI voiceover mode (generating a script from Topic, Tone, Length, Hook, and CTA and synthesizing TTS with a prebuilt Gemini voice) to appear **only** when the local engine has a Gemini API key configured, so that the UI stays clean when running fully offline.
47. As a creator, I want an **Animation** tab per clip to pick a clip title entrance animation (`none`, `fadeIn`, `fadeInRight`, `fadeInLeft`, `fadeInUp`, `fadeInDown`, `zoomIn`, `bounceIn`, `typewriter` with duration and delay) and a transition between clips (`none`, `fade`, `slide`, `wipe`, `flip`, `clockWipe`), so that my ranking feels dynamic.
48. As a creator, I want a **Sound Effect** tab per clip to search my local Sound Effects folder (with cleaned-up display names like "Suspicious" and "Metal Gear Alert Sound Effect") plus any in-app uploaded sound effects, preview them inline, adjust effect volume, and attach one to play at the clip's start, so that each reveal has punchy audio.
49. As a creator, I want to upload additional sound effects from inside the Sound Effect tab, so that I can expand my sound library without leaving the app.

### Live Preview & Final Rendering
50. As a creator, I want a sticky 9:16 live preview player alongside the editor with play/pause, scrubbing, volume, fullscreen, and a `?` help popover, so that I can review every change in real time.
51. As a creator, I want the preview player to stream my local media and sound effects using HTTP Range requests, so that seeking and playback are responsive even for large clips.
52. As a creator, I want clicking "Generate Video Ranking" to validate that every clip has ready media and a valid trim before queueing a render job, so that renders do not fail mid-way due to missing or invalid clips.
53. As a creator, I want the engine to render the final 1080×1920 @ 30 fps H.264/AAC MP4 using the same Remotion composition as the preview, generate a thumbnail still at 1 second, and stream render progress updates to the app via SSE, so that I can monitor progress live.
54. As a creator, I want to cancel an in-progress render job cleanly, so that I can free my machine if I notice a mistake before the render finishes.
55. As a creator, I want any render or ingest jobs that were running when the engine unexpectedly shut down to be marked as failed ("interrupted") on next startup, so that the queue never gets stuck in a permanently running state.

### Library & Post-Render Actions
56. As a creator, I want a Library page with tabs for **Videos** (projects), **Image** (render thumbnails), and **Voices** (voice assets), plus a tool filter dropdown synced to the URL query, so that I can organize and find all my outputs and assets.
57. As a creator, I want project cards in the Library to clearly display their state—Draft, Rendering (with a live SSE percentage progress bar), Completed (with thumbnail and play button), or Failed (with a retry option)—so that I always know the status of every project.
58. As a creator, I want a card action menu (`…`) allowing me to **Download** the rendered MP4 as an attachment, **View** it in a modal, **Edit** the project in the editor, **Re-use Template** (duplicating the project's styling and structure while clearing clip media, trims, and voice audio), or **Delete** the project (with confirmation, removing its rendered files from disk), so that I can manage my library end-to-end.

## Implementation Decisions

### Architectural Split & Hosting
- **Monorepo (npm workspaces):** Organized into two applications (**Web SPA** and **Local Engine**) and two shared packages (**Composition** and **Shared Contracts**). Uses npm (compatible with Node 22.5.1).
- **Frontend SPA:** Built with Vite, React 19, TypeScript, Tailwind v4, shadcn/ui (dark theme), lucide-react, and React Router using `HashRouter`. Deployed to GitHub Pages via GitHub Actions (copying the index HTML to a 404 fallback and configuring Vite's base path for the repository name). Also optionally served directly by the Local Engine at `http://127.0.0.1:4000/` for offline use.
- **Local Engine:** Node + Fastify server with CORS, streaming multipart uploads, and SQLite via `better-sqlite3` + Drizzle ORM in WAL mode. Bound strictly to `127.0.0.1` (default port `4000`).
- **Browser Support:** Targets Chrome, Edge, and Firefox (which treat `127.0.0.1` as a secure origin from `https://`). Includes `Access-Control-Allow-Private-Network: true` on CORS preflights for Chrome 142+. Safari is not supported for the GitHub Pages → localhost topology.

### Security & Authentication
- **Pairing Token:** On first startup, the engine generates a 32-byte random `base64url` token persisted inside the engine data directory and prints both the token and a one-click settings link to stdout.
- **Request Auth:** All engine endpoints except the health endpoint require the `X-RankStudio-Token` header. Endpoints consumed directly by browser media tags, downloads, or `EventSource` accept the token via the `?t=<token>` query parameter.
- **CORS Allowlist:** Configured via environment (`ALLOWED_ORIGINS`), allowing the GitHub Pages origin, local Vite dev origin, and local engine origin.
- **Safe File Resolution:** A dedicated path-resolution helper resolves symlinks/real paths and rejects any request that escapes the configured `DATA_DIR` or `SFX_DIR` roots. Media streaming supports HTTP `Range` (`206 Partial Content`) responses.

### Shared Composition & Media Logic
- **Single Source of Truth:** The **Composition** package exports the Zod project schema (`RankingProject`, `Clip`, `TextStyle`), default factories (`defaultProject`, `defaultClip`), schema migration (`migrate`), pure playback/timing logic, 25 bundled `@fontsource/*` fonts (aliasing Anton as "Ranking Font"), and the `RankingVideo` 1080×1920 @ 30 fps Remotion composition.
- **Order Resolution (`resolveOrder`):**
  - Custom off → countdown `N` down to `1`.
  - Custom Manual → explicit `playback.order` list (sortable via `@dnd-kit/sortable`).
  - Custom Shuffle → deterministic seeded Fisher–Yates using `playback.seed` so preview and render produce identical order.
  - "Sync All" resets order to `N → 1`.
- **Duration Calculation (`computeDuration`):** Sum of effective clip durations minus transition overlaps (`0.5 s` per transition). Each clip has a minimum length of `0.5 s`; if voiceover audio exceeds the trimmed video duration, the clip holds its last frame until the voice finishes (`max(trim, voice)`).
- **Caption Generation:** Pure deterministic word-splitting of the clip's voiceover script distributed evenly across the voice audio duration in 3-word chunks, rendered with global white text and black stroke.
- **Title & Layers:** Tiptap JSON document converted to styled spans with `-webkit-text-stroke` and `paint-order` for stroke rendering. Composition layers: background hex fill, TitleLayer, RankList (numbers `1..N` at configured x/y/scale with clip label fading in when each clip starts), `TransitionSeries` over resolved clips, `ClipSequence` (`OffthreadVideo` positioned by box insets and `videoHeightPct`), clip title animation, SFX audio at clip start, voiceover audio, and captions.

### Data Model & Storage
- **Project Document Schema (Zod):** Versioned (`version: 1`) JSON document containing:
  - `title`: Tiptap JSON `doc`, `align`, `position` (`x`, `y`), `strokeColor`, `strokeWidth`.
  - `general`: `videoHeightPct` (30–100, default 80), `background` (default `#2B2A2A`), `captions` (boolean, default false).
  - `playback`: `custom`, `mode` (`manual | shuffle`), `order`, `seed`.
  - `numbers`: `dragEnabled`, `x`, `y`, `scale`.
  - `clips` (min 1): `id`, `rank`, `media` (`assetId`, `durationSec`, `width`, `height`), `trim` (`startSec`, `endSec`), `volume` (0–1), `title` (`text`, `style`), `number` (`color`, `fontFamily`, `bold`, `strokeColor`, `strokeWidth`), `box` (`top`, `right`, `bottom`, `left` % insets), `voiceover` (`enabled`, `mode: manual | upload | ai`, `script`, `ai` params, `voiceId`, `audioAssetId`), `animation` (`text` type/duration/delay, `transition`), `sfx` (`id`, `volume`).
- **SQLite Tables (Drizzle):**
  - `projects`: `id`, `tool` (default `video-ranking`), `name`, `data` (JSON `RankingProject`), `status` (`DRAFT | RENDERING | COMPLETED | FAILED`), `progress`, `outputPath`, `thumbPath`, `error`, `createdAt`, `updatedAt`.
  - `assets`: `id`, `kind` (`VIDEO | VOICE | SFX_UPLOAD`), `path` (relative to `DATA_DIR`), `origName`, `durationSec`, `width`, `height`, `filmstrip`, `waveform`, `status` (`PENDING | READY | FAILED`), `error`, `createdAt`.
  - `jobs`: `id`, `type` (`INGEST | RENDER | VOICEOVER`), `payload` (JSON), `status` (`QUEUED | RUNNING | DONE | FAILED`), `attempts`, `error`, `createdAt`, `updatedAt`.
- **Local Disk Layout:** Under `DATA_DIR`: SQLite DB, pairing token file, per-asset media directories (source, proxy, filmstrip sprite, waveform JSON), voice audio directory, uploaded SFX directory, and per-project render output directories (MP4 + thumbnail JPG).

### Engine API Contract (Shared Contracts Package)
- `GET /health` — unauthenticated status returning `{ ok, version, gemini, sfxDir, paired }`.
- `GET /projects?tool=video-ranking` — list projects for Library and Recently Created.
- `POST /projects` — create a new draft from `defaultProject()`.
- `GET / PATCH / DELETE /projects/:id` — load, autosave (`data`, `name`), or delete project and associated disk files.
- `POST /projects/:id/duplicate?template=1` — duplicate project as a template (clearing clip media, trim, and voice audio).
- `POST /projects/:id/render` — validate all clips have READY media and valid trims, mark project `RENDERING`, enqueue `RENDER` job.
- `POST /projects/:id/render/cancel` — abort active render via Remotion `cancelSignal`.
- `GET /events` (SSE) — streams `project.progress`, `project.status`, and `asset.status` events.
- `POST /assets/upload` — streaming multipart upload (`kind=VIDEO|VOICE|SFX_UPLOAD`, max 500 MB), returns asset record and enqueues `INGEST`.
- `GET /assets/:id` & `GET /assets?kind=VOICE` — asset metadata/status and Library Voices tab listing.
- `GET /sfx?q=` — searchable SFX list `{ id, name, category, durationSec, url }`.
- `GET /files/*?t=` — HTTP Range file streaming from `DATA_DIR` / `SFX_DIR` with safe path validation.
- `GET /renders/:projectId/download?t=` — MP4 download with `Content-Disposition: attachment`.
- `POST /ai/script` & `POST /ai/voice` *(Gemini only)* — generate script for review; enqueue `VOICEOVER` job (script → TTS → WAV → `VOICE` asset).

### Job Runner & Media Pipelines
- **In-Process Job Runner:** Polls every 500 ms and claims `QUEUED` jobs atomically (`UPDATE ... WHERE status='QUEUED' RETURNING`). Enforces concurrency limits of 1 active render and 2 active ingests. On boot, marks any leftover `RUNNING` jobs as `FAILED` ("interrupted"). Broadcasts status and progress over SSE.
- **Ingest Pipeline:** Runs `ffprobe`; if not already browser-safe H.264 + AAC `yuv420p`, transcodes a faststart proxy MP4 via `ffmpeg`; generates a 1 fps, 90 px tall tiled filmstrip sprite; extracts a mono 8 kHz PCM stream into 400 waveform peaks JSON; marks asset `READY`.
- **Render Pipeline:** Bundles the Remotion composition once at engine startup and caches the bundle in memory. Renders via `@remotion/renderer` (`codec: "h264"`) with `cancelSignal`, throttling DB and SSE progress writes to at most once every 500 ms. Captures a `renderStill` thumbnail at 1 second, then marks project `COMPLETED` (or `FAILED` with error message).
- **SFX Indexer:** Scans `SFX_DIR` (flat folder mapped to category `"My Sounds"`) and uploaded SFX for `.mp3/.wav/.ogg/.m4a`, caching `ffprobe` durations by file `mtime`. Assigns each SFX a stable hash ID derived from its relative path and prettifies display names by stripping the extension, trailing `_XXXXXXX` suffix, and ` - QuickSounds.com`, replacing `-`/`_` with spaces, and title-casing.
- **Optional Gemini Voiceover Pipeline:** Enabled only when `GEMINI_API_KEY` is configured. Uses `@google/genai` for script generation and TTS synthesis, converting PCM output to WAV and storing it as a `VOICE` asset.

### Frontend State & Key UI Modules
- **State Management:** Zustand store wrapped with `zundo` for undo/redo, debounced 800 ms autosave to `PATCH /projects/:id`, and TanStack Query for server state caching, polling, and retries.
- **Editor UI Modules:**
  - `EngineGate` + `SettingsDialog` (health polling, offline/unpaired/connected states, localStorage config).
  - `Sidebar` (collapsible Core & Tools navigation).
  - `EditorLayout` + `PreviewPanel` (`@remotion/player` with controls and `?` popover) + `CanvasOverlay` (`react-moveable` converting canvas pixels ↔ percentage coordinates).
  - `TitleEditor` (Tiptap extensions, `FontPicker`, `FontSizeSelect`, `ColorPopover` with `react-colorful`, `EmojiPopover` with bundled `emoji-mart`, `TitleStroke`).
  - `GeneralSettings`, `PlaybackOrder` (`@dnd-kit/sortable`), `NumberDrag`.
  - `ClipAccordion`, `UploadDropzone` (XHR progress + 500 MB client validation), `ClipTrimmer` (filmstrip + waveform + Start/End handles + 0.1 s arrow nudge + volume), and the 6 per-clip tabs (`VideoTitleTab`, `NumberAppearanceTab`, `SizePositionTab`, `VoiceoverTab`, `AnimationTab`, `SoundEffectTab`).
  - `LibraryPage`, `ProjectCard`, `ProjectMenu`, `ViewModal` (Videos/Image/Voices tabs, tool filter, live SSE progress bar, download/view/edit/template/delete).

## Testing Decisions

### What Makes a Good Test
- Tests should verify **external behavior and observable contracts** (UI flows, HTTP/SSE responses, rendered media properties, and pure composition outputs) rather than internal implementation details, private helpers, or component internals.
- Tests should run against isolated temporary storage (`DATA_DIR` and fixture media/SFX folders) so they are deterministic, fast, and never mutate real user data.

### Testing Seams & Modules Under Test
This is a greenfield codebase with no prior tests; testing is structured around three high-level boundaries:

1. **Primary Seam — Full-Stack Browser ↔ Live Engine (Playwright E2E):**
   - Drives the real Web SPA against a real local Engine instance backed by temporary storage and fixture MP4/SFX files.
   - Verifies the full user journey: pairing → creating a project → styling the title → uploading 4 fixture MP4s → trimming → configuring countdown order → selecting an SFX (e.g., "Suspicious") → clicking Generate → observing live SSE progress in Library → Completed state → downloading and verifying a valid MP4.
2. **Engine HTTP/SSE Boundary (Vitest + Engine Integration):**
   - Tests the engine's HTTP/SSE API and security invariants against an isolated `DATA_DIR`:
     - Safe path resolution rejecting `../` traversal and symlink escapes.
     - HTTP `206` Range streaming responses.
     - Pairing token enforcement (`401` when missing/invalid).
     - CORS rejection of unknown origins.
     - SFX filename prettification on real SFX filename patterns.
     - Atomic job claiming under concurrency.
     - End-to-end 3-clip render integration test verified via `ffprobe` (1080×1920, H.264 + AAC, 30 fps, duration within ±0.2 s of `computeDuration`).
   - Any optional Gemini AI voiceover tests stub only the outbound Gemini API client at the engine boundary.
3. **Composition Public Boundary (Vitest + Remotion `renderStill`):**
   - Tests the shared Composition package's exported functions and visual output:
     - `resolveOrder` (countdown, manual, seeded shuffle determinism, sync reset).
     - `computeDuration` (transition overlaps and voiceover hold).
     - `tiptapToSpans` conversion, caption 3-word chunking, and schema defaults/migration.
     - `renderStill` golden PNG snapshots at key frames (frame 0, mid-clip, transition, end).

### Prior Art
- None yet (greenfield repository). All test suites (Vitest unit/integration, Remotion `renderStill` snapshots, and Playwright E2E) will be established from scratch following the milestones in the plan.

## Out of Scope

- **Multi-user accounts, authentication servers, or cloud media storage:** RankStudio is strictly single-user with local storage and pairing-token protection.
- **Remote URL / social media clip importing:** Media import is local file upload only (MP4/MOV/WebM ≤ 500 MB).
- **Implementation of the other 7 tools in the sidebar:** Only Video Ranking, Library, and the sidebar shell are built; the remaining 7 tools are "Coming soon" placeholders.
- **100% in-browser / WebCodecs rendering mode (no-engine architecture):** Explicitly deferred/not selected for v1 in favor of the local engine architecture.
- **Safari support for GitHub Pages → localhost:** Safari blocks `https://` requests to `http://127.0.0.1`; only Chrome, Edge, and Firefox are supported for the hosted frontend.
- **AI-powered speech-to-text transcription for captions:** Captions are generated deterministically from the voiceover script timed across the voice audio duration.
- **Mobile/tablet editor layout:** The editor targets desktop viewports (minimum width 1024 px with a mobile warning).

## Further Notes

- **Milestone Delivery Order:**
  - **M1:** Repo scaffold, Engine core, Frontend shell (engine runs, SPA connects and pairs locally and on GitHub Pages, sidebar shell works).
  - **M2:** Shared Composition package, Editor layout & store, Title editor & canvas drag, General settings & playback order (live preview of default data with styling, dragging, settings, and order).
  - **M3:** Ingest job pipeline and Rank slots (upload → ingest → trim → all 6 tabs, local SFX folder, voice upload).
  - **M4:** Render job pipeline and Library (Generate → live Library progress → Completed → Download, View, Edit, Re-use Template, Delete).
  - **M5:** GitHub Pages deploy workflow, polish (shortcuts, empty states, toasts, unsaved guard, mobile warning, Tutorial), and optional Gemini AI voiceover.
- **Open Configuration Detail:** The plan assumes the GitHub repository name is `RankStudio` (setting Vite `base` to `/RankStudio/` and configuring `ALLOWED_ORIGINS` with `https://<your-user>.github.io`). If a different repository name or GitHub username is used, both values must be updated accordingly.
- **Local Sound Effects Directory:** Configured via `SFX_DIR` (quoted in `.env` because the path `/home/unss/Desktop/Sound Effects` contains a space; contains 21 `.mp3` files in a flat folder).
