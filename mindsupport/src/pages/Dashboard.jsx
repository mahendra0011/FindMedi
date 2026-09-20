import { Navigate } from "react-router-dom";
import { Clock3, FileCheck2, ShieldCheck } from "lucide-react";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import GlowPanel from "@/components/reactbits/GlowPanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAppSelector } from "@/store/hooks";

const approvedCounsellorStatuses = ["active", "approved"];

const Dashboard = () => {
  const user = useAppSelector((state) => state.auth.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "counsellor") {
    if (!approvedCounsellorStatuses.includes(user.status)) return <PendingCounsellor user={user} />;
    return <Navigate to="/counsellor" replace />;
  }
  return <Navigate to="/user" replace />;
};

function PendingCounsellor({ user }) {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-16">
        <section className="dashboard-motion py-10 bg-gradient-to-br from-primary/8 via-background via-secondary/8 to-accent/5">
          <div className="dashboard-shell max-w-4xl mx-auto px-4 space-y-6">
            <GlowPanel className="dashboard-panel p-7 text-center">
              <Badge className="bg-amber-500/15 text-amber-600 border border-amber-500/25">Approval pending</Badge>
              <Clock3 className="h-12 w-12 text-primary mx-auto mt-5" />
              <h1 className="text-3xl sm:text-4xl font-bold mt-4">Your counsellor request is under review</h1>
              <p className="text-foreground/70 mt-3 max-w-2xl mx-auto">
                Hi {user?.name || "there"}, your counsellor account was created successfully. The admin team must approve your verification before your dashboard, bookings, chat, video sessions, and earnings are unlocked.
              </p>
            </GlowPanel>

            <div className="dashboard-stagger grid md:grid-cols-3 gap-4">
              <Step icon={FileCheck2} title="Request received" text="Your profile, ID details, and verification information were sent to admin." />
              <Step icon={ShieldCheck} title="Admin review" text="Admin checks identity, credentials, counsellor type, and safety details." />
              <Step icon={Clock3} title="Dashboard locked" text="You can sign in, but counsellor tools open only after approval." />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Step({ icon: Icon, title, text }) {
  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <Icon className="h-5 w-5 text-primary mb-3" />
        <div className="font-semibold">{title}</div>
        <p className="text-sm text-foreground/70 mt-1">{text}</p>
      </CardContent>
    </Card>
  );
}

export default Dashboard;
