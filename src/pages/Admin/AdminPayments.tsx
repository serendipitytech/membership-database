import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Alert from '../../components/UI/Alert';
import SelectField from '../../components/Form/SelectField';
import TextField from '../../components/Form/TextField';
import { Search, Plus, Download, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';

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
}

const AdminPayments: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [notes, setNotes] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  useEffect(() => {
    fetchMembers();
    fetchPayments();
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
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          members (
            id,
            first_name,
            last_name,
            email
          )
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
      // Calculate expiration date based on payment date
      const paymentDateObj = new Date(paymentDate);
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
          member_id: selectedMember,
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
        .eq('id', selectedMember);

      if (memberError) throw memberError;

      // Refresh payments list
      await fetchPayments();

      setAlert({
        type: 'success',
        message: `Payment recorded and membership activated successfully${isRecurring ? ' (Recurring)' : ''}`
      });

      // Reset form
      setSelectedMember('');
      setAmount('');
      setPaymentMethod('cash');
      setNotes('');
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
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
    setSelectedMember(payment.member_id);
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
          member_id: selectedMember,
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
      setSelectedMember('');
      setAmount('');
      setPaymentMethod('cash');
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
        format(new Date(payment.date), 'MM/dd/yyyy'),
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
    link.download = `payments_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

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
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
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
                    { value: 'cash', label: 'Cash' },
                    { value: 'check', label: 'Check' },
                    { value: 'actblue', label: 'ActBlue' },
                    { value: 'other', label: 'Other' }
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
                      setSelectedMember('');
                      setAmount('');
                      setPaymentMethod('cash');
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Payments</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recurring
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => {
                    const member = members.find(m => m.id === payment.member_id);
                    return (
                      <tr key={payment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {member ? `${member.first_name} ${member.last_name}` : 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${payment.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(payment.date), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.payment_method}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.status}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.is_recurring ? 'Yes' : 'No'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.notes}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(payment)}
                              className="text-primary-600 hover:text-primary-900"
                              title="Edit payment"
                            >
                              <Edit2 className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(payment.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete payment"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminPayments; 