package httpapi

import (
	"net/http"
	"strconv"
	"time"

	"github.com/ali-padash/bus-ticket-reservation-system/backend/internal/domain"

	"github.com/gin-gonic/gin"
)

const dateLayout = "2006-01-02"

// The field names below are the API contract. They are PascalCase because the
// website was built against the JSON of the real Safar724 site.

type searchResponse struct {
	Date                   string         `json:"Date"`
	OriginPersianName      string         `json:"OriginPersianName"`
	OriginEnglishName      string         `json:"OriginEnglishName"`
	OriginCode             string         `json:"OriginCode"`
	DestinationPersianName string         `json:"DestinationPersianName"`
	DestinationEnglishName string         `json:"DestinationEnglishName"`
	DestinationCode        string         `json:"DestinationCode"`
	Today                  *string        `json:"Today"`
	Logo                   *string        `json:"Logo"`
	Items                  []tripResponse `json:"Items"`
}

type tripResponse struct {
	ID                             uint    `json:"ID"`
	IsVip                          bool    `json:"IsVip"`
	BusType                        string  `json:"BusType"`
	BusCode                        string  `json:"BusCode"`
	Price                          int64   `json:"Price"`
	MidwayCity                     string  `json:"MidwayCity"`
	MidwayCityCode                 string  `json:"MidwayCityCode"`
	MidwayEnglishName              string  `json:"MidwayEnglishName"`
	CompanyCode                    string  `json:"CompanyCode"`
	OriginTerminalName             string  `json:"OriginTerminalName"`
	OriginTerminalPersianName      string  `json:"OriginTerminalPersianName"`
	OriginTerminalCode             string  `json:"OriginTerminalCode"`
	DestinationTerminalPersianName string  `json:"DestinationTerminalPersianName"`
	DestinationTerminalName        string  `json:"DestinationTerminalName"`
	DestinationTerminalCode        string  `json:"DestinationTerminalCode"`
	CompanyName                    string  `json:"CompanyName"`
	CompanyPersianName             string  `json:"CompanyPersianName"`
	DepartureTime                  string  `json:"DepartureTime"`
	DepartureDate                  string  `json:"DepartureDate"`
	Description                    string  `json:"Description"`
	BriefDescription               *string `json:"BriefDescription"`
	DestinationCode                string  `json:"DestinationCode"`
	AvailableSeatCount             int     `json:"AvailableSeatCount"`
	DiscountPercentage             float64 `json:"DiscountPercentage"`
	CompanyLogo                    string  `json:"CompanyLogo"`
	CompanyId                      uint    `json:"CompanyId"`
	CompanyUrl                     string  `json:"CompanyUrl"`
	OriginTerminalUrl              string  `json:"OriginTerminalUrl"`
	DestinationTerminalUrl         string  `json:"DestinationTerminalUrl"`
	Status                         int     `json:"Status"`
}

type seatResponse struct {
	SeatNumber uint    `json:"SeatNumber"`
	Accessible bool    `json:"Accessible"`
	Gender     *string `json:"Gender"`
}

type availabilityResponse struct {
	AvailableSeatCount int `json:"AvailableSeatCount"`
}

// The midway, terminal URL and status fields have no data behind them yet.
// They stay in the response, empty, because the website's types expect them.
func newTripResponse(t domain.Trip) tripResponse {
	return tripResponse{
		ID:                             t.ID,
		IsVip:                          t.VIP,
		BusType:                        t.BusName,
		BusCode:                        t.BusCode,
		Price:                          t.Price,
		CompanyCode:                    t.Company.Code,
		OriginTerminalName:             t.Origin.Name,
		OriginTerminalPersianName:      t.Origin.PersianName,
		OriginTerminalCode:             t.Origin.Code,
		DestinationTerminalPersianName: t.Destination.PersianName,
		DestinationTerminalName:        t.Destination.Name,
		DestinationTerminalCode:        t.Destination.Code,
		CompanyName:                    t.Company.Name,
		CompanyPersianName:             t.Company.PersianName,
		DepartureTime:                  t.DepartureTime,
		DepartureDate:                  t.DepartureDate,
		Description:                    t.Description,
		BriefDescription:               t.BriefDescription,
		DestinationCode:                t.DestinationCityCode,
		AvailableSeatCount:             t.AvailableSeats,
		DiscountPercentage:             t.DiscountPercentage,
		CompanyLogo:                    t.Company.Logo,
		CompanyId:                      t.Company.ID,
		CompanyUrl:                     t.Company.URL,
	}
}

// GET /trips?from=<city id>&to=<city id>&date=YYYY-MM-DD
func (a *api) searchTrips(c *gin.Context) {
	originID, err := strconv.ParseUint(c.Query("from"), 10, 32)
	if err != nil {
		badRequest(c, "Invalid from: expected a city id")
		return
	}
	destinationID, err := strconv.ParseUint(c.Query("to"), 10, 32)
	if err != nil {
		badRequest(c, "Invalid to: expected a city id")
		return
	}
	date, err := time.Parse(dateLayout, c.Query("date"))
	if err != nil {
		badRequest(c, "Invalid date: expected YYYY-MM-DD")
		return
	}

	result, err := a.trips.Search(c.Request.Context(), domain.TripSearch{
		OriginCityID:      uint(originID),
		DestinationCityID: uint(destinationID),
		Date:              date,
	})
	if err != nil {
		a.fail(c, err)
		return
	}

	// Start from an empty list, not nil, so "no trips" is [] in JSON and never null.
	items := make([]tripResponse, 0, len(result.Trips))
	for _, trip := range result.Trips {
		items = append(items, newTripResponse(trip))
	}
	c.JSON(http.StatusOK, searchResponse{
		Date:                   result.Date.Format(dateLayout),
		OriginPersianName:      result.Origin.PersianName,
		OriginEnglishName:      result.Origin.Name,
		OriginCode:             result.Origin.Code,
		DestinationPersianName: result.Destination.PersianName,
		DestinationEnglishName: result.Destination.Name,
		DestinationCode:        result.Destination.Code,
		Items:                  items,
	})
}

// GET /trips/:id/seats
func (a *api) tripSeats(c *gin.Context) {
	tripID, ok := tripIDParam(c)
	if !ok {
		return
	}
	seats, err := a.trips.Seats(c.Request.Context(), tripID)
	if err != nil {
		a.fail(c, err)
		return
	}
	response := make([]seatResponse, 0, len(seats))
	for _, seat := range seats {
		response = append(response, seatResponse{SeatNumber: seat.Number, Accessible: seat.ForSale, Gender: seat.Gender})
	}
	c.JSON(http.StatusOK, response)
}

// GET /trips/:id/availability
func (a *api) tripAvailability(c *gin.Context) {
	tripID, ok := tripIDParam(c)
	if !ok {
		return
	}
	count, err := a.trips.Availability(c.Request.Context(), tripID)
	if err != nil {
		a.fail(c, err)
		return
	}
	c.JSON(http.StatusOK, availabilityResponse{AvailableSeatCount: count})
}

func tripIDParam(c *gin.Context) (uint, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		badRequest(c, "Invalid trip id")
		return 0, false
	}
	return uint(id), true
}
