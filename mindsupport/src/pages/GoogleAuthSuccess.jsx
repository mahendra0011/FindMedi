import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useAppDispatch } from "@/store/hooks";
import { storeSession } from "@/lib/api";
import { loadCurrentUser } from "@/store/authSlice";

function parseHash(hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return {
    token: params.get("token"),
    refreshToken: params.get("refreshToken"),
  };
}

const GoogleAuthSuccess = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const { token, refreshToken } = parseHash(window.location.hash);

    if (!token) {
      setStatus("error");
      setErrorMessage("No authentication token received. Please try logging in again.");
      return;
    }

    try {
      storeSession({ token, refreshToken: refreshToken || undefined, user: { id: "", name: "", email: "", role: "" } });
    } catch (err) {
      setStatus("error");
      setErrorMessage("Failed to store session. Please try again.");
      return;
    }

    dispatch(loadCurrentUser())
      .unwrap()
      .then((user) => {
        setStatus("success");
        setTimeout(() => {
          navigate("/dashboard", { replace: true });
        }, 1500);
      })
      .catch((err) => {
        setStatus("error");
        setErrorMessage(err?.message || "Failed to load user profile. Please try logging in again.");
      });
  }, [navigate, dispatch]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="glass-card p-8 text-center">
          {status === "loading" && (
            <div className="space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <h1 className="text-xl font-semibold text-foreground">Completing sign in...</h1>
              <p className="text-sm text-foreground/70">Please wait while we set up your session.</p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
              <h1 className="text-xl font-semibold text-foreground">Signed in successfully!</h1>
              <p className="text-sm text-foreground/70">Redirecting to your dashboard...</p>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <h1 className="text-xl font-semibold text-foreground">Sign in failed</h1>
              <p className="text-sm text-foreground/70">{errorMessage}</p>
              <button
                onClick={() => navigate("/login", { replace: true })}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Back to login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleAuthSuccess;
