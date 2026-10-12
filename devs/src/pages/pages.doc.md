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

## `BookingPage.tsx` — route `/booking/<tripId>`

*Written 2026-10-12.*

Steps 2 and 3 of buying. The frame is `BookingFrame`; beside the main card sits `TripSummary`.
The main card shows `BookingSteps` and then either `SeatPicker` or `PassengerForm`.

What is in the address, and why:

| Part | Meaning |
| --- | --- |
| `from`, `to`, `date` | The search the buyer came from. The page repeats it to find its trip (the API has no "one trip" route), and uses it for "back to the results". |
| `seats=18,19` | The chosen seats. A seat click replaces the history entry, so "back" does not replay every click. |
| `step=passengers` | Present on the form step. Changing step adds a history entry, so "back" returns to the seats. |

What is ordinary state: the seat map, the phone and passenger details being typed (kept by seat
number, so going back to the seats and returning does not lose them), the messages per field.

On submit: browser checks, then `POST /trips/<id>/tickets`.

- `201`: the phone and the search are saved for this tab and the page moves to `/tickets/<code>`.
- `validation_failed`: a message under each field the server names.
- `seats_unavailable`: back to the seat step, the lost seats dropped from the choice, the seat
  map loaded again, and a message naming them.
- `trip_departed`, or anything else: a message above the buttons.

## `TicketPage.tsx` — routes `/tickets/<code>` and `/tickets/<code>/payment`

*Written 2026-10-12.*

Steps 4 and 5. Every time it opens it calls `POST /tickets/<code>/lookup` with the phone from
`sessionStorage`, and then shows one of these:

| Situation | Shown |
| --- | --- |
| No phone in this tab, or the phone does not open the ticket | `PhonePrompt` |
| `reserved`, on `/tickets/<code>` | `TicketReview`: passengers, prices, refund rules, countdown |
| `reserved`, on `/tickets/<code>/payment` | `FakeBank`: the demo bank page with "pay" and "cancel" |
| `paid` | `TicketIssued`: the 12-digit code, trip, passengers and seats |
| `cancelled`, `expired`, or the countdown at zero | `TicketFailed`: says the seats were released |

"Pay" and "cancel" call the API, show the ticket that comes back, and return to
`/tickets/<code>`. If the server says the ticket was already settled (`hold_expired`,
`ticket_cancelled`, `ticket_already_paid`), the page reads the ticket again and shows the truth.

The review has no "edit" button: the seats are already on hold, so changing the details means
cancelling and starting again.

## Problems

*Updated 2026-10-12.*

- `TicketModel` (a "no service on this route" notice) is always shown on the results page, with
  Tehran, Rasht and a date typed in by hand.
- There is no "not found" route.
- A refresh on the passenger form keeps the seats but loses what was typed.
- There is no page to find a ticket by typing its code; a ticket opens only from its address.
- Pressing "search" twice without changing anything adds a second, identical entry to the
  browser history.
