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
          <div className="relative w-20 h-20 mb-6 flex items-center justify-center select-none pointer-events-none">
            <div className="absolute inset-0 rounded-full border border-indigo-500/10 animate-ping [animation-duration:4s]" />
            <div className="absolute inset-3 rounded-full border border-indigo-500/20 animate-pulse [animation-duration:3s]" />
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/30 flex items-center justify-center">
              <div className="w-3.5 h-3.5 bg-white rounded-full opacity-90 shadow-inner" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-zinc-100 mb-8 tracking-tight">How can I help you today?</h3>
          
          <form 
            onSubmit={handleSubmit} 
            className="w-full flex flex-col bg-zinc-950/60 backdrop-blur-xl border border-zinc-800/80 focus-within:border-indigo-500/40 focus-within:ring-1 focus-within:ring-indigo-500/40 rounded-xl overflow-hidden transition-all shadow-2xl focus-within:shadow-[0_0_30px_rgba(99,102,241,0.08)] duration-300"
          >
            <div className="relative flex items-end">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message CodeBase..."
                className="flex-1 max-h-64 min-h-[60px] w-full resize-none bg-transparent py-4.5 pl-5 pr-14 text-base text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                rows={1}
                disabled={chatMutation.isPending}
                style={{ height: input ? 'auto' : '60px' }}
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={!input.trim() || chatMutation.isPending}
                className="absolute right-2 bottom-2 h-9 w-9 bg-indigo-600 text-white hover:bg-indigo-500 rounded-lg transition-all active:scale-95 disabled:opacity-30 disabled:active:scale-100 shadow-md shadow-indigo-900/20"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between px-5 py-2.5 bg-zinc-950/40 border-t border-zinc-900 text-[10px] text-zinc-500 select-none">
              <span className="flex items-center gap-1.5">
                <span className="font-mono bg-zinc-900 px-1 py-0.5 rounded text-zinc-400 border border-zinc-800">Enter</span> to send
                <span className="text-zinc-700">•</span>
                <span className="font-mono bg-zinc-900 px-1 py-0.5 rounded text-zinc-400 border border-zinc-800">Shift + Enter</span> for new line
              </span>
              <span className="font-mono text-zinc-600">RAG ENGINE v1.0</span>
            </div>
          </form>

          <div className="flex flex-wrap justify-center gap-2.5 w-full mt-8">
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => setInput(q)}
                className="px-4 py-2 text-xs bg-zinc-900/40 border border-zinc-800/80 hover:bg-zinc-800 hover:border-zinc-700 hover:text-zinc-200 rounded-full transition-all text-zinc-400 shadow-sm"
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
              className="max-w-3xl mx-auto flex flex-col bg-zinc-950/60 backdrop-blur-xl border border-zinc-800/80 focus-within:border-indigo-500/40 focus-within:ring-1 focus-within:ring-indigo-500/40 rounded-xl overflow-hidden transition-all shadow-2xl focus-within:shadow-[0_0_30px_rgba(99,102,241,0.08)] duration-300"
            >
              <div className="relative flex items-end">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message CodeBase..."
                  className="flex-1 max-h-64 min-h-[60px] w-full resize-none bg-transparent py-4.5 pl-5 pr-14 text-base text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                  rows={1}
                  disabled={chatMutation.isPending}
                  style={{ height: input ? 'auto' : '60px' }}
                />
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={!input.trim() || chatMutation.isPending}
                  className="absolute right-2 bottom-2 h-9 w-9 bg-indigo-600 text-white hover:bg-indigo-500 rounded-lg transition-all active:scale-95 disabled:opacity-30 disabled:active:scale-100 shadow-md shadow-indigo-900/20"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between px-5 py-2 bg-zinc-950/40 border-t border-zinc-900 text-[9px] text-zinc-500 select-none">
                <span className="flex items-center gap-1.5">
                  <span className="font-mono bg-zinc-900 px-1 py-0.5 rounded text-zinc-400 border border-zinc-800">Enter</span> to send
                  <span className="text-zinc-700">•</span>
                  <span className="font-mono bg-zinc-900 px-1 py-0.5 rounded text-zinc-400 border border-zinc-800">Shift + Enter</span> for new line
                </span>
                <span className="font-mono text-zinc-600">CodeBase Engine v1.0</span>
              </div>
            </form>
            <p className="text-center text-[10px] text-zinc-600 mt-2.5 max-w-3xl mx-auto">
              CodeBase can make mistakes. Please verify important information.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
