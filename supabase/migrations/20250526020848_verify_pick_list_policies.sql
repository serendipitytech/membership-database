-- First, let's make sure RLS is enabled
ALTER TABLE "public"."pick_list_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pick_list_values" ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Admins can manage pick list categories" ON "public"."pick_list_categories";
DROP POLICY IF EXISTS "Admins can manage pick list values" ON "public"."pick_list_values";
DROP POLICY IF EXISTS "Allow public read access to pick_list_categories" ON "public"."pick_list_categories";
DROP POLICY IF EXISTS "Allow public read access to pick_list_values" ON "public"."pick_list_values";
DROP POLICY IF EXISTS "Allow admin write access to pick_list_categories" ON "public"."pick_list_categories";
DROP POLICY IF EXISTS "Allow admin write access to pick_list_values" ON "public"."pick_list_values";

-- Create a simpler policy for testing
CREATE POLICY "Allow all access to pick_list_categories"
ON "public"."pick_list_categories"
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all access to pick_list_values"
ON "public"."pick_list_values"
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Grant explicit permissions
GRANT ALL ON "public"."pick_list_categories" TO authenticated;
GRANT ALL ON "public"."pick_list_values" TO authenticated; 