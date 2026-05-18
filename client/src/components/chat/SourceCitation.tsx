import { useState } from 'react';
import { ChevronDown, ChevronRight, FileCode } from 'lucide-react';

interface Source {
  file: string;
  preview: string;
}

interface SourceCitationProps {
  sources: Source[];
}

export function SourceCitation({ sources }: SourceCitationProps) {
  const [expanded, setExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 text-sm">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center space-x-1.5 text-zinc-500 hover:text-zinc-300 transition-colors bg-zinc-900/50 hover:bg-zinc-800/50 px-2 py-1 rounded-md border border-zinc-800"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span className="font-medium text-xs">
          {sources.length} {sources.length === 1 ? 'source' : 'sources'}
        </span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 pl-2 border-l border-zinc-800">
          {sources.map((src, i) => (
            <div key={i} className="bg-zinc-900 rounded border border-zinc-800 p-2 overflow-hidden">
              <div className="flex items-center text-indigo-400 font-mono text-xs mb-1.5 truncate">
                <FileCode className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                {src.file}
              </div>
              <pre className="text-[11px] text-zinc-400 font-mono whitespace-pre-wrap leading-relaxed">
                {src.preview.trim()}...
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
