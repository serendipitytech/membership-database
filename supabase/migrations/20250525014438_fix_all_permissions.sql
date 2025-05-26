-- First, ensure RLS is enabled on all tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE interest_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

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

-- Create policies for interest_categories
CREATE POLICY "Allow anonymous select on interest_categories"
  ON interest_categories
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow authenticated select on interest_categories"
  ON interest_categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admin all operations on interest_categories"
  ON interest_categories
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM members 
    WHERE members.email = auth.jwt() ->> 'email' 
    AND members.is_admin = true
  ));

-- Create policies for interests
CREATE POLICY "Allow anonymous select on interests"
  ON interests
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow authenticated select on interests"
  ON interests
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admin all operations on interests"
  ON interests
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM members 
    WHERE members.email = auth.jwt() ->> 'email' 
    AND members.is_admin = true
  ));

-- Create policies for members
CREATE POLICY "Allow anonymous insert on members"
  ON members
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow authenticated read on members"
  ON members
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admin all operations on members"
  ON members
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM members 
    WHERE members.email = auth.jwt() ->> 'email' 
    AND members.is_admin = true
  ));

-- Create policies for member_interests
CREATE POLICY "Allow anonymous insert on member_interests"
  ON member_interests
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow authenticated read on member_interests"
  ON member_interests
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admin all operations on member_interests"
  ON member_interests
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM members 
    WHERE members.email = auth.jwt() ->> 'email' 
    AND members.is_admin = true
  ));

-- Create policies for volunteer_hours
CREATE POLICY "Allow authenticated read on volunteer_hours"
  ON volunteer_hours
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admin all operations on volunteer_hours"
  ON volunteer_hours
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM members 
    WHERE members.email = auth.jwt() ->> 'email' 
    AND members.is_admin = true
  ));

-- Create policies for meetings
CREATE POLICY "Allow authenticated read on meetings"
  ON meetings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admin all operations on meetings"
  ON meetings
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM members 
    WHERE members.email = auth.jwt() ->> 'email' 
    AND members.is_admin = true
  ));

-- Create policies for meeting_attendance
CREATE POLICY "Allow authenticated read on meeting_attendance"
  ON meeting_attendance
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admin all operations on meeting_attendance"
  ON meeting_attendance
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM members 
    WHERE members.email = auth.jwt() ->> 'email' 
    AND members.is_admin = true
  ));

-- Create policies for payments
CREATE POLICY "Allow authenticated read on payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admin all operations on payments"
  ON payments
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM members 
    WHERE members.email = auth.jwt() ->> 'email' 
    AND members.is_admin = true
  ));

-- Grant necessary permissions to roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated; 