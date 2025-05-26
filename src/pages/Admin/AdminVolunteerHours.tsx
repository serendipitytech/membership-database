import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Alert from '../../components/UI/Alert';
import SelectField from '../../components/Form/SelectField';
import TextField from '../../components/Form/TextField';
import { Search, Download, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Event {
  id: string;
  title: string;
  date: string;
  description?: string;
  location?: string;
  time?: string;
}

interface VolunteerHours {
  id: string;
  member_id: string;
  event_id: string;
  hours: number;
  date: string;
  notes?: string;
}

const AdminVolunteerHours: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [volunteerHours, setVolunteerHours] = useState<VolunteerHours[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [hours, setHours] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [volunteerDate, setVolunteerDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingHours, setEditingHours] = useState<VolunteerHours | null>(null);

  useEffect(() => {
    fetchMembers();
    fetchEvents();
    fetchVolunteerHours();
  }, []);

  const fetchMembers = async () => {
    try {
      console.log('=== FETCHING MEMBERS ===');
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
      console.log('Supabase Anon Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
      
      const { data, error } = await supabase
        .from('members')
        .select('id, first_name, last_name, email')
        .order('last_name', { ascending: true });

      if (error) {
        console.error('Error fetching members:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('Fetched members:', data);
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load members'
      });
    }
  };

  const fetchEvents = async () => {
    try {
      console.log('=== FETCHING MEETINGS ===');
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching meetings:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('Fetched meetings:', data);
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load meetings'
      });
    }
  };

  const fetchVolunteerHours = async () => {
    try {
      console.log('=== FETCHING VOLUNTEER HOURS ===');
      const { data, error } = await supabase
        .from('volunteer_hours')
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

      if (error) {
        console.error('Error fetching volunteer hours:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('Fetched volunteer hours:', data);
      setVolunteerHours(data || []);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching volunteer hours:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load volunteer hours'
      });
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !selectedEvent || !hours) {
      setAlert({
        type: 'error',
        message: 'Please select a member, event, and enter hours'
      });
      return;
    }

    try {
      const selectedEventData = events.find(e => e.id === selectedEvent);
      const description = selectedEventData ? `Volunteer hours for ${selectedEventData.title}` : 'Volunteer hours';

      const { error } = await supabase
        .from('volunteer_hours')
        .insert({
          member_id: selectedMember,
          event_id: selectedEvent,
          hours: parseFloat(hours),
          date: volunteerDate,
          notes,
          description
        });

      if (error) throw error;

      // Refresh volunteer hours list
      await fetchVolunteerHours();

      setAlert({
        type: 'success',
        message: 'Volunteer hours recorded successfully'
      });

      // Reset form
      setSelectedMember('');
      setSelectedEvent('');
      setHours('');
      setNotes('');
      setVolunteerDate(format(new Date(), 'yyyy-MM-dd'));
    } catch (error) {
      console.error('Error recording volunteer hours:', error);
      setAlert({
        type: 'error',
        message: 'Failed to record volunteer hours'
      });
    }
  };

  const exportToCSV = () => {
    const headers = ['Member', 'Event', 'Hours', 'Date', 'Notes'];
    const csvData = volunteerHours.map(hours => {
      const member = members.find(m => m.id === hours.member_id);
      const event = events.find(e => e.id === hours.event_id);
      return [
        member ? `${member.first_name} ${member.last_name}` : 'Unknown',
        event ? event.title : 'Unknown',
        hours.hours.toString(),
        format(new Date(hours.date), 'MM/dd/yyyy'),
        hours.notes || ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `volunteer_hours_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const handleEdit = (hours: VolunteerHours) => {
    setEditingHours(hours);
    setSelectedMember(hours.member_id);
    setSelectedEvent(hours.event_id);
    setHours(hours.hours.toString());
    setNotes(hours.notes || '');
    setVolunteerDate(hours.date);
  };

  const handleDelete = async (hoursId: string) => {
    if (!window.confirm('Are you sure you want to delete these volunteer hours? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('volunteer_hours')
        .delete()
        .eq('id', hoursId);

      if (error) throw error;

      // Refresh volunteer hours list
      await fetchVolunteerHours();

      setAlert({
        type: 'success',
        message: 'Volunteer hours deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting volunteer hours:', error);
      setAlert({
        type: 'error',
        message: 'Failed to delete volunteer hours'
      });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHours || !selectedMember || !selectedEvent || !hours) {
      setAlert({
        type: 'error',
        message: 'Please select a member, event, and enter hours'
      });
      return;
    }

    try {
      const selectedEventData = events.find(e => e.id === selectedEvent);
      const description = selectedEventData ? `Volunteer hours for ${selectedEventData.title}` : 'Volunteer hours';

      const { error } = await supabase
        .from('volunteer_hours')
        .update({
          member_id: selectedMember,
          event_id: selectedEvent,
          hours: parseFloat(hours),
          date: volunteerDate,
          notes,
          description
        })
        .eq('id', editingHours.id);

      if (error) throw error;

      // Refresh volunteer hours list
      await fetchVolunteerHours();

      setAlert({
        type: 'success',
        message: 'Volunteer hours updated successfully'
      });

      // Reset form and editing state
      setEditingHours(null);
      setSelectedMember('');
      setSelectedEvent('');
      setHours('');
      setNotes('');
      setVolunteerDate(format(new Date(), 'yyyy-MM-dd'));
    } catch (error) {
      console.error('Error updating volunteer hours:', error);
      setAlert({
        type: 'error',
        message: 'Failed to update volunteer hours'
      });
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Volunteer Hours</h1>
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Record Volunteer Hours</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-4">
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
              <div className="col-span-3">
                <SelectField
                  label="Event"
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  options={events.map(event => ({
                    value: event.id,
                    label: `${event.title} (${format(new Date(event.date), 'MMM d, yyyy')})`
                  }))}
                  required
                />
              </div>
              <div className="col-span-2">
                <TextField
                  label="Hours"
                  type="number"
                  step="0.01"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  required
                />
              </div>
              <div className="col-span-2">
                <TextField
                  label="Date"
                  type="date"
                  value={volunteerDate}
                  onChange={(e) => setVolunteerDate(e.target.value)}
                  required
                />
              </div>
              <div className="col-span-2">
                <TextField
                  label="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="col-span-12 flex justify-end">
                <Button type="submit" variant="primary">
                  Record Hours
                </Button>
              </div>
            </form>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Volunteer Hours</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
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
                  {volunteerHours.map((hours) => {
                    const member = members.find(m => m.id === hours.member_id);
                    const event = events.find(e => e.id === hours.event_id);
                    return (
                      <tr key={hours.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {member ? `${member.first_name} ${member.last_name}` : 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {event ? event.title : 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {hours.hours}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(hours.date), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {hours.notes}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(hours)}
                              className="text-primary-600 hover:text-primary-900"
                              title="Edit hours"
                            >
                              <Edit2 className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(hours.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete hours"
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

        {/* Edit Modal */}
        {editingHours && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black bg-opacity-50"></div>
            <div className="relative min-h-screen flex items-center justify-center p-4">
              <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Edit Volunteer Hours</h2>
                  <form onSubmit={handleUpdate} className="grid grid-cols-12 gap-4">
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
                    <div className="col-span-3">
                      <SelectField
                        label="Event"
                        value={selectedEvent}
                        onChange={(e) => setSelectedEvent(e.target.value)}
                        options={events.map(event => ({
                          value: event.id,
                          label: `${event.title} (${format(new Date(event.date), 'MMM d, yyyy')})`
                        }))}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <TextField
                        label="Hours"
                        type="number"
                        step="0.01"
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <TextField
                        label="Date"
                        type="date"
                        value={volunteerDate}
                        onChange={(e) => setVolunteerDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <TextField
                        label="Notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                    <div className="col-span-12 flex justify-end space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingHours(null);
                          setSelectedMember('');
                          setSelectedEvent('');
                          setHours('');
                          setNotes('');
                          setVolunteerDate(format(new Date(), 'yyyy-MM-dd'));
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" variant="primary">
                        Update Hours
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminVolunteerHours;