import 'maplibre-gl/dist/maplibre-gl.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Route, Routes, Navigate, Outlet } from 'react-router-dom';
import { useEffect, useRef, lazy, Suspense } from 'react';
import { Provider } from 'react-redux';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { store } from '@/store';
import { store as mindStore } from './mind/store';
import { ThemeProvider as MindThemeProvider } from './mind/contexts/ThemeContext';
import { LanguageProvider as MindLanguageProvider } from './mind/contexts/LanguageContext';
import { TooltipProvider as MindTooltipProvider } from './mind/components/ui/tooltip';
import { Toaster as MindToaster } from './mind/components/ui/toaster';
import { Toaster as MindSonner } from './mind/components/ui/sonner';
import { initializeAuth } from '@/store/slices/authSlice';
import { applyUserSettings, readStoredSettings } from '@/lib/settings';
import { useSettings, useLoadUserSettings } from '@/store/useSettingsStore';
import { NotificationProvider } from '@/context/NotificationContext';
import { AuthProvider, AuthUser } from '@/context/AuthContext';
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
import { useDispatch } from 'react-redux';
import { useAuth } from '@/context/AuthContext';
import DashboardLayout from './components/DashboardLayout';
import PublicLayout from './components/PublicLayout';
import HealthIdView from './pages/public/HealthIdView';
import AppMotion from './components/AppMotion';
import { LenisScroll } from './components/LenisScroll';
import ErrorBoundary from './components/ErrorBoundary';
import StepUpDialog from './components/StepUpDialog';
import IdleLockOverlay from '@/components/IdleLockOverlay';
import { useProactiveTokenRefresh } from '@/lib/useProactiveTokenRefresh';
import EmergencyFlowController from '@/components/emergency/EmergencyFlowController';
import ReminderAlarmHost from '@/components/patient/ReminderAlarmHost';
import DashboardAlertHost from '@/components/DashboardAlertHost';

// Keep layouts that are always needed
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const SetPassword = lazy(() => import('./pages/SetPassword'));
const OTPVerification = lazy(() => import('./pages/OTPVerification'));
const PendingApproval = lazy(() => import('./pages/PendingApproval'));
const DoctorSetup = lazy(() => import('./pages/DoctorSetup'));
// 2.md 9 — staff invitation redemption (public, code from the email link).
const ProviderStaffSetup = lazy(() => import('./pages/ProviderStaffSetup'));
const JoinPlatform = lazy(() => import('./pages/JoinPlatform'));
// R1: config-driven join wizard (parallel run — JoinPlatform.tsx stays intact)
const JoinWizard = lazy(() => import('./pages/join/JoinWizard'));
const NotFound = lazy(() => import('./pages/NotFound'));

const Doctors = lazy(() => import('./pages/Doctors'));
const Patients = lazy(() => import('./pages/Patients'));
const Appointments = lazy(() => import('./pages/Appointments'));
const MedicalRecords = lazy(() => import('./pages/MedicalRecords'));
const Billing = lazy(() => import('./pages/Billing'));
const VerifyTransaction = lazy(() => import('./pages/VerifyTransaction'));
const VerifyDoc = lazy(() => import('./pages/VerifyDoc'));
const Settings = lazy(() => import('./pages/Settings'));
const Notifications = lazy(() => import('./pages/Notifications'));

const SAPlatformKPIs = lazy(() => import('./pages/superadmin/PlatformKPIs'));
const SAPendingApprovals = lazy(() => import('./pages/superadmin/PendingApprovals'));
const SAJoinApplications = lazy(() => import('./pages/superadmin/JoinApplications'));
const SAOnboardingMetrics = lazy(() => import('./pages/superadmin/OnboardingMetrics'));
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
const FormBuilder = lazy(() => import('./pages/superadmin/FormBuilder'));
const PrintStudio = lazy(() => import('./pages/superadmin/PrintStudio'));
const SABreakGlassQueue = lazy(() => import('./pages/superadmin/BreakGlassQueue'));
const SAPromotions = lazy(() => import('./pages/superadmin/Promotions'));
const SADataExport = lazy(() => import('./pages/superadmin/DataExport'));
const SACities = lazy(() => import('./pages/superadmin/Cities'));
const SALegal = lazy(() => import('./pages/superadmin/Legal'));
const SAIntegrations = lazy(() => import('./pages/superadmin/Integrations'));
const SAEmergencyWarRoom = lazy(() => import('./pages/superadmin/EmergencyWarRoom'));
const SAIncidentCommand = lazy(() => import('./pages/superadmin/IncidentCommand'));
const SAKycCommand = lazy(() => import('./pages/superadmin/KycCommand'));
const SAKycReviewWorkspace = lazy(() => import('./pages/superadmin/KycReviewWorkspace'));
const SATaxLedger = lazy(() => import('./pages/superadmin/TaxLedger'));
const SAAiSafety = lazy(() => import('./pages/superadmin/AiSafety'));
const SAAiReviewQueue = lazy(() => import('./pages/superadmin/AiReviewQueue'));
const SASecurity = lazy(() => import('./pages/superadmin/Security'));
const SADsrQueue = lazy(() => import('./pages/superadmin/SADsrQueue'));
// File 24: Ops CRM & Team Management
const CrmCommandCenter = lazy(() => import('./pages/superadmin/crm/CrmCommandCenter'));
const SupplyPipeline = lazy(() => import('./pages/superadmin/crm/SupplyPipeline'));
const Provider360 = lazy(() => import('./pages/superadmin/crm/Provider360'));
const Partnerships = lazy(() => import('./pages/superadmin/crm/Partnerships'));
const FieldOps = lazy(() => import('./pages/superadmin/crm/FieldOps'));
const CrmTasks = lazy(() => import('./pages/superadmin/crm/CrmTasks'));
const TeamManagement = lazy(() => import('./pages/superadmin/crm/TeamManagement'));
const GoalsOkrs = lazy(() => import('./pages/superadmin/crm/GoalsOkrs'));
const CrmCampaigns = lazy(() => import('./pages/superadmin/crm/CrmCampaigns'));
const CrmReports = lazy(() => import('./pages/superadmin/crm/CrmReports'));
const CrmPlaybooks = lazy(() => import('./pages/superadmin/crm/Playbooks'));
const CrmProjectsRoadmap = lazy(() => import('./pages/superadmin/crm/ProjectsRoadmap'));
const CrmSettings = lazy(() => import('./pages/superadmin/crm/CrmSettings'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Disclaimer = lazy(() => import('./pages/Disclaimer'));
const RefundPolicy = lazy(() => import('./pages/RefundPolicy'));
const GrievanceRedressal = lazy(() => import('./pages/GrievanceRedressal'));
const TelemedicineConsent = lazy(() => import('./pages/TelemedicineConsent'));
const PatientRights = lazy(() => import('./pages/PatientRights'));
const CookiePolicy = lazy(() => import('./pages/CookiePolicy'));
const QueueDisplay = lazy(() => import('./pages/QueueDisplay'));
const DischargeDesk = lazy(() => import('./pages/DischargeDesk'));
const TpaDesk = lazy(() => import('./pages/TpaDesk'));
const RosterPage = lazy(() => import('./pages/RosterPage'));
const OtBoard = lazy(() => import('./pages/OtBoard'));
const LabOps = lazy(() => import('./pages/LabOps'));
const PayrollPage = lazy(() => import('./pages/PayrollPage'));
const CssdPage = lazy(() => import('./pages/CssdPage'));
const WorkflowStudio = lazy(() => import('./pages/hospital/WorkflowStudio'));
const ApprovalsInbox = lazy(() => import('./pages/hospital/ApprovalsInbox'));
const RulesStudio = lazy(() => import('./pages/hospital/RulesStudio'));
const TaskBoard = lazy(() => import('./pages/hospital/TaskBoard'));
const BedBoard = lazy(() => import('./pages/hospital/BedBoard'));
const OpsMasters = lazy(() => import('./pages/hospital/OpsMasters'));
const RcmDashboard = lazy(() => import('./pages/hospital/RcmDashboard'));
const ReconWorkbench = lazy(() => import('./pages/hospital/ReconWorkbench'));
const EnterpriseHub = lazy(() => import('./pages/hospital/EnterpriseHub'));
const ReportStudioPage = lazy(() => import('./pages/hospital/ReportStudioPage'));
const KpiDashboard = lazy(() => import('./pages/hospital/KpiDashboard'));
const CallConsole = lazy(() => import('./pages/hospital/CallConsole'));
const HubBoard = lazy(() => import('./pages/hospital/HubBoard'));
const SafetyDesk = lazy(() => import('./pages/hospital/SafetyDesk'));
const VitalsStation = lazy(() => import('./pages/hospital/VitalsStation'));
const BedsideScan = lazy(() => import('./pages/hospital/BedsideScan'));
const NotifyStudio = lazy(() => import('./pages/hospital/NotifyStudio'));
const WebhookStudio = lazy(() => import('./pages/hospital/WebhookStudio'));
const QualityBoard = lazy(() => import('./pages/hospital/QualityBoard'));
const BiomedicalDashboard = lazy(() => import('./pages/hospital/BiomedicalDashboard'));
const DialysisPage = lazy(() => import('./pages/hospital/DialysisPage'));
const LinenLaundryPage = lazy(() => import('./pages/hospital/LinenLaundryPage'));
const FeedbackDashboard = lazy(() => import('./pages/hospital/FeedbackDashboard'));
const AmbulanceTripsPage = lazy(() => import('./pages/hospital/AmbulanceTripsPage'));
const SecurityDeskPage = lazy(() => import('./pages/hospital/SecurityDeskPage'));
const H1RegisterPage = lazy(() => import('./pages/pharmacy/H1RegisterPage'));
const FormBuilderStudio = lazy(() => import('./pages/hospital/FormBuilderStudio'));
const BiomedicalWastePage = lazy(() => import('./pages/hospital/BiomedicalWastePage'));
const TrialBalancePage = lazy(() => import('./pages/hospital/TrialBalancePage'));
const ParkingManagementPage = lazy(() => import('./pages/hospital/ParkingManagementPage'));
const AccountingExportPage = lazy(() => import('./pages/hospital/AccountingExportPage'));
const RecruitmentPage = lazy(() => import('./pages/hospital/RecruitmentPage'));
const CanteenPage = lazy(() => import('./pages/hospital/CanteenPage'));
const PaymentGatewaySettings = lazy(() => import('./pages/hospital/PaymentGatewaySettings'));
const BiometricAttendancePage = lazy(() => import('./pages/hospital/BiometricAttendancePage'));
const MultiStoreCheckoutPage = lazy(() => import('./pages/hospital/MultiStoreCheckoutPage'));
const QueueAgingDashboard = lazy(() => import('./pages/hospital/QueueAgingDashboard'));
const PackageBillingEngine = lazy(() => import('./pages/hospital/PackageBillingEngine'));
const LabAnalyzerEmulatorPage = lazy(() => import('./pages/hospital/LabAnalyzerEmulatorPage'));
const GlobalSearch = lazy(() => import('./components/GlobalSearch'));
const HealthcarePage = lazy(() => import('./pages/HealthcarePage'));
const HospitalDirectory = lazy(() => import('./pages/HospitalDirectory'));
const HospitalProfile = lazy(() => import('./pages/HospitalProfile'));
const HospitalDoctors = lazy(() => import('./pages/HospitalDoctors'));
const HospitalDoctor = lazy(() => import('./pages/HospitalDoctor'));
const ClinicDoctor = lazy(() => import('./pages/ClinicDoctor'));
const ClinicDetail = lazy(() => import('./pages/ClinicDetail'));
const FacilityDetailPage = lazy(() => import('./pages/facility/FacilityDetailPage'));
const PractitionerProfilePage = lazy(() => import('./pages/practitioner/PractitionerProfilePage'));
const HospitalTestBooking = lazy(() => import('./pages/HospitalTestBooking'));
const ClinicDoctors = lazy(() => import('./pages/ClinicDoctors'));
const DiagnosticCenters = lazy(() => import('./pages/DiagnosticCenters'));
const AllTests = lazy(() => import('./pages/AllTests'));
const DiagnosticCenterDetail = lazy(() => import('./pages/DiagnosticCenterDetail'));
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
// R1: patient dashboard v2 + timeline + privacy centre (old routes untouched)
const PatientDashboardV2 = lazy(() => import('./pages/patient/PatientDashboardV2'));
const PatientTimeline = lazy(() => import('./pages/patient/Timeline'));
const PatientPrivacyCentre = lazy(() => import('./pages/patient/PrivacyCentre'));
const PatientPrograms = lazy(() => import('./pages/patient/PatientPrograms'));
const PatientRentals = lazy(() => import('./pages/patient/PatientRentals'));
const PatientEvents = lazy(() => import('./pages/patient/PatientEvents'));
const PatientVaccinations = lazy(() => import('./pages/patient/PatientVaccinations'));
const PatientInsurance = lazy(() => import('./pages/patient/PatientInsurance'));
const PatientWellness = lazy(() => import('./pages/patient/PatientWellness'));
const PatientConsents = lazy(() => import('./pages/patient/PatientConsents'));
const PatientEmergencyCard = lazy(() => import('./pages/patient/EmergencyCard'));
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
const PatientSecondOpinion = lazy(() => import('./pages/patient/SecondOpinion'));
const SALoyaltyRewards = lazy(() => import('./pages/superadmin/LoyaltyRewards'));
const SAReferralSettings = lazy(() => import('./pages/superadmin/ReferralSettings'));

const DoctorDashboard = lazy(() => import('./pages/doctor/DoctorDashboard'));
const DoctorAppointments = lazy(() => import('./pages/doctor/DoctorAppointments'));
const DoctorPatients = lazy(() => import('./pages/doctor/DoctorPatients'));
const DoctorConsultations = lazy(() => import('./pages/doctor/DoctorConsultations'));
const DoctorReviews = lazy(() => import('./pages/doctor/DoctorReviews'));
const DoctorTestResults = lazy(() => import('./pages/doctor/DoctorTestResults'));
const ResultsInbox = lazy(() => import('./pages/doctor/ResultsInbox'));
const DoctorQueue = lazy(() => import('./pages/doctor/DoctorQueue'));
const ReferralsInbox = lazy(() => import('./pages/doctor/ReferralsInbox'));
const EmrWorkspace = lazy(() => import('./pages/doctor/EmrWorkspace'));
const EarningsStatement = lazy(() => import('./pages/doctor/EarningsStatement'));
const CaseBoard = lazy(() => import('./pages/doctor/CaseBoard'));
const IcuChart = lazy(() => import('./pages/IcuChart'));
const DietKitchenSheet = lazy(() => import('./pages/DietKitchenSheet'));
const MortuaryPage = lazy(() => import('./pages/MortuaryPage'));
const OncologyPage = lazy(() => import('./pages/OncologyPage'));
const Kiosk = lazy(() => import('./pages/Kiosk'));
const FormsFill = lazy(() => import('./pages/FormsFill'));
const SignDocument = lazy(() => import('./pages/SignDocument'));
const CommandPalette = lazy(() => import('./components/CommandPalette'));
const DoctorEarnings = lazy(() => import('./pages/doctor/DoctorEarnings'));
const DoctorAnalytics = lazy(() => import('./pages/doctor/DoctorAnalytics'));
const DoctorRefunds = lazy(() => import('./pages/doctor/DoctorRefunds'));
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
const ClinicAdminDashboard = lazy(() => import('./pages/clinic/ClinicAdminDashboard'));
const ClinicDoctorDashboard = lazy(() => import('./pages/clinic/ClinicDoctorDashboard'));
const ClinicReceptionDashboard = lazy(() => import('./pages/clinic/ClinicReceptionDashboard'));
const ClinicCashierDashboard = lazy(() => import('./pages/clinic/ClinicCashierDashboard'));
const ClinicNurseDashboard = lazy(() => import('./pages/clinic/ClinicNurseDashboard'));
const ClinicBranchManagerDashboard = lazy(() => import('./pages/clinic/ClinicBranchManagerDashboard'));
const ClinicTelemedCoordinatorDashboard = lazy(() => import('./pages/clinic/ClinicTelemedCoordinatorDashboard'));
const ClinicOverview = lazy(() => import('./pages/clinic/ClinicOverview'));
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
const ClinicInventory = lazy(() => import('./pages/clinic/ClinicInventory'));
const ClinicPackages = lazy(() => import('./pages/clinic/ClinicPackages'));
const ClinicBranches = lazy(() => import('./pages/clinic/ClinicBranches'));
const ClinicCertificates = lazy(() => import('./pages/clinic/ClinicCertificates'));
const PurchaseCenter = lazy(() => import('./pages/hospital/PurchaseCenter'));
const GrowthCharts = lazy(() => import('./pages/paed/GrowthCharts'));
const VaccinationAlerts = lazy(() => import('./pages/paed/VaccinationAlerts'));
const Partogram = lazy(() => import('./pages/paed/Partogram'));
const NewbornScreening = lazy(() => import('./pages/paed/NewbornScreening'));
const PdfWorker = lazy(() => import('./pages/PdfWorker'));
const ClinicNotifications = lazy(() => import('./pages/clinic/ClinicNotifications'));
const ClinicPlatformSettings = lazy(() => import('./pages/clinic/ClinicPlatformSettings'));

const DeliveryDashboard = lazy(() => import('./pages/delivery/DeliveryDashboard'));
const StaffDashboardPage = lazy(() => import('./pages/StaffDashboard'));
const AccessControl = lazy(() => import('./pages/AccessControl'));
const FrontDesk = lazy(() => import('./pages/FrontDesk'));
const HospitalDashboardV2 = lazy(() => import('./pages/HospitalDashboardV2'));
const DashboardOverviewPage = lazy(() => import('./pages/hospital/DashboardOverviewPage'));
const DashboardQueuePage = lazy(() => import('./pages/hospital/DashboardQueuePage'));
const DeliveryOrders = lazy(() => import('./pages/delivery/DeliveryOrders'));
const DeliveryHistory = lazy(() => import('./pages/delivery/DeliveryHistory'));
const DeliveryEarnings = lazy(() => import('./pages/delivery/DeliveryEarnings'));
const DeliveryZone = lazy(() => import('./pages/delivery/DeliveryZone'));
const DeliveryReviews = lazy(() => import('./pages/delivery/DeliveryReviews'));
const DeliveryDocuments = lazy(() => import('./pages/delivery/DeliveryDocuments'));
const DeliverySettings = lazy(() => import('./pages/delivery/DeliverySettings'));
const DeliveryPartnerRegister = lazy(() => import('./pages/register/DeliveryPartnerRegister'));
const SuperAdminDeliveryPartners = lazy(() => import('./pages/superadmin/DeliveryPartners'));

// R1: generic shell + thin role dashboards (RoleDashboardShell + 8 wrappers)
const DentistDashboard = lazy(() => import('./pages/dashboards/DentistDashboard'));
const DietitianDashboard = lazy(() => import('./pages/dashboards/DietitianDashboard'));
const PhysioDashboard = lazy(() => import('./pages/dashboards/PhysioDashboard'));
const YogaStudioDashboard = lazy(() => import('./pages/dashboards/YogaStudioDashboard'));
const GymDashboard = lazy(() => import('./pages/dashboards/GymDashboard'));
const EquipmentVendorDashboard = lazy(() => import('./pages/dashboards/EquipmentVendorDashboard'));
const EventOrganizerDashboard = lazy(() => import('./pages/dashboards/EventOrganizerDashboard'));
const PhlebotomistDashboard = lazy(() => import('./pages/dashboards/PhlebotomistDashboard'));

// Wave 2: 10 Missing Role Dashboards
const HodDashboard = lazy(() => import('./pages/dashboards/HodDashboard'));
const OpdCoordinatorDashboard = lazy(() => import('./pages/dashboards/OpdCoordinatorDashboard'));
const ResidentDashboard = lazy(() => import('./pages/dashboards/ResidentDashboard'));
const AdmissionCoordinatorDashboard = lazy(() => import('./pages/dashboards/AdmissionCoordinatorDashboard'));
const BedManagerDashboard = lazy(() => import('./pages/dashboards/BedManagerDashboard'));
const CorporateBillingDashboard = lazy(() => import('./pages/dashboards/CorporateBillingDashboard'));
const PatientRelationsDashboard = lazy(() => import('./pages/dashboards/PatientRelationsDashboard'));
const FacilityManagerDashboard = lazy(() => import('./pages/dashboards/FacilityManagerDashboard'));
const AuditorDashboard = lazy(() => import('./pages/dashboards/AuditorDashboard'));
const MedicalSuperintendentDashboard = lazy(() => import('./pages/dashboards/MedicalSuperintendentDashboard'));

// File 07: Specialty & Platform Role Dashboards
const OpticianDashboard = lazy(() => import('./pages/dashboards/OpticianDashboard'));
const HomeNursingDashboard = lazy(() => import('./pages/dashboards/HomeNursingDashboard'));
const WellnessDashboard = lazy(() => import('./pages/dashboards/WellnessDashboard'));
const ProductVendorDashboard = lazy(() => import('./pages/dashboards/ProductVendorDashboard'));
const SupportGroupHostDashboard = lazy(() => import('./pages/dashboards/SupportGroupHostDashboard'));
const TrainerOrgDashboard = lazy(() => import('./pages/dashboards/TrainerOrgDashboard'));
const BloodBankAdminDashboard = lazy(() => import('./pages/dashboards/BloodBankAdminDashboard'));
const DialysisAdminDashboard = lazy(() => import('./pages/dashboards/DialysisAdminDashboard'));
const IvfMaternityDashboard = lazy(() => import('./pages/dashboards/IvfMaternityDashboard'));
const RehabAdminDashboard = lazy(() => import('./pages/dashboards/RehabAdminDashboard'));
const GovtFacilityDashboard = lazy(() => import('./pages/dashboards/GovtFacilityDashboard'));
const TpaAgentDashboard = lazy(() => import('./pages/dashboards/TpaAgentDashboard'));
const ContentEditorDashboard = lazy(() => import('./pages/dashboards/ContentEditorDashboard'));
const ModeratorDashboard = lazy(() => import('./pages/dashboards/ModeratorDashboard'));
const FinanceAdminDashboard = lazy(() => import('./pages/dashboards/FinanceAdminDashboard'));
const ComplianceKycDashboard = lazy(() => import('./pages/dashboards/ComplianceKycDashboard'));

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
const PathologistVerificationDashboard = lazy(() => import('./pages/labcenter/PathologistVerificationDashboard'));
const LabTestCatalog = lazy(() => import('./pages/labcenter/LabTestCatalog'));
const LabReceivingDashboard = lazy(() => import('./pages/labcenter/LabReceivingDashboard'));
const LabSectionWorkbench = lazy(() => import('./pages/labcenter/LabSectionWorkbench'));
const LabQualityQc = lazy(() => import('./pages/labcenter/LabQualityQc'));
const LabSampleTracking = lazy(() => import('./pages/labcenter/LabSampleTracking'));
const LabOutsourceDesk = lazy(() => import('./pages/labcenter/LabOutsourceDesk'));

// ── Radiology Modules ──
const RadiologyDashboard = lazy(() => import('./pages/radiology/RadiologyDashboard'));
const RadiologyScheduling = lazy(() => import('./pages/radiology/RadiologyScheduling'));
const ModalityMaster = lazy(() => import('./pages/radiology/ModalityMaster'));
const ModalityDashboard = lazy(() => import('./pages/radiology/ModalityDashboard'));
const PreparationQueue = lazy(() => import('./pages/radiology/PreparationQueue'));
const PacsDashboard = lazy(() => import('./pages/radiology/PacsDashboard'));
const CriticalFindings = lazy(() => import('./pages/radiology/CriticalFindings'));
const ReportCenter = lazy(() => import('./pages/radiology/ReportCenter'));
const ReceptionConsole = lazy(() => import('./pages/radiology/ReceptionConsole'));
const RadiologyMIS = lazy(() => import('./pages/radiology/RadiologyMIS'));

// ── MindSupport (merged) — separate /mind/* routes ──
// FindMedi user dashboard (/dashboard, /patient/*) and MindSupport user
// dashboard (/mind/user) stay separate on purpose (merge later).
const MindShell = lazy(() => import('./mind/MindProviders'));
const MindIndex = lazy(() => import('./mind/pages/Index'));
const MindAbout = lazy(() => import('./mind/pages/About'));
const MindCounselling = lazy(() => import('./mind/pages/Counselling'));
const MindPsychiatrists = lazy(() => import('./mind/pages/Psychiatrists'));
const MindPsychiatristDetail = lazy(() => import('./mind/pages/PsychiatristDetail'));
const MindSessionSchedule = lazy(() => import('./mind/pages/SessionSchedule'));
const MindResourceHub = lazy(() => import('./mind/pages/ResourceHub'));
const MindPeerSupport = lazy(() => import('./mind/pages/PeerSupport'));
const MindAdminDashboard = lazy(() => import('./mind/pages/AdminDashboard'));
const MindWellness = lazy(() => import('./mind/pages/MyWellness'));
const MindPrivacy = lazy(() => import('./mind/pages/PrivacyPolicy'));
const MindIntakeForm = lazy(() => import('./mind/pages/IntakeFormPage'));
const MindUserDashboard = lazy(() => import('./mind/pages/UserDashboard'));
const MindCounsellorDashboard = lazy(() => import('./mind/pages/CounsellorDashboard'));
const MindPsychiatristDashboard = lazy(() => import('./mind/pages/PsychiatristDashboard'));
const MindDashboardLayout = lazy(() => import('./mind/components/MindDashboardLayout'));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

// §7.5: shared-device PHI leak — logout par React Query + persisted stores ka
// cached PHI turant clear ho, warna agla user back-button se pichhle patient
// ka data dekh lega. Auth slice se fire hota hai (window event).
if (typeof window !== 'undefined') {
  window.addEventListener('findmedi:logout', () => {
    try { queryClient.clear(); } catch { /* ignore */ }
  });
}

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
  const { user } = useAuth();
  const settings = useSettings();
  const loadUserSettings = useLoadUserSettings();

  // Apply settings from localStorage on first mount
  useEffect(() => {
    const stored = readStoredSettings();
    if (stored && Object.keys(stored).length > 0) {
      loadUserSettings(stored);
    }
  }, [loadUserSettings]);

  // Load user settings into the store when user logs in and apply to DOM
  useEffect(() => {
    if (user?.settings) {
      loadUserSettings(user.settings);
      applyUserSettings(user.settings);
    }
  }, [user?.settings, loadUserSettings]);

  // Apply settings whenever the store values change (after initial mount)
  useEffect(() => {
    applyUserSettings(settings);
  }, [settings]);

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
  if (!user.isVerified) return <Navigate to={`/verify-otp?email=${encodeURIComponent(user.email ?? '')}`} replace />;
  if ((user.role === 'doctor' || user.role === 'clinic_doctor') && !user.doctorApproved) {
    return <Navigate to={`/pending-approval?email=${encodeURIComponent(user.email ?? '')}&status=${user.approvalStatus === 'rejected' ? 'rejected' : 'pending'}`} replace />;
  }
  if (user.role === 'rider' && user.approvalStatus !== 'approved') {
    return <Navigate to={`/pending-approval?email=${encodeURIComponent(user.email ?? '')}&status=${user.approvalStatus === 'rejected' ? 'rejected' : 'pending'}`} replace />;
  }
  if (user.role === 'assistant' && user.approvalStatus !== 'approved') {
    return <Navigate to={`/pending-approval?email=${encodeURIComponent(user.email ?? '')}&status=${user.approvalStatus === 'rejected' ? 'rejected' : 'pending'}`} replace />;
  }
  if (user.role === 'lawyer' && user.approvalStatus !== 'approved') {
    return <Navigate to={`/pending-approval?email=${encodeURIComponent(user.email ?? '')}&status=${user.approvalStatus === 'rejected' ? 'rejected' : 'pending'}`} replace />;
  }
  if (user.role === 'delivery_boy' && user.approvalStatus !== 'approved') {
    return <Navigate to="/delivery/documents" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role ?? '')) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function DashboardShell() {
  const { user } = useAuth();
  const paletteRoles = ['doctor', 'clinic_doctor', 'hospital_admin'];
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Outlet />
        {paletteRoles.includes(user?.role ?? '') && <CommandPalette />}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function RoleRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user } = useAuth();
  if (allowedRoles && !allowedRoles.includes(user?.role ?? '')) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// Mind user pages (/mind/user, /mind/wellness) — sirf client (patient) ya guest ke liye.
// Counsellor/psychiatrist/doctor/staff roles inhe khol hi nahi sakte.
function MindUserOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user && user.role !== 'patient') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function getDefaultDashboardPath(user: AuthUser | null) {
  const value = user?.settings?.defaultDashboard || 'overview';
  if (value === 'overview') return '';

  const paths: Record<string, Record<string, string> | undefined> = {
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

  return paths[user?.role ?? '']?.[value] || '';
}

function StaffDashboard() {
  return <StaffDashboardPage />;
}

const CLINIC_OPS_ROLES = ['clinic_admin', 'clinic_receptionist', 'clinic_nurse', 'clinic_accountant', 'clinic_pharmacist', 'clinic_cashier', 'clinic_branch_manager', 'clinic_telemed_coordinator'];
// File 22 P2-39: all clinic org roles (incl. clinic_doctor) can reach the clinic
// console; each page still gates its own actions (only clinic_doctor writes Rx).
const CLINIC_ROLES = ['clinic_doctor', 'clinic_admin', 'clinic_receptionist', 'clinic_nurse', 'clinic_accountant', 'clinic_pharmacist', 'clinic_cashier', 'clinic_branch_manager', 'clinic_telemed_coordinator'];

const SPECIALTY_DASHBOARD_PATHS: Record<string, string> = {
  dentist: '/dashboard/dentist',
  dental_clinic_admin: '/dashboard/dentist',
  physio: '/dashboard/physio',
  physiotherapist: '/dashboard/physio',
  yoga: '/dashboard/yoga',
  yoga_instructor: '/dashboard/yoga',
  yoga_studio_admin: '/dashboard/yoga',
  gym: '/dashboard/gym',
  gym_owner: '/dashboard/gym',
  trainer: '/dashboard/gym',
  equipment: '/dashboard/equipment',
  equipment_vendor: '/dashboard/equipment',
  events: '/dashboard/events',
  event_organizer: '/dashboard/events',
  phlebotomist: '/dashboard/phlebotomist',
  dietitian: '/dashboard/dietitian',
  hod: '/dashboard/hod',
  opd_coordinator: '/dashboard/opd-coordinator',
  resident: '/dashboard/resident',
  admission_coordinator: '/dashboard/admission-coordinator',
  bed_manager: '/dashboard/bed-manager',
  corporate_billing: '/dashboard/corporate-billing',
  patient_relations: '/dashboard/patient-relations',
  facility_manager: '/dashboard/facility-manager',
  auditor: '/dashboard/auditor',
  medical_superintendent: '/dashboard/medical-superintendent',
  optician: '/dashboard/optician',
  optical_shop_owner: '/dashboard/optician',
  home_nursing_admin: '/dashboard/home-nursing',
  wellness_admin: '/dashboard/wellness',
  therapist: '/dashboard/wellness',
  product_vendor: '/dashboard/product-vendor',
  group_host: '/dashboard/support-group',
  trainer_org: '/dashboard/trainer-org',
  blood_bank_admin: '/dashboard/blood-bank-admin',
  dialysis_admin: '/dashboard/dialysis-admin',
  fertility_admin: '/dashboard/ivf-maternity',
  maternity_admin: '/dashboard/ivf-maternity',
  rehab_admin: '/dashboard/rehab-admin',
  govt_facility_staff: '/dashboard/govt-facility',
  tpa_agent: '/dashboard/tpa-agent',
  content_editor: '/dashboard/content-editor',
  medical_reviewer: '/dashboard/content-editor',
  moderator: '/dashboard/moderator',
  support_agent: '/dashboard/moderator',
  finance_admin: '/dashboard/finance-admin',
  compliance_officer: '/dashboard/compliance-kyc',
  kyc_reviewer: '/dashboard/compliance-kyc',
};

function RoleDashboard() {
  const { user } = useAuth();
  const defaultPath = getDefaultDashboardPath(user);
  if (defaultPath) return <Navigate to={defaultPath} replace />;
  if (user?.role === 'superadmin') return <Navigate to="/superadmin/overview" replace />;
  if (user?.role === 'doctor') return <DoctorDashboard />;
  if (user?.role === 'clinic_doctor') return <ClinicDoctorDashboard />;
  if (user?.role === 'clinic_admin') return <ClinicAdminDashboard />;
  if (user?.role === 'clinic_receptionist') return <ClinicReceptionDashboard />;
  if (user?.role === 'clinic_cashier' || user?.role === 'clinic_accountant') return <ClinicCashierDashboard />;
  if (user?.role === 'clinic_nurse') return <ClinicNurseDashboard />;
  if (user?.role === 'clinic_branch_manager') return <ClinicBranchManagerDashboard />;
  if (user?.role === 'clinic_telemed_coordinator') return <ClinicTelemedCoordinatorDashboard />;
  // Psychiatrist doctor hai → FindMedi DoctorDashboard; counsellor ka bhi provider dashboard
  if (user?.role === 'psychiatrist') return <DoctorDashboard />;
  if (user?.role === 'counsellor') return <DoctorDashboard />;
  if (user?.role === 'hospital_admin') return <Navigate to="/dashboard/v2" replace />;
  // File 22 P0-8: operations roles land on their module (each target route
  // admits the role — see the RoleRoute entries below).
  if (['front_desk', 'receptionist'].includes(user?.role ?? '')) return <Navigate to="/frontdesk" replace />;
  if (['billing_executive', 'cashier'].includes(user?.role ?? '')) return <Navigate to="/billing" replace />;
  if (user?.role === 'insurance_desk') return <Navigate to="/insurance/desk" replace />;
  if (['medical_director', 'cmo'].includes(user?.role ?? '')) return <Navigate to="/dashboard/v2" replace />;
  // File 22 P0-8: clinic org staff land on the clinic console (CLINIC_ROLES
  // below admits all five) and specialty roles on their own /dashboard/* page.
  if (CLINIC_OPS_ROLES.includes(user?.role ?? '')) return <Navigate to="/clinic/admin" replace />;
  const specialtyPath = SPECIALTY_DASHBOARD_PATHS[user?.role ?? ''];
  if (specialtyPath) return <Navigate to={specialtyPath} replace />;
  if (['nursing_supervisor', 'matron', 'ward_nurse', 'icu_nurse', 'ot_nurse', 'infection_control_nurse'].includes(user?.role ?? '')) return <StaffDashboard />;
  if (['surgeon', 'anaesthetist'].includes(user?.role ?? '')) return <DoctorDashboard />;
  if (user?.role === 'ot_technician') return <Navigate to="/ot/board" replace />;
  if (user?.role === 'cssd_technician') return <Navigate to="/cssd" replace />;
  if (['store_keeper', 'purchase_officer'].includes(user?.role ?? '')) return <Navigate to="/inventory" replace />;
  if (user?.role === 'hr_manager') return <Navigate to="/hr/roster" replace />;
  if (['biomedical_engineer', 'maintenance'].includes(user?.role ?? '')) return <Navigate to="/hospital/enterprise" replace />;
  if (['housekeeping_supervisor', 'ward_boy'].includes(user?.role ?? '')) return <Navigate to="/housekeeping" replace />;
  if (['dietician_head', 'kitchen_staff'].includes(user?.role ?? '')) return <Navigate to="/diet" replace />;
  if (user?.role === 'mortuary_attendant') return <Navigate to="/mortuary" replace />;
  if (user?.role === 'medical_records_officer') return <Navigate to="/hospital/reports" replace />;
  if (['quality_officer', 'pharmacovigilance_officer'].includes(user?.role ?? '')) return <Navigate to="/hospital/safety" replace />;
  if (user?.role === 'call_center_agent') return <Navigate to="/hospital/calls" replace />;
  if (user?.role === 'delivery_boy') return <DeliveryDashboard />;
  if (user?.role === 'rider') return <Navigate to="/rider/dashboard" replace />;
  if (user?.role === 'ambulance') return <Navigate to="/ambulance/dashboard" replace />;
  if (user?.role === 'assistant') return <Navigate to="/assistant/dashboard" replace />;
  if (user?.role === 'lawyer') return <Navigate to="/lawyer/dashboard" replace />;
  if (user?.role === 'lab_owner') return <Navigate to="/lab-business/dashboard" replace />;
  if (user?.role === 'pharmacy_owner') return <Navigate to="/pharmacy-business/dashboard" replace />;
  if (['nurse','pharmacist','lab_receptionist','lab_technician','pathologist','radiologist','dietitian','physiotherapist','counselor','accountant','security','technician','helper'].includes(user?.role ?? '')) return <StaffDashboard />;
  // File 22 P0-8: operations roles without a dedicated console fall back to
  // the generic staff console (fail-soft widgets) instead of PatientDashboard.
  if (['ward_boy','housekeeping_supervisor','mortuary_attendant','dietician_head','kitchen_staff','biomedical_engineer','maintenance','store_keeper','purchase_officer','ot_technician','cssd_technician'].includes(user?.role ?? '')) return <StaffDashboard />;
  // File 22 P0-8: every remaining canonical role is staff — only the patient
  // role (or an unidentified session) gets the patient dashboard.
  if (!user?.role || user.role === 'patient') return <PatientDashboard />;
  return <StaffDashboard />;
}

function MindDashboardShell() {
  return (
    <Suspense fallback={loadingFallback}>
      {/* MindDashboardLayout is lazy; outer Suspense already covers it but explicit is safe */}
      <MindDashboardLayout>
        <Outlet />
      </MindDashboardLayout>
    </Suspense>
  );
}

// Mind pages moved into FindMedi DashboardShell keep exact MindProviders
// parity (store + theme + language + tooltips + toasters) — only the
// sidebar layout changed, nothing else.
function MindStore({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-findmedi">
      <Provider store={mindStore}>
        <MindThemeProvider>
          <MindLanguageProvider>
            <MindTooltipProvider>
              <MindToaster />
              <MindSonner />
              {children}
            </MindTooltipProvider>
          </MindLanguageProvider>
        </MindThemeProvider>
      </Provider>
    </div>
  );
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
      <HashRouter>
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
          {/* AUTHZ-M-03 (F7): global re-verification prompt for STEP_UP_REQUIRED */}
          <StepUpDialog />
          {/* Checklist I8: global idle PIN-lock overlay (403 IDLE_LOCK) */}
          <IdleLockOverlay />
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <EmergencyFlowController />
            <ReminderAlarmHost />
            <DashboardAlertHost />
            <GlobalSearch />
            <LenisScroll>
              <AppMotion>
                <Suspense fallback={loadingFallback}>
                  <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/join-platform" element={<JoinPlatform />} />
                    <Route path="/join" element={<Navigate to="/join-platform" replace />} />
                    <Route path="/join/new" element={<JoinWizard />} />
                    <Route path="/terms" element={<TermsOfService />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/disclaimer" element={<Disclaimer />} />
                    <Route path="/refund-policy" element={<RefundPolicy />} />
                    <Route path="/grievance" element={<GrievanceRedressal />} />
                    <Route path="/telemedicine-consent" element={<TelemedicineConsent />} />
                    <Route path="/patient-rights" element={<PatientRights />} />
                    <Route path="/cookies" element={<CookiePolicy />} />
                    <Route path="/display/queue" element={<QueueDisplay />} />
                    <Route path="/kiosk" element={<Kiosk />} />
                    <Route path="/forms" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'clinic_doctor', 'nurse', 'superadmin']}><FormsFill /></RoleRoute>} />
                    <Route path="/sign/:kind/:id" element={<RoleRoute allowedRoles={['patient', 'doctor', 'clinic_doctor', 'hospital_admin', 'nurse']}><SignDocument /></RoleRoute>} />
                    {/* Public seal verification — no login (File 14 §14.5) */}
                    <Route path="/verify/doc/:kind/:id" element={<VerifyDoc />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  {/* AUTH-F-06: forced rotation landing page for mustResetPassword sessions */}
                  <Route path="/set-password" element={<SetPassword />} />
                  <Route path="/verify-otp" element={<OTPVerification />} />
                  <Route path="/pending-approval" element={<PendingApproval />} />
                  <Route path="/doctor-setup" element={<DoctorSetup />} />
                  <Route path="/ambulance-setup" element={<AmbulanceSetup />} />
                  <Route path="/provider-staff-setup" element={<ProviderStaffSetup />} />
<Route path="/healthcare" element={<PublicLayout><HealthcarePage /></PublicLayout>} />
<Route path="/hospitals" element={<PublicLayout><HospitalDirectory /></PublicLayout>} />
                   <Route path="/hospitals/:id" element={<PublicLayout><HospitalProfile /></PublicLayout>} />
<Route path="/hospitals/:hospitalId/doctors" element={<PublicLayout><HospitalDoctors /></PublicLayout>} />
                      <Route path="/clinic-doctors" element={<PublicLayout><ClinicDoctors /></PublicLayout>} />
                      <Route path="/hospital-doctors/:id" element={<PublicLayout><HospitalDoctor /></PublicLayout>} />
                     <Route path="/clinic-doctors/:id" element={<PublicLayout><ClinicDoctor /></PublicLayout>} />
                     <Route path="/clinic/:clinicId" element={<PublicLayout><ClinicDetail /></PublicLayout>} />
                      {/* File 03: Universal Facility Detail Page with Section Registry */}
                      <Route path="/facility/:type/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/facility/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/dental/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/eye/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/optical/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/ayush/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/dialysis/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/gym/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/yoga/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/equipment/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/blood-bank/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/govt-facility/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/ambulance-service/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/wellness-centre/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/event/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/maternity/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/ivf/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/rehab/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/deaddiction/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/program/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/support-group/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/health-store/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/eldercare/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/assisted-living/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/hospice/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/vaccinations/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/vaccination/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/meals/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/diet-kitchen/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/specialty-centre/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/cancer/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      <Route path="/corporate-wellness/:id" element={<PublicLayout><FacilityDetailPage /></PublicLayout>} />
                      {/* File 04: Universal Practitioner Profile with Adaptive Section Registry */}
                      <Route path="/practitioner/:id" element={<PublicLayout><PractitionerProfilePage /></PublicLayout>} />
                      <Route path="/practitioner/:type/:id" element={<PublicLayout><PractitionerProfilePage /></PublicLayout>} />
                      <Route path="/doctors/:specialty/:city/:slug" element={<PublicLayout><PractitionerProfilePage /></PublicLayout>} />
                      <Route path="/dentist/:id" element={<PublicLayout><PractitionerProfilePage /></PublicLayout>} />
                      <Route path="/ayush-doctor/:id" element={<PublicLayout><PractitionerProfilePage /></PublicLayout>} />
                      <Route path="/physio/:id" element={<PublicLayout><PractitionerProfilePage /></PublicLayout>} />
                      <Route path="/dietitian/:id" element={<PublicLayout><PractitionerProfilePage /></PublicLayout>} />
                      <Route path="/psychologist/:id" element={<PublicLayout><PractitionerProfilePage /></PublicLayout>} />
                      <Route path="/counsellor/:id" element={<PublicLayout><PractitionerProfilePage /></PublicLayout>} />
                      <Route path="/nurse/:id" element={<PublicLayout><PractitionerProfilePage /></PublicLayout>} />
                      <Route path="/yoga-trainer/:id" element={<PublicLayout><PractitionerProfilePage /></PublicLayout>} />
<Route path="/book-test/:entityId" element={<PublicLayout><HospitalTestBooking /></PublicLayout>} />
                      <Route path="/diagnostic-centers" element={<PublicLayout><DiagnosticCenters /></PublicLayout>} />
                      <Route path="/all-tests" element={<PublicLayout><AllTests /></PublicLayout>} />
                       <Route path="/lab/:clinicId" element={<PublicLayout><DiagnosticCenterDetail /></PublicLayout>} />

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

                    {/* ── MindSupport (merged) — /mind/* ── */}
                    <Route element={<MindShell />}>
                      <Route path="/mind" element={<MindIndex />} />
                      <Route path="/mind/about" element={<MindAbout />} />
                      <Route path="/mind/book" element={<MindCounselling />} />
                      <Route path="/mind/counselling" element={<MindCounselling />} />
                      <Route path="/mind/psychiatrists" element={<MindPsychiatrists />} />
                      <Route path="/mind/psychiatrists/:id" element={<MindPsychiatristDetail />} />
                      <Route path="/mind/counselling/:counsellorId" element={<MindCounselling />} />
                      <Route path="/mind/session-schedule" element={<MindSessionSchedule />} />
                      <Route path="/mind/resources" element={<MindResourceHub />} />
                      <Route path="/mind/peer" element={<MindPeerSupport />} />
                      <Route path="/mind/legal" element={<MindPrivacy />} />
                      <Route path="/mind/intake/:packageId" element={<MindIntakeForm />} />
                      {/* Mind dashboards with FindMedi-like sidebar */}
                      <Route element={<MindDashboardShell />}>
                        {/* U-3/U-9: legacy anonymous console retired — canonical
                            client console is /mind/user (protected). Bookmarks keep working. */}
                        <Route path="/mind/dashboard" element={<Navigate to="/mind/user" replace />} />
                        <Route path="/mind/admin" element={<RoleRoute allowedRoles={['superadmin']}><MindAdminDashboard /></RoleRoute>} />
                      </Route>
                    </Route>

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
                    <Route path="verification" element={<RoleRoute allowedRoles={['lab_owner', 'pathologist', 'superadmin']}><PathologistVerificationDashboard /></RoleRoute>} />
                    <Route path="analytics" element={<RoleRoute allowedRoles={['lab_owner']}><LabReportsAnalytics /></RoleRoute>} />
                    <Route path="reviews" element={<RoleRoute allowedRoles={['lab_owner']}><LabReviews /></RoleRoute>} />
                  </Route>

                  {/* Authenticated dashboard shell */}
                  <Route element={<DashboardShell />}>
                    <Route path="/dashboard" element={<RoleDashboard />} />
                    {/* Mind user dashboard merged into FindMedi shell (single dashboard) */}
                    <Route path="/mind/user" element={<MindUserOnlyRoute><MindStore><MindUserDashboard /></MindStore></MindUserOnlyRoute>} />
                    {/* Mind provider dashboards merged into FindMedi shell (single sidebar) */}
                    <Route path="/mind/counsellor" element={<RoleRoute allowedRoles={['counsellor', 'doctor']}><MindStore><MindCounsellorDashboard /></MindStore></RoleRoute>} />
                    <Route path="/mind/psychiatrist" element={<RoleRoute allowedRoles={['psychiatrist', 'doctor']}><MindStore><MindPsychiatristDashboard /></MindStore></RoleRoute>} />
                    {/* My Wellness inside main dashboard (AppSidebar My Wellness dropdown) */}
                    <Route path="/mind/wellness" element={<MindUserOnlyRoute><MindStore><MindWellness /></MindStore></MindUserOnlyRoute>} />
                    <Route path="/ai-chat" element={<AIChatPage />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/upload" element={<FileUpload />} />

                    {/* Super Admin / ops-console routes.
                         8.md 1: each ops role gets its OWN section, never the
                         whole console - RoleRoute is the UI half of the same
                         least-privilege rule the backend gates enforce. */}
                    <Route path="/superadmin" element={<Navigate to="/superadmin/overview" replace />} />
                    <Route path="/superadmin/overview" element={<RoleRoute allowedRoles={['superadmin']}><SAPlatformKPIs /></RoleRoute>} />
                    <Route path="/superadmin/pending" element={<RoleRoute allowedRoles={['superadmin', 'kyc_reviewer']}><SAPendingApprovals /></RoleRoute>} />
                    <Route path="/superadmin/join-applications" element={<RoleRoute allowedRoles={['superadmin', 'kyc_reviewer']}><SAJoinApplications /></RoleRoute>} />
                    <Route path="/superadmin/onboarding-metrics" element={<RoleRoute allowedRoles={['superadmin']}><SAOnboardingMetrics /></RoleRoute>} />
                    <Route path="/superadmin/kyc-workspace" element={<RoleRoute allowedRoles={['superadmin', 'kyc_reviewer']}><SAKycReviewWorkspace /></RoleRoute>} />
                    <Route path="/superadmin/kyc-workspace/:id" element={<RoleRoute allowedRoles={['superadmin', 'kyc_reviewer']}><SAKycReviewWorkspace /></RoleRoute>} />
                    <Route path="/superadmin/facilities" element={<RoleRoute allowedRoles={['superadmin']}><SAAllFacilities /></RoleRoute>} />
                    <Route path="/superadmin/providers" element={<RoleRoute allowedRoles={['superadmin']}><SAAllFacilities /></RoleRoute>} />
                    <Route path="/superadmin/incident-command" element={<RoleRoute allowedRoles={['superadmin', 'clinical_safety', 'security_admin']}><SAIncidentCommand /></RoleRoute>} />
                    <Route path="/superadmin/stats" element={<RoleRoute allowedRoles={['superadmin']}><SAPlatformStats /></RoleRoute>} />
                    <Route path="/superadmin/users" element={<RoleRoute allowedRoles={['superadmin']}><SAUserManagement /></RoleRoute>} />
                    <Route path="/superadmin/moderation" element={<RoleRoute allowedRoles={['superadmin', 'moderator']}><SAContentModeration /></RoleRoute>} />
                    <Route path="/superadmin/disputes" element={<RoleRoute allowedRoles={['superadmin']}><SADisputes /></RoleRoute>} />
                    <Route path="/superadmin/revenue" element={<RoleRoute allowedRoles={['superadmin', 'finance_admin']}><SARevenue /></RoleRoute>} />
                    <Route path="/superadmin/licenses" element={<RoleRoute allowedRoles={['superadmin', 'compliance_officer']}><SALicenses /></RoleRoute>} />
                    <Route path="/superadmin/categories" element={<RoleRoute allowedRoles={['superadmin', 'catalog_manager']}><SACategories /></RoleRoute>} />
                    <Route path="/superadmin/catalog" element={<RoleRoute allowedRoles={['superadmin', 'catalog_manager']}><SAGlobalCatalog /></RoleRoute>} />
                    <Route path="/superadmin/audit" element={<RoleRoute allowedRoles={['superadmin', 'compliance_officer']}><SAAuditLogs /></RoleRoute>} />
                    <Route path="/audit-logs" element={<ProtectedRoute><SAAuditLogs /></ProtectedRoute>} />
                    <Route path="/superadmin/broadcast" element={<RoleRoute allowedRoles={['superadmin']}><SABroadcast /></RoleRoute>} />
                    <Route path="/superadmin/tickets" element={<RoleRoute allowedRoles={['superadmin', 'support_agent', 'support_l1', 'support_l2']}><SASupportTickets /></RoleRoute>} />
                    <Route path="/superadmin/settings" element={<RoleRoute allowedRoles={['superadmin', 'platform_admin']}><SASystemSettings /></RoleRoute>} />
                    <Route path="/superadmin/team" element={<RoleRoute allowedRoles={['superadmin']}><SASuperAdminTeam /></RoleRoute>} />
                    <Route path="/superadmin/forms" element={<RoleRoute allowedRoles={['superadmin', 'content_editor']}><FormBuilder /></RoleRoute>} />
                    <Route path="/superadmin/print" element={<RoleRoute allowedRoles={['superadmin', 'content_editor']}><PrintStudio /></RoleRoute>} />
                    <Route path="/superadmin/break-glass" element={<RoleRoute allowedRoles={['superadmin', 'dpo', 'clinical_safety', 'support_l2', 'security_admin']}><SABreakGlassQueue /></RoleRoute>} />
                    <Route path="/superadmin/promotions" element={<RoleRoute allowedRoles={['superadmin']}><SAPromotions /></RoleRoute>} />
                    <Route path="/superadmin/loyalty" element={<RoleRoute allowedRoles={['superadmin']}><SALoyaltyRewards /></RoleRoute>} />
                    <Route path="/superadmin/referrals" element={<RoleRoute allowedRoles={['superadmin']}><SAReferralSettings /></RoleRoute>} />
                    <Route path="/superadmin/export" element={<RoleRoute allowedRoles={['superadmin']}><SADataExport /></RoleRoute>} />
                    <Route path="/superadmin/cities" element={<RoleRoute allowedRoles={['superadmin', 'city_manager', 'platform_admin']}><SACities /></RoleRoute>} />
                    <Route path="/superadmin/legal" element={<RoleRoute allowedRoles={['superadmin', 'content_editor']}><SALegal /></RoleRoute>} />
                    <Route path="/superadmin/integrations" element={<RoleRoute allowedRoles={['superadmin', 'platform_admin']}><SAIntegrations /></RoleRoute>} />
                    <Route path="/superadmin/emergency-war-room" element={<RoleRoute allowedRoles={['superadmin']}><SAEmergencyWarRoom /></RoleRoute>} />
                    <Route path="/superadmin/kyc-command" element={<RoleRoute allowedRoles={['superadmin', 'kyc_reviewer']}><SAKycCommand /></RoleRoute>} />
                    <Route path="/superadmin/tax-ledger" element={<RoleRoute allowedRoles={['superadmin', 'finance_admin']}><SATaxLedger /></RoleRoute>} />
                    <Route path="/superadmin/ai-safety" element={<RoleRoute allowedRoles={['superadmin']}><SAAiSafety /></RoleRoute>} />
                    <Route path="/superadmin/ai-reviews" element={<RoleRoute allowedRoles={['superadmin', 'hospital_admin', 'clinical_safety', 'medical_reviewer']}><SAAiReviewQueue /></RoleRoute>} />
                    <Route path="/superadmin/security" element={<RoleRoute allowedRoles={['superadmin', 'security_admin']}><SASecurity /></RoleRoute>} />
                    <Route path="/superadmin/dsr" element={<RoleRoute allowedRoles={['superadmin', 'compliance_officer', 'dpo']}><SADsrQueue /></RoleRoute>} />
                    {/* File 24 Ops CRM & Team Management */}
                    <Route path="/superadmin/crm" element={<RoleRoute allowedRoles={['superadmin', 'platform_admin', 'city_manager']}><CrmCommandCenter /></RoleRoute>} />
                    <Route path="/superadmin/crm/pipeline" element={<RoleRoute allowedRoles={['superadmin', 'platform_admin', 'city_manager']}><SupplyPipeline /></RoleRoute>} />
                    <Route path="/superadmin/crm/accounts" element={<RoleRoute allowedRoles={['superadmin', 'platform_admin', 'city_manager']}><Provider360 /></RoleRoute>} />
                    <Route path="/superadmin/crm/partnerships" element={<RoleRoute allowedRoles={['superadmin', 'platform_admin', 'city_manager']}><Partnerships /></RoleRoute>} />
                    <Route path="/superadmin/crm/field-ops" element={<RoleRoute allowedRoles={['superadmin', 'platform_admin', 'city_manager']}><FieldOps /></RoleRoute>} />
                    <Route path="/superadmin/crm/tasks" element={<RoleRoute allowedRoles={['superadmin', 'platform_admin', 'city_manager']}><CrmTasks /></RoleRoute>} />
                    <Route path="/superadmin/crm/team" element={<RoleRoute allowedRoles={['superadmin', 'platform_admin', 'city_manager']}><TeamManagement /></RoleRoute>} />
                    <Route path="/superadmin/crm/okrs" element={<RoleRoute allowedRoles={['superadmin', 'platform_admin', 'city_manager']}><GoalsOkrs /></RoleRoute>} />
                    <Route path="/superadmin/crm/campaigns" element={<RoleRoute allowedRoles={['superadmin', 'platform_admin', 'city_manager']}><CrmCampaigns /></RoleRoute>} />
                    <Route path="/superadmin/crm/reports" element={<RoleRoute allowedRoles={['superadmin', 'platform_admin', 'city_manager']}><CrmReports /></RoleRoute>} />
                    <Route path="/superadmin/crm/playbooks" element={<RoleRoute allowedRoles={['superadmin', 'platform_admin', 'city_manager']}><CrmPlaybooks /></RoleRoute>} />
                    <Route path="/superadmin/crm/projects" element={<RoleRoute allowedRoles={['superadmin', 'platform_admin', 'city_manager']}><CrmProjectsRoadmap /></RoleRoute>} />
                    <Route path="/superadmin/crm/settings" element={<RoleRoute allowedRoles={['superadmin', 'platform_admin']}><CrmSettings /></RoleRoute>} />

                    {/* Admin routes */}
                    <Route path="/admin/users" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'platform_admin']}><AdminUsers /></RoleRoute>} />
                    <Route path="/admin/doctors" element={<RoleRoute allowedRoles={['hospital_admin']}><AdminDoctors /></RoleRoute>} />
                    <Route path="/admin/prescriptions" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin']}><AdminPrescriptionQueue /></RoleRoute>} />
                    <Route path="/admin/prescription-verification" element={<RoleRoute allowedRoles={['hospital_admin']}><AdminPrescriptionVerificationQueue /></RoleRoute>} />
                    <Route path="/admin/analytics" element={<RoleRoute allowedRoles={['hospital_admin']}><AdminAnalytics /></RoleRoute>} />
                    <Route path="/admin/departments" element={<RoleRoute allowedRoles={['hospital_admin']}><AdminDepartments /></RoleRoute>} />
                    <Route path="/admin/emergency" element={<RoleRoute allowedRoles={['hospital_admin']}><AdminEmergency /></RoleRoute>} />
                    <Route path="/admin/ambulances" element={<RoleRoute allowedRoles={['hospital_admin']}><ManageAmbulancesPage /></RoleRoute>} />
                    <Route path="/admin/reviews" element={<RoleRoute allowedRoles={['hospital_admin', 'medical_reviewer']}><AdminReviews /></RoleRoute>} />
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
                    <Route path="/billing" element={<RoleRoute allowedRoles={['hospital_admin', 'billing_executive', 'cashier', 'front_desk', 'insurance_desk']}><Billing /></RoleRoute>} />
                    <Route path="/verify-transaction" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'doctor', 'clinic_doctor', 'lab_owner', 'pharmacy_owner', 'patient']}><VerifyTransaction /></RoleRoute>} />
                    <Route path="/reports" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor']}><PDFReports /></RoleRoute>} />
                    <Route path="/import-export" element={<RoleRoute allowedRoles={['hospital_admin']}><ImportExport /></RoleRoute>} />
                    <Route path="/lab" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'lab_receptionist', 'lab_technician', 'pathologist']}><Lab /></RoleRoute>} />
                    <Route path="/pharmacy" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'pharmacist', 'pharmacovigilance_officer']}><Pharmacy /></RoleRoute>} />
                    <Route path="/ipd" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse', 'nursing_supervisor', 'matron', 'ward_nurse', 'icu_nurse', 'medical_director', 'cmo', 'surgeon', 'anaesthetist', 'billing_executive']}><IPD /></RoleRoute>} />
                    <Route path="/triage" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse']}><TriagePage /></RoleRoute>} />
                    <Route path="/nursing" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse', 'ward_nurse', 'icu_nurse', 'ot_nurse', 'nursing_supervisor', 'matron', 'infection_control_nurse']}><NursingCharts /></RoleRoute>} />
                    <Route path="/radiology" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'radiologist', 'technician', 'radiology_manager', 'radiology_scheduler', 'radiology_prep_staff', 'mri_technician', 'xray_technician', 'ct_technician', 'us_technician', 'mammo_technician', 'pacs_admin', 'reporting_assistant', 'report_coordinator', 'front_desk', 'receptionist']}><Radiology /></RoleRoute>} />

                    {/* ── Pathology Subroutes ── */}
                    <Route path="/lab/receiving" element={<RoleRoute allowedRoles={['lab_owner', 'lab_receiving', 'lab_technician', 'hospital_admin']}><LabReceivingDashboard /></RoleRoute>} />
                    <Route path="/lab/worklist/:section" element={<RoleRoute allowedRoles={['lab_technician', 'lab_owner', 'biochem_tech', 'hematology_tech', 'clinical_pathology_tech', 'microbiology_tech', 'histopathology_tech', 'cytology_tech', 'serology_tech', 'molecular_tech', 'lab_supervisor']}><LabSectionWorkbench /></RoleRoute>} />
                    <Route path="/lab/verify" element={<RoleRoute allowedRoles={['pathologist', 'lab_owner', 'hospital_admin']}><PathologistVerificationDashboard /></RoleRoute>} />
                    <Route path="/lab/collection" element={<RoleRoute allowedRoles={['phlebotomist', 'home_collection_staff', 'lab_owner']}><PhlebotomistDashboard /></RoleRoute>} />
                    <Route path="/lab/qc" element={<RoleRoute allowedRoles={['lab_owner', 'lab_supervisor', 'quality_officer', 'hospital_admin']}><LabQualityQc /></RoleRoute>} />
                    <Route path="/lab/tracking" element={<RoleRoute allowedRoles={['lab_receptionist', 'lab_technician', 'lab_owner', 'lab_receiving']}><LabSampleTracking /></RoleRoute>} />
                    <Route path="/lab/outsource" element={<RoleRoute allowedRoles={['lab_owner', 'lab_supervisor']}><LabOutsourceDesk /></RoleRoute>} />
                    <Route path="/lab/analytics" element={<RoleRoute allowedRoles={['lab_owner', 'hospital_admin', 'accountant']}><LabReportsAnalytics /></RoleRoute>} />

                    {/* ── Radiology Subroutes ── */}
                    <Route path="/radiology/dashboard" element={<RoleRoute allowedRoles={['hospital_admin', 'radiology_manager', 'radiologist']}><RadiologyDashboard /></RoleRoute>} />
                    <Route path="/radiology/scheduling" element={<RoleRoute allowedRoles={['radiology_scheduler', 'radiology_manager', 'hospital_admin', 'receptionist']}><RadiologyScheduling /></RoleRoute>} />
                    <Route path="/radiology/modalities" element={<RoleRoute allowedRoles={['radiology_manager', 'hospital_admin']}><ModalityMaster /></RoleRoute>} />
                    <Route path="/radiology/mri" element={<RoleRoute allowedRoles={['mri_technician', 'radiologist', 'radiology_manager']}><ModalityDashboard modalityType="MRI" /></RoleRoute>} />
                    <Route path="/radiology/xray" element={<RoleRoute allowedRoles={['xray_technician', 'radiologist', 'radiology_manager']}><ModalityDashboard modalityType="X-Ray" /></RoleRoute>} />
                    <Route path="/radiology/ct" element={<RoleRoute allowedRoles={['ct_technician', 'radiologist', 'radiology_manager']}><ModalityDashboard modalityType="CT" /></RoleRoute>} />
                    <Route path="/radiology/ultrasound" element={<RoleRoute allowedRoles={['us_technician', 'radiologist', 'radiology_manager']}><ModalityDashboard modalityType="Ultrasound" /></RoleRoute>} />
                    <Route path="/radiology/mammography" element={<RoleRoute allowedRoles={['mammo_technician', 'radiologist', 'radiology_manager']}><ModalityDashboard modalityType="Mammography" /></RoleRoute>} />
                    <Route path="/radiology/preparation" element={<RoleRoute allowedRoles={['radiology_prep_staff', 'radiology_scheduler']}><PreparationQueue /></RoleRoute>} />
                    <Route path="/radiology/pacs" element={<RoleRoute allowedRoles={['pacs_admin', 'radiologist', 'radiology_manager']}><PacsDashboard /></RoleRoute>} />
                    <Route path="/radiology/critical" element={<RoleRoute allowedRoles={['radiologist', 'doctor', 'radiology_manager']}><CriticalFindings /></RoleRoute>} />
                    <Route path="/radiology/reports" element={<RoleRoute allowedRoles={['radiologist', 'report_coordinator', 'radiology_manager']}><ReportCenter /></RoleRoute>} />
                    <Route path="/radiology/reception" element={<RoleRoute allowedRoles={['receptionist', 'front_desk']}><ReceptionConsole /></RoleRoute>} />
                    <Route path="/radiology/mis" element={<RoleRoute allowedRoles={['radiology_manager', 'hospital_admin', 'accountant']}><RadiologyMIS /></RoleRoute>} />
                    <Route path="/insurance" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'patient']}><Insurance /></RoleRoute>} />
                    <Route path="/diet" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse', 'dietician_head', 'kitchen_staff']}><DietKitchen /></RoleRoute>} />
                    <Route path="/ot" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'surgeon', 'anaesthetist', 'ot_nurse']}><OperationTheatre /></RoleRoute>} />
                    <Route path="/bloodbank" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse', 'blood_bank_admin']}><BloodBank /></RoleRoute>} />
                    <Route path="/physio" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse', 'rehab_admin']}><Physiotherapy /></RoleRoute>} />
                    <Route path="/mentalhealth" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse']}><MentalHealth /></RoleRoute>} />
                    <Route path="/analytics-reports" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'analyst']}><Reports /></RoleRoute>} />
                    <Route path="/staff" element={<RoleRoute allowedRoles={['hospital_admin']}><Staff /></RoleRoute>} />
                    <Route path="/access-control" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'platform_admin', 'security_admin']}><AccessControl /></RoleRoute>} />
                    <Route path="/inventory" element={<RoleRoute allowedRoles={['hospital_admin', 'store_keeper', 'purchase_officer', 'cssd_technician', 'biomedical_engineer', 'maintenance']}><Inventory /></RoleRoute>} />
                    <Route path="/purchase-center" element={<RoleRoute allowedRoles={['hospital_admin', 'store_keeper', 'purchase_officer', 'accountant', 'clinic_admin', 'clinic_branch_manager', 'superadmin']}><PurchaseCenter /></RoleRoute>} />
                    <Route path="/housekeeping" element={<RoleRoute allowedRoles={['hospital_admin', 'housekeeping_supervisor', 'ward_boy']}><Housekeeping /></RoleRoute>} />
                    <Route path="/opd-token" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse', 'receptionist', 'front_desk', 'call_center_agent']}><OPDToken /></RoleRoute>} />
                    <Route path="/opd-registration" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse']}><OPDRegistration /></RoleRoute>} />
                    <Route path="/patient-registration" element={<RoleRoute allowedRoles={['hospital_admin', 'nurse', 'receptionist', 'front_desk']}><PatientRegistration /></RoleRoute>} />
                    <Route path="/frontdesk" element={<RoleRoute allowedRoles={['hospital_admin', 'receptionist', 'front_desk']}><FrontDesk /></RoleRoute>} />
                    <Route path="/dashboard/v2" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'medical_director', 'cmo']}><HospitalDashboardV2 /></RoleRoute>} />
                    <Route path="/dashboard/overview" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'medical_director', 'cmo']}><DashboardOverviewPage /></RoleRoute>} />
                    <Route path="/dashboard/queue" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'medical_director', 'cmo']}><DashboardQueuePage /></RoleRoute>} />
                    <Route path="/ipd/discharges" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor']}><DischargeDesk /></RoleRoute>} />
                    <Route path="/insurance/desk" element={<RoleRoute allowedRoles={['hospital_admin', 'tpa_agent', 'accountant', 'insurance_desk']}><TpaDesk /></RoleRoute>} />
                    <Route path="/hr/roster" element={<RoleRoute allowedRoles={['hospital_admin', 'hr_manager', 'nursing_supervisor', 'matron']}><RosterPage /></RoleRoute>} />
                    <Route path="/ot/board" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'surgeon', 'anaesthetist', 'ot_technician', 'ot_nurse']}><OtBoard /></RoleRoute>} />
                    <Route path="/lab/ops" element={<RoleRoute allowedRoles={['hospital_admin', 'lab_owner', 'lab_technician', 'pathologist', 'doctor']}><LabOps /></RoleRoute>} />
                    <Route path="/hr/payroll" element={<RoleRoute allowedRoles={['hospital_admin', 'accountant', 'hr_manager']}><PayrollPage /></RoleRoute>} />
                    <Route path="/cssd" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse', 'cssd_technician', 'ot_technician']}><CssdPage /></RoleRoute>} />
                    <Route path="/doctor-consultation" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse', 'surgeon', 'anaesthetist']}><DoctorConsultation /></RoleRoute>} />
                    {/* Files 13–19: platform engines, finance, MIS, contact, hub */}
                    <Route path="/hospital/workflows" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin']}><WorkflowStudio /></RoleRoute>} />
                    <Route path="/hospital/approvals" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'accountant', 'superadmin', 'medical_director', 'cmo', 'billing_executive', 'nursing_supervisor', 'matron', 'hr_manager']}><ApprovalsInbox /></RoleRoute>} />
                    <Route path="/hospital/rules" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin']}><RulesStudio /></RoleRoute>} />
                    <Route path="/hospital/tasks" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse', 'receptionist', 'accountant', 'superadmin', 'front_desk', 'billing_executive', 'hr_manager', 'store_keeper', 'purchase_officer', 'call_center_agent', 'quality_officer', 'nursing_supervisor', 'matron', 'ward_nurse', 'icu_nurse', 'ot_nurse']}><TaskBoard /></RoleRoute>} />
                    <Route path="/hospital/beds" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse', 'receptionist', 'superadmin', 'front_desk', 'nursing_supervisor', 'matron', 'ward_nurse', 'icu_nurse', 'housekeeping_supervisor', 'ward_boy']}><BedBoard /></RoleRoute>} />
                    <Route path="/hospital/masters" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin']}><OpsMasters /></RoleRoute>} />
                    <Route path="/hospital/rcm" element={<RoleRoute allowedRoles={['hospital_admin', 'accountant', 'superadmin']}><RcmDashboard /></RoleRoute>} />
                    <Route path="/hospital/recon" element={<RoleRoute allowedRoles={['hospital_admin', 'accountant', 'superadmin']}><ReconWorkbench /></RoleRoute>} />
                    <Route path="/hospital/enterprise" element={<RoleRoute allowedRoles={['hospital_admin', 'accountant', 'superadmin', 'biomedical_engineer', 'maintenance']}><EnterpriseHub /></RoleRoute>} />
                    <Route path="/hospital/reports" element={<RoleRoute allowedRoles={['hospital_admin', 'accountant', 'doctor', 'superadmin', 'medical_records_officer', 'quality_officer', 'medical_director', 'cmo', 'maternity_admin', 'fertility_admin', 'govt_facility_staff']}><ReportStudioPage /></RoleRoute>} />
                    <Route path="/hospital/kpis" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin']}><KpiDashboard /></RoleRoute>} />
                    <Route path="/hospital/calls" element={<RoleRoute allowedRoles={['hospital_admin', 'receptionist', 'superadmin', 'call_center_agent', 'front_desk']}><CallConsole /></RoleRoute>} />
                    <Route path="/hospital/hub" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin']}><HubBoard /></RoleRoute>} />
                    <Route path="/hospital/safety" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse', 'receptionist', 'superadmin', 'quality_officer', 'pharmacovigilance_officer', 'infection_control_nurse', 'nursing_supervisor', 'matron', 'front_desk', 'clinical_safety', 'auditor']}><SafetyDesk /></RoleRoute>} />
                    <Route path="/hospital/vitals" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse', 'receptionist', 'superadmin', 'front_desk', 'ward_nurse', 'icu_nurse', 'ot_nurse']}><VitalsStation /></RoleRoute>} />
                    <Route path="/hospital/bedside" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse', 'ward_nurse', 'icu_nurse', 'ot_nurse', 'superadmin']}><BedsideScan /></RoleRoute>} />
                    <Route path="/hospital/notify" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin']}><NotifyStudio /></RoleRoute>} />
                    <Route path="/hospital/webhooks" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin']}><WebhookStudio /></RoleRoute>} />
                    <Route path="/hospital/quality" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'quality_officer', 'medical_director', 'cmo']}><QualityBoard /></RoleRoute>} />
                    <Route path="/hospital/biomedical" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'biomedical_engineer', 'maintenance', 'store_keeper']}><BiomedicalDashboard /></RoleRoute>} />
                    <Route path="/hospital/dialysis" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'doctor', 'nurse', 'dialysis_admin']}><DialysisPage /></RoleRoute>} />
                    <Route path="/hospital/linen" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'nurse', 'ward_nurse', 'housekeeping_supervisor', 'ward_boy']}><LinenLaundryPage /></RoleRoute>} />
                    <Route path="/hospital/feedback" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'quality_officer']}><FeedbackDashboard /></RoleRoute>} />
                    <Route path="/hospital/ambulance-trips" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'ambulance']}><AmbulanceTripsPage /></RoleRoute>} />
                    <Route path="/hospital/security" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'security', 'security_admin']}><SecurityDeskPage /></RoleRoute>} />
                    <Route path="/pharmacy/h1-register" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'pharmacist', 'pharmacy_owner']}><H1RegisterPage /></RoleRoute>} />
                    <Route path="/hospital/forms-builder" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'doctor']}><FormBuilderStudio /></RoleRoute>} />
                    <Route path="/hospital/bmw" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'nurse', 'housekeeping_supervisor', 'ward_boy']}><BiomedicalWastePage /></RoleRoute>} />
                    <Route path="/hospital/trial-balance" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'accountant']}><TrialBalancePage /></RoleRoute>} />
                    <Route path="/hospital/parking" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'security', 'security_admin']}><ParkingManagementPage /></RoleRoute>} />
                    <Route path="/hospital/accounting-export" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'accountant', 'finance_admin']}><AccountingExportPage /></RoleRoute>} />
                    <Route path="/hospital/recruitment" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'hr_manager']}><RecruitmentPage /></RoleRoute>} />
                    <Route path="/hospital/canteen" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'nurse', 'dietician_head', 'kitchen_staff']}><CanteenPage /></RoleRoute>} />
                    <Route path="/hospital/payment-gateway" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'finance_admin']}><PaymentGatewaySettings /></RoleRoute>} />
                    <Route path="/hospital/biometric" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'hr_manager']}><BiometricAttendancePage /></RoleRoute>} />
                    <Route path="/hospital/multi-store-checkout" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'pharmacy_owner', 'store_keeper']}><MultiStoreCheckoutPage /></RoleRoute>} />
                    <Route path="/hospital/queue-aging" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'nurse', 'receptionist', 'front_desk']}><QueueAgingDashboard /></RoleRoute>} />
                    <Route path="/hospital/package-billing" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'accountant', 'billing_executive']}><PackageBillingEngine /></RoleRoute>} />
                    <Route path="/hospital/analyzer-emulator" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'lab_technician', 'pathologist']}><LabAnalyzerEmulatorPage /></RoleRoute>} />

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
                    <Route path="/patient/second-opinion" element={<RoleRoute allowedRoles={['patient']}><PatientSecondOpinion /></RoleRoute>} />
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
                    {/* R1: patient dashboard v2 + timeline + privacy (old /patient/* intact) */}
                    <Route path="/patient/home-v2" element={<RoleRoute allowedRoles={['patient']}><PatientDashboardV2 /></RoleRoute>} />
                    <Route path="/patient/home" element={<RoleRoute allowedRoles={['patient']}><PatientDashboard /></RoleRoute>} />
                    <Route path="/patient/timeline" element={<RoleRoute allowedRoles={['patient']}><PatientTimeline /></RoleRoute>} />
                    <Route path="/patient/privacy" element={<RoleRoute allowedRoles={['patient']}><PatientPrivacyCentre /></RoleRoute>} />
                    <Route path="/patient/programs" element={<RoleRoute allowedRoles={['patient']}><PatientPrograms /></RoleRoute>} />
                    <Route path="/patient/rentals" element={<RoleRoute allowedRoles={['patient']}><PatientRentals /></RoleRoute>} />
                    <Route path="/patient/meals" element={<RoleRoute allowedRoles={['patient']}><PatientPrograms /></RoleRoute>} />
                    <Route path="/patient/events" element={<RoleRoute allowedRoles={['patient']}><PatientEvents /></RoleRoute>} />
                    <Route path="/patient/vaccinations" element={<RoleRoute allowedRoles={['patient']}><PatientVaccinations /></RoleRoute>} />
                    <Route path="/patient/insurance" element={<RoleRoute allowedRoles={['patient']}><PatientInsurance /></RoleRoute>} />
                    <Route path="/patient/wellness" element={<RoleRoute allowedRoles={['patient']}><PatientWellness /></RoleRoute>} />
                    <Route path="/patient/consents" element={<RoleRoute allowedRoles={['patient']}><PatientConsents /></RoleRoute>} />
                    <Route path="/patient/emergency-card" element={<RoleRoute allowedRoles={['patient']}><PatientEmergencyCard /></RoleRoute>} />
                    <Route path="/patient/saved" element={<RoleRoute allowedRoles={['patient']}><PatientFavorites /></RoleRoute>} />

                    {/* Doctor routes */}
                    <Route path="/doctor/appointments/approve" element={<RoleRoute allowedRoles={['doctor', 'hospital_admin']}><DoctorAppointments /></RoleRoute>} />
                    <Route path="/doctor/appointments/upcoming" element={<RoleRoute allowedRoles={['doctor', 'hospital_admin']}><DoctorAppointments /></RoleRoute>} />
                    <Route path="/doctor/appointments/history" element={<RoleRoute allowedRoles={['doctor', 'hospital_admin']}><DoctorAppointments /></RoleRoute>} />
                    <Route path="/doctor/appointments/approved" element={<RoleRoute allowedRoles={['doctor', 'hospital_admin']}><DoctorAppointments /></RoleRoute>} />
                    <Route path="/doctor/appointments" element={<RoleRoute allowedRoles={['doctor', 'hospital_admin']}><DoctorAppointments /></RoleRoute>} />
                    <Route path="/doctor/online-appointments" element={<RoleRoute allowedRoles={['doctor', 'hospital_admin']}><DoctorOnlineAppointments /></RoleRoute>} />
                    <Route path="/doctor/home-visit" element={<RoleRoute allowedRoles={['doctor', 'hospital_admin']}><DoctorInPersonAppointments /></RoleRoute>} />
                    <Route path="/doctor/in-person" element={<RoleRoute allowedRoles={['doctor', 'hospital_admin']}><DoctorInPersonAppointments /></RoleRoute>} />
                    <Route path="/doctor/chat" element={<RoleRoute allowedRoles={['doctor', 'hospital_admin']}><ChatPage /></RoleRoute>} />
                    <Route path="/doctor/calls" element={<RoleRoute allowedRoles={['doctor', 'hospital_admin']}><DoctorCalls /></RoleRoute>} />
                    <Route path="/doctor/call/:appointmentId" element={<RoleRoute allowedRoles={['doctor', 'clinic_doctor']}><DoctorCallRoom /></RoleRoute>} />
                    <Route path="/doctor/call-room/:appointmentId" element={<RoleRoute allowedRoles={['doctor', 'clinic_doctor']}><DoctorCallRoom /></RoleRoute>} />
                    <Route path="/doctor/video-calls" element={<RoleRoute allowedRoles={['doctor', 'hospital_admin']}><DoctorVideoCalls /></RoleRoute>} />
                    <Route path="/doctor/video-call/:appointmentId" element={<RoleRoute allowedRoles={['doctor', 'clinic_doctor']}><DoctorVideoCallRoom /></RoleRoute>} />
                    <Route path="/doctor/video-call-room/:appointmentId" element={<RoleRoute allowedRoles={['doctor', 'clinic_doctor']}><DoctorVideoCallRoom /></RoleRoute>} />
                    <Route path="/doctor/patients" element={<RoleRoute allowedRoles={['doctor']}><DoctorPatients /></RoleRoute>} />
                    <Route path="/doctor/consultations" element={<RoleRoute allowedRoles={['doctor']}><DoctorConsultations /></RoleRoute>} />
                    <Route path="/doctor/reviews" element={<RoleRoute allowedRoles={['doctor']}><DoctorReviews /></RoleRoute>} />
                    <Route path="/doctor/earnings" element={<RoleRoute allowedRoles={['doctor']}><DoctorEarnings /></RoleRoute>} />
                    <Route path="/doctor/analytics" element={<RoleRoute allowedRoles={['doctor']}><DoctorAnalytics /></RoleRoute>} />
                    <Route path="/doctor/refunds" element={<RoleRoute allowedRoles={['doctor']}><DoctorRefunds /></RoleRoute>} />
                    <Route path="/doctor/schedule" element={<RoleRoute allowedRoles={['doctor']}><DoctorScheduleEdit /></RoleRoute>} />
                    <Route path="/doctor/test-results" element={<RoleRoute allowedRoles={['doctor']}><DoctorTestResults /></RoleRoute>} />
                    <Route path="/doctor/results" element={<RoleRoute allowedRoles={['doctor', 'clinic_doctor']}><ResultsInbox /></RoleRoute>} />
                    <Route path="/doctor/queue" element={<RoleRoute allowedRoles={['doctor', 'clinic_doctor']}><DoctorQueue /></RoleRoute>} />
                    <Route path="/doctor/referrals" element={<RoleRoute allowedRoles={['doctor', 'clinic_doctor']}><ReferralsInbox /></RoleRoute>} />
                    <Route path="/doctor/workspace/:encounterId" element={<RoleRoute allowedRoles={['doctor', 'clinic_doctor']}><EmrWorkspace /></RoleRoute>} />
                    <Route path="/doctor/earnings/statement" element={<RoleRoute allowedRoles={['doctor', 'clinic_doctor']}><EarningsStatement /></RoleRoute>} />
                    <Route path="/doctor/cases" element={<RoleRoute allowedRoles={['doctor', 'clinic_doctor', 'hospital_admin']}><CaseBoard /></RoleRoute>} />
                    <Route path="/icu/chart" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse']}><IcuChart /></RoleRoute>} />
                    <Route path="/diet/sheet" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse']}><DietKitchenSheet /></RoleRoute>} />
                    <Route path="/mortuary" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse', 'mortuary_attendant', 'nursing_supervisor', 'matron']}><MortuaryPage /></RoleRoute>} />
                    <Route path="/oncology" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse']}><OncologyPage /></RoleRoute>} />
                    <Route path="/doctor/emergency" element={<RoleRoute allowedRoles={['doctor']}><DoctorEmergency /></RoleRoute>} />
                    <Route path="/doctor/prescriptions" element={<RoleRoute allowedRoles={['doctor']}><DoctorPrescriptions /></RoleRoute>} />
                    <Route path="/doctor/leave-requests" element={<RoleRoute allowedRoles={['doctor']}><DoctorLeaveRequests /></RoleRoute>} />
                    <Route path="/doctor/profile" element={<RoleRoute allowedRoles={['doctor']}><DoctorProfile /></RoleRoute>} />

                    {/* Counsellor routes — sirf online + counsellor-related (offline/tests/prescriptions nahi) */}
                    <Route path="/counsellor/online-appointments" element={<RoleRoute allowedRoles={['counsellor']}><DoctorOnlineAppointments /></RoleRoute>} />
                    <Route path="/counsellor/chat" element={<RoleRoute allowedRoles={['counsellor']}><ChatPage /></RoleRoute>} />
                    <Route path="/counsellor/calls" element={<RoleRoute allowedRoles={['counsellor']}><DoctorCalls /></RoleRoute>} />
                    <Route path="/counsellor/call/:appointmentId" element={<RoleRoute allowedRoles={['counsellor']}><DoctorCallRoom /></RoleRoute>} />
                    <Route path="/counsellor/call-room/:appointmentId" element={<RoleRoute allowedRoles={['counsellor']}><DoctorCallRoom /></RoleRoute>} />
                    <Route path="/counsellor/video-calls" element={<RoleRoute allowedRoles={['counsellor']}><DoctorVideoCalls /></RoleRoute>} />
                    <Route path="/counsellor/video-call/:appointmentId" element={<RoleRoute allowedRoles={['counsellor']}><DoctorVideoCallRoom /></RoleRoute>} />
                    <Route path="/counsellor/video-call-room/:appointmentId" element={<RoleRoute allowedRoles={['counsellor']}><DoctorVideoCallRoom /></RoleRoute>} />
                    <Route path="/counsellor/patients" element={<RoleRoute allowedRoles={['counsellor']}><DoctorPatients /></RoleRoute>} />
                    <Route path="/counsellor/consultations" element={<RoleRoute allowedRoles={['counsellor']}><DoctorConsultations /></RoleRoute>} />
                    <Route path="/counsellor/reviews" element={<RoleRoute allowedRoles={['counsellor']}><DoctorReviews /></RoleRoute>} />
                    <Route path="/counsellor/earnings" element={<RoleRoute allowedRoles={['counsellor']}><DoctorEarnings /></RoleRoute>} />
                    <Route path="/counsellor/schedule" element={<RoleRoute allowedRoles={['counsellor']}><DoctorScheduleEdit /></RoleRoute>} />
                    <Route path="/counsellor/emergency" element={<RoleRoute allowedRoles={['counsellor']}><DoctorEmergency /></RoleRoute>} />
                    <Route path="/counsellor/leave-requests" element={<RoleRoute allowedRoles={['counsellor']}><DoctorLeaveRequests /></RoleRoute>} />
                    <Route path="/counsellor/profile" element={<RoleRoute allowedRoles={['counsellor']}><DoctorProfile /></RoleRoute>} />

                    {/* Psychiatrist routes — doctor wale sections reuse */}
                    <Route path="/psychiatrist/appointments/approve" element={<RoleRoute allowedRoles={['psychiatrist']}><DoctorAppointments /></RoleRoute>} />
                    <Route path="/psychiatrist/appointments/upcoming" element={<RoleRoute allowedRoles={['psychiatrist']}><DoctorAppointments /></RoleRoute>} />
                    <Route path="/psychiatrist/appointments/history" element={<RoleRoute allowedRoles={['psychiatrist']}><DoctorAppointments /></RoleRoute>} />
                    <Route path="/psychiatrist/appointments/approved" element={<RoleRoute allowedRoles={['psychiatrist']}><DoctorAppointments /></RoleRoute>} />
                    <Route path="/psychiatrist/appointments" element={<RoleRoute allowedRoles={['psychiatrist']}><DoctorAppointments /></RoleRoute>} />
                    <Route path="/psychiatrist/online-appointments" element={<RoleRoute allowedRoles={['psychiatrist']}><DoctorOnlineAppointments /></RoleRoute>} />
                    <Route path="/psychiatrist/home-visit" element={<RoleRoute allowedRoles={['psychiatrist']}><DoctorInPersonAppointments /></RoleRoute>} />
                    <Route path="/psychiatrist/in-person" element={<RoleRoute allowedRoles={['psychiatrist']}><DoctorInPersonAppointments /></RoleRoute>} />
                    <Route path="/psychiatrist/chat" element={<RoleRoute allowedRoles={['psychiatrist']}><ChatPage /></RoleRoute>} />
                    <Route path="/psychiatrist/calls" element={<RoleRoute allowedRoles={['psychiatrist']}><DoctorCalls /></RoleRoute>} />
                    <Route path="/psychiatrist/call/:appointmentId" element={<RoleRoute allowedRoles={['psychiatrist']}><DoctorCallRoom /></RoleRoute>} />
                    <Route path="/psychiatrist/call-room/:appointmentId" element={<RoleRoute allowedRoles={['psychiatrist']}><DoctorCallRoom /></RoleRoute>} />
                    <Route path="/psychiatrist/video-calls" element={<RoleRoute allowedRoles={['psychiatrist']}><DoctorVideoCalls /></RoleRoute>} />
                    <Route path="/psychiatrist/video-call/:appointmentId" element={<RoleRoute allowedRoles={['psychiatrist']}><DoctorVideoCallRoom /></RoleRoute>} />
                    <Route path="/psychiatrist/video-call-room/:appointmentId" element={<RoleRoute allowedRoles={['psychiatrist']}><DoctorVideoCallRoom /></RoleRoute>} />
                    <Route path="/psychiatrist/patients" element={<RoleRoute allowedRoles={['psychiatrist']}><DoctorPatients /></RoleRoute>} />
                    <Route path="/psychiatrist/consultations" element={<RoleRoute allowedRoles={['psychiatrist']}><DoctorConsultations /></RoleRoute>} />
                    <Route path="/psychiatrist/reviews" element={<RoleRoute allowedRoles={['psychiatrist']}><DoctorReviews /></RoleRoute>} />
                    <Route path="/psychiatrist/earnings" element={<RoleRoute allowedRoles={['psychiatrist']}><DoctorEarnings /></RoleRoute>} />
                    <Route path="/psychiatrist/schedule" element={<RoleRoute allowedRoles={['psychiatrist']}><DoctorScheduleEdit /></RoleRoute>} />
                    <Route path="/psychiatrist/test-results" element={<RoleRoute allowedRoles={['psychiatrist']}><DoctorTestResults /></RoleRoute>} />
                    <Route path="/psychiatrist/emergency" element={<RoleRoute allowedRoles={['psychiatrist']}><DoctorEmergency /></RoleRoute>} />
                    <Route path="/psychiatrist/prescriptions" element={<RoleRoute allowedRoles={['psychiatrist']}><DoctorPrescriptions /></RoleRoute>} />
                    <Route path="/psychiatrist/leave-requests" element={<RoleRoute allowedRoles={['psychiatrist']}><DoctorLeaveRequests /></RoleRoute>} />
                    <Route path="/psychiatrist/profile" element={<RoleRoute allowedRoles={['psychiatrist']}><DoctorProfile /></RoleRoute>} />

                    {/* Clinic Doctor routes — CLINIC_ROLES is declared at module scope */}
                    <Route path="/clinic/dashboard" element={<RoleRoute allowedRoles={CLINIC_ROLES}><ClinicDashboard /></RoleRoute>} />
                    <Route path="/clinic/admin" element={<RoleRoute allowedRoles={['clinic_admin', 'superadmin']}><ClinicAdminDashboard /></RoleRoute>} />
                    <Route path="/clinic/doctor" element={<RoleRoute allowedRoles={['clinic_doctor', 'doctor', 'superadmin']}><ClinicDoctorDashboard /></RoleRoute>} />
                    <Route path="/clinic/reception" element={<RoleRoute allowedRoles={['clinic_receptionist', 'receptionist', 'clinic_admin', 'superadmin']}><ClinicReceptionDashboard /></RoleRoute>} />
                    <Route path="/clinic/cashier" element={<RoleRoute allowedRoles={['clinic_cashier', 'clinic_accountant', 'cashier', 'clinic_admin', 'superadmin']}><ClinicCashierDashboard /></RoleRoute>} />
                    <Route path="/clinic/nurse" element={<RoleRoute allowedRoles={['clinic_nurse', 'nurse', 'clinic_admin', 'superadmin']}><ClinicNurseDashboard /></RoleRoute>} />
                    <Route path="/clinic/branch-manager" element={<RoleRoute allowedRoles={['clinic_branch_manager', 'clinic_admin', 'superadmin']}><ClinicBranchManagerDashboard /></RoleRoute>} />
                    <Route path="/clinic/telemed-coordinator" element={<RoleRoute allowedRoles={['clinic_telemed_coordinator', 'clinic_admin', 'superadmin']}><ClinicTelemedCoordinatorDashboard /></RoleRoute>} />
<Route path="/clinic/overview" element={<RoleRoute allowedRoles={CLINIC_ROLES}><ClinicOverview /></RoleRoute>} />
<Route path="/clinic/appointments/approve" element={<RoleRoute allowedRoles={CLINIC_ROLES}><ClinicAppointments /></RoleRoute>} />
<Route path="/clinic/appointments/upcoming" element={<RoleRoute allowedRoles={CLINIC_ROLES}><ClinicAppointments /></RoleRoute>} />
<Route path="/clinic/appointments/history" element={<RoleRoute allowedRoles={CLINIC_ROLES}><ClinicAppointments /></RoleRoute>} />
                    <Route path="/clinic/appointments/approved" element={<RoleRoute allowedRoles={CLINIC_ROLES}><DoctorAppointments /></RoleRoute>} />
                    <Route path="/clinic/chat" element={<RoleRoute allowedRoles={CLINIC_ROLES}><ChatPage /></RoleRoute>} />
                    <Route path="/clinic/calls" element={<RoleRoute allowedRoles={CLINIC_ROLES}><DoctorCalls /></RoleRoute>} />
                    <Route path="/clinic/video-calls" element={<RoleRoute allowedRoles={CLINIC_ROLES}><DoctorVideoCalls /></RoleRoute>} />
<Route path="/clinic/appointments" element={<RoleRoute allowedRoles={CLINIC_ROLES}><ClinicAppointments /></RoleRoute>} />
<Route path="/clinic/online-appointments" element={<RoleRoute allowedRoles={CLINIC_ROLES}><DoctorOnlineAppointments /></RoleRoute>} />
<Route path="/clinic/home-visit" element={<RoleRoute allowedRoles={CLINIC_ROLES}><DoctorInPersonAppointments /></RoleRoute>} />
<Route path="/clinic/in-person" element={<RoleRoute allowedRoles={CLINIC_ROLES}><DoctorInPersonAppointments /></RoleRoute>} />
<Route path="/clinic/schedule" element={<RoleRoute allowedRoles={CLINIC_ROLES}><ClinicSchedule /></RoleRoute>} />
<Route path="/clinic/fees" element={<RoleRoute allowedRoles={CLINIC_ROLES}><ClinicFees /></RoleRoute>} />
<Route path="/clinic/patients" element={<RoleRoute allowedRoles={CLINIC_ROLES}><ClinicPatients /></RoleRoute>} />
<Route path="/clinic/prescriptions" element={<RoleRoute allowedRoles={CLINIC_ROLES}><ClinicPrescriptions /></RoleRoute>} />
<Route path="/clinic/tests" element={<RoleRoute allowedRoles={CLINIC_ROLES}><ClinicTests /></RoleRoute>} />
<Route path="/clinic/consultations" element={<RoleRoute allowedRoles={CLINIC_ROLES}><ClinicConsultations /></RoleRoute>} />
<Route path="/clinic/management" element={<RoleRoute allowedRoles={CLINIC_ROLES}><ClinicManagement /></RoleRoute>} />
<Route path="/clinic/billing" element={<RoleRoute allowedRoles={CLINIC_ROLES}><ClinicBilling /></RoleRoute>} />
<Route path="/clinic/earnings" element={<RoleRoute allowedRoles={CLINIC_ROLES}><ClinicEarnings /></RoleRoute>} />
<Route path="/clinic/reviews" element={<RoleRoute allowedRoles={CLINIC_ROLES}><ClinicReviews /></RoleRoute>} />
<Route path="/clinic/settings" element={<RoleRoute allowedRoles={CLINIC_ROLES}><AdminClinicSettings /></RoleRoute>} />
<Route path="/clinic/platform-settings" element={<RoleRoute allowedRoles={CLINIC_ROLES}><ClinicPlatformSettings /></RoleRoute>} />
                    <Route path="/clinic/staff" element={<RoleRoute allowedRoles={CLINIC_ROLES}><ClinicStaff /></RoleRoute>} />
                    <Route path="/clinic/inventory" element={<RoleRoute allowedRoles={CLINIC_ROLES}><ClinicInventory /></RoleRoute>} />
                    <Route path="/clinic/packages" element={<RoleRoute allowedRoles={CLINIC_ROLES}><ClinicPackages /></RoleRoute>} />
                    <Route path="/clinic/branches" element={<RoleRoute allowedRoles={CLINIC_ROLES}><ClinicBranches /></RoleRoute>} />
<Route path="/clinic/certificates" element={<RoleRoute allowedRoles={CLINIC_ROLES}><ClinicCertificates /></RoleRoute>} />
                    <Route path="/paed/growth-charts" element={<RoleRoute allowedRoles={CLINIC_ROLES}><GrowthCharts /></RoleRoute>} />
                    <Route path="/paed/vaccination-alerts" element={<RoleRoute allowedRoles={CLINIC_ROLES}><VaccinationAlerts /></RoleRoute>} />
                    <Route path="/paed/partogram" element={<RoleRoute allowedRoles={CLINIC_ROLES}><Partogram /></RoleRoute>} />
                    <Route path="/paed/newborn-screening" element={<RoleRoute allowedRoles={CLINIC_ROLES}><NewbornScreening /></RoleRoute>} />
                    <Route path="/pdf-worker" element={<RoleRoute allowedRoles={CLINIC_ROLES}><PdfWorker /></RoleRoute>} />
<Route path="/clinic/notifications" element={<RoleRoute allowedRoles={CLINIC_ROLES}><ClinicNotifications /></RoleRoute>} />
<Route path="/clinic/test-requests" element={<RoleRoute allowedRoles={CLINIC_ROLES}><ClinicTestRequests /></RoleRoute>} />
<Route path="/clinic/payment-history" element={<RoleRoute allowedRoles={CLINIC_ROLES}><ClinicPaymentHistory /></RoleRoute>} />
<Route path="/clinic/analytics" element={<RoleRoute allowedRoles={CLINIC_ROLES}><ClinicAnalytics /></RoleRoute>} />
<Route path="/clinic/inventory" element={<RoleRoute allowedRoles={CLINIC_ROLES}><ClinicInventory /></RoleRoute>} />

                    {/* Delivery Partner routes */}
                    <Route path="/delivery/dashboard" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/delivery/orders" element={<RoleRoute allowedRoles={['delivery_boy']}><DeliveryOrders /></RoleRoute>} />
                    <Route path="/delivery/deliveries" element={<Navigate to="/delivery/orders" replace />} />
                    <Route path="/delivery/history" element={<RoleRoute allowedRoles={['delivery_boy']}><DeliveryHistory /></RoleRoute>} />
                    <Route path="/delivery/earnings" element={<RoleRoute allowedRoles={['delivery_boy']}><DeliveryEarnings /></RoleRoute>} />
                    <Route path="/delivery/zone" element={<RoleRoute allowedRoles={['delivery_boy']}><DeliveryZone /></RoleRoute>} />
                    <Route path="/delivery/reviews" element={<RoleRoute allowedRoles={['delivery_boy']}><DeliveryReviews /></RoleRoute>} />
                    <Route path="/delivery/documents" element={<RoleRoute allowedRoles={['delivery_boy']}><DeliveryDocuments /></RoleRoute>} />
                    <Route path="/delivery/settings" element={<RoleRoute allowedRoles={['delivery_boy']}><DeliverySettings /></RoleRoute>} />
                    <Route path="/delivery/profile" element={<Navigate to="/delivery/settings" replace />} />

                    {/* Rider Partner routes */}
                    <Route path="/rider/dashboard" element={<RoleRoute allowedRoles={['rider']}><RiderDashboard /></RoleRoute>} />
                    <Route path="/rider/requests" element={<Navigate to="/rider/dashboard?tab=requests" replace />} />
                    <Route path="/rider/active" element={<Navigate to="/rider/dashboard?tab=active" replace />} />
                    <Route path="/rider/earnings" element={<Navigate to="/rider/dashboard?tab=earnings" replace />} />
                    <Route path="/rider/history" element={<Navigate to="/rider/dashboard?tab=history" replace />} />
                    <Route path="/rider/vehicle" element={<Navigate to="/rider/dashboard?tab=vehicle" replace />} />
                    <Route path="/rider/documents" element={<Navigate to="/rider/dashboard?tab=documents" replace />} />
                    <Route path="/rider/reviews" element={<Navigate to="/rider/dashboard?tab=ratings" replace />} />
                    <Route path="/rider/settings" element={<Navigate to="/rider/dashboard?tab=settings" replace />} />

                    {/* Ambulance driver routes (Doc 02 §5.1) */}
                    <Route path="/ambulance/dashboard" element={<RoleRoute allowedRoles={['ambulance']}><AmbulanceDashboard /></RoleRoute>} />
                    <Route path="/ambulance/jobs" element={<RoleRoute allowedRoles={['ambulance']}><AmbulanceJobs /></RoleRoute>} />

                    {/* Assistant Partner routes */}
                    <Route path="/assistant/dashboard" element={<RoleRoute allowedRoles={['assistant']}><AssistantDashboard /></RoleRoute>} />
                    <Route path="/assistant/requests" element={<Navigate to="/assistant/dashboard?tab=requests" replace />} />
                    <Route path="/assistant/active" element={<Navigate to="/assistant/dashboard?tab=active" replace />} />
                    <Route path="/assistant/history" element={<Navigate to="/assistant/dashboard?tab=history" replace />} />
                    <Route path="/assistant/earnings" element={<Navigate to="/assistant/dashboard?tab=earnings" replace />} />
                    <Route path="/assistant/profile" element={<Navigate to="/assistant/dashboard?tab=profile" replace />} />

                    {/* Lawyer / Advocate Partner routes */}
                    <Route path="/lawyer/dashboard" element={<RoleRoute allowedRoles={['lawyer']}><LawyerDashboard /></RoleRoute>} />
                    <Route path="/lawyer/requests" element={<Navigate to="/lawyer/dashboard?tab=requests" replace />} />
                    <Route path="/lawyer/cases" element={<Navigate to="/lawyer/dashboard?tab=cases" replace />} />
                    <Route path="/lawyer/active" element={<Navigate to="/lawyer/dashboard?tab=active" replace />} />
                    <Route path="/lawyer/history" element={<Navigate to="/lawyer/dashboard?tab=cases" replace />} />
                    <Route path="/lawyer/earnings" element={<Navigate to="/lawyer/dashboard?tab=earnings" replace />} />
                    <Route path="/lawyer/profile" element={<Navigate to="/lawyer/dashboard?tab=profile" replace />} />

                    {/* R1: thin role dashboards over RoleDashboardShell */}
                    <Route path="/dashboard/dentist" element={<DentistDashboard />} />
                    <Route path="/dashboard/dietitian" element={<DietitianDashboard />} />
                    <Route path="/dashboard/physio" element={<PhysioDashboard />} />
                    <Route path="/dashboard/yoga" element={<YogaStudioDashboard />} />
                    <Route path="/dashboard/gym" element={<GymDashboard />} />
                    <Route path="/dashboard/equipment" element={<EquipmentVendorDashboard />} />
                    <Route path="/dashboard/events" element={<EventOrganizerDashboard />} />
                    <Route path="/dashboard/phlebotomist" element={<PhlebotomistDashboard />} />

                    {/* Wave 2: 10 missing role dashboards */}
                    <Route path="/dashboard/hod" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'surgeon', 'anaesthetist', 'medical_director', 'cmo']}><HodDashboard /></RoleRoute>} />
                    <Route path="/dashboard/opd-coordinator" element={<RoleRoute allowedRoles={['hospital_admin', 'receptionist', 'front_desk', 'nurse']}><OpdCoordinatorDashboard /></RoleRoute>} />
                    <Route path="/dashboard/resident" element={<RoleRoute allowedRoles={['hospital_admin', 'doctor', 'nurse']}><ResidentDashboard /></RoleRoute>} />
                    <Route path="/dashboard/admission-coordinator" element={<RoleRoute allowedRoles={['hospital_admin', 'receptionist', 'front_desk', 'insurance_desk', 'tpa_agent']}><AdmissionCoordinatorDashboard /></RoleRoute>} />
                    <Route path="/dashboard/bed-manager" element={<RoleRoute allowedRoles={['hospital_admin', 'nursing_supervisor', 'matron', 'receptionist', 'front_desk']}><BedManagerDashboard /></RoleRoute>} />
                    <Route path="/dashboard/corporate-billing" element={<RoleRoute allowedRoles={['hospital_admin', 'accountant', 'billing_executive', 'insurance_desk', 'finance_admin']}><CorporateBillingDashboard /></RoleRoute>} />
                    <Route path="/dashboard/patient-relations" element={<RoleRoute allowedRoles={['hospital_admin', 'quality_officer', 'support_agent', 'call_center_agent']}><PatientRelationsDashboard /></RoleRoute>} />
                    <Route path="/dashboard/facility-manager" element={<RoleRoute allowedRoles={['hospital_admin', 'biomedical_engineer', 'maintenance', 'store_keeper']}><FacilityManagerDashboard /></RoleRoute>} />
                    <Route path="/dashboard/auditor" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'auditor', 'compliance_officer', 'dpo']}><AuditorDashboard /></RoleRoute>} />
                    <Route path="/dashboard/medical-superintendent" element={<RoleRoute allowedRoles={['hospital_admin', 'superadmin', 'medical_director', 'cmo']}><MedicalSuperintendentDashboard /></RoleRoute>} />

                    {/* File 07: Specialty & Platform Role Dashboards */}
                    <Route path="/dashboard/optician" element={<RoleRoute allowedRoles={['optician', 'optical_shop_owner', 'doctor', 'hospital_admin', 'superadmin']}><OpticianDashboard /></RoleRoute>} />
                    <Route path="/dashboard/home-nursing" element={<RoleRoute allowedRoles={['home_nursing_admin', 'nurse', 'hospital_admin', 'superadmin']}><HomeNursingDashboard /></RoleRoute>} />
                    <Route path="/dashboard/wellness" element={<RoleRoute allowedRoles={['wellness_admin', 'therapist', 'hospital_admin', 'superadmin']}><WellnessDashboard /></RoleRoute>} />
                    <Route path="/dashboard/product-vendor" element={<RoleRoute allowedRoles={['product_vendor', 'pharmacy_owner', 'superadmin']}><ProductVendorDashboard /></RoleRoute>} />
                    <Route path="/dashboard/support-group" element={<RoleRoute allowedRoles={['group_host', 'counsellor', 'psychiatrist', 'doctor', 'superadmin']}><SupportGroupHostDashboard /></RoleRoute>} />
                    <Route path="/dashboard/trainer-org" element={<RoleRoute allowedRoles={['trainer_org', 'hospital_admin', 'superadmin']}><TrainerOrgDashboard /></RoleRoute>} />
                    <Route path="/dashboard/blood-bank-admin" element={<RoleRoute allowedRoles={['blood_bank_admin', 'hospital_admin', 'superadmin']}><BloodBankAdminDashboard /></RoleRoute>} />
                    <Route path="/dashboard/dialysis-admin" element={<RoleRoute allowedRoles={['dialysis_admin', 'hospital_admin', 'superadmin']}><DialysisAdminDashboard /></RoleRoute>} />
                    <Route path="/dashboard/ivf-maternity" element={<RoleRoute allowedRoles={['fertility_admin', 'maternity_admin', 'hospital_admin', 'superadmin']}><IvfMaternityDashboard /></RoleRoute>} />
                    <Route path="/dashboard/rehab-admin" element={<RoleRoute allowedRoles={['rehab_admin', 'psychiatrist', 'counsellor', 'hospital_admin', 'superadmin']}><RehabAdminDashboard /></RoleRoute>} />
                    <Route path="/dashboard/govt-facility" element={<RoleRoute allowedRoles={['govt_facility_staff', 'hospital_admin', 'superadmin']}><GovtFacilityDashboard /></RoleRoute>} />
                    <Route path="/dashboard/tpa-agent" element={<RoleRoute allowedRoles={['tpa_agent', 'hospital_admin', 'superadmin']}><TpaAgentDashboard /></RoleRoute>} />
                    <Route path="/dashboard/content-editor" element={<RoleRoute allowedRoles={['content_editor', 'medical_reviewer', 'superadmin']}><ContentEditorDashboard /></RoleRoute>} />
                    <Route path="/dashboard/moderator" element={<RoleRoute allowedRoles={['moderator', 'support_agent', 'support_l1', 'support_l2', 'superadmin']}><ModeratorDashboard /></RoleRoute>} />
                    <Route path="/dashboard/finance-admin" element={<RoleRoute allowedRoles={['finance_admin', 'accountant', 'superadmin']}><FinanceAdminDashboard /></RoleRoute>} />
                    <Route path="/dashboard/compliance-kyc" element={<RoleRoute allowedRoles={['compliance_officer', 'kyc_reviewer', 'superadmin']}><ComplianceKycDashboard /></RoleRoute>} />
                    </Route>

                   <Route path="/register/delivery-partner" element={<DeliveryPartnerRegister />} />

                   {/* Super Admin Delivery Oversight */}
                   <Route path="/superadmin/delivery-partners" element={<RoleRoute allowedRoles={['superadmin']}><SuperAdminDeliveryPartners /></RoleRoute>} />

                   <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              </AppMotion>
            </LenisScroll>
        </TooltipProvider>
        </VideoCallProvider>
        </AudioCallProvider>
        </CartProvider>
        </PreferredPharmacyProvider>
      </NotificationProvider>
      </HashRouter>
    </ReduxAuthProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
