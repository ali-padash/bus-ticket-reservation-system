# devs/src/components

55 components in one flat folder. Grouped here by what they are for.

No component has a text for the visitor written into it. Each takes its texts, digits, dates
and names in the page's language from `useLocale()`; see "Two languages" in
[src.doc.md](../src.doc.md) and [locales.doc.md](../locales/locales.doc.md).

## Language

*Written 2026-10-12.*

| Component | Job |
| --- | --- |
| `LanguageLayout` | Sits above every page. Reads the language from the first part of the address, sets `lang`, `dir` and the tab title on the document, and sends an address without a language to its English page. |
| `LanguageSwitch` | The link to the same page in the other language. It replaces only the first part of the address and keeps the rest, query included. Shown in the top bar, in the blue bar on phones, and in the phone menu. |
| `LongDate` | A date written out in the page's language and calendar, as four spans: weekday, day, month, year. Used by the two date fields. |

The link is written in the language it leads to ("فارسی" on an English page) and marked with
that language, so someone who cannot read the page they landed on can still find it.

## Navigation and page frame

*Updated 2026-10-13.*

| Component | Job |
| --- | --- |
| `WholeNavbar` | Combines the three below. Tracks scroll position and whether the menu is open. |
| `UpperNavbar` | Thin top bar: sign up, log in, contact, phone number. |
| `LowerNavbar` | Logo bar. Shrinks when the page is scrolled. |
| `Icon` | Every icon of the site, as an SVG from the `react-icons` package. `<Icon name="search" />` draws one of 19 solid icons inside an `<i>` that keeps the class names the stylesheets use (`fas fa-search`); anything else given (onClick, role, aria-label) goes to that `<i>`. `LineIcon` draws one of 14 thin-line icons for places that already have their own `<i>`. The names are typed, so a misspelt icon is a compile error. Icons are SVG and not an icon font so that nothing is fetched from another host and nothing vanishes offline. (written 2026-10-13) |
| `Logo` | The site's logo: an own mark drawn as one SVG shape, then the name as real text ("Rahi" or "راهی", from `meta.name`). Props: `variant` (blue, or white for the blue bar), `size` in pixels, `markOnly`. Used by `LowerNavbar`, `UpperNavbar`, `Sidebar` and, mark only, `BusLoading`. The name is text and not a picture so that it follows the language and the font of the page, stays sharp at any size, and can be read by screen readers and search engines. (written 2026-10-13) |
| `Sidebar` | Slide-in menu for small screens. |
| `MainChoces` | The six menu links, shared by `LowerNavbar` and `Sidebar`, so a link is connected once for the top menu, the tablet panel and the phone menu. It takes `onNavigate`, which both parents use to close their menu when a working link is pressed. |
| `BottomNavbar` | Footer links. |

One link leads somewhere: "Find a ticket" opens `/<lang>/tickets` (since 2026-10-13), through
the router's `Link`, so the page is not reloaded. Every other link still goes to `#`.

## Search form

*Updated 2026-10-12.*

| Component | Job |
| --- | --- |
| `HomeHeader` | The big search form on the landing page. Holds the two cities and the date, and submits by navigating to `/<lang>/services?from=&to=&date=`. |
| `SearchPanel` | The compact search bar on the results page. Holds the two city boxes as a draft and tells the page when to search. It makes no API call itself; `ServicePage` does. |
| `CustomAutocomplete` | City text box with a suggestion list. A controlled component, see below. |
| `CustomInput` | Wraps `CustomAutocomplete` with the landing-page styling and the "missing" message. |

### `CustomAutocomplete` is a controlled component

The parent owns the chosen city and passes it in as `value` (`City | null`). The box reports
every change through `onChange`: a city when the text names exactly one suggested city, `null`
otherwise. So the parent always knows the real choice and nothing has to be read off the page.
Swapping origin and destination is just swapping two state values in the parent.

It also receives the city list and `citiesStatus`. Until the list is `ready` the box is
read-only and shows a loading or error text in place of its hint (added 2026-10-12).

Other props: `onPick` (called after a choice with Enter or the mouse, so the parent can move
the focus on), `onFocus`, `onBlur`, and `inputRef` (so the parent can focus or blur the box).

Inside, the box keeps only what is its own business: the text being typed (`draft`), the
suggestions, and which suggestion is highlighted.

It works the same in both languages (2026-10-12). The city list carries every spelling of a
city, Persian and English, so typing "ras" or "رش" finds Rasht on either page. What changes
with the language is only what is shown: the city's and the province's name. Typed text counts
as a choice when it equals a suggested name, ignoring capitals.

### Keyboard

Both forms behave the same way. **Enter** walks origin → destination → calendar → search.
**Escape** closes the calendar and takes the focus out of the boxes. Each form listens for
these two keys on `window`, because they must also work when nothing has the focus, and it
moves the focus with refs. An Enter that picks a suggestion is stopped from travelling on
(`stopPropagation`), otherwise the form would count the same key press twice.

## Date picking

*Updated 2026-10-12.* All five take the chosen date and an `onSelectDate` callback as props;
none of them stores the date.

| Component | Job |
| --- | --- |
| `Calendar` | A month grid in the calendar of the page's language: a Persian (Jalali) month with the week from Saturday, or a Gregorian month with the week from Monday. Dates go in and out as ordinary `Date` values, so nothing outside knows which calendar is shown. Friday is red in both. |
| `DateDiv` | Landing page: shows the chosen date; clicking opens `DateBox`. |
| `DateBox` | Landing page: popup holding a `Calendar`. |
| `CalendarInput` | Results page: date field plus dropdown `Calendar`. |
| `DaysTab` | Results page: a strip of 3, 5 or 7 days (by screen width) to jump between dates. On a phone each tab is one block, the weekday above the date. (updated 2026-10-13) |

The arrows of the calendar and of the day strip point the way the text runs: their icon comes
from `useLocale().icons`, where "back" and "forward" swap between the two directions
(2026-10-12).

## Results list

*Updated 2026-10-12.*

| Component | Job |
| --- | --- |
| `FilterSearch` | The sort and filter dropdowns. |
| `IdFilter` | A checkbox group with an "all" option. Used for companies and terminals. |
| `InputBox` | One labelled checkbox or radio. |
| `ExpandableCard2` | Dropdown container used by `FilterSearch`. |
| `ServicesDisplay` | Works out the sorted, filtered list with `useMemo`, renders it, and remembers which trip is open. |
| `ServicesDisplayTitle` | The "N services found from A to B…" line. |
| `Panel` | One trip card: company, bus type, time, price, free seats. |
| `DummyPanel` | Grey placeholder card shown while loading. |
| `TicketModel` | The "being arranged" card under the results, drawn as a ticket. It is given the two cities and the day of the search and shows them, the day in the page's calendar; before 2026-10-13 it showed a fixed sample route and an old sample date. Both parts of the card take the height of their text, so it holds at any width. (updated 2026-10-13) |

## Seat map (opens inside a `Panel`, and on the booking page)

*Updated 2026-10-12.*

| Component | Job |
| --- | --- |
| `BusDetails` | Shows loading / error / map inside a trip card. The card (`Panel`) loads the data from `GET /trips/{id}/seat-map`. |
| `BusDetailsDisplay` | Lays out the map, legend, refund box and buy buttons. Both buy buttons open the booking page. |
| `BusSchema` | Draws the bus from the API's `Layout` (rows of seat numbers, `null` = empty floor). It knows no bus model. With `onToggleSeat` the free seats can be chosen. Each seat is given its place on the floor as two CSS variables (`--r` across the bus, `--c` along it) and the stylesheet decides where that is on screen: the bus lies along the page on a wide screen and stands nose up below 600px, because 12 lines of square seats need 370px and a phone has less. Nothing is measured in JavaScript, so there is no resize listener and no flash on load. A line across the bus with no seat is the aisle and is drawn narrow on a phone. (updated 2026-10-13) |
| `Seat` | One square. Blue = man, pink = woman, grey = not for sale, white = free, green = chosen by this visitor. Clickable ones work with Enter and Space. Its size comes from the `size` prop unless a parent sets the `--seat` variable, which is how the seat map makes seats 44px on a phone. (updated 2026-10-13) |
| `Legend` | Explains the seat colours; the booking page adds the green one. On a phone it is a grid of two columns. (updated 2026-10-13) |
| `BusLoading` | Spinner. |
| `BusDisplayError` | Error state with a retry button. (The file exports `BusSchemaError`.) |
| `RefundBox` | The refund terms of the trip whose card is open, loaded from the API through `useRefundRules` (the same lines the review step shows). A popup up to 1024 px wide, inline above that. Draws nothing until the terms have arrived. (updated 2026-10-12) |
| `RefundItem` | One refund line. |
| `AlertBox` | Generic modal used by `RefundBox`. |

## Booking

*Updated 2026-10-12.*

| Component | Job |
| --- | --- |
| `BookingFrame` | Navbar above, footer below, grey page between. Used by both booking pages. |
| `BookingSteps` | The five-step line; steps up to the current one are blue. On a phone it shows the five numbers only, with one sentence under them ("Step 2 of 5: Choose seats"); the stylesheet shows the names or the sentence, never both. (updated 2026-10-13) |
| `TripSummary` | The "trip details" box. Takes plain values, because a trip fills it on one page and a ticket on the other. Names and bus type arrive in the page's language; it formats the date, time and price itself. |
| `SeatPicker` | Step 2: the bus, the legend, the chosen seats as removable chips, the 4-seat notice, the "just taken" notice. |
| `PassengerForm` | Step 3: one mobile number, then name, family name, national code, birth date and gender for each seat, with a message under each wrong field. The birth date is typed in the calendar of the page: Persian (`1374/01/21`) or Gregorian (`1995-03-21`). It receives the names of the messages and looks the sentences up itself. Every box has a `name` and an `autoComplete` word so the browser can offer what it knows (phone, given name, family name), with one section per seat. Every box also has a `<datalist>` of the entries remembered from earlier purchases, so they appear under the box as the visitor types; a remembered national ID fills the rest of that passenger. Above each seat it lists the remembered passengers as buttons that fill the seat, and at the bottom it has the "remember these passengers" box, which starts ticked. (updated 2026-10-13) |
| `TicketReview` | Step 4: passengers, phone, prices, the refund rules from the API, the countdown, "confirm and pay" and "cancel". |
| `FakeBank` | The demo bank page. Says plainly that no money moves. |
| `TicketIssued` | A paid ticket, in two looks chosen by the `justPaid` prop. Right after the payment: the step line at step 5, a green tick, "your ticket is issued", "keep this code", and a way home. Opened any other way: no step line, the heading "your ticket", a small "paid" mark, and two ways on, "find another ticket" and home. The code and the details table are the same in both. It is one component with a prop because only the top and the buttons differ. (updated 2026-10-13) |
| `TicketFailed` | The failure page: cancelled or out of time; says the seats were released. It has no step line, because a finished-looking line over a failure reads wrongly. (updated 2026-10-13) |
| `PhonePrompt` | Asks for the buyer's phone when the ticket address is opened without it. |
| `DigitInput` | A text box for numbers that shows the digits of the page's language whichever keyboard typed them. Used for the mobile number, national code and birth date, and for the two boxes of the "find a ticket" page, where `inputMode="numeric"` makes a phone show its digit keyboard for the ticket code (2026-10-13). The page keeps the text in Latin digits and this box only changes how it is shown, so what was typed survives a change of language. It notes the caret's place on each key and puts it back after the redraw, because a box that shows something other than what was typed would otherwise jump the caret to the end. |

These components only show things and report clicks. The two pages hold the state and make the
API calls; see [pages.doc.md](../pages/pages.doc.md).

## Landing page content

| Component | Job |
| --- | --- |
| `BlueHeader` + `Card` | "Four steps" section. The steps are written last first for the desktop row; on a narrow screen the stack is turned over so step one is on top. (updated 2026-10-13) |
| `TwoColumns` + `CardWithIcon` + `ExpandableCard` | Info cards and FAQ. |
| `PositivePoints` + `CardWithIconVerticall` | "Why people trust us" section. |

## Problems

### Things that look finished but are not

*Updated 2026-10-12.*

- "Left out from earlier passengers", login and "my tickets" do not exist.

### Decisions made in the 2026-10-12 cleanup

*Updated 2026-10-12.*

- **Sorted and filtered lists are derived, not stored.** `ServicesDisplay` computes the list
  with `useMemo` from the search result, the sort choice and the filters. Before, it kept three
  copies in state and synced them with effects, which could fall out of step.
- **One open trip.** `ServicesDisplay` holds the ID of the open trip; each `Panel` is told
  whether it is the one. Opening a card therefore closes the others with no extra signal.
- **Trip ID as the React key.** Cards keep their own state (the fresh seat count, the loaded
  seat map) when the list is re-sorted or filtered. With the row number as key, that state
  would stay with the row and show up on the wrong trip.
- **Load-on-scroll was removed, not finished.** It never worked (the cards ignored it), and a
  search returns a handful of trips, so drawing them all at once is simpler and fast enough.
- **The bus is drawn from the API's layout** (2026-10-12). The four hardcoded layouts are gone;
  a new kind of bus needs no change in the website. The trip card loads the seat map once per
  opening and gets the fresh free-seat count from the same call.
- **"Try again" on the seat map** raises a counter that the loading effect depends on, instead
  of closing and reopening the card.
- **Four timers remain**, each waiting for a CSS animation, each with a comment saying which:
  `AlertBox` (fade-in), `RefundBox` (fade-out before removal), `Panel` (the card above folds
  away before scrolling), `CustomInput` (calendar and dark cover fade out before the box comes
  forward). The fifth, in `BusDetails`, went on 2026-10-12: a closed card now simply keeps its
  last seat map and replaces it when opened again.

### Decisions made when the second language was added

*Written 2026-10-12.*

- **Pictures that only decorate have an empty alt text** (the bus front, the spinner logo, the
  icons of `TicketModel`). They used to carry English file-like names such as "busDash". The
  logos and company logos have a real description in each language.
- **Clickable icons got a name for screen readers** (`role="button"` and an `aria-label` from
  the text files): the menu buttons, the close crosses, the month and day arrows, the swap
  button, the question toggles. Their keyboard support is still missing, see below.
- **The four cards of "why people trust us" keep one order in both languages.** They sit in a
  grid, which cannot be reversed the way a flex row can, so the grid's direction is fixed and
  each card is given the direction of its own text.
- **The phone number is drawn left to right in both languages**, inside its own `dir="ltr"`
  span, because a phone number is read that way everywhere.

### Small behaviour changes from the cleanup

*Written 2026-10-12.*

- An open seat map stays open when the list is re-sorted or filtered (it used to close).
- On the results page the calendar closes when a search starts from the keyboard (it used to
  stay open over the results).
- On the results page the "please enter origin / destination" message disappears as soon as
  the missing city is chosen (it used to wait for the next search).
- The day strip and the results-page calendar change only the date of the search on screen.
  A city typed but not yet searched is not picked up by them.
- The "from hour … to hour …" line in the heading now always matches the trips on screen.
- A city chosen from the list is kept even if another city has the same name.

### React habits still to fix

*Updated 2026-10-12.*

- `Calendar` calls `jalaali.toJalaali` up to nine times per day cell.
- Clickable `<i>` and `<div>` elements with no keyboard support and no labels.
- `Seat` is styled entirely with inline styles and a nested chain of `? :`.
- `DaysTab` starts with 7 days whatever the screen width, and only corrects itself on resize.

### Naming

- Typos: `MainChoces`, `CardWithIconVerticall`, `alertMassage`, `CalenderInput` (import name).
- `ExpandableCard` and `ExpandableCard2` are different things: an FAQ accordion and a dropdown.
- `DummyPanel` is a loading skeleton. `TicketModel` is a notice, not a model.
- `BusDisplayError.tsx` exports `BusSchemaError`.
- In `SearchPanel` the origin box has the CSS class `to` and the destination box has `from`.

### Structure

*Updated 2026-10-12.*

- A flat folder of 55 files. Grouping by feature (`search/`, `results/`, `seat-map/`,
  `layout/`, `landing/`) would make it far easier to read.
- Each component's CSS lives far away in `assets/css/`. Keeping the CSS next to its component is easier.
