# backend/internal/store

*Rewritten 2026-10-12. This replaces the old `db` package.*

The only package that talks to PostgreSQL. It returns `domain` types and `domain` errors, so
nothing above it sees SQL or GORM.

## Files

| File | Job |
| --- | --- |
| `store.go` | `Open`, `Migrate`, `Close`. |
| `trips.go` | The read queries for trips: search, seats, free seat count, layout, refund rules. |
| `bookings.go` | Holding seats, paying, cancelling, expiring, and reading a ticket. |
| `cities.go` | The query for the full city list. |
| `trips_test.go`, `cities_test.go`, `bookings_test.go` | Tests that run those queries against a real database. |

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

*Updated 2026-10-12.*

A seat is free when `for_sale` is true **and** no passenger holds it. A passenger holds a seat
while the row is `active` and the ticket is not an unpaid hold past its deadline. So an expired
hold stops counting at the exact second it runs out, without waiting for the clean-up job. The
SQL for this is in the `holdsSeat` and `freeSeatCount` constants, shared by all seat queries.

## `bookings.go`

*Written 2026-10-12.*

| Method | What it does |
| --- | --- |
| `CreateHold(hold)` | Sets seats aside under a new ticket, or changes nothing. |
| `PayHold(code, phone)` | Turns a hold into a paid ticket. Too late gives `ErrHoldExpired`. Paying twice is harmless. |
| `CancelHold(code, phone)` | Gives up a hold and frees its seats. A paid ticket gives `ErrTicketPaid`. |
| `ExpireHolds()` | Ends every unpaid hold past its deadline. Returns how many. |
| `Ticket(code, phone)` | One ticket with its trip and passengers. The phone must match. |
| `Layout(tripID)`, `RefundRules(tripID)` | In `trips.go`: the bus floor plan and the cancellation rules. |

### How two buyers cannot get the same seat

`CreateHold` runs in **one transaction**, in this order:

1. Read the trip. Stop if it does not exist or the bus has left.
2. **Lock the chosen seat rows** (`SELECT ... FOR UPDATE`), in seat-number order. A second buyer
   who wants any of the same seats now waits at this line until the first purchase is decided.
3. End any unpaid hold past its deadline on those seats, so they come free right now.
4. Check each seat: on this bus, for sale, and held by nobody. If any fails, stop and report
   which ones. Nothing has been written, so it is all or nothing.
5. Insert the ticket and its passengers. Commit.

Three things protect a seat, each enough by itself:

- **The lock** makes buyers of the same seat go one at a time.
- **The check after the lock** sees the truth, because nobody else can change those seats now.
- **The unique index** on active passengers is the last line of defence. If the code above had
  a bug, the database would still refuse the second passenger. The tests were run once with
  the lock removed, and no seat was sold twice.

Locking in seat-number order matters when purchases overlap. If one buyer locked seat 3 then 4
and another 4 then 3, each could hold one and wait for the other forever (a deadlock). With one
order for everyone, that cannot happen.

These checks live in the store, not the service, because they are only true while the lock is
held. The service checks what needs no database (phone, names, national codes).

Paying, cancelling and expiring each lock the **ticket** row first, so they also go one at a
time for the same ticket.


### How rows become domain types

The queries are hand-written SQL. GORM runs them and copies each row into a small private
struct (`tripRow`, `seatRow`) by matching column names; `toDomain` then builds the
`domain.Trip`. The day is sent to the database as text (`2026-10-12`) so a time zone can never
move it to the day before.

## Tests

19 tests against a real PostgreSQL. They are **skipped** when `DATABASE_URL` is not set or the
database cannot be reached.

Each test opens a transaction, inserts its own small trip (two test cities with ids 900001 and
900002, one bus with 4 seats: one taken, one not for sale, two free), runs the query, and rolls
the transaction back. So the tests do not depend on the demo data and leave nothing behind.

They check that all trip fields are mapped, that the free-seat count is 2, that a different
day, direction or city finds nothing, and that unknown ids give the right named error.

Twelve of the tests are for booking (2026-10-12). Ten run in a rolled-back transaction: a hold
and its ticket; five kinds of seats that are refused, each leaving the free seats untouched; a
departed or unknown trip; a repeated ticket code; an expired hold giving its seats back at
once; paying, paying twice, paying too late; cancelling and re-buying; the clean-up job; the
layout and refund rules.

Two need buyers on separate connections, so they **commit** their rows and delete them
afterwards (test cities 900001 and 900002, codes starting `TST`):

- **20 buyers, one seat:** 20 purchases of the same seat start at the same instant. Exactly one
  succeeds, 19 are told the seat is taken, and the database holds one passenger and one ticket.
- **Overlapping purchases:** 24 buyers want seats 3 and 4 in different combinations and orders.
  No deadlock, and each seat ends up sold exactly once.

## Things still to improve

- `midway_cities` is never read.
- A passenger on a cancelled ticket still holds the seat. This has to be handled when booking
  and cancelling are built.
- GORM is used only to run SQL and copy rows. `pgx` with `sqlc` would fit this style better;
  because all database code is in this one folder, that swap would touch nothing else.
