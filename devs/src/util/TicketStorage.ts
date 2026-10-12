// What the browser remembers about a ticket between pages, in sessionStorage.
//
// A ticket is opened with its code and the buyer's phone together. The code is in the
// address (/tickets/<code>); the phone must not be, because addresses end up in browser
// history and server logs. So the phone is kept here: it survives a refresh, and it is gone
// when the tab is closed. Nothing else is kept: the way back to the search results is built
// from the ticket itself. (updated 2026-10-12)

const key = (code: string) => `ticket:${code}`;

export const savePhone = (code: string, phone: string) => {
  try {
    sessionStorage.setItem(key(code), JSON.stringify({ phone }));
  } catch {
    // Storage can be switched off or full. The site still works: it asks for the phone again.
  }
};

export const readPhone = (code: string): string => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key(code)) ?? "null");
    if (saved && typeof saved.phone === "string") return saved.phone;
  } catch {
    // Unreadable storage is treated the same as nothing saved.
  }
  return "";
};
