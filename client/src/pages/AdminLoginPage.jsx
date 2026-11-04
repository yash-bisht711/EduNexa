import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Shield,
  Lock,
  Mail,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Eye,
  EyeOff,
} from 'lucide-react';
import { setSession } from '../store';
import api from '../api';
import { useToast } from '../components/Toast';
import ThemeSwitch from '../components/ThemeSwitch';

export default function AdminLoginPage() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') || 'login';

  const [mode, setMode] = useState(initialMode); // 'login' | 'forgot' | 'reset'
  const [email, setEmail] = useState(searchParams.get('email') || 'admin@edunexa.dev');
  const [password, setPassword] = useState('Password123!');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [token, setToken] = useState(searchParams.get('token') || '');
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

  // Admin Login submit
  async function submitAdminLogin(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post('/auth/admin-login', { email, password });
      dispatch(setSession(data));
      toast.success('Admin identity verified. Access granted.');
      nav('/admin');
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Access denied: Invalid administrator credentials.'
      );
    } finally {
      setBusy(false);
    }
  }

  // Admin Forgot Password
  async function submitAdminForgot(e) {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter the administrator email.');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post('/auth/forgot-password', {
        email,
        role: 'admin',
      });
      toast.success(data.message || 'Admin reset code dispatched.');
      if (data.debugOtp) setDebugOtp(data.debugOtp);
      if (data.previewUrl) setPreviewUrl(data.previewUrl);
      setMode('reset');
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to dispatch admin verification code.'
      );
    } finally {
      setBusy(false);
    }
  }

  // Admin Reset Password
  async function submitAdminReset(e) {
    e.preventDefault();
    if (!otp && !token) {
      toast.error('Please enter the 6-digit administrator verification code.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
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
      toast.success(data.message || 'Administrator password reset successfully.');
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
    <div className="min-h-screen flex items-center justify-center p-3.5 sm:p-6 bg-slate-900 text-slate-100 relative overflow-hidden">
      {/* Background radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.15), transparent 60%), radial-gradient(circle at 80% 80%, rgba(225, 29, 72, 0.1), transparent 50%)',
        }}
      />

      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <ThemeSwitch />
      </div>

      <div className="w-full max-w-md z-10 py-6">
        {/* Security Header Card */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-rose-600 to-indigo-600 text-white shadow-xl shadow-rose-950/40 mb-3 sm:mb-4 ring-4 ring-white/5">
            <Shield size={28} className="sm:w-8 sm:h-8" />
          </div>
          <div className="text-[10px] sm:text-xs font-black tracking-[0.2em] sm:tracking-[0.25em] text-rose-400 uppercase">
            RESTRICTED ACCESS PORTAL
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight mt-1 text-white">
            EduNexa Administration
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1.5 sm:mt-2">
            Authorized System Administrators Only &bull; All sessions monitored
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl sm:rounded-3xl p-5 sm:p-9 shadow-2xl">
          {/* ───────────────── ADMIN LOGIN MODE ───────────────── */}
          {mode === 'login' && (
            <>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 pb-3 border-b border-slate-700">
                <Lock size={14} className="text-rose-400" />
                <span>Admin Authentication</span>
              </div>

              <form onSubmit={submitAdminLogin} className="space-y-4">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Admin Email
                  <div className="relative mt-1.5">
                    <input
                      type="email"
                      className="field !bg-slate-900 !border-slate-700 !text-white pl-9 text-sm"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="admin@edunexa.dev"
                    />
                    <Mail
                      size={16}
                      className="absolute left-3 top-3.5 text-slate-500"
                    />
                  </div>
                </label>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Master Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="field !bg-slate-900 !border-slate-700 !text-white pl-9 pr-10 text-sm"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="••••••••"
                    />
                    <Lock
                      size={16}
                      className="absolute left-3 top-3.5 text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white shadow-lg shadow-rose-900/30 transition duration-200 mt-2"
                >
                  {busy ? 'Authenticating…' : 'Access Admin Console'}
                </button>
              </form>

              <div className="mt-6 p-3 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs text-slate-400 flex items-start gap-2">
                <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Admin Demo: <b className="text-slate-200">admin@edunexa.dev</b> /{' '}
                  <span className="font-mono">Password123!</span>
                </span>
              </div>
            </>
          )}

          {/* ───────────────── ADMIN FORGOT MODE ───────────────── */}
          {mode === 'forgot' && (
            <>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white mb-6"
              >
                <ArrowLeft size={14} /> Back to Admin Sign In
              </button>

              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 grid place-items-center mb-4">
                <KeyRound size={24} />
              </div>

              <div className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                ADMIN ACCESS RECOVERY
              </div>
              <h2 className="text-2xl font-black text-white mt-1">
                Reset Admin Password
              </h2>
              <p className="text-xs text-slate-400 mt-2 mb-6">
                Enter your registered administrator email. A secure 6-digit OTP
                code will be generated and dispatched.
              </p>

              <form onSubmit={submitAdminForgot} className="space-y-4">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Admin Email
                  <div className="relative mt-1.5">
                    <input
                      type="email"
                      className="field !bg-slate-900 !border-slate-700 !text-white pl-9 text-sm"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="admin@edunexa.dev"
                    />
                    <Mail
                      size={16}
                      className="absolute left-3 top-3.5 text-slate-500"
                    />
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white shadow-lg shadow-rose-900/30 transition mt-2"
                >
                  {busy ? 'Dispatching OTP…' : 'Send Admin OTP Code'}
                </button>
              </form>

              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="text-xs text-slate-400 hover:text-slate-200 underline"
                >
                  Already have the admin OTP code? Enter it here
                </button>
              </div>
            </>
          )}

          {/* ───────────────── ADMIN RESET MODE ───────────────── */}
          {mode === 'reset' && (
            <>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white mb-6"
              >
                <ArrowLeft size={14} /> Back to Admin Sign In
              </button>

              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 grid place-items-center mb-4">
                <CheckCircle2 size={24} />
              </div>

              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                SECURITY VERIFICATION
              </div>
              <h2 className="text-2xl font-black text-white mt-1">
                Enter Admin OTP & New Password
              </h2>
              <p className="text-xs text-slate-400 mt-2 mb-6">
                Enter the verification code dispatched to{' '}
                <strong className="text-slate-200">{email}</strong>.
              </p>

              {debugOtp && (
                <div className="mb-4 p-3 rounded-xl bg-slate-900 border border-indigo-500/40 text-xs text-indigo-300 flex items-start gap-2">
                  <span className="text-base">📬</span>
                  <div>
                    <strong>Admin OTP: </strong>
                    <span className="font-mono text-sm font-bold bg-indigo-950 px-2 py-0.5 rounded border border-indigo-500 ml-1">
                      {debugOtp}
                    </span>
                    {previewUrl && (
                      <div className="mt-1">
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 underline font-bold"
                        >
                          View simulated email &rarr;
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={submitAdminReset} className="space-y-4">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  6-Digit Admin Verification Code
                  <input
                    className="field !bg-slate-900 !border-slate-700 !text-white mt-1.5 font-mono text-center text-lg tracking-widest font-bold"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    maxLength={6}
                    placeholder="123456"
                  />
                </label>

                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  New Admin Password (min 8 chars)
                  <input
                    type="password"
                    className="field !bg-slate-900 !border-slate-700 !text-white mt-1.5 text-sm"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="••••••••"
                  />
                </label>

                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Confirm New Password
                  <input
                    type="password"
                    className="field !bg-slate-900 !border-slate-700 !text-white mt-1.5 text-sm"
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
                  className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white shadow-lg shadow-rose-900/30 transition mt-2"
                >
                  {busy ? 'Updating credentials…' : 'Update Admin Password'}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Security watermark footer */}
        <div className="text-center text-[11px] text-slate-500 mt-8">
          <span>EduNexa Security Gateway &bull; Route: Manual Entry Only</span>
        </div>
      </div>
    </div>
  );
}
