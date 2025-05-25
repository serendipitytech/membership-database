import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true
  }
});

// Authentication helpers
export const sendMagicLink = async (email: string) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin
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
  const { data, error } = await supabase
    .from('interest_categories')
    .select('*')
    .order('display_order');
  
  return { categories: data, error };
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