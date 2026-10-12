package httpapi

import (
	"errors"
	"net/http"

	"github.com/ali-padash/bus-ticket-reservation-system/backend/internal/domain"

	"github.com/gin-gonic/gin"
)

// Every error leaves the API in this one shape. "error" is a sentence for a person.
// "code" is a fixed word a program can test. The last two appear only where they apply.
type errorResponse struct {
	Error  string            `json:"error"`
	Code   string            `json:"code,omitempty"`
	Fields map[string]string `json:"fields,omitempty"`
	Seats  []uint            `json:"seats,omitempty"`
}

func badRequest(c *gin.Context, message string) {
	c.JSON(http.StatusBadRequest, errorResponse{Error: message, Code: "bad_request"})
}

// fail turns an error from the service into a response. Known errors get their own
// status. Anything else is logged here and the browser only gets a general message,
// so database details never leave the server.
func (a *api) fail(c *gin.Context, err error) {
	var invalid *domain.ValidationError
	var unavailable *domain.SeatsUnavailableError
	switch {
	case errors.Is(err, domain.ErrCityNotFound):
		c.JSON(http.StatusNotFound, errorResponse{Error: "City not found", Code: "city_not_found"})
	case errors.Is(err, domain.ErrTripNotFound):
		c.JSON(http.StatusNotFound, errorResponse{Error: "Trip not found", Code: "trip_not_found"})
	case errors.Is(err, domain.ErrTicketNotFound):
		c.JSON(http.StatusNotFound, errorResponse{Error: "Ticket not found", Code: "ticket_not_found"})
	case errors.As(err, &invalid):
		c.JSON(http.StatusUnprocessableEntity, errorResponse{
			Error: "Some of the details are not valid", Code: "validation_failed", Fields: invalid.Fields})
	case errors.As(err, &unavailable):
		c.JSON(http.StatusConflict, errorResponse{
			Error: "Some of the chosen seats are not available", Code: "seats_unavailable", Seats: unavailable.Seats})
	case errors.Is(err, domain.ErrTripDeparted):
		c.JSON(http.StatusConflict, errorResponse{Error: "This trip has already departed", Code: "trip_departed"})
	case errors.Is(err, domain.ErrHoldExpired):
		c.JSON(http.StatusConflict, errorResponse{
			Error: "The time to pay has run out and the seats were released", Code: "hold_expired"})
	case errors.Is(err, domain.ErrTicketClosed):
		c.JSON(http.StatusConflict, errorResponse{Error: "This ticket was cancelled", Code: "ticket_cancelled"})
	case errors.Is(err, domain.ErrTicketPaid):
		c.JSON(http.StatusConflict, errorResponse{
			Error: "A paid ticket cannot be cancelled here", Code: "ticket_already_paid"})
	default:
		a.log.Error("request failed", "method", c.Request.Method, "path", c.Request.URL.Path, "error", err)
		c.JSON(http.StatusInternalServerError, errorResponse{Error: "Internal server error", Code: "internal_error"})
	}
}
