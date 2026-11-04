import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  BookOpen,
  PlayCircle,
  Search,
  Video,
  GraduationCap,
  Sparkles,
  CheckCircle,
  LayoutDashboard,
  Shield,
  Layers,
  ChevronRight,
} from "lucide-react";
import api, { errorMessage } from "../api";
import CourseCard from "../components/CourseCard";
import ThemeSwitch from "../components/ThemeSwitch";

const CATEGORIES = [
  "Development",
  "Design",
  "Business",
  "Data & AI",
  "Marketing",
];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];

export default function Home() {
  const user = useSelector((s) => s.auth?.user);

  const [courses, setCourses] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(
      async () => {
        try {
          const params = new URLSearchParams({
            page: String(page),
            limit: "12",
          });
          if (search.trim()) params.set("q", search.trim());
          if (category) params.set("category", category);
          if (level) params.set("level", level);

          const { data } = await api.get(`/courses?${params}`);
          if (cancelled) return;
          setCourses(data.courses || []);
          setMeta({
            total: data.total || (data.courses || []).length,
            page: data.page || 1,
            pages: data.pages || 1,
          });
          setError("");
        } catch (requestError) {
          if (!cancelled) setError(errorMessage(requestError));
        } finally {
          if (!cancelled) setLoading(false);
        }
      },
      search ? 250 : 0,
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, category, level, page]);

  const lessonCount = useMemo(
    () =>
      courses.reduce((sum, course) => sum + (course.lessons?.length ?? 0), 0),
    [courses],
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f8fc] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors duration-200 w-full overflow-x-hidden">
      {/* ─── Top Navigation Header ─── */}
      <header className="sticky top-0 z-50 bg-white/85 dark:bg-[#111827]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-[1300px] mx-auto px-3.5 sm:px-6 h-16 sm:h-18 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#6557ed] text-white grid place-items-center shadow-md group-hover:scale-105 transition">
              <GraduationCap size={20} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <div>
              <div className="font-black text-lg sm:text-xl tracking-tight leading-tight">
                Edu<span className="text-[#6557ed]">Nexa</span>
              </div>
              <div className="text-[8px] sm:text-[9px] tracking-[.18em] text-slate-400 font-bold uppercase hidden sm:block">
                Learning Platform
              </div>
            </div>
          </Link>

          {/* Center Links (Tablet/Desktop) */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <a href="#courses" className="hover:text-[#6557ed] transition">
              Courses
            </a>
            <a href="#features" className="hover:text-[#6557ed] transition">
              Features
            </a>
            <a href="#stats" className="hover:text-[#6557ed] transition">
              About
            </a>
          </nav>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
                        <div className="shrink-0">
                          <ThemeSwitch />
                        </div>
                        {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="hidden lg:inline-block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Hi, {user.name?.split(" ")[0]}
                </span>
                <Link
                  to="/dashboard"
                  className="btn !py-2 !px-3 sm:!py-2.5 sm:!px-4 !text-xs sm:!text-sm flex items-center gap-1.5 shadow-sm"
                >
                  <LayoutDashboard size={15} />
                  <span>Dashboard</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2.5">
                <Link
                  to="/login"
                  className="px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-[#6557ed] transition"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="btn !py-2 !px-3 sm:!py-2.5 sm:!px-4 !text-xs sm:!text-sm shadow-sm"
                >
                  Get Started
                </Link>
              </div>
            )}

          </div>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow flex items-center">
            <span className="pulse" /> THE FUTURE OF LEARNING IS HERE
          </div>
          <h1>
            Learn boldly.
            <br />
            <em>Build your future.</em>
          </h1>
          <p>
            Expert-led courses, real-time classrooms, and practical skills to
            help you move forward — at your own pace.
          </p>
          <div className="hero-actions">
            <a className="btn w-full sm:w-auto" href="#courses">
              Explore courses <span>↗</span>
            </a>
            <Link
              className="btn btn-ghost w-full sm:w-auto"
              to={user ? "/dashboard" : "/register"}
            >
              {user ? "Go to your courses" : "Start learning free"}
            </Link>
          </div>
          <div className="hero-proof">
            <div className="avatar-stack">
              <b>AK</b>
              <b>RS</b>
              <b>YM</b>
              <b>+</b>
            </div>
            <span>
              <strong>Learn something real</strong>
              <br />
              One lesson at a time.
            </span>
          </div>
        </div>

        <div className="hero-art">
          <div className="orb orb-one" />
          <div className="orb orb-two" />
          <div className="learning-card">
            <div className="card-top">
              <span className="flex items-center">
                <span className="live-dot" /> LIVE SESSION
              </span>
              <span className="card-time">● 24:08</span>
            </div>
            <div className="screen-art">
              <div className="screen-lines">
                <i />
                <i />
                <i />
              </div>
              <div className="play">
                <PlayCircle size={44} />
              </div>
              <div className="text-[10px] sm:text-[11px] text-white/80 font-mono truncate">
                Web Development &bull; Live interactive lab
              </div>
            </div>
            <div className="learning-meta">
              <div className="min-w-0 pr-2">
                <b className="truncate">Build skills that matter</b>
                <small className="truncate block">
                  Interactive learning experience
                </small>
              </div>
              <span className="round-icon">
                <Video size={17} />
              </span>
            </div>
          </div>
          <div className="float-tag tag-top">✦ Learn by doing</div>
          <div className="float-tag tag-bottom ">
            <span>↗</span> Next chapter starts here
          </div>
        </div>
      </section>

      {/* ─── Stats Banner ─── */}
      <section className="stats px-4 sm:px-8" id="stats">
        <div>
          <b>01</b>
          <span>Learn from experts</span>
        </div>
        <div>
          <b>02</b>
          <span>Practice with purpose</span>
        </div>
        <div>
          <b>03</b>
          <span>Earn certificates</span>
        </div>
        <div>
          <b>04</b>
          <span>Grow without limits</span>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section
        className="max-w-[1300px] mx-auto px-4 sm:px-6 py-8 sm:py-12"
        id="features"
      >
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <div className="eyebrow">BUILT FOR MODERN LEARNERS</div>
          <h2 className="text-2xl sm:text-3xl font-extrabold mt-2 text-slate-900 dark:text-slate-100">
            Everything you need to master new capabilities
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="panel p-5 sm:p-6">
            <div className="w-11 h-11 rounded-xl bg-violet-100 dark:bg-violet-900/50 text-[#6557ed] grid place-items-center mb-4">
              <Sparkles size={22} />
            </div>
            <h3 className="font-extrabold text-base sm:text-lg mb-2 text-slate-900 dark:text-slate-100">
              AI Learning Coach
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Tailored study plans and 24/7 intelligent tutoring powered by
              state-of-the-art AI to guide your milestones.
            </p>
          </div>

          <div className="panel p-5 sm:p-6">
            <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 grid place-items-center mb-4">
              <Video size={22} />
            </div>
            <h3 className="font-extrabold text-base sm:text-lg mb-2 text-slate-900 dark:text-slate-100">
              Real-time Classrooms
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Join interactive live sessions, participate in peer discussions,
              and learn directly with active feedback.
            </p>
          </div>

          <div className="panel p-5 sm:p-6 sm:col-span-2 lg:col-span-1">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 grid place-items-center mb-4">
              <CheckCircle size={22} />
            </div>
            <h3 className="font-extrabold text-base sm:text-lg mb-2 text-slate-900 dark:text-slate-100">
              Hands-on Assessments
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Interactive quizzes, real project challenges, and verified PDF
              certificates on course completion.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Courses Catalog Section ─── */}
      <section className="courses-section" id="courses">
        <div className="section-heading">
          <div>
            <div className="eyebrow">YOUR NEXT SKILL STARTS HERE</div>
            <h2>
              Explore our <em>courses.</em>
            </h2>
            <p>
              {meta.total} published course{meta.total === 1 ? "" : "s"} &bull;{" "}
              {lessonCount} lessons available in catalog
            </p>
          </div>
          <div className="filters">
            <div className="searchbox">
              <Search size={16} className="shrink-0" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search courses..."
                aria-label="Search courses"
              />
            </div>
            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              {CATEGORIES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <select
              value={level}
              onChange={(event) => {
                setLevel(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by level"
            >
              <option value="">All levels</option>
              {LEVELS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="notice">{error}</div>}

        {loading ? (
          <div className="course-grid">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="panel h-64 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-2xl"
              />
            ))}
          </div>
        ) : courses.length ? (
          <div className="course-grid">
            {courses.map((course) => (
              <CourseCard key={course._id} course={course} />
            ))}
          </div>
        ) : (
          !error && (
            <div className="empty">
              <BookOpen size={30} />
              <h3>
                {search || category || level
                  ? "No courses match those filters"
                  : "Your classroom is getting ready"}
              </h3>
              <p>
                {search || category || level
                  ? "Try a different keyword or clear the filters."
                  : "Sign in to explore your customized curriculum."}
              </p>
            </div>
          )
        )}

        {meta.pages > 1 && (
          <div className="pager">
            <button
              className="btn btn-ghost !py-2 !px-4 !text-xs sm:!text-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span className="text-xs sm:text-sm">
              Page {meta.page} of {meta.pages}
            </span>
            <button
              className="btn btn-ghost !py-2 !px-4 !text-xs sm:!text-sm"
              disabled={page >= meta.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </section>

      {/* ─── Footer ─── */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] py-8 sm:py-10 px-4 sm:px-6">
        <div className="max-w-[1300px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <GraduationCap size={18} className="text-[#6557ed] shrink-0" />
            <span className="font-bold text-slate-800 dark:text-slate-200">
              EduNexa Learning Technologies
            </span>
            <span>&bull; &copy; 2026</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <a href="#courses" className="hover:text-[#6557ed]">
              Courses
            </a>
            <a href="#features" className="hover:text-[#6557ed]">
              Features
            </a>
            <Link to="/login" className="hover:text-[#6557ed]">
              Learner Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
