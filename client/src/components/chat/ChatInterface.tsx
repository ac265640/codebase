import { useState, useRef, useEffect } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './MessageBubble';

interface ChatInterfaceProps {
  repoId: string;
}

export function ChatInterface({ repoId }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: session } = useQuery({
    queryKey: ['chat', repoId],
    queryFn: async () => {
      const res = await api.get(`/chat/${repoId}/history`);
      return res.data;
    },
    enabled: !!repoId
  });

  const chatMutation = useMutation({
    mutationFn: async (question: string) => {
      const res = await api.post(`/chat/${repoId}`, { question });
      return res.data;
    },
    onMutate: async (question) => {
      await queryClient.cancelQueries({ queryKey: ['chat', repoId] });
      const previous = queryClient.getQueryData(['chat', repoId]);
      
      const optimisticMessage = { role: 'user', content: question };
      
      queryClient.setQueryData(['chat', repoId], (old: any) => ({
        ...old,
        messages: [...(old?.messages || []), optimisticMessage]
      }));

      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', repoId] });
    },
    onError: (_err, _newMsg, context) => {
      queryClient.setQueryData(['chat', repoId], context?.previous);
    }
  });

  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/chat/${repoId}/history`);
    },
    onSuccess: () => {
      queryClient.setQueryData(['chat', repoId], { messages: [] });
    }
  });

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;
    
    chatMutation.mutate(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [session?.messages, chatMutation.isPending]);

  const messages = session?.messages || [];
  const suggestedQuestions = [
    "How does authentication work in this codebase?",
    "What is the entry point of this application?",
    "Explain the folder structure"
  ];

  return (
    <div className="flex flex-col h-full relative bg-[#2d2d2d] sm:bg-zinc-950">
      {/* Header */}
      <div className="absolute top-0 right-0 z-10 p-4">
        {messages.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => { if(confirm('Clear history?')) clearHistoryMutation.mutate(); }}
            className="text-zinc-500 hover:text-red-400 hover:bg-red-950/30"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Chat
          </Button>
        )}
      </div>

      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center px-4 w-full max-w-3xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border border-indigo-500/20 flex items-center justify-center mb-6 shadow-inner">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/30"></div>
          </div>
          <h3 className="text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400 mb-10 tracking-tight">How can I help you today?</h3>
          
          <form 
            onSubmit={handleSubmit} 
            className="relative w-full flex items-end bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 rounded-2xl overflow-hidden transition-all shadow-2xl shadow-black/40"
          >
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message CodexAI..."
              className="flex-1 max-h-64 min-h-[60px] w-full resize-none bg-transparent py-4 pl-5 pr-14 text-base text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
              rows={1}
              disabled={chatMutation.isPending}
              style={{ height: input ? 'auto' : '60px' }}
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={!input.trim() || chatMutation.isPending}
              className="absolute right-2 bottom-2 h-10 w-10 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl transition-all active:scale-95 disabled:opacity-30 disabled:active:scale-100 shadow-md shadow-indigo-900/20"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>

          <div className="flex flex-wrap justify-center gap-3 w-full mt-8">
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => setInput(q)}
                className="px-4 py-2 text-sm bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 rounded-full transition-all text-zinc-400 hover:text-zinc-200 shadow-sm"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <ScrollArea ref={scrollRef} className="flex-1 px-4 md:px-8 pt-16 pb-4">
            <div className="space-y-6 max-w-3xl mx-auto w-full pb-10">
              {messages.map((msg: any, i: number) => (
                <MessageBubble 
                  key={i} 
                  role={msg.role} 
                  content={msg.content} 
                  sources={msg.sources}
                  provider={msg.provider}
                />
              ))}
              
              {chatMutation.isPending && (
                <div className="flex items-start mb-6">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shrink-0 mr-4 mt-1.5 shadow-md shadow-indigo-500/20 border border-indigo-400/20">
                    <div className="w-2.5 h-2.5 bg-white/90 rounded-full shadow-inner"></div>
                  </div>
                  <div className="bg-transparent px-2 py-3 flex items-center space-x-2">
                    <div className="flex space-x-1.5">
                      <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                </div>
              )}
              
              {chatMutation.isError && (
                <div className="flex flex-col items-center p-4 bg-red-950/20 border border-red-900/50 rounded-xl max-w-sm mx-auto my-4 text-center">
                  <p className="text-red-400 text-sm mb-3">Failed to get an answer.</p>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="bg-zinc-900 border-zinc-700 hover:bg-zinc-800"
                    onClick={() => handleSubmit()}
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 md:px-8 pb-6 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent">
            <form 
              onSubmit={handleSubmit} 
              className="relative max-w-3xl mx-auto flex items-end bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 rounded-2xl overflow-hidden transition-all shadow-2xl shadow-black/40"
            >
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message CodexAI..."
                className="flex-1 max-h-64 min-h-[60px] w-full resize-none bg-transparent py-4 pl-5 pr-14 text-base text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
                rows={1}
                disabled={chatMutation.isPending}
                style={{ height: input ? 'auto' : '60px' }}
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={!input.trim() || chatMutation.isPending}
                className="absolute right-2 bottom-2 h-10 w-10 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl transition-all active:scale-95 disabled:opacity-30 disabled:active:scale-100 shadow-md shadow-indigo-900/20"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-center text-xs text-zinc-500 mt-3 max-w-3xl mx-auto">
              CodexAI can make mistakes. Please verify important information.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
