# Crafty Clara

A contract rummy card game against computer opponents, built with TypeScript, React, Vite, Tailwind CSS, shadcn/ui and Motion.

The rules engine, the host that runs a game and the screen talk only through messages, so the game can later be played online. See `CLAUDE.md` for how it fits together.

## Getting started

Requires Node.js 20.19+ or 22.12+.

```
npm install
npm run dev
```

Then open http://localhost:5173.

## Scripts

| Command           | What it does                                      |
| ----------------- | ------------------------------------------------- |
| `npm run dev`     | Start the dev server with hot reload (`npm start` also works) |
| `npm run build`   | Build for production into `dist/`                |
| `npm run preview` | Serve the production build locally                |
| `npm test`        | Run the tests with Vitest in watch mode (`npm test -- --run` for a single run) |
| `npm run lint`    | Lint with oxlint                                  |
| `npm run typecheck` | Type-check with TypeScript                      |
