import { BookOpen, Brain, FileSearch, Layers, MessageSquare, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppHeader } from '../components/layout/AppHeader';

const features = [
  {
    icon: <MessageSquare className="w-5 h-5" />,
    badge: 'PANEL CHAT',
    title: 'Dialogue & Story Exploration',
    description: 'Ask questions about complex arcs, character relationships, and hidden panel details.',
  },
  {
    icon: <Brain className="w-5 h-5" />,
    badge: 'MEMORY',
    title: 'Multi-Turn Comic Memory',
    description: 'Follow-up questions work seamlessly across conversational context with strict grounding.',
  },
  {
    icon: <FileSearch className="w-5 h-5" />,
    badge: 'CITATIONS',
    title: 'Evidence-Based Page Citations',
    description: 'Every answer links directly to specific pages and panel chunks so you can verify the panels.',
  },
  {
    icon: <Layers className="w-5 h-5" />,
    badge: 'FORMATS',
    title: 'Multi-Format Vault Support',
    description: 'Ingest CBR, CBZ, PDF, and high-resolution standalone comic files effortlessly.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#09090c] flex flex-col select-none">
      <AppHeader />

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-16 sm:py-24 text-center bg-reading-room relative overflow-hidden">
        {/* Subtle comic dot pattern overlay */}
        <div className="absolute inset-0 bg-halftone opacity-40 pointer-events-none" />

        <div className="max-w-3xl mx-auto relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#181824] border-2 border-black text-[#ffd23f] text-xs font-mono font-bold uppercase tracking-wider mb-8 shadow-comic-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#ff2e63]" aria-hidden="true" />
            DIGITAL COMIC READER · AI COMPANION
          </div>

          {/* Headline with Bangers Font */}
          <h1 className="font-comic text-5xl sm:text-7xl text-white tracking-wider leading-none mb-6 drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
            READ. <span className="text-[#ffd23f]">ASK.</span> <span className="text-[#08d9d6]">DISCOVER.</span>
          </h1>

          {/* Subtitle */}
          <p
            className="text-sm sm:text-base text-white max-w-xl mx-auto leading-relaxed mb-10 font-medium opacity-100"
            style={{ color: '#ffffff' }}
          >
            Immerse yourself in full-page comics, while an intelligent companion analyzes panels,
            transcribes dialogue, and answers questions grounded strictly in the story.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/library"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#ffd23f] hover:bg-[#e6bd35] text-black font-comic text-base tracking-wider uppercase px-8 py-3.5 rounded-xl shadow-comic border-2 border-black transition-all comic-btn-tactile"
            >
              <BookOpen className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
              OPEN COMIC VAULT
            </Link>
            <Link
              to="/library"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#171722] hover:bg-[#20202e] border-2 border-black text-white font-comic text-base tracking-wider uppercase px-8 py-3.5 rounded-xl shadow-comic-sm transition-all comic-btn-tactile"
            >
              UPLOAD COMIC
            </Link>
          </div>
        </div>

        {/* Feature Comic Panels Grid */}
        <div className="mt-20 grid gap-5 w-full max-w-4xl mx-auto px-4 grid-cols-1 sm:grid-cols-2 relative z-10 text-left">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-[#13131a] border-2 border-black rounded-2xl p-5 shadow-comic hover:shadow-[4px_4px_0px_#000] hover:-translate-y-0.5 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#ffd23f] text-black border border-black flex items-center justify-center shadow-comic-sm">
                    {feature.icon}
                  </div>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#1c1c28] text-[#ffd23f] border border-[#2b2b3c] uppercase">
                    {feature.badge}
                  </span>
                </div>
                <h2 className="font-comic text-lg text-white tracking-wide mb-1 uppercase">
                  {feature.title}
                </h2>
                <p className="text-xs text-text-muted leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center border-t-2 border-[#171720] bg-[#0c0c10]">
        <p className="font-mono text-xs text-text-muted">
          COMIC RAG · POWERED BY MULTIMODAL AI &amp; CHROMADB
        </p>
      </footer>
    </div>
  );
}
