package store

import (
	"context"
	"reflect"
	"testing"

	"github.com/ali-padash/bus-ticket-reservation-system/backend/internal/domain"
)

func TestCities(t *testing.T) {
	s := openTestStore(t)
	// A rank far above any real city, so this one must come first.
	insert(t, s.db, `INSERT INTO cities (id, code, name, persian_name, province_name, province_persian_name, is_capital, sort_order)
		VALUES (900001, 'TST-A', 'testville', 'تست', 'Testland', 'تستان', true, 99999)`)
	insert(t, s.db, `INSERT INTO cities (id, code, name, persian_name, province_name, province_persian_name)
		VALUES (900002, 'TST-B', 'quiet', 'ساکت', 'Testland', 'تستان')`)
	insert(t, s.db, `INSERT INTO search_expressions (city_id, expression) VALUES (900001, 'testville')`)
	insert(t, s.db, `INSERT INTO search_expressions (city_id, expression) VALUES (900001, 'تست')`)

	cities, err := s.Cities(context.Background())

	if err != nil {
		t.Fatalf("Cities() error: %v", err)
	}
	want := domain.CityEntry{
		City:                domain.City{ID: 900001, Code: "TST-A", Name: "testville", PersianName: "تست"},
		ProvinceName:        "Testland",
		ProvincePersianName: "تستان",
		IsCapital:           true,
		SortOrder:           99999,
		SearchExpressions:   []string{"testville", "تست"},
	}
	if len(cities) < 2 || !reflect.DeepEqual(cities[0], want) {
		t.Fatalf("first city =\n%+v\nwant\n%+v", cities[0], want)
	}

	// A city with no spellings must carry an empty list, so the JSON says [] and not null.
	for _, city := range cities {
		if city.ID == 900002 {
			if city.SearchExpressions == nil || len(city.SearchExpressions) != 0 {
				t.Errorf("spellings of a city without any = %#v, want an empty list", city.SearchExpressions)
			}
			return
		}
	}
	t.Error("the second test city is missing from the list")
}
