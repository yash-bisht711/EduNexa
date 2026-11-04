import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export const money = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0);

export function CourseCard({ course: c }) {
  const avgRating = c.avgRating || 0;
  const enrollmentCount = c.enrollmentCount || 0;

  return (
    <Link
      to={`/course/${c._id}`}
      className="panel overflow-hidden hover:-translate-y-1 transition duration-200 block border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md rounded-2xl group"
    >
      <div className="relative h-40 overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={
            c.thumbnail ||
            'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=700'
          }
          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          alt={c.title}
          onError={(e) => {
            e.currentTarget.src =
              'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=700';
          }}
        />
        <div className="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur text-[11px] font-bold px-2.5 py-1 rounded-lg text-slate-800 dark:text-slate-100 shadow-sm">
          {c.category || 'General'}
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex justify-between items-center text-xs text-slate-400 dark:text-slate-400 font-medium">
          <span className="capitalize">{c.level || 'Beginner'}</span>
          <span className="flex items-center gap-1">
            <BookOpen size={13} /> {c.lessons?.length || 0} lessons
          </span>
        </div>

        <h3 className="font-extrabold text-base mt-2 leading-snug text-slate-900 dark:text-slate-100 line-clamp-2">
          {c.title}
        </h3>

        <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 truncate">
          By {c.instructor?.name || 'EduNexa Instructor'}
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <div className="flex text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <svg
                  key={s}
                  width={13}
                  height={13}
                  viewBox="0 0 24 24"
                  fill={avgRating >= s ? '#f59e0b' : '#e2e8f0'}
                  className={avgRating >= s ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'}
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                </svg>
              ))}
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {avgRating > 0 ? avgRating.toFixed(1) : '5.0'}
            </span>
          </div>

          <div className="font-extrabold text-brand text-sm">
            {c.price ? money(c.price) : 'Free'}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default CourseCard;
