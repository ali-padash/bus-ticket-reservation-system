# backend/internal/domain

*Written 2026-10-12.*

The words the backend speaks in. One file, `domain.go`. It imports only the standard library,
and has no JSON tags and no database tags.

## Types

| Type | Meaning |
| --- | --- |
| `City` | A city: id, code, English and Persian name. |
| `CityEntry` | A `City` plus what the search box needs: province, rank, and every spelling a visitor might type. |
| `Terminal` | A bus station. |
| `Company` | A bus company. |
| `Trip` | One bus on one day, with its company, both terminals, price and free seat count. |
| `Seat` | One seat of a trip. `Gender` is nil while it is empty. |
| `TripSearch` | The question: from which city, to which city, on which day. |
| `SearchResult` | The answer: both cities and the list of trips. |

## Errors

`ErrCityNotFound` and `ErrTripNotFound`. The store returns them, the service passes them up
(wrapped with more detail), and the web layer recognises them with `errors.Is` and answers 404.
Any error that is not one of these is treated as a server fault and answered with 500.

## Constants

`GenderMale` (`"M"`), `GenderFemale` (`"F"`), and the ticket states `TicketReserved`,
`TicketPaid`, `TicketCancelled`. They match the values the database allows.

## Why these are separate from the JSON and the tables

The JSON has 30 fields per trip in a flat list, six of them always empty, because it copies
the real Safar724 response. The database spreads the same facts over five tables. `Trip` is
neither: it is the shape that is convenient to reason about. The store converts rows into it,
and the web layer converts it into JSON, so either side can change without the other noticing.

## Things to know

- A trip is a row of the `services` table. The code says "trip"; the table kept its old name.
- `DepartureDate` and `DepartureTime` are text (`2026-10-12`, `08:30`): local Iranian time
  with no time zone attached.
