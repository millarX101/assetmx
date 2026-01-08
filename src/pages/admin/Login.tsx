import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { Mail, CheckCircle, Loader2, Lock } from 'lucide-react';

export function AdminLogin() {
  const navigate = useNavigate();
  const { signInWithMagicLink, signInWithEmail, user, isAdmin, isLoading: authLoading, checkAdminStatus } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [loginMethod, setLoginMethod] = useState<'password' | 'magic'>('password');

  // Check for existing session on mount (handles magic link redirect)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    async function checkSession() {
      if (!isSupabaseConfigured()) {
        setIsCheckingSession(false);
        return;
      }

      // Set a timeout to prevent infinite loading
      timeoutId = setTimeout(() => {
        console.warn('Session check timeout');
        setIsCheckingSession(false);
      }, 5000);

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          setIsCheckingSession(false);
          return;
        }

        if (session?.user) {
          // User is logged in, check if admin
          const isAdminUser = await checkAdminStatus(session.user.id);
          if (isAdminUser) {
            clearTimeout(timeoutId);
            navigate('/admin', { replace: true });
            return;
          } else {
            setError('Access denied. You are not an authorized admin user.');
          }
        }
      } catch (err) {
        console.error('Session check error:', err);
      }

      clearTimeout(timeoutId);
      setIsCheckingSession(false);
    }

    checkSession();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [navigate, checkAdminStatus]);

  // Also redirect if auth state changes
  useEffect(() => {
    if (user && isAdmin && !authLoading) {
      navigate('/admin', { replace: true });
    }
  }, [user, isAdmin, authLoading, navigate]);

  // Show loading while checking session
  if (isCheckingSession || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-slate-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await signInWithEmail(email, password);
    if (result.error) {
      setError(result.error);
    }
    setIsLoading(false);
  };

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await signInWithMagicLink(email);
    if (result.error) {
      setError(result.error);
    } else {
      setMagicLinkSent(true);
    }
    setIsLoading(false);
  };

  const configured = isSupabaseConfigured();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-violet-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-brand flex items-center justify-center shadow-lg shadow-purple-900/20 mb-4">
            <span className="text-white font-bold text-2xl">A</span>
          </div>
          <CardTitle className="text-2xl">AssetMX Admin</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sign in to access the admin portal
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {!configured && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              <p className="font-semibold mb-1">Supabase not configured</p>
              <p>
                Copy <code className="bg-yellow-100 px-1 rounded">.env.local.example</code> to{' '}
                <code className="bg-yellow-100 px-1 rounded">.env.local</code> and add your Supabase credentials.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
              {error}
            </div>
          )}

          {magicLinkSent ? (
            <div className="text-center py-6">
              <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Check your email</h3>
              <p className="text-sm text-slate-600 mb-4">
                We've sent a magic link to <strong>{email}</strong>
              </p>
              <p className="text-xs text-slate-500">
                Click the link in the email to sign in. The link expires in 1 hour.
              </p>
              <Button
                variant="ghost"
                className="mt-4"
                onClick={() => {
                  setMagicLinkSent(false);
                  setEmail('');
                }}
              >
                Use a different email
              </Button>
            </div>
          ) : (
            <>
              {/* Toggle between login methods */}
              <div className="flex rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setLoginMethod('password')}
                  className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                    loginMethod === 'password'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('magic')}
                  className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                    loginMethod === 'magic'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Magic Link
                </button>
              </div>

              {loginMethod === 'password' ? (
                /* Password Form */
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={!configured || isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={!configured || isLoading}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-brand hover:opacity-90"
                    disabled={!configured || isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Lock className="mr-2 h-4 w-4" />
                    )}
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              ) : (
                /* Magic Link Form */
                <form onSubmit={handleMagicLinkLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-magic">Email address</Label>
                    <Input
                      id="email-magic"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={!configured || isLoading}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-brand hover:opacity-90"
                    disabled={!configured || isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="mr-2 h-4 w-4" />
                    )}
                    {isLoading ? 'Sending...' : 'Send Magic Link'}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    We'll email you a magic link to sign in.
                  </p>
                </form>
              )}
            </>
          )}

          <p className="text-xs text-center text-slate-400 pt-4 border-t">
            Only authorized admin users can access this portal.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
