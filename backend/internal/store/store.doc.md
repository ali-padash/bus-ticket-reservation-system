# backend/internal/store

*Rewritten 2026-10-12. This replaces the old `db` package.*

The only package that talks to PostgreSQL. It returns `domain` types and `domain` errors, so
nothing above it sees SQL or GORM.

## Files

| File | Job |
| --- | --- |
| `store.go` | `Open`, `Migrate`, `Close`. |
| `trips.go` | The four read queries for trips. |
| `cities.go` | The query for the full city list. |
| `trips_test.go`, `cities_test.go` | Tests that run those queries against a real database. |

## `store.go`

| Function | What it does |
| --- | --- |
| `Open(databaseURL)` | Connects and pings. Returns a `*Store`; there is no global connection. |
| `Migrate()` | Runs the SQL files from `migrations/` that have not run yet. |
| `Close()` | Closes the connection pool. |
| `DB()` | Hands out the raw connection. Only the seed uses it. |

## `trips.go`

| Method | What it does |
| --- | --- |
| `City(id)` | One city, or `ErrCityNotFound`. |
| `TripsBetween(originCityID, destinationCityID, date)` | The search. Trips on that day whose origin terminal is in the first city and whose destination terminal is in the second, ordered by departure time. One query with five joins. |
| `Seats(tripID)` | Every seat of a trip with the passenger's gender if it is taken, or `ErrTripNotFound`. |
| `FreeSeatCount(tripID)` | Free seat count for one trip, or `ErrTripNotFound`. |

Every method takes a `context`, so a request the browser has abandoned stops its query.

## `cities.go`

*Written 2026-10-12.*

`Cities()` returns all 915 cities, each with its list of spellings, best-ranked first. It runs
two plain queries (cities, then spellings) and joins them in Go. That is simpler than one query
that packs the spellings into arrays, and it runs at most once an hour because the service
keeps the result in memory.

### How "free seats" is calculated

A seat is free when `for_sale` is true **and** no row in `passengers` points at it. The SQL for
this is the `freeSeatCount` constant, shared by the search and the count query.

### How rows become domain types

The queries are hand-written SQL. GORM runs them and copies each row into a small private
struct (`tripRow`, `seatRow`) by matching column names; `toDomain` then builds the
`domain.Trip`. The day is sent to the database as text (`2026-10-12`) so a time zone can never
move it to the day before.

## Tests

7 tests against a real PostgreSQL. They are **skipped** when `DATABASE_URL` is not set or the
database cannot be reached.

Each test opens a transaction, inserts its own small trip (two test cities with ids 900001 and
900002, one bus with 4 seats: one taken, one not for sale, two free), runs the query, and rolls
the transaction back. So the tests do not depend on the demo data and leave nothing behind.

They check that all trip fields are mapped, that the free-seat count is 2, that a different
day, direction or city finds nothing, and that unknown ids give the right named error.

## Things still to improve

- `midway_cities` is never read.
- A passenger on a cancelled ticket still holds the seat. This has to be handled when booking
  and cancelling are built.
- GORM is used only to run SQL and copy rows. `pgx` with `sqlc` would fit this style better;
  because all database code is in this one folder, that swap would touch nothing else.
