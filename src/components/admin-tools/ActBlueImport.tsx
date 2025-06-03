import React, { useState, useEffect } from 'react';
import { Upload, Search, Plus, Check, X } from 'lucide-react';
import Button from '../UI/Button';
import Alert from '../UI/Alert';
import Card from '../UI/Card';
import { supabase } from '../../lib/supabase';
import { format, parseISO } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

const timeZone = 'America/New_York';

interface UnmatchedPayment {
  receiptId: string;
  date: string;
  amount: number;
  isRecurring: boolean;
  donorEmail: string;
  donorFirstName: string;
  donorLastName: string;
  donorAddress: string;
  donorCity: string;
  donorState: string;
  donorZip: string;
  donorPhone: string;
  rawData: any;
  selectedMemberId?: string;
  action?: 'create' | 'match' | 'skip';
}

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Progress {
  current: number;
  total: number;
  message: string;
}

const ActBlueImport: React.FC = () => {
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [unmatchedPayments, setUnmatchedPayments] = useState<UnmatchedPayment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [showCreateMember, setShowCreateMember] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<UnmatchedPayment | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [searchTerms, setSearchTerms] = useState<{ [key: string]: string }>({});
  const [showDropdowns, setShowDropdowns] = useState<{ [key: string]: boolean }>({});

  // Fetch all members on component mount
  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('members')
      .select('id, first_name, last_name, email')
      .order('last_name');
    
    if (error) {
      console.error('Error fetching members:', error);
      return;
    }
    
    setMembers(data || []);
  };

  // Filter members based on search term for a specific payment
  const filterMembers = (paymentId: string) => {
    const searchTerm = searchTerms[paymentId]?.toLowerCase() || '';
    return members.filter(member => 
      member.first_name.toLowerCase().includes(searchTerm) ||
      member.last_name.toLowerCase().includes(searchTerm) ||
      member.email.toLowerCase().includes(searchTerm)
    );
  };

  // Handle search input change
  const handleSearchChange = (paymentId: string, value: string) => {
    setSearchTerms(prev => ({ ...prev, [paymentId]: value }));
    setShowDropdowns(prev => ({ ...prev, [paymentId]: true }));
  };

  // Handle member selection
  const handleMemberSelect = (payment: UnmatchedPayment, memberId: string) => {
    setUnmatchedPayments(prev => prev.map(p => 
      p.receiptId === payment.receiptId 
        ? { ...p, selectedMemberId: memberId, action: 'match' }
        : p
    ));
    setShowDropdowns(prev => ({ ...prev, [payment.receiptId]: false }));
  };

  // Handle member creation
  const handleCreateMember = (payment: UnmatchedPayment) => {
    setUnmatchedPayments(prev => prev.map(p => 
      p.receiptId === payment.receiptId 
        ? { ...p, action: 'create' }
        : p
    ));
  };

  // Handle member creation confirmation
  const handleConfirmCreateMember = async () => {
    try {
      // Get all payments marked for creation
      const paymentsToCreate = unmatchedPayments.filter(p => p.action === 'create');
      
      // Process each payment
      for (const payment of paymentsToCreate) {
        await createNewMember(payment);
      }
      
      setAlert({
        type: 'success',
        message: `Successfully created ${paymentsToCreate.length} new members`
      });
      
      // Refresh members list
      await fetchMembers();
    } catch (error) {
      console.error('Error creating members:', error);
      setAlert({
        type: 'error',
        message: 'Failed to create some members'
      });
    }
  };

  // Handle skip payment
  const handleSkipPayment = (payment: UnmatchedPayment) => {
    setUnmatchedPayments(prev => prev.map(p => 
      p.receiptId === payment.receiptId 
        ? { ...p, action: 'skip' }
        : p
    ));
  };

  // Process all payments
  const processPayments = async () => {
    setIsProcessing(true);
    try {
      for (const payment of unmatchedPayments) {
        // If no action is set, default to skip
        const action = payment.action || 'skip';
        
        if (action === 'match' && payment.selectedMemberId) {
          await createPaymentRecord(payment, payment.selectedMemberId);
        } else if (action === 'create') {
          await createNewMember(payment);
        }
        // Skip payments with action 'skip' or no action
      }
      
      setAlert({
        type: 'success',
        message: 'All payments processed successfully'
      });
      
      // Clear unmatched payments after successful processing
      setUnmatchedPayments([]);
    } catch (error) {
      console.error('Error processing payments:', error);
      setAlert({
        type: 'error',
        message: 'Error processing payments'
      });
    } finally {
      setIsProcessing(false);
      setShowConfirmation(false);
    }
  };

  // Check if payment already exists
  const checkExistingPayment = async (receiptId: string) => {
    const { data, error } = await supabase
      .from('payments')
      .select('id')
      .eq('receipt_id', receiptId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error checking existing payment:', error);
    }
    
    return data;
  };

  // Find member by email
  const findMemberByEmail = async (email: string) => {
    const { data, error } = await supabase
      .from('members')
      .select('id, first_name, last_name, email')
      .ilike('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error finding member:', error);
    }
    
    return data;
  };

  // Create a payment record
  const createPaymentRecord = async (payment: UnmatchedPayment, memberId: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .insert([{
          member_id: memberId,
          amount: payment.amount,
          date: payment.date,
          payment_method: 'ActBlue Import',
          status: 'completed',
          is_recurring: payment.isRecurring,
          receipt_id: payment.receiptId,
          notes: 'Imported from ActBlue'
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error creating payment record:', error);
      throw error;
    }
  };

  // Handle ActBlue CSV import
  const handleActBlueImport = async (file: File) => {
    setIsProcessing(true);
    setProgress({ current: 0, total: 0, message: 'Reading file...' });
    try {
      const text = await file.text();
      const rows = text.split('\n').map(row => row.split(','));
      const headers = rows[0];
      const data = rows.slice(1);

      setProgress({ current: 0, total: data.length, message: 'Processing payments...' });
      const unmatchedPayments: UnmatchedPayment[] = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (row.length < headers.length) continue;

        const receiptId = row[headers.indexOf('Receipt ID')];
        if (!receiptId) continue;

        // Check if payment already exists
        const existingPayment = await checkExistingPayment(receiptId);
        if (existingPayment) continue;

        const email = row[headers.indexOf('Donor Email')];
        if (!email) continue;

        // Normalize email for comparison
        const normalizedEmail = email.toLowerCase().trim();
        console.log('Processing payment for email:', normalizedEmail);

        // Try to find matching member
        const member = await findMemberByEmail(normalizedEmail);
        
        if (member) {
          // If we found a matching member, create the payment record immediately
          console.log('Found matching member, creating payment record:', member);
          try {
            await createPaymentRecord({
              receiptId: receiptId,
              date: row[headers.indexOf('Date')],
              amount: parseFloat(row[headers.indexOf('Amount')]),
              isRecurring: row[headers.indexOf('Recurring Total Months')] ? true : false,
              donorEmail: normalizedEmail,
              donorFirstName: row[headers.indexOf('Donor First Name')],
              donorLastName: row[headers.indexOf('Donor Last Name')],
              donorAddress: row[headers.indexOf('Donor Addr1')],
              donorCity: row[headers.indexOf('Donor City')],
              donorState: row[headers.indexOf('Donor State')],
              donorZip: row[headers.indexOf('Donor ZIP')],
              donorPhone: row[headers.indexOf('Donor Phone')],
              rawData: row
            }, member.id);
            console.log('Successfully created payment record for member:', member.id);
          } catch (error) {
            console.error('Error creating payment record for matched member:', error);
            // If there's an error creating the payment, add it to unmatched payments
            unmatchedPayments.push({
              receiptId: receiptId,
              date: row[headers.indexOf('Date')],
              amount: parseFloat(row[headers.indexOf('Amount')]),
              isRecurring: row[headers.indexOf('Recurring Total Months')] ? true : false,
              donorEmail: normalizedEmail,
              donorFirstName: row[headers.indexOf('Donor First Name')],
              donorLastName: row[headers.indexOf('Donor Last Name')],
              donorAddress: row[headers.indexOf('Donor Addr1')],
              donorCity: row[headers.indexOf('Donor City')],
              donorState: row[headers.indexOf('Donor State')],
              donorZip: row[headers.indexOf('Donor ZIP')],
              donorPhone: row[headers.indexOf('Donor Phone')],
              rawData: row
            });
          }
        } else {
          // If no matching member, add to unmatched payments
          unmatchedPayments.push({
            receiptId: receiptId,
            date: row[headers.indexOf('Date')],
            amount: parseFloat(row[headers.indexOf('Amount')]),
            isRecurring: row[headers.indexOf('Recurring Total Months')] ? true : false,
            donorEmail: normalizedEmail,
            donorFirstName: row[headers.indexOf('Donor First Name')],
            donorLastName: row[headers.indexOf('Donor Last Name')],
            donorAddress: row[headers.indexOf('Donor Addr1')],
            donorCity: row[headers.indexOf('Donor City')],
            donorState: row[headers.indexOf('Donor State')],
            donorZip: row[headers.indexOf('Donor ZIP')],
            donorPhone: row[headers.indexOf('Donor Phone')],
            rawData: row
          });
        }
        setProgress((prev: Progress | null) => prev ? { ...prev, current: i + 1 } : null);
      }

      setUnmatchedPayments(unmatchedPayments);
      setAlert({
        type: 'success',
        message: `Found ${unmatchedPayments.length} new payments to process. Please review and match them with existing members or create new members below.`
      });
    } catch (error) {
      console.error('Error processing ActBlue file:', error);
      setAlert({
        type: 'error',
        message: 'Error processing ActBlue file'
      });
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  // Create a new member from payment data
  const createNewMember = async (payment: UnmatchedPayment) => {
    try {
      const { data, error } = await supabase
        .from('members')
        .insert([{
          first_name: payment.donorFirstName,
          last_name: payment.donorLastName,
          email: payment.donorEmail,
          phone: payment.donorPhone,
          address: payment.donorAddress,
          city: payment.donorCity,
          state: payment.donorState,
          zip: payment.donorZip,
          status: 'active',
          membership_type: 'individual',
          joined_date: new Date().toISOString(),
          renewal_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      // Create payment record for the new member
      await createPaymentRecord(payment, data.id);

      // Remove the payment from unmatched list
      setUnmatchedPayments(prev => prev.filter(p => p.receiptId !== payment.receiptId));
      
      // Refresh members list
      await fetchMembers();

      setAlert({
        type: 'success',
        message: 'New member created and payment recorded successfully'
      });
    } catch (error) {
      console.error('Error creating new member:', error);
      setAlert({
        type: 'error',
        message: 'Failed to create new member'
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Import ActBlue Payments</h2>
            {unmatchedPayments.length > 0 && (
              <Button
                onClick={() => setShowConfirmation(true)}
                disabled={isProcessing}
              >
                Process Payments
              </Button>
            )}
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-4 text-gray-500" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">CSV files only</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".csv"
                  onChange={(e) => {
                    if (e.target.files) {
                      handleActBlueImport(e.target.files[0]);
                    }
                  }}
                  disabled={isProcessing}
                />
              </label>
            </div>
          </div>
        </div>
      </Card>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {progress && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{progress.message}</span>
            <span className="text-sm font-medium text-gray-700">
              {progress.current} / {progress.total}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {unmatchedPayments.length > 0 && (
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Unmatched Payments ({unmatchedPayments.length})
            </h2>
            <div className="space-y-4">
              {unmatchedPayments.map((payment) => (
                <div key={payment.receiptId} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">
                        {payment.donorFirstName} {payment.donorLastName}
                      </h3>
                      <p className="text-sm text-gray-500">{payment.donorEmail}</p>
                      <p className="text-sm">
                        ${payment.amount} on {format(utcToZonedTime(parseISO(payment.date), timeZone), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <div className="relative w-64">
                        <div className="flex items-center border rounded-md">
                          <Search className="w-4 h-4 text-gray-400 ml-2" />
                          <input
                            type="text"
                            placeholder="Search members..."
                            className="px-2 py-1 focus:outline-none w-full"
                            value={searchTerms[payment.receiptId] || ''}
                            onChange={(e) => handleSearchChange(payment.receiptId, e.target.value)}
                            onFocus={() => setShowDropdowns(prev => ({ ...prev, [payment.receiptId]: true }))}
                          />
                        </div>
                        {showDropdowns[payment.receiptId] && (
                          <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                            {filterMembers(payment.receiptId).map((member) => (
                              <button
                                key={member.id}
                                className={`w-full px-4 py-2 text-left hover:bg-gray-100 ${
                                  payment.selectedMemberId === member.id ? 'bg-primary-50' : ''
                                }`}
                                onClick={() => handleMemberSelect(payment, member.id)}
                              >
                                <div className="font-medium">{member.first_name} {member.last_name}</div>
                                <div className="text-sm text-gray-500">{member.email}</div>
                              </button>
                            ))}
                            {filterMembers(payment.receiptId).length === 0 && (
                              <div className="px-4 py-2 text-gray-500 text-sm">
                                No members found
                              </div>
                            )}
                          </div>
                        )}
                        {payment.selectedMemberId && (
                          <div className="mt-1 flex items-center justify-between text-sm text-green-600">
                            <span>
                              Selected: {members.find(m => m.id === payment.selectedMemberId)?.first_name} {members.find(m => m.id === payment.selectedMemberId)?.last_name}
                            </span>
                            <button
                              onClick={() => {
                                setUnmatchedPayments(prev => prev.map(p => 
                                  p.receiptId === payment.receiptId 
                                    ? { ...p, selectedMemberId: undefined, action: undefined }
                                    : p
                                ));
                                setSearchTerms(prev => ({ ...prev, [payment.receiptId]: '' }));
                              }}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => handleCreateMember(payment)}
                        className={payment.action === 'create' ? 'bg-blue-100' : ''}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {payment.action === 'create' ? 'Creating Member' : 'Create Member'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-center">
              <Button
                onClick={() => setShowConfirmation(true)}
                disabled={isProcessing}
              >
                Process Payments
              </Button>
            </div>
          </div>
        </Card>
      )}

      {showConfirmation && (
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Confirm Payment Processing</h2>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Please review your selections before processing:
              </p>
              <div className="space-y-2">
                {unmatchedPayments.map(payment => (
                  <div key={payment.receiptId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">{payment.donorFirstName} {payment.donorLastName}</span>
                      <span className="text-sm text-gray-500 ml-2">${payment.amount}</span>
                    </div>
                    <div className="flex items-center">
                      {payment.action === 'match' && payment.selectedMemberId && (
                        <span className="text-green-600">
                          Match with: {members.find(m => m.id === payment.selectedMemberId)?.first_name} {members.find(m => m.id === payment.selectedMemberId)?.last_name}
                        </span>
                      )}
                      {payment.action === 'create' && (
                        <span className="text-blue-600">Create new member</span>
                      )}
                      {!payment.action && (
                        <span className="text-gray-500">Will be skipped</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowConfirmation(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={processPayments}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Confirm and Process'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ActBlueImport; 