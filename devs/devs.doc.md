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
| Languages | English (the default) and Persian, with `i18next` + `react-i18next`. The language is the first part of the address: `/en/...`, `/fa/...`. |
| Calendar maths | `jalaali-js` for the Persian calendar; the browser's own `Date` for the Gregorian one |
| Fonts | Vazirmatn for Persian and Inter for English, both free and served by the site itself from `@fontsource-variable` packages |
| Icons | `react-icons` only (Font Awesome 5 Free and Tabler sets), drawn as SVG through the `Icon` component. No CDN and no icon font since 2026-10-13 |
| Styling | Plain CSS files and CSS Modules, mixed. No CSS framework. |

## Layout

*Updated 2026-10-12.*

| Path | Contents | Doc |
| --- | --- | --- |
| `src/` | All application code. Start with "Two languages" in its doc. | [src.doc.md](src/src.doc.md) |
| `public/` | Only `favicon.svg`, the tab icon: the mark of the Rahi logo (since 2026-10-13). | — |
| `index.html` | The single HTML page. It declares the site light-only (`color-scheme`), see [assets.doc.md](src/assets/assets.doc.md). Its `lang`, `dir` and `<title>` are the English ones; the page sets the real ones as soon as it knows the language. | — |
| `package.json` | Scripts and dependencies. | — |
| `tsconfig*.json`, `vite.config.ts`, `.eslintrc.cjs` | Tool settings, all Vite defaults. | — |
| `README.md` | The untouched Vite template README. Says nothing about this project. | — |

## Commands

*Updated 2026-10-12.*

```bash
npm install
npm run dev      # starts on http://localhost:5173 and opens the English site at /en/
npm run build    # runs tsc first, then the Vite build — passes
npm run lint     # 0 errors, 0 warnings
npx tsc --noEmit # 0 errors
```

Before this date the numbers were 13 type errors, 29 lint errors and 16 lint warnings, and the
build failed.

The site expects the Go backend on `http://localhost:8080`. To point it elsewhere, create
`devs/.env.local` containing `VITE_API_URL=http://localhost:18080` (or whatever address you use).

## The name

*Written 2026-10-13.*

The website is called **Rahi** (Persian: راهی, "on one's way"). It is modelled on the real
site Safar724, whose design it copies on purpose; it no longer carries that site's name, logo,
phone number or company claims. The repository folder and `Safar724.doc.md` keep their names.

## Bundle size

*Updated 2026-10-12.*

`npm run build` gives one JavaScript file of **334.01 kB (109.05 kB gzipped)** and one
stylesheet of 53.61 kB (11.06 kB gzipped), measured after the narrow-screen results list and
the remembered passengers were added.

| When | JavaScript | Gzipped |
| --- | --- | --- |
| City list still bundled in | 480.66 kB | 115.01 kB |
| City list from the API | 219.27 kB | 70.96 kB |
| Booking pages added | 243.52 kB | 78.79 kB |
| Two languages (2026-10-12) | 331.66 kB | 108.19 kB |
| Real refund terms on the card, remembered passengers (2026-10-12) | 334.01 kB | 109.05 kB |
| Own name and logo (2026-10-13) | 333.77 kB | 108.94 kB |
| Free font, own drawings, icons as SVG (2026-10-13) | 348.97 kB | 113.29 kB |

The two-languages step cost 88 kB (29 kB gzipped): the `i18next` and `react-i18next` libraries, and the
two text files, about 15 kB each. Both text files travel to every visitor. Loading only the
one in use would save about 5 kB gzipped and make the language switch wait for a download; it
was not worth it at this size.

The last step added 15 kB of script (4 kB gzipped), which is the 34 icons as SVG, and 6 kB of
stylesheet, which is the four drawings written into it. In exchange the whole build went from
782 kB in 15 files to 632 kB in 8 files, and the page no longer fetches the Font Awesome
stylesheet and its font file from a CDN.

The build also emits four font files: Inter (48 kB for Latin, 85 kB for Latin with accents)
and Vazirmatn (46 kB for Persian, 35 kB for Latin). A browser downloads one only when a page
shows a letter from it. (updated 2026-10-13)

## Packages

*Updated 2026-10-12.*

- Added `@types/jalaali-js`, the type definitions for the calendar library.
- Removed `styled-components` and `persian-date`: installed but never imported.
- Added `i18next` and `react-i18next` (2026-10-12): the text files and the `t()` function.
- Added `@fontsource-variable/inter` (2026-10-12): the Inter font as files inside the project,
  so no outside font host is needed. Only two of its files are used; see
  [assets.doc.md](src/assets/assets.doc.md).
- Added `@fontsource-variable/vazirmatn` (2026-10-13): the free Persian font, in place of the
  paid IRANSans files.
- Removed `jotai`: after the data-flow cleanup nothing used it any more. Every value it held
  is now state in one page, passed down by props. If two far-apart components ever need the
  same value again, `npm i jotai` brings it back.

## Problems

*Updated 2026-10-12.*

- `index.html` is one file for both languages and is written for English. A few lines of
  script in its head set the language, the direction and the Persian tab title for a `/fa`
  address before anything is drawn, so the English title no longer shows for a moment. A
  search engine that does not run JavaScript still sees only the English title. The Persian
  title is written twice: there and in `src/locales/fa.json`.
- No tests and no test runner installed.
- The `.gitignore` here ends with `**/.env*`.
