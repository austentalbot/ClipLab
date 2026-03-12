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

**What:** Filters are always applied in registry order: gain → low-pass → high-pass → compressor → delay.

**Why:** Filter ordering changes signal semantics, not just the UI sequence. Gain before low-pass means the filter sees the boosted signal; low-pass before gain means you're boosting the already-filtered signal. The fixed order follows common audio processing conventions (level adjustment first, frequency shaping second, dynamics processing third, time-based effects last) and gives a predictable result that's easier to reason about.

**Alternatives:** Drag-and-drop reordering would give users more creative control, but adds significant UI complexity (drag state, reorder animations, order persistence) and requires users to understand signal flow to get good results. With five filters, the fixed order covers the sensible default.

## 5. Filesystem + JSON Persistence

**What:** Audio files are stored in `public/uploads/` and metadata in `data/clips.json`.

**Why:** Zero setup for reviewers — `npm install && npm run dev` is all that's needed. The JSON file is human-inspectable (easy to verify data integrity during review), and the data model is simple enough that a flat file handles it well. The tradeoff is accepting the lack of transactional guarantees and concurrent write safety, which is reasonable for a single-user demo.

**Deployment note:** Filesystem persistence does not work on serverless platforms like Vercel, where the filesystem is ephemeral and read-only at runtime. A database or object storage backend would be required for deployment beyond local development.

**Alternatives:** SQLite would add query capabilities and atomic writes but requires a native dependency. PostgreSQL would be appropriate for production multi-user scenarios but is overkill here and adds setup friction.

## 6. Chrome Desktop Target

**What:** The app targets Chrome desktop only and doesn't attempt cross-browser compatibility.

**Why:** Chrome has the most predictable `MediaRecorder` and `AudioContext` implementations. Other browsers differ in recorder codec support and in `AudioContext` lifecycle behavior around suspension and resume. Targeting Chrome avoids those cross-browser branches and keeps the codebase focused on the audio processing logic.

**Alternatives:** Progressive enhancement with feature detection and polyfills. Worth doing for a production app, but the effort-to-value ratio is low for a take-home where the reviewer will use Chrome.

## 7. State Machine via useReducer

**What:** Both the recorder hook and the page use explicit state machines (via `useReducer`) with named statuses like `idle`, `recording`, `recorded`, `uploading`.

**Why:** Explicit states prevent invalid transitions — the reducer prevents transitions into invalid states like recording and uploading happening simultaneously. Without this, rapid user clicks can trigger race conditions (e.g., clicking "Record" during permission request starts a second `getUserMedia` call). The reducer also makes the UI declarative: each status maps to exactly one UI view, with no ambiguous combinations. The upload path still uses a small ref guard in addition to the reducer to block duplicate saves before React re-renders.

**Alternatives:** Multiple boolean flags (`isRecording`, `isUploading`, `hasError`, etc.) — prone to impossible state combinations like `isRecording && isUploading`, and each new feature adds another flag that interacts with all existing flags.

## 8. AudioContext Creation and Resume

**What:** `AudioContext` instances are created eagerly when audio state appears (e.g., when filter state changes or a clip's waveform loads), but playback requires a user gesture to resume the context from its initial `suspended` state.

**Why:** The Web Audio API requires routing through an `AudioContext` for filtered playback, and browsers start every context in a `suspended` state until a user gesture occurs. The player creates the context and graph when filters are enabled so the chain is ready before the user presses play, then calls `resume()` inside the `play` event handler where the gesture requirement is satisfied. Waveform decoding also creates a short-lived context for `decodeAudioData`, which is closed immediately after decoding completes.

**Alternatives:** Deferring context creation until the first play gesture would avoid allocating resources for users who never press play, but would add a loading delay on first playback while the graph is built. The eager approach keeps playback instant at the cost of an `AudioContext` allocation that is cleaned up on unmount.

## 9. Shared MediaElement Playback

**What:** The record page preview and the clip detail page both use the same `<audio>`-based player. A native `<audio>` element provides transport controls, and a `MediaElementAudioSourceNode` routes playback through the filter chain when filters are enabled.

**Why:** This keeps the MVP simpler and more consistent. The same playback component works for in-memory blob URLs on the record page and persisted files on the detail page, while the browser handles play/pause/seek UI natively. That means there is one playback path to reason about, one set of playback lifecycle issues to manage, and no need to build custom transport controls.

**Alternatives:** A buffer-based playback path would give tighter control over decoded audio and could support reuse across filter updates, but for this MVP it adds a second playback model without enough user-facing benefit. Sticking to the shared `MediaElement` path is the more reasonable choice here.

## 10. Waveform Shows Raw Audio, Not Filtered

**What:** The waveform visualization shows peaks extracted from the raw (unprocessed) audio buffer. It displays a synced playhead via `timeupdate` but does not reflect applied filters, and does not support click-to-seek — the native `<audio>` element remains the sole transport control.

**Why:** Showing a filtered waveform would require rendering the audio through an `OfflineAudioContext` with the full filter chain every time filter parameters change. That's expensive, introduces visible latency on parameter adjustments, and adds significant complexity for a visual that users don't interact with. The waveform's purpose is to show the recording's shape and the current playback position — both are properties of the raw audio, not the filter chain.

An interactive (click-to-seek) waveform would require building custom transport controls and bidirectional sync between the waveform and the audio element, duplicating logic the browser already handles natively.

**Alternatives:** `OfflineAudioContext` rendering would produce an accurate filtered waveform but at the cost of per-change re-renders and a loading state while processing. A real-time `AnalyserNode` tapped into the playback graph would only work during active playback, not as a static preview.

## 11. Delay Tail Handling via Lifecycle Callbacks

**What:** `FilterNodeResult` supports optional `onStop` and `onPlay` callbacks. The delay filter zeros its feedback gain on stop and restores it on play, silencing the echo tail immediately when playback pauses.

**Why:** This keeps lifecycle logic co-located with the filter definition rather than leaking delay internals into the player. The player just calls the callbacks without knowing which filter needs them or why.

**Alternatives:** The player could special-case delay behavior, but that breaks the registry abstraction. Another option is disconnecting and reconnecting the delay node, but that would cause audible clicks and require rebuilding part of the graph.

## 12. Live Parameter Updates During Playback

**What:** When a user adjusts a filter slider during playback, the change is applied by setting `AudioParam.value` directly on the existing Web Audio nodes. The audio graph is only rebuilt when the set of enabled filters changes (e.g., toggling a filter on or off).

**Why:** Changing a slider like gain or cutoff does not require a new playback graph. The app already has the right node; it just needs to update that node's parameter. Doing this in place keeps playback continuous. Rebuilding the whole graph on every slider movement would tear down the current chain, create a new one, and cause a brief audible interruption.

The graph is only rebuilt when its structure changes, which in this app means the set of enabled filters changed. Plain parameter updates are handled separately through an `update` callback on each filter result. That callback lives next to `createNode` in the registry, so each filter owns both how it is created and how its live parameters are updated. The player does not need filter-specific logic; it just calls `result.update(params)`.

**Alternatives:** The simplest alternative is to rebuild the entire audio graph on every filter change, including slider updates. That would reduce the amount of filter-specific update logic, but it produces audible gaps during playback and makes parameter changes feel less responsive. Given the small number of supported filters, in-place updates are the better tradeoff here.
