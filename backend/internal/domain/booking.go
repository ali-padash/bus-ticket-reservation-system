package domain

import (
	"errors"
	"fmt"
	"time"
)

const (
	// TicketExpired is a hold that was not paid in time.
	TicketExpired = "expired"

	// MaxSeatsPerTicket is how many seats one purchase may take.
	MaxSeatsPerTicket = 4
)

var (
	ErrTicketNotFound = errors.New("ticket not found")
	// ErrTripDeparted means the bus has already left, so nothing can be bought on it.
	ErrTripDeparted = errors.New("trip has departed")
	// ErrHoldExpired means the time to pay ran out and the seats were released.
	ErrHoldExpired = errors.New("hold has expired")
	// ErrTicketClosed means the ticket was cancelled, so it can no longer be paid.
	ErrTicketClosed = errors.New("ticket is cancelled")
	// ErrTicketPaid means a paid ticket was asked to be cancelled. Refunds are not built.
	ErrTicketPaid = errors.New("ticket is already paid")
	// ErrDuplicateCode means a new ticket code happened to exist already. The caller retries.
	ErrDuplicateCode = errors.New("ticket code already exists")
)

// SeatsUnavailableError lists the chosen seats that cannot be had: taken a moment
// ago, not for sale, or not on this bus at all.
type SeatsUnavailableError struct {
	Seats []uint
}

func (e *SeatsUnavailableError) Error() string {
	return fmt.Sprintf("seats not available: %v", e.Seats)
}

// ValidationError says which parts of a request are wrong. The key is the field
// ("ContactPhone", "Passengers[1].NationalCode"), the value says what is wrong with it.
type ValidationError struct {
	Fields map[string]string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("invalid request: %v", e.Fields)
}

// PassengerInput is one person in one seat, as the buyer typed it.
type PassengerInput struct {
	SeatNumber   uint
	FirstName    string
	LastName     string
	NationalCode string
	BirthDate    time.Time
	Gender       string
}

// HoldRequest is what a buyer sends to set seats aside.
type HoldRequest struct {
	TripID       uint
	ContactPhone string
	Passengers   []PassengerInput
}

// NewHold is a checked HoldRequest, ready to be written.
type NewHold struct {
	Code         string
	TripID       uint
	ContactPhone string
	Passengers   []PassengerInput
	HoldFor      time.Duration
}

type Passenger struct {
	SeatNumber   uint
	FirstName    string
	LastName     string
	NationalCode string
	BirthDate    string // YYYY-MM-DD
	Gender       string
}

// TicketTrip is the part of a trip that is printed on a ticket.
type TicketTrip struct {
	ID                             uint
	CompanyPersianName             string
	BusName                        string
	OriginCityPersianName          string
	OriginTerminalPersianName      string
	DestinationCityPersianName     string
	DestinationTerminalPersianName string
	DepartureDate                  string // YYYY-MM-DD
	DepartureTime                  string // HH:MM
}

// Ticket is one purchase: one trip, one buyer's phone, one or more passengers.
type Ticket struct {
	Code         string
	Status       string
	ContactPhone string
	Trip         TicketTrip
	Passengers   []Passenger
	PricePerSeat int64
	TotalPrice   int64
	ReservedAt   time.Time
	// ExpiresAt and SecondsLeft matter only while the ticket is a hold.
	ExpiresAt   *time.Time
	SecondsLeft int
	PaidAt      *time.Time
}

// RefundRule reads: "cancel at least MinHoursBeforeDeparture hours before the bus
// leaves and lose PenaltyPercent of the price".
type RefundRule struct {
	MinHoursBeforeDeparture int
	PenaltyPercent          int
}

// SeatMap is everything needed to draw a bus: where each seat is, and who is in it.
type SeatMap struct {
	// Layout is the floor plan, row by row. A zero is empty floor.
	Layout         [][]uint
	Seats          []Seat
	AvailableSeats int
}

// DiscountedPrice is what one seat costs after the trip's discount, rounded down to a whole rial.
func DiscountedPrice(price int64, discountPercent float64) int64 {
	if discountPercent <= 0 {
		return price
	}
	if discountPercent >= 100 {
		return 0
	}
	// Work in hundredths of a percent so no fraction of a rial is invented by floating point.
	basisPoints := int64(discountPercent*100 + 0.5)
	return price * (10000 - basisPoints) / 10000
}
