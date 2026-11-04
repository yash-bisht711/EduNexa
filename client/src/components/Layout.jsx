import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store';
import api from '../api';
import { connectSocket, disconnectSocket } from '../socket';
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Video,
  Wallet,
  GraduationCap,
  ArrowUpRight,
  Search,
  Bell,
  Menu,
  X,
  Shield,
  BookMarked,
  Sparkles,
  Building2,
  LogOut,
  CheckCheck,
  User,
  Home as HomeIcon,
} from 'lucide-react';
import { initials } from './shared';
import ThemeSwitch from './ThemeSwitch';

// Page imports
import DashboardPage from '../pages/DashboardPage';
import CoursesPage from '../pages/CoursesPage';
import CourseDetailPage from '../pages/CourseDetailPage';
import LearnPage from '../pages/LearnPage';
import QuizPage from '../pages/QuizPage';
import LivePage from '../pages/LivePage';
import FinancePage from '../pages/FinancePage';
import AdminPage from '../pages/AdminPage';
import AIPage from '../pages/AIPage';
import OrganizationsPage from '../pages/OrganizationsPage';
import ManagePage from '../pages/ManagePage';
import CertificatesPage from '../pages/CertificatesPage';
import ProfilePage from '../pages/ProfilePage';

const navItems = [
  ['Overview', LayoutDashboard, '/dashboard'],
  ['My Learning', BookOpen, '/learning'],
  ['Explore Courses', Search, '/courses'],
  ['Live Classes', Video, '/live'],
  ['Quizzes', ClipboardCheck, '/quizzes'],
  ['Certificates', GraduationCap, '/certificates'],
  ['AI Learning Coach', Sparkles, '/ai'],
  ['Organizations', Building2, '/organizations'],
  ['My Profile', User, '/profile'],
];

function playNotificationTone(context) {
  if (context.state !== 'running') return;
  const startAt = context.currentTime;
  [880, 660].forEach((frequency, index) => {
    const start = startAt + index * 0.14;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.13);
  });
}

export function Layout() {
  const user = useSelector((s) => s.auth.user);
  const token = useSelector((s) => s.auth.token);
  const dispatch = useDispatch();
  const loc = useLocation();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const soundEnabledRef = useRef(
    localStorage.getItem('edunexa_notification_sound') !== 'false',
  );
  const audioContextRef = useRef(null);
  const isStaff = ['instructor', 'admin'].includes(user?.role);

  const unlockNotificationAudio = () => {
    if (!soundEnabledRef.current) return null;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    try {
      if (!audioContextRef.current) audioContextRef.current = new AudioContext();
      const context = audioContextRef.current;
      if (context.state === 'suspended') {
        context.resume().catch((error) => {
          console.warn('Could not enable notification sound:', error.message);
        });
      }
      return context;
    } catch (error) {
      console.warn('Could not enable notification sound:', error.message);
      return null;
    }
  };

  const loadNotifs = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifs(res.data.notifications || []);
    } catch {
      // Ignore if unavailable
    }
  };

  useEffect(() => {
    loadNotifs();
  }, []);

  useEffect(() => {
    const unlock = () => unlockNotificationAudio();
    const syncSoundPreference = () => {
      soundEnabledRef.current = localStorage.getItem('edunexa_notification_sound') !== 'false';
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('edunexa-notification-sound-change', syncSoundPreference);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('edunexa-notification-sound-change', syncSoundPreference);
    };
  }, []);

  // Global realtime channel: connect once per session, receive pushed notifications.
  useEffect(() => {
    if (!token) {
      disconnectSocket();
      return;
    }
    const socket = connectSocket(token);
    const onNew = (n) => {
      setNotifs((prev) => [n, ...prev].slice(0, 20));
      if (soundEnabledRef.current) {
        const context = unlockNotificationAudio();
        if (context?.state === 'running') playNotificationTone(context);
      }
    };
    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, [token]);

  const unread = notifs.filter((n) => !n.read).length;

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // Ignore
    }
  };

  const openNotification = async (n) => {
    setShowNotifs(false);
    if (!n.read) {
      try {
        await api.patch(`/notifications/${n._id}/read`);
        setNotifs((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      } catch {
        // Ignore
      }
    }
    if (n.link) navigate(n.link);
  };

  // Derive page title from path
  const pageTitle =
    loc.pathname === '/' || loc.pathname === '/dashboard'
      ? 'Overview'
      : loc.pathname.split('/')[1]
          ?.replace(/-/g, ' ')
          .replace(/^./, (x) => x.toUpperCase());

  return (
    <div className="min-h-screen bg-[#f7f8fc] dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 flex transition-colors duration-200">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky z-40 top-0 left-0 h-screen w-[260px] max-w-[85vw] bg-white dark:bg-[#111827] border-r border-slate-100 dark:border-slate-800 flex flex-col p-4 sm:p-5 transition-transform duration-200 ${
          mobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo & Close Button */}
        <div className="flex items-center gap-3 px-2 py-3 mb-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#6557ed] text-white grid place-items-center shadow-md">
              <GraduationCap size={23} />
            </div>
            <div className="font-black text-xl tracking-tight">
              Edu<span className="text-[#6557ed]">Nexa</span>
              <div className="text-[9px] tracking-[.22em] text-slate-400 font-bold uppercase">
                Learning Platform
              </div>
            </div>
          </Link>
          <button
            className="ml-auto lg:hidden text-slate-500 hover:text-slate-800 dark:text-slate-400"
            onClick={() => setMobile(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Portal Switch */}
        <div className="px-2 mb-4">
          <Link
            to="/"
            onClick={() => setMobile(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <HomeIcon size={15} className="text-[#6557ed]" />
            <span>Home / Portal Landing</span>
          </Link>
        </div>

        {/* Main nav */}
        <div className="eyebrow px-3 mb-2 text-slate-400">LEARN</div>
        <nav className="space-y-1 flex-1 overflow-y-auto pr-1">
          {navItems.map(([label, Icon, to]) => (
            <Link
              key={to}
              onClick={() => setMobile(false)}
              to={to}
              className={`sidebar-link ${
                loc.pathname === to || (to === '/dashboard' && loc.pathname === '/')
                  ? 'active'
                  : ''
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}

          {/* Staff/instructor nav */}
          {isStaff && (
            <>
              <div className="eyebrow px-3 mt-6 mb-2 text-slate-400">MANAGE</div>
              <Link
                className={`sidebar-link ${
                  loc.pathname === '/manage' ? 'active' : ''
                }`}
                to="/manage"
                onClick={() => setMobile(false)}
              >
                <BookMarked size={18} />
                Course Studio
              </Link>
              <Link
                className={`sidebar-link ${
                  loc.pathname === '/earnings' ? 'active' : ''
                }`}
                to="/earnings"
                onClick={() => setMobile(false)}
              >
                <Wallet size={18} />
                Earnings
              </Link>
            </>
          )}

          {/* Admin link */}
          {user?.role === 'admin' && (
            <>
              <div className="eyebrow px-3 mt-6 mb-2 text-slate-400">ADMIN</div>
              <Link
                to="/admin"
                onClick={() => setMobile(false)}
                className={`sidebar-link ${
                  loc.pathname === '/admin' ? 'active' : ''
                }`}
              >
                <Shield size={18} />
                Administration
              </Link>
            </>
          )}
        </nav>

        {/* Bottom widget & User row */}
        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition group">
            <Link
              to="/profile"
              onClick={() => setMobile(false)}
              className="flex items-center gap-3 min-w-0 flex-1"
              title="View & Edit Profile"
            >
              <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/60 text-[#6557ed] dark:text-violet-300 font-bold grid place-items-center overflow-hidden shrink-0">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials(user?.name)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold truncate text-slate-800 dark:text-slate-100 group-hover:text-[#6557ed] transition">
                  {user?.name}
                </div>
                <div className="text-xs text-slate-400 capitalize">
                  {user?.role} &bull; Edit profile
                </div>
              </div>
            </Link>

            <button
              onClick={() => { disconnectSocket(); dispatch(logout()); }}
              title="Sign out"
              aria-label="Sign out"
              className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-500 transition"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobile && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setMobile(false)}
        />
      )}

      {/* Main content */}
      <main className="min-w-0 flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-16 sm:h-[76px] bg-white/90 dark:bg-[#111827]/90 backdrop-blur border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-3.5 sm:px-6 lg:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              onClick={() => setMobile(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <div className="font-extrabold text-slate-900 dark:text-slate-100 text-base sm:text-lg truncate">
                {pageTitle}
              </div>
              <div className="text-[11px] sm:text-xs text-slate-400 hidden sm:block truncate">
                Welcome back, {user?.name?.split(' ')[0]} 👋
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 relative shrink-0">
            <div className="hidden md:flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-400 border border-slate-100 dark:border-slate-700">
              <Search size={15} />
              <span>Search courses, lessons…</span>
            </div>

            <ThemeSwitch />

            {/* Notification Bell & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifs(!showNotifs)}
                className={`relative w-9 h-9 sm:w-10 sm:h-10 grid place-items-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition border border-slate-100 dark:border-slate-700 ${unread ? 'live-bell-ring' : ''}`}
                aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
              >
                <Bell size={17} />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full grid place-items-center border-2 border-white dark:border-[#111827]">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 mt-2 w-[calc(100vw-32px)] sm:w-80 max-w-sm bg-white dark:bg-[#121826] rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-4 z-50">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-black text-xs text-slate-800 dark:text-slate-100">
                      Notifications {unread > 0 && <span className="text-rose-500">({unread})</span>}
                    </span>
                    <button
                      onClick={markAllRead}
                      className="text-[10px] font-bold text-[#6557ed] hover:underline flex items-center gap-1"
                    >
                      <CheckCheck size={12} /> Mark all read
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto mt-2 space-y-2">
                    {notifs.map((n) => (
                      <button
                        key={n._id}
                        onClick={() => openNotification(n)}
                        className={`w-full text-left p-2.5 rounded-xl text-xs transition ${
                          n.read
                            ? 'bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                            : 'bg-violet-50/70 dark:bg-violet-950/40 text-slate-800 dark:text-slate-200 font-medium hover:bg-violet-100 dark:hover:bg-violet-900/50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {n.type === 'live_class' && <Video size={12} className="text-[#6557ed] shrink-0" />}
                          <span className="font-bold">{n.title}</span>
                          {!n.read && <i className="ml-auto w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />}
                        </div>
                        {n.body && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {n.body}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400/80 mt-1">
                          {new Date(n.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          {n.link && <span className="text-[#6557ed] font-bold"> • Open</span>}
                        </div>
                      </button>
                    ))}
                    {notifs.length === 0 && (
                      <div className="text-center py-6 text-xs text-slate-400">
                        No new notifications
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar Quick Link */}
            <Link
              to="/profile"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#e9e7ff] dark:bg-violet-900/60 text-[#6557ed] dark:text-violet-200 font-bold grid place-items-center text-xs overflow-hidden border border-violet-200 dark:border-violet-700 shadow-sm hover:scale-105 transition"
              title="My Profile"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user?.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                initials(user?.name)
              )}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <div className="p-3.5 sm:p-6 lg:p-8 max-w-[1440px] mx-auto w-full flex-1 overflow-x-hidden">
          <Routes>
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="learning" element={<LearnPage />} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="course/:id" element={<CourseDetailPage />} />
            <Route path="live" element={<LivePage />} />
            <Route path="quizzes" element={<QuizPage />} />
            <Route path="certificates" element={<CertificatesPage />} />
            <Route path="ai" element={<AIPage />} />
            <Route path="organizations" element={<OrganizationsPage />} />
            <Route
              path="manage"
              element={isStaff ? <ManagePage /> : <Navigate to="/dashboard" />}
            />
            <Route
              path="earnings"
              element={isStaff ? <FinancePage /> : <Navigate to="/dashboard" />}
            />
            <Route
              path="admin"
              element={
                user?.role === 'admin' ? (
                  <AdminPage />
                ) : (
                  <Navigate to="/dashboard" />
                )
              }
            />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
