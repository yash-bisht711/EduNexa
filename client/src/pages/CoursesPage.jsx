import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLoad, Heading, Notice, Empty, CourseCard } from '../components/shared';

const LEVELS = ['All', 'Beginner', 'Intermediate', 'Advanced'];
const PRICE_FILTERS = ['All', 'Free', 'Paid'];
const PAGE_SIZE = 9;

export default function CoursesPage() {
  const { data, loading, error } = useLoad('/courses', { courses: [] });
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [level, setLevel] = useState('All');
  const [priceFilter, setPriceFilter] = useState('All');
  const [page, setPage] = useState(1);
  const debounceRef = useRef(null);

  // Debounce search input
  const handleSearch = useCallback((val) => {
    setQ(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(val);
      setPage(1);
    }, 300);
  }, []);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const allCourses = data.courses || [];

  // Gather unique categories
  const categories = ['All', ...new Set(allCourses.map((c) => c.category).filter(Boolean))];
  const [category, setCategory] = useState('All');

  const filtered = allCourses.filter((c) => {
    const matchQ =
      !debouncedQ ||
      `${c.title} ${c.category} ${c.instructor?.name || ''}`.toLowerCase().includes(debouncedQ.toLowerCase());
    const matchLevel = level === 'All' || c.level === level;
    const matchCat = category === 'All' || c.category === category;
    const matchPrice =
      priceFilter === 'All' ||
      (priceFilter === 'Free' ? !c.price || c.price === 0 : c.price > 0);
    return matchQ && matchLevel && matchCat && matchPrice;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <Heading
        eyebrow="COURSE CATALOGUE"
        title="Find your next skill"
        sub="Expert-led courses designed to turn curiosity into capability."
      />

      {/* Search bar */}
      <div className="panel p-3 flex items-center gap-3 mb-4">
        <Search className="text-slate-400 shrink-0" size={18} />
        <input
          className="outline-none flex-1 text-sm bg-transparent"
          placeholder="Search courses, categories, instructors…"
          value={q}
          onChange={(e) => handleSearch(e.target.value)}
        />
        {q && (
          <button
            className="text-xs text-slate-400 hover:text-slate-700"
            onClick={() => { setQ(''); setDebouncedQ(''); setPage(1); }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={15} className="text-slate-400" />
          <span className="text-xs font-semibold text-slate-500">Filters:</span>
        </div>

        {/* Level filter */}
        <select
          className="field text-sm py-2 px-3 w-auto"
          value={level}
          onChange={(e) => { setLevel(e.target.value); setPage(1); }}
        >
          {LEVELS.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>

        {/* Category filter */}
        <select
          className="field text-sm py-2 px-3 w-auto"
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
        >
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        {/* Price filter */}
        <select
          className="field text-sm py-2 px-3 w-auto"
          value={priceFilter}
          onChange={(e) => { setPriceFilter(e.target.value); setPage(1); }}
        >
          {PRICE_FILTERS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>

        {/* Result count */}
        <span className="ml-auto text-xs text-slate-400 self-center">
          {filtered.length} course{filtered.length !== 1 ? 's' : ''} found
        </span>
      </div>

      {error && <Notice>{error}</Notice>}

      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="panel h-64 animate-pulse bg-slate-50" />
          ))}
        </div>
      ) : paginated.length ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {paginated.map((c) => (
            <CourseCard key={c._id} course={c} />
          ))}
        </div>
      ) : (
        <Empty icon={Search} title="No courses found" text="Try adjusting your search or filters." />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            className="btn-muted px-3 py-2"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`w-9 h-9 rounded-xl text-sm font-bold ${
                page === i + 1
                  ? 'bg-brand text-white'
                  : 'btn-muted'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            className="btn-muted px-3 py-2"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </>
  );
}
