-- First, ensure RLS is enabled
ALTER TABLE interest_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Interest categories are readable by all" ON interest_categories;
DROP POLICY IF EXISTS "Admins can manage interest categories" ON interest_categories;
DROP POLICY IF EXISTS "Interests are readable by all" ON interests;
DROP POLICY IF EXISTS "Admins can manage interests" ON interests;

-- Create a simple policy that allows all operations for now
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