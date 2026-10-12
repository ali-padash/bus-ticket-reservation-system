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
	server := &http.Server{
		Addr:              cfg.APIAddr,
		Handler:           httpapi.NewHandler(trips, log, cfg.CORSOrigin),
		ReadHeaderTimeout: 5 * time.Second,
	}

	// Ctrl+C or a stop signal cancels ctx.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

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
