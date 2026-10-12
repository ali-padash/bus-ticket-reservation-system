package httpapi

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/ali-padash/bus-ticket-reservation-system/backend/internal/domain"

	"github.com/gin-gonic/gin"
)

// fakeBookings stands in for the service. It records what it was asked and answers
// with the error set on it, or with a sample ticket.
type fakeBookings struct {
	held  *domain.HoldRequest
	code  string
	phone string
	err   error
}

func sampleTicket(status string) domain.Ticket {
	expires := time.Date(2026, 10, 12, 9, 10, 0, 0, time.UTC)
	return domain.Ticket{
		Code:         "123456789012",
		Status:       status,
		ContactPhone: "09121234567",
		Trip: domain.TicketTrip{
			ID: 7, CompanyPersianName: "همراه سفر", BusName: "Scania VIP 25",
			OriginCityPersianName: "رشت", OriginTerminalPersianName: "مرکزی",
			DestinationCityPersianName: "تهران", DestinationTerminalPersianName: "غرب",
			DepartureDate: "2026-10-22", DepartureTime: "00:15",
		},
		Passengers: []domain.Passenger{{SeatNumber: 18, FirstName: "سارا", LastName: "احمدی",
			NationalCode: "0499370899", BirthDate: "1995-03-21", Gender: "F"}},
		PricePerSeat: 6_580_000,
		TotalPrice:   6_580_000,
		ReservedAt:   time.Date(2026, 10, 12, 9, 0, 0, 0, time.UTC),
		ExpiresAt:    &expires,
		SecondsLeft:  600,
	}
}

func (f *fakeBookings) Hold(_ context.Context, request domain.HoldRequest) (domain.Ticket, error) {
	f.held = &request
	return sampleTicket(domain.TicketReserved), f.err
}

func (f *fakeBookings) Ticket(_ context.Context, code string, phone string) (domain.Ticket, error) {
	f.code, f.phone = code, phone
	return sampleTicket(domain.TicketReserved), f.err
}

func (f *fakeBookings) Pay(_ context.Context, code string, phone string) (domain.Ticket, error) {
	f.code, f.phone = code, phone
	return sampleTicket(domain.TicketPaid), f.err
}

func (f *fakeBookings) Cancel(_ context.Context, code string, phone string) (domain.Ticket, error) {
	f.code, f.phone = code, phone
	return sampleTicket(domain.TicketCancelled), f.err
}

func post(t *testing.T, bookings BookingService, path string, body string) (int, string) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	handler := NewHandler(&fakeTrips{}, &fakeCities{}, bookings, slog.New(slog.NewTextHandler(io.Discard, nil)), "http://localhost:5173")
	request := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)
	return recorder.Code, recorder.Body.String()
}

const holdBody = `{"ContactPhone":"09121234567","Passengers":[
	{"SeatNumber":18,"FirstName":"سارا","LastName":"احمدی","NationalCode":"0499370899","BirthDate":"1995-03-21","Gender":"F"}]}`

const phoneBody = `{"ContactPhone":"09121234567"}`

func TestHoldSeats(t *testing.T) {
	bookings := &fakeBookings{}

	status, body := post(t, bookings, "/api/v1/trips/7/tickets", holdBody)

	if status != http.StatusCreated {
		t.Fatalf("status = %d, want 201 (body: %s)", status, body)
	}
	if bookings.held == nil {
		t.Fatal("the service was not called")
	}
	held := *bookings.held
	if held.TripID != 7 || held.ContactPhone != "09121234567" || len(held.Passengers) != 1 {
		t.Fatalf("request = %+v, want trip 7, the phone and one passenger", held)
	}
	passenger := held.Passengers[0]
	if passenger.SeatNumber != 18 || passenger.FirstName != "سارا" || passenger.NationalCode != "0499370899" ||
		passenger.Gender != "F" || passenger.BirthDate.Format(dateLayout) != "1995-03-21" {
		t.Errorf("passenger = %+v, want the values from the request body", passenger)
	}
}

// The website reads these names. Renaming or dropping one breaks it.
func TestTicketResponseShape(t *testing.T) {
	_, body := post(t, &fakeBookings{}, "/api/v1/trips/7/tickets", holdBody)

	var ticket map[string]any
	if err := json.Unmarshal([]byte(body), &ticket); err != nil {
		t.Fatalf("the response is not a JSON object: %v", err)
	}
	want := map[string]any{
		"Code": "123456789012", "Status": "reserved", "ContactPhone": "09121234567",
		"PricePerSeat": 6_580_000.0, "TotalPrice": 6_580_000.0, "SecondsLeft": 600.0,
		"ReservedAt": "2026-10-12T09:00:00Z", "ExpiresAt": "2026-10-12T09:10:00Z", "PaidAt": nil,
	}
	for key, value := range want {
		if ticket[key] != value {
			t.Errorf("%s = %v, want %v", key, ticket[key], value)
		}
	}
	if len(ticket) != 11 {
		t.Errorf("a ticket has %d fields, want 11", len(ticket))
	}
	trip, _ := ticket["Trip"].(map[string]any)
	if len(trip) != 9 || trip["OriginPersianName"] != "رشت" || trip["DepartureTime"] != "00:15" || trip["BusType"] != "Scania VIP 25" {
		t.Errorf("Trip = %v, want 9 fields with the sample values", trip)
	}
	passengers, _ := ticket["Passengers"].([]any)
	if len(passengers) != 1 {
		t.Fatalf("Passengers = %v, want one", ticket["Passengers"])
	}
	passenger, _ := passengers[0].(map[string]any)
	if len(passenger) != 6 || passenger["SeatNumber"] != 18.0 || passenger["BirthDate"] != "1995-03-21" {
		t.Errorf("passenger = %v, want 6 fields with the sample values", passenger)
	}
}

func TestBookingErrors(t *testing.T) {
	cases := []struct {
		name   string
		err    error
		status int
		body   string
	}{
		{"details not valid", &domain.ValidationError{Fields: map[string]string{"ContactPhone": "must be a mobile number"}}, 422,
			`{"error":"Some of the details are not valid","code":"validation_failed","fields":{"ContactPhone":"must be a mobile number"}}`},
		{"seat just taken", &domain.SeatsUnavailableError{Seats: []uint{18, 19}}, 409,
			`{"error":"Some of the chosen seats are not available","code":"seats_unavailable","seats":[18,19]}`},
		{"unknown trip", domain.ErrTripNotFound, 404, `{"error":"Trip not found","code":"trip_not_found"}`},
		{"bus has left", domain.ErrTripDeparted, 409, `{"error":"This trip has already departed","code":"trip_departed"}`},
		{"unknown ticket", domain.ErrTicketNotFound, 404, `{"error":"Ticket not found","code":"ticket_not_found"}`},
		{"hold ran out", domain.ErrHoldExpired, 409,
			`{"error":"The time to pay has run out and the seats were released","code":"hold_expired"}`},
		{"ticket cancelled", domain.ErrTicketClosed, 409, `{"error":"This ticket was cancelled","code":"ticket_cancelled"}`},
		{"ticket paid", domain.ErrTicketPaid, 409, `{"error":"A paid ticket cannot be cancelled here","code":"ticket_already_paid"}`},
		{"database fails", errBroken, 500, `{"error":"Internal server error","code":"internal_error"}`},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			status, body := post(t, &fakeBookings{err: c.err}, "/api/v1/trips/7/tickets", holdBody)
			if status != c.status || body != c.body {
				t.Errorf("status %d, body %s\nwant   %d, body %s", status, body, c.status, c.body)
			}
		})
	}
}

func TestBadBodiesNeverReachTheService(t *testing.T) {
	cases := map[string]string{
		"not JSON":         `seat 18 please`,
		"empty body":       ``,
		"unknown field":    `{"ContactPhone":"09121234567","Passengers":[],"Discount":100}`,
		"seat as a word":   `{"ContactPhone":"09121234567","Passengers":[{"SeatNumber":"eighteen"}]}`,
		"a body too large": `{"ContactPhone":"` + strings.Repeat("9", 20_000) + `"}`,
	}
	for name, body := range cases {
		t.Run(name, func(t *testing.T) {
			bookings := &fakeBookings{}
			status, response := post(t, bookings, "/api/v1/trips/7/tickets", body)
			if status != 400 {
				t.Errorf("status = %d, want 400 (body: %s)", status, response)
			}
			if bookings.held != nil {
				t.Error("the service was called with a body that could not be read")
			}
		})
	}
}

func TestTicketRoutes(t *testing.T) {
	cases := []struct {
		path       string
		wantStatus string
	}{
		{"/api/v1/tickets/123456789012/lookup", "reserved"},
		{"/api/v1/tickets/123456789012/payment", "paid"},
		{"/api/v1/tickets/123456789012/cancellation", "cancelled"},
	}
	for _, c := range cases {
		t.Run(c.path, func(t *testing.T) {
			bookings := &fakeBookings{}

			status, body := post(t, bookings, c.path, phoneBody)

			if status != 200 || !strings.Contains(body, `"Status":"`+c.wantStatus+`"`) {
				t.Errorf("status %d, body %s; want 200 with status %s", status, body, c.wantStatus)
			}
			if bookings.code != "123456789012" || bookings.phone != "09121234567" {
				t.Errorf("service got code %q and phone %q, want the ones from the request", bookings.code, bookings.phone)
			}

			if status, _ := post(t, &fakeBookings{}, c.path, `nonsense`); status != 400 {
				t.Errorf("status for a bad body = %d, want 400", status)
			}
			if status, _ := post(t, &fakeBookings{err: domain.ErrTicketNotFound}, c.path, phoneBody); status != 404 {
				t.Errorf("status for an unknown ticket = %d, want 404", status)
			}
		})
	}
}

func TestSeatMapAndRefundRules(t *testing.T) {
	cases := []struct {
		path   string
		status int
		body   string
	}{
		{"/api/v1/trips/7/seat-map", 200,
			`{"Layout":[[1,null],[null,2]],"Seats":[{"SeatNumber":1,"Accessible":true,"Gender":"F"},{"SeatNumber":2,"Accessible":true,"Gender":null}],"AvailableSeatCount":1}`},
		{"/api/v1/trips/8/seat-map", 404, `{"error":"Trip not found","code":"trip_not_found"}`},
		{"/api/v1/trips/x/seat-map", 400, `{"error":"Invalid trip id","code":"bad_request"}`},
		{"/api/v1/trips/7/refund-rules", 200,
			`[{"MinHoursBeforeDeparture":1,"PenaltyPercent":10},{"MinHoursBeforeDeparture":0,"PenaltyPercent":50}]`},
		{"/api/v1/trips/8/refund-rules", 404, `{"error":"Trip not found","code":"trip_not_found"}`},
	}
	for _, c := range cases {
		status, body := get(t, &fakeTrips{}, c.path)
		if status != c.status || body != c.body {
			t.Errorf("%s: status %d, body %s\nwant status %d, body %s", c.path, status, body, c.status, c.body)
		}
	}
}
