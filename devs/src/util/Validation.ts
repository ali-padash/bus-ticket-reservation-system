import { Lang, parseBirthDate, toLatinDigits } from "./Locale";

// What the visitor types for one passenger. Everything is text until it is checked.
export interface PassengerDraft {
  FirstName: string;
  LastName: string;
  NationalCode: string;
  // As typed: Persian calendar on the Persian pages (1374/01/21), Gregorian on the English
  // ones (1995-03-21). (updated 2026-10-12)
  BirthDate: string;
  Gender: "M" | "F" | "";
}

export const emptyPassenger: PassengerDraft = { FirstName: "", LastName: "", NationalCode: "", BirthDate: "", Gender: "" };

// The name of a form field, as the API also names it in a validation error ("ContactPhone",
// or "Passengers[0].NationalCode" for the first passenger), mapped to the *name* of the
// message to show. The sentence itself is looked up in the text files when it is drawn, as
// `errors.fields.<name>`, so a message follows the language of the page. (updated 2026-10-12)
export type FieldErrors = { [field: string]: string };

// The messages that exist in the text files, under `errors.fields`.
const fieldMessages = ["ContactPhone", "FirstName", "LastName", "NationalCode", "BirthDate", "Gender"];

// A name is 1 to 50 characters: letters of any alphabet (Persian and English both pass), plus
// a space, a hyphen, an apostrophe and the Persian half-space. Digits and other signs are
// refused. This is the same rule the API applies. (written 2026-10-12)
export const isValidName = (name: string) =>
  [...name].length <= 50 && /^[\p{L}\p{M} '‌-]+$/u.test(name) && /\p{L}/u.test(name);

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

// Checks the obvious things in the browser so the visitor gets an answer at once. The server
// checks everything again and is the judge. `passengers` is in the order it will be sent.
// The language is needed for one thing only: which calendar the birth date was typed in.
export const validateBooking = (lang: Lang, contactPhone: string, passengers: PassengerDraft[]): FieldErrors => {
  const errors: FieldErrors = {};
  if (!isValidPhone(toLatinDigits(contactPhone.trim()))) errors.ContactPhone = "ContactPhone";
  const nationalCodes = passengers.map((passenger) => toLatinDigits(passenger.NationalCode.trim()));
  passengers.forEach((passenger, index) => {
    const field = (name: string) => `Passengers[${index}].${name}`;
    if (!isValidName(passenger.FirstName.trim())) errors[field("FirstName")] = "FirstName";
    if (!isValidName(passenger.LastName.trim())) errors[field("LastName")] = "LastName";
    if (!isValidNationalCode(nationalCodes[index])) errors[field("NationalCode")] = "NationalCode";
    else if (nationalCodes.indexOf(nationalCodes[index]) !== index) errors[field("NationalCode")] = "duplicateNationalCode";
    if (!parseBirthDate(lang, passenger.BirthDate)) errors[field("BirthDate")] = "BirthDate";
    if (!passenger.Gender) errors[field("Gender")] = "Gender";
  });
  return errors;
};

// Turns the API's list of wrong fields into the same message names. The API explains each
// fault in English; only the field names are used from it.
export const translateFieldErrors = (fields: { [field: string]: string }): FieldErrors => {
  const errors: FieldErrors = {};
  Object.keys(fields).forEach((field) => {
    const name = field.split(".").pop() ?? field;
    errors[field] = fieldMessages.includes(name) ? name : "other";
  });
  return errors;
};
