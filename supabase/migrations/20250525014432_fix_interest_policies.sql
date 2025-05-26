-- Enable RLS on tables if not already enabled
ALTER TABLE interest_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Interest categories are readable by all" ON interest_categories;
DROP POLICY IF EXISTS "Admins can manage interest categories" ON interest_categories;

-- Recreate policies
CREATE POLICY "Interest categories are readable by all"
  ON interest_categories
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Admins can manage interest categories"
  ON interest_categories
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM members 
    WHERE members.email = auth.jwt() ->> 'email' 
    AND members.is_admin = true
  ));

-- Drop existing policies for interests
DROP POLICY IF EXISTS "Interests are readable by all" ON interests;
DROP POLICY IF EXISTS "Admins can manage interests" ON interests;

-- Recreate policies for interests
CREATE POLICY "Interests are readable by all"
  ON interests
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Admins can manage interests"
  ON interests
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM members 
    WHERE members.email = auth.jwt() ->> 'email' 
    AND members.is_admin = true
  )); 