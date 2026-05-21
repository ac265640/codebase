import { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/api/client';

interface FileModalProps {
  repoId: string;
  filePath: string | null;
  onClose: () => void;
  isGuest?: boolean;
}

export function FileModal({ repoId, filePath, onClose, isGuest }: FileModalProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!filePath || !repoId) return;

    let mounted = true;
    const fetchFile = async () => {
      setLoading(true);
      setError(false);
      setContent('');
      try {
        const url = isGuest ? `/guest/repos/${repoId}/file` : `/repos/${repoId}/file`;
        const res = await api.get(url, { params: { path: filePath } });
        if (mounted) {
          setContent(res.data.content);
        }
      } catch (err) {
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchFile();
    return () => { mounted = false; };
  }, [repoId, filePath]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={!!filePath} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[90vw] h-[85vh] bg-zinc-950 border-zinc-800 text-slate-50 flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-zinc-800 flex flex-row items-center justify-between space-y-0 shrink-0">
          <DialogTitle className="text-sm font-mono truncate mr-4 text-zinc-300">
            {filePath}
          </DialogTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              disabled={loading || error || !content}
              className="h-8 text-xs text-zinc-400 hover:text-white"
            >
              {copied ? <Check className="h-4 w-4 mr-1 text-emerald-500" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto bg-zinc-950 p-4 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
              <Skeleton className="h-10 w-10 rounded-full bg-zinc-800 animate-pulse" />
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 text-sm">
              <span className="text-red-400 mb-2">Failed to load file content</span>
              Please check if the file exists and is readable.
            </div>
          )}
          
          {!loading && !error && (
            <pre className="text-sm font-mono leading-relaxed text-zinc-300 w-full overflow-x-auto">
              <code>{content}</code>
            </pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
