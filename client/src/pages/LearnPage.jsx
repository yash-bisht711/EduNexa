import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  PlayCircle, CheckCircle2, Award, Download, ArrowRight,
  BookOpen, Clock, FileText, ChevronRight, Sparkles
} from 'lucide-react';
import { useLoad, Heading, money, Empty } from '../components/shared';
import { useToast } from '../components/Toast';
import VideoPlayer from '../components/VideoPlayer';
import api from '../api';

export default function LearnPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const courseParam = searchParams.get('course');
  const toast = useToast();

  const { data, loading, reload } = useLoad('/me/enrollments', { enrollments: [] });
  const enrollments = data.enrollments || [];

  const [activeCourseId, setActiveCourseId] = useState(courseParam || '');
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [marking, setMarking] = useState(false);
  const [downloadingCert, setDownloadingCert] = useState(false);

  useEffect(() => {
    if (enrollments.length > 0 && !activeCourseId) {
      const match = courseParam ? enrollments.find(e => e.course?._id === courseParam) : enrollments[0];
      if (match) setActiveCourseId(match.course?._id);
    }
  }, [enrollments, activeCourseId, courseParam]);

  const activeEnrollment = enrollments.find(e => e.course?._id === activeCourseId) || enrollments[0];
  const course = activeEnrollment?.course;
  const lessons = course?.lessons || [];
  const activeLesson = lessons[activeLessonIndex] || lessons[0];
  const completedIds = (activeEnrollment?.completedLessons || []).map(String);
  const isLessonCompleted = activeLesson && completedIds.includes(String(activeLesson._id));

  const handleSelectLesson = (index) => {
    setActiveLessonIndex(index);
  };

  const markLessonComplete = async () => {
    if (!activeLesson) return;
    setMarking(true);
    try {
      await api.post(`/me/lessons/${activeLesson._id}/complete`);
      toast.success(`Marked "${activeLesson.title}" as complete!`);
      reload();
      // Auto-advance if next lesson exists
      if (activeLessonIndex + 1 < lessons.length) {
        setActiveLessonIndex(activeLessonIndex + 1);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update progress');
    } finally {
      setMarking(false);
    }
  };

  const downloadCertificate = async () => {
    if (!course) return;
    setDownloadingCert(true);
    try {
      const res = await api.get(`/me/certificates/${course._id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${course.title}-Certificate.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Certificate downloaded successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Complete all lessons to earn your certificate');
    } finally {
      setDownloadingCert(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
        <div className="h-96 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (enrollments.length === 0) {
    return (
      <>
        <Heading eyebrow="MY CLASSROOM" title="My Learning" sub="Access your enrolled courses and track your progress." />
        <Empty
          icon={BookOpen}
          title="No enrolled courses yet"
          text="Explore our catalog of practical, industry-focused courses to start your learning journey."
          action={
            <Link to="/courses" className="btn-primary inline-flex items-center gap-2 mt-6">
              Explore Courses <ArrowRight size={16} />
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <Heading
        eyebrow="CLASSROOM"
        title={course?.title || 'Course Player'}
        sub={`${activeEnrollment?.progress || 0}% Completed • ${lessons.length} Lessons`}
        action={
          activeEnrollment?.progress === 100 && (
            <button
              onClick={downloadCertificate}
              disabled={downloadingCert}
              className="btn-primary flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Award size={18} />
              {downloadingCert ? 'Generating PDF...' : 'Download Certificate'}
            </button>
          )
        }
      />

      {/* Course Switcher Tabs if enrolled in multiple */}
      {enrollments.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
          {enrollments.map((enr) => {
            const c = enr.course;
            if (!c) return null;
            const active = c._id === activeCourseId;
            return (
              <button
                key={c._id}
                onClick={() => {
                  setActiveCourseId(c._id);
                  setActiveLessonIndex(0);
                  setSearchParams({ course: c._id });
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-2 border ${
                  active
                    ? 'bg-[#6d5dfc] text-white border-[#6d5dfc]'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{c.title}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-slate-100'}`}>
                  {enr.progress}%
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Learning Grid */}
      <div className="grid xl:grid-cols-[1fr_360px] gap-6 items-start">
        {/* Left Column: Video Player & Lesson Details */}
        <div className="space-y-5">
          <div className="panel p-2 overflow-hidden bg-black">
            <VideoPlayer
              src={activeLesson?.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'}
              hlsUrl={activeLesson?.hlsUrl}
              onEnded={() => {
                if (!isLessonCompleted) markLessonComplete();
              }}
            />
          </div>

          {/* Lesson Meta & Complete Action */}
          <div className="panel p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#6d5dfc]">
                  Lesson {activeLessonIndex + 1} of {lessons.length}
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                  {activeLesson?.title || 'No lesson selected'}
                </h2>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                  <span className="flex items-center gap-1">
                    <Clock size={14} /> {activeLesson?.duration || 15} minutes
                  </span>
                  <span>•</span>
                  <span>Instructor: {course?.instructor?.name || 'EduNexa'}</span>
                </div>
              </div>

              <button
                onClick={markLessonComplete}
                disabled={marking || isLessonCompleted}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition ${
                  isLessonCompleted
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                    : 'btn-primary'
                }`}
              >
                <CheckCircle2 size={18} />
                {isLessonCompleted ? 'Completed' : marking ? 'Saving...' : 'Mark as Complete'}
              </button>
            </div>

            {activeLesson?.description && (
              <p className="text-sm text-slate-600 mt-4 pt-4 border-t border-slate-100 leading-relaxed">
                {activeLesson.description}
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Lesson Playlist & Progress */}
        <div className="space-y-4">
          {/* Progress Card */}
          <div className="panel p-5">
            <div className="flex items-center justify-between text-sm font-bold">
              <span>Course Progress</span>
              <span className="text-[#6d5dfc]">{activeEnrollment?.progress || 0}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#6d5dfc] to-[#39d6b4] h-full transition-all duration-500 rounded-full"
                style={{ width: `${activeEnrollment?.progress || 0}%` }}
              />
            </div>
            <div className="text-xs text-slate-400 mt-2 flex justify-between">
              <span>{completedIds.length} of {lessons.length} lessons done</span>
              {activeEnrollment?.progress === 100 && (
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <Sparkles size={12} /> Certified
                </span>
              )}
            </div>
          </div>

          {/* Lessons List */}
          <div className="panel p-4">
            <h3 className="font-extrabold text-sm px-2 mb-3 text-slate-700">Course Syllabus</h3>
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {lessons.map((lesson, idx) => {
                const isCurrent = idx === activeLessonIndex;
                const isDone = completedIds.includes(String(lesson._id));

                return (
                  <button
                    key={lesson._id || idx}
                    onClick={() => handleSelectLesson(idx)}
                    className={`w-full text-left p-3 rounded-xl transition flex items-center gap-3 ${
                      isCurrent
                        ? 'bg-violet-50 text-[#6d5dfc] border border-violet-200'
                        : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                    }`}
                  >
                    <div className="shrink-0">
                      {isDone ? (
                        <CheckCircle2 size={18} className="text-emerald-500" />
                      ) : (
                        <PlayCircle size={18} className={isCurrent ? 'text-[#6d5dfc]' : 'text-slate-300'} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate leading-tight">
                        {idx + 1}. {lesson.title}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {lesson.duration || 10} min
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
