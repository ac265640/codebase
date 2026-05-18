import React from 'react';
import { SourceCitation } from './SourceCitation';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ file: string; preview: string }>;
}

export function MessageBubble({ role, content, sources }: MessageBubbleProps) {
  const isUser = role === 'user';

  // Minimal Markdown renderer
  const renderMarkdown = (text: string) => {
    if (!text) return { __html: '' };

    let html = text
      // Escape HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Code blocks (```code```)
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-zinc-950 p-3 rounded-md my-2 overflow-x-auto text-xs font-mono border border-zinc-800 text-zinc-300"><code>$1</code></pre>')
      // Inline code (`code`)
      .replace(/`([^`]+)`/g, '<code class="bg-zinc-950 px-1.5 py-0.5 rounded text-[0.9em] font-mono border border-zinc-800 text-indigo-300">$1</code>')
      // Bold (**text**)
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-zinc-100">$1</strong>')
      // Headings
      .replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold mt-4 mb-2 text-white">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold mt-5 mb-2 text-white border-b border-zinc-800 pb-1">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-xl font-extrabold mt-6 mb-3 text-white">$1</h1>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p class="my-2 leading-relaxed">')
      // Single line breaks
      .replace(/\n/g, '<br />');

    // Wrap in initial p tag
    html = `<p class="leading-relaxed mb-0">${html}</p>`;

    // Clean up empty tags that might have been created
    html = html.replace(/<p[^>]*><\/p>/g, '');

    return { __html: html };
  };

  return (
    <div className={`flex flex-col w-full mb-6 ${isUser ? 'items-end' : 'items-start'}`}>
      <div 
        className={`max-w-[90%] md:max-w-[85%] rounded-2xl px-5 py-3.5 shadow-sm ${
          isUser 
            ? 'bg-indigo-600 text-white rounded-br-sm' 
            : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-sm'
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap leading-relaxed">{content}</div>
        ) : (
          <div 
            className="markdown-body text-sm"
            dangerouslySetInnerHTML={renderMarkdown(content)} 
          />
        )}
      </div>
      
      {!isUser && sources && sources.length > 0 && (
        <div className="max-w-[90%] md:max-w-[85%] w-full">
          <SourceCitation sources={sources} />
        </div>
      )}
    </div>
  );
}
