package store

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/ali-padash/bus-ticket-reservation-system/backend/internal/domain"

	"github.com/joho/godotenv"
	"gorm.io/gorm"
)

// These tests run the real SQL against a real PostgreSQL. They are skipped when
// DATABASE_URL is not set. Each test works inside a transaction that is rolled back,
// so it leaves the database exactly as it found it.

// openRealStore connects to the database for a test that needs real commits.
// Such a test must remove what it creates.
func openRealStore(t *testing.T) *Store {
	t.Helper()
	_ = godotenv.Load("../../../.env")
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		t.Skip("DATABASE_URL is not set; skipping database tests")
	}
	real, err := Open(url)
	if err != nil {
		t.Skipf("database is not reachable (%v); skipping database tests", err)
	}
	if err := real.Migrate(); err != nil {
		t.Fatalf("Migrate() error: %v", err)
	}
	t.Cleanup(func() { real.Close() })
	return real
}

func openTestStore(t *testing.T) *Store {
	t.Helper()
	real := openRealStore(t)
	tx := real.db.Begin()
	t.Cleanup(func() { tx.Rollback() })
	return &Store{db: tx}
}

func insert(t *testing.T, db *gorm.DB, query string, args ...any) uint {
	t.Helper()
	var id uint
	if err := db.Raw(query+" RETURNING id", args...).Row().Scan(&id); err != nil {
		t.Fatalf("insert failed: %v\n%s", err, query)
	}
	return id
}

// One trip from city 900001 to city 900002 with 4 seats:
// seat 1 is taken by a woman, seat 2 is not for sale, seats 3 and 4 are free.
func insertTrip(t *testing.T, db *gorm.DB) uint {
	t.Helper()
	return insertTripOn(t, db, "2001-02-03")
}

// insertTripOn is insertTrip with a chosen departure day (YYYY-MM-DD).
func insertTripOn(t *testing.T, db *gorm.DB, day string) uint {
	t.Helper()
	const origin, destination = 900001, 900002
	insert(t, db, `INSERT INTO cities (id, code, name, persian_name, province_name, province_persian_name)
		VALUES (?, 'TST-A', 'Testville', 'تست', 'p', 'p')`, origin)
	insert(t, db, `INSERT INTO cities (id, code, name, persian_name, province_name, province_persian_name)
		VALUES (?, 'TST-B', 'Checkton', 'چک', 'p', 'p')`, destination)
	from := insert(t, db, `INSERT INTO terminals (city_id, code, name, persian_name) VALUES (?, 'TST-A-T1', 'west', 'غرب')`, origin)
	to := insert(t, db, `INSERT INTO terminals (city_id, code, name, persian_name) VALUES (?, 'TST-B-T1', 'central', 'مرکزی')`, destination)
	company := insert(t, db, `INSERT INTO companies (code, name, persian_name) VALUES ('TST-C', 'test-lines', 'خط تست')`)
	busType := insert(t, db, `INSERT INTO bus_types (code, seat_count, is_vip, layout)
		VALUES ('TST_4_1', 4, true, '[[1,2],[null,null],[3,4]]')`)
	trip := insert(t, db, `INSERT INTO services
		(company_id, bus_type_id, origin_terminal_id, destination_terminal_id, bus_name, bus_name_en, description_en, price, discount_percentage, departure_date, departure_time)
		VALUES (?, ?, ?, ?, 'Test Bus', 'Test Bus, 4 seats', 'Test Lines', 2500000, 10, ?, '08:30')`, company, busType, from, to, day)
	insert(t, db, `INSERT INTO refund_rules (service_id, min_hours_before_departure, penalty_percent) VALUES (?, 0, 50)`, trip)
	insert(t, db, `INSERT INTO refund_rules (service_id, min_hours_before_departure, penalty_percent) VALUES (?, 1, 10)`, trip)

	var seatIDs [4]uint
	for i := range seatIDs {
		seatIDs[i] = insert(t, db, `INSERT INTO seats (service_id, seat_number, for_sale) VALUES (?, ?, ?)`, trip, i+1, i != 1)
	}
	ticket := insert(t, db, `INSERT INTO tickets (code, service_id, contact_phone, status, price_per_seat, total_price, paid_at)
		VALUES ('TST-000000001', ?, '09120000000', 'paid', 2250000, 2250000, now())`, trip)
	insert(t, db, `INSERT INTO passengers (ticket_id, seat_id, first_name, last_name, gender, national_code, birth_date)
		VALUES (?, ?, 'a', 'b', 'F', '0000000000', '1990-01-01')`, ticket, seatIDs[0])
	return trip
}

var tripDay = time.Date(2001, 2, 3, 0, 0, 0, 0, time.UTC)

// The search only lists trips that have not left yet, so its tests need a trip in
// the future. soonDay is the same day tomorrow() names.
func soonDay(t *testing.T) time.Time {
	t.Helper()
	day, err := time.Parse("2006-01-02", tomorrow())
	if err != nil {
		t.Fatalf("cannot read tomorrow(): %v", err)
	}
	return day
}

func TestTripsBetween(t *testing.T) {
	s := openTestStore(t)
	tripID := insertTripOn(t, s.db, tomorrow())

	trips, err := s.TripsBetween(context.Background(), 900001, 900002, soonDay(t))

	if err != nil {
		t.Fatalf("TripsBetween() error: %v", err)
	}
	if len(trips) != 1 {
		t.Fatalf("got %d trips, want 1", len(trips))
	}
	got := trips[0]
	want := domain.Trip{
		ID:                  tripID,
		Company:             domain.Company{ID: got.Company.ID, Code: "TST-C", Name: "test-lines", PersianName: "خط تست"},
		Origin:              domain.Terminal{Code: "TST-A-T1", Name: "west", PersianName: "غرب"},
		Destination:         domain.Terminal{Code: "TST-B-T1", Name: "central", PersianName: "مرکزی"},
		DestinationCityCode: "TST-B",
		BusName:             "Test Bus",
		BusNameEnglish:      "Test Bus, 4 seats",
		DescriptionEnglish:  "Test Lines",
		BusCode:             "TST_4_1",
		VIP:                 true,
		Price:               2_500_000,
		DiscountPercentage:  10,
		DepartureDate:       tomorrow(),
		DepartureTime:       "08:30",
		AvailableSeats:      2,
	}
	if got != want {
		t.Errorf("trip =\n%+v\nwant\n%+v", got, want)
	}
	if got.Company.ID == 0 {
		t.Error("the company ID was not filled")
	}
}

func TestTripsBetweenFindsNothing(t *testing.T) {
	s := openTestStore(t)
	insertTripOn(t, s.db, tomorrow())
	day := soonDay(t)

	cases := map[string]struct {
		from, to uint
		date     time.Time
	}{
		"the day after":       {900001, 900002, day.AddDate(0, 0, 1)},
		"the opposite way":    {900002, 900001, day},
		"another origin":      {1, 900002, day},
		"another destination": {900001, 1, day},
	}
	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			trips, err := s.TripsBetween(context.Background(), c.from, c.to, c.date)
			if err != nil {
				t.Fatalf("TripsBetween() error: %v", err)
			}
			if len(trips) != 0 {
				t.Errorf("got %d trips, want none", len(trips))
			}
		})
	}
}

func TestSeats(t *testing.T) {
	s := openTestStore(t)
	tripID := insertTrip(t, s.db)

	seats, err := s.Seats(context.Background(), tripID)

	if err != nil {
		t.Fatalf("Seats() error: %v", err)
	}
	if len(seats) != 4 {
		t.Fatalf("got %d seats, want 4", len(seats))
	}
	if seats[0].Number != 1 || seats[0].Gender == nil || *seats[0].Gender != domain.GenderFemale {
		t.Errorf("seat 1 = %+v, want it taken by F", seats[0])
	}
	if seats[1].ForSale || seats[1].Gender != nil {
		t.Errorf("seat 2 = %+v, want it not for sale and empty", seats[1])
	}
	for _, seat := range seats[2:] {
		if !seat.ForSale || seat.Gender != nil {
			t.Errorf("seat %d = %+v, want it free", seat.Number, seat)
		}
	}
}

func TestFreeSeatCount(t *testing.T) {
	s := openTestStore(t)
	tripID := insertTrip(t, s.db)

	count, err := s.FreeSeatCount(context.Background(), tripID)

	if err != nil || count != 2 {
		t.Errorf("FreeSeatCount() = %d, %v; want 2 and no error", count, err)
	}
}

func TestNotFound(t *testing.T) {
	s := openTestStore(t)
	const missing = 987654321

	if _, err := s.City(context.Background(), missing); !errors.Is(err, domain.ErrCityNotFound) {
		t.Errorf("City() error = %v, want ErrCityNotFound", err)
	}
	if _, err := s.Seats(context.Background(), missing); !errors.Is(err, domain.ErrTripNotFound) {
		t.Errorf("Seats() error = %v, want ErrTripNotFound", err)
	}
	if _, err := s.FreeSeatCount(context.Background(), missing); !errors.Is(err, domain.ErrTripNotFound) {
		t.Errorf("FreeSeatCount() error = %v, want ErrTripNotFound", err)
	}
}

func TestCity(t *testing.T) {
	s := openTestStore(t)
	insertTrip(t, s.db)

	city, err := s.City(context.Background(), 900001)

	want := domain.City{ID: 900001, Code: "TST-A", Name: "Testville", PersianName: "تست"}
	if err != nil || city != want {
		t.Errorf("City() = %+v, %v; want %+v", city, err, want)
	}
}

func TestTrip(t *testing.T) {
	s := openTestStore(t)
	tripID := insertTrip(t, s.db)

	trip, err := s.Trip(context.Background(), tripID)

	if err != nil {
		t.Fatalf("Trip() error: %v", err)
	}
	wantOrigin := domain.City{ID: 900001, Code: "TST-A", Name: "Testville", PersianName: "تست"}
	wantDestination := domain.City{ID: 900002, Code: "TST-B", Name: "Checkton", PersianName: "چک"}
	if trip.OriginCity != wantOrigin || trip.DestinationCity != wantDestination {
		t.Errorf("cities = %+v -> %+v, want %+v -> %+v", trip.OriginCity, trip.DestinationCity, wantOrigin, wantDestination)
	}
	if trip.ID != tripID || trip.BusCode != "TST_4_1" || trip.Price != 2_500_000 || trip.AvailableSeats != 2 ||
		trip.DestinationCityCode != "TST-B" || trip.Origin.Code != "TST-A-T1" {
		t.Errorf("trip = %+v, want the test trip with 2 free seats", trip.Trip)
	}

	if _, err := s.Trip(context.Background(), 987654321); !errors.Is(err, domain.ErrTripNotFound) {
		t.Errorf("Trip() of an unknown trip = %v, want ErrTripNotFound", err)
	}
}

// A trip that has left cannot be bought, so the search must not offer it.
func TestTripsBetweenHidesDepartedTrips(t *testing.T) {
	s := openTestStore(t)
	insertTrip(t, s.db) // departs on tripDay, in 2001

	trips, err := s.TripsBetween(context.Background(), 900001, 900002, tripDay)

	if err != nil {
		t.Fatalf("TripsBetween() error: %v", err)
	}
	if len(trips) != 0 {
		t.Errorf("got %d trips, want none: the only trip left long ago", len(trips))
	}
}
