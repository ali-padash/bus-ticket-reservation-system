import jalaali from "jalaali-js";
import { City } from "./Models";
import { formatDate } from "./Function";

// Everything that depends on the language lives in this file: digits, money, dates, the
// calendar, and which field of the API's data to show. A component never decides these on its
// own; it asks here (through `useLocale`), so adding a language means changing one file.
// (written 2026-10-12)

export type Lang = "en" | "fa";
export const DEFAULT_LANG: Lang = "en";
export const isLang = (value: string | undefined): value is Lang => value === "en" || value === "fa";
export const directionOf = (lang: Lang): "rtl" | "ltr" => (lang === "fa" ? "rtl" : "ltr");

// The browser's own names for weekdays and months. "fa-IR" also brings the Persian calendar.
const intlLocale = { en: "en-GB", fa: "fa-IR" };

// The two halves of the support phone number, as data. They are shown in the page's digits.
export const PHONE_AREA = "021";
export const PHONE_NUMBER = "53826";

// ---- digits ----

const toPersianDigits = (text: string) => text.replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);

// Persian (۰-۹) and Arabic (٠-٩) digits become 0-9. Everything that is checked, sent to the
// API or put in an address passes through here first, whatever the page's language.
export const toLatinDigits = (text: string) =>
  text
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - "۰".charCodeAt(0)))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - "٠".charCodeAt(0)));

// The one place that chooses a digit style for showing: Persian digits in Persian, Latin
// digits in English. Text around the digits is left alone.
export const formatNumber = (lang: Lang, value: string | number) =>
  lang === "fa" ? toPersianDigits(toLatinDigits(String(value))) : toLatinDigits(String(value));

// 4580000 -> "۴،۵۸۰،۰۰۰" or "4,580,000". The currency word is added by the texts.
export const formatAmount = (lang: Lang, amount: number) => {
  const grouped = String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, lang === "fa" ? "،" : ",");
  return formatNumber(lang, grouped);
};

// ---- dates ----
// The API takes and gives Gregorian YYYY-MM-DD. Persian shows the Persian (Jalali) calendar,
// English the Gregorian one.

// The four parts of a long date, in reading order: "Wednesday," "14" "October" "2026".
export const longDateParts = (lang: Lang, date: Date): string[] => {
  const part = (options: Intl.DateTimeFormatOptions) => date.toLocaleString(intlLocale[lang], options);
  const weekday = part({ weekday: "long" });
  return [
    lang === "en" ? `${weekday},` : weekday,
    part({ day: "numeric" }),
    part({ month: "long" }),
    part({ year: "numeric" }),
  ];
};

export const weekdayName = (lang: Lang, date: Date) => date.toLocaleDateString(intlLocale[lang], { weekday: "long" });

// "2026-10-14" -> "۱۴۰۵/۷/۲۲" or "14 Oct 2026".
export const shortDate = (lang: Lang, isoDate: string) => {
  const [year, month, day] = isoDate.split("-").map((number) => parseInt(number));
  const date = new Date(year, month - 1, day);
  return lang === "fa"
    ? date.toLocaleDateString("fa-IR")
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

// The short label of a day tab: "۷/۲۲" or "14 Oct".
export const dayAndMonth = (lang: Lang, date: Date) =>
  lang === "fa"
    ? date.toLocaleDateString("fa-IR", { month: "numeric", day: "numeric" })
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

// ---- the month grid of the date picker ----

export interface MonthView {
  year: string;
  month: string;
  // Empty cells before day 1, so that it falls under its weekday.
  leadingBlanks: number;
  days: Date[];
}

// The month that `date` falls in: a Persian month, whose week starts on Saturday, or a
// Gregorian month, whose week starts on Monday.
export const monthView = (lang: Lang, date: Date): MonthView => {
  const label = (options: Intl.DateTimeFormatOptions) => date.toLocaleString(intlLocale[lang], options);
  let days: Date[];
  if (lang === "fa") {
    const { jy, jm } = jalaali.toJalaali(date);
    days = Array.from({ length: jalaali.jalaaliMonthLength(jy, jm) }, (_, index) => {
      const { gy, gm, gd } = jalaali.toGregorian(jy, jm, index + 1);
      return new Date(gy, gm - 1, gd);
    });
  } else {
    const length = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    days = Array.from({ length }, (_, index) => new Date(date.getFullYear(), date.getMonth(), index + 1));
  }
  const firstWeekday = days[0].getDay(); // 0 is Sunday
  return {
    year: label({ year: "numeric" }),
    month: label({ month: "long" }),
    leadingBlanks: lang === "fa" ? (firstWeekday + 1) % 7 : (firstWeekday + 6) % 7,
    days,
  };
};

// The month shown after pressing an arrow.
export const shiftMonth = (lang: Lang, date: Date, step: number): Date => {
  if (lang === "en") return new Date(date.getFullYear(), date.getMonth() + step, 1);
  const shifted = new Date(date);
  shifted.setMonth(shifted.getMonth() + step);
  return shifted;
};

// ---- the passenger's birth date ----

// What the visitor typed -> Gregorian "YYYY-MM-DD" for the API, or null when it is not a real
// date, is in the future, or is before 1900. In Persian the text is a Persian-calendar date
// ("1374/01/21"); in English it is already Gregorian ("1995-03-21"), so nothing is converted.
export const parseBirthDate = (lang: Lang, text: string): string | null => {
  const match = toLatinDigits(text.trim()).match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!match) return null;
  let [year, month, day] = match.slice(1).map(Number);
  if (lang === "fa") {
    if (!jalaali.isValidJalaaliDate(year, month, day)) return null;
    const { gy, gm, gd } = jalaali.toGregorian(year, month, day);
    [year, month, day] = [gy, gm, gd];
  }
  const date = new Date(year, month - 1, day);
  // A day such as 31 February rolls over into the next month; that is not a real date.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  if (year < 1900 || date > new Date()) return null;
  return formatDate(date);
};

// Gregorian "YYYY-MM-DD" -> the way the visitor types a birth date in this language:
// "1374/01/21" in Persian, "1995-03-21" in English. The opposite of parseBirthDate.
// (written 2026-10-12)
export const formatBirthDate = (lang: Lang, isoDate: string): string => {
  if (lang !== "fa") return isoDate;
  const [year, month, day] = isoDate.split("-").map(Number);
  const { jy, jm, jd } = jalaali.toJalaali(year, month, day);
  return [jy, String(jm).padStart(2, "0"), String(jd).padStart(2, "0")].join("/");
};

// A birth date typed in one language, written again for the other. The two languages use
// different calendars, so the text in the box has to follow the page when its language is
// switched. Text that is not a whole, real date yet is left as it is. (written 2026-10-12)
export const convertBirthDate = (from: Lang, to: Lang, text: string): string => {
  const isoDate = parseBirthDate(from, text);
  return isoDate ? formatBirthDate(to, isoDate) : text;
};

// ---- names from the API ----

// The API's English names are slugs: "rasht", "abadeh-tashk", "East-Azerbaijan", sometimes
// with a stray space. This makes them readable: "Rasht", "Abadeh Tashk", "East Azerbaijan".
export const displayName = (slug: string) =>
  slug
    .trim()
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((word, index) => (index > 0 && word.toLowerCase() === "and" ? "and" : word[0].toUpperCase() + word.slice(1)))
    .join(" ");

// Picks the Persian name or the English one. A missing English name falls back to the
// Persian one, so the page never shows an empty place.
export const localName = (lang: Lang, persianName: string, englishSlug: string | undefined) =>
  lang === "fa" ? persianName : displayName(englishSlug ?? "") || persianName;

export const cityName = (lang: Lang, city: City) => localName(lang, city.PersianName, city.Name);
export const provinceName = (lang: Lang, city: City) => localName(lang, city.ProvincePersianName, city.ProvinceName);

// Free text that the API sends in both languages, such as the bus type. The Persian text may
// hold Latin digits ("Volvo VIP 25 ..."), which are shown as Persian ones.
export const localText = (lang: Lang, persianText: string, englishText: string | undefined) =>
  lang === "fa" ? formatNumber(lang, persianText) : englishText || persianText;
