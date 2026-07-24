import 'maplibre-gl/dist/maplibre-gl.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Route, Routes, Navigate, Outlet } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
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
import { LenisScroll } from './components/LenisScroll';
import ErrorBoundary from './components/ErrorBoundary';

// Keep layouts that are always needed
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const OTPVerification = lazy(() => import('./pages/OTPVerification'));
const PendingApproval = lazy(() => import('./pages/PendingApproval'));
const DoctorSetup = lazy(() => import('./pages/DoctorSetup'));
const JoinPlatform = lazy(() => import('./pages/JoinPlatform'));
const NotFound = lazy(() => import('./pages/NotFound'));

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Doctors = lazy(() => import('./pages/Doctors'));
const Patients = lazy(() => import('./pages/Patients'));
const Appointments = lazy(() => import('./pages/Appointments'));
const MedicalRecords = lazy(() => import('./pages/MedicalRecords'));
const Billing = lazy(() => import('./pages/Billing'));
const Settings = lazy(() => import('./pages/Settings'));
const Notifications = lazy(() => import('./pages/Notifications'));

const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const HospitalDirectory = lazy(() => import('./pages/HospitalDirectory'));
const HospitalProfile = lazy(() => import('./pages/HospitalProfile'));
const HospitalDoctors = lazy(() => import('./pages/HospitalDoctors'));
const HospitalDoctor = lazy(() => import('./pages/HospitalDoctor'));
const ClinicDoctor = lazy(() => import('./pages/ClinicDoctor'));
const ClinicDetail = lazy(() => import('./pages/ClinicDetail'));
const HospitalTestBooking = lazy(() => import('./pages/HospitalTestBooking'));
const ClinicDoctors = lazy(() => import('./pages/ClinicDoctors'));
const DiagnosticCenters = lazy(() => import('./pages/DiagnosticCenters'));
const AllTests = lazy(() => import('./pages/AllTests'));
const DiagnosticCenterDetail = lazy(() => import('./pages/DiagnosticCenterDetail'));
const TechnicianDetail = lazy(() => import('./pages/TechnicianDetail'));
const ImagingCenterDetail = lazy(() => import('./pages/ImagingCenterDetail'));
const BuyMedicine = lazy(() => import('./pages/BuyMedicine'));
const MedicineStoreDetail = lazy(() => import('./pages/MedicineStoreDetail'));
const StoreMedicines = lazy(() => import('./pages/StoreMedicines'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const PaymentGateway = lazy(() => import('./pages/PaymentGateway'));

const DiagnosticDashboard = lazy(() => import('./pages/DiagnosticDashboard'));
const PDFReports = lazy(() => import('./pages/PDFReports'));
const ImportExport = lazy(() => import('./pages/ImportExport'));
const FileUpload = lazy(() => import('./pages/FileUpload'));
const Lab = lazy(() => import('./pages/Lab'));
const Pharmacy = lazy(() => import('./pages/Pharmacy'));
const IPD = lazy(() => import('./pages/IPD'));
const NursingCharts = lazy(() => import('./pages/NursingCharts'));
const TriagePage = lazy(() => import('./pages/TriagePage'));
const Radiology = lazy(() => import('./pages/Radiology'));
const Insurance = lazy(() => import('./pages/Insurance'));
const DietKitchen = lazy(() => import('./pages/DietKitchen'));
const OperationTheatre = lazy(() => import('./pages/OperationTheatre'));
const BloodBank = lazy(() => import('./pages/BloodBank'));
const Physiotherapy = lazy(() => import('./pages/Physiotherapy'));
const MentalHealth = lazy(() => import('./pages/MentalHealth'));
const Reports = lazy(() => import('./pages/Reports'));
const Staff = lazy(() => import('./pages/Staff'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Housekeeping = lazy(() => import('./pages/Housekeeping'));
const OPDRegistration = lazy(() => import('./pages/OPDRegistration'));
const OPDToken = lazy(() => import('./pages/OPDToken'));
const PatientRegistration = lazy(() => import('./pages/PatientRegistration'));
const DoctorConsultation = lazy(() => import('./pages/DoctorConsultation'));

const PatientDashboard = lazy(() => import('./pages/patient/PatientDashboard'));
const PatientAppointments = lazy(() => import('./pages/patient/PatientAppointments'));
const PatientRecords = lazy(() => import('./pages/patient/PatientRecords'));
const PatientReviews = lazy(() => import('./pages/patient/PatientReviews'));
const PatientBilling = lazy(() => import('./pages/patient/PatientBilling'));
const PatientPayment = lazy(() => import('./pages/patient/PatientPayment'));
const PatientReports = lazy(() => import('./pages/patient/PatientReports'));
const PatientServices = lazy(() => import('./pages/patient/PatientServices'));
const PatientEmergency = lazy(() => import('./pages/patient/PatientEmergency'));
const PatientBookings = lazy(() => import('./pages/patient/PatientBookings'));
const PatientPrescriptions = lazy(() => import('./pages/patient/PatientPrescriptions'));
const PatientMedicineOrders = lazy(() => import('./pages/patient/PatientMedicineOrders'));
const PatientSupport = lazy(() => import('./pages/patient/PatientSupport'));

const DoctorDashboard = lazy(() => import('./pages/doctor/DoctorDashboard'));
const DoctorAppointments = lazy(() => import('./pages/doctor/DoctorAppointments'));
const DoctorPatients = lazy(() => import('./pages/doctor/DoctorPatients'));
const DoctorConsultations = lazy(() => import('./pages/doctor/DoctorConsultations'));
const DoctorReviews = lazy(() => import('./pages/doctor/DoctorReviews'));
const DoctorTestResults = lazy(() => import('./pages/doctor/DoctorTestResults'));
const DoctorEarnings = lazy(() => import('./pages/doctor/DoctorEarnings'));
const DoctorSchedule = lazy(() => import('./pages/doctor/DoctorSchedule'));
const DoctorEmergency = lazy(() => import('./pages/doctor/DoctorEmergency'));
const DoctorPrescriptions = lazy(() => import('./pages/doctor/DoctorPrescriptions'));
const DoctorLeaveRequests = lazy(() => import('./pages/doctor/DoctorLeaveRequests'));
const DoctorProfile = lazy(() => import('./pages/doctor/DoctorProfile'));

const ClinicDashboard = lazy(() => import('./pages/clinic/ClinicDashboard'));
const ClinicAppointments = lazy(() => import('./pages/clinic/ClinicAppointments'));
const ClinicSchedule = lazy(() => import('./pages/clinic/ClinicSchedule'));
const ClinicFees = lazy(() => import('./pages/clinic/ClinicFees'));
const ClinicPatients = lazy(() => import('./pages/clinic/ClinicPatients'));
const ClinicPrescriptions = lazy(() => import('./pages/clinic/ClinicPrescriptions'));
const ClinicTests = lazy(() => import('./pages/clinic/ClinicTests'));
const ClinicConsultations = lazy(() => import('./pages/clinic/ClinicConsultations'));
const ClinicManagement = lazy(() => import('./pages/clinic/ClinicManagement'));
const ClinicBilling = lazy(() => import('./pages/clinic/ClinicBilling'));
const ClinicEarnings = lazy(() => import('./pages/clinic/ClinicEarnings'));
const ClinicReviews = lazy(() => import('./pages/clinic/ClinicReviews'));
const ClinicStaff = lazy(() => import('./pages/clinic/ClinicStaff'));
const ClinicNotifications = lazy(() => import('./pages/clinic/ClinicNotifications'));

const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminPrescriptionQueue = lazy(() => import('./pages/admin/AdminPrescriptionQueue'));
const AdminDoctors = lazy(() => import('./pages/admin/AdminDoctors'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminDepartments = lazy(() => import('./pages/admin/AdminDepartments'));
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews'));
const AdminEmergency = lazy(() => import('./pages/admin/AdminEmergency'));
const AdminBedManagement = lazy(() => import('./pages/admin/AdminBedManagement'));
const AdminTestCatalog = lazy(() => import('./pages/admin/AdminTestCatalog'));
const AdminHospitalSettings = lazy(() => import('./pages/admin/AdminHospitalSettings'));
const AdminClinicSettings = lazy(() => import('./pages/admin/AdminClinicSettings'));
const AdminLabSettings = lazy(() => import('./pages/admin/AdminLabSettings'));
const AdminPharmacySettings = lazy(() => import('./pages/admin/AdminPharmacySettings'));
const AdminAnnouncements = lazy(() => import('./pages/admin/AdminAnnouncements'));
const AdminLeaveRequests = lazy(() => import('./pages/admin/AdminLeaveRequests'));

const PharmacyBusinessLayout = lazy(() => import('./pages/pharmacy/PharmacyBusinessLayout'));
const PharmacyBusinessDashboard = lazy(() => import('./pages/pharmacy/PharmacyBusinessDashboard'));
const PharmacyInventory = lazy(() => import('./pages/pharmacy/PharmacyInventory'));
const PharmacyOrders = lazy(() => import('./pages/pharmacy/PharmacyOrders'));
const PharmacyStaff = lazy(() => import('./pages/pharmacy/PharmacyStaff'));
const PharmacyOffers = lazy(() => import('./pages/pharmacy/PharmacyOffers'));
const PharmacyReturns = lazy(() => import('./pages/pharmacy/PharmacyReturns'));
const PharmacyPrescriptionQueue = lazy(() => import('./pages/pharmacy/PharmacyPrescriptionQueue'));
const PharmacyAnalytics = lazy(() => import('./pages/pharmacy/PharmacyAnalytics'));
const PharmacyReviews = lazy(() => import('./pages/pharmacy/PharmacyReviews'));
const PharmacyDelivery = lazy(() => import('./pages/pharmacy/PharmacyDelivery'));

const LabBusinessLayout = lazy(() => import('./pages/labcenter/LabBusinessLayout'));
const LabCenterDashboard = lazy(() => import('./pages/labcenter/LabCenterDashboard'));
const LabAppointments = lazy(() => import('./pages/labcenter/LabAppointments'));
const LabBilling = lazy(() => import('./pages/labcenter/LabBilling'));
const LabBookingManagement = lazy(() => import('./pages/labcenter/LabBookingManagement'));
const LabEquipment = lazy(() => import('./pages/labcenter/LabEquipment'));
const LabPackages = lazy(() => import('./pages/labcenter/LabPackages'));
const LabPrescriptionQueue = lazy(() => import('./pages/labcenter/LabPrescriptionQueue'));
const LabReports = lazy(() => import('./pages/labcenter/LabReports'));
const LabReportsAnalytics = lazy(() => import('./pages/labcenter/LabReportsAnalytics'));
const LabReviews = lazy(() => import('./pages/labcenter/LabReviews'));
const LabSampleCollection = lazy(() => import('./pages/labcenter/LabSampleCollection'));
const LabStaff = lazy(() => import('./pages/labcenter/LabStaff'));
const LabTestCatalog = lazy(() => import('./pages/labcenter/LabTestCatalog'));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

const loadingFallback = (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

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
          <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <LenisScroll>
              <AppMotion>
                <Suspense fallback={loadingFallback}>
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
                     <Route path="/labs" element={<Navigate to="/diagnostic-centers" replace />} />
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
                    <Route path="/opd-registration" element={<RoleRoute allowedRoles={['admin', 'doctor', 'nurse']}><OPDRegistration /></RoleRoute>} />
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
              </Suspense>
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

export default App;
