-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage pick list categories" ON "public"."pick_list_categories";
DROP POLICY IF EXISTS "Admins can manage pick list values" ON "public"."pick_list_values";
DROP POLICY IF EXISTS "Allow public read access to pick_list_categories" ON "public"."pick_list_categories";
DROP POLICY IF EXISTS "Allow public read access to pick_list_values" ON "public"."pick_list_values";
DROP POLICY IF EXISTS "Allow admin write access to pick_list_categories" ON "public"."pick_list_categories";
DROP POLICY IF EXISTS "Allow admin write access to pick_list_values" ON "public"."pick_list_values";

-- Create new policies
CREATE POLICY "Allow public read access to pick_list_categories"
ON "public"."pick_list_categories"
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow admin write access to pick_list_categories"
ON "public"."pick_list_categories"
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.id = auth.uid()
    AND members.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.id = auth.uid()
    AND members.is_admin = true
  )
);

CREATE POLICY "Allow public read access to pick_list_values"
ON "public"."pick_list_values"
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow admin write access to pick_list_values"
ON "public"."pick_list_values"
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.id = auth.uid()
    AND members.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.id = auth.uid()
    AND members.is_admin = true
  )
); 