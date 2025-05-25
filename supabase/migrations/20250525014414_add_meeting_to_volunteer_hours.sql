/*
  # Add Meeting Relationship to Volunteer Hours
  
  This migration:
  1. Adds a meeting_id column to volunteer_hours
  2. Creates a foreign key relationship to meetings
  3. Updates policies to handle the new relationship
*/

-- Add meeting_id column to volunteer_hours table
ALTER TABLE volunteer_hours 
ADD COLUMN meeting_id uuid REFERENCES meetings(id) ON DELETE SET NULL;

-- Update the volunteer_hours table comment to document the relationship
COMMENT ON COLUMN volunteer_hours.meeting_id IS 'Optional reference to a meeting this volunteer work was performed for';

-- Ensure the volunteer hours policy includes the meeting relationship
DROP POLICY IF EXISTS "Admins can manage all volunteer hours" ON volunteer_hours;
DROP POLICY IF EXISTS "Members can read their own volunteer hours" ON volunteer_hours;
DROP POLICY IF EXISTS "Members can log their own volunteer hours" ON volunteer_hours;

-- Recreate policies with updated permissions
CREATE POLICY "Members can read their own volunteer hours"
  ON volunteer_hours
  FOR SELECT
  TO authenticated
  USING (member_id IN (
    SELECT id FROM members WHERE email = auth.jwt() ->> 'email'
  ));

CREATE POLICY "Members can log their own volunteer hours"
  ON volunteer_hours
  FOR INSERT
  TO authenticated
  WITH CHECK (member_id IN (
    SELECT id FROM members WHERE email = auth.jwt() ->> 'email'
  ));

CREATE POLICY "Admins can manage all volunteer hours"
  ON volunteer_hours
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

-- Add some sample volunteer hours with meeting references
INSERT INTO volunteer_hours (member_id, date, hours, description, category, meeting_id)
SELECT 
  m.id as member_id,
  CURRENT_DATE as date,
  2.5 as hours,
  'Helped with event setup' as description,
  'Event Support' as category,
  mt.id as meeting_id
FROM members m
CROSS JOIN (
  SELECT id FROM meetings WHERE type = 'general' LIMIT 1
) mt
WHERE m.email = 'troy.shimkus@gmail.com'
ON CONFLICT DO NOTHING; 