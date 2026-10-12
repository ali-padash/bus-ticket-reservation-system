// Package store is the only package that talks to PostgreSQL.
// It returns domain types and domain errors, so nothing above it sees SQL or GORM.
package store

import (
	"fmt"

	"github.com/ali-padash/bus-ticket-reservation-system/backend/migrations"

	"github.com/pressly/goose/v3"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Store struct {
	db *gorm.DB
}

// Open connects to the database and checks that it answers.
func Open(databaseURL string) (*Store, error) {
	db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("connect to database: %w", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("get database handle: %w", err)
	}
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("ping database: %w", err)
	}
	return &Store{db: db}, nil
}

// Migrate runs the SQL migrations that have not run yet.
func (s *Store) Migrate() error {
	sqlDB, err := s.db.DB()
	if err != nil {
		return fmt.Errorf("get database handle: %w", err)
	}
	goose.SetBaseFS(migrations.Files)
	if err := goose.SetDialect("postgres"); err != nil {
		return err
	}
	if err := goose.Up(sqlDB, "."); err != nil {
		return fmt.Errorf("run migrations: %w", err)
	}
	return nil
}

func (s *Store) Close() error {
	sqlDB, err := s.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// DB hands out the raw connection. Only the seed uses it, to bulk-load demo rows.
func (s *Store) DB() *gorm.DB {
	return s.db
}
