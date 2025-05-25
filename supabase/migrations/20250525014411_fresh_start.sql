/*
  # Fresh Database Setup for NW Democrats Membership System
  
  This migration creates a complete database structure with:
  1. All necessary tables and relationships
  2. Row Level Security (RLS) enabled on all tables
  3. Clear, well-organized security policies
  4. Initial data for testing
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (in correct order to handle dependencies)
DROP TABLE IF EXISTS meeting_attendance CASCADE;
DROP TABLE IF EXISTS meetings CASCADE;
DROP TABLE IF EXISTS volunteer_hours CASCADE;
DROP TABLE IF EXISTS member_interests CASCADE;
DROP TABLE IF EXISTS interests CASCADE;
DROP TABLE IF EXISTS interest_categories CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- Create tables in dependency order

-- Admins Table (for system administrators)
CREATE TABLE admins (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Members Table (for organization members)
CREATE TABLE members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  address text,
  city text,
  state text,
  zip text,
  membership_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  joined_date timestamptz DEFAULT now(),
  renewal_date timestamptz DEFAULT (now() + interval '1 year'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Interest Categories Table
CREATE TABLE interest_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Interests Table
CREATE TABLE interests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id uuid REFERENCES interest_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Member Interests Junction Table
CREATE TABLE member_interests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  interest_id uuid REFERENCES interests(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(member_id, interest_id)
);

-- Volunteer Hours Table
CREATE TABLE volunteer_hours (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  date date NOT NULL,
  hours numeric NOT NULL,
  description text NOT NULL,
  category text,
  created_at timestamptz DEFAULT now()
);

-- Meetings Table
CREATE TABLE meetings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  date date NOT NULL,
  time text NOT NULL,
  location text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Meeting Attendance Table
CREATE TABLE meeting_attendance (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id uuid REFERENCES meetings(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(meeting_id, member_id)
);

-- Enable Row Level Security on all tables
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE interest_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_attendance ENABLE ROW LEVEL SECURITY;

-- Security Policies

-- Admins Table Policies
CREATE POLICY "Users can check their own admin status"
  ON admins
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage other admins"
  ON admins
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM admins));

-- Members Table Policies
CREATE POLICY "Members can read their own data"
  ON members
  FOR SELECT
  TO authenticated
  USING (email = auth.jwt() ->> 'email');

CREATE POLICY "Members can update their own data"
  ON members
  FOR UPDATE
  TO authenticated
  USING (email = auth.jwt() ->> 'email')
  WITH CHECK (email = auth.jwt() ->> 'email');

CREATE POLICY "Admins can manage all members"
  ON members
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM admins));

CREATE POLICY "Anyone can register as a member"
  ON members
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Interest Categories Policies
CREATE POLICY "Interest categories are readable by all"
  ON interest_categories
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Admins can manage interest categories"
  ON interest_categories
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM admins));

-- Interests Policies
CREATE POLICY "Interests are readable by all"
  ON interests
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Admins can manage interests"
  ON interests
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM admins));

-- Member Interests Policies
CREATE POLICY "Members can read their own interests"
  ON member_interests
  FOR SELECT
  TO authenticated
  USING (member_id IN (
    SELECT id FROM members WHERE email = auth.jwt() ->> 'email'
  ));

CREATE POLICY "Members can manage their own interests"
  ON member_interests
  FOR ALL
  TO authenticated
  USING (member_id IN (
    SELECT id FROM members WHERE email = auth.jwt() ->> 'email'
  ));

CREATE POLICY "Admins can manage all member interests"
  ON member_interests
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM admins));

-- Volunteer Hours Policies
CREATE POLICY "Members can read their own volunteer hours"
  ON volunteer_hours
  FOR SELECT
  TO authenticated
  USING (member_id IN (
    SELECT id FROM members WHERE email = auth.jwt() ->> 'email'
  ));

CREATE POLICY "Members can log their own volunteer hours"
  ON volunteer_hours
  FOR INSERT
  TO authenticated
  WITH CHECK (member_id IN (
    SELECT id FROM members WHERE email = auth.jwt() ->> 'email'
  ));

CREATE POLICY "Admins can manage all volunteer hours"
  ON volunteer_hours
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM admins));

-- Meetings Policies
CREATE POLICY "Meetings are readable by all"
  ON meetings
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Admins can manage meetings"
  ON meetings
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM admins));

-- Meeting Attendance Policies
CREATE POLICY "Members can read their own attendance"
  ON meeting_attendance
  FOR SELECT
  TO authenticated
  USING (member_id IN (
    SELECT id FROM members WHERE email = auth.jwt() ->> 'email'
  ));

CREATE POLICY "Members can record their own attendance"
  ON meeting_attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (member_id IN (
    SELECT id FROM members WHERE email = auth.jwt() ->> 'email'
  ));

CREATE POLICY "Admins can manage all attendance records"
  ON meeting_attendance
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM admins));

-- Initial Data

-- Add initial admin user (replace with actual user ID)
INSERT INTO admins (user_id)
SELECT id 
FROM auth.users 
WHERE email = 'troy.shimkus@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- Sample Interest Categories
INSERT INTO interest_categories (name, description, display_order)
VALUES
  ('Policy Areas', 'Policy areas you are interested in', 1),
  ('Volunteer Opportunities', 'Ways you would like to help', 2),
  ('Events & Activities', 'Events and activities you would like to participate in', 3);

-- Sample Interests
INSERT INTO interests (category_id, name, description, display_order)
VALUES
  -- Policy Areas
  ((SELECT id FROM interest_categories WHERE name = 'Policy Areas'), 'Healthcare', 'Healthcare policy and reform', 1),
  ((SELECT id FROM interest_categories WHERE name = 'Policy Areas'), 'Education', 'Education policy and funding', 2),
  ((SELECT id FROM interest_categories WHERE name = 'Policy Areas'), 'Environment', 'Environmental policy and climate change', 3),
  ((SELECT id FROM interest_categories WHERE name = 'Policy Areas'), 'Economic Justice', 'Economic equality and opportunity', 4),
  ((SELECT id FROM interest_categories WHERE name = 'Policy Areas'), 'Racial Justice', 'Racial equality and justice', 5),
  ((SELECT id FROM interest_categories WHERE name = 'Policy Areas'), 'Housing', 'Housing policy and affordability', 6),
  ((SELECT id FROM interest_categories WHERE name = 'Policy Areas'), 'Immigration', 'Immigration policy and reform', 7),
  ((SELECT id FROM interest_categories WHERE name = 'Policy Areas'), 'Criminal Justice', 'Criminal justice reform', 8),
  
  -- Volunteer Opportunities
  ((SELECT id FROM interest_categories WHERE name = 'Volunteer Opportunities'), 'Phone Banking', 'Making calls to voters', 1),
  ((SELECT id FROM interest_categories WHERE name = 'Volunteer Opportunities'), 'Canvassing', 'Door-to-door canvassing', 2),
  ((SELECT id FROM interest_categories WHERE name = 'Volunteer Opportunities'), 'Event Planning', 'Helping plan and organize events', 3),
  ((SELECT id FROM interest_categories WHERE name = 'Volunteer Opportunities'), 'Social Media', 'Assisting with social media outreach', 4),
  ((SELECT id FROM interest_categories WHERE name = 'Volunteer Opportunities'), 'Fundraising', 'Helping with fundraising efforts', 5),
  ((SELECT id FROM interest_categories WHERE name = 'Volunteer Opportunities'), 'Administrative', 'Providing administrative support', 6),
  ((SELECT id FROM interest_categories WHERE name = 'Volunteer Opportunities'), 'Technical Support', 'Providing technical expertise', 7),
  
  -- Events & Activities
  ((SELECT id FROM interest_categories WHERE name = 'Events & Activities'), 'General Meetings', 'Regular membership meetings', 1),
  ((SELECT id FROM interest_categories WHERE name = 'Events & Activities'), 'Candidate Forums', 'Forums to meet candidates', 2),
  ((SELECT id FROM interest_categories WHERE name = 'Events & Activities'), 'Social Events', 'Social gatherings and networking', 3),
  ((SELECT id FROM interest_categories WHERE name = 'Events & Activities'), 'Training Sessions', 'Skills training and education', 4),
  ((SELECT id FROM interest_categories WHERE name = 'Events & Activities'), 'Community Service', 'Community service projects', 5); 