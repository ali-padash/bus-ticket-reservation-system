package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/ali-padash/bus-ticket-reservation-system/backend/internal/domain"
)

// fakeStore stands in for the database. It records whether the trip search ran.
type fakeStore struct {
	cities   map[uint]domain.City
	trips    []domain.Trip
	tripsErr error
	searched bool
}

func (f *fakeStore) City(_ context.Context, id uint) (domain.City, error) {
	city, ok := f.cities[id]
	if !ok {
		return domain.City{}, domain.ErrCityNotFound
	}
	return city, nil
}

func (f *fakeStore) TripsBetween(context.Context, uint, uint, time.Time) ([]domain.Trip, error) {
	f.searched = true
	return f.trips, f.tripsErr
}

func (f *fakeStore) Seats(_ context.Context, tripID uint) ([]domain.Seat, error) {
	if tripID != 7 {
		return nil, domain.ErrTripNotFound
	}
	return []domain.Seat{{Number: 1, ForSale: true}}, nil
}

func (f *fakeStore) FreeSeatCount(_ context.Context, tripID uint) (int, error) {
	if tripID != 7 {
		return 0, domain.ErrTripNotFound
	}
	return 12, nil
}

func (f *fakeStore) Trip(_ context.Context, tripID uint) (domain.TripDetails, error) {
	if tripID != 7 {
		return domain.TripDetails{}, domain.ErrTripNotFound
	}
	return domain.TripDetails{Trip: domain.Trip{ID: 7}, OriginCity: f.cities[1], DestinationCity: f.cities[21]}, nil
}

func (f *fakeStore) Layout(_ context.Context, tripID uint) ([][]uint, error) {
	if tripID != 7 {
		return nil, domain.ErrTripNotFound
	}
	return [][]uint{{1, 2}, {0, 3}}, nil
}

func (f *fakeStore) RefundRules(_ context.Context, tripID uint) ([]domain.RefundRule, error) {
	if tripID != 7 {
		return nil, domain.ErrTripNotFound
	}
	return []domain.RefundRule{{MinHoursBeforeDeparture: 1, PenaltyPercent: 10}}, nil
}

func newFakeStore() *fakeStore {
	return &fakeStore{
		cities: map[uint]domain.City{
			1:  {ID: 1, Code: "THR", Name: "Tehran"},
			21: {ID: 21, Code: "MHD", Name: "Mashhad"},
		},
		trips: []domain.Trip{{ID: 7, Price: 2_500_000}},
	}
}

var searchDay = time.Date(2026, 10, 12, 0, 0, 0, 0, time.UTC)

func TestSearchReturnsCitiesAndTrips(t *testing.T) {
	store := newFakeStore()

	got, err := NewTrips(store).Search(context.Background(),
		domain.TripSearch{OriginCityID: 1, DestinationCityID: 21, Date: searchDay})

	if err != nil {
		t.Fatalf("Search() error: %v", err)
	}
	if got.Origin.Code != "THR" || got.Destination.Code != "MHD" {
		t.Errorf("cities = %q -> %q, want THR -> MHD", got.Origin.Code, got.Destination.Code)
	}
	if len(got.Trips) != 1 || got.Trips[0].ID != 7 {
		t.Errorf("trips = %+v, want the one trip with ID 7", got.Trips)
	}
	if !got.Date.Equal(searchDay) {
		t.Errorf("date = %v, want %v", got.Date, searchDay)
	}
}

func TestSearchUnknownCity(t *testing.T) {
	cases := map[string]domain.TripSearch{
		"unknown origin":      {OriginCityID: 999, DestinationCityID: 21, Date: searchDay},
		"unknown destination": {OriginCityID: 1, DestinationCityID: 999, Date: searchDay},
	}
	for name, query := range cases {
		t.Run(name, func(t *testing.T) {
			store := newFakeStore()

			_, err := NewTrips(store).Search(context.Background(), query)

			if !errors.Is(err, domain.ErrCityNotFound) {
				t.Errorf("error = %v, want ErrCityNotFound", err)
			}
			if store.searched {
				t.Error("the trip search ran although a city was unknown")
			}
		})
	}
}

func TestSearchKeepsTheStoreError(t *testing.T) {
	store := newFakeStore()
	store.tripsErr = errors.New("connection lost")

	_, err := NewTrips(store).Search(context.Background(),
		domain.TripSearch{OriginCityID: 1, DestinationCityID: 21, Date: searchDay})

	if !errors.Is(err, store.tripsErr) {
		t.Errorf("error = %v, want it to wrap the store error", err)
	}
}

func TestSeatsAndAvailability(t *testing.T) {
	trips := NewTrips(newFakeStore())

	seats, err := trips.Seats(context.Background(), 7)
	if err != nil || len(seats) != 1 {
		t.Errorf("Seats(7) = %v, %v; want one seat and no error", seats, err)
	}
	count, err := trips.Availability(context.Background(), 7)
	if err != nil || count != 12 {
		t.Errorf("Availability(7) = %d, %v; want 12 and no error", count, err)
	}

	if _, err := trips.Seats(context.Background(), 8); !errors.Is(err, domain.ErrTripNotFound) {
		t.Errorf("Seats(8) error = %v, want ErrTripNotFound", err)
	}
	if _, err := trips.Availability(context.Background(), 8); !errors.Is(err, domain.ErrTripNotFound) {
		t.Errorf("Availability(8) error = %v, want ErrTripNotFound", err)
	}
}

func TestTrip(t *testing.T) {
	trips := NewTrips(newFakeStore())

	trip, err := trips.Trip(context.Background(), 7)
	if err != nil || trip.ID != 7 || trip.OriginCity.Code != "THR" || trip.DestinationCity.Code != "MHD" {
		t.Errorf("Trip(7) = %+v, %v; want trip 7 from THR to MHD", trip, err)
	}
	if _, err := trips.Trip(context.Background(), 8); !errors.Is(err, domain.ErrTripNotFound) {
		t.Errorf("Trip(8) error = %v, want ErrTripNotFound", err)
	}
}
