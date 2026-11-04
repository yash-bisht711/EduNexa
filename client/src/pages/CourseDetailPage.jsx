import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  PlayCircle, CheckCircle2, FileVideo, Download,
} from 'lucide-react';
import { useLoad, Notice, money } from '../components/shared';
import { StarRating } from '../components/StarRating';
import { useToast } from '../components/Toast';
import api from '../api';
import VideoPlayer from '../components/VideoPlayer';

function formatDuration(mins) {
  if (!mins) return '—';
  const m = Number(mins);
  if (isNaN(m)) return mins;
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60 > 0 ? `${m % 60}m` : ''}`.trim();
}

function ReviewSection({ courseId, enrollment }) {
  const { data: reviewData, reload: reloadReviews } = useLoad(
    `/courses/${courseId}/reviews`,
    { reviews: [], avgRating: 0 }
  );
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const reviews = reviewData.reviews || [];
  const avg = reviewData.avgRating || 0;

  async function submit(e) {
    e.preventDefault();
    if (!enrollment) return;
    setBusy(true);
    try {
      await api.post(`/courses/${courseId}/reviews`, { rating, comment });
      toast.success('Review submitted!');
      setComment('');
      reloadReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit review');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-10">
      <h2 className="font-extrabold text-xl mb-4">
        Student Reviews
        {avg > 0 && (
          <span className="ml-3 text-base font-bold text-amber-500">{avg.toFixed(1)} ★</span>
        )}
      </h2>

      {enrollment && (
        <form onSubmit={submit} className="panel p-5 mb-5 space-y-3">
          <div className="font-semibold text-sm">Leave a review</div>
          <div className="flex items-center gap-3">
            <StarRating value={rating} onChange={setRating} size={22} />
            <span className="text-sm text-slate-500">{rating} / 5</span>
          </div>
          <textarea
            className="field"
            rows={3}
            placeholder="Share your experience with this course…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
          />
          <button className="btn-primary" disabled={busy}>
            {busy ? 'Submitting…' : 'Submit review'}
          </button>
        </form>
      )}

      {reviews.length ? (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div className="panel p-4" key={r._id}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-violet-100 text-brand text-xs font-bold grid place-items-center">
                  {(r.student?.name || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-bold">{r.student?.name || 'Student'}</div>
                  <div className="text-xs text-slate-400">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="ml-auto">
                  <StarRating value={r.rating} readOnly size={15} />
                </div>
              </div>
              {r.comment && (
                <p className="text-sm text-slate-600 mt-2 leading-6">{r.comment}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400 panel p-5 text-center">
          No reviews yet. Be the first to leave one!
        </p>
      )}
    </div>
  );
}

export default function CourseDetailPage() {
  const { id } = useParams();
  const { data } = useLoad(`/courses/${id}`, { course: null });
  const { data: mine, reload: reloadMine } = useLoad('/me/enrollments', { enrollments: [] });
  const [msg, setMsg] = useState('');
  const [active, setActive] = useState(null);
  const toast = useToast();

  const course = data.course;
  const enrollment = (mine.enrollments || []).find((e) => e.course?._id === id);

  async function enroll() {
    try {
      if (course.price > 0) {
        const { data: orderData } = await api.post('/payments/order', { courseId: id });
        if (!window.Razorpay) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
          });
        }
        const checkout = new window.Razorpay({
          key: orderData.keyId,
          amount: orderData.order.amount,
          currency: orderData.order.currency,
          name: 'EduNexa',
          description: course.title,
          order_id: orderData.order.id,
          handler: async (response) => {
            try {
              await api.post('/payments/verify', response);
              toast.success('Payment verified! You are now enrolled.');
              reloadMine();
            } catch (err) {
              toast.error(err.response?.data?.message || 'Payment verification failed');
            }
          },
          modal: { ondismiss: () => toast.info('Checkout closed. You can try again anytime.') },
        });
        checkout.open();
        setMsg('Complete payment in the secure Razorpay checkout window.');
        return;
      }
      await api.post(`/courses/${id}/enroll`);
      toast.success('You are enrolled! Lessons are now unlocked.');
      reloadMine();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Unable to enroll');
    }
  }

  async function complete(lessonId) {
    try {
      await api.post(`/me/lessons/${lessonId}/complete`);
      toast.success('Lesson marked as complete!');
      reloadMine();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Unable to update progress');
    }
  }

  // Auto-advance to next lesson when video ends
  function handleVideoEnd() {
    if (!active || !course?.lessons) return;
    const idx = course.lessons.findIndex((l) => l._id === active._id);
    if (idx >= 0 && idx < course.lessons.length - 1) {
      setActive(course.lessons[idx + 1]);
    }
  }

  if (!course) {
    return (
      <div className="panel p-10 text-center animate-pulse text-slate-400">
        Loading course…
      </div>
    );
  }

  return (
    <>
      <Link to="/courses" className="text-sm text-brand font-bold inline-flex items-center gap-1">
        ← Back to courses
      </Link>

      <div className="panel overflow-hidden mt-4">
        <img src={course.thumbnail} className="w-full h-56 object-cover" alt={course.title} />
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-violet-50 text-brand rounded-full px-3 py-1 font-bold">
              {course.category}
            </span>
            <span className="bg-slate-100 rounded-full px-3 py-1 capitalize">
              {course.level}
            </span>
          </div>

          <h1 className="text-3xl font-black mt-4">{course.title}</h1>
          <p className="text-slate-500 mt-3 max-w-3xl leading-7">{course.description}</p>

          <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
            <div>
              <div className="text-xs text-slate-400">Instructor</div>
              <div className="font-bold mt-1">{course.instructor?.name}</div>
            </div>
            <div className="text-2xl font-black text-brand">
              {course.price ? money(course.price) : 'Free'}
            </div>
            {!enrollment && (
              <button className="btn-primary" onClick={enroll}>
                Enroll now
              </button>
            )}
            {enrollment && (
              <div className="text-sm font-bold text-emerald-600">
                Enrolled · {enrollment.progress || 0}% complete
              </div>
            )}
          </div>

          {msg && <Notice>{msg}</Notice>}

          {/* Video player */}
          {active && enrollment && (
            <div className="mt-8 bg-slate-950 rounded-2xl p-4 text-white">
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold">{active.title}</div>
                <button className="text-xs text-slate-300" onClick={() => setActive(null)}>
                  Close player
                </button>
              </div>

              {active.hlsUrl || active.videoUrl ? (
                <VideoPlayer
                  src={active.hlsUrl || active.videoUrl}
                  hlsUrl={active.hlsUrl}
                  onEnded={handleVideoEnd}
                />
              ) : (
                <div className="py-10 text-center text-slate-300">
                  <FileVideo className="mx-auto mb-2" />
                  No video uploaded for this lesson yet.
                </div>
              )}

              <button
                className="btn-primary mt-4"
                onClick={() => complete(active._id)}
              >
                <CheckCircle2 size={16} className="inline mr-1" />
                Mark lesson complete
              </button>
            </div>
          )}

          {/* Curriculum */}
          <h2 className="font-extrabold text-xl mt-9 mb-4">Course curriculum</h2>
          <div className="divide-y">
            {course.lessons?.map((l, i) => {
              const done = enrollment?.completedLessons?.some((x) => String(x) === l._id);
              return (
                <div className="py-4 flex items-center gap-4" key={l._id}>
                  <div
                    className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${
                      done ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'
                    }`}
                  >
                    {done ? <CheckCircle2 /> : <PlayCircle />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">
                      {i + 1}. {l.title}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{l.description}</div>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">
                    {formatDuration(l.duration)}
                  </span>
                  <button
                    disabled={!enrollment}
                    onClick={() => setActive(l)}
                    className="btn-muted text-xs disabled:opacity-40 shrink-0"
                  >
                    {done ? 'Review' : 'Watch'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reviews */}
      <ReviewSection courseId={id} enrollment={enrollment} />
    </>
  );
}
