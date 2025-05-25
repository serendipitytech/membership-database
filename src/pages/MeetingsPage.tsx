import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Alert from '../components/UI/Alert';
import Badge from '../components/UI/Badge';
import { getMeetings, recordAttendance, getCurrentUser } from '../lib/supabase';
import { Calendar, MapPin, Clock, CheckCircle, Users } from 'lucide-react';
import { format, isPast, isToday, addDays } from 'date-fns';

interface Meeting {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  attendance_count: number;
}

const MeetingsPage: React.FC = () => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  const [checkedInMeetings, setCheckedInMeetings] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user
        const { user } = await getCurrentUser();
        if (user) {
          setUserId(user.id);
        }
        
        // Get meetings
        const { meetings: meetingsData, error } = await getMeetings();
        
        if (error) {
          throw error;
        }
        
        setMeetings(meetingsData || []);
      } catch (error) {
        console.error('Error fetching meetings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleCheckIn = async (meetingId: string) => {
    if (!userId) {
      setAlert({
        type: 'warning',
        message: 'Please sign in to check in to meetings'
      });
      return;
    }
    
    try {
      const { record, error } = await recordAttendance({
        member_id: userId,
        meeting_id: meetingId,
        created_at: new Date().toISOString(),
      });
      
      if (error) {
        throw error;
      }
      
      if (record) {
        setCheckedInMeetings([...checkedInMeetings, meetingId]);
        setAlert({
          type: 'success',
          message: 'You have successfully checked in to this meeting'
        });
        
        // Update attendance count
        setMeetings(meetings.map(meeting => 
          meeting.id === meetingId 
            ? { ...meeting, attendance_count: (meeting.attendance_count || 0) + 1 }
            : meeting
        ));
      }
    } catch (error) {
      console.error('Error checking in:', error);
      setAlert({
        type: 'error',
        message: 'There was an error checking in. Please try again.'
      });
    }
  };

  const formatMeetingDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'EEEE, MMMM d, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const sortedMeetings = [...meetings].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const upcomingMeetings = sortedMeetings.filter(meeting => {
    const meetingDate = new Date(meeting.date);
    return isToday(meetingDate) || meetingDate > new Date();
  });

  const pastMeetings = sortedMeetings.filter(meeting => {
    const meetingDate = new Date(meeting.date);
    return isPast(meetingDate) && !isToday(meetingDate);
  });

  const renderMeetingCard = (meeting: Meeting) => {
    const meetingDate = new Date(meeting.date);
    const isPastMeeting = isPast(meetingDate) && !isToday(meetingDate);
    const isToday = new Date(meeting.date).toDateString() === new Date().toDateString();
    const isCheckInEnabled = isToday || (new Date(meeting.date) <= addDays(new Date(), 1));
    const isCheckedIn = checkedInMeetings.includes(meeting.id);
    
    return (
      <Card key={meeting.id} className="mb-6 hover:shadow-lg transition-shadow">
        <div className="flex flex-col md:flex-row">
          <div className="md:w-1/6 mb-4 md:mb-0">
            <div className="bg-primary-100 text-primary-800 px-3 py-2 rounded text-center">
              <p className="text-sm font-semibold">{format(meetingDate, 'MMM')}</p>
              <p className="text-3xl font-bold">{format(meetingDate, 'd')}</p>
              <p className="text-sm">{format(meetingDate, 'yyyy')}</p>
            </div>
          </div>
          
          <div className="md:w-5/6 md:pl-6">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-semibold text-gray-800">{meeting.title}</h3>
              {isPastMeeting ? (
                <Badge variant="secondary">Past Meeting</Badge>
              ) : isToday ? (
                <Badge variant="primary">Today</Badge>
              ) : (
                <Badge variant="success">Upcoming</Badge>
              )}
            </div>
            
            <p className="text-gray-600 mb-4">{meeting.description}</p>
            
            <div className="flex flex-wrap gap-4 mb-4 text-gray-600 text-sm">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1 text-primary-500" />
                {formatMeetingDate(meeting.date)}
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1 text-primary-500" />
                {meeting.time}
              </div>
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1 text-primary-500" />
                {meeting.location}
              </div>
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1 text-primary-500" />
                {meeting.attendance_count || 0} attendees
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              {isCheckInEnabled && !isPastMeeting ? (
                <Button 
                  onClick={() => handleCheckIn(meeting.id)}
                  disabled={isCheckedIn}
                  variant={isCheckedIn ? 'outline' : 'primary'}
                  size="sm"
                >
                  {isCheckedIn ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" /> Checked In
                    </>
                  ) : (
                    'Check In'
                  )}
                </Button>
              ) : (
                <div></div>
              )}
              
              <Button 
                variant="outline"
                size="sm"
              >
                View Details
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Meetings & Events</h1>
        <p className="text-gray-600 mb-8">
          Stay connected with our community by attending our regular meetings and special events.
        </p>
        
        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
            className="mb-6"
          />
        )}
        
        {upcomingMeetings.length > 0 && (
          <>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Upcoming Meetings</h2>
            <div className="space-y-6 mb-12">
              {upcomingMeetings.map(renderMeetingCard)}
            </div>
          </>
        )}
        
        {pastMeetings.length > 0 && (
          <>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Past Meetings</h2>
            <div className="space-y-6">
              {pastMeetings.slice(0, 5).map(renderMeetingCard)}
            </div>
            
            {pastMeetings.length > 5 && (
              <div className="text-center mt-8">
                <Button variant="outline">
                  View All Past Meetings
                </Button>
              </div>
            )}
          </>
        )}
        
        {meetings.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No meetings scheduled</h3>
            <p className="text-gray-500">
              Check back soon for upcoming meetings and events.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MeetingsPage;