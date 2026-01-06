import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isSupabaseConfigured } from '@/lib/supabase';

export function AdminLogin() {
  const navigate = useNavigate();
  const { signInWithEmail, signInWithGoogle, user, isAdmin } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  if (user && isAdmin) {
    navigate('/admin');
    return null;
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await signInWithEmail(email, password);
    if (result.error) {
      setError(result.error);
    } else {
      navigate('/admin');
    }
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    setError('');
    const result = await signInWithGoogle();
    if (result.error) {
      setError(result.error);
    }
  };

  const configured = isSupabaseConfigured();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-br from-green-800 via-green-700 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-900/20 mb-4">
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

          {/* Google Sign In */}
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={handleGoogleLogin}
            disabled={!configured || isLoading}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@assetmx.com.au"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={!configured || isLoading}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-green-800 via-green-700 to-emerald-600 hover:from-green-900 hover:via-green-800 hover:to-emerald-700"
              disabled={!configured || isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            Only authorized admin users can access this portal.
            <br />
            Contact support if you need access.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
