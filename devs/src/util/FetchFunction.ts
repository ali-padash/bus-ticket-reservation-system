import { City, SeatArrayType, ServiceResponse } from "./Models";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

// Every call goes through here, so the address, the error check and the JSON parsing are
// written once. A status outside 200-299 becomes an Error; an aborted call rejects with an
// AbortError, which the callers ignore. (updated 2026-10-12)
const getJSON = async <T>(path: string, signal?: AbortSignal): Promise<T> => {
  const response = await fetch(`${API_URL}/api/v1${path}`, { signal });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// The whole city list. It is fetched once per page load and filtered in the browser; the
// browser's own cache (the server sends Cache-Control and an ETag) covers repeat visits.
export const fetchCities = (signal?: AbortSignal) => getJSON<City[]>("/cities", signal);

export const fetchServices = (date: string, originID: number, destinationID: number, signal?: AbortSignal) => {
  const query = new URLSearchParams({ from: String(originID), to: String(destinationID), date });
  return getJSON<ServiceResponse>(`/trips?${query}`, signal);
};

export const fetchSeats = (serviceID: number, signal?: AbortSignal) =>
  getJSON<SeatArrayType[]>(`/trips/${serviceID}/seats`, signal);

export const fetchNumberOfAvailableSeats = async (serviceID: number, signal?: AbortSignal) => {
  const data = await getJSON<{ AvailableSeatCount: number }>(`/trips/${serviceID}/availability`, signal);
  return data.AvailableSeatCount;
};
