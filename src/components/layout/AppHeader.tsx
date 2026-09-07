import { BookOpen, Library, LogIn, LogOut, Menu, User as UserIcon } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';

interface AppHeaderProps {
  showMenuButton?: boolean;
}

export function AppHeader({ showMenuButton = false }: AppHeaderProps) {
  const { toggleSidebar } = useUIStore();
  const { user, isAuthenticated, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { to: '/library', label: 'VAULT & LIBRARY', icon: <Library className="w-4 h-4" /> },
  ];

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-14 flex items-center justify-between px-4 sm:px-6 border-b-2 border-[#121216] bg-[#111116] shrink-0 z-30 select-none shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
      {/* Left: Brand Logo & Navigation */}
      <div className="flex items-center gap-4">
        {showMenuButton && (
          <button
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            className="md:hidden p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-[#1d1d24] transition-colors border border-[#262632]"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Comic Brand Logo */}
        <Link
          to="/"
          className="group flex items-center gap-2.5 text-text-primary transition-transform active:scale-95"
        >
          <div className="w-8 h-8 bg-[#ffd23f] text-black rounded-lg flex items-center justify-center font-comic text-lg shadow-comic-sm border-2 border-black group-hover:rotate-[-3deg] transition-transform">
            <BookOpen className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="font-comic text-xl text-[#f3f3f6] tracking-wider leading-none group-hover:text-[#ffd23f] transition-colors">
              COMIC <span className="text-[#ffd23f]">RAG</span>
            </span>
            <span className="text-[9px] font-mono tracking-widest text-text-muted uppercase leading-tight hidden sm:block">
              AI Reader & Companion
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden sm:flex items-center gap-1.5 ml-4" aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                isActive(link.to)
                  ? 'bg-[#1e1e28] text-[#ffd23f] border border-[#ffd23f]/30 shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-[#191922] border border-transparent'
              }`}
            >
              {link.icon}
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2.5">
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-[#262632]">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#191924] border border-[#2b2b3c] text-xs font-mono text-text-secondary">
              <UserIcon className="w-3 h-3 text-[#ffd23f]" />
              <span className="max-w-[120px] truncate text-white font-medium">{user.username}</span>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              aria-label="Sign Out"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-text-muted hover:text-white bg-[#191924] hover:bg-[#222230] border border-[#2b2b3c] rounded-lg transition-colors shadow-comic-sm comic-btn-tactile"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden md:inline font-mono uppercase text-[11px]">Logout</span>
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#191924] hover:bg-[#20202e] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-all shadow-comic-sm border border-[#2b2b3c] comic-btn-tactile"
          >
            <LogIn className="w-3.5 h-3.5 text-[#ffd23f]" />
            <span>Sign In</span>
          </Link>
        )}
      </div>
    </header>
  );
}
