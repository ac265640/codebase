import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import LightRays from '@/components/ui/LightRays';

export default function Landing() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 relative flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Background LightRays */}
      <LightRays
        raysOrigin="top-center"
        raysColor="#4f46e5" // Indigo-ish color to match brand
        raysSpeed={1.5}
        lightSpread={0.8}
        rayLength={1.2}
        followMouse={true}
        mouseInfluence={0.1}
        noiseAmount={0.05}
        distortion={0.05}
        className="opacity-70"
      />

      {/* Foreground Content */}
      <div className="max-w-4xl w-full text-center space-y-8 relative z-10 mt-10">
        <div className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-sm font-medium text-indigo-300 backdrop-blur-sm mb-4">
          <span className="flex h-2 w-2 rounded-full bg-indigo-500 mr-2 animate-pulse"></span>
          Enterprise-Grade AI Infrastructure
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight drop-shadow-sm">
          Intelligent Automation for <br className="hidden md:block" /> Engineering Teams
        </h1>
        <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto font-light leading-relaxed">
          A scalable AI SaaS platform designed to accelerate productivity through deep codebase analysis and automated workflows. 
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Button asChild size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-lg px-8 shadow-lg shadow-indigo-900/20 transition-all hover:scale-105 rounded-full">
            <Link to="/register">Get Started Free</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-lg px-8 bg-zinc-900/50 backdrop-blur-sm border-zinc-700 hover:bg-zinc-800 text-white hover:text-white transition-all rounded-full">
            <Link to="/login">Sign In</Link>
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 pt-16 mt-12 border-t border-zinc-800/50 relative">
          <div className="p-6 bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-zinc-800/60 text-left hover:bg-zinc-900/60 transition-colors">
            <h3 className="text-lg font-semibold text-indigo-400 mb-2">AI-Powered Workflows</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">Automate complex engineering tasks and scale your operations with our enterprise-grade RAG engine and intelligent processing pipelines.</p>
          </div>
          <div className="p-6 bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-zinc-800/60 text-left hover:bg-zinc-900/60 transition-colors">
            <h3 className="text-lg font-semibold text-indigo-400 mb-2">Conversational Layer</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">Interact seamlessly with your entire organization's knowledge base through an intuitive, context-aware AI assistant interface.</p>
          </div>
          <div className="p-6 bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-zinc-800/60 text-left hover:bg-zinc-900/60 transition-colors">
            <h3 className="text-lg font-semibold text-indigo-400 mb-2">Deep Code Analysis</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">Gain immediate insights into architecture, dependencies, and logic. Transform how your team understands and maintains complex systems.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
