# devs/src/components

41 components in one flat folder. Grouped here by what they are for.

## Navigation and page frame

| Component | Job |
| --- | --- |
| `WholeNavbar` | Combines the three below. Tracks scroll position and whether the menu is open. |
| `UpperNavbar` | Thin top bar: sign up, log in, contact, phone number. |
| `LowerNavbar` | Logo bar. Shrinks when the page is scrolled. |
| `Sidebar` | Slide-in menu for small screens. |
| `MainChoces` | The six menu links, shared by `LowerNavbar` and `Sidebar`. |
| `BottomNavbar` | Footer links. |

Every link goes to `#`. None of them lead anywhere.

## Search form

*Updated 2026-10-12.*

| Component | Job |
| --- | --- |
| `HomeHeader` | The big search form on the landing page. Holds the two cities and the date, and submits by navigating to `/services?from=&to=&date=`. |
| `SearchPanel` | The compact search bar on the results page. Holds the two city boxes as a draft and tells the page when to search. It makes no API call itself; `ServicePage` does. |
| `CustomAutocomplete` | City text box with a suggestion list. A controlled component, see below. |
| `CustomInput` | Wraps `CustomAutocomplete` with the landing-page styling and the "missing" message. |

### `CustomAutocomplete` is a controlled component

The parent owns the chosen city and passes it in as `value` (`City | null`). The box reports
every change through `onChange`: a city when the text names exactly one suggested city, `null`
otherwise. So the parent always knows the real choice and nothing has to be read off the page.
Swapping origin and destination is just swapping two state values in the parent.

Other props: `onPick` (called after a choice with Enter or the mouse, so the parent can move
the focus on), `onFocus`, `onBlur`, and `inputRef` (so the parent can focus or blur the box).

Inside, the box keeps only what is its own business: the text being typed (`draft`), the
suggestions, and which suggestion is highlighted.

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
| `Calendar` | A Persian (Jalali) month grid. |
| `DateDiv` | Landing page: shows the chosen date; clicking opens `DateBox`. |
| `DateBox` | Landing page: popup holding a `Calendar`. |
| `CalendarInput` | Results page: date field plus dropdown `Calendar`. |
| `DaysTab` | Results page: a strip of 3, 5 or 7 days (by screen width) to jump between dates. |

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
| `TicketModel` | "We are arranging service on this route" notice. Hard-coded content. |

## Seat map (opens inside a `Panel`)

| Component | Job |
| --- | --- |
| `BusDetails` | Fetches the seats, picks the layout for the bus type, shows loading / error / map. |
| `BusDetailsDisplay` | Lays out the map, legend, refund box and buy buttons. |
| `BusSchema` | The grid of seats with the bus front image. |
| `Seat` | One square. Blue = man, pink = woman, grey = not for sale, white = free. |
| `Legend` | Explains the four seat colours. |
| `BusLoading` | Spinner. |
| `BusDisplayError` | Error state with a retry button. (The file exports `BusSchemaError`.) |
| `RefundBox` | Refund conditions. A popup under 1024 px wide, inline above that. |
| `RefundItem` | One refund line. |
| `AlertBox` | Generic modal used by `RefundBox`. |

## Landing page content

| Component | Job |
| --- | --- |
| `BlueHeader` + `Card` | "Four steps" section. |
| `TwoColumns` + `CardWithIcon` + `ExpandableCard` | Info cards and FAQ. |
| `PositivePoints` + `CardWithIconVerticall` | "Why people trust us" section. |

## Problems

### Things that look finished but are not

- Both **buy** buttons in `BusDetailsDisplay` have no click handler.
- Seats cannot be clicked or selected.
- `RefundBox` shows two fixed lines. It never reads the refund rules in the database.
  The second line says "50" in the badge and "10%" in the text.

### Decisions made in the 2026-10-12 cleanup

*Written 2026-10-12.*

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
- **Seat layout is looked up, not stored.** `BusDetails` keeps only the seats the API sent and
  works out the map from them and the layout for the bus code.
- **"Try again" on the seat map** raises a counter that the loading effect depends on, instead
  of closing and reopening the card.
- **Five timers remain**, each waiting for a CSS animation, each with a comment saying which:
  `AlertBox` (fade-in), `RefundBox` (fade-out before removal), `BusDetails` (map folds away
  before it is swapped for the spinner), `Panel` (the card above folds away before scrolling),
  `CustomInput` (calendar and dark cover fade out before the box comes forward).

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

- A flat folder of 41 files. Grouping by feature (`search/`, `results/`, `seat-map/`,
  `layout/`, `landing/`) would make it far easier to read.
- Each component's CSS lives far away in `assets/css/`. Keeping the CSS next to its component is easier.
