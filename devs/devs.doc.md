# devs

The website. The folder is called `devs` for historical reasons; `frontend` would be clearer.

## Stack

*Updated 2026-10-12.*

| Thing | Choice |
| --- | --- |
| Framework | React 18 |
| Language | TypeScript 5 (strict mode on) |
| Build tool | Vite 5 |
| Routing | React Router 6 |
| Shared state | None. State lives in the page that owns it and goes down by props; the search lives in the address. |
| Calendar maths | `jalaali-js` (Persian calendar) |
| Icons | `react-icons` (one icon), Font Awesome 5 from a CDN, and two icon font files |
| Styling | Plain CSS files and CSS Modules, mixed. **Not Tailwind**, despite the root README. |

## Layout

| Path | Contents | Doc |
| --- | --- | --- |
| `src/` | All application code. | [src.doc.md](src/src.doc.md) |
| `public/` | Only `vite.svg`, the default Vite icon. | — |
| `index.html` | The single HTML page. | — |
| `package.json` | Scripts and dependencies. | — |
| `tsconfig*.json`, `vite.config.ts`, `.eslintrc.cjs` | Tool settings, all Vite defaults. | — |
| `README.md` | The untouched Vite template README. Says nothing about this project. | — |

## Commands

*Updated 2026-10-12.*

```bash
npm install
npm run dev      # starts on http://localhost:5173
npm run build    # runs tsc first, then the Vite build — passes
npm run lint     # 0 errors, 0 warnings
npx tsc --noEmit # 0 errors
```

Before this date the numbers were 13 type errors, 29 lint errors and 16 lint warnings, and the
build failed.

The site expects the Go backend on `http://localhost:8080`. To point it elsewhere, create
`devs/.env.local` containing `VITE_API_URL=http://localhost:18080` (or whatever address you use).

## Packages

*Written 2026-10-12.*

- Added `@types/jalaali-js`, the type definitions for the calendar library.
- Removed `styled-components` and `persian-date`: installed but never imported.
- Removed `jotai`: after the data-flow cleanup nothing used it any more. Every value it held
  is now state in one page, passed down by props. If two far-apart components ever need the
  same value again, `npm i jotai` brings it back.

## Problems

*Updated 2026-10-12.*

- `index.html` still has `<title>Vite + React + TS</title>` and `lang="en"`. The site is Persian
  and right-to-left, so it should be `lang="fa" dir="rtl"`.
- Font Awesome is loaded from a CDN at runtime, so icons vanish offline.
- No tests and no test runner installed.
- The `.gitignore` here ends with `**/.env*`.
