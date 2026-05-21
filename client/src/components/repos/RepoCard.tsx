import { useState, useEffect } from 'react';
import { MoreVertical, Trash2, RefreshCw, FolderGit2, FileText, Blocks } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { useSocket } from '@/hooks/useSocket';
import api from '@/api/client';

interface RepoCardProps {
  repo: any;
  isActive: boolean;
  onClick: () => void;
  onDeleted: () => void;
}

export function RepoCard({ repo, isActive, onClick, onDeleted }: RepoCardProps) {
  const { toast } = useToast();
  const token = document.cookie.split('access_token=')[1]?.split(';')[0]; // Quick token extraction, usually better to fetch from /me but this works for socket auth
  const socket = useSocket(token || null);
  
  const [status, setStatus] = useState(repo.embeddingStatus);
  const [progress, setProgress] = useState(repo.embeddingProgress || 0);
  const [stage, setStage] = useState('');
  
  useEffect(() => {
    // Reset state if repo prop changes
    setStatus(repo.embeddingStatus);
    setProgress(repo.embeddingProgress || 0);
  }, [repo]);

  useEffect(() => {
    if (!socket) return;
    
    const handleProgress = (data: any) => {
      if (data.repoId === repo._id) {
        setProgress(data.progress);
        setStage(data.stage);
        if (data.stage === 'done') setStatus('done');
        if (data.stage === 'failed') setStatus('failed');
        if (data.stage === 'cloning' || data.stage === 'parsing' || data.stage === 'embedding') setStatus('processing');
      }
    };
    
    socket.on('embed-progress', handleProgress);
    return () => { socket.off('embed-progress', handleProgress); };
  }, [socket, repo._id]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this repository?')) return;
    try {
      await api.delete(`/repos/${repo._id}`);
      toast({ title: 'Repository deleted.' });
      onDeleted();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to delete repo' });
    }
  };

  const handleReEmbed = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setStatus('pending');
      setProgress(0);
      setStage('Waiting...');
      await api.post(`/repos/${repo._id}/re-embed`);
      toast({ title: 'Re-embedding started.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to re-embed' });
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'done': return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20">Ready</Badge>;
      case 'processing': return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20 animate-pulse">Processing</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="outline" className="text-zinc-400 border-zinc-700">Pending</Badge>;
    }
  };

  const isClickable = status === 'done';

  return (
    <Card 
      className={`bg-zinc-900 border-zinc-800 cursor-pointer transition-all duration-200 overflow-hidden ${
        isActive ? 'ring-2 ring-indigo-500 bg-zinc-800/50' : isClickable ? 'hover:bg-zinc-800/50' : 'opacity-80'
      }`}
      onClick={() => isClickable && onClick()}
    >
      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
        <div className="flex items-center space-x-2 overflow-hidden">
          <FolderGit2 className="h-4 w-4 shrink-0 text-indigo-400" />
          <h3 className="font-semibold text-sm truncate" title={repo.repoName}>{repo.repoName}</h3>
        </div>
        <div className="flex items-center space-x-1 shrink-0 ml-2">
          {getStatusBadge()}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-white">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300">
              <DropdownMenuItem onClick={handleReEmbed} className="hover:bg-zinc-800 cursor-pointer">
                <RefreshCw className="mr-2 h-4 w-4" /> Re-embed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="hover:bg-red-900/50 text-red-400 focus:text-red-400 cursor-pointer">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        {(status === 'processing' || status === 'pending') && (
          <div className="space-y-2 mt-2">
            <Progress value={progress} className="h-1.5 bg-zinc-800" />
            <div className="flex justify-between text-xs text-zinc-500">
              <span className="capitalize">{stage || 'Waiting in queue...'}</span>
              <span>{progress}%</span>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="mt-2 text-xs text-red-400 p-2 bg-red-950/30 rounded border border-red-900/50">
            {repo.errorMessage || 'Embedding failed. Please try re-embedding.'}
            <Button variant="link" className="text-red-300 h-auto p-0 px-1 text-xs" onClick={handleReEmbed}>Retry</Button>
          </div>
        )}

        {status === 'done' && (
          <div className="flex items-center space-x-4 mt-2 text-xs text-zinc-500">
            <div className="flex items-center" title="Embeddable Files">
              <FileText className="h-3.5 w-3.5 mr-1" />
              {repo.fileCount} files
            </div>
            <div className="flex items-center" title="Vector Chunks">
              <Blocks className="h-3.5 w-3.5 mr-1" />
              {repo.chunkCount} chunks
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
