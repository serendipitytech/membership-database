/*
  # Add Admin Flag to Members
  
  This migration:
  1. Adds an is_admin column to members table
  2. Updates existing admin users to have the flag
*/

-- Add is_admin column to members table
ALTER TABLE members 
ADD COLUMN is_admin boolean NOT NULL DEFAULT false;

-- Update existing admin users to have the flag
UPDATE members m
SET is_admin = true
WHERE EXISTS (
  SELECT 1 FROM admins a 
  WHERE a.user_id = m.id
);

-- Add comment to document the column
COMMENT ON COLUMN members.is_admin IS 'Indicates whether this member has admin privileges';

-- Drop the old is_admin function since it's replaced by the one in fix_admin_recursion.sql
DROP FUNCTION IF EXISTS is_admin(uuid); 