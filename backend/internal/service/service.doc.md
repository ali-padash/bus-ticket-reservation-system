# backend/internal/service

*Written 2026-10-12.*

The rules of the application. One file, `trips.go`, and its test.

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

## Why this layer exists when it is so thin

Today the three methods mostly pass calls through. The layer is here because booking is next,
and booking is all rules: the seats must belong to the trip, must be for sale, must be free,
the phone number must be valid, and the whole purchase must succeed or fail as one. Those rules
must not live in the HTTP code (they would be untestable without a web request) or in the SQL
(they would be invisible).

## Tests

4 tests, no database: search returns cities and trips; an unknown origin or destination gives
`ErrCityNotFound` without running the search; a store failure is passed up; seats and
availability work and report an unknown trip.
