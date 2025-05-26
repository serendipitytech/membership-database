-- First, ensure RLS is enabled
ALTER TABLE interest_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Interest categories are readable by all" ON interest_categories;
DROP POLICY IF EXISTS "Admins can manage interest categories" ON interest_categories;
DROP POLICY IF EXISTS "Interests are readable by all" ON interests;
DROP POLICY IF EXISTS "Admins can manage interests" ON interests;
DROP POLICY IF EXISTS "Allow all operations on interest_categories" ON interest_categories;
DROP POLICY IF EXISTS "Allow all operations on interests" ON interests;

-- Create policies that allow anonymous access for SELECT operations
CREATE POLICY "Allow anonymous select on interest_categories"
  ON interest_categories
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous select on interests"
  ON interests
  FOR SELECT
  TO anon
  USING (true);

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated select on interest_categories"
  ON interest_categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated select on interests"
  ON interests
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for admin users
CREATE POLICY "Allow admin all operations on interest_categories"
  ON interest_categories
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM members 
    WHERE members.email = auth.jwt() ->> 'email' 
    AND members.is_admin = true
  ));

CREATE POLICY "Allow admin all operations on interests"
  ON interests
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM members 
    WHERE members.email = auth.jwt() ->> 'email' 
    AND members.is_admin = true
  )); 