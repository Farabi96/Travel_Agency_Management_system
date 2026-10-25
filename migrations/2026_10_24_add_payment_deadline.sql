-- Add the payment deadline used for temporary booking seat holds.
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS payment_deadline TIMESTAMP WITHOUT TIME ZONE;

CREATE INDEX IF NOT EXISTS ix_bookings_payment_deadline
ON bookings (payment_deadline);
