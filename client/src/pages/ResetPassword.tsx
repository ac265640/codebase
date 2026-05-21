import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import api from '../api/client';
import LightRays from '@/components/ui/LightRays';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const email = params.get('email');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!token || !email) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
        <LightRays raysOrigin="top-center" raysColor="#4f46e5" raysSpeed={1.5} lightSpread={0.8} rayLength={1.2} followMouse={true} mouseInfluence={0.1} noiseAmount={0.05} distortion={0.05} className="opacity-70" />
        <Card className="w-full max-w-md bg-zinc-900/60 backdrop-blur-xl border-zinc-800/60 shadow-2xl text-slate-50 relative z-10">
          <CardContent className="pt-8 pb-8 text-center">
            <p className="text-red-400 mb-4">Invalid or missing reset link.</p>
            <Link to="/forgot-password" className="text-indigo-400 hover:underline text-sm">
              Request a new reset link
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, email, newPassword });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      <LightRays
        raysOrigin="top-center"
        raysColor="#4f46e5"
        raysSpeed={1.5}
        lightSpread={0.8}
        rayLength={1.2}
        followMouse={true}
        mouseInfluence={0.1}
        noiseAmount={0.05}
        distortion={0.05}
        className="opacity-70"
      />

      <Card className="w-full max-w-md bg-zinc-900/60 backdrop-blur-xl border-zinc-800/60 shadow-2xl shadow-indigo-900/10 text-slate-50 relative z-10">
        {success ? (
          <CardContent className="pt-8 pb-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-white mb-2">Password reset!</h2>
            <p className="text-zinc-400 text-sm mb-6">You can now log in with your new password.</p>
            <Link to="/login" className="text-indigo-400 hover:underline">Go to login</Link>
          </CardContent>
        ) : (
          <>
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold tracking-tight">Set a new password</CardTitle>
              <p className="text-sm text-zinc-400">
                For <strong className="text-white">{decodeURIComponent(email)}</strong>
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleReset} className="space-y-4">
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="New password (min. 8 characters)"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="bg-zinc-800/50 backdrop-blur-sm border-zinc-700/50 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500 pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs hover:text-zinc-200"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="bg-zinc-800/50 backdrop-blur-sm border-zinc-700/50 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500"
                />
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 transition-colors"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </form>
              <p className="text-center text-zinc-500 text-sm mt-6">
                <Link to="/forgot-password" className="text-indigo-400 hover:underline">
                  Request a new link
                </Link>
              </p>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
