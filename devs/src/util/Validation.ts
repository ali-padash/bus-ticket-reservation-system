import jalaali from "jalaali-js";
import { formatDate } from "./Function";

// What the visitor types for one passenger. Everything is text until it is checked.
export interface PassengerDraft {
  FirstName: string;
  LastName: string;
  NationalCode: string;
  BirthDate: string; // Persian calendar, as typed: 1374/01/21
  Gender: "M" | "F" | "";
}

export const emptyPassenger: PassengerDraft = { FirstName: "", LastName: "", NationalCode: "", BirthDate: "", Gender: "" };

// The name of a form field, as the API also names it in a validation error:
// "ContactPhone", or "Passengers[0].NationalCode" for the first passenger.
export type FieldErrors = { [field: string]: string };

// The API only accepts Latin digits. Visitors with a Persian or Arabic keyboard type ۰-۹ or
// ٠-٩, so every number is passed through here before it is checked or sent.
export const toLatinDigits = (text: string) =>
  text
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - "۰".charCodeAt(0)))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - "٠".charCodeAt(0)));

export const isValidPhone = (phone: string) => /^09\d{9}$/.test(phone);

// An Iranian national code is 10 digits and the last one is a check digit worked out from
// the first nine. This catches most typing mistakes before the form is sent.
export const isValidNationalCode = (code: string) => {
  if (!/^\d{10}$/.test(code)) return false;
  const digits = code.split("").map(Number);
  const sum = digits.slice(0, 9).reduce((total, digit, index) => total + digit * (10 - index), 0);
  const remainder = sum % 11;
  return digits[9] === (remainder < 2 ? remainder : 11 - remainder);
};

// "1374/01/21" in the Persian calendar -> "1995-04-10" in the Gregorian one, which is what
// the API takes. Returns null when the text is not a real date, or is in the future.
export const persianDateToGregorian = (text: string): string | null => {
  const match = toLatinDigits(text.trim()).match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  if (!jalaali.isValidJalaaliDate(year, month, day)) return null;
  const { gy, gm, gd } = jalaali.toGregorian(year, month, day);
  const date = new Date(gy, gm - 1, gd);
  if (gy < 1900 || date > new Date()) return null;
  return formatDate(date);
};

// The Persian sentence shown under each kind of field. The same sentences are used for a
// fault found here and for one reported by the API, so the visitor sees one voice.
const messages: { [field: string]: string } = {
  ContactPhone: "شماره موبایل باید ۱۱ رقم باشد و با ۰۹ شروع شود",
  FirstName: "نام را وارد نمایید (حداکثر ۵۰ حرف)",
  LastName: "نام خانوادگی را وارد نمایید (حداکثر ۵۰ حرف)",
  NationalCode: "کدملی معتبر نیست",
  BirthDate: "تاریخ تولد معتبر نیست (نمونه: ۱۳۷۴/۰۱/۲۱)",
  Gender: "جنسیت را انتخاب نمایید",
};
const duplicateNationalCode = "این کدملی برای مسافر دیگری وارد شده است";
const otherFault = "این مورد معتبر نیست";

// Checks the obvious things in the browser so the visitor gets an answer at once. The server
// checks everything again and is the judge. `passengers` is in the order it will be sent.
export const validateBooking = (contactPhone: string, passengers: PassengerDraft[]): FieldErrors => {
  const errors: FieldErrors = {};
  if (!isValidPhone(toLatinDigits(contactPhone.trim()))) errors.ContactPhone = messages.ContactPhone;
  const nationalCodes = passengers.map((passenger) => toLatinDigits(passenger.NationalCode.trim()));
  passengers.forEach((passenger, index) => {
    const field = (name: string) => `Passengers[${index}].${name}`;
    if (!passenger.FirstName.trim()) errors[field("FirstName")] = messages.FirstName;
    if (!passenger.LastName.trim()) errors[field("LastName")] = messages.LastName;
    if (!isValidNationalCode(nationalCodes[index])) errors[field("NationalCode")] = messages.NationalCode;
    else if (nationalCodes.indexOf(nationalCodes[index]) !== index) errors[field("NationalCode")] = duplicateNationalCode;
    if (!persianDateToGregorian(passenger.BirthDate)) errors[field("BirthDate")] = messages.BirthDate;
    if (!passenger.Gender) errors[field("Gender")] = messages.Gender;
  });
  return errors;
};

// Turns the API's list of wrong fields into the same Persian sentences. The API explains each
// fault in English; only the field names are used from it.
export const translateFieldErrors = (fields: { [field: string]: string }): FieldErrors => {
  const errors: FieldErrors = {};
  Object.keys(fields).forEach((field) => {
    const name = field.split(".").pop() ?? field;
    errors[field] = messages[name] ?? otherFault;
  });
  return errors;
};
