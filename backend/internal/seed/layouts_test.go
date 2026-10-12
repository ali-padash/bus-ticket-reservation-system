package seed

import (
	"strconv"
	"strings"
	"testing"
)

// A floor plan is typed by hand, so it is easy to repeat a seat or skip one.
// Each plan must hold every seat number from 1 to the bus's seat count exactly once.
func TestLayoutsHoldEverySeatOnce(t *testing.T) {
	for code, layout := range busLayouts {
		// The seat count is the number in the middle of the code: VIP_25_1 has 25 seats.
		seatCount, err := strconv.Atoi(strings.Split(code, "_")[1])
		if err != nil {
			t.Fatalf("%s: cannot read the seat count from the code", code)
		}
		seen := map[uint]int{}
		for _, row := range layout {
			if len(row) != len(layout[0]) {
				t.Errorf("%s: rows have different lengths", code)
			}
			for _, seat := range row {
				if seat != 0 {
					seen[seat]++
				}
			}
		}
		for number := uint(1); number <= uint(seatCount); number++ {
			if seen[number] != 1 {
				t.Errorf("%s: seat %d appears %d times, want once", code, number, seen[number])
			}
		}
		if len(seen) != seatCount {
			t.Errorf("%s: the plan has %d different seats, want %d", code, len(seen), seatCount)
		}
	}
}

func TestLayoutJSONUsesNullForFloor(t *testing.T) {
	got := layoutJSON([][]uint{{1, 0}, {0, 2}})

	if want := `[[1,null],[null,2]]`; got != want {
		t.Errorf("layoutJSON = %s, want %s", got, want)
	}
}

func TestDisplayName(t *testing.T) {
	cases := map[string]string{
		"hamrah-safar": "Hamrah Safar",
		"central":      "Central",
		" rudan ":      "Rudan",
		"":             "",
	}
	for slug, want := range cases {
		if got := displayName(slug); got != want {
			t.Errorf("displayName(%q) = %q, want %q", slug, got, want)
		}
	}
}
