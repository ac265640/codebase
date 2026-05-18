import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center space-y-8">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
          Chat with any GitHub codebase
        </h1>
        <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto">
          RAG-powered code Q&A. Clone, embed, ask.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Button asChild size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-lg px-8">
            <Link to="/register">Get Started Free</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-lg px-8 bg-slate-900 border-slate-700 hover:bg-slate-800 text-white hover:text-white">
            <Link to="/login">Sign In</Link>
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 pt-16 mt-8 border-t border-slate-800">
          <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 text-left">
            <h3 className="text-lg font-semibold text-indigo-400 mb-2">RAG-Powered</h3>
            <p className="text-slate-400">Ask complex questions about your codebase and get accurate answers backed by the actual source code.</p>
          </div>
          <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 text-left">
            <h3 className="text-lg font-semibold text-indigo-400 mb-2">Real-Time Progress</h3>
            <p className="text-slate-400">Watch the embedding process live via Socket.IO as we clone, parse, and embed your repository.</p>
          </div>
          <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 text-left">
            <h3 className="text-lg font-semibold text-indigo-400 mb-2">Full Chat History</h3>
            <p className="text-slate-400">Your conversations are saved per repository so you can pick up exactly where you left off.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
