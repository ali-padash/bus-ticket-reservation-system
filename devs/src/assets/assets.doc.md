# devs/src/assets

Static files: styles and images. Fonts and icons are not files here any more; they come from
npm packages (see "Where everything comes from"). (updated 2026-10-13)

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

Two variables on `:root` in `index.css` carry what differs: `--font` (Vazirmatn, or Inter with
Vazirmatn behind it) and `--x`.

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
`findTicket.module.css` (added 2026-10-13) belongs to the page `FindTicketPage.tsx` and holds
only what `booking.module.css` does not: the heading, the two boxes side by side (one column
up to 600px), the information card and the questions.

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

## Phone layout

*Written 2026-10-13.*

Below 600px wide the stylesheets rearrange the pages instead of shrinking them. The rules are
at the end of each file, in a `@media (max-width: 600px)` block with a comment that says why.

| Part | On a phone | Why |
| --- | --- | --- |
| Seat map (`busSchema.module.css`) | The bus stands nose up: 3 columns of seats and a narrow aisle, 44px seats, the page scrolls down. | 12 lines of 27px seats with gaps need 370px. Squeezing them made thin seats that touched. A sideways scroll inside the box was the other choice; it hides half the bus and fights the page's own scroll. |
| Seat legend | A grid of two columns. | The labels ran into each other and wrapped unevenly. |
| Step line (`booking.module.css`) | Five numbers and one sentence naming the current step. | Five names wrapped onto three uneven lines. |
| Text lines | 1.6 in English, 1.9 in Persian, in place of 2 to 2.1. | Wide line spacing reads as gaps on a narrow screen. Persian letters are taller, so it keeps more. |
| Day tabs (`daysTab.css`) | Three equal blocks, weekday above date. | The date used to break in the middle. |
| Sort and filter menus (`filterSearch.css`) | Three equal blocks in a row; an open menu is as wide as the row. | They wrapped unevenly, and the last menu could open past the edge of the screen. |
| Search bar on the results page (`searchPanel.css`) | 40px boxes; the swap arrows have their own 40px between the two cities. | The arrows were enlarged over the edges of the boxes. |
| Opened trip card (`busDetails.module.css`) | Takes the height of the bus; "refund terms" and "Buy" share a row at the same height; no hover cover. | The box had a fixed 350px and two buttons placed by fixed distances. A finger cannot hover. |
| "Being arranged" card (`ticketModel.module.css`) | Same card at every width; it is 90% of the screen at most. | Its parts had fixed heights, so text was cut and the button squeezed. |
| Passenger form | Two names on one line, then one box per line. | The example in the birth date box was cut off. |
| Buttons and links | About 40px tall: seats, day arrows, menus, form buttons, footer links, language link. | A finger needs more room than a mouse. |

Above 600px nothing here applies, and the desktop pages are as before.

## Fonts

*Updated 2026-10-13.*

There is no `fonts/` folder any more. Both fonts come from npm packages and are declared in
`css/index.css`, so the site serves them itself and needs no outside font host (those are
often unreachable for this project's visitors).

- **Vazirmatn** is the font of the Persian pages (`@fontsource-variable/vazirmatn`, SIL Open
  Font License). It replaced IRANSans, a paid font, on 2026-10-13. Two of its files are
  declared: the Arabic-script one (46 kB) for Persian letters and digits, and the Latin one
  (35 kB) for Latin words inside Persian pages.
- **Inter** is the font of the English pages (`@fontsource-variable/inter`, SIL Open Font
  License). Its two Latin files are declared. Persian letters on an English page (the
  "فارسی" link, a Persian passenger name) fall back to Vazirmatn.

A browser downloads a font file only when a page shows a letter from it, so a Persian page
does not pay for Inter and an English page with no Persian letter does not pay for Vazirmatn.

Both are variable fonts: one file holds every weight, so bold text is a real bold. IRANSans
was declared with its normal weight only, and the browser thickened it for bold.

Both are declared for weights 400 to 900 only. The design asks for weight 100 in many places;
the old Persian font had no such weight and showed normal text, and starting at 400 keeps
that look instead of turning the text hairline thin.

The countdown on the review step uses equal-width digits (`font-variant-numeric:
tabular-nums`), so the time does not shake sideways as it counts.

## Icons

*Updated 2026-10-13.*

There is no `icons/` folder and no icon font any more. Every icon is an SVG drawn by the
`Icon` component (see `components.doc.md`), taken from the `react-icons` package, so icons
travel inside the JavaScript and do not vanish offline.

- 19 solid icons (search, arrows, calendar and so on) are Font Awesome 5 Free. They replaced
  the Font Awesome stylesheet that `index.html` loaded from a CDN: one request to another
  host fewer.
- 14 line icons (the map pin, the calendar, the icons of the home page cards) are Tabler
  Icons. They replaced `line-icons-custom.woff`, an icon font saved from the Safar724 site.
- `Simple-Line-Icons.woff` was deleted: no stylesheet used it.

The `<i>` around an icon keeps its old class names (`fas fa-search`, `icon smile`), because
the stylesheets place and colour icons through them. Four rules at the top of `css/index.css`
make an SVG inside such an `<i>` as tall as the font-size and give it the text colour.

## `images/`

*Updated 2026-10-13.*

Four drawings, all made for this project as hand-written SVG. They replaced seven files that
came from the Safar724 site.

| File | Size | Used by | What it is |
| --- | --- | --- | --- |
| `header.svg` | 2.6 kB | landing page background (from CSS) | A flat landscape: sky, hills, trees, a road and a blue bus. It replaced a 112 kB PNG. English pages show it mirrored, so the bus stays clear of the search form. |
| `busFront.svg` | 0.5 kB | `BusSchema` | The front end of the bus in the seat map, seen from above: the curved nose and a steering wheel. |
| `busFrontTop.svg` | 0.6 kB | `BusSchema` | The same drawing turned a quarter, for the phone seat map where the bus stands nose up. Added 2026-10-13. |
| `companyDefault.svg` | 0.4 kB | `Panel` | A grey outline of a bus, shown when a bus company has no logo. |
| `routeBus.svg` | 0.5 kB | `TicketModel` | A small bus on a dashed line, between the two city names. |

The other three pictures of `TicketModel` (the ticket in its blue header, the calendar and the
bus beside its sample line) are now icons from the `Icon` component.

### The logo

*Written 2026-10-13.*

There is no logo picture any more. The three Safar724 logo files (`logo.png`,
`logoWhite.282e17b9.svg`, `logo-transparent.png`) were deleted on 2026-10-13, and so was
`public/vite.svg`. The logo is now drawn by the `Logo` component: an own mark (a map pin with
a road through it) as one SVG shape, and the name as real text. `css/logo.css` styles it. The
same shape is the tab icon, `public/favicon.svg`; it is written in both places, so a change
to the mark has to be made twice.

## Where everything comes from

*Written 2026-10-13.*

Every file a visitor's browser receives, and who made it. Nothing here belongs to Safar724
or to anyone who has not allowed its use.

| What | Where it lives | Source | Licence |
| --- | --- | --- | --- |
| Logo mark and tab icon | `components/Logo.tsx`, `public/favicon.svg` | Drawn for this project | Ours |
| `header.svg`, `busFront.svg`, `busFrontTop.svg`, `companyDefault.svg`, `routeBus.svg` | `assets/images/` | Drawn for this project | Ours |
| Stylesheets | `assets/css/` | Written for this project; the layout imitates Safar724's site on purpose | Ours |
| Persian font, Vazirmatn | npm `@fontsource-variable/vazirmatn` | Saber Rastikerdar and contributors | SIL Open Font License 1.1 |
| English font, Inter | npm `@fontsource-variable/inter` | Rasmus Andersson and contributors | SIL Open Font License 1.1 |
| Solid icons (19) | npm `react-icons`, set `fa` | Font Awesome 5 Free | Icons: CC BY 4.0 |
| Line icons (14) and the clock on a trip card | npm `react-icons`, set `tb` | Tabler Icons | MIT |
| The `react-icons` package itself | npm | react-icons contributors | MIT |

What is still modelled on Safar724 is the look and the flow of the pages, which is the point
of the project, and some marketing sentences that began as theirs (see `locales.doc.md`).

## Problems

*Updated 2026-10-13.*

- The two drawings of the mark (in `Logo.tsx` and in `favicon.svg`) are the same path written
  twice.
- The pictures are simple on purpose. `header.svg` is far plainer than the picture it replaced.
- Global plain-CSS class names can clash. Generic names like `.container`, `.row`, `.grid`,
  `.selected` and `.show` are used in several files.
- Colours are repeated as raw hex values everywhere. There are no CSS variables.
- Typos in file and class names: `calender.svg`, `cardWithIconVerticall.css`, `seperator-line-*`.
- The README says Tailwind CSS is used. No Tailwind exists in this project.
