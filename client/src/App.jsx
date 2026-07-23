import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Route, Routes, Navigate, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { store } from '@/store';
import { initializeAuth } from '@/store/slices/authSlice';
import { applyUserSettings, readStoredSettings } from '@/lib/settings';
import { loadUserSettings } from '@/store/slices/settingsSlice';
import { NotificationProvider } from '@/context/NotificationContext';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { PreferredPharmacyProvider } from '@/context/PreferredPharmacyContext';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from './components/DashboardLayout';
import PublicLayout from './components/PublicLayout';
import AppMotion from './components/AppMotion';
import Home from './pages/Home';
import Login from './pages/Login';
import ClinicDoctors from './pages/ClinicDoctors';
import DiagnosticCenters from './pages/DiagnosticCenters';
import AllTests from './pages/AllTests';
import DiagnosticCenterDetail from './pages/DiagnosticCenterDetail';
import TechnicianDetail from './pages/TechnicianDetail';
import ImagingCenterDetail from './pages/ImagingCenterDetail';

import BuyMedicine from './pages/BuyMedicine';
import MedicineStoreDetail from './pages/MedicineStoreDetail';
import ClinicDetail from './pages/ClinicDetail';
import HospitalTestBooking from './pages/HospitalTestBooking';
import StoreMedicines from './pages/StoreMedicines';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import OrderTracking from './pages/OrderTracking';
import PaymentGateway from './pages/PaymentGateway';
import HospitalDoctor from './pages/HospitalDoctor';
import ClinicDoctor from './pages/ClinicDoctor';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import PendingApproval from './pages/PendingApproval';
import JoinPlatform from './pages/JoinPlatform';
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
import DoctorSetup from './pages/DoctorSetup';
import { LenisScroll } from './components/LenisScroll';
import ErrorBoundary from './components/ErrorBoundary';

// Patient pages
import PatientAppointments from './pages/patient/PatientAppointments';
import PatientRecords from './pages/patient/PatientRecords';
import PatientReviews from './pages/patient/PatientReviews';
import PatientBilling from './pages/patient/PatientBilling';
import PatientPayment from './pages/patient/PatientPayment';
import PatientReports from './pages/patient/PatientReports';
import PatientServices from './pages/patient/PatientServices';
import PatientEmergency from './pages/patient/PatientEmergency';
import PatientBookings from './pages/patient/PatientBookings';
import PatientDashboard from './pages/patient/PatientDashboard';
import PatientPrescriptions from './pages/patient/PatientPrescriptions';
import PatientMedicineOrders from './pages/patient/PatientMedicineOrders';
import PatientSupport from './pages/patient/PatientSupport';

// Doctor pages
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorAppointments from './pages/doctor/DoctorAppointments';
import DoctorPatients from './pages/doctor/DoctorPatients';
import DoctorConsultations from './pages/doctor/DoctorConsultations';
import DoctorReviews from './pages/doctor/DoctorReviews';
import DoctorTestResults from './pages/doctor/DoctorTestResults';
import DoctorEarnings from './pages/doctor/DoctorEarnings';
import DoctorSchedule from './pages/doctor/DoctorSchedule';
import DoctorEmergency from './pages/doctor/DoctorEmergency';
import DoctorPrescriptions from './pages/doctor/DoctorPrescriptions';
import DoctorLeaveRequests from './pages/doctor/DoctorLeaveRequests';
import DoctorProfile from './pages/doctor/DoctorProfile';

// Clinic Doctor pages
import ClinicDashboard from './pages/clinic/ClinicDashboard';
import ClinicAppointments from './pages/clinic/ClinicAppointments';
import ClinicSchedule from './pages/clinic/ClinicSchedule';
import ClinicFees from './pages/clinic/ClinicFees';
import ClinicPatients from './pages/clinic/ClinicPatients';
import ClinicPrescriptions from './pages/clinic/ClinicPrescriptions';
import ClinicTests from './pages/clinic/ClinicTests';
import ClinicConsultations from './pages/clinic/ClinicConsultations';
import ClinicManagement from './pages/clinic/ClinicManagement';
import ClinicBilling from './pages/clinic/ClinicBilling';
import ClinicEarnings from './pages/clinic/ClinicEarnings';
import ClinicReviews from './pages/clinic/ClinicReviews';
import ClinicStaff from './pages/clinic/ClinicStaff';
import ClinicNotifications from './pages/clinic/ClinicNotifications';

// Admin pages
import AdminUsers from './pages/admin/AdminUsers';
import AdminPrescriptionQueue from './pages/admin/AdminPrescriptionQueue';
import AdminDoctors from './pages/admin/AdminDoctors';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminDepartments from './pages/admin/AdminDepartments';
import AdminReviews from './pages/admin/AdminReviews';
import AdminEmergency from './pages/admin/AdminEmergency';
import AdminBedManagement from './pages/admin/AdminBedManagement';
import AdminTestCatalog from './pages/admin/AdminTestCatalog';
import AdminHospitalSettings from './pages/admin/AdminHospitalSettings';
import AdminClinicSettings from './pages/admin/AdminClinicSettings';
import AdminLabSettings from './pages/admin/AdminLabSettings';
import AdminPharmacySettings from './pages/admin/AdminPharmacySettings';
import AdminAnnouncements from './pages/admin/AdminAnnouncements';
import AdminLeaveRequests from './pages/admin/AdminLeaveRequests';
import DiagnosticDashboard from './pages/DiagnosticDashboard';
import PDFReports from './pages/PDFReports';
import ImportExport from './pages/ImportExport';
import FileUpload from './pages/FileUpload';
import Lab from './pages/Lab';
import Pharmacy from './pages/Pharmacy';
import IPD from './pages/IPD';
import NursingCharts from './pages/NursingCharts';
import TriagePage from './pages/TriagePage';
import Radiology from './pages/Radiology';
import Insurance from './pages/Insurance';
import DietKitchen from './pages/DietKitchen';
import OperationTheatre from './pages/OperationTheatre';
import BloodBank from './pages/BloodBank';
import Physiotherapy from './pages/Physiotherapy';
import MentalHealth from './pages/MentalHealth';
import Reports from './pages/Reports';
import Staff from './pages/Staff';
import Inventory from './pages/Inventory';
import Housekeeping from './pages/Housekeeping';
import OPDRegistration from './pages/OPDRegistration';
import OPDToken from './pages/OPDToken';
import PatientRegistration from './pages/PatientRegistration';
import DoctorConsultation from './pages/DoctorConsultation';

// Hospital & superadmin pages
import HospitalDirectory from './pages/HospitalDirectory';
import HospitalProfile from './pages/HospitalProfile';
import HospitalDoctors from './pages/HospitalDoctors';
import SuperAdminDashboard from './pages/SuperAdminDashboard';

// Pharmacy Business pages
import PharmacyBusinessLayout from './pages/pharmacy/PharmacyBusinessLayout';
import PharmacyBusinessDashboard from './pages/pharmacy/PharmacyBusinessDashboard';
import PharmacyInventory from './pages/pharmacy/PharmacyInventory';
import PharmacyOrders from './pages/pharmacy/PharmacyOrders';
import PharmacyStaff from './pages/pharmacy/PharmacyStaff';
import PharmacyOffers from './pages/pharmacy/PharmacyOffers';
import PharmacyReturns from './pages/pharmacy/PharmacyReturns';
import PharmacyPrescriptionQueue from './pages/pharmacy/PharmacyPrescriptionQueue';
import PharmacyAnalytics from './pages/pharmacy/PharmacyAnalytics';
import PharmacyReviews from './pages/pharmacy/PharmacyReviews';
import PharmacyDelivery from './pages/pharmacy/PharmacyDelivery';

// Lab Business pages
import LabBusinessLayout from './pages/labcenter/LabBusinessLayout';
import LabCenterDashboard from './pages/labcenter/LabCenterDashboard';
import LabAppointments from './pages/labcenter/LabAppointments';
import LabBilling from './pages/labcenter/LabBilling';
import LabBookingManagement from './pages/labcenter/LabBookingManagement';
import LabEquipment from './pages/labcenter/LabEquipment';
import LabPackages from './pages/labcenter/LabPackages';
import LabPrescriptionQueue from './pages/labcenter/LabPrescriptionQueue';
import LabReports from './pages/labcenter/LabReports';
import LabReportsAnalytics from './pages/labcenter/LabReportsAnalytics';
import LabReviews from './pages/labcenter/LabReviews';
import LabSampleCollection from './pages/labcenter/LabSampleCollection';
import LabStaff from './pages/labcenter/LabStaff';
import LabTestCatalog from './pages/labcenter/LabTestCatalog';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

// Auth initializer component
function AuthInitializer({ children }) {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);
  return children;
}

function SettingsInitializer() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const reduxSettings = useSelector(state => state.settings);

  // Apply settings from localStorage on first mount
  useEffect(() => {
    const stored = readStoredSettings();
    if (stored && Object.keys(stored).length > 0) {
      dispatch(loadUserSettings(stored));
    }
  }, []);

  // Load user settings into Redux when user logs in and apply to DOM
  useEffect(() => {
    if (user?.settings) {
      dispatch(loadUserSettings(user.settings));
      applyUserSettings(user.settings);
    }
  }, [user?.settings, dispatch]);

  // Apply settings whenever Redux settings change (after initial mount)
  useEffect(() => {
    applyUserSettings(reduxSettings);
  }, [reduxSettings]);

  return null;
}

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
  if ((user.role === 'doctor' || user.role === 'clinic_doctor') && !user.doctorApproved) {
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
    clinic_doctor: {
      appointments: '/clinic/appointments',
      patients: '/clinic/patients',
      reports: '/reports',
      earnings: '/clinic/earnings',
      schedule: '/clinic/schedule',
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
  if (user?.role === 'superadmin') return <SuperAdminDashboard />;
  if (user?.role === 'doctor') return <DoctorDashboard />;
  if (user?.role === 'clinic_doctor') return <ClinicDashboard />;
  if (user?.role === 'admin') return <Dashboard />;
  return <PatientDashboard />;
}

// Wrapper that uses Redux for auth instead of context
function ReduxAuthProvider({ children }) {
  return (
    <Provider store={store}>
      <AuthInitializer>
        <AuthProvider>
          <SettingsInitializer />
          {children}
        </AuthProvider>
      </AuthInitializer>
    </Provider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
    <ReduxAuthProvider>
      <NotificationProvider>
        <PreferredPharmacyProvider>
        <CartProvider>
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
                    <Route path="/join-platform" element={<JoinPlatform />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/verify-otp" element={<OTPVerification />} />
                  <Route path="/pending-approval" element={<PendingApproval />} />
                  <Route path="/doctor-setup" element={<DoctorSetup />} />
<Route path="/hospitals" element={<PublicLayout><HospitalDirectory /></PublicLayout>} />
                   <Route path="/hospitals/:id" element={<PublicLayout><HospitalProfile /></PublicLayout>} />
                   <Route path="/hospitals/:hospitalId/doctors" element={<PublicLayout><HospitalDoctors /></PublicLayout>} />
                   <Route path="/register-hospital" element={<Navigate to="/join-platform" replace />} />
                   <Route path="/register-facility" element={<Navigate to="/join-platform" replace />} />
                     <Route path="/clinic-doctors" element={<PublicLayout><ClinicDoctors /></PublicLayout>} />
                      <Route path="/hospital-doctors/:id" element={<PublicLayout><HospitalDoctor /></PublicLayout>} />
                     <Route path="/clinic-doctors/:id" element={<PublicLayout><ClinicDoctor /></PublicLayout>} />
                     <Route path="/clinic/:clinicId" element={<PublicLayout><ClinicDetail /></PublicLayout>} />
                     <Route path="/book-test/:entityId" element={<PublicLayout><HospitalTestBooking /></PublicLayout>} />
                     <Route path="/diagnostic-centers" element={<PublicLayout><DiagnosticCenters /></PublicLayout>} />
                     <Route path="/all-tests" element={<PublicLayout><AllTests /></PublicLayout>} />
                      <Route path="/lab/:clinicId" element={<PublicLayout><DiagnosticCenterDetail /></PublicLayout>} />
                       <Route path="/lab/:clinicId/details" element={<PublicLayout><DiagnosticCenterDetail /></PublicLayout>} />
                       <Route path="/technician/:id" element={<PublicLayout><TechnicianDetail /></PublicLayout>} />
                     <Route path="/test-booking" element={<PublicLayout><HospitalTestBooking /></PublicLayout>} />
                     <Route path="/test-booking/:hospitalId" element={<PublicLayout><HospitalTestBooking /></PublicLayout>} />


                     <Route path="/imaging/:clinicId" element={<PublicLayout><ImagingCenterDetail /></PublicLayout>} />
                     <Route path="/imaging/:clinicId/details" element={<PublicLayout><ImagingCenterDetail /></PublicLayout>} />
                    <Route path="/buy-medicine" element={<PublicLayout><BuyMedicine /></PublicLayout>} />
                   <Route path="/buy-medicine/:storeId/medicines" element={<PublicLayout><StoreMedicines /></PublicLayout>} />
                   <Route path="/buy-medicine/:storeId" element={<PublicLayout><MedicineStoreDetail /></PublicLayout>} />
                   <Route path="/cart" element={<PublicLayout><Cart /></PublicLayout>} />
                   <Route path="/checkout" element={<PublicLayout><Checkout /></PublicLayout>} />
                   <Route path="/order-confirmation" element={<PublicLayout><OrderConfirmation /></PublicLayout>} />
                    <Route path="/order-tracking/:orderId" element={<PublicLayout><OrderTracking /></PublicLayout>} />
                    <Route path="/payment-gateway" element={<PublicLayout><PaymentGateway /></PublicLayout>} />

                  {/* Pharmacy Business routes */}
                  <Route path="/pharmacy-business" element={<PharmacyBusinessLayout />}>
                    <Route index element={<Navigate to="/pharmacy-business/dashboard" replace />} />
                    <Route path="dashboard" element={<RoleRoute allowedRoles={['pharmacy_owner']}><PharmacyBusinessDashboard /></RoleRoute>} />
                    <Route path="inventory" element={<RoleRoute allowedRoles={['pharmacy_owner']}><PharmacyInventory /></RoleRoute>} />
                    <Route path="orders" element={<RoleRoute allowedRoles={['pharmacy_owner']}><PharmacyOrders /></RoleRoute>} />
                    <Route path="prescriptions" element={<RoleRoute allowedRoles={['pharmacy_owner']}><PharmacyPrescriptionQueue /></RoleRoute>} />
                    <Route path="staff" element={<RoleRoute allowedRoles={['pharmacy_owner']}><PharmacyStaff /></RoleRoute>} />
                    <Route path="reviews" element={<RoleRoute allowedRoles={['pharmacy_owner']}><PharmacyReviews /></RoleRoute>} />
                    <Route path="offers" element={<RoleRoute allowedRoles={['pharmacy_owner']}><PharmacyOffers /></RoleRoute>} />
                    <Route path="returns" element={<RoleRoute allowedRoles={['pharmacy_owner']}><PharmacyReturns /></RoleRoute>} />
                    <Route path="analytics" element={<RoleRoute allowedRoles={['pharmacy_owner']}><PharmacyAnalytics /></RoleRoute>} />
                    <Route path="delivery" element={<RoleRoute allowedRoles={['pharmacy_owner']}><PharmacyDelivery /></RoleRoute>} />
                    <Route path="settings" element={<RoleRoute allowedRoles={['pharmacy_owner']}><AdminPharmacySettings /></RoleRoute>} />
                  </Route>

                  {/* Lab Business routes */}
                  <Route path="/lab-business" element={<LabBusinessLayout />}>
                    <Route index element={<Navigate to="/lab-business/dashboard" replace />} />
                    <Route path="dashboard" element={<RoleRoute allowedRoles={['lab_owner']}><LabCenterDashboard /></RoleRoute>} />
                    <Route path="appointments" element={<RoleRoute allowedRoles={['lab_owner']}><LabAppointments /></RoleRoute>} />
                    <Route path="reports" element={<RoleRoute allowedRoles={['lab_owner']}><LabReports /></RoleRoute>} />
                    <Route path="tests" element={<RoleRoute allowedRoles={['lab_owner']}><LabTestCatalog /></RoleRoute>} />
                    <Route path="equipment" element={<RoleRoute allowedRoles={['lab_owner']}><LabEquipment /></RoleRoute>} />
                    <Route path="packages" element={<RoleRoute allowedRoles={['lab_owner']}><LabPackages /></RoleRoute>} />
                    <Route path="staff" element={<RoleRoute allowedRoles={['lab_owner']}><LabStaff /></RoleRoute>} />
                    <Route path="settings" element={<RoleRoute allowedRoles={['lab_owner']}><AdminLabSettings /></RoleRoute>} />
                    <Route path="billing" element={<RoleRoute allowedRoles={['lab_owner']}><LabBilling /></RoleRoute>} />
                    <Route path="bookings" element={<RoleRoute allowedRoles={['lab_owner']}><LabBookingManagement /></RoleRoute>} />
                    <Route path="prescriptions" element={<RoleRoute allowedRoles={['lab_owner']}><LabPrescriptionQueue /></RoleRoute>} />
                    <Route path="samples" element={<RoleRoute allowedRoles={['lab_owner']}><LabSampleCollection /></RoleRoute>} />
                    <Route path="analytics" element={<RoleRoute allowedRoles={['lab_owner']}><LabReportsAnalytics /></RoleRoute>} />
                    <Route path="reviews" element={<RoleRoute allowedRoles={['lab_owner']}><LabReviews /></RoleRoute>} />
                  </Route>

                  {/* Authenticated dashboard shell */}
                  <Route element={<DashboardShell />}>
                    <Route path="/dashboard" element={<RoleDashboard />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/upload" element={<FileUpload />} />

                    {/* Admin routes */}
                    <Route path="/superadmin" element={<RoleRoute allowedRoles={['superadmin']}><SuperAdminDashboard /></RoleRoute>} />
                    <Route path="/admin/users" element={<RoleRoute allowedRoles={['admin', 'superadmin']}><AdminUsers /></RoleRoute>} />
                    <Route path="/admin/doctors" element={<RoleRoute allowedRoles={['admin']}><AdminDoctors /></RoleRoute>} />
                    <Route path="/admin/prescriptions" element={<RoleRoute allowedRoles={['admin']}><AdminPrescriptionQueue /></RoleRoute>} />
                    <Route path="/admin/analytics" element={<RoleRoute allowedRoles={['admin']}><AdminAnalytics /></RoleRoute>} />
                    <Route path="/admin/departments" element={<RoleRoute allowedRoles={['admin']}><AdminDepartments /></RoleRoute>} />
                    <Route path="/admin/emergency" element={<RoleRoute allowedRoles={['admin']}><AdminEmergency /></RoleRoute>} />
                    <Route path="/admin/reviews" element={<RoleRoute allowedRoles={['admin']}><AdminReviews /></RoleRoute>} />
                    <Route path="/admin/beds" element={<RoleRoute allowedRoles={['admin']}><AdminBedManagement /></RoleRoute>} />
                    <Route path="/admin/test-catalog" element={<RoleRoute allowedRoles={['admin']}><AdminTestCatalog /></RoleRoute>} />
                    <Route path="/admin/hospital-settings" element={<RoleRoute allowedRoles={['admin']}><AdminHospitalSettings /></RoleRoute>} />
                    <Route path="/admin/clinic-settings" element={<RoleRoute allowedRoles={['admin', 'clinic_doctor']}><AdminClinicSettings /></RoleRoute>} />
                    <Route path="/admin/lab-settings" element={<RoleRoute allowedRoles={['admin', 'lab_owner']}><AdminLabSettings /></RoleRoute>} />
                    <Route path="/admin/pharmacy-settings" element={<RoleRoute allowedRoles={['admin', 'pharmacy_owner']}><AdminPharmacySettings /></RoleRoute>} />
                    <Route path="/admin/announcements" element={<RoleRoute allowedRoles={['admin']}><AdminAnnouncements /></RoleRoute>} />
                    <Route path="/admin/leave-requests" element={<RoleRoute allowedRoles={['admin']}><AdminLeaveRequests /></RoleRoute>} />
                    <Route path="/admin/diagnostic" element={<RoleRoute allowedRoles={['admin', 'doctor', 'lab_receptionist', 'lab_technician', 'pathologist']}><DiagnosticDashboard /></RoleRoute>} />
                    <Route path="/doctors" element={<RoleRoute allowedRoles={['admin']}><Doctors /></RoleRoute>} />
                    <Route path="/patients" element={<RoleRoute allowedRoles={['admin']}><Patients /></RoleRoute>} />
                    <Route path="/appointments" element={<RoleRoute allowedRoles={['admin']}><Appointments /></RoleRoute>} />
                    <Route path="/records" element={<RoleRoute allowedRoles={['admin']}><MedicalRecords /></RoleRoute>} />
                    <Route path="/billing" element={<RoleRoute allowedRoles={['admin']}><Billing /></RoleRoute>} />
                    <Route path="/reports" element={<RoleRoute allowedRoles={['admin', 'doctor']}><PDFReports /></RoleRoute>} />
                    <Route path="/import-export" element={<RoleRoute allowedRoles={['admin']}><ImportExport /></RoleRoute>} />
                    <Route path="/lab" element={<RoleRoute allowedRoles={['admin', 'doctor', 'lab_receptionist', 'lab_technician', 'pathologist']}><Lab /></RoleRoute>} />
                    <Route path="/pharmacy" element={<RoleRoute allowedRoles={['admin', 'doctor', 'pharmacist']}><Pharmacy /></RoleRoute>} />
                    <Route path="/ipd" element={<RoleRoute allowedRoles={['admin', 'doctor', 'nurse']}><IPD /></RoleRoute>} />
                    <Route path="/triage" element={<RoleRoute allowedRoles={['admin', 'doctor', 'nurse']}><TriagePage /></RoleRoute>} />
                    <Route path="/nursing" element={<RoleRoute allowedRoles={['admin', 'doctor', 'nurse']}><NursingCharts /></RoleRoute>} />
                    <Route path="/radiology" element={<RoleRoute allowedRoles={['admin', 'doctor', 'radiologist']}><Radiology /></RoleRoute>} />
                    <Route path="/insurance" element={<RoleRoute allowedRoles={['admin', 'doctor', 'patient']}><Insurance /></RoleRoute>} />
                    <Route path="/diet" element={<RoleRoute allowedRoles={['admin', 'doctor', 'nurse']}><DietKitchen /></RoleRoute>} />
                    <Route path="/ot" element={<RoleRoute allowedRoles={['admin', 'doctor']}><OperationTheatre /></RoleRoute>} />
                    <Route path="/bloodbank" element={<RoleRoute allowedRoles={['admin', 'doctor', 'nurse']}><BloodBank /></RoleRoute>} />
                    <Route path="/physio" element={<RoleRoute allowedRoles={['admin', 'doctor', 'nurse']}><Physiotherapy /></RoleRoute>} />
                    <Route path="/mentalhealth" element={<RoleRoute allowedRoles={['admin', 'doctor', 'nurse']}><MentalHealth /></RoleRoute>} />
                    <Route path="/analytics-reports" element={<RoleRoute allowedRoles={['admin', 'doctor']}><Reports /></RoleRoute>} />
                    <Route path="/staff" element={<RoleRoute allowedRoles={['admin']}><Staff /></RoleRoute>} />
                    <Route path="/inventory" element={<RoleRoute allowedRoles={['admin']}><Inventory /></RoleRoute>} />
                    <Route path="/housekeeping" element={<RoleRoute allowedRoles={['admin']}><Housekeeping /></RoleRoute>} />
                    <Route path="/opd-token" element={<RoleRoute allowedRoles={['admin', 'doctor', 'nurse']}><OPDToken /></RoleRoute>} />
                    <Route path="/patient-registration" element={<RoleRoute allowedRoles={['admin', 'nurse']}><PatientRegistration /></RoleRoute>} />
                    <Route path="/doctor-consultation" element={<RoleRoute allowedRoles={['admin', 'doctor', 'nurse']}><DoctorConsultation /></RoleRoute>} />

                    {/* Patient routes */}
                    <Route path="/patient/appointments" element={<RoleRoute allowedRoles={['patient']}><PatientAppointments /></RoleRoute>} />
                    <Route path="/patient/records" element={<RoleRoute allowedRoles={['patient']}><PatientRecords /></RoleRoute>} />
                    <Route path="/patient/reports" element={<RoleRoute allowedRoles={['patient']}><PatientReports /></RoleRoute>} />
                    <Route path="/patient/reviews" element={<RoleRoute allowedRoles={['patient']}><PatientReviews /></RoleRoute>} />
                    <Route path="/patient/billing" element={<RoleRoute allowedRoles={['patient']}><PatientBilling /></RoleRoute>} />
                    <Route path="/patient/prescriptions" element={<RoleRoute allowedRoles={['patient']}><PatientPrescriptions /></RoleRoute>} />
                    <Route path="/patient/medicine-orders" element={<RoleRoute allowedRoles={['patient']}><PatientMedicineOrders /></RoleRoute>} />
                    <Route path="/patient/payment" element={<RoleRoute allowedRoles={['patient']}><PatientPayment /></RoleRoute>} />
                    <Route path="/patient/services" element={<RoleRoute allowedRoles={['patient']}><PatientServices /></RoleRoute>} />
                    <Route path="/patient/bookings" element={<RoleRoute allowedRoles={['patient']}><PatientBookings /></RoleRoute>} />
                    <Route path="/patient/emergency" element={<RoleRoute allowedRoles={['patient']}><PatientEmergency /></RoleRoute>} />
                    <Route path="/patient/support" element={<RoleRoute allowedRoles={['patient']}><PatientSupport /></RoleRoute>} />

                    {/* Doctor routes */}
                    <Route path="/doctor/appointments" element={<RoleRoute allowedRoles={['doctor']}><DoctorAppointments /></RoleRoute>} />
                    <Route path="/doctor/patients" element={<RoleRoute allowedRoles={['doctor']}><DoctorPatients /></RoleRoute>} />
                    <Route path="/doctor/consultations" element={<RoleRoute allowedRoles={['doctor']}><DoctorConsultations /></RoleRoute>} />
                    <Route path="/doctor/reviews" element={<RoleRoute allowedRoles={['doctor']}><DoctorReviews /></RoleRoute>} />
                    <Route path="/doctor/earnings" element={<RoleRoute allowedRoles={['doctor']}><DoctorEarnings /></RoleRoute>} />
                    <Route path="/doctor/schedule" element={<RoleRoute allowedRoles={['doctor']}><DoctorSchedule /></RoleRoute>} />
                    <Route path="/doctor/test-results" element={<RoleRoute allowedRoles={['doctor']}><DoctorTestResults /></RoleRoute>} />
                    <Route path="/doctor/emergency" element={<RoleRoute allowedRoles={['doctor']}><DoctorEmergency /></RoleRoute>} />
                    <Route path="/doctor/prescriptions" element={<RoleRoute allowedRoles={['doctor']}><DoctorPrescriptions /></RoleRoute>} />
                    <Route path="/doctor/leave-requests" element={<RoleRoute allowedRoles={['doctor']}><DoctorLeaveRequests /></RoleRoute>} />
                    <Route path="/doctor/profile" element={<RoleRoute allowedRoles={['doctor']}><DoctorProfile /></RoleRoute>} />

                    {/* Clinic Doctor routes */}
                    <Route path="/clinic/dashboard" element={<RoleRoute allowedRoles={['clinic_doctor']}><ClinicDashboard /></RoleRoute>} />
                    <Route path="/clinic/appointments" element={<RoleRoute allowedRoles={['clinic_doctor']}><ClinicAppointments /></RoleRoute>} />
                    <Route path="/clinic/schedule" element={<RoleRoute allowedRoles={['clinic_doctor']}><ClinicSchedule /></RoleRoute>} />
                    <Route path="/clinic/fees" element={<RoleRoute allowedRoles={['clinic_doctor']}><ClinicFees /></RoleRoute>} />
                    <Route path="/clinic/patients" element={<RoleRoute allowedRoles={['clinic_doctor']}><ClinicPatients /></RoleRoute>} />
                    <Route path="/clinic/prescriptions" element={<RoleRoute allowedRoles={['clinic_doctor']}><ClinicPrescriptions /></RoleRoute>} />
                    <Route path="/clinic/tests" element={<RoleRoute allowedRoles={['clinic_doctor']}><ClinicTests /></RoleRoute>} />
                    <Route path="/clinic/consultations" element={<RoleRoute allowedRoles={['clinic_doctor']}><ClinicConsultations /></RoleRoute>} />
                    <Route path="/clinic/management" element={<RoleRoute allowedRoles={['clinic_doctor']}><ClinicManagement /></RoleRoute>} />
                    <Route path="/clinic/billing" element={<RoleRoute allowedRoles={['clinic_doctor']}><ClinicBilling /></RoleRoute>} />
                    <Route path="/clinic/earnings" element={<RoleRoute allowedRoles={['clinic_doctor']}><ClinicEarnings /></RoleRoute>} />
                    <Route path="/clinic/reviews" element={<RoleRoute allowedRoles={['clinic_doctor']}><ClinicReviews /></RoleRoute>} />
                    <Route path="/clinic/settings" element={<RoleRoute allowedRoles={['clinic_doctor']}><AdminClinicSettings /></RoleRoute>} />
                    <Route path="/clinic/staff" element={<RoleRoute allowedRoles={['clinic_doctor']}><ClinicStaff /></RoleRoute>} />
                    <Route path="/clinic/notifications" element={<RoleRoute allowedRoles={['clinic_doctor']}><ClinicNotifications /></RoleRoute>} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppMotion>
            </LenisScroll>
          </HashRouter>
        </TooltipProvider>
        </CartProvider>
        </PreferredPharmacyProvider>
      </NotificationProvider>
    </ReduxAuthProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;// 0
