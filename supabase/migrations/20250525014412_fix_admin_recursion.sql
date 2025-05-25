/*
  # Fix Admin Policy Recursion
  
  This migration fixes the infinite recursion issue in admin policies by:
  1. Dropping existing admin policies
  2. Creating a simpler admin check mechanism
  3. Updating related policies to use the new admin check
*/

-- First, drop all existing policies that reference the admins table
DROP POLICY IF EXISTS "Users can check their own admin status" ON admins;
DROP POLICY IF EXISTS "Admins can manage other admins" ON admins;
DROP POLICY IF EXISTS "Admins can manage interest categories" ON interest_categories;
DROP POLICY IF EXISTS "Admins can manage interests" ON interests;
DROP POLICY IF EXISTS "Admins can manage all member interests" ON member_interests;
DROP POLICY IF EXISTS "Admins can manage all volunteer hours" ON volunteer_hours;
DROP POLICY IF EXISTS "Admins can manage meetings" ON meetings;
DROP POLICY IF EXISTS "Admins can manage all attendance records" ON meeting_attendance;
DROP POLICY IF EXISTS "Admins can manage all members" ON members;

-- Create a function to check admin status without recursion
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admins WHERE admins.user_id = $1
  ) OR EXISTS (
    SELECT 1 FROM members WHERE id = $1 AND is_admin = true
  );
$$;

-- Create new admin policies using the function
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

-- Recreate other admin-dependent policies using the function
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