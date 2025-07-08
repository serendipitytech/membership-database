import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Alert from '../../components/UI/Alert';
import TextField from '../../components/Form/TextField';
import SelectField from '../../components/Form/SelectField';
import CheckboxGroup from '../../components/Form/CheckboxGroup';
import { Users, Search, Filter, Edit2, Clock, Calendar, Plus, Trash2, Download, ChevronDown, ChevronRight, Grid, List, HelpCircle, X, Home } from 'lucide-react';
import { format, parse, isValid, formatDistanceToNow } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { getPickListValues, PICK_LIST_CATEGORIES } from '../../lib/pickLists';
import {
  formatPhoneNumber,
  validateEmail,
  validatePhoneNumber,
  validateRequired,
  validateName,
  validateAddress,
  validateCity,
  validateZipCode
} from '../../lib/formValidation';
import { calculateMembershipStatus } from '../../utils/membershipStatus';

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
  membershipStatus?: 'Active' | 'Inactive' | 'Pending';
  precinct: string;
  tell_us_more: string;
  voter_id?: string;
  birthdate?: string;
  tshirt_size?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  special_skills?: string;
  health_issues?: string;
  household_id?: string;
  updated_at?: string;
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [householdCounts, setHouseholdCounts] = useState<{[householdId: string]: number}>({});
  const [sortField, setSortField] = useState<'last_name' | 'first_name' | 'email' | 'status' | 'updated_at'>('last_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedExportFields, setSelectedExportFields] = useState<string[]>(['first_name', 'last_name', 'email']);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv');
  const [exportFileName, setExportFileName] = useState('');

  // Available export fields
  const exportFields = [
    { id: 'first_name', label: 'First Name', category: 'Basic Info' },
    { id: 'last_name', label: 'Last Name', category: 'Basic Info' },
    { id: 'email', label: 'Email', category: 'Basic Info' },
    { id: 'phone', label: 'Phone', category: 'Basic Info' },
    { id: 'address', label: 'Address', category: 'Address' },
    { id: 'city', label: 'City', category: 'Address' },
    { id: 'state', label: 'State', category: 'Address' },
    { id: 'zip', label: 'ZIP Code', category: 'Address' },
    { id: 'precinct', label: 'Precinct', category: 'Political' },
    { id: 'voter_id', label: 'Voter ID', category: 'Political' },
    { id: 'membership_type', label: 'Membership Type', category: 'Membership' },
    { id: 'membershipStatus', label: 'Membership Status', category: 'Membership' },
    { id: 'created_at', label: 'Join Date', category: 'Membership' },
    { id: 'renewal_date', label: 'Renewal Date', category: 'Membership' },
    { id: 'birthdate', label: 'Birthdate', category: 'Personal' },
    { id: 'tshirt_size', label: 'T-Shirt Size', category: 'Personal' },
    { id: 'emergency_contact_name', label: 'Emergency Contact Name', category: 'Emergency' },
    { id: 'emergency_contact_phone', label: 'Emergency Contact Phone', category: 'Emergency' },
    { id: 'emergency_contact_relationship', label: 'Emergency Contact Relationship', category: 'Emergency' },
    { id: 'special_skills', label: 'Special Skills', category: 'Personal' },
    { id: 'health_issues', label: 'Health Issues', category: 'Personal' },
    { id: 'tell_us_more', label: 'Tell Us More', category: 'Personal' },
    { id: 'is_admin', label: 'Admin Status', category: 'System' },
    { id: 'household_id', label: 'Household ID', category: 'System' },
    { id: 'updated_at', label: 'Last Updated', category: 'System' }
  ];

  // Group fields by category
  const groupedFields = exportFields.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, typeof exportFields>);

  const sortOptions = [
    { value: 'last_name', label: 'Last Name' },
    { value: 'first_name', label: 'First Name' },
    { value: 'email', label: 'Email' },
    { value: 'status', label: 'Status' },
    { value: 'updated_at', label: 'Last Updated' },
  ];

  const usStates = [
    { value: 'AL', label: 'Alabama' },
    { value: 'AK', label: 'Alaska' },
    { value: 'AZ', label: 'Arizona' },
    { value: 'AR', label: 'Arkansas' },
    { value: 'CA', label: 'California' },
    { value: 'CO', label: 'Colorado' },
    { value: 'CT', label: 'Connecticut' },
    { value: 'DE', label: 'Delaware' },
    { value: 'FL', label: 'Florida' },
    { value: 'GA', label: 'Georgia' },
    { value: 'HI', label: 'Hawaii' },
    { value: 'ID', label: 'Idaho' },
    { value: 'IL', label: 'Illinois' },
    { value: 'IN', label: 'Indiana' },
    { value: 'IA', label: 'Iowa' },
    { value: 'KS', label: 'Kansas' },
    { value: 'KY', label: 'Kentucky' },
    { value: 'LA', label: 'Louisiana' },
    { value: 'ME', label: 'Maine' },
    { value: 'MD', label: 'Maryland' },
    { value: 'MA', label: 'Massachusetts' },
    { value: 'MI', label: 'Michigan' },
    { value: 'MN', label: 'Minnesota' },
    { value: 'MS', label: 'Mississippi' },
    { value: 'MO', label: 'Missouri' },
    { value: 'MT', label: 'Montana' },
    { value: 'NE', label: 'Nebraska' },
    { value: 'NV', label: 'Nevada' },
    { value: 'NH', label: 'New Hampshire' },
    { value: 'NJ', label: 'New Jersey' },
    { value: 'NM', label: 'New Mexico' },
    { value: 'NY', label: 'New York' },
    { value: 'NC', label: 'North Carolina' },
    { value: 'ND', label: 'North Dakota' },
    { value: 'OH', label: 'Ohio' },
    { value: 'OK', label: 'Oklahoma' },
    { value: 'OR', label: 'Oregon' },
    { value: 'PA', label: 'Pennsylvania' },
    { value: 'RI', label: 'Rhode Island' },
    { value: 'SC', label: 'South Carolina' },
    { value: 'SD', label: 'South Dakota' },
    { value: 'TN', label: 'Tennessee' },
    { value: 'TX', label: 'Texas' },
    { value: 'UT', label: 'Utah' },
    { value: 'VT', label: 'Vermont' },
    { value: 'VA', label: 'Virginia' },
    { value: 'WA', label: 'Washington' },
    { value: 'WV', label: 'West Virginia' },
    { value: 'WI', label: 'Wisconsin' },
    { value: 'WY', label: 'Wyoming' }
  ];

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

  const loadStatusOptions = async () => {
    // Use our calculated statuses directly
    setStatusOptions([
      { value: '', label: 'All Statuses' },
      { value: 'active', label: 'Active' },
      { value: 'expiring_soon', label: 'Expiring Soon' },
      { value: 'expired', label: 'Expired' },
      { value: 'pending', label: 'Pending' }
    ]);
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
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        await Promise.all([
          fetchMembers(),
          loadStatusOptions(),
          loadPrecinctOptions(),
          fetchInterestCategories(),
          loadMembershipTypes()
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchMembers = async () => {
    try {
      setIsLoading(true);
      
      // Fetch members with their interests, payments, and household_id
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select(`
          *,
          member_interests (
            interest:interests (
              id,
              name,
              category:interest_categories (
                id,
                name
              )
            )
          ),
          payments (
            id,
            amount,
            date,
            status
          )
        `);

      if (membersError) throw membersError;

      // Count members per household
      const counts: {[householdId: string]: number} = {};
      membersData.forEach((m: any) => {
        if (m.household_id) {
          counts[m.household_id] = (counts[m.household_id] || 0) + 1;
        }
      });

      // Transform the data to match our Member interface
      const membersWithInterests = membersData.map(member => {
        // Calculate status for each member
        const status = calculateMembershipStatus(member.payments || []);
        console.log(`Member ${member.first_name} ${member.last_name} status:`, status); // Debug log

        return {
          ...member,
          interests: member.member_interests.map((mi: any) => ({
            id: mi.interest.id,
            name: mi.interest.name,
            category: mi.interest.category
          })),
          membershipStatus: status // Set the calculated status
        };
      });

      console.log('Fetched membersData:', membersData);
      setMembers(membersWithInterests);
      setHouseholdCounts(counts);
      console.log('Household counts:', counts);
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

  const handleCardClick = (member: Member) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleEditMember = (member: Member) => {
    setSelectedMember({
      ...member,
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      email: member.email || '',
      phone: member.phone || '',
      address: member.address || '',
      city: member.city || '',
      state: member.state || '',
      zip: member.zip || '',
      precinct: member.precinct || '',
      tell_us_more: member.tell_us_more || '',
      interests: member.interests || []
    });
    setShowEditModal(true);
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    try {
      // First update the member's basic information
      const { error: memberError } = await supabase
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
          precinct: selectedMember.precinct,
          tell_us_more: selectedMember.tell_us_more
        })
        .eq('id', selectedMember.id);

      if (memberError) throw memberError;

      // Then handle the interests
      // First, delete all existing member_interests
      const { error: deleteError } = await supabase
        .from('member_interests')
        .delete()
        .eq('member_id', selectedMember.id);

      if (deleteError) throw deleteError;

      // Then insert the new interests
      if (selectedMember.interests.length > 0) {
        const memberInterests = selectedMember.interests.map(interest => ({
          member_id: selectedMember.id,
          interest_id: interest.id
        }));

        const { error: insertError } = await supabase
          .from('member_interests')
          .insert(memberInterests);

        if (insertError) throw insertError;
      }

      // Refresh the members list
      await fetchMembers();
      setShowEditModal(false);
      setAlert({
        type: 'success',
        message: 'Member updated successfully'
      });
    } catch (error) {
      console.error('Error updating member:', error);
      setAlert({
        type: 'error',
        message: 'Failed to update member. Please try again.'
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

  const handleExportClick = () => {
    setExportFileName(`members_export_${format(new Date(), 'yyyy-MM-dd')}`);
    setShowExportModal(true);
  };

  const handleFieldToggle = (fieldId: string) => {
    setSelectedExportFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleSelectAllFields = () => {
    setSelectedExportFields(exportFields.map(field => field.id));
  };

  const handleDeselectAllFields = () => {
    setSelectedExportFields([]);
  };

  const getFieldValue = (member: Member, fieldId: string): string => {
    switch (fieldId) {
      case 'first_name':
        return member.first_name || '';
      case 'last_name':
        return member.last_name || '';
      case 'email':
        return member.email || '';
      case 'phone':
        return member.phone || '';
      case 'address':
        return member.address || '';
      case 'city':
        return member.city || '';
      case 'state':
        return member.state || '';
      case 'zip':
        return member.zip || '';
      case 'precinct':
        return member.precinct || '';
      case 'voter_id':
        return member.voter_id || '';
      case 'membership_type':
        return member.membership_type || '';
      case 'membershipStatus':
        return member.membershipStatus || '';
      case 'created_at':
        return member.created_at ? format(new Date(member.created_at), 'MM/dd/yyyy') : '';
      case 'renewal_date':
        return member.renewal_date ? format(new Date(member.renewal_date), 'MM/dd/yyyy') : '';
      case 'birthdate':
        return member.birthdate ? format(new Date(member.birthdate), 'MM/dd/yyyy') : '';
      case 'tshirt_size':
        return member.tshirt_size || '';
      case 'emergency_contact_name':
        return member.emergency_contact_name || '';
      case 'emergency_contact_phone':
        return member.emergency_contact_phone || '';
      case 'emergency_contact_relationship':
        return member.emergency_contact_relationship || '';
      case 'special_skills':
        return member.special_skills || '';
      case 'health_issues':
        return member.health_issues || '';
      case 'tell_us_more':
        return member.tell_us_more || '';
      case 'is_admin':
        return member.is_admin ? 'Yes' : 'No';
      case 'household_id':
        return member.household_id || '';
      case 'updated_at':
        return member.updated_at ? format(new Date(member.updated_at), 'MM/dd/yyyy') : '';
      default:
        return '';
    }
  };

  const exportToFile = async () => {
    if (selectedExportFields.length === 0) {
      setAlert({
        type: 'error',
        message: 'Please select at least one field to export'
      });
      return;
    }

    try {
      // Get the filtered and sorted members
      const membersToExport = sortedMembers;

      // Get field labels for headers
      const fieldLabels = selectedExportFields.map(fieldId => {
        const field = exportFields.find(f => f.id === fieldId);
        return field ? field.label : fieldId;
      });

      // Prepare data
      const exportData = membersToExport.map(member => 
        selectedExportFields.map(fieldId => getFieldValue(member, fieldId))
      );

      if (exportFormat === 'csv') {
        // Export as CSV
        const csvContent = [
          fieldLabels.join(','),
          ...exportData.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${exportFileName}.csv`;
        link.click();
      } else {
        // Export as Excel
        const XLSX = await import('xlsx');
        
        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([fieldLabels, ...exportData]);
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Members');
        
        // Write file
        XLSX.writeFile(wb, `${exportFileName}.xlsx`);
      }

      setShowExportModal(false);
      setAlert({
        type: 'success',
        message: `Exported ${membersToExport.length} members to ${exportFormat.toUpperCase()}`
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      setAlert({
        type: 'error',
        message: 'Failed to export data'
      });
    }
  };

  // Legacy function for backward compatibility
  const exportToCSV = () => {
    handleExportClick();
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expiring_soon':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      selectedInterests.every(interestId => 
        member.interests.some(interest => interest.id === interestId)
      );

    // Status filter - using the calculated membershipStatus (case-insensitive)
    const matchesStatus = !selectedStatus || 
      member.membershipStatus.toLowerCase() === selectedStatus.toLowerCase();

    // Precinct filter
    const matchesPrecinct = selectedPrecinct.length === 0 || 
      (member.precinct && selectedPrecinct.includes(member.precinct));

    return matchesSearch && matchesInterests && matchesStatus && matchesPrecinct;
  });

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    let aValue = a[sortField] || '';
    let bValue = b[sortField] || '';
    if (sortField === 'status') {
      aValue = (a.membershipStatus || '').toLowerCase();
      bValue = (b.membershipStatus || '').toLowerCase();
    } else {
      aValue = (aValue || '').toLowerCase();
      bValue = (bValue || '').toLowerCase();
    }
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const renderMemberCard = (member: Member) => {
    const interests = member.interests || [];
    const displayInterests = interests.length > 0 ? interests.slice(0, 3) : [];
    const hasMoreInterests = interests.length > 3;

    console.log('Rendering card for member:', member.id, 'household_id:', member.household_id, 'count:', householdCounts[member.household_id]);

    return (
      <Card 
        key={member.id} 
        className="p-6 relative cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => handleCardClick(member)}
      >
        <div className="absolute top-2 right-2 flex space-x-2" onClick={(e) => e.stopPropagation()}>
          {/* Household indicator */}
          {member.household_id && householdCounts[member.household_id] > 1 && (
            <div className="flex items-center space-x-1 text-blue-700" title="Household">
              <Home className="h-5 w-5" />
              <span className="font-semibold text-xs">{householdCounts[member.household_id]}</span>
            </div>
          )}
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
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">
              {member.first_name} {member.last_name}
            </h3>
            <div className="mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(member.membershipStatus || 'Pending')}`}>
                {member.membershipStatus || 'Pending'}
              </span>
            </div>
          </div>
          
          <div className="space-y-2 text-sm text-gray-600">
            {member.email && (
              <div>{member.email}</div>
            )}
            {member.phone && (
              <div>{formatPhoneNumber(member.phone)}</div>
            )}
            {displayInterests.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {displayInterests.map((interest, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                  >
                    {interest.name}
                  </span>
                ))}
                {hasMoreInterests && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                    +{interests.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
          
          {(() => {
            let display = 'Never updated';
            if (member.updated_at) {
              try {
                const parsed = new Date(member.updated_at);
                if (isValid(parsed)) {
                  display = `Last updated ${formatDistanceToNow(parsed, { addSuffix: true })}`;
                } else {
                  console.warn('Invalid parsed date for updated_at:', member.updated_at, parsed);
                }
              } catch (err) {
                console.error('Error parsing updated_at:', member.updated_at, err);
              }
            }
            return (
              <div className="text-xs text-gray-500 mt-1">{display}</div>
            );
          })()}
        </div>
      </Card>
    );
  };

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
        <div className="flex items-center justify-between mb-8">
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
              onClick={handleExportClick}
              className="flex items-center"
            >
              <Download className="h-5 w-5 mr-2" />
              Export
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
                  state: 'FL',
                  zip: '',
                  membership_type: '',
                  status: 'pending',
                  is_admin: false,
                  created_at: new Date().toISOString(),
                  renewal_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                  interests: [],
                  volunteer_hours: [],
                  meeting_attendance: [],
                  payments: [],
                  precinct: '',
                  tell_us_more: ''
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
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-sm font-medium text-gray-700">Membership Status</h3>
                    <div className="relative group">
                      <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                      <div className="absolute left-0 mt-2 w-64 p-2 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                        <div className="text-xs text-gray-600 space-y-1">
                          <p><strong>Active:</strong> Payment within last 11 months</p>
                          <p><strong>Expiring Soon:</strong> Payment 11-12 months ago</p>
                          <p><strong>Expired:</strong> No payment in over 12 months</p>
                          <p><strong>Pending:</strong> No payment history</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <SelectField
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    options={statusOptions}
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

        <div className="flex items-center justify-between mb-4">
          <div>
            <label className="mr-2 text-sm font-medium">Sort by:</label>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={sortField}
              onChange={e => setSortField(e.target.value as any)}
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              className="ml-2 text-sm text-gray-600 hover:text-gray-900"
              onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
              title={`Sort ${sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}
              type="button"
            >
              {sortDirection === 'asc' ? '▲' : '▼'}
            </button>
          </div>
        </div>

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
                  {sortedMembers
                    .slice((currentPage - 1) * membersPerPage, currentPage * membersPerPage)
                    .map(renderMemberCard)}
                </div>
              ) : (
                <Card>
                  <div className="divide-y divide-gray-200">
                    {sortedMembers
                      .slice((currentPage - 1) * membersPerPage, currentPage * membersPerPage)
                      .map(renderMemberList)}
                  </div>
                </Card>
              )}

              {/* Pagination */}
              {sortedMembers.length > membersPerPage && (
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
                      Page {currentPage} of {Math.ceil(sortedMembers.length / membersPerPage)}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(sortedMembers.length / membersPerPage)))}
                      disabled={currentPage === Math.ceil(sortedMembers.length / membersPerPage)}
                    >
                      Next
                    </Button>
                  </nav>
                </div>
              )}
            </>
          )}
        </div>

        {isModalOpen && selectedMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedMember.first_name} {selectedMember.last_name}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Email</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedMember.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Phone</label>
                      <p className="mt-1 text-sm text-gray-900">{formatPhoneNumber(selectedMember.phone)}</p>
                    </div>
                    {selectedMember.address && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Address</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedMember.address}</p>
                      </div>
                    )}
                    {(selectedMember.city || selectedMember.state || selectedMember.zip) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Location</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {[selectedMember.city, selectedMember.state, selectedMember.zip]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Membership Details</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Status</label>
                      <p className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedMember.membershipStatus || 'Pending')}`}>
                          {selectedMember.membershipStatus || 'Pending'}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Membership Type</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedMember.membership_type}</p>
                    </div>
                    {selectedMember.precinct && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Precinct</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedMember.precinct}</p>
                      </div>
                    )}
                    {selectedMember.voter_id && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Voter ID</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedMember.voter_id}</p>
                      </div>
                    )}
                    {selectedMember.birthdate && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Birthdate</label>
                        <p className="mt-1 text-sm text-gray-900">{format(parse(selectedMember.birthdate, 'yyyy-MM-dd', new Date()), 'MMMM d, yyyy')}</p>
                      </div>
                    )}
                    {selectedMember.tshirt_size && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">T-Shirt Size</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedMember.tshirt_size}</p>
                      </div>
                    )}
                    {selectedMember.created_at && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Member Since</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {format(new Date(selectedMember.created_at), 'MMMM d, yyyy')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h3>
                  <div className="space-y-3">
                    {selectedMember.emergency_contact_name && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Name</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedMember.emergency_contact_name}</p>
                      </div>
                    )}
                    {selectedMember.emergency_contact_phone && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Phone</label>
                        <p className="mt-1 text-sm text-gray-900">{formatPhoneNumber(selectedMember.emergency_contact_phone)}</p>
                      </div>
                    )}
                    {selectedMember.emergency_contact_relationship && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Relationship</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedMember.emergency_contact_relationship}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
                  <div className="space-y-3">
                    {selectedMember.tell_us_more && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Additional Information</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedMember.tell_us_more}</p>
                      </div>
                    )}
                    {selectedMember.special_skills && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Special Skills</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedMember.special_skills}</p>
                      </div>
                    )}
                    {selectedMember.health_issues && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Health Issues</label>
                        <p className="mt-1 text-sm text-gray-900">{selectedMember.health_issues}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedMember.interests && selectedMember.interests.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedMember.interests.map((interest) => (
                      <span
                        key={interest.id}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                      >
                        {interest.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedMember.volunteer_hours && selectedMember.volunteer_hours.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Volunteer Hours</h3>
                  <div className="space-y-2">
                    {selectedMember.volunteer_hours.map((hours, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{format(new Date(hours.date), 'MMM d, yyyy')}</span>
                        <span>{hours.hours} hours - {hours.activity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedMember.meeting_attendance && selectedMember.meeting_attendance.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Meeting Attendance</h3>
                  <div className="space-y-2">
                    {selectedMember.meeting_attendance.map((attendance, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{attendance.meeting.name}</span>
                        <span>{format(new Date(attendance.meeting.date), 'MMM d, yyyy')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedMember.payments && selectedMember.payments.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Payment History</h3>
                  <div className="space-y-2">
                    {selectedMember.payments.map((payment, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{format(new Date(payment.date), 'MMM d, yyyy')}</span>
                        <span>${payment.amount} - {payment.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end space-x-3">
                <Button variant="outline" onClick={() => handleEditMember(selectedMember)}>
                  Edit Member
                </Button>
                <Button onClick={() => setIsModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {showEditModal && selectedMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Edit Member</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleUpdateMember} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <TextField
                    label="First Name"
                    name="first_name"
                    value={selectedMember.first_name || ''}
                    onChange={(e) => setSelectedMember({...selectedMember, first_name: e.target.value})}
                    required
                  />
                  <TextField
                    label="Last Name"
                    name="last_name"
                    value={selectedMember.last_name || ''}
                    onChange={(e) => setSelectedMember({...selectedMember, last_name: e.target.value})}
                    required
                  />
                  <TextField
                    label="Email"
                    name="email"
                    type="email"
                    value={selectedMember.email || ''}
                    onChange={(e) => setSelectedMember({...selectedMember, email: e.target.value})}
                    required
                  />
                  <TextField
                    label="Birthdate"
                    name="birthdate"
                    type="date"
                    value={selectedMember.birthdate ? new Date(selectedMember.birthdate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setSelectedMember({...selectedMember, birthdate: e.target.value})}
                  />
                  <TextField
                    label="Phone"
                    name="phone"
                    type="tel"
                    value={formatPhoneNumber(selectedMember.phone || '')}
                    onChange={(e) => {
                      // Only store digits
                      const digits = e.target.value.replace(/\D/g, '');
                      if (digits.length <= 10) {  // Only allow up to 10 digits
                        setSelectedMember({...selectedMember, phone: digits});
                        setFieldErrors(prev => ({
                          ...prev,
                          phone: digits.length === 10 ? '' : 'Please enter a valid 10-digit phone number'
                        }));
                      }
                    }}
                    required
                    error={fieldErrors.phone}
                    placeholder="(555) 555-5555"
                  />
                  <TextField
                    label="Address"
                    name="address"
                    value={selectedMember.address || ''}
                    onChange={(e) => setSelectedMember({...selectedMember, address: e.target.value})}
                  />
                  <TextField
                    label="City"
                    name="city"
                    value={selectedMember.city || ''}
                    onChange={(e) => setSelectedMember({...selectedMember, city: e.target.value})}
                  />
                  <SelectField
                    label="State"
                    id="state"
                    value={selectedMember.state || 'FL'}
                    onChange={e => {
                      setSelectedMember({ ...selectedMember, state: e.target.value });
                      setFieldErrors(prev => ({ ...prev, state: '' }));
                    }}
                    options={usStates}
                    required
                    error={fieldErrors.state}
                  />
                  <TextField
                    label="ZIP"
                    name="zip"
                    value={selectedMember.zip || ''}
                    onChange={(e) => {
                      // Only allow 5 digits
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 5);
                      setSelectedMember({ ...selectedMember, zip: digits });
                      setFieldErrors(prev => ({ ...prev, zip: '' }));
                    }}
                    required
                    error={fieldErrors.zip}
                    placeholder="12345"
                  />
                  <TextField
                    label="Precinct"
                    name="precinct"
                    value={selectedMember.precinct || ''}
                    onChange={(e) => setSelectedMember({...selectedMember, precinct: e.target.value})}
                  />
                  <TextField
                    label="Voter ID"
                    name="voter_id"
                    value={selectedMember.voter_id || ''}
                    onChange={(e) => setSelectedMember({...selectedMember, voter_id: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interests
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {interestCategories.map(category => (
                      <div key={category.id}>
                        <h4 className="text-xs font-medium text-gray-500 mb-1">{category.name}</h4>
                        {category.interests.map(interest => (
                          <label key={interest.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={selectedMember.interests.some(i => i.id === interest.id)}
                              onChange={(e) => {
                                const newInterests = e.target.checked
                                  ? [...selectedMember.interests, interest]
                                  : selectedMember.interests.filter(i => i.id !== interest.id);
                                setSelectedMember({...selectedMember, interests: newInterests});
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Information
                  </label>
                  <textarea
                    name="tell_us_more"
                    value={selectedMember.tell_us_more || ''}
                    onChange={(e) => setSelectedMember({...selectedMember, tell_us_more: e.target.value})}
                    rows={4}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_admin"
                    checked={selectedMember.is_admin}
                    onChange={(e) => setSelectedMember({...selectedMember, is_admin: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="is_admin" className="text-sm font-medium text-gray-700">
                    Grant Admin Privileges
                  </label>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isCreating && selectedMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add Member</h2>
                <button
                  onClick={() => setIsCreating(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  // Validate all fields
                  const errors: Record<string, string> = {};
                  if (!validateName(selectedMember.first_name)) errors.first_name = 'Please enter a valid first name';
                  if (!validateName(selectedMember.last_name)) errors.last_name = 'Please enter a valid last name';
                  if (!validateEmail(selectedMember.email)) errors.email = 'Please enter a valid email address';
                  if (!validatePhoneNumber(selectedMember.phone)) errors.phone = 'Please enter a valid 10-digit phone number';
                  if (!validateAddress(selectedMember.address)) errors.address = 'Please enter a valid address';
                  if (!validateCity(selectedMember.city)) errors.city = 'Please enter a valid city name';
                  if (!validateRequired(selectedMember.state)) errors.state = 'State is required';
                  if (!validateZipCode(selectedMember.zip)) errors.zip = 'Please enter a valid 5-digit ZIP code';
                  if (!validateRequired(selectedMember.membership_type)) errors.membership_type = 'Membership type is required';
                  setFieldErrors(errors);
                  if (Object.keys(errors).length > 0) return;
                  handleCreateMember(e);
                }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <TextField
                    label="First Name"
                    name="first_name"
                    value={selectedMember.first_name || ''}
                    onChange={e => {
                      setSelectedMember({ ...selectedMember, first_name: e.target.value });
                      setFieldErrors(prev => ({ ...prev, first_name: '' }));
                    }}
                    required
                    error={fieldErrors.first_name}
                  />
                  <TextField
                    label="Last Name"
                    name="last_name"
                    value={selectedMember.last_name || ''}
                    onChange={e => {
                      setSelectedMember({ ...selectedMember, last_name: e.target.value });
                      setFieldErrors(prev => ({ ...prev, last_name: '' }));
                    }}
                    required
                    error={fieldErrors.last_name}
                  />
                  <TextField
                    label="Email"
                    name="email"
                    type="email"
                    value={selectedMember.email || ''}
                    onChange={e => {
                      setSelectedMember({ ...selectedMember, email: e.target.value });
                      setFieldErrors(prev => ({ ...prev, email: '' }));
                    }}
                    required
                    error={fieldErrors.email}
                  />
                  <TextField
                    label="Birthdate"
                    name="birthdate"
                    type="date"
                    value={selectedMember.birthdate ? new Date(selectedMember.birthdate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setSelectedMember({...selectedMember, birthdate: e.target.value})}
                  />
                  <TextField
                    label="Phone"
                    name="phone"
                    type="tel"
                    value={formatPhoneNumber(selectedMember.phone || '')}
                    onChange={(e) => {
                      // Only store digits
                      const digits = e.target.value.replace(/\D/g, '');
                      if (digits.length <= 10) {  // Only allow up to 10 digits
                        setSelectedMember({...selectedMember, phone: digits});
                        setFieldErrors(prev => ({
                          ...prev,
                          phone: digits.length === 10 ? '' : 'Please enter a valid 10-digit phone number'
                        }));
                      }
                    }}
                    required
                    error={fieldErrors.phone}
                    placeholder="(555) 555-5555"
                  />
                  <TextField
                    label="Address"
                    name="address"
                    value={selectedMember.address || ''}
                    onChange={e => {
                      setSelectedMember({ ...selectedMember, address: e.target.value });
                      setFieldErrors(prev => ({ ...prev, address: '' }));
                    }}
                    required
                    error={fieldErrors.address}
                  />
                  <TextField
                    label="City"
                    name="city"
                    value={selectedMember.city || ''}
                    onChange={e => {
                      setSelectedMember({ ...selectedMember, city: e.target.value });
                      setFieldErrors(prev => ({ ...prev, city: '' }));
                    }}
                    required
                    error={fieldErrors.city}
                  />
                  <SelectField
                    label="State"
                    id="state"
                    value={selectedMember.state || 'FL'}
                    onChange={e => {
                      setSelectedMember({ ...selectedMember, state: e.target.value });
                      setFieldErrors(prev => ({ ...prev, state: '' }));
                    }}
                    options={usStates}
                    required
                    error={fieldErrors.state}
                  />
                  <TextField
                    label="ZIP"
                    name="zip"
                    value={selectedMember.zip || ''}
                    onChange={(e) => {
                      // Only allow 5 digits
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 5);
                      setSelectedMember({ ...selectedMember, zip: digits });
                      setFieldErrors(prev => ({ ...prev, zip: '' }));
                    }}
                    required
                    error={fieldErrors.zip}
                    placeholder="12345"
                  />
                  <SelectField
                    label="Membership Type"
                    id="membership_type"
                    value={selectedMember.membership_type || ''}
                    onChange={e => {
                      setSelectedMember({ ...selectedMember, membership_type: e.target.value });
                      setFieldErrors(prev => ({ ...prev, membership_type: '' }));
                    }}
                    options={membershipTypes}
                    required
                    error={fieldErrors.membership_type}
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Add Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Export Members</h2>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Export Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-blue-900 mb-2">Export Summary</h3>
                  <p className="text-blue-700">
                    Exporting <strong>{sortedMembers.length}</strong> members 
                    {searchTerm && ` matching "${searchTerm}"`}
                    {selectedStatus && ` with status "${selectedStatus}"`}
                    {selectedInterests.length > 0 && ` with selected interests`}
                    {selectedPrecinct.length > 0 && ` from selected precincts`}
                  </p>
                </div>

                {/* Export Format */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Export Format</h3>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="csv"
                        checked={exportFormat === 'csv'}
                        onChange={(e) => setExportFormat(e.target.value as 'csv' | 'xlsx')}
                        className="mr-2"
                      />
                      CSV
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="xlsx"
                        checked={exportFormat === 'xlsx'}
                        onChange={(e) => setExportFormat(e.target.value as 'csv' | 'xlsx')}
                        className="mr-2"
                      />
                      Excel
                    </label>
                  </div>
                </div>

                {/* File Name */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">File Name</h3>
                  <input
                    type="text"
                    value={exportFileName}
                    onChange={(e) => setExportFileName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter file name"
                  />
                </div>

                {/* Field Selection */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-medium text-gray-900">Select Fields to Export</h3>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={handleSelectAllFields}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllFields}
                        className="text-sm text-gray-600 hover:text-gray-800"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                    {Object.entries(groupedFields).map(([category, fields]) => (
                      <div key={category} className="space-y-2">
                        <h4 className="font-medium text-gray-700 text-sm uppercase tracking-wide">
                          {category}
                        </h4>
                        <div className="space-y-1">
                          {fields.map((field) => (
                            <label key={field.id} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedExportFields.includes(field.id)}
                                onChange={() => handleFieldToggle(field.id)}
                                className="mr-2"
                              />
                              <span className="text-sm">{field.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowExportModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={exportToFile}
                    disabled={selectedExportFields.length === 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Export {exportFormat.toUpperCase()}
                  </button>
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