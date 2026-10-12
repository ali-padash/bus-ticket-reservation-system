# devs/src/util

A mixed bag: types, helper functions, API calls, big data files, and one Python script.

## Files

*Updated 2026-10-12.*

| File | Contents | Used? |
| --- | --- | --- |
| `Models.ts` | TypeScript types: `City`, `Service`, `ServiceResponse`, `SeatStatus`, `SeatArrayType`, `Trip`, `SeatMap`, `RefundRule`, `Passenger`, `Ticket`, `TicketTrip`, `TicketStatus`. They match the API contract in `backend/internal/httpapi/httpapi.doc.md`. | Yes |
| `FetchFunction.ts` | The nine API calls and the `ApiError` class, see below. | Yes |
| `Validation.ts` | Checks for the passenger form, digit conversion, Persian-to-Gregorian birth date, and the Persian message for each field. | Yes |
| `TicketStorage.ts` | Keeps a ticket's phone in `sessionStorage`, per tab (`savePhone`, `readPhone`). | Yes |
| `Function.ts` | Small helpers, see below. | Yes |
| `cities.json` | 915 cities with all their alternate spellings. **490 KB.** | Not by the website since 2026-10-12. The backend seed reads it from this path, so it must stay. |

Deleted on 2026-10-12 because nothing used them: `Constant.ts`, `serviceResponse.json`, and
`GlobalState.ts` (its values are now page state, see [src.doc.md](../src.doc.md)). `BusModels.ts`
was deleted the same day: the bus is drawn from the layout the API sends.
`addCitiesJsonToDatabase.py`, a one-off script that loaded `cities.json` into an old database,
was also deleted that day: `go run ./cmd/api seed` in `backend/` does that job now.

## API calls

*Updated 2026-10-12.*

All calls share one small function, `callAPI`, which builds the address, sends JSON when there
is a body, and parses the answer. Calls that load a page accept an `AbortSignal`, so one that
is no longer wanted can be cancelled.

| Function | Route |
| --- | --- |
| `fetchCities` | `GET /cities` |
| `fetchServices` | `GET /trips?from=&to=&date=` |
| `fetchTrip` | `GET /trips/{id}` |
| `fetchSeatMap` | `GET /trips/{id}/seat-map` |
| `fetchRefundRules` | `GET /trips/{id}/refund-rules` |
| `reserveSeats` | `POST /trips/{id}/tickets` |
| `lookupTicket` | `POST /tickets/{code}/lookup` |
| `payTicket` | `POST /tickets/{code}/payment` |
| `cancelTicket` | `POST /tickets/{code}/cancellation` |

The older `GET /trips/{id}/seats` and `/availability` are no longer called; `seat-map` gives both.

**Errors.** A status outside 200–299 becomes an `ApiError` carrying the status and the API's
`code` (a fixed word such as `seats_unavailable`), plus `fields` for a validation error and
`seats` for seats that could not be had. The pages decide what to do from `code`, never from
the English sentence, so the API may reword its sentences freely.

## Passenger form checks (`Validation.ts`)

*Updated 2026-10-12.*

- `toLatinDigits`: Persian (۰-۹) and Arabic (٠-٩) digits become 0-9. It is the opposite of
  `toPersianNum`. The number boxes hold Persian digits, so everything passes through here
  before it is checked or sent.
- `isValidName`: 1 to 50 characters; letters of any alphabet (Persian and English both pass),
  plus space, hyphen, apostrophe and the Persian half-space. Digits and other signs are
  refused. The same rule as the API's.
- `isValidPhone`: 11 digits starting with 09.
- `isValidNationalCode`: 10 digits, and the last is the check digit worked out from the first nine.
- `persianDateToGregorian`: `1374/01/21` -> `1995-04-10` with `jalaali-js`; null if it is not a
  real date, is in the future, or is before 1900.
- `validateBooking`: runs all of the above and returns a message per field name.
- `translateFieldErrors`: turns the field names in the API's validation error into the same
  Persian messages.

The browser's checks are for speed only. The server checks everything again and is the judge.

## API address

`FetchFunction.ts` reads the API address from `VITE_API_URL` and falls back to
`http://localhost:8080`. To change it, create `devs/.env.local` with a line such as
`VITE_API_URL=http://localhost:18080`.

## Helpers in `Function.ts`

*Updated 2026-10-12.*

| Function | Does |
| --- | --- |
| `toPersianNum` | Turns `123` into `۱۲۳`. |
| `putComma` | Adds a Persian thousands separator. |
| `turnTimeToInteger` | `"13:45"` → minutes since midnight. |
| `formatDate` | `Date` → `"YYYY-MM-DD"`. This is the format sent to the API. |
| `turnToDate` | `"YYYY-MM-DD"` → a Persian date string, for showing. |
| `parseDate` | `"YYYY-MM-DD"` → a `Date`, or null if the text is not a real date. Used for the date in the address, so it checks its input. |
| `addDays` | Date plus N days. |
| `getWeekdayName` | Persian weekday name. |
| `getFirstWeekday` | Which weekday a Persian month starts on. |

## Problems

*Updated 2026-10-12.*

- `cities.json` is no longer used by the website but still lives in the website's folder,
  because the backend seed reads it from here. It would sit better next to the seed.
- `getFirstWeekday` splits a locale-formatted date string to get the month and year, which
  depends on the browser.
- File names are vague (`Function.ts`, `Models.ts`) and use capital letters, unlike the usual
  `camelCase.ts` style.
