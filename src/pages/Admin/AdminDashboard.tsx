import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout/Layout';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Alert from '../../components/UI/Alert';
import { supabase } from '../../lib/supabase';
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

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Welcome to the Admin Dashboard</h2>
          <p className="text-gray-600">
            Use the navigation bar above to manage different aspects of the membership database.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard; 