/*
  # Clean Database Schema for NW Democrats Membership System
  
  This migration creates a complete database structure with:
  1. All necessary tables and relationships
  2. Row Level Security (RLS) enabled on all tables
  3. Clear, well-organized security policies
  4. Initial interest categories and interests
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
  is_admin boolean DEFAULT false,
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
  USING (EXISTS (
    SELECT 1 FROM members 
    WHERE members.email = auth.jwt() ->> 'email' 
    AND members.is_admin = true
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
  USING (EXISTS (
    SELECT 1 FROM members 
    WHERE members.email = auth.jwt() ->> 'email' 
    AND members.is_admin = true
  ));

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

CREATE POLICY "Admins can manage all attendance"
  ON meeting_attendance
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM admins));

-- Insert initial interest categories and interests
INSERT INTO interest_categories (name, description) VALUES
  ('Outdoor Activities', 'Activities that take place outdoors'),
  ('Arts & Crafts', 'Creative and artistic activities'),
  ('Community Service', 'Volunteer and community engagement activities'),
  ('Education', 'Learning and teaching activities');

-- Insert interests for each category
WITH categories AS (
  SELECT id, name FROM interest_categories
)
INSERT INTO interests (category_id, name, description) VALUES
  -- Outdoor Activities
  ((SELECT id FROM categories WHERE name = 'Outdoor Activities'), 'Hiking', 'Trail hiking and nature walks'),
  ((SELECT id FROM categories WHERE name = 'Outdoor Activities'), 'Gardening', 'Community and home gardening'),
  ((SELECT id FROM categories WHERE name = 'Outdoor Activities'), 'Bird Watching', 'Bird watching and nature observation'),
  
  -- Arts & Crafts
  ((SELECT id FROM categories WHERE name = 'Arts & Crafts'), 'Painting', 'Various forms of painting'),
  ((SELECT id FROM categories WHERE name = 'Arts & Crafts'), 'Pottery', 'Ceramic and clay work'),
  ((SELECT id FROM categories WHERE name = 'Arts & Crafts'), 'Woodworking', 'Wood crafting and carpentry'),
  
  -- Community Service
  ((SELECT id FROM categories WHERE name = 'Community Service'), 'Food Bank', 'Food bank volunteering'),
  ((SELECT id FROM categories WHERE name = 'Community Service'), 'Animal Shelter', 'Animal shelter support'),
  ((SELECT id FROM categories WHERE name = 'Community Service'), 'Senior Center', 'Senior center activities'),
  
  -- Education
  ((SELECT id FROM categories WHERE name = 'Education'), 'Tutoring', 'Academic tutoring and mentoring'),
  ((SELECT id FROM categories WHERE name = 'Education'), 'Workshop Leading', 'Leading educational workshops'),
  ((SELECT id FROM categories WHERE name = 'Education'), 'Mentoring', 'Youth and adult mentoring'); 