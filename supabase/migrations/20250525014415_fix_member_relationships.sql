/*
  # Fix Member Relationships and Add Payments
  
  This migration:
  1. Creates a payments table
  2. Fixes member relationships
  3. Updates policies for the new structure
*/

-- Create payments table
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_method text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies for payments
CREATE POLICY "Members can read their own payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (member_id IN (
    SELECT id FROM members WHERE email = auth.jwt() ->> 'email'
  ));

CREATE POLICY "Admins can manage all payments"
  ON payments
  FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()));

-- Create view for member interests with categories
CREATE OR REPLACE VIEW member_interests_view AS
SELECT 
  mi.member_id,
  i.id as interest_id,
  i.name as interest_name,
  ic.id as category_id,
  ic.name as category_name
FROM member_interests mi
JOIN interests i ON mi.interest_id = i.id
JOIN interest_categories ic ON i.category_id = ic.id;

-- Grant access to the view
GRANT SELECT ON member_interests_view TO authenticated;

-- Create view for member volunteer hours with meetings
CREATE OR REPLACE VIEW member_volunteer_hours_view AS
SELECT 
  vh.member_id,
  vh.id as volunteer_hour_id,
  vh.date,
  vh.hours,
  vh.description,
  vh.category,
  m.id as meeting_id,
  m.title as meeting_title,
  m.date as meeting_date
FROM volunteer_hours vh
LEFT JOIN meetings m ON vh.meeting_id = m.id;

-- Grant access to the view
GRANT SELECT ON member_volunteer_hours_view TO authenticated;

-- Create view for member meeting attendance
CREATE OR REPLACE VIEW member_meeting_attendance_view AS
SELECT 
  ma.member_id,
  ma.id as attendance_id,
  m.id as meeting_id,
  m.title as meeting_title,
  m.date as meeting_date,
  m.time as meeting_time,
  m.location as meeting_location
FROM meeting_attendance ma
JOIN meetings m ON ma.meeting_id = m.id;

-- Grant access to the view
GRANT SELECT ON member_meeting_attendance_view TO authenticated;

-- Add some sample data
INSERT INTO payments (member_id, amount, date, status, payment_method)
SELECT 
  m.id as member_id,
  50.00 as amount,
  CURRENT_DATE as date,
  'completed' as status,
  'credit_card' as payment_method
FROM members m
WHERE m.email = 'troy.shimkus@gmail.com'
ON CONFLICT DO NOTHING; 