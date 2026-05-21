import { useState, useEffect, useRef } from 'react';
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
  const { user } = useAuthStore();

  // Resizing sidebar state
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

        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
}
