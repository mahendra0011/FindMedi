import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import DashboardLayout from './components/DashboardLayout';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import PendingApproval from './pages/PendingApproval';
import Dashboard from './pages/Dashboard';
import Doctors from './pages/Doctors';
import Patients from './pages/Patients';
import Appointments from './pages/Appointments';
import MedicalRecords from './pages/MedicalRecords';
import Billing from './pages/Billing';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import Notifications from './pages/Notifications';
import OTPVerification from './pages/OTPVerification';
import { LenisScroll } from './components/LenisScroll';

// Patient pages
import PatientDoctors from './pages/patient/PatientDoctors';
import PatientAppointments from './pages/patient/PatientAppointments';
import PatientRecords from './pages/patient/PatientRecords';
import PatientReviews from './pages/patient/PatientReviews';
import PatientBilling from './pages/patient/PatientBilling';
import PatientPayment from './pages/patient/PatientPayment';
import PatientReports from './pages/patient/PatientReports';
import PatientServices from './pages/patient/PatientServices';
import PatientEmergency from './pages/patient/PatientEmergency';
import PatientDashboard from './pages/patient/PatientDashboard';

// Doctor pages
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorAppointments from './pages/doctor/DoctorAppointments';
import DoctorPatients from './pages/doctor/DoctorPatients';
import DoctorConsultations from './pages/doctor/DoctorConsultations';
import DoctorReviews from './pages/doctor/DoctorReviews';
import DoctorEarnings from './pages/doctor/DoctorEarnings';
import DoctorSchedule from './pages/doctor/DoctorSchedule';
import DoctorEmergency from './pages/doctor/DoctorEmergency';

// Admin pages
import AdminUsers from './pages/admin/AdminUsers';
import AdminDoctors from './pages/admin/AdminDoctors';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminDepartments from './pages/admin/AdminDepartments';
import AdminReviews from './pages/admin/AdminReviews';
import AdminEmergency from './pages/admin/AdminEmergency';
import PDFReports from './pages/PDFReports';
import ImportExport from './pages/ImportExport';
import FileUpload from './pages/FileUpload';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

function BlockedAccountRedirect() {
  const { logout } = useAuth();

  useEffect(() => {
    logout();
  }, [logout]);

  return <Navigate to="/login" replace />;
}

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (user.status === 'blocked') return <BlockedAccountRedirect />;
  if (!user.isVerified) return <Navigate to={`/verify-otp?email=${encodeURIComponent(user.email)}`} replace />;
  if (user.role === 'doctor' && !user.doctorApproved) {
    return <Navigate to={`/pending-approval?email=${encodeURIComponent(user.email)}&status=${user.approvalStatus === 'rejected' ? 'rejected' : 'pending'}`} replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function DashboardPage({ children }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

function getDefaultDashboardPath(user) {
  const value = user?.settings?.defaultDashboard || 'overview';
  if (value === 'overview') return '';

  const paths = {
    admin: {
      reports: '/reports',
      billing: '/billing',
      emergency: '/admin/emergency',
    },
    doctor: {
      appointments: '/doctor/appointments',
      patients: '/doctor/patients',
      reports: '/reports',
      earnings: '/doctor/earnings',
      schedule: '/doctor/schedule',
      emergency: '/doctor/emergency',
    },
    patient: {
      appointments: '/patient/appointments',
      records: '/patient/records',
      billing: '/patient/billing',
    },
  };

  return paths[user?.role]?.[value] || '';
}

function RoleDashboard() {
  const { user } = useAuth();
  const defaultPath = getDefaultDashboardPath(user);
  if (defaultPath) return <Navigate to={defaultPath} replace />;
  if (user?.role === 'doctor') return <DoctorDashboard />;
  if (user?.role === 'admin') return <Dashboard />;
  return <PatientDashboard />;
}

  const App = () => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <LenisScroll>
            <BrowserRouter>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/verify-otp" element={<OTPVerification />} />
                <Route path="/pending-approval" element={<PendingApproval />} />

                {/* Dashboard - role-based content */}
                <Route path="/dashboard" element={<ProtectedRoute><DashboardPage><RoleDashboard /></DashboardPage></ProtectedRoute>} />

                {/* Notifications - all roles */}
                <Route path="/notifications" element={<ProtectedRoute><DashboardPage><Notifications /></DashboardPage></ProtectedRoute>} />

                {/* Settings - all roles */}
                <Route path="/settings" element={<ProtectedRoute><DashboardPage><Settings /></DashboardPage></ProtectedRoute>} />

                {/* Admin routes */}
                <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><DashboardPage><AdminUsers /></DashboardPage></ProtectedRoute>} />
                <Route path="/admin/doctors" element={<ProtectedRoute allowedRoles={['admin']}><DashboardPage><AdminDoctors /></DashboardPage></ProtectedRoute>} />
                <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin']}><DashboardPage><AdminAnalytics /></DashboardPage></ProtectedRoute>} />
                <Route path="/admin/departments" element={<ProtectedRoute allowedRoles={['admin']}><DashboardPage><AdminDepartments /></DashboardPage></ProtectedRoute>} />
                <Route path="/admin/emergency" element={<ProtectedRoute allowedRoles={['admin']}><DashboardPage><AdminEmergency /></DashboardPage></ProtectedRoute>} />
                <Route path="/admin/reviews" element={<ProtectedRoute allowedRoles={['admin']}><DashboardPage><AdminReviews /></DashboardPage></ProtectedRoute>} />
                <Route path="/doctors" element={<ProtectedRoute allowedRoles={['admin']}><DashboardPage><Doctors /></DashboardPage></ProtectedRoute>} />
                <Route path="/patients" element={<ProtectedRoute allowedRoles={['admin']}><DashboardPage><Patients /></DashboardPage></ProtectedRoute>} />
                <Route path="/appointments" element={<ProtectedRoute allowedRoles={['admin']}><DashboardPage><Appointments /></DashboardPage></ProtectedRoute>} />
                <Route path="/records" element={<ProtectedRoute allowedRoles={['admin']}><DashboardPage><MedicalRecords /></DashboardPage></ProtectedRoute>} />
                <Route path="/billing" element={<ProtectedRoute allowedRoles={['admin']}><DashboardPage><Billing /></DashboardPage></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin', 'doctor']}><DashboardPage><PDFReports /></DashboardPage></ProtectedRoute>} />
                <Route path="/import-export" element={<ProtectedRoute allowedRoles={['admin']}><DashboardPage><ImportExport /></DashboardPage></ProtectedRoute>} />
                <Route path="/upload" element={<ProtectedRoute><DashboardPage><FileUpload /></DashboardPage></ProtectedRoute>} />

                {/* Patient routes */}
                <Route path="/patient/doctors" element={<ProtectedRoute allowedRoles={['patient']}><DashboardPage><PatientDoctors /></DashboardPage></ProtectedRoute>} />
                <Route path="/patient/appointments" element={<ProtectedRoute allowedRoles={['patient']}><DashboardPage><PatientAppointments /></DashboardPage></ProtectedRoute>} />
                <Route path="/patient/records" element={<ProtectedRoute allowedRoles={['patient']}><DashboardPage><PatientRecords /></DashboardPage></ProtectedRoute>} />
                <Route path="/patient/reports" element={<ProtectedRoute allowedRoles={['patient']}><DashboardPage><PatientReports /></DashboardPage></ProtectedRoute>} />
                <Route path="/patient/reviews" element={<ProtectedRoute allowedRoles={['patient']}><DashboardPage><PatientReviews /></DashboardPage></ProtectedRoute>} />
                <Route path="/patient/billing" element={<ProtectedRoute allowedRoles={['patient']}><DashboardPage><PatientBilling /></DashboardPage></ProtectedRoute>} />
                <Route path="/patient/payment" element={<ProtectedRoute allowedRoles={['patient']}><DashboardPage><PatientPayment /></DashboardPage></ProtectedRoute>} />
                <Route path="/patient/services" element={<ProtectedRoute allowedRoles={['patient']}><DashboardPage><PatientServices /></DashboardPage></ProtectedRoute>} />
                <Route path="/patient/emergency" element={<ProtectedRoute allowedRoles={['patient']}><DashboardPage><PatientEmergency /></DashboardPage></ProtectedRoute>} />

                {/* Doctor routes */}
                <Route path="/doctor/appointments" element={<ProtectedRoute allowedRoles={['doctor']}><DashboardPage><DoctorAppointments /></DashboardPage></ProtectedRoute>} />
                <Route path="/doctor/patients" element={<ProtectedRoute allowedRoles={['doctor']}><DashboardPage><DoctorPatients /></DashboardPage></ProtectedRoute>} />
                <Route path="/doctor/consultations" element={<ProtectedRoute allowedRoles={['doctor']}><DashboardPage><DoctorConsultations /></DashboardPage></ProtectedRoute>} />
                <Route path="/doctor/reviews" element={<ProtectedRoute allowedRoles={['doctor']}><DashboardPage><DoctorReviews /></DashboardPage></ProtectedRoute>} />
                <Route path="/doctor/earnings" element={<ProtectedRoute allowedRoles={['doctor']}><DashboardPage><DoctorEarnings /></DashboardPage></ProtectedRoute>} />
                <Route path="/doctor/schedule" element={<ProtectedRoute allowedRoles={['doctor']}><DashboardPage><DoctorSchedule /></DashboardPage></ProtectedRoute>} />
                <Route path="/doctor/emergency" element={<ProtectedRoute allowedRoles={['doctor']}><DashboardPage><DoctorEmergency /></DashboardPage></ProtectedRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </LenisScroll>
          </TooltipProvider>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );

export default App;
