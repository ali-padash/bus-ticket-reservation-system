package domain

import "testing"

func TestDiscountedPrice(t *testing.T) {
	cases := []struct {
		price    int64
		discount float64
		want     int64
	}{
		{2_500_000, 0, 2_500_000},
		{2_500_000, 10, 2_250_000},
		{2_500_000, 12.5, 2_187_500},
		{6_580_000, 5, 6_251_000},
		{999, 33.33, 666},
		{2_500_000, 100, 0},
		{2_500_000, -5, 2_500_000},
		{2_500_000, 150, 0},
	}
	for _, c := range cases {
		if got := DiscountedPrice(c.price, c.discount); got != c.want {
			t.Errorf("DiscountedPrice(%d, %v) = %d, want %d", c.price, c.discount, got, c.want)
		}
	}
}
