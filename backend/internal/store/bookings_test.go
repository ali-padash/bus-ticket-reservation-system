package store

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"sync"
	"testing"
	"time"

	"github.com/ali-padash/bus-ticket-reservation-system/backend/internal/domain"
)

// The test trip from insertTripOn: 4 seats, seat 1 sold to a woman, seat 2 not for
// sale, seats 3 and 4 free. Price 2,500,000 with a 10% discount = 2,250,000 a seat.

const testPhone = "09350000001"

var ctx = context.Background()

func tomorrow() string {
	return time.Now().AddDate(0, 0, 2).Format("2006-01-02")
}

func passengerIn(seat uint) domain.PassengerInput {
	return domain.PassengerInput{
		SeatNumber:   seat,
		FirstName:    "رضا",
		LastName:     "کریمی",
		NationalCode: fmt.Sprintf("00000000%02d", seat),
		BirthDate:    time.Date(1990, 5, 17, 0, 0, 0, 0, time.UTC),
		Gender:       domain.GenderMale,
	}
}

func holdOn(tripID uint, code string, seats ...uint) domain.NewHold {
	hold := domain.NewHold{Code: code, TripID: tripID, ContactPhone: testPhone, HoldFor: 10 * time.Minute}
	for _, seat := range seats {
		hold.Passengers = append(hold.Passengers, passengerIn(seat))
	}
	return hold
}

func wantUnavailable(t *testing.T, err error, seats ...uint) {
	t.Helper()
	var unavailable *domain.SeatsUnavailableError
	if !errors.As(err, &unavailable) {
		t.Fatalf("error = %v, want SeatsUnavailableError", err)
	}
	if !reflect.DeepEqual(unavailable.Seats, seats) {
		t.Errorf("unavailable seats = %v, want %v", unavailable.Seats, seats)
	}
}

func freeSeats(t *testing.T, s *Store, tripID uint) int {
	t.Helper()
	count, err := s.FreeSeatCount(ctx, tripID)
	if err != nil {
		t.Fatalf("FreeSeatCount() error: %v", err)
	}
	return count
}

// endHoldTime moves a hold's deadline into the past, as if ten minutes had gone by.
func endHoldTime(t *testing.T, s *Store, code string) {
	t.Helper()
	if err := s.db.Exec(`UPDATE tickets SET expires_at = now() - interval '1 second' WHERE code = ?`, code).Error; err != nil {
		t.Fatalf("could not move the deadline: %v", err)
	}
}

func TestCreateHold(t *testing.T) {
	s := openTestStore(t)
	tripID := insertTripOn(t, s.db, tomorrow())

	if err := s.CreateHold(ctx, holdOn(tripID, "TST-HOLD-0001", 4, 3)); err != nil {
		t.Fatalf("CreateHold() error: %v", err)
	}

	ticket, err := s.Ticket(ctx, "TST-HOLD-0001", testPhone)
	if err != nil {
		t.Fatalf("Ticket() error: %v", err)
	}
	if ticket.Status != domain.TicketReserved || ticket.PaidAt != nil || ticket.ExpiresAt == nil {
		t.Errorf("ticket = %+v, want an unpaid hold with a deadline", ticket)
	}
	if ticket.SecondsLeft < 590 || ticket.SecondsLeft > 600 {
		t.Errorf("seconds left = %d, want about 600", ticket.SecondsLeft)
	}
	if ticket.PricePerSeat != 2_250_000 || ticket.TotalPrice != 4_500_000 {
		t.Errorf("price = %d a seat, %d in total; want 2,250,000 and 4,500,000", ticket.PricePerSeat, ticket.TotalPrice)
	}
	wantTrip := domain.TicketTrip{
		ID: tripID, CompanyPersianName: "خط تست", BusName: "Test Bus",
		OriginCityID: 900001, OriginCityPersianName: "تست", OriginTerminalPersianName: "غرب",
		DestinationCityID: 900002, DestinationCityPersianName: "چک", DestinationTerminalPersianName: "مرکزی",
		CompanyName: "test-lines", BusNameEnglish: "Test Bus, 4 seats",
		OriginCityName: "Testville", OriginTerminalName: "west",
		DestinationCityName: "Checkton", DestinationTerminalName: "central",
		DepartureDate: tomorrow(), DepartureTime: "08:30",
	}
	if ticket.Trip != wantTrip {
		t.Errorf("trip =\n%+v\nwant\n%+v", ticket.Trip, wantTrip)
	}
	wantPassengers := []domain.Passenger{
		{SeatNumber: 3, FirstName: "رضا", LastName: "کریمی", NationalCode: "0000000003", BirthDate: "1990-05-17", Gender: "M"},
		{SeatNumber: 4, FirstName: "رضا", LastName: "کریمی", NationalCode: "0000000004", BirthDate: "1990-05-17", Gender: "M"},
	}
	if !reflect.DeepEqual(ticket.Passengers, wantPassengers) {
		t.Errorf("passengers =\n%+v\nwant\n%+v", ticket.Passengers, wantPassengers)
	}
	if free := freeSeats(t, s, tripID); free != 0 {
		t.Errorf("free seats = %d, want 0 after holding the last two", free)
	}
	seats, _ := s.Seats(ctx, tripID)
	if seats[2].Gender == nil || *seats[2].Gender != domain.GenderMale {
		t.Errorf("seat 3 = %+v, want it shown as taken by M", seats[2])
	}
}

func TestCreateHoldRefusesSeatsThatCannotBeHad(t *testing.T) {
	cases := []struct {
		name   string
		seats  []uint
		refuse []uint
	}{
		{"a sold seat", []uint{1}, []uint{1}},
		{"a seat not for sale", []uint{2}, []uint{2}},
		{"a seat that is not on this bus", []uint{99}, []uint{99}},
		{"one free seat and one sold", []uint{3, 1}, []uint{1}},
		{"every kind at once", []uint{99, 3, 2, 1}, []uint{1, 2, 99}},
	}
	for i, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			s := openTestStore(t)
			tripID := insertTripOn(t, s.db, tomorrow())

			err := s.CreateHold(ctx, holdOn(tripID, fmt.Sprintf("TST-HOLD-01%02d", i), c.seats...))

			wantUnavailable(t, err, c.refuse...)
			// All or nothing: the free seat in the request must not have been taken.
			if free := freeSeats(t, s, tripID); free != 2 {
				t.Errorf("free seats = %d, want 2: a refused purchase must change nothing", free)
			}
			if _, err := s.Ticket(ctx, fmt.Sprintf("TST-HOLD-01%02d", i), testPhone); !errors.Is(err, domain.ErrTicketNotFound) {
				t.Errorf("a ticket was left behind by a refused purchase (error: %v)", err)
			}
		})
	}
}

func TestCreateHoldOnTripsThatCannotBeBought(t *testing.T) {
	s := openTestStore(t)
	departed := insertTripOn(t, s.db, "2001-02-03")

	if err := s.CreateHold(ctx, holdOn(departed, "TST-HOLD-0201", 3)); !errors.Is(err, domain.ErrTripDeparted) {
		t.Errorf("error for a bus that has left = %v, want ErrTripDeparted", err)
	}
	if err := s.CreateHold(ctx, holdOn(987654321, "TST-HOLD-0202", 3)); !errors.Is(err, domain.ErrTripNotFound) {
		t.Errorf("error for an unknown trip = %v, want ErrTripNotFound", err)
	}
}

func TestCreateHoldWithACodeThatExists(t *testing.T) {
	s := openTestStore(t)
	tripID := insertTripOn(t, s.db, tomorrow())
	if err := s.CreateHold(ctx, holdOn(tripID, "TST-HOLD-0301", 3)); err != nil {
		t.Fatalf("first CreateHold() error: %v", err)
	}

	err := s.CreateHold(ctx, holdOn(tripID, "TST-HOLD-0301", 4))

	if !errors.Is(err, domain.ErrDuplicateCode) {
		t.Errorf("error = %v, want ErrDuplicateCode", err)
	}
	if free := freeSeats(t, s, tripID); free != 1 {
		t.Errorf("free seats = %d, want 1: the second purchase must not have taken seat 4", free)
	}
}

func TestAnExpiredHoldGivesItsSeatsBack(t *testing.T) {
	s := openTestStore(t)
	tripID := insertTripOn(t, s.db, tomorrow())
	if err := s.CreateHold(ctx, holdOn(tripID, "TST-HOLD-0401", 3, 4)); err != nil {
		t.Fatalf("CreateHold() error: %v", err)
	}
	endHoldTime(t, s, "TST-HOLD-0401")

	// The clean-up job has not run, yet the seats already count as free everywhere.
	if free := freeSeats(t, s, tripID); free != 2 {
		t.Errorf("free seats = %d, want 2 the moment the hold runs out", free)
	}
	if seats, _ := s.Seats(ctx, tripID); seats[2].Gender != nil {
		t.Errorf("seat 3 = %+v, want it shown as free", seats[2])
	}
	if ticket, _ := s.Ticket(ctx, "TST-HOLD-0401", testPhone); ticket.Status != domain.TicketExpired || ticket.SecondsLeft != 0 {
		t.Errorf("ticket status = %q with %d seconds left, want expired with 0", ticket.Status, ticket.SecondsLeft)
	}

	// Someone else can take one of those seats straight away.
	if err := s.CreateHold(ctx, holdOn(tripID, "TST-HOLD-0402", 3)); err != nil {
		t.Fatalf("CreateHold() on a seat whose hold ran out: %v", err)
	}
	// The old ticket ended as a whole, so its other seat is free too.
	if free := freeSeats(t, s, tripID); free != 1 {
		t.Errorf("free seats = %d, want 1 (seat 4)", free)
	}
}

func TestPayHold(t *testing.T) {
	s := openTestStore(t)
	tripID := insertTripOn(t, s.db, tomorrow())
	if err := s.CreateHold(ctx, holdOn(tripID, "TST-HOLD-0501", 3)); err != nil {
		t.Fatalf("CreateHold() error: %v", err)
	}

	if err := s.PayHold(ctx, "TST-HOLD-0501", "09359999999"); !errors.Is(err, domain.ErrTicketNotFound) {
		t.Errorf("paying with the wrong phone = %v, want ErrTicketNotFound", err)
	}
	if err := s.PayHold(ctx, "TST-HOLD-0501", testPhone); err != nil {
		t.Fatalf("PayHold() error: %v", err)
	}
	ticket, _ := s.Ticket(ctx, "TST-HOLD-0501", testPhone)
	if ticket.Status != domain.TicketPaid || ticket.PaidAt == nil || ticket.SecondsLeft != 0 {
		t.Errorf("ticket = %+v, want it paid", ticket)
	}
	// A second click on "pay" is harmless.
	if err := s.PayHold(ctx, "TST-HOLD-0501", testPhone); err != nil {
		t.Errorf("paying twice = %v, want no error", err)
	}
	if err := s.CancelHold(ctx, "TST-HOLD-0501", testPhone); !errors.Is(err, domain.ErrTicketPaid) {
		t.Errorf("cancelling a paid ticket = %v, want ErrTicketPaid", err)
	}
	// A paid ticket keeps its seat for good, long after the deadline.
	endHoldTime(t, s, "TST-HOLD-0501")
	if free := freeSeats(t, s, tripID); free != 1 {
		t.Errorf("free seats = %d, want 1: a paid seat must stay taken", free)
	}
}

func TestPayingTooLate(t *testing.T) {
	s := openTestStore(t)
	tripID := insertTripOn(t, s.db, tomorrow())
	if err := s.CreateHold(ctx, holdOn(tripID, "TST-HOLD-0601", 3)); err != nil {
		t.Fatalf("CreateHold() error: %v", err)
	}
	endHoldTime(t, s, "TST-HOLD-0601")

	if err := s.PayHold(ctx, "TST-HOLD-0601", testPhone); !errors.Is(err, domain.ErrHoldExpired) {
		t.Fatalf("error = %v, want ErrHoldExpired", err)
	}
	var status string
	s.db.Raw(`SELECT status FROM tickets WHERE code = 'TST-HOLD-0601'`).Row().Scan(&status)
	if status != domain.TicketExpired {
		t.Errorf("stored status = %q, want expired: the late payment must write it down", status)
	}
	if err := s.PayHold(ctx, "TST-HOLD-0601", testPhone); !errors.Is(err, domain.ErrHoldExpired) {
		t.Errorf("paying again = %v, want ErrHoldExpired again", err)
	}
}

func TestCancelHold(t *testing.T) {
	s := openTestStore(t)
	tripID := insertTripOn(t, s.db, tomorrow())
	if err := s.CreateHold(ctx, holdOn(tripID, "TST-HOLD-0701", 3, 4)); err != nil {
		t.Fatalf("CreateHold() error: %v", err)
	}

	if err := s.CancelHold(ctx, "TST-HOLD-0701", "09359999999"); !errors.Is(err, domain.ErrTicketNotFound) {
		t.Errorf("cancelling with the wrong phone = %v, want ErrTicketNotFound", err)
	}
	if err := s.CancelHold(ctx, "TST-HOLD-0701", testPhone); err != nil {
		t.Fatalf("CancelHold() error: %v", err)
	}
	if free := freeSeats(t, s, tripID); free != 2 {
		t.Errorf("free seats = %d, want 2 after cancelling", free)
	}
	ticket, _ := s.Ticket(ctx, "TST-HOLD-0701", testPhone)
	if ticket.Status != domain.TicketCancelled || len(ticket.Passengers) != 2 {
		t.Errorf("ticket = %+v, want it cancelled and still listing its 2 passengers", ticket)
	}
	if err := s.CancelHold(ctx, "TST-HOLD-0701", testPhone); err != nil {
		t.Errorf("cancelling twice = %v, want no error", err)
	}
	if err := s.PayHold(ctx, "TST-HOLD-0701", testPhone); !errors.Is(err, domain.ErrTicketClosed) {
		t.Errorf("paying a cancelled ticket = %v, want ErrTicketClosed", err)
	}
	// The same seats can be bought again.
	if err := s.CreateHold(ctx, holdOn(tripID, "TST-HOLD-0702", 3, 4)); err != nil {
		t.Errorf("CreateHold() on cancelled seats: %v", err)
	}
}

func TestExpireHolds(t *testing.T) {
	s := openTestStore(t)
	tripID := insertTripOn(t, s.db, tomorrow())
	// Clear out any real holds that happen to have run out, so the count below is ours.
	if _, err := s.ExpireHolds(ctx); err != nil {
		t.Fatalf("ExpireHolds() error: %v", err)
	}
	s.CreateHold(ctx, holdOn(tripID, "TST-HOLD-0801", 3))
	s.CreateHold(ctx, holdOn(tripID, "TST-HOLD-0802", 4))
	endHoldTime(t, s, "TST-HOLD-0801")

	ended, err := s.ExpireHolds(ctx)

	if err != nil || ended != 1 {
		t.Fatalf("ExpireHolds() = %d, %v; want 1 ticket and no error", ended, err)
	}
	var status string
	var active bool
	s.db.Raw(`SELECT tickets.status, passengers.active FROM tickets JOIN passengers ON passengers.ticket_id = tickets.id
		WHERE tickets.code = 'TST-HOLD-0801'`).Row().Scan(&status, &active)
	if status != domain.TicketExpired || active {
		t.Errorf("the ended hold has status %q and active=%v, want expired and false", status, active)
	}
	if ticket, _ := s.Ticket(ctx, "TST-HOLD-0802", testPhone); ticket.Status != domain.TicketReserved {
		t.Errorf("the other hold has status %q, want it untouched", ticket.Status)
	}
}

func TestLayoutAndRefundRules(t *testing.T) {
	s := openTestStore(t)
	tripID := insertTrip(t, s.db)

	layout, err := s.Layout(ctx, tripID)
	if want := [][]uint{{1, 2}, {0, 0}, {3, 4}}; err != nil || !reflect.DeepEqual(layout, want) {
		t.Errorf("Layout() = %v, %v; want %v", layout, err, want)
	}
	rules, err := s.RefundRules(ctx, tripID)
	wantRules := []domain.RefundRule{{MinHoursBeforeDeparture: 1, PenaltyPercent: 10}, {MinHoursBeforeDeparture: 0, PenaltyPercent: 50}}
	if err != nil || !reflect.DeepEqual(rules, wantRules) {
		t.Errorf("RefundRules() = %v, %v; want %v", rules, err, wantRules)
	}

	if _, err := s.Layout(ctx, 987654321); !errors.Is(err, domain.ErrTripNotFound) {
		t.Errorf("Layout() of an unknown trip = %v, want ErrTripNotFound", err)
	}
	if _, err := s.RefundRules(ctx, 987654321); !errors.Is(err, domain.ErrTripNotFound) {
		t.Errorf("RefundRules() of an unknown trip = %v, want ErrTripNotFound", err)
	}
}

// The two tests below need buyers on separate connections, so they cannot run inside
// one rolled-back transaction like the others. They commit their rows and delete them
// afterwards.

func removeTestRows(s *Store) {
	// Tickets first: passengers go with them. Seats and refund rules go with the trip.
	s.db.Exec(`DELETE FROM tickets WHERE service_id IN (
		SELECT services.id FROM services JOIN companies ON companies.id = services.company_id WHERE companies.code = 'TST-C')`)
	s.db.Exec(`DELETE FROM services WHERE company_id IN (SELECT id FROM companies WHERE code = 'TST-C')`)
	s.db.Exec(`DELETE FROM bus_types WHERE code = 'TST_4_1'`)
	s.db.Exec(`DELETE FROM companies WHERE code = 'TST-C'`)
	s.db.Exec(`DELETE FROM terminals WHERE city_id IN (900001, 900002)`)
	s.db.Exec(`DELETE FROM cities WHERE id IN (900001, 900002)`)
}

func committedTrip(t *testing.T) (*Store, uint) {
	t.Helper()
	s := openRealStore(t)
	removeTestRows(s) // in case an earlier run was killed halfway
	t.Cleanup(func() { removeTestRows(s) })
	return s, insertTripOn(t, s.db, tomorrow())
}

func TestTwentyBuyersOneSeat(t *testing.T) {
	s, tripID := committedTrip(t)
	const buyers = 20

	errs := make([]error, buyers)
	start := make(chan struct{})
	var wg sync.WaitGroup
	for i := 0; i < buyers; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			<-start // everyone waits here, then all go at once
			errs[i] = s.CreateHold(ctx, holdOn(tripID, fmt.Sprintf("TST-RACE-%04d", i), 3))
		}(i)
	}
	close(start)
	wg.Wait()

	won := 0
	for i, err := range errs {
		var unavailable *domain.SeatsUnavailableError
		switch {
		case err == nil:
			won++
		case errors.As(err, &unavailable):
			if !reflect.DeepEqual(unavailable.Seats, []uint{3}) {
				t.Errorf("buyer %d was refused seats %v, want [3]", i, unavailable.Seats)
			}
		default:
			t.Errorf("buyer %d got an unexpected error: %v", i, err)
		}
	}
	if won != 1 {
		t.Errorf("%d buyers got seat 3, want exactly 1", won)
	}

	var holders, tickets int
	s.db.Raw(`SELECT count(*) FROM passengers JOIN seats ON seats.id = passengers.seat_id
		WHERE seats.service_id = ? AND seats.seat_number = 3 AND passengers.active`, tripID).Row().Scan(&holders)
	s.db.Raw(`SELECT count(*) FROM tickets WHERE service_id = ? AND code LIKE 'TST-RACE-%'`, tripID).Row().Scan(&tickets)
	if holders != 1 || tickets != 1 {
		t.Errorf("the database holds %d passengers on seat 3 and %d tickets, want 1 and 1", holders, tickets)
	}
}

// Buyers who want overlapping pairs of seats, listed in different orders, are the
// classic way to make two transactions wait for each other forever. Locking the
// seats in seat-number order prevents it.
func TestOverlappingPurchasesDoNotDeadlock(t *testing.T) {
	s, tripID := committedTrip(t)
	wanted := [][]uint{{3, 4}, {4, 3}, {3}, {4}}
	const buyers = 24

	errs := make([]error, buyers)
	start := make(chan struct{})
	var wg sync.WaitGroup
	for i := 0; i < buyers; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			<-start
			errs[i] = s.CreateHold(ctx, holdOn(tripID, fmt.Sprintf("TST-RACE-%04d", i), wanted[i%len(wanted)]...))
		}(i)
	}
	close(start)
	wg.Wait()

	for i, err := range errs {
		var unavailable *domain.SeatsUnavailableError
		if err != nil && !errors.As(err, &unavailable) {
			t.Errorf("buyer %d got an unexpected error (a deadlock would show here): %v", i, err)
		}
	}
	var holders, seatsHeld int
	s.db.Raw(`SELECT count(*), count(DISTINCT passengers.seat_id) FROM passengers
		JOIN tickets ON tickets.id = passengers.ticket_id
		WHERE tickets.service_id = ? AND tickets.code LIKE 'TST-RACE-%' AND passengers.active`, tripID).Row().Scan(&holders, &seatsHeld)
	if holders != 2 || seatsHeld != 2 {
		t.Errorf("%d passengers hold %d seats, want 2 and 2: both free seats sold, each once", holders, seatsHeld)
	}
	if free := freeSeats(t, s, tripID); free != 0 {
		t.Errorf("free seats = %d, want 0", free)
	}
}
