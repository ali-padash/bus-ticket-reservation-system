# devs/src

All frontend code.

## Layout

| Path | Contents | Doc |
| --- | --- | --- |
| `main.tsx` | Mounts `<App />` into the page. | — |
| `App.tsx` | Defines the two routes. | — |
| `pages/` | One component per route. | [pages.doc.md](pages/pages.doc.md) |
| `components/` | 41 UI components, all in one flat folder. | [components.doc.md](components/components.doc.md) |
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

`from` and `to` are city IDs from `util/cities.json`. A link without a usable `date` means
today. A link without two known cities shows the error text and the "please enter" message.

There is no "not found" route.

## How data moves

*Rewritten 2026-10-12.*

**The search is the address.** Nothing else remembers it, so a refresh, the back button or a
shared link repeats the same search.

```
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
            └──► Panel ──► BusDetails ──► fetchSeats ──► BusSchema ──► Seat
```

Values go down by props and changes come back up through callbacks. There is no shared store.

## Who owns which state

*Written 2026-10-12.*

| State | Owner | Why there |
| --- | --- | --- |
| Origin, destination, date of the search on screen | The address (`ServicePage` reads it) | So the search survives a refresh and can be shared. |
| Search result, "did the call fail" | `ServicePage` | The page makes the call and three children show the result. |
| Sort choice, company and terminal filters | `ServicePage` | `FilterSearch` changes them and `ServicesDisplay` uses them; the page is their common parent. |
| The two city boxes before "search" is pressed | `SearchPanel` | A draft only this panel cares about. |
| Which trip's seat map is open | `ServicesDisplay` | The parent of all the cards, so opening one closes the others. |
| Home form: cities, date, "show the missing messages" | `HomeHeader` | Only the form uses them. |
| Home page: which city box has the focus, is the calendar open | `MainPage` | Both the form and the navbar (which dims) need them. |

## Rules the code now follows

*Written 2026-10-12.*

- No `document.querySelector` or `getElementById` on anything React renders. The only one left
  is `main.tsx` finding `#root`. Focus is moved with refs.
- No `setTimeout` to put events in order. The 5 that remain each wait for a CSS animation and
  say which one in a comment (`AlertBox`, `RefundBox`, `BusDetails`, `Panel`, `CustomInput`).
- `window` / `document` listeners are used only for global things: the Enter and Escape keys,
  scroll, resize, and "click outside" for popups.
- No `any`.

Before 2026-10-12 the counts were 18 `querySelector` calls, 22 `setTimeout` calls and 5 `any`.
