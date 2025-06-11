import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a client with the service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createLocalAdmin() {
  const adminEmail = 'admin@local.dev';
  const adminPassword = 'admin123'; // You should change this in production
  
  try {
    // 1. Create the auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        first_name: 'Local',
        last_name: 'Admin'
      }
    });

    if (authError) throw authError;
    console.log('Created auth user:', authData);

    // 2. Create the member record
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .insert([{
        id: uuidv4(),
        email: adminEmail,
        first_name: 'Local',
        last_name: 'Admin',
        is_admin: true,
        has_login: true,
        auth_id: authData.user.id
      }])
      .select()
      .single();

    if (memberError) throw memberError;
    console.log('Created member record:', memberData);

    console.log('Local admin created successfully!');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);

  } catch (error) {
    console.error('Error creating local admin:', error);
  }
}

createLocalAdmin(); 