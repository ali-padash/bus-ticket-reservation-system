package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/ali-padash/bus-ticket-reservation-system/backend/internal/domain"
)

// A passenger holds a seat while the row is active and the ticket is not a hold that
// ran out of time. The second half matters between two runs of the clean-up job: an
// unpaid hold stops counting the moment it expires, not a minute later. (updated 2026-10-12)
const holdsSeat = `passengers.active AND (tickets.status <> 'reserved' OR tickets.expires_at > now())`

// A seat is free when it is for sale and no passenger holds it.
const freeSeatCount = `(
	SELECT count(*)
	FROM seats
	WHERE seats.service_id = services.id
	  AND seats.for_sale
	  AND NOT EXISTS (
		SELECT 1
		FROM passengers
		JOIN tickets ON tickets.id = passengers.ticket_id
		WHERE passengers.seat_id = seats.id AND ` + holdsSeat + `
	  )
)`

// City returns one city, or domain.ErrCityNotFound.
func (s *Store) City(ctx context.Context, id uint) (domain.City, error) {
	var rows []domain.City
	err := s.db.WithContext(ctx).
		Raw(`SELECT id, code, name, persian_name FROM cities WHERE id = ?`, id).
		Scan(&rows).Error
	if err != nil {
		return domain.City{}, err
	}
	if len(rows) == 0 {
		return domain.City{}, domain.ErrCityNotFound
	}
	return rows[0], nil
}

// tripRow is one line of the search query. The field names match the column aliases.
type tripRow struct {
	ID                             uint
	IsVip                          bool
	BusCode                        string
	BusName                        string
	BusNameEn                      string
	DescriptionEn                  string
	Price                          int64
	DepartureTime                  string
	DepartureDate                  string
	Description                    string
	BriefDescription               *string
	DiscountPercentage             float64
	AvailableSeatCount             int
	CompanyID                      uint
	CompanyCode                    string
	CompanyName                    string
	CompanyPersianName             string
	CompanyLogo                    string
	CompanyURL                     string
	OriginTerminalName             string
	OriginTerminalPersianName      string
	OriginTerminalCode             string
	DestinationTerminalName        string
	DestinationTerminalPersianName string
	DestinationTerminalCode        string
	OriginCityID                   uint
	OriginCityCode                 string
	OriginCityName                 string
	OriginCityPersianName          string
	DestinationCityID              uint
	DestinationCityCode            string
	DestinationCityName            string
	DestinationCityPersianName     string
}

func (r tripRow) toDomain() domain.Trip {
	return domain.Trip{
		ID: r.ID,
		Company: domain.Company{
			ID:          r.CompanyID,
			Code:        r.CompanyCode,
			Name:        r.CompanyName,
			PersianName: r.CompanyPersianName,
			Logo:        r.CompanyLogo,
			URL:         r.CompanyURL,
		},
		Origin: domain.Terminal{
			Code:        r.OriginTerminalCode,
			Name:        r.OriginTerminalName,
			PersianName: r.OriginTerminalPersianName,
		},
		Destination: domain.Terminal{
			Code:        r.DestinationTerminalCode,
			Name:        r.DestinationTerminalName,
			PersianName: r.DestinationTerminalPersianName,
		},
		DestinationCityCode: r.DestinationCityCode,
		BusName:             r.BusName,
		BusNameEnglish:      r.BusNameEn,
		DescriptionEnglish:  r.DescriptionEn,
		BusCode:             r.BusCode,
		VIP:                 r.IsVip,
		Price:               r.Price,
		DiscountPercentage:  r.DiscountPercentage,
		DepartureDate:       r.DepartureDate,
		DepartureTime:       r.DepartureTime,
		Description:         r.Description,
		BriefDescription:    r.BriefDescription,
		AvailableSeats:      r.AvailableSeatCount,
	}
}

// tripSelect is the part every trip query shares: one row per trip with its company,
// both terminals, both cities and the free seat count. (updated 2026-10-12)
const tripSelect = `
	SELECT
		services.id,
		bus_types.is_vip,
		bus_types.code AS bus_code,
		services.bus_name,
		services.bus_name_en,
		services.description_en,
		services.price,
		to_char(services.departure_time, 'HH24:MI') AS departure_time,
		to_char(services.departure_date, 'YYYY-MM-DD') AS departure_date,
		services.description,
		services.brief_description,
		services.discount_percentage,
		` + freeSeatCount + ` AS available_seat_count,
		companies.id AS company_id,
		companies.code AS company_code,
		companies.name AS company_name,
		companies.persian_name AS company_persian_name,
		companies.logo AS company_logo,
		companies.url AS company_url,
		origin.name AS origin_terminal_name,
		origin.persian_name AS origin_terminal_persian_name,
		origin.code AS origin_terminal_code,
		destination.name AS destination_terminal_name,
		destination.persian_name AS destination_terminal_persian_name,
		destination.code AS destination_terminal_code,
		origin_city.id AS origin_city_id,
		origin_city.code AS origin_city_code,
		origin_city.name AS origin_city_name,
		origin_city.persian_name AS origin_city_persian_name,
		destination_city.id AS destination_city_id,
		destination_city.code AS destination_city_code,
		destination_city.name AS destination_city_name,
		destination_city.persian_name AS destination_city_persian_name
	FROM services
	JOIN bus_types ON bus_types.id = services.bus_type_id
	JOIN companies ON companies.id = services.company_id
	JOIN terminals AS origin ON origin.id = services.origin_terminal_id
	JOIN terminals AS destination ON destination.id = services.destination_terminal_id
	JOIN cities AS origin_city ON origin_city.id = origin.city_id
	JOIN cities AS destination_city ON destination_city.id = destination.city_id`

// TripsBetween returns the trips on one day whose terminals are in the two cities,
// ordered by departure time.
func (s *Store) TripsBetween(ctx context.Context, originCityID uint, destinationCityID uint, date time.Time) ([]domain.Trip, error) {
	var rows []tripRow
	err := s.db.WithContext(ctx).Raw(tripSelect+`
		WHERE services.departure_date = ?
		  AND origin.city_id = ?
		  AND destination.city_id = ?
		ORDER BY services.departure_time, services.id`,
		// The day is sent as text so the server's time zone cannot shift it.
		date.Format("2006-01-02"), originCityID, destinationCityID).Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	trips := make([]domain.Trip, len(rows))
	for i, row := range rows {
		trips[i] = row.toDomain()
	}
	return trips, nil
}

// Trip returns one trip with its two cities, or domain.ErrTripNotFound.
func (s *Store) Trip(ctx context.Context, tripID uint) (domain.TripDetails, error) {
	var rows []tripRow
	err := s.db.WithContext(ctx).Raw(tripSelect+` WHERE services.id = ?`, tripID).Scan(&rows).Error
	if err != nil {
		return domain.TripDetails{}, err
	}
	if len(rows) == 0 {
		return domain.TripDetails{}, domain.ErrTripNotFound
	}
	row := rows[0]
	return domain.TripDetails{
		Trip: row.toDomain(),
		OriginCity: domain.City{
			ID: row.OriginCityID, Code: row.OriginCityCode, Name: row.OriginCityName, PersianName: row.OriginCityPersianName,
		},
		DestinationCity: domain.City{
			ID: row.DestinationCityID, Code: row.DestinationCityCode, Name: row.DestinationCityName, PersianName: row.DestinationCityPersianName,
		},
	}, nil
}

type seatRow struct {
	SeatNumber uint
	ForSale    bool
	Gender     *string
}

// Seats returns every seat of a trip, ordered by seat number, or domain.ErrTripNotFound.
func (s *Store) Seats(ctx context.Context, tripID uint) ([]domain.Seat, error) {
	var rows []seatRow
	err := s.db.WithContext(ctx).Raw(`
		SELECT seats.seat_number, seats.for_sale, holder.gender
		FROM seats
		LEFT JOIN LATERAL (
			SELECT passengers.gender
			FROM passengers
			JOIN tickets ON tickets.id = passengers.ticket_id
			WHERE passengers.seat_id = seats.id AND `+holdsSeat+`
			LIMIT 1
		) AS holder ON true
		WHERE seats.service_id = ?
		ORDER BY seats.seat_number`, tripID).Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	// Every trip has seat rows, so no rows means there is no such trip.
	if len(rows) == 0 {
		return nil, domain.ErrTripNotFound
	}
	seats := make([]domain.Seat, len(rows))
	for i, row := range rows {
		seats[i] = domain.Seat{Number: row.SeatNumber, ForSale: row.ForSale, Gender: row.Gender}
	}
	return seats, nil
}

// FreeSeatCount returns how many seats of a trip can still be bought, or domain.ErrTripNotFound.
func (s *Store) FreeSeatCount(ctx context.Context, tripID uint) (int, error) {
	var count int
	err := s.db.WithContext(ctx).
		Raw(`SELECT `+freeSeatCount+` FROM services WHERE services.id = ?`, tripID).
		Row().Scan(&count)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, domain.ErrTripNotFound
	}
	return count, err
}

// Layout returns the floor plan of the bus that runs a trip, or domain.ErrTripNotFound.
// A zero in the plan is empty floor.
func (s *Store) Layout(ctx context.Context, tripID uint) ([][]uint, error) {
	var raw string
	err := s.db.WithContext(ctx).Raw(`
		SELECT bus_types.layout::text
		FROM services
		JOIN bus_types ON bus_types.id = services.bus_type_id
		WHERE services.id = ?`, tripID).Row().Scan(&raw)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrTripNotFound
	}
	if err != nil {
		return nil, err
	}
	// The column holds seat numbers and nulls; a null becomes 0 here.
	var cells [][]*uint
	if err := json.Unmarshal([]byte(raw), &cells); err != nil {
		return nil, fmt.Errorf("read layout of trip %d: %w", tripID, err)
	}
	layout := make([][]uint, len(cells))
	for r, row := range cells {
		layout[r] = make([]uint, len(row))
		for c, cell := range row {
			if cell != nil {
				layout[r][c] = *cell
			}
		}
	}
	return layout, nil
}

// RefundRules returns the cancellation rules of a trip, strictest notice first,
// or domain.ErrTripNotFound.
func (s *Store) RefundRules(ctx context.Context, tripID uint) ([]domain.RefundRule, error) {
	var exists bool
	err := s.db.WithContext(ctx).Raw(`SELECT EXISTS (SELECT 1 FROM services WHERE id = ?)`, tripID).Row().Scan(&exists)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, domain.ErrTripNotFound
	}
	rules := []domain.RefundRule{}
	err = s.db.WithContext(ctx).Raw(`
		SELECT min_hours_before_departure, penalty_percent
		FROM refund_rules
		WHERE service_id = ?
		ORDER BY min_hours_before_departure DESC`, tripID).Scan(&rules).Error
	return rules, err
}
