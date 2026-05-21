import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import api from '../api/client';
import LightRays from '@/components/ui/LightRays';

function isValidGmail(e: string) {
  return /^[a-zA-Z0-9._%+\-]+@gmail\.com$/i.test(e.trim());
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!isValidGmail(email)) {
      setError('Please enter a valid Gmail address (e.g. yourname@gmail.com)');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
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
        {sent ? (
          <CardContent className="pt-8 pb-8 text-center">
            <div className="text-5xl mb-4">📬</div>
            <h2 className="text-xl font-semibold text-white mb-2">Check your inbox</h2>
            <p className="text-zinc-400 text-sm mb-2">
              If <strong className="text-white">{email}</strong> is registered, a reset
              link has been sent. The link expires in 1 hour.
            </p>
            <p className="text-zinc-500 text-xs mb-6">Don't see it? Check your spam folder.</p>
            <Link to="/login" className="text-indigo-400 text-sm hover:underline">
              Back to login
            </Link>
          </CardContent>
        ) : (
          <>
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold tracking-tight">Reset your password</CardTitle>
              <p className="text-sm text-zinc-400">
                Enter your Gmail address and we'll send you a reset link.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Input
                    type="email"
                    placeholder="yourname@gmail.com"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    className="bg-zinc-800/50 backdrop-blur-sm border-zinc-700/50 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500"
                  />
                  {error && <p className="text-red-400 text-xs mt-1 px-1">{error}</p>}
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 transition-colors"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
              <p className="text-center text-zinc-500 text-sm mt-6">
                <Link to="/login" className="text-indigo-400 hover:underline">
                  Back to login
                </Link>
              </p>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
