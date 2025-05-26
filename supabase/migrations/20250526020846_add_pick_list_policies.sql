-- Enable RLS on pick list tables
ALTER TABLE "public"."pick_list_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."pick_list_values" ENABLE ROW LEVEL SECURITY;

-- Create policies for pick_list_categories
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
);

-- Create policies for pick_list_values
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
); 