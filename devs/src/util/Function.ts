import jalaali from 'jalaali-js'

const toPersianNum = (num: string | number | undefined) => {
  try {
    const numbers: { [key: string]: string } = {
      '0': '۰', '1': '۱', '2': '۲', '3': '۳', '4': '۴',
      '5': '۵', '6': '۶', '7': '۷', '8': '۸', '9': '۹'
    };
    return num?.toString().split('').map(char => numbers[char] || char).join('');
  } catch {
    return undefined;
  }
}

function putComma(num: string | number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "،");
}

function turnTimeToInteger(time: string) {
  const [hours, minutes] = time.split(':');
  return parseInt(hours) * 60 + parseInt(minutes);
}

function getFirstWeekday(date: Date) {
  const persianDate = date.toLocaleDateString('en-us-u-ca-persian')
  const [persianMonth, , persianYear] = persianDate.split('/').map(number => parseInt(number));
  const gregorianDate = jalaali.toGregorian(persianYear, persianMonth, 1);
  return (new Date(gregorianDate.gy, gregorianDate.gm - 1, gregorianDate.gd).getDay() + 1)%7;
}

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

// "2026-10-12" -> the same day written in the Persian calendar, for showing on the page.
const turnToDate = (s: string | undefined) => {
  if (s == undefined) { return undefined;}
  const [year, month, day] = s.split('-').map(number => parseInt(number));
  return new Date(year, month - 1, day).toLocaleDateString('fa-IR');
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

const getWeekdayName = (date: Date): string => {
  return date.toLocaleDateString("fa-IR", { weekday: "long" });
};

export { toPersianNum, putComma, turnTimeToInteger, getFirstWeekday, formatDate, turnToDate, parseDate, addDays, getWeekdayName };