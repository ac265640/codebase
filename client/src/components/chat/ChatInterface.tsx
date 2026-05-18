import { useState, useRef, useEffect } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './MessageBubble';
import { Skeleton } from '@/components/ui/skeleton';

interface ChatInterfaceProps {
  repoId: string;
}

export function ChatInterface({ repoId }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: session, isLoading } = useQuery({
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
    <div className="flex flex-col h-full relative">
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

      <ScrollArea ref={scrollRef} className="flex-1 px-4 md:px-8 pt-16 pb-4">
        {isLoading ? (
          <div className="space-y-6">
            <div className="flex justify-end"><Skeleton className="h-16 w-64 bg-zinc-900 rounded-2xl rounded-br-sm" /></div>
            <div className="flex justify-start"><Skeleton className="h-32 w-80 bg-zinc-900 rounded-2xl rounded-bl-sm" /></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 pt-20">
            <div>
              <h3 className="text-xl font-semibold text-zinc-300 mb-2">Ask anything about this repo</h3>
              <p className="text-sm text-zinc-500">I have embedded the code and am ready to answer questions.</p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-md">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  className="px-4 py-3 text-sm text-left bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all text-zinc-300 hover:text-white"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-w-4xl mx-auto w-full">
            {messages.map((msg: any, i: number) => (
              <MessageBubble 
                key={i} 
                role={msg.role} 
                content={msg.content} 
                sources={msg.sources} 
              />
            ))}
            
            {chatMutation.isPending && (
              <div className="flex items-start mb-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                  </div>
                  <span className="text-zinc-500 text-sm ml-2 font-medium">Searching codebase...</span>
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
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 md:px-8 border-t border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
        <form 
          onSubmit={handleSubmit} 
          className="relative max-w-4xl mx-auto flex items-end bg-zinc-900 border border-zinc-700 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 rounded-xl overflow-hidden transition-all shadow-sm"
        >
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the code... (Shift+Enter for newline)"
            className="flex-1 max-h-48 min-h-[56px] w-full resize-none bg-transparent py-4 pl-4 pr-12 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
            rows={1}
            disabled={chatMutation.isPending}
            style={{ height: input ? 'auto' : '56px' }}
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={!input.trim() || chatMutation.isPending}
            className="absolute right-2 bottom-2 h-10 w-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
