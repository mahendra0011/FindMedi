import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Brain,
  Eye,
  EyeOff,
  HeartPulse,
  Loader2,
  LockKeyhole,
  Mail,
  Shield,
  Sparkles,
  UserRound,
} from "lucide-react";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import GlowPanel from "@/components/reactbits/GlowPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { loginUser } from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { sanitizeInput } from "@/lib/sanitize";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 2 * 60 * 1000;
const ATTEMPT_STORAGE_KEY = "mindsupport_login_attempts";

function getLoginAttempts() {
  try {
    const raw = localStorage.getItem(ATTEMPT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { count: 0, lockedAt: null };
  } catch {
    return { count: 0, lockedAt: null };
  }
}

function recordLoginAttempt() {
  const data = getLoginAttempts();
  data.count += 1;
  if (data.count >= MAX_LOGIN_ATTEMPTS) {
    data.lockedAt = Date.now();
  }
  localStorage.setItem(ATTEMPT_STORAGE_KEY, JSON.stringify(data));
}

function resetLoginAttempts() {
  localStorage.removeItem(ATTEMPT_STORAGE_KEY);
}

function isLoginLocked() {
  const data = getLoginAttempts();
  if (!data.lockedAt) return false;
  if (Date.now() - data.lockedAt > LOCKOUT_DURATION_MS) {
    resetLoginAttempts();
    return false;
  }
  return true;
}

function getLockoutRemaining() {
  const data = getLoginAttempts();
  if (!data.lockedAt) return 0;
  return Math.max(0, LOCKOUT_DURATION_MS - (Date.now() - data.lockedAt));
}

const Login = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, status } = useAppSelector((state) => state.auth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const formRef = useRef(null);

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [navigate, user]);

  const submit = async (event) => {
    event.preventDefault();
    if (isLoginLocked()) {
      const remaining = getLockoutRemaining();
      const minutes = Math.ceil(remaining / 60000);
      toast({ variant: "destructive", title: "Too many attempts", description: `Please try again in ${minutes} minute(s).` });
      return;
    }
    try {
      await dispatch(loginUser({ email: sanitizeInput(email), password })).unwrap();
      resetLoginAttempts();
      toast({ title: "Signed in", description: "Opening your secure workspace." });
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    } catch (error) {
      recordLoginAttempt();
      const attempts = getLoginAttempts();
      const remaining = MAX_LOGIN_ATTEMPTS - attempts.count;
      toast({
        variant: "destructive",
        title: "Login failed",
        description: remaining > 0 ? `${error?.message || "Please try again."} (${remaining} attempt(s) left)` : "Account locked for 2 minutes.",
      });
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || "";
      window.location.href = `${apiBase}/api/auth/google`;
    } catch (error) {
      toast({ variant: "destructive", title: "Google login failed", description: error?.message || "Could not start Google login." });
      setGoogleLoading(false);
    }
  };

  const fillDemo = async (role) => {
    if (isLoading || demoLoading) return;
    resetLoginAttempts();

    let demoEmail = "";
    let demoPassword = "";
    if (role === "admin") {
      demoEmail = "admin@demo.mindsupport.com";
      demoPassword = "Admin@123";
    } else if (role === "user") {
      demoEmail = "user@demo.mindsupport.com";
      demoPassword = "User@123";
    } else if (role === "counsellor") {
      demoEmail = "aisha.mehra@mindsupport.seed";
      demoPassword = "Counsellor@123";
    }

    setEmail(demoEmail);
    setPassword(demoPassword);
    setDemoLoading(true);

    try {
      const result = await dispatch(loginUser({ email: sanitizeInput(demoEmail), password: demoPassword })).unwrap();
      resetLoginAttempts();
      toast({ title: "Signed in", description: "Opening your secure workspace." });
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || "Could not sign in with demo account.";
      console.error("[DemoLogin]", message, error);
      toast({
        variant: "destructive",
        title: "Demo login failed",
        description: message,
      });
    } finally {
      setDemoLoading(false);
    }
  };

  const isLoading = status === "loading";

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-16">
        <section className="py-8 md:py-16 bg-gradient-to-br from-primary/8 via-background via-secondary/8 to-accent/5">
          <div className="max-w-6xl mx-auto px-4 grid lg:grid-cols-[1fr_440px] gap-8 items-stretch">
            {/* Left Info Panel - Simple */}
            <GlowPanel className="p-8 md:p-10 flex flex-col justify-center min-h-[480px]">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                  Welcome back to<br />
                  <span className="gradient-text">MindSupport</span>
                </h1>
                <p className="mt-5 text-foreground/75 max-w-xl leading-relaxed text-lg">
                  Sign in to continue care, manage sessions, review applications, or run platform operations.
                </p>
              </div>
            </GlowPanel>

            {/* Login Card */}
            <Card className="glass-card h-fit">
              <CardHeader>
                <div className="p-3 rounded-xl bg-gradient-primary w-fit mb-1">
                  <Brain className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl">Sign in</CardTitle>
                <CardDescription>Use your registered email or username with your password.</CardDescription>
              </CardHeader>
              <CardContent>
                <form ref={formRef} onSubmit={submit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email or username</Label>
                    <div className="relative">
                      <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50 pointer-events-none" />
                      <Input
                        id="email"
                        type="text"
                        className="pl-9 h-11"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com or username"
                        autoComplete="username"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        to="/forgot-password"
                        className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <LockKeyhole className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50 pointer-events-none" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        className="pl-9 pr-10 h-11"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full gap-2 h-11 text-base" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign in
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>


                </form>

                {/* Divider */}
                <div className="relative my-6">
                  <Separator className="bg-border/50" />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-foreground/50">
                    Or continue with
                  </span>
                </div>

                {/* Google Login Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-3 h-11"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                >
                  {googleLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                  )}
                  {googleLoading ? "Connecting..." : "Sign in with Google"}
                </Button>

                {/* Demo Buttons */}
                <div className="mt-4 space-y-2">
                  <p className="text-[11px] text-center font-medium uppercase tracking-wider text-foreground/50">
                    Demo access
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="gap-1.5 h-9"
                      disabled={demoLoading || isLoading}
                      onClick={() => fillDemo("admin")}
                    >
                      <Shield className="h-3.5 w-3.5" />
                      Demo Admin
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="gap-1.5 h-9"
                      disabled={demoLoading || isLoading}
                      onClick={() => fillDemo("counsellor")}
                    >
                      <HeartPulse className="h-3.5 w-3.5" />
                      Demo Counsellor
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="gap-1.5 h-9"
                      disabled={demoLoading || isLoading}
                      onClick={() => fillDemo("user")}
                    >
                      <UserRound className="h-3.5 w-3.5" />
                      Demo User
                    </Button>
                  </div>
                </div>

                {/* Counsellor Info */}
                <div className="mt-5 rounded-xl border border-glass-border/40 bg-background/60 p-4 text-sm text-foreground/70">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Counsellor approval flow
                  </div>
                  <p className="mt-2 leading-relaxed">
                    Pending counsellors can sign in, but their counsellor dashboard stays locked until admin approval.
                  </p>
                </div>

                <div className="mt-6 text-sm text-foreground/70 text-center">
                  Need an account?{" "}
                  <Link to="/signup" className="text-primary font-medium hover:underline">
                    Create one
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Login;