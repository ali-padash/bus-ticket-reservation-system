# devs/src/assets

Static files: styles, fonts, icon fonts and images. This doc covers the four subfolders together,
since none of them contain logic.

## `css/` — 30 files

*Updated 2026-10-12.*

Two styles are mixed:

- **Plain CSS** (`*.css`, 17 files). Class names are global, for example `.search-panel`.
- **CSS Modules** (`*.module.css`, 13 files). Class names are local to the importing component.

`index.css` is the global sheet. It declares the fonts, the scrollbar look, and shared helper
classes such as `.black-cover`, `.element-cover`, `.unselectable` and `.seat`.

### One look, no dark theme

`index.css` starts the page with `color-scheme: only light`, a white background and black
text on `:root`, and `index.html` carries the matching `<meta name="color-scheme">` tag.

Why: many sections set no background or text colour of their own. They relied on the
browser's default white page. When the browser or system is in dark mode that default can be
dark, and those sections (the results list was the visible one) turned black with dark text
on top. Saying "this page is light only" and writing the two base colours out fixes every
such section at once, instead of adding a background to each. This was already the case in
the original version (`v1-original` has the same CSS); it was not caused by the refactor.

Each other file is named after the component that uses it (`panel.module.css` → `Panel.tsx`).
`expandableCard.css` also holds the styles for `ExpandableCard2`.

## `fonts/`

Three weights of **IRANSansWeb**.

## `icons/`

- `Simple-Line-Icons.woff` — an open-source icon font.
- `line-icons-custom.woff` — a custom icon font, used through classes like `icon-location`.

Font Awesome is not here; it is loaded from a CDN in `index.html`.

## `images/`

| File | Used by |
| --- | --- |
| `logo.png` | `LowerNavbar` |
| `logoWhite.282e17b9.svg` | `UpperNavbar`, `Sidebar` |
| `logo-transparent.png` | `BusLoading` |
| `header.png` | landing page background (from CSS) |
| `BusFront.png` | `BusSchema` |
| `CompanyDefaultLogo.png` | `Panel`, when a company logo fails to load |
| `reserve.svg`, `bus_dash.svg`, `calender.svg`, `volume.svg` | `TicketModel` |

## Problems

- **Licensing.** The logos and most images belong to Safar724; the hash in
  `logoWhite.282e17b9.svg` shows it was saved from their built site. IRANSans is a paid font.
  Copying the site's look is the point of the project and is fine; these specific files are the
  part to replace, with an own logo and a free font such as Vazirmatn.
- Global plain-CSS class names can clash. Generic names like `.container`, `.row`, `.grid`,
  `.selected` and `.show` are used in several files.
- Colours are repeated as raw hex values everywhere. There are no CSS variables.
- Right-to-left is set with inline `style={{ direction: "rtl" }}` on single components instead
  of once on `<html>`.
- Typos in file and class names: `calender.svg`, `cardWithIconVerticall.css`, `seperator-line-*`.
- The README says Tailwind CSS is used. No Tailwind exists in this project.
