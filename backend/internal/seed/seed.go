// Package seed fills an empty database with demo data.
package seed

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"math/rand"
	"os"
	"time"

	"github.com/ali-padash/bus-ticket-reservation-system/backend/internal/domain"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const (
	seedDays      = 14
	seedUserCount = 20
	batchSize     = 1000
)

type cityJSON struct {
	ID                  uint
	Code                string
	Name                string
	PersianName         string
	ProvinceName        string
	ProvincePersianName string
	SearchExpressions   []string
	IsCapital           bool
	Order               int
}

// Cities that get terminals and trips, by their id in cities.json.
var seedRoutes = []struct {
	cityID    uint
	terminals []Terminal
}{
	{1, []Terminal{{Name: "west", PersianName: "غرب"}, {Name: "south", PersianName: "جنوب"}, {Name: "east", PersianName: "شرق"}}}, // Tehran
	{21, []Terminal{{Name: "central", PersianName: "مرکزی"}, {Name: "north", PersianName: "شمال"}}},                               // Mashhad
	{4, []Terminal{{Name: "central", PersianName: "مرکزی"}, {Name: "north", PersianName: "شمال"}}},                                // Esfahan
	{12, []Terminal{{Name: "central", PersianName: "مرکزی"}}},                                                                     // Shiraz
	{42, []Terminal{{Name: "central", PersianName: "مرکزی"}}},                                                                     // Tabriz
	{132, []Terminal{{Name: "central", PersianName: "مرکزی"}}},                                                                    // Rasht
	{22, []Terminal{{Name: "central", PersianName: "مرکزی"}}},                                                                     // Ahvaz
	{25, []Terminal{{Name: "central", PersianName: "مرکزی"}}},                                                                     // Yazd
}

// Run wipes every table and fills it with demo data.
// Cities come from the JSON file; everything else is made up.
func Run(db *gorm.DB, citiesPath string, log *slog.Logger) error {
	raw, err := os.ReadFile(citiesPath)
	if err != nil {
		return fmt.Errorf("read cities file: %w", err)
	}
	var source []cityJSON
	if err := json.Unmarshal(raw, &source); err != nil {
		return fmt.Errorf("parse cities file: %w", err)
	}

	return db.Transaction(func(tx *gorm.DB) error {
		err := tx.Exec(`TRUNCATE passengers, tickets, users, refund_rules, seats, midway_cities, services,
			bus_types, companies, terminals, search_expressions, cities RESTART IDENTITY CASCADE`).Error
		if err != nil {
			return err
		}

		cities, err := seedCities(tx, source)
		if err != nil {
			return err
		}
		busTypes, companies, terminalsByCity, err := seedCatalog(tx, cities)
		if err != nil {
			return err
		}
		services, err := seedServices(tx, busTypes, companies, terminalsByCity)
		if err != nil {
			return err
		}
		users, err := seedUsers(tx)
		if err != nil {
			return err
		}
		tickets, passengers, err := seedBookings(tx, services, users)
		if err != nil {
			return err
		}

		log.Info("seeded", "cities", len(cities), "companies", len(companies), "services", len(services),
			"users", len(users), "tickets", tickets, "passengers", passengers)
		return nil
	})
}

func seedCities(tx *gorm.DB, source []cityJSON) (map[uint]City, error) {
	cities := make([]City, 0, len(source))
	expressions := []SearchExpression{}
	byID := make(map[uint]City, len(source))
	for _, c := range source {
		city := City{
			ID:                  c.ID,
			Code:                c.Code,
			Name:                c.Name,
			PersianName:         c.PersianName,
			ProvinceName:        c.ProvinceName,
			ProvincePersianName: c.ProvincePersianName,
			IsCapital:           c.IsCapital,
			SortOrder:           c.Order,
		}
		cities = append(cities, city)
		byID[c.ID] = city
		for _, e := range c.SearchExpressions {
			expressions = append(expressions, SearchExpression{CityID: c.ID, Expression: e})
		}
	}
	if err := tx.CreateInBatches(cities, batchSize).Error; err != nil {
		return nil, err
	}
	if err := tx.CreateInBatches(expressions, batchSize).Error; err != nil {
		return nil, err
	}
	return byID, nil
}

func seedCatalog(tx *gorm.DB, cities map[uint]City) ([]BusType, []Company, map[uint][]Terminal, error) {
	// The codes must match the seat layouts the website knows (devs/src/util/BusModels.ts).
	busTypes := []BusType{
		{Code: "VIP_25_1", SeatCount: 25, IsVIP: true},
		{Code: "VIP_26_1", SeatCount: 26, IsVIP: true},
		{Code: "VIP_29_1", SeatCount: 29, IsVIP: true},
		{Code: "VIP_32_1", SeatCount: 32, IsVIP: true},
	}
	for i := range busTypes {
		busTypes[i].Layout = layoutJSON(busLayouts[busTypes[i].Code])
	}
	if err := tx.Create(&busTypes).Error; err != nil {
		return nil, nil, nil, err
	}

	companies := []Company{
		{Code: "C01", Name: "hamrah-safar", PersianName: "همراه سفر", IsActive: true},
		{Code: "C02", Name: "negin-jadeh", PersianName: "نگین جاده", IsActive: true},
		{Code: "C03", Name: "aseman-abi", PersianName: "آسمان آبی", IsActive: true},
		{Code: "C04", Name: "sepid-rah", PersianName: "سپید راه", IsActive: true},
		{Code: "C05", Name: "masir-sabz", PersianName: "مسیر سبز", IsActive: true},
		{Code: "C06", Name: "rahian-shargh", PersianName: "راهیان شرق", IsActive: true},
	}
	if err := tx.Create(&companies).Error; err != nil {
		return nil, nil, nil, err
	}

	terminals := []Terminal{}
	for _, route := range seedRoutes {
		city, ok := cities[route.cityID]
		if !ok {
			return nil, nil, nil, fmt.Errorf("city %d is missing from the cities file", route.cityID)
		}
		for i, t := range route.terminals {
			t.CityID = city.ID
			t.Code = fmt.Sprintf("%s-T%d", city.Code, i+1)
			terminals = append(terminals, t)
		}
	}
	if err := tx.Create(&terminals).Error; err != nil {
		return nil, nil, nil, err
	}
	byCity := map[uint][]Terminal{}
	for _, t := range terminals {
		byCity[t.CityID] = append(byCity[t.CityID], t)
	}
	return busTypes, companies, byCity, nil
}

func seedServices(tx *gorm.DB, busTypes []BusType, companies []Company, terminals map[uint][]Terminal) ([]Service, error) {
	brands := []string{"Scania", "Volvo", "MAN"}
	today := time.Now().Truncate(24 * time.Hour)
	services := []Service{}

	for _, from := range seedRoutes {
		for _, to := range seedRoutes {
			if from.cityID == to.cityID {
				continue
			}
			basePrice := 2_000_000 + rand.Intn(500)*10_000
			for day := 0; day < seedDays; day++ {
				for n := 2 + rand.Intn(4); n > 0; n-- {
					busType := busTypes[rand.Intn(len(busTypes))]
					company := companies[rand.Intn(len(companies))]
					origin := terminals[from.cityID][rand.Intn(len(terminals[from.cityID]))]
					destination := terminals[to.cityID][rand.Intn(len(terminals[to.cityID]))]
					discount := 0.0
					if rand.Intn(5) == 0 {
						discount = float64(5 * (1 + rand.Intn(4)))
					}
					services = append(services, Service{
						CompanyID:             company.ID,
						BusTypeID:             busType.ID,
						OriginTerminalID:      origin.ID,
						DestinationTerminalID: destination.ID,
						BusName:               fmt.Sprintf("%s VIP %d نفره", brands[rand.Intn(len(brands))], busType.SeatCount),
						Price:                 uint(basePrice + rand.Intn(50)*10_000),
						DiscountPercentage:    discount,
						DepartureDate:         today.AddDate(0, 0, day),
						DepartureTime:         fmt.Sprintf("%02d:%02d", 5+rand.Intn(19), 30*rand.Intn(2)),
						Description:           company.PersianName,
					})
				}
			}
		}
	}
	if err := tx.CreateInBatches(services, batchSize).Error; err != nil {
		return nil, err
	}

	// One row per seat of every trip, and the same two refund rules for every trip.
	err := tx.Exec(`
		INSERT INTO seats (service_id, seat_number)
		SELECT services.id, number
		FROM services
		JOIN bus_types ON bus_types.id = services.bus_type_id
		CROSS JOIN LATERAL generate_series(1, bus_types.seat_count) AS number`).Error
	if err != nil {
		return nil, err
	}
	err = tx.Exec(`
		INSERT INTO refund_rules (service_id, min_hours_before_departure, penalty_percent)
		SELECT id, 1, 10 FROM services
		UNION ALL
		SELECT id, 0, 50 FROM services`).Error
	if err != nil {
		return nil, err
	}
	return services, nil
}

func seedUsers(tx *gorm.DB) ([]User, error) {
	// Demo accounts only. Buying needs no account, so most tickets below belong to nobody.
	hash, err := bcrypt.GenerateFromPassword([]byte("demo-password"), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	users := make([]User, seedUserCount)
	for i := range users {
		firstName, gender := randomFirstName()
		users[i] = User{
			Username:     fmt.Sprintf("demo%02d", i+1),
			FirstName:    firstName,
			LastName:     lastNames[rand.Intn(len(lastNames))],
			PasswordHash: string(hash),
			PhoneNumber:  fmt.Sprintf("0912%07d", rand.Intn(10_000_000)),
			Email:        fmt.Sprintf("demo%02d@example.com", i+1),
			NationalCode: fmt.Sprintf("%010d", 1_000_000+i),
			BirthDate:    randomBirthDate(),
			Gender:       gender,
			Role:         "user",
			IsActive:     true,
		}
	}
	if err := tx.Create(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

// seedBookings sells a random share of the seats on most trips and blocks a few others.
func seedBookings(tx *gorm.DB, services []Service, users []User) (int, int, error) {
	var seats []Seat
	if err := tx.Find(&seats).Error; err != nil {
		return 0, 0, err
	}
	seatsByService := map[uint][]uint{}
	for _, s := range seats {
		seatsByService[s.ServiceID] = append(seatsByService[s.ServiceID], s.ID)
	}

	blocked := []uint{}
	tickets := []Ticket{}
	groups := [][]Passenger{}
	nextCode := 100_000_000_000 + rand.Intn(1_000_000)

	for _, service := range services {
		seatIDs := seatsByService[service.ID]
		rand.Shuffle(len(seatIDs), func(i, j int) { seatIDs[i], seatIDs[j] = seatIDs[j], seatIDs[i] })

		if rand.Intn(3) == 0 {
			blocked = append(blocked, seatIDs[0])
			seatIDs = seatIDs[1:]
		}
		if rand.Intn(4) == 0 {
			continue
		}
		sold := seatIDs[:rand.Intn(len(seatIDs)*7/10)]
		for len(sold) > 0 {
			size := min(1+rand.Intn(3), len(sold))
			// Most demo tickets are paid. About one in ten is a hold made just now,
			// which runs out ten minutes after the seed unless someone pays it.
			reservedAt := time.Now().Add(-time.Duration(1+rand.Intn(72)) * time.Hour)
			status := domain.TicketPaid
			paidAt, expiresAt := &reservedAt, (*time.Time)(nil)
			if rand.Intn(10) == 0 {
				reservedAt = time.Now()
				holdEnds := reservedAt.Add(10 * time.Minute)
				status, paidAt, expiresAt = domain.TicketReserved, nil, &holdEnds
			}
			pricePerSeat := domain.DiscountedPrice(int64(service.Price), service.DiscountPercentage)
			nextCode++
			// About one ticket in five belongs to an account; the rest are guest purchases.
			var userID *uint
			phone := fmt.Sprintf("09%09d", rand.Intn(1_000_000_000))
			if rand.Intn(5) == 0 {
				user := users[rand.Intn(len(users))]
				userID, phone = &user.ID, user.PhoneNumber
			}
			tickets = append(tickets, Ticket{
				Code:         fmt.Sprintf("%012d", nextCode),
				ServiceID:    service.ID,
				UserID:       userID,
				ContactPhone: phone,
				Status:       status,
				PricePerSeat: pricePerSeat,
				TotalPrice:   pricePerSeat * int64(size),
				ReservedAt:   reservedAt,
				ExpiresAt:    expiresAt,
				PaidAt:       paidAt,
			})
			group := make([]Passenger, size)
			for i := range group {
				firstName, gender := randomFirstName()
				group[i] = Passenger{
					SeatID:       sold[i],
					FirstName:    firstName,
					LastName:     lastNames[rand.Intn(len(lastNames))],
					Gender:       gender,
					NationalCode: fmt.Sprintf("%010d", rand.Intn(1_000_000_000)),
					BirthDate:    randomBirthDate(),
				}
			}
			groups = append(groups, group)
			sold = sold[size:]
		}
	}

	if len(blocked) > 0 {
		if err := tx.Model(&Seat{}).Where("id IN ?", blocked).Update("for_sale", false).Error; err != nil {
			return 0, 0, err
		}
	}
	if err := tx.CreateInBatches(tickets, batchSize).Error; err != nil {
		return 0, 0, err
	}
	passengers := []Passenger{}
	for i, group := range groups {
		for _, p := range group {
			p.TicketID = tickets[i].ID
			passengers = append(passengers, p)
		}
	}
	if err := tx.CreateInBatches(passengers, batchSize).Error; err != nil {
		return 0, 0, err
	}
	return len(tickets), len(passengers), nil
}

var (
	maleNames   = []string{"علی", "رضا", "محمد", "حسین", "مهدی", "امیر", "سعید", "حمید"}
	femaleNames = []string{"زهرا", "فاطمه", "مریم", "سارا", "نرگس", "لیلا", "مینا", "الهام"}
	lastNames   = []string{"احمدی", "محمدی", "حسینی", "رضایی", "کریمی", "موسوی", "جعفری", "صادقی", "رحیمی", "قاسمی"}
)

func randomFirstName() (name string, gender string) {
	if rand.Intn(2) == 0 {
		return maleNames[rand.Intn(len(maleNames))], domain.GenderMale
	}
	return femaleNames[rand.Intn(len(femaleNames))], domain.GenderFemale
}

func randomBirthDate() time.Time {
	return time.Date(1960+rand.Intn(45), time.Month(1+rand.Intn(12)), 1+rand.Intn(28), 0, 0, 0, 0, time.UTC)
}
