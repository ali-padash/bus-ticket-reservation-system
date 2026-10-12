package service

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/ali-padash/bus-ticket-reservation-system/backend/internal/domain"
)

// fakeBookingStore records the hold it was asked to create.
type fakeBookingStore struct {
	created   []domain.NewHold
	createErr []error // one per attempt; nil when used up
	payErr    error
	cancelErr error
}

func (f *fakeBookingStore) CreateHold(_ context.Context, hold domain.NewHold) error {
	f.created = append(f.created, hold)
	if attempt := len(f.created) - 1; attempt < len(f.createErr) {
		return f.createErr[attempt]
	}
	return nil
}

func (f *fakeBookingStore) Ticket(_ context.Context, code string, phone string) (domain.Ticket, error) {
	return domain.Ticket{Code: code, ContactPhone: phone, Status: domain.TicketReserved}, nil
}

func (f *fakeBookingStore) PayHold(context.Context, string, string) error    { return f.payErr }
func (f *fakeBookingStore) CancelHold(context.Context, string, string) error { return f.cancelErr }
func (f *fakeBookingStore) ExpireHolds(context.Context) (int, error)         { return 3, nil }

var bookingDay = time.Date(2026, 10, 12, 9, 0, 0, 0, time.UTC)

func newBookings(store *fakeBookingStore) *Bookings {
	return NewBookings(store, 10*time.Minute, func() time.Time { return bookingDay })
}

// Two national codes that pass the check-digit rule.
const (
	codeA = "0499370899"
	codeB = "1234567891"
)

func goodPassenger(seat uint, nationalCode string) domain.PassengerInput {
	return domain.PassengerInput{
		SeatNumber:   seat,
		FirstName:    "سارا",
		LastName:     "احمدی",
		NationalCode: nationalCode,
		BirthDate:    time.Date(1995, 3, 21, 0, 0, 0, 0, time.UTC),
		Gender:       domain.GenderFemale,
	}
}

func goodRequest() domain.HoldRequest {
	return domain.HoldRequest{
		TripID:       7,
		ContactPhone: "09121234567",
		Passengers:   []domain.PassengerInput{goodPassenger(18, codeA), goodPassenger(19, codeB)},
	}
}

func TestValidNationalCode(t *testing.T) {
	valid := []string{codeA, codeB, "0010350829", "0000000019"}
	invalid := []string{
		"",            // empty
		"049937089",   // nine digits
		"04993708990", // eleven digits
		"0499370898",  // wrong check digit
		"1234567890",  // wrong check digit
		"1111111111",  // all the same digit
		"04993708a9",  // a letter
		"۰۴۹۹۳۷۰۸۹۹",  // Persian digits
	}
	for _, code := range valid {
		if !ValidNationalCode(code) {
			t.Errorf("ValidNationalCode(%q) = false, want true", code)
		}
	}
	for _, code := range invalid {
		if ValidNationalCode(code) {
			t.Errorf("ValidNationalCode(%q) = true, want false", code)
		}
	}
}

func TestHoldPassesACleanRequestOn(t *testing.T) {
	store := &fakeBookingStore{}
	request := goodRequest()
	request.ContactPhone = "  09121234567 "
	request.Passengers[0].FirstName = "  سارا  "

	ticket, err := newBookings(store).Hold(context.Background(), request)

	if err != nil {
		t.Fatalf("Hold() error: %v", err)
	}
	if len(store.created) != 1 {
		t.Fatalf("CreateHold ran %d times, want 1", len(store.created))
	}
	hold := store.created[0]
	if hold.TripID != 7 || hold.ContactPhone != "09121234567" || hold.HoldFor != 10*time.Minute {
		t.Errorf("hold = %+v, want trip 7, the trimmed phone and 10 minutes", hold)
	}
	if hold.Passengers[0].FirstName != "سارا" {
		t.Errorf("first name = %q, want the spaces trimmed", hold.Passengers[0].FirstName)
	}
	if len(hold.Code) != 12 || strings.Trim(hold.Code, "0123456789") != "" {
		t.Errorf("code = %q, want 12 digits", hold.Code)
	}
	if ticket.Code != hold.Code {
		t.Errorf("returned ticket %q, want the one just created (%q)", ticket.Code, hold.Code)
	}
}

func TestHoldRejectsBadRequests(t *testing.T) {
	cases := []struct {
		name   string
		change func(*domain.HoldRequest)
		field  string
	}{
		{"landline as phone", func(r *domain.HoldRequest) { r.ContactPhone = "02152943000" }, "ContactPhone"},
		{"phone too short", func(r *domain.HoldRequest) { r.ContactPhone = "0912123456" }, "ContactPhone"},
		{"no passengers", func(r *domain.HoldRequest) { r.Passengers = nil }, "Passengers"},
		{"five seats", func(r *domain.HoldRequest) {
			r.Passengers = []domain.PassengerInput{goodPassenger(1, codeA), goodPassenger(2, codeB),
				goodPassenger(3, "0010350829"), goodPassenger(4, "0000000019"), goodPassenger(5, "0000000027")}
		}, "Passengers"},
		{"seat number missing", func(r *domain.HoldRequest) { r.Passengers[0].SeatNumber = 0 }, "Passengers[0].SeatNumber"},
		{"same seat twice", func(r *domain.HoldRequest) { r.Passengers[1].SeatNumber = 18 }, "Passengers[1].SeatNumber"},
		{"empty first name", func(r *domain.HoldRequest) { r.Passengers[0].FirstName = "   " }, "Passengers[0].FirstName"},
		{"very long last name", func(r *domain.HoldRequest) { r.Passengers[1].LastName = strings.Repeat("ا", 51) }, "Passengers[1].LastName"},
		{"unknown gender", func(r *domain.HoldRequest) { r.Passengers[0].Gender = "male" }, "Passengers[0].Gender"},
		{"bad national code", func(r *domain.HoldRequest) { r.Passengers[1].NationalCode = "1234567890" }, "Passengers[1].NationalCode"},
		{"same person twice", func(r *domain.HoldRequest) { r.Passengers[1].NationalCode = codeA }, "Passengers[1].NationalCode"},
		{"no birth date", func(r *domain.HoldRequest) { r.Passengers[0].BirthDate = time.Time{} }, "Passengers[0].BirthDate"},
		{"born tomorrow", func(r *domain.HoldRequest) { r.Passengers[0].BirthDate = bookingDay.AddDate(0, 0, 1) }, "Passengers[0].BirthDate"},
		{"born in 1850", func(r *domain.HoldRequest) {
			r.Passengers[0].BirthDate = time.Date(1850, 1, 1, 0, 0, 0, 0, time.UTC)
		}, "Passengers[0].BirthDate"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			store := &fakeBookingStore{}
			request := goodRequest()
			c.change(&request)

			_, err := newBookings(store).Hold(context.Background(), request)

			var invalid *domain.ValidationError
			if !errors.As(err, &invalid) {
				t.Fatalf("error = %v, want a ValidationError", err)
			}
			if _, ok := invalid.Fields[c.field]; !ok || len(invalid.Fields) != 1 {
				t.Errorf("fields = %v, want only %q", invalid.Fields, c.field)
			}
			if len(store.created) != 0 {
				t.Error("the database was reached with a request that is not valid")
			}
		})
	}
}

func TestHoldReportsEveryFaultAtOnce(t *testing.T) {
	request := goodRequest()
	request.ContactPhone = "123"
	request.Passengers[0].Gender = ""
	request.Passengers[1].NationalCode = "1"

	_, err := newBookings(&fakeBookingStore{}).Hold(context.Background(), request)

	var invalid *domain.ValidationError
	if !errors.As(err, &invalid) || len(invalid.Fields) != 3 {
		t.Errorf("error = %v, want a ValidationError with 3 fields", err)
	}
}

func TestHoldTriesAgainWithANewCode(t *testing.T) {
	store := &fakeBookingStore{createErr: []error{domain.ErrDuplicateCode}}

	_, err := newBookings(store).Hold(context.Background(), goodRequest())

	if err != nil {
		t.Fatalf("Hold() error: %v", err)
	}
	if len(store.created) != 2 || store.created[0].Code == store.created[1].Code {
		t.Errorf("attempts = %d, want 2 with different codes", len(store.created))
	}
}

func TestHoldGivesUpAfterThreeDuplicateCodes(t *testing.T) {
	store := &fakeBookingStore{createErr: []error{domain.ErrDuplicateCode, domain.ErrDuplicateCode, domain.ErrDuplicateCode}}

	_, err := newBookings(store).Hold(context.Background(), goodRequest())

	if !errors.Is(err, domain.ErrDuplicateCode) || len(store.created) != 3 {
		t.Errorf("error = %v after %d attempts, want ErrDuplicateCode after 3", err, len(store.created))
	}
}

func TestHoldKeepsTheStoreError(t *testing.T) {
	taken := &domain.SeatsUnavailableError{Seats: []uint{18}}
	store := &fakeBookingStore{createErr: []error{taken}}

	_, err := newBookings(store).Hold(context.Background(), goodRequest())

	var unavailable *domain.SeatsUnavailableError
	if !errors.As(err, &unavailable) || len(unavailable.Seats) != 1 || unavailable.Seats[0] != 18 {
		t.Errorf("error = %v, want SeatsUnavailableError for seat 18", err)
	}
	if len(store.created) != 1 {
		t.Errorf("CreateHold ran %d times, want 1: a taken seat is not retried", len(store.created))
	}
}

func TestPayAndCancelKeepTheStoreError(t *testing.T) {
	store := &fakeBookingStore{payErr: domain.ErrHoldExpired, cancelErr: domain.ErrTicketPaid}
	bookings := newBookings(store)

	if _, err := bookings.Pay(context.Background(), "000000000001", "09121234567"); !errors.Is(err, domain.ErrHoldExpired) {
		t.Errorf("Pay() error = %v, want ErrHoldExpired", err)
	}
	if _, err := bookings.Cancel(context.Background(), "000000000001", "09121234567"); !errors.Is(err, domain.ErrTicketPaid) {
		t.Errorf("Cancel() error = %v, want ErrTicketPaid", err)
	}
}

func TestTicketCodesDiffer(t *testing.T) {
	seen := map[string]bool{}
	for i := 0; i < 1000; i++ {
		code, err := randomTicketCode()
		if err != nil || len(code) != 12 {
			t.Fatalf("randomTicketCode() = %q, %v; want 12 digits", code, err)
		}
		if seen[code] {
			t.Fatalf("code %s came up twice in 1000 tries", code)
		}
		seen[code] = true
	}
}
