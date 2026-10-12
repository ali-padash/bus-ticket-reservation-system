// Package httpapi is the web layer: routes, input checks, and the JSON that goes out.
// It holds no rules of its own; it calls a service and turns the result into a response.
package httpapi

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/ali-padash/bus-ticket-reservation-system/backend/internal/domain"

	"github.com/gin-gonic/gin"
	"github.com/rs/cors"
)

// TripService is what the trip routes need. The real one is service.Trips.
type TripService interface {
	Search(ctx context.Context, q domain.TripSearch) (domain.SearchResult, error)
	Seats(ctx context.Context, tripID uint) ([]domain.Seat, error)
	Availability(ctx context.Context, tripID uint) (int, error)
}

type api struct {
	trips TripService
	log   *slog.Logger
}

// NewHandler builds the whole API. corsOrigin is the one website address allowed to call it.
func NewHandler(trips TripService, log *slog.Logger, corsOrigin string) http.Handler {
	a := &api{trips: trips, log: log}

	router := gin.New()
	router.Use(gin.Recovery(), a.logRequests)

	v1 := router.Group("/api/v1")
	v1.GET("/trips", a.searchTrips)
	v1.GET("/trips/:id/seats", a.tripSeats)
	v1.GET("/trips/:id/availability", a.tripAvailability)

	return cors.New(cors.Options{
		AllowedOrigins:   []string{corsOrigin},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type"},
		AllowCredentials: true,
	}).Handler(router)
}

// logRequests writes one line per request, after it has been answered.
func (a *api) logRequests(c *gin.Context) {
	start := time.Now()
	c.Next()
	a.log.Info("request",
		"method", c.Request.Method,
		"path", c.Request.URL.Path,
		"status", c.Writer.Status(),
		"duration", time.Since(start).Round(time.Microsecond).String(),
	)
}
