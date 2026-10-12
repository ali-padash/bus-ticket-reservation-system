# backend/internal/httpapi

The web layer. This replaces the old `server` package.

**This doc is the API contract.** The website is built against what is written here.

## Files

*Updated 2026-10-12.*

| File | Job |
| --- | --- |
| `router.go` | `NewHandler`: the routes, the CORS rule, and the one-line-per-request log. |
| `trips.go` | The three trip handlers and the structs that define the JSON. |
| `errors.go` | The one error shape, and the mapping from named errors to 404 or 500. |
| `trips_test.go` | Tests that send real HTTP requests to the handler with a fake service behind it. |

`NewHandler(trips, log, corsOrigin)` receives the service it should call. It does not open a
port; `cmd/api` does that. A handler does three things only: read and check the input, call the
service, turn the result into JSON. The JSON field names are defined by the response structs in
`trips.go`, separate from the `domain` types, so the contract cannot change by accident when
the inside of the backend changes.

CORS allows one website address (`CORS_ORIGIN`, default `http://localhost:5173`) and the
methods GET, POST and OPTIONS.

## Routes

*Updated 2026-10-12: routes renamed to REST style. The old `getservices`, `getseats` and
`getnumberofavailableseat` routes no longer exist.*

All are `GET`. A "trip" is one row of the `services` table.

### `GET /api/v1/trips?from=&to=&date=`

Search for trips.

| Parameter | Meaning |
| --- | --- |
| `from` | Origin **city** ID |
| `to` | Destination **city** ID |
| `date` | `YYYY-MM-DD`, Gregorian calendar |

The search matches trips whose terminals are in those cities. Results are ordered by departure time.

Returns `200`:

```json
{
  "Date": "2026-10-12",
  "OriginPersianName": "...", "OriginEnglishName": "...", "OriginCode": "...",
  "DestinationPersianName": "...", "DestinationEnglishName": "...", "DestinationCode": "...",
  "Today": null,
  "Logo": null,
  "Items": [ { "ID": 3, "Price": 5920000, "DepartureTime": "08:30", "AvailableSeatCount": 26, "...": "..." } ]
}
```

`Items` is an empty list when there are no trips. The full list of the 30 `Items` fields is
the `tripResponse` struct in `trips.go`.

### `GET /api/v1/trips/{id}/seats`

Returns `200` with one entry per seat on the bus, ordered by seat number:

```json
[ { "SeatNumber": 1, "Accessible": true, "Gender": null } ]
```

- `Gender` is `"M"`, `"F"`, or `null` when nobody sits there.
- `Accessible` false means the seat is not for sale.

### `GET /api/v1/trips/{id}/availability`

Returns `200` with `{ "AvailableSeatCount": 26 }`.

## Errors

Every error has the same shape: `{ "error": "a short message" }`.

| Status | When |
| --- | --- |
| `400` | `from` or `to` is not a number, `date` is not `YYYY-MM-DD`, or the trip id is not a number. |
| `404` | The origin or destination city does not exist, or the trip does not exist. |
| `500` | Something failed on the server. The message is always `Internal server error`; the real cause is written to the server log only. |

## Tests

*Written 2026-10-12.*

7 tests, no database. One of them runs 15 request cases and checks the status and the exact
error text of each. The others check that a server fault never shows its real cause to the
browser, that bad input never reaches the service, that the search response has its 10 fields
and each trip its 30, that "no trips" is `[]` and not `null`, and that only the allowed website
address gets a CORS header.

## Things still to improve

*Updated 2026-10-12.*


- JSON field names are in `PascalCase` (`AvailableSeatCount`), copied from the real Safar724
  API. The usual style is `camelCase`. Changing it means changing the website's types too.
- These `Items` fields are always empty: `MidwayCity`, `MidwayCityCode`, `MidwayEnglishName`,
  `OriginTerminalUrl`, `DestinationTerminalUrl`, `Status`. So are `Today` and `Logo`.
- There are no POST routes, so nothing can be booked.
- No written OpenAPI spec yet.
