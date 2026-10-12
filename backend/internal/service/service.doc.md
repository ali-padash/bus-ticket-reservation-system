# backend/internal/service

*Written 2026-10-12.*

The rules of the application. Three files, `trips.go`, `cities.go` and `bookings.go`, each with
its test.

## `Trips`

Created with `NewTrips(store)`. The store is anything that satisfies the `TripStore` interface
declared in this file; in the real program it is `store.Store`, in the tests it is a fake.

| Method | Rule |
| --- | --- |
| `Search(query)` | Both cities must exist, otherwise `ErrCityNotFound` and no trip query runs. A day with no trips is an empty list, not an error. |
| `Seats(tripID)` | Every seat of the trip, or `ErrTripNotFound`. |
| `Availability(tripID)` | How many seats can still be bought, or `ErrTripNotFound`. |

Errors are wrapped with what was being attempted (`origin city 999: city not found`), so the
server log says where it failed, while `errors.Is` still recognises the original error.

`Trip(tripID)`, `SeatMap(tripID)` and `RefundRules(tripID)` were added on 2026-10-12: one trip
with its two cities, the bus floor plan with the state of every seat, and what cancelling costs.

## `Bookings`

*Written 2026-10-12.*

Created with `NewBookings(store, holdFor, now)`. `holdFor` is how long seats stay set aside
(10 minutes in the real program).

| Method | What it does |
| --- | --- |
| `Hold(request)` | Checks the request, makes a ticket code, and asks the store to set the seats aside. Returns the new ticket. |
| `Ticket(code, phone)` | A ticket, for whoever knows both its code and its phone number. |
| `Pay(code, phone)` | Turns a hold into a paid ticket. |
| `Cancel(code, phone)` | Gives up a hold. |
| `ExpireHolds()` | Ends holds that ran out of time. Called once a minute by `cmd/api`. |

**What `Hold` checks itself**, before touching the database: the phone is 11 digits starting
with `09`; 1 to 4 passengers; no seat or national code twice; names are 1 to 50 characters and
letters only, in any alphabet, so Persian and English names both pass and "Ali2" does not
(spaces, a hyphen, an apostrophe and the Persian half-space are allowed); gender
is `M` or `F`; the birth date is real and not in the future; and each national code passes the
Iranian check-digit rule (`ValidNationalCode`). It collects **all** faults and returns them
together, so a form can mark every wrong box at once.

**Persian digits are accepted** (2026-10-12). A phone number, national code or ticket code
typed in Persian or Arabic digits is turned into `0-9` before it is checked or stored, so the
database only ever holds Latin digits.

**What it leaves to the store:** whether the seats are still free. That is only true while the
seat rows are locked, so it is checked inside the store's transaction.

**The ticket code** is 12 random digits from the operating system's secure source, because the
code is half of what opens a ticket and must not be guessable. If a new code already exists
(about one chance in a million million) it tries again, up to 3 times.

## `Cities`

*Written 2026-10-12.*

Created with `NewCities(store, lifetime, now)`. It serves the city list **from memory**.

| Method | What it does |
| --- | --- |
| `List()` | Returns every city and the time the list was read. Reads the database only when it has no list, or the list is older than `lifetime` (one hour in the real program). |
| `Invalidate()` | Forgets the list, so the next `List` reads the database again. |

Why: the list changes almost never and every visitor needs it. Reading 915 cities and 12,397
spellings from the database for each visitor would be wasted work.

Three details worth knowing:

- **One read for a crowd.** A lock is held while the list loads, so 100 visitors arriving at an
  empty cache cause one database read. There is a test for exactly this.
- **A failed read is not remembered.** The error is returned and the next request tries again.
- **The clock is an argument.** The test passes in a fake clock and moves it by hand, so "an
  hour later" takes no time to test.

The cache lives in the memory of one server. With several servers each would keep its own copy
and they could differ for up to an hour; that is acceptable for a list of cities.

## Why this layer exists when it is so thin

The trip methods mostly pass calls through. The layer earns its place with booking, which is
all rules: what a valid passenger is, how a ticket code is made, how long a hold lasts. Those
rules must not live in the HTTP code (they would be untestable without a web request) or be
buried in SQL.

## Tests

21 tests, no database. Eleven are for booking: 8 names that must pass and 8 that must not;
Persian and Arabic digits stored as Latin; the national code rule against 4 valid and 8
invalid codes; a clean request reaches the store trimmed; 14 kinds of bad request are each
refused without touching the store; all faults are reported at once; a repeated ticket code is
retried and given up after 3; a taken seat is not retried; pay and cancel errors are passed
up; and 1,000 ticket codes are all different. Five are for the city cache: one read inside the lifetime, a new read
after it, a new read after `Invalidate`, recovery after a failed read, and one read for 100
visitors at once. Five are for trips: one trip with its cities; search returns cities and trips; an unknown origin or destination gives
`ErrCityNotFound` without running the search; a store failure is passed up; seats and
availability work and report an unknown trip.
