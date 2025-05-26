import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Alert from '../../components/UI/Alert';
import TextField from '../../components/Form/TextField';
import SelectField from '../../components/Form/SelectField';
import { Search, Plus, Download, X, Users, ChevronRight, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { Event, EventWithAttendance, EventType, EVENT_TYPES, EVENT_TYPE_LABELS, EVENT_TYPE_COLORS, updateEventTypes } from '../../types/event';
import { getPickListValues, PICK_LIST_CATEGORIES } from '../../lib/pickLists';

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
  time: string;
  location?: string;
  description?: string;
  type: string;
}

interface Attendance {
  id: string;
  event_id: string;
  member_id: string;
  date: string;
  notes?: string;
}

interface EventAttendance {
  event: Event;
  attendees: Array<{
    member: Member;
    notes?: string;
  }>;
}

const AdminAttendance: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<EventWithAttendance[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<EventWithAttendance | null>(null);
  const [attendingMembers, setAttendingMembers] = useState<Member[]>([]);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showAttendeeModal, setShowAttendeeModal] = useState(false);
  const [selectedEventAttendance, setSelectedEventAttendance] = useState<EventAttendance | null>(null);

  useEffect(() => {
    fetchMembers();
    fetchEvents();
    fetchAttendance();
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
      // Set the most recent event as selected by default
      if (data && data.length > 0) {
        setSelectedEvent(data[0]);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load events'
      });
    }
  };

  const fetchAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from('event_attendance')
        .select(`
          *,
          members (
            id,
            first_name,
            last_name,
            email
          ),
          events (
            id,
            title,
            date,
            location,
            description
          )
        `)
        .order('events(date)', { ascending: false });

      if (error) throw error;
      setAttendance(data || []);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load attendance records'
      });
      setIsLoading(false);
    }
  };

  const filteredMembers = members.filter(member => 
    !attendingMembers.some(am => am.id === member.id) && // Not already in attending list
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
    setAttendingMembers(prev => [...prev, member]);
    setSearchTerm('');
    setShowDropdown(false);
    setHighlightedIndex(-1);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleRemoveMember = (memberId: string) => {
    setAttendingMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const handleSaveAttendance = async () => {
    if (!selectedEvent || attendingMembers.length === 0) {
      setAlert({
        type: 'error',
        message: 'Please select an event and add at least one member'
      });
      return;
    }

    try {
      // Delete existing attendance records
      const { error: deleteError } = await supabase
        .from('event_attendance')
        .delete()
        .eq('event_id', selectedEvent.id);

      if (deleteError) throw deleteError;

      // Create new attendance records
      const attendanceRecords = attendingMembers.map(member => ({
        event_id: selectedEvent.id,
        member_id: member.id
      }));

      const { error: attendanceError } = await supabase
        .from('event_attendance')
        .insert(attendanceRecords);

      if (attendanceError) throw attendanceError;

      // Refresh data
      await Promise.all([
        fetchEvents(),
        fetchAttendance()
      ]);

      setAlert({
        type: 'success',
        message: 'Attendance recorded successfully'
      });

      // Reset form
      setAttendingMembers([]);
    } catch (error) {
      console.error('Error saving attendance:', error);
      setAlert({
        type: 'error',
        message: 'Failed to save attendance'
      });
    }
  };

  const handleEventClick = (eventAttendance: EventAttendance, isEdit: boolean = false) => {
    if (isEdit) {
      // Load event details into the form
      setSelectedEvent(eventAttendance.event);
      setAttendingMembers(eventAttendance.attendees.map(a => a.member));
      
      // Scroll to the form
      const formElement = document.querySelector('.max-w-7xl');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Show attendee modal
      setSelectedEventAttendance(eventAttendance);
      setShowAttendeeModal(true);
    }
  };

  const groupedAttendance = events.map(event => {
    const eventAttendees = attendance
      .filter(record => record.event_id === event.id)
      .map(record => ({
        member: members.find(m => m.id === record.member_id)!,
        notes: record.notes
      }));

    return {
      event,
      attendees: eventAttendees
    };
  }).sort((a, b) => new Date(b.event.date).getTime() - new Date(a.event.date).getTime());

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
          <h1 className="text-3xl font-bold text-gray-900">Event Attendance</h1>
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
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Event</h2>
              
              {/* Event Selection */}
              <SelectField
                label="Select Event"
                value={selectedEvent?.id || ''}
                onChange={(e) => {
                  const event = events.find(m => m.id === e.target.value);
                  if (event) {
                    setSelectedEvent(event);
                    // Load existing attendees
                    const eventAttendees = attendance
                      .filter(record => record.event_id === event.id)
                      .map(record => members.find(m => m.id === record.member_id)!)
                      .filter(Boolean);
                    setAttendingMembers(eventAttendees);
                  }
                }}
                options={events.map(event => ({
                  value: event.id,
                  label: `${event.title} (${format(new Date(event.date), 'MMM d, yyyy')})`
                }))}
              />
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Attendees</h2>
              <div className="relative">
                <div className="flex items-center">
                  <div className="relative flex-1">
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
                </div>
              </div>

              {attendingMembers.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Members</h3>
                  <div className="flex flex-wrap gap-2">
                    {attendingMembers.map(member => (
                      <div
                        key={member.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100"
                      >
                        <span>{member.first_name} {member.last_name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.id)}
                          className="ml-2 text-gray-500 hover:text-gray-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSaveAttendance}
                variant="primary"
                disabled={!selectedEvent || attendingMembers.length === 0}
              >
                Save Attendance
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Attendance Records</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attendees
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {groupedAttendance.map(({ event, attendees }) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{event.title}</div>
                        {event.description && (
                          <div className="text-sm text-gray-500">{event.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {format(new Date(event.date), 'MMM d, yyyy')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{event.location || 'No location specified'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{attendees.length} attendees</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEventClick({ event, attendees }, true)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Edit attendance"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleEventClick({ event, attendees })}
                            className="text-gray-600 hover:text-gray-900"
                            title="View attendees"
                          >
                            <Users className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        {showAttendeeModal && selectedEventAttendance && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedEventAttendance.event.title}
                  </h3>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500"
                    onClick={() => setShowAttendeeModal(false)}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {format(new Date(selectedEventAttendance.event.date), 'MMMM d, yyyy')} • 
                  {selectedEventAttendance.event.location || 'No location specified'}
                </p>
              </div>
              <div className="px-6 py-4 overflow-y-auto max-h-[calc(80vh-8rem)]">
                <div className="space-y-4">
                  {selectedEventAttendance.attendees.map(({ member, notes }) => (
                    <div key={member.id} className="flex items-start space-x-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                        {notes && (
                          <p className="mt-1 text-sm text-gray-500">{notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminAttendance;