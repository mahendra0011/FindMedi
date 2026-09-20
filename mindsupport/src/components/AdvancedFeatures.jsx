import { useState } from "react";
import { Accessibility, BarChart3, Bell, Brain, Globe, Moon, Shield, Sun } from "lucide-react";
import EmergencySupport from "./EmergencySupport";
import MoodTracker from "./MoodTracker";
import ScreeningForm from "./ScreeningForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const LANGUAGES = [
  { code: "en", name: "English", flag: "IN" },
  { code: "hi", name: "Hindi", flag: "IN" },
  { code: "ta", name: "Tamil", flag: "IN" },
  { code: "gu", name: "Gujarati", flag: "IN" },
  { code: "te", name: "Telugu", flag: "IN" },
  { code: "bn", name: "Bengali", flag: "IN" },
];

const NOTIFICATION_TYPES = [
  { id: "appointments", label: "Appointment Reminders", enabled: true },
  { id: "mood-check", label: "Daily Mood Check-ins", enabled: true },
  { id: "wellness-tips", label: "Wellness Tips", enabled: false },
  { id: "crisis-alerts", label: "Crisis Alerts", enabled: true },
  { id: "resource-updates", label: "New Resources", enabled: false },
];

const AdvancedFeatures = () => {
  const [activeTab, setActiveTab] = useState("screening");
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATION_TYPES);
  const [accessibilityMode, setAccessibilityMode] = useState(false);

  const handleScreeningComplete = (score, riskLevel) => {
    console.log("Screening completed:", { score, riskLevel });
  };

  const toggleNotification = (id) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, enabled: !notification.enabled } : notification
      )
    );
  };

  const handleCrisisDetected = () => {
    console.log("Crisis support request started");
  };

  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold gradient-text">Advanced Mental Health Features</h2>
          <p className="text-muted-foreground">Screening, mood tracking, emergency support, language, and accessibility tools</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
            <TabsTrigger value="screening" className="text-xs">
              <Brain className="h-4 w-4 mr-1" />
              Screening
            </TabsTrigger>
            <TabsTrigger value="mood" className="text-xs">
              <BarChart3 className="h-4 w-4 mr-1" />
              Mood
            </TabsTrigger>
            <TabsTrigger value="emergency" className="text-xs">
              <Shield className="h-4 w-4 mr-1" />
              Emergency
            </TabsTrigger>
            <TabsTrigger value="language" className="text-xs">
              <Globe className="h-4 w-4 mr-1" />
              Language
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">
              <Bell className="h-4 w-4 mr-1" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="screening" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="gradient-text flex items-center">
                  <Brain className="h-5 w-5 mr-2" />
                  Standardized Mental Health Screening
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Take PHQ-9 or GAD-7 assessments and review clear score ranges before booking support.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="border-primary/30">
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">PHQ-9 Depression Screening</h3>
                      <p className="text-sm text-muted-foreground mb-4">9-question assessment for depression symptoms</p>
                      <ScreeningForm type="PHQ9" onComplete={handleScreeningComplete} />
                    </CardContent>
                  </Card>
                  <Card className="border-secondary/30">
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-2">GAD-7 Anxiety Screening</h3>
                      <p className="text-sm text-muted-foreground mb-4">7-question assessment for anxiety symptoms</p>
                      <ScreeningForm type="GAD7" onComplete={handleScreeningComplete} />
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mood" className="space-y-6">
            <MoodTracker />
          </TabsContent>

          <TabsContent value="emergency" className="space-y-6">
            <EmergencySupport onCrisisDetected={handleCrisisDetected} />
          </TabsContent>

          <TabsContent value="language" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="gradient-text flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  Multilingual Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">Select your preferred language for resources and support content.</p>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {LANGUAGES.map((language) => (
                    <button
                      key={language.code}
                      type="button"
                      onClick={() => setSelectedLanguage(language.code)}
                      className={`p-3 rounded-lg border transition-all text-left ${
                        selectedLanguage === language.code
                          ? "border-primary bg-primary/10 glow-primary"
                          : "border-muted hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-semibold rounded bg-foreground/10 px-2 py-1">{language.flag}</span>
                        <div>
                          <div className="font-medium">{language.name}</div>
                          <div className="text-xs text-muted-foreground">{language.code.toUpperCase()}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="gradient-text flex items-center">
                    <Bell className="h-5 w-5 mr-2" />
                    Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{notification.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {notification.id === "appointments" && "Reminds you of upcoming sessions"}
                          {notification.id === "mood-check" && "Daily prompts to log your mood"}
                          {notification.id === "wellness-tips" && "Mental health tips selected by the platform"}
                          {notification.id === "crisis-alerts" && "Emergency notifications"}
                          {notification.id === "resource-updates" && "New articles and resources"}
                        </div>
                      </div>
                      <Button variant={notification.enabled ? "default" : "outline"} size="sm" onClick={() => toggleNotification(notification.id)}>
                        {notification.enabled ? "On" : "Off"}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="gradient-text flex items-center">
                    <Accessibility className="h-5 w-5 mr-2" />
                    Accessibility & Display
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Dark Mode</div>
                      <div className="text-sm text-muted-foreground">Easier on the eyes for extended use</div>
                    </div>
                    <Button variant={darkMode ? "default" : "outline"} size="sm" onClick={() => setDarkMode(!darkMode)}>
                      {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Accessibility Mode</div>
                      <div className="text-sm text-muted-foreground">Enhanced contrast and larger text</div>
                    </div>
                    <Button variant={accessibilityMode ? "default" : "outline"} size="sm" onClick={() => setAccessibilityMode(!accessibilityMode)}>
                      <Accessibility className="h-4 w-4" />
                    </Button>
                  </div>

                  <Alert>
                    <Accessibility className="h-4 w-4" />
                    <AlertDescription>Platform supports screen readers, keyboard navigation, and high contrast themes.</AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};

export default AdvancedFeatures;
