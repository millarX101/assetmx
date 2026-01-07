import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Mail, CheckCircle } from 'lucide-react';

export function AdminLogin() {
  const navigate = useNavigate();
  const { signInWithMagicLink, user, isAdmin } = useAuthStore();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Redirect if already logged in
  if (user && isAdmin) {
    navigate('/admin');
    return null;
  }

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
              {/* Magic Link Form */}
              <form onSubmit={handleMagicLinkLogin} className="space-y-4">
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
                <Button
                  type="submit"
                  className="w-full bg-gradient-brand hover:opacity-90"
                  disabled={!configured || isLoading}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {isLoading ? 'Sending...' : 'Send Magic Link'}
                </Button>
              </form>

              <p className="text-xs text-center text-muted-foreground">
                We'll email you a magic link to sign in.
                <br />
                No password required.
              </p>
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
