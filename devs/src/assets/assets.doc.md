# devs/src/assets

Static files: styles, fonts, icon fonts and images. This doc covers the four subfolders together,
since none of them contain logic.

## `css/` — 31 files

*Updated 2026-10-12.*

Two styles are mixed:

- **Plain CSS** (`*.css`, 19 files). Class names are global, for example `.search-panel`.
- **CSS Modules** (`*.module.css`, 12 files). Class names are local to the importing component.

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

### One set of rules for both writing directions

*Written 2026-10-12.*

The page's direction is set once, as `dir` on `<html>` (`rtl` for Persian, `ltr` for English),
and the stylesheets follow it. Before this date the page itself was left-to-right and 29
places (CSS rules and inline styles) switched single blocks to `direction: rtl`. One is left,
the bus, on purpose.

**Sides are named by reading order, not by left and right.** `margin-inline-start` is the
margin on the side where reading starts: the right in Persian, the left in English. So one
rule serves both languages, and the English page comes out as the mirror image of the Persian
one without a second stylesheet. The same goes for `padding-inline-*`, `inset-inline-*`
(in place of `left` and `right`), `border-inline-*`, `text-align: start` and `float: inline-end`.

How the old rules were turned over, so that Persian stayed pixel for pixel where it was:

| Before | After | Why |
| --- | --- | --- |
| `right: 10%`, `margin-right`, `padding-right` | `inset-inline-start`, `margin-inline-start`, `padding-inline-start` | In Persian the right is where reading starts. |
| `left: ...`, `margin-left`, `float: left` | `inset-inline-end`, `margin-inline-end`, `float: inline-end` | |
| `text-align: right` | `text-align: start` | |
| A flex row in a part that was left-to-right | `flex-direction: row-reverse` | Those rows were drawn from the far side; `row-reverse` says so for both directions. |
| `transform: translateX(12px)` | `translateX(calc(12px * var(--x)))` | A transform has no logical form. `--x` is 1 in Persian and -1 in English. |
| `border-radius: 0 5px 5px 0` | `border-start-start-radius`, `border-end-start-radius` | The rounded corners follow the reading side. |

Two variables on `:root` in `index.css` carry what differs: `--font` (IRANSans, or Inter with
IRANSans behind it) and `--x`.

Left as they are, on purpose:

- **Centring and full-width rules** (`left: 50%`, `left: 0; width: 100%`): the same in both directions.
- **The bus** (`busSchema.module.css`): its direction is fixed, so it is drawn front-left in
  both languages. It is a picture of a real thing.
- **The four "why trust us" cards** (`positivePoints.css`): a grid cannot be reversed like a
  flex row, so the grid's direction is fixed and each card gets a `dir` attribute.
- **The phone number in the phone menu** (`sidebar.css`): it has its own `dir="ltr"`, and a
  logical property follows the element's own direction, so its side is written out once per
  direction with `:root[dir="ltr"]`.
- **The free-seat count on a trip card** (`panel.module.css`): placed by a fixed distance that
  fits the Persian label; in English it simply follows the label.
- **The landing picture** (`homeHeader.module.css`): flipped in English, so the bus in it stays
  clear of the search form, which moves to the other side. The picture has no text in it.

Arrows that point sideways are not handled in CSS: the components choose the icon that points
the right way (see `icons` in `util/useLocale.ts`). One icon without a mirrored twin gets the
class `mirror-in-ltr`.

Each other file is named after the component that uses it (`panel.module.css` → `Panel.tsx`).
The exception is `booking.module.css` (added 2026-10-12), which is shared by the two booking
pages and their ten components: frame, step line, forms, buttons and the small result pages.
`expandableCard.css` also holds the styles for `ExpandableCard2`.

### Narrow screens on the results page

*Written 2026-10-12.*

The results page had no layout below about 1000px. It now has two steps, in the files of the
parts themselves:

| Width | What changes | File |
| --- | --- | --- |
| up to 1000px | A trip card puts the route on its own line; the time, the price and the button share the next. | `panel.module.css` |
| up to 600px | The search bar has two lines (the two cities, then the date and the button) and no headings; the three menus wrap. | `searchPanel.css`, `filterSearch.css` |
| up to 560px | The card's button goes under the time and the price, full width; the logo is smaller. | `panel.module.css` |
| up to 530px | The list and the day tabs follow the screen's width, not a 500px minimum, so the page no longer scrolls sideways. | `servicesDisplay.module.css`, `daysTab.css` |

Nothing above 1000px was touched, so the desktop pages look as before.

## `fonts/`

*Updated 2026-10-12.*

Three weights of **IRANSansWeb**, the font of the Persian pages.

The English pages use **Inter**. Its files are not in this folder: they come from the
`@fontsource-variable/inter` package and are declared in `css/index.css`, so the site serves
them itself and needs no outside font host (those are often unreachable for this project's
visitors). Only the two Latin files are declared. A browser downloads a font file only when a
page uses the family, and Persian pages never ask for Inter, so they do not pay for it.

Inter is declared for weights 400 to 900 only. The design asks for weight 100 in many places;
IRANSans has no such weight and shows normal text, and this makes Inter do the same instead
of turning hairline thin.

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

*Updated 2026-10-12.*

- **Licensing.** The logos and most images belong to Safar724; the hash in
  `logoWhite.282e17b9.svg` shows it was saved from their built site. IRANSans is a paid font.
  Copying the site's look is the point of the project and is fine; these specific files are the
  part to replace, with an own logo and a free font such as Vazirmatn.
- Global plain-CSS class names can clash. Generic names like `.container`, `.row`, `.grid`,
  `.selected` and `.show` are used in several files.
- Colours are repeated as raw hex values everywhere. There are no CSS variables.
- Typos in file and class names: `calender.svg`, `cardWithIconVerticall.css`, `seperator-line-*`.
- The README says Tailwind CSS is used. No Tailwind exists in this project.
