/*
  # Fix Admin Table Policies
  
  This migration fixes the policies for the admins table by:
  1. Dropping existing policies
  2. Creating proper policies for checking admin status
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can see other admins" ON admins;
DROP POLICY IF EXISTS "Only super admins can manage admins" ON admins;

-- Create policy for checking own admin status
CREATE POLICY "Users can check their own admin status"
  ON admins
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create policy for managing admins (only for existing admins)
CREATE POLICY "Admins can manage other admins"
  ON admins
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM admins
  )); 