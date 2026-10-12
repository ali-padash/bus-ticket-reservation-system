// Package service holds the rules of the application. It asks a store for data through
// a small interface, so the rules can be tested without a database.
package service

import (
	"context"
	"fmt"
	"time"

	"github.com/ali-padash/bus-ticket-reservation-system/backend/internal/domain"
)

// TripStore is what the trip rules need from the database.
type TripStore interface {
	City(ctx context.Context, id uint) (domain.City, error)
	TripsBetween(ctx context.Context, originCityID uint, destinationCityID uint, date time.Time) ([]domain.Trip, error)
	Seats(ctx context.Context, tripID uint) ([]domain.Seat, error)
	FreeSeatCount(ctx context.Context, tripID uint) (int, error)
	Layout(ctx context.Context, tripID uint) ([][]uint, error)
	RefundRules(ctx context.Context, tripID uint) ([]domain.RefundRule, error)
}

type Trips struct {
	store TripStore
}

func NewTrips(store TripStore) *Trips {
	return &Trips{store: store}
}

// Search returns the trips between two cities on one day, ordered by departure time.
// An unknown city is an error; a day with no trips is an empty list.
func (s *Trips) Search(ctx context.Context, q domain.TripSearch) (domain.SearchResult, error) {
	origin, err := s.store.City(ctx, q.OriginCityID)
	if err != nil {
		return domain.SearchResult{}, fmt.Errorf("origin city %d: %w", q.OriginCityID, err)
	}
	destination, err := s.store.City(ctx, q.DestinationCityID)
	if err != nil {
		return domain.SearchResult{}, fmt.Errorf("destination city %d: %w", q.DestinationCityID, err)
	}
	trips, err := s.store.TripsBetween(ctx, origin.ID, destination.ID, q.Date)
	if err != nil {
		return domain.SearchResult{}, fmt.Errorf("search trips: %w", err)
	}
	return domain.SearchResult{Date: q.Date, Origin: origin, Destination: destination, Trips: trips}, nil
}

// Seats returns every seat of a trip, ordered by seat number.
func (s *Trips) Seats(ctx context.Context, tripID uint) ([]domain.Seat, error) {
	seats, err := s.store.Seats(ctx, tripID)
	if err != nil {
		return nil, fmt.Errorf("seats of trip %d: %w", tripID, err)
	}
	return seats, nil
}

// Availability returns how many seats of a trip can still be bought.
func (s *Trips) Availability(ctx context.Context, tripID uint) (int, error) {
	count, err := s.store.FreeSeatCount(ctx, tripID)
	if err != nil {
		return 0, fmt.Errorf("free seats of trip %d: %w", tripID, err)
	}
	return count, nil
}

// SeatMap returns the floor plan of the bus and the state of every seat on it.
func (s *Trips) SeatMap(ctx context.Context, tripID uint) (domain.SeatMap, error) {
	layout, err := s.store.Layout(ctx, tripID)
	if err != nil {
		return domain.SeatMap{}, fmt.Errorf("layout of trip %d: %w", tripID, err)
	}
	seats, err := s.store.Seats(ctx, tripID)
	if err != nil {
		return domain.SeatMap{}, fmt.Errorf("seats of trip %d: %w", tripID, err)
	}
	available := 0
	for _, seat := range seats {
		if seat.ForSale && seat.Gender == nil {
			available++
		}
	}
	return domain.SeatMap{Layout: layout, Seats: seats, AvailableSeats: available}, nil
}

// RefundRules returns what cancelling a ticket on this trip costs, by how early it is done.
func (s *Trips) RefundRules(ctx context.Context, tripID uint) ([]domain.RefundRule, error) {
	rules, err := s.store.RefundRules(ctx, tripID)
	if err != nil {
		return nil, fmt.Errorf("refund rules of trip %d: %w", tripID, err)
	}
	return rules, nil
}
