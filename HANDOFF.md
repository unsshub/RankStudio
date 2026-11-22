# RankStudio Handoff

**Last updated:** 2026-11-22  
**Branch:** `fix/top-reel-bare-too-big` (branched from `main` at `4ff1afc`)

---

## 1. Current State

### Uncommitted changes on `fix/top-reel-bare-too-big`
All changes below are implemented, built (`@rankstudio/composition`), and verified, but **not yet committed**:

1. **Slimmer top bar & tighter title layout**
   - `packages/composition/src/schema.ts`:
     - Default `general.videoHeightPct` changed from `80` → `88` (reduces default top bar from `20%` to `12%`).
     - Default `title.position.y` changed from `8` → `2.5` (fits cleanly inside the `12%` top bar).
     - Default `numbers.y` changed from `24` → `18`.
   - `packages/composition/src/layers/TitleLayer.tsx`:
     - Tightened `lineHeight` from `1.15` → `1.1`.
   - `apps/web/src/features/ranking/settings/GeneralSettings.tsx`:
     - Updated **Video Height** label to also display the resulting top bar size (`(bar X%)`).

2. **Configurable vertical spacing between rank numbers**
   - `packages/composition/src/schema.ts`:
     - Added `numbers.gap` (`min: 0`, `max: 200`, default `28` px, up from hardcoded `14px`). Existing saved projects automatically receive `gap: 28` via `migrate()`.
   - `packages/composition/src/layers/RankList.tsx`:
     - Replaced hardcoded `gap: "14px"` with `gap: \`${project.numbers.gap}px\``.
   - `apps/web/src/features/ranking/settings/NumberDrag.tsx`:
     - Added a **Spacing** range slider (`0px–160px`, step `2`) in **Rank Numbers Position**.

3. **Tests**
   - `packages/composition/src/logic/composition.test.ts`:
     - Updated default assertions (`videoHeightPct: 88`, `title.position.y: 2.5`, `numbers.gap: 28`) and verified `migrate()` backfills `numbers.gap`.

### Earlier fix already in HEAD (`4ff1afc`)
- Split pure font metadata (`FontOption`, `FONT_LIST`, `resolveFontFamily`) into `packages/composition/src/fontList.ts` so `apps/engine` (Node ESM via `tsx`) does not crash with `ERR_UNKNOWN_FILE_EXTENSION: ".css"` when importing `@rankstudio/composition`. Font CSS imports remain in `packages/composition/src/fonts.ts` (loaded by `apps/web/src/main.tsx` and `packages/composition/src/Root.tsx`).

### Untracked files
- `bar-too big.png` — reference screenshot showing the original oversized top bar and tight rank number spacing. Remove or move out of the repo before committing.

---

## 2. How to Run Locally

```bash
# If .env files are missing:
cp .env.example .env
cp apps/web/.env.example apps/web/.env

# Start both Vite web app (port 5173) and local Fastify engine (127.0.0.1:4000):
npm run dev
```

- Open **`http://localhost:5173/RankStudio/`** in Chrome/Edge/Firefox.
- Copy the **Pair code** (or click the **Pair link**) printed by the engine in the terminal.
- If you edit `packages/composition`, rebuild it with `npm -w packages/composition run build` so `apps/engine` picks up the compiled `dist/` files.

---

## 3. Verification Status

Last run passed cleanly on all checks:
- `npm -w packages/composition run build` — passed
- `npm run typecheck` — passed
- `npm run lint` — passed
- `npm run test` — 18/18 tests passed (`composition.test.ts` + `engine.test.ts`)

Not yet re-run on this branch:
- `npm run test:render` (full Remotion MP4 render smoke test)
- `npm run e2e` (Playwright E2E)

---

## 4. Next Steps When Returning

1. Visually verify the updated top bar and **Spacing** slider in the browser (`http://localhost:5173/RankStudio/`).
   - Note: for projects already saved in SQLite before this change, `numbers.gap` defaults to `28px` automatically, while `videoHeightPct` and `title.position.y` retain their saved values (adjust them via **Video Height** and **Drag Title** if desired).
2. Remove `bar-too big.png` (and `HANDOFF.md` if you don't want it tracked in git) before committing.
3. Optionally run `npm run test:render` to confirm Remotion render output matches the live preview.
4. Commit and merge `fix/top-reel-bare-too-big` into `main`.
