-- First, ensure RLS is enabled on all tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE interest_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_interests ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Interest categories are readable by all" ON interest_categories;
DROP POLICY IF EXISTS "Admins can manage interest categories" ON interest_categories;
DROP POLICY IF EXISTS "Interests are readable by all" ON interests;
DROP POLICY IF EXISTS "Admins can manage interests" ON interests;
DROP POLICY IF EXISTS "Allow all operations on interest_categories" ON interest_categories;
DROP POLICY IF EXISTS "Allow all operations on interests" ON interests;
DROP POLICY IF EXISTS "Allow anonymous select on interest_categories" ON interest_categories;
DROP POLICY IF EXISTS "Allow anonymous select on interests" ON interests;
DROP POLICY IF EXISTS "Allow authenticated select on interest_categories" ON interest_categories;
DROP POLICY IF EXISTS "Allow authenticated select on interests" ON interests;
DROP POLICY IF EXISTS "Allow admin all operations on interest_categories" ON interest_categories;
DROP POLICY IF EXISTS "Allow admin all operations on interests" ON interests;
DROP POLICY IF EXISTS "Enable read access for all users on interest_categories" ON interest_categories;
DROP POLICY IF EXISTS "Enable all access for admins on interest_categories" ON interest_categories;
DROP POLICY IF EXISTS "Enable read access for all users on interests" ON interests;
DROP POLICY IF EXISTS "Enable all access for admins on interests" ON interests;
DROP POLICY IF EXISTS "Enable insert for registration" ON members;
DROP POLICY IF EXISTS "Enable read access for own profile" ON members;
DROP POLICY IF EXISTS "Enable all access for admins on members" ON members;
DROP POLICY IF EXISTS "Enable insert for registration" ON member_interests;
DROP POLICY IF EXISTS "Enable read access for own interests" ON member_interests;
DROP POLICY IF EXISTS "Enable all access for admins on member_interests" ON member_interests;

-- Create a single policy for each table that allows all operations for now
CREATE POLICY "Allow all operations on interest_categories"
  ON interest_categories
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on interests"
  ON interests
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on members"
  ON members
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on member_interests"
  ON member_interests
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true); 