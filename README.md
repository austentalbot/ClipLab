# ClipLab

ClipLab is a browser-based audio recording and processing tool built with Next.js. Record audio from your microphone, apply real-time filters (gain, low-pass, high-pass, delay), preview the result, and save clips with their filter configurations for non-destructive playback later.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3719](http://localhost:3719) in Chrome.

## Available Scripts

| Script                 | Description                            |
| ---------------------- | -------------------------------------- |
| `npm run dev`          | Start development server               |
| `npm run build`        | Production build                       |
| `npm test`             | Run Jest test suite                    |
| `npm run typecheck`    | Type-check with `tsc --noEmit`         |
| `npm run lint`         | Run ESLint                             |
| `npm run lint:fix`     | Auto-fix ESLint issues                 |
| `npm run format`       | Run Prettier and sort Tailwind classes |
| `npm run format:check` | Verify formatting                      |

## Architecture

```
Record page (app/page.tsx)
  ├── useRecorder hook — MediaRecorder capture
  ├── pageReducer — state machine for UI flow
  └── FilterPanel — filter controls bound to filter registry

Upload flow:
  Browser → POST /api/clips (formData) → filesystem + JSON metadata

Playback:
  /clips/[id] → FilteredAudioPlayer → MediaElementSource → filter graph → speakers
```

**Filter registry** (`lib/audio/filter-registry.ts`) is the single source of truth for available filters. It defines the UI controls, default values, parameter ranges, and Web Audio node creation for each filter type.

## Storage Model

- **Audio files:** `public/uploads/*.webm` — raw recordings stored as-is
- **Metadata:** `data/clips.json` — clip titles, durations, filter configurations, timestamps

Clips store the raw audio alongside the filter configuration, enabling non-destructive replay with different settings.

## Browser Target

Chrome desktop. The app uses `MediaRecorder` and `AudioContext` APIs that have the most consistent behavior in Chrome.

## Intentionally Out of Scope

- Database persistence (filesystem + JSON is appropriate for a single-user tool)
- User authentication
- Waveform visualization
- Mobile / cross-browser support
- Pre-processed audio export

## Next Steps

If this project were to continue, natural next additions would be:

- Waveform visualization during recording and playback
- Additional filters (reverb, compressor, EQ)
- Cross-browser support (Safari, Firefox)
- Database persistence (SQLite or PostgreSQL)
- User accounts and sharing
- Audio export with filters baked in
