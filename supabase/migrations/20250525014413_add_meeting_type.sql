/*
  # Add Meeting Type
  
  This migration:
  1. Adds a type column to the meetings table
  2. Updates the meetings table structure
  3. Ensures policies handle the new column
*/

-- Add type column to meetings table
ALTER TABLE meetings 
ADD COLUMN type text NOT NULL DEFAULT 'general';

-- Update the meetings table comment to document the type column
COMMENT ON COLUMN meetings.type IS 'Type of meeting (e.g., general, committee, special)';

-- Ensure the meetings policy includes the type column
DROP POLICY IF EXISTS "Admins can manage meetings" ON meetings;

CREATE POLICY "Admins can manage meetings"
  ON meetings
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

-- Add some sample meeting types
INSERT INTO meetings (title, description, date, time, location, type)
VALUES 
  ('General Membership Meeting', 'Monthly general membership meeting', CURRENT_DATE, '19:00', 'Main Hall', 'general'),
  ('Executive Committee Meeting', 'Monthly executive committee meeting', CURRENT_DATE + interval '7 days', '18:00', 'Conference Room', 'committee'),
  ('Special Event Planning', 'Planning meeting for upcoming fundraiser', CURRENT_DATE + interval '14 days', '17:00', 'Community Center', 'special')
ON CONFLICT DO NOTHING; 