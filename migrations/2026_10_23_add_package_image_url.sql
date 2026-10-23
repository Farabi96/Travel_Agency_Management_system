-- Add image_url column to tour_packages if it does not exist.
ALTER TABLE tour_packages
ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
