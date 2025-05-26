-- Disable RLS on all tables
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE interest_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE interests DISABLE ROW LEVEL SECURITY;
ALTER TABLE member_interests DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to anon and authenticated roles
GRANT ALL ON members TO anon, authenticated;
GRANT ALL ON interest_categories TO anon, authenticated;
GRANT ALL ON interests TO anon, authenticated;
GRANT ALL ON member_interests TO anon, authenticated; 