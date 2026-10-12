// Package domain holds the types and errors the whole backend speaks in.
// It knows nothing about HTTP, JSON or SQL, so every other package may import it
// and it imports none of them.
package domain

import (
	"errors"
	"time"
)

var (
	ErrCityNotFound = errors.New("city not found")
	ErrTripNotFound = errors.New("trip not found")
)

const (
	GenderMale   = "M"
	GenderFemale = "F"

	TicketReserved  = "reserved"
	TicketPaid      = "paid"
	TicketCancelled = "cancelled"
)

type City struct {
	ID          uint
	Code        string
	Name        string
	PersianName string
}

// Terminal is a bus station. One city can have several.
type Terminal struct {
	Code        string
	Name        string
	PersianName string
}

type Company struct {
	ID          uint
	Code        string
	Name        string
	PersianName string
	Logo        string
	URL         string
}

// Trip is one bus leaving one terminal for another on one day.
type Trip struct {
	ID                  uint
	Company             Company
	Origin              Terminal
	Destination         Terminal
	DestinationCityCode string
	BusName             string
	// BusCode names the seat layout the website draws, for example VIP_25_1.
	BusCode            string
	VIP                bool
	Price              int64
	DiscountPercentage float64
	DepartureDate      string // YYYY-MM-DD
	DepartureTime      string // HH:MM
	Description        string
	BriefDescription   *string
	AvailableSeats     int
}

// Seat is one seat of one trip. Gender is nil while nobody sits there.
type Seat struct {
	Number  uint
	ForSale bool
	Gender  *string
}

type TripSearch struct {
	OriginCityID      uint
	DestinationCityID uint
	Date              time.Time
}

type SearchResult struct {
	Date        time.Time
	Origin      City
	Destination City
	Trips       []Trip
}
