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
import AdminImports from './pages/Admin/AdminImports';
import RequireAuth from './components/Auth/RequireAuth';
import NotAuthorized from './pages/NotAuthorized';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/account" element={<RequireAuth><AccountPage /></RequireAuth>} />
        <Route path="/volunteer" element={<VolunteerPage />} />
        <Route path="/volunteer/log" element={<VolunteerPage />} />
        <Route path="/admin" element={<RequireAuth adminOnly><AdminDashboard /></RequireAuth>} />
        <Route path="/admin/interests" element={<RequireAuth adminOnly><AdminInterests /></RequireAuth>} />
        <Route path="/admin/volunteer-hours" element={<RequireAuth adminOnly><AdminVolunteerHours /></RequireAuth>} />
        <Route path="/admin/attendance" element={<RequireAuth adminOnly><AdminAttendance /></RequireAuth>} />
        <Route path="/admin/members" element={<RequireAuth adminOnly><AdminMembers /></RequireAuth>} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/admin/payments" element={<RequireAuth adminOnly><AdminPayments /></RequireAuth>} />
        <Route path="/test-supabase" element={<TestSupabase />} />
        <Route path="/admin/events" element={<RequireAuth adminOnly><AdminEvents /></RequireAuth>} />
        <Route path="/admin/functions" element={<RequireAuth adminOnly><AdminFunctions /></RequireAuth>} />
        <Route path="/admin/imports" element={<RequireAuth adminOnly><AdminImports /></RequireAuth>} />
        <Route path="/not-authorized" element={<NotAuthorized />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;