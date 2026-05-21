import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';
import LightRays from '@/components/ui/LightRays';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setUser = useAuthStore(s => s.setUser);
  
  const [searchParams] = useSearchParams();
  const oauthError = searchParams.get('error');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');

    if (!/^[a-zA-Z0-9._%+\-]+@gmail\.com$/i.test(email.trim())) {
      setEmailError('Please enter a valid Gmail address (e.g. yourname@gmail.com)');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      setUser(res.data.user, res.data.accessToken, res.data.refreshToken);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">CodeBase</CardTitle>
          <p className="text-sm text-zinc-400">Sign in to your account</p>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {oauthError === 'oauth_failed' && (
              <div className="p-3 bg-red-900/50 border border-red-900 text-red-200 text-sm rounded-md text-center">
                Google sign-in failed. Please try again or use email/password.
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-900/50 border border-red-900 text-red-200 text-sm rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Input 
                type="email" 
                placeholder="Email address" 
                required 
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  setEmailError('');
                }}
                className="bg-zinc-800/50 backdrop-blur-sm border-zinc-700/50 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500"
              />
              {emailError && (
                <p className="text-red-400 text-xs mt-1 px-1">{emailError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Input 
                type="password" 
                placeholder="Password" 
                required 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="bg-zinc-800/50 backdrop-blur-sm border-zinc-700/50 text-white placeholder:text-zinc-500 focus-visible:ring-indigo-500"
              />
              <div style={{ textAlign: 'right', marginTop: '4px' }}>
                <Link to="/forgot-password"
                   style={{ fontSize: '14px', color: '#6366f1', textDecoration: 'none' }}>
                  Forgot password?
                </Link>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/20" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="relative w-full flex items-center justify-center text-xs uppercase text-zinc-500 my-1">
              <div className="absolute w-full border-t border-zinc-800" />
              <span className="relative bg-[#1d1d20] px-2 text-zinc-500">Or continue with</span>
            </div>

            <Button 
              type="button" 
              onClick={() => { window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google`; }}
              variant="outline" 
              className="w-full bg-zinc-900/50 hover:bg-zinc-800 border-zinc-800 text-zinc-300 flex items-center justify-center space-x-2 h-10"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              <span>Google</span>
            </Button>

            <div className="text-sm text-center text-zinc-400 pt-2">
              Don't have an account? <Link to="/register" className="text-indigo-400 hover:underline">Register here</Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
