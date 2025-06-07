import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Alert from '../../components/UI/Alert';
import TextField from '../../components/Form/TextField';
import SelectField from '../../components/Form/SelectField';
import CheckboxGroup from '../../components/Form/CheckboxGroup';
import { Users, Search, Filter, Edit2, Clock, Calendar, Plus, Trash2, Download, ChevronDown, ChevronRight, Grid, List } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { getPickListValues, PICK_LIST_CATEGORIES } from '../../lib/pickLists';
import { formatPhoneNumber } from '../../lib/formValidation';

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
  const [currentPage, setCurrentPage] = useState(1);
  const membersPerPage = 20;
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPrecinct, setSelectedPrecinct] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [statusOptions, setStatusOptions] = useState<Array<{value: string, label: string}>>([]);
  const [precinctOptions, setPrecinctOptions] = useState<Array<{value: string, label: string}>>([]);

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
    loadStatusOptions();
    loadPrecinctOptions();
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
      const transformedMembers = (members || []).map((member: any) => ({
        ...member,
        interests: member.member_interests?.map((mi: any) => ({
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
      const uniqueCategories = categories?.map((category: any) => ({
        ...category,
        interests: category.interests.filter((interest: any, index: number, self: any[]) =>
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
    setExpandedMembers((prev: Set<string>) => {
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
    const membershipType = membershipTypes.find(type => type.value === member.membership_type);
    
    return (
      <Card key={member.id} className="relative cursor-pointer" onClick={() => toggleMemberExpansion(member.id)}>
        <div className="absolute top-2 right-2 flex space-x-2" onClick={(e) => e.stopPropagation()}>
          <Button
            onClick={() => handleEditMember(member)}
            variant="outline"
            size="sm"
            className="p-2"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          {!member.is_admin && (
            <button
              onClick={() => handleDeleteMember(member.id)}
              className="text-red-600 hover:text-red-900 p-2"
              title="Delete member"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="p-4 pt-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {member.first_name} {member.last_name}
          </h3>
          <p className="text-sm text-gray-600 mb-1">{member.email}</p>
          <p className="text-sm text-gray-600 mb-2">{formatPhoneNumber(member.phone)}</p>
          <p className="text-sm text-gray-600">
            {member.city}, {member.state}
          </p>
          <p className="text-sm text-gray-600 mb-2">
            Type: {membershipType?.label || member.membership_type}
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {member.interests.slice(0, 3).map(interest => (
              <span key={interest.id} className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                {interest.name}
              </span>
            ))}
            {member.interests.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                +{member.interests.length - 3} more
              </span>
            )}
          </div>
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

  const handleSaveMember = async () => {
    try {
      setIsLoading(true);
      
      // First check if we're authenticated and an admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAlert({
          type: 'error',
          message: 'You must be logged in to perform this action'
        });
        return;
      }

      // Check if user is an admin using the is_admin function
      const { data: isAdmin, error: adminError } = await supabase
        .rpc('is_admin', { user_id: user.id });

      if (adminError || !isAdmin) {
        setAlert({
          type: 'error',
          message: 'You do not have permission to perform this action'
        });
        return;
      }

      // If this is a new member and they should be an admin
      if (!selectedMember.id && selectedMember.is_admin) {
        // Create a new auth user for the admin
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: selectedMember.email,
          email_confirm: true,
          user_metadata: {
            first_name: selectedMember.first_name,
            last_name: selectedMember.last_name
          }
        });

        if (authError) {
          throw new Error(`Failed to create auth user: ${authError.message}`);
        }

        // Set the auth_id in the member data
        selectedMember.auth_id = authData.user.id;
      }

      // If this is an existing member and their admin status is changing
      if (selectedMember.id) {
        const existingMember = members.find(m => m.id === selectedMember.id);
        if (existingMember && existingMember.is_admin !== selectedMember.is_admin) {
          if (selectedMember.is_admin) {
            // Create auth user if they don't have one
            if (!existingMember.auth_id) {
              const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: selectedMember.email,
                email_confirm: true,
                user_metadata: {
                  first_name: selectedMember.first_name,
                  last_name: selectedMember.last_name
                }
              });

              if (authError) {
                throw new Error(`Failed to create auth user: ${authError.message}`);
              }

              selectedMember.auth_id = authData.user.id;
            }
          } else {
            // Remove admin privileges - we'll keep the auth user but they won't have admin access
            // since the is_admin check in the RPC function will return false
          }
        }
      }

      if (selectedMember.id) {
        // Update existing member
        const updateData = {
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
        };

        // Only include auth_id if it's not null
        if (selectedMember.auth_id) {
          updateData.auth_id = selectedMember.auth_id;
        }

        const { error } = await supabase
          .from('members')
          .update(updateData)
          .eq('id', selectedMember.id);

        if (error) throw error;

        // Update member interests
        await updateMemberInterests(
          selectedMember.id,
          selectedMember.interests.map(interest => interest.id)
        );

        // Handle admin privileges
        if (selectedMember.is_admin && selectedMember.auth_id) {
          // If admin privileges are granted, ensure a record exists in the admins table
          const { error: adminError } = await supabase
            .from('admins')
            .upsert({ user_id: selectedMember.auth_id }, { onConflict: 'user_id' });
          if (adminError) throw adminError;
        } else if (!selectedMember.is_admin && selectedMember.auth_id) {
          // If admin privileges are removed, delete the record from the admins table
          const { error: adminError } = await supabase
            .from('admins')
            .delete()
            .eq('user_id', selectedMember.auth_id);
          if (adminError) throw adminError;
        }
      } else {
        // Create new member
        const insertData = {
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
        };

        // Only include auth_id if it's not null
        if (selectedMember.auth_id) {
          insertData.auth_id = selectedMember.auth_id;
        }

        const { data: newMember, error } = await supabase
          .from('members')
          .insert([insertData])
          .select()
          .single();

        if (error) throw error;

        // Add member interests
        if (newMember && selectedMember.interests.length > 0) {
          await updateMemberInterests(
            newMember.id,
            selectedMember.interests.map(interest => interest.id)
          );
        }

        // If admin privileges are granted and we have an auth_id, insert a record into the admins table
        if (selectedMember.is_admin && selectedMember.auth_id) {
          const { error: adminError } = await supabase
            .from('admins')
            .insert({ user_id: selectedMember.auth_id });
          if (adminError) throw adminError;
        }
      }

      setAlert({
        type: 'success',
        message: `Member ${selectedMember.id ? 'updated' : 'created'} successfully`
      });

      setIsEditing(false);
      setIsCreating(false);
      setSelectedMember(null);
      fetchMembers();
    } catch (error) {
      console.error('Error saving member:', error);
      setAlert({
        type: 'error',
        message: error.message || 'Error saving member'
      });
    } finally {
      setIsLoading(false);
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
        label: type.name
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

  // Add this new component for the member details modal
  const MemberDetailsModal = ({ member, onClose }: { member: Member, onClose: () => void }) => {
    const membershipType = membershipTypes.find(type => type.value === member.membership_type);
    
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
        <div className="fixed inset-0 bg-black bg-opacity-50"></div>
        <div className="relative min-h-screen flex items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {member.first_name} {member.last_name}
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Contact Information</h3>
                  <p className="mt-1 text-sm text-gray-900">{member.email}</p>
                  <p className="mt-1 text-sm text-gray-900">{formatPhoneNumber(member.phone)}</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {member.address}<br />
                    {member.city}, {member.state} {member.zip}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Membership Details</h3>
                  <p className="mt-1 text-sm text-gray-900">Type: {membershipType?.label || member.membership_type}</p>
                  <p className="mt-1 text-sm text-gray-900">Status: {member.status}</p>
                  <p className="mt-1 text-sm text-gray-900">Member since: {format(new Date(member.created_at), 'MMM d, yyyy')}</p>
                  {member.renewal_date && (
                    <p className="mt-1 text-sm text-gray-900">Renewal date: {format(new Date(member.renewal_date), 'MMM d, yyyy')}</p>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {member.interests.map(interest => (
                    <span key={interest.id} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                      {interest.name}
                    </span>
                  ))}
                </div>
              </div>

              {member.volunteer_hours.length > 0 && (
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Volunteer Hours</h3>
                  <div className="space-y-2">
                    {member.volunteer_hours.map(hours => (
                      <div key={hours.id} className="flex justify-between text-sm">
                        <span>{format(new Date(hours.date), 'MMM d, yyyy')}</span>
                        <span>{hours.hours} hours - {hours.activity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {member.meeting_attendance.length > 0 && (
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Meeting Attendance</h3>
                  <div className="space-y-2">
                    {member.meeting_attendance.map(attendance => (
                      <div key={attendance.id} className="flex justify-between text-sm">
                        <span>{attendance.meeting.name}</span>
                        <span>{format(new Date(attendance.meeting.date), 'MMM d, yyyy')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {member.payments.length > 0 && (
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Payment History</h3>
                  <div className="space-y-2">
                    {member.payments.map(payment => (
                      <div key={payment.id} className="flex justify-between text-sm">
                        <span>{format(new Date(payment.date), 'MMM d, yyyy')}</span>
                        <span>${payment.amount} - {payment.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const loadStatusOptions = async () => {
    try {
      const statuses = await getPickListValues(PICK_LIST_CATEGORIES.MEMBER_STATUSES);
      setStatusOptions(statuses.map(status => ({
        value: status.value,
        label: status.name
      })));
    } catch (error) {
      console.error('Error loading status options:', error);
    }
  };

  const loadPrecinctOptions = async () => {
    try {
      const { data: precincts, error } = await supabase
        .from('members')
        .select('precinct')
        .not('precinct', 'is', null)
        .order('precinct');

      if (error) throw error;

      // Get unique precinct values and format them for the select component
      const uniquePrecincts = Array.from(new Set(precincts.map(p => p.precinct)))
        .filter(Boolean) // Remove any null/undefined values
        .map(precinct => ({
          value: precinct,
          label: precinct
        }));

      setPrecinctOptions(uniquePrecincts);
    } catch (error) {
      console.error('Error loading precinct options:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load precinct options'
      });
    }
  };

  const filteredMembers = members.filter(member => {
    // Search term filter
    const matchesSearch = 
      member.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());

    // Interest filter
    const matchesInterests = selectedInterests.length === 0 || 
      selectedInterests.some(interestId => 
        member.interests.some(interest => interest.id === interestId)
      );

    // Status filter
    const matchesStatus = !selectedStatus || member.status === selectedStatus;

    // Precinct filter
    const matchesPrecinct = selectedPrecinct.length === 0 || 
      (member.precinct && selectedPrecinct.includes(member.precinct));

    return matchesSearch && matchesInterests && matchesStatus && matchesPrecinct;
  });

  const renderMemberList = (member: Member) => {
    const membershipType = membershipTypes.find(type => type.value === member.membership_type);
    
    return (
      <div key={member.id} className="flex items-center justify-between p-4 border-b border-gray-200 hover:bg-gray-50">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {member.first_name} {member.last_name}
          </h3>
          <p className="text-sm text-gray-600">{member.email}</p>
          <p className="text-sm text-gray-600">{formatPhoneNumber(member.phone)}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {member.interests.slice(0, 3).map(interest => (
              <span key={interest.id} className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                {interest.name}
              </span>
            ))}
            {member.interests.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                +{member.interests.length - 3} more
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => handleEditMember(member)}
            variant="outline"
            size="sm"
            className="p-2"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          {!member.is_admin && (
            <button
              onClick={() => handleDeleteMember(member.id)}
              className="text-red-600 hover:text-red-900 p-2"
              title="Delete member"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
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
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center"
            >
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </Button>
            <div className="flex items-center space-x-2 border border-gray-300 rounded-md">
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 ${viewMode === 'card' ? 'bg-gray-100' : ''}`}
                title="Card View"
              >
                <Grid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
                title="List View"
              >
                <List className="h-5 w-5" />
              </button>
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
              onClick={() => {
                setSelectedMember({
                  id: '',
                  first_name: '',
                  last_name: '',
                  email: '',
                  phone: '',
                  address: '',
                  city: '',
                  state: '',
                  zip: '',
                  membership_type: '',
                  status: 'pending',
                  is_admin: false,
                  created_at: new Date().toISOString(),
                  renewal_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                  interests: [],
                  volunteer_hours: [],
                  meeting_attendance: [],
                  payments: []
                });
                setIsCreating(true);
              }}
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

        {showFilters && (
          <Card className="mb-6">
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Interests</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {interestCategories.map(category => (
                      <div key={category.id}>
                        <h4 className="text-xs font-medium text-gray-500 mb-1">{category.name}</h4>
                        {category.interests.map(interest => (
                          <label key={interest.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={selectedInterests.includes(interest.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedInterests([...selectedInterests, interest.id]);
                                } else {
                                  setSelectedInterests(selectedInterests.filter(id => id !== interest.id));
                                }
                              }}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700">{interest.name}</span>
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Membership Status</h3>
                  <SelectField
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    options={[
                      { value: '', label: 'All Statuses' },
                      ...statusOptions
                    ]}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Precinct</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {precinctOptions.map(precinct => (
                      <label key={precinct.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedPrecinct.includes(precinct.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPrecinct([...selectedPrecinct, precinct.value]);
                            } else {
                              setSelectedPrecinct(selectedPrecinct.filter(p => p !== precinct.value));
                            }
                          }}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">{precinct.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading members...</p>
            </div>
          ) : (
            <>
              {viewMode === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredMembers
                    .slice((currentPage - 1) * membersPerPage, currentPage * membersPerPage)
                    .map(renderMemberCard)}
                </div>
              ) : (
                <Card>
                  <div className="divide-y divide-gray-200">
                    {filteredMembers
                      .slice((currentPage - 1) * membersPerPage, currentPage * membersPerPage)
                      .map(renderMemberList)}
                  </div>
                </Card>
              )}

              {/* Pagination */}
              {filteredMembers.length > membersPerPage && (
                <div className="flex justify-center mt-8">
                  <nav className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {Math.ceil(filteredMembers.length / membersPerPage)}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredMembers.length / membersPerPage)))}
                      disabled={currentPage === Math.ceil(filteredMembers.length / membersPerPage)}
                    >
                      Next
                    </Button>
                  </nav>
                </div>
              )}
            </>
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
                        type="tel"
                        value={selectedMember.phone}
                        onChange={(e) => setSelectedMember({...selectedMember, phone: e.target.value.replace(/\D/g, '')})}
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
                        type="tel"
                        value={selectedMember.phone}
                        onChange={(e) => setSelectedMember({...selectedMember, phone: e.target.value.replace(/\D/g, '')})}
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

        {/* Member Details Modal */}
        {expandedMembers.size > 0 && (
          <MemberDetailsModal
            member={members.find(m => expandedMembers.has(m.id))!}
            onClose={() => setExpandedMembers(new Set())}
          />
        )}
      </div>
    </Layout>
  );
};

export default AdminMembers; 