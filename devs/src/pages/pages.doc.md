# devs/src/pages

One file per route.

## `MainPage.tsx` — route `/`

*Updated 2026-10-12.*

The landing page. It stacks these components top to bottom:

`WholeNavbar` → `HomeHeader` (search form) → `BlueHeader` (four "how it works" cards) →
`TwoColumns` (three info cards plus an FAQ) → `PositivePoints` → `BottomNavbar`.

It receives the city list from `App` and passes it on to the form.

It owns two pieces of state: which city box has the focus, and whether the calendar is open.
They live here because two children need them: the form, and the navbar, which dims while
either is true. Everything else about the form (the keyboard handling included) is in
`HomeHeader`; see [components.doc.md](../components/components.doc.md).

## `ServicePage.tsx` — route `/services?from=&to=&date=`

*Rewritten 2026-10-12.*

The results page: `WholeNavbar` → `SearchPanel` → heading and `FilterSearch` → `DaysTab` →
`ServicesDisplay` → `TicketModel` → `BottomNavbar`.

**The search is read from the address** with `useSearchParams`: `from` and `to` are city IDs,
`date` is `YYYY-MM-DD`. The page calls the API whenever one of them changes. To start a new
search, a child calls back and the page changes the address; the address change is what
triggers the call. This is why refresh, back/forward and shared links all work.

State it owns and hands down:

| State | Meaning |
| --- | --- |
| `servicesData` | the search result, or null while loading |
| `errorFetching` | did the search call fail? |
| `searchCount` | goes up on each press of "search", so pressing it again asks the server again |
| `sortBasedOnPrice` | false = sort by time, true = sort by price |
| `checkedState` | which companies are ticked |
| `originState` | which origin terminals are ticked |
| `destinationState` | which destination terminals are ticked |

Details worth knowing:

- The page receives the city list from `App`, but does not wait for it: the trips call uses
  the city IDs from the address. The list only fills the two city boxes with names.
- A new search puts the three filters back to "all".
- A call that is overtaken by a newer one is cancelled with `AbortController`.
- `SearchPanel` gets a `key` made of the two city IDs and the state of the city list. When
  the cities in the address change (a new search or the back button), or the list arrives,
  React starts the panel afresh, so its two boxes always
  begin from the address. That is simpler than copying props into state with an effect.
- The day strip and the calendar change only the `date` of the search on screen. The city
  boxes take effect when "search" is pressed (or the swap button, which searches at once).

## Problems

*Updated 2026-10-12.*

- `TicketModel` (a "no service on this route" notice) is always shown on the results page, with
  Tehran, Rasht and a date typed in by hand.
- There is no "not found" route.
- Pressing "search" twice without changing anything adds a second, identical entry to the
  browser history.
