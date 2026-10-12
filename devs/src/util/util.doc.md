# devs/src/util

A mixed bag: types, helper functions, API calls, everything that depends on the language, and one big data file.

## Files

*Updated 2026-10-12.*

| File | Contents | Used? |
| --- | --- | --- |
| `Models.ts` | TypeScript types: `City`, `Service`, `ServiceResponse`, `SeatStatus`, `SeatArrayType`, `Trip`, `SeatMap`, `RefundRule`, `Passenger`, `Ticket`, `TicketTrip`, `TicketStatus`. They match the API contract in `backend/internal/httpapi/httpapi.doc.md`, including the English fields added on 2026-10-12 (`BusTypeEnglish`, `DescriptionEnglish`, and six on a ticket's trip). | Yes |
| `FetchFunction.ts` | The nine API calls, the `ApiError` class and `errorTextKey`, see below. | Yes |
| `Locale.ts` | Everything that depends on the language, see below. | Yes |
| `useLocale.ts` | The hook that gives a component its language, see below. | Yes |
| `Validation.ts` | Checks for the passenger form, and the name of the message for each wrong field. | Yes |
| `TicketStorage.ts` | Keeps a ticket's phone in `sessionStorage`, per tab (`savePhone`, `readPhone`). | Yes |
| `SavedPassengers.ts` | Keeps the phone and up to 8 passengers in `localStorage`, only when the visitor asks for it (`readSavedDetails`, `saveDetails`, `forgetDetails`). What is read back is checked field by field, because anything can be in storage. (written 2026-10-12) | Yes |
| `useRefundRules.ts` | A hook: loads one trip's refund terms and words each line in the page's language. Used by the trip card and the review step, so the two cannot disagree. (written 2026-10-12) | Yes |
| `Function.ts` | Small helpers that do not depend on the language, see below. | Yes |
| `cities.json` | 915 cities with all their alternate spellings (12,397). **494 KB.** Every city has an English name since 2026-10-12, see below. | Not by the website since 2026-10-12. The backend seed reads it from this path, so it must stay. |

Deleted on 2026-10-12 because nothing used them: `Constant.ts`, `serviceResponse.json`, and
`GlobalState.ts` (its values are now page state, see [src.doc.md](../src.doc.md)). `BusModels.ts`
was deleted the same day: the bus is drawn from the layout the API sends.
`addCitiesJsonToDatabase.py`, a one-off script that loaded `cities.json` into an old database,
was also deleted that day: `go run ./cmd/api seed` in `backend/` does that job now.

## The language (`Locale.ts` and `useLocale.ts`)

*Written 2026-10-12.*

**One file decides everything that differs between the languages.** The reason: with one
helper for digits, one for money and one per kind of date, a mistake can only be in one
place, and a third language would be added in one file.

`Locale.ts` is plain functions that take the language as their first argument:

| Function | Persian | English |
| --- | --- | --- |
| `formatNumber` | `۱۲۳` | `123` (Persian digits in the input are turned into Latin ones) |
| `formatAmount` | `۴،۵۸۰،۰۰۰` | `4,580,000` |
| `longDateParts` | `چهارشنبه`, `۲۲`, `مهر`, `۱۴۰۵` | `Wednesday,`, `14`, `October`, `2026` |
| `shortDate` | `۱۴۰۵/۷/۲۲` | `14 Oct 2026` |
| `dayAndMonth` | `۷/۲۲` | `14 Oct` |
| `weekdayName` | `چهارشنبه` | `Wednesday` |
| `monthView`, `shiftMonth` | A Persian month, week from Saturday | A Gregorian month, week from Monday |
| `parseBirthDate` | Reads `1374/01/21` as a Persian date | Reads `1995-03-21` as it is |
| `localName` | The Persian name | The English slug made readable, or the Persian name if there is none |
| `localText` | The Persian text, with Persian digits | The English text |

Also here: `toLatinDigits` (Persian and Arabic digits to 0-9, used on everything that is
checked, sent to the API or put in an address), `displayName` (`"abadeh-tashk"` to
`"Abadeh Tashk"`, `"Chaharmahal-and-Bakhtiari"` to `"Chaharmahal and Bakhtiari"`), `directionOf`,
and the two halves of the support phone number (a placeholder, 021 00000, since 2026-10-13:
the site has no support line and must not show the real company's number).

- Weekday and month names come from the browser (`Intl`, with `fa-IR` or `en-GB`), so none
  is written in the text files.
- `parseBirthDate` returns Gregorian `YYYY-MM-DD` or null (not a real date, in the future, or
  before 1900). English needs no conversion, because the API's calendar is the Gregorian one.
- The Persian month grid no longer cuts a formatted date string apart to find the month; it
  asks `jalaali-js` directly.

`useLocale.ts` holds the hook. `useLang()` reads the language from the address.
`useLocale()` returns that language together with `t` (the texts of that language), `dir`,
`path()` (puts `/en` or `/fa` in front of an address inside the site), the functions above
already tied to the language (`num`, `amount`, `price`, `name`, `text`, `terminal`,
`cityName`, `provinceName`), and `icons` (which arrow points "forward" in this direction).

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

`errorTextKey(err)` gives the place of the sentence for a failed call in the text files:
`errors.codes.<code>` for each of the API's 11 codes, and `errors.codes.unknown` for anything
else, such as a network that is down (added 2026-10-12).

## Birth dates in two calendars

*Written 2026-10-12.*

`Locale.ts` has three functions for the one field that is typed differently per language:

- `parseBirthDate(lang, text)`: what was typed, to Gregorian `YYYY-MM-DD` for the API.
- `formatBirthDate(lang, isoDate)`: the opposite, used when a remembered passenger is put
  into the form.
- `convertBirthDate(from, to, text)`: the two together, used when the language is switched
  with a date already typed. Text that is not a whole, real date is left alone.

## Passenger form checks (`Validation.ts`)

*Updated 2026-10-12.*

- `isValidName`: 1 to 50 characters; letters of any alphabet (Persian and English both pass),
  plus space, hyphen, apostrophe and the Persian half-space. Digits and other signs are
  refused. The same rule as the API's.
- `isValidPhone`: 11 digits starting with 09.
- `isValidNationalCode`: 10 digits, and the last is the check digit worked out from the first nine.
- `validateBooking`: runs all of the above, plus `parseBirthDate` from `Locale.ts`, and
  returns the *name* of a message per field name (`NationalCode`, `duplicateNationalCode`,
  ...). It takes the language for one reason: which calendar the birth date was typed in.
- `translateFieldErrors`: turns the field names in the API's validation error into the same
  message names; a field without a message of its own gets `other`.

The sentences are in the text files under `errors.fields`. Keeping names instead of sentences
means a message already on screen changes language together with the page.

The browser's checks are for speed only. The server checks everything again and is the judge.

## API address

`FetchFunction.ts` reads the API address from `VITE_API_URL` and falls back to
`http://localhost:8080`. To change it, create `devs/.env.local` with a line such as
`VITE_API_URL=http://localhost:18080`.

## Helpers in `Function.ts`

*Updated 2026-10-12.*

| Function | Does |
| --- | --- |
| `turnTimeToInteger` | `"13:45"` → minutes since midnight. |
| `formatDate` | `Date` → `"YYYY-MM-DD"`. This is the format sent to the API. |
| `parseDate` | `"YYYY-MM-DD"` → a `Date`, or null if the text is not a real date. Used for the date in the address, so it checks its input. |
| `addDays` | Date plus N days. |

`toPersianNum`, `putComma`, `turnToDate`, `getWeekdayName` and `getFirstWeekday` left this
file on 2026-10-12; their work is done by `Locale.ts` for both languages.

## Problems

*Updated 2026-10-12.*

- `cities.json` is no longer used by the website but still lives in the website's folder,
  because the backend seed reads it from here. It would sit better next to the seed.
- 120 of the 915 cities had no English name. On 2026-10-12 they were written by hand into
  `cities.json` as slugs in the style of the others ("aran-va-bidgol", "jajrud"), and each
  slug was added to that city's spellings (155 new spellings), so typing it finds the city.
  They are transliterations made without a reference list, so a few may differ from the
  spelling a map uses. Two are the same place as an older entry (Badreh, and Abarghu beside
  Abarkuh); the data already had them twice. The database only shows the names after the
  backend seed is run again.
- File names are vague (`Function.ts`, `Models.ts`) and use capital letters, unlike the usual
  `camelCase.ts` style.
