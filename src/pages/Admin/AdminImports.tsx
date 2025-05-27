import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Alert from '../../components/UI/Alert';
import { Upload, FileText, Users, AlertCircle, Save, Map, Download, X, Search, Plus, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format, parseISO, parse } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import * as XLSX from 'xlsx';
import { getPickListValues, PICK_LIST_CATEGORIES } from '../../lib/pickLists';

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
}

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface PickListValue {
  id: string;
  value: string;
  type: string;
}

interface FieldMapping {
  id: string;
  name: string;
  sourceFields: {
    [key: string]: string; // destination field -> source field
  };
  transformations: {
    [key: string]: string; // field -> transformation type
  };
}

interface ImportPreview {
  headers: string[];
  sampleRows: any[];
  mapping: FieldMapping;
}

const MEMBER_FIELDS = [
  { id: 'first_name', label: 'First Name', required: true },
  { id: 'last_name', label: 'Last Name', required: true },
  { id: 'email', label: 'Email', required: true },
  { id: 'phone', label: 'Phone', required: false },
  { id: 'address', label: 'Address', required: false },
  { id: 'city', label: 'City', required: false },
  { id: 'state', label: 'State', required: false },
  { id: 'zip', label: 'ZIP', required: false },
  { id: 'birth_date', label: 'Birth Date', required: false },
  { id: 'status', label: 'Status', required: false },
  { id: 'renewal_date', label: 'Renewal Date', required: false }
];

const TRANSFORMATION_TYPES = {
  DATE: {
    label: 'Date',
    formats: [
      { label: 'MM/DD/YYYY', value: 'MM/dd/yyyy' },
      { label: 'DD/MM/YYYY', value: 'dd/MM/yyyy' },
      { label: 'YYYY-MM-DD', value: 'yyyy-MM-dd' },
      { label: 'Month DD, YYYY', value: 'MMMM d, yyyy' }
    ]
  },
  PHONE: {
    label: 'Phone Number',
    formats: [
      { label: '(XXX) XXX-XXXX', value: 'standard' },
      { label: 'XXX-XXX-XXXX', value: 'dashed' },
      { label: 'XXXXXXXXXX', value: 'plain' }
    ]
  }
};

const AdminImports: React.FC = () => {
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [unmatchedPayments, setUnmatchedPayments] = useState<UnmatchedPayment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{current: number, total: number, message: string} | null>(null);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState<UnmatchedPayment | null>(null);
  const [savedMappings, setSavedMappings] = useState<FieldMapping[]>([]);
  const [selectedMapping, setSelectedMapping] = useState<FieldMapping | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [mappingName, setMappingName] = useState('');
  const [membershipTypes, setMembershipTypes] = useState<PickListValue[]>([]);
  const [defaultMembershipType, setDefaultMembershipType] = useState<string>('');

  // Load saved mappings and membership types
  useEffect(() => {
    loadSavedMappings();
    loadMembers();
    loadMembershipTypes();
  }, []);

  const loadSavedMappings = async () => {
    try {
      const { data, error } = await supabase
        .from('import_mappings')
        .select('*')
        .eq('type', 'member');

      if (error) throw error;
      setSavedMappings(data || []);
    } catch (error) {
      console.error('Error loading mappings:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load saved mappings'
      });
    }
  };

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, first_name, last_name, email')
        .order('last_name', { ascending: true });

      if (error) throw error;
      setMembers(data || []);
      console.log('Loaded members:', data);
    } catch (error) {
      console.error('Error loading members:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load members'
      });
    }
  };

  const loadMembershipTypes = async () => {
    try {
      // First get the category ID for membership_types
      const { data: categoryData, error: categoryError } = await supabase
        .from('pick_list_categories')
        .select('id')
        .eq('name', PICK_LIST_CATEGORIES.MEMBERSHIP_TYPES)
        .single();

      if (categoryError) throw categoryError;

      // Then get the values for this category
      const { data, error } = await supabase
        .from('pick_list_values')
        .select('*')
        .eq('category_id', categoryData.id)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setMembershipTypes(data || []);
      if (data && data.length > 0) {
        setDefaultMembershipType(data[0].id);
      }
    } catch (error) {
      console.error('Error loading membership types:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load membership types'
      });
    }
  };

  const checkExistingPayment = async (receiptId: string) => {
    const { data, error } = await supabase
      .from('payments')
      .select('id')
      .eq('receipt_id', receiptId)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking existing payment:', error);
      return null;
    }
    
    return data;
  };

  const findMemberByEmail = async (email: string) => {
    // Normalize email: lowercase and trim
    const normalizedEmail = email.toLowerCase().trim();
    console.log('Looking for member with email:', normalizedEmail);
    
    const { data, error } = await supabase
      .from('members')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle();
    
    if (error) {
      console.error('Error finding member:', error);
      return null;
    }
    
    if (data) {
      console.log('Found matching member:', data);
    } else {
      console.log('No member found with email:', normalizedEmail);
    }
    
    return data;
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
        setProgress(prev => prev ? { ...prev, current: i + 1 } : null);
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

  // Handle member selection for unmatched payment
  const handleMemberSelect = async (payment: UnmatchedPayment, memberId: string) => {
    try {
      await createPaymentRecord(payment, memberId);
      setUnmatchedPayments((prev: UnmatchedPayment[]) => prev.filter((p: UnmatchedPayment) => p.receiptId !== payment.receiptId));
      setAlert({
        type: 'success',
        message: 'Payment successfully attached to member'
      });
    } catch (error) {
      console.error('Error attaching payment to member:', error);
      setAlert({
        type: 'error',
        message: 'Failed to attach payment to member'
      });
    }
  };

  // Create new member from payment data
  const handleCreateMember = async (payment: UnmatchedPayment) => {
    try {
      // Calculate renewal dates based on payment date
      const paymentDateObj = utcToZonedTime(parseISO(payment.date), timeZone);
      const paymentMonth = paymentDateObj.getMonth() + 1; // JavaScript months are 0-based
      const currentYear = paymentDateObj.getFullYear();
      
      // Determine if payment qualifies for membership (≥ $25)
      const qualifiesForMembership = payment.amount >= 25;
      
      // Set renewal date based on payment month and amount
      let renewalDate: string | null = null;
      if (qualifiesForMembership) {
        if (paymentMonth >= 10) {
          // Oct-Dec payments: active for current and next year
          renewalDate = new Date(currentYear + 1, 11, 31).toISOString(); // Dec 31 of next year
        } else {
          // Jan-Sept payments: active for current year only
          renewalDate = new Date(currentYear, 11, 31).toISOString(); // Dec 31 of current year
        }
      }

      if (!defaultMembershipType) {
        throw new Error('Please select a default membership type');
      }

      // Find the selected membership type to get its value
      const selectedType = membershipTypes.find(type => type.id === defaultMembershipType);
      if (!selectedType) {
        throw new Error('Selected membership type not found');
      }

      const { data: newMember, error: memberError } = await supabase
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
          status: qualifiesForMembership ? 'active' : 'inactive',
          membership_type: selectedType.value, // Use the value instead of the ID
          renewal_date: renewalDate,
          joined_date: new Date().toISOString()
        }])
        .select()
        .single();

      if (memberError) throw memberError;

      await createPaymentRecord(payment, newMember.id);
      setUnmatchedPayments((prev: UnmatchedPayment[]) => prev.filter((p: UnmatchedPayment) => p.receiptId !== payment.receiptId));
      setAlert({
        type: 'success',
        message: 'New member created and payment recorded'
      });
    } catch (error) {
      console.error('Error creating new member:', error);
      setAlert({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to create new member'
      });
    }
  };

  // Handle member file import
  const handleMemberFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const fileType = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ? 'excel' : 'csv';
      let headers: string[] = [];
      let sampleRows: any[] = [];

      if (fileType === 'excel') {
        const data = await readExcelFile(file);
        headers = data.headers;
        sampleRows = data.rows.slice(0, 5); // Get first 5 rows for preview
      } else {
        const data = await readCSVFile(file);
        headers = data.headers;
        sampleRows = data.rows.slice(0, 5);
      }

      setImportPreview({
        headers,
        sampleRows,
        mapping: selectedMapping || {
          id: '',
          name: '',
          sourceFields: {},
          transformations: {}
        }
      });

      setIsMappingModalOpen(true);
    } catch (error) {
      console.error('Error processing file:', error);
      setAlert({
        type: 'error',
        message: 'Failed to process import file'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const readExcelFile = (file: File): Promise<{ headers: string[], rows: any[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1);
          resolve({ headers, rows });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const readCSVFile = (file: File): Promise<{ headers: string[], rows: any[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const rows = text.split('\n').map(row => row.split(','));
          const headers = rows[0];
          resolve({ headers, rows: rows.slice(1) });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const saveMapping = async () => {
    if (!mappingName || !importPreview) return;

    try {
      const { data, error } = await supabase
        .from('import_mappings')
        .insert([{
          name: mappingName,
          type: 'member',
          source_fields: importPreview.mapping.sourceFields,
          transformations: importPreview.mapping.transformations
        }])
        .select()
        .single();

      if (error) throw error;

      setSavedMappings(prev => [...prev, data]);
      setAlert({
        type: 'success',
        message: 'Mapping saved successfully'
      });
    } catch (error) {
      console.error('Error saving mapping:', error);
      setAlert({
        type: 'error',
        message: 'Failed to save mapping'
      });
    }
  };

  const applyTransformation = (value: string, field: string, transformation: string) => {
    if (!value) return value;

    const fieldMapping = importPreview?.mapping;
    if (!fieldMapping) return value;

    const transformType = fieldMapping.transformations[field];
    if (!transformType) return value;

    switch (transformType) {
      case 'DATE':
        // Try different date formats
        for (const format of TRANSFORMATION_TYPES.DATE.formats) {
          try {
            const date = parse(value, format.value, new Date());
            return format(date, 'yyyy-MM-dd');
          } catch (e) {
            continue;
          }
        }
        return value;

      case 'PHONE':
        // Remove all non-numeric characters
        const numbers = value.replace(/\D/g, '');
        if (numbers.length === 10) {
          return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6)}`;
        }
        return value;

      default:
        return value;
    }
  };

  const processMemberImport = async (rows: any[]) => {
    if (!importPreview?.mapping) return;

    const { sourceFields, transformations } = importPreview.mapping;
    const processedMembers = rows.map(row => {
      const member: any = {};
      
      Object.entries(sourceFields).forEach(([destField, sourceField]) => {
        const sourceIndex = importPreview.headers.indexOf(sourceField);
        if (sourceIndex !== -1) {
          const value = row[sourceIndex];
          member[destField] = applyTransformation(value, destField, transformations[destField] || '');
        }
      });

      return member;
    });

    // Insert members in batches
    const batchSize = 50;
    for (let i = 0; i < processedMembers.length; i += batchSize) {
      const batch = processedMembers.slice(i, i + batchSize);
      const { error } = await supabase
        .from('members')
        .insert(batch);

      if (error) {
        throw new Error(`Error inserting batch starting at index ${i}: ${error.message}`);
      }
    }

    setAlert({
      type: 'success',
      message: `Successfully imported ${processedMembers.length} members`
    });
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Import Data</h1>
        </div>

        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
            className="mb-6"
          />
        )}

        {progress && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">{progress.message}</span>
              <span className="text-sm text-gray-500">{progress.current} / {progress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-primary-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="flex gap-8">
          {/* Main Content Area */}
          <div className="flex-1">
            {/* Unmatched Payments Section */}
            {unmatchedPayments.length > 0 ? (
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
                            <select
                              className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleMemberSelect(payment, e.target.value);
                                }
                              }}
                            >
                              <option value="">Select member...</option>
                              {members.map((member) => (
                                <option key={member.id} value={member.id}>
                                  {member.first_name} {member.last_name} ({member.email})
                                </option>
                              ))}
                            </select>
                            <Button
                              variant="outline"
                              onClick={() => handleCreateMember(payment)}
                            >
                              Create Member
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500">No unmatched payments to display. Upload a file to get started.</p>
              </div>
            )}

            {unmatchedPayments.length > 0 && (
              <div className="mb-6">
                <Card>
                  <div className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Default Settings</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Default Membership Type
                        </label>
                        <select
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          value={defaultMembershipType}
                          onChange={(e) => setDefaultMembershipType(e.target.value)}
                        >
                          {membershipTypes.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.value}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-96 space-y-6">
            {/* ActBlue Import Section */}
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Import ActBlue Payments</h2>
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

            {/* Member Import Section */}
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Members</h2>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 mb-4">
                    <select
                      className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      value={selectedMapping?.id || ''}
                      onChange={(e) => {
                        const mapping = savedMappings.find(m => m.id === e.target.value);
                        setSelectedMapping(mapping || null);
                      }}
                    >
                      <option value="">Select saved mapping...</option>
                      {savedMappings.map(mapping => (
                        <option key={mapping.id} value={mapping.id}>
                          {mapping.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedMapping(null);
                        setImportPreview(null);
                      }}
                    >
                      Clear Mapping
                    </Button>
                  </div>

                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-4 text-gray-500" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">CSV or Excel files</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleMemberFileImport}
                        disabled={isProcessing}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Field Mapping Modal */}
        {isMappingModalOpen && importPreview && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Map Fields</h3>
              
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Mapping name"
                  value={mappingName}
                  onChange={(e) => setMappingName(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Source Fields</h4>
                  <div className="space-y-2">
                    {importPreview.headers.map((header, index) => (
                      <div key={index} className="p-2 bg-gray-50 rounded">
                        {header}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Destination Fields</h4>
                  <div className="space-y-4">
                    {MEMBER_FIELDS.map(field => (
                      <div key={field.id} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        <select
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          value={importPreview.mapping.sourceFields[field.id] || ''}
                          onChange={(e) => {
                            setImportPreview(prev => ({
                              ...prev!,
                              mapping: {
                                ...prev!.mapping,
                                sourceFields: {
                                  ...prev!.mapping.sourceFields,
                                  [field.id]: e.target.value
                                }
                              }
                            }));
                          }}
                        >
                          <option value="">Select field...</option>
                          {importPreview.headers.map((header, index) => (
                            <option key={index} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>

                        {/* Transformation selector for dates and phone numbers */}
                        {(field.id === 'birth_date' || field.id === 'renewal_date' || field.id === 'phone') && (
                          <select
                            className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            value={importPreview.mapping.transformations[field.id] || ''}
                            onChange={(e) => {
                              setImportPreview(prev => ({
                                ...prev!,
                                mapping: {
                                  ...prev!.mapping,
                                  transformations: {
                                    ...prev!.mapping.transformations,
                                    [field.id]: e.target.value
                                  }
                                }
                              }));
                            }}
                          >
                            <option value="">No transformation</option>
                            {field.id.includes('date') ? (
                              TRANSFORMATION_TYPES.DATE.formats.map(format => (
                                <option key={format.value} value={format.value}>
                                  {format.label}
                                </option>
                              ))
                            ) : (
                              TRANSFORMATION_TYPES.PHONE.formats.map(format => (
                                <option key={format.value} value={format.value}>
                                  {format.label}
                                </option>
                              ))
                            )}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview Section */}
              <div className="mt-6">
                <h4 className="font-medium mb-2">Preview</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {MEMBER_FIELDS.map(field => (
                          <th key={field.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {field.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {importPreview.sampleRows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {MEMBER_FIELDS.map(field => {
                            const sourceField = importPreview.mapping.sourceFields[field.id];
                            const sourceIndex = importPreview.headers.indexOf(sourceField);
                            const value = sourceIndex !== -1 ? row[sourceIndex] : '';
                            const transformedValue = applyTransformation(
                              value,
                              field.id,
                              importPreview.mapping.transformations[field.id] || ''
                            );
                            return (
                              <td key={field.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {transformedValue}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setIsMappingModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={saveMapping}
                  disabled={!mappingName}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Mapping
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    // Process the import
                    processMemberImport(importPreview.sampleRows);
                    setIsMappingModalOpen(false);
                  }}
                >
                  Import
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminImports; 