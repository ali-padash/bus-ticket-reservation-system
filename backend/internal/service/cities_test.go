package service

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/ali-padash/bus-ticket-reservation-system/backend/internal/domain"
)

// countingStore counts how often the database would have been read.
type countingStore struct {
	mu    sync.Mutex
	reads int
	err   error
}

func (c *countingStore) Cities(context.Context) ([]domain.CityEntry, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.reads++
	if c.err != nil {
		return nil, c.err
	}
	return []domain.CityEntry{{City: domain.City{ID: 1, Name: "tehran"}}}, nil
}

// fakeClock is a clock the test moves by hand.
type fakeClock struct{ at time.Time }

func (c *fakeClock) now() time.Time { return c.at }

func newCities() (*Cities, *countingStore, *fakeClock) {
	store := &countingStore{}
	clock := &fakeClock{at: time.Date(2026, 10, 12, 9, 0, 0, 0, time.UTC)}
	return NewCities(store, time.Hour, clock.now), store, clock
}

func TestCitiesAreReadOnce(t *testing.T) {
	cities, store, clock := newCities()

	first, firstLoaded, err := cities.List(context.Background())
	if err != nil || len(first) != 1 {
		t.Fatalf("List() = %v, %v; want one city and no error", first, err)
	}
	clock.at = clock.at.Add(59 * time.Minute)
	_, secondLoaded, _ := cities.List(context.Background())

	if store.reads != 1 {
		t.Errorf("the database was read %d times, want 1", store.reads)
	}
	if !secondLoaded.Equal(firstLoaded) {
		t.Errorf("loadedAt changed from %v to %v although nothing was reloaded", firstLoaded, secondLoaded)
	}
}

func TestCitiesAreReadAgainWhenTooOld(t *testing.T) {
	cities, store, clock := newCities()

	_, firstLoaded, _ := cities.List(context.Background())
	clock.at = clock.at.Add(time.Hour)
	_, secondLoaded, _ := cities.List(context.Background())

	if store.reads != 2 {
		t.Errorf("the database was read %d times, want 2", store.reads)
	}
	if !secondLoaded.After(firstLoaded) {
		t.Errorf("loadedAt = %v, want it later than %v", secondLoaded, firstLoaded)
	}
}

func TestInvalidateForcesARead(t *testing.T) {
	cities, store, _ := newCities()

	cities.List(context.Background())
	cities.Invalidate()
	cities.List(context.Background())

	if store.reads != 2 {
		t.Errorf("the database was read %d times, want 2", store.reads)
	}
}

func TestAFailedReadIsNotKept(t *testing.T) {
	cities, store, _ := newCities()
	store.err = errors.New("connection lost")

	if _, _, err := cities.List(context.Background()); !errors.Is(err, store.err) {
		t.Fatalf("error = %v, want it to wrap the store error", err)
	}
	store.err = nil
	list, _, err := cities.List(context.Background())

	if err != nil || len(list) != 1 {
		t.Errorf("List() after recovery = %v, %v; want one city and no error", list, err)
	}
}

func TestManyVisitorsCauseOneRead(t *testing.T) {
	cities, store, _ := newCities()

	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			cities.List(context.Background())
		}()
	}
	wg.Wait()

	if store.reads != 1 {
		t.Errorf("the database was read %d times for 100 visitors, want 1", store.reads)
	}
}
