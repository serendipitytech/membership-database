import React, { useState, useEffect, useRef } from 'react';
import { Upload, Search, Plus, Check, X } from 'lucide-react';
import Button from '../UI/Button';
import Alert from '../UI/Alert';
import Card from '../UI/Card';
import { supabase } from '../../lib/supabase';
import { format, parseISO } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import { brandConfig } from '../../brand';

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
  fundraisingPageUrl?: string;
  recurringType?: string;
  kind?: string;
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

// Add known URLs for classification
const MEMBERSHIP_URLS = brandConfig.actBlueUrls.membership;
const NON_MEMBERSHIP_URLS = brandConfig.actBlueUrls.nonMembership;

// Add known kinds for classification
const MEMBERSHIP_KINDS = [
  'membership',
  'recurring',
  'subscription',
  'forever'
];
const NON_MEMBERSHIP_KINDS = [
  'merchandise',
  'donation',
  'one-time',
  'event'
];

// Helper to classify a payment
function classifyPayment(payment: UnmatchedPayment) {
  // 1. Recurring Type takes precedence
  if (payment.recurringType) {
    console.log('Classifying as membership due to Recurring Type:', payment);
    return 'membership';
  }

  // 2. Check URL
  const url = (payment.fundraisingPageUrl || '').toLowerCase();
  if (NON_MEMBERSHIP_URLS.some(u => url.includes(u))) return 'non-membership';
  if (MEMBERSHIP_URLS.some(u => url.includes(u))) return 'membership';

  // 3. Check if it's a recurring payment (legacy isRecurring flag)
  if (payment.isRecurring) return 'membership';

  // 4. Check Kind field
  const kind = (payment.kind || '').toLowerCase();
  if (MEMBERSHIP_KINDS.includes(kind)) return 'membership';
  if (NON_MEMBERSHIP_KINDS.includes(kind)) return 'non-membership';

  // Debug: Log unclassified payments
  console.log('Classified as unclassified:', payment);
  return 'unclassified';
}

// Add a helper to strip the ActBlue URL prefix
function displayActBlueUrl(url: string) {
  return url?.replace(/^https:\/\/secure\.actblue\.com(\/page)?\//, '') || '';
}

const ActBlueImport: React.FC = () => {
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [allPayments, setAllPayments] = useState<UnmatchedPayment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [showCreateMember, setShowCreateMember] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<UnmatchedPayment | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [searchTerms, setSearchTerms] = useState<{ [receiptId: string]: string }>({});
  const [filteredMembers, setFilteredMembers] = useState<{ [receiptId: string]: Member[] }>({});
  const [showDropdowns, setShowDropdowns] = useState<{ [receiptId: string]: boolean }>({});
  const [classifiedPayments, setClassifiedPayments] = useState({
    membership: [],
    nonMembership: [],
    unclassified: []
  });
  const [rowOverrides, setRowOverrides] = useState({}); // receiptId -> 'membership' | 'non-membership' | 'unclassified'
  const [groupToggles, setGroupToggles] = useState({
    membership: true,
    nonMembership: false,
    unclassified: false
  });
  const [step, setStep] = useState(1);
  const inputRefs = useRef<{ [receiptId: string]: HTMLInputElement | null }>({});
  const [collapsedSections, setCollapsedSections] = useState({
    membership: true,
    nonMembership: true,
    unclassified: false
  });
  const [importProgress, setImportProgress] = useState<Progress | null>(null);
  const [skippedDuplicates, setSkippedDuplicates] = useState<number>(0);

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
  const filterMembers = (paymentId: string): Member[] => {
    const searchTerm = searchTerms[paymentId]?.toLowerCase() || '';
    return members.filter((member: Member) => 
      member.first_name.toLowerCase().includes(searchTerm) ||
      member.last_name.toLowerCase().includes(searchTerm) ||
      member.email.toLowerCase().includes(searchTerm)
    );
  };

  // Live search handler for each payment row (by receiptId)
  const handleMemberSearch = (receiptId: string, searchValue: string) => {
    setSearchTerms((prev: { [receiptId: string]: string }) => ({ ...prev, [receiptId]: searchValue }));
    if (searchValue.length >= 2) {
      const filtered = members.filter((member: Member) =>
        `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchValue.toLowerCase()) ||
        member.email.toLowerCase().includes(searchValue.toLowerCase())
      );
      setFilteredMembers((prev: { [receiptId: string]: Member[] }) => ({ ...prev, [receiptId]: filtered }));
      setShowDropdowns((prev: { [receiptId: string]: boolean }) => ({ ...prev, [receiptId]: true }));
    } else {
      setFilteredMembers((prev: { [receiptId: string]: Member[] }) => ({ ...prev, [receiptId]: [] }));
      setShowDropdowns((prev: { [receiptId: string]: boolean }) => ({ ...prev, [receiptId]: false }));
    }
  };

  // Handle member selection
  const handleMemberSelect = (payment: UnmatchedPayment, member: Member) => {
    setSearchTerms((prev: { [receiptId: string]: string }) => ({ ...prev, [payment.receiptId]: `${member.first_name} ${member.last_name}` }));
    setShowDropdowns((prev: { [receiptId: string]: boolean }) => ({ ...prev, [payment.receiptId]: false }));
    if (inputRefs.current[payment.receiptId]) {
      inputRefs.current[payment.receiptId]?.blur();
    }
    setTimeout(() => {
      setAllPayments((prev: UnmatchedPayment[]) => prev.map((p: UnmatchedPayment) =>
        p.receiptId === payment.receiptId
          ? { ...p, selectedMemberId: member.id, action: 'match' }
          : p
      ));
    }, 200);
  };

  // Handle member creation
  const handleCreateMember = (payment: UnmatchedPayment) => {
    setAllPayments((prev: UnmatchedPayment[]) => prev.map((p: UnmatchedPayment) =>
      p.receiptId === payment.receiptId
        ? { ...p, action: 'create' }
        : p
    ));
  };

  // Handle member creation confirmation
  const handleConfirmCreateMember = async () => {
    try {
      // Get all payments marked for creation
      const paymentsToCreate = allPayments.filter(p => p.action === 'create');
      
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
    setAllPayments((prev: UnmatchedPayment[]) => prev.map((p: UnmatchedPayment) =>
      p.receiptId === payment.receiptId
        ? { ...p, action: 'skip', selectedMemberId: undefined }
        : p
    ));
  };

  // Process all payments
  const processPayments = async () => {
    setIsProcessing(true);
    try {
      for (const payment of allPayments) {
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
      
      // Clear all payments after successful processing
      setAllPayments([]);
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
      // Gather all receipt IDs from the CSV
      const receiptIdsFromCsv = data.map(row => row[headers.indexOf('Receipt ID')]).filter(Boolean);
      // Query Supabase for existing payments with these receipt IDs
      const { data: existingPayments, error: existingError } = await supabase
        .from('payments')
        .select('receipt_id')
        .in('receipt_id', receiptIdsFromCsv);
      if (existingError) {
        throw existingError;
      }
      const existingReceiptIds = new Set((existingPayments || []).map(p => p.receipt_id));
      // Filter out duplicates
      let skipped = 0;
      const imported: UnmatchedPayment[] = [];
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (row.length < headers.length) continue;
        const receiptId = row[headers.indexOf('Receipt ID')];
        if (!receiptId) continue;
        if (existingReceiptIds.has(receiptId)) {
          skipped++;
          continue;
        }
        const email = row[headers.indexOf('Donor Email')];
        if (!email) continue;
        // Auto-match by email
        const { data: memberList } = await supabase
          .from('members')
          .select('id, email');
        const match = memberList?.find(m => m.email?.trim().toLowerCase() === email.trim().toLowerCase());
        // Trim whitespace from Kind and Recurring Type
        const kind = row[headers.indexOf('Kind')]?.trim() || '';
        const recurringType = row[headers.indexOf('Recurring Type')]?.trim() || '';
        imported.push({
          receiptId,
          date: row[headers.indexOf('Date')],
          amount: parseFloat(row[headers.indexOf('Amount')]),
          isRecurring: row[headers.indexOf('Recurring Total Months')] ? true : false,
          donorEmail: email.toLowerCase().trim(),
          donorFirstName: row[headers.indexOf('Donor First Name')],
          donorLastName: row[headers.indexOf('Donor Last Name')],
          donorAddress: row[headers.indexOf('Donor Addr1')],
          donorCity: row[headers.indexOf('Donor City')],
          donorState: row[headers.indexOf('Donor State')],
          donorZip: row[headers.indexOf('Donor ZIP')],
          donorPhone: row[headers.indexOf('Donor Phone')],
          rawData: row,
          fundraisingPageUrl: row[headers.indexOf('Fundraising Page')],
          recurringType,
          kind,
          selectedMemberId: match ? match.id : undefined,
          action: match ? 'match' : undefined
        });
        setProgress((prev: Progress | null) => prev ? { ...prev, current: i + 1 } : null);
      }
      setAllPayments(imported);
      setSkippedDuplicates(skipped);
      setAlert({
        type: 'success',
        message: `Found ${imported.length} new payments to process. ${skipped > 0 ? skipped + ' duplicate payments were skipped.' : ''} Please review and match them with existing members or create new members below.`
      });
    } catch (error) {
      console.error('Error processing ActBlue file:', error);
      setAlert({
        type: 'error',
        message: 'Error processing ActBlue file'
      });
    } finally {
      setIsProcessing(false);
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

      // Remove the payment from all payments list
      setAllPayments(prev => prev.filter(p => p.receiptId !== payment.receiptId));
      
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

  // After parsing payments, group them into membership, non-membership, and unclassified
  function groupPayments(payments: UnmatchedPayment[]) {
    const groups: { membership: UnmatchedPayment[]; nonMembership: UnmatchedPayment[]; unclassified: UnmatchedPayment[] } = { membership: [], nonMembership: [], unclassified: [] };
    payments.forEach((payment: UnmatchedPayment) => {
      const override = rowOverrides[payment.receiptId];
      const group = override || classifyPayment(payment);
      if (group === 'membership') groups.membership.push(payment);
      else if (group === 'non-membership') groups.nonMembership.push(payment);
      else groups.unclassified.push(payment);
    });
    setClassifiedPayments(groups);
  }

  // Refactor groupPayments to always use the latest state of all payments
  // We'll use a payments state that includes all imported payments, not just unmatched
  // Assume allPayments is the full list (matched, created, unmatched, skipped)
  // For this edit, use allPayments as a proxy for all payments (if that's all that's available)
  // In a real implementation, you may want to track allPayments separately

  // Refactor useEffect for Step 2 to always recalculate classifiedPayments from the latest allPayments (or allPayments if available)
  useEffect(() => {
    if (step === 2) {
      groupPayments(allPayments.filter(p => p.action !== 'skip'));
    }
  }, [step, allPayments, rowOverrides]);

  // In Step 1, update the Continue button logic:
  // Enable if at least one payment is matched or created
  const canContinueStep1 = allPayments.some(p => p.selectedMemberId || p.action === 'create');

  // Step 3: On Import, only insert payments classified as 'membership' and matched to a member
  const handleImport = async () => {
    const toImport = classifiedPayments.membership.filter(p => p.selectedMemberId);
    setIsProcessing(true);
    setImportProgress({ current: 0, total: toImport.length, message: 'Importing payments...' });
    try {
      for (let i = 0; i < toImport.length; i++) {
        const payment = toImport[i];
        await supabase.from('payments').insert([{
          member_id: payment.selectedMemberId,
          amount: payment.amount,
          date: payment.date,
          payment_method: 'ActBlue Import',
          status: 'completed',
          is_recurring: payment.isRecurring,
          receipt_id: payment.receiptId,
          notes: 'Imported from ActBlue'
        }]);
        setImportProgress({ current: i + 1, total: toImport.length, message: `Importing payment ${i + 1} of ${toImport.length}` });
      }
      setAlert({ type: 'success', message: `${toImport.length} membership payments imported successfully.` });
      setStep(1);
      setAllPayments([]);
      setClassifiedPayments({ membership: [], nonMembership: [], unclassified: [] });
    } catch (error) {
      setAlert({ type: 'error', message: 'Error importing payments.' });
    } finally {
      setIsProcessing(false);
      setImportProgress(null);
    }
  };

  // Step 1: Only show truly unmatched payments
  const unmatchedPayments = allPayments.filter(p => !p.selectedMemberId);

  // Step 2: Only show unclassified payments for manual classification
  function groupUnclassifiedPayments(payments: UnmatchedPayment[]) {
    return payments.filter(payment => {
      const override = rowOverrides[payment.receiptId];
      const group = override || classifyPayment(payment);
      return group === 'unclassified';
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Import ActBlue Payments</h2>
            {allPayments.length > 0 && (
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

      <div className="space-y-8">
        {/* Stepper UI */}
        <div className="flex items-center justify-center space-x-8 mb-8">
          {[1,2,3].map(s => (
            <div key={s} className="flex items-center">
              <div className={`rounded-full w-8 h-8 flex items-center justify-center font-bold text-white ${step === s ? 'bg-primary-600' : 'bg-gray-400'}`}>{s}</div>
              {s < 3 && <div className="w-12 h-1 bg-gray-300 mx-2" />}
            </div>
          ))}
        </div>

        {/* Step 1: Match Payments to Members */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Step 1: Match Payments to Members</h2>
            {unmatchedPayments.length === 0 ? (
              <div className="text-green-600 font-medium">All payments matched or skipped. Click Continue.</div>
            ) : (
              <div className="space-y-4">
                {unmatchedPayments.map((payment, i) => (
                  <div key={`${payment.receiptId}-${i}`} className="border rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{payment.donorFirstName} {payment.donorLastName}</div>
                      <div className="text-sm text-gray-500">{payment.donorEmail}</div>
                      <div className="text-sm">${payment.amount} on {payment.date}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="relative w-64">
                        <div className="flex items-center border rounded-md">
                          <Search className="w-4 h-4 text-gray-400 ml-2" />
                          <input
                            ref={el => (inputRefs.current[payment.receiptId] = el)}
                            type="text"
                            placeholder="Search members..."
                            className="px-2 py-1 focus:outline-none w-full"
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
                        {payment.selectedMemberId && (
                          <div className="mt-1 flex items-center justify-between text-sm text-green-600">
                            <span>
                              Selected: {members.find(m => m.id === payment.selectedMemberId)?.first_name} {members.find(m => m.id === payment.selectedMemberId)?.last_name}
                            </span>
                            <button
                              onClick={() => {
                                setAllPayments(prev => prev.map(p => 
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
                ))}
              </div>
            )}
            <div className="flex justify-end mt-6">
              <Button
                variant="primary"
                disabled={!canContinueStep1}
                onClick={() => setStep(2)}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Classify Payments */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Step 2: Classify Payments</h2>
            {/* Membership Payments (auto-detected) */}
            {classifiedPayments.membership.length > 0 && (
              <div className="bg-gray-50 rounded-lg shadow p-4 mb-6">
                <div 
                  className="flex items-center justify-between mb-2 cursor-pointer"
                  onClick={() => setCollapsedSections(prev => ({ ...prev, membership: !prev.membership }))}
                >
                  <h3 className="text-lg font-semibold">Membership Payments (auto-detected)</h3>
                  <button className="text-gray-500 hover:text-gray-700">
                    {collapsedSections.membership ? '▼' : '▲'}
                  </button>
                </div>
                {!collapsedSections.membership && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Donor</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Amount</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fundraising Page</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Recurring Type</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Kind</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Matched To</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Classification</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classifiedPayments.membership.map((payment: UnmatchedPayment, i) => {
                          const matchedMember = members.find((m: Member) => m.id === payment.selectedMemberId);
                          return (
                            <tr key={`${payment.receiptId}-${i}`} className={!matchedMember ? 'bg-yellow-50' : 'bg-white'}>
                              <td className="px-4 py-2">{payment.donorFirstName} {payment.donorLastName}</td>
                              <td className="px-4 py-2">{payment.donorEmail}</td>
                              <td className="px-4 py-2">${payment.amount}</td>
                              <td className="px-4 py-2">{payment.date}</td>
                              <td className="px-4 py-2 truncate max-w-xs">{displayActBlueUrl(payment.fundraisingPageUrl || '')}</td>
                              <td className="px-4 py-2">{payment.recurringType || (payment.isRecurring ? 'Yes' : 'No')}</td>
                              <td className="px-4 py-2">{payment.kind}</td>
                              <td className="px-4 py-2 flex items-center space-x-2">
                                {matchedMember ? (
                                  <span>{matchedMember.first_name} {matchedMember.last_name}</span>
                                ) : (
                                  <span className="text-yellow-600 flex items-center"><X className="w-4 h-4 mr-1" /> Unmatched</span>
                                )}
                              </td>
                              <td className="px-4 py-2">
                                <select
                                  className="border rounded px-2 py-1"
                                  value={rowOverrides[payment.receiptId] || classifyPayment(payment)}
                                  onChange={e => setRowOverrides(prev => ({ ...prev, [payment.receiptId]: e.target.value }))}
                                >
                                  <option value="membership">Membership</option>
                                  <option value="non-membership">Non-Membership</option>
                                  <option value="unclassified">Unclassified</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            {/* Non-Membership Payments (auto-detected) */}
            {classifiedPayments.nonMembership.length > 0 && (
              <div className="bg-gray-50 rounded-lg shadow p-4 mb-6">
                <div 
                  className="flex items-center justify-between mb-2 cursor-pointer"
                  onClick={() => setCollapsedSections(prev => ({ ...prev, nonMembership: !prev.nonMembership }))}
                >
                  <h3 className="text-lg font-semibold">Non-Membership Payments (auto-detected)</h3>
                  <button className="text-gray-500 hover:text-gray-700">
                    {collapsedSections.nonMembership ? '▼' : '▲'}
                  </button>
                </div>
                {!collapsedSections.nonMembership && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Donor</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Amount</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fundraising Page</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Recurring Type</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Kind</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Matched To</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Classification</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classifiedPayments.nonMembership.map((payment: UnmatchedPayment, i) => {
                          const matchedMember = members.find((m: Member) => m.id === payment.selectedMemberId);
                          return (
                            <tr key={`${payment.receiptId}-${i}`} className={!matchedMember ? 'bg-yellow-50' : 'bg-white'}>
                              <td className="px-4 py-2">{payment.donorFirstName} {payment.donorLastName}</td>
                              <td className="px-4 py-2">{payment.donorEmail}</td>
                              <td className="px-4 py-2">${payment.amount}</td>
                              <td className="px-4 py-2">{payment.date}</td>
                              <td className="px-4 py-2 truncate max-w-xs">{displayActBlueUrl(payment.fundraisingPageUrl || '')}</td>
                              <td className="px-4 py-2">{payment.recurringType || (payment.isRecurring ? 'Yes' : 'No')}</td>
                              <td className="px-4 py-2">{payment.kind}</td>
                              <td className="px-4 py-2 flex items-center space-x-2">
                                {matchedMember ? (
                                  <span>{matchedMember.first_name} {matchedMember.last_name}</span>
                                ) : (
                                  <span className="text-yellow-600 flex items-center"><X className="w-4 h-4 mr-1" /> Unmatched</span>
                                )}
                              </td>
                              <td className="px-4 py-2">
                                <select
                                  className="border rounded px-2 py-1"
                                  value={rowOverrides[payment.receiptId] || classifyPayment(payment)}
                                  onChange={e => setRowOverrides(prev => ({ ...prev, [payment.receiptId]: e.target.value }))}
                                >
                                  <option value="membership">Membership</option>
                                  <option value="non-membership">Non-Membership</option>
                                  <option value="unclassified">Unclassified</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            {/* Unclassified Payments */}
            {classifiedPayments.unclassified.length > 0 && (
              <div className="bg-gray-50 rounded-lg shadow p-4 mb-6">
                <div 
                  className="flex items-center justify-between mb-2 cursor-pointer"
                  onClick={() => setCollapsedSections(prev => ({ ...prev, unclassified: !prev.unclassified }))}
                >
                  <h3 className="text-lg font-semibold">Unclassified Payments</h3>
                  <button className="text-gray-500 hover:text-gray-700">
                    {collapsedSections.unclassified ? '▼' : '▲'}
                  </button>
                </div>
                {!collapsedSections.unclassified && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Donor</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Amount</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fundraising Page</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Recurring Type</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Kind</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Matched To</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Classification</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classifiedPayments.unclassified.map((payment: UnmatchedPayment, i) => {
                          const matchedMember = members.find((m: Member) => m.id === payment.selectedMemberId);
                          return (
                            <tr key={`${payment.receiptId}-${i}`} className={!matchedMember ? 'bg-yellow-50' : 'bg-white'}>
                              <td className="px-4 py-2">{payment.donorFirstName} {payment.donorLastName}</td>
                              <td className="px-4 py-2">{payment.donorEmail}</td>
                              <td className="px-4 py-2">${payment.amount}</td>
                              <td className="px-4 py-2">{payment.date}</td>
                              <td className="px-4 py-2 truncate max-w-xs">{displayActBlueUrl(payment.fundraisingPageUrl || '')}</td>
                              <td className="px-4 py-2">{payment.recurringType || (payment.isRecurring ? 'Yes' : 'No')}</td>
                              <td className="px-4 py-2">{payment.kind}</td>
                              <td className="px-4 py-2 flex items-center space-x-2">
                                {matchedMember ? (
                                  <span>{matchedMember.first_name} {matchedMember.last_name}</span>
                                ) : (
                                  <span className="text-yellow-600 flex items-center"><X className="w-4 h-4 mr-1" /> Unmatched</span>
                                )}
                              </td>
                              <td className="px-4 py-2">
                                <select
                                  className="border rounded px-2 py-1"
                                  value={rowOverrides[payment.receiptId] || classifyPayment(payment)}
                                  onChange={e => setRowOverrides(prev => ({ ...prev, [payment.receiptId]: e.target.value }))}
                                >
                                  <option value="membership">Membership</option>
                                  <option value="non-membership">Non-Membership</option>
                                  <option value="unclassified">Unclassified</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button
                variant="primary"
                onClick={() => setStep(3)}
                disabled={classifiedPayments.membership.some(p => !members.find(m => m.id === p.selectedMemberId))}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm Import */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Step 3: Confirm Import</h2>
            <div className="mb-4">
              <div className="text-sm text-gray-700">Membership payments to import: <span className="font-bold">{classifiedPayments.membership.filter(p => members.find(m => m.id === p.selectedMemberId)).length}</span></div>
              <div className="text-sm text-gray-700">Non-membership payments: <span className="font-bold">{classifiedPayments.nonMembership.length}</span></div>
              <div className="text-sm text-gray-700">Unclassified payments: <span className="font-bold">{classifiedPayments.unclassified.length}</span></div>
              <div className="text-sm text-gray-700">Skipped: <span className="font-bold">{allPayments.length}</span></div>
            </div>
            {importProgress && (
              <div className="bg-white rounded-lg shadow p-4 mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{importProgress.message}</span>
                  <span className="text-sm font-medium text-gray-700">
                    {importProgress.current} / {importProgress.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button
                variant="primary"
                disabled={classifiedPayments.membership.some(p => !members.find(m => m.id === p.selectedMemberId)) || isProcessing}
                onClick={handleImport}
              >
                {isProcessing ? 'Importing...' : 'Import'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActBlueImport; 