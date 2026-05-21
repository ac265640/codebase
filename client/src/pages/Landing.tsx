import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import LightRays from '@/components/ui/LightRays';
import { Terminal, Search, MessageSquare, Database, FileCode, Sparkles } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 relative flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Background LightRays */}
      <LightRays
        raysOrigin="top-center"
        raysColor="#6366f1" // Modern violet-indigo color
        raysSpeed={1.2}
        lightSpread={0.85}
        rayLength={1.3}
        followMouse={true}
        mouseInfluence={0.12}
        noiseAmount={0.06}
        distortion={0.04}
        className="opacity-60"
      />

      {/* Volumetric premium ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/5 blur-[150px] rounded-full -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-600/5 blur-[180px] rounded-full -z-10 pointer-events-none animate-pulse duration-[10000ms]" />

      {/* Foreground Content */}
      <div className="max-w-5xl w-full text-center space-y-8 relative z-10 mt-12 mb-16">
        <div className="inline-flex items-center rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-300 backdrop-blur-md mb-2 shadow-sm">
          <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-400 mr-2.5 animate-pulse"></span>
          Semantic RAG Codebase Intelligence
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.08] text-zinc-50 drop-shadow-md max-w-4xl mx-auto">
          Chat with your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">code</span>.<br />
          Map repositories <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-violet-400 to-indigo-200">instantly</span>.
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto font-light leading-relaxed">
          Index your repositories, search across your codebase with dense vector embeddings in ChromaDB, and query architecture details using Google Gemini and Cohere Command R.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button asChild size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-base font-semibold px-8 shadow-xl shadow-indigo-900/30 transition-all duration-300 hover:scale-[1.02] rounded-full">
            <Link to="/register">Get Started Free</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-base font-semibold px-8 bg-zinc-900/40 backdrop-blur-md border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-white hover:text-white transition-all duration-300 hover:scale-[1.02] rounded-full">
            <Link to="/login">Sign In</Link>
          </Button>
        </div>

        {/* High-Fidelity Interactive IDE Workspace Mockup */}
        <div className="max-w-4xl w-full mx-auto my-14 bg-zinc-950/60 backdrop-blur-2xl border border-zinc-800/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden text-left relative group transition-all duration-500 hover:border-zinc-700/60">
          {/* Top Window Title Bar */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-950 border-b border-zinc-900 select-none">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-zinc-800 group-hover:bg-red-500/80 transition-colors" />
              <div className="w-3 h-3 rounded-full bg-zinc-800 group-hover:bg-yellow-500/80 transition-colors" />
              <div className="w-3 h-3 rounded-full bg-zinc-800 group-hover:bg-green-500/80 transition-colors" />
            </div>
            <div className="text-[11px] font-mono tracking-wide text-zinc-500 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              CodeBase Workspace — ac265640/codebase
            </div>
            <div className="w-12" /> {/* Spacer */}
          </div>

          {/* IDE Main Split Layout */}
          <div className="flex h-[360px] font-sans text-xs">
            {/* Sidebar Mockup */}
            <div className="w-56 border-r border-zinc-900 bg-zinc-950/40 p-4 hidden md:flex flex-col space-y-4 select-none">
              <div>
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Repositories</p>
                <div className="flex items-center gap-2 p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-zinc-200">
                  <Database className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="font-mono truncate">ac265640/codebase</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Project Files</p>
                <div className="space-y-1.5 font-mono text-zinc-400 pl-1">
                  <div className="flex items-center gap-2 hover:text-zinc-200 cursor-pointer">
                    <FileCode className="w-3.5 h-3.5 text-indigo-400/70" />
                    <span>chromaStore.ts</span>
                  </div>
                  <div className="flex items-center gap-2 text-indigo-300 font-semibold p-0.5 pl-1 rounded bg-zinc-900/50">
                    <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                    <span>ragService.ts</span>
                  </div>
                  <div className="flex items-center gap-2 hover:text-zinc-200 cursor-pointer pl-2">
                    <span className="text-zinc-600">└─</span>
                    <span>chunker.ts</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Pane Mockup */}
            <div className="flex-1 flex flex-col bg-zinc-950/20 p-5 overflow-hidden">
              {/* Message History */}
              <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-indigo-950/35 border border-indigo-500/20 rounded-2xl rounded-tr-none px-4 py-2.5 text-zinc-100 shadow-sm">
                    How does the system retrieve code context for RAG queries?
                  </div>
                </div>
                {/* Assistant Message */}
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                  <div className="max-w-[85%] bg-zinc-900/40 border border-zinc-800/60 rounded-2xl rounded-tl-none px-4 py-3 text-zinc-300 backdrop-blur-md">
                    <p className="mb-2 leading-relaxed">
                      We index code blocks in ChromaDB as vector chunks. When you query, the backend executes a similarity search:
                    </p>
                    <pre className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-900 font-mono text-[10px] text-zinc-400 overflow-x-auto">
                      <span className="text-indigo-400">const</span> chunks = <span className="text-purple-400">await</span> chromaStore.<span className="text-blue-400">similaritySearch</span>(query, <span className="text-amber-500">5</span>);
                    </pre>
                  </div>
                </div>
              </div>

              {/* Chat Input Dock Mockup */}
              <div className="mt-4 pt-3 border-t border-zinc-900/80">
                <div className="flex items-center bg-zinc-900/70 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-500">
                  <Search className="w-4 h-4 mr-2 text-zinc-600" />
                  <span className="flex-1 font-mono text-[11px]">Ask ragService.ts to generate a unit test...</span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[9px] font-semibold text-zinc-400 select-none">
                    <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                    GEMINI
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-6 pt-12 border-t border-zinc-900/80 relative">
          <div className="p-7 bg-zinc-900/30 backdrop-blur-md rounded-2xl border border-zinc-800/40 text-left hover:bg-zinc-900/60 hover:border-indigo-500/30 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5 group">
            <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-indigo-400 transition-colors duration-300 mb-2">Automated Ingestion</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">Clone any public repository on the fly. Parse and split source code into optimized vector chunks, fully indexed and queued in real time.</p>
          </div>
          <div className="p-7 bg-zinc-900/30 backdrop-blur-md rounded-2xl border border-zinc-800/40 text-left hover:bg-zinc-900/60 hover:border-indigo-500/30 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5 group">
            <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-indigo-400 transition-colors duration-300 mb-2">Multi-Model AI Chat</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">Ask architectural questions, locate entry points, or generate unit tests. Toggle between Cohere Command R and Gemini Flash for best results.</p>
          </div>
          <div className="p-7 bg-zinc-900/30 backdrop-blur-md rounded-2xl border border-zinc-800/40 text-left hover:bg-zinc-900/60 hover:border-indigo-500/30 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5 group">
            <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-indigo-400 transition-colors duration-300 mb-2">Resizable Explorer</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">Browse indexed folder structures directly. Open file modals to review syntax-highlighted code alongside your conversational assistant.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
