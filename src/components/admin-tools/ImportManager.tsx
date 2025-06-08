import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, FileText, AlertCircle, Save } from 'lucide-react';
import Button from '../UI/Button';
import Alert from '../UI/Alert';
import Card from '../UI/Card';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { getPickListValues, PICK_LIST_CATEGORIES } from '../../lib/pickLists';
import { format, parse } from 'date-fns';

interface ImportPreview {
  headers: string[];
  sampleRows: any[];
  allRows: any[];
  mapping: FieldMapping;
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
  defaultValues: {
    [key: string]: any;
  };
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
  { id: 'date_of_birth', label: 'Date of Birth', required: false },
  { id: 'tell_us_more', label: 'Tell Us More', required: false },
  { id: 'emergency_contact_name', label: 'Emergency Contact Name', required: false },
  { id: 'emergency_contact_phone', label: 'Emergency Contact Phone', required: false },
  { id: 'emergency_contact_relationship', label: 'Emergency Contact Relationship', required: false },
  { id: 'tshirt_size', label: 'T-Shirt Size', required: false },
  { id: 'precinct', label: 'Precinct', required: false },
  { id: 'voter_id', label: 'Voter ID', required: false },
  { id: 'special_skills', label: 'Special Skills', required: false },
  { id: 'health_issues', label: 'Health Issues', required: false }
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

const DEFAULT_VALUES = {
  membership_type: '', // Will be set from pick list
  status: 'active',
  terms_accepted: true,
  is_admin: false,
  is_cell_phone: true,
  registration_date: new Date().toISOString().split('T')[0],
  joined_date: new Date().toISOString().split('T')[0],
  renewal_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
};

const ImportManager: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [savedMappings, setSavedMappings] = useState<FieldMapping[]>([]);
  const [selectedMapping, setSelectedMapping] = useState<FieldMapping | null>(null);
  const [mappingName, setMappingName] = useState('');
  const [membershipTypes, setMembershipTypes] = useState<Array<{value: string, label: string}>>([]);
  const [defaultMembershipType, setDefaultMembershipType] = useState<string>('');
  const [step, setStep] = useState<'mapping' | 'preview' | 'resolve-file-dupes' | 'resolve-db-dupes' | 'import-ready'>('mapping');
  const [processedRows, setProcessedRows] = useState<any[]>([]);
  const [duplicateRows, setDuplicateRows] = useState<Set<number>>(new Set());
  const [fileDuplicateGroups, setFileDuplicateGroups] = useState<{email: string, members: any[]}[]>([]);
  const [fileDupeResolutions, setFileDupeResolutions] = useState<{[email: string]: number | null}>({});
  const [progress, setProgress] = useState<{ current: number; total: number; message: string } | null>(null);
  const [dbDuplicateGroups, setDbDuplicateGroups] = useState<{email: string, imported: any, existing: any}[]>([]);
  const [dbDupeResolutions, setDbDupeResolutions] = useState<{[email: string]: 'skip' | 'merge' | null}>({});
  const [importReadyRows, setImportReadyRows] = useState<any[]>([]);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; message: string } | null>(null);
  const [importComplete, setImportComplete] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const [convertingHousehold, setConvertingHousehold] = useState<string | null>(null);
  const [householdConvertLoading, setHouseholdConvertLoading] = useState(false);
  const [selectedPrimaryContact, setSelectedPrimaryContact] = useState<{[email: string]: number}>({});

  // Load saved mappings and membership types
  useEffect(() => {
    loadSavedMappings();
    loadMembershipTypes();
  }, []);

  const loadSavedMappings = async () => {
    try {
      const { data, error } = await supabase
        .from('import_mappings')
        .select('*')
        .eq('type', 'member');

      if (error) throw error;
      setSavedMappings((prev: FieldMapping[]) => [...prev, ...(data || [])]);
    } catch (error) {
      console.error('Error loading mappings:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load saved mappings'
      });
    }
  };

  const loadMembershipTypes = async () => {
    try {
      const membershipValues = await getPickListValues(PICK_LIST_CATEGORIES.MEMBERSHIP_TYPES);
      setMembershipTypes(membershipValues.map((value: { value: string; name: string }) => ({
        value: value.value,
        label: value.name
      })));
      if (membershipValues.length > 0) {
        setDefaultMembershipType(membershipValues[0].value);
      }
    } catch (error) {
      console.error('Error loading membership types:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load membership types'
      });
    }
  };

  const readExcelFile = async (file: File): Promise<{ headers: string[], rows: any[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          
          if (jsonData.length < 2) {
            throw new Error('File must contain at least a header row and one data row');
          }

          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1) as any[];
          
          resolve({ headers, rows });
        } catch (error) {
          reject(new Error('Failed to process Excel file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const readCSVFile = async (file: File): Promise<{ headers: string[], rows: any[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n');
          
          if (lines.length < 2) {
            throw new Error('File must contain at least a header row and one data row');
          }

          const headers = lines[0].split(',').map((h: string) => h.trim());
          const rows = lines.slice(1)
            .filter((line: string) => line.trim())
            .map((line: string) => line.split(',').map((cell: string) => cell.trim()));

          resolve({ headers, rows });
        } catch (error) {
          reject(new Error('Failed to process CSV file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setImportPreview(null);
    setAlert(null);

    try {
      const fileType = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ? 'excel' : 'csv';
      let headers: string[] = [];
      let allRows: any[] = [];
      let sampleRows: any[] = [];

      if (fileType === 'excel') {
        const data = await readExcelFile(file);
        headers = data.headers;
        allRows = data.rows;
        sampleRows = data.rows.slice(0, 5);
      } else {
        const data = await readCSVFile(file);
        headers = data.headers;
        allRows = data.rows;
        sampleRows = data.rows.slice(0, 5);
      }

      // Initialize empty mapping
      const mapping: FieldMapping = {
        id: '',
        name: '',
        sourceFields: {},
        transformations: {},
        defaultValues: { ...DEFAULT_VALUES }
      };

      setImportPreview({
        headers,
        sampleRows,
        allRows,
        mapping
      });

      setAlert({
        type: 'success',
        message: `Successfully loaded ${allRows.length} rows from file`
      });
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

  const saveMapping = async () => {
    if (!mappingName || !importPreview) return;

    try {
      // First try to save without default_values
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

      if (error) {
        // If error is about missing column, try to add it
        if (error.message.includes('default_values')) {
          const { error: alterError } = await supabase.rpc('add_default_values_column');
          if (alterError) throw alterError;

          // Try the insert again with default_values
          const { data: retryData, error: retryError } = await supabase
            .from('import_mappings')
            .insert([{
              name: mappingName,
              type: 'member',
              source_fields: importPreview.mapping.sourceFields,
              transformations: importPreview.mapping.transformations,
              default_values: importPreview.mapping.defaultValues
            }])
            .select()
            .single();

          if (retryError) throw retryError;
          setSavedMappings((prev: FieldMapping[]) => [...prev, retryData]);
        } else {
          throw error;
        }
      } else {
        setSavedMappings((prev: FieldMapping[]) => [...prev, data]);
      }

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

  // Helper: Check if all required fields are mapped
  const allRequiredMapped = importPreview && MEMBER_FIELDS.filter(f => f.required).every(f => importPreview.mapping.sourceFields[f.id]);

  // Helper: Get transformation options for a field
  const getTransformationOptions = (fieldId: string) => {
    if (fieldId === 'date_of_birth') return TRANSFORMATION_TYPES.DATE.formats;
    // No transformation for phone, always digits only
    return null;
  };

  // Helper: Apply transformation to a value
  const applyTransformation = (fieldId: string, value: any, transformation: string) => {
    if (!value) return value;
    if (fieldId === 'date_of_birth') {
      // Try to parse and format date
      try {
        let parsed;
        if (transformation === 'MM/dd/yyyy') parsed = parse(value, 'MM/dd/yyyy', new Date());
        else if (transformation === 'dd/MM/yyyy') parsed = parse(value, 'dd/MM/yyyy', new Date());
        else if (transformation === 'yyyy-MM-dd') parsed = parse(value, 'yyyy-MM-dd', new Date());
        else if (transformation === 'MMMM d, yyyy') parsed = parse(value, 'MMMM d, yyyy', new Date());
        else parsed = new Date(value);
        return format(parsed, 'yyyy-MM-dd');
      } catch {
        return value;
      }
    }
    // No transformation for phone
    return value;
  };

  // Process data according to mapping/defaults and transformations
  const processData = () => {
    if (!importPreview) return;
    setProgress((prev: { current: number; total: number; message: string } | null) => ({
      current: 0,
      total: importPreview.allRows.length,
      message: 'Processing file...'
    }));
    if (topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth' });
    const { allRows, headers, mapping } = importPreview;
    const processed: { rowIdx: number, data: any }[] = [];
    const seenEmails = new Map<string, number[]>(); // normalized email -> array of processed indexes
    const duplicates = new Set<number>();
    
    // Log the current mapping state
    console.log('Processing with mapping:', {
      sourceFields: mapping.sourceFields,
      transformations: mapping.transformations,
      defaultValues: mapping.defaultValues
    });
    
    // Ensure default values are set
    const defaultValues = {
      ...DEFAULT_VALUES,
      ...mapping.defaultValues,
      membership_type: mapping.defaultValues.membership_type || defaultMembershipType
    };

    // Validate required field mappings
    const missingRequiredFields = MEMBER_FIELDS
      .filter(field => field.required && !mapping.sourceFields[field.id])
      .map(field => field.label);

    if (missingRequiredFields.length > 0) {
      setAlert({
        type: 'error',
        message: `Missing required field mappings: ${missingRequiredFields.join(', ')}`
      });
      return;
    }

    allRows.forEach((row: any[], rowIdx: number) => {
      const mapped: any = { ...defaultValues };
      let hasRequiredFields = true;

      MEMBER_FIELDS.forEach(field => {
        const source = mapping.sourceFields[field.id];
        if (source && headers.includes(source)) {
          const idx = headers.indexOf(source);
          const value = row[idx];
          if (field.required && (value === undefined || value === null || value === '')) {
            hasRequiredFields = false;
            console.log(`Missing required value for ${field.label} in row ${rowIdx + 1}`);
          }
          if (value !== undefined && value !== null && value !== '') {
            if (field.id === 'phone') {
              mapped[field.id] = value ? String(value).replace(/\D/g, '') : '';
            } else if (mapping.transformations[field.id]) {
              mapped[field.id] = applyTransformation(field.id, value, mapping.transformations[field.id]);
            } else {
              mapped[field.id] = value;
            }
          }
        }
      });

      if (hasRequiredFields) {
        const normalizedEmail = mapped.email ? mapped.email.trim().toLowerCase() : '';
        const processedIdx = processed.length;
        processed.push({ rowIdx, data: mapped });
        if (normalizedEmail) {
          if (!seenEmails.has(normalizedEmail)) {
            seenEmails.set(normalizedEmail, []);
          }
          seenEmails.get(normalizedEmail)!.push(processedIdx);
        }
      } else {
        console.log(`Skipping row ${rowIdx + 1} due to missing required fields`);
      }

      if ((rowIdx + 1) % 10 === 0 || rowIdx === allRows.length - 1) {
        setProgress((prev: { current: number; total: number; message: string } | null) => prev ? { ...prev, current: rowIdx + 1 } : null);
      }
    });

    // Build file duplicate groups using processed indexes
    const fileDupes: { email: string, members: any[] }[] = [];
    seenEmails.forEach((indexes: number[], email: string) => {
      if (indexes.length > 1) {
        fileDupes.push({
          email,
          members: indexes.map(idx => processed[idx]?.data).filter(Boolean)
        });
        indexes.forEach(idx => { if (indexes.length > 1) duplicates.add(idx); });
      }
    });
    setProcessedRows(processed.map(p => p.data));
    setDuplicateRows(duplicates);
    setFileDuplicateGroups(fileDupes);
    setFileDupeResolutions({});
    setTimeout(() => setProgress(null), 500);
    const nextStep = fileDupes.length > 0 ? 'resolve-file-dupes' : 'preview';
    console.log('Setting step:', nextStep, 'fileDupes:', fileDupes);
    setStep(nextStep);
  };

  // Handler for resolving file duplicate group
  const handleResolveFileDupe = (email: string, selectedIdx: number | null) => {
    setFileDupeResolutions((prev: {[email: string]: number | null}) => ({ ...prev, [email]: selectedIdx }));
  };

  // Handler to finalize file duplicate resolutions
  const finalizeFileDupeResolutions = () => {
    setProgress((prev: { current: number; total: number; message: string } | null) => ({
      current: 0,
      total: fileDuplicateGroups.length,
      message: 'Resolving duplicates...'
    }));
    if (topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth' });
    // Only keep the selected row for each dupe group, skip others
    const toKeep = new Set<number>();
    fileDuplicateGroups.forEach((group: { email: string; members: any[] }, i: number) => {
      const selected = fileDupeResolutions[group.email];
      if (selected !== undefined && selected !== null) {
        toKeep.add(selected);
      }
      setProgress((prev: { current: number; total: number; message: string } | null) => prev ? { ...prev, current: i + 1 } : null);
    });
    // For non-duplicate rows, keep as is
    processedRows.forEach((row: any, idx: number) => {
      if (!duplicateRows.has(idx)) toKeep.add(idx);
    });
    // Filter processedRows to only those in toKeep
    setProcessedRows(processedRows.filter((row: any, idx: number) => toKeep.has(idx)));
    setDuplicateRows(new Set());
    setFileDuplicateGroups([]);
    setFileDupeResolutions({});
    setTimeout(() => setProgress(null), 500);
    setStep('preview');
  };

  // Helper: Render a comparison table for two records
  const renderComparisonTable = (imported: any, existing: any) => (
    <table className="min-w-full divide-y divide-gray-200 mb-2 text-xs">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-2 py-1 text-left font-medium text-gray-500">Field</th>
          <th className="px-2 py-1 text-left font-medium text-gray-500">Imported</th>
          <th className="px-2 py-1 text-left font-medium text-gray-500">Existing</th>
        </tr>
      </thead>
      <tbody>
        {MEMBER_FIELDS.map((field: { id: string; label: string; required: boolean }) => (
          <tr key={field.id}>
            <td className="px-2 py-1 font-semibold text-gray-700 whitespace-nowrap">{field.label}</td>
            <td className="px-2 py-1 text-gray-900 whitespace-nowrap">{imported[field.id] || ''}</td>
            <td className="px-2 py-1 text-gray-500 whitespace-nowrap">{existing[field.id] || ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  // Handler to check for database duplicates and show resolution UI
  const handleCheckDbDuplicates = async () => {
    setProgress((prev: { current: number; total: number; message: string } | null) => ({
      current: 0,
      total: processedRows.length,
      message: 'Checking for existing members...'
    }));
    if (topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth' });
    const dbDupes: {email: string, imported: any, existing: any}[] = [];
    const importReady: any[] = [];
    for (let i = 0; i < processedRows.length; i++) {
      const row = processedRows[i];
      if (!row.email) continue;
      // Query Supabase for existing member by email
      const { data: existing, error } = await supabase
        .from('members')
        .select('*')
        .eq('email', row.email)
        .maybeSingle();
      if (existing) {
        dbDupes.push({ email: row.email, imported: row, existing });
      } else {
        importReady.push(row);
      }
      if ((i + 1) % 5 === 0 || i === processedRows.length - 1) {
        setProgress((prev: { current: number; total: number; message: string } | null) => prev ? { ...prev, current: i + 1 } : null);
      }
    }
    setDbDuplicateGroups(dbDupes);
    setDbDupeResolutions(Object.fromEntries(dbDupes.map(d => [d.email, null])));
    setImportReadyRows(importReady);
    setTimeout(() => setProgress(null), 500);
    setStep(dbDupes.length > 0 ? 'resolve-db-dupes' : 'import-ready');
  };

  // Handler to resolve db duplicate (skip/merge)
  const handleResolveDbDupe = (email: string, action: 'skip' | 'merge') => {
    setDbDupeResolutions((prev: {[email: string]: 'skip' | 'merge' | null}) => ({ ...prev, [email]: action }));
  };

  // Handler to finalize db duplicate resolutions
  const finalizeDbDupeResolutions = () => {
    setProgress((prev: { current: number; total: number; message: string } | null) => ({
      current: 0,
      total: dbDuplicateGroups.length,
      message: 'Finalizing duplicate resolutions...'
    }));
    if (topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth' });
    // Prepare final import list
    const toImport: any[] = [...importReadyRows];
    const toMerge: { imported: any, existing: any }[] = [];
    dbDuplicateGroups.forEach((group: { email: string; imported: any; existing: any }, i: number) => {
      const action = dbDupeResolutions[group.email];
      if (action === 'merge') {
        toMerge.push({ imported: group.imported, existing: group.existing });
      } else if (action === 'skip') {
        // skip
      }
      setProgress((prev: { current: number; total: number; message: string } | null) => prev ? { ...prev, current: i + 1 } : null);
    });
    setTimeout(() => setProgress(null), 500);
    setStep('import-ready');
    setImportReadyRows(toImport);
    setDbDuplicateGroups([]);
    setDbDupeResolutions({});
    // Optionally, store toMerge for summary
    (window as any).toMerge = toMerge;
  };

  // Handler for final import execution
  const handleFinalImport = async () => {
    setImportProgress({
      current: 0,
      total: importReadyRows.length + ((window as any).toMerge?.length || 0),
      message: 'Starting import...'
    });
    if (topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth' });

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      // First handle new records
      for (let i = 0; i < importReadyRows.length; i++) {
        const row = importReadyRows[i];
        try {
          const { error } = await supabase
            .from('members')
            .insert([row]);

          if (error) throw error;
          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: ${error.message}`);
        }

        setImportProgress(prev => prev ? {
          ...prev,
          current: i + 1,
          message: `Importing new records... (${i + 1}/${importReadyRows.length})`
        } : null);
      }

      // Then handle merges
      const toMerge = (window as any).toMerge || [];
      for (let i = 0; i < toMerge.length; i++) {
        const { imported, existing } = toMerge[i];
        try {
          const { error } = await supabase
            .from('members')
            .update(imported)
            .eq('id', existing.id);

          if (error) throw error;
          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(`Merge ${i + 1}: ${error.message}`);
        }

        setImportProgress(prev => prev ? {
          ...prev,
          current: importReadyRows.length + i + 1,
          message: `Merging existing records... (${i + 1}/${toMerge.length})`
        } : null);
      }

      setImportResults(results);
      setImportComplete(true);
      setAlert({
        type: results.failed === 0 ? 'success' : 'warning',
        message: `Import completed with ${results.success} successful and ${results.failed} failed records.`
      });
    } catch (error: any) {
      setAlert({
        type: 'error',
        message: `Import failed: ${error.message}`
      });
    } finally {
      setImportProgress(null);
    }
  };

  // Build a map of email -> array of row indexes for all processed rows
  const buildFileDuplicateGroups = (processedRows: any[]) => {
    const emailToIndexes: { [email: string]: number[] } = {};
    processedRows.forEach((row, idx) => {
      if (!row.email) return;
      if (!emailToIndexes[row.email]) emailToIndexes[row.email] = [];
      emailToIndexes[row.email].push(idx);
    });
    // Only include groups with more than one record
    return Object.entries(emailToIndexes)
      .filter(([email, indexes]) => indexes.length > 1)
      .map(([email, indexes]) => ({ email, rowIndexes: indexes }));
  };

  // Handler to convert duplicate group to household
  const handleConvertToHousehold = async (email: string) => {
    setConvertingHousehold(email);
    setHouseholdConvertLoading(true);
    try {
      // Find all records with this email
      const group = fileDuplicateGroups.find(g => g.email === email);
      if (!group) throw new Error('Duplicate group not found');
      const members = group.members;

      // Check if a household with the same email already exists
      const { data: existingHousehold, error: existingHouseholdError } = await supabase
        .from('households')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      if (existingHouseholdError) throw new Error('Failed to check for existing household');
      let household = existingHousehold;
      if (!household) {
        const { data: newHousehold, error: householdError } = await supabase
          .from('households')
          .insert({ email })
          .select()
          .single();
        if (householdError || !newHousehold) throw new Error('Failed to create household');
        household = newHousehold;
      }

      // Update all existing members with this email to be part of the household
      const { error: updateError } = await supabase
        .from('members')
        .update({
          household_id: household.id,
          has_login: false,
          is_primary_contact: false
        })
        .eq('email', email);

      if (updateError) throw new Error('Failed to update existing members');

      // Set the selected member as login/primary
      const primaryIndex = selectedPrimaryContact[email];
      if (primaryIndex === undefined) throw new Error('No primary contact selected');
      
      const primaryMember = members[primaryIndex];
      const { error: primaryError } = await supabase
        .from('members')
        .update({
          has_login: true,
          is_primary_contact: true
        })
        .eq('email', email)
        .eq('first_name', primaryMember.first_name)
        .eq('last_name', primaryMember.last_name);

      if (primaryError) throw new Error('Failed to set primary contact');

      // Remove these rows from processedRows and update state
      const toRemove = new Set(group.rowIndexes);
      setProcessedRows(prev => prev.filter((_, idx) => !toRemove.has(idx)));
      setFileDuplicateGroups(prev => {
        const updated = prev.filter(g => g.email !== email);
        // If all groups are resolved, advance to preview step
        if (updated.length === 0) {
          setStep('preview');
        }
        return updated;
      });
      setFileDupeResolutions(prev => {
        const copy = { ...prev };
        delete copy[email];
        return copy;
      });
      setSelectedPrimaryContact(prev => {
        const copy = { ...prev };
        delete copy[email];
        return copy;
      });
      setAlert({ type: 'success', message: `Created household and updated ${members.length} members.` });
    } catch (error: any) {
      setAlert({ type: 'error', message: error.message || 'Failed to convert to household.' });
    } finally {
      setConvertingHousehold(null);
      setHouseholdConvertLoading(false);
    }
  };

  console.log('RENDER: step =', step, 'fileDuplicateGroups.length =', fileDuplicateGroups.length);

  return (
    <div ref={topRef} className="max-w-7xl mx-auto space-y-6">
      {/* Progress Bar */}
      {progress && (
        <div className="mb-6 sticky top-0 z-50 bg-white pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{progress.message}</span>
            <span className="text-sm text-gray-500">{progress.current} / {progress.total}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-primary-600 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      )}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Data</h2>
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
                  onChange={handleFileImport}
                  disabled={isProcessing}
                />
              </label>
            </div>
          </div>
        </div>
      </Card>

      {importPreview && step === 'mapping' && (
        <>
          <Card>
            <div className="p-6">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 lg:mb-0">Field Mapping</h3>
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                  <input
                    type="text"
                    placeholder="Mapping name"
                    value={mappingName}
                    onChange={(e) => setMappingName(e.target.value)}
                    className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 w-full sm:w-64"
                  />
                  <Button
                    variant="secondary"
                    onClick={saveMapping}
                    disabled={!mappingName}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Mapping
                  </Button>
                </div>
              </div>

              {/* Mapping selection dropdown */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Load Saved Mapping</label>
                <select
                  className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 w-full"
                  value={selectedMapping?.id || ''}
                  onChange={(e) => {
                    const mapping = savedMappings.find(m => m.id === e.target.value);
                    setSelectedMapping(mapping || null);
                    if (mapping && importPreview) {
                      setImportPreview(prev => prev ? {
                        ...prev,
                        mapping: {
                          id: mapping.id,
                          name: mapping.name,
                          sourceFields: { ...mapping.source_fields },
                          transformations: { ...mapping.transformations },
                          defaultValues: { ...mapping.default_values }
                        }
                      } : null);
                      setMappingName(mapping.name);
                    }
                  }}
                >
                  <option value="">Select saved mapping...</option>
                  {savedMappings.map((mapping: FieldMapping) => (
                    <option key={mapping.id} value={mapping.id}>
                      {mapping.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field mapping grid with transformation dropdowns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {MEMBER_FIELDS.map(field => (
                  <div key={field.id} className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <div className="flex space-x-2">
                      <select
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        value={
                          importPreview.mapping.sourceFields[field.id] &&
                          importPreview.headers.includes(importPreview.mapping.sourceFields[field.id])
                            ? importPreview.mapping.sourceFields[field.id]
                            : ''
                        }
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
                        {importPreview.headers.map((header: string, index: number) => (
                          <option key={index} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                      {/* Transformation dropdown if applicable */}
                      {getTransformationOptions(field.id) && (
                        <select
                          className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 w-40"
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
                          {getTransformationOptions(field.id)?.map((opt: { label: string; value: string }) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Default Values Section */}
              <div className="mt-8">
                <h4 className="text-md font-semibold text-gray-900 mb-4">Default Values</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Membership Type
                    </label>
                    <select
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      value={defaultMembershipType}
                      onChange={(e) => {
                        setDefaultMembershipType(e.target.value);
                        setImportPreview(prev => ({
                          ...prev!,
                          mapping: {
                            ...prev!.mapping,
                            defaultValues: {
                              ...prev!.mapping.defaultValues,
                              membership_type: e.target.value
                            }
                          }
                        }));
                      }}
                    >
                      {membershipTypes.map((type: { value: string; label: string }) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
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
                      value={importPreview.mapping.defaultValues.status}
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

              {/* Continue Button */}
              <div className="mt-8 flex justify-end">
                <Button
                  variant="primary"
                  disabled={!allRequiredMapped}
                  onClick={() => {
                    if (!allRequiredMapped) {
                      setAlert({ type: 'error', message: 'Please map all required fields.' });
                      return;
                    }
                    processData();
                  }}
                >
                  Continue
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">File Preview</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <div className="min-w-full inline-block align-middle">
                  <div className="overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {importPreview.headers.map((header: string, index: number) => (
                            <th
                              key={index}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {importPreview.sampleRows.map((row: any, rowIndex: number) => (
                          <tr key={rowIndex}>
                            {row.map((cell: any, cellIndex: number) => (
                              <td
                                key={cellIndex}
                                className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap"
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                Showing {importPreview.sampleRows.length} of {importPreview.allRows.length} rows
              </div>
            </div>
          </Card>
        </>
      )}

      {importPreview && step === 'preview' && (
        <>
          <Card>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Processed Data Preview</h3>
                <Button variant="secondary" onClick={() => setStep('mapping')}>Back to Mapping</Button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <div className="min-w-full inline-block align-middle">
                  <div className="overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {MEMBER_FIELDS.map((field: { id: string; label: string; required: boolean }, idx: number) => (
                            <th
                              key={field.id}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                            >
                              {field.label}
                            </th>
                          ))}
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Duplicate?</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {processedRows.slice(0, 10).map((row: any, rowIndex: number) => (
                          <tr key={rowIndex} className={duplicateRows.has(rowIndex) ? 'bg-red-50' : ''}>
                            {MEMBER_FIELDS.map((field: { id: string; label: string; required: boolean }, cellIndex: number) => (
                              <td
                                key={cellIndex}
                                className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap"
                              >
                                {row[field.id]}
                              </td>
                            ))}
                            <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                              {duplicateRows.has(rowIndex) ? <span className="text-red-600 font-semibold">Duplicate</span> : ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                Showing {Math.min(processedRows.length, 10)} of {processedRows.length} processed rows
                {duplicateRows.size > 0 && (
                  <span className="ml-4 text-red-600 font-semibold">{duplicateRows.size} duplicate(s) detected (by email)</span>
                )}
              </div>
              <div className="mt-8 flex justify-end">
                <Button
                  variant="primary"
                  disabled={processedRows.length === 0}
                  onClick={handleCheckDbDuplicates}
                >
                  Import
                </Button>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* File duplicate resolution step */}
      {step === 'resolve-file-dupes' && fileDuplicateGroups.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resolve Duplicate Emails</h3>
            <div className="space-y-6">
              {fileDuplicateGroups.map(group => (
                <div key={group.email} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium text-gray-900">{group.email}</h4>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => handleResolveFileDupe(group.email, null)}
                        disabled={householdConvertLoading}
                      >
                        Skip All
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => handleConvertToHousehold(group.email)}
                        disabled={householdConvertLoading || selectedPrimaryContact[group.email] === undefined}
                      >
                        {householdConvertLoading && convertingHousehold === group.email ? (
                          'Converting...'
                        ) : (
                          'Convert to Household'
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {group.members.map((member, index) => (
                      <div key={`${member.email || 'unknown'}-${index}`} className="flex items-start space-x-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center h-6">
                          <input
                            type="radio"
                            name={`primary-${group.email}`}
                            checked={selectedPrimaryContact[group.email] === index}
                            onChange={() => setSelectedPrimaryContact(prev => ({
                              ...prev,
                              [group.email]: index
                            }))}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{member.first_name} {member.last_name}</span>
                              {selectedPrimaryContact[group.email] === index && (
                                <span className="ml-2 text-sm text-primary-600">(Primary Contact)</span>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResolveFileDupe(group.email, index)}
                              disabled={householdConvertLoading}
                            >
                              Keep Only This
                            </Button>
                          </div>
                          <div className="mt-1 text-sm text-gray-500">
                            {member.email && <div>Email: {member.email}</div>}
                            {member.phone && <div>Phone: {member.phone}</div>}
                            {member.address && <div>Address: {member.address}</div>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Database duplicate resolution step */}
      {step === 'resolve-db-dupes' && dbDuplicateGroups.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resolve Duplicates with Existing Members</h3>
            <div className="space-y-8">
              {dbDuplicateGroups.map((group: { email: string; imported: any; existing: any }, i: number) => (
                <div key={group.email} className="border rounded-lg p-4">
                  <div className="mb-4 font-semibold text-gray-700">Email: {group.email}</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4 bg-white">
                      <h4 className="font-medium text-gray-900 mb-4">Existing Record</h4>
                      <div className="space-y-2">
                        {MEMBER_FIELDS.map((field: { id: string; label: string; required: boolean }) => (
                          group.existing[field.id] && (
                            <div key={field.id}>
                              <span className="text-sm font-medium text-gray-500">{field.label}:</span>
                              <p className="text-sm text-gray-900">{group.existing[field.id]}</p>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                    <div className="border rounded-lg p-4 bg-white">
                      <h4 className="font-medium text-gray-900 mb-4">Imported Record</h4>
                      <div className="space-y-2">
                        {MEMBER_FIELDS.map((field: { id: string; label: string; required: boolean }) => (
                          group.imported[field.id] && (
                            <div key={field.id}>
                              <span className="text-sm font-medium text-gray-500">{field.label}:</span>
                              <p className="text-sm text-gray-900">{group.imported[field.id]}</p>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end space-x-4">
                    <Button
                      variant={dbDupeResolutions[group.email] === 'merge' ? 'primary' : 'outline'}
                      onClick={() => handleResolveDbDupe(group.email, 'merge')}
                    >
                      Update Existing Record
                    </Button>
                    <Button
                      variant={dbDupeResolutions[group.email] === 'skip' ? 'danger' : 'outline'}
                      onClick={() => handleResolveDbDupe(group.email, 'skip')}
                    >
                      Skip Import
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                variant="primary"
                disabled={dbDuplicateGroups.some((group: { email: string; imported: any; existing: any }) => dbDupeResolutions[group.email] === null)}
                onClick={finalizeDbDupeResolutions}
              >
                Continue
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Final import-ready summary step */}
      {step === 'import-ready' && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Summary</h3>
            {!importComplete ? (
              <>
                <div className="mb-4 text-sm text-gray-700">
                  <div><strong>{importReadyRows.length}</strong> new records will be imported.</div>
                  <div><strong>{(window as any).toMerge?.length || 0}</strong> records will be merged (updated).</div>
                </div>
                {importProgress && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{importProgress.message}</span>
                      <span className="text-sm text-gray-500">{importProgress.current} / {importProgress.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-primary-600 h-2.5 rounded-full transition-all duration-300" 
                        style={{ width: `${importProgress.total ? (importProgress.current / importProgress.total) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button 
                    variant="primary" 
                    onClick={handleFinalImport}
                    disabled={!!importProgress}
                  >
                    {importProgress ? 'Importing...' : 'Execute Import'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 text-sm text-gray-700">
                  <div className="font-semibold mb-2">Import Results:</div>
                  <div className="space-y-1">
                    <div><span className="text-green-600">✓</span> <strong>{importResults?.success}</strong> records imported successfully</div>
                    <div><span className="text-red-600">✗</span> <strong>{importResults?.failed}</strong> records failed to import</div>
                  </div>
                  {importResults?.errors.length > 0 && (
                    <div className="mt-4">
                      <div className="font-semibold mb-2">Errors:</div>
                      <div className="bg-red-50 p-3 rounded-md max-h-40 overflow-y-auto">
                        {importResults.errors.map((error, idx) => (
                          <div key={idx} className="text-red-600 text-sm mb-1">{error}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button 
                    variant="secondary" 
                    onClick={() => {
                      setImportComplete(false);
                      setImportResults(null);
                      setStep('mapping');
                    }}
                  >
                    Start New Import
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
    </div>
  );
};

export default ImportManager; 