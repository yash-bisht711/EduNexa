import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  BookOpen, CheckCircle2, BarChart3, CalendarDays,
  Plus, Video, ChevronRight,
} from 'lucide-react';
import { useLoad, Heading, Empty, CourseCard, CourseProgress } from '../components/shared';

export default function DashboardPage() {
  const user = useSelector((s) => s.auth.user);
  const { data: en } = useLoad('/me/enrollments', { enrollments: [] });
  const { data: cs } = useLoad('/courses', { courses: [] });
  const { data: live } = useLoad('/live/classes', { classes: [] });

  const enroll = en.enrollments || [];
  const courses = cs.courses || [];
  const classes = live.classes || [];

  const avgProgress = enroll.length
    ? Math.round(enroll.reduce((a, e) => a + (e.progress || 0), 0) / enroll.length)
    : 0;

  const upcomingClasses = classes.filter((c) => new Date(c.startsAt) > new Date());

  const stats = [
    [BookOpen, 'Enrolled courses', enroll.length, 'Across your learning path', 'bg-violet-50 text-violet-600'],
    [CheckCircle2, 'Lessons completed', enroll.reduce((a, e) => a + (e.completedLessons?.length || 0), 0), 'Keep the momentum going', 'bg-emerald-50 text-emerald-600'],
    [BarChart3, 'Average progress', `${avgProgress}%`, 'Your learning progress', 'bg-blue-50 text-blue-600'],
    [CalendarDays, 'Upcoming classes', upcomingClasses.length, 'Stay ready for your next class', 'bg-amber-50 text-amber-600'],
  ];

  return (
    <>
      <Heading
        eyebrow="YOUR LEARNING SPACE"
        title="Good to see you again!"
        sub="Here's what's happening with your learning journey today."
        action={
          <Link to="/courses" className="btn-primary flex items-center gap-2">
            <Plus size={17} /> Explore courses
          </Link>
        }
      />

      {/* Stats grid */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
        {stats.map(([I, l, v, d, c]) => (
          <div className="panel p-5" key={l}>
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-slate-500">{l}</span>
              <span className={`w-9 h-9 rounded-xl grid place-items-center ${c}`}>
                <I size={18} />
              </span>
            </div>
            <div className="stat-number mt-4">{v}</div>
            <div className="text-xs text-slate-400 mt-1">{d}</div>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-[1.5fr_1fr] gap-6">
        {/* Left column */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-extrabold text-lg">Continue learning</h2>
            <Link to="/learning" className="text-sm text-brand font-bold">View all</Link>
          </div>

          {enroll.length ? (
            <div className="space-y-3">
              {enroll.slice(0, 3).map((e) => (
                <CourseProgress key={e._id} e={e} />
              ))}
            </div>
          ) : (
            <Empty
              icon={BookOpen}
              title="Your learning journey starts here"
              text="Explore courses and enroll to see your progress here."
              action={
                <Link className="btn-primary inline-block mt-3" to="/courses">
                  Browse courses
                </Link>
              }
            />
          )}

          <div className="flex justify-between items-center mt-8 mb-4">
            <h2 className="font-extrabold text-lg">Recommended for you</h2>
            <Link to="/courses" className="text-sm text-brand font-bold">Explore all</Link>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {courses.slice(0, 2).map((c) => (
              <CourseCard key={c._id} course={c} />
            ))}
          </div>
        </section>

        {/* Right column */}
        <section>
          <h2 className="font-extrabold text-lg mb-4">Upcoming live classes</h2>
          <div className="panel p-4 space-y-4">
            {upcomingClasses.slice(0, 3).map((c) => (
              <div className="flex gap-3" key={c._id}>
                <div className="w-12 h-12 rounded-xl bg-violet-50 text-brand grid place-items-center">
                  <Video />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{c.title}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {new Date(c.startsAt).toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{c.course?.title}</div>
                </div>
              </div>
            ))}
            {!classes.length && (
              <p className="text-sm text-slate-400 py-4">No classes scheduled yet.</p>
            )}
            <Link
              to="/live"
              className="text-sm text-brand font-bold inline-flex items-center gap-1"
            >
              Open classroom <ChevronRight size={15} />
            </Link>
          </div>

          {/* Motivational card */}
          <div className="panel p-5 mt-5 bg-gradient-to-br from-[#272354] to-[#5145a9] text-white border-0">
            <div className="text-xs text-violet-200 font-bold tracking-widest">EDUNEXA TIP</div>
            <h3 className="font-extrabold text-xl mt-3">Consistency beats intensity.</h3>
            <p className="text-sm text-violet-100/75 mt-2 leading-6">
              Set aside 30 minutes today. Small, focused sessions build lasting skills.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
