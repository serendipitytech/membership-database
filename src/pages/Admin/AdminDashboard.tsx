import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../../components/Layout/Sidebar';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Alert from '../../components/UI/Alert';
import { supabase } from '../../lib/supabase';
import { Users, Clock, Calendar, Settings, ChevronRight, CreditCard, Filter, Tag, Heart, User } from 'lucide-react';

function DashboardCard({ icon, label, value, className = '' }) {
  return (
    <Card className={`flex items-center space-x-4 p-6 ${className}`}>
      <div className="bg-slate-100 rounded-full p-3 text-2xl">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-slate-500 text-sm font-medium">{label}</div>
      </div>
    </Card>
  );
}

function QuickActionCard({ icon, label, onClick }) {
  return (
    <Button variant="outline" className="flex flex-col items-center py-6" onClick={onClick}>
      <span className="mb-2 text-xl">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </Button>
  );
}

function DateRangePopover({ startDate, endDate, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" onClick={() => setOpen((o) => !o)} className="flex items-center">
        <Filter className="w-5 h-5 mr-2" />
        Date Range
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded shadow-lg p-4 z-50">
          <div className="mb-2 font-medium text-slate-700">Select Date Range</div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-500">Start Date
              <input type="date" className="mt-1 w-full border rounded px-2 py-1" value={startDate} onChange={e => onChange({ startDate: e.target.value, endDate })} />
            </label>
            <label className="text-xs text-slate-500">End Date
              <input type="date" className="mt-1 w-full border rounded px-2 py-1" value={endDate} onChange={e => onChange({ startDate, endDate: e.target.value })} />
            </label>
          </div>
          <Button variant="secondary" className="mt-4 w-full" onClick={() => setOpen(false)}>Apply</Button>
        </div>
      )}
    </div>
  );
}

const AdminDashboard = () => {
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
  
  const [dateRange, setDateRange] = useState({
    startDate: new Date().getFullYear() + '-01-01',
    endDate: new Date().toISOString().slice(0, 10),
  });
  
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
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <DateRangePopover
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onChange={setDateRange}
          />
        </div>
        {/* Metrics Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <DashboardCard icon={<Users className="text-blue-500" />} label="Total Members" value={stats.totalMembers} />
          <DashboardCard icon={<User className="text-green-500" />} label="Active Members" value={stats.activeMembers} />
          <DashboardCard icon={<Clock className="text-indigo-500" />} label="Volunteer Hours" value={stats.totalVolunteerHours} />
          <DashboardCard icon={<Calendar className="text-purple-500" />} label="Meetings" value={stats.totalMeetings} />
        </section>
        {/* Quick Actions */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <QuickActionCard icon={<Calendar />} label="Manage Events" onClick={() => window.location.href='/admin/events'} />
            <QuickActionCard icon={<User />} label="Manage Members" onClick={() => window.location.href='/admin/members'} />
            <QuickActionCard icon={<Clock />} label="Manage Volunteer Hours" onClick={() => window.location.href='/admin/volunteer-hours'} />
            <QuickActionCard icon={<Heart />} label="Manage Interests" onClick={() => window.location.href='/admin/interests'} />
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard; 