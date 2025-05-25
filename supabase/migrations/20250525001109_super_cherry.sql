/*
  # Initial Database Schema for NW Democrats Membership System

  1. New Tables
    - `members` - Stores member information
    - `interest_categories` - Categories of interests (e.g., "Policy Areas", "Volunteer Opportunities")
    - `interests` - Individual interests within categories
    - `member_interests` - Junction table connecting members to their interests
    - `volunteer_hours` - Records of volunteer time contributed by members
    - `meetings` - Scheduled meetings and events
    - `meeting_attendance` - Records of members attending meetings
    - `admins` - Users with administrative access

  2. Security
    - Enable RLS on all tables
    - Add policies for secure data access
*/

-- Members Table
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Interest Categories Table
CREATE TABLE IF NOT EXISTS interest_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE interest_categories ENABLE ROW LEVEL SECURITY;

-- Interests Table
CREATE TABLE IF NOT EXISTS interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES interest_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

-- Member Interests Junction Table
CREATE TABLE IF NOT EXISTS member_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  interest_id uuid REFERENCES interests(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(member_id, interest_id)
);

ALTER TABLE member_interests ENABLE ROW LEVEL SECURITY;

-- Volunteer Hours Table
CREATE TABLE IF NOT EXISTS volunteer_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  date date NOT NULL,
  hours numeric NOT NULL,
  description text NOT NULL,
  category text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE volunteer_hours ENABLE ROW LEVEL SECURITY;

-- Meetings Table
CREATE TABLE IF NOT EXISTS meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  date date NOT NULL,
  time text NOT NULL,
  location text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Meeting Attendance Table
CREATE TABLE IF NOT EXISTS meeting_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES meetings(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(meeting_id, member_id)
);

ALTER TABLE meeting_attendance ENABLE ROW LEVEL SECURITY;

-- Admins Table
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies

-- Members Table Policies
CREATE POLICY "Members can read their own data"
  ON members
  FOR SELECT
  TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM admins
  ) OR auth.jwt() ->> 'email' = email);

CREATE POLICY "Members can update their own data"
  ON members
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'email' = email)
  WITH CHECK (auth.jwt() ->> 'email' = email);

CREATE POLICY "Admins can read all member data"
  ON members
  FOR SELECT
  TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM admins
  ));

CREATE POLICY "Admins can update all member data"
  ON members
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM admins
  ));

CREATE POLICY "Admins can insert member data"
  ON members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM admins
  ));

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
  USING (auth.uid() IN (
    SELECT user_id FROM admins
  ));

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
  USING (auth.uid() IN (
    SELECT user_id FROM admins
  ));

-- Member Interests Policies
CREATE POLICY "Members can read their own interests"
  ON member_interests
  FOR SELECT
  TO authenticated
  USING (member_id IN (
    SELECT id FROM members WHERE auth.jwt() ->> 'email' = email
  ) OR auth.uid() IN (
    SELECT user_id FROM admins
  ));

CREATE POLICY "Members can manage their own interests"
  ON member_interests
  FOR ALL
  TO authenticated
  USING (member_id IN (
    SELECT id FROM members WHERE auth.jwt() ->> 'email' = email
  ));

CREATE POLICY "Admins can manage all member interests"
  ON member_interests
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM admins
  ));

-- Volunteer Hours Policies
CREATE POLICY "Members can read their own volunteer hours"
  ON volunteer_hours
  FOR SELECT
  TO authenticated
  USING (member_id IN (
    SELECT id FROM members WHERE auth.jwt() ->> 'email' = email
  ) OR auth.uid() IN (
    SELECT user_id FROM admins
  ));

CREATE POLICY "Members can log their own volunteer hours"
  ON volunteer_hours
  FOR INSERT
  TO authenticated
  WITH CHECK (member_id IN (
    SELECT id FROM members WHERE auth.jwt() ->> 'email' = email
  ));

CREATE POLICY "Admins can manage all volunteer hours"
  ON volunteer_hours
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM admins
  ));

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
  USING (auth.uid() IN (
    SELECT user_id FROM admins
  ));

-- Meeting Attendance Policies
CREATE POLICY "Members can read their own attendance"
  ON meeting_attendance
  FOR SELECT
  TO authenticated
  USING (member_id IN (
    SELECT id FROM members WHERE auth.jwt() ->> 'email' = email
  ) OR auth.uid() IN (
    SELECT user_id FROM admins
  ));

CREATE POLICY "Members can record their own attendance"
  ON meeting_attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (member_id IN (
    SELECT id FROM members WHERE auth.jwt() ->> 'email' = email
  ));

CREATE POLICY "Admins can manage all attendance records"
  ON meeting_attendance
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM admins
  ));

-- Admins Policies
CREATE POLICY "Admins can see other admins"
  ON admins
  FOR SELECT
  TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM admins
  ));

CREATE POLICY "Only super admins can manage admins"
  ON admins
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM admins WHERE user_id = auth.uid()
  ));

-- Initial Data

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

-- Sample Meetings
INSERT INTO meetings (title, description, date, time, location)
VALUES
  ('Monthly General Meeting', 'Regular monthly meeting for all members', (CURRENT_DATE + interval '14 days')::date, '7:00 PM - 8:30 PM', 'Community Center, Room 101'),
  ('Voter Registration Drive Planning', 'Planning session for upcoming voter registration drive', (CURRENT_DATE + interval '7 days')::date, '6:30 PM - 8:00 PM', 'Public Library, Conference Room'),
  ('New Member Orientation', 'Orientation session for new members', (CURRENT_DATE + interval '21 days')::date, '6:00 PM - 7:00 PM', 'Community Center, Room 202');