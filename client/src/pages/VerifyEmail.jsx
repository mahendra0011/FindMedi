import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, Mail, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('loading'); // loading|success|error|expired
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    verifyEmail(token);
  }, [token]);

  const verifyEmail = async (token) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/verify-email/${token}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage(data.message || 'Email verified successfully!');
        // Update auth context if user is logged in
        if (data.user) {
          setUser(data.user);
        }
        // Redirect to login after 3 seconds
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setStatus('error');
        setMessage(data.message || 'Verification failed');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  };

  const handleResend = async () => {
    if (!token) return;
    try {
      await api.resendVerification({ token }); // We'll pass old token to get email
      toast.success('Verification email sent again!');
    } catch (err) {
      toast.error('Failed to resend. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            {status === 'loading' && <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin" />}
            {status === 'success' && <CheckCircle className="w-16 h-16 text-success mx-auto" />}
            {status === 'error' && <XCircle className="w-16 h-16 text-destructive mx-auto" />}

            <CardTitle className="text-2xl mt-4">
              {status === 'loading' && 'Verifying your email...'}
              {status === 'success' && 'Email Verified!'}
              {status === 'error' && 'Verification Failed'}
            </CardTitle>
            <CardDescription>
              {status === 'loading' && 'Please wait while we confirm your email address.'}
              {status === 'success' && message}
              {status === 'error' && message}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {status === 'success' && (
              <>
                <p className="text-sm text-muted-foreground">
                  Redirecting to login in 3 seconds...
                </p>
                <Button onClick={() => navigate('/login')} className="w-full">
                  Go to Login
                </Button>
              </>
            )}

            {status === 'error' && (
              <div className="space-y-3">
                <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <p className="text-sm text-muted-foreground">
                  Or contact support if the problem persists.
                </p>
              </div>
            )}

            {status === 'loading' && (
              <p className="text-xs text-muted-foreground">
                <Mail className="w-3 h-3 inline mr-1" />
                Check your inbox for the verification link
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
