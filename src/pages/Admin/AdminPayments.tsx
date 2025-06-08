import React, { useState, useEffect, useMemo, useRef } from 'react';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Alert from '../../components/UI/Alert';
import SelectField from '../../components/Form/SelectField';
import TextField from '../../components/Form/TextField';
import { Search, Plus, Download, Edit2, Trash2, X, Calendar } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import { supabase } from '../../lib/supabase';
import { getPickListValues, PICK_LIST_CATEGORIES } from '../../lib/pickLists';
import { formatCurrency, formatDate } from '../../utils/formatters';
import DataTable from '../../components/UI/DataTable';

const timeZone = 'America/New_York';

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Payment {
  id: string;
  member_id: string;
  amount: number;
  date: string;
  payment_method: string;
  status: string;
  notes?: string;
  is_recurring: boolean;
  member: {
    first_name: string;
    last_name: string;
  };
}

interface MemberPayment {
  member_id: string;
  member: Member;
  total_amount: number;
  last_payment_date: string;
  last_payment_method: string;
  is_recurring: boolean;
  payment_count: number;
}

interface AlertState {
  type: 'success' | 'error';
  message: string;
}

interface FormData {
  member_id: string;
  amount: string;
  date: string;
  payment_method: string;
  status: string;
  is_recurring: boolean;
  notes: string;
}

interface MemberPaymentSummary {
  member_id: string;
  member: Member;
  total_amount: number;
  payment_count: number;
  last_payment_date: string;
  transactions: Payment[];
}

const getDefaultStartDate = (): string => {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11 (Jan-Dec)
  const currentYear = now.getFullYear();
  
  // If we're in Jan-Sept (months 0-8), start from Oct 1 of previous year
  if (currentMonth < 9) {
    return format(new Date(currentYear - 1, 9, 1), 'yyyy-MM-dd');
  }
  
  // If we're in Oct-Dec (months 9-11), start from Oct 1 of current year
  return format(new Date(currentYear, 9, 1), 'yyyy-MM-dd');
};

const getPreviousMonthStats = (currentDate: Date) => {
  const previousMonth = subMonths(currentDate, 1);
  return {
    start: format(startOfMonth(previousMonth), 'yyyy-MM-dd'),
    end: format(endOfMonth(previousMonth), 'yyyy-MM-dd'),
    monthName: format(previousMonth, 'MMMM'),
    year: format(previousMonth, 'yyyy')
  };
};

const AdminPayments: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [paymentMethods, setPaymentMethods] = useState<Array<{value: string, label: string}>>([]);
  const [notes, setNotes] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedMemberTransactions, setSelectedMemberTransactions] = useState<Payment[]>([]);
  const [startDate, setStartDate] = useState<string>(getDefaultStartDate());
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [tempStartDate, setTempStartDate] = useState<string>(getDefaultStartDate());
  const [tempEndDate, setTempEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [formData, setFormData] = useState<FormData>({
    member_id: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: '',
    status: '',
    is_recurring: false,
    notes: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMembers();
    fetchPayments();
    loadPaymentMethods();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredMembers = members.filter(member => 
    (member.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     member.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     member.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredMembers[highlightedIndex]) {
        handleMemberSelect(filteredMembers[highlightedIndex]);
      } else if (filteredMembers.length > 0) {
        handleMemberSelect(filteredMembers[0]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < filteredMembers.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowDropdown(false);
      setHighlightedIndex(-1);
      setSearchTerm('');
      if (searchInputRef.current) {
        searchInputRef.current.blur();
      }
    }
  };

  const handleMemberSelect = (member: Member) => {
    setSelectedMember(member);
    setSearchTerm('');
    setShowDropdown(false);
    setHighlightedIndex(-1);
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  };

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, first_name, last_name, email')
        .order('last_name', { ascending: true });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load members'
      });
    }
  };

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          member:members(first_name, last_name)
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load payments'
      });
      setIsLoading(false);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const values = await getPickListValues(PICK_LIST_CATEGORIES.PAYMENT_METHODS);
      setPaymentMethods(values.map(value => ({
        value: value.value,
        label: formatDisplayName(value.value)
      })));
    } catch (error) {
      console.error('Error loading payment methods:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load payment methods'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !amount) {
      setAlert({
        type: 'error',
        message: 'Please select a member and enter an amount'
      });
      return;
    }

    try {
      // Calculate expiration date based on payment date in Eastern Time
      const paymentDateObj = utcToZonedTime(parseISO(paymentDate), timeZone);
      const paymentMonth = paymentDateObj.getMonth() + 1; // JavaScript months are 0-based
      let expirationYear;

      // If payment is made after October 1st, membership is valid for current and next year
      if (paymentMonth >= 10) {
        expirationYear = paymentDateObj.getFullYear() + 1;
      } else {
        expirationYear = paymentDateObj.getFullYear();
      }

      // Set expiration date to December 31st of the appropriate year
      const expirationDate = new Date(expirationYear, 11, 31).toISOString();

      // Start a transaction to update both payment and member status
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert([{
          member_id: selectedMember.id,
          amount: parseFloat(amount),
          date: paymentDate,
          payment_method: paymentMethod,
          status: 'completed',
          notes,
          is_recurring: isRecurring
        }])
        .select();

      if (paymentError) throw paymentError;

      // Update member status and expiration date
      const { error: memberError } = await supabase
        .from('members')
        .update({
          status: 'active',
          renewal_date: expirationDate
        })
        .eq('id', selectedMember.id);

      if (memberError) throw memberError;

      // Refresh payments list
      await fetchPayments();

      setAlert({
        type: 'success',
        message: `Payment recorded and membership activated successfully${isRecurring ? ' (Recurring)' : ''}`
      });

      // Reset form
      setSelectedMember(null);
      setAmount('');
      setPaymentMethod('');
      setNotes('');
      setPaymentDate(format(utcToZonedTime(new Date(), timeZone), 'yyyy-MM-dd'));
      setIsRecurring(false);
    } catch (error) {
      console.error('Error recording payment:', error);
      setAlert({
        type: 'error',
        message: 'Failed to record payment'
      });
    }
  };

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setSelectedMember(payment.member);
    setAmount(payment.amount.toString());
    setPaymentMethod(payment.payment_method);
    setNotes(payment.notes || '');
    setPaymentDate(payment.date);
    setIsRecurring(payment.is_recurring);
  };

  const handleDelete = async (paymentId: string) => {
    if (!window.confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      // Refresh payments list
      await fetchPayments();

      setAlert({
        type: 'success',
        message: 'Payment deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting payment:', error);
      setAlert({
        type: 'error',
        message: 'Failed to delete payment'
      });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment || !selectedMember || !amount) {
      setAlert({
        type: 'error',
        message: 'Please select a member and enter an amount'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('payments')
        .update({
          member_id: selectedMember.id,
          amount: parseFloat(amount),
          date: paymentDate,
          payment_method: paymentMethod,
          notes
        })
        .eq('id', editingPayment.id);

      if (error) throw error;

      // Refresh payments list
      await fetchPayments();

      setAlert({
        type: 'success',
        message: 'Payment updated successfully'
      });

      // Reset form and editing state
      setEditingPayment(null);
      setSelectedMember(null);
      setAmount('');
      setPaymentMethod('');
      setNotes('');
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
      setIsRecurring(editingPayment.is_recurring);
    } catch (error) {
      console.error('Error updating payment:', error);
      setAlert({
        type: 'error',
        message: 'Failed to update payment'
      });
    }
  };

  const exportToCSV = () => {
    const headers = ['Member', 'Amount', 'Date', 'Method', 'Status', 'Recurring', 'Notes'];
    const csvData = payments.map(payment => {
      const member = members.find(m => m.id === payment.member_id);
      return [
        member ? `${member.first_name} ${member.last_name}` : 'Unknown',
        payment.amount.toString(),
        format(utcToZonedTime(parseISO(payment.date), timeZone), 'MM/dd/yyyy'),
        payment.payment_method,
        payment.status,
        payment.is_recurring ? 'Yes' : 'No',
        payment.notes || ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `payments_${format(utcToZonedTime(new Date(), timeZone), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  // Helper function to format display names
  const formatDisplayName = (name: string): string => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleViewTransactions = (memberId: string, member: Member) => {
    const memberTransactions = payments.filter(p => p.member_id === memberId);
    setSelectedMemberTransactions(memberTransactions);
    setSelectedMember(member);
    setShowTransactionModal(true);
  };

  const handleEditTransaction = (payment: Payment) => {
    setFormData({
      member_id: payment.member_id,
      amount: payment.amount.toString(),
      date: payment.date,
      payment_method: payment.payment_method,
      status: payment.status,
      is_recurring: payment.is_recurring,
      notes: payment.notes || ''
    });
    setShowTransactionModal(false);
  };

  const handleDeleteTransaction = async (paymentId: string) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return;

    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;
      
      // Update both the transactions list and the main payments list
      setSelectedMemberTransactions(prev => prev.filter(p => p.id !== paymentId));
      setPayments(prev => prev.filter(p => p.id !== paymentId));
      
      setAlert({
        type: 'success',
        message: 'Payment deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting payment:', error);
      setAlert({
        type: 'error',
        message: 'Failed to delete payment'
      });
    }
  };

  // Calculate member payment summaries
  const memberSummaries = useMemo(() => {
    const summaries = new Map<string, MemberPaymentSummary>();
    
    payments.forEach(payment => {
      if (!summaries.has(payment.member_id)) {
        summaries.set(payment.member_id, {
          member_id: payment.member_id,
          member: payment.member!,
          total_amount: 0,
          payment_count: 0,
          last_payment_date: payment.date,
          transactions: []
        });
      }
      
      const summary = summaries.get(payment.member_id)!;
      summary.total_amount += payment.amount;
      summary.payment_count += 1;
      summary.transactions.push(payment);
      
      // Update last payment date if this payment is more recent
      if (new Date(payment.date) > new Date(summary.last_payment_date)) {
        summary.last_payment_date = payment.date;
      }
    });
    
    return Array.from(summaries.values());
  }, [payments]);

  // Add useEffect to refetch payments when date range changes
  useEffect(() => {
    fetchPayments();
  }, [startDate, endDate]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalContributions = payments.reduce((sum, payment) => sum + payment.amount, 0);
    
    // Get unique members with recurring donations in the last month
    const previousMonth = getPreviousMonthStats(new Date());
    const lastMonthPayments = payments.filter(payment => 
      payment.date >= previousMonth.start && 
      payment.date <= previousMonth.end
    );
    
    const recurringMembersLastMonth = new Set(
      lastMonthPayments
        .filter(payment => payment.is_recurring)
        .map(payment => payment.member_id)
    );
    
    // Get total number of members
    const totalMembers = members.length;
    
    // Calculate recurring percentage for last month
    const recurringPercentage = totalMembers > 0 
      ? (recurringMembersLastMonth.size / totalMembers) * 100 
      : 0;
    
    // Get recurring donations from previous month
    const previousMonthRecurring = lastMonthPayments
      .filter(payment => payment.is_recurring)
      .reduce((sum, payment) => sum + payment.amount, 0);

    return {
      totalContributions,
      recurringPercentage,
      previousMonthRecurring,
      previousMonthName: previousMonth.monthName,
      previousMonthYear: previousMonth.year
    };
  }, [payments, members]);

  // Add useEffect to update start date when month changes
  useEffect(() => {
    const checkAndUpdateStartDate = () => {
      const newStartDate = getDefaultStartDate();
      if (newStartDate !== startDate) {
        setStartDate(newStartDate);
      }
    };

    // Check immediately
    checkAndUpdateStartDate();

    // Set up interval to check daily
    const interval = setInterval(checkAndUpdateStartDate, 24 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [startDate]);

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setTempStartDate(value);
    } else {
      setTempEndDate(value);
    }
  };

  const handleApplyDateFilter = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
  };

  // Add new function for member search
  const handleMemberSearch = (searchValue: string) => {
    setSearchTerm(searchValue);
    if (searchValue.length >= 2) {
      const filtered = members.filter(member => 
        `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchValue.toLowerCase()) ||
        member.email.toLowerCase().includes(searchValue.toLowerCase())
      );
      setFilteredMembers(filtered);
      setShowMemberDropdown(true);
    } else {
      setFilteredMembers([]);
      setShowMemberDropdown(false);
    }
  };

  const handleMemberSelect = (member: Member) => {
    setSelectedMember(member);
    setFormData(prev => ({
      ...prev,
      member_id: member.id
    }));
    setSearchTerm(`${member.first_name} ${member.last_name}`);
    setShowMemberDropdown(false);
  };

  // After successful submit, clear the form and re-focus member field
  useEffect(() => {
    if (alert && alert.type === 'success') {
      setSelectedMember(null);
      setSearchTerm('');
      setAmount('');
      setPaymentMethod('');
      setNotes('');
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
      setTimeout(() => document.querySelector('input[placeholder="Type to search members..."]')?.focus(), 0);
    }
  }, [alert]);

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <Button
            onClick={exportToCSV}
            variant="outline"
            className="flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export to CSV
          </Button>
        </div>

        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
            className="mb-6"
          />
        )}

        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingPayment ? 'Edit Payment' : 'Record Payment'}
            </h2>
            <form onSubmit={editingPayment ? handleUpdate : handleSubmit} className="grid grid-cols-12 gap-4">
              <div className="col-span-3">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Member <span className="text-accent-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      ref={searchInputRef}
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShowDropdown(true);
                      }}
                      onKeyDown={handleSearchKeyDown}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="Search members..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {showDropdown && filteredMembers.length > 0 && (
                      <div
                        ref={dropdownRef}
                        className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
                      >
                        {filteredMembers.map((member, index) => (
                          <div
                            key={member.id}
                            className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                              index === highlightedIndex ? 'bg-gray-100' : ''
                            }`}
                            onClick={() => handleMemberSelect(member)}
                          >
                            <div className="font-medium">{member.first_name} {member.last_name}</div>
                            <div className="text-sm text-gray-500">{member.email}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedMember && (
                    <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100">
                      <span>{selectedMember.first_name} {selectedMember.last_name}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedMember(null)}
                        className="ml-2 text-gray-500 hover:text-gray-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <TextField
                  id="amount-field"
                  label="Amount"
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full"
                  required
                />
              </div>
              <div className="col-span-2">
                <TextField
                  id="date-field"
                  label="Payment Date"
                  type="date"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full"
                  required
                />
              </div>
              <div className="col-span-2">
                <SelectField
                  id="method-field"
                  label="Payment Method"
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  options={paymentMethods}
                  className="w-full"
                  required
                />
              </div>
              <div className="col-span-2">
                <TextField
                  id="notes-field"
                  label="Notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="col-span-1 flex items-end">
                <Button
                  id="submit-btn"
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : (editingPayment ? 'Update' : 'Add Payment')}
                </Button>
              </div>
            </form>
          </div>
        </Card>

        {/* Summary Statistics */}
        <Card className="mb-6">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-1">
                <h3 className="text-sm font-medium text-gray-500">Date Range</h3>
                <div className="mt-2 space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500">Start Date</label>
                      <input
                        type="date"
                        value={tempStartDate}
                        onChange={(e) => handleDateChange('start', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500">End Date</label>
                      <input
                        type="date"
                        value={tempEndDate}
                        onChange={(e) => handleDateChange('end', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={handleApplyDateFilter}
                      variant="primary"
                      size="sm"
                    >
                      Apply Filter
                    </Button>
                  </div>
                </div>
              </div>
              <div className="md:col-span-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Total Contributions</h3>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {formatCurrency(summaryStats.totalContributions)}
                    </p>
                    <p className="text-sm text-gray-500">
                      in selected date range
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Recurring Donations</h3>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {summaryStats.recurringPercentage.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-500">
                      of members had recurring donations in {summaryStats.previousMonthName} {summaryStats.previousMonthYear}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Total Recurring Donations</h3>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {formatCurrency(summaryStats.previousMonthRecurring)}
                    </p>
                    <p className="text-sm text-gray-500">
                      in {summaryStats.previousMonthName} {summaryStats.previousMonthYear}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <DataTable
              data={memberSummaries}
              columns={[
                {
                  header: 'Member',
                  accessor: 'member',
                  render: (value: Member) => `${value.first_name} ${value.last_name}`
                },
                {
                  header: 'Total Contributions',
                  accessor: 'total_amount',
                  render: (value: number) => formatCurrency(value)
                },
                {
                  header: 'Payment Count',
                  accessor: 'payment_count'
                },
                {
                  header: 'Last Payment',
                  accessor: 'last_payment_date',
                  render: (value: string) => formatDate(value)
                },
                {
                  header: 'Actions',
                  accessor: 'member_id',
                  render: (value: string, row: MemberPaymentSummary) => (
                    <Button
                      onClick={() => handleViewTransactions(value, row.member)}
                      variant="outline"
                      size="sm"
                    >
                      View Transactions
                    </Button>
                  )
                }
              ]}
              isLoading={isLoading}
            />
          </div>
        </Card>

        {/* Transaction Modal */}
        {showTransactionModal && selectedMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  Transactions for {selectedMember.first_name} {selectedMember.last_name}
                </h2>
                <Button
                  onClick={() => setShowTransactionModal(false)}
                  variant="outline"
                  size="sm"
                  className="p-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <DataTable
                data={selectedMemberTransactions}
                columns={[
                  {
                    header: 'Date',
                    accessor: 'date',
                    render: (value: string) => formatDate(value)
                  },
                  {
                    header: 'Amount',
                    accessor: 'amount',
                    render: (value: number) => formatCurrency(value)
                  },
                  {
                    header: 'Method',
                    accessor: 'payment_method',
                    render: (value: string) => formatDisplayName(value)
                  },
                  {
                    header: 'Recurring',
                    accessor: 'is_recurring',
                    render: (value: boolean) => value ? 'Yes' : 'No'
                  },
                  {
                    header: 'Actions',
                    accessor: 'id',
                    render: (value: string, row: Payment) => (
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleEditTransaction(row)}
                          variant="outline"
                          size="sm"
                          className="p-2"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteTransaction(value)}
                          variant="outline"
                          size="sm"
                          className="p-2 text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  }
                ]}
                isLoading={false}
              />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminPayments; 