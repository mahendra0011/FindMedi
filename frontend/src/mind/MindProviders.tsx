import { Provider } from "react-redux";
import { Outlet } from "react-router-dom";
import { store as mindStore } from "./store";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { TooltipProvider } from "./components/ui/tooltip";
import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";

// MindSupport providers + FindMedi-exact theme scope.
// Mounted once for all /mind/* routes (see App.tsx MindShell).
// FindMedi user dashboard and MindSupport user dashboard stay separate:
// FindMedi → /dashboard + /patient/*, MindSupport → /mind/user.
export default function MindProviders() {
  return (
    <div className="theme-findmedi">
      <Provider store={mindStore}>
        <ThemeProvider>
          <LanguageProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Outlet />
            </TooltipProvider>
          </LanguageProvider>
        </ThemeProvider>
      </Provider>
    </div>
  );
}
