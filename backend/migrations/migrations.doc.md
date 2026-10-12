# backend/migrations

The SQL files that create and change the database tables. They are the single source of truth
for the schema. The Go structs in `internal/seed/rows.go` only mirror them.

## How it works

The tool is [goose](https://github.com/pressly/goose). The files are compiled into the Go
program (`migrations.go` embeds them), and `store.Migrate()` runs any that have not run yet
every time the backend starts. Goose
remembers what it has run in a table called `goose_db_version`.

## Rules

- **Never edit a migration that has already been run somewhere.** Add a new file instead.
- Name files `NNNNN_short_description.sql`, with the next number.
- Each file has a `-- +goose Up` part and a `-- +goose Down` part that undoes it.

## Files

### `00001_initial_schema.sql`

Creates the 12 tables:

| Table | One row is |
| --- | --- |
| `cities` | A city. IDs come from the source list, they are not generated. |
| `search_expressions` | One alternate spelling of a city, for autocomplete. |
| `terminals` | A bus station. Belongs to a city. |
| `companies` | A bus company. |
| `bus_types` | A seat layout: code, seat count, VIP or not. |
| `services` | One bus trip on one day, between two terminals. |
| `midway_cities` | A stop along a trip. |
| `seats` | One seat on one trip. Every seat of every trip has a row. |
| `refund_rules` | "Cancel at least N hours before departure, lose X percent." |
| `users` | A registered customer. |
| `tickets` | One purchase, for one trip. |
| `passengers` | One person in one seat, on a ticket. |

### `00002_guest_tickets.sql`

*Written 2026-10-12.*

Lets a ticket be bought **without an account**, the way the real site works.

- `tickets.user_id` may now be empty.
- New column `tickets.contact_phone`, required, and it must look like an Iranian mobile number
  (11 digits starting with `09`). Existing tickets got their user's number.
- New index on `contact_phone`, so "all tickets of this number" is a fast lookup.

The `users` table stays. An account is optional: a ticket can still point at a user, and a
"my tickets" page can be built on the phone number alone.

Undoing this migration deletes guest tickets, because they cannot exist once a user is required.

### `00003_booking.sql`

*Written 2026-10-12.*

What buying a ticket needs.

- **`bus_types.layout`**: the floor plan of the bus, as JSON. A list of rows, each a list of
  seat numbers, with `null` for empty floor. JSON fits here because the plan is a small grid
  that is always read whole and never searched inside.
- **`tickets.price_per_seat`, `total_price`**: the price is copied onto the ticket, so a later
  price change does not alter a sale.
- **`tickets.expires_at`, `paid_at`**: a ticket starts as a hold that must be paid before
  `expires_at`. A hold without a deadline is refused by a check.
- **Ticket status** gains `expired`, for a hold that was not paid in time.
- **`passengers.active`**, and the seat rule changes from "one passenger per seat, ever" to
  **"one active passenger per seat"** (a unique index that only covers active rows). Without
  this, a cancelled or expired hold would lock its seat for good. Cancelling or expiring a
  ticket sets its passengers to not active; the rows stay as history.
- An index on unpaid holds by deadline, for the clean-up job.

### Rules the database enforces by itself

- At most one **active** passenger per seat: **a seat cannot be sold twice.** (Since migration 3;
  before that, one passenger per seat at all.)
- `(service_id, seat_number)` is unique in `seats`: no duplicate seat numbers on a trip.
- A trip's origin and destination terminals must differ.
- Prices cannot be negative. Percentages must be 0 to 100.
- Gender must be `M` or `F`. Ticket status must be `reserved`, `paid`, `cancelled` or `expired`.
- Usernames, emails, national codes, ticket codes, and all `code` columns are unique.
- Every link between tables is a real foreign key.

### Indexes

- `services_search_idx` on `(departure_date, origin_terminal_id, destination_terminal_id)` for the search.
- `search_expressions_prefix_idx` on `lower(expression)` for "starts with" autocomplete.
- Plain indexes on the foreign keys that get looked up: terminals by city, tickets by trip and by user,
  passengers by ticket.

## How this differs from the old design

The diagram at the repo root (`Safar724.drawio.png`) shows the **old** design and is out of date.

| Old | New | Why |
| --- | --- | --- |
| Trips pointed straight at cities, which doubled as terminals. | A separate `terminals` table. | The site filters by terminal, which made no sense when a city and its terminal were the same row. |
| `seats` had rows for only some seats. | Every seat has a row. | Free seats become a simple count, and a booking has a row to lock. |
| `passengers` keyed by `(ticket_id, seat_id)`. | Own `id`, and `seat_id` unique. | The old key allowed two tickets to hold the same seat. |
| `cancellation_conditions` joined to `refund_rules`, with fixed timestamps and no percentage. | One `refund_rules` table with hours and a percent. | The old shape could not express "10% up to one hour before". |
| Dates, times and birth dates stored as text. | `date` and `time` columns. | The database can now reject nonsense and sort correctly. |
| No unique rules, no checks, no indexes. | See above. | |
| `deleted_at` soft-delete columns from `gorm.Model`. | Removed. | The hand-written joins ignored them, so "deleted" rows still showed up. |
| Gender as `male` / `female`. | `M` / `F`. | Matches what the website's seat map expects. |
| `cities."order"`. | `cities.sort_order`. | `order` is a reserved word in SQL. |

## Open design questions

*Updated 2026-10-12: guest purchase was decided and done in migration 2.*

- Nothing forces a passenger's seat to belong to the same trip as their ticket. The booking code
  must check it.
