import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import api from '@/api/client';
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  Key, 
  RefreshCw, 
  User, 
  Mail, 
  Shield, 
  Zap, 
  BarChart, 
  LogOut, 
  Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export default function Settings() {
  const navigate = useNavigate();
  const { user, setUser, clearUser } = useAuthStore();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regeneratingKey, setRegeneratingKey] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [copiedNewKey, setCopiedNewKey] = useState(false);

  const [usage, setUsage] = useState<{
    queryCount: number;
    reposCloned: number;
    plan: string;
    limits: { queriesPerDay: number; totalRepos: number };
  } | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  
  const [loadingBilling, setLoadingBilling] = useState(false);

  // Fetch API Key (masked) and Usage on mount
  useEffect(() => {
    fetchApiKey();
    fetchUsage();
  }, []);

  const fetchApiKey = async () => {
    setLoadingKey(true);
    try {
      const res = await api.get('/keys');
      setApiKey(res.data.key);
    } catch (err) {
      console.error('Failed to fetch API key:', err);
    } finally {
      setLoadingKey(false);
    }
  };

  const fetchUsage = async () => {
    setLoadingUsage(true);
    try {
      const res = await api.get('/usage/today');
      setUsage(res.data);
    } catch (err) {
      console.error('Failed to fetch usage:', err);
    } finally {
      setLoadingUsage(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    
    setUpdatingProfile(true);
    try {
      const res = await api.patch('/user/profile', { displayName });
      if (user) {
        setUser({ ...user, displayName: res.data.displayName });
      }
      toast({
        title: 'Profile updated',
        description: 'Your display name has been successfully updated.',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating profile',
        description: err.response?.data?.error || 'Something went wrong',
      });
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleCopyKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    toast({
      title: 'Copied',
      description: 'API key format copied to clipboard.',
    });
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRegenerateKey = async () => {
    setRegeneratingKey(true);
    try {
      const res = await api.post('/keys/regenerate');
      setNewRawKey(res.data.rawKey);
      setShowRegenModal(true);
      fetchApiKey(); // Refresh masked key
      toast({
        title: 'Success',
        description: 'New API Key generated successfully.',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not regenerate API key.',
      });
    } finally {
      setRegeneratingKey(false);
    }
  };

  const handleCopyNewKey = () => {
    if (!newRawKey) return;
    navigator.clipboard.writeText(newRawKey);
    setCopiedNewKey(true);
    toast({
      title: 'Copied raw key',
      description: 'New raw API key copied to clipboard. Store it somewhere safe!',
    });
    setTimeout(() => setCopiedNewKey(false), 2000);
  };

  const handleBillingAction = async () => {
    setLoadingBilling(true);
    try {
      if (usage?.plan === 'pro') {
        // Go to customer portal
        const res = await api.post('/billing/portal');
        window.location.href = res.data.url;
      } else {
        // Stripe checkout (dummy price ID or standard test price ID)
        const res = await api.post('/billing/checkout', { priceId: 'price_dummy_pro' });
        window.location.href = res.data.url;
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Billing Error',
        description: err.response?.data?.error || 'Failed to initialize billing session.',
      });
    } finally {
      setLoadingBilling(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      clearUser();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // Percent calculation
  const queryLimit = usage?.limits?.queriesPerDay || 30;
  const queriesUsed = usage?.queryCount || 0;
  const queryPercent = Math.min(100, Math.round((queriesUsed / queryLimit) * 100)) || 0;

  const repoLimit = usage?.limits?.totalRepos || 3;
  const reposUsed = usage?.reposCloned || 0;
  const repoPercent = Math.min(100, Math.round((reposUsed / repoLimit) * 100)) || 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Background neon glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

      {/* Navbar/Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/dashboard')}
              className="text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Account Settings
            </h1>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="text-red-400 hover:text-red-300 hover:bg-red-950/30 flex items-center space-x-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </Button>
        </div>
      </header>

      {/* Main Settings Panel */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left column: Profile card */}
        <div className="md:col-span-1 space-y-6">
          <Card className="bg-zinc-900/40 border-zinc-800/80 backdrop-blur-md overflow-hidden relative">
            <div className="h-2 bg-gradient-to-r from-indigo-500 to-cyan-500" />
            <CardHeader className="flex flex-col items-center pt-8">
              <div className="w-20 h-20 rounded-2xl bg-zinc-800 border-2 border-zinc-700/50 flex items-center justify-center text-4xl shadow-xl mb-4 relative overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.displayName} className="w-full h-full object-cover" />
                ) : (
                  <span>{user?.displayName?.[0]?.toUpperCase() || 'U'}</span>
                )}
              </div>
              <CardTitle className="text-xl text-zinc-100">{user?.displayName}</CardTitle>
              <CardDescription className="text-zinc-400">{user?.email}</CardDescription>
              
              <div className="mt-4">
                {user?.isEmailVerified ? (
                  <Badge variant="outline" className="bg-green-950/30 text-green-400 border-green-800/50 flex items-center space-x-1 py-1 px-3">
                    <Shield className="h-3 w-3" />
                    <span>Verified Account</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-950/30 text-amber-400 border-amber-800/50 flex items-center space-x-1 py-1 px-3">
                    <Shield className="h-3 w-3" />
                    <span>Unverified</span>
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Display Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your display name"
                      className="bg-zinc-950/60 border-zinc-800 text-zinc-100 pl-9 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email Address</label>
                  <div className="relative opacity-60">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input 
                      value={user?.email || ''} 
                      disabled 
                      className="bg-zinc-950 border-zinc-800 text-zinc-400 pl-9 cursor-not-allowed"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={updatingProfile || displayName === user?.displayName}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                >
                  {updatingProfile ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right column: API keys, subscription, metrics */}
        <div className="md:col-span-2 space-y-8">
          
          {/* Subscription Section */}
          <Card className="bg-zinc-900/40 border-zinc-800/80 backdrop-blur-md relative overflow-hidden">
            <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-lg text-zinc-100">Membership Plan</h3>
                    <Badge className={usage?.plan === 'pro' ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white border-none' : 'bg-zinc-800 text-zinc-300'}>
                      {usage?.plan?.toUpperCase() || 'FREE'}
                    </Badge>
                  </div>
                  <p className="text-zinc-400 text-sm mt-1">
                    {usage?.plan === 'pro' 
                      ? 'Enjoy full premium features with unlimited daily queries and indexed repositories.' 
                      : 'Index up to 3 codebases and perform up to 30 queries per day.'}
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleBillingAction}
                disabled={loadingBilling}
                className={usage?.plan === 'pro' 
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 shrink-0 font-medium' 
                  : 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-lg shrink-0 font-semibold'}
              >
                {loadingBilling && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {usage?.plan === 'pro' ? 'Manage Billing' : 'Upgrade to Pro'}
              </Button>
            </CardContent>
          </Card>

          {/* Usage Metrics Section */}
          <Card className="bg-zinc-900/40 border-zinc-800/80 backdrop-blur-md">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-2 text-zinc-400">
                <BarChart className="h-5 w-5 text-cyan-400" />
                <CardTitle className="text-lg font-bold text-zinc-100">API & Query Usage</CardTitle>
              </div>
              <CardDescription className="text-zinc-400">
                Monitor your daily queries and repository indexing usage limits.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingUsage ? (
                <div className="py-6 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-zinc-300">Daily Query Usage</span>
                      <span className="text-zinc-400">
                        {usage?.plan === 'pro' 
                          ? `${queriesUsed} / Unlimited` 
                          : `${queriesUsed} / ${queryLimit} queries`}
                      </span>
                    </div>
                    {usage?.plan === 'pro' ? (
                      <div className="h-2 rounded bg-zinc-800 overflow-hidden relative">
                        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-cyan-500 w-full opacity-30" />
                      </div>
                    ) : (
                      <Progress value={queryPercent} className="h-2 bg-zinc-800 overflow-hidden [&>div]:bg-gradient-to-r [&>div]:from-indigo-500 [&>div]:to-cyan-500" />
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-zinc-300">Indexed Repositories</span>
                      <span className="text-zinc-400">
                        {usage?.plan === 'pro' 
                          ? `${reposUsed} / Unlimited` 
                          : `${reposUsed} / ${repoLimit} repos`}
                      </span>
                    </div>
                    {usage?.plan === 'pro' ? (
                      <div className="h-2 rounded bg-zinc-800 overflow-hidden relative">
                        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-cyan-500 w-full opacity-30" />
                      </div>
                    ) : (
                      <Progress value={repoPercent} className="h-2 bg-zinc-800 overflow-hidden [&>div]:bg-gradient-to-r [&>div]:from-indigo-500 [&>div]:to-cyan-500" />
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* API Key Box */}
          <Card className="bg-zinc-900/40 border-zinc-800/80 backdrop-blur-md">
            <CardHeader>
              <div className="flex items-center space-x-2 text-zinc-400">
                <Key className="h-5 w-5 text-indigo-400" />
                <CardTitle className="text-lg font-bold text-zinc-100">Developer API Key</CardTitle>
              </div>
              <CardDescription className="text-zinc-400">
                Use this API key to authenticate CLI/API integrations with the Bearer scheme.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingKey ? (
                <div className="py-6 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                </div>
              ) : apiKey ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl relative overflow-hidden">
                    <code className="text-sm font-mono text-zinc-300 truncate select-all flex-1 pr-12">
                      {apiKey}
                    </code>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleCopyKey}
                      className="absolute right-2 top-2 h-8 w-8 text-zinc-400 hover:text-white"
                    >
                      {copiedKey ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs text-zinc-500">Stored using fast SHA-256 server-side hashes.</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleRegenerateKey}
                      disabled={regeneratingKey}
                      className="bg-zinc-900/60 hover:bg-zinc-800 border-zinc-800 text-zinc-300 flex items-center space-x-2"
                    >
                      {regeneratingKey ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      )}
                      <span>Regenerate Key</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-zinc-800 rounded-xl">
                  <p className="text-zinc-400 text-sm mb-4">You have not generated a developer API key yet.</p>
                  <Button 
                    onClick={handleRegenerateKey} 
                    disabled={regeneratingKey}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                  >
                    {regeneratingKey && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Generate API Key
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

      </main>

      {/* Regenerate Key Modal */}
      <Dialog open={showRegenModal} onOpenChange={setShowRegenModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-zinc-100 flex items-center space-x-2">
              <Key className="h-5 w-5 text-indigo-400" />
              <span>New API Key Generated</span>
            </DialogTitle>
            <DialogDescription className="text-zinc-400 pt-2">
              Make sure to copy your new API key now. You will not be able to see it again!
            </DialogDescription>
          </DialogHeader>

          <div className="my-6 p-4 bg-zinc-950 border border-zinc-800 rounded-xl relative flex items-center justify-between">
            <code className="text-sm font-mono text-indigo-400 font-bold break-all select-all flex-1 pr-12">
              {newRawKey}
            </code>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleCopyNewKey}
              className="absolute right-2 top-3.5 h-8 w-8 text-zinc-400 hover:text-white"
            >
              {copiedNewKey ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <DialogFooter className="sm:justify-end">
            <Button 
              onClick={() => {
                setShowRegenModal(false);
                setNewRawKey(null);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
            >
              I've copied it safely
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
