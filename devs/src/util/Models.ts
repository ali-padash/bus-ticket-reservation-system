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
// or free (null). "N" is made up here from `Accessible: false`; the API never sends it.
export type SeatStatus = "M" | "F" | "N" | null;

// One cell of a bus layout: [seat number, status], or null for empty floor.
export type SeatType = [number | null, SeatStatus] | null;

// One seat as the API sends it. Gender is null when nobody sits there.
export interface SeatArrayType {
  SeatNumber: number;
  Gender: "M" | "F" | null;
  Accessible: boolean;
}