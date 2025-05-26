import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RegistrationPage from './pages/RegistrationPage';
import LoginPage from './pages/LoginPage';
import AccountPage from './pages/AccountPage';
import VolunteerPage from './pages/VolunteerPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminInterests from './pages/Admin/AdminInterests';
import AdminVolunteerHours from './pages/Admin/AdminVolunteerHours';
import AdminMeetingAttendance from './pages/Admin/AdminMeetingAttendance';
import AdminMembers from './pages/Admin/AdminMembers';
import PaymentPage from './pages/PaymentPage';
import AdminPayments from './pages/Admin/AdminPayments';
import TestSupabase from './pages/TestSupabase';
import AdminEvents from './pages/Admin/AdminEvents';
import AdminFunctions from './pages/AdminFunctions';
import AdminAttendance from './pages/Admin/AdminAttendance';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/volunteer" element={<VolunteerPage />} />
        <Route path="/volunteer/log" element={<VolunteerPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/interests" element={<AdminInterests />} />
        <Route path="/admin/volunteer-hours" element={<AdminVolunteerHours />} />
        <Route path="/admin/attendance" element={<AdminAttendance />} />
        <Route path="/admin/members" element={<AdminMembers />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/admin/payments" element={<AdminPayments />} />
        <Route path="/test-supabase" element={<TestSupabase />} />
        <Route path="/admin/events" element={<AdminEvents />} />
        <Route path="/admin/functions" element={<AdminFunctions />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;