// Package config reads the settings the program needs from the environment.
package config

import (
	"errors"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL string
	APIAddr     string
	CORSOrigin  string
}

// Load reads the settings once, at start-up. Nothing else in the program reads the environment.
func Load() (Config, error) {
	// The .env file is optional: real environment variables win.
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")

	cfg := Config{
		DatabaseURL: os.Getenv("DATABASE_URL"),
		APIAddr:     envOr("API_ADDR", "localhost:8080"),
		CORSOrigin:  envOr("CORS_ORIGIN", "http://localhost:5173"),
	}
	if cfg.DatabaseURL == "" {
		return Config{}, errors.New("DATABASE_URL is not set; copy .env.example to .env")
	}
	return cfg, nil
}

func envOr(key string, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
