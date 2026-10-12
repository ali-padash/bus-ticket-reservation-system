package seed

import "encoding/json"

// The floor plan of each demo bus type, row by row, as seen from above with the
// driver on the left. A number is a seat; 0 is empty floor (the aisle, the door).
// Rows 3 and 4 are the aisle. These used to be written out inside the website.
var busLayouts = map[string][][]uint{
	"VIP_25_1": {
		{1, 4, 7, 10, 0, 14, 17, 20, 23},
		{2, 5, 8, 11, 0, 15, 18, 21, 24},
		{0, 0, 0, 0, 0, 0, 0, 0, 0},
		{0, 0, 0, 0, 0, 0, 0, 0, 0},
		{3, 6, 9, 12, 13, 16, 19, 22, 25},
	},
	"VIP_26_1": {
		{1, 4, 7, 10, 0, 0, 15, 18, 21, 24},
		{2, 5, 8, 11, 0, 0, 16, 19, 22, 25},
		{0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
		{0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
		{3, 6, 9, 12, 13, 14, 17, 20, 23, 26},
	},
	"VIP_29_1": {
		{1, 4, 7, 10, 13, 0, 0, 18, 21, 24, 27},
		{2, 5, 8, 11, 14, 0, 0, 19, 22, 25, 28},
		{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
		{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
		{3, 6, 9, 12, 15, 16, 17, 20, 23, 26, 29},
	},
	"VIP_32_1": {
		{1, 4, 7, 10, 13, 0, 0, 18, 21, 24, 27, 30},
		{2, 5, 8, 11, 14, 0, 0, 19, 22, 25, 28, 31},
		{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
		{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
		{3, 6, 9, 12, 15, 16, 17, 20, 23, 26, 29, 32},
	},
}

// layoutJSON turns a floor plan into what the database column holds:
// seat numbers, with null for empty floor.
func layoutJSON(layout [][]uint) string {
	cells := make([][]*uint, len(layout))
	for r, row := range layout {
		cells[r] = make([]*uint, len(row))
		for c := range row {
			if row[c] != 0 {
				cells[r][c] = &row[c]
			}
		}
	}
	encoded, err := json.Marshal(cells)
	if err != nil {
		// A grid of numbers can always be encoded; reaching this would be a bug.
		panic(err)
	}
	return string(encoded)
}
