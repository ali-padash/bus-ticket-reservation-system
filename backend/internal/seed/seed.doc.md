# backend/internal/seed

*Written 2026-10-12. The seed used to live in the old `db` package.*

Fills the database with demo data. Run it with `go run ./cmd/api seed` from `backend/`.

## Files

| File | Job |
| --- | --- |
| `seed.go` | `Run(db, citiesPath, log)` and its helpers. |
| `rows.go` | Go structs that mirror the table rows being inserted. |

## What `Run` does

It runs inside one transaction, so it either fully works or changes nothing.

1. Empties every table.
2. Loads the 915 cities and their 12,242 search spellings from `cities.json`.
3. Creates 4 bus types, 6 made-up companies, and 12 terminals in 8 big cities
   (Tehran has three, Mashhad and Esfahan two, the rest one).
4. Creates 2 to 5 trips per day, for the next 14 days, between every pair of those 8 cities.
5. Creates one seat row per seat for each trip, and two refund rules per trip.
6. Creates 20 demo users.
7. Sells a random share of seats on about three quarters of the trips, and marks one seat as
   not for sale on about a third of them. **About four tickets in five are guest purchases**
   (no user, only a mobile number); the rest belong to a demo user.

A typical run gives about 2,700 trips, 77,000 seats, 10,000 tickets and 18,000 passengers, and
takes a few seconds. Data is random, so numbers differ a little each run. Because trips start
from today, re-run the seed when the data gets old.

## `rows.go`

GORM is useful here: it inserts thousands of rows in batches and hands back their new ids.
The structs are only for that. They do **not** define the tables; the SQL in `migrations/`
does. If a table changes, write a migration first, then update the struct.

- `BusType.IsVIP` needs its explicit column tag, otherwise GORM would look for `is_v_ip`.
- `Ticket.UserID` is a pointer because a guest ticket has no user.

## Things still to improve

- The seed reads the city list from the frontend folder (`../devs/src/util/cities.json`).
  It should move next to the backend once the website loads cities from the API.
- `midway_cities` is never filled.
- No tests.
