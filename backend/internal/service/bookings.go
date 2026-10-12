package service

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/ali-padash/bus-ticket-reservation-system/backend/internal/domain"
)

// BookingStore is what buying a ticket needs from the database.
type BookingStore interface {
	CreateHold(ctx context.Context, hold domain.NewHold) error
	Ticket(ctx context.Context, code string, phone string) (domain.Ticket, error)
	PayHold(ctx context.Context, code string, phone string) error
	CancelHold(ctx context.Context, code string, phone string) error
	ExpireHolds(ctx context.Context) (int, error)
}

const (
	ticketCodeDigits = 12
	maxNameLength    = 50
	// A new code that already exists is almost impossible (one in a million million),
	// but trying again is cheap.
	codeAttempts = 3
)

var mobilePattern = regexp.MustCompile(`^09[0-9]{9}$`)

type Bookings struct {
	store   BookingStore
	holdFor time.Duration
	now     func() time.Time
	newCode func() (string, error)
}

// NewBookings: holdFor is how long seats stay set aside before they must be paid.
func NewBookings(store BookingStore, holdFor time.Duration, now func() time.Time) *Bookings {
	return &Bookings{store: store, holdFor: holdFor, now: now, newCode: randomTicketCode}
}

// Hold checks a request and sets its seats aside. The buyer then has holdFor to pay.
//
// What is checked here needs no database: the shape of the phone number, names,
// national codes, dates and the seat list. Whether the seats are still free is
// checked by the store, inside the transaction that locks them.
func (s *Bookings) Hold(ctx context.Context, request domain.HoldRequest) (domain.Ticket, error) {
	request = cleaned(request)
	if fields := s.problems(request); len(fields) > 0 {
		return domain.Ticket{}, &domain.ValidationError{Fields: fields}
	}

	for attempt := 0; attempt < codeAttempts; attempt++ {
		code, err := s.newCode()
		if err != nil {
			return domain.Ticket{}, fmt.Errorf("make ticket code: %w", err)
		}
		err = s.store.CreateHold(ctx, domain.NewHold{
			Code:         code,
			TripID:       request.TripID,
			ContactPhone: request.ContactPhone,
			Passengers:   request.Passengers,
			HoldFor:      s.holdFor,
		})
		if errors.Is(err, domain.ErrDuplicateCode) {
			continue
		}
		if err != nil {
			return domain.Ticket{}, fmt.Errorf("hold seats on trip %d: %w", request.TripID, err)
		}
		return s.Ticket(ctx, code, request.ContactPhone)
	}
	return domain.Ticket{}, fmt.Errorf("hold seats on trip %d: %w", request.TripID, domain.ErrDuplicateCode)
}

// Ticket returns a ticket to whoever knows both its code and its phone number.
func (s *Bookings) Ticket(ctx context.Context, code string, phone string) (domain.Ticket, error) {
	ticket, err := s.store.Ticket(ctx, strings.TrimSpace(code), strings.TrimSpace(phone))
	if err != nil {
		return domain.Ticket{}, fmt.Errorf("ticket %s: %w", code, err)
	}
	return ticket, nil
}

// Pay turns a hold into a paid ticket and returns it.
func (s *Bookings) Pay(ctx context.Context, code string, phone string) (domain.Ticket, error) {
	if err := s.store.PayHold(ctx, strings.TrimSpace(code), strings.TrimSpace(phone)); err != nil {
		return domain.Ticket{}, fmt.Errorf("pay ticket %s: %w", code, err)
	}
	return s.Ticket(ctx, code, phone)
}

// Cancel gives up a hold, frees its seats, and returns the ticket.
func (s *Bookings) Cancel(ctx context.Context, code string, phone string) (domain.Ticket, error) {
	if err := s.store.CancelHold(ctx, strings.TrimSpace(code), strings.TrimSpace(phone)); err != nil {
		return domain.Ticket{}, fmt.Errorf("cancel ticket %s: %w", code, err)
	}
	return s.Ticket(ctx, code, phone)
}

// ExpireHolds ends the holds that were not paid in time. It returns how many.
func (s *Bookings) ExpireHolds(ctx context.Context) (int, error) {
	return s.store.ExpireHolds(ctx)
}

func cleaned(request domain.HoldRequest) domain.HoldRequest {
	request.ContactPhone = strings.TrimSpace(request.ContactPhone)
	passengers := make([]domain.PassengerInput, len(request.Passengers))
	for i, p := range request.Passengers {
		p.FirstName = strings.TrimSpace(p.FirstName)
		p.LastName = strings.TrimSpace(p.LastName)
		p.NationalCode = strings.TrimSpace(p.NationalCode)
		passengers[i] = p
	}
	request.Passengers = passengers
	return request
}

// problems returns every fault in the request at once, so a form can mark all the
// wrong boxes in one go. An empty result means the request is acceptable.
func (s *Bookings) problems(request domain.HoldRequest) map[string]string {
	fields := map[string]string{}
	if !mobilePattern.MatchString(request.ContactPhone) {
		fields["ContactPhone"] = "must be a mobile number: 11 digits starting with 09"
	}
	switch count := len(request.Passengers); {
	case count == 0:
		fields["Passengers"] = "at least one passenger is needed"
	case count > domain.MaxSeatsPerTicket:
		fields["Passengers"] = fmt.Sprintf("at most %d seats per purchase", domain.MaxSeatsPerTicket)
	}

	seenSeats := map[uint]bool{}
	seenCodes := map[string]bool{}
	for i, p := range request.Passengers {
		at := func(name string) string { return fmt.Sprintf("Passengers[%d].%s", i, name) }

		switch {
		case p.SeatNumber == 0:
			fields[at("SeatNumber")] = "is required"
		case seenSeats[p.SeatNumber]:
			fields[at("SeatNumber")] = "this seat is listed twice"
		}
		seenSeats[p.SeatNumber] = true

		if problem := nameProblem(p.FirstName); problem != "" {
			fields[at("FirstName")] = problem
		}
		if problem := nameProblem(p.LastName); problem != "" {
			fields[at("LastName")] = problem
		}
		if p.Gender != domain.GenderMale && p.Gender != domain.GenderFemale {
			fields[at("Gender")] = `must be "M" or "F"`
		}

		switch {
		case !ValidNationalCode(p.NationalCode):
			fields[at("NationalCode")] = "is not a valid national code"
		case seenCodes[p.NationalCode]:
			fields[at("NationalCode")] = "this person is listed twice"
		}
		seenCodes[p.NationalCode] = true

		switch {
		case p.BirthDate.IsZero():
			fields[at("BirthDate")] = "is required, as YYYY-MM-DD"
		case p.BirthDate.After(s.now()):
			fields[at("BirthDate")] = "cannot be in the future"
		case p.BirthDate.Year() < 1900:
			fields[at("BirthDate")] = "is too far in the past"
		}
	}
	return fields
}

func nameProblem(name string) string {
	switch length := utf8.RuneCountInString(name); {
	case length == 0:
		return "is required"
	case length > maxNameLength:
		return fmt.Sprintf("is longer than %d letters", maxNameLength)
	}
	return ""
}

// ValidNationalCode checks an Iranian national code: ten digits, where the last one
// is a check digit worked out from the first nine. This catches most typing mistakes.
func ValidNationalCode(code string) bool {
	if len(code) != 10 {
		return false
	}
	sum := 0
	allSame := true
	for i := 0; i < 10; i++ {
		if code[i] < '0' || code[i] > '9' {
			return false
		}
		if code[i] != code[0] {
			allSame = false
		}
		if i < 9 {
			sum += int(code[i]-'0') * (10 - i)
		}
	}
	// Codes like 1111111111 pass the arithmetic but are not issued to anyone.
	if allSame {
		return false
	}
	remainder := sum % 11
	check := int(code[9] - '0')
	if remainder < 2 {
		return check == remainder
	}
	return check == 11-remainder
}

// randomTicketCode makes a 12-digit code that cannot be guessed. It uses the
// operating system's secure random source, not math/rand, because the code is
// half of what opens a ticket.
func randomTicketCode() (string, error) {
	limit := big.NewInt(1_000_000_000_000)
	number, err := rand.Int(rand.Reader, limit)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%0*d", ticketCodeDigits, number), nil
}
