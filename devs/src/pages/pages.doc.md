# devs/src/pages

One file per route. Every route sits under a language, `/en` or `/fa`; `<lang>` below is one of
the two. `LanguageLayout` (in `components/`) checks it before any page is drawn, and a page
builds its links with `path()` from `useLocale()`, which puts the language in front
(2026-10-12). See "Two languages" in [src.doc.md](../src.doc.md).

## `MainPage.tsx` — route `/<lang>/`

*Updated 2026-10-12.*

The landing page. It stacks these components top to bottom:

`WholeNavbar` → `HomeHeader` (search form) → `BlueHeader` (four "how it works" cards) →
`TwoColumns` (three info cards plus an FAQ) → `PositivePoints` → `BottomNavbar`.

It receives the city list from `App` and passes it on to the form.

It owns two pieces of state: which city box has the focus, and whether the calendar is open.
They live here because two children need them: the form, and the navbar, which dims while
either is true. Everything else about the form (the keyboard handling included) is in
`HomeHeader`; see [components.doc.md](../components/components.doc.md).

## `ServicePage.tsx` — route `/<lang>/services?from=&to=&date=`

*Updated 2026-10-12.*

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

- The heading names the two cities in the page's language, from the search result
  (`OriginPersianName` or `OriginEnglishName`).
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

## `BookingPage.tsx` — route `/<lang>/booking/<tripId>`

*Updated 2026-10-12.*

Steps 2 and 3 of buying. The frame is `BookingFrame`; beside the main card sits `TripSummary`.
The main card shows `BookingSteps` and then either `SeatPicker` or `PassengerForm`.

The trip is loaded by its ID with `GET /trips/<id>`, so `/booking/<tripId>` on its own shows
the trip. "Back to the results" is built from what that call returns: the two city IDs and the
date. The trip's names and bus type are handed to `TripSummary` already in the page's language.
What else is in the address, and why:

| Part | Meaning |
| --- | --- |
| `seats=18,19` | The chosen seats. A seat click replaces the history entry, so "back" does not replay every click. |
| `step=passengers` | Present on the form step. Changing step adds a history entry, so "back" returns to the seats. |

What is ordinary state: the seat map, the phone and passenger details being typed (kept by seat
number, so going back to the seats and returning does not lose them), the messages per field.

On submit: browser checks, then `POST /trips/<id>/tickets`. The birth date is read in the
calendar of the page's language (Persian or Gregorian) and sent as Gregorian.

*Updated 2026-10-13.* Two things keep the form easy to fill:

- **Language switch.** The birth dates already typed belong to the calendar of the language
  they were typed in. When the language of the page changes, an effect writes each whole,
  valid date again in the other calendar (`convertBirthDate`), so `1374/01/21` becomes
  `1995-04-10` and the visitor types nothing twice.
- **Remembered passengers.** The phone and the passengers of an accepted purchase are kept in
  `localStorage` (`util/SavedPassengers.ts`). The next time, the phone box starts filled and
  the earlier entries are offered in three ways:
  - under each box as the visitor types, like a browser's own form history. This is a
    `<datalist>` per field, so the list, its filtering and its keyboard keys are the browser's;
  - a remembered national ID, typed or picked, fills the rest of that passenger, because an
    ID names one person;
  - each seat shows the remembered names, and one click fills that seat.

  The "remember these passengers on this device" box starts ticked since 2026-10-13, so this
  works without the visitor doing anything, as form history does. Sending the form with the
  box unticked keeps nothing and forgets everything kept: a national ID is personal, so the
  way out is one click. It is in the browser because the API has no accounts.

- `201`: the phone is saved for this tab and the page moves to `/<lang>/tickets/<code>`.
- `validation_failed`: a message under each field the server names.
- `seats_unavailable`: back to the seat step, the lost seats dropped from the choice, the seat
  map loaded again, and a message naming them.
- Any other code: its own sentence above the buttons; a fault without a known code gets the
  general sentence.

The page keeps the *name* of each message, not the sentence (`fieldErrors` holds names such as
`NationalCode`, `submitError` a key such as `errors.codes.trip_departed`). The sentence is
looked up when it is drawn, so switching the language translates the messages on screen.

## `TicketPage.tsx` — routes `/<lang>/tickets/<code>` and `/<lang>/tickets/<code>/payment`

*Updated 2026-10-12.*

Steps 4 and 5. Every time it opens it calls `POST /tickets/<code>/lookup` with the phone from
`sessionStorage`, and then shows one of these. "Back to the results" on the failure page is
built from the ticket's own trip (`OriginCityID`, `DestinationCityID`, `DepartureDate`), so it
is right even in a tab that never saw the search. A code written in the address with Persian
digits is read as the same code.

| Situation | Shown |
| --- | --- |
| No phone in this tab, or the phone does not open the ticket | `PhonePrompt` |
| `reserved`, on `/<lang>/tickets/<code>` | `TicketReview`: passengers, prices, refund rules, countdown |
| `reserved`, on `/<lang>/tickets/<code>/payment` | `FakeBank`: the demo bank page with "pay" and "cancel" |
| `paid` | `TicketIssued`: the 12-digit code, trip, passengers and seats |
| `cancelled`, `expired`, or the countdown at zero | `TicketFailed`: says the seats were released |

"Pay" and "cancel" call the API, show the ticket that comes back, and return to
`/<lang>/tickets/<code>`. If the server says the ticket was already settled (`hold_expired`,
`ticket_cancelled`, `ticket_already_paid`), the page reads the ticket again and shows the truth.
On the English pages the trip is shown from the ticket's English fields (`CompanyName`,
`BusTypeEnglish`, `OriginEnglishName`, `OriginTerminalName` and the two for the destination).

The review has no "edit" button: the seats are already on hold, so changing the details means
cancelling and starting again.

## `FindTicketPage.tsx` — route `/<lang>/tickets`

*Written 2026-10-13.*

"Find a ticket": the page behind the menu link. The visitor types the 12-digit ticket code and
the buyer's mobile number, and the page opens that ticket. Top to bottom, inside
`BookingFrame`: the title and one line of introduction, a card with the two boxes and one
button, a card that explains how it works with four notes, and four questions.

- **Both values are asked for together, in one card.** That is how the API opens a ticket
  (`POST /tickets/<code>/lookup` with the phone in the body). There is no search by mobile
  number alone, on purpose: it would show a person's tickets to anyone who knows their number.
- **Checked in the browser first:** the code must be exactly 12 digits (`isValidTicketCode`)
  and the phone must pass `isValidPhone`. A fault is written under its box and no request is
  sent. Spaces inside a pasted code are dropped. Both boxes are `DigitInput`, so Persian or
  Latin digits can be typed on either page.
- **On success** the phone is saved for this tab (`savePhone`) and the page moves to
  `/<lang>/tickets/<code>`. That page asks the server again and shows what the ticket's status
  says, so this page needs no knowledge of paid, held, expired or cancelled tickets.
- **`ticket_not_found` gives one sentence** ("no ticket was found with this code and mobile
  number"), the same for a wrong code and for a wrong phone, because the API answers both the
  same way. Saying which one was wrong would let a stranger test codes.
- **Any other failure** shows the general sentence, and the button reads "try again".
- The button is disabled while the request runs; Enter in either box sends the form, because
  it is a real `<form>`. A request still on its way when the visitor leaves is cancelled.
- **The phone is never in the address.** It travels in the request body and is kept in
  `sessionStorage`.
- **The questions are the browser's own `<details>` elements.** Each opens and closes on its
  own, works with the keyboard and screen readers, and needs no state in the page.
- The page scrolls to its top when it opens, because the menu link can be pressed far down
  another page.

State it owns: the two typed values, one "is wrong" flag per box, whether a request is
running, and the *key* of the failure sentence (not the sentence, so it follows the language).

Its own styles are in `assets/css/findTicket.module.css`; the cards, boxes and button come
from `booking.module.css`.

## Problems

*Updated 2026-10-13.*

- `TicketModel` (the "being arranged" card) is always shown on the results page, also when
  trips were found. It shows the searched route and day; its "sign up" button does nothing.
- There is no "not found" page. An unknown address under a language goes to that language's
  home page, and anything else to `/en/`.
- A refresh on the passenger form keeps the seats but loses what was typed.
- A lost ticket code cannot be recovered: the "find a ticket" page needs the code, and the API
  has no search by mobile number (on purpose, see `FindTicketPage` above).
- "Find a ticket" has no tab title of its own; every page shows the site's one title.
- Pressing "search" twice without changing anything adds a second, identical entry to the
  browser history.
