import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
    storageKey: 'nw_democrats_auth',
    storage: {
      getItem: (key) => {
        try {
          const value = localStorage.getItem(key);
          return value ? JSON.parse(value) : null;
        } catch (error) {
          console.error('Error reading from localStorage:', error);
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
          console.error('Error writing to localStorage:', error);
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error('Error removing from localStorage:', error);
        }
      },
    },
  },
});

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
  // Mock data for development
  const mockCategories = [
    {
      id: '1',
      name: 'Policy Areas',
      description: 'Policy areas you are interested in',
      display_order: 1,
      interests: [
        {
          id: '1',
          name: 'Healthcare',
          description: 'Healthcare policy and reform'
        },
        {
          id: '2',
          name: 'Education',
          description: 'Education policy and funding'
        },
        {
          id: '3',
          name: 'Environment',
          description: 'Environmental policy and climate change'
        }
      ]
    },
    {
      id: '2',
      name: 'Volunteer Opportunities',
      description: 'Ways you would like to help',
      display_order: 2,
      interests: [
        {
          id: '4',
          name: 'Phone Banking',
          description: 'Making calls to voters'
        },
        {
          id: '5',
          name: 'Canvassing',
          description: 'Door-to-door canvassing'
        }
      ]
    },
    {
      id: '3',
      name: 'Events & Activities',
      description: 'Events and activities you would like to participate in',
      display_order: 3,
      interests: [
        {
          id: '6',
          name: 'Town Halls',
          description: 'Participating in town hall meetings'
        },
        {
          id: '7',
          name: 'Community Events',
          description: 'Helping organize community events'
        }
      ]
    }
  ];

  return { categories: mockCategories, error: null };
};

export const getMemberInterests = async (memberId: string) => {
  const { data, error } = await supabase
    .from('member_interests')
    .select('interest_id')
    .eq('member_id', memberId);
  
  return { interests: data?.map(i => i.interest_id) || [], error };
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