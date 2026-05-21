import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import api from '@/api/client';

interface AddRepoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddRepoModal({ open, onOpenChange, onSuccess }: AddRepoModalProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.startsWith('https://github.com/')) {
      toast({ variant: 'destructive', title: 'Must be a valid GitHub URL (https://github.com/...)' });
      return;
    }

    setLoading(true);
    try {
      await api.post('/repos', { repoUrl: url });
      toast({ title: 'Repository added. Embedding started.' });
      setUrl('');
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({ 
        variant: 'destructive', 
        title: err.response?.data?.error || 'Failed to add repository'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-slate-50">
        <DialogHeader>
          <DialogTitle>Add Repository</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Provide a public GitHub repository URL. We will clone, parse, and embed it for you.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <Input 
            placeholder="https://github.com/username/repository" 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600"
            required
            disabled={loading}
          />
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={loading}
              className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading ? 'Adding...' : 'Add Repo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
