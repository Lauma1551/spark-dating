import { useState } from 'react';
import type { FormEvent } from 'react';
import { auth, googleProvider } from '../lib/firebase';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  AuthError
} from 'firebase/auth';
import {
  Heart,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type AuthMode = 'login' | 'register' | 'forgot-password';

export function Auth({ onLogin }: { onLogin: (user: any) => void }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Email validation helper
  const isValidEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr.trim());
  };

  // Password validation helper
  const isPasswordSecure = (pwd: string) => {
    return pwd.length >= 6;
  };

  const getFriendlyErrorMessage = (error: any): string => {
    if (!error) return 'An unexpected error occurred. Please try again.';
    const code = error.code || '';

    switch (code) {
      case 'auth/email-already-in-use':
        return 'This email address is already registered. Please sign in or reset your password.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address format (e.g. name@example.com).';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Invalid email or password. Please verify your credentials and try again.';
      case 'auth/weak-password':
        return 'Password is too weak. Please use at least 6 characters with letters and numbers.';
      case 'auth/user-disabled':
        return 'This user account has been disabled. Please contact support.';
      case 'auth/too-many-requests':
        return 'Access to this account has been temporarily disabled due to many failed attempts. Try again later or reset your password.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection and try again.';
      case 'auth/popup-closed-by-user':
        return 'Google sign-in popup was closed before completing.';
      case 'auth/popup-blocked':
        return 'Sign-in popup was blocked by your browser. Please enable popups.';
      default:
        return error.message || 'Authentication failed. Please check your details and try again.';
    }
  };

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();

    // Client-side validation
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setError('Please enter a valid email address (e.g., alex@example.com).');
      return;
    }

    if (!password) {
      setError('Please enter a password.');
      return;
    }

    if (mode === 'register') {
      if (!isPasswordSecure(password)) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-enter your password confirmation.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const cred = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        onLogin(cred.user);
      } else if (mode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        setSuccessMessage('Account created successfully! Setting up your profile...');
        onLogin(cred.user);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('Please enter the email associated with your account.');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setError('Please enter a valid email address format.');
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setSuccessMessage(`A password reset link has been sent to ${trimmedEmail}. Please check your inbox and spam folder.`);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      onLogin(cred.user);
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-rose-50 dark:bg-[#09090B] p-4 text-slate-900 dark:text-slate-100 font-sans transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-[#1A1A1E] rounded-[36px] shadow-2xl overflow-hidden border border-zinc-200 dark:border-white/10">
        
        {/* Card Header & Brand */}
        <div className="pt-8 pb-4 px-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 to-violet-600 text-white shadow-lg shadow-rose-500/25 mb-4">
            <Heart className="w-7 h-7 fill-current" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {mode === 'login' && 'Sign In to Spark'}
            {mode === 'register' && 'Create Your Account'}
            {mode === 'forgot-password' && 'Reset Your Password'}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-slate-400 mt-1.5 max-w-xs mx-auto">
            {mode === 'login' && 'Enter your registered email and password to connect with singles.'}
            {mode === 'register' && 'Sign up with email to find real matches and start chatting.'}
            {mode === 'forgot-password' && "Enter your email and we'll send you a recovery link."}
          </p>
        </div>

        {/* Tab Switcher for Login / Register */}
        {mode !== 'forgot-password' && (
          <div className="px-8 mb-4">
            <div className="grid grid-cols-2 p-1 bg-zinc-100 dark:bg-white/5 rounded-2xl border border-zinc-200/60 dark:border-white/5">
              <button
                type="button"
                id="tab-sign-in"
                onClick={() => switchMode('login')}
                className={`py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'login'
                    ? 'bg-white dark:bg-[#25252A] text-rose-600 dark:text-rose-400 shadow-sm'
                    : 'text-zinc-500 dark:text-slate-400 hover:text-zinc-800 dark:hover:text-slate-200'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </button>
              <button
                type="button"
                id="tab-sign-up"
                onClick={() => switchMode('register')}
                className={`py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'register'
                    ? 'bg-white dark:bg-[#25252A] text-rose-600 dark:text-rose-400 shadow-sm'
                    : 'text-zinc-500 dark:text-slate-400 hover:text-zinc-800 dark:hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Sign Up
              </button>
            </div>
          </div>
        )}

        <div className="px-8 pb-8 pt-2">
          {/* Notifications (Error / Success) */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-4 p-3.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-2xl text-xs flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{error}</span>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-4 p-3.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-2xl text-xs flex items-start gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* MAIN FORM: LOGIN & REGISTER */}
          {mode !== 'forgot-password' ? (
            <form onSubmit={handleAuth} className="space-y-4">
              {/* Email field */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-slate-500" />
                  <input
                    id="auth-email-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-slate-100 placeholder-zinc-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all text-xs sm:text-sm"
                    required
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot-password')}
                      className="text-xs text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-semibold transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-slate-500" />
                  <input
                    id="auth-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'register' ? 'At least 6 characters' : 'Enter your password'}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    disabled={loading}
                    className="w-full pl-10 pr-11 py-3 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-slate-100 placeholder-zinc-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all text-xs sm:text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-slate-300 p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (Register mode only) */}
              {mode === 'register' && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-slate-500" />
                    <input
                      id="auth-confirm-password-input"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      disabled={loading}
                      className="w-full pl-10 pr-11 py-3 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-slate-100 placeholder-zinc-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all text-xs sm:text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-slate-300 p-1"
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Realtime password feedback */}
                  <div className="mt-2 space-y-1 text-[11px] text-zinc-500 dark:text-slate-400 pl-1">
                    <div className="flex items-center gap-1.5">
                      <span className={password.length >= 6 ? 'text-emerald-500 font-bold' : 'text-zinc-400'}>
                        {password.length >= 6 ? '✓' : '•'}
                      </span>
                      <span>Minimum 6 characters</span>
                    </div>
                    {confirmPassword.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className={password === confirmPassword ? 'text-emerald-500 font-bold' : 'text-rose-500'}>
                          {password === confirmPassword ? '✓' : '✗'}
                        </span>
                        <span className={password === confirmPassword ? 'text-emerald-500' : 'text-rose-500'}>
                          {password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                id="btn-auth-submit"
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 px-6 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold rounded-2xl transition-all disabled:opacity-50 shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : mode === 'login' ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* FORGOT PASSWORD FORM */
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400 mb-1.5">
                  Account Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-slate-100 placeholder-zinc-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all text-xs sm:text-sm"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold rounded-2xl transition-all disabled:opacity-50 shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Send Password Reset Email</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => switchMode('login')}
                className="w-full py-2.5 text-xs text-zinc-500 hover:text-zinc-800 dark:text-slate-400 dark:hover:text-slate-200 font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </button>
            </form>
          )}

          {/* Social Sign In Divider */}
          {mode !== 'forgot-password' && (
            <>
              <div className="mt-6 flex items-center justify-between">
                <hr className="w-full border-zinc-200 dark:border-white/10" />
                <span className="px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-slate-500">or</span>
                <hr className="w-full border-zinc-200 dark:border-white/10" />
              </div>

              {/* Google Sign-in */}
              <button
                id="btn-google-auth"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="mt-6 w-full py-3 px-4 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-700 dark:text-slate-300 font-semibold rounded-2xl transition-all flex items-center justify-center gap-2.5 text-xs sm:text-sm disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Continue with Google</span>
              </button>
            </>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 bg-zinc-50 dark:bg-black/20 text-center border-t border-zinc-200 dark:border-white/5">
          {mode === 'login' && (
            <p className="text-xs text-zinc-600 dark:text-slate-400">
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="font-bold text-rose-500 hover:text-rose-400 transition-colors underline-offset-2 hover:underline"
              >
                Sign up now
              </button>
            </p>
          )}
          {mode === 'register' && (
            <p className="text-xs text-zinc-600 dark:text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="font-bold text-rose-500 hover:text-rose-400 transition-colors underline-offset-2 hover:underline"
              >
                Sign in here
              </button>
            </p>
          )}
          {mode === 'forgot-password' && (
            <p className="text-xs text-zinc-600 dark:text-slate-400">
              Remembered your password?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="font-bold text-rose-500 hover:text-rose-400 transition-colors underline-offset-2 hover:underline"
              >
                Return to Login
              </button>
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 text-[11px] text-zinc-400 dark:text-slate-500">
        <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
        <span>Secured with Firebase Authentication</span>
      </div>
    </div>
  );
}
