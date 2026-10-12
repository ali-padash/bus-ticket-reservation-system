// Helpers that do not depend on the language. Digits, money, calendars and date texts are in
// Locale.ts. (updated 2026-10-12)

function turnTimeToInteger(time: string) {
  const [hours, minutes] = time.split(':');
  return parseInt(hours) * 60 + parseInt(minutes);
}

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

// "2026-10-12" -> a Date at local midnight, or null if the text is not a real date.
// The search date in the address bar is read with this, so it must not trust its input.
const parseDate = (s: string | null): Date | null => {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [year, month, day] = s.split('-').map(number => parseInt(number));
  const date = new Date(year, month - 1, day);
  return formatDate(date) === s ? date : null;
}

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export { turnTimeToInteger, formatDate, parseDate, addDays };
