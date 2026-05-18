import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '@/store/authStore';

interface AppLayoutProps {
  children: React.ReactNode;
  activeRepoId?: string;
  onSelectRepo: (id: string) => void;
}

export function AppLayout({ children, activeRepoId, onSelectRepo }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showWakingBanner, setShowWakingBanner] = useState(false);
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    const handleSlowApi = () => setShowWakingBanner(true);
    window.addEventListener('api-slow', handleSlowApi);
    return () => window.removeEventListener('api-slow', handleSlowApi);
  }, []);

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
        className={`fixed md:static inset-y-0 left-0 z-50 w-80 bg-zinc-950 border-r border-zinc-800 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } flex flex-col h-full`}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-xl font-bold tracking-tight">CodexAI</h2>
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
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <header className="h-14 flex items-center px-4 border-b border-zinc-800 md:hidden shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="ml-2 font-semibold">CodexAI</span>
        </header>

        {showWakingBanner && (
          <div className="bg-indigo-600 text-white px-4 py-2 text-sm flex justify-between items-center shrink-0">
            <span>Service is waking up from sleep — this may take up to 30 seconds on first load.</span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-indigo-700 hover:text-white" onClick={() => setShowWakingBanner(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
}
