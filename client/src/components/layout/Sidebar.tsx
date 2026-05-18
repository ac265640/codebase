import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import api from '@/api/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RepoCard } from '../repos/RepoCard';
import { AddRepoModal } from '../repos/AddRepoModal';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface SidebarProps {
  activeRepoId?: string;
  onSelectRepo: (id: string) => void;
}

export function Sidebar({ activeRepoId, onSelectRepo }: SidebarProps) {
  const [addModalOpen, setAddModalOpen] = useState(false);

  const { data: repos, isLoading, isError, refetch } = useQuery({
    queryKey: ['repos'],
    queryFn: async () => {
      const res = await api.get('/repos');
      return res.data;
    },
    // Auto-refresh if any repo is processing or pending
    refetchInterval: (query) => {
      const hasPending = query.state.data?.some(
        (r: any) => r.embeddingStatus === 'pending' || r.embeddingStatus === 'processing'
      );
      return hasPending ? 3000 : false;
    }
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 shrink-0">
        <Button 
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" 
          onClick={() => setAddModalOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" /> Add Repository
        </Button>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4 pb-4">
          {isLoading && (
            <>
              <Skeleton className="h-28 w-full bg-zinc-900 rounded-xl" />
              <Skeleton className="h-28 w-full bg-zinc-900 rounded-xl" />
              <Skeleton className="h-28 w-full bg-zinc-900 rounded-xl" />
            </>
          )}

          {isError && (
            <div className="text-center p-4 bg-red-900/20 text-red-400 rounded-xl border border-red-900/50 text-sm">
              Failed to load repos.
              <Button variant="link" className="text-red-300 mt-2 p-0 h-auto" onClick={() => refetch()}>Retry</Button>
            </div>
          )}

          {!isLoading && !isError && repos?.length === 0 && (
            <div className="text-center p-8 text-zinc-500 text-sm">
              No repos yet. <br /> Add one to get started.
            </div>
          )}

          {repos?.map((repo: any) => (
            <RepoCard 
              key={repo._id} 
              repo={repo} 
              isActive={repo._id === activeRepoId}
              onClick={() => onSelectRepo(repo._id)}
              onDeleted={() => {
                if (activeRepoId === repo._id) onSelectRepo('');
                refetch();
              }}
            />
          ))}
        </div>
      </ScrollArea>

      <AddRepoModal 
        open={addModalOpen} 
        onOpenChange={setAddModalOpen} 
        onSuccess={() => refetch()} 
      />
    </div>
  );
}
