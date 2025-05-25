import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import TextField from '../components/Form/TextField';
import Button from '../components/UI/Button';
import Alert from '../components/UI/Alert';
import Badge from '../components/UI/Badge';
import { User, Edit, X } from 'lucide-react';

// Mock data for development
const mockMemberData = {
  id: '1',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone: '555-0123',
  address: '123 Main St',
  city: 'Portland',
  state: 'OR',
  zip: '97201',
  status: 'active',
  membership_type: 'individual',
  joined_date: '2024-01-01',
  interests: ['campaigning', 'voter_registration'],
  volunteer_hours: [
    { id: '1', date: '2024-02-01', hours: 4, description: 'Phone banking' },
    { id: '2', date: '2024-02-15', hours: 2, description: 'Canvassing' }
  ],
  attendance: [
    { id: '1', date: '2024-02-01', meeting_type: 'General Meeting' },
    { id: '2', date: '2024-01-15', meeting_type: 'Committee Meeting' }
  ]
};

const AccountPage: React.FC = () => {
  const [memberData, setMemberData] = useState(mockMemberData);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(mockMemberData);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const navigate = useNavigate();

  const handleEditToggle = () => {
    if (isEditing) {
      setEditedData(memberData);
    }
    setIsEditing(!isEditing);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMemberData(editedData);
      setIsEditing(false);
      setAlert({
        type: 'success',
        message: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Update error:', error);
      setAlert({
        type: 'error',
        message: 'Failed to update profile'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMembershipStatus = () => {
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

  const totalVolunteerHours = memberData.volunteer_hours.reduce((total, record) => total + record.hours, 0);

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
          <p className="text-gray-600 mt-1">Member since {new Date(memberData.joined_date).toLocaleDateString()}</p>
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
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('profile')}
              className={`${
                activeTab === 'profile'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('volunteer')}
              className={`${
                activeTab === 'volunteer'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Volunteer Hours
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`${
                activeTab === 'attendance'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Meeting Attendance
            </button>
          </nav>
        </div>
        
        {/* Content */}
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
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <TextField
                    id="first_name"
                    label="First Name"
                    value={isEditing ? editedData.first_name : memberData.first_name}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                  <TextField
                    id="last_name"
                    label="Last Name"
                    value={isEditing ? editedData.last_name : memberData.last_name}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                  <TextField
                    id="email"
                    label="Email"
                    type="email"
                    value={isEditing ? editedData.email : memberData.email}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                  <TextField
                    id="phone"
                    label="Phone"
                    value={isEditing ? editedData.phone : memberData.phone}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                  <TextField
                    id="address"
                    label="Address"
                    value={isEditing ? editedData.address : memberData.address}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                  <TextField
                    id="city"
                    label="City"
                    value={isEditing ? editedData.city : memberData.city}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                  <TextField
                    id="state"
                    label="State"
                    value={isEditing ? editedData.state : memberData.state}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                  <TextField
                    id="zip"
                    label="ZIP Code"
                    value={isEditing ? editedData.zip : memberData.zip}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>
                
                {isEditing && (
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      isLoading={isSubmitting}
                    >
                      Save Changes
                    </Button>
                  </div>
                )}
              </form>
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
                  Log Hours
                </Button>
              </div>
              
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-lg font-medium text-gray-900">
                  Total Hours: {totalVolunteerHours}
                </p>
              </div>
              
              <div className="space-y-4">
                {memberData.volunteer_hours.map(record => (
                  <div key={record.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{record.description}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(record.date).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-lg font-medium text-primary-600">
                        {record.hours} hours
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'attendance' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Meeting Attendance</h2>
              
              <div className="space-y-4">
                {memberData.attendance.map(record => (
                  <div key={record.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{record.meeting_type}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(record.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AccountPage;