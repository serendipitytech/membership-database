/*
  # Fix Authentication Chain
  
  This migration:
  1. Adds user_id to members table
  2. Updates admin check function
  3. Ensures consistent admin policies
*/

-- Drop all existing admin policies first
DROP POLICY IF EXISTS "Users can check their own admin status" ON admins;
DROP POLICY IF EXISTS "Admins can manage other admins" ON admins;
DROP POLICY IF EXISTS "Admins can manage interest categories" ON interest_categories;
DROP POLICY IF EXISTS "Admins can manage interests" ON interests;
DROP POLICY IF EXISTS "Admins can manage all member interests" ON member_interests;
DROP POLICY IF EXISTS "Admins can manage all volunteer hours" ON volunteer_hours;
DROP POLICY IF EXISTS "Admins can manage meetings" ON meetings;
DROP POLICY IF EXISTS "Admins can manage all attendance records" ON meeting_attendance;
DROP POLICY IF EXISTS "Admins can manage all members" ON members;
DROP POLICY IF EXISTS "Admins can manage all payments" ON payments;

-- Now we can safely drop the function
DROP FUNCTION IF EXISTS is_admin(uuid);

-- Add user_id to members table
ALTER TABLE members
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing members with user_id based on email
UPDATE members m
SET user_id = u.id
FROM auth.users u
WHERE m.email = u.email;

-- Create new is_admin function that checks both tables
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admins WHERE admins.user_id = $1
  ) OR EXISTS (
    SELECT 1 FROM members WHERE members.user_id = $1 AND is_admin = true
  );
$$;

-- Create consistent admin policies using the new function
CREATE POLICY "Users can check their own admin status"
  ON admins
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage other admins"
  ON admins
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage interest categories"
  ON interest_categories
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage interests"
  ON interests
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage all member interests"
  ON member_interests
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage all volunteer hours"
  ON volunteer_hours
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage meetings"
  ON meetings
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage all attendance records"
  ON meeting_attendance
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage all members"
  ON members
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin TO anon; 