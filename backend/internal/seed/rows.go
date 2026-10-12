package seed

import "time"

// These structs mirror the table rows the seed inserts. GORM finds the table from
// the struct name (BusType -> bus_types). The tables themselves are created by the
// SQL files in migrations/; nothing here defines the schema.

type City struct {
	ID                  uint `gorm:"primaryKey;autoIncrement:false"`
	Code                string
	Name                string
	PersianName         string
	ProvinceName        string
	ProvincePersianName string
	IsCapital           bool
	SortOrder           int
}

type SearchExpression struct {
	ID         uint `gorm:"primaryKey"`
	CityID     uint
	Expression string
}

type Terminal struct {
	ID          uint `gorm:"primaryKey"`
	CityID      uint
	Code        string
	Name        string
	PersianName string
}

type Company struct {
	ID          uint `gorm:"primaryKey"`
	Code        string
	Name        string
	PersianName string
	IsActive    bool
}

type BusType struct {
	ID        uint `gorm:"primaryKey"`
	Code      string
	SeatCount uint
	IsVIP     bool `gorm:"column:is_vip"`
}

type Service struct {
	ID                    uint `gorm:"primaryKey"`
	CompanyID             uint
	BusTypeID             uint
	OriginTerminalID      uint
	DestinationTerminalID uint
	BusName               string
	Price                 uint
	DiscountPercentage    float64
	DepartureDate         time.Time `gorm:"type:date"`
	DepartureTime         string    `gorm:"type:time"`
	Description           string
}

type Seat struct {
	ID         uint `gorm:"primaryKey"`
	ServiceID  uint
	SeatNumber uint
	ForSale    bool
}

type User struct {
	ID           uint `gorm:"primaryKey"`
	Username     string
	FirstName    string
	LastName     string
	PasswordHash string
	PhoneNumber  string
	Email        string
	NationalCode string
	BirthDate    time.Time `gorm:"type:date"`
	Gender       string
	Role         string
	IsActive     bool
}

// A ticket bought without an account has no UserID.
type Ticket struct {
	ID           uint `gorm:"primaryKey"`
	Code         string
	ServiceID    uint
	UserID       *uint
	ContactPhone string
	Status       string
	ReservedAt   time.Time
}

type Passenger struct {
	ID           uint `gorm:"primaryKey"`
	TicketID     uint
	SeatID       uint
	FirstName    string
	LastName     string
	Gender       string
	NationalCode string
	BirthDate    time.Time `gorm:"type:date"`
}
