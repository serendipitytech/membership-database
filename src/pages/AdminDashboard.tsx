import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Alert from '../components/UI/Alert';
import { supabase } from '../lib/supabase';
import { Users, Clock, Calendar, Settings, ChevronRight, CreditCard, Filter, Tag } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    pendingMembers: 0,
    expiredMembers: 0,
    totalVolunteerHours: 0,
    totalMeetings: 0,
    averageAttendance: 0,
  });
  const [alert, setAlert] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string} | null>(null);
  
  // Initialize with current year start and end dates
  const getCurrentYearStart = () => {
    const now = new Date();
    return `${now.getFullYear()}-01-01`;
  };

  const getCurrentDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [dateRange, setDateRange] = useState({
    startDate: getCurrentYearStart(),
    endDate: getCurrentDate()
  });
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    try {
      console.log('Fetching data for date range:', dateRange);

      // Fetch members
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('*');

      if (membersError) throw membersError;
      console.log('Fetched members:', members);

      // Fetch volunteer hours
      const { data: volunteerHours, error: volunteerError } = await supabase
        .from('volunteer_hours')
        .select('*')
        .gte('date', dateRange.startDate)
        .lte('date', dateRange.endDate);

      if (volunteerError) throw volunteerError;
      console.log('Fetched volunteer hours:', volunteerHours);

      // Calculate total volunteer hours
      const totalHours = volunteerHours?.reduce((sum: number, record: any) => {
        const hours = typeof record.hours === 'string' ? parseFloat(record.hours) : record.hours;
        return sum + (isNaN(hours) ? 0 : hours);
      }, 0) || 0;
      console.log('Calculated total hours:', totalHours);

      // Fetch meetings
      const { data: meetings, error: meetingsError } = await supabase
        .from('meetings')
        .select('*')
        .gte('date', dateRange.startDate)
        .lte('date', dateRange.endDate);

      if (meetingsError) throw meetingsError;
      console.log('Fetched meetings:', meetings);

      // Fetch meeting attendance
      const { data: attendance, error: attendanceError } = await supabase
        .from('meeting_attendance')
        .select(`
          *,
          meetings (
            date,
            title
          )
        `)
        .gte('meetings.date', dateRange.startDate)
        .lte('meetings.date', dateRange.endDate);

      if (attendanceError) throw attendanceError;
      console.log('Fetched attendance:', attendance);

      // Calculate total attendees
      const totalAttendees = attendance?.length || 0;
      const averageAttendance = meetings?.length ? totalAttendees / meetings.length : 0;
      console.log('Calculated attendance stats:', { totalAttendees, averageAttendance });

      // Calculate member stats
      const totalMembers = members?.length || 0;
      const activeMembers = members?.filter((m: any) => m.status === 'active').length || 0;
      const pendingMembers = members?.filter((m: any) => m.status === 'pending').length || 0;
      const expiredMembers = members?.filter((m: any) => m.status === 'expired').length || 0;

      console.log('Calculated member stats:', {
        totalMembers,
        activeMembers,
        pendingMembers,
        expiredMembers
      });

      // Set the stats
      setStats({
        totalMembers,
        activeMembers,
        pendingMembers,
        expiredMembers,
        totalVolunteerHours: totalHours,
        totalMeetings: meetings?.length || 0,
        averageAttendance: Math.round(averageAttendance * 10) / 10
      });

      console.log('Final stats set:', {
        totalMembers,
        activeMembers,
        pendingMembers,
        expiredMembers,
        totalVolunteerHours: totalHours,
        totalMeetings: meetings?.length || 0,
        averageAttendance: Math.round(averageAttendance * 10) / 10
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setAlert({
        type: 'error',
        message: `Failed to load dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetToYTD = () => {
    setDateRange({
      startDate: getCurrentYearStart(),
      endDate: getCurrentDate()
    });
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center"
            >
              <Filter className="h-4 w-4 mr-2" />
              Date Range
            </Button>
            {showDatePicker && (
              <div className="absolute top-24 right-8 bg-white p-4 rounded-lg shadow-lg border border-gray-200 z-10">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <input
                      type="date"
                      name="startDate"
                      value={dateRange.startDate}
                      onChange={handleDateRangeChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Date</label>
                    <input
                      type="date"
                      name="endDate"
                      value={dateRange.endDate}
                      onChange={handleDateRangeChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={resetToYTD}
                      size="sm"
                    >
                      Reset to YTD
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => setShowDatePicker(false)}
                      size="sm"
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
            className="mb-6"
          />
        )}
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <div className="flex items-center p-6">
              <div className="p-3 bg-primary-100 rounded-full">
                <Users className="h-6 w-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Members</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalMembers}</p>
              </div>
            </div>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
            <div className="flex items-center p-6">
              <div className="p-3 bg-green-100 rounded-full">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Members</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.activeMembers}</p>
              </div>
            </div>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
            <div className="flex items-center p-6">
              <div className="p-3 bg-blue-100 rounded-full">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Volunteer Hours</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalVolunteerHours}</p>
                <p className="text-xs text-gray-500">
                  {dateRange.startDate} - {dateRange.endDate}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
            <div className="flex items-center p-6">
              <div className="p-3 bg-purple-100 rounded-full">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Meetings</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalMeetings}</p>
                <p className="text-xs text-gray-500">
                  {dateRange.startDate} - {dateRange.endDate}
                </p>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Admin Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate('/admin/interests')}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Manage Interests</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Manage interest categories and options
                </p>
              </div>
              <Tag className="h-8 w-8 text-primary-500" />
            </div>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate('/admin/events')}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Manage Events</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Create and manage meetings and events
                </p>
              </div>
              <Calendar className="h-8 w-8 text-primary-500" />
            </div>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate('/admin/volunteer-hours')}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Manage Volunteer Hours</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Track and manage volunteer hours
                </p>
              </div>
              <Clock className="h-8 w-8 text-primary-500" />
            </div>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate('/admin/attendance')}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Manage Attendance</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Track meeting and event attendance
                </p>
              </div>
              <Calendar className="h-8 w-8 text-primary-500" />
            </div>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate('/admin/members')}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Manage Members</h3>
                <p className="mt-1 text-sm text-gray-500">
                  View and manage member information
                </p>
              </div>
              <Users className="h-8 w-8 text-primary-500" />
            </div>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate('/admin/payments')}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Manage Payments</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Track and manage member payments
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-primary-500" />
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;