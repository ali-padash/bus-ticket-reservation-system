# backend/internal/service

*Written 2026-10-12.*

The rules of the application. Two files, `trips.go` and `cities.go`, each with its test.

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

## `Cities`

*Written 2026-10-12.*

Created with `NewCities(store, lifetime, now)`. It serves the city list **from memory**.

| Method | What it does |
| --- | --- |
| `List()` | Returns every city and the time the list was read. Reads the database only when it has no list, or the list is older than `lifetime` (one hour in the real program). |
| `Invalidate()` | Forgets the list, so the next `List` reads the database again. |

Why: the list changes almost never and every visitor needs it. Reading 915 cities and 12,242
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

Today the three methods mostly pass calls through. The layer is here because booking is next,
and booking is all rules: the seats must belong to the trip, must be for sale, must be free,
the phone number must be valid, and the whole purchase must succeed or fail as one. Those rules
must not live in the HTTP code (they would be untestable without a web request) or in the SQL
(they would be invisible).

## Tests

9 tests, no database. Five are for the city cache: one read inside the lifetime, a new read
after it, a new read after `Invalidate`, recovery after a failed read, and one read for 100
visitors at once. Four are for trips: search returns cities and trips; an unknown origin or destination gives
`ErrCityNotFound` without running the search; a store failure is passed up; seats and
availability work and report an unknown trip.
