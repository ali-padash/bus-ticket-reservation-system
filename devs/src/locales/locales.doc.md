# devs/src/locales

*Written 2026-10-12, updated 2026-10-13.*

Every text a visitor can read, once per language. No component has a sentence written into it.

| File | Language | Direction |
| --- | --- | --- |
| `en.json` | English (the default) | left to right |
| `fa.json` | Persian | right to left |

Both files have exactly the same 267 keys (245 before the "find a ticket" page). A key is a path such as `home.title` or
`errors.codes.trip_departed`; the first part names the screen or the part of the site.

## How a text reaches the screen

`src/i18n.ts` loads both files into i18next. A component calls `useLocale()` (in `util/`) and
gets `t`, a function that turns a key into the sentence of the page's language:

```tsx
const { t } = useLocale();
<h2>{t("home.title")}</h2>
```

- **The page's language comes from the address** (`/en/...` or `/fa/...`), never from a
  setting. `useLocale` asks i18next for the texts of that one language, so the texts cannot
  disagree with the address.
- **Both files are bundled.** They are small (about 15 kB each before compression), so nothing
  is fetched when the language changes and the switch is instant.

## Rules for writing a text

- **A value that changes goes in as `{{name}}`**: `"Seat {{number}}"`. The component passes the
  number already written in the page's digits.
- **A sentence that counts something has two forms**, `_one` and `_other`
  (`"{{number}} seat"`, `"{{number}} seats"`). Persian uses the same words for both, but the two
  keys exist in both files so that the files stay equal.
- **A sentence with bold parts carries `<b>` marks** (`results.found_*`), because the order of
  the parts differs between the languages. The component turns `<b>` into `<strong>`.
- **Error messages are found by the API's fixed code or by the field name**, never by the
  API's English sentence: `errors.codes.<code>` has one entry for each of the API's 11 codes
  plus `unknown`, and `errors.fields.<field>` one for each form field plus `other`.
- **Persian texts that existed before 2026-10-12 are kept word for word**, spelling mistakes
  included, because the look of the Persian site must not change in a refactor. 17 Persian
  texts were new on that day: the tab title, the labels read by screen readers (open menu,
  previous month and so on), the two logo descriptions, and three error sentences.

## Glossary: one English word per thing

| English | Persian | Meaning |
| --- | --- | --- |
| trip | سرویس | One bus on one day at one time. |
| ticket | بلیط | What the buyer gets; it has a 12-digit ticket code. |
| seat | صندلی | |
| passenger | مسافر | The person in a seat. The buyer is "you". |
| origin / destination | مبداء / مقصد | The two cities. In the short trip box: "From" / "To". |
| terminal | پایانه | Written after the name: "Central Terminal". |
| bus company, company | شرکت مسافربری | |
| departure, departure date | حرکت، تاریخ حرکت | |
| mobile number | شماره موبایل | |
| national ID | کدملی | |
| date of birth | تاریخ تولد | "Born (1995-03-21)" inside the narrow box. |
| refund terms, cancellation fee | شرایط استرداد، جریمه | |
| held | نگه داشته | Seats set aside for 10 minutes. |
| free seats | صندلی خالی | Seats nobody has taken. A single seat that can be chosen is "available". |
| IRR | ریال | Written after the amount: "4,580,000 IRR". |
| Buy / View and buy | خرید / مشاهده و خرید | |

## Things to know

- **The phone layout changed 4 keys on 2026-10-13**, which takes 269 to 267: `booking.progress`
  was added ("Step 2 of 5: Choose seats", shown under the step numbers on a phone), and
  `notify.sampleOrigin`, `notify.sampleDestination` and `notify.sampleDate` were removed,
  because the "being arranged" card now shows the route and day that were searched.
- **The "find a ticket" page added 24 keys on 2026-10-13**: 23 under `findTicket` (title,
  introduction, the labels of the form, the explanation, four notes, four questions with their
  answers) and `errors.fields.TicketCode`. They were written for this site and say only what it
  does: a 12-digit code shown after paying, the buyer's mobile number, no text message or
  email, a 10-minute hold, no cancelling of a paid ticket yet, a demo payment. The answers
  quote the names of other screens ("Your ticket is issued", "Passenger details", "Review and
  pay"); if `issued.title`, `passengers.title` or `review.title` is reworded, reword them too.
  The Persian button says "استعلام", the word the menu link already used.

- The marketing texts on the home page (the four steps, the three info cards, the questions,
  the "why choose" block) began as the texts of the real Safar724 site, which this project is
  modelled on. On 2026-10-13 the site got its own name, Rahi, and 16 keys changed in both
  files. Nine only had the name replaced. Seven were rewritten because they made claims that
  belonged to the real company: `trust.headingLine1` and `trust.headingLine2` (a customer
  count), `trust.companiesText` (names of real bus companies, buying by phone),
  `trust.buyingTitle` and `trust.buyingText` (an app, buying by phone), `faq.petsAnswer` (an
  article that does not exist here) and `steps.busText` ("we work with all bus companies").
  The new sentences claim nothing that the site does not do. `nav.logoAlt` was removed and
  `meta.name` added (the name shown beside the logo), so the count is still 245.
- Still describing things the site does not do, left as they were: the texts that say a
  ticket number arrives by text message (`steps.smsTitle`, `steps.smsText`, `info.printText`,
  `faq.printAnswer`) and `trust.supportText` (a support team reachable by phone or online).
- `home.dateTooltip` is the English word "date" in the Persian file too. It was like that
  before and was left alone.
- The count is still 245 after the second round of 2026-10-12: `refund.sampleEarly` and
  `refund.sampleLate` (the two fixed lines of the old refund box, one of which said 10%
  beside a badge of 50) were removed, and `passengers.saved` and `passengers.remember` were
  added. The trip card now words the real terms with `refund.upTo`, `refund.lessThan` and
  `refund.untilDeparture`.
- The support phone number is not a text: it lives in `util/Locale.ts` and is shown in the
  page's digits.
