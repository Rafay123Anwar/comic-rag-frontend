import type { ReactNode } from 'react';
import { BookOpen, Layers, MessageSquare, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  badgeText: string;
}

export function AuthLayout({ children, title, subtitle, badgeText }: AuthLayoutProps) {
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  return (
    <div className="min-h-screen bg-[#08080a] text-text-primary flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative overflow-hidden selection:bg-[#ffd23f]/30">
      {/* Background Ambience & Lighting */}
      <div className="absolute inset-0 bg-reading-room pointer-events-none" />
      <div className="absolute inset-0 bg-halftone opacity-35 pointer-events-none" />

      {/* Decorative Glow Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#ffd23f]/10 rounded-full blur-3xl pointer-events-none animate-pulse-dot" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#ff2e63]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#08d9d6]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-5xl relative z-10 my-auto">
        {/* Top Mobile Brand Bar */}
        <div className="text-center mb-6 lg:hidden">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 group transition-transform active:scale-95"
          >
            <div className="w-10 h-10 bg-[#ffd23f] text-black rounded-xl flex items-center justify-center font-comic text-xl shadow-comic-sm border-2 border-black group-hover:rotate-[-4deg] transition-transform">
              <BookOpen className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-comic text-2xl text-[#f3f3f6] tracking-wider leading-none group-hover:text-[#ffd23f] transition-colors">
                COMIC <span className="text-[#ffd23f]">RAG</span>
              </span>
              <span className="text-[10px] font-mono tracking-widest text-text-muted uppercase leading-tight">
                AI Reader & Companion
              </span>
            </div>
          </Link>
        </div>

        {/* Two-Column Card Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Hero & Features Section (Visible on LG screens) */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-8 bg-[#111118]/80 backdrop-blur-md border-2 border-black rounded-3xl shadow-comic-lg relative overflow-hidden">
            {/* Comic panel header highlight */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#ffd23f]/10 via-transparent to-transparent pointer-events-none" />

            <div>
              {/* Brand */}
              <Link
                to="/"
                className="inline-flex items-center gap-3 group transition-transform active:scale-95 mb-8"
              >
                <div className="w-11 h-11 bg-[#ffd23f] text-black rounded-2xl flex items-center justify-center font-comic text-2xl shadow-comic-sm border-2 border-black group-hover:rotate-[-4deg] transition-transform">
                  <BookOpen className="w-6 h-6 stroke-[2.5]" aria-hidden="true" />
                </div>
                <div className="flex flex-col">
                  <span className="font-comic text-3xl text-white tracking-wider leading-none group-hover:text-[#ffd23f] transition-colors">
                    COMIC <span className="text-[#ffd23f]">RAG</span>
                  </span>
                  <span className="text-xs font-mono tracking-widest text-text-muted uppercase mt-0.5">
                    AI Reader & Companion
                  </span>
                </div>
              </Link>

              {/* Tagline */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#181824] border-2 border-black text-[#ffd23f] text-xs font-mono font-bold uppercase tracking-wider shadow-comic-sm mb-4">
                <Sparkles className="w-3.5 h-3.5 text-[#ff2e63]" />
                NEXT-GEN COMIC VAULT
              </div>

              <h2 className="font-comic text-3xl xl:text-4xl text-white tracking-wide leading-none uppercase mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                ENTER THE <span className="text-[#ffd23f]">STORYVERSE.</span>
              </h2>
              <p className="text-xs xl:text-sm text-text-secondary leading-relaxed mb-8">
                Upload your comics, query character arcs, inspect panels, and chat with an AI companion that truly understands graphic storytelling.
              </p>

              {/* Feature Highlights */}
              <div className="space-y-4">
                <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-[#171722]/60 border border-[#232332]">
                  <div className="w-8 h-8 rounded-xl bg-[#ffd23f]/15 border border-[#ffd23f]/30 flex items-center justify-center text-[#ffd23f] shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">Multimodal RAG Ingestion</h3>
                    <p className="text-[11px] text-text-muted mt-0.5 leading-normal">
                      Every panel, dialogue bubble, and visual element is indexed with high-precision vector embeddings.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-[#171722]/60 border border-[#232332]">
                  <div className="w-8 h-8 rounded-xl bg-[#08d9d6]/15 border border-[#08d9d6]/30 flex items-center justify-center text-[#08d9d6] shrink-0 mt-0.5">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">In-Depth Story Reasoning</h3>
                    <p className="text-[11px] text-text-muted mt-0.5 leading-normal">
                      Ask complex questions about lore, plot twists, villain motives, and visual symbolism.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-[#171722]/60 border border-[#232332]">
                  <div className="w-8 h-8 rounded-xl bg-[#ff2e63]/15 border border-[#ff2e63]/30 flex items-center justify-center text-[#ff2e63] shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">Private & Secure Vault</h3>
                    <p className="text-[11px] text-text-muted mt-0.5 leading-normal">
                      Your library, custom chats, and reading progress remain strictly encrypted and isolated to your profile.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Comic Badge */}
            <div className="mt-8 pt-4 border-t border-[#232332] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-text-muted">
                <Layers className="w-4 h-4 text-[#ffd23f]" />
                <span>PDF & CBZ SUPPORT</span>
              </div>
              <span className="font-comic text-xs px-2.5 py-0.5 bg-[#ffd23f] text-black rounded-md border border-black shadow-comic-sm font-bold tracking-wider rotate-2">
                POW! ⚡
              </span>
            </div>
          </div>

          {/* Right Form Card Container */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="bg-[#13131c]/95 backdrop-blur-xl border-2 border-black rounded-3xl p-6 sm:p-10 shadow-comic-lg relative overflow-hidden">
              {/* Halftone texture */}
              <div className="absolute inset-0 bg-halftone opacity-20 pointer-events-none" />

              {/* Form Header */}
              <div className="relative z-10 mb-6">
                <div className="flex items-center justify-between mb-4">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#181824] border-2 border-black text-[#ffd23f] text-xs font-mono font-bold uppercase tracking-wider shadow-comic-sm">
                    <Sparkles className="w-3.5 h-3.5 text-[#ff2e63]" />
                    {badgeText}
                  </div>

                  {/* Quick Switch Tabs */}
                  <div className="flex items-center bg-[#0d0d12] p-1 rounded-xl border border-[#232332]">
                    <Link
                      to="/login"
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase transition-all ${
                        isLogin
                          ? 'bg-[#ffd23f] text-black shadow-sm'
                          : 'text-text-muted hover:text-white'
                      }`}
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/signup"
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase transition-all ${
                        !isLogin
                          ? 'bg-[#ffd23f] text-black shadow-sm'
                          : 'text-text-muted hover:text-white'
                      }`}
                    >
                      Sign Up
                    </Link>
                  </div>
                </div>

                <h1 className="font-comic text-3xl sm:text-4xl text-white tracking-wider uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {title}
                </h1>
                <p className="text-xs sm:text-sm text-text-secondary mt-1.5 leading-relaxed">
                  {subtitle}
                </p>
              </div>

              {/* Child Form Content */}
              <div className="relative z-10">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
