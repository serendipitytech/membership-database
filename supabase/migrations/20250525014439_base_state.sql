-- Drop existing tables if they exist
DROP TABLE IF EXISTS meeting_attendance CASCADE;
DROP TABLE IF EXISTS volunteer_hours CASCADE;
DROP TABLE IF EXISTS member_interests CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS meetings CASCADE;
DROP TABLE IF EXISTS interests CASCADE;
DROP TABLE IF EXISTS interest_categories CASCADE;
DROP TABLE IF EXISTS members CASCADE;

-- Create tables
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    is_cell_phone BOOLEAN DEFAULT true,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    membership_type TEXT NOT NULL,
    date_of_birth DATE,
    shirt_size TEXT,
    precinct TEXT,
    voter_id TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relationship TEXT,
    tell_us_more TEXT,
    signature TEXT,
    terms_accepted BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'pending',
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE interest_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    display_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category_id UUID REFERENCES interest_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE member_interests (
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    interest_id UUID REFERENCES interests(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (member_id, interest_id)
);

CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE meeting_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(meeting_id, member_id)
);

CREATE TABLE volunteer_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    hours DECIMAL(4,2) NOT NULL,
    description TEXT,
    category TEXT,
    meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE interest_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

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

-- Insert base data
INSERT INTO interest_categories (name, display_order) VALUES
('Community Involvement', 1),
('Political Action', 2),
('Education', 3),
('Social Events', 4);

INSERT INTO interests (name, category_id) 
SELECT 'Community Service', id FROM interest_categories WHERE name = 'Community Involvement'
UNION ALL
SELECT 'Voter Registration', id FROM interest_categories WHERE name = 'Political Action'
UNION ALL
SELECT 'Phone Banking', id FROM interest_categories WHERE name = 'Political Action'
UNION ALL
SELECT 'Door Knocking', id FROM interest_categories WHERE name = 'Political Action'
UNION ALL
SELECT 'Policy Research', id FROM interest_categories WHERE name = 'Education'
UNION ALL
SELECT 'Issue Advocacy', id FROM interest_categories WHERE name = 'Education'
UNION ALL
SELECT 'Social Gatherings', id FROM interest_categories WHERE name = 'Social Events'
UNION ALL
SELECT 'Fundraising Events', id FROM interest_categories WHERE name = 'Social Events';

-- Create admin user
INSERT INTO members (
    first_name,
    last_name,
    email,
    membership_type,
    terms_accepted,
    status,
    is_admin
) VALUES (
    'Admin',
    'User',
    'admin@example.com',
    'regular',
    true,
    'active',
    true
); 