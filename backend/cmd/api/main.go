// Command api is the backend program. It builds the parts and connects them:
// settings -> database -> rules -> web layer. No other package creates its own dependencies.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ali-padash/bus-ticket-reservation-system/backend/internal/config"
	"github.com/ali-padash/bus-ticket-reservation-system/backend/internal/httpapi"
	"github.com/ali-padash/bus-ticket-reservation-system/backend/internal/seed"
	"github.com/ali-padash/bus-ticket-reservation-system/backend/internal/service"
	"github.com/ali-padash/bus-ticket-reservation-system/backend/internal/store"

	"github.com/gin-gonic/gin"
)

const usage = `usage: go run ./cmd/api [command]

  serve     run migrations, then start the API (default)
  migrate   run migrations and exit
  seed      run migrations, then wipe the tables and load demo data
            optional argument: path to cities.json`

// How long requests that are already running get to finish after Ctrl+C.
const shutdownTimeout = 10 * time.Second

// How long the city list is kept in memory before it is read from the database again.
const cityListLifetime = time.Hour

// How long chosen seats stay set aside for a buyer who has not paid yet.
const holdLifetime = 10 * time.Minute

// How often unpaid holds that ran out of time are cleaned up.
const holdSweepEvery = time.Minute

func main() {
	log := slog.New(slog.NewTextHandler(os.Stderr, nil))
	if err := run(os.Args[1:], log); err != nil {
		log.Error("stopped", "error", err)
		os.Exit(1)
	}
}

func run(args []string, log *slog.Logger) error {
	command := "serve"
	if len(args) > 0 {
		command = args[0]
	}
	if command != "serve" && command != "migrate" && command != "seed" {
		fmt.Println(usage)
		os.Exit(2)
	}

	cfg, err := config.Load()
	if err != nil {
		return err
	}
	db, err := store.Open(cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer db.Close()
	if err := db.Migrate(); err != nil {
		return err
	}

	switch command {
	case "seed":
		citiesPath := "../devs/src/util/cities.json"
		if len(args) > 1 {
			citiesPath = args[1]
		}
		return seed.Run(db.DB(), citiesPath, log)
	case "serve":
		return serve(cfg, db, log)
	}
	return nil
}

func serve(cfg config.Config, db *store.Store, log *slog.Logger) error {
	gin.SetMode(gin.ReleaseMode)
	trips := service.NewTrips(db)
	cities := service.NewCities(db, cityListLifetime, time.Now)
	bookings := service.NewBookings(db, holdLifetime, time.Now)
	server := &http.Server{
		Addr:              cfg.APIAddr,
		Handler:           httpapi.NewHandler(trips, cities, bookings, log, cfg.CORSOrigin),
		ReadHeaderTimeout: 5 * time.Second,
	}

	// Ctrl+C or a stop signal cancels ctx.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go sweepHolds(ctx, bookings, log)

	failed := make(chan error, 1)
	go func() { failed <- server.ListenAndServe() }()
	log.Info("API listening", "address", "http://"+cfg.APIAddr, "allowed origin", cfg.CORSOrigin)

	select {
	case err := <-failed:
		return err
	case <-ctx.Done():
	}

	// Stop taking new requests and let the running ones finish.
	log.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("shutdown: %w", err)
	}
	if err := <-failed; !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

// sweepHolds ends unpaid holds whose time is up, once a minute, until ctx is cancelled.
// Seats do not wait for it: an expired hold stops counting at once in every query.
// The sweep only writes that fact down, so the tables say what the queries already assume.
func sweepHolds(ctx context.Context, bookings *service.Bookings, log *slog.Logger) {
	ticker := time.NewTicker(holdSweepEvery)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			ended, err := bookings.ExpireHolds(ctx)
			switch {
			case err != nil && ctx.Err() == nil:
				log.Error("could not expire holds", "error", err)
			case ended > 0:
				log.Info("expired unpaid holds", "tickets", ended)
			}
		}
	}
}
