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
import SelectField from '../../components/Form/SelectField';
import TextField from '../../components/Form/TextField';
import DataTable from '../../components/UI/DataTable';

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
  allRows: any[];
  mapping: FieldMapping;
}

interface ImportConfirmation {
  member: any;
  existingMember: Member | null;
  action: 'merge' | 'skip' | 'new';
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
  { id: 'birthdate', label: 'Birthdate', required: false },
  { id: 'tell_us_more', label: 'Tell Us More', required: false },
  { id: 'emergency_contact_name', label: 'Emergency Contact Name', required: false },
  { id: 'emergency_contact_phone', label: 'Emergency Contact Phone', required: false },
  { id: 'emergency_contact_relationship', label: 'Emergency Contact Relationship', required: false },
  { id: 'tshirt_size', label: 'T-Shirt Size', required: false },
  { id: 'precinct', label: 'Precinct', required: false },
  { id: 'voter_id', label: 'Voter ID', required: false },
  { id: 'special_skills', label: 'Special Skills', required: false },
  { id: 'health_issues', label: 'Health Issues', required: false },
  { id: 'is_admin', label: 'Admin Status', required: false }
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

// Default values for required fields that might not be in the import file
const DEFAULT_VALUES = {
  membership_type: '', // Will be set from pick list
  status: 'active',
  terms_accepted: true,
  is_admin: false, // Default to non-admin
  is_cell_phone: true,
  registration_date: new Date().toISOString().split('T')[0], // Today's date
  joined_date: new Date().toISOString().split('T')[0], // Today's date
  renewal_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 1 year from now
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
  const [importConfirmations, setImportConfirmations] = useState<ImportConfirmation[]>([]);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [isProcessingImport, setIsProcessingImport] = useState(false);

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
    setSelectedMapping(null); // Reset mapping selection on file change
    try {
      const fileType = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ? 'excel' : 'csv';
      let headers: string[] = [];
      let allRows: any[] = [];
      let sampleRows: any[] = [];

      if (fileType === 'excel') {
        const data = await readExcelFile(file);
        headers = data.headers;
        allRows = data.rows;
        sampleRows = data.rows.slice(0, 5); // Get first 5 rows for preview
      } else {
        const data = await readCSVFile(file);
        headers = data.headers;
        allRows = data.rows;
        sampleRows = data.rows.slice(0, 5);
      }

      // Start with empty mapping
      const mapping: FieldMapping = {
        id: '',
        name: '',
        sourceFields: {},
        transformations: {}
      };

      setImportPreview({
        headers,
        sampleRows,
        allRows,
        mapping
      });

      setIsMappingModalOpen(true);
    } catch (error: any) {
      console.error('Error processing file:', error);
      setAlert({
        type: 'error',
        message: error?.message || 'Failed to process import file'
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

    // Validate default membership type is selected
    if (!defaultMembershipType) {
      setAlert({
        type: 'error',
        message: 'Please select a default membership type before importing'
      });
      return;
    }

    setIsProcessingImport(true);
    setProgress({ current: 0, total: rows.length, message: 'Processing members...' });

    const { sourceFields } = importPreview.mapping;
    const processedMembers = importPreview.allRows.map(row => {
      const member: any = {
        ...DEFAULT_VALUES,
        membership_type: defaultMembershipType, // Use the selected default type
        first_name: null,
        last_name: null,
        email: null
      };
      
      Object.entries(sourceFields).forEach(([destField, sourceField]) => {
        const sourceIndex = importPreview.headers.indexOf(sourceField);
        if (sourceIndex !== -1) {
          let value = row[sourceIndex];
          
          // Clean and validate the value based on field type
          switch (destField) {
            case 'email':
              value = value ? value.toLowerCase().trim() : null;
              break;
            case 'phone':
            case 'emergency_contact_phone':
              value = value ? value.replace(/\D/g, '') : null;
              value = value && value.length === 10 ? value : null;
              break;
            case 'birthdate':
            case 'registration_date':
            case 'joined_date':
            case 'renewal_date':
              if (value) {
                // Try different date formats
                for (const format of TRANSFORMATION_TYPES.DATE.formats) {
                  try {
                    const date = parse(value, format.value, new Date());
                    if (isValid(date)) {
                      value = format(date, 'yyyy-MM-dd');
                      break;
                    }
                  } catch (e) {
                    continue;
                  }
                }
              } else {
                value = null;
              }
              break;
            case 'tshirt_size':
              const validSizes = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
              value = value ? value.toUpperCase() : null;
              value = validSizes.includes(value) ? value : null;
              break;
            case 'first_name':
            case 'last_name':
              value = value ? value.trim() : null;
              break;
            default:
              value = value ? value.trim() : null;
          }
          
          member[destField] = value;
        }
      });

      // Ensure required fields have values
      if (!member.membership_type) {
        member.membership_type = defaultMembershipType;
      }

      return member;
    });

    // Check for existing members
    const confirmations: ImportConfirmation[] = [];
    for (let i = 0; i < processedMembers.length; i++) {
      const member = processedMembers[i];
      if (member.email) {
        const { data: existingMember } = await supabase
          .from('members')
          .select('*')
          .eq('email', member.email)
          .maybeSingle();

        confirmations.push({
          member: {
            ...member,
            first_name: member.first_name || 'No First Name',
            last_name: member.last_name || 'No Last Name',
            email: member.email || 'No Email'
          },
          existingMember,
          action: existingMember ? 'skip' : 'new' // Default to skip for existing members
        });
      }
      setProgress(prev => prev ? { ...prev, current: i + 1 } : null);
    }

    setImportConfirmations(confirmations);
    setIsConfirmationModalOpen(true);
    setProgress(null);
    setIsProcessingImport(false);
  };

  const handleImportConfirmation = async () => {
    setIsProcessingImport(true);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const confirmation of importConfirmations) {
      try {
        if (confirmation.action === 'skip') {
          console.log(`Skipping existing member: ${confirmation.member.email}`);
          continue;
        }

        // Get the membership type value from the ID
        const selectedType = membershipTypes.find(type => type.id === confirmation.member.membership_type);
        if (!selectedType) {
          throw new Error('Invalid membership type');
        }

        // Create the member data with the correct membership type value
        const memberData = {
          ...confirmation.member,
          membership_type: selectedType.value // Use the actual value instead of the ID
        };

        if (confirmation.action === 'merge' && confirmation.existingMember) {
          // Update existing member
          const { error: updateError } = await supabase
            .from('members')
            .update(memberData)
            .eq('id', confirmation.existingMember.id);

          if (updateError) {
            console.error('Error updating member:', updateError);
            throw updateError;
          }

          // If member is admin, ensure they exist in admins table
          if (memberData.is_admin) {
            const { error: adminError } = await supabase
              .from('admins')
              .upsert({ user_id: confirmation.existingMember.user_id }, { onConflict: 'user_id' });
            
            if (adminError) {
              console.error('Error updating admin status:', adminError);
              throw adminError;
            }
          }

          successCount++;
        } else if (confirmation.action === 'new') {
          // Insert new member
          const { data: newMember, error: insertError } = await supabase
            .from('members')
            .insert([memberData])
            .select()
            .single();

          if (insertError) {
            console.error('Error inserting member:', insertError);
            // Add more detailed error information
            const errorDetails = insertError.code === '23505' 
              ? 'Duplicate email address' 
              : insertError.message;
            throw new Error(`${errorDetails} (${memberData.email})`);
          }

          // If member is admin, add them to admins table
          if (memberData.is_admin && newMember) {
            const { error: adminError } = await supabase
              .from('admins')
              .insert({ user_id: newMember.id });
            
            if (adminError) {
              console.error('Error setting admin status:', adminError);
              throw adminError;
            }
          }

          successCount++;
        }
      } catch (error: any) {
        errorCount++;
        const memberName = `${confirmation.member.first_name} ${confirmation.member.last_name}`;
        const errorMessage = error instanceof Error 
          ? `Error processing member ${memberName} (${confirmation.member.email}): ${error.message}`
          : `Error processing member ${memberName} (${confirmation.member.email}): Unknown error`;
        errors.push(errorMessage);
      }
    }

    // Show detailed results
    const resultMessage = `Import completed: ${successCount} members processed successfully, ${errorCount} errors`;
    setAlert({
      type: errorCount > 0 ? 'warning' : 'success',
      message: (
        <div className="space-y-4">
          <div>{resultMessage}</div>
          {errors.length > 0 && (
            <div>
              <div className="font-semibold mb-2">Failed Records:</div>
              <ul className="list-disc pl-5 space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )
    });

    setIsProcessingImport(false);
    setIsConfirmationModalOpen(false);
  };

  const previewColumns = [
    ...MEMBER_FIELDS.map(field => ({
      header: field.label,
      accessor: (row: any) => {
        const sourceField = importPreview.mapping.sourceFields[field.id];
        const sourceIndex = importPreview.headers.indexOf(sourceField);
        const value = sourceIndex !== -1 ? row[sourceIndex] : '';
        
        // Apply transformations for preview
        let displayValue = value;
        if (field.id === 'phone' || field.id === 'emergency_contact_phone') {
          displayValue = value ? value.replace(/\D/g, '') : '';
        } else if (field.id === 'birthdate' && value) {
          for (const format of TRANSFORMATION_TYPES.DATE.formats) {
            try {
              const date = parse(value, format.value, new Date());
              displayValue = format(date, 'yyyy-MM-dd');
              break;
            } catch (e) {
              continue;
            }
          }
        } else if (field.id === 'tshirt_size' && value) {
          const validSizes = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
          displayValue = validSizes.includes(value.toUpperCase()) ? value.toUpperCase() : value;
        }
        
        return displayValue;
      },
      sortable: true
    }))
  ];

  const comparisonColumns = [
    {
      header: 'Field',
      accessor: 'label',
      sortable: true
    },
    {
      header: 'Imported',
      accessor: 'imported',
      sortable: true
    },
    {
      header: 'Existing',
      accessor: 'existing',
      sortable: true
    }
  ];

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
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Map Fields</h3>
                <input
                  type="text"
                  placeholder="Mapping name"
                  value={mappingName}
                  onChange={(e) => setMappingName(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 w-64"
                />
              </div>

              {/* Default Values Section */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-4">Default Values</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Membership Type
                    </label>
                    <select
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      value={defaultMembershipType}
                      onChange={(e) => setDefaultMembershipType(e.target.value)}
                    >
                      <option value="">Select a membership type...</option>
                      {membershipTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.value}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Status
                    </label>
                    <select
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      value={DEFAULT_VALUES.status}
                      onChange={(e) => {
                        setImportPreview(prev => ({
                          ...prev!,
                          mapping: {
                            ...prev!.mapping,
                            defaultValues: {
                              ...prev!.mapping.defaultValues,
                              status: e.target.value
                            }
                          }
                        }));
                      }}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Show alert inside the modal if present */}
              {alert && (
                <Alert
                  type={alert.type}
                  message={alert.message}
                  onClose={() => setAlert(null)}
                  className="mb-4"
                />
              )}
              {/* Mapping selection dropdown */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Load Saved Mapping</label>
                <select
                  className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={selectedMapping?.id || ''}
                  onChange={(e) => {
                    const mapping = savedMappings.find(m => m.id === e.target.value);
                    setSelectedMapping(mapping || null);
                    if (mapping && importPreview) {
                      // Create a new mapping object with the selected mapping's fields
                      const newMapping = {
                        id: mapping.id,
                        name: mapping.name,
                        sourceFields: { ...mapping.source_fields },
                        transformations: { ...mapping.transformations }
                      };
                      
                      // Update the import preview with the new mapping
                      setImportPreview(prev => prev ? {
                        ...prev,
                        mapping: newMapping
                      } : null);
                      
                      // Set the mapping name
                      setMappingName(mapping.name);
                    }
                  }}
                >
                  <option value="">Select saved mapping...</option>
                  {savedMappings.map(mapping => (
                    <option key={mapping.id} value={mapping.id}>
                      {mapping.name}
                    </option>
                  ))}
                </select>
              </div>
              {/* Field mapping UI (dropdowns for mapping file headers to member fields) */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8">
                {MEMBER_FIELDS.map(field => (
                  <div key={field.id} className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      value={
                        importPreview.mapping.sourceFields[field.id] &&
                        importPreview.headers.includes(importPreview.mapping.sourceFields[field.id])
                          ? importPreview.mapping.sourceFields[field.id]
                          : ''
                      }
                      onChange={e => {
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
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <h4 className="font-medium mb-2">Preview</h4>
                <div className="overflow-x-auto">
                  <DataTable
                    columns={previewColumns}
                    data={importPreview.sampleRows.map((row, index) => ({ ...row, id: index }))}
                    searchable={true}
                    searchPlaceholder="Search preview data..."
                    className="bg-white shadow rounded-lg"
                  />
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
                    if (!importPreview?.mapping) return;
                    
                    // Check for required fields in mapping
                    const requiredFields = ['first_name', 'last_name', 'email'];
                    const missingFields = requiredFields.filter(f => !importPreview.mapping.sourceFields[f]);
                    
                    if (missingFields.length > 0) {
                      setAlert({
                        type: 'error',
                        message: `Mapping is missing required fields: ${missingFields.join(', ')}. Please map all required fields before importing.`
                      });
                      return;
                    }
                    
                    // Process the import
                    processMemberImport(importPreview.allRows);
                    setIsMappingModalOpen(false);
                  }}
                >
                  Import
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Import Confirmation Modal */}
        {isConfirmationModalOpen && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold">Confirm Import</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {importConfirmations.filter(c => !c.existingMember).length} new members to create
                    {importConfirmations.filter(c => c.existingMember).length > 0 && 
                      ` • ${importConfirmations.filter(c => c.existingMember).length} existing members found`}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsConfirmationModalOpen(false);
                      setImportConfirmations([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleImportConfirmation}
                    disabled={isProcessingImport}
                  >
                    {isProcessingImport ? 'Processing...' : 'Confirm Import'}
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                {/* Matched Members Section - Moved to top */}
                {importConfirmations.filter(c => c.existingMember).length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-medium">
                        Existing Members Found ({importConfirmations.filter(c => c.existingMember).length})
                      </h4>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setImportConfirmations(prev => 
                              prev.map(c => c.existingMember ? { ...c, action: 'merge' } : c)
                            );
                          }}
                        >
                          Merge All
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setImportConfirmations(prev => 
                              prev.map(c => c.existingMember ? { ...c, action: 'skip' } : c)
                            );
                          }}
                        >
                          Skip All
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {importConfirmations
                        .filter(confirmation => confirmation.existingMember && confirmation.member)
                        .map((confirmation, index) => (
                          <div key={index} className="border rounded-lg p-4 bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div className="space-y-2">
                                <div>
                                  <h3 className="font-medium text-gray-900">Import Record:</h3>
                                  <p className="text-sm">
                                    {confirmation.member?.first_name || 'No First Name'} {confirmation.member?.last_name || 'No Last Name'}
                                  </p>
                                  <p className="text-sm text-gray-500">{confirmation.member?.email || 'No Email'}</p>
                                </div>
                                <div>
                                  <h3 className="font-medium text-gray-900">Existing Member:</h3>
                                  <p className="text-sm">
                                    {confirmation.existingMember?.first_name || 'No First Name'} {confirmation.existingMember?.last_name || 'No Last Name'}
                                  </p>
                                  <p className="text-sm text-gray-500">{confirmation.existingMember?.email || 'No Email'}</p>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  variant={confirmation.action === 'merge' ? 'primary' : 'outline'}
                                  onClick={() => {
                                    setImportConfirmations(prev => 
                                      prev.map((c, i) => i === index ? { ...c, action: 'merge' } : c)
                                    );
                                  }}
                                >
                                  Merge
                                </Button>
                                <Button
                                  variant={confirmation.action === 'skip' ? 'primary' : 'outline'}
                                  onClick={() => {
                                    setImportConfirmations(prev => 
                                      prev.map((c, i) => i === index ? { ...c, action: 'skip' } : c)
                                    );
                                  }}
                                >
                                  Skip
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* New Members Section - Moved to bottom */}
                {importConfirmations.filter(c => !c.existingMember && c.member).length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-medium">
                        New Members to Create ({importConfirmations.filter(c => !c.existingMember && c.member).length})
                      </h4>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setImportConfirmations(prev => 
                            prev.map(c => !c.existingMember && c.member ? { ...c, action: 'new' } : c)
                          );
                        }}
                      >
                        Import All New
                      </Button>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">Review New Members</p>
                            <p className="text-sm text-gray-500">
                              {importConfirmations.filter(c => !c.existingMember && c.member).length} new members will be created
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setImportConfirmations(prev => 
                                prev.map(c => !c.existingMember && c.member ? { ...c, action: 'new' } : c)
                              );
                            }}
                          >
                            Import All
                          </Button>
                        </div>
                      </div>
                      <div className="divide-y">
                        {importConfirmations
                          .filter(confirmation => !confirmation.existingMember && confirmation.member)
                          .map((confirmation, index) => (
                            <div key={index} className="p-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-medium">
                                    {confirmation.member?.first_name || 'No First Name'} {confirmation.member?.last_name || 'No Last Name'}
                                  </h3>
                                  <p className="text-sm text-gray-500">{confirmation.member?.email || 'No Email'}</p>
                                </div>
                                <Button
                                  variant={confirmation.action === 'new' ? 'primary' : 'outline'}
                                  onClick={() => {
                                    setImportConfirmations(prev => 
                                      prev.map((c, i) => i === index ? { ...c, action: 'new' } : c)
                                    );
                                  }}
                                >
                                  Import New
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminImports; 