/*
  # Fix Interest Table Policies
  
  This migration fixes the policies for the interests table by:
  1. Dropping existing policies
  2. Creating proper policies for reading and managing interests
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Interests are readable by all" ON interests;
DROP POLICY IF EXISTS "Admins can manage interests" ON interests;

-- Create read policy
CREATE POLICY "Interests are readable by all"
  ON interests
  FOR SELECT
  TO anon
  USING (true);

-- Create management policy for admins
CREATE POLICY "Admins can manage interests"
  ON interests
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM admins
  )); 