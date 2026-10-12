package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/ali-padash/bus-ticket-reservation-system/backend/internal/domain"

	"github.com/gin-gonic/gin"
)

// No request to this API needs more than a few hundred bytes. The limit stops a
// client from making the server read a huge body.
const maxBodyBytes = 16 << 10

// What the buyer sends to set seats aside.
type holdRequest struct {
	ContactPhone string             `json:"ContactPhone"`
	Passengers   []passengerRequest `json:"Passengers"`
}

type passengerRequest struct {
	SeatNumber   uint   `json:"SeatNumber"`
	FirstName    string `json:"FirstName"`
	LastName     string `json:"LastName"`
	NationalCode string `json:"NationalCode"`
	BirthDate    string `json:"BirthDate"` // YYYY-MM-DD, Gregorian
	Gender       string `json:"Gender"`    // "M" or "F"
}

// The phone number travels in the body, never in the address: addresses end up in
// browser history and server logs, and a phone number is personal data.
type phoneRequest struct {
	ContactPhone string `json:"ContactPhone"`
}

type ticketResponse struct {
	Code         string              `json:"Code"`
	Status       string              `json:"Status"`
	ContactPhone string              `json:"ContactPhone"`
	Trip         ticketTripResponse  `json:"Trip"`
	Passengers   []passengerResponse `json:"Passengers"`
	PricePerSeat int64               `json:"PricePerSeat"`
	TotalPrice   int64               `json:"TotalPrice"`
	ReservedAt   time.Time           `json:"ReservedAt"`
	ExpiresAt    *time.Time          `json:"ExpiresAt"`
	SecondsLeft  int                 `json:"SecondsLeft"`
	PaidAt       *time.Time          `json:"PaidAt"`
}

type ticketTripResponse struct {
	ID                             uint   `json:"ID"`
	CompanyPersianName             string `json:"CompanyPersianName"`
	BusType                        string `json:"BusType"`
	OriginCityID                   uint   `json:"OriginCityID"`
	OriginPersianName              string `json:"OriginPersianName"`
	OriginTerminalPersianName      string `json:"OriginTerminalPersianName"`
	DestinationCityID              uint   `json:"DestinationCityID"`
	DestinationPersianName         string `json:"DestinationPersianName"`
	DestinationTerminalPersianName string `json:"DestinationTerminalPersianName"`
	// The same names in English, for the English website.
	CompanyName             string `json:"CompanyName"`
	BusTypeEnglish          string `json:"BusTypeEnglish"`
	OriginEnglishName       string `json:"OriginEnglishName"`
	OriginTerminalName      string `json:"OriginTerminalName"`
	DestinationEnglishName  string `json:"DestinationEnglishName"`
	DestinationTerminalName string `json:"DestinationTerminalName"`
	DepartureDate           string `json:"DepartureDate"`
	DepartureTime           string `json:"DepartureTime"`
}

type passengerResponse struct {
	SeatNumber   uint   `json:"SeatNumber"`
	FirstName    string `json:"FirstName"`
	LastName     string `json:"LastName"`
	NationalCode string `json:"NationalCode"`
	BirthDate    string `json:"BirthDate"`
	Gender       string `json:"Gender"`
}

type seatMapResponse struct {
	// Layout is the floor plan, row by row: a seat number, or null for empty floor.
	Layout             [][]*uint      `json:"Layout"`
	Seats              []seatResponse `json:"Seats"`
	AvailableSeatCount int            `json:"AvailableSeatCount"`
}

type refundRuleResponse struct {
	MinHoursBeforeDeparture int `json:"MinHoursBeforeDeparture"`
	PenaltyPercent          int `json:"PenaltyPercent"`
}

func newTicketResponse(t domain.Ticket) ticketResponse {
	passengers := make([]passengerResponse, 0, len(t.Passengers))
	for _, p := range t.Passengers {
		passengers = append(passengers, passengerResponse{
			SeatNumber:   p.SeatNumber,
			FirstName:    p.FirstName,
			LastName:     p.LastName,
			NationalCode: p.NationalCode,
			BirthDate:    p.BirthDate,
			Gender:       p.Gender,
		})
	}
	return ticketResponse{
		Code:         t.Code,
		Status:       t.Status,
		ContactPhone: t.ContactPhone,
		Trip: ticketTripResponse{
			ID:                             t.Trip.ID,
			CompanyPersianName:             t.Trip.CompanyPersianName,
			BusType:                        t.Trip.BusName,
			OriginCityID:                   t.Trip.OriginCityID,
			OriginPersianName:              t.Trip.OriginCityPersianName,
			OriginTerminalPersianName:      t.Trip.OriginTerminalPersianName,
			DestinationCityID:              t.Trip.DestinationCityID,
			DestinationPersianName:         t.Trip.DestinationCityPersianName,
			DestinationTerminalPersianName: t.Trip.DestinationTerminalPersianName,
			CompanyName:                    t.Trip.CompanyName,
			BusTypeEnglish:                 t.Trip.BusNameEnglish,
			OriginEnglishName:              t.Trip.OriginCityName,
			OriginTerminalName:             t.Trip.OriginTerminalName,
			DestinationEnglishName:         t.Trip.DestinationCityName,
			DestinationTerminalName:        t.Trip.DestinationTerminalName,
			DepartureDate:                  t.Trip.DepartureDate,
			DepartureTime:                  t.Trip.DepartureTime,
		},
		Passengers:   passengers,
		PricePerSeat: t.PricePerSeat,
		TotalPrice:   t.TotalPrice,
		ReservedAt:   t.ReservedAt,
		ExpiresAt:    t.ExpiresAt,
		SecondsLeft:  t.SecondsLeft,
		PaidAt:       t.PaidAt,
	}
}

// readJSON fills target from the request body. It answers 400 itself and returns
// false when the body is too big, is not JSON, or has a field this API does not know
// (which usually means a typing mistake in the client).
func readJSON(c *gin.Context, target any) bool {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBodyBytes)
	decoder := json.NewDecoder(c.Request.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		var tooBig *http.MaxBytesError
		if errors.As(err, &tooBig) {
			badRequest(c, "Request body is too large")
			return false
		}
		badRequest(c, "Request body is not valid JSON for this route")
		return false
	}
	return true
}

// GET /trips/:id/seat-map
func (a *api) tripSeatMap(c *gin.Context) {
	tripID, ok := tripIDParam(c)
	if !ok {
		return
	}
	seatMap, err := a.trips.SeatMap(c.Request.Context(), tripID)
	if err != nil {
		a.fail(c, err)
		return
	}
	layout := make([][]*uint, len(seatMap.Layout))
	for r, row := range seatMap.Layout {
		layout[r] = make([]*uint, len(row))
		for i := range row {
			if row[i] != 0 {
				layout[r][i] = &row[i]
			}
		}
	}
	seats := make([]seatResponse, 0, len(seatMap.Seats))
	for _, seat := range seatMap.Seats {
		seats = append(seats, seatResponse{SeatNumber: seat.Number, Accessible: seat.ForSale, Gender: seat.Gender})
	}
	c.JSON(http.StatusOK, seatMapResponse{Layout: layout, Seats: seats, AvailableSeatCount: seatMap.AvailableSeats})
}

// GET /trips/:id/refund-rules
func (a *api) tripRefundRules(c *gin.Context) {
	tripID, ok := tripIDParam(c)
	if !ok {
		return
	}
	rules, err := a.trips.RefundRules(c.Request.Context(), tripID)
	if err != nil {
		a.fail(c, err)
		return
	}
	response := make([]refundRuleResponse, 0, len(rules))
	for _, rule := range rules {
		response = append(response, refundRuleResponse(rule))
	}
	c.JSON(http.StatusOK, response)
}

// POST /trips/:id/tickets
func (a *api) holdSeats(c *gin.Context) {
	tripID, ok := tripIDParam(c)
	if !ok {
		return
	}
	var body holdRequest
	if !readJSON(c, &body) {
		return
	}

	request := domain.HoldRequest{TripID: tripID, ContactPhone: body.ContactPhone}
	for _, p := range body.Passengers {
		// A date that cannot be read stays zero, and the service reports it with the
		// other faults, so the buyer sees every wrong box at once.
		birthDate, _ := time.Parse(dateLayout, p.BirthDate)
		request.Passengers = append(request.Passengers, domain.PassengerInput{
			SeatNumber:   p.SeatNumber,
			FirstName:    p.FirstName,
			LastName:     p.LastName,
			NationalCode: p.NationalCode,
			BirthDate:    birthDate,
			Gender:       p.Gender,
		})
	}

	ticket, err := a.bookings.Hold(c.Request.Context(), request)
	if err != nil {
		a.fail(c, err)
		return
	}
	c.JSON(http.StatusCreated, newTicketResponse(ticket))
}

// ticketAction is the shared shape of the three routes that take a ticket code in
// the address and the phone number in the body.
func (a *api) ticketAction(c *gin.Context, action func(code string, phone string) (domain.Ticket, error)) {
	var body phoneRequest
	if !readJSON(c, &body) {
		return
	}
	ticket, err := action(c.Param("code"), body.ContactPhone)
	if err != nil {
		a.fail(c, err)
		return
	}
	c.JSON(http.StatusOK, newTicketResponse(ticket))
}

// POST /tickets/:code/lookup
func (a *api) lookupTicket(c *gin.Context) {
	a.ticketAction(c, func(code string, phone string) (domain.Ticket, error) {
		return a.bookings.Ticket(c.Request.Context(), code, phone)
	})
}

// POST /tickets/:code/payment
func (a *api) payTicket(c *gin.Context) {
	a.ticketAction(c, func(code string, phone string) (domain.Ticket, error) {
		return a.bookings.Pay(c.Request.Context(), code, phone)
	})
}

// POST /tickets/:code/cancellation
func (a *api) cancelTicket(c *gin.Context) {
	a.ticketAction(c, func(code string, phone string) (domain.Ticket, error) {
		return a.bookings.Cancel(c.Request.Context(), code, phone)
	})
}
