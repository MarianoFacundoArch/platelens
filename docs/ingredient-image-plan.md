# Ingredient Image Generation Plan

Plan for showing ingredient thumbnails when available, silently queuing generation for missing ones, and running image creation in the background with OpenAI `gpt-image-1`. Optimized for Firebase + local emulator parity.

## Goals and Constraints
- Show thumbnails only when already generated; never block the response on image creation.
- Background worker handles generation; HTTP handlers stop immediately after enqueueing.
- Deterministic storage paths for easy manual inspection; safe against duplicate generations.
- Manual regeneration supported later without TTL-based churn.

## Data Model
- Firestore `ingredients/{ingredientId}` (new):
  - `displayName` (verbatim from AI/user), `canonicalName` (normalized for lookups).
  - `slug` (derived from `canonicalName`), `imageStatus` enum `queued|generating|ready|failed`.
  - `imageUrl` (gs:// or https Storage URL), `storagePath`, `lastGeneratedAt`, `createdAt`, `updatedAt`.
  - Optional `aliases` for alternate spellings.
- Firestore `image_jobs/{ingredientId}` (one doc per ingredient):
  - `status` enum `queued|generating|ready|failed`, `error` (string), `attempts` (number), `updatedAt`.
- Storage path: `ingredients/<slug>__<ingredientId>.png` to stay human-readable while collision-safe.

### Slug helper (deterministic, ASCII)
```ts
export function slugifyForIngredient(name: string, id: string) {
  const slug = name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return { slug, filename: `ingredients/${slug}__${id}.png` };
}
```
Use `ingredientId` as the stable key for dedupe; never rely on the slug for uniqueness.

## Request-Time Behavior (API/UI)
- When returning ingredient lists (scan response, meal history, etc.):
  - If `imageUrl` exists and file is present → include it in payload.
  - If `imageStatus` is `queued|generating` → return no image and do not re-queue.
  - If missing/failed → enqueue job and return no image.
- Enqueue by writing `image_jobs/{ingredientId}` with `status='queued'` (idempotent because doc ID is fixed). Also set `ingredients.imageStatus='queued'`.
- If `imageStatus='ready'` but the file is missing, treat as missing and enqueue.

## Worker Design (Firestore-triggered)
- Trigger: `onDocumentWritten('image_jobs/{ingredientId}')` in a new Functions module (e.g., `functions/src/jobs/ingredientImages.ts`).
- Flow:
  1) In a transaction, bail if status is not `queued`; otherwise set job `status='generating'` and ingredient `imageStatus='generating'`.
  2) Fetch ingredient doc; if missing, mark job `failed` with error.
  3) Generate image via OpenAI `gpt-image-1` with a concise prompt using `displayName` (or `canonicalName`), requesting a neutral thumbnail on white/soft background.
  4) Save PNG to `storagePath` (`ingredients/<slug>__<id>.png`), set `Cache-Control` reasonable for CDN (e.g., `public,max-age=31536000`).
  5) Update ingredient: `imageUrl` (download URL or gs:// path), `imageStatus='ready'`, `lastGeneratedAt`.
  6) Update job `status='ready'`, clear `error`. On failure: set `status='failed'`, increment `attempts`, store `error`.
- Concurrency/dedupe: single doc per ingredient + transactional state change prevents duplicate runs. If two jobs race, deterministic filename means last write wins without fan-out.

## Manual Regeneration
- Admin/API action: clear `imageUrl`, set `ingredients.imageStatus='queued'`, `lastGeneratedAt` untouched/updated as needed, and overwrite `image_jobs/{id}` with `status='queued'`. Same pipeline runs; filename stays stable. Avoid TTL auto-refresh until needed.

## Local Development
- Use Firebase Emulator Suite for Firestore + Functions + Storage. The Firestore trigger fires locally.
- Keep OpenAI key in `.env` when you want real images; otherwise stub the OpenAI call inside the worker with a placeholder PNG when `env.MOCK_OPENAI_IMAGES=true`.
- Manual test: write `ingredients/{id}` + `image_jobs/{id}` via `firebase emulators:start` shell or a small script; observe Storage bucket in emulator UI.

## Implementation Plan in Repo
1) Add slug helper (e.g., `functions/src/lib/slug.ts`) and Firestore types for `IngredientDoc`/`ImageJobDoc`.
2) Create worker module `functions/src/jobs/ingredientImages.ts` exporting the Firestore trigger; wire export in `functions/src/index.ts`.
3) Update HTTP handlers that emit ingredient lists (`handlers/scan.ts`, any aggregators) to upsert `ingredients/{id}` with names/slug and enqueue `image_jobs/{id}` when missing/failed.
4) Extend API responses to include optional `imageUrl` per ingredient when already `ready` (do not await generation). Frontend shows image when present; otherwise renders nothing/placeholder.
5) Add an admin endpoint or console script for manual regeneration/reset (write `status='queued'`, optionally clear `imageUrl`).
6) Logging/alerts: log job transitions and errors; consider a simple dashboard query for `image_jobs` where `status='failed'` or high `attempts`.

## Re-evaluation: Risks and Adjustments
- **Stable IDs vs. names (critical):** UI scan payloads only have ingredient names today. Before enqueueing, create/lookup a stable ingredient doc by a deterministic key (e.g., `id = <canonicalName>__<shortHash>` or a generated UUID stored alongside `canonicalName` + `aliases`). Do NOT use the raw name as the ID; names can change. If you later merge duplicates, keep the ID stable and update `canonicalName`/`aliases`.
- **Cost/abuse guard:** Add a simple allowlist/threshold so you don’t enqueue images for every long-tail ingredient. Options: only queue when an ingredient appears >N times or when explicitly flagged `needsImage=true`.
- **Trigger loop safety:** The Firestore trigger must exit unless `before.status !== 'queued' && after.status === 'queued'`. This prevents re-runs on `ready → ready` writes or error updates. Also ignore deletes.
- **Retries/backoff:** Cap attempts (e.g., 3) with exponential backoff; on permanent failure set `status='failed'` and require manual reset. Prevents hot-looping on bad prompts or quota errors.
- **Storage cleanup on rename:** Because the filename includes the slug prefix, a rename could leave an orphaned file if you choose to write a new path. Preferred: keep path stable (`slug` recomputed but same `<slug>__<id>.png` prefix because ID keeps the suffix unique) and overwrite in place; or track `storagePath` on the doc and delete the old path when you change it.
- **File existence checks:** Avoid per-request Storage lookups; trust `imageStatus`. Instead, add a periodic sweeper (or admin tool) that scans `ingredients` with `imageStatus='ready'` and verifies the file exists, re-queuing if missing.
- **Security:** Only allow enqueue from trusted backend paths; don’t expose a public write to `image_jobs`. Rate-limit enqueues per user/session to avoid spam hitting OpenAI.
- **Image consistency:** Use a fixed prompt template and size. Always downscale to the app’s display size to control bandwidth.

## Prompt Notes
- Model: `gpt-image-1` default. Generate 1024x1024 square; downscale to 512–768 square for UI if desired.
- Prompt hint: “High-quality ingredient thumbnail of <displayName>, isolated on clean white background, centered, no text.”
- Keep deterministic style to avoid mismatched UI (same prompt/size each time).

## OpenAI Image API Details (for `gpt-image-1`)
- Use square generation (`size: "1024x1024"`) to avoid aspect warping; if smaller thumbs are needed, downscale to 512x512 on save (no upscaling).
- Request shape (Node):
```ts
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const prompt = `High-quality ingredient thumbnail of ${displayName}, isolated on a clean white background, centered, no text, no watermark.`;
const response = await openai.images.generate({
  model: "gpt-image-1",
  prompt,
  size: "1024x1024",   // square; default size is square
  quality: "medium",   // options: low | medium | high | auto (default)
});
const b64 = response.data[0].b64_json; // base64 PNG by default
// Optionally resize to 512x512 before upload if thumbs are small in UI.
```

## Why Firestore Queue (vs Cloud Tasks/Pub/Sub)
- Emulator-friendly: Firestore + Functions work locally without extra services.
- Dedupe by doc ID; easy status inspection in console.
- HTTPS handlers stay fast because work is delegated to the trigger; no reliance on long-lived HTTP executions.
