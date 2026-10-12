-- +goose Up

-- The seat plan of a bus: a list of rows, each a list of seat numbers, with null for
-- empty floor. It is always read whole and never searched inside, so one JSON cell fits.
ALTER TABLE bus_types ADD COLUMN layout jsonb NOT NULL DEFAULT '[]';

-- A ticket starts as a hold ("reserved") that must be paid before expires_at.
-- The price is copied onto the ticket, so a later price change does not alter a sale.
ALTER TABLE tickets
    ADD COLUMN price_per_seat bigint,
    ADD COLUMN total_price    bigint,
    ADD COLUMN expires_at     timestamptz,
    ADD COLUMN paid_at        timestamptz;

UPDATE tickets
SET price_per_seat = services.price,
    total_price    = services.price * (SELECT count(*) FROM passengers WHERE passengers.ticket_id = tickets.id),
    expires_at     = CASE WHEN tickets.status = 'reserved' THEN tickets.reserved_at + interval '10 minutes' END,
    paid_at        = CASE WHEN tickets.status = 'paid' THEN tickets.reserved_at END
FROM services
WHERE services.id = tickets.service_id;

ALTER TABLE tickets
    ALTER COLUMN price_per_seat SET NOT NULL,
    ALTER COLUMN total_price SET NOT NULL,
    ADD CONSTRAINT tickets_price_check CHECK (price_per_seat >= 0 AND total_price >= 0),
    DROP CONSTRAINT tickets_status_check,
    ADD CONSTRAINT tickets_status_check CHECK (status IN ('reserved', 'paid', 'cancelled', 'expired')),
    ADD CONSTRAINT tickets_hold_expiry_check CHECK (status <> 'reserved' OR expires_at IS NOT NULL);

-- The clean-up job looks for holds that ran out of time.
CREATE INDEX tickets_hold_expiry_idx ON tickets (expires_at) WHERE status = 'reserved';

-- A seat used to allow one passenger ever, which would lock it for good after a
-- cancelled or expired hold. Now a passenger row is "active" while it holds the seat,
-- and the rule is: at most one ACTIVE passenger per seat.
ALTER TABLE passengers ADD COLUMN active boolean NOT NULL DEFAULT true;

UPDATE passengers
SET active = false
FROM tickets
WHERE tickets.id = passengers.ticket_id
  AND tickets.status = 'cancelled';

ALTER TABLE passengers DROP CONSTRAINT passengers_seat_id_key;
CREATE UNIQUE INDEX passengers_active_seat_idx ON passengers (seat_id) WHERE active;
CREATE INDEX passengers_seat_id_idx ON passengers (seat_id);

-- +goose Down

-- Only one passenger per seat can remain, so the inactive ones go.
DELETE FROM passengers WHERE NOT active;
DROP INDEX passengers_seat_id_idx;
DROP INDEX passengers_active_seat_idx;
ALTER TABLE passengers ADD CONSTRAINT passengers_seat_id_key UNIQUE (seat_id);
ALTER TABLE passengers DROP COLUMN active;

DROP INDEX tickets_hold_expiry_idx;
UPDATE tickets SET status = 'cancelled' WHERE status = 'expired';
ALTER TABLE tickets
    DROP CONSTRAINT tickets_hold_expiry_check,
    DROP CONSTRAINT tickets_status_check,
    ADD CONSTRAINT tickets_status_check CHECK (status IN ('reserved', 'paid', 'cancelled')),
    DROP CONSTRAINT tickets_price_check,
    DROP COLUMN paid_at,
    DROP COLUMN expires_at,
    DROP COLUMN total_price,
    DROP COLUMN price_per_seat;

ALTER TABLE bus_types DROP COLUMN layout;
