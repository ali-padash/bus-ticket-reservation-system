# devs/src

All frontend code.

## Layout

| Path | Contents | Doc |
| --- | --- | --- |
| `main.tsx` | Mounts `<App />` into the page. | — |
| `App.tsx` | Defines the two routes. | — |
| `pages/` | One component per route. | [pages.doc.md](pages/pages.doc.md) |
| `components/` | 51 UI components, all in one flat folder. | [components.doc.md](components/components.doc.md) |
| `util/` | Types, helpers, API calls, and data files. | [util.doc.md](util/util.doc.md) |
| `assets/` | CSS, fonts, icon fonts, images. | [assets.doc.md](assets/assets.doc.md) |
| `App.css`, `index.css` | **Empty files.** The real global stylesheet is `assets/css/index.css`. | — |
| `vite-env.d.ts` | Vite type hints. | — |

## Routes

*Updated 2026-10-12.*

| URL | Page |
| --- | --- |
| `/` | `MainPage` — landing page with the search form |
| `/services?from=<cityId>&to=<cityId>&date=YYYY-MM-DD` | `ServicePage` — search results |
| `/booking/<tripId>?from=&to=&date=&seats=18,19&step=passengers` | `BookingPage` — choose seats, then type the passengers |
| `/tickets/<code>` | `TicketPage` — review and countdown, then the ticket or the failure page |
| `/tickets/<code>/payment` | `TicketPage` — the demo bank page |

`from` and `to` are city IDs, the same IDs the API's city list uses. A link without a usable `date` means
today. A link without two known cities shows the error text and the "please enter" message.

There is no "not found" route.

## How data moves

*Rewritten 2026-10-12.*

**The search is the address.** Nothing else remembers it, so a refresh, the back button or a
shared link repeats the same search.

```
App
   │  asks for the city list once (GET /api/v1/cities) and hands it to both pages
   ▼
HomeHeader (form on "/")
   │  holds origin, destination (City | null) and the date in its own state
   │  navigate("/services?from=1&to=21&date=2026-10-14")
   ▼
ServicePage (on "/services")
   │  reads from / to / date with useSearchParams
   │  calls fetchServices(...) whenever they change; holds the result in state
   ├──► SearchPanel       the two city boxes (a draft) and the calendar; reports a new search upward
   ├──► FilterSearch      sort choice and the company / terminal filter lists
   ├──► DaysTab           the day strip; reports a new date upward
   └──► ServicesDisplay   sorts and filters with useMemo, renders one Panel per trip
            └──► Panel ──► fetchSeatMap ──► BusDetails ──► BusSchema ──► Seat
                    │  "buy" -> navigate("/booking/<tripId>?from=&to=&date=")
                    ▼
BookingPage (on "/booking/<tripId>")
   │  seats and step are read from the address; the typed form is ordinary state
   │  POST /trips/<id>/tickets puts the seats on hold -> navigate("/tickets/<code>")
   ▼
TicketPage (on "/tickets/<code>")
      asks the server for the ticket every time it opens and shows what its Status says
```

Values go down by props and changes come back up through callbacks. There is no shared store.

### The city list

*Written 2026-10-12.*

The 915 cities used to be bundled into the JavaScript. Now `App` fetches them once from
`GET /api/v1/cities` and passes `cities` and `citiesStatus` (`loading`, `ready` or `error`)
down to the two forms. Filtering while typing still happens in the browser; the API is never
called per key press.

- **Why in `App`:** it is the one component that is never removed, so going from the home page
  to the results page does not fetch again. Repeat visits are covered by the browser's own
  cache (the server sends `Cache-Control` and an `ETag`).
- **While loading**, the city boxes are read-only and show "در حال بارگذاری ...".
- **If the call fails**, they stay read-only and show "خطا در دریافت فهرست شهرها". There is no
  retry button; reloading the page tries again.
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
- **The booking page repeats the search to find its trip,** because the API has no "one trip"
  route. That is why `from`, `to` and `date` travel in its address; they are also the way back.

## Who owns which state

*Written 2026-10-12.*

| State | Owner | Why there |
| --- | --- | --- |
| Origin, destination, date of the search on screen | The address (`ServicePage` reads it) | So the search survives a refresh and can be shared. |
| The city list and whether it has arrived | `App` | Both pages need it, and `App` outlives both. |
| Search result, "did the call fail" | `ServicePage` | The page makes the call and three children show the result. |
| Sort choice, company and terminal filters | `ServicePage` | `FilterSearch` changes them and `ServicesDisplay` uses them; the page is their common parent. |
| The two city boxes before "search" is pressed | `SearchPanel` | A draft only this panel cares about. |
| Chosen seats and the step of the booking page | The address (`BookingPage` reads it) | So refresh and back keep the buyer's place. |
| What is typed into the passenger form | `BookingPage` | Personal details do not belong in the address; they are gone after a refresh. |
| The buyer's phone for one ticket | `sessionStorage`, per tab | Needed to open the ticket after a refresh, but must not be in the address. |
| The ticket | The server; `TicketPage` holds the last copy it received | The server decides whether a hold is alive, paid or gone. |
| Which trip's seat map is open | `ServicesDisplay` | The parent of all the cards, so opening one closes the others. |
| Home form: cities, date, "show the missing messages" | `HomeHeader` | Only the form uses them. |
| Home page: which city box has the focus, is the calendar open | `MainPage` | Both the form and the navbar (which dims) need them. |

## Rules the code now follows

*Updated 2026-10-12.*

- No `document.querySelector` or `getElementById` on anything React renders. The only one left
  is `main.tsx` finding `#root`. Focus is moved with refs.
- No `setTimeout` to put events in order. The 4 that remain each wait for a CSS animation and
  say which one in a comment (`AlertBox`, `RefundBox`, `Panel`, `CustomInput`). The one in
  `BusDetails` went away on 2026-10-12 with the seat-map rewrite. The ticket countdown uses
  one `setInterval`, a real clock tick.
- `window` / `document` listeners are used only for global things: the Enter and Escape keys,
  scroll, resize, and "click outside" for popups.
- No `any`.

Before 2026-10-12 the counts were 18 `querySelector` calls, 22 `setTimeout` calls and 5 `any`.
