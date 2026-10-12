package store

import (
	"context"
	"errors"
	"sort"
	"time"

	"github.com/ali-padash/bus-ticket-reservation-system/backend/internal/domain"

	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
)

// PostgreSQL's code for "this would break a unique rule".
const uniqueViolation = "23505"

func violatedConstraint(err error) string {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == uniqueViolation {
		return pgErr.ConstraintName
	}
	return ""
}

// CreateHold sets the chosen seats aside under a new ticket, or changes nothing.
//
// Everything happens in one transaction. The seat rows are locked first, so a second
// buyer who wants one of the same seats waits here until this purchase is decided,
// and then sees the seat as taken. The checks that depend on that lock (is the seat
// still free?) live here, next to it, and not in the service.
func (s *Store) CreateHold(ctx context.Context, hold domain.NewHold) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var trip struct {
			Price              int64
			DiscountPercentage float64
			Upcoming           bool
		}
		// Departure is stored as local Iranian date and time, so "now" is taken in that zone.
		result := tx.Raw(`
			SELECT price, discount_percentage,
			       (departure_date + departure_time) > (now() AT TIME ZONE 'Asia/Tehran') AS upcoming
			FROM services
			WHERE id = ?`, hold.TripID).Scan(&trip)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return domain.ErrTripNotFound
		}
		if !trip.Upcoming {
			return domain.ErrTripDeparted
		}

		wanted := make([]uint, len(hold.Passengers))
		for i, p := range hold.Passengers {
			wanted[i] = p.SeatNumber
		}

		// Lock the seats. ORDER BY makes every purchase lock in the same order, so two
		// purchases that share seats can never wait for each other forever.
		var seats []struct {
			ID         uint
			SeatNumber uint
			ForSale    bool
		}
		err := tx.Raw(`
			SELECT id, seat_number, for_sale
			FROM seats
			WHERE service_id = ? AND seat_number IN ?
			ORDER BY seat_number
			FOR UPDATE`, hold.TripID, wanted).Scan(&seats).Error
		if err != nil {
			return err
		}
		seatIDByNumber := make(map[uint]uint, len(seats))
		seatIDs := make([]uint, 0, len(seats))
		unavailable := map[uint]bool{}
		for _, seat := range seats {
			seatIDByNumber[seat.SeatNumber] = seat.ID
			seatIDs = append(seatIDs, seat.ID)
			if !seat.ForSale {
				unavailable[seat.SeatNumber] = true
			}
		}
		for _, number := range wanted {
			if _, onThisBus := seatIDByNumber[number]; !onThisBus {
				unavailable[number] = true
			}
		}

		// A hold that ran out of time on one of these seats gives them back now,
		// without waiting for the clean-up job.
		if err := releaseExpiredHolds(tx, seatIDs); err != nil {
			return err
		}

		var taken []uint
		err = tx.Raw(`
			SELECT seats.seat_number
			FROM passengers
			JOIN seats ON seats.id = passengers.seat_id
			WHERE passengers.seat_id IN ? AND passengers.active`, seatIDs).Scan(&taken).Error
		if err != nil {
			return err
		}
		for _, number := range taken {
			unavailable[number] = true
		}
		if len(unavailable) > 0 {
			return seatsUnavailable(unavailable)
		}

		pricePerSeat := domain.DiscountedPrice(trip.Price, trip.DiscountPercentage)
		var ticketID uint
		err = tx.Raw(`
			INSERT INTO tickets (code, service_id, contact_phone, status, price_per_seat, total_price, expires_at)
			VALUES (?, ?, ?, 'reserved', ?, ?, now() + make_interval(secs => ?))
			RETURNING id`,
			hold.Code, hold.TripID, hold.ContactPhone, pricePerSeat, pricePerSeat*int64(len(hold.Passengers)),
			hold.HoldFor.Seconds()).Row().Scan(&ticketID)
		if violatedConstraint(err) == "tickets_code_key" {
			return domain.ErrDuplicateCode
		}
		if err != nil {
			return err
		}

		for _, p := range hold.Passengers {
			err := tx.Exec(`
				INSERT INTO passengers (ticket_id, seat_id, first_name, last_name, gender, national_code, birth_date)
				VALUES (?, ?, ?, ?, ?, ?, ?)`,
				ticketID, seatIDByNumber[p.SeatNumber], p.FirstName, p.LastName, p.Gender, p.NationalCode,
				p.BirthDate.Format("2006-01-02")).Error
			// The last line of defence: even if the checks above had a bug, the database
			// itself refuses a second active passenger on a seat.
			if violatedConstraint(err) == "passengers_active_seat_idx" {
				return &domain.SeatsUnavailableError{Seats: []uint{p.SeatNumber}}
			}
			if err != nil {
				return err
			}
		}
		return nil
	})
}

func seatsUnavailable(numbers map[uint]bool) error {
	seats := make([]uint, 0, len(numbers))
	for number := range numbers {
		seats = append(seats, number)
	}
	sort.Slice(seats, func(i, j int) bool { return seats[i] < seats[j] })
	return &domain.SeatsUnavailableError{Seats: seats}
}

// releaseExpiredHolds ends every unpaid hold that ran out of time and touches one of
// the given seats. The whole ticket ends, so its other seats come free too.
func releaseExpiredHolds(tx *gorm.DB, seatIDs []uint) error {
	if len(seatIDs) == 0 {
		return nil
	}
	return tx.Exec(`
		WITH ended AS (
			UPDATE tickets
			SET status = 'expired', updated_at = now()
			WHERE status = 'reserved'
			  AND expires_at <= now()
			  AND id IN (SELECT ticket_id FROM passengers WHERE seat_id IN ? AND active)
			RETURNING id
		)
		UPDATE passengers SET active = false WHERE ticket_id IN (SELECT id FROM ended)`, seatIDs).Error
}

// ExpireHolds ends every unpaid hold that ran out of time and returns how many
// tickets that was. The clean-up job calls it.
func (s *Store) ExpireHolds(ctx context.Context) (int, error) {
	var ended int
	err := s.db.WithContext(ctx).Raw(`
		WITH ended AS (
			UPDATE tickets
			SET status = 'expired', updated_at = now()
			WHERE status = 'reserved' AND expires_at <= now()
			RETURNING id
		), freed AS (
			UPDATE passengers SET active = false WHERE ticket_id IN (SELECT id FROM ended)
		)
		SELECT count(*) FROM ended`).Row().Scan(&ended)
	return ended, err
}

// lockedTicket is the state of a ticket while its row is locked.
type lockedTicket struct {
	ID     uint
	Status string
	Live   bool // a hold that still has time left
}

// lockTicket finds a ticket by code and phone and locks its row, so paying,
// cancelling and expiring the same ticket happen one after another.
// A wrong phone number looks exactly like a ticket that does not exist.
func lockTicket(tx *gorm.DB, code string, phone string) (lockedTicket, error) {
	var ticket lockedTicket
	result := tx.Raw(`
		SELECT id, status, (status = 'reserved' AND expires_at > now()) AS live
		FROM tickets
		WHERE code = ? AND contact_phone = ?
		FOR UPDATE`, code, phone).Scan(&ticket)
	if result.Error != nil {
		return lockedTicket{}, result.Error
	}
	if result.RowsAffected == 0 {
		return lockedTicket{}, domain.ErrTicketNotFound
	}
	return ticket, nil
}

func endTicket(tx *gorm.DB, ticketID uint, status string) error {
	if err := tx.Exec(`UPDATE tickets SET status = ?, updated_at = now() WHERE id = ?`, status, ticketID).Error; err != nil {
		return err
	}
	return tx.Exec(`UPDATE passengers SET active = false WHERE ticket_id = ?`, ticketID).Error
}

// PayHold turns a hold into a paid ticket. Paying a paid ticket again changes nothing
// and is not an error, so a repeated click or a retried request is harmless.
func (s *Store) PayHold(ctx context.Context, code string, phone string) error {
	// expired is set inside the transaction and returned after it, because returning an
	// error from the function would undo the "mark as expired" it just did.
	expired := false
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		ticket, err := lockTicket(tx, code, phone)
		if err != nil {
			return err
		}
		switch {
		case ticket.Status == domain.TicketPaid:
			return nil
		case ticket.Live:
			return tx.Exec(`UPDATE tickets SET status = 'paid', paid_at = now(), updated_at = now() WHERE id = ?`, ticket.ID).Error
		case ticket.Status == domain.TicketReserved:
			expired = true
			return endTicket(tx, ticket.ID, domain.TicketExpired)
		case ticket.Status == domain.TicketExpired:
			expired = true
			return nil
		default:
			return domain.ErrTicketClosed
		}
	})
	if err == nil && expired {
		return domain.ErrHoldExpired
	}
	return err
}

// CancelHold gives up a hold and frees its seats. Cancelling twice is not an error.
// A paid ticket cannot be cancelled here: refunds are not built.
func (s *Store) CancelHold(ctx context.Context, code string, phone string) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		ticket, err := lockTicket(tx, code, phone)
		if err != nil {
			return err
		}
		switch ticket.Status {
		case domain.TicketPaid:
			return domain.ErrTicketPaid
		case domain.TicketReserved:
			return endTicket(tx, ticket.ID, domain.TicketCancelled)
		default:
			return nil
		}
	})
}

type ticketRow struct {
	ID                             uint
	Code                           string
	Status                         string
	ContactPhone                   string
	PricePerSeat                   int64
	TotalPrice                     int64
	ReservedAt                     time.Time
	ExpiresAt                      *time.Time
	SecondsLeft                    int
	PaidAt                         *time.Time
	TripID                         uint
	CompanyPersianName             string
	BusName                        string
	OriginCityID                   uint
	OriginCityPersianName          string
	OriginTerminalPersianName      string
	DestinationCityID              uint
	DestinationCityPersianName     string
	DestinationTerminalPersianName string
	DepartureDate                  string
	DepartureTime                  string
}

// Ticket returns one ticket with its trip and passengers, or domain.ErrTicketNotFound.
// The phone number must match: the code alone is not enough to read someone's ticket.
func (s *Store) Ticket(ctx context.Context, code string, phone string) (domain.Ticket, error) {
	var row ticketRow
	// A hold whose time is up is reported as expired even before the clean-up job marks it.
	result := s.db.WithContext(ctx).Raw(`
		SELECT
			tickets.id,
			tickets.code,
			CASE WHEN tickets.status = 'reserved' AND tickets.expires_at <= now() THEN 'expired' ELSE tickets.status END AS status,
			tickets.contact_phone,
			tickets.price_per_seat,
			tickets.total_price,
			tickets.reserved_at,
			tickets.expires_at,
			CASE WHEN tickets.status = 'reserved'
			     THEN greatest(0, ceil(extract(epoch FROM tickets.expires_at - now())))::int
			     ELSE 0 END AS seconds_left,
			tickets.paid_at,
			services.id AS trip_id,
			companies.persian_name AS company_persian_name,
			services.bus_name,
			origin_city.id AS origin_city_id,
			origin_city.persian_name AS origin_city_persian_name,
			origin.persian_name AS origin_terminal_persian_name,
			destination_city.id AS destination_city_id,
			destination_city.persian_name AS destination_city_persian_name,
			destination.persian_name AS destination_terminal_persian_name,
			to_char(services.departure_date, 'YYYY-MM-DD') AS departure_date,
			to_char(services.departure_time, 'HH24:MI') AS departure_time
		FROM tickets
		JOIN services ON services.id = tickets.service_id
		JOIN companies ON companies.id = services.company_id
		JOIN terminals AS origin ON origin.id = services.origin_terminal_id
		JOIN cities AS origin_city ON origin_city.id = origin.city_id
		JOIN terminals AS destination ON destination.id = services.destination_terminal_id
		JOIN cities AS destination_city ON destination_city.id = destination.city_id
		WHERE tickets.code = ? AND tickets.contact_phone = ?`, code, phone).Scan(&row)
	if result.Error != nil {
		return domain.Ticket{}, result.Error
	}
	if result.RowsAffected == 0 {
		return domain.Ticket{}, domain.ErrTicketNotFound
	}

	passengers := []domain.Passenger{}
	err := s.db.WithContext(ctx).Raw(`
		SELECT seats.seat_number, passengers.first_name, passengers.last_name, passengers.national_code,
		       to_char(passengers.birth_date, 'YYYY-MM-DD') AS birth_date, passengers.gender
		FROM passengers
		JOIN seats ON seats.id = passengers.seat_id
		WHERE passengers.ticket_id = ?
		ORDER BY seats.seat_number`, row.ID).Scan(&passengers).Error
	if err != nil {
		return domain.Ticket{}, err
	}

	return domain.Ticket{
		Code:         row.Code,
		Status:       row.Status,
		ContactPhone: row.ContactPhone,
		Trip: domain.TicketTrip{
			ID:                             row.TripID,
			CompanyPersianName:             row.CompanyPersianName,
			BusName:                        row.BusName,
			OriginCityID:                   row.OriginCityID,
			OriginCityPersianName:          row.OriginCityPersianName,
			OriginTerminalPersianName:      row.OriginTerminalPersianName,
			DestinationCityID:              row.DestinationCityID,
			DestinationCityPersianName:     row.DestinationCityPersianName,
			DestinationTerminalPersianName: row.DestinationTerminalPersianName,
			DepartureDate:                  row.DepartureDate,
			DepartureTime:                  row.DepartureTime,
		},
		Passengers:   passengers,
		PricePerSeat: row.PricePerSeat,
		TotalPrice:   row.TotalPrice,
		ReservedAt:   row.ReservedAt,
		ExpiresAt:    row.ExpiresAt,
		SecondsLeft:  row.SecondsLeft,
		PaidAt:       row.PaidAt,
	}, nil
}
