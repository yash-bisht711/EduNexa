import React, { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Camera,
  Upload,
  Save,
  LogOut,
  Sun,
  Moon,
  Shield,
  GraduationCap,
  Sparkles,
  BookMarked,
  Check,
  Calendar,
  Loader2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { updateUser, logout } from '../store';
import api from '../api';
import { useToast } from '../components/Toast';
import { useTheme } from '../ThemeContext';
import { initials } from '../components/shared';
import ThemeSwitch from '../components/ThemeSwitch';

export default function ProfilePage() {
  const user = useSelector((s) => s.auth?.user);
  const dispatch = useDispatch();
  const nav = useNavigate();
  const toast = useToast();
  const { theme, toggleTheme } = useTheme();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notificationSound, setNotificationSound] = useState(
    () => localStorage.getItem('edunexa_notification_sound') !== 'false',
  );
  const fileInputRef = useRef(null);

  const handleNotificationSoundChange = () => {
    const enabled = !notificationSound;
    setNotificationSound(enabled);
    localStorage.setItem('edunexa_notification_sound', String(enabled));
    window.dispatchEvent(new Event('edunexa-notification-sound-change'));
  };

  // Handle image upload from disk
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be under 5 MB.');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    setUploading(true);
    try {
      const { data } = await api.post('/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAvatar(data.avatar);
      dispatch(updateUser({ avatar: data.avatar }));
      toast.success('Avatar photo uploaded successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload photo.');
    } finally {
      setUploading(false);
    }
  };

  // Handle profile form submit
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.put('/auth/profile', {
        name: name.trim(),
        bio: bio.trim(),
        avatar: avatar.trim(),
      });
      dispatch(updateUser(data.user));
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
    nav('/dashboard')
  };

  const handleLogout = () => {
    dispatch(logout());
    toast.success('You have been signed out successfully.');
    nav('/login');
  };

  // const handleProfileSave = () => {
  //   toast.success('Profile Updated Successfully!!!');
  //   nav('/dashboard');
  // };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <Shield size={13} /> Administrator
          </span>
        );
      case 'instructor':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
            <BookMarked size={13} /> Instructor
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <GraduationCap size={13} /> Student
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto w-full">
      {/* Header Banner */}
      <div className="panel p-5 sm:p-8 relative overflow-hidden bg-gradient-to-r from-violet-600/10 via-brand/10 to-indigo-600/10 dark:from-violet-900/20 dark:to-slate-900">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6">
          {/* Avatar with photo edit overlay */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border-2 border-white dark:border-slate-700 shadow-xl grid place-items-center">
              {avatar ? (
                <img
                  src={avatar}
                  alt={user?.name}
                  className="w-full h-full object-cover"
                  onError={() => setAvatar('')}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#6557ed] to-indigo-700 text-white font-extrabold text-2xl sm:text-3xl grid place-items-center">
                  {initials(user?.name)}
                </div>
              )}
            </div>

            {/* Upload trigger button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-2 -right-2 p-2 sm:p-2.5 rounded-xl bg-[#6557ed] hover:bg-[#5143d6] text-white shadow-lg transition"
              title="Upload new photo"
              aria-label="Upload photo"
            >
              <Camera size={15} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* User quick info */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 sm:gap-3">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight break-words">
                {user?.name}
              </h1>
              {getRoleBadge(user?.role)}
            </div>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-center sm:justify-start gap-1.5 truncate">
              <Mail size={14} className="shrink-0" /> <span className="truncate">{user?.email}</span>
            </p>

            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              Member of EduNexa Platform
            </p>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2 mt-2 sm:mt-0 shrink-0">
            {/* <ThemeSwitch /> */}

            <button
              onClick={handleLogout}
              className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-bold text-xs transition flex items-center gap-1.5"
              title="Sign out of account"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Settings Tabs / Form */}
      <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
        {/* Left Column: Form */}
        <div className="md:col-span-2 space-y-6">
          <div className="panel p-5 sm:p-7">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
              <div>
                <h2 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-slate-100">
                  Profile Information
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update your public display name, photo, and bio details.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="field pl-9 font-semibold text-sm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your full name"
                  />
                  <User
                    size={16}
                    className="absolute left-3 top-3.5 text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    disabled
                    className="field pl-9 !bg-slate-50 dark:!bg-slate-800/50 text-slate-500 text-sm cursor-not-allowed"
                    value={user?.email || ''}
                  />
                  <Mail
                    size={16}
                    className="absolute left-3 top-3.5 text-slate-400"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Email is associated with your authentication credentials.
                </span>
              </div>

              {/* <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Photo / Avatar URL
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    className="field text-sm"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="btn-muted !px-4 shrink-0 text-xs font-bold flex items-center justify-center gap-1.5 py-2.5"
                  >
                    <Upload size={14} />
                    {uploading ? 'Uploading…' : 'Upload File'}
                  </button>
                </div>
              </div> */}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Bio / About You
                </label>
                <textarea
                  className="field min-h-[100px] sm:min-h-[110px] text-sm resize-none"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share a short summary about your learning journey, goals or professional background…"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary w-full sm:w-auto !py-3 !px-6 text-sm shadow-md"
                >
                  {/* <Save size={16} />
                  <span>{saving ? 'Saving changes…' : 'Save Profile Changes'}</span> */}
                  {saving ? (
      <>
        <Loader2 size={16} className="animate-spin" />
        <span>Saving changes…</span>
      </>
    ) : (
      <>
        <Save size={16} />
        <span>Save Profile Changes</span>
      </>
    )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Preferences & Security */}
        <div className="space-y-6">
          {/* Appearance Facility */}
          <div className="panel p-5 sm:p-6">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 mb-1">
              Interface Theme
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Select between light and darkness facility.
            </p>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  if (theme !== 'light') toggleTheme();
                }}
                className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-2 ${
                  theme === 'light'
                    ? 'border-[#6557ed] bg-violet-50/70 text-[#6557ed] shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 grid place-items-center shadow-sm">
                  <Sun size={17} className="text-amber-500" />
                </div>
                <div className="text-xs font-bold">Light Mode</div>
                {theme === 'light' && (
                  <Check size={14} className="text-[#6557ed]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (theme !== 'dark') toggleTheme();
                }}
                className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-2 ${
                  theme === 'dark'
                    ? 'border-[#6557ed] bg-violet-950/60 text-violet-300 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-slate-900 grid place-items-center shadow-sm">
                  <Moon size={17} className="text-indigo-400" />
                </div>
                <div className="text-xs font-bold">Dark Mode</div>
                {theme === 'dark' && (
                  <Check size={14} className="text-[#6557ed]" />
                )}
              </button>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="panel p-5 sm:p-6">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 mb-1">
              Notifications
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Choose whether new in-app notifications play a sound.
            </p>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-[#6557ed] grid place-items-center">
                  {notificationSound ? <Volume2 size={17} /> : <VolumeX size={17} />}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Notification sound
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {notificationSound ? 'Sound is on' : 'Sound is off'}
                  </div>
                </div>
              </div>
              <label className="notification-sound-switch">
                <input
                  type="checkbox"
                  checked={notificationSound}
                  onChange={handleNotificationSoundChange}
                  aria-label="Notification sound"
                />
                <span className="notification-sound-track" aria-hidden="true" />
              </label>
            </div>
          </div>

          {/* Account Details Card */}
          <div className="panel p-5 sm:p-6">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 mb-4">
              Account Overview
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Account Role</span>
                <span className="font-bold capitalize text-slate-800 dark:text-slate-200">
                  {user?.role}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Status</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  Active
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Password</span>
                <span className="text-[#6557ed] font-semibold">Protected</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/50 dark:text-slate-300 dark:hover:text-rose-300 font-bold text-xs transition flex items-center justify-center gap-2"
              >
                <LogOut size={14} />
                <span>Sign Out of EduNexa</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
