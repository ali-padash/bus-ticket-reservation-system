// What the browser remembers about a ticket between pages, in sessionStorage.
//
// A ticket is opened with its code and the buyer's phone together. The code is in the
// address (/tickets/<code>); the phone must not be, because addresses end up in browser
// history and server logs. So the phone is kept here: it survives a refresh, and it is gone
// when the tab is closed. `search` is the search the buyer came from ("from=1&to=21&date=..."),
// so "back to the results" knows where to go. (written 2026-10-12)

interface TicketSession {
  phone: string;
  search: string;
}

const key = (code: string) => `ticket:${code}`;

export const saveTicketSession = (code: string, session: TicketSession) => {
  try {
    sessionStorage.setItem(key(code), JSON.stringify(session));
  } catch {
    // Storage can be switched off or full. The site still works: it asks for the phone again.
  }
};

export const readTicketSession = (code: string): TicketSession | null => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key(code)) ?? "null");
    if (saved && typeof saved.phone === "string" && typeof saved.search === "string") return saved;
  } catch {
    // Unreadable storage is treated the same as nothing saved.
  }
  return null;
};
