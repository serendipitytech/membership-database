import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Alert from '../components/UI/Alert';
import { supabase, getCurrentUser } from '../lib/supabase';
import { Users, Clock, Calendar, BarChart3, Settings, ChevronRight } from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const AdminDashboard: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          navigate('/login');
          return;
        }
        
        const { data: adminData } = await supabase
          .from('admins')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        
        if (!adminData) {
          navigate('/');
          return;
        }
        
        setIsAdmin(true);
        await fetchDashboardData();
      } catch (error) {
        console.error('Error checking admin status:', error);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAdminStatus();
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      // Fetch member stats
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('status');
      
      if (membersError) throw membersError;

      const memberStats = members?.reduce((acc, member) => ({
        ...acc,
        total: acc.total + 1,
        active: member.status === 'active' ? acc.active + 1 : acc.active,
        pending: member.status === 'pending' ? acc.pending + 1 : acc.pending,
        expired: member.status === 'expired' ? acc.expired + 1 : acc.expired,
      }), { total: 0, active: 0, pending: 0, expired: 0 });

      // Fetch volunteer hours
      const { data: hours, error: hoursError } = await supabase
        .from('volunteer_hours')
        .select('hours');
      
      if (hoursError) throw hoursError;

      const totalHours = hours?.reduce((sum, record) => sum + record.hours, 0) || 0;

      // Fetch meeting stats
      const { data: meetings, error: meetingsError } = await supabase
        .from('meetings')
        .select('id');
      
      if (meetingsError) throw meetingsError;

      const { data: attendance, error: attendanceError } = await supabase
        .from('meeting_attendance')
        .select('meeting_id');
      
      if (attendanceError) throw attendanceError;

      const totalMeetings = meetings?.length || 0;
      const averageAttendance = totalMeetings ? 
        Math.round((attendance?.length || 0) / totalMeetings) : 0;

      setStats({
        totalMembers: memberStats?.total || 0,
        activeMembers: memberStats?.active || 0,
        pendingMembers: memberStats?.pending || 0,
        expiredMembers: memberStats?.expired || 0,
        totalVolunteerHours: totalHours,
        totalMeetings,
        averageAttendance,
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setAlert({
        type: 'error',
        message: 'Failed to load dashboard data'
      });
    }
  };

  if (isLoading || !isAdmin) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="h-80 bg-gray-200 rounded"></div>
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
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary-100 rounded-full">
                  <Settings className="h-6 w-6 text-primary-600" />
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Interests</h3>
              <p className="text-gray-600">
                Configure interest categories and options for members
              </p>
            </div>
          </Card>

          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate('/admin/volunteer-hours')}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary-100 rounded-full">
                  <Clock className="h-6 w-6 text-primary-600" />
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Volunteer Hours</h3>
              <p className="text-gray-600">
                View and manage volunteer hour submissions
              </p>
            </div>
          </Card>

          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate('/admin/attendance')}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary-100 rounded-full">
                  <Users className="h-6 w-6 text-primary-600" />
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Meeting Attendance</h3>
              <p className="text-gray-600">
                Track and manage meeting attendance records
              </p>
            </div>
          </Card>
        </div>
        
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Membership Status</h3>
            <div className="h-64">
              <Doughnut 
                data={{
                  labels: ['Active', 'Pending', 'Expired'],
                  datasets: [{
                    data: [stats.activeMembers, stats.pendingMembers, stats.expiredMembers],
                    backgroundColor: [
                      'rgba(52, 211, 153, 0.8)',
                      'rgba(251, 191, 36, 0.8)',
                      'rgba(239, 68, 68, 0.8)',
                    ],
                    borderColor: [
                      'rgb(52, 211, 153)',
                      'rgb(251, 191, 36)',
                      'rgb(239, 68, 68)',
                    ],
                    borderWidth: 1,
                  }],
                }}
                options={{
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  }
                }}
              />
            </div>
          </Card>
          
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">New Member Registration</p>
                  <p className="text-sm text-gray-600">John Smith joined as a new member</p>
                </div>
                <span className="text-sm text-gray-500">2 hours ago</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Volunteer Hours Logged</p>
                  <p className="text-sm text-gray-600">Sarah Johnson logged 4 hours</p>
                </div>
                <span className="text-sm text-gray-500">Yesterday</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Meeting Attendance</p>
                  <p className="text-sm text-gray-600">15 members attended Monthly Meeting</p>
                </div>
                <span className="text-sm text-gray-500">2 days ago</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboard;