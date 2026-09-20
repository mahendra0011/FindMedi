import 'maplibre-gl/dist/maplibre-gl.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Route, Routes, Navigate, Outlet } from 'react-router-dom';
import { useEffect, useRef, lazy, Suspense } from 'react';
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
import { AudioCallProvider } from '@/context/AudioCallContext';
import AudioCallOverlay from '@/components/calls/AudioCallOverlay';
import IncomingCallDialog from '@/components/calls/IncomingCallDialog';
import AudioCallMinimized from '@/components/calls/AudioCallMinimized';
import { VideoCallProvider } from '@/context/VideoCallContext';
import VideoCallOverlay from '@/components/videocalls/VideoCallOverlay';
import IncomingVideoCallDialog from '@/components/videocalls/IncomingVideoCallDialog';
import VideoCallMinimized from '@/components/videocalls/VideoCallMinimized';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from './components/DashboardLayout';
import PublicLayout from './components/PublicLayout';
import HealthIdView from './pages/public/HealthIdView';
import AppMotion from './components/AppMotion';
import { LenisScroll } from './components/LenisScroll';
import ErrorBoundary from './components/ErrorBoundary';
import { useProactiveTokenRefresh } from '@/lib/useProactiveTokenRefresh';
import EmergencyFlowController from '@/components/emergency/EmergencyFlowController';
import ReminderAlarmHost from '@/components/patient/ReminderAlarmHost';

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
const VerifyTransaction = lazy(() => import('./pages/VerifyTransaction'));
const Settings = lazy(() => import('./pages/Settings'));
const Notifications = lazy(() => import('./pages/Notifications'));

const SAPlatformKPIs = lazy(() => import('./pages/superadmin/PlatformKPIs'));
const SAPendingApprovals = lazy(() => import('./pages/superadmin/PendingApprovals'));
const SAAllFacilities = lazy(() => import('./pages/superadmin/AllFacilities'));
const SAPlatformStats = lazy(() => import('./pages/superadmin/PlatformStats'));
const SAUserManagement = lazy(() => import('./pages/superadmin/UserManagement'));
const SAContentModeration = lazy(() => import('./pages/superadmin/ContentModeration'));
const SADisputes = lazy(() => import('./pages/superadmin/Disputes'));
const SARevenue = lazy(() => import('./pages/superadmin/Revenue'));
const SALicenses = lazy(() => import('./pages/superadmin/Licenses'));
const SACategories = lazy(() => import('./pages/superadmin/Categories'));
const SAGlobalCatalog = lazy(() => import('./pages/superadmin/GlobalCatalog'));
const SAAuditLogs = lazy(() => import('./pages/superadmin/AuditLogs'));
const SABroadcast = lazy(() => import('./pages/superadmin/Broadcast'));
const SASupportTickets = lazy(() => import('./pages/superadmin/SupportTickets'));
const SASystemSettings = lazy(() => import('./pages/superadmin/SystemSettings'));
const SASuperAdminTeam = lazy(() => import('./pages/superadmin/SuperAdminTeam'));
const SAPromotions = lazy(() => import('./pages/superadmin/Promotions'));
const SADataExport = lazy(() => import('./pages/superadmin/DataExport'));
const SACities = lazy(() => import('./pages/superadmin/Cities'));
const SALegal = lazy(() => import('./pages/superadmin/Legal'));
const SAIntegrations = lazy(() => import('./pages/superadmin/Integrations'));
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

const FindVehicle = lazy(() => import('./pages/FindVehicle'));
const PatientRides = lazy(() => import('./pages/patient/PatientRides'));
const RiderDashboard = lazy(() => import('./pages/rider/RiderDashboard'));
const AmbulanceDashboard = lazy(() => import('./pages/ambulance/AmbulanceDashboard'));
const AmbulanceSetup = lazy(() => import('./pages/ambulance/AmbulanceSetup'));
const AmbulanceJobs = lazy(() => import('./pages/ambulance/AmbulanceJobs'));
const AdminVehicleRides = lazy(() => import('./pages/admin/AdminVehicleRides'));

const BookAssistant = lazy(() => import('./pages/BookAssistant'));
const AssistantProfile = lazy(() => import('./pages/AssistantProfile'));
const PatientAssistants = lazy(() => import('./pages/patient/PatientAssistants'));
const AssistantDashboard = lazy(() => import('./pages/assistant/AssistantDashboard'));
const AdminAssistants = lazy(() => import('./pages/admin/AdminAssistants'));

const FindLawyer = lazy(() => import('./pages/FindLawyer'));
const LawyerProfile = lazy(() => import('./pages/LawyerProfile'));
const PatientLawyers = lazy(() => import('./pages/patient/PatientLawyers'));
const LawyerDashboard = lazy(() => import('./pages/lawyer/LawyerDashboard'));
const AdminLawyers = lazy(() => import('./pages/admin/AdminLawyers'));

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
const PatientHistory = lazy(() => import('./pages/patient/PatientHistory'));
const PatientBookingHistory = lazy(() => import('./pages/patient/PatientBookingHistory'));
const PatientFamily = lazy(() => import('./pages/patient/PatientFamily'));
const PatientRefunds = lazy(() => import('./pages/patient/PatientRefunds'));
const PatientSettings = lazy(() => import('./pages/patient/PatientSettings'));
const PatientReports = lazy(() => import('./pages/patient/PatientReports'));
const PatientServices = lazy(() => import('./pages/patient/PatientServices'));
const PatientBookings = lazy(() => import('./pages/patient/PatientBookings'));
const PatientPrescriptions = lazy(() => import('./pages/patient/PatientPrescriptions'));
const PatientMedicineOrders = lazy(() => import('./pages/patient/PatientMedicineOrders'));
const PatientSupport = lazy(() => import('./pages/patient/PatientSupport'));
const PatientFavorites = lazy(() => import('./pages/patient/PatientFavorites'));
const PatientWriteReview = lazy(() => import('./pages/patient/PatientWriteReview'));
const PatientAddresses = lazy(() => import('./pages/patient/PatientAddresses'));
const PatientPayment = lazy(() => import('./pages/patient/PatientPayment'));
const PatientPreferred = lazy(() => import('./pages/patient/PatientPreferred'));
const PatientProfile = lazy(() => import('./pages/patient/PatientProfile'));
const PatientMedicineReminders = lazy(() => import('./pages/patient/PatientMedicineReminders'));
const PatientVitals = lazy(() => import('./pages/patient/PatientVitals'));
const PatientCarePlan = lazy(() => import('./pages/patient/PatientCarePlan'));
const PatientRewards = lazy(() => import('./pages/patient/PatientRewards'));
const PatientReferral = lazy(() => import('./pages/patient/PatientReferral'));
const PatientHealthId = lazy(() => import('./pages/patient/PatientHealthId'));
const SALoyaltyRewards = lazy(() => import('./pages/superadmin/LoyaltyRewards'));
const SAReferralSettings = lazy(() => import('./pages/superadmin/ReferralSettings'));

const DoctorDashboard = lazy(() => import('./pages/doctor/DoctorDashboard'));
const DoctorAppointments = lazy(() => import('./pages/doctor/DoctorAppointments'));
const DoctorPatients = lazy(() => import('./pages/doctor/DoctorPatients'));
const DoctorConsultations = lazy(() => import('./pages/doctor/DoctorConsultations'));
const DoctorReviews = lazy(() => import('./pages/doctor/DoctorReviews'));
const DoctorTestResults = lazy(() => import('./pages/doctor/DoctorTestResults'));
const DoctorEarnings = lazy(() => import('./pages/doctor/DoctorEarnings'));
const DoctorSchedule = lazy(() => import('./pages/doctor/DoctorSchedule'));
const DoctorScheduleEdit = lazy(() => import('./pages/doctor/DoctorScheduleEdit'));
const DoctorEmergency = lazy(() => import('./pages/doctor/DoctorEmergency'));
const DoctorPrescriptions = lazy(() => import('./pages/doctor/DoctorPrescriptions'));
const DoctorLeaveRequests = lazy(() => import('./pages/doctor/DoctorLeaveRequests'));
const DoctorProfile = lazy(() => import('./pages/doctor/DoctorProfile'));
const DoctorOnlineAppointments = lazy(() => import('./pages/doctor/DoctorOnlineAppointments'));
const DoctorCalls = lazy(() => import('./pages/doctor/DoctorCalls'));
const DoctorVideoCalls = lazy(() => import('./pages/doctor/DoctorVideoCalls'));
const DoctorInPersonAppointments = lazy(() => import('./pages/doctor/DoctorInPersonAppointments'));
const DoctorCallRoom = lazy(() => import('./pages/doctor/DoctorCallRoom'));
const DoctorVideoCallRoom = lazy(() => import('./pages/doctor/DoctorVideoCallRoom'));
const PatientInPersonVisits = lazy(() => import('./pages/patient/PatientInPersonVisits'));

const AIChatPage = lazy(() => import('./pages/AIChatPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));

const ClinicDashboard = lazy(() => import('./pages/clinic/ClinicDashboard'));
const ClinicAppointments = lazy(() => import('./pages/clinic/ClinicAppointments'));
const ClinicSchedule = lazy(() => import('./pages/clinic/ClinicSchedule'));
const ClinicFees = lazy(() => import('./pages/clinic/ClinicFees'));
const ClinicPatients = lazy(() => import('./pages/clinic/ClinicPatients'));
const ClinicPrescriptions = lazy(() => import('./pages/clinic/ClinicPrescriptions'));
const ClinicTests = lazy(() => import('./pages/clinic/ClinicTests'));
const ClinicTestRequests = lazy(() => import('./pages/clinic/ClinicTestRequests'));
const ClinicConsultations = lazy(() => import('./pages/clinic/ClinicConsultations'));
const ClinicManagement = lazy(() => import('./pages/clinic/ClinicManagement'));
const ClinicBilling = lazy(() => import('./pages/clinic/ClinicBilling'));
const ClinicPaymentHistory = lazy(() => import('./pages/clinic/ClinicPaymentHistory'));
const ClinicEarnings = lazy(() => import('./pages/clinic/ClinicEarnings'));
const ClinicAnalytics = lazy(() => import('./pages/clinic/ClinicAnalytics'));
const ClinicReviews = lazy(() => import('./pages/clinic/ClinicReviews'));
const ClinicStaff = lazy(() => import('./pages/clinic/ClinicStaff'));
const ClinicNotifications = lazy(() => import('./pages/clinic/ClinicNotifications'));
const ClinicPlatformSettings = lazy(() => import('./pages/clinic/ClinicPlatformSettings'));

const DeliveryDashboard = lazy(() => import('./pages/delivery/DeliveryDashboard'));
const DeliveryOrders = lazy(() => import('./pages/delivery/DeliveryOrders'));
const DeliveryHistory = lazy(() => import('./pages/delivery/DeliveryHistory'));
const DeliveryEarnings = lazy(() => import('./pages/delivery/DeliveryEarnings'));
const DeliveryZone = lazy(() => import('./pages/delivery/DeliveryZone'));
const DeliveryReviews = lazy(() => import('./pages/delivery/DeliveryReviews'));
const DeliveryDocuments = lazy(() => import('./pages/delivery/DeliveryDocuments'));
const DeliverySettings = lazy(() => import('./pages/delivery/DeliverySettings'));
const DeliveryPartnerRegister = lazy(() => import('./pages/register/DeliveryPartnerRegister'));
const SuperAdminDeliveryPartners = lazy(() => import('./pages/superadmin/DeliveryPartners'));

const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminPrescriptionQueue = lazy(() => import('./pages/admin/AdminPrescriptionQueue'));
const AdminPrescriptionVerificationQueue = lazy(() => import('./pages/admin/AdminPrescriptionVerificationQueue'));
const AdminDoctors = lazy(() => import('./pages/admin/AdminDoctors'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminDepartments = lazy(() => import('./pages/admin/AdminDepartments'));
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews'));
const AdminEmergency = lazy(() => import('./pages/admin/AdminEmergency'));
const ManageAmbulancesPage = lazy(() => import('./pages/hospital/ManageAmbulancesPage'));
const AdminBedManagement = lazy(() => import('./pages/admin/AdminBedManagement'));
const AdminTestCatalog = lazy(() => import('./pages/admin/AdminTestCatalog'));
const AdminHospitalSettings = lazy(() => import('./pages/admin/AdminHospitalSettings'));
const AdminClinicSettings = lazy(() => import('./pages/admin/AdminClinicSettings'));
const AdminLabSettings = lazy(() => import('./pages/admin/AdminLabSettings'));
const AdminPharmacySettings = lazy(() => import('./pages/admin/AdminPharmacySettings'));
const AdminAnnouncements = lazy(() => import('./pages/admin/AdminAnnouncements'));
const AdminScheduleManage = lazy(() => import('./pages/admin/AdminScheduleManage'));
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
function AuthInitializer({ children }: { children?: React.ReactNode }) {
  const dispatch = useDispatch();
  useEffect(() => {
    (dispatch as any)(initializeAuth());
  }, [dispatch]);
  // Proactive silent token refresh — access token (15m) expire hone se pehle
  // background me refresh karta hai. Iske bina code change / HMR reload ke waqt
  // expired access token → 401 → refresh → agar koi hiccup to logout ho jata tha.
  // Yeh real-world me "logout na hona" ki guarantee deta hai.
  useProactiveTokenRefresh();
  return <>{children}</>;
}

function SettingsInitializer() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const reduxSettings = useSelector((state: any) => state.settings);

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
  // logout() ek baar hi chalna chahiye. AuthContext me logout stable reference
  // nahi hai (har render pe naya function), isliye [logout] dep effect ko
  // dobara chala sakta hai. Ref guard lagate hain taaki StrictMode double-invoke
  // aur re-renders se double logout (double /auth/logout call) na ho.
  const didLogoutRef = useRef(false);

  useEffect(() => {
    if (didLogoutRef.current) return;
    didLogoutRef.current = true;
    logout();
  }, [logout]);

  return <Navigate to="/login" replace />;
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
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
  if (user.role === 'rider' && user.approvalStatus !== 'approved') {
    return <Navigate to={`/pending-approval?email=${encodeURIComponent(user.email)}&status=${user.approvalStatus === 'rejected' ? 'rejected' : 'pending'}`} replace />;
  }
  if (user.role === 'assistant' && user.approvalStatus !== 'approved') {
    return <Navigate to={`/pending-approval?email=${encodeURIComponent(user.email)}&status=${user.approvalStatus === 'rejected' ? 'rejected' : 'pending'}`} replace />;
  }
  if (user.role === 'lawyer' && user.approvalStatus !== 'approved') {
    return <Navigate to={`/pending-approval?email=${encodeURIComponent(user.email)}&status=${user.approvalStatus === 'rejected' ? 'rejected' : 'pending'}`} replace />;
  }
  if (user.role === 'delivery_boy' && user.approvalStatus !== 'approved') {
    return <Navigate to="/delivery/documents" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
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

function RoleRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user } = useAuth();
  if (allowedRoles && !allowedRoles.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function getDefaultDashboardPath(user) {
  const value = user?.settings?.defaultDashboard || 'overview';
  if (value === 'overview') return '';

  const paths = {
    hospital_admin: {
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
    superadmin: {
      overview: '/superadmin/overview',
      pending: '/superadmin/pending',
      revenue: '/superadmin/revenue',
      users: '/superadmin/users',
      settings: '/superadmin/settings',
    },
    patient: {
      appointments: '/patient/appointments',
      records: '/patient/records',
      history: '/patient/history',
      bookingHistory: '/patient/booking-history',
    },
    lawyer: {
      requests: '/lawyer/requests',
      cases: '/lawyer/cases',
      active: '/lawyer/active',
      history: '/lawyer/history',
      earnings: '/lawyer/earnings',
      profile: '/lawyer/profile',
    },
  };

  return paths[user?.role]?.[value] || '';
}

function RoleDashboard() {
  const { user } = useAuth();
  const defaultPath = getDefaultDashboardPath(user);
  if (defaultPath) return <Navigate to={defaultPath} replace />;
  if (user?.role === 'superadmin') return <Navigate to="/superadmin/overview" replace />;
  if (user?.role === 'doctor') return <DoctorDashboard />;
  if (user?.role === 'clinic_doctor') return <ClinicDashboard />;
  if (user?.role === 'hospital_admin') return <Dashboard />;
  if (user?.role === 'delivery_boy') return <DeliveryDashboard />;
  if (user?.role === 'rider') return <Navigate to="/rider/dashboard" replace />;
  if (user?.role === 'ambulance') return <Navigate to="/ambulance/dashboard" replace />;
  if (user?.role === 'assistant') return <Navigate to="/assistant/dashboard" replace />;
  if (user?.role === 'lawyer') return <Navigate to="/lawyer/dashboard" replace />;
  if (user?.role === 'lab_owner') return <Navigate to="/lab-business/dashboard" replace />;
  if (user?.role === 'pharmacy_owner') return <Navigate to="/pharmacy-business/dashboard" replace />;
  return <PatientDashboard />;
}

// Wrapper that uses Redux for auth instead of context
function ReduxAuthProvider({ children }: { children?: React.ReactNode }) {
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
        <AudioCallProvider>
        <VideoCallProvider>
          <AudioCallOverlay />
          <IncomingCallDialog />
          <AudioCallMinimized />
          <VideoCallOverlay />
          <IncomingVideoCallDialog />
          <VideoCallMinimized />
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <EmergencyFlowController />
            <ReminderAlarmHost />
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
                  <Route path="/ambulance-setup" element={<AmbulanceSetup />} />
<Route path="/hospitals" element={<PublicLayout><HospitalDirectory /></PublicLayout>} />
                   <Route path="/hospitals/:id" element={<PublicLayout><HospitalProfile /></PublicLayout>} />
<Route path="/hospitals/:hospitalId/doctors" element={<PublicLayout><HospitalDoctors /></PublicLayout>} />
                      <Route path="/clinic-doctors" element={<PublicLayout><ClinicDoctors /></PublicLayout>} />
                      <Route path="/hospital-doctors/:id" element={<PublicLayout><HospitalDoctor /></PublicLayout>} />
                     <Route path="/clinic-doctors/:id" element={<PublicLayout><ClinicDoctor /></PublicLayout>} />
                     <Route path="/clinic/:clinicId" element={<PublicLayout><ClinicDetail /></PublicLayout>} />
<Route path="/book-test/:entityId" element={<PublicLayout><HospitalTestBooking /></PublicLayout>} />
                      <Route path="/diagnostic-centers" element={<PublicLayout><DiagnosticCenters /></PublicLayout>} />
                      <Route path="/all-tests" element={<PublicLayout><AllTests /></PublicLayout>} />
                       <Route path="/lab/:clinicId" element={<PublicLayout><DiagnosticCenterDetail /></PublicLayout>} />
                        <Route path="/technician/:id" element={<PublicLayout><TechnicianDetail /></PublicLayout>} />

                      <Route path="/imaging/:clinicId" element={<PublicLayout><ImagingCenterDetail /></PublicLayout>} />
                    <Route path="/buy-medicine" element={<PublicLayout><BuyMedicine /></PublicLayout>} />
                   <Route path="/buy-medicine/:storeId/medicines" element={<PublicLayout><StoreMedicines /></PublicLayout>} />
                   <Route path="/buy-medicine/:storeId" element={<PublicLayout><MedicineStoreDetail /></PublicLayout>} />
                   <Route path="/cart" element={<PublicLayout><Cart /></PublicLayout>} />
                   <Route path="/checkout" element={<PublicLayout><Checkout /></PublicLayout>} />
                   <Route path="/order-confirmation" element={<PublicLayout><OrderConfirmation /></PublicLayout>} />
                    <Route path="/order-tracking/:orderId" element={<PublicLayout><OrderTracking /></PublicLayout>} />
                    <Route path="/payment-gateway" element={<PublicLayout><PaymentGateway /></PublicLayout>} />
                    <Route path="/find-vehicle" element={<PublicLayout><FindVehicle /></PublicLayout>} />
                    <Route path="/rides" element={<Navigate to="/patient/rides" replace />} />
                    <Route path="/my-rides" element={<Navigate to="/patient/rides" replace />} />
                    <Route path="/book-assistant" element={<PublicLayout><BookAssistant /></PublicLayout>} />
                    <Route path="/find-assistant" element={<Navigate to="/book-assistant" replace />} />
                    <Route path="/assistants" element={<Navigate to="/book-assistant" replace />} />
                    <Route path="/assistants/:id" element={<PublicLayout><AssistantProfile /></PublicLayout>} />
                    <Route path="/find-lawyer" element={<PublicLayout><FindLawyer /></PublicLayout>} />
<Route path="/lawyers/:id" element={<PublicLayout><LawyerProfile /></PublicLayout>} />
                    <Route path="/book-lawyer" element={<Navigate to="/find-lawyer" replace />} />
                    <Route path="/lawyers" element={<Navigate to="/find-lawyer" replace />} />

                    {/* Health ID - public QR scan (no login required) */}
                    <Route path="/health-id/:token" element={<PublicLayout><HealthIdView /></PublicLayout>} />

                    {/* Public aliases & legacy redirects */}
                    <Route path="/register-hospital" element={<Navigate to="/join-platform" replace />} />
                    <Route path="/register-facility" element={<Navigate to="/join-platform" replace />} />
                    <Route path="/labs" element={<Navigate to="/diagnostic-centers" replace />} />
                    <Route path="/lab/:clinicId/details" element={<PublicLayout><DiagnosticCenterDetail /></PublicLayout>} />
                    <Route path="/diagnostic-center/:clinicId" element={<PublicLayout><DiagnosticCenterDetail /></PublicLayout>} />
                    <Route path="/diagnostic-center/:clinicId/details" element={<PublicLayout><DiagnosticCenterDetail /></PublicLayout>} />
                    <Route path="/test-booking" element={<PublicLayout><HospitalTestBooking /></PublicLayout>} />
                    <Route path="/test-booking/:hospitalId" element={<PublicLayout><HospitalTestBooking /></PublicLayout>} />
                    <Route path="/hospital-tests/:hospitalId" element={<PublicLayout><HospitalTestBooking /></PublicLayout>} />
                    <Route path="/book-test" element={<PublicLayout><AllTests /></PublicLayout>} />
                    <Route path="/imaging" element={<Navigate to="/diagnostic-centers" replace />} />
                    <Route path="/imaging/:clinicId/details" element={<PublicLayout><ImagingCenterDetail /></PublicLayout>} />
                    <Route path="/clinic" element={<PublicLayout><ClinicDoctors /></PublicLayout>} />
                    <Route path="/hospital-doctors" element={<PublicLayout><HospitalDoctors /></PublicLayout>} />
                    <Route path="/doctors/:id" element={<PublicLayout><HospitalDoctor /></PublicLayout>} />
                    <Route path="/telemedicine" element={<PublicLayout><DoctorConsultation /></PublicLayout>} />

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
                    <Route path="/ai-chat" element={<AIChatPage />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/upload" element={<FileUpload />} />

                    {/* Super Admin routes */}
                    <Route path="/superadmin" element={<Navigate to="/superadmin/overview" replace />} />
                    <Route path="/superadmin/overview" element={<RoleRoute allowedRoles={['superadmin']}><SAPlatformKPIs /></RoleRoute>} />
                    <Route path="/superadmin/pending" element={<RoleRoute allowedRoles={['superadmin']}><SAPendingApprovals /></RoleRoute>} />
                    <Route path="/superadmin/facilities" element={<RoleRoute allowedRoles={['superadmin']}><SAAllFacilities /></RoleRoute>} />
                    <Route path="/superadmin/stats" element={<RoleRoute allowedRoles={['superadmin']}><SAPlatformStats /></RoleRoute>} />
                    <Route path="/superadmin/users" element={<RoleRoute allowedRoles={['superadmin']}><SAUserManagement /></RoleRoute>} />
                    <Route path="/superadmin/moderation" element={<RoleRoute allowedRoles={['superadmin']}><SAContentModeration /></RoleRoute>} />
                    <Route path="/superadmin/disputes" element={<RoleRoute allowedRoles={['superadmin']}><SADisputes /></RoleRoute>} />
                    <Route path="/superadmin/revenue" element={<RoleRoute allowedRoles={['superadmin']}><SARevenue /></RoleRoute>} />
                    <Route path="/superadmin/licenses" element={<RoleRoute allowedRoles={['superadmin']}><SALicenses /></RoleRoute>} />
                    <Route path="/superadmin/categories" element={<RoleRoute allowedRoles={['superadmin']}><SACategories /></RoleRoute>} />
                    <Route path="/superadmin/catalog" element={<RoleRoute allowedRoles={['superadmin']}><SAGlobalCatalog /></RoleRoute>} />
                    <Route path="/superadmin/audit" element={<RoleRoute allowedRoles={['superadmin']}><SAAuditLogs /></RoleRoute>} />
                    <Route path="/audit-logs" element={<ProtectedRoute><SAAuditLogs /></ProtectedRoute>} />
                    <Route path="/superadmin/broadcast" element={<RoleRoute allowedRoles={['superadmin']}><SABroadcast /></RoleRoute>} />
                    <Route path="/superadmin/tickets" element={<RoleRoute allowedRoles={['superadmin']}><SASupportTickets /></RoleRoute>} />
                    <Route path="/superadmin/settings" element={<RoleRoute allowedRoles={['superadmin']}><SASystemSettings /></RoleRoute>} />
                    <Route path="/superadmin/team" element={<RoleRoute allowedRoles={['superadmin']}><SASuperAdminTeam /></RoleRoute>} />
                    <Route path="/superadmin/promotions" element={<RoleRoute allowedRoles={['superadmin']}><SAPromotions /></RoleRoute>} />
                    <Route path="/superadmin/loyalty" element={<RoleRoute allowedRoles={['superadmin']}><SALoyaltyRewards /></RoleRoute>} />
                    <Route path="/superadmin/referrals" element={<RoleRoute allowedRoles={['superadmin']}><SAReferralSettings /></RoleRoute>} />
                    <Route path="/superadmin/export" element={<RoleRoute allowedRoles={['superadmin']}><SADataExport /></RoleRoute>} />
                    <Route path="/superadmin/cities" element={<RoleRoute allowedRoles={['superadmin']}><SACities /></RoleRoute>} />
                    <Route path="/superadmin/legal" element={<RoleRoute allowedRoles={['superadmin']}><SALegal /></RoleRoute>} />
                    <Route path="/superadmin/integrations" element={<RoleRoute allowedRoles={['superadmin']}><SAIntegrations /></RoleRoute>} />

                    {/* Admin routes */}
                    <Route path="/admin/users" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin']}><AdminUsers /></RoleRoute>} />
                    <Route path="/admin/doctors" element={<RoleRoute allowedRoles={['hospital_admin']}><AdminDoctors /></RoleRoute>} />
                    <Route path="/admin/prescriptions" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin']}><AdminPrescriptionQueue /></RoleRoute>} />
                    <Route path="/admin/prescription-verification" element={<RoleRoute allowedRoles={['hospital_admin']}><AdminPrescriptionVerificationQueue /></RoleRoute>} />
                    <Route path="/admin/analytics" element={<RoleRoute allowedRoles={['hospital_admin']}><AdminAnalytics /></RoleRoute>} />
                    <Route path="/admin/departments" element={<RoleRoute allowedRoles={['hospital_admin']}><AdminDepartments /></RoleRoute>} />
                    <Route path="/admin/emergency" element={<RoleRoute allowedRoles={['hospital_admin']}><AdminEmergency /></RoleRoute>} />
                    <Route path="/admin/ambulances" element={<RoleRoute allowedRoles={['hospital_admin']}><ManageAmbulancesPage /></RoleRoute>} />
                    <Route path="/admin/reviews" element={<RoleRoute allowedRoles={['hospital_admin']}><AdminReviews /></RoleRoute>} />
                    <Route path="/admin/beds" element={<RoleRoute allowedRoles={['hospital_admin']}><AdminBedManagement /></RoleRoute>} />
                    <Route path="/admin/test-catalog" element={<RoleRoute allowedRoles={['hospital_admin']}><AdminTestCatalog /></RoleRoute>} />
                    <Route path="/admin/hospital-settings" element={<RoleRoute allowedRoles={['hospital_admin']}><AdminHospitalSettings /></RoleRoute>} />
                    <Route path="/admin/clinic-settings" element={<RoleRoute allowedRoles={['hospital_admin', 'clinic_doctor']}><AdminClinicSettings /></RoleRoute>} />
                    <Route path="/admin/lab-settings" element={<RoleRoute allowedRoles={['hospital_admin', 'lab_owner']}><AdminLabSettings /></RoleRoute>} />
                    <Route path="/admin/pharmacy-settings" element={<RoleRoute allowedRoles={['hospital_admin', 'pharmacy_owner']}><AdminPharmacySettings /></RoleRoute>} />
                    <Route path="/admin/announcements" element={<RoleRoute allowedRoles={['hospital_admin']}><AdminAnnouncements /></RoleRoute>} />
                    <Route path="/admin/vehicle-rides" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin']}><AdminVehicleRides /></RoleRoute>} />
                    <Route path="/superadmin/vehicle-rides" element={<Navigate to="/admin/vehicle-rides" replace />} />
                    <Route path="/admin/assistants" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin']}><AdminAssistants /></RoleRoute>} />
                    <Route path="/superadmin/assistants" element={<Navigate to="/admin/assistants" replace />} />
                    <Route path="/admin/lawyers" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin']}><AdminLawyers /></RoleRoute>} />
                    <Route path="/superadmin/lawyers" element={<Navigate to="/admin/lawyers" replace />} />
                    <Route path="/admin/leave-requests" element={<RoleRoute allowedRoles={['hospital_admin']}><AdminLeaveRequests /></RoleRoute>} />
                    <Route path="/admin/schedule-manage" element={<RoleRoute allowedRoles={['hospital_admin']}><AdminScheduleManage /></RoleRoute>} />
                    <Route path="/admin/diagnostic" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'lab_receptionist', 'lab_technician', 'pathologist']}><DiagnosticDashboard /></RoleRoute>} />
                    <Route path="/doctors" element={<RoleRoute allowedRoles={['hospital_admin']}><Doctors /></RoleRoute>} />
                    <Route path="/patients" element={<RoleRoute allowedRoles={['hospital_admin']}><Patients /></RoleRoute>} />
                    <Route path="/appointments" element={<RoleRoute allowedRoles={['hospital_admin']}><Appointments /></RoleRoute>} />
                    <Route path="/records" element={<RoleRoute allowedRoles={['hospital_admin']}><MedicalRecords /></RoleRoute>} />
                    <Route path="/billing" element={<RoleRoute allowedRoles={['hospital_admin']}><Billing /></RoleRoute>} />
                    <Route path="/verify-transaction" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'doctor', 'clinic_doctor', 'lab_owner', 'pharmacy_owner', 'patient']}><VerifyTransaction /></RoleRoute>} />
                    <Route path="/reports" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor']}><PDFReports /></RoleRoute>} />
                    <Route path="/import-export" element={<RoleRoute allowedRoles={['hospital_admin']}><ImportExport /></RoleRoute>} />
                    <Route path="/lab" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'lab_receptionist', 'lab_technician', 'pathologist']}><Lab /></RoleRoute>} />
                    <Route path="/pharmacy" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'pharmacist']}><Pharmacy /></RoleRoute>} />
                    <Route path="/ipd" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse']}><IPD /></RoleRoute>} />
                    <Route path="/triage" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse']}><TriagePage /></RoleRoute>} />
                    <Route path="/nursing" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse']}><NursingCharts /></RoleRoute>} />
                    <Route path="/radiology" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'radiologist']}><Radiology /></RoleRoute>} />
                    <Route path="/insurance" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'patient']}><Insurance /></RoleRoute>} />
                    <Route path="/diet" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse']}><DietKitchen /></RoleRoute>} />
                    <Route path="/ot" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor']}><OperationTheatre /></RoleRoute>} />
                    <Route path="/bloodbank" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse']}><BloodBank /></RoleRoute>} />
                    <Route path="/physio" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse']}><Physiotherapy /></RoleRoute>} />
                    <Route path="/mentalhealth" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse']}><MentalHealth /></RoleRoute>} />
                    <Route path="/analytics-reports" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor']}><Reports /></RoleRoute>} />
                    <Route path="/staff" element={<RoleRoute allowedRoles={['hospital_admin']}><Staff /></RoleRoute>} />
                    <Route path="/inventory" element={<RoleRoute allowedRoles={['hospital_admin']}><Inventory /></RoleRoute>} />
                    <Route path="/housekeeping" element={<RoleRoute allowedRoles={['hospital_admin']}><Housekeeping /></RoleRoute>} />
                    <Route path="/opd-token" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse']}><OPDToken /></RoleRoute>} />
                    <Route path="/opd-registration" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse']}><OPDRegistration /></RoleRoute>} />
                    <Route path="/patient-registration" element={<RoleRoute allowedRoles={['hospital_admin', 'nurse']}><PatientRegistration /></RoleRoute>} />
                    <Route path="/doctor-consultation" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse']}><DoctorConsultation /></RoleRoute>} />

                    {/* Patient routes */}
                    <Route path="/patient/appointments" element={<RoleRoute allowedRoles={['patient']}><PatientAppointments /></RoleRoute>} />
                    <Route path="/patient/records" element={<RoleRoute allowedRoles={['patient']}><PatientRecords /></RoleRoute>} />
                    <Route path="/patient/reports" element={<RoleRoute allowedRoles={['patient']}><PatientReports /></RoleRoute>} />
                    <Route path="/patient/reviews" element={<RoleRoute allowedRoles={['patient']}><PatientReviews /></RoleRoute>} />
                    <Route path="/patient/reviews/write" element={<RoleRoute allowedRoles={['patient']}><PatientWriteReview /></RoleRoute>} />
                    <Route path="/patient/history" element={<RoleRoute allowedRoles={['patient']}><PatientHistory /></RoleRoute>} />
                    <Route path="/patient/booking-history" element={<RoleRoute allowedRoles={['patient']}><PatientBookingHistory /></RoleRoute>} />
                    <Route path="/patient/family" element={<RoleRoute allowedRoles={['patient']}><PatientFamily /></RoleRoute>} />
                    <Route path="/patient/refunds" element={<RoleRoute allowedRoles={['patient']}><PatientRefunds /></RoleRoute>} />
                    <Route path="/patient/settings" element={<RoleRoute allowedRoles={['patient']}><PatientSettings /></RoleRoute>} />
                    <Route path="/patient/prescriptions" element={<RoleRoute allowedRoles={['patient']}><PatientPrescriptions /></RoleRoute>} />
                    <Route path="/patient/medicine-reminders" element={<RoleRoute allowedRoles={['patient']}><PatientMedicineReminders /></RoleRoute>} />
                    <Route path="/patient/vitals" element={<RoleRoute allowedRoles={['patient']}><PatientVitals /></RoleRoute>} />
                    <Route path="/patient/care-plans" element={<RoleRoute allowedRoles={['patient']}><PatientCarePlan /></RoleRoute>} />
                    <Route path="/patient/medicine-orders" element={<RoleRoute allowedRoles={['patient']}><PatientMedicineOrders /></RoleRoute>} />
                    <Route path="/patient/services" element={<RoleRoute allowedRoles={['patient']}><PatientServices /></RoleRoute>} />
                    <Route path="/patient/bookings" element={<RoleRoute allowedRoles={['patient']}><PatientBookings /></RoleRoute>} />
                    <Route path="/patient/rewards" element={<RoleRoute allowedRoles={['patient']}><PatientRewards /></RoleRoute>} />
                    <Route path="/patient/referral" element={<RoleRoute allowedRoles={['patient']}><PatientReferral /></RoleRoute>} />
                    <Route path="/patient/health-id" element={<RoleRoute allowedRoles={['patient']}><PatientHealthId /></RoleRoute>} />
                    <Route path="/patient/support" element={<RoleRoute allowedRoles={['patient']}><PatientSupport /></RoleRoute>} />
                    <Route path="/patient/favorites" element={<RoleRoute allowedRoles={['patient']}><PatientFavorites /></RoleRoute>} />
                    <Route path="/patient/addresses" element={<RoleRoute allowedRoles={['patient']}><PatientAddresses /></RoleRoute>} />
                    <Route path="/patient/profile" element={<RoleRoute allowedRoles={['patient']}><PatientProfile /></RoleRoute>} />
                    <Route path="/patient/preferred" element={<RoleRoute allowedRoles={['patient']}><PatientPreferred /></RoleRoute>} />
                    <Route path="/patient/payment" element={<RoleRoute allowedRoles={['patient']}><PatientPayment /></RoleRoute>} />
                    <Route path="/patient/billing" element={<RoleRoute allowedRoles={['patient']}><PatientPayment /></RoleRoute>} />
                    <Route path="/patient/doctors" element={<RoleRoute allowedRoles={['patient']}><HospitalDoctors /></RoleRoute>} />
                    <Route path="/patient/upload" element={<RoleRoute allowedRoles={['patient']}><FileUpload /></RoleRoute>} />
                    <Route path="/patient/chat" element={<RoleRoute allowedRoles={['patient']}><ChatPage /></RoleRoute>} />
                    <Route path="/patient/calls" element={<RoleRoute allowedRoles={['patient']}><DoctorCalls /></RoleRoute>} />
                    <Route path="/patient/video-calls" element={<RoleRoute allowedRoles={['patient']}><DoctorVideoCalls /></RoleRoute>} />
                    <Route path="/patient/home-visit" element={<RoleRoute allowedRoles={['patient']}><PatientInPersonVisits /></RoleRoute>} />
                    <Route path="/patient/in-person" element={<RoleRoute allowedRoles={['patient']}><PatientInPersonVisits /></RoleRoute>} />
                    <Route path="/patient/rides" element={<RoleRoute allowedRoles={['patient']}><PatientRides /></RoleRoute>} />
                    <Route path="/patient/assistants" element={<RoleRoute allowedRoles={['patient']}><PatientAssistants /></RoleRoute>} />
                    <Route path="/patient/lawyers" element={<RoleRoute allowedRoles={['patient']}><PatientLawyers /></RoleRoute>} />

                    {/* Doctor routes */}
                    <Route path="/doctor/appointments/approve" element={<RoleRoute allowedRoles={['doctor']}><DoctorAppointments /></RoleRoute>} />
                    <Route path="/doctor/appointments/upcoming" element={<RoleRoute allowedRoles={['doctor']}><DoctorAppointments /></RoleRoute>} />
                    <Route path="/doctor/appointments/history" element={<RoleRoute allowedRoles={['doctor']}><DoctorAppointments /></RoleRoute>} />
                    <Route path="/doctor/appointments/approved" element={<RoleRoute allowedRoles={['doctor']}><DoctorAppointments /></RoleRoute>} />
                    <Route path="/doctor/appointments" element={<RoleRoute allowedRoles={['doctor']}><DoctorAppointments /></RoleRoute>} />
                    <Route path="/doctor/online-appointments" element={<RoleRoute allowedRoles={['doctor']}><DoctorOnlineAppointments /></RoleRoute>} />
                    <Route path="/doctor/home-visit" element={<RoleRoute allowedRoles={['doctor']}><DoctorInPersonAppointments /></RoleRoute>} />
                    <Route path="/doctor/in-person" element={<RoleRoute allowedRoles={['doctor']}><DoctorInPersonAppointments /></RoleRoute>} />
                    <Route path="/doctor/chat" element={<RoleRoute allowedRoles={['doctor']}><ChatPage /></RoleRoute>} />
                    <Route path="/doctor/calls" element={<RoleRoute allowedRoles={['doctor']}><DoctorCalls /></RoleRoute>} />
                    <Route path="/doctor/call/:appointmentId" element={<RoleRoute allowedRoles={['doctor', 'clinic_doctor']}><DoctorCallRoom /></RoleRoute>} />
                    <Route path="/doctor/call-room/:appointmentId" element={<RoleRoute allowedRoles={['doctor', 'clinic_doctor']}><DoctorCallRoom /></RoleRoute>} />
                    <Route path="/doctor/video-calls" element={<RoleRoute allowedRoles={['doctor']}><DoctorVideoCalls /></RoleRoute>} />
                    <Route path="/doctor/video-call/:appointmentId" element={<RoleRoute allowedRoles={['doctor', 'clinic_doctor']}><DoctorVideoCallRoom /></RoleRoute>} />
                    <Route path="/doctor/video-call-room/:appointmentId" element={<RoleRoute allowedRoles={['doctor', 'clinic_doctor']}><DoctorVideoCallRoom /></RoleRoute>} />
                    <Route path="/doctor/patients" element={<RoleRoute allowedRoles={['doctor']}><DoctorPatients /></RoleRoute>} />
                    <Route path="/doctor/consultations" element={<RoleRoute allowedRoles={['doctor']}><DoctorConsultations /></RoleRoute>} />
                    <Route path="/doctor/reviews" element={<RoleRoute allowedRoles={['doctor']}><DoctorReviews /></RoleRoute>} />
                    <Route path="/doctor/earnings" element={<RoleRoute allowedRoles={['doctor']}><DoctorEarnings /></RoleRoute>} />
                    <Route path="/doctor/schedule" element={<RoleRoute allowedRoles={['doctor']}><DoctorScheduleEdit /></RoleRoute>} />
                    <Route path="/doctor/test-results" element={<RoleRoute allowedRoles={['doctor']}><DoctorTestResults /></RoleRoute>} />
                    <Route path="/doctor/emergency" element={<RoleRoute allowedRoles={['doctor']}><DoctorEmergency /></RoleRoute>} />
                    <Route path="/doctor/prescriptions" element={<RoleRoute allowedRoles={['doctor']}><DoctorPrescriptions /></RoleRoute>} />
                    <Route path="/doctor/leave-requests" element={<RoleRoute allowedRoles={['doctor']}><DoctorLeaveRequests /></RoleRoute>} />
                    <Route path="/doctor/profile" element={<RoleRoute allowedRoles={['doctor']}><DoctorProfile /></RoleRoute>} />

                    {/* Clinic Doctor routes */}
                    <Route path="/clinic/dashboard" element={<RoleRoute allowedRoles={['clinic_doctor']}><ClinicDashboard /></RoleRoute>} />
                    <Route path="/clinic/appointments/approve" element={<RoleRoute allowedRoles={['clinic_doctor']}><ClinicAppointments /></RoleRoute>} />
                    <Route path="/clinic/appointments/upcoming" element={<RoleRoute allowedRoles={['clinic_doctor']}><ClinicAppointments /></RoleRoute>} />
                    <Route path="/clinic/appointments/history" element={<RoleRoute allowedRoles={['clinic_doctor']}><ClinicAppointments /></RoleRoute>} />
                    <Route path="/clinic/appointments/approved" element={<RoleRoute allowedRoles={['clinic_doctor']}><ClinicAppointments /></RoleRoute>} />
                    <Route path="/clinic/appointments" element={<RoleRoute allowedRoles={['clinic_doctor']}><ClinicAppointments /></RoleRoute>} />
                    <Route path="/clinic/online-appointments" element={<RoleRoute allowedRoles={['clinic_doctor']}><DoctorOnlineAppointments /></RoleRoute>} />
                    <Route path="/clinic/home-visit" element={<RoleRoute allowedRoles={['clinic_doctor']}><DoctorInPersonAppointments /></RoleRoute>} />
                    <Route path="/clinic/in-person" element={<RoleRoute allowedRoles={['clinic_doctor']}><DoctorInPersonAppointments /></RoleRoute>} />
                    <Route path="/clinic/chat" element={<RoleRoute allowedRoles={['clinic_doctor']}><ChatPage /></RoleRoute>} />
                    <Route path="/clinic/calls" element={<RoleRoute allowedRoles={['clinic_doctor']}><DoctorCalls /></RoleRoute>} />
                    <Route path="/clinic/call/:appointmentId" element={<RoleRoute allowedRoles={['clinic_doctor']}><DoctorCallRoom /></RoleRoute>} />
                    <Route path="/clinic/video-calls" element={<RoleRoute allowedRoles={['clinic_doctor']}><DoctorVideoCalls /></RoleRoute>} />
                    <Route path="/clinic/video-call/:appointmentId" element={<RoleRoute allowedRoles={['clinic_doctor']}><DoctorVideoCallRoom /></RoleRoute>} />
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
                    <Route path="/clinic/platform-settings" element={<RoleRoute allowedRoles={['clinic_doctor']}><ClinicPlatformSettings /></RoleRoute>} />
                    <Route path="/clinic/staff" element={<RoleRoute allowedRoles={['clinic_doctor']}><ClinicStaff /></RoleRoute>} />
                     <Route path="/clinic/notifications" element={<RoleRoute allowedRoles={['clinic_doctor']}><ClinicNotifications /></RoleRoute>} />
                     <Route path="/clinic/test-requests" element={<RoleRoute allowedRoles={['clinic_doctor']}><ClinicTestRequests /></RoleRoute>} />
                     <Route path="/clinic/payment-history" element={<RoleRoute allowedRoles={['clinic_doctor']}><ClinicPaymentHistory /></RoleRoute>} />
                     <Route path="/clinic/analytics" element={<RoleRoute allowedRoles={['clinic_doctor']}><ClinicAnalytics /></RoleRoute>} />

                    {/* Delivery Partner routes */}
                    <Route path="/delivery/dashboard" element={<RoleRoute allowedRoles={['delivery_boy']}><DeliveryDashboard /></RoleRoute>} />
                    <Route path="/delivery/orders" element={<RoleRoute allowedRoles={['delivery_boy']}><DeliveryOrders /></RoleRoute>} />
                    <Route path="/delivery/deliveries" element={<RoleRoute allowedRoles={['delivery_boy']}><DeliveryOrders /></RoleRoute>} />
                    <Route path="/delivery/history" element={<RoleRoute allowedRoles={['delivery_boy']}><DeliveryHistory /></RoleRoute>} />
                    <Route path="/delivery/earnings" element={<RoleRoute allowedRoles={['delivery_boy']}><DeliveryEarnings /></RoleRoute>} />
                    <Route path="/delivery/zone" element={<RoleRoute allowedRoles={['delivery_boy']}><DeliveryZone /></RoleRoute>} />
                    <Route path="/delivery/reviews" element={<RoleRoute allowedRoles={['delivery_boy']}><DeliveryReviews /></RoleRoute>} />
                    <Route path="/delivery/documents" element={<RoleRoute allowedRoles={['delivery_boy']}><DeliveryDocuments /></RoleRoute>} />
                    <Route path="/delivery/settings" element={<RoleRoute allowedRoles={['delivery_boy']}><DeliverySettings /></RoleRoute>} />
                    <Route path="/delivery/profile" element={<RoleRoute allowedRoles={['delivery_boy']}><DeliverySettings /></RoleRoute>} />

                    {/* Rider Partner routes */}
                    <Route path="/rider/dashboard" element={<RoleRoute allowedRoles={['rider']}><RiderDashboard /></RoleRoute>} />
                    <Route path="/rider/requests" element={<RoleRoute allowedRoles={['rider']}><RiderDashboard /></RoleRoute>} />
                    <Route path="/rider/active" element={<RoleRoute allowedRoles={['rider']}><RiderDashboard /></RoleRoute>} />
                    <Route path="/rider/earnings" element={<RoleRoute allowedRoles={['rider']}><RiderDashboard /></RoleRoute>} />
                    <Route path="/rider/history" element={<RoleRoute allowedRoles={['rider']}><RiderDashboard /></RoleRoute>} />
                    <Route path="/rider/vehicle" element={<RoleRoute allowedRoles={['rider']}><RiderDashboard /></RoleRoute>} />
                    <Route path="/rider/documents" element={<RoleRoute allowedRoles={['rider']}><RiderDashboard /></RoleRoute>} />
                    <Route path="/rider/reviews" element={<RoleRoute allowedRoles={['rider']}><RiderDashboard /></RoleRoute>} />
                    <Route path="/rider/settings" element={<RoleRoute allowedRoles={['rider']}><RiderDashboard /></RoleRoute>} />

                    {/* Ambulance driver routes (Doc 02 §5.1) */}
                    <Route path="/ambulance/dashboard" element={<RoleRoute allowedRoles={['ambulance']}><AmbulanceDashboard /></RoleRoute>} />
                    <Route path="/ambulance/jobs" element={<RoleRoute allowedRoles={['ambulance']}><AmbulanceJobs /></RoleRoute>} />

                    {/* Assistant Partner routes */}
                    <Route path="/assistant/dashboard" element={<RoleRoute allowedRoles={['assistant']}><AssistantDashboard /></RoleRoute>} />
                    <Route path="/assistant/requests" element={<RoleRoute allowedRoles={['assistant']}><AssistantDashboard /></RoleRoute>} />
                    <Route path="/assistant/active" element={<RoleRoute allowedRoles={['assistant']}><AssistantDashboard /></RoleRoute>} />
                    <Route path="/assistant/history" element={<RoleRoute allowedRoles={['assistant']}><AssistantDashboard /></RoleRoute>} />
                    <Route path="/assistant/earnings" element={<RoleRoute allowedRoles={['assistant']}><AssistantDashboard /></RoleRoute>} />
                    <Route path="/assistant/profile" element={<RoleRoute allowedRoles={['assistant']}><AssistantDashboard /></RoleRoute>} />
                    
                    {/* Lawyer / Advocate Partner routes */}
                    <Route path="/lawyer/dashboard" element={<RoleRoute allowedRoles={['lawyer']}><LawyerDashboard /></RoleRoute>} />
                    <Route path="/lawyer/requests" element={<RoleRoute allowedRoles={['lawyer']}><LawyerDashboard /></RoleRoute>} />
                    <Route path="/lawyer/cases" element={<RoleRoute allowedRoles={['lawyer']}><LawyerDashboard /></RoleRoute>} />
                    <Route path="/lawyer/active" element={<RoleRoute allowedRoles={['lawyer']}><LawyerDashboard /></RoleRoute>} />
                    <Route path="/lawyer/history" element={<RoleRoute allowedRoles={['lawyer']}><LawyerDashboard /></RoleRoute>} />
                    <Route path="/lawyer/earnings" element={<RoleRoute allowedRoles={['lawyer']}><LawyerDashboard /></RoleRoute>} />
                    <Route path="/lawyer/profile" element={<RoleRoute allowedRoles={['lawyer']}><LawyerDashboard /></RoleRoute>} />
                    </Route>

                   <Route path="/register/delivery-partner" element={<DeliveryPartnerRegister />} />

                   {/* Super Admin Delivery Oversight */}
                   <Route path="/superadmin/delivery-partners" element={<RoleRoute allowedRoles={['superadmin']}><SuperAdminDeliveryPartners /></RoleRoute>} />

                   <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              </AppMotion>
            </LenisScroll>
          </HashRouter>
        </TooltipProvider>
        </VideoCallProvider>
        </AudioCallProvider>
        </CartProvider>
        </PreferredPharmacyProvider>
      </NotificationProvider>
    </ReduxAuthProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
