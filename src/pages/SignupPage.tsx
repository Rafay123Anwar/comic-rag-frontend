import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { AlertCircle, Check, Eye, EyeOff, KeyRound, LogIn, Mail, ShieldCheck, User, UserPlus, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { AuthLayout } from '../components/auth/AuthLayout';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import {
  calculatePasswordStrength,
  validateConfirmPassword,
  validateEmail,
  validatePassword,
  validateUsername,
} from '../utils/validation';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup, isLoading } = useAuthStore();
  const { addToast } = useUIStore();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Field validation errors
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [touched, setTouched] = useState<{
    username?: boolean;
    email?: boolean;
    password?: boolean;
    confirmPassword?: boolean;
  }>({});

  // Global server or submission error
  const [serverError, setServerError] = useState<string | null>(null);

  // Password Strength computation
  const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password]);

  // Live validation on changes after field is touched
  useEffect(() => {
    if (touched.username) {
      setUsernameError(validateUsername(username));
    }
  }, [username, touched.username]);

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

  useEffect(() => {
    if (touched.confirmPassword) {
      setConfirmError(validateConfirmPassword(password, confirmPassword));
    }
  }, [password, confirmPassword, touched.confirmPassword]);

  const handleBlur = (field: 'username' | 'email' | 'password' | 'confirmPassword') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'username') setUsernameError(validateUsername(username));
    if (field === 'email') setEmailError(validateEmail(email));
    if (field === 'password') setPasswordError(validatePassword(password));
    if (field === 'confirmPassword') setConfirmError(validateConfirmPassword(password, confirmPassword));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const userVal = validateUsername(username);
    const emailVal = validateEmail(email);
    const passVal = validatePassword(password);
    const confVal = validateConfirmPassword(password, confirmPassword);

    setUsernameError(userVal);
    setEmailError(emailVal);
    setPasswordError(passVal);
    setConfirmError(confVal);
    setTouched({ username: true, email: true, password: true, confirmPassword: true });

    if (userVal || emailVal || passVal || confVal) {
      return;
    }

    try {
      const trimmedUsername = username.trim();
      const trimmedEmail = email.trim();

      await signup({
        username: trimmedUsername,
        email: trimmedEmail,
        password,
        confirm_password: confirmPassword,
      });

      addToast({
        type: 'success',
        message: 'Account created successfully! Please sign in to enter your vault.',
      });

      navigate('/login', { replace: true });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('An unexpected error occurred during signup.');
      }
    }
  };

  const isUsernameValid = touched.username && !usernameError && username.trim().length >= 3;
  const isEmailValid = touched.email && !emailError && email.trim().length > 0;
  const isConfirmValid = touched.confirmPassword && !confirmError && confirmPassword.length > 0;

  return (
    <AuthLayout
      badgeText="JOIN THE VAULT"
      title="CREATE YOUR ACCOUNT"
      subtitle="Build your personal comic library and unlock multi-turn comic reasoning."
    >
      {/* Server Error Alert Banner */}
      {serverError && (
        <div
          role="alert"
          className="mb-6 p-3.5 bg-red-950/60 border-2 border-red-500/60 rounded-2xl text-red-200 text-xs flex items-start gap-3 shadow-comic animate-shake"
        >
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-red-300 font-mono block mb-0.5">SIGNUP ISSUE</span>
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

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Username Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="signup-username"
              className="text-xs font-mono font-bold uppercase tracking-wider text-text-secondary"
            >
              Username <span className="text-[#ff2e63]">*</span>
            </label>
            {isUsernameValid && (
              <span className="text-[11px] font-mono text-emerald-400 inline-flex items-center gap-1">
                <Check className="w-3 h-3" /> Available
              </span>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
              <User className="w-4 h-4" />
            </div>

            <input
              id="signup-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={() => handleBlur('username')}
              placeholder="e.g., ComicHero99"
              autoComplete="username"
              required
              disabled={isLoading}
              aria-invalid={!!usernameError}
              aria-describedby={usernameError ? 'signup-username-error' : undefined}
              className={`w-full pl-10 pr-10 py-2.5 bg-[#181824] border-2 text-white text-sm rounded-xl outline-none transition-all placeholder:text-text-muted/60 ${
                usernameError && touched.username
                  ? 'border-red-500/70 focus:border-red-400 focus:ring-1 focus:ring-red-400/50 bg-red-950/20'
                  : 'border-[#282838] focus:border-[#ffd23f] focus:ring-1 focus:ring-[#ffd23f]/30'
              }`}
            />

            {isUsernameValid && (
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-emerald-400">
                <Check className="w-4 h-4" />
              </div>
            )}
          </div>

          {usernameError && touched.username && (
            <p id="signup-username-error" className="mt-1.5 text-xs text-red-400 font-medium flex items-center gap-1.5 animate-fade-in">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {usernameError}
            </p>
          )}
        </div>

        {/* Email Address Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="signup-email"
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
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => handleBlur('email')}
              placeholder="reader@example.com"
              autoComplete="email"
              required
              disabled={isLoading}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? 'signup-email-error' : undefined}
              className={`w-full pl-10 pr-10 py-2.5 bg-[#181824] border-2 text-white text-sm rounded-xl outline-none transition-all placeholder:text-text-muted/60 ${
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
            <p id="signup-email-error" className="mt-1.5 text-xs text-red-400 font-medium flex items-center gap-1.5 animate-fade-in">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {emailError}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="signup-password"
              className="text-xs font-mono font-bold uppercase tracking-wider text-text-secondary"
            >
              Password <span className="text-[#ff2e63]">*</span>
            </label>
            {password && (
              <span className={`text-[11px] font-mono font-bold ${passwordStrength.color}`}>
                Strength: {passwordStrength.label}
              </span>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
              <KeyRound className="w-4 h-4" />
            </div>

            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => handleBlur('password')}
              placeholder="Create strong password (min. 6 chars)"
              autoComplete="new-password"
              required
              disabled={isLoading}
              aria-invalid={!!passwordError}
              aria-describedby={passwordError ? 'signup-password-error' : undefined}
              className={`w-full pl-10 pr-11 py-2.5 bg-[#181824] border-2 text-white text-sm rounded-xl outline-none transition-all placeholder:text-text-muted/60 ${
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

          {/* Password Strength Visual Meter */}
          {password && (
            <div className="mt-2 space-y-1.5 animate-fade-in">
              <div className="grid grid-cols-4 gap-1.5 h-1.5">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-full rounded-full transition-all duration-300 ${
                      passwordStrength.score >= step ? passwordStrength.barColor : 'bg-[#262634]'
                    }`}
                  />
                ))}
              </div>

              {/* Requirement Pills */}
              <div className="grid grid-cols-2 gap-1 pt-1">
                {passwordStrength.requirements.map((req) => (
                  <div
                    key={req.id}
                    className={`flex items-center gap-1.5 text-[10px] font-mono transition-colors ${
                      req.met ? 'text-emerald-400' : 'text-text-muted'
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                        req.met ? 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/40' : 'bg-[#222230] text-text-muted'
                      }`}
                    >
                      {req.met ? '✓' : '•'}
                    </span>
                    <span className="truncate">{req.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {passwordError && touched.password && (
            <p id="signup-password-error" className="mt-1.5 text-xs text-red-400 font-medium flex items-center gap-1.5 animate-fade-in">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {passwordError}
            </p>
          )}
        </div>

        {/* Confirm Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="signup-confirm-password"
              className="text-xs font-mono font-bold uppercase tracking-wider text-text-secondary"
            >
              Confirm Password <span className="text-[#ff2e63]">*</span>
            </label>
            {isConfirmValid && (
              <span className="text-[11px] font-mono text-emerald-400 inline-flex items-center gap-1">
                <Check className="w-3 h-3" /> Passwords match
              </span>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
              <ShieldCheck className="w-4 h-4" />
            </div>

            <input
              id="signup-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => handleBlur('confirmPassword')}
              placeholder="Re-enter password to verify"
              autoComplete="new-password"
              required
              disabled={isLoading}
              aria-invalid={!!confirmError}
              aria-describedby={confirmError ? 'signup-confirm-error' : undefined}
              className={`w-full pl-10 pr-11 py-2.5 bg-[#181824] border-2 text-white text-sm rounded-xl outline-none transition-all placeholder:text-text-muted/60 ${
                confirmError && touched.confirmPassword
                  ? 'border-red-500/70 focus:border-red-400 focus:ring-1 focus:ring-red-400/50 bg-red-950/20'
                  : 'border-[#282838] focus:border-[#ffd23f] focus:ring-1 focus:ring-[#ffd23f]/30'
              }`}
            />

            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-white transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {confirmError && touched.confirmPassword && (
            <p id="signup-confirm-error" className="mt-1.5 text-xs text-red-400 font-medium flex items-center gap-1.5 animate-fade-in">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {confirmError}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isLoading}
          disabled={isLoading}
          leftIcon={<UserPlus className="w-4 h-4 stroke-[2.5]" />}
          className="w-full mt-3 font-comic text-base tracking-wider py-3.5"
        >
          {isLoading ? 'CREATING YOUR VAULT...' : 'CREATE ACCOUNT'}
        </Button>
      </form>

      {/* Switch to Login */}
      <div className="mt-6 pt-5 border-t border-[#232332] text-center">
        <p className="text-xs text-text-secondary">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-[#ffd23f] hover:text-[#ffe17d] font-bold font-mono uppercase inline-flex items-center gap-1 transition-colors ml-1 underline-offset-4 hover:underline"
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In Here
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
