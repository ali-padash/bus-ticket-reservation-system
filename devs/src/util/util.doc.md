# devs/src/util

A mixed bag: types, helper functions, API calls, big data files, and one Python script.

## Files

*Updated 2026-10-12.*

| File | Contents | Used? |
| --- | --- | --- |
| `Models.ts` | TypeScript types: `City`, `Service`, `ServiceResponse`, `SeatStatus`, `SeatType`, `SeatArrayType`. They match the API contract in `backend/internal/httpapi/httpapi.doc.md`. | Yes |
| `FetchFunction.ts` | The three API calls: `fetchServices` (`GET /trips`), `fetchSeats` (`GET /trips/{id}/seats`), `fetchNumberOfAvailableSeats` (`GET /trips/{id}/availability`). | Yes |
| `Function.ts` | Small helpers, see below. | Yes |
| `BusModels.ts` | Seat layouts for four bus types plus one dummy layout. | Yes |
| `cities.json` | 915 cities with all their alternate spellings. **490 KB.** | Yes |
| `addCitiesJsonToDatabase.py` | One-off script that loads `cities.json` into Postgres. | By hand only |

Deleted on 2026-10-12 because nothing used them: `Constant.ts`, `serviceResponse.json`, and
`GlobalState.ts` (its values are now page state, see [src.doc.md](../src.doc.md)).

## API calls

*Written 2026-10-12.*

The three calls share one small function, `getJSON`, which builds the address, turns a status
outside 200–299 into an error, and parses the JSON. Each call accepts an `AbortSignal`, so a
call that is no longer wanted can be cancelled.

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

## Seat layouts in `BusModels.ts`

Each layout is a flat list read as a grid of **5 rows** by N columns. Each cell is either `null`
(empty floor) or `[seatNumber, status]`. Row 3 is the aisle.

| Export | Bus code from the API | Columns |
| --- | --- | --- |
| `seatsArray_25_1` | `VIP_25_1` | 9 |
| `seatsArray_26_1` | `VIP_26_1` | 10 |
| `seatsArray_29_1` | `VIP_29_1` | 11 |
| `seatsArray_32_1` | `VIP_32_1` | 12 |
| `seatsArray_DUMMY` | shown blurred behind the error message | 12 |

Any other bus code gives an empty map.

## Problems

*Updated 2026-10-12.*

- **`addCitiesJsonToDatabase.py` contains an old database host, user and password.** That
  database has been deleted, so the password opens nothing. The script is no longer needed:
  `go run ./cmd/api seed` in `backend/` loads the cities. It should be deleted.
- `cities.json` is bundled into the JavaScript, so every visitor downloads 490 KB before the
  page works. Better: a `/cities?q=` endpoint, or at least a lazy import.
- `getFirstWeekday` splits a locale-formatted date string to get the month and year, which
  depends on the browser.
- File names are vague (`Function.ts`, `Models.ts`) and use capital letters, unlike the usual
  `camelCase.ts` style.
