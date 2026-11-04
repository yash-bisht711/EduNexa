import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Search } from 'lucide-react';
import api from '../api';

// ─── useLoad hook ───────────────────────────────────────────────
export function useLoad(url, initial) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = () => {
    setLoading(true);
    api
      .get(url)
      .then((r) => setData(r.data))
      .catch((e) => setError(e.response?.data?.message || 'Could not load data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return { data, loading, error, reload, setData };
}

// ─── Helpers ─────────────────────────────────────────────────────
export const money = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0);

export const initials = (n) =>
  (n || 'E')
    .split(' ')
    .map((x) => x[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

// ─── Heading ─────────────────────────────────────────────────────
export function Heading({ eyebrow, title, sub, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
      <div className="min-w-0">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="text-xl sm:text-2xl md:text-[28px] font-black tracking-tight mt-1.5 text-slate-900 dark:text-slate-100 break-words">
          {title}
        </h1>
        {sub && <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-2xl">{sub}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ─── Notice ──────────────────────────────────────────────────────
export function Notice({ children }) {
  return (
    <div className="bg-violet-50 dark:bg-violet-950/60 text-violet-800 dark:text-violet-200 border border-violet-200 dark:border-violet-800/80 rounded-xl p-3 text-sm mt-4">
      {children}
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────
export function Empty({ icon: Icon, title, text, action }) {
  return (
    <div className="panel p-6 sm:p-10 text-center">
      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-violet-50 dark:bg-violet-950/60 text-brand rounded-2xl grid place-items-center mx-auto">
        <Icon size={24} />
      </div>
      <h3 className="font-extrabold mt-4 text-base sm:text-lg text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-400 mt-2 max-w-sm mx-auto">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── CourseCard ───────────────────────────────────────────────────
export function CourseCard({ course: c }) {
  const avgRating = c.avgRating || 0;
  const enrollmentCount = c.enrollmentCount || 0;

  return (
    <Link
      to={`/course/${c._id}`}
      className="panel overflow-hidden hover:-translate-y-1 transition block"
    >
      <img
        src={
          c.thumbnail ||
          'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=700'
        }
        className="w-full h-36 object-cover"
        alt={c.title}
      />
      <div className="p-4">
        <div className="flex justify-between text-xs text-slate-400">
          <span>{c.category}</span>
          <span className="capitalize">{c.level}</span>
        </div>
        <h3 className="font-extrabold mt-2 leading-snug">{c.title}</h3>
        <div className="text-xs text-slate-400 mt-2">
          {c.lessons?.length || 0} lessons · {c.instructor?.name || 'Instructor'}
        </div>
        {/* Rating row */}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((s) => (
              <svg
                key={s}
                width={13}
                height={13}
                viewBox="0 0 24 24"
                fill={avgRating >= s ? '#f59e0b' : avgRating >= s - 0.5 ? 'url(#half)' : '#e2e8f0'}
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="half">
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="50%" stopColor="#e2e8f0" />
                  </linearGradient>
                </defs>
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
              </svg>
            ))}
          </div>
          <span className="text-xs text-slate-400">
            {avgRating > 0 ? avgRating.toFixed(1) : 'No ratings'}
          </span>
          {enrollmentCount > 0 && (
            <span className="text-xs text-slate-400 ml-auto">
              {enrollmentCount.toLocaleString()} enrolled
            </span>
          )}
        </div>
        <div className="font-extrabold text-brand mt-3">
          {c.price ? money(c.price) : 'Free'}
        </div>
      </div>
    </Link>
  );
}

// ─── CourseProgress card ──────────────────────────────────────────
export function CourseProgress({ e }) {
  const c = e.course || {};
  return (
    <Link
      to={`/course/${c._id}`}
      className="panel p-4 flex gap-4 hover:shadow-soft transition"
    >
      <img
        src={
          c.thumbnail ||
          'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=300'
        }
        className="w-24 h-20 object-cover rounded-xl"
        alt={c.title}
      />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between gap-2">
          <div className="font-bold text-sm truncate">{c.title}</div>
          <span className="text-xs font-bold text-brand">{e.progress || 0}%</span>
        </div>
        <div className="text-xs text-slate-400 mt-1">
          {c.instructor?.name || 'EduNexa instructor'}
        </div>
        <div className="progress mt-4">
          <span style={{ width: `${e.progress || 0}%` }} />
        </div>
      </div>
    </Link>
  );
}
