import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

/**
 * Local login page.
 *
 * Replaces Base44's hosted login redirect with Supabase Auth.
 *
 * Supported flows:
 * - Email + password sign-in
 * - Email + password sign-up
 * - Magic link (email OTP)
 */
export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const redirectTo = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('redirect') || '/';
    // Basic safety: only allow relative redirects.
    if (raw.startsWith('http://') || raw.startsWith('https://')) return '/';
    return raw;
  }, []);

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTo]);

  const onSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      toast.success('Signed in');
    } catch (e) {
      toast.error(e.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const onSignUp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          // After email confirmation, Supabase redirects back to the app.
           emailRedirectTo: `${window.location.origin}${redirectTo}`,
        },
      });
      console.log("I am here")
      if (error)  {
        console.log(error)
        throw error;
      }
      toast.success('Check your email to confirm your account');
    } catch (e) {
      toast.error(e.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const onMagicLink = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}${redirectTo}`,
        },
      });
      if (error) throw error;
      toast.success('Magic link sent. Check your email.');
    } catch (e) {
      toast.error(e.message || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-lime-950 text-white">
      <div className="max-w-md mx-auto px-4 py-10" style={{ paddingTop: 'calc(2rem + env(safe-area-inset-top))' }}>
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎾</span>
            <h1 className="text-2xl font-bold text-lime-300">MiLiga</h1>
          </div>
          <p className="text-slate-400 mt-2 text-sm">Sign in to continue.</p>
        </div>

        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/30 p-5">
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 h-10 rounded-xl text-sm border transition-colors ${
                mode === 'signin'
                  ? 'bg-lime-400/20 border-lime-400/40 text-lime-200'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 h-10 rounded-xl text-sm border transition-colors ${
                mode === 'signup'
                  ? 'bg-lime-400/20 border-lime-400/40 text-lime-200'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              Sign up
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Email</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-2 h-12 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-xl"
                autoComplete="email"
              />
            </div>

            <div>
              <Label className="text-slate-300">Password</Label>
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="••••••••"
                className="mt-2 h-12 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-xl"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
              <p className="text-xs text-slate-500 mt-2">Minimum 6 characters (Supabase default).</p>
            </div>

            <Button
              onClick={mode === 'signup' ? onSignUp : onSignIn}
              disabled={loading || !email.trim() || !password}
              className="w-full h-12 bg-gradient-to-r from-lime-400 to-emerald-500 hover:from-lime-300 hover:to-emerald-400 text-slate-900 rounded-xl font-semibold"
            >
              {loading ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </Button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700/60" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-slate-900/30 px-3 text-xs text-slate-400">or</span>
              </div>
            </div>

            <Button
              variant="secondary"
              onClick={onMagicLink}
              disabled={loading || !email.trim()}
              className="w-full h-12 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-100 hover:bg-slate-800"
            >
              Send magic link
            </Button>
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-6">
          Admin invites: use the invite email link to set a password.
        </p>
      </div>
    </div>
  );
}
