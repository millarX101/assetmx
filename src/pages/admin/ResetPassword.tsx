import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Opened from the password reset email. supabase-js reads the link's token from the
// URL and signs the user in; this page then sets the new password.
export function AdminResetPassword() {
  const navigate = useNavigate();
  const { updatePassword } = useAuthStore();
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let done = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!done && session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        done = true;
        setStatus('ready');
      }
    });
    // The link may already have been processed before this page mounted
    supabase.auth.getSession().then(({ data }) => {
      if (!done && data.session) {
        done = true;
        setStatus('ready');
      }
    });
    const timer = setTimeout(() => {
      if (!done) setStatus('invalid');
    }, 5000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('The two passwords do not match.');
    setSaving(true);
    const result = await updatePassword(password);
    setSaving(false);
    if (result.error) return setError(result.error);
    navigate('/admin', { replace: true });
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Set a new password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'checking' && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-ink-600" />
            </div>
          )}
          {status === 'invalid' && (
            <div className="space-y-4 text-sm">
              <p>This reset link has expired or has already been used.</p>
              <Button className="w-full" onClick={() => navigate('/admin/login', { replace: true })}>
                Back to sign in
              </Button>
            </div>
          )}
          {status === 'ready' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">{error}</div>
              )}
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save password and sign in
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
