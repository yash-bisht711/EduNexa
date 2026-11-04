import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  GraduationCap,
  KeyRound,
  Mail,
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { setSession } from '../store';
import api from '../api';
import { useToast } from '../components/Toast';
import ThemeSwitch from '../components/ThemeSwitch';

export default function AuthPage({ register = false }) {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') || (register ? 'register' : 'login');

  const [mode, setMode] = useState(initialMode); // 'login' | 'register' | 'forgot' | 'reset'
  const [name, setName] = useState('');
  const [email, setEmail] = useState(searchParams.get('email') || 'student@edunexa.dev');
  const [password, setPassword] = useState('Password123!');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [role, setRole] = useState('student');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [debugOtp, setDebugOtp] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  const dispatch = useDispatch();
  const nav = useNavigate();
  const toast = useToast();
  useEffect(() => {
    const urlMode = searchParams.get('mode');
    if (urlMode) setMode(urlMode);
    const urlToken = searchParams.get('token');
    if (urlToken) setToken(urlToken);
    const urlEmail = searchParams.get('email');
    if (urlEmail) setEmail(urlEmail);
  }, [searchParams]);

  // Handle Login & Register submission
  async function submitAuth(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post(
        `/auth/${mode}`,
        mode === 'login'
          ? { email, password }
          : { name, email, password, role }
      );
      dispatch(setSession(data));
      toast.success(`Welcome to EduNexa, ${data.user?.name}!`);
      nav('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to connect to server.');
    } finally {
      setBusy(false);
    }
  }

  // Handle Send Forgot Password Request
  async function submitForgot(e) {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your account email address.');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      toast.success(data.message || 'Verification code sent to your email.');
      if (data.debugOtp) setDebugOtp(data.debugOtp);
      if (data.previewUrl) setPreviewUrl(data.previewUrl);
      setMode('reset');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request password reset.');
    } finally {
      setBusy(false);
    }
  }

  // Handle Reset Password with OTP or Token
  async function submitReset(e) {
    e.preventDefault();
    if (!otp && !token) {
      toast.error('Please provide the 6-digit verification code or reset link.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match. Please verify.');
      return;
    }

    setBusy(true);
    try {
      const { data } = await api.post('/auth/reset-password', {
        email,
        otp: otp.trim(),
        token,
        newPassword,
      });
      toast.success(data.message || 'Password reset successful!');
      setPassword(newPassword);
      setMode('login');
      setDebugOtp('');
      setPreviewUrl('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired code.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_.95fr] bg-white dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Left Branding Panel */}
      <div
        className="hidden lg:flex flex-col justify-between p-14 text-white relative overflow-hidden"
        style={{
          background:
            'radial-gradient(circle at 20% 10%, #7c3aed, transparent 40%), linear-gradient(145deg, #0f172a, #1e1b4b 65%, #312e81)',
        }}
      >
        <div className="flex items-center gap-3 text-xl font-black">
          <Link to="/" className="flex items-center gap-2 text-white">
            <span className="grid place-items-center w-10 h-10 rounded-xl bg-white/15">
              <GraduationCap size={24} />
            </span>
            EduNexa
          </Link>
        </div>

        <div className="max-w-xl z-10">
          <div className="text-sm font-bold tracking-[.2em] text-violet-200 mb-5 uppercase">
            Your Next Chapter Starts Here
          </div>
          <h1 className="text-5xl font-black leading-[1.12]">
            Learn boldly.
            <br />
            Build your future.
          </h1>
          <p className="text-violet-100/80 mt-6 text-lg leading-8">
            One connected platform for world-class courses, live video classrooms,
            interactive assessments, and verifiable credentials.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              ['12k+', 'Active Learners'],
              ['450+', 'Quality Lessons'],
              ['96%', 'Completion Rate'],
            ].map(([stat, label]) => (
              <div
                className="rounded-2xl bg-white/10 backdrop-blur border border-white/10 p-4"
                key={label}
              >
                <div className="text-2xl font-extrabold">{stat}</div>
                <div className="text-xs text-violet-100/70 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-violet-200/60 text-xs flex items-center justify-between z-10">
          <span>&copy; 2026 EduNexa Learning Technologies</span>
          <Link to="/" className="hover:underline">
            &larr; Back to Home
          </Link>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex flex-col justify-between p-4 sm:p-8 md:p-12 relative overflow-y-auto w-full">
        {/* Top bar controls */}
        <div className="flex items-center justify-between w-full max-w-md mx-auto mb-4 sm:mb-6">
          <Link
            to="/"
            className="flex items-center gap-2 font-black text-lg sm:text-xl text-slate-800 dark:text-slate-100 lg:invisible"
          >
            <GraduationCap className="text-[#6557ed]" /> EduNexa
          </Link>

          <ThemeSwitch className="ml-auto" />
        </div>

        <div className="w-full max-w-md mx-auto my-auto py-2 sm:py-6">
          {/* ───────────────── LOGIN / REGISTER VIEW ───────────────── */}
          {(mode === 'login' || mode === 'register') && (
            <>
              <div className="eyebrow">WELCOME TO EDUNEXA</div>
              <h2 className="text-3xl font-extrabold mt-2 tracking-tight text-slate-900 dark:text-slate-100">
                {mode === 'login'
                  ? 'Sign in to your account'
                  : 'Create your account'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2 mb-6 text-sm">
                {mode === 'login'
                  ? 'Continue your learning journey where you left off.'
                  : 'Join thousands of students and instructors worldwide.'}
              </p>

              <form onSubmit={submitAuth} className="space-y-4">
                {mode === 'register' && (
                  <>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Full Name
                      <input
                        className="field mt-1.5"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="e.g. John Doe"
                      />
                    </label>

                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      I want to
                      <select
                        className="field mt-1.5 font-medium"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                      >
                        <option value="student">Learn as a Student</option>
                        <option value="instructor">Teach as an Instructor</option>
                      </select>
                    </label>
                  </>
                )}

                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Email Address
                  <div className="relative mt-1.5">
                    <input
                      type="email"
                      className="field pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="name@domain.com"
                    />
                    <Mail
                      size={16}
                      className="absolute left-3 top-3.5 text-slate-400"
                    />
                  </div>
                </label>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-xs font-semibold text-[#6557ed] hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="field pl-9 pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="••••••••"
                    />
                    <Lock
                      size={16}
                      className="absolute left-3 top-3.5 text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="btn-primary w-full py-3 mt-2 text-sm shadow-md"
                >
                  {busy
                    ? 'Please wait…'
                    : mode === 'login'
                    ? 'Sign In to EduNexa'
                    : 'Create Free Account'}
                </button>
              </form>

              <div className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
                {mode === 'login'
                  ? "Don't have an account yet?"
                  : 'Already registered?'}{' '}
                <button
                  type="button"
                  className="font-bold text-[#6557ed] hover:underline ml-1"
                  onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                >
                  {mode === 'login' ? 'Create an account' : 'Sign in'}
                </button>
              </div>

              {mode === 'login' && (
                <div className="mt-8 p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                  <div className="font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                    <span>⚡</span> Quick Demo Credentials
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 font-mono text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setEmail('student@edunexa.dev');
                        setPassword('Password123!');
                      }}
                      className="text-left p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-[#6557ed]"
                    >
                      <b className="text-[#6557ed]">Student</b>
                      <br />
                      student@edunexa.dev
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail('instructor@edunexa.dev');
                        setPassword('Password123!');
                      }}
                      className="text-left p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-[#6557ed]"
                    >
                      <b className="text-violet-600">Instructor</b>
                      <br />
                      instructor@edunexa.dev
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ───────────────── FORGOT PASSWORD VIEW ───────────────── */}
          {mode === 'forgot' && (
            <>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-6"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>

              <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/50 text-[#6557ed] grid place-items-center mb-4">
                <KeyRound size={24} />
              </div>

              <div className="eyebrow">RECOVER ACCESS</div>
              <h2 className="text-3xl font-extrabold mt-2 tracking-tight text-slate-900 dark:text-slate-100">
                Forgot your password?
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2 mb-6 text-sm">
                Enter your registered email address and we'll send a 6-digit
                verification code to securely reset your password.
              </p>

              <form onSubmit={submitForgot} className="space-y-4">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Account Email Address
                  <div className="relative mt-1.5">
                    <input
                      type="email"
                      className="field pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="student@edunexa.dev"
                    />
                    <Mail
                      size={16}
                      className="absolute left-3 top-3.5 text-slate-400"
                    />
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={busy}
                  className="btn-primary w-full py-3 text-sm shadow-md"
                >
                  {busy ? 'Sending code…' : 'Send Verification Code'}
                </button>
              </form>

              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline"
                >
                  Already have a verification code? Click here
                </button>
              </div>
            </>
          )}

          {/* ───────────────── RESET PASSWORD VIEW ───────────────── */}
          {mode === 'reset' && (
            <>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-6"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>

              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 grid place-items-center mb-4">
                <CheckCircle2 size={24} />
              </div>

              <div className="eyebrow">VERIFICATION & RESET</div>
              <h2 className="text-3xl font-extrabold mt-2 tracking-tight text-slate-900 dark:text-slate-100">
                Set a new password
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2 mb-6 text-sm">
                Enter the 6-digit verification code sent to{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {email}
                </strong>{' '}
                and pick a strong password.
              </p>

              {debugOtp && (
                <div className="mb-4 p-3.5 rounded-xl bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 text-xs text-violet-800 dark:text-violet-200 flex items-start gap-2">
                  <span className="text-base">📬</span>
                  <div>
                    <strong>Verification Code: </strong>
                    <span className="font-mono text-sm font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-violet-300 ml-1">
                      {debugOtp}
                    </span>
                    {previewUrl && (
                      <div className="mt-1.5">
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#6557ed] underline font-bold"
                        >
                          View simulated inbox &rarr;
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={submitReset} className="space-y-4">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  6-Digit Verification Code
                  <input
                    className="field mt-1.5 font-mono text-center text-lg tracking-widest font-bold"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    maxLength={6}
                    placeholder="123456"
                  />
                </label>

                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  New Password (min. 8 characters)
                  <input
                    type="password"
                    className="field mt-1.5"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="••••••••"
                  />
                </label>

                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Confirm New Password
                  <input
                    type="password"
                    className="field mt-1.5"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="••••••••"
                  />
                </label>

                <button
                  type="submit"
                  disabled={busy}
                  className="btn-primary w-full py-3 text-sm shadow-md"
                >
                  {busy ? 'Updating password…' : 'Save New Password & Sign In'}
                </button>
              </form>

              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                >
                  Didn't receive the code? Resend
                </button>
              </div>
            </>
          )}
        </div>

        {/* Bottom Home Link */}
        <div className="text-center text-xs text-slate-400 mt-6">
          <Link to="/" className="hover:underline">
            &larr; Back to EduNexa Home
          </Link>
        </div>
      </div>
    </div>
  );
}
