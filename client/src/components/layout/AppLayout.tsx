import { useState, useEffect, useRef } from 'react';
import { Menu, X, ShieldAlert, Key, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '@/store/authStore';
import api from '@/api/client';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

// 6-digit OTP input with auto-advance and backspace handling
function OtpInput({ onComplete, disabled }: { onComplete: (otp: string) => void; disabled?: boolean }) {
  const [values, setValues] = useState(['', '', '', '', '', '']);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  function handleChange(idx: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const next = [...values];
    next[idx] = val;
    setValues(next);
    if (val && idx < 5) inputs.current[idx + 1]?.focus();
    if (next.every(v => v !== '')) onComplete(next.join(''));
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !values[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...values];
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setValues(next);
    const lastFilled = Math.min(pasted.length, 5);
    inputs.current[lastFilled]?.focus();
    if (pasted.length === 6) onComplete(pasted);
  }

  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
      {values.map((v, i) => (
        <input
          key={i}
          ref={el => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={v}
          disabled={disabled}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          style={{
            width: '44px',
            height: '52px',
            textAlign: 'center',
            fontSize: '22px',
            fontWeight: 'bold',
            borderRadius: '8px',
            border: '2px solid #3f3f46',
            background: '#09090b',
            color: '#f4f4f5',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => (e.target.style.borderColor = '#6366f1')}
          onBlur={e => (e.target.style.borderColor = '#3f3f46')}
        />
      ))}
    </div>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
  activeRepoId?: string;
  onSelectRepo: (id: string) => void;
}

export function AppLayout({ children, activeRepoId, onSelectRepo }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showWakingBanner, setShowWakingBanner] = useState(false);
  const { user, setUser } = useAuthStore();
  const { toast } = useToast();

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0); // seconds remaining

  // Resizing sidebar state and hook
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebar-width');
    return saved ? parseInt(saved, 10) : 320;
  });

  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const isResizing = useRef(false);

  useEffect(() => {
    localStorage.setItem('sidebar-width', sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      if (!sidebarRef.current) return;
      const rect = sidebarRef.current.getBoundingClientRect();
      const maxW = Math.max(240, Math.min(500, window.innerWidth * 0.85));
      const newWidth = Math.max(240, Math.min(maxW, e.clientX - rect.left));
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleSlowApi = () => setShowWakingBanner(true);
    window.addEventListener('api-slow', handleSlowApi);
    return () => window.removeEventListener('api-slow', handleSlowApi);
  }, []);

  // Count down the resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResendOtp = async () => {
    setResending(true);
    try {
      await api.post('/auth/resend-otp');
      setResendCooldown(60);
      toast({ title: 'Code sent', description: 'A new verification code has been sent to your email.' });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to resend',
        description: err.response?.data?.error || 'Something went wrong',
      });
    } finally {
      setResending(false);
    }
  };

  const handleVerifyOtp = async (otp: string) => {
    setVerifyError('');
    setVerifying(true);
    try {
      await api.post('/auth/verify-email', { otp });
      if (user) setUser({ ...user, isEmailVerified: true });
      setShowVerifyModal(false);
      toast({ title: 'Email Verified', description: 'Your account is now fully verified!' });
    } catch (err: any) {
      setVerifyError(err.response?.data?.error || 'Invalid or expired code');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-50 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 md:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <div 
        ref={sidebarRef}
        style={{ width: `${sidebarWidth}px` }}
        className={`fixed md:static inset-y-0 left-0 z-50 bg-zinc-950 border-r border-zinc-800 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } flex flex-col h-full relative shrink-0`}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-xl font-bold tracking-tight">CodeBase</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden" 
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <Sidebar activeRepoId={activeRepoId} onSelectRepo={onSelectRepo} />
        
        <div className="p-4 border-t border-zinc-800 text-sm text-zinc-400 flex items-center justify-between">
          <span>{user?.displayName}</span>
        </div>

        {/* Drag Resize Handle */}
        <div
          onMouseDown={startResizing}
          className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 active:bg-indigo-500 transition-colors z-50 group flex items-center justify-center"
        >
          <div className="w-[2px] h-8 bg-zinc-700 group-hover:bg-indigo-400 group-active:bg-indigo-300 rounded opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <header className="h-14 flex items-center px-4 border-b border-zinc-800 md:hidden shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="ml-2 font-semibold">CodeBase</span>
        </header>

        {showWakingBanner && (
          <div className="bg-indigo-600 text-white px-4 py-2 text-sm flex justify-between items-center shrink-0">
            <span>Service is waking up from sleep — this may take up to 30 seconds on first load.</span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-indigo-700 hover:text-white" onClick={() => setShowWakingBanner(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {user && !user.isEmailVerified && (
          <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-2.5 text-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 border-b border-amber-500/20 shadow-md">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="h-4 w-4 animate-pulse shrink-0" />
              <span>
                <strong className="font-semibold">Verification Required:</strong> Please verify your email to unlock indexing and chat features.
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleResendOtp}
                disabled={resending}
                className="text-white hover:bg-amber-700/50 hover:text-white h-8 text-xs font-medium"
              >
                {resending ? 'Sending...' : 'Resend Code'}
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => setShowVerifyModal(true)}
                className="bg-white hover:bg-amber-50 text-amber-950 h-8 text-xs font-semibold px-4 rounded-lg shadow-sm"
              >
                Verify Now
              </Button>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>

      {/* Verify OTP Modal */}
      <Dialog open={showVerifyModal} onOpenChange={setShowVerifyModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-slate-100 max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-zinc-100 flex items-center space-x-2">
                <Key className="h-5 w-5 text-amber-500" />
                <span>Verify Your Account</span>
              </DialogTitle>
              <DialogDescription className="text-zinc-400 pt-2">
                Enter the 6-digit verification code sent to <span className="text-zinc-200 font-semibold">{user?.email}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="my-6 space-y-4">
              <OtpInput onComplete={handleVerifyOtp} disabled={verifying} />
              {verifying && (
                <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying…</span>
                </div>
              )}
              {verifyError && (
                <p className="text-red-400 text-sm text-center">{verifyError}</p>
              )}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleResendOtp}
                disabled={resending || resendCooldown > 0}
                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : resending ? 'Sending…' : 'Resend Code'}
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

