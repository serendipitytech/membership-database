import React, { useState, useEffect, useRef } from 'react';
import { Upload, Search, Plus, Check, X, User, Mail } from 'lucide-react';
import Button from '../UI/Button';
import Alert from '../UI/Alert';
import Card from '../UI/Card';
import { supabase } from '../../lib/supabase';
import Papa from 'papaparse';

interface Payment {
  receiptId: string;
  date: string;
  amount: number;
  donorEmail: string;
  donorFirstName: string;
  donorLastName: string;
  donorAddress: string;
  donorCity: string;
  donorState: string;
  donorZip: string;
  donorPhone: string;
  fundraisingPageUrl?: string;
  recurringTotalMonths?: string;
  rawData: any;
  selectedMemberId?: string;
  action?: 'match' | 'create' | 'skip';
  isMembership?: boolean;
  needsReview?: boolean;
}

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  alternate_emails?: string[];
}

interface Progress {
  current: number;
  total: number;
  message: string;
}

// Membership identification logic
function isMembershipPayment(payment: Payment): boolean {
  const url = payment.fundraisingPageUrl || '';
  const isRecurring = !!payment.recurringTotalMonths;
  const isMembershipUrl = url.includes('nwannualmembership');
  const isSwagUrl = url.includes('nwswag');
  
  // Definitely membership if either condition is true
  if (isMembershipUrl || isRecurring) return true;
  
  // Definitely not membership if swag URL
  if (isSwagUrl) return false;
  
  // Needs review for everything else
  return false;
}

function needsReview(payment: Payment): boolean {
  const url = payment.fundraisingPageUrl || '';
  const isSwagUrl = url.includes('nwswag');
  
  // Needs review if not clearly membership and not swag
  return !isMembershipPayment(payment) && !isSwagUrl;
}

const ActBlueImport: React.FC = () => {
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [step, setStep] = useState(1);
  const [searchTerms, setSearchTerms] = useState<{ [receiptId: string]: string }>({});
  const [filteredMembers, setFilteredMembers] = useState<{ [receiptId: string]: Member[] }>({});
  const [showDropdowns, setShowDropdowns] = useState<{ [receiptId: string]: boolean }>({});
  const [manualClassifications, setManualClassifications] = useState<{ [receiptId: string]: boolean }>({});
  const inputRefs = useRef<{ [receiptId: string]: HTMLInputElement | null }>({});

  // Fetch all members on component mount
  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('members')
      .select('id, first_name, last_name, email, alternate_emails')
      .order('last_name');
    
    if (error) {
      console.error('Error fetching members:', error);
      return;
    }
    
    setMembers(data || []);
  };

  // Handle member search
  const handleMemberSearch = (receiptId: string, searchValue: string) => {
    setSearchTerms((prev) => ({ ...prev, [receiptId]: searchValue }));
    if (searchValue.length >= 2) {
      const filtered = members.filter((member) =>
        `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchValue.toLowerCase()) ||
        member.email.toLowerCase().includes(searchValue.toLowerCase()) ||
        member.alternate_emails?.some(email => email.toLowerCase().includes(searchValue.toLowerCase()))
      );
      setFilteredMembers((prev) => ({ ...prev, [receiptId]: filtered }));
      setShowDropdowns((prev) => ({ ...prev, [receiptId]: true }));
    } else {
      setFilteredMembers((prev) => ({ ...prev, [receiptId]: [] }));
      setShowDropdowns((prev) => ({ ...prev, [receiptId]: false }));
    }
  };

  // Handle member selection
  const handleMemberSelect = async (payment: Payment, member: Member) => {
    setSearchTerms((prev) => ({ ...prev, [payment.receiptId]: `${member.first_name} ${member.last_name}` }));
    setShowDropdowns((prev) => ({ ...prev, [payment.receiptId]: false }));
    
    if (inputRefs.current[payment.receiptId]) {
      inputRefs.current[payment.receiptId]?.blur();
    }

    // Add email as alternate if it's different from member's primary email
    if (payment.donorEmail.toLowerCase() !== member.email.toLowerCase()) {
      const alternateEmails = member.alternate_emails || [];
      if (!alternateEmails.includes(payment.donorEmail)) {
        const updatedAlternateEmails = [...alternateEmails, payment.donorEmail];
        
        const { error } = await supabase
          .from('members')
          .update({ alternate_emails: updatedAlternateEmails })
          .eq('id', member.id);
        
        if (error) {
          console.error('Error updating alternate emails:', error);
        } else {
          // Refresh members list
          await fetchMembers();
        }
      }
    }

    setTimeout(() => {
      setPayments((prev) => prev.map((p) =>
        p.receiptId === payment.receiptId
          ? { ...p, selectedMemberId: member.id, action: 'match' }
          : p
      ));
    }, 200);
  };

  // Handle member creation
  const handleCreateMember = (payment: Payment) => {
    setPayments((prev) => prev.map((p) =>
      p.receiptId === payment.receiptId
        ? { ...p, action: 'create' }
        : p
    ));
  };

  // Handle skip payment
  const handleSkipPayment = (payment: Payment) => {
    setPayments((prev) => prev.map((p) =>
      p.receiptId === payment.receiptId
        ? { ...p, action: 'skip', selectedMemberId: undefined }
        : p
    ));
  };

  // Handle manual classification
  const handleManualClassification = (payment: Payment, isMembership: boolean) => {
    setManualClassifications((prev) => ({ ...prev, [payment.receiptId]: isMembership }));
    setPayments((prev) => prev.map((p) =>
      p.receiptId === payment.receiptId
        ? { ...p, isMembership: isMembership }
        : p
    ));
  };

  // Create a payment record
  const createPaymentRecord = async (payment: Payment, memberId: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .insert([{
          member_id: memberId,
          amount: payment.amount,
          date: payment.date,
          payment_method: 'ActBlue Import',
          status: 'completed',
          is_recurring: !!payment.recurringTotalMonths,
          receipt_id: payment.receiptId,
          notes: 'Imported from ActBlue'
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error creating payment record:', error);
      throw error;
    }
  };

  // Create a new member
  const createNewMember = async (payment: Payment) => {
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

      // Remove the payment from payments list
      setPayments(prev => prev.filter(p => p.receiptId !== payment.receiptId));
      
      // Refresh members list
      await fetchMembers();

      return data;
    } catch (error) {
      console.error('Error creating new member:', error);
      throw error;
    }
  };

  // Handle ActBlue CSV import
  const handleActBlueImport = async (file: File) => {
    setIsProcessing(true);
    setProgress({ current: 0, total: 0, message: 'Reading file...' });

    try {
      // Wait for members to be loaded before processing
      if (members.length === 0) {
        await fetchMembers();
      }

      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      const rows = parsed.data as any[];

      setProgress({ current: 0, total: rows.length, message: 'Processing payments...' });

      // Gather all receipt IDs from the CSV
      const receiptIdsFromCsv = rows.map(row => row['Receipt ID']).filter(Boolean);

      // Query Supabase for existing payments with these receipt IDs
      const { data: existingPayments, error: existingError } = await supabase
        .from('payments')
        .select('receipt_id')
        .in('receipt_id', receiptIdsFromCsv);

      if (existingError) {
        throw existingError;
      }

      const existingReceiptIds = new Set((existingPayments || []).map(p => p.receipt_id));

      // Process payments
      let skipped = 0;
      const imported: Payment[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const receiptId = row['Receipt ID'];
        const url = (row['Fundraising Page'] || '').toLowerCase();

        // Skip swag payments entirely
        if (url.includes('nwswag')) {
          skipped++;
          continue;
        }

        if (!receiptId || existingReceiptIds.has(receiptId)) {
          skipped++;
          continue;
        }

        const email = row['Donor Email'];
        if (!email) {
          skipped++;
          continue;
        }

        // Robust auto-match by email (primary or alternate, case-insensitive, trimmed)
        const normalizedEmail = email.trim().toLowerCase();
        const match = members.find(m =>
          m.email?.trim().toLowerCase() === normalizedEmail ||
          (Array.isArray(m.alternate_emails) && m.alternate_emails.some(altEmail => altEmail.trim().toLowerCase() === normalizedEmail))
        );

        const payment: Payment = {
          receiptId,
          date: row['Date'],
          amount: parseFloat(row['Amount']),
          donorEmail: normalizedEmail,
          donorFirstName: row['Donor First Name'],
          donorLastName: row['Donor Last Name'],
          donorAddress: row['Donor Addr1'],
          donorCity: row['Donor City'],
          donorState: row['Donor State'],
          donorZip: row['Donor ZIP'],
          donorPhone: row['Donor Phone'],
          fundraisingPageUrl: row['Fundraising Page'],
          recurringTotalMonths: row['Recurring Total Months'],
          rawData: row,
          selectedMemberId: match?.id,
          action: match ? 'match' : undefined,
          isMembership: isMembershipPayment({
            receiptId,
            fundraisingPageUrl: row['Fundraising Page'],
            recurringTotalMonths: row['Recurring Total Months']
          } as Payment),
          needsReview: needsReview({
            receiptId,
            fundraisingPageUrl: row['Fundraising Page'],
            recurringTotalMonths: row['Recurring Total Months']
          } as Payment)
        };

        imported.push(payment);
        setProgress((prev) => prev ? { ...prev, current: i + 1 } : null);
      }

      setPayments(imported);
      setAlert({
        type: 'success',
        message: `Found ${imported.length} new payments to process. ${skipped > 0 ? skipped + ' duplicate or swag payments were skipped.' : ''}`
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

  // Process all payments
  const processPayments = async () => {
    setIsProcessing(true);
    setProgress({ current: 0, total: 0, message: 'Processing payments...' });
    
    try {
      const paymentsToProcess = payments.filter(p => 
        p.action === 'match' || p.action === 'create'
      );
      
      setProgress({ current: 0, total: paymentsToProcess.length, message: 'Importing payments...' });
      
      let processedCount = 0;
      
      for (const payment of paymentsToProcess) {
        if (payment.action === 'create') {
          await createNewMember(payment);
        } else if (payment.action === 'match' && payment.selectedMemberId) {
          await createPaymentRecord(payment, payment.selectedMemberId);
        }
        
        processedCount++;
        setProgress({ 
          current: processedCount, 
          total: paymentsToProcess.length, 
          message: `Processed ${processedCount} of ${paymentsToProcess.length} payments` 
        });
      }
      
      setAlert({
        type: 'success',
        message: `Successfully processed ${processedCount} payments`
      });
      
      // Clear payments after successful processing
      setPayments([]);
      setStep(1);
    } catch (error) {
      console.error('Error processing payments:', error);
      setAlert({
        type: 'error',
        message: 'Error processing payments'
      });
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  // Get payments that need attention
  const paymentsNeedingAttention = payments.filter(p => 
    !p.selectedMemberId || p.needsReview
  );

  // Get auto-processed summary
  const autoMatched = payments.filter(p => p.selectedMemberId && !p.needsReview);
  const autoSkipped = payments.filter(p => p.action === 'skip' || (!p.isMembership && !p.needsReview));

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Import ActBlue Membership Payments</h2>
            {payments.length > 0 && (
              <Button
                onClick={processPayments}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Process Payments'}
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
                  <p className="text-xs text-gray-500">ActBlue CSV files only</p>
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

      {payments.length > 0 && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4">Import Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 p-3 rounded">
                  <div className="text-sm text-green-600">Auto-matched</div>
                  <div className="text-2xl font-bold text-green-700">{autoMatched.length}</div>
                </div>
                <div className="bg-yellow-50 p-3 rounded">
                  <div className="text-sm text-yellow-600">Needs attention</div>
                  <div className="text-2xl font-bold text-yellow-700">{paymentsNeedingAttention.length}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Auto-skipped</div>
                  <div className="text-2xl font-bold text-gray-700">{autoSkipped.length}</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Payments needing attention */}
          {paymentsNeedingAttention.length > 0 && (
            <Card>
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4">Payments Needing Attention</h3>
                <div className="space-y-4">
                  {paymentsNeedingAttention.map((payment, i) => (
                    <div key={`${payment.receiptId}-${i}`} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium">{payment.donorFirstName} {payment.donorLastName}</div>
                          <div className="text-sm text-gray-500">{payment.donorEmail}</div>
                          <div className="text-sm">
                            ${payment.amount} on {payment.date}
                            {payment.recurringTotalMonths && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Recurring
                              </span>
                            )}
                            {payment.fundraisingPageUrl && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {payment.fundraisingPageUrl.includes('nwannualmembership') ? 'Membership' : 
                                 payment.fundraisingPageUrl.includes('nwswag') ? 'Swag' : 'Other'}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {/* Manual classification for unclear payments */}
                          {payment.needsReview && (
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-600">Classification:</span>
                              <select
                                className="border rounded px-2 py-1 text-sm"
                                value={manualClassifications[payment.receiptId] === undefined ? '' : 
                                       manualClassifications[payment.receiptId] ? 'membership' : 'non-membership'}
                                onChange={(e) => {
                                  const isMembership = e.target.value === 'membership';
                                  handleManualClassification(payment, isMembership);
                                }}
                              >
                                <option value="">Select...</option>
                                <option value="membership">Membership</option>
                                <option value="non-membership">Non-Membership</option>
                              </select>
                            </div>
                          )}
                          
                          {/* Member matching */}
                          {!payment.selectedMemberId && (
                            <div className="relative w-64">
                              <div className="flex items-center border rounded-md">
                                <Search className="w-4 h-4 text-gray-400 ml-2" />
                                <input
                                  ref={el => (inputRefs.current[payment.receiptId] = el)}
                                  type="text"
                                  placeholder="Search members..."
                                  className="px-2 py-1 focus:outline-none w-full text-sm"
                                  value={searchTerms[payment.receiptId] || ''}
                                  onChange={e => handleMemberSearch(payment.receiptId, e.target.value)}
                                  onFocus={() => setShowDropdowns(prev => ({ ...prev, [payment.receiptId]: true }))}
                                  onBlur={() => setTimeout(() => setShowDropdowns(prev => ({ ...prev, [payment.receiptId]: false })), 150)}
                                />
                              </div>
                              {showDropdowns[payment.receiptId] && (filteredMembers[payment.receiptId]?.length > 0) && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                                  {filteredMembers[payment.receiptId].map((member, j) => (
                                    <div
                                      key={`${member.id}-${j}`}
                                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                      onMouseDown={() => handleMemberSelect(payment, member)}
                                    >
                                      <div className="font-medium">{member.first_name} {member.last_name}</div>
                                      <div className="text-sm text-gray-500">{member.email}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {payment.selectedMemberId && (
                            <div className="flex items-center space-x-2 text-sm text-green-600">
                              <Check className="w-4 h-4" />
                              <span>
                                {members.find(m => m.id === payment.selectedMemberId)?.first_name} {members.find(m => m.id === payment.selectedMemberId)?.last_name}
                              </span>
                              <button
                                onClick={() => {
                                  setPayments(prev => prev.map(p => 
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
                          
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleCreateMember(payment)}
                            className={payment.action === 'create' ? 'bg-blue-100' : ''}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            {payment.action === 'create' ? 'Creating' : 'Create'}
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSkipPayment(payment)}
                            className={payment.action === 'skip' ? 'bg-gray-100' : ''}
                          >
                            Skip
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default ActBlueImport; 