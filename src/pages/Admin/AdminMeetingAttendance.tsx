import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Alert from '../../components/UI/Alert';
import TextField from '../../components/Form/TextField';
import SelectField from '../../components/Form/SelectField';
import { Search, Plus, Download, X, Users, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { Meeting, MeetingWithAttendance, MeetingType, MEETING_TYPES, MEETING_TYPE_LABELS, MEETING_TYPE_COLORS } from '../../types/meeting';

interface Member {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Meeting {
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
  meeting_id: string;
  member_id: string;
  date: string;
  notes?: string;
}

interface MeetingAttendance {
  meeting: Meeting;
  attendees: Array<{
    member: Member;
    notes?: string;
  }>;
}

const AdminMeetingAttendance: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [meetings, setMeetings] = useState<MeetingWithAttendance[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [meetingSearchTerm, setMeetingSearchTerm] = useState('');
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingWithAttendance | null>(null);
  const [meetingDate, setMeetingDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [meetingTime, setMeetingTime] = useState('12:00');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [meetingType, setMeetingType] = useState<MeetingType>(MEETING_TYPES.GENERAL);
  const [attendingMembers, setAttendingMembers] = useState<Member[]>([]);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMeetingDropdown, setShowMeetingDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [highlightedMeetingIndex, setHighlightedMeetingIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const meetingSearchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const meetingDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedMeetingAttendance, setSelectedMeetingAttendance] = useState<MeetingAttendance | null>(null);
  const [showAttendeeModal, setShowAttendeeModal] = useState(false);

  useEffect(() => {
    fetchMembers();
    fetchMeetings();
    fetchAttendance();
  }, []);

  // Add click outside handler to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchMembers = async () => {
    try {
      console.log('=== FETCHING MEMBERS ===');
      const { data, error } = await supabase
        .from('members')
        .select('id, first_name, last_name, email')
        .order('last_name', { ascending: true });

      if (error) {
        console.error('Error fetching members:', error);
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

  const fetchMeetings = async () => {
    try {
      console.log('=== FETCHING MEETINGS ===');
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching meetings:', error);
        throw error;
      }

      console.log('Fetched meetings:', data);
      setMeetings(data || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load meetings'
      });
    }
  };

  const fetchAttendance = async () => {
    try {
      console.log('=== FETCHING ATTENDANCE ===');
      const { data, error } = await supabase
        .from('meeting_attendance')
        .select(`
          *,
          members (
            id,
            first_name,
            last_name,
            email
          ),
          meetings (
            id,
            title,
            date,
            location,
            description
          )
        `)
        .order('meetings(date)', { ascending: false });

      if (error) {
        console.error('Error fetching attendance:', error);
        throw error;
      }

      console.log('Fetched attendance:', data);
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
      setShowDropdown(false);
      setHighlightedIndex(-1);
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

  // Reset highlighted index when search term changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchTerm]);

  const handleRemoveMember = (memberId: string) => {
    setAttendingMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const filteredMeetings = meetings.filter(meeting =>
    meeting.title.toLowerCase().includes(meetingSearchTerm.toLowerCase()) ||
    (meeting.location && meeting.location.toLowerCase().includes(meetingSearchTerm.toLowerCase()))
  );

  const handleMeetingSelect = (meeting: MeetingWithAttendance) => {
    setSelectedMeeting(meeting);
    setMeetingTitle(meeting.title);
    setMeetingDate(meeting.date);
    setMeetingTime(meeting.time);
    setMeetingLocation(meeting.location || '');
    setMeetingDescription(meeting.description || '');
    
    // Load existing attendees
    const meetingAttendees = attendance
      .filter(record => record.meeting_id === meeting.id)
      .map(record => members.find(m => m.id === record.member_id)!)
      .filter(Boolean);
    setAttendingMembers(meetingAttendees);
    
    setMeetingSearchTerm('');
    setShowMeetingDropdown(false);
    if (meetingSearchInputRef.current) {
      meetingSearchInputRef.current.focus();
    }
  };

  const handleMeetingSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedMeetingIndex >= 0 && filteredMeetings[highlightedMeetingIndex]) {
        handleMeetingSelect(filteredMeetings[highlightedMeetingIndex]);
      } else if (filteredMeetings.length > 0) {
        handleMeetingSelect(filteredMeetings[0]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedMeetingIndex(prev => 
        prev < filteredMeetings.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedMeetingIndex(prev => prev > 0 ? prev - 1 : prev);
    } else if (e.key === 'Escape') {
      setShowMeetingDropdown(false);
      setHighlightedMeetingIndex(-1);
    }
  };

  const handleSaveAttendance = async () => {
    if (!meetingTitle || !meetingDate || !meetingTime || attendingMembers.length === 0) {
      setAlert({
        type: 'error',
        message: 'Please enter meeting details and add at least one member'
      });
      return;
    }

    try {
      console.log('=== SAVING ATTENDANCE ===');
      let meetingId: string;

      if (selectedMeeting) {
        // Update existing meeting
        const { data: updatedMeeting, error: meetingError } = await supabase
          .from('meetings')
          .update({
            title: meetingTitle,
            date: meetingDate,
            time: meetingTime,
            location: meetingLocation,
            description: meetingDescription,
            type: meetingType
          })
          .eq('id', selectedMeeting.id)
          .select()
          .single();

        if (meetingError) throw meetingError;
        meetingId = selectedMeeting.id;
      } else {
        // Create new meeting
        const { data: newMeeting, error: meetingError } = await supabase
          .from('meetings')
          .insert([{
            title: meetingTitle,
            date: meetingDate,
            time: meetingTime,
            location: meetingLocation,
            description: meetingDescription,
            type: meetingType
          }])
          .select()
          .single();

        if (meetingError) throw meetingError;
        meetingId = newMeeting.id;
      }

      // Delete existing attendance records if updating
      if (selectedMeeting) {
        const { error: deleteError } = await supabase
          .from('meeting_attendance')
          .delete()
          .eq('meeting_id', meetingId);

        if (deleteError) throw deleteError;
      }

      // Create new attendance records
      const attendanceRecords = attendingMembers.map(member => ({
        meeting_id: meetingId,
        member_id: member.id
      }));

      const { error: attendanceError } = await supabase
        .from('meeting_attendance')
        .insert(attendanceRecords);

      if (attendanceError) throw attendanceError;

      // Refresh data
      await Promise.all([
        fetchMeetings(),
        fetchAttendance()
      ]);

      setAlert({
        type: 'success',
        message: `Meeting attendance ${selectedMeeting ? 'updated' : 'recorded'} successfully`
      });

      // Reset form
      setSelectedMeeting(null);
      setMeetingTitle('');
      setMeetingDate(format(new Date(), 'yyyy-MM-dd'));
      setMeetingTime('12:00');
      setMeetingLocation('');
      setMeetingDescription('');
      setAttendingMembers([]);
    } catch (error) {
      console.error('Error saving attendance:', error);
      setAlert({
        type: 'error',
        message: 'Failed to save attendance'
      });
    }
  };

  const exportToCSV = () => {
    const headers = ['Meeting', 'Date', 'Location', 'Member', 'Email'];
    const csvData = attendance.map(record => {
      const meeting = meetings.find(m => m.id === record.meeting_id);
      const member = members.find(m => m.id === record.member_id);
      return [
        meeting ? meeting.title : 'Unknown',
        format(new Date(record.date), 'MM/dd/yyyy'),
        meeting ? meeting.location || '' : '',
        member ? `${member.first_name} ${member.last_name}` : 'Unknown',
        member ? member.email : ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `meeting_attendance_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const groupedAttendance = meetings.map(meeting => {
    const meetingAttendees = attendance
      .filter(record => record.meeting_id === meeting.id)
      .map(record => ({
        member: members.find(m => m.id === record.member_id)!,
        notes: record.notes
      }));

    return {
      meeting,
      attendees: meetingAttendees
    };
  }).sort((a, b) => new Date(b.meeting.date).getTime() - new Date(a.meeting.date).getTime());

  const handleMeetingClick = (meetingAttendance: MeetingAttendance, isEdit: boolean = false) => {
    if (isEdit) {
      // Load meeting details into the form
      setSelectedMeeting(meetingAttendance.meeting);
      setMeetingTitle(meetingAttendance.meeting.title);
      setMeetingDate(meetingAttendance.meeting.date);
      setMeetingTime(meetingAttendance.meeting.time);
      setMeetingLocation(meetingAttendance.meeting.location || '');
      setMeetingDescription(meetingAttendance.meeting.description || '');
      setAttendingMembers(meetingAttendance.attendees.map(a => a.member));
      
      // Scroll to the form
      const formElement = document.querySelector('.max-w-7xl');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Show attendee modal
      setSelectedMeetingAttendance(meetingAttendance);
      setShowAttendeeModal(true);
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
          <h1 className="text-3xl font-bold text-gray-900">Meeting Attendance</h1>
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
              {selectedMeeting ? 'Edit Meeting Attendance' : 'Record Meeting Attendance'}
            </h2>
            
            <div className="mb-6">
              <div className="relative" ref={meetingDropdownRef}>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  ref={meetingSearchInputRef}
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Search for an existing meeting or start typing to create a new one"
                  value={meetingSearchTerm}
                  onChange={(e) => {
                    setMeetingSearchTerm(e.target.value);
                    setShowMeetingDropdown(true);
                    if (!e.target.value) {
                      setSelectedMeeting(null);
                      setMeetingTitle('');
                      setMeetingDate(format(new Date(), 'yyyy-MM-dd'));
                      setMeetingTime('12:00');
                      setMeetingLocation('');
                      setMeetingDescription('');
                      setAttendingMembers([]);
                    }
                  }}
                  onKeyDown={handleMeetingSearchKeyDown}
                  onFocus={() => setShowMeetingDropdown(true)}
                />
                {showMeetingDropdown && meetingSearchTerm && filteredMeetings.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                    {filteredMeetings.map((meeting, index) => (
                      <div
                        key={meeting.id}
                        className={`cursor-pointer select-none relative py-2 pl-3 pr-9 ${
                          index === highlightedMeetingIndex ? 'bg-primary-50' : 'hover:bg-primary-50'
                        }`}
                        onClick={() => handleMeetingSelect(meeting)}
                      >
                        <div className="flex items-center">
                          <span className="ml-3 block truncate">
                            {meeting.title}
                          </span>
                          <span className="ml-2 text-gray-500 text-sm">
                            ({format(new Date(meeting.date), 'MMM d, yyyy')})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Search for an existing meeting or start typing to create a new one
              </p>
            </div>

            <div className="grid grid-cols-12 gap-4 mb-6">
              <div className="col-span-3">
                <TextField
                  label="Meeting Title"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  required
                />
              </div>
              <div className="col-span-2">
                <TextField
                  label="Date"
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  required
                />
              </div>
              <div className="col-span-2">
                <TextField
                  label="Time"
                  type="time"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  required
                />
              </div>
              <div className="col-span-2">
                <TextField
                  label="Location"
                  value={meetingLocation}
                  onChange={(e) => setMeetingLocation(e.target.value)}
                />
              </div>
              <div className="col-span-3">
                <TextField
                  label="Description"
                  value={meetingDescription}
                  onChange={(e) => setMeetingDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="mb-6">
              <SelectField
                id="type"
                label="Meeting Type"
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value as MeetingType)}
                options={Object.entries(MEETING_TYPE_LABELS).map(([value, label]) => ({
                  value,
                  label
                }))}
                required
              />
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Attending Members</h3>
              <div className="bg-gray-50 rounded-lg p-4 min-h-[100px]">
                {attendingMembers.length === 0 ? (
                  <p className="text-gray-500 text-sm">No members added yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {attendingMembers.map(member => (
                      <div
                        key={member.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800"
                      >
                        {member.first_name} {member.last_name}
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.id)}
                          className="ml-2 inline-flex items-center p-0.5 rounded-full text-primary-400 hover:bg-primary-200 hover:text-primary-500 focus:outline-none"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveAttendance}
                variant="primary"
                disabled={attendingMembers.length === 0}
              >
                <Plus className="h-5 w-5 mr-2" />
                {selectedMeeting ? 'Update Attendance' : 'Save Attendance'}
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Meeting Attendance Records</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Meeting
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
                  {groupedAttendance.map(({ meeting, attendees }) => (
                    <tr 
                      key={meeting.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {meeting.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(meeting.date), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {meeting.location || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 text-gray-400 mr-2" />
                          {attendees.length} members
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleMeetingClick({ meeting, attendees }, true)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Edit meeting"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleMeetingClick({ meeting, attendees })}
                            className="text-gray-400 hover:text-gray-600"
                            title="View attendees"
                          >
                            <ChevronRight className="h-5 w-5" />
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

        {/* Attendee Modal */}
        {showAttendeeModal && selectedMeetingAttendance && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedMeetingAttendance.meeting.title}
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
                  {format(new Date(selectedMeetingAttendance.meeting.date), 'MMMM d, yyyy')} • 
                  {selectedMeetingAttendance.meeting.location || 'No location specified'}
                </p>
              </div>
              <div className="px-6 py-4 overflow-y-auto max-h-[calc(80vh-8rem)]">
                <div className="space-y-4">
                  {selectedMeetingAttendance.attendees.map(({ member, notes }) => (
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
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-end">
                  <Button
                    onClick={() => setShowAttendeeModal(false)}
                    variant="outline"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminMeetingAttendance;