/*
  # Add Initial Admin User
  
  This migration adds the first admin user to the system.
  IMPORTANT: Replace the user_id value with your actual user ID from auth.users
*/

INSERT INTO admins (user_id)
SELECT id 
FROM auth.users 
WHERE email = 'troy.shimkus@gmail.com'
ON CONFLICT (user_id) DO NOTHING;