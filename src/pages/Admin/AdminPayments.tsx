import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Alert from '../../components/UI/Alert';
import SelectField from '../../components/Form/SelectField';
import TextField from '../../components/Form/TextField';
import { Search, Plus, Download, Edit2, Trash2, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
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
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [memberTransactions, setMemberTransactions] = useState<Payment[]>([]);

  useEffect(() => {
    fetchMembers();
    fetchPayments();
    loadPaymentMethods();
  }, []);

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

  const handleViewMemberPayments = (memberId: string) => {
    const member = payments.find(p => p.member_id === memberId)?.member;
    if (member) {
      setSelectedMember(member);
      setMemberTransactions(payments.filter(p => p.member_id === memberId));
      setShowTransactionModal(true);
    }
  };

  const handleEditPayment = (payment: Payment) => {
    // Implement edit payment logic
    console.log('Edit payment:', payment);
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      setPayments(prev => prev.filter(p => p.id !== paymentId));
      setMemberTransactions(prev => prev.filter(p => p.id !== paymentId));
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

  // Group payments by member
  const memberPayments = useMemo(() => {
    // First, sort payments by date to ensure we get the most recent payment info
    const sortedPayments = [...payments].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Group by member_id
    const grouped = sortedPayments.reduce((acc: { [key: string]: MemberPayment }, payment) => {
      const memberId = payment.member_id;
      
      if (!acc[memberId]) {
        // Initialize member payment record
        acc[memberId] = {
          member_id: memberId,
          member: payment.member,
          total_amount: payment.amount,
          last_payment_date: payment.date,
          last_payment_method: payment.payment_method,
          is_recurring: payment.is_recurring,
          payment_count: 1
        };
      } else {
        // Update existing member payment record
        acc[memberId].total_amount += payment.amount;
        acc[memberId].payment_count += 1;
        
        // Since payments are sorted by date, the first payment we see for each member
        // is their most recent payment
        if (acc[memberId].last_payment_date === payment.date) {
          acc[memberId].last_payment_method = payment.payment_method;
          acc[memberId].is_recurring = payment.is_recurring;
        }
      }
      
      return acc;
    }, {});
    
    // Convert to array and sort by member name
    return Object.values(grouped).sort((a, b) => 
      `${a.member.first_name} ${a.member.last_name}`.localeCompare(`${b.member.first_name} ${b.member.last_name}`)
    );
  }, [payments]);

  const columns = [
    {
      header: 'Member',
      accessor: (row: MemberPayment) => `${row.member.first_name} ${row.member.last_name}`,
      sortable: true
    },
    {
      header: 'Total Contributions',
      accessor: 'total_amount',
      sortable: true,
      render: (value: number) => formatCurrency(value)
    },
    {
      header: 'Payment Count',
      accessor: 'payment_count',
      sortable: true
    },
    {
      header: 'Last Payment',
      accessor: 'last_payment_date',
      sortable: true,
      render: (value: string) => formatDate(value)
    },
    {
      header: 'Payment Method',
      accessor: 'last_payment_method',
      sortable: true
    },
    {
      header: 'Recurring',
      accessor: 'is_recurring',
      sortable: true,
      render: (value: boolean) => value ? 'Yes' : 'No'
    },
    {
      header: 'Actions',
      accessor: 'member_id',
      render: (value: string) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleViewMemberPayments(value)}
            className="text-primary-600 hover:text-primary-900"
            title="View payment history"
          >
            <Edit2 className="h-5 w-5" />
          </button>
        </div>
      )
    }
  ];

  const transactionColumns = [
    {
      header: 'Date',
      accessor: 'date',
      sortable: true,
      render: (value: string) => formatDate(value)
    },
    {
      header: 'Amount',
      accessor: 'amount',
      sortable: true,
      render: (value: number) => formatCurrency(value)
    },
    {
      header: 'Method',
      accessor: 'payment_method',
      sortable: true
    },
    {
      header: 'Recurring',
      accessor: 'is_recurring',
      sortable: true,
      render: (value: boolean) => value ? 'Yes' : 'No'
    },
    {
      header: 'Notes',
      accessor: 'notes'
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (value: string, row: Payment) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEditPayment(row)}
            className="text-primary-600 hover:text-primary-900"
            title="Edit payment"
          >
            <Edit2 className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleDeletePayment(value)}
            className="text-red-600 hover:text-red-900"
            title="Delete payment"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      )
    }
  ];

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
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
          <Button
            onClick={exportToCSV}
            variant="outline"
          >
            <Download className="h-5 w-5 mr-2" />
            Export CSV
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

        <Card className="mb-8">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingPayment ? 'Edit Payment' : 'Record Payment'}
            </h2>
            <form onSubmit={editingPayment ? handleUpdate : handleSubmit} className="grid grid-cols-12 gap-4">
              <div className="col-span-3">
                <SelectField
                  label="Member"
                  value={selectedMember?.id || ''}
                  onChange={(e) => setSelectedMember(members.find(m => m.id === e.target.value) || null)}
                  options={members.map(member => ({
                    value: member.id,
                    label: `${member.first_name} ${member.last_name}`
                  }))}
                  required
                />
              </div>
              <div className="col-span-2">
                <TextField
                  label="Amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="col-span-2">
                <TextField
                  label="Payment Date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>
              <div className="col-span-2">
                <SelectField
                  label="Payment Method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  options={[
                    { value: '', label: 'Select payment method' },
                    ...paymentMethods
                  ]}
                  required
                />
              </div>
              <div className="col-span-3">
                <TextField
                  label="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="col-span-12">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_recurring"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_recurring" className="ml-2 block text-sm text-gray-700">
                    This is a recurring payment
                  </label>
                </div>
              </div>
              <div className="col-span-12 flex justify-end">
                {editingPayment && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingPayment(null);
                      setSelectedMember(null);
                      setAmount('');
                      setPaymentMethod('');
                      setNotes('');
                      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
                      setIsRecurring(false);
                    }}
                    className="mr-2"
                  >
                    Cancel
                  </Button>
                )}
                <Button type="submit" variant="primary">
                  {editingPayment ? 'Update Payment' : 'Record Payment'}
                </Button>
              </div>
            </form>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Member Contributions</h2>
            <DataTable
              columns={columns}
              data={memberPayments}
              searchable={true}
              searchPlaceholder="Search members..."
              className="bg-white shadow rounded-lg"
            />
          </div>
        </Card>

        {/* Transaction List Modal */}
        {showTransactionModal && selectedMember && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-[90vw] max-w-6xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">
                    Payment History - {selectedMember.first_name} {selectedMember.last_name}
                  </h3>
                  <button
                    onClick={() => {
                      setShowTransactionModal(false);
                      setSelectedMember(null);
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <DataTable
                  columns={transactionColumns}
                  data={memberTransactions}
                  searchable={true}
                  searchPlaceholder="Search transactions..."
                  className="bg-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminPayments; 