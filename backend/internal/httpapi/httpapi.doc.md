# backend/internal/httpapi

The web layer. This replaces the old `server` package.

**This doc is the API contract.** The website is built against what is written here.

## Files

*Updated 2026-10-12.*

| File | Job |
| --- | --- |
| `router.go` | `NewHandler`: the routes, the CORS rule, and the one-line-per-request log. |
| `trips.go` | The three trip handlers and the structs that define the JSON. |
| `cities.go` | The city list handler, and the stored copy of its finished response. |
| `bookings.go` | The seat map, refund rules and ticket handlers, and the structs for their JSON. |
| `errors.go` | The one error shape, and the mapping from named errors to 404 or 500. |
| `trips_test.go`, `cities_test.go`, `bookings_test.go` | Tests that send real HTTP requests to the handler with a fake service behind it. |

`NewHandler(trips, cities, bookings, log, corsOrigin)` receives the services it should call. It does not open a
port; `cmd/api` does that. A handler does three things only: read and check the input, call the
service, turn the result into JSON. The JSON field names are defined by the response structs in
`trips.go`, separate from the `domain` types, so the contract cannot change by accident when
the inside of the backend changes.

CORS allows one website address (`CORS_ORIGIN`, default `http://localhost:5173`) and the
methods GET, POST and OPTIONS.

## Routes

*Updated 2026-10-12: routes renamed to REST style. The old `getservices`, `getseats` and
`getnumberofavailableseat` routes no longer exist.*

The routes in this section are all `GET`; the booking routes have their own section below.
A "trip" is one row of the `services` table.

### `GET /api/v1/cities`

*Added 2026-10-12.*

The full city list for the search boxes. No parameters. Returns `200` with a list of 915 entries:

```json
[
  {
    "ID": 1, "Code": "11320000", "Name": "tehran", "PersianName": "...",
    "ProvinceName": "Tehran", "ProvincePersianName": "...",
    "SearchExpressions": ["tehran", "..."],
    "IsCapital": true, "Order": 10
  }
]
```

- The fields are the same as in the `cities.json` file the website used to carry.
- `SearchExpressions` is every spelling a visitor might type. It is `[]`, never null, for a city without any.
- `Order` ranks suggestions: higher is shown first. The list arrives sorted by `Order` from high
  to low, and by Persian name inside the same rank.

**The website should fetch this once and filter in the browser.** It is not a search-as-you-type
route. A plain `fetch` is enough; the browser handles everything below by itself.

| Header | Value | Meaning |
| --- | --- | --- |
| `Cache-Control` | `public, max-age=300` | The browser reuses its copy for 5 minutes without asking. |
| `ETag` | a fingerprint of the content | After 5 minutes the browser asks "still this one?" and gets `304` with no body if nothing changed. |
| `Content-Encoding` | `gzip` | Sent when the browser accepts it, which all do. |

Sizes measured on 2026-10-12: 340 KB as plain JSON, **47 KB** as sent to a browser, 0 bytes for a `304`.

On the server the list is read from the database at most once an hour and kept in memory, and
the finished JSON is built and compressed once per version. So a change in the database reaches
visitors within about an hour, unless the code that makes the change clears the cache.

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

`Items` is an empty list when there are no trips. The full list of the 32 `Items` fields is
the `tripResponse` struct in `trips.go`.

#### English text

*Added 2026-10-12.*

The website has an English and a Persian version. The API does not know which one is asking:
it sends both languages in every answer and the website picks. That keeps answers the same for
everyone, so they stay easy to cache and to test.

| Thing | Persian field | English field |
| --- | --- | --- |
| Bus | `BusType` ("Volvo VIP 25 ...") | `BusTypeEnglish` ("Volvo VIP, 25 seats") |
| Description | `Description` | `DescriptionEnglish` |
| Company | `CompanyPersianName` | `CompanyName` ("sepid-rah") |
| Terminals | `OriginTerminalPersianName`, `DestinationTerminalPersianName` | `OriginTerminalName`, `DestinationTerminalName` ("central") |
| Cities | `OriginPersianName`, `DestinationPersianName` | `OriginEnglishName`, `DestinationEnglishName` ("rasht") |

`BusTypeEnglish` and `DescriptionEnglish` are finished text. The English **names** are lowercase
and may have a hyphen ("abadeh-tashk", "hamrah-safar"); the website turns them into display
names (hyphen to space, capital first letters).

### `GET /api/v1/trips/{id}`

*Added 2026-10-12.*

One trip on its own, for a page that only knows a trip id. Returns `200` with the 32 fields of
a search item plus 6 for the two cities (38 in all):

```json
{
  "ID": 1721, "Price": 4580000, "DepartureDate": "2026-10-14", "DepartureTime": "05:30",
  "AvailableSeatCount": 8, "...": "the other search-item fields",
  "OriginCityID": 132, "OriginPersianName": "...", "OriginEnglishName": "rasht",
  "DestinationCityID": 1, "DestinationPersianName": "...", "DestinationEnglishName": "tehran"
}
```

The two city IDs and `DepartureDate` are what a link back to the search needs:
`/services?from=132&to=1&date=2026-10-14`. An unknown id gives `404 trip_not_found`.

### `GET /api/v1/trips/{id}/seats`

*Older route, kept working. New code should use `/seat-map`, which also carries the layout.*

Returns `200` with one entry per seat on the bus, ordered by seat number:

```json
[ { "SeatNumber": 1, "Accessible": true, "Gender": null } ]
```

- `Gender` is `"M"`, `"F"`, or `null` when nobody sits there.
- `Accessible` false means the seat is not for sale.

### `GET /api/v1/trips/{id}/availability`

Returns `200` with `{ "AvailableSeatCount": 26 }`.

## Booking routes

*Added 2026-10-12.*

Buying is **hold, then pay**, and needs no account. The buyer picks seats and types the
passengers; the seats are then set aside for **10 minutes**; paying inside that time issues the
ticket. A ticket is opened with two things together: its 12-digit `Code` and the buyer's mobile
number. The phone number always travels in the request body, never in the address.

All `POST` bodies are JSON with `Content-Type: application/json`. Dates are Gregorian
`YYYY-MM-DD`. A field the API does not know is refused.

*Updated 2026-10-12:* a phone number, national code or ticket code may be sent in Persian or
Arabic digits; the API reads them as the same number and always answers in Latin digits
(`0-9`). `SeatNumber` and dates are still plain JSON numbers and Latin-digit text.

### `GET /api/v1/trips/{id}/seat-map`

Everything needed to draw the bus. Use this in place of `/seats` and `/availability`.

```json
{
  "Layout": [[1, 4, 7, 10, null, 14, 17, 20, 23],
             [2, 5, 8, 11, null, 15, 18, 21, 24],
             [null, null, null, null, null, null, null, null, null],
             [null, null, null, null, null, null, null, null, null],
             [3, 6, 9, 12, 13, 16, 19, 22, 25]],
  "Seats": [ { "SeatNumber": 1, "Accessible": true, "Gender": null } ],
  "AvailableSeatCount": 12
}
```

- `Layout` is the floor plan, row by row, seen from above with the driver at the start of each
  row. A number is a seat, `null` is empty floor. All rows have the same length. The number of
  rows and columns differs per bus, so draw whatever arrives.
- `Seats` is as in `/seats`: one entry per seat. A seat can be chosen when `Accessible` is true
  and `Gender` is null. A seat on hold by someone else shows that person's `Gender`, like a sold one.

### `GET /api/v1/trips/{id}/refund-rules`

```json
[ { "MinHoursBeforeDeparture": 1, "PenaltyPercent": 10 },
  { "MinHoursBeforeDeparture": 0, "PenaltyPercent": 50 } ]
```

Read as: cancelling at least 1 hour before departure costs 10%; later than that costs 50%.
Ordered from the most notice to the least. For display only; cancelling a paid ticket is not built.

### `POST /api/v1/trips/{id}/tickets`

Sets seats aside. 1 to 4 passengers, one per seat.

```json
{
  "ContactPhone": "09121234567",
  "Passengers": [
    { "SeatNumber": 18, "FirstName": "...", "LastName": "...",
      "NationalCode": "0499370899", "BirthDate": "1995-03-21", "Gender": "F" }
  ]
}
```

Returns `201` with the ticket (below), `Status` `reserved`.

### The ticket

Returned by the route above and by the three routes below.

```json
{
  "Code": "475597788644",
  "Status": "reserved",
  "ContactPhone": "09121234567",
  "Trip": {
    "ID": 1721, "CompanyPersianName": "...", "BusType": "...",
    "OriginCityID": 132, "OriginPersianName": "...", "OriginTerminalPersianName": "...",
    "DestinationCityID": 1, "DestinationPersianName": "...", "DestinationTerminalPersianName": "...",
    "CompanyName": "sepid-rah", "BusTypeEnglish": "Volvo VIP, 26 seats",
    "OriginEnglishName": "rasht", "OriginTerminalName": "central",
    "DestinationEnglishName": "tehran", "DestinationTerminalName": "west",
    "DepartureDate": "2026-10-14", "DepartureTime": "05:30"
  },
  "Passengers": [
    { "SeatNumber": 18, "FirstName": "...", "LastName": "...",
      "NationalCode": "0499370899", "BirthDate": "1995-03-21", "Gender": "F" }
  ],
  "PricePerSeat": 6580000,
  "TotalPrice": 6580000,
  "ReservedAt": "2026-10-12T16:56:00Z",
  "ExpiresAt": "2026-10-12T17:06:00Z",
  "SecondsLeft": 600,
  "PaidAt": null
}
```

- `Status` is `reserved` (on hold, waiting for payment), `paid`, `cancelled`, or `expired`
  (the 10 minutes ran out).
- `SecondsLeft` is how long the hold still has, counted by the server. Use it for the
  countdown; do not compare `ExpiresAt` with the visitor's own clock, which may be wrong.
  It is 0 for any status other than `reserved`.
- `PricePerSeat` already includes the trip's discount. `TotalPrice` is that times the seats.
- `Passengers` are ordered by seat number. `Trip` has 17 fields (the two city IDs and the six
  English names were added on 2026-10-12), a passenger 6, the ticket 11.

### `POST /api/v1/tickets/{code}/lookup`

Body `{ "ContactPhone": "09121234567" }`. Returns `200` with the ticket. For the review page,
the ticket page, and after a refresh.

### `POST /api/v1/tickets/{code}/payment`

Same body. The fake bank's "pay" button. Returns `200` with the ticket, now `paid`. Paying a
paid ticket again returns it unchanged, so a double click is harmless.

### `POST /api/v1/tickets/{code}/cancellation`

Same body. The fake bank's "cancel" button. Returns `200` with the ticket, now `cancelled`, and
its seats are free again. Cancelling twice is harmless.

## Errors

*Updated 2026-10-12: every error now also carries a `code`.*

Every error has the same shape:

```json
{ "error": "a sentence for a person", "code": "a_fixed_word" }
```

Test `code` in the website, not the sentence. Two codes carry one more field.

| Status | `code` | When |
| --- | --- | --- |
| `400` | `bad_request` | A parameter in the address is wrong (`from`, `to`, `date`, trip id), or a body is not valid JSON, has an unknown field, or is larger than 16 KB. |
| `404` | `city_not_found` | The origin or destination city does not exist. |
| `404` | `trip_not_found` | The trip does not exist. |
| `404` | `ticket_not_found` | No ticket has that code **with that phone number**. A wrong phone looks the same as a wrong code, on purpose. |
| `409` | `seats_unavailable` | One or more chosen seats cannot be had. Extra field `"seats": [18, 19]` lists them. Nothing was reserved: it is all or nothing. Reload the seat map and let the visitor choose again. |
| `409` | `trip_departed` | The bus has already left. |
| `409` | `hold_expired` | Payment came after the 10 minutes. The seats were released. |
| `409` | `ticket_cancelled` | Payment for a ticket that was cancelled. |
| `409` | `ticket_already_paid` | Cancelling a ticket that is paid. Refunds are not built. |
| `422` | `validation_failed` | The passenger details are wrong. Extra field `"fields"` maps each wrong field to what is wrong with it, for example `{ "ContactPhone": "...", "Passengers[1].NationalCode": "..." }`. All faults are reported at once. |
| `500` | `internal_error` | Something failed on the server. The sentence is always `Internal server error`; the real cause is written to the server log only. |

What `validation_failed` checks: `ContactPhone` is 11 digits starting with `09`; 1 to 4
passengers; no seat and no national code listed twice; names are 1 to 50 characters and made
of letters only, in any alphabet (Persian and English both pass), with spaces, a hyphen, an
apostrophe and the Persian half-space allowed, and digits refused; `Gender` is
`M` or `F`; `NationalCode` is 10 digits with a correct check digit; `BirthDate` is a real date,
not in the future and not before 1900.

## Tests

*Written 2026-10-12.*

19 tests, no database. One is for the single-trip route (its 38 fields, 404 and 400). Six are
for booking: the request reaches the service intact, the ticket
has its 11 fields, each of the 9 error kinds gives its status and exact body, 5 kinds of bad
body never reach the service, the three ticket routes pass code and phone on, and the seat map
and refund rules have their exact JSON. Five are for the city list: the exact JSON and headers, gzip only when
asked for, `304` for a matching `ETag`, a new `ETag` when the list changes, and the general
message on a server fault. Of the seven trip tests, one runs 15 request cases and checks the status and the exact
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
- A paid ticket cannot be cancelled or refunded.
- Nothing limits how many holds one visitor can make, so seats could be blocked on purpose
  for 10 minutes at a time. A real site would limit this per phone number or address.
- No written OpenAPI spec yet.
- Nothing can change a city yet. When something can, it must call `Cities.Invalidate()`.
