import React, { useState, useEffect } from 'react';
import { Box, Grid, Card, CardContent, Typography, Button } from '@mui/material';
import { Users, Clock, Calendar, Heart, User } from 'lucide-react';

const DashboardCard = ({ icon, label, value }) => (
  <Card>
    <CardContent style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <Box sx={{ bgcolor: 'grey.100', borderRadius: '50%', p: 2, fontSize: 32 }}>{icon}</Box>
      <Box>
        <Typography variant="h5" fontWeight="bold">{value}</Typography>
        <Typography color="text.secondary">{label}</Typography>
      </Box>
    </CardContent>
  </Card>
);

const QuickActionCard = ({ icon, label, onClick }) => (
  <Button variant="outlined" sx={{ flexDirection: 'column', py: 3 }} onClick={onClick} fullWidth>
    <Box mb={1} fontSize={24}>{icon}</Box>
    <Typography variant="body2">{label}</Typography>
  </Button>
);

const AdminDashboardMUI = () => {
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    totalVolunteerHours: 0,
    totalMeetings: 0,
  });

  useEffect(() => {
    // Simulate fetching stats
    setTimeout(() => {
      setStats({
        totalMembers: 120,
        activeMembers: 95,
        totalVolunteerHours: 340,
        totalMeetings: 18,
      });
    }, 500);
  }, []);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Sidebar would go here if needed */}
      <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 4 } }}>
        <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} alignItems="center" justifyContent="space-between" mb={4} gap={2}>
          <Typography variant="h4" fontWeight="bold">Admin Dashboard (MUI)</Typography>
          {/* Date Range Picker could go here */}
        </Box>
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <DashboardCard icon={<Users />} label="Total Members" value={stats.totalMembers} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DashboardCard icon={<User />} label="Active Members" value={stats.activeMembers} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DashboardCard icon={<Clock />} label="Volunteer Hours" value={stats.totalVolunteerHours} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DashboardCard icon={<Calendar />} label="Meetings" value={stats.totalMeetings} />
          </Grid>
        </Grid>
        <Typography variant="h6" mb={2}>Quick Actions</Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <QuickActionCard icon={<Calendar />} label="Manage Events" onClick={() => window.location.href='/admin/events'} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <QuickActionCard icon={<User />} label="Manage Members" onClick={() => window.location.href='/admin/members'} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <QuickActionCard icon={<Clock />} label="Manage Volunteer Hours" onClick={() => window.location.href='/admin/volunteer-hours'} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <QuickActionCard icon={<Heart />} label="Manage Interests" onClick={() => window.location.href='/admin/interests'} />
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default AdminDashboardMUI; 