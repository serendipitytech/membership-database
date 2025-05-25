import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Alert from '../../components/UI/Alert';
import { supabase, getCurrentUser } from '../../lib/supabase';
import { Users, Download, Search, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  attendees: Array<{
    id: string;
    member: {
      first_name: string;
      last_name: string;
      email: string;
    };
    created_at: string;
  }>;
}

const AdminMeetingAttendance: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { user } = await getCurrentUser();
        
        if (!user) {
          navigate('/login');
          return;
        }
        
        const { data: adminData } = await supabase
          .from('admins')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (!adminData) {
          navigate('/');
          return;
        }
        
        setIsAdmin(true);
        await fetchMeetings();
      } catch (error) {
        console.error('Error checking admin status:', error);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAdminStatus();
  }, [navigate]);

  const fetchMeetings = async () => {
    try {
      const { data: meetingsData, error: meetingsError } = await supabase
        .from('meetings')
        .select('*')
        .order('date', { ascending: false });
      
      if (meetingsError) throw meetingsError;

      const meetingsWithAttendees = await Promise.all(
        meetingsData.map(async (meeting) => {
          const { data: attendees, error: attendeesError } = await supabase
            .from('meeting_attendance')
            .select(`
              id,
              created_at,
              member:members(
                first_name,
                last_name,
                email
              )
            `)
            .eq('meeting_id', meeting.id);
          
          if (attendeesError) throw attendeesError;

          return {
            ...meeting,
            attendees: attendees || []
          };
        })
      );

      setMeetings(meetingsWithAttendees);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load meetings'
      });
    }
  };

  const handleExportCSV = (meeting: Meeting) => {
    const headers = ['Meeting Date', 'Meeting Title', 'Member Name', 'Email', 'Check-in Time'];
    const csvData = meeting.attendees.map(attendee => [
      format(new Date(meeting.date), 'yyyy-MM-dd'),
      meeting.title,
      `${attendee.member.first_name} ${attendee.member.last_name}`,
      attendee.member.email,
      format(new Date(attendee.created_at), 'yyyy-MM-dd HH:mm:ss')
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `meeting-attendance-${format(new Date(meeting.date), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const filteredMeetings = meetings.filter(meeting => {
    const searchLower = searchTerm.toLowerCase();
    return (
      meeting.title.toLowerCase().includes(searchLower) ||
      meeting.location.toLowerCase().includes(searchLower) ||
      meeting.attendees.some(attendee =>
        attendee.member.first_name.toLowerCase().includes(searchLower) ||
        attendee.member.last_name.toLowerCase().includes(searchLower) ||
        attendee.member.email.toLowerCase().includes(searchLower)
      )
    );
  });

  const totalAttendees = meetings.reduce((sum, meeting) => sum + meeting.attendees.length, 0);
  const averageAttendance = meetings.length ? Math.round(totalAttendees / meetings.length) : 0;

  if (isLoading || !isAdmin) {
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
        </div>

        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
            className="mb-6"
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-primary-50">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary-600">Total Meetings</p>
                  <p className="text-3xl font-bold text-primary-900">{meetings.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-primary-500" />
              </div>
            </div>
          </Card>

          <Card className="bg-primary-50">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary-600">Total Attendees</p>
                  <p className="text-3xl font-bold text-primary-900">{totalAttendees}</p>
                </div>
                <Users className="h-8 w-8 text-primary-500" />
              </div>
            </div>
          </Card>

          <Card className="bg-primary-50">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary-600">Average Attendance</p>
                  <p className="text-3xl font-bold text-primary-900">{averageAttendance}</p>
                </div>
                <Users className="h-8 w-8 text-primary-500" />
              </div>
            </div>
          </Card>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search meetings or attendees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="space-y-6">
          {filteredMeetings.map((meeting) => (
            <Card key={meeting.id}>
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{meeting.title}</h3>
                  <div className="mt-1 text-sm text-gray-500">
                    <span className="mr-4">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      {format(new Date(meeting.date), 'MMMM d, yyyy')}
                    </span>
                    <span>
                      <Users className="h-4 w-4 inline mr-1" />
                      {meeting.attendees.length} attendees
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => handleExportCSV(meeting)}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Member
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Check-in Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {meeting.attendees.map((attendee) => (
                      <tr key={attendee.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {attendee.member.first_name} {attendee.member.last_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {attendee.member.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(attendee.created_at), 'h:mm a')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default AdminMeetingAttendance;