import React, { useState } from 'react';
import {
  BookMarked, Plus, Upload, Trash2, CheckCircle2,
  FileVideo, ArrowUpDown, ChevronRight, Sparkles, Layers
} from 'lucide-react';
import { useLoad, Heading, money, Empty } from '../components/shared';
import { useToast } from '../components/Toast';
import api from '../api';

export default function ManagePage() {
  const toast = useToast();
  const { data, reload } = useLoad('/courses', { courses: [] });
  const courses = data.courses || [];

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [creatingCourse, setCreatingCourse] = useState(false);

  // New course fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Software Development');
  const [level, setLevel] = useState('Beginner');
  const [price, setPrice] = useState(0);
  const [thumbnail, setThumbnail] = useState('');

  // Lesson fields
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [lessonDuration, setLessonDuration] = useState(15);
  const [addingLesson, setAddingLesson] = useState(false);

  // Video upload state
  const [uploadingLessonId, setUploadingLessonId] = useState(null);

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setCreatingCourse(true);
    try {
      const res = await api.post('/courses', {
        title,
        description,
        category,
        level,
        price: Number(price),
        thumbnail: thumbnail || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=700',
        published: true
      });
      toast.success('Course created in studio!');
      setShowCreateCourse(false);
      setTitle('');
      setDescription('');
      setPrice(0);
      reload();
      setSelectedCourse(res.data.course);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create course');
    } finally {
      setCreatingCourse(false);
    }
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();
    if (!selectedCourse) return;
    setAddingLesson(true);
    try {
      const res = await api.post(`/courses/${selectedCourse._id}/lessons`, {
        title: lessonTitle,
        description: lessonDesc,
        duration: Number(lessonDuration),
        order: (selectedCourse.lessons?.length || 0) + 1
      });
      toast.success('Lesson added to syllabus!');
      setLessonTitle('');
      setLessonDesc('');
      setSelectedCourse(res.data.course);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add lesson');
    } finally {
      setAddingLesson(false);
    }
  };

  const handleVideoUpload = async (lessonId, file) => {
    if (!file) return;
    const form = new FormData();
    form.append('video', file);
    setUploadingLessonId(lessonId);

    try {
      const res = await api.post(`/courses/lessons/${lessonId}/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message || 'Video uploaded!');
      // Refresh course
      const updated = await api.get(`/courses/${selectedCourse._id}`);
      setSelectedCourse(updated.data.course);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Video upload failed');
    } finally {
      setUploadingLessonId(null);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!confirm('Are you sure you want to delete this course and all its lessons?')) return;
    try {
      await api.delete(`/courses/${courseId}`);
      toast.success('Course deleted');
      setSelectedCourse(null);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete course');
    }
  };

  return (
    <>
      <Heading
        eyebrow="AUTHORING SUITE"
        title="Course Studio"
        sub="Create curriculum, upload video lectures, process HLS streaming, and manage content."
        action={
          <button
            onClick={() => setShowCreateCourse(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> New Course
          </button>
        }
      />

      <div className="grid xl:grid-cols-[360px_1fr] gap-6 items-start">
        {/* Left: Course List */}
        <div className="panel p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-extrabold text-sm text-slate-800">Your Courses ({courses.length})</h3>
          </div>

          <div className="space-y-2">
            {courses.map((c) => {
              const isSelected = selectedCourse?._id === c._id;
              return (
                <div
                  key={c._id}
                  onClick={() => setSelectedCourse(c)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center gap-3 ${
                    isSelected
                      ? 'border-[#6d5dfc] bg-violet-50/70 text-[#6d5dfc]'
                      : 'border-slate-100 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <img
                    src={c.thumbnail || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=200'}
                    alt={c.title}
                    className="w-12 h-10 object-cover rounded-lg shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">{c.title}</div>
                    <div className="text-[10px] text-slate-400">
                      {c.lessons?.length || 0} lessons • {c.price ? money(c.price) : 'Free'}
                    </div>
                  </div>
                  <ChevronRight size={15} className={isSelected ? 'text-[#6d5dfc]' : 'text-slate-300'} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Course Studio Editor */}
        <div>
          {selectedCourse ? (
            <div className="space-y-6">
              {/* Course Overview & Header Card */}
              <div className="panel p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-violet-100 text-[#6d5dfc]">
                      {selectedCourse.category} • {selectedCourse.level}
                    </span>
                    <h2 className="text-xl font-black text-slate-900 mt-2">{selectedCourse.title}</h2>
                    <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                      {selectedCourse.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeleteCourse(selectedCourse._id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl border border-rose-200 transition text-xs font-bold flex items-center gap-1.5"
                    >
                      <Trash2 size={14} /> Delete Course
                    </button>
                  </div>
                </div>
              </div>

              {/* Add Lesson Form */}
              <div className="panel p-6">
                <h3 className="font-extrabold text-sm text-slate-900 mb-3">Add Lesson to Syllabus</h3>
                <form onSubmit={handleAddLesson} className="grid sm:grid-cols-[1fr_120px_auto] gap-3 items-end">
                  <label className="block text-xs font-bold text-slate-700">
                    Lesson Title
                    <input
                      className="field mt-1 text-xs"
                      placeholder="e.g. Asynchronous Architecture & Event Loops"
                      value={lessonTitle}
                      onChange={(e) => setLessonTitle(e.target.value)}
                      required
                    />
                  </label>

                  <label className="block text-xs font-bold text-slate-700">
                    Duration (mins)
                    <input
                      type="number"
                      className="field mt-1 text-xs"
                      value={lessonDuration}
                      onChange={(e) => setLessonDuration(e.target.value)}
                      required
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={addingLesson}
                    className="btn-primary py-2.5 px-5 text-xs shrink-0"
                  >
                    {addingLesson ? 'Adding...' : 'Add Lesson'}
                  </button>
                </form>
              </div>

              {/* Lesson Roster with Video Upload */}
              <div className="panel p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Course Syllabus ({selectedCourse.lessons?.length || 0} Lessons)
                  </h3>
                  <span className="text-xs text-slate-400">BullMQ + FFmpeg Transcoding ready</span>
                </div>

                <div className="space-y-3">
                  {(selectedCourse.lessons || []).map((l, idx) => (
                    <div
                      key={l._id || idx}
                      className="p-4 rounded-2xl border border-slate-100 bg-[#fbfbfe] flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 font-bold text-xs grid place-items-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-slate-800">{l.title}</div>
                          <div className="text-[10px] text-slate-400">
                            {l.duration || 15} mins • {l.hlsUrl ? 'HLS Stream Ready' : l.videoUrl ? 'MP4 Hosted' : 'No video attached'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {uploadingLessonId === l._id ? (
                          <span className="text-xs text-[#6d5dfc] font-bold animate-pulse">
                            Processing video...
                          </span>
                        ) : (
                          <label className="cursor-pointer px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition">
                            <Upload size={14} className="text-[#6d5dfc]" />
                            <span>{l.videoUrl ? 'Replace Video' : 'Upload Video'}</span>
                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              onChange={(e) => handleVideoUpload(l._id, e.target.files[0])}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  ))}

                  {(!selectedCourse.lessons || selectedCourse.lessons.length === 0) && (
                    <div className="text-center py-8 text-xs text-slate-400">
                      No lessons added yet. Use the form above to add your first lecture.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="panel p-16 text-center">
              <div className="w-14 h-14 bg-violet-50 text-[#6d5dfc] rounded-2xl grid place-items-center mx-auto mb-4">
                <BookMarked size={26} />
              </div>
              <h3 className="font-extrabold text-base text-slate-800">Select a course to edit</h3>
              <p className="text-xs text-slate-400 mt-1">
                Choose a course from the sidebar to manage lessons, upload videos, and preview streaming.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Course */}
      {showCreateCourse && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl">
            <h3 className="text-lg font-extrabold text-slate-900 mb-4">Create New Course</h3>
            <form onSubmit={handleCreateCourse} className="space-y-3.5">
              <label className="block text-xs font-bold text-slate-700">
                Course Title
                <input
                  className="field mt-1 text-xs"
                  placeholder="e.g. Distributed Systems in Go"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </label>

              <label className="block text-xs font-bold text-slate-700">
                Description
                <textarea
                  className="field mt-1 text-xs h-20"
                  placeholder="What will students master in this course?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-bold text-slate-700">
                  Category
                  <select
                    className="field mt-1 text-xs"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="Software Development">Software Development</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Design">Design</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Business">Business</option>
                  </select>
                </label>

                <label className="block text-xs font-bold text-slate-700">
                  Difficulty Level
                  <select
                    className="field mt-1 text-xs"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-bold text-slate-700">
                  Price (INR) — 0 for Free
                  <input
                    type="number"
                    min={0}
                    className="field mt-1 text-xs"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </label>

                <label className="block text-xs font-bold text-slate-700">
                  Cover Image URL
                  <input
                    type="url"
                    className="field mt-1 text-xs"
                    placeholder="https://..."
                    value={thumbnail}
                    onChange={(e) => setThumbnail(e.target.value)}
                  />
                </label>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateCourse(false)}
                  className="btn-muted flex-1 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingCourse}
                  className="btn-primary flex-1 py-2 text-xs"
                >
                  {creatingCourse ? 'Creating...' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
