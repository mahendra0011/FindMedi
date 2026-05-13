import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Route, Routes, Navigate, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import DashboardLayout from './components/DashboardLayout';
import AppMotion from './components/AppMotion';
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

function DashboardShell() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function RoleRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  if (allowedRoles && !allowedRoles.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  return children;
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
          <HashRouter>
            <LenisScroll>
              <AppMotion>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/verify-otp" element={<OTPVerification />} />
                  <Route path="/pending-approval" element={<PendingApproval />} />

                  {/* Authenticated dashboard shell */}
                  <Route element={<DashboardShell />}>
                    <Route path="/dashboard" element={<RoleDashboard />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/upload" element={<FileUpload />} />

                    {/* Admin routes */}
                    <Route path="/admin/users" element={<RoleRoute allowedRoles={['admin']}><AdminUsers /></RoleRoute>} />
                    <Route path="/admin/doctors" element={<RoleRoute allowedRoles={['admin']}><AdminDoctors /></RoleRoute>} />
                    <Route path="/admin/analytics" element={<RoleRoute allowedRoles={['admin']}><AdminAnalytics /></RoleRoute>} />
                    <Route path="/admin/departments" element={<RoleRoute allowedRoles={['admin']}><AdminDepartments /></RoleRoute>} />
                    <Route path="/admin/emergency" element={<RoleRoute allowedRoles={['admin']}><AdminEmergency /></RoleRoute>} />
                    <Route path="/admin/reviews" element={<RoleRoute allowedRoles={['admin']}><AdminReviews /></RoleRoute>} />
                    <Route path="/doctors" element={<RoleRoute allowedRoles={['admin']}><Doctors /></RoleRoute>} />
                    <Route path="/patients" element={<RoleRoute allowedRoles={['admin']}><Patients /></RoleRoute>} />
                    <Route path="/appointments" element={<RoleRoute allowedRoles={['admin']}><Appointments /></RoleRoute>} />
                    <Route path="/records" element={<RoleRoute allowedRoles={['admin']}><MedicalRecords /></RoleRoute>} />
                    <Route path="/billing" element={<RoleRoute allowedRoles={['admin']}><Billing /></RoleRoute>} />
                    <Route path="/reports" element={<RoleRoute allowedRoles={['admin', 'doctor']}><PDFReports /></RoleRoute>} />
                    <Route path="/import-export" element={<RoleRoute allowedRoles={['admin']}><ImportExport /></RoleRoute>} />

                    {/* Patient routes */}
                    <Route path="/patient/doctors" element={<RoleRoute allowedRoles={['patient']}><PatientDoctors /></RoleRoute>} />
                    <Route path="/patient/appointments" element={<RoleRoute allowedRoles={['patient']}><PatientAppointments /></RoleRoute>} />
                    <Route path="/patient/records" element={<RoleRoute allowedRoles={['patient']}><PatientRecords /></RoleRoute>} />
                    <Route path="/patient/reports" element={<RoleRoute allowedRoles={['patient']}><PatientReports /></RoleRoute>} />
                    <Route path="/patient/reviews" element={<RoleRoute allowedRoles={['patient']}><PatientReviews /></RoleRoute>} />
                    <Route path="/patient/billing" element={<RoleRoute allowedRoles={['patient']}><PatientBilling /></RoleRoute>} />
                    <Route path="/patient/payment" element={<RoleRoute allowedRoles={['patient']}><PatientPayment /></RoleRoute>} />
                    <Route path="/patient/services" element={<RoleRoute allowedRoles={['patient']}><PatientServices /></RoleRoute>} />
                    <Route path="/patient/emergency" element={<RoleRoute allowedRoles={['patient']}><PatientEmergency /></RoleRoute>} />

                    {/* Doctor routes */}
                    <Route path="/doctor/appointments" element={<RoleRoute allowedRoles={['doctor']}><DoctorAppointments /></RoleRoute>} />
                    <Route path="/doctor/patients" element={<RoleRoute allowedRoles={['doctor']}><DoctorPatients /></RoleRoute>} />
                    <Route path="/doctor/consultations" element={<RoleRoute allowedRoles={['doctor']}><DoctorConsultations /></RoleRoute>} />
                    <Route path="/doctor/reviews" element={<RoleRoute allowedRoles={['doctor']}><DoctorReviews /></RoleRoute>} />
                    <Route path="/doctor/earnings" element={<RoleRoute allowedRoles={['doctor']}><DoctorEarnings /></RoleRoute>} />
                    <Route path="/doctor/schedule" element={<RoleRoute allowedRoles={['doctor']}><DoctorSchedule /></RoleRoute>} />
                    <Route path="/doctor/emergency" element={<RoleRoute allowedRoles={['doctor']}><DoctorEmergency /></RoleRoute>} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppMotion>
            </LenisScroll>
          </HashRouter>
        </TooltipProvider>
      </NotificationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
