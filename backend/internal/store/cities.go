package store

import (
	"context"

	"github.com/ali-padash/bus-ticket-reservation-system/backend/internal/domain"
)

type cityEntryRow struct {
	ID                  uint
	Code                string
	Name                string
	PersianName         string
	ProvinceName        string
	ProvincePersianName string
	IsCapital           bool
	SortOrder           int
}

type expressionRow struct {
	CityID     uint
	Expression string
}

// Cities returns every city with its spellings. The best-ranked cities come first,
// and cities of equal rank are in name order.
func (s *Store) Cities(ctx context.Context) ([]domain.CityEntry, error) {
	var cityRows []cityEntryRow
	err := s.db.WithContext(ctx).Raw(`
		SELECT id, code, name, persian_name, province_name, province_persian_name, is_capital, sort_order
		FROM cities
		ORDER BY sort_order DESC, persian_name, id`).Scan(&cityRows).Error
	if err != nil {
		return nil, err
	}

	// Two plain queries joined here are simpler than one query that packs
	// 12,000 spellings into arrays, and just as fast at this size.
	var expressionRows []expressionRow
	err = s.db.WithContext(ctx).Raw(`
		SELECT city_id, expression FROM search_expressions ORDER BY city_id, id`).Scan(&expressionRows).Error
	if err != nil {
		return nil, err
	}
	expressions := make(map[uint][]string, len(cityRows))
	for _, row := range expressionRows {
		expressions[row.CityID] = append(expressions[row.CityID], row.Expression)
	}

	cities := make([]domain.CityEntry, len(cityRows))
	for i, row := range cityRows {
		spellings := expressions[row.ID]
		if spellings == nil {
			spellings = []string{}
		}
		cities[i] = domain.CityEntry{
			City:                domain.City{ID: row.ID, Code: row.Code, Name: row.Name, PersianName: row.PersianName},
			ProvinceName:        row.ProvinceName,
			ProvincePersianName: row.ProvincePersianName,
			IsCapital:           row.IsCapital,
			SortOrder:           row.SortOrder,
			SearchExpressions:   spellings,
		}
	}
	return cities, nil
}
