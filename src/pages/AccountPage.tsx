import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import TextField from '../components/Form/TextField';
import SelectField from '../components/Form/SelectField';
import Button from '../components/UI/Button';
import Alert from '../components/UI/Alert';
import Badge from '../components/UI/Badge';
import Card from '../components/UI/Card';
import { User, Edit, X, LogOut } from 'lucide-react';
import { getCurrentUser, getMemberByEmail, getMemberInterests, getMemberVolunteerHours, getMemberAttendance, getMemberPayments } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { getPickListValues, PICK_LIST_CATEGORIES } from '../lib/pickLists';
import { format, parse } from 'date-fns';
import { formatPhoneNumber } from '../lib/formValidation';

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
  renewal_date: string;
  is_admin: boolean;
  is_cell_phone?: boolean;
  tshirt_size?: string;
  birthdate?: string;
  special_skills?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  health_issues?: string;
  registration_date?: string;
  signature?: string;
  precinct?: string;
  voter_id?: string;
  tell_us_more?: string;
  terms_accepted?: boolean;
  interests: Array<{
    id: string;
    name: string;
    category: {
      id: string;
      name: string;
    };
  }>;
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
  const [activeTab, setActiveTab] = useState<'profile' | 'interests' | 'volunteer' | 'payments'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<Partial<MemberData>>({});
  const [availableInterests, setAvailableInterests] = useState<Array<{ id: string; name: string; category: { id: string; name: string; } }>>([]);
  const [shirtSizes, setShirtSizes] = useState<Array<{value: string, label: string}>>([]);
  const [payments, setPayments] = useState<any[]>([]);
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
        const [interests, volunteerHours, attendance, paymentsResult] = await Promise.all([
          getMemberInterests(member.id),
          getMemberVolunteerHours(member.id),
          getMemberAttendance(member.id),
          getMemberPayments(member.id)
        ]);
        console.log('Additional data:', { interests, volunteerHours, attendance, paymentsResult });

        // Fetch shirt sizes
        const shirtValues = await getPickListValues(PICK_LIST_CATEGORIES.TSHIRT_SIZES);
        setShirtSizes(shirtValues.map(value => ({
          value: value.value,
          label: value.name
        })));

        setMemberData({
          ...member,
          interests: interests.interests || [],
          volunteer_hours: volunteerHours.hours || [],
          attendance: attendance.attendance?.map(a => ({
            id: a.id,
            date: a.meetings.date,
            meeting_type: a.meetings.title
          })) || [],
          payments: paymentsResult.payments || []
        });
        setPayments(paymentsResult.payments || []);
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
        .select(`
          id,
          name,
          category:interest_categories (
            id,
            name
          )
        `)
        .order('name');

      if (error) throw error;

      setAvailableInterests(data.map(interest => ({
        id: interest.id,
        name: interest.name,
        category: interest.category
      })));
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
        // Delete existing interests
        const { error: deleteError } = await supabase
          .from('member_interests')
          .delete()
          .eq('member_id', memberData?.id);

        if (deleteError) throw deleteError;

        // Insert new interests
        if (editedData.interests && editedData.interests.length > 0) {
          const { error: insertError } = await supabase
            .from('member_interests')
            .insert(
              editedData.interests.map(interest => ({
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

  const toggleInterest = (interest: { id: string; name: string; category: { id: string; name: string; } }) => {
    if (!editedData.interests) {
      setEditedData({ ...editedData, interests: [interest] });
      return;
    }

    if (editedData.interests.some(i => i.id === interest.id)) {
      setEditedData({
        ...editedData,
        interests: editedData.interests.filter(i => i.id !== interest.id)
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

  const getMembershipTerm = () => {
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-11
    const currentYear = now.getFullYear();
    let start, end, label;
    if (currentMonth < 9) {
      // Jan-Sept: Oct 1 previous year - Dec 31 current year
      start = new Date(currentYear - 1, 9, 1); // Oct 1 prev year
      end = new Date(currentYear, 11, 31); // Dec 31 current year
      label = `${currentYear} Membership Period`;
    } else {
      // Oct-Dec: Oct 1 current year - Dec 31 next year
      start = new Date(currentYear, 9, 1); // Oct 1 current year
      end = new Date(currentYear + 1, 11, 31); // Dec 31 next year
      label = `${currentYear + 1} Membership Period`;
    }
    return { start, end, label };
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

            {/* Main Profile Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary-600" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900">
                      {memberData?.first_name} {memberData?.last_name}
                    </h4>
                    <p className="text-sm text-gray-500">{memberData?.email}</p>
                    <div className="mt-1">
                      {getMembershipStatus()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h5 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Contact Information</h5>
                    {isEditing ? (
                      <div className="space-y-4">
                        <TextField
                          label="Phone"
                          id="phone"
                          type="tel"
                          value={formatPhoneNumber(editedData.phone || '')}
                          onChange={(e) => {
                            // Only store digits
                            const digits = e.target.value.replace(/\D/g, '');
                            if (digits.length <= 10) {  // Only allow up to 10 digits
                              setEditedData({ ...editedData, phone: digits });
                            }
                          }}
                          placeholder="(555) 555-5555"
                        />
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="is_cell_phone"
                            checked={editedData.is_cell_phone}
                            onChange={(e) => setEditedData({ ...editedData, is_cell_phone: e.target.checked })}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <label htmlFor="is_cell_phone" className="text-sm text-gray-700">
                            This is a cell phone number
                          </label>
                        </div>
                      </div>
                    ) : (
                      <dl className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Phone</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {memberData?.phone ? formatPhoneNumber(memberData.phone) : 'Not provided'}
                            {memberData?.is_cell_phone && <span className="ml-2 text-xs text-gray-500">(Cell)</span>}
                          </dd>
                        </div>
                      </dl>
                    )}
                  </div>

                  {/* Address Information */}
                  <div className="space-y-4">
                    <h5 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Address</h5>
                    {isEditing ? (
                      <div className="space-y-4">
                        <TextField
                          label="Street Address"
                          value={editedData.address || ''}
                          onChange={(e) => setEditedData({ ...editedData, address: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-4">
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
                        </div>
                        <TextField
                          label="ZIP Code"
                          value={editedData.zip || ''}
                          onChange={(e) => setEditedData({ ...editedData, zip: e.target.value })}
                        />
                      </div>
                    ) : (
                      <dl className="space-y-3">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Street Address</dt>
                          <dd className="mt-1 text-sm text-gray-900">{memberData?.address || 'Not provided'}</dd>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <dt className="text-sm font-medium text-gray-500">City</dt>
                            <dd className="mt-1 text-sm text-gray-900">{memberData?.city || 'Not provided'}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">State</dt>
                            <dd className="mt-1 text-sm text-gray-900">{memberData?.state || 'Not provided'}</dd>
                          </div>
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
            </div>

            {/* Additional Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6">
                  <h5 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Personal Information</h5>
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Birthdate</label>
                          <input
                            type="date"
                            value={editedData.birthdate || ''}
                            onChange={(e) => setEditedData({ ...editedData, birthdate: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            max={new Date().toISOString().split('T')[0]}
                          />
                          <p className="mt-1 text-sm text-gray-500">Select your date of birth</p>
                        </div>
                        <SelectField
                          label="T-Shirt Size"
                          value={editedData.tshirt_size || ''}
                          onChange={(e) => setEditedData({ ...editedData, tshirt_size: e.target.value })}
                          options={[
                            { value: '', label: 'Select size' },
                            ...shirtSizes
                          ]}
                        />
                      </div>
                      <TextField
                        label="Special Skills"
                        value={editedData.special_skills || ''}
                        onChange={(e) => setEditedData({ ...editedData, special_skills: e.target.value })}
                        multiline
                      />
                      <TextField
                        label="Health Issues"
                        value={editedData.health_issues || ''}
                        onChange={(e) => setEditedData({ ...editedData, health_issues: e.target.value })}
                        multiline
                      />
                      <TextField
                        label="Tell Us More"
                        value={editedData.tell_us_more || ''}
                        onChange={(e) => setEditedData({ ...editedData, tell_us_more: e.target.value })}
                        multiline
                      />
                    </div>
                  ) : (
                    <dl className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Birthdate</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {memberData?.birthdate ? format(parse(memberData.birthdate, 'yyyy-MM-dd', new Date()), 'MMMM d, yyyy') : 'Not provided'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">T-Shirt Size</dt>
                          <dd className="mt-1 text-sm text-gray-900">{memberData?.tshirt_size || 'Not provided'}</dd>
                        </div>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Special Skills</dt>
                        <dd className="mt-1 text-sm text-gray-900">{memberData?.special_skills || 'Not provided'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Health Issues</dt>
                        <dd className="mt-1 text-sm text-gray-900">{memberData?.health_issues || 'Not provided'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Tell Us More</dt>
                        <dd className="mt-1 text-sm text-gray-900">{memberData?.tell_us_more || 'Not provided'}</dd>
                      </div>
                    </dl>
                  )}
                </div>
              </div>

              {/* Emergency Contact Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6">
                  <h5 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Emergency Contact</h5>
                  {isEditing ? (
                    <div className="space-y-4">
                      <TextField
                        label="Emergency Contact Name"
                        value={editedData.emergency_contact_name || ''}
                        onChange={(e) => setEditedData({ ...editedData, emergency_contact_name: e.target.value })}
                      />
                      <TextField
                        label="Emergency Contact Phone"
                        id="emergency_contact_phone"
                        type="tel"
                        value={formatPhoneNumber(editedData.emergency_contact_phone || '')}
                        onChange={(e) => {
                          // Only store digits
                          const digits = e.target.value.replace(/\D/g, '');
                          if (digits.length <= 10) {  // Only allow up to 10 digits
                            setEditedData({ ...editedData, emergency_contact_phone: digits });
                          }
                        }}
                        placeholder="(555) 555-5555"
                      />
                      <TextField
                        label="Relationship"
                        value={editedData.emergency_contact_relationship || ''}
                        onChange={(e) => setEditedData({ ...editedData, emergency_contact_relationship: e.target.value })}
                      />
                    </div>
                  ) : (
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Emergency Contact Name</dt>
                        <dd className="mt-1 text-sm text-gray-900">{memberData?.emergency_contact_name || 'Not provided'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Emergency Contact Phone</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {memberData?.emergency_contact_phone ? formatPhoneNumber(memberData.emergency_contact_phone) : 'Not provided'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Relationship</dt>
                        <dd className="mt-1 text-sm text-gray-900">{memberData?.emergency_contact_relationship || 'Not provided'}</dd>
                      </div>
                    </dl>
                  )}
                </div>
              </div>

              {/* Voting Information Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6">
                  <h5 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Voting Information</h5>
                  {isEditing ? (
                    <div className="space-y-4">
                      <TextField
                        label="Precinct"
                        value={editedData.precinct || ''}
                        onChange={(e) => setEditedData({ ...editedData, precinct: e.target.value })}
                      />
                      <TextField
                        label="Voter ID"
                        value={editedData.voter_id || ''}
                        onChange={(e) => setEditedData({ ...editedData, voter_id: e.target.value })}
                      />
                    </div>
                  ) : (
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Precinct</dt>
                        <dd className="mt-1 text-sm text-gray-900">{memberData?.precinct || 'Not provided'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Voter ID</dt>
                        <dd className="mt-1 text-sm text-gray-900">{memberData?.voter_id || 'Not provided'}</dd>
                      </div>
                    </dl>
                  )}
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="mt-6 flex justify-end space-x-4">
                <Button onClick={handleCancel} variant="secondary">
                  Cancel
                </Button>
                <Button onClick={handleSave} variant="primary">
                  Save Changes
                </Button>
              </div>
            )}
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
                      key={interest.id}
                      className={`p-4 rounded-lg cursor-pointer transition-colors ${
                        editedData.interests?.some(i => i.id === interest.id)
                          ? 'bg-primary-100 border-2 border-primary-500'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      }`}
                      onClick={() => toggleInterest(interest)}
                    >
                      <h4 className="font-medium text-gray-900">{interest.name}</h4>
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
                      <div key={interest.id} className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900">{interest.name}</h4>
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

      case 'payments': {
        const { start, end, label } = getMembershipTerm();
        const paymentsInTerm = payments.filter(p => {
          const d = new Date(p.date);
          return d >= start && d <= end;
        });
        const total = paymentsInTerm.reduce((sum, p) => sum + (p.amount || 0), 0);
        return (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Payments</h3>
            <div className="mb-4">
              <span className="font-semibold">{label}:</span> Total this membership term: <span className="font-bold text-primary-700">${total.toFixed(2)}</span>
            </div>
            {payments.length ? (
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div key={payment.id} className={`bg-gray-50 p-4 rounded-lg ${paymentsInTerm.includes(payment) ? '' : 'opacity-50'}`}>
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                      <div>
                        <h4 className="font-medium text-gray-900">{payment.payment_method}</h4>
                        <p className="text-sm text-gray-500">{new Date(payment.date).toLocaleDateString()}</p>
                        <p className="text-sm text-gray-500">Status: {payment.status}</p>
                        {payment.notes && <p className="text-sm text-gray-500">Notes: {payment.notes}</p>}
                        {payment.is_recurring && <span className="text-xs text-blue-600 ml-2">Recurring</span>}
                      </div>
                      <div className="mt-2 md:mt-0 font-semibold text-primary-700">
                        {payment.amount?.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No payments recorded yet.</p>
            )}
          </div>
        );
      }
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
                  activeTab === 'payments'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('payments')}
              >
                Payments
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