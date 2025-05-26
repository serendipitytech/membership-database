import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a client with the anonymous key for public operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'nw_democrats_auth',
    storage: {
      getItem: (key: string) => {
        try {
          const value = localStorage.getItem(key);
          return value ? JSON.parse(value) : null;
        } catch (error) {
          console.error('Error reading from localStorage:', error);
          return null;
        }
      },
      setItem: (key: string, value: any) => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
          console.error('Error writing to localStorage:', error);
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error('Error removing from localStorage:', error);
        }
      },
    },
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    }
  }
});

// Create a client with the service role key for admin operations
export const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'nw_democrats_auth_admin',
    storage: {
      getItem: (key: string) => {
        try {
          const value = localStorage.getItem(key);
          return value ? JSON.parse(value) : null;
        } catch (error) {
          console.error('Error reading from localStorage:', error);
          return null;
        }
      },
      setItem: (key: string, value: any) => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
          console.error('Error writing to localStorage:', error);
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error('Error removing from localStorage:', error);
        }
      },
    },
  },
  global: {
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`
    }
  }
}) : null;

// Authentication helpers
export const sendMagicLink = async (email: string) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/account`,
      shouldCreateUser: true,
    },
  });
  
  return { data, error };
};

export const signInWithEmail = async (email: string) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin
    },
  });
  
  return { data, error };
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error };
};

export const signInWithPassword = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  return { data, error };
};

// Member functions
export const getMemberByEmail = async (email: string) => {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('email', email)
    .single();
  
  return { member: data, error };
};

export const updateMember = async (id: string, updates: any) => {
  const { data, error } = await supabase
    .from('members')
    .update(updates)
    .eq('id', id)
    .select();
  
  return { member: data?.[0], error };
};

export const registerMember = async (memberData: any) => {
  const { data, error } = await supabase
    .from('members')
    .insert([memberData])
    .select();
  
  return { member: data?.[0], error };
};

// Interest functions
export const getInterestCategories = async () => {
  try {
    // First fetch all categories
    const { data: categories, error: categoriesError } = await supabase
      .from('interest_categories')
      .select('*')
      .order('display_order');

    if (categoriesError) throw categoriesError;

    // Then fetch all interests
    const { data: interests, error: interestsError } = await supabase
      .from('interests')
      .select('*')
      .order('name');

    if (interestsError) throw interestsError;

    // Combine the data
    const categoriesWithInterests = categories.map(category => ({
      ...category,
      interests: interests.filter(interest => interest.category_id === category.id)
    }));

    return { categories: categoriesWithInterests, error: null };
  } catch (error) {
    console.error('Error fetching interest categories:', error);
    return { categories: [], error };
  }
};

export const getMemberInterests = async (memberId: string) => {
  const { data, error } = await supabase
    .from('member_interests')
    .select(`
      interest_id,
      interests (
        name
      )
    `)
    .eq('member_id', memberId);
  
  return { interests: data?.map(i => i.interests.name) || [], error };
};

export const updateMemberInterests = async (memberId: string, interestIds: string[]) => {
  // First delete existing interests
  await supabase
    .from('member_interests')
    .delete()
    .eq('member_id', memberId);
  
  // Then add new ones
  if (interestIds.length > 0) {
    const interestData = interestIds.map(id => ({
      member_id: memberId,
      interest_id: id
    }));
    
    const { data, error } = await supabase
      .from('member_interests')
      .insert(interestData);
    
    return { data, error };
  }
  
  return { data: null, error: null };
};

// Volunteer hours functions
export const logVolunteerHours = async (data: any) => {
  const { data: result, error } = await supabase
    .from('volunteer_hours')
    .insert([data])
    .select();
  
  return { record: result?.[0], error };
};

export const getMemberVolunteerHours = async (memberId: string) => {
  const { data, error } = await supabase
    .from('volunteer_hours')
    .select('*')
    .eq('member_id', memberId)
    .order('date', { ascending: false });
  
  return { hours: data, error };
};

// Meeting attendance functions
export const recordAttendance = async (data: any) => {
  const { data: result, error } = await supabase
    .from('meeting_attendance')
    .insert([data])
    .select();
  
  return { record: result?.[0], error };
};

export const getMeetings = async () => {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .order('date', { ascending: false });
  
  return { meetings: data, error };
};

export const getMemberAttendance = async (memberId: string) => {
  const { data, error } = await supabase
    .from('meeting_attendance')
    .select('*, meetings(*)')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });
  
  return { attendance: data, error };
};