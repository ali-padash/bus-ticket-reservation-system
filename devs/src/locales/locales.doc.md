# devs/src/locales

*Written 2026-10-12.*

Every text a visitor can read, once per language. No component has a sentence written into it.

| File | Language | Direction |
| --- | --- | --- |
| `en.json` | English (the default) | left to right |
| `fa.json` | Persian | right to left |

Both files have exactly the same 245 keys. A key is a path such as `home.title` or
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

- The marketing texts on the home page (the four steps, the three info cards, the questions,
  "why ... people trust us") were copied from the real Safar724 site and are to be replaced.
  The English is a plain translation of them and adds no claim of its own.
- `home.dateTooltip` is the English word "date" in the Persian file too. It was like that
  before and was left alone.
- `refund.sampleLate` says 10% beside a badge that says 50. That is the old, known mistake of
  the fixed refund box (see `components.doc.md`); both languages repeat it faithfully.
- The support phone number is not a text: it lives in `util/Locale.ts` and is shown in the
  page's digits.
