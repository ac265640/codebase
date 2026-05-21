import { useRef, useEffect } from 'react';
import { SourceCitation } from './SourceCitation';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ file: string; preview: string }>;
  provider?: string;
}

export function MessageBubble({ role, content, sources, provider }: MessageBubbleProps) {
  const isUser = role === 'user';
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Markdown-to-HTML parser with premium styling and copy capability
  const renderMarkdown = (text: string) => {
    if (!text) return { __html: '' };

    let html = text
      // Escape HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Code blocks (```code```)
      .replace(/```([\s\S]*?)```/g, (_, codeContent) => {
        const trimmed = codeContent.trim();
        return `
          <div class="code-block-wrapper relative group/code my-3">
            <button class="copy-code-btn absolute right-2.5 top-2.5 p-1.5 rounded bg-zinc-900 border border-zinc-800/80 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 opacity-0 group-hover/code:opacity-100 transition-all select-none cursor-pointer duration-200" data-code="${trimmed}">
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
            <pre class="bg-zinc-950 p-4 rounded-lg overflow-x-auto text-[11px] font-mono border border-zinc-900 text-zinc-300"><code>${trimmed}</code></pre>
          </div>
        `;
      })
      // Inline code (`code`)
      .replace(/`([^`]+)`/g, '<code class="bg-zinc-950 px-1.5 py-0.5 rounded text-[0.88em] font-mono border border-zinc-900 text-indigo-300">$1</code>')
      // Bold (**text**)
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-zinc-100">$1</strong>')
      // Headings
      .replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold mt-4 mb-2 text-white">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold mt-5 mb-2 text-white border-b border-zinc-900 pb-1">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-xl font-extrabold mt-6 mb-3 text-white">$1</h1>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p class="my-2 leading-relaxed">')
      // Single line breaks
      .replace(/\n/g, '<br />');

    // Wrap in initial p tag
    html = `<p class="leading-relaxed mb-0 text-zinc-300">${html}</p>`;

    // Clean up empty tags
    html = html.replace(/<p[^>]*><\/p>/g, '');

    return { __html: html };
  };

  // Bind copy events dynamically on the native elements in dangerous inner HTML
  useEffect(() => {
    if (isUser || !bubbleRef.current) return;

    const buttons = bubbleRef.current.querySelectorAll('.copy-code-btn');
    const cleanups: (() => void)[] = [];

    buttons.forEach((btn: any) => {
      const code = btn.getAttribute('data-code') || '';
      const handleCopy = async () => {
        try {
          const decodedCode = code
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
          await navigator.clipboard.writeText(decodedCode);

          // Success feedback styling
          btn.innerHTML = `<svg class="h-3.5 w-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
          btn.classList.add('border-emerald-500/30', 'bg-emerald-950/40');

          setTimeout(() => {
            btn.innerHTML = `<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
            btn.classList.remove('border-emerald-500/30', 'bg-emerald-950/40');
          }, 2000);
        } catch (err) {
          console.error('Failed to copy code content', err);
        }
      };

      btn.addEventListener('click', handleCopy);
      cleanups.push(() => btn.removeEventListener('click', handleCopy));
    });

    return () => cleanups.forEach(c => c());
  }, [content, isUser]);

  return (
    <div ref={bubbleRef} className={`flex flex-col w-full mb-8 ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} items-start`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shrink-0 mr-4 mt-1 shadow-md shadow-indigo-500/25 border border-indigo-400/20">
            <div className="w-2.5 h-2.5 bg-zinc-100 rounded-full shadow-inner"></div>
          </div>
        )}
        <div 
          className={`max-w-[80%] ${
            isUser 
              ? 'bg-indigo-950/40 backdrop-blur-md border border-indigo-500/25 text-zinc-50 rounded-2xl rounded-tr-none px-5 py-3.5 shadow-sm shadow-indigo-500/5' 
              : 'text-zinc-200 mt-1 relative group bg-zinc-900/30 border border-zinc-800/60 border-l-[3px] border-l-indigo-500/40 rounded-2xl rounded-tl-none px-5 py-4 backdrop-blur-md shadow-sm'
          }`}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap leading-relaxed text-[15px]">{content}</div>
          ) : (
            <div className="flex flex-col gap-2">
              <div 
                className="markdown-body text-[15px] leading-relaxed prose prose-invert max-w-none"
                dangerouslySetInnerHTML={renderMarkdown(content)} 
              />
              {provider && (
                <div className="mt-3 flex items-center">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border bg-zinc-950/50 border-zinc-800 text-zinc-400 select-none">
                    <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                      provider === 'cohere' ? 'bg-indigo-400' : 'bg-emerald-400'
                    }`} />
                    {provider === 'cohere' ? 'Cohere Command R' : 'Google Gemini Flash'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {!isUser && sources && sources.length > 0 && (
        <div className="max-w-[80%] w-full ml-12 mt-3">
          <SourceCitation sources={sources} />
        </div>
      )}
    </div>
  );
}
