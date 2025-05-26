-- Add is_recurring column to payments table
ALTER TABLE payments
ADD COLUMN is_recurring BOOLEAN NOT NULL DEFAULT false;

-- Create policies if they don't exist
DO $$ 
BEGIN
    -- Read policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payments' 
        AND policyname = 'Enable read access for authenticated users'
    ) THEN
        CREATE POLICY "Enable read access for authenticated users" ON payments
            FOR SELECT
            TO authenticated
            USING (true);
    END IF;

    -- Insert policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payments' 
        AND policyname = 'Enable insert for authenticated users'
    ) THEN
        CREATE POLICY "Enable insert for authenticated users" ON payments
            FOR INSERT
            TO authenticated
            WITH CHECK (true);
    END IF;

    -- Update policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payments' 
        AND policyname = 'Enable update for authenticated users'
    ) THEN
        CREATE POLICY "Enable update for authenticated users" ON payments
            FOR UPDATE
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;

    -- Delete policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'payments' 
        AND policyname = 'Enable delete for authenticated users'
    ) THEN
        CREATE POLICY "Enable delete for authenticated users" ON payments
            FOR DELETE
            TO authenticated
            USING (true);
    END IF;
END $$;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON payments TO authenticated; 