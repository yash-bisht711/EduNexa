import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import {
  Video, Calendar, Clock, Plus, Users, Radio, MessageSquare,
  Pencil, Trash2, MapPin, Ban, PlayCircle, X, DoorClosed,
} from 'lucide-react';
import { useLoad, Heading, Empty, initials } from '../components/shared';
import { useToast } from '../components/Toast';
import { connectSocket } from '../socket';
import api from '../api';
import LiveRoom from '../components/live/LiveRoom';

const when = (d) =>
  new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

function ClassCard({ cls, isHost, onJoin, onEdit, onCancel, onDelete, onReplay }) {
  const live = cls.status === 'live';
  const recordings = cls.recordings || [];
  return (
    <div className={`live-class-card ${live ? 'live-class-card-glow' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={`live-status-badge ${live ? 'live-status-live' : cls.status === 'scheduled' ? 'live-status-scheduled' : 'live-status-ended'}`}>
              {live ? '● LIVE now' : cls.status === 'scheduled' ? 'Upcoming' : cls.status === 'cancelled' ? 'Cancelled' : 'Ended'}
            </span>
            <span className="text-[11px] text-slate-400 font-semibold truncate">{cls.course?.title}</span>
          </div>
          <h3 className="font-extrabold text-[15px] text-slate-900 dark:text-slate-100 leading-snug">{cls.title}</h3>
          {cls.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">{cls.description}</p>
          )}
        </div>
        <div className="live-avatar w-10 h-10 shrink-0" title={`Instructor: ${cls.instructor?.name || ''}`}>
          {cls.instructor?.avatar ? <img src={cls.instructor.avatar} alt="" className="w-full h-full object-cover rounded-full" /> : initials(cls.instructor?.name || 'I')}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5"><Calendar size={13} className="text-[#6557ed]" /> {when(cls.startsAt)}</span>
        <span className="flex items-center gap-1.5"><Clock size={13} className="text-[#6557ed]" /> ends {new Date(cls.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <span className="flex items-center gap-1.5"><Users size={13} className="text-[#6557ed]" /> {cls.participantCount || 0} in room · {cls.peakViewers || 0} peak</span>
        <span className="flex items-center gap-1.5"><MessageSquare size={13} className="text-[#6557ed]" /> chat enabled</span>
      </div>

      <div className="flex items-center gap-2 mt-4">
        {['ended', 'cancelled'].includes(cls.status) ? (
          <>
            {(cls.recordings?.length || 0) > 0 && (
              <button onClick={onReplay} className="btn-primary flex-1 py-2.5 text-xs flex justify-center items-center gap-2">
                <PlayCircle size={15} /> Watch recording ({cls.recordings.length})
              </button>
            )}
            <div className={`text-center text-[11px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/60 rounded-xl py-2.5 ${cls.recordings?.length ? '' : 'flex-1'}`}>
              {cls.status === 'cancelled' ? 'Session was cancelled' : `Ended • ${cls.attendees?.length || 0} students attended`}
            </div>
            {isHost && (
              <button onClick={onDelete} className="live-icon-btn live-icon-btn-danger" title="Delete permanently"><Trash2 size={15} /></button>
            )}
          </>
        ) : (
          <>
            <button onClick={onJoin} className={`btn-primary flex-1 py-2.5 text-xs flex justify-center items-center gap-2 ${live ? 'live-join-pulse' : ''}`}>
              {live ? <><Radio size={15} /> Join live now</> : <><Video size={15} /> Join early</>}
            </button>
            {(cls.recordings?.length || 0) > 0 && (
              <button onClick={onReplay} className="live-icon-btn" title={`Watch ${cls.recordings.length} recording(s)`}><PlayCircle size={15} /></button>
            )}
            {isHost && cls.status === 'scheduled' && (
              <>
                <button onClick={onEdit} className="live-icon-btn" title="Reschedule"><Pencil size={15} /></button>
                <button onClick={onCancel} className="live-icon-btn" title="Cancel class (students notified)"><Ban size={15} /></button>
                <button onClick={onDelete} className="live-icon-btn live-icon-btn-danger" title="Delete permanently"><Trash2 size={15} /></button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function LivePage() {
  const user = useSelector((s) => s.auth.user);
  const token = useSelector((s) => s.auth.token);
  const isStaff = ['instructor', 'admin'].includes(user?.role);
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const { data, reload } = useLoad('/live/classes', { classes: [] });
  const { data: coursesData } = useLoad('/courses', { courses: [] });
  const classes = data.classes || [];
  const courses = coursesData.courses || [];

  const [tab, setTab] = useState('live');
  const [activeClass, setActiveClass] = useState(null);
  const [replayFor, setReplayFor] = useState(null);

  const [showSchedule, setShowSchedule] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ course: '', title: '', description: '', startsAt: '', endsAt: '' });
  const [saving, setSaving] = useState(false);

  const socket = connectSocket(token);
  const joinedParam = params.get('join');
  const autoJoined = useRef(false);

  // refresh statuses so scheduled -> live transitions surface without manual reload
  useEffect(() => {
    const id = setInterval(() => reload(), 45000);
    return () => clearInterval(id);
  }, [reload]);

  useEffect(() => {
    if (activeClass || !socket) return;
    const onStatus = () => reload();
    socket.on('live:status', onStatus);
    return () => socket.off('live:status', onStatus);
  }, [socket, activeClass, reload]);

  // /live?join=<id> from a notification deep-links straight into the room
  useEffect(() => {
    if (!joinedParam || autoJoined.current || !classes.length) return;
    const cls = classes.find((c) => String(c._id) === joinedParam);
    if (cls && !['ended', 'cancelled'].includes(cls.status)) {
      autoJoined.current = true;
      setActiveClass(cls);
    }
    setParams({}, { replace: true });
  }, [joinedParam, classes, setParams]);

  useEffect(() => {
    if (!activeClass && joinedParam) autoJoined.current = false;
  }, [activeClass, joinedParam]);

  const buckets = useMemo(() => {
    const live = classes.filter((c) => c.status === 'live');
    const upcoming = classes.filter((c) => c.status === 'scheduled');
    const past = classes.filter((c) => ['ended', 'cancelled'].includes(c.status)).reverse();
    return { live, upcoming, past };
  }, [classes]);

  useEffect(() => {
    if (tab === 'live' && buckets.live.length === 0 && (buckets.upcoming.length || buckets.past.length)) {
      setTab(buckets.upcoming.length ? 'upcoming' : 'past');
    }
  }, [buckets, tab]);

  const openList = buckets[tab] || [];

  const toLocalInput = (d) => {
    const dt = new Date(d);
    dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
    return dt.toISOString().slice(0, 16);
  };

  const openSchedule = (cls) => {
    setEditing(cls || null);
    setForm(
      cls
        ? { course: cls.course?._id || cls.course, title: cls.title, description: cls.description || '', startsAt: toLocalInput(cls.startsAt), endsAt: toLocalInput(cls.endsAt) }
        : { course: courses[0]?._id || '', title: '', description: '', startsAt: '', endsAt: '', waitingRoom: true },
    );
    setShowSchedule(true);
  };

  const submitSchedule = async (e) => {
    e.preventDefault();
    if (new Date(form.endsAt) <= new Date(form.startsAt)) {
      toast.error('End time must be after the start time');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString() };
      if (editing) {
        await api.patch(`/live/classes/${editing._id}`, payload);
        toast.success('Session updated — enrolled students were notified');
      } else {
        await api.post('/live/classes', payload);
        toast.success('Live class scheduled — enrolled students were notified');
      }
      setShowSchedule(false);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const cancelClass = async (cls) => {
    if (!confirm(`Cancel "${cls.title}"? Enrolled students will be notified.`)) return;
    try {
      await api.delete(`/live/classes/${cls._id}`);
      toast.success('Class cancelled — students notified');
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel class');
    }
  };

  const deleteClass = async (cls) => {
    if (!confirm(`Permanently delete "${cls.title}"? Its chat history will be removed too and enrolled students will be notified.`)) return;
    try {
      await api.delete(`/live/classes/${cls._id}/remove`);
      toast.success('Class deleted');
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete class');
    }
  };

  return (
    <>
      <Heading
        eyebrow="REAL-TIME LEARNING"
        title="Live Classrooms"
        sub="Zoom-style sessions with HD video, screen sharing, raised hands and class chat — scheduled automatically for everyone enrolled."
        action={
          isStaff && (
            <button onClick={() => openSchedule(null)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Schedule Class
            </button>
          )
        }
      />

      {activeClass ? (
        <LiveRoom
          cls={activeClass}
          user={user}
          socket={socket}
          onLeave={() => setActiveClass(null)}
        />
      ) : (
        <>
          <div className="live-tabs">
            {[
              ['live', `Live now${buckets.live.length ? ` (${buckets.live.length})` : ''}`],
              ['upcoming', `Upcoming${buckets.upcoming.length ? ` (${buckets.upcoming.length})` : ''}`],
              ['past', `Past sessions${buckets.past.length ? ` (${buckets.past.length})` : ''}`],
            ].map(([key, label]) => (
              <button key={key} className={`live-tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
                {label}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {openList.map((cls) => (
              <ClassCard
                key={cls._id}
                cls={cls}
                isHost={user?.role === 'admin' || String(cls.instructor?._id || cls.instructor) === String(user?._id || user?.id)}
                onJoin={() => setActiveClass(cls)}
                onEdit={() => openSchedule(cls)}
                onCancel={() => cancelClass(cls)}
                onDelete={() => deleteClass(cls)}
                onReplay={() => setReplayFor(cls)}
              />
            ))}
            {openList.length === 0 && (
              <div className="col-span-full">
                <Empty
                  icon={tab === 'live' ? Radio : Calendar}
                  title={tab === 'live' ? 'No class is streaming right now' : tab === 'upcoming' ? 'No upcoming classes' : 'No past sessions yet'}
                  text={
                    tab === 'upcoming' && isStaff
                      ? 'Schedule a session and every enrolled student gets a notification.'
                      : 'Scheduled workshops, lectures and office hours will appear here. You will be notified 15 minutes before each class.'
                  }
                />
              </div>
            )}
          </div>
        </>
      )}

      {showSchedule && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="live-modal-card max-w-md w-full !text-left">
            <h3 className="text-lg font-black text-white mb-1">{editing ? 'Reschedule session' : 'Schedule a live class'}</h3>
            <p className="text-xs text-slate-400 mb-4 flex items-center gap-1.5"><MapPin size={12} /> Enrolled students are notified on create, reschedule and cancel.</p>
            <form onSubmit={submitSchedule} className="space-y-3.5">
              {!editing && (
                <label className="block text-xs font-bold text-slate-300">
                  Course
                  <select className="live-field mt-1 text-xs" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} required>
                    <option value="">Select course…</option>
                    {courses.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
                  </select>
                </label>
              )}
              <label className="block text-xs font-bold text-slate-300">
                Session title
                <input className="live-field mt-1 text-xs" placeholder="e.g. Weekly live Q&A & code review" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </label>
              <label className="block text-xs font-bold text-slate-300">
                Agenda (optional)
                <textarea className="live-field mt-1 text-xs resize-none" rows={2} placeholder="What will be covered; what students should prepare." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-bold text-slate-300">
                  Starts at
                  <input type="datetime-local" className="live-field mt-1 text-xs" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} required />
                </label>
                <label className="block text-xs font-bold text-slate-300">
                  Ends at
                  <input type="datetime-local" className="live-field mt-1 text-xs" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} required />
                </label>
              </div>
              {!editing && (
                <label className="live-check">
                  <input type="checkbox" checked={!!form.waitingRoom} onChange={(e) => setForm({ ...form, waitingRoom: e.target.checked })} />
                  <span>
                    <span className="block font-extrabold text-[12px] text-slate-200"><DoorClosed size={12} className="inline -mt-0.5 mr-1" />Use a waiting room</span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">Students wait in the lobby until an instructor admits them. Can be changed live from in-room settings.</span>
                  </span>
                </label>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowSchedule(false)} className="live-btn live-btn-ghost flex-1 py-2.5 text-xs">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 py-2.5 text-xs">
                  {saving ? 'Saving…' : editing ? 'Save & notify students' : 'Schedule & notify students'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {replayFor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setReplayFor(null)}>
          <div className="live-modal-card max-w-2xl w-full !text-left" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h3 className="text-lg font-black text-white truncate">Recordings · {replayFor.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{when(replayFor.startsAt)} • {replayFor.course?.title}</p>
              </div>
              <button className="live-panel-x !static" onClick={() => setReplayFor(null)}><X size={15} /></button>
            </div>
            <div className="live-replay-list">
              {(replayFor.recordings || []).map((rec, i) => (
                <div className="live-replay-item" key={rec.url}>
                  <video src={rec.url} controls preload="metadata" playsInline />
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                    <span>Part {i + 1} · {rec.sizeMb || '~'} MB</span>
                    <span>{new Date(rec.uploadedAt || replayFor.endedAt || replayFor.endsAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
