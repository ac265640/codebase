import { useState } from 'react';
import { ChevronRight, ChevronDown, FileCode, Folder } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { FileModal } from './FileModal';

interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
}

interface FileTreeProps {
  repoId: string;
}

export function FileTree({ repoId }: FileTreeProps) {
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  const { data: tree, isLoading, isError, refetch } = useQuery({
    queryKey: ['repos', repoId, 'files'],
    queryFn: async () => {
      const res = await api.get(`/repos/${repoId}/files`);
      return res.data as FileTreeNode;
    },
    enabled: !!repoId
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4 bg-zinc-800" />
        <Skeleton className="h-4 w-1/2 bg-zinc-800 ml-4" />
        <Skeleton className="h-4 w-2/3 bg-zinc-800 ml-4" />
        <Skeleton className="h-4 w-1/3 bg-zinc-800 ml-8" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 text-center text-red-400 text-sm">
        Failed to load file tree.
        <Button variant="link" className="text-red-300 ml-2" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  if (!tree) {
    return <div className="p-4 text-zinc-500 text-sm text-center">No files found.</div>;
  }

  return (
    <>
      <div className="p-2 font-mono text-sm">
        <TreeNode node={tree} onSelectFile={(path) => setSelectedFilePath(path)} defaultExpanded />
      </div>
      
      <FileModal 
        repoId={repoId} 
        filePath={selectedFilePath} 
        onClose={() => setSelectedFilePath(null)} 
      />
    </>
  );
}

function TreeNode({ node, onSelectFile, defaultExpanded = false }: { node: FileTreeNode, onSelectFile: (path: string) => void, defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (node.type === 'file') {
    return (
      <div 
        className="flex items-center space-x-1.5 py-1 px-2 hover:bg-zinc-800/50 rounded cursor-pointer text-zinc-300 hover:text-white transition-colors"
        onClick={() => onSelectFile(node.path)}
      >
        <span className="w-4" /> {/* Spacer for chevron */}
        <FileCode className="h-4 w-4 shrink-0 text-zinc-400" />
        <span className="truncate">{node.name}</span>
      </div>
    );
  }

  return (
    <div>
      <div 
        className="flex items-center space-x-1.5 py-1 px-2 hover:bg-zinc-800/50 rounded cursor-pointer text-zinc-200 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
        )}
        <Folder className="h-4 w-4 shrink-0 text-indigo-400" />
        <span className="truncate font-medium">{node.name}</span>
      </div>
      
      {expanded && node.children && (
        <div className="pl-4 border-l border-zinc-800/50 ml-[11px] mt-1 space-y-0.5">
          {node.children.map((child, idx) => (
            <TreeNode key={idx} node={child} onSelectFile={onSelectFile} />
          ))}
        </div>
      )}
    </div>
  );
}
