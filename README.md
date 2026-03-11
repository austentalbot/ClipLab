# ClipLab

ClipLab is a basic Next.js project setup for a browser-based audio app.

## Setup

1. Install dependencies with `npm install`.
2. Run `npm run dev`.
3. Open `http://localhost:3719`.

## Tooling

- `npm run lint`: run ESLint
- `npm run lint:fix`: auto-fix ESLint issues
- `npm run format`: run Prettier and sort Tailwind classes
- `npm run format:check`: verify formatting
- Pre-commit hooks run `lint-staged` on staged files
- VS Code workspace settings enable format-on-save and ESLint fixes on save

## Included

- Next.js 14 App Router with TypeScript
- Tailwind CSS setup
- shadcn/ui baseline config
- Basic browser audio recording
- Basic route setup for `/`, `/clips`, and `/clips/[id]`
- API route stubs for `/api/clips` and `/api/clips/[id]`

## Browser target

Chrome desktop
