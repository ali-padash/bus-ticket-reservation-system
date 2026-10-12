export interface City {
  Code: string;
  ID: number;
  IsCapital: boolean;
  Name: string;
  Order: number;
  PersianName: string;
  ProvinceName: string;
  ProvincePersianName: string;
  SearchExpressions: string[];
 }

// Where the city list from the API stands: on its way, arrived, or failed.
export type CitiesStatus = "loading" | "ready" | "error";

export interface Service {
  ID: number;
  IsVip: boolean;
  BusType: string;
  BusCode: string;
  Price: number;
  MidwayCity: string;
  MidwayCityCode: string;
  MidwayEnglishName: string;
  CompanyId: number;
  CompanyUrl: string; 
  CompanyCode: string;
  CompanyName: string;
  CompanyPersianName: string;
  OriginTerminalUrl: string;
  OriginTerminalName: string;
  OriginTerminalPersianName: string;
  OriginTerminalCode: string;
  DestinationCode: string
  DestinationTerminalUrl: string;
  DestinationTerminalPersianName: string;
  DestinationTerminalName: string;
  DestinationTerminalCode: string;
  DepartureTime: string;
  DepartureDate: string;
  Description: string;
  BriefDescription: string | null;
  AvailableSeatCount: number;
  DiscountPercentage: number;
  CompanyLogo: string;
  Status: number;
}

export interface ServiceResponse {
  Date: string;
  OriginPersianName: string;
  OriginEnglishName: string;
  OriginCode: string;
  DestinationPersianName: string;
  DestinationEnglishName: string;
  DestinationCode: string;
  Today: string | null;
  Items: Service[];
}

// What a seat on the map can be: taken by a man, taken by a woman, not for sale ("N"),
// chosen by this visitor ("S"), or free (null). "N" and "S" are made up by the website;
// the API sends only "M", "F" or null. (updated 2026-10-12)
export type SeatStatus = "M" | "F" | "N" | "S" | null;

// One seat as the API sends it. Gender is null when nobody sits there.
export interface SeatArrayType {
  SeatNumber: number;
  Gender: "M" | "F" | null;
  Accessible: boolean;
}

// Everything needed to draw one bus (GET /trips/{id}/seat-map). Layout is the floor plan row
// by row: a number is a seat, null is empty floor.
export interface SeatMap {
  Layout: (number | null)[][];
  Seats: SeatArrayType[];
  AvailableSeatCount: number;
}

export interface RefundRule {
  MinHoursBeforeDeparture: number;
  PenaltyPercent: number;
}

// One passenger as the API takes and returns it. BirthDate is Gregorian YYYY-MM-DD.
export interface Passenger {
  SeatNumber: number;
  FirstName: string;
  LastName: string;
  NationalCode: string;
  BirthDate: string;
  Gender: "M" | "F";
}

export type TicketStatus = "reserved" | "paid" | "cancelled" | "expired";

export interface TicketTrip {
  ID: number;
  CompanyPersianName: string;
  BusType: string;
  OriginPersianName: string;
  OriginTerminalPersianName: string;
  DestinationPersianName: string;
  DestinationTerminalPersianName: string;
  DepartureDate: string;
  DepartureTime: string;
}

export interface Ticket {
  Code: string;
  Status: TicketStatus;
  ContactPhone: string;
  Trip: TicketTrip;
  Passengers: Passenger[];
  PricePerSeat: number;
  TotalPrice: number;
  ReservedAt: string;
  ExpiresAt: string;
  // How long the hold still has, counted by the server. 0 unless Status is "reserved".
  SecondsLeft: number;
  PaidAt: string | null;
}
