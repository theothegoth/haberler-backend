-- Add 'user' to the allowed report types in reports table
-- Drop existing constraint
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_reported_type_check;

-- Add new constraint with 'user' type included
ALTER TABLE reports ADD CONSTRAINT reports_reported_type_check
  CHECK (reported_type IN ('article', 'comment', 'user'));
