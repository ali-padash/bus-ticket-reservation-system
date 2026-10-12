package service

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/ali-padash/bus-ticket-reservation-system/backend/internal/domain"
)

// CityStore is what the city list needs from the database.
type CityStore interface {
	Cities(ctx context.Context) ([]domain.CityEntry, error)
}

// Cities serves the city list from memory. The list changes rarely and is read by
// every visitor, so it is read from the database once and then reused until it is
// too old or Invalidate is called.
type Cities struct {
	store    CityStore
	lifetime time.Duration
	now      func() time.Time

	mu       sync.Mutex
	list     []domain.CityEntry
	loadedAt time.Time
}

// NewCities takes the clock as an argument so a test can move time forward.
func NewCities(store CityStore, lifetime time.Duration, now func() time.Time) *Cities {
	return &Cities{store: store, lifetime: lifetime, now: now}
}

// List returns every city, and when that list was read from the database.
// Callers must not change the returned slice; it is shared between requests.
func (s *Cities) List(ctx context.Context) ([]domain.CityEntry, time.Time, error) {
	// The lock is held while loading, so a hundred visitors arriving at an empty
	// cache cause one database read, not a hundred.
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.list != nil && s.now().Sub(s.loadedAt) < s.lifetime {
		return s.list, s.loadedAt, nil
	}
	list, err := s.store.Cities(ctx)
	if err != nil {
		return nil, time.Time{}, fmt.Errorf("load cities: %w", err)
	}
	s.list, s.loadedAt = list, s.now()
	return s.list, s.loadedAt, nil
}

// Invalidate makes the next List read the database again.
// Whatever changes a city must call it.
func (s *Cities) Invalidate() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.list = nil
}
