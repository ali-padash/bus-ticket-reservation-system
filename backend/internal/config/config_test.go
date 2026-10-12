package config

import "testing"

func TestLoadNeedsDatabaseURL(t *testing.T) {
	t.Setenv("DATABASE_URL", "")

	if _, err := Load(); err == nil {
		t.Fatal("Load() returned no error without DATABASE_URL")
	}
}

func TestLoadDefaultsAndOverrides(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://example")
	t.Setenv("API_ADDR", "")
	t.Setenv("CORS_ORIGIN", "http://localhost:15173")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error: %v", err)
	}
	if cfg.APIAddr != "localhost:8080" {
		t.Errorf("APIAddr = %q, want the default localhost:8080", cfg.APIAddr)
	}
	if cfg.CORSOrigin != "http://localhost:15173" {
		t.Errorf("CORSOrigin = %q, want the value from the environment", cfg.CORSOrigin)
	}
}
