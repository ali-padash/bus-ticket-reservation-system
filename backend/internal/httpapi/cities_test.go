package httpapi

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/ali-padash/bus-ticket-reservation-system/backend/internal/domain"

	"github.com/gin-gonic/gin"
)

// fakeCities stands in for the service. The test can swap the list and its load time.
type fakeCities struct {
	list     []domain.CityEntry
	loadedAt time.Time
	err      error
}

func (f *fakeCities) List(context.Context) ([]domain.CityEntry, time.Time, error) {
	return f.list, f.loadedAt, f.err
}

func newFakeCities() *fakeCities {
	return &fakeCities{
		loadedAt: time.Date(2026, 10, 12, 9, 0, 0, 0, time.UTC),
		list: []domain.CityEntry{{
			City:                domain.City{ID: 1, Code: "11320000", Name: "tehran", PersianName: "تهران"},
			ProvinceName:        "Tehran",
			ProvincePersianName: "تهران",
			IsCapital:           true,
			SortOrder:           10,
			SearchExpressions:   []string{"tehran", "تهران"},
		}},
	}
}

func cityHandler(cities CityService) http.Handler {
	gin.SetMode(gin.TestMode)
	return NewHandler(&fakeTrips{}, cities, slog.New(slog.NewTextHandler(io.Discard, nil)), "http://localhost:5173")
}

func getCities(handler http.Handler, headers map[string]string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(http.MethodGet, "/api/v1/cities", nil)
	for name, value := range headers {
		request.Header.Set(name, value)
	}
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)
	return recorder
}

const wantCityJSON = `[{"ID":1,"Code":"11320000","Name":"tehran","PersianName":"تهران","ProvinceName":"Tehran",` +
	`"ProvincePersianName":"تهران","SearchExpressions":["tehran","تهران"],"IsCapital":true,"Order":10}]`

func TestCitiesBodyAndHeaders(t *testing.T) {
	response := getCities(cityHandler(newFakeCities()), nil)

	if response.Code != 200 {
		t.Fatalf("status = %d, want 200", response.Code)
	}
	if body := response.Body.String(); body != wantCityJSON {
		t.Errorf("body = %s\nwant   %s", body, wantCityJSON)
	}
	if response.Header().Get("ETag") == "" {
		t.Error("the response has no ETag")
	}
	if got := response.Header().Get("Cache-Control"); got != "public, max-age=300" {
		t.Errorf("Cache-Control = %q, want public, max-age=300", got)
	}
	if response.Header().Get("Content-Encoding") != "" {
		t.Error("the body was compressed although the client did not ask for it")
	}
}

func TestCitiesAreCompressedOnRequest(t *testing.T) {
	response := getCities(cityHandler(newFakeCities()), map[string]string{"Accept-Encoding": "gzip, br"})

	if got := response.Header().Get("Content-Encoding"); got != "gzip" {
		t.Fatalf("Content-Encoding = %q, want gzip", got)
	}
	reader, err := gzip.NewReader(bytes.NewReader(response.Body.Bytes()))
	if err != nil {
		t.Fatalf("the body is not gzip: %v", err)
	}
	unpacked, _ := io.ReadAll(reader)
	if string(unpacked) != wantCityJSON {
		t.Errorf("unpacked body = %s\nwant            %s", unpacked, wantCityJSON)
	}
}

func TestCitiesNotModified(t *testing.T) {
	handler := cityHandler(newFakeCities())
	etag := getCities(handler, nil).Header().Get("ETag")

	response := getCities(handler, map[string]string{"If-None-Match": etag})

	if response.Code != http.StatusNotModified {
		t.Errorf("status = %d, want 304", response.Code)
	}
	if response.Body.Len() != 0 {
		t.Errorf("a 304 answer carried %d bytes of body", response.Body.Len())
	}
}

func TestCitiesChangeGivesANewETag(t *testing.T) {
	cities := newFakeCities()
	handler := cityHandler(cities)
	oldETag := getCities(handler, nil).Header().Get("ETag")

	// The service reloaded and one city was renamed.
	cities.list = []domain.CityEntry{{City: domain.City{ID: 1, Name: "tehran-renamed"}, SearchExpressions: []string{}}}
	cities.loadedAt = cities.loadedAt.Add(time.Hour)
	response := getCities(handler, map[string]string{"If-None-Match": oldETag})

	if response.Code != 200 {
		t.Fatalf("status = %d, want 200 because the list changed", response.Code)
	}
	if response.Header().Get("ETag") == oldETag {
		t.Error("the ETag did not change with the content")
	}
	var body []map[string]any
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil || body[0]["Name"] != "tehran-renamed" {
		t.Errorf("body = %s, want the renamed city", response.Body.String())
	}
}

func TestCitiesServerError(t *testing.T) {
	cities := newFakeCities()
	cities.err = errBroken

	response := getCities(cityHandler(cities), nil)

	if response.Code != 500 || response.Body.String() != `{"error":"Internal server error"}` {
		t.Errorf("status %d, body %s; want 500 with the general message", response.Code, response.Body.String())
	}
}
