import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Alert from '../../components/UI/Alert';
import TextField from '../../components/Form/TextField';
import SelectField from '../../components/Form/SelectField';
import CheckboxGroup from '../../components/Form/CheckboxGroup';
import { Users, Search, Filter, Edit2, Clock, Calendar, Plus, Trash2, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { getPickListValues, PICK_LIST_CATEGORIES } from '../../lib/pickLists';

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  membership_type: string;
  status: string;
  is_admin: boolean;
  created_at: string;
  renewal_date: string;
  interests: Array<{
    id: string;
    name: string;
    category: {
      name: string;
    };
  }>;
  volunteer_hours: Array<{
    id: string;
    date: string;
    hours: number;
    activity: string;
  }>;
  meeting_attendance: Array<{
    id: string;
    meeting: {
      id: string;
      name: string;
      date: string;
    };
  }>;
  payments: Array<{
    id: string;
    amount: number;
    date: string;
    status: string;
  }>;
}

interface InterestCategory {
  id: string;
  name: string;
  interests: Array<{
    id: string;
    name: string;
  }>;
}

const AdminMembers: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [interestCategories, setInterestCategories] = useState<InterestCategory[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const [membershipTypes, setMembershipTypes] = useState<Array<{value: string, label: string}>>([]);
  const navigate = useNavigate();

  const initializeInterestData = async () => {
    try {
      // First check if we already have categories
      const { data: existingCategories, error: checkError } = await supabase
        .from('interest_categories')
        .select('id')
        .limit(1);

      if (checkError) throw checkError;

      // If we already have categories, don't initialize
      if (existingCategories && existingCategories.length > 0) {
        console.log('Interest categories already exist, skipping initialization');
        return;
      }

      // Create categories only if none exist
      const { data: categories, error: categoriesError } = await supabase
        .from('interest_categories')
        .insert([
          { name: 'Outdoor Activities' },
          { name: 'Arts & Crafts' },
          { name: 'Community Service' },
          { name: 'Education' }
        ])
        .select();

      if (categoriesError) {
        console.error('Error creating categories:', categoriesError);
        return;
      }

      console.log('Created categories:', categories);

      // Then create interests for each category
      const interests = [
        // Outdoor Activities
        { name: 'Hiking', category_id: categories[0].id },
        { name: 'Gardening', category_id: categories[0].id },
        { name: 'Bird Watching', category_id: categories[0].id },
        // Arts & Crafts
        { name: 'Painting', category_id: categories[1].id },
        { name: 'Pottery', category_id: categories[1].id },
        { name: 'Woodworking', category_id: categories[1].id },
        // Community Service
        { name: 'Food Bank', category_id: categories[2].id },
        { name: 'Animal Shelter', category_id: categories[2].id },
        { name: 'Senior Center', category_id: categories[2].id },
        // Education
        { name: 'Tutoring', category_id: categories[3].id },
        { name: 'Workshop Leading', category_id: categories[3].id },
        { name: 'Mentoring', category_id: categories[3].id }
      ];

      const { error: interestsError } = await supabase
        .from('interests')
        .insert(interests);

      if (interestsError) {
        console.error('Error creating interests:', interestsError);
        return;
      }

      console.log('Created interests successfully');
      // Refresh the interest categories
      await fetchInterestCategories();
    } catch (error) {
      console.error('Error initializing interest data:', error);
    }
  };

  useEffect(() => {
    console.log('Component mounted, fetching data...');
    fetchMembers();
    fetchInterestCategories();
    checkAdminStatus();
    loadMembershipTypes();
  }, []);

  const fetchMembers = async () => {
    try {
      setIsLoading(true);
      const { data: members, error } = await supabase
        .from('members')
        .select(`
          *,
          member_interests (
            interest_id,
            interest:interests (
              id,
              name,
              category:interest_categories (
                name
              )
            )
          ),
          volunteer_hours (
            id,
            date,
            hours,
            description,
            category
          ),
          meeting_attendance (
            id,
            meeting:meetings (
              id,
              title,
              date
            )
          ),
          payments (
            id,
            amount,
            date,
            status
          )
        `)
        .order('last_name', { ascending: true });

      if (error) throw error;
      
      // Transform the data to match our Member interface
      const transformedMembers = (members || []).map(member => ({
        ...member,
        interests: member.member_interests?.map(mi => ({
          id: mi.interest.id,
          name: mi.interest.name,
          category: { name: mi.interest.category.name }
        })) || [],
        volunteer_hours: member.volunteer_hours || [],
        meeting_attendance: member.meeting_attendance || [],
        payments: member.payments || []
      }));

      setMembers(transformedMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load members. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInterestCategories = async () => {
    try {
      const { data: categories, error } = await supabase
        .from('interest_categories')
        .select(`
          id,
          name,
          interests (
            id,
            name
          )
        `)
        .order('name');

      if (error) throw error;
      
      // Filter out any duplicate interests
      const uniqueCategories = categories?.map(category => ({
        ...category,
        interests: category.interests.filter((interest, index, self) =>
          index === self.findIndex(i => i.id === interest.id)
        )
      })) || [];
      
      setInterestCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching interest categories:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load interest categories. Please try again.'
      });
    }
  };

  const toggleMemberExpansion = (memberId: string) => {
    setExpandedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  const renderMemberCard = (member: Member) => {
    const isExpanded = expandedMembers.has(member.id);
    
    return (
      <Card key={member.id} className="mb-4">
        <div className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {member.first_name} {member.last_name}
              </h3>
              <p className="text-sm text-gray-600">{member.email}</p>
              <p className="text-sm text-gray-600">{member.phone}</p>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => toggleMemberExpansion(member.id)}
                variant="outline"
                size="sm"
              >
                {isExpanded ? 'Show Less' : 'Show More'}
              </Button>
              <Button
                onClick={() => handleEditMember(member)}
                variant="outline"
                size="sm"
              >
                Edit
              </Button>
              {!member.is_admin && (
                <button
                  onClick={() => handleDeleteMember(member.id)}
                  className="text-red-600 hover:text-red-900"
                  title="Delete member"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Contact Information</h4>
                  <p className="text-sm text-gray-600">
                    {member.address}<br />
                    {member.city}, {member.state} {member.zip}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Membership Details</h4>
                  <p className="text-sm text-gray-600">
                    Type: {member.membership_type}<br />
                    Renewal Date: {format(new Date(member.renewal_date), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="font-medium text-gray-700 mb-2">Interests</h4>
                <div className="flex flex-wrap gap-2">
                  {member.interests.map(interest => (
                    <span key={interest.id} className="px-2 py-1 bg-gray-100 rounded-full text-sm">
                      {interest.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <h4 className="font-medium text-gray-700 mb-2">Recent Activity</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">
                      Volunteer Hours: {member.volunteer_hours.length}
                    </p>
                    <p className="text-sm text-gray-600">
                      Meetings Attended: {member.meeting_attendance.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      Total Payments: {member.payments.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleEditMember = (member: Member) => {
    setSelectedMember(member);
    setIsEditing(true);
  };

  const updateMemberInterests = async (memberId: string, interestIds: string[]) => {
    try {
      // First, delete any existing interests for this member
      const { error: deleteError } = await supabase
        .from('member_interests')
        .delete()
        .eq('member_id', memberId);

      if (deleteError) throw deleteError;

      // Then insert the new interests if there are any
      if (interestIds.length > 0) {
        const { error: insertError } = await supabase
          .from('member_interests')
          .insert(
            interestIds.map(interestId => ({
              member_id: memberId,
              interest_id: interestId
            }))
          );

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error updating member interests:', error);
      throw error;
    }
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    try {
      // Update member in Supabase
      const { error } = await supabase
        .from('members')
        .update({
          first_name: selectedMember.first_name,
          last_name: selectedMember.last_name,
          email: selectedMember.email,
          phone: selectedMember.phone,
          address: selectedMember.address,
          city: selectedMember.city,
          state: selectedMember.state,
          zip: selectedMember.zip,
          membership_type: selectedMember.membership_type,
          status: selectedMember.status,
          is_admin: selectedMember.is_admin
        })
        .eq('id', selectedMember.id);

      if (error) throw error;

      // Update member interests
      if (selectedMember.interests.length > 0) {
        // First, delete any existing interests for this member
        const { error: deleteError } = await supabase
          .from('member_interests')
          .delete()
          .eq('member_id', selectedMember.id);

        if (deleteError) throw deleteError;

        // Then insert the new interests
        const { error: insertError } = await supabase
          .from('member_interests')
          .insert(
            selectedMember.interests.map(interest => ({
              member_id: selectedMember.id,
              interest_id: interest.id
            }))
          );

        if (insertError) throw insertError;
      }

      setAlert({
        type: 'success',
        message: 'Member updated successfully'
      });
      setIsEditing(false);
      setSelectedMember(null);
      fetchMembers(); // Refresh the list
    } catch (error) {
      console.error('Error updating member:', error);
      setAlert({
        type: 'error',
        message: 'Failed to update member'
      });
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to delete this member? This action cannot be undone.')) {
      return;
    }

    try {
      // First delete all related records
      const { error: memberInterestsError } = await supabase
        .from('member_interests')
        .delete()
        .eq('member_id', memberId);

      if (memberInterestsError) throw memberInterestsError;

      const { error: volunteerHoursError } = await supabase
        .from('volunteer_hours')
        .delete()
        .eq('member_id', memberId);

      if (volunteerHoursError) throw volunteerHoursError;

      const { error: meetingAttendanceError } = await supabase
        .from('meeting_attendance')
        .delete()
        .eq('member_id', memberId);

      if (meetingAttendanceError) throw meetingAttendanceError;

      // Finally delete the member
      const { error: memberError } = await supabase
        .from('members')
        .delete()
        .eq('id', memberId);

      if (memberError) throw memberError;

      setAlert({
        type: 'success',
        message: 'Member deleted successfully'
      });

      // Refresh the members list
      fetchMembers();
    } catch (error) {
      console.error('Error deleting member:', error);
      setAlert({
        type: 'error',
        message: 'Failed to delete member'
      });
    }
  };

  const handleAddVolunteerHours = async (memberId: string, hours: number, activity: string) => {
    try {
      const newVolunteerHours = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        hours,
        activity
      };

      // Add volunteer hours to the member in local state
      setMembers(prevMembers =>
        prevMembers.map(member =>
          member.id === memberId
            ? {
                ...member,
                volunteer_hours: [...member.volunteer_hours, newVolunteerHours]
              }
            : member
        )
      );

      setAlert({
        type: 'success',
        message: 'Volunteer hours added successfully'
      });
    } catch (error) {
      console.error('Error adding volunteer hours:', error);
      setAlert({
        type: 'error',
        message: 'Failed to add volunteer hours'
      });
    }
  };

  const handleRecordAttendance = async (memberId: string, meetingId: string) => {
    try {
      const newAttendance = {
        id: Date.now().toString(),
        meeting: {
          id: meetingId,
          name: 'Monthly Meeting',
          date: new Date().toISOString()
        }
      };

      // Add attendance to the member in local state
      setMembers(prevMembers =>
        prevMembers.map(member =>
          member.id === memberId
            ? {
                ...member,
                meeting_attendance: [...member.meeting_attendance, newAttendance]
              }
            : member
        )
      );

      setAlert({
        type: 'success',
        message: 'Attendance recorded successfully'
      });
    } catch (error) {
      console.error('Error recording attendance:', error);
      setAlert({
        type: 'error',
        message: 'Failed to record attendance'
      });
    }
  };

  const handleRecordPayment = async (memberId: string, amount: number) => {
    try {
      const newPayment = {
        id: Date.now().toString(),
        amount,
        date: new Date().toISOString(),
        status: 'completed'
      };

      // Add payment to the member in local state
      setMembers(prevMembers =>
        prevMembers.map(member =>
          member.id === memberId
            ? {
                ...member,
                payments: [...member.payments, newPayment]
              }
            : member
        )
      );

      setAlert({
        type: 'success',
        message: 'Payment recorded successfully'
      });
    } catch (error) {
      console.error('Error recording payment:', error);
      setAlert({
        type: 'error',
        message: 'Failed to record payment'
      });
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    try {
      // Create member in Supabase
      const { data: newMember, error } = await supabase
        .from('members')
        .insert({
          first_name: selectedMember.first_name,
          last_name: selectedMember.last_name,
          email: selectedMember.email,
          phone: selectedMember.phone,
          address: selectedMember.address,
          city: selectedMember.city,
          state: selectedMember.state,
          zip: selectedMember.zip,
          membership_type: selectedMember.membership_type,
          status: 'active',
          is_admin: selectedMember.is_admin,
          renewal_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
        })
        .select()
        .single();

      if (error) throw error;

      // Add member interests
      if (newMember && selectedMember.interests.length > 0) {
        const interestRecords = selectedMember.interests.map(interest => ({
          member_id: newMember.id,
          interest_id: interest.id
        }));

        const { error: interestsError } = await supabase
          .from('member_interests')
          .insert(interestRecords);

        if (interestsError) {
          console.error('Error adding interests:', interestsError);
          throw interestsError;
        }
      }

      setAlert({
        type: 'success',
        message: 'Member created successfully'
      });
      setIsCreating(false);
      setSelectedMember(null);
      await fetchMembers(); // Refresh the list
    } catch (error) {
      console.error('Error creating member:', error);
      setAlert({
        type: 'error',
        message: 'Failed to create member'
      });
    }
  };

  const exportToCSV = () => {
    const headers = ['First Name', 'Last Name', 'Email'];
    const csvData = members.map(member => [
      member.first_name,
      member.last_name,
      member.email
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `members_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const loadMembershipTypes = async () => {
    try {
      const types = await getPickListValues(PICK_LIST_CATEGORIES.MEMBERSHIP_TYPES);
      setMembershipTypes(types.map(type => ({
        value: type.value,
        label: formatDisplayName(type.value)
      })));
    } catch (error) {
      console.error('Error loading membership types:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load membership types'
      });
    }
  };

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Check if user is an admin using the is_admin function
      const { data: isAdmin, error: adminError } = await supabase
        .rpc('is_admin', { user_id: user.id });

      if (adminError || !isAdmin) {
        setAlert({
          type: 'error',
          message: 'You do not have permission to access this page'
        });
        navigate('/');
        return;
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setAlert({
        type: 'error',
        message: 'Error verifying admin status'
      });
      navigate('/');
    }
  };

  const formatDisplayName = (name: string): string => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Members</h1>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            <Button
              variant="secondary"
              onClick={exportToCSV}
              className="flex items-center"
            >
              <Download className="h-5 w-5 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="primary"
              onClick={() => setIsCreating(true)}
              className="flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Member
            </Button>
          </div>
        </div>

        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
            className="mb-6"
          />
        )}

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading members...</p>
            </div>
          ) : (
            members
              .filter(member => 
                member.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                member.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                member.email.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map(renderMemberCard)
          )}
        </div>

        {/* Create Member Modal */}
        {isCreating && selectedMember && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black bg-opacity-50"></div>
            <div className="relative min-h-screen flex items-center justify-center p-4">
              <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Create New Member</h2>
                  <form onSubmit={handleCreateMember} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <TextField
                        label="First Name"
                        value={selectedMember.first_name}
                        onChange={(e) => setSelectedMember({...selectedMember, first_name: e.target.value})}
                        required
                      />
                      <TextField
                        label="Last Name"
                        value={selectedMember.last_name}
                        onChange={(e) => setSelectedMember({...selectedMember, last_name: e.target.value})}
                        required
                      />
                      <TextField
                        label="Email"
                        type="email"
                        value={selectedMember.email}
                        onChange={(e) => setSelectedMember({...selectedMember, email: e.target.value})}
                        required
                      />
                      <TextField
                        label="Phone"
                        value={selectedMember.phone}
                        onChange={(e) => setSelectedMember({...selectedMember, phone: e.target.value})}
                      />
                      <TextField
                        label="Address"
                        value={selectedMember.address}
                        onChange={(e) => setSelectedMember({...selectedMember, address: e.target.value})}
                      />
                      <div className="grid grid-cols-3 gap-4">
                        <TextField
                          label="City"
                          value={selectedMember.city}
                          onChange={(e) => setSelectedMember({...selectedMember, city: e.target.value})}
                        />
                        <TextField
                          label="State"
                          value={selectedMember.state}
                          onChange={(e) => setSelectedMember({...selectedMember, state: e.target.value})}
                        />
                        <TextField
                          label="ZIP"
                          value={selectedMember.zip}
                          onChange={(e) => setSelectedMember({...selectedMember, zip: e.target.value})}
                        />
                      </div>
                      <SelectField
                        label="Membership Type"
                        value={selectedMember.membership_type}
                        onChange={(e) => setSelectedMember({...selectedMember, membership_type: e.target.value})}
                        options={membershipTypes}
                        required
                      />
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="is_admin_create"
                          checked={selectedMember.is_admin}
                          onChange={(e) => setSelectedMember({...selectedMember, is_admin: e.target.checked})}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="is_admin_create" className="ml-2 block text-sm text-gray-900">
                          Grant admin privileges
                        </label>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Interests</h3>
                      <div className="space-y-4 max-h-[300px] overflow-y-auto">
                        {interestCategories.map((category) => (
                          <div key={category.id} className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">{category.name}</h4>
                            <div className="space-y-2">
                              {category.interests.map((interest) => (
                                <div key={interest.id} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    id={`interest-${interest.id}`}
                                    checked={selectedMember.interests.some(i => i.id === interest.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedMember({
                                          ...selectedMember,
                                          interests: [
                                            ...selectedMember.interests,
                                            {
                                              id: interest.id,
                                              name: interest.name,
                                              category: { name: category.name }
                                            }
                                          ]
                                        });
                                      } else {
                                        setSelectedMember({
                                          ...selectedMember,
                                          interests: selectedMember.interests.filter(i => i.id !== interest.id)
                                        });
                                      }
                                    }}
                                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                  />
                                  <label htmlFor={`interest-${interest.id}`} className="ml-2 block text-sm text-gray-900">
                                    {interest.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsCreating(false);
                          setSelectedMember(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" variant="primary">
                        Create Member
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Member Modal */}
        {isEditing && selectedMember && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black bg-opacity-50"></div>
            <div className="relative min-h-screen flex items-center justify-center p-4">
              <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Edit Member</h2>
                  <form onSubmit={handleSaveMember}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <TextField
                        label="First Name"
                        value={selectedMember.first_name}
                        onChange={(e) => setSelectedMember({...selectedMember, first_name: e.target.value})}
                        required
                      />
                      <TextField
                        label="Last Name"
                        value={selectedMember.last_name}
                        onChange={(e) => setSelectedMember({...selectedMember, last_name: e.target.value})}
                        required
                      />
                      <TextField
                        label="Email"
                        type="email"
                        value={selectedMember.email}
                        onChange={(e) => setSelectedMember({...selectedMember, email: e.target.value})}
                        required
                      />
                      <TextField
                        label="Phone"
                        value={selectedMember.phone}
                        onChange={(e) => setSelectedMember({...selectedMember, phone: e.target.value})}
                      />
                      <TextField
                        label="Address"
                        value={selectedMember.address}
                        onChange={(e) => setSelectedMember({...selectedMember, address: e.target.value})}
                      />
                      <div className="grid grid-cols-3 gap-4">
                        <TextField
                          label="City"
                          value={selectedMember.city}
                          onChange={(e) => setSelectedMember({...selectedMember, city: e.target.value})}
                        />
                        <TextField
                          label="State"
                          value={selectedMember.state}
                          onChange={(e) => setSelectedMember({...selectedMember, state: e.target.value})}
                        />
                        <TextField
                          label="ZIP"
                          value={selectedMember.zip}
                          onChange={(e) => setSelectedMember({...selectedMember, zip: e.target.value})}
                        />
                      </div>
                      <SelectField
                        label="Membership Type"
                        value={selectedMember.membership_type}
                        onChange={(e) => setSelectedMember({...selectedMember, membership_type: e.target.value})}
                        options={membershipTypes}
                        required
                      />
                      <SelectField
                        label="Status"
                        value={selectedMember.status}
                        onChange={(e) => setSelectedMember({...selectedMember, status: e.target.value})}
                        options={[
                          { value: 'active', label: 'Active' },
                          { value: 'inactive', label: 'Inactive' },
                          { value: 'pending', label: 'Pending' }
                        ]}
                        required
                      />
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="is_admin"
                          checked={selectedMember.is_admin}
                          onChange={(e) => setSelectedMember({...selectedMember, is_admin: e.target.checked})}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="is_admin" className="ml-2 block text-sm text-gray-900">
                          Grant admin privileges
                        </label>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Interests</h3>
                      <div className="space-y-4 max-h-[300px] overflow-y-auto">
                        {interestCategories.map((category) => (
                          <div key={category.id} className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">{category.name}</h4>
                            <div className="space-y-2">
                              {category.interests.map((interest) => (
                                <div key={interest.id} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    id={`interest-${interest.id}`}
                                    checked={selectedMember.interests.some(i => i.id === interest.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedMember({
                                          ...selectedMember,
                                          interests: [
                                            ...selectedMember.interests,
                                            {
                                              id: interest.id,
                                              name: interest.name,
                                              category: { name: category.name }
                                            }
                                          ]
                                        });
                                      } else {
                                        setSelectedMember({
                                          ...selectedMember,
                                          interests: selectedMember.interests.filter(i => i.id !== interest.id)
                                        });
                                      }
                                    }}
                                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                  />
                                  <label htmlFor={`interest-${interest.id}`} className="ml-2 block text-sm text-gray-900">
                                    {interest.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setSelectedMember(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" variant="primary">
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminMembers; 