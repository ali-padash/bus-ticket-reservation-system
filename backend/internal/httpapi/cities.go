package httpapi

import (
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/ali-padash/bus-ticket-reservation-system/backend/internal/domain"

	"github.com/gin-gonic/gin"
)

// How long a browser may reuse the list without asking. After that it asks again
// with the ETag and usually gets a short "not modified" answer.
const cityListMaxAge = "public, max-age=300"

// The field names match the cities.json file the website used to carry.
type cityResponse struct {
	ID                  uint     `json:"ID"`
	Code                string   `json:"Code"`
	Name                string   `json:"Name"`
	PersianName         string   `json:"PersianName"`
	ProvinceName        string   `json:"ProvinceName"`
	ProvincePersianName string   `json:"ProvincePersianName"`
	SearchExpressions   []string `json:"SearchExpressions"`
	IsCapital           bool     `json:"IsCapital"`
	Order               int      `json:"Order"`
}

// cityBodyCache keeps the finished response for one version of the city list, so
// turning 915 cities into JSON and compressing it happens once, not per request.
type cityBodyCache struct {
	mu       sync.Mutex
	loadedAt time.Time
	plain    []byte
	gzipped  []byte
	etag     string
}

func (c *cityBodyCache) get(cities []domain.CityEntry, loadedAt time.Time) (plain []byte, gzipped []byte, etag string, err error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.plain != nil && c.loadedAt.Equal(loadedAt) {
		return c.plain, c.gzipped, c.etag, nil
	}

	response := make([]cityResponse, len(cities))
	for i, city := range cities {
		response[i] = cityResponse{
			ID:                  city.ID,
			Code:                city.Code,
			Name:                city.Name,
			PersianName:         city.PersianName,
			ProvinceName:        city.ProvinceName,
			ProvincePersianName: city.ProvincePersianName,
			SearchExpressions:   city.SearchExpressions,
			IsCapital:           city.IsCapital,
			Order:               city.SortOrder,
		}
	}
	plain, err = json.Marshal(response)
	if err != nil {
		return nil, nil, "", err
	}
	var compressed bytes.Buffer
	writer, err := gzip.NewWriterLevel(&compressed, gzip.BestCompression)
	if err != nil {
		return nil, nil, "", err
	}
	if _, err := writer.Write(plain); err != nil {
		return nil, nil, "", err
	}
	if err := writer.Close(); err != nil {
		return nil, nil, "", err
	}
	// The ETag is a fingerprint of the content: same list, same tag.
	sum := sha256.Sum256(plain)

	c.loadedAt, c.plain, c.gzipped = loadedAt, plain, compressed.Bytes()
	c.etag = `"` + hex.EncodeToString(sum[:8]) + `"`
	return c.plain, c.gzipped, c.etag, nil
}

// GET /cities
func (a *api) listCities(c *gin.Context) {
	cities, loadedAt, err := a.cities.List(c.Request.Context())
	if err != nil {
		a.fail(c, err)
		return
	}
	plain, gzipped, etag, err := a.cityBody.get(cities, loadedAt)
	if err != nil {
		a.fail(c, err)
		return
	}

	c.Header("ETag", etag)
	c.Header("Cache-Control", cityListMaxAge)
	c.Header("Vary", "Accept-Encoding")
	// The browser already has this exact list: answer with no body.
	if c.GetHeader("If-None-Match") == etag {
		c.Status(http.StatusNotModified)
		return
	}
	if strings.Contains(c.GetHeader("Accept-Encoding"), "gzip") {
		c.Header("Content-Encoding", "gzip")
		c.Data(http.StatusOK, "application/json; charset=utf-8", gzipped)
		return
	}
	c.Data(http.StatusOK, "application/json; charset=utf-8", plain)
}
