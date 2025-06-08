import React, { useState, useEffect } from 'react';
import { ListChecks, Upload, CreditCard, Users } from 'lucide-react';
import Layout from '../../components/Layout/Layout';
import SelectListManager from '../../components/admin-tools/SelectListManager';
import ImportManager from '../../components/admin-tools/ImportManager';
import ActBlueImport from '../../components/admin-tools/ActBlueImport';
import { supabase } from '../../lib/supabase';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Alert from '../../components/UI/Alert';
import { Search, X } from 'lucide-react';

const ADMIN_TOOLS = [
  {
    key: 'select-list',
    label: 'Select List Management',
    icon: <ListChecks className="w-5 h-5 mr-2" />,
    component: <SelectListManager />,
  },
  {
    key: 'data-imports',
    label: 'Data Imports',
    icon: <Upload className="w-5 h-5 mr-2" />,
    component: <ImportManager />,
  },
  {
    key: 'actblue-import',
    label: 'ActBlue Import',
    icon: <CreditCard className="w-5 h-5 mr-2" />,
    component: <ActBlueImport />,
  },
  // Add more tools here in the future
];

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
  tell_us_more: string;
  household_id?: string;
  date_of_birth?: string;
  tshirt_size?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  special_skills?: string;
  health_issues?: string;
  precinct?: string;
  voter_id?: string;
  membership_type?: string;
  status?: string;
  is_admin?: boolean;
  is_primary_contact?: boolean;
  has_login?: boolean;
}

interface MemberMergeProps {
  onClose: () => void;
}

interface FieldSelection {
  field: keyof Member;
  selected: 'member1' | 'member2';
}

const MemberMerge: React.FC<MemberMergeProps> = ({ onClose }) => {
  const [step, setStep] = useState<'select' | 'compare' | 'confirm'>('select');
  const [searchTerm1, setSearchTerm1] = useState('');
  const [searchTerm2, setSearchTerm2] = useState('');
  const [members1, setMembers1] = useState<Member[]>([]);
  const [members2, setMembers2] = useState<Member[]>([]);
  const [selectedMember1, setSelectedMember1] = useState<Member | null>(null);
  const [selectedMember2, setSelectedMember2] = useState<Member | null>(null);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldSelections, setFieldSelections] = useState<FieldSelection[]>([]);
  const [primaryEmail, setPrimaryEmail] = useState<'member1' | 'member2'>('member1');

  // Search members as user types
  useEffect(() => {
    const searchMembers = async (searchTerm: string, setMembers: React.Dispatch<React.SetStateAction<Member[]>>) => {
      if (searchTerm.length < 2) {
        setMembers([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
          .limit(5);

        if (error) throw error;
        setMembers(data || []);
      } catch (error) {
        console.error('Error searching members:', error);
        setAlert({
          type: 'error',
          message: 'Failed to search members'
        });
      }
    };

    const timeoutId1 = setTimeout(() => searchMembers(searchTerm1, setMembers1), 300);
    const timeoutId2 = setTimeout(() => searchMembers(searchTerm2, setMembers2), 300);

    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
    };
  }, [searchTerm1, searchTerm2]);

  // Initialize field selections when members are selected
  useEffect(() => {
    if (selectedMember1 && selectedMember2) {
      const fields: (keyof Member)[] = [
        'first_name',
        'last_name',
        'phone',
        'address',
        'city',
        'state',
        'zip',
        'date_of_birth',
        'tshirt_size',
        'emergency_contact_name',
        'emergency_contact_phone',
        'emergency_contact_relationship',
        'special_skills',
        'health_issues',
        'precinct',
        'voter_id',
        'membership_type',
        'status',
        'is_admin',
        'is_primary_contact',
        'has_login'
      ];
      
      setFieldSelections(fields.map(field => ({
        field,
        selected: 'member1'
      })));
    }
  }, [selectedMember1, selectedMember2]);

  const handleMemberSelect = (member: Member, isFirst: boolean) => {
    // Check if the member is already selected in the other selection
    if (isFirst && selectedMember2?.id === member.id) {
      setAlert({
        type: 'error',
        message: 'Cannot select the same member for both selections'
      });
      return;
    }
    if (!isFirst && selectedMember1?.id === member.id) {
      setAlert({
        type: 'error',
        message: 'Cannot select the same member for both selections'
      });
      return;
    }

    if (isFirst) {
      setSelectedMember1(member);
      setSearchTerm1('');
      setMembers1([]);
    } else {
      setSelectedMember2(member);
      setSearchTerm2('');
      setMembers2([]);
    }
  };

  const handleCompare = () => {
    if (selectedMember1 && selectedMember2) {
      setStep('compare');
    }
  };

  const handleFieldSelection = (field: keyof Member, selected: 'member1' | 'member2') => {
    setFieldSelections(prev => 
      prev.map(fs => fs.field === field ? { ...fs, selected } : fs)
    );
  };

  const handleMerge = async () => {
    if (!selectedMember1 || !selectedMember2) return;
    
    setIsLoading(true);
    try {
      // 1. Create merged member data
      const mergedData: Partial<Member> = {};
      fieldSelections.forEach(({ field, selected }) => {
        const sourceMember = selected === 'member1' ? selectedMember1 : selectedMember2;
        mergedData[field] = sourceMember[field];
      });

      // Set primary email
      mergedData.email = primaryEmail === 'member1' ? selectedMember1.email : selectedMember2.email;

      // Add secondary email to tell_us_more
      const secondaryEmail = primaryEmail === 'member1' ? selectedMember2.email : selectedMember1.email;
      const existingTellUsMore = primaryEmail === 'member1' ? selectedMember1.tell_us_more : selectedMember2.tell_us_more;
      mergedData.tell_us_more = existingTellUsMore 
        ? `${existingTellUsMore}\nAdditional email: ${secondaryEmail}`
        : `Additional email: ${secondaryEmail}`;

      // 2. Update the primary member
      const primaryMemberId = primaryEmail === 'member1' ? selectedMember1.id : selectedMember2.id;
      const { error: updateError } = await supabase
        .from('members')
        .update(mergedData)
        .eq('id', primaryMemberId);

      if (updateError) throw updateError;

      // 3. Reassign associations
      const secondaryMemberId = primaryEmail === 'member1' ? selectedMember2.id : selectedMember1.id;

      // Update payments
      await supabase
        .from('payments')
        .update({ member_id: primaryMemberId })
        .eq('member_id', secondaryMemberId);

      // Update volunteer hours
      await supabase
        .from('volunteer_hours')
        .update({ member_id: primaryMemberId })
        .eq('member_id', secondaryMemberId);

      // Update meeting attendance
      await supabase
        .from('meeting_attendance')
        .update({ member_id: primaryMemberId })
        .eq('member_id', secondaryMemberId);

      // Update member interests
      await supabase
        .from('member_interests')
        .update({ member_id: primaryMemberId })
        .eq('member_id', secondaryMemberId);

      // 4. Delete the secondary member
      const { error: deleteError } = await supabase
        .from('members')
        .delete()
        .eq('id', secondaryMemberId);

      if (deleteError) throw deleteError;

      setAlert({
        type: 'success',
        message: 'Members successfully merged'
      });
      
      // Close after a short delay
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Error merging members:', error);
      setAlert({
        type: 'error',
        message: 'Failed to merge members'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Merge Members</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

        {step === 'select' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Select First Member</h3>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm1}
                  onChange={(e) => setSearchTerm1(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full border rounded-lg px-4 py-2"
                />
                {members1.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg">
                    {members1.map((member) => (
                      <div
                        key={member.id}
                        onClick={() => handleMemberSelect(member, true)}
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                      >
                        <div className="font-medium">{member.first_name} {member.last_name}</div>
                        <div className="text-sm text-gray-600">{member.email}</div>
                        {member.phone && (
                          <div className="text-sm text-gray-600">{member.phone}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedMember1 && (
                <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                  <div className="font-medium">{selectedMember1.first_name} {selectedMember1.last_name}</div>
                  <div className="text-sm text-gray-600">{selectedMember1.email}</div>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Select Second Member</h3>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm2}
                  onChange={(e) => setSearchTerm2(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full border rounded-lg px-4 py-2"
                />
                {members2.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg">
                    {members2.map((member) => (
                      <div
                        key={member.id}
                        onClick={() => handleMemberSelect(member, false)}
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                      >
                        <div className="font-medium">{member.first_name} {member.last_name}</div>
                        <div className="text-sm text-gray-600">{member.email}</div>
                        {member.phone && (
                          <div className="text-sm text-gray-600">{member.phone}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedMember2 && (
                <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                  <div className="font-medium">{selectedMember2.first_name} {selectedMember2.last_name}</div>
                  <div className="text-sm text-gray-600">{selectedMember2.email}</div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCompare}
                disabled={!selectedMember1 || !selectedMember2}
              >
                Compare Members
              </Button>
            </div>
          </div>
        )}

        {step === 'compare' && selectedMember1 && selectedMember2 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Member 1</h3>
                <div className="space-y-4">
                  {fieldSelections.map(({ field, selected }) => (
                    <div key={field} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={selected === 'member1'}
                        onChange={() => handleFieldSelection(field, 'member1')}
                        className="h-4 w-4 text-primary-600"
                      />
                      <label className="text-sm">
                        <span className="font-medium">{field.split('_').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}:</span>{' '}
                        {selectedMember1[field] || 'Not set'}
                      </label>
                    </div>
                  ))}
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={primaryEmail === 'member1'}
                      onChange={() => setPrimaryEmail('member1')}
                      className="h-4 w-4 text-primary-600"
                    />
                    <label className="text-sm">
                      <span className="font-medium">Email (Primary):</span>{' '}
                      {selectedMember1.email}
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Member 2</h3>
                <div className="space-y-4">
                  {fieldSelections.map(({ field, selected }) => (
                    <div key={field} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={selected === 'member2'}
                        onChange={() => handleFieldSelection(field, 'member2')}
                        className="h-4 w-4 text-primary-600"
                      />
                      <label className="text-sm">
                        <span className="font-medium">{field.split('_').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}:</span>{' '}
                        {selectedMember2[field] || 'Not set'}
                      </label>
                    </div>
                  ))}
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={primaryEmail === 'member2'}
                      onChange={() => setPrimaryEmail('member2')}
                      className="h-4 w-4 text-primary-600"
                    />
                    <label className="text-sm">
                      <span className="font-medium">Email (Primary):</span>{' '}
                      {selectedMember2.email}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                variant="outline"
                onClick={() => setStep('select')}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                variant="primary"
                onClick={handleMerge}
                disabled={isLoading}
              >
                {isLoading ? 'Merging...' : 'Merge Members'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminFunctions: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [showMemberMerge, setShowMemberMerge] = useState(false);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Functions</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ADMIN_TOOLS.map((tool) => (
            <Card
              key={tool.key}
              className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedTool(tool.key)}
            >
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-primary-100 rounded-lg">
                  {tool.icon}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{tool.label}</h3>
                </div>
              </div>
            </Card>
          ))}

          {/* Add Member Merge Card */}
          <Card
            className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setShowMemberMerge(true)}
          >
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Users className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Merge Members</h3>
                <p className="text-sm text-gray-500">Combine duplicate member records</p>
              </div>
            </div>
          </Card>
        </div>

        {selectedTool === 'select-list' && (
          <div className="mt-8">
            <SelectListManager />
          </div>
        )}

        {selectedTool === 'data-imports' && (
          <div className="mt-8">
            <ImportManager />
          </div>
        )}

        {selectedTool === 'actblue-import' && (
          <div className="mt-8">
            <ActBlueImport />
          </div>
        )}

        {showMemberMerge && (
          <MemberMerge onClose={() => setShowMemberMerge(false)} />
        )}
      </div>
    </Layout>
  );
};

export default AdminFunctions; 