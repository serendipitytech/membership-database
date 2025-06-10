import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Alert from '../../components/UI/Alert';
import SelectField from '../../components/Form/SelectField';
import TextField from '../../components/Form/TextField';
<<<<<<< HEAD
import { Search, Download, Edit2, Trash2, X } from 'lucide-react';
=======
import MemberSearchSelect from '../../components/Form/MemberSearchSelect';
import { Search, Download, Edit2, Trash2 } from 'lucide-react';
>>>>>>> bugfixes/improvements
import { format, parseISO } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
import { supabase } from '../../lib/supabase';
import { Event, EventWithAttendance, EventType, EVENT_TYPES, EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from '../../types/event';
import { formatDate } from '../../utils/formatters';
import DataTable from '../../components/UI/DataTable';

const timeZone = 'America/New_York';

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface VolunteerHours {
  id: string;
  member_id: string;
  event_id: string;
  hours: number;
  description: string;
  created_at: string;
  members?: Member;
  events?: Event;
}

interface CumulativeHours {
  member_id: string;
  event_id: string;
  total_hours: number;
  member: Member;
  event: Event;
  last_updated: string;
}

const AdminVolunteerHours: React.FC = () => {
  const [volunteerHours, setVolunteerHours] = useState<VolunteerHours[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedHours, setSelectedHours] = useState<VolunteerHours | null>(null);
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cumulativeHours, setCumulativeHours] = useState<CumulativeHours[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMembers();
    fetchEvents();
    fetchVolunteerHours();
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

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load events'
      });
    }
  };

  const fetchVolunteerHours = async () => {
    try {
      const { data, error } = await supabase
        .from('volunteer_hours')
        .select(`
          id,
          member_id,
          event_id,
          hours,
          description,
          created_at,
          members!volunteer_hours_member_id_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          events!volunteer_hours_event_id_fkey (
            id,
            title,
            date,
            location,
            description
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Raw volunteer hours data:', data);
      setVolunteerHours(data || []);
      
      // Calculate cumulative hours
      const cumulative = data?.reduce((acc: CumulativeHours[], record: VolunteerHours) => {
        console.log('Processing record:', record);
        
        // Skip records with null event_id or missing member/event data
        if (!record.event_id || !record.members || !record.events) {
          console.log('Skipping record due to missing data:', { 
            event_id: record.event_id, 
            has_member: !!record.members, 
            has_event: !!record.events 
          });
          return acc;
        }

        const existing = acc.find(
          item => item.member_id === record.member_id && item.event_id === record.event_id
        );
        
        if (existing) {
          existing.total_hours += record.hours;
          if (new Date(record.created_at) > new Date(existing.last_updated)) {
            existing.last_updated = record.created_at;
          }
        } else {
          acc.push({
            member_id: record.member_id,
            event_id: record.event_id,
            total_hours: record.hours,
            member: record.members,
            event: record.events,
            last_updated: record.created_at
          });
        }
        return acc;
      }, []) || [];
      
      console.log('Cumulative hours:', cumulative);
      setCumulativeHours(cumulative);
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
          member_id: selectedMember.id,
          event_id: selectedEvent,
          hours: parseFloat(hours),
          description,
          created_at: format(new Date(), 'yyyy-MM-dd HH:mm:ss')
        });

      if (error) throw error;

      // Refresh volunteer hours list
      await fetchVolunteerHours();

      setAlert({
        type: 'success',
        message: 'Volunteer hours recorded successfully'
      });

      // Reset form
      setSelectedMember(null);
      setSelectedEvent('');
      setHours('');
      setDescription('');
    } catch (error) {
      console.error('Error recording volunteer hours:', error);
      setAlert({
        type: 'error',
        message: 'Failed to record volunteer hours'
      });
    }
  };

  const exportToCSV = () => {
    const headers = ['Member', 'Event', 'Hours', 'Date', 'Description'];
    const csvData = volunteerHours.map(hours => {
      const member = members.find(m => m.id === hours.member_id);
      const event = events.find(e => e.id === hours.event_id);
      return [
        member ? `${member.first_name} ${member.last_name}` : 'Unknown',
        event ? event.title : 'Unknown',
        hours.hours.toString(),
        format(new Date(hours.created_at), 'MM/dd/yyyy'),
        hours.description
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
    setSelectedHours(hours);
    setSelectedMember(hours.members);
    setSelectedEvent(hours.event_id);
    setHours(hours.hours.toString());
    setDescription(hours.description);
  };

  const handleDelete = async (record: CumulativeHours) => {
    if (!window.confirm('Are you sure you want to delete these volunteer hours? This action cannot be undone.')) {
      return;
    }

    try {
      // First, get all volunteer hours records for this member and event
      const { data: hoursToDelete, error: fetchError } = await supabase
        .from('volunteer_hours')
        .select('id')
        .eq('member_id', record.member_id)
        .eq('event_id', record.event_id)
        .not('event_id', 'is', null); // Exclude records with null event_id

      if (fetchError) throw fetchError;

      // Delete all matching records
      if (hoursToDelete && hoursToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('volunteer_hours')
          .delete()
          .in('id', hoursToDelete.map(h => h.id));

        if (deleteError) throw deleteError;
      }

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
    if (!selectedHours || !selectedMember || !selectedEvent || !hours) {
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
          member_id: selectedMember.id,
          event_id: selectedEvent,
          hours: parseFloat(hours),
          description,
          created_at: format(new Date(), 'yyyy-MM-dd HH:mm:ss')
        })
        .eq('id', selectedHours.id);

      if (error) throw error;

      // Refresh volunteer hours list
      await fetchVolunteerHours();

      setAlert({
        type: 'success',
        message: 'Volunteer hours updated successfully'
      });

      // Reset form and editing state
      setSelectedHours(null);
      setSelectedMember(null);
      setSelectedEvent('');
      setHours('');
      setDescription('');
    } catch (error) {
      console.error('Error updating volunteer hours:', error);
      setAlert({
        type: 'error',
        message: 'Failed to update volunteer hours'
      });
    }
  };

  const columns = [
    {
      header: 'Member',
      accessor: (row: VolunteerHours) => `${row.members?.first_name} ${row.members?.last_name}`,
      sortable: true
    },
    {
      header: 'Event',
      accessor: 'events.title',
      sortable: true
    },
    {
      header: 'Total Hours',
      accessor: 'hours',
      sortable: true,
      render: (value: number) => value.toFixed(1)
    },
    {
      header: 'Event Date',
      accessor: 'events.date',
      sortable: true,
      render: (value: string) => formatDate(value)
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (value: string, row: VolunteerHours) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEdit(row)}
            className="text-primary-600 hover:text-primary-900"
            title="Edit hours"
          >
            <Edit2 className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleDelete({
              member_id: row.member_id,
              event_id: row.event_id,
              total_hours: 0,
              member: row.members!,
              event: row.events!,
              last_updated: row.created_at
            })}
            className="text-red-600 hover:text-red-900"
            title="Delete hours"
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
<<<<<<< HEAD
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
=======
                <label className="block text-sm font-medium text-gray-700 mb-1">Member</label>
                <MemberSearchSelect
                  members={members}
                  value={members.find(m => m.id === selectedMember) || null}
                  onChange={member => setSelectedMember(member ? member.id : '')}
                  placeholder="Search members..."
                  required
                />
>>>>>>> bugfixes/improvements
              </div>
              <div className="col-span-3">
                <SelectField
                  label="Event"
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  options={events.map(event => ({
                    value: event.id,
                    label: `${event.title} (${format(utcToZonedTime(parseISO(event.date), timeZone), 'MMM d, yyyy')})`
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
                  label="Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
            <DataTable
              columns={columns}
              data={volunteerHours}
              searchable={true}
              searchPlaceholder="Search volunteer hours..."
              className="bg-white shadow rounded-lg"
            />
          </div>
        </Card>

        {/* Edit Modal */}
        {selectedHours && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black bg-opacity-50"></div>
            <div className="relative min-h-screen flex items-center justify-center p-4">
              <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Edit Volunteer Hours</h2>
                  <form onSubmit={handleUpdate} className="grid grid-cols-12 gap-4">
                    <div className="col-span-3">
<<<<<<< HEAD
                      <SelectField
                        label="Member"
                        value={selectedMember?.id}
                        onChange={(e) => setSelectedMember(members.find(m => m.id === e.target.value) || null)}
                        options={members.map(member => ({
                          value: member.id,
                          label: `${member.first_name} ${member.last_name}`
                        }))}
=======
                      <label className="block text-sm font-medium text-gray-700 mb-1">Member</label>
                      <MemberSearchSelect
                        members={members}
                        value={members.find(m => m.id === selectedMember) || null}
                        onChange={member => setSelectedMember(member ? member.id : '')}
                        placeholder="Search members..."
>>>>>>> bugfixes/improvements
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
                          label: `${event.title} (${format(utcToZonedTime(parseISO(event.date), timeZone), 'MMM d, yyyy')})`
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
                        label="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>
                    <div className="col-span-12 flex justify-end space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSelectedHours(null);
                          setSelectedMember(null);
                          setSelectedEvent('');
                          setHours('');
                          setDescription('');
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