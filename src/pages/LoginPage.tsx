import { useState, useEffect, type FormEvent } from 'react';
import { AlertCircle, Check, Eye, EyeOff, KeyRound, LogIn, Mail, UserPlus, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { AuthLayout } from '../components/auth/AuthLayout';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { validateEmail, validatePassword } from '../utils/validation';

const REMEMBER_EMAIL_KEY = 'comic_vault_remembered_email';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuthStore();
  const { addToast } = useUIStore();

  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_EMAIL_KEY) || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem(REMEMBER_EMAIL_KEY));
  const [showPassword, setShowPassword] = useState(false);

  // Field validation errors
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});

  // Global server or submission error
  const [serverError, setServerError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';

  // Live validation on changes after field is touched
  useEffect(() => {
    if (touched.email) {
      setEmailError(validateEmail(email));
    }
  }, [email, touched.email]);

  useEffect(() => {
    if (touched.password) {
      setPasswordError(validatePassword(password));
    }
  }, [password, touched.password]);

  const handleBlur = (field: 'email' | 'password') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'email') setEmailError(validateEmail(email));
    if (field === 'password') setPasswordError(validatePassword(password));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);

    setEmailError(emailValidation);
    setPasswordError(passwordValidation);
    setTouched({ email: true, password: true });

    if (emailValidation || passwordValidation) {
      return;
    }

    try {
      const trimmedEmail = email.trim();
      await login({ email: trimmedEmail, password });

      // Handle remember email preference
      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, trimmedEmail);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }

      addToast({
        type: 'success',
        message: 'Welcome back to your Comic Vault!',
      });

      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('An unexpected error occurred during login.');
      }
    }
  };

  const isEmailValid = touched.email && !emailError && email.trim().length > 0;

  return (
    <AuthLayout
      badgeText="VAULT ACCESS"
      title="WELCOME BACK, READER!"
      subtitle="Sign in to resume reading, access chat memories, and browse your comic library."
    >
      {/* Server Error Alert Banner */}
      {serverError && (
        <div
          role="alert"
          className="mb-6 p-3.5 bg-red-950/60 border-2 border-red-500/60 rounded-2xl text-red-200 text-xs flex items-start gap-3 shadow-comic animate-shake"
        >
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-red-300 font-mono block mb-0.5">AUTHENTICATION FAILED</span>
            <span className="leading-relaxed">{serverError}</span>
          </div>
          <button
            type="button"
            onClick={() => setServerError(null)}
            aria-label="Dismiss error"
            className="text-red-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-black/40"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Email Address Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="login-email"
              className="text-xs font-mono font-bold uppercase tracking-wider text-text-secondary"
            >
              Email Address <span className="text-[#ff2e63]">*</span>
            </label>
            {isEmailValid && (
              <span className="text-[11px] font-mono text-emerald-400 inline-flex items-center gap-1">
                <Check className="w-3 h-3" /> Valid email
              </span>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
              <Mail className="w-4 h-4" />
            </div>

            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => handleBlur('email')}
              placeholder="hero@comicvault.com"
              autoComplete="email"
              required
              disabled={isLoading}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? 'login-email-error' : undefined}
              className={`w-full pl-10 pr-10 py-3 bg-[#181824] border-2 text-white text-sm rounded-xl outline-none transition-all placeholder:text-text-muted/60 ${
                emailError && touched.email
                  ? 'border-red-500/70 focus:border-red-400 focus:ring-1 focus:ring-red-400/50 bg-red-950/20'
                  : 'border-[#282838] focus:border-[#ffd23f] focus:ring-1 focus:ring-[#ffd23f]/30'
              }`}
            />

            {isEmailValid && (
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-emerald-400">
                <Check className="w-4 h-4" />
              </div>
            )}
          </div>

          {emailError && touched.email && (
            <p id="login-email-error" className="mt-1.5 text-xs text-red-400 font-medium flex items-center gap-1.5 animate-fade-in">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {emailError}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="login-password"
              className="text-xs font-mono font-bold uppercase tracking-wider text-text-secondary"
            >
              Password <span className="text-[#ff2e63]">*</span>
            </label>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
              <KeyRound className="w-4 h-4" />
            </div>

            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => handleBlur('password')}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              disabled={isLoading}
              aria-invalid={!!passwordError}
              aria-describedby={passwordError ? 'login-password-error' : undefined}
              className={`w-full pl-10 pr-11 py-3 bg-[#181824] border-2 text-white text-sm rounded-xl outline-none transition-all placeholder:text-text-muted/60 ${
                passwordError && touched.password
                  ? 'border-red-500/70 focus:border-red-400 focus:ring-1 focus:ring-red-400/50 bg-red-950/20'
                  : 'border-[#282838] focus:border-[#ffd23f] focus:ring-1 focus:ring-[#ffd23f]/30'
              }`}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {passwordError && touched.password && (
            <p id="login-password-error" className="mt-1.5 text-xs text-red-400 font-medium flex items-center gap-1.5 animate-fade-in">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {passwordError}
            </p>
          )}
        </div>

        {/* Remember Email & Help */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-text-secondary hover:text-white select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-2 border-[#323246] bg-[#181824] text-[#ffd23f] focus:ring-0 focus:ring-offset-0 accent-[#ffd23f] cursor-pointer"
            />
            <span className="font-mono text-xs">Remember my email</span>
          </label>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isLoading}
          disabled={isLoading}
          leftIcon={<LogIn className="w-4 h-4 stroke-[2.5]" />}
          className="w-full mt-2 font-comic text-base tracking-wider py-3.5"
        >
          {isLoading ? 'OPENING VAULT...' : 'SIGN IN TO VAULT'}
        </Button>
      </form>

      {/* Switch to Signup */}
      <div className="mt-6 pt-5 border-t border-[#232332] text-center">
        <p className="text-xs text-text-secondary">
          Don't have an account yet?{' '}
          <Link
            to="/signup"
            className="text-[#ffd23f] hover:text-[#ffe17d] font-bold font-mono uppercase inline-flex items-center gap-1 transition-colors ml-1 underline-offset-4 hover:underline"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Create Free Account
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
