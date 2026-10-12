import { City, Passenger, RefundRule, SeatMap, ServiceResponse, Ticket, Trip } from "./Models";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

// An answer from the API that is not a success. The API puts a fixed word in `code`
// (for example "seats_unavailable"); the website decides what to do from that word and never
// from the English sentence. Two codes carry one more piece: `fields` names each wrong form
// field, `seats` lists the seats that could not be had. (added 2026-10-12)
export class ApiError extends Error {
  status: number;
  code: string;
  fields: { [field: string]: string };
  seats: number[];

  constructor(status: number, body: { code?: string; fields?: { [field: string]: string }; seats?: number[] }) {
    super(`HTTP error! status: ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code ?? "unknown";
    this.fields = body.fields ?? {};
    this.seats = body.seats ?? [];
  }
}

// Every call goes through here, so the address, the error check and the JSON parsing are
// written once. A status outside 200-299 becomes an ApiError; an aborted call rejects with an
// AbortError, which the callers ignore. Passing `body` makes it a POST. (updated 2026-10-12)
const callAPI = async <T>(path: string, signal?: AbortSignal, body?: object): Promise<T> => {
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    signal,
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    // An error should come with a JSON body, but a broken one must not hide the status.
    const errorBody = await response.json().catch(() => ({}));
    throw new ApiError(response.status, errorBody);
  }
  return response.json();
};

// The whole city list. It is fetched once per page load and filtered in the browser; the
// browser's own cache (the server sends Cache-Control and an ETag) covers repeat visits.
export const fetchCities = (signal?: AbortSignal) => callAPI<City[]>("/cities", signal);

export const fetchServices = (date: string, originID: number, destinationID: number, signal?: AbortSignal) => {
  const query = new URLSearchParams({ from: String(originID), to: String(destinationID), date });
  return callAPI<ServiceResponse>(`/trips?${query}`, signal);
};

// One trip by its ID, for the booking page, which knows nothing else about the trip.
export const fetchTrip = (tripID: number, signal?: AbortSignal) => callAPI<Trip>(`/trips/${tripID}`, signal);

export const fetchSeatMap = (tripID: number, signal?: AbortSignal) =>
  callAPI<SeatMap>(`/trips/${tripID}/seat-map`, signal);

export const fetchRefundRules = (tripID: number, signal?: AbortSignal) =>
  callAPI<RefundRule[]>(`/trips/${tripID}/refund-rules`, signal);

// Sets the seats aside for 10 minutes and returns the ticket, with Status "reserved".
export const reserveSeats = (tripID: number, contactPhone: string, passengers: Passenger[]) =>
  callAPI<Ticket>(`/trips/${tripID}/tickets`, undefined, { ContactPhone: contactPhone, Passengers: passengers });

// A ticket is opened with its code and the buyer's phone together. The phone goes in the
// body, never in the address, so it does not end up in browser history or server logs.
export const lookupTicket = (code: string, contactPhone: string, signal?: AbortSignal) =>
  callAPI<Ticket>(`/tickets/${code}/lookup`, signal, { ContactPhone: contactPhone });

export const payTicket = (code: string, contactPhone: string) =>
  callAPI<Ticket>(`/tickets/${code}/payment`, undefined, { ContactPhone: contactPhone });

export const cancelTicket = (code: string, contactPhone: string) =>
  callAPI<Ticket>(`/tickets/${code}/cancellation`, undefined, { ContactPhone: contactPhone });
