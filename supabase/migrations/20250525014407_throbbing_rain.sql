/*
  # Add Initial Admin User
  
  1. Changes
    - Adds the specified email address as an admin user
    
  2. Security
    - Only adds the user if they exist in auth.users
    - Preserves existing admin entries
*/

INSERT INTO admins (user_id)
SELECT id 
FROM auth.users 
WHERE email = 'troy.shimkus@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM admins WHERE user_id = auth.users.id
);