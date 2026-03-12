# Architecture Decisions

## 1. Raw Audio + Filter Config (Non-Destructive)

**What:** Clips store the original unprocessed audio alongside a JSON filter configuration. Filters are applied in real-time during playback.

**Why:** Applying filters destructively at save time would remove the most interesting part of the system — the live filter chain. It would also require rendering the processed result with `OfflineAudioContext` and then encoding that rendered output into a file format, adding complexity and slowing down uploads. Storing raw audio keeps saves fast (just write the blob to disk) and preserves the ability to revisit and adjust filter settings after saving.

**Alternatives:** Baking filters into the audio at save time would simplify the playback path (just play a static file) but makes the result destructive and irreversible. A hybrid approach (store both raw and rendered) doubles storage for marginal benefit in a single-user tool.

## 2. Filter Registry Pattern

**What:** A single `filterRegistry` array in `lib/audio/filter-registry.ts` defines everything about each filter: UI metadata, default values, parameter ranges, and Web Audio node construction.

**Why:** The registry is the single source of truth for filter behavior across the system:

```
registry → UI slider generation → graph construction → basic API validation → detail page display
```

This means adding a new filter is a single registry entry. The UI controls, default state, basic server-side validation, and audio node creation all derive from the same definition, so they can't drift out of sync.

**Alternatives:** Separate config files for UI and audio processing (more flexible for teams with different owners, but harder to keep in sync in a small codebase where one person owns everything).

## 3. MediaRecorder for Capture, Web Audio API for Playback

**What:** Recording uses the `MediaRecorder` API to capture raw audio. Preview and playback use `AudioContext` / Web Audio API for real-time filter processing. Live monitoring (hearing your mic through the filter chain while recording) is intentionally not implemented.

**Why:** Clean separation of concerns. `MediaRecorder` is the simplest path to a finished blob — no manual buffer management, no encoding pipeline. Web Audio API provides the low-level graph needed for real-time filter chains during playback.

Live monitoring would require routing the microphone through Web Audio during recording, which introduces echo management (the user hears themselves with latency), feedback risks with the delay filter, and significantly more lifecycle complexity around simultaneous capture and playback graphs. Since the core goal is demonstrating filter chains during playback, monitoring was intentionally deferred.

**Alternatives:** Using Web Audio API for both capture and processing gives maximum control but requires `AudioWorklet`-style buffer capture, manual WAV/WebM encoding, and careful resource management — substantial complexity for a feature (live monitoring) that wasn't in scope.

## 4. Fixed Filter Order in Signal Chain

**What:** Filters are always applied in registry order: gain → low-pass → high-pass → delay.

**Why:** Filter ordering changes signal semantics, not just the UI sequence. Gain before low-pass means the filter sees the boosted signal; low-pass before gain means you're boosting the already-filtered signal. The fixed order follows common audio processing conventions (level adjustment first, frequency shaping second, time-based effects last) and gives a predictable result that's easier to reason about.

**Alternatives:** Drag-and-drop reordering would give users more creative control, but adds significant UI complexity (drag state, reorder animations, order persistence) and requires users to understand signal flow to get good results. With four filters, the fixed order covers the sensible default.

## 5. Filesystem + JSON Persistence

**What:** Audio files are stored in `public/uploads/` and metadata in `data/clips.json`.

**Why:** Zero setup for reviewers — `npm install && npm run dev` is all that's needed. The JSON file is human-inspectable (easy to verify data integrity during review), and the data model is simple enough that a flat file handles it well. The tradeoff is accepting the lack of transactional guarantees and concurrent write safety, which is reasonable for a single-user demo.

**Alternatives:** SQLite would add query capabilities and atomic writes but requires a native dependency. PostgreSQL would be appropriate for production multi-user scenarios but is overkill here and adds setup friction.

## 6. Chrome Desktop Target

**What:** The app targets Chrome desktop only and doesn't attempt cross-browser compatibility.

**Why:** Chrome has the most predictable `MediaRecorder` and `AudioContext` implementations. Other browsers differ in recorder codec support and in `AudioContext` lifecycle behavior around suspension and resume. Targeting Chrome avoids those cross-browser branches and keeps the codebase focused on the audio processing logic.

**Alternatives:** Progressive enhancement with feature detection and polyfills. Worth doing for a production app, but the effort-to-value ratio is low for a take-home where the reviewer will use Chrome.

## 7. State Machine via useReducer

**What:** Both the recorder hook and the page use explicit state machines (via `useReducer`) with named statuses like `idle`, `recording`, `recorded`, `uploading`.

**Why:** Explicit states prevent invalid transitions — the reducer prevents transitions into invalid states like recording and uploading happening simultaneously. Without this, rapid user clicks can trigger race conditions (e.g., clicking "Record" during permission request starts a second `getUserMedia` call). The reducer also makes the UI declarative: each status maps to exactly one UI view, with no ambiguous combinations. The upload path still uses a small ref guard in addition to the reducer to block duplicate saves before React re-renders.

**Alternatives:** Multiple boolean flags (`isRecording`, `isUploading`, `hasError`, etc.) — prone to impossible state combinations like `isRecording && isUploading`, and each new feature adds another flag that interacts with all existing flags.

## 8. Lazy AudioContext Creation

**What:** `AudioContext` is created on first user interaction (first preview or playback), not at component mount.

**Why:** Browsers block `AudioContext` playback until a user gesture has occurred. Creating the context eagerly at mount produces a suspended context that may not resume reliably. Creating it lazily inside the first play/preview action guarantees the gesture requirement is satisfied, and avoids allocating audio resources for users who navigate away without ever playing audio.

**Alternatives:** Creating at mount and calling `resume()` on first interaction. This works but leaves a suspended context sitting in memory and adds another state to manage (context exists but isn't usable yet).

## 9. Shared MediaElement Playback

**What:** The record page preview and the clip detail page both use the same `<audio>`-based player. A native `<audio>` element provides transport controls, and a `MediaElementAudioSourceNode` routes playback through the filter chain when filters are enabled.

**Why:** This keeps the MVP simpler and more consistent. The same playback component works for in-memory blob URLs on the record page and persisted files on the detail page, while the browser handles play/pause/seek UI natively. That means there is one playback path to reason about, one set of playback lifecycle issues to manage, and no need to build custom transport controls.

**Alternatives:** A buffer-based playback path would give tighter control over decoded audio and could support reuse across filter updates, but for this MVP it adds a second playback model without enough user-facing benefit. Sticking to the shared `MediaElement` path is the more reasonable choice here.
