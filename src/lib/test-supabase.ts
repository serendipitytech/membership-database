import { supabase } from './supabase';

export const testSupabaseConnection = async () => {
  try {
    console.log('=== STARTING SUPABASE TEST ===');
    
    // Test 1: Basic Connection
    console.log('Testing Supabase connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('members')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.error('Connection test failed:', connectionError);
      return false;
    }
    console.log('Connection test passed!');

    // Get or create a test member
    console.log('\nChecking for existing members...');
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id')
      .limit(1);

    console.log('Members query response:', { members, membersError });

    let memberId: string;

    if (membersError) {
      console.error('Error fetching members:', membersError);
      return false;
    }

    if (!members || members.length === 0) {
      console.log('No members found, creating a test member...');
      const { data: newMember, error: createMemberError } = await supabase
        .from('members')
        .insert([{
          first_name: 'Test',
          last_name: 'User',
          email: 'test@example.com',
          phone: '123-456-7890',
          status: 'active',
          join_date: new Date().toISOString().split('T')[0]
        }])
        .select()
        .single();

      if (createMemberError) {
        console.error('Error creating test member:', createMemberError);
        return false;
      }

      memberId = newMember.id;
      console.log('Created test member with ID:', memberId);
    } else {
      memberId = members[0].id;
      console.log('Using existing member ID:', memberId);
    }

    // Test 2: Create a test volunteer hours record
    console.log('\nTesting volunteer hours creation...');
    const testVolunteerHours = {
      member_id: memberId,
      date: new Date().toISOString().split('T')[0],
      hours: 2.5,
      description: 'Test volunteer hours',
      category: 'Test'
    };

    console.log('Attempting to create volunteer hours with data:', testVolunteerHours);

    const { data: createdHours, error: createError } = await supabase
      .from('volunteer_hours')
      .insert([testVolunteerHours])
      .select();

    if (createError) {
      console.error('Create test failed:', createError);
      console.error('Error details:', {
        code: createError.code,
        message: createError.message,
        details: createError.details,
        hint: createError.hint
      });
      return false;
    }
    console.log('Create test passed!', createdHours);

    // Test 3: Read the created record
    console.log('\nTesting volunteer hours retrieval...');
    const { data: readHours, error: readError } = await supabase
      .from('volunteer_hours')
      .select('*')
      .eq('id', createdHours[0].id);

    if (readError) {
      console.error('Read test failed:', readError);
      return false;
    }
    console.log('Read test passed!', readHours);

    // Test 4: Update the record
    console.log('\nTesting volunteer hours update...');
    const { data: updatedHours, error: updateError } = await supabase
      .from('volunteer_hours')
      .update({ hours: 3.5 })
      .eq('id', createdHours[0].id)
      .select();

    if (updateError) {
      console.error('Update test failed:', updateError);
      return false;
    }
    console.log('Update test passed!', updatedHours);

    // Test 5: Delete the test record
    console.log('\nTesting volunteer hours deletion...');
    const { error: deleteError } = await supabase
      .from('volunteer_hours')
      .delete()
      .eq('id', createdHours[0].id);

    if (deleteError) {
      console.error('Delete test failed:', deleteError);
      return false;
    }
    console.log('Delete test passed!');

    return true;
  } catch (error) {
    console.error('Test suite failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    return false;
  }
}; 