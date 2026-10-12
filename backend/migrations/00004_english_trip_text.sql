-- +goose Up

-- The website has an English version. A trip's two free-text fields were written in
-- Persian only; these columns hold the same text in English. Names of cities, companies
-- and terminals already have an English column.
ALTER TABLE services ADD COLUMN bus_name_en text NOT NULL DEFAULT '';
ALTER TABLE services ADD COLUMN description_en text NOT NULL DEFAULT '';

-- +goose Down

ALTER TABLE services DROP COLUMN description_en;
ALTER TABLE services DROP COLUMN bus_name_en;
