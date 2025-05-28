import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import TextField from '../components/Form/TextField';
import Button from '../components/UI/Button';
import Alert from '../components/UI/Alert';
import Badge from '../components/UI/Badge';
import { User, Edit, X, LogOut } from 'lucide-react';
import { getCurrentUser, getMemberByEmail, getMemberInterests, getMemberVolunteerHours, getMemberAttendance } from '../lib/supabase';
import { supabase } from '../lib/supabase';

interface MemberData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  status: string;
  membership_type: string;
  joined_date: string;
  is_admin: boolean;
  interests: string[];
  volunteer_hours: Array<{
  id: string;
  date: string;
  hours: number;
  description: string;
  }>;
  attendance: Array<{
    id: string;
    date: string;
    meeting_type: string;
  }>;
}

interface Attendance {
  id: string;
  meetings: {
    date: string;
    title: string;
  };
}

const AccountPage: React.FC = () => {
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'interests' | 'volunteer' | 'attendance'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<MemberData>>({});
  const [availableInterests, setAvailableInterests] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMemberData = async () => {
      try {
        const { user } = await getCurrentUser();
        console.log('Current user:', user);
        
        if (!user) {
          console.log('No user found, redirecting to login');
          navigate('/login');
          return;
        }
        
        console.log('Fetching member data for email:', user.email);
        const { member, error } = await getMemberByEmail(user.email || '');
        console.log('Member data response:', { member, error });
        
        if (error || !member) {
          console.error('Error fetching member data:', error);
          setAlert({
            type: 'error',
            message: 'Failed to load member data. Please try again.'
          });
          return;
        }
        
        // Fetch additional member data
        console.log('Fetching additional member data for ID:', member.id);
        const [interests, volunteerHours, attendance] = await Promise.all([
          getMemberInterests(member.id),
          getMemberVolunteerHours(member.id),
          getMemberAttendance(member.id)
        ]);
        console.log('Additional data:', { interests, volunteerHours, attendance });

        setMemberData({
          ...member,
          interests: interests.interests || [],
          volunteer_hours: volunteerHours.hours || [],
          attendance: attendance.attendance?.map(a => ({
            id: a.id,
            date: a.meetings.date,
            meeting_type: a.meetings.title
          })) || []
        });
      } catch (error) {
        console.error('Error:', error);
        setAlert({
          type: 'error',
          message: 'There was an error loading your account information. Please try again.'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMemberData();
  }, [navigate]);

  const fetchAvailableInterests = async () => {
    try {
      const { data, error } = await supabase
        .from('interests')
        .select('name')
        .order('name');

      if (error) throw error;

      setAvailableInterests(data.map(interest => interest.name));
    } catch (error) {
      console.error('Error fetching interests:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load available interests'
      });
    }
  };

  const getMembershipStatus = () => {
    if (!memberData) return null;

    const statusColors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <Badge
        color={statusColors[memberData.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}
      >
        {memberData.status.charAt(0).toUpperCase() + memberData.status.slice(1)}
      </Badge>
    );
  };

  const handleEdit = async () => {
    setEditedData(memberData || {});
    setIsEditing(true);
    
    if (activeTab === 'interests') {
      await fetchAvailableInterests();
    }
  };

  const handleSave = async () => {
    try {
      if (activeTab === 'profile') {
        const { error } = await supabase
          .from('members')
          .update({
            phone: editedData.phone,
            address: editedData.address,
            city: editedData.city,
            state: editedData.state,
            zip: editedData.zip
          })
          .eq('email', memberData?.email);

        if (error) throw error;
      } else if (activeTab === 'interests') {
        // First, get the interest IDs for the selected interest names
        const { data: interestsData, error: interestsError } = await supabase
          .from('interests')
          .select('id, name')
          .in('name', editedData.interests || []);

        if (interestsError) throw interestsError;

        // Delete existing interests
        const { error: deleteError } = await supabase
          .from('member_interests')
          .delete()
          .eq('member_id', memberData?.id);

        if (deleteError) throw deleteError;

        // Insert new interests using interest IDs
        if (interestsData && interestsData.length > 0) {
          const { error: insertError } = await supabase
            .from('member_interests')
            .insert(
              interestsData.map(interest => ({
                member_id: memberData?.id,
                interest_id: interest.id
              }))
            );

          if (insertError) throw insertError;
        }
      }

      setMemberData(prev => prev ? { ...prev, ...editedData } : null);
      setIsEditing(false);
      setAlert({
        type: 'success',
        message: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      setAlert({
        type: 'error',
        message: 'Failed to update profile'
      });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedData({});
  };

  const toggleInterest = (interest: string) => {
    if (!editedData.interests) {
      setEditedData({ ...editedData, interests: [interest] });
      return;
    }

    if (editedData.interests.includes(interest)) {
      setEditedData({
        ...editedData,
        interests: editedData.interests.filter(i => i !== interest)
      });
    } else {
      setEditedData({
        ...editedData,
        interests: [...editedData.interests, interest]
      });
    }
  };
    
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      setAlert({
        type: 'error',
        message: 'Failed to log out. Please try again.'
      });
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
              {!isEditing && (
                <Button onClick={handleEdit} variant="secondary" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h4>
                {isEditing ? (
                  <div className="space-y-4">
                    <TextField
                      label="Email"
                      value={memberData?.email || ''}
                      disabled
                    />
                    <TextField
                      label="Phone"
                      value={editedData.phone || ''}
                      onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                    />
                    <div className="flex space-x-4">
                      <Button onClick={handleSave} variant="primary">
                        Save Changes
                      </Button>
                      <Button onClick={handleCancel} variant="secondary">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">{memberData?.email}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Phone</dt>
                      <dd className="mt-1 text-sm text-gray-900">{memberData?.phone || 'Not provided'}</dd>
                    </div>
                  </dl>
                )}
              </div>
              
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Address</h4>
                {isEditing ? (
                  <div className="space-y-4">
                    <TextField
                      label="Street Address"
                      value={editedData.address || ''}
                      onChange={(e) => setEditedData({ ...editedData, address: e.target.value })}
                    />
                    <TextField
                      label="City"
                      value={editedData.city || ''}
                      onChange={(e) => setEditedData({ ...editedData, city: e.target.value })}
                    />
                    <TextField
                      label="State"
                      value={editedData.state || ''}
                      onChange={(e) => setEditedData({ ...editedData, state: e.target.value })}
                    />
                    <TextField
                      label="ZIP Code"
                      value={editedData.zip || ''}
                      onChange={(e) => setEditedData({ ...editedData, zip: e.target.value })}
                    />
                  </div>
                ) : (
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Street Address</dt>
                      <dd className="mt-1 text-sm text-gray-900">{memberData?.address || 'Not provided'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">City</dt>
                      <dd className="mt-1 text-sm text-gray-900">{memberData?.city || 'Not provided'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">State</dt>
                      <dd className="mt-1 text-sm text-gray-900">{memberData?.state || 'Not provided'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">ZIP Code</dt>
                      <dd className="mt-1 text-sm text-gray-900">{memberData?.zip || 'Not provided'}</dd>
                    </div>
                  </dl>
                )}
              </div>
            </div>
          </div>
        );

      case 'interests':
        return (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">My Interests</h3>
              {!isEditing && (
                <Button onClick={handleEdit} variant="secondary" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Interests
                </Button>
              )}
            </div>
            {isEditing ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableInterests.map((interest) => (
                    <div
                      key={interest}
                      className={`p-4 rounded-lg cursor-pointer transition-colors ${
                        editedData.interests?.includes(interest)
                          ? 'bg-primary-100 border-2 border-primary-500'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      }`}
                      onClick={() => toggleInterest(interest)}
                    >
                      <h4 className="font-medium text-gray-900">{interest}</h4>
                    </div>
                  ))}
                </div>
                <div className="flex space-x-4">
                  <Button onClick={handleSave} variant="primary">
                    Save Changes
                  </Button>
                  <Button onClick={handleCancel} variant="secondary">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {memberData?.interests.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {memberData.interests.map((interest) => (
                      <div key={interest} className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900">{interest}</h4>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No interests selected yet.</p>
                )}
              </>
            )}
          </div>
        );

      case 'volunteer':
        return (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Volunteer Hours</h3>
            {memberData?.volunteer_hours.length ? (
              <div className="space-y-4">
                {memberData.volunteer_hours.map((hours) => (
                  <div key={hours.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{hours.description}</h4>
                        <p className="text-sm text-gray-500">{new Date(hours.date).toLocaleDateString()}</p>
                      </div>
                      <Badge color="bg-blue-100 text-blue-800">
                        {hours.hours} hours
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No volunteer hours recorded yet.</p>
            )}
          </div>
        );

      case 'attendance':
        return (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Meeting Attendance</h3>
            {memberData?.attendance.length ? (
              <div className="space-y-4">
                {memberData.attendance.map((record) => (
                  <div key={record.id} className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900">{record.meeting_type}</h4>
                    <p className="text-sm text-gray-500">{new Date(record.date).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No meeting attendance recorded yet.</p>
            )}
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p>Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!memberData) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p>No member data found.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
          <div className="flex space-x-4">
            {memberData?.is_admin && (
              <Button
                onClick={() => navigate('/admin')}
                variant="primary"
              >
                Admin Dashboard
              </Button>
            )}
            <Button
              onClick={handleLogout}
              variant="secondary"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
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
        
        {/* Tabs */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
            <button
                className={`w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                activeTab === 'profile'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
                onClick={() => setActiveTab('profile')}
            >
              Profile
            </button>
            <button
                className={`w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                activeTab === 'interests'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
                onClick={() => setActiveTab('interests')}
            >
              Interests
            </button>
            <button
                className={`w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                activeTab === 'volunteer'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
                onClick={() => setActiveTab('volunteer')}
            >
              Volunteer Hours
            </button>
            <button
                className={`w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'attendance'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
                onClick={() => setActiveTab('attendance')}
            >
                Attendance
            </button>
          </nav>
        </div>
        
          {renderTabContent()}
        </div>
      </div>
    </Layout>
  );
};

export default AccountPage;