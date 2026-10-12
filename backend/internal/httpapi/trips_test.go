package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/ali-padash/bus-ticket-reservation-system/backend/internal/domain"

	"github.com/gin-gonic/gin"
)

// fakeTrips stands in for the service. Trip 7 exists; trip 500 breaks.
type fakeTrips struct {
	searched *domain.TripSearch
}

var errBroken = errors.New("pq: password authentication failed for user secret_user")

func (f *fakeTrips) Search(_ context.Context, q domain.TripSearch) (domain.SearchResult, error) {
	f.searched = &q
	if q.OriginCityID == 999 {
		return domain.SearchResult{}, fmt.Errorf("origin city 999: %w", domain.ErrCityNotFound)
	}
	result := domain.SearchResult{
		Date:        q.Date,
		Origin:      domain.City{ID: 1, Code: "THR", Name: "Tehran", PersianName: "تهران"},
		Destination: domain.City{ID: 21, Code: "MHD", Name: "Mashhad", PersianName: "مشهد"},
	}
	if q.DestinationCityID == 21 {
		result.Trips = []domain.Trip{{
			ID:                 7,
			Company:            domain.Company{ID: 3, Code: "C03", PersianName: "آسمان آبی"},
			Origin:             domain.Terminal{Code: "THR-T1", PersianName: "غرب"},
			BusCode:            "VIP_25_1",
			BusNameEnglish:     "Volvo VIP, 25 seats",
			DescriptionEnglish: "Aseman Abi",
			VIP:                true,
			Price:              2_500_000,
			DepartureTime:      "08:30",
			AvailableSeats:     12,
		}}
	}
	return result, nil
}

func (f *fakeTrips) Seats(_ context.Context, tripID uint) ([]domain.Seat, error) {
	switch tripID {
	case 7:
		female := domain.GenderFemale
		return []domain.Seat{{Number: 1, ForSale: true, Gender: &female}, {Number: 2, ForSale: false}}, nil
	case 500:
		return nil, errBroken
	}
	return nil, domain.ErrTripNotFound
}

func (f *fakeTrips) Trip(_ context.Context, tripID uint) (domain.TripDetails, error) {
	if tripID != 7 {
		return domain.TripDetails{}, domain.ErrTripNotFound
	}
	return domain.TripDetails{
		Trip:            domain.Trip{ID: 7, Price: 2_500_000, DepartureDate: "2026-10-14", AvailableSeats: 12},
		OriginCity:      domain.City{ID: 132, Name: "rasht", PersianName: "رشت"},
		DestinationCity: domain.City{ID: 1, Name: "tehran", PersianName: "تهران"},
	}, nil
}

func (f *fakeTrips) SeatMap(_ context.Context, tripID uint) (domain.SeatMap, error) {
	if tripID != 7 {
		return domain.SeatMap{}, domain.ErrTripNotFound
	}
	female := domain.GenderFemale
	return domain.SeatMap{
		Layout:         [][]uint{{1, 0}, {0, 2}},
		Seats:          []domain.Seat{{Number: 1, ForSale: true, Gender: &female}, {Number: 2, ForSale: true}},
		AvailableSeats: 1,
	}, nil
}

func (f *fakeTrips) RefundRules(_ context.Context, tripID uint) ([]domain.RefundRule, error) {
	if tripID != 7 {
		return nil, domain.ErrTripNotFound
	}
	return []domain.RefundRule{{MinHoursBeforeDeparture: 1, PenaltyPercent: 10}, {MinHoursBeforeDeparture: 0, PenaltyPercent: 50}}, nil
}

func (f *fakeTrips) Availability(_ context.Context, tripID uint) (int, error) {
	switch tripID {
	case 7:
		return 12, nil
	case 500:
		return 0, errBroken
	}
	return 0, domain.ErrTripNotFound
}

func get(t *testing.T, service TripService, path string) (int, string) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	handler := NewHandler(service, &fakeCities{}, &fakeBookings{}, slog.New(slog.NewTextHandler(io.Discard, nil)), "http://localhost:5173")
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, path, nil))
	return recorder.Code, recorder.Body.String()
}

func TestStatusAndErrorBody(t *testing.T) {
	cases := []struct {
		name   string
		path   string
		status int
		body   string // expected body for errors; empty means "do not compare"
	}{
		{"search", "/api/v1/trips?from=1&to=21&date=2026-10-12", 200, ""},
		{"search without from", "/api/v1/trips?to=21&date=2026-10-12", 400, `{"error":"Invalid from: expected a city id","code":"bad_request"}`},
		{"search with a word as to", "/api/v1/trips?from=1&to=mashhad&date=2026-10-12", 400, `{"error":"Invalid to: expected a city id","code":"bad_request"}`},
		{"search with a negative id", "/api/v1/trips?from=-1&to=21&date=2026-10-12", 400, `{"error":"Invalid from: expected a city id","code":"bad_request"}`},
		{"search with a Persian-calendar date", "/api/v1/trips?from=1&to=21&date=1405/07/20", 400, `{"error":"Invalid date: expected YYYY-MM-DD","code":"bad_request"}`},
		{"search with an impossible date", "/api/v1/trips?from=1&to=21&date=2026-02-30", 400, `{"error":"Invalid date: expected YYYY-MM-DD","code":"bad_request"}`},
		{"search for an unknown city", "/api/v1/trips?from=999&to=21&date=2026-10-12", 404, `{"error":"City not found","code":"city_not_found"}`},
		{"seats", "/api/v1/trips/7/seats", 200, `[{"SeatNumber":1,"Accessible":true,"Gender":"F"},{"SeatNumber":2,"Accessible":false,"Gender":null}]`},
		{"seats of an unknown trip", "/api/v1/trips/8/seats", 404, `{"error":"Trip not found","code":"trip_not_found"}`},
		{"seats with a word as id", "/api/v1/trips/abc/seats", 400, `{"error":"Invalid trip id","code":"bad_request"}`},
		{"seats when the database fails", "/api/v1/trips/500/seats", 500, `{"error":"Internal server error","code":"internal_error"}`},
		{"availability", "/api/v1/trips/7/availability", 200, `{"AvailableSeatCount":12}`},
		{"availability of an unknown trip", "/api/v1/trips/8/availability", 404, `{"error":"Trip not found","code":"trip_not_found"}`},
		{"availability when the database fails", "/api/v1/trips/500/availability", 500, `{"error":"Internal server error","code":"internal_error"}`},
		{"a route that does not exist", "/api/v1/getservices", 404, ""},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			status, body := get(t, &fakeTrips{}, c.path)
			if status != c.status {
				t.Errorf("status = %d, want %d (body: %s)", status, c.status, body)
			}
			if c.body != "" && body != c.body {
				t.Errorf("body = %s\nwant   %s", body, c.body)
			}
		})
	}
}

func TestServerErrorsDoNotLeakDetails(t *testing.T) {
	_, body := get(t, &fakeTrips{}, "/api/v1/trips/500/seats")

	if strings.Contains(body, "password") || strings.Contains(body, "secret_user") {
		t.Errorf("the response shows the internal error: %s", body)
	}
}

func TestSearchPassesTheQueryOn(t *testing.T) {
	service := &fakeTrips{}

	get(t, service, "/api/v1/trips?from=1&to=21&date=2026-10-12")

	if service.searched == nil {
		t.Fatal("the service was not called")
	}
	got := *service.searched
	if got.OriginCityID != 1 || got.DestinationCityID != 21 || got.Date.Format(dateLayout) != "2026-10-12" {
		t.Errorf("query = %+v, want from 1 to 21 on 2026-10-12", got)
	}
}

func TestBadInputNeverReachesTheService(t *testing.T) {
	service := &fakeTrips{}

	get(t, service, "/api/v1/trips?from=1&to=21&date=tomorrow")

	if service.searched != nil {
		t.Error("the service was called with a date that is not valid")
	}
}

// The website reads these names. Renaming or dropping one breaks it.
func TestSearchResponseShape(t *testing.T) {
	_, body := get(t, &fakeTrips{}, "/api/v1/trips?from=1&to=21&date=2026-10-12")

	var response map[string]json.RawMessage
	if err := json.Unmarshal([]byte(body), &response); err != nil {
		t.Fatalf("the response is not a JSON object: %v", err)
	}
	for _, key := range []string{"Date", "OriginPersianName", "OriginEnglishName", "OriginCode",
		"DestinationPersianName", "DestinationEnglishName", "DestinationCode", "Today", "Logo", "Items"} {
		if _, ok := response[key]; !ok {
			t.Errorf("the response has no %q field", key)
		}
	}

	var items []map[string]any
	if err := json.Unmarshal(response["Items"], &items); err != nil || len(items) != 1 {
		t.Fatalf("Items = %s, want a list with one trip", response["Items"])
	}
	item := items[0]
	if len(item) != 32 {
		t.Errorf("a trip has %d fields, want 32", len(item))
	}
	want := map[string]any{
		"ID": 7.0, "IsVip": true, "BusCode": "VIP_25_1", "Price": 2_500_000.0, "DepartureTime": "08:30",
		"AvailableSeatCount": 12.0, "CompanyId": 3.0, "CompanyCode": "C03", "CompanyPersianName": "آسمان آبی",
		"OriginTerminalCode": "THR-T1", "OriginTerminalPersianName": "غرب", "BriefDescription": nil,
		"BusTypeEnglish": "Volvo VIP, 25 seats", "DescriptionEnglish": "Aseman Abi",
	}
	for key, value := range want {
		if item[key] != value {
			t.Errorf("%s = %v, want %v", key, item[key], value)
		}
	}
}

func TestNoTripsIsAnEmptyList(t *testing.T) {
	status, body := get(t, &fakeTrips{}, "/api/v1/trips?from=1&to=4&date=2026-10-12")

	if status != 200 || !strings.Contains(body, `"Items":[]`) {
		t.Errorf("status %d, body %s; want 200 with \"Items\":[]", status, body)
	}
}

func TestCORSAllowsOnlyTheWebsite(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := NewHandler(&fakeTrips{}, &fakeCities{}, &fakeBookings{}, slog.New(slog.NewTextHandler(io.Discard, nil)), "http://localhost:5173")

	for origin, want := range map[string]string{
		"http://localhost:5173": "http://localhost:5173",
		"http://evil.example":   "",
	} {
		request := httptest.NewRequest(http.MethodGet, "/api/v1/trips/7/availability", nil)
		request.Header.Set("Origin", origin)
		recorder := httptest.NewRecorder()
		handler.ServeHTTP(recorder, request)

		if got := recorder.Header().Get("Access-Control-Allow-Origin"); got != want {
			t.Errorf("origin %s: Access-Control-Allow-Origin = %q, want %q", origin, got, want)
		}
	}
}

func TestOneTrip(t *testing.T) {
	status, body := get(t, &fakeTrips{}, "/api/v1/trips/7")
	if status != 200 {
		t.Fatalf("status = %d, want 200 (body: %s)", status, body)
	}
	var trip map[string]any
	if err := json.Unmarshal([]byte(body), &trip); err != nil {
		t.Fatalf("the response is not a JSON object: %v", err)
	}
	// The 32 fields of a search item plus 6 for the two cities. (updated 2026-10-12)
	if len(trip) != 38 {
		t.Errorf("the trip has %d fields, want 38", len(trip))
	}
	want := map[string]any{
		"ID": 7.0, "Price": 2_500_000.0, "DepartureDate": "2026-10-14", "AvailableSeatCount": 12.0,
		"OriginCityID": 132.0, "OriginPersianName": "رشت", "OriginEnglishName": "rasht",
		"DestinationCityID": 1.0, "DestinationPersianName": "تهران", "DestinationEnglishName": "tehran",
	}
	for key, value := range want {
		if trip[key] != value {
			t.Errorf("%s = %v, want %v", key, trip[key], value)
		}
	}

	if status, body := get(t, &fakeTrips{}, "/api/v1/trips/8"); status != 404 || body != `{"error":"Trip not found","code":"trip_not_found"}` {
		t.Errorf("unknown trip: status %d, body %s", status, body)
	}
	if status, _ := get(t, &fakeTrips{}, "/api/v1/trips/abc"); status != 400 {
		t.Errorf("a word as trip id: status %d, want 400", status)
	}
}
