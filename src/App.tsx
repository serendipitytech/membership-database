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
import PaymentPage from './pages/PaymentPage';

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
        <Route path="/admin/attendance" element={<AdminMeetingAttendance />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;