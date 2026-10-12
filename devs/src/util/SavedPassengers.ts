// Passengers the visitor asked this browser to remember, in localStorage, so the form can be
// filled with one click next time.
//
// - It is opt-in: nothing is kept unless the visitor ticks the box on the form. Sending the
//   form with the box unticked forgets everything kept before.
// - It stays on this device. Nothing here is sent anywhere; the API has no accounts.
// - The birth date is kept as Gregorian YYYY-MM-DD, the form the API takes, and is written in
//   the page's calendar when it is put back into the form.
// (written 2026-10-12)

export interface SavedPassenger {
  FirstName: string;
  LastName: string;
  NationalCode: string;
  BirthDate: string;
  Gender: "M" | "F";
}

export interface SavedDetails {
  phone: string;
  passengers: SavedPassenger[];
}

const KEY = "savedPassengers";
const MAX_PASSENGERS = 8;
const nothingSaved: SavedDetails = { phone: "", passengers: [] };

const isSavedPassenger = (value: unknown): value is SavedPassenger => {
  if (typeof value !== "object" || value === null) return false;
  const fields = value as { [field: string]: unknown };
  return (
    typeof fields.FirstName === "string" &&
    typeof fields.LastName === "string" &&
    typeof fields.NationalCode === "string" &&
    typeof fields.BirthDate === "string" &&
    (fields.Gender === "M" || fields.Gender === "F")
  );
};

export const readSavedDetails = (): SavedDetails => {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (typeof saved !== "object" || saved === null) return nothingSaved;
    const { phone, passengers } = saved as { phone?: unknown; passengers?: unknown };
    return {
      phone: typeof phone === "string" ? phone : "",
      passengers: Array.isArray(passengers) ? passengers.filter(isSavedPassenger) : [],
    };
  } catch {
    // Unreadable storage is treated the same as nothing saved.
    return nothingSaved;
  }
};

// Puts the passengers just used at the front of the list. A national ID is kept once, with
// its newest details, and the oldest entries fall off after 8.
export const saveDetails = (phone: string, passengers: SavedPassenger[]) => {
  try {
    const used = passengers.map((passenger) => passenger.NationalCode);
    const older = readSavedDetails().passengers.filter((passenger) => !used.includes(passenger.NationalCode));
    const all = [...passengers, ...older].slice(0, MAX_PASSENGERS);
    localStorage.setItem(KEY, JSON.stringify({ phone, passengers: all }));
  } catch {
    // Storage can be switched off or full. The form still works; it is just typed by hand.
  }
};

export const forgetDetails = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to forget if storage cannot be reached.
  }
};
