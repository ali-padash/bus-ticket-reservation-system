# devs/src

All frontend code.

## Layout

| Path | Contents | Doc |
| --- | --- | --- |
| `main.tsx` | Mounts `<App />` into the page. | — |
| `App.tsx` | Defines the routes, all under a language, and fetches the city list. | — |
| `i18n.ts` | Hands the two text files to the i18next library. | — |
| `locales/` | `en.json` and `fa.json`: every text a visitor reads. | [locales.doc.md](locales/locales.doc.md) |
| `pages/` | One component per route. | [pages.doc.md](pages/pages.doc.md) |
| `components/` | 55 UI components, all in one flat folder. | [components.doc.md](components/components.doc.md) |
| `util/` | Types, helpers, API calls, and data files. | [util.doc.md](util/util.doc.md) |
| `assets/` | CSS and images. Fonts and icons come from npm packages. | [assets.doc.md](assets/assets.doc.md) |
| `App.css`, `index.css` | **Empty files.** The real global stylesheet is `assets/css/index.css`. | — |
| `vite-env.d.ts` | Vite type hints. | — |

## Routes

*Updated 2026-10-12.*

Every page exists twice, once under `/en` and once under `/fa`. `<lang>` below is one of the two.

| URL | Page |
| --- | --- |
| `/<lang>/` | `MainPage` — landing page with the search form |
| `/<lang>/services?from=<cityId>&to=<cityId>&date=YYYY-MM-DD` | `ServicePage` — search results |
| `/<lang>/booking/<tripId>?seats=18,19&step=passengers` | `BookingPage` — choose seats, then type the passengers |
| `/<lang>/tickets/<code>` | `TicketPage` — review and countdown, then the ticket or the failure page |
| `/<lang>/tickets/<code>/payment` | `TicketPage` — the demo bank page |

`from` and `to` are city IDs, the same IDs the API's city list uses. A link without a usable `date` means
today. A link without two known cities shows the error text and the "please enter" message.

Addresses that are sent somewhere else:

| Address | Goes to |
| --- | --- |
| `/` | `/en/` |
| An address from before there were two languages: `/services?...`, `/booking/...`, `/tickets/...` | The same page under `/en`, query kept |
| Anything else in the language's place, for example `/de/services` | `/en/` |
| An unknown page under a language, for example `/fa/nothing` | That language's home page |

## Two languages

*Written 2026-10-12.*

The site is in English (the default) and Persian. What a visitor sees: every page in either
language, a link in the top bar that leads to the same page in the other one, English laid
out left to right in the Inter font with Latin digits, the Gregorian calendar and prices as
"4,580,000 IRR", and Persian exactly as it was.

The design choices, each with the reason in one sentence:

- **The language is the first part of the address, and nothing else stores it.** A link then
  always opens in the language it was copied in, the back button and a refresh keep the
  language, and there is no saved setting that could disagree with the page.
  `LanguageLayout` reads it; components get it through `useLocale()`.
- **`useLocale()` asks for the texts of the address's language by name.** The i18next library
  also has a language of its own, but no page reads it, so there is one source of truth and no
  effect that must keep two things in step.
- **The language link changes only the first part of the address.** The path and the query
  stay, so a buyer in the middle of a booking lands on the same step with the same seats. The
  page is not rebuilt either: what was typed into the passenger form is still there.
- **Direction is set once, on `<html>`** (`lang` and `dir`), in a layout effect so that no page
  is painted in the wrong direction first. The CSS uses logical properties
  (`margin-inline-start`, `inset-inline-end`, `text-align: start`), which mean "the side where
  reading starts" instead of "left", so one rule serves both directions. Details and the few
  exceptions are in [assets.doc.md](assets/assets.doc.md).
- **One file, `util/Locale.ts`, decides everything that depends on the language:** digits,
  money, dates, the calendar, and which field of the API's data to show. A component never
  converts a digit or picks a calendar by itself, so a mistake can only be in one place.
- **Texts are kept as keys, not sentences, in state.** A form error or a failed payment stores
  the name of its message; the sentence is looked up when it is drawn. Switching the language
  therefore translates messages that are already on screen.
- **The API is never told the language.** It sends both the Persian and the English fields; the
  page picks. Everything sent to the API or put in an address stays as it was: Latin digits,
  Gregorian `YYYY-MM-DD`.

What differs between the two languages:

| | Persian | English |
| --- | --- | --- |
| Direction, font | right to left, Vazirmatn | left to right, Inter |
| Digits | ۰۱۲۳ | 0123 |
| Calendar | Persian (Jalali), week from Saturday | Gregorian, week from Monday |
| A date | چهارشنبه ۲۲ مهر ۱۴۰۵, ۱۴۰۵/۷/۲۲ | Wednesday, 14 October 2026, 14 Oct 2026 |
| Birth date typed as | ۱۳۷۴/۰۱/۲۱ | 1995-03-21 (sent as typed, nothing to convert) |
| Money | ۴،۵۸۰،۰۰۰ ریال | 4,580,000 IRR |
| Names from the API | `...PersianName` fields | `Name`, `...EnglishName`, `CompanyName`, `...TerminalName`, made readable ("abadeh-tashk" becomes "Abadeh Tashk") |
| Bus type, description | `BusType`, `Description` | `BusTypeEnglish`, `DescriptionEnglish` |

What is the same in both, on purpose: the drawing of the bus (front on the left, seat 1
behind the driver; it is a picture of a real thing), the support phone number (always read
left to right), and Friday marked in red in the calendar (the day off in Iran).

**How "Persian looks the same as before" was checked.** An untouched copy of the old site
was run beside the new one, and a script measured the place and size of every element and
every piece of text on 20 page states at 6 screen widths (120 comparisons). They match,
except for the three things listed under Problems below.

## How data moves

*Rewritten 2026-10-12.*

**The search is the address.** Nothing else remembers it, so a refresh, the back button or a
shared link repeats the same search.

```
App
   │  asks for the city list once (GET /api/v1/cities) and hands it to both pages
   ▼
LanguageLayout (on "/en" and "/fa")
   │  checks the language in the address, sets lang and dir on <html>, draws the page
   ▼
HomeHeader (form on "/en/")
   │  holds origin, destination (City | null) and the date in its own state
   │  navigate("/en/services?from=1&to=21&date=2026-10-14")
   ▼
ServicePage (on "/en/services")
   │  reads from / to / date with useSearchParams
   │  calls fetchServices(...) whenever they change; holds the result in state
   ├──► SearchPanel       the two city boxes (a draft) and the calendar; reports a new search upward
   ├──► FilterSearch      sort choice and the company / terminal filter lists
   ├──► DaysTab           the day strip; reports a new date upward
   └──► ServicesDisplay   sorts and filters with useMemo, renders one Panel per trip
            └──► Panel ──► fetchSeatMap ──► BusDetails ──► BusSchema ──► Seat
                    │  "buy" -> navigate("/en/booking/<tripId>")
                    ▼
BookingPage (on "/en/booking/<tripId>")
   │  seats and step are read from the address; the typed form is ordinary state
   │  POST /trips/<id>/tickets puts the seats on hold -> navigate("/en/tickets/<code>")
   ▼
TicketPage (on "/en/tickets/<code>")
      asks the server for the ticket every time it opens and shows what its Status says
```

Values go down by props and changes come back up through callbacks. There is no shared store.
Addresses inside the site are built with `path()` from `useLocale()`, which puts the page's
language in front (2026-10-12).

### The city list

*Written 2026-10-12.*

The 915 cities used to be bundled into the JavaScript. Now `App` fetches them once from
`GET /api/v1/cities` and passes `cities` and `citiesStatus` (`loading`, `ready` or `error`)
down to the two forms. Filtering while typing still happens in the browser; the API is never
called per key press.

- **Why in `App`:** it is the one component that is never removed, so going from the home page
  to the results page does not fetch again. Repeat visits are covered by the browser's own
  cache (the server sends `Cache-Control` and an `ETag`).
- **While loading**, the city boxes are read-only and show the "loading" text.
- **If the call fails**, they stay read-only and show the "could not load the city list" text.
  There is no retry button; reloading the page tries again.
- **One list serves both languages** (2026-10-12). Each city carries every spelling a visitor
  might type, Persian and English, so the same typing finds the same cities on either page;
  only the name and province shown come from the page's language. All 915 cities have an
  English name since 2026-10-12 (120 were filled in by hand in `util/cities.json`).
- **The results page does not wait for the list to search.** The address holds city IDs, and
  the trips call needs only those. The list is needed only to write the two city names into
  the boxes, which happens when it arrives.
- Bundle size: 480.66 kB (115.01 kB gzipped) before, **219.27 kB (70.96 kB gzipped)** after.
  The list itself travels as 47 kB.

### Buying a ticket

*Written 2026-10-12.*

Five steps, shown by the step line: choose a trip, choose seats, type the passengers, review
and pay, ticket. The API holds the seats for 10 minutes from the moment the passenger form is
sent ("hold, then pay").

- **Choosing seats sends nothing to the server.** The chosen seats sit in the address
  (`seats=18,19`), so a refresh or the back button keeps them. At most 4.
- **The passenger form is checked twice.** The browser checks the obvious things so the buyer
  gets an answer at once; the server checks everything again and is the judge. Both use the
  same field names (`ContactPhone`, `Passengers[0].NationalCode`), so a fault from either side
  appears under the same box.
- **Decisions are made from the error `code`**, never from the English sentence:
  `validation_failed` marks the fields, `seats_unavailable` sends the buyer back to a fresh seat
  map and names the lost seats, `hold_expired` / `ticket_cancelled` lead to the failure page.
- **A ticket opens with its code and the buyer's phone together.** The code is in the address;
  the phone is not (addresses end up in history and logs). It is kept in `sessionStorage` for
  that tab. Opened anywhere else, the page asks for the phone.
- **The ticket page stores almost nothing.** Each time it opens it asks the server for the
  ticket and draws what the `Status` says: `reserved` -> review (or the demo bank),
  `paid` -> the ticket, `cancelled` / `expired` -> the failure page. That is why a refresh
  loses nothing.
- **The countdown uses the server's `SecondsLeft`,** minus the seconds passed since it arrived.
  Only a length of time is measured in the browser, so a wrong clock on the buyer's computer
  does no harm. At zero the page asks the server once more.
- **The bank page is a demo and says so.** No card details are asked for and no money moves.
- **The booking page loads its trip by ID** (`GET /trips/<id>`), so its address needs only the
  trip ID. The way back to the results is built from the trip (or, on the ticket pages, from
  the ticket): two city IDs and a date. Nothing has to be remembered by the tab.
- **Every number the visitor sees is in the digits of the page's language; every number sent
  to the API or put in an address is in Latin digits.** `formatNumber` in `util/Locale.ts`
  does the first and `toLatinDigits` the second. The number boxes (`DigitInput`) keep Latin
  digits and only show them differently, on either keyboard. No component converts digits on
  its own. (updated 2026-10-12)

## Who owns which state

*Written 2026-10-12.*

| State | Owner | Why there |
| --- | --- | --- |
| The language | The address (its first part) | So a link, a refresh and the back button keep it, and nothing can disagree with it. |
| Origin, destination, date of the search on screen | The address (`ServicePage` reads it) | So the search survives a refresh and can be shared. |
| The city list and whether it has arrived | `App` | Both pages need it, and `App` outlives both. |
| Search result, "did the call fail" | `ServicePage` | The page makes the call and three children show the result. |
| Sort choice, company and terminal filters | `ServicePage` | `FilterSearch` changes them and `ServicesDisplay` uses them; the page is their common parent. |
| The two city boxes before "search" is pressed | `SearchPanel` | A draft only this panel cares about. |
| Chosen seats and the step of the booking page | The address (`BookingPage` reads it) | So refresh and back keep the buyer's place. |
| What is typed into the passenger form | `BookingPage` | Personal details do not belong in the address; they are gone after a refresh. |
| Passengers and phone the visitor asked to be remembered | `localStorage` (`util/SavedPassengers.ts`) | Unless the box on the form is unticked (it starts ticked since 2026-10-13). It stays on the device; the API has no accounts to keep it in. |
| The buyer's phone for one ticket | `sessionStorage`, per tab | Needed to open the ticket after a refresh, but must not be in the address. |
| The ticket | The server; `TicketPage` holds the last copy it received | The server decides whether a hold is alive, paid or gone. |
| Which trip's seat map is open | `ServicesDisplay` | The parent of all the cards, so opening one closes the others. |
| Home form: cities, date, "show the missing messages" | `HomeHeader` | Only the form uses them. |
| Home page: which city box has the focus, is the calendar open | `MainPage` | Both the form and the navbar (which dims) need them. |

## Rules the code now follows

*Updated 2026-10-12.*

- No `document.querySelector` or `getElementById` on anything React renders. The only one left
  is `main.tsx` finding `#root`. Focus is moved with refs. `LanguageLayout` writes `lang`, `dir`
  and the title on the document itself, which React does not draw.
- No text for the visitor inside a component: not a label, a placeholder, an alt text or an
  error message. They are all in `locales/`.
- No `setTimeout` to put events in order. The 4 that remain each wait for a CSS animation and
  say which one in a comment (`AlertBox`, `RefundBox`, `Panel`, `CustomInput`). The one in
  `BusDetails` went away on 2026-10-12 with the seat-map rewrite. The ticket countdown uses
  one `setInterval`, a real clock tick.
- `window` / `document` listeners are used only for global things: the Enter and Escape keys,
  scroll, resize, and "click outside" for popups.
- No `any`.

Before 2026-10-12 the counts were 18 `querySelector` calls, 22 `setTimeout` calls and 5 `any`.

## Problems

*Written 2026-10-12.*

Three things on the Persian pages are not as they were before the second language:

- **The new "English" link** in the top bar. On phones it sits in the blue bar beside the menu
  button, which moves the support phone number in that bar 25px towards the logo.
- **The page's own scrollbar is on the left** in browsers built on Chromium, because that is
  where they put it on a right-to-left page. Firefox keeps it on the right.
- **A results page on a screen narrower than 500px starts scrolled to its right edge**, where
  Persian reading starts. It used to start at the left edge with the company logos out of view.

One full stop also moved: the paragraph under "why ... people trust us" used to end with its
full stop at the wrong (right) end of the last line.

Still open:

- The seats-were-just-taken message and the countdown reaching zero were not seen in the
  browser in English; they use the same code as in Persian.
- Fixed on 2026-10-12: a birth date typed before switching language is now written again in
  the other calendar by `BookingPage`, so the same day stays in the box.
- Changed on the Persian pages on 2026-10-12, on purpose: the refund box in a trip card shows
  the trip's own terms from the API (its two fixed lines said 10% beside a badge of 50); the
  passenger form has a "remember these passengers" box; and below 1000px wide the results
  page has its own layout (it used to run its texts into each other).
