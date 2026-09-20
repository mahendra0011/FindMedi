import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token || !email) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-24 max-w-md mx-auto px-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Invalid reset link</CardTitle>
              <CardDescription>This password reset link is invalid or expired.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/login" className="text-primary hover:underline">Back to login</Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ variant: "destructive", title: "Weak password", description: "Password must be at least 8 characters." });
      return;
    }
    if (password !== confirm) {
      toast({ variant: "destructive", title: "Passwords don't match", description: "Confirm your password." });
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", { token, email, password });
      setDone(true);
      toast({ title: "Password reset", description: "Sign in with your new password." });
    } catch (error) {
      toast({ variant: "destructive", title: "Reset failed", description: error?.response?.data?.error || "Link may have expired." });
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-24 max-w-md mx-auto px-4">
          <Card className="glass-card">
            <CardHeader className="text-center">
              <ShieldCheck className="h-12 w-12 text-emerald-500 mx-auto mb-2" />
              <CardTitle>Password reset successful!</CardTitle>
              <CardDescription>You can now sign in with your new password.</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => navigate("/login")}>Sign in</Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-24 max-w-md mx-auto px-4">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Reset your password</CardTitle>
            <CardDescription>Enter a new password for {email}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <div className="relative">
                  <LockKeyhole className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50 pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="pl-9 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-foreground/50">Min 8 chars, with uppercase, lowercase &amp; number</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default ResetPassword;
