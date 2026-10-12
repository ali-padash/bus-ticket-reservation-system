package httpapi

import (
	"errors"
	"net/http"

	"github.com/ali-padash/bus-ticket-reservation-system/backend/internal/domain"

	"github.com/gin-gonic/gin"
)

// Every error leaves the API in this one shape.
type errorResponse struct {
	Error string `json:"error"`
}

func badRequest(c *gin.Context, message string) {
	c.JSON(http.StatusBadRequest, errorResponse{Error: message})
}

// fail turns an error from the service into a response. Known errors get their own
// status. Anything else is logged here and the browser only gets a general message,
// so database details never leave the server.
func (a *api) fail(c *gin.Context, err error) {
	switch {
	case errors.Is(err, domain.ErrCityNotFound):
		c.JSON(http.StatusNotFound, errorResponse{Error: "City not found"})
	case errors.Is(err, domain.ErrTripNotFound):
		c.JSON(http.StatusNotFound, errorResponse{Error: "Trip not found"})
	default:
		a.log.Error("request failed", "method", c.Request.Method, "path", c.Request.URL.Path, "error", err)
		c.JSON(http.StatusInternalServerError, errorResponse{Error: "Internal server error"})
	}
}
