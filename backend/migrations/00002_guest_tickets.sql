-- +goose Up

-- Tickets are bought without an account, with a mobile number only.
-- The buyer is reached, and later finds the ticket, through that number.
ALTER TABLE tickets ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE tickets ADD COLUMN contact_phone text;
UPDATE tickets SET contact_phone = users.phone_number FROM users WHERE users.id = tickets.user_id;
ALTER TABLE tickets ALTER COLUMN contact_phone SET NOT NULL;
-- An Iranian mobile number: 11 digits starting with 09.
ALTER TABLE tickets ADD CONSTRAINT tickets_contact_phone_check CHECK (contact_phone ~ '^09[0-9]{9}$');

CREATE INDEX tickets_contact_phone_idx ON tickets (contact_phone);

-- +goose Down

-- Guest tickets cannot exist once user_id is required again.
DELETE FROM tickets WHERE user_id IS NULL;
DROP INDEX tickets_contact_phone_idx;
ALTER TABLE tickets DROP CONSTRAINT tickets_contact_phone_check;
ALTER TABLE tickets DROP COLUMN contact_phone;
ALTER TABLE tickets ALTER COLUMN user_id SET NOT NULL;
