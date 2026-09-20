import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Index from "./pages/Index";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import Counselling from "./pages/Counselling";
import SessionSchedule from "./pages/SessionSchedule";
import ResourceHub from "./pages/ResourceHub";
import PeerSupport from "./pages/PeerSupport";
import AdminDashboard from "./pages/AdminDashboard";
import MyWellness from "./pages/MyWellness";
import DataPolicy from "./pages/PrivacyPolicy";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import GoogleAuthSuccess from "./pages/GoogleAuthSuccess";
import IntakeFormPage from "./pages/IntakeFormPage";
import Dashboard from "./pages/Dashboard";
import UserDashboard from "./pages/UserDashboard";
import CounsellorDashboard from "./pages/CounsellorDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import MotionProvider from "./components/MotionProvider";
const App = () => (<ThemeProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <MotionProvider>
              <Routes>
            <Route path="/" element={<Index />}/>
            <Route path="/book" element={<Counselling />}/>
            <Route path="/counselling" element={<Counselling />}/>
            <Route path="/counselling/:counsellorId" element={<Counselling />}/>
            <Route path="/session-schedule" element={<ProtectedRoute roles={["user"]}>
                  <SessionSchedule />
                </ProtectedRoute>}/>
            <Route path="/resources" element={<ResourceHub />}/>
            <Route path="/peer" element={<ProtectedRoute roles={["user", "admin"]}>
                  <PeerSupport />
                </ProtectedRoute>}/>
            <Route path="/admin" element={<ProtectedRoute roles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>}/>
            <Route path="/wellness" element={<ProtectedRoute roles={["user", "admin"]}>
                  <MyWellness />
                </ProtectedRoute>}/>
            <Route path="/legal" element={<DataPolicy />} />
            <Route path="/dashboard" element={<ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>}/>
            <Route path="/user" element={<ProtectedRoute roles={["user"]}>
                  <UserDashboard />
                </ProtectedRoute>}/>
            <Route path="/counsellor" element={<ProtectedRoute roles={["counsellor"]}>
                  <CounsellorDashboard />
                </ProtectedRoute>}/>
            <Route path="/signup" element={<Signup />}/>
            <Route path="/login" element={<Login />}/>
            <Route path="/auth/google/success" element={<GoogleAuthSuccess />}/>
            <Route path="/forgot-password" element={<ForgotPassword />}/>
            <Route path="/reset-password" element={<ResetPassword />}/>
             <Route path="/intake/:packageId" element={<ProtectedRoute roles={["user", "admin"]}>
                   <IntakeFormPage />
                 </ProtectedRoute>}/>
            <Route path="/about" element={<About />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />}/>
          </Routes>
        </MotionProvider>
      </BrowserRouter>
    </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>);
export default App;
