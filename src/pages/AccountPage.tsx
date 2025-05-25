import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import TextField from '../components/Form/TextField';
import Alert from '../components/UI/Alert';
import Badge from '../components/UI/Badge';
import { 
  getCurrentUser, 
  getMemberByEmail, 
  updateMember,
  getMemberInterests,
  updateMemberInterests,
  getInterestCategories,
  getMemberVolunteerHours,
  getMemberAttendance,
  supabase
} from '../lib/supabase';
import { User, Edit, Save, X, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface MemberData {
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
  joined_date: string;
  renewal_date: string;
}

interface VolunteerHour {
  id: string;
  member_id: string;
  date: string;
  hours: number;
  description: string;
}

interface MeetingAttendance {
  id: string;
  member_id: string;
  meeting_id: string;
  created_at: string;
  meetings: {
    id: string;
    title: string;
    date: string;
    location: string;
  };
}

const AccountPage: React.FC = () => {
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<MemberData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [memberInterests, setMemberInterests] = useState<string[]>([]);
  const [interestCategories, setInterestCategories] = useState<any[]>([]);
  const [volunteerHours, setVolunteerHours] = useState<VolunteerHour[]>([]);
  const [attendance, setAttendance] = useState<MeetingAttendance[]>([]);
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMemberData = async () => {
      try {
        // Check if user is authenticated
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          navigate('/login');
          return;
        }
        
        const { user, error: userError } = await getCurrentUser();
        
        if (userError || !user) {
          console.error('Authentication error:', userError);
          navigate('/login');
          return;
        }
        
        const { member, error: memberError } = await getMemberByEmail(user.email || '');
        
        if (memberError || !member) {
          console.error('Member data error:', memberError);
          setIsLoading(false);
          return;
        }
        
        setMemberData(member);
        setEditedData(member);
        
        // Fetch member interests
        const { interests } = await getMemberInterests(member.id);
        setMemberInterests(interests);
        
        // Fetch interest categories
        const { categories } = await getInterestCategories();
        setInterestCategories(categories || []);
        
        // Fetch volunteer hours
        const { hours } = await getMemberVolunteerHours(member.id);
        setVolunteerHours(hours || []);
        
        // Fetch meeting attendance
        const { attendance: attendanceData } = await getMemberAttendance(member.id);
        setAttendance(attendanceData || []);
        
      } catch (error) {
        console.error('Error fetching member data:', error);
        setAlert({
          type: 'error',
          message: 'Error loading member data. Please try again later.'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMemberData();
  }, [navigate]);

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing, reset form
      setEditedData(memberData || {});
    }
    setIsEditing(!isEditing);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!memberData) return;
    
    setIsSubmitting(true);
    setAlert(null);
    
    try {
      const { member, error } = await updateMember(memberData.id, editedData);
      
      if (error) {
        throw error;
      }
      
      if (member) {
        setMemberData(member);
      }
      
      setAlert({
        type: 'success',
        message: 'Profile updated successfully'
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error('Update error:', error);
      setAlert({
        type: 'error',
        message: 'There was an error updating your profile. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInterestChange = async (interestId: string) => {
    if (!memberData) return;
    
    let updatedInterests = [...memberInterests];
    
    if (updatedInterests.includes(interestId)) {
      updatedInterests = updatedInterests.filter(id => id !== interestId);
    } else {
      updatedInterests.push(interestId);
    }
    
    setMemberInterests(updatedInterests);
    
    try {
      await updateMemberInterests(memberData.id, updatedInterests);
    } catch (error) {
      console.error('Error updating interests:', error);
      setAlert({
        type: 'error',
        message: 'Failed to update interests. Please try again.'
      });
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const getMembershipStatus = () => {
    if (!memberData) return 'Unknown';
    
    switch (memberData.status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'expired':
        return <Badge variant="danger">Expired</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      default:
        return <Badge variant="info">Unknown</Badge>;
    }
  };

  const totalVolunteerHours = volunteerHours.reduce((total, record) => total + record.hours, 0);

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-pulse flex flex-col items-center">
              <div className="rounded-full bg-gray-200 h-32 w-32 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
              <div className="h-48 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!memberData) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <Alert
            type="error"
            message="We couldn't find your membership information. Please contact support for assistance."
          />
          <div className="mt-6 text-center">
            <Button 
              onClick={() => navigate('/register')}
              variant="primary"
            >
              Register as a Member
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="h-32 w-32 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-4">
            <User size={64} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {memberData.first_name} {memberData.last_name}
          </h1>
          <p className="text-gray-600 mt-1">Member since {formatDate(memberData.joined_date)}</p>
          <div className="mt-3">
            {getMembershipStatus()}
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
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'profile'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('interests')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'interests'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Interests
            </button>
            <button
              onClick={() => setActiveTab('volunteer')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'volunteer'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Volunteer Hours
            </button>
            <button
              onClick={() => setActiveTab('meetings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'meetings'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Meetings
            </button>
          </nav>
        </div>
        
        {/* Tab Content */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          {activeTab === 'profile' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Personal Information</h2>
                <Button
                  onClick={handleEditToggle}
                  variant={isEditing ? 'outline' : 'primary'}
                  size="sm"
                >
                  {isEditing ? (
                    <>
                      <X size={16} className="mr-1" /> Cancel
                    </>
                  ) : (
                    <>
                      <Edit size={16} className="mr-1" /> Edit Profile
                    </>
                  )}
                </Button>
              </div>
              
              {isEditing ? (
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <TextField
                      id="first_name"
                      label="First Name"
                      value={editedData.first_name || ''}
                      onChange={handleChange}
                      required
                    />
                    <TextField
                      id="last_name"
                      label="Last Name"
                      value={editedData.last_name || ''}
                      onChange={handleChange}
                      required
                    />
                    <TextField
                      id="email"
                      label="Email"
                      type="email"
                      value={editedData.email || ''}
                      onChange={handleChange}
                      required
                    />
                    <TextField
                      id="phone"
                      label="Phone"
                      value={editedData.phone || ''}
                      onChange={handleChange}
                    />
                    <TextField
                      id="address"
                      label="Address"
                      value={editedData.address || ''}
                      onChange={handleChange}
                      className="md:col-span-2"
                    />
                    <TextField
                      id="city"
                      label="City"
                      value={editedData.city || ''}
                      onChange={handleChange}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <TextField
                        id="state"
                        label="State"
                        value={editedData.state || ''}
                        onChange={handleChange}
                      />
                      <TextField
                        id="zip"
                        label="ZIP Code"
                        value={editedData.zip || ''}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      isLoading={isSubmitting}
                    >
                      <Save size={16} className="mr-1" /> Save Changes
                    </Button>
                  </div>
                </form>
              ) : (
                <div>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">First Name</dt>
                      <dd className="mt-1 text-gray-900">{memberData.first_name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Last Name</dt>
                      <dd className="mt-1 text-gray-900">{memberData.last_name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-gray-900">{memberData.email}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Phone</dt>
                      <dd className="mt-1 text-gray-900">{memberData.phone || 'Not provided'}</dd>
                    </div>
                    <div className="md:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Address</dt>
                      <dd className="mt-1 text-gray-900">
                        {memberData.address ? (
                          <>
                            {memberData.address}<br />
                            {memberData.city}, {memberData.state} {memberData.zip}
                          </>
                        ) : (
                          'Not provided'
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Membership Type</dt>
                      <dd className="mt-1 text-gray-900 capitalize">{memberData.membership_type || 'Standard'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Renewal Date</dt>
                      <dd className="mt-1 text-gray-900">{formatDate(memberData.renewal_date)}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'interests' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Interests & Volunteer Preferences</h2>
              
              <p className="text-gray-600 mb-6">
                Select the areas you're interested in or would like to volunteer for:
              </p>
              
              <div className="space-y-8">
                {interestCategories.map((category) => (
                  <div key={category.id} className="border-b border-gray-200 pb-6 last:border-0">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">{category.name}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {category.interests.map((interest: any) => (
                        <div key={interest.id} className="flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              id={`interest-${interest.id}`}
                              type="checkbox"
                              checked={memberInterests.includes(interest.id)}
                              onChange={() => handleInterestChange(interest.id)}
                              className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor={`interest-${interest.id}`} className="text-gray-700">
                              {interest.name}
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'volunteer' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Volunteer Hours</h2>
                <Button
                  onClick={() => navigate('/volunteer/log')}
                  variant="primary"
                  size="sm"
                >
                  <Clock size={16} className="mr-1" /> Log Hours
                </Button>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="flex flex-col md:flex-row justify-between items-center">
                  <div>
                    <p className="text-gray-500 text-sm">Total Hours</p>
                    <p className="text-3xl font-bold text-primary-600">{totalVolunteerHours}</p>
                  </div>
                  <div className="mt-4 md:mt-0 md:ml-4 border-l pl-4 hidden md:block">
                    <p className="text-gray-500 text-sm">Events Volunteered</p>
                    <p className="text-3xl font-bold text-primary-600">{volunteerHours.length}</p>
                  </div>
                </div>
              </div>
              
              {volunteerHours.length > 0 ? (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Date</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Description</th>
                        <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {volunteerHours.map((record) => (
                        <tr key={record.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6">
                            {formatDate(record.date)}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500">
                            {record.description}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-right">
                            <span className="font-medium">{record.hours}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">You haven't logged any volunteer hours yet.</p>
                  <Button 
                    onClick={() => navigate('/volunteer/log')}
                    variant="outline"
                    className="mt-4"
                  >
                    Log Your First Hours
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'meetings' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Meeting Attendance</h2>
                <Button
                  onClick={() => navigate('/meetings')}
                  variant="primary"
                  size="sm"
                >
                  <Calendar size={16} className="mr-1" /> View Meetings
                </Button>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="flex items-center">
                  <div>
                    <p className="text-gray-500 text-sm">Meetings Attended</p>
                    <p className="text-3xl font-bold text-primary-600">{attendance.length}</p>
                  </div>
                </div>
              </div>
              
              {attendance.length > 0 ? (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Date</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Meeting</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Location</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {attendance.map((record) => (
                        <tr key={record.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6">
                            {formatDate(record.meetings.date)}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500">
                            {record.meetings.title}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500">
                            {record.meetings.location}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">You haven't attended any meetings yet.</p>
                  <Button 
                    onClick={() => navigate('/meetings')}
                    variant="outline"
                    className="mt-4"
                  >
                    View Upcoming Meetings
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AccountPage;