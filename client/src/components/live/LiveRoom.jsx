import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Hand, MonitorUp, MonitorOff,
  Users, MessageSquare, Pin, LayoutGrid, Radio, Clock, ShieldCheck, Loader2,
  Settings, SmilePlus, Vote, Presentation, CircleCheck, CircleX, MoreVertical,
  UserCog, DoorClosed, VolumeX, Film, Square, Captions, Sparkles,
} from 'lucide-react';
import ChatPanel from './ChatPanel';
import PollPanel from './PollPanel';
import SettingsMenu from './SettingsMenu';
import WhiteboardBoard from './WhiteboardBoard';
import { initials } from '../shared';
import { useToast } from '../Toast';
import api from '../../api';

const RTC_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const REACTIONS = ['👍', '👏', '🙌', '❤️', '😂', '😮', '🎉', '💡', '✍️', '👎'];
const QUALITY = {
  low: { width: 640, height: 360, frameRate: 15 },
  medium: { width: 960, height: 540, frameRate: 24 },
  high: { width: 1280, height: 720, frameRate: 30 },
};
const BLUR_PX = { soft: 10, strong: 24 };

function fmtClock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function timeLeft(startsAt) {
  const diff = new Date(startsAt).getTime() - Date.now();
  if (diff <= 0) return 'starting…';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function PeerTile({ tile, speaking, pinned, onPin, selfVideo, registerVideo }) {
  const elRef = useRef(null);
  const setRef = useCallback((el) => {
    elRef.current = el;
    registerVideo?.(tile.key, el);
  }, [registerVideo, tile.key]);
  useEffect(() => {
    const v = elRef.current;
    if (v && v.srcObject !== (tile.stream || null)) v.srcObject = tile.stream || null;
  }, [tile.stream, tile.camOn, tile.sharing]);
  const showVideo = tile.stream && (tile.camOn || tile.sharing || tile.isSelf);
  return (
    <div className={`live-tile ${speaking ? 'live-tile-speaking' : ''} ${tile.isSelf ? 'live-tile-self' : ''}`} onClick={onPin}>
      {showVideo ? (
        <video ref={setRef} autoPlay playsInline muted={!!selfVideo} className={`live-tile-video ${tile.isSelf ? 'mirror' : ''}`} />
      ) : (
        <div className="live-tile-avatar">
          {tile.avatar ? (
            <img src={tile.avatar} alt="" className="w-16 h-16 rounded-2xl object-cover" />
          ) : (
            <span>{initials(tile.name)}</span>
          )}
        </div>
      )}
      <div className="live-tile-top">
        {tile.handRaised && <Hand size={13} className="live-hand text-amber-400" />}
        {tile.sharing && <span className="live-role-badge live-role-share">Sharing</span>}
        {tile.isSelf && tile.blurred && <span className="live-role-badge live-role-bg"><Sparkles size={10} /> BG</span>}
      </div>
      <div className="live-tile-name">
        {!tile.micOn ? <MicOff size={12} className="text-rose-400 shrink-0" /> : <Mic size={12} className="text-emerald-400 shrink-0" />}
        <span className="truncate font-semibold">{tile.name}{tile.isSelf ? ' (You)' : ''}</span>
        <span className={`live-role-badge ${tile.isHost ? 'live-role-instructor' : 'live-role-student'}`}>{tile.hostLabel}</span>
        {pinned && <Pin size={11} className="opacity-60 ml-auto shrink-0" />}
      </div>
    </div>
  );
}

export default function LiveRoom({ cls, user, socket, onLeave }) {
  const toast = useToast();
  const [phase, setPhase] = useState('preview'); // preview | connecting | waiting | in | blocked | ended
  const [blockedMsg, setBlockedMsg] = useState('');
  const [peers, setPeers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState('');
  const [status, setStatus] = useState(cls.status);
  const [isHost, setIsHost] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [pinnedId, setPinnedId] = useState(null);
  const [gridMode, setGridMode] = useState(false);
  const [panel, setPanel] = useState('chat');
  const [showPanel, setShowPanel] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [waiters, setWaiters] = useState([]);
  const [activePoll, setActivePoll] = useState(null);
  const [floaters, setFloaters] = useState([]);
  const [showReact, setShowReact] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [waitingRoom, setWaitingRoom] = useState(!!cls.waitingRoom);
  const [boardOpen, setBoardOpen] = useState(false);
  const [rowMenu, setRowMenu] = useState(null);
  const [settings, setSettings] = useState({ quality: 'medium', noiseSuppression: true, blur: 'off', captions: false });
  const [captionLines, setCaptionLines] = useState([]);
  const [captionDraft, setCaptionDraft] = useState('');
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [, forceTick] = useState(0);
  const streamVersionRef = useRef(0);

  const meId = user?._id || user?.id;
  const ownerId = String(cls.instructor?._id || cls.instructor);
  const canAppoint = user?.role === 'admin' || ownerId === String(meId);
  const captionsSupported = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const localStreamRef = useRef(null);
  const shareStreamRef = useRef(null);
  const pcsRef = useRef(new Map());
  const streamsRef = useRef(new Map());
  const speakingRef = useRef(new Set());
  const typingTimerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const metersRef = useRef(new Map());
  const videoElsRef = useRef(new Map());
  const tilesRef = useRef([]);
  const blurRef = useRef({});
  const recRef = useRef(null);
  const recSourcesRef = useRef(null);
  const captionRef = useRef(null);
  const captionsOnRef = useRef(false);
  const floatIdRef = useRef(0);
  const handRaisedRef = useRef(false);
  const micOnRef = useRef(true);
  const settingsRef = useRef({ quality: 'medium', noiseSuppression: true, blur: 'off', captions: false });
  const waitersRef = useRef([]);

  // ── media acquisition (device check before join) ──────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const want = { video: { width: { ideal: QUALITY.medium.width }, height: { ideal: QUALITY.medium.height } }, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } };
      try {
        const stream = await navigator.mediaDevices.getUserMedia(want);
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        localStreamRef.current = stream;
        forceTick((v) => v + 1);
      } catch {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: want.audio });
          if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
          localStreamRef.current = stream;
          setCamOn(false);
          forceTick((v) => v + 1);
        } catch {
          setCamOn(false); setMicOn(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };
  }, []);

  const emitState = useCallback(() => {
    socket?.emit('live:state', { micOn, camOn, sharing });
  }, [socket, micOn, camOn, sharing]);
  useEffect(() => { if (phase === 'in') emitState(); }, [phase, emitState]);

  // ── audio metering (speaking detection) ────────────────────────────
  const ensureCtx = () => {
    audioCtxRef.current = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume().catch(() => {});
    return audioCtxRef.current;
  };

  const clearMeter = (key) => {
    const id = metersRef.current.get(key);
    if (id) clearInterval(id);
    metersRef.current.delete(key);
  };

  const attachMeter = (key, stream) => {
    if (metersRef.current.has(key) || !stream?.getAudioTracks().length) return;
    try {
      const ctx = ensureCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const id = setInterval(() => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < 32; i++) sum += data[i];
        const active = sum / 32 > 18;
        const had = speakingRef.current.has(key);
        if (active === had) return;
        if (active) speakingRef.current.add(key);
        else speakingRef.current.delete(key);
        forceTick((v) => v + 1);
      }, 300);
      metersRef.current.set(key, id);
    } catch { /* metering is cosmetic */ }
  };

  // ── outgoing video track (camera | screen | blurred background) ─────
  const videoOutTrack = () => {
    if (sharing) return shareStreamRef.current?.getVideoTracks()[0] || null;
    if (blurRef.current.stream) return blurRef.current.stream.getVideoTracks()[0];
    return localStreamRef.current?.getVideoTracks()[0] || null;
  };
  const applyVideoTrack = () => {
    const track = videoOutTrack();
    pcsRef.current.forEach(({ pc }) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      sender?.replaceTrack(track).catch(() => {});
    });
  };

  const getPC = (remoteId) => {
    let st = pcsRef.current.get(remoteId);
    if (st) return st;
    const pc = new RTCPeerConnection(RTC_CONFIG);
    st = { pc, makingOffer: false, ignoreOffer: false, pending: [] };
    pcsRef.current.set(remoteId, st);
    const stream = localStreamRef.current;
    if (stream) stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    else {
      pc.addTransceiver('audio', { direction: 'recvonly' });
      pc.addTransceiver('video', { direction: 'recvonly' });
    }
    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('rtc:signal', { to: remoteId, signal: { candidate: e.candidate } });
    };
    pc.ontrack = (e) => {
      streamsRef.current.set(remoteId, e.streams[0]);
      attachMeter(remoteId, e.streams[0]);
      recSourcesRef.current?.(remoteId, e.streams[0]);
      streamVersionRef.current += 1;
      forceTick((v) => v + 1);
    };
    pc.onnegotiationneeded = async () => {
      if (st.makingOffer) return;
      try {
        st.makingOffer = true;
        await pc.setLocalDescription();
        socket.emit('rtc:signal', { to: remoteId, signal: pc.localDescription });
      } catch { /* retry happens via next negotiationneeded */ }
      finally { st.makingOffer = false; }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        try { pc.restartIce(); } catch { /* noop */ }
      }
    };
    return st;
  };

  const handleSignal = async ({ from, signal }) => {
    const st = getPC(from);
    const pc = st.pc;
    const offerCollision =
      signal.type === 'offer' &&
      (st.makingOffer || pc.signalingState !== 'stable');
    const polite = socket.id > from;
    st.ignoreOffer = !polite && offerCollision;
    if (st.ignoreOffer) return;
    try {
      if (signal.type === 'offer') {
        if (offerCollision) {
          // polite peer discards its pending offer and accepts the incoming one
          await pc.setLocalDescription({ type: 'rollback' }).catch(() => {});
        }
        await pc.setRemoteDescription(signal);
        if (pc.signalingState === 'have-remote-offer' || pc.signalingState === 'have-local-pranswer') {
          await pc.setLocalDescription();
          socket.emit('rtc:signal', { to: from, signal: pc.localDescription });
        }
      } else if (signal.type === 'answer') {
        await pc.setRemoteDescription(signal);
      } else if (signal.candidate) {
        if (pc.remoteDescription) {
          try { await pc.addIceCandidate(signal.candidate); }
          catch { /* stray candidate */ }
        } else st.pending.push(signal.candidate);
      }
    } catch { /* ignore transient signaling errors */ }
    if (pc.remoteDescription && st.pending.length) {
      const q = st.pending.splice(0);
      for (const c of q) { try { await pc.addIceCandidate(c); } catch { /* noop */ } }
    }
  };

  const closePC = (remoteId) => {
    const st = pcsRef.current.get(remoteId);
    if (st) { try { st.pc.close(); } catch { /* noop */ } pcsRef.current.delete(remoteId); }
    streamsRef.current.delete(remoteId);
    speakingRef.current.delete(remoteId);
    videoElsRef.current.delete(remoteId);
    clearMeter(remoteId);
    streamVersionRef.current += 1;
    forceTick((v) => v + 1);
  };

  const revertSetting = (key, value) => {
    settingsRef.current = { ...settingsRef.current, [key]: value };
    setSettings(settingsRef.current);
  };

  // ── virtual background (feathered subject mask over a blurred frame) ─
  const stopBlur = () => {
    const b = blurRef.current;
    if (b.timer) clearInterval(b.timer);
    b.stream?.getTracks().forEach((t) => t.stop());
    if (b.src) { b.src.srcObject = null; }
    blurRef.current = {};
  };

  const startBlur = (level) => {
    stopBlur();
    const stream = localStreamRef.current;
    const cam = stream?.getVideoTracks()[0];
    if (!cam) {
      toast.error('Turn your camera on to use a virtual background');
      revertSetting('blur', 'off');
      return;
    }
    const st = cam.getSettings();
    const w = Math.min(1280, st.width || 640);
    const h = Math.min(720, st.height || 360);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    const comp = document.createElement('canvas');
    comp.width = w; comp.height = h;
    const cctx = comp.getContext('2d');
    const mask = document.createElement('canvas');
    mask.width = w; mask.height = h;
    const mctx = mask.getContext('2d');
    const grad = mctx.createRadialGradient(w / 2, h * 0.48, Math.min(w, h) * 0.1, w / 2, h * 0.55, Math.max(w, h) * 0.44);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.9)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    mctx.fillStyle = grad;
    mctx.fillRect(0, 0, w, h);
    const src = document.createElement('video');
    src.srcObject = stream;
    src.muted = true;
    src.playsInline = true;
    src.play().catch(() => {});
    const px = BLUR_PX[level] || BLUR_PX.soft;
    const bleed = px * 1.5;
    const paint = () => {
      if (src.readyState < 2 || !src.videoWidth) return;
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.filter = `blur(${px}px)`;
      ctx.drawImage(src, -bleed, -bleed, w + bleed * 2, h + bleed * 2);
      ctx.restore();
      cctx.globalCompositeOperation = 'source-over';
      cctx.clearRect(0, 0, w, h);
      cctx.drawImage(src, 0, 0, w, h);
      cctx.globalCompositeOperation = 'destination-in';
      cctx.drawImage(mask, 0, 0);
      ctx.drawImage(comp, 0, 0);
    };
    const timer = setInterval(paint, 40);
    blurRef.current = { canvas, src, timer, stream: canvas.captureStream(24) };
    applyVideoTrack();
    forceTick((v) => v + 1);
  };

  const applySettings = (patch) => {
    const prev = settingsRef.current;
    const next = { ...prev, ...patch };
    settingsRef.current = next;
    setSettings(next);
    if (patch.quality && patch.quality !== prev.quality) {
      const prof = QUALITY[patch.quality];
      const cam = localStreamRef.current?.getVideoTracks()[0];
      if (cam && prof) {
        cam.applyConstraints({ width: { ideal: prof.width }, height: { ideal: prof.height }, frameRate: { ideal: prof.frameRate } })
          .then(() => applyVideoTrack())
          .catch(() => toast.info('This camera cannot switch to that quality'));
      }
    }
    if (patch.blur !== undefined && patch.blur !== prev.blur) {
      if (patch.blur === 'off') { stopBlur(); applyVideoTrack(); forceTick((v) => v + 1); }
      else startBlur(patch.blur);
    }
    if (patch.noiseSuppression !== undefined && patch.noiseSuppression !== prev.noiseSuppression) {
      restartAudio(patch.noiseSuppression);
    }
    if (patch.captions !== undefined && patch.captions !== prev.captions) {
      if (patch.captions) startCaptions();
      else stopCaptions();
    }
  };

  const restartAudio = async (noiseSuppression) => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression, autoGainControl: true } });
      const fresh = s.getAudioTracks()[0];
      const old = localStreamRef.current?.getAudioTracks()[0];
      if (old) fresh.enabled = old.enabled;
      if (!localStreamRef.current) localStreamRef.current = s;
      else {
        if (old) { localStreamRef.current.removeTrack(old); old.stop(); }
        localStreamRef.current.addTrack(fresh);
      }
      pcsRef.current.forEach(({ pc }) => {
        const sender = pc.getSenders().find((x) => x.track?.kind === 'audio');
        if (sender) sender.replaceTrack(fresh).catch(() => {});
        else { try { pc.addTrack(fresh, localStreamRef.current); } catch { /* noop */ } }
      });
      clearMeter('self');
      attachMeter('self', localStreamRef.current);
      toast.success(noiseSuppression ? 'Noise suppression enabled' : 'Noise suppression disabled');
      forceTick((v) => v + 1);
    } catch {
      toast.error('Could not restart the microphone');
      revertSetting('noiseSuppression', !noiseSuppression);
    }
  };

  // ── live captions (Web Speech API, transcribes your own speech) ─────
  const pushCaption = (text) => {
    if (!text) return;
    const id = ++floatIdRef.current;
    setCaptionLines((prev) => [...prev.slice(-2), { id, name: user?.name || 'You', text }]);
    setTimeout(() => setCaptionLines((prev) => prev.filter((c) => c.id !== id)), 9000);
  };

  const startCaptions = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      toast.error('Live captions need Chrome or Edge (Web Speech API)');
      revertSetting('captions', false);
      return;
    }
    stopCaptions();
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || 'en-US';
    rec.onresult = (ev) => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        if (res.isFinal) pushCaption(res[0].transcript.trim());
        else interim += res[0].transcript;
      }
      setCaptionDraft(interim);
    };
    rec.onerror = (ev) => {
      if (ev.error === 'not-allowed') {
        toast.error('Allow microphone access to use captions');
        revertSetting('captions', false);
      }
    };
    rec.onend = () => {
      if (captionsOnRef.current) { try { rec.start(); } catch { /* noop */ } }
    };
    captionsOnRef.current = true;
    captionRef.current = rec;
    try { rec.start(); toast.info('Live captions on — speak to see subtitles'); } catch { /* already started */ }
  };

  const stopCaptions = () => {
    captionsOnRef.current = false;
    try { captionRef.current?.stop(); } catch { /* noop */ }
    captionRef.current = null;
    setCaptionLines([]);
    setCaptionDraft('');
  };

  // ── session recording (composited canvas + mixed audio) ────────────
  const registerVideo = useCallback((key, el) => {
    if (el) videoElsRef.current.set(key, el);
    else videoElsRef.current.delete(key);
  }, []);

  const drawCover = (ctx, src, sw, sh, x, y, w, h) => {
    const scale = Math.max(w / sw, h / sh);
    const dw = sw * scale;
    const dh = sh * scale;
    ctx.drawImage(src, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  };

  const drawRecFrame = (ctx, canvas, seconds) => {
    const W = canvas.width;
    const H = canvas.height;
    ctx.fillStyle = '#080b18';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#0f1428';
    ctx.fillRect(0, 0, W, 58);
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath(); ctx.arc(28, 29, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 20px Inter, system-ui, sans-serif';
    ctx.fillText('REC', 44, 36);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 17px Inter, system-ui, sans-serif';
    ctx.fillText(`${cls.title}   ·   ${fmtClock(seconds / 1000)}   ·   EduNexa Live`, 104, 35);

    const list = tilesRef.current;
    const n = Math.max(1, list.length);
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const gap = 10;
    const cw = (W - gap * (cols + 1)) / cols;
    const ch = (H - 58 - gap * (rows + 1)) / rows;
    list.forEach((t, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = gap + col * (cw + gap);
      const y = 58 + gap + row * (ch + gap);
      ctx.fillStyle = '#141a33';
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 14); ctx.fill(); }
      else ctx.fillRect(x, y, cw, ch);
      const el = videoElsRef.current.get(t.key);
      const live = el && el.readyState >= 2 && el.videoWidth && (t.camOn || t.sharing || t.isSelf);
      if (live) {
        ctx.save();
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 14); ctx.clip(); }
        drawCover(ctx, el, el.videoWidth, el.videoHeight, x, y, cw, ch);
        ctx.restore();
      } else {
        ctx.fillStyle = '#8b7dff';
        ctx.font = '800 42px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(initials(t.name), x + cw / 2, y + ch / 2);
        ctx.textAlign = 'left';
      }
      ctx.fillStyle = 'rgba(8,11,24,.78)';
      ctx.fillRect(x + 8, y + ch - 40, Math.min(cw - 16, 26 + t.name.length * 9), 30);
      ctx.fillStyle = t.isHost ? '#a78bfa' : '#e2e8f0';
      ctx.font = '700 15px Inter, system-ui, sans-serif';
      ctx.fillText(`${t.name}${t.isHost ? ' · Instructor' : ''}`, x + 16, y + ch - 19);
      if (!t.micOn) {
        ctx.fillStyle = '#f43f5e';
        ctx.fillText('muted', x + cw - 66, y + ch - 19);
      }
    });
  };

  const uploadRecording = async (blob, seconds) => {
    // A mostly-static composite compresses to a few KB, so gate on duration,
    // never on byte size.
    if (seconds < 5000) { toast.info('Recording was too short to save'); return; }
    if (!blob.size) { toast.error('Recording produced no video data'); return; }
    const fd = new FormData();
    fd.append('recording', new File([blob], `recording-${Date.now()}.webm`, { type: 'video/webm' }));
    fd.append('durationSeconds', String(Math.round(seconds / 1000)));
    try {
      const { data } = await api.post(`/live/classes/${cls._id}/recording`, fd);
      toast.success(`Recording uploaded (${data.recording.sizeMb} MB) — enrolled students can replay it`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not upload the recording');
    }
  };

  const startRecording = () => {
    if (typeof MediaRecorder === 'undefined') { toast.error('Recording is not supported in this browser'); return; }
    stopRecording();
    const canvas = document.createElement('canvas');
    canvas.width = 1280; canvas.height = 720;
    const ctx = canvas.getContext('2d');
    const audioCtx = ensureCtx();
    const dest = audioCtx.createMediaStreamDestination();
    // Chrome writes nothing at all if the mixed audio track has no feeder, so a
    // silent oscillator keeps the opus encoder producing frames for the take.
    const tone = audioCtx.createOscillator();
    const silentGain = audioCtx.createGain();
    silentGain.gain.value = 0;
    tone.connect(silentGain);
    silentGain.connect(dest);
    tone.start();
    const sources = new Map();
    const addSource = (key, stream) => {
      if (!stream?.getAudioTracks?.().length || sources.has(key)) return;
      try { audioCtx.createMediaStreamSource(stream).connect(dest); sources.set(key, true); } catch { /* silent */ }
    };
    addSource('self', localStreamRef.current);
    streamsRef.current.forEach((s, k) => addSource(k, s));
    recSourcesRef.current = addSource;
    const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      .find((t) => { try { return MediaRecorder.isTypeSupported(t); } catch { return false; } });
    const mixed = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
    const rec = new MediaRecorder(mixed, mimeType ? { mimeType } : undefined);
    const chunks = [];
    const startedAt = Date.now();
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      cleanup();
      const seconds = Date.now() - startedAt;
      setRecording(false);
      setRecSeconds(0);
      uploadRecording(new Blob(chunks, { type: mimeType || 'video/webm' }), seconds);
    };
    const cleanup = () => {
      clearInterval(paint);
      clearInterval(ticker);
      recSourcesRef.current = null;
      sources.clear();
      try { tone.stop(); } catch { /* already stopped */ }
      try { silentGain.disconnect(); } catch { /* noop */ }
      try { dest.disconnect(); } catch { /* noop */ }
    };
    const paint = setInterval(() => {
      drawRecFrame(ctx, canvas, Date.now() - startedAt);
    }, 1000 / 12);
    const ticker = setInterval(() => setRecSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    recRef.current = { rec, cleanup };
    drawRecFrame(ctx, canvas, 0);
    rec.start(4000);
    setRecording(true);
    toast.info('Recording the session — everyone can see the REC indicator');
  };

  const stopRecording = () => {
    const r = recRef.current;
    if (!r) { setRecording(false); return; }
    recRef.current = null;
    try { r.rec.stop(); } catch { r.cleanup(); setRecording(false); }
  };

  // ── socket wiring ──────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const on = (ev, fn) => { socket.on(ev, fn); return () => socket.off(ev, fn); };
    const offs = [
      on('room:joined', ({ isHost: host, status: s, waitingRoom: wr, activePoll: poll }) => {
        setIsHost(host);
        setStatus(s);
        setWaitingRoom(!!wr);
        setPhase('in');
        socket.emit('wait:list', {});
        if (poll) { setActivePoll(poll); setPanel('poll'); setShowPanel(true); }
      }),
      on('room:error', ({ message }) => {
        setBlockedMsg(message);
        setPhase('blocked');
      }),
      on('room:waiting', ({ title }) => {
        setWaitSeconds(0);
        setPhase('waiting');
        toast.info(`Waiting room enabled for “${title}” — the host will admit you`);
      }),
      on('wait:denied', () => {
        setBlockedMsg('The host declined your request to join this session.');
        setPhase('blocked');
      }),
      on('wait:list', ({ waiters: list }) => {
        const known = new Set(waitersRef.current.map((w) => w.socketId));
        const fresh = list.filter((w) => !known.has(w.socketId));
        waitersRef.current = list;
        setWaiters(list);
        fresh.forEach((w) => toast.info(`🚪 ${w.name} is waiting to join`));
        if (fresh.length) { setPanel('people'); setShowPanel(true); }
      }),
      on('chat:history', ({ messages: hist }) => setMessages(hist)),
      on('chat:message', (m) => setMessages((prev) => [...prev.slice(-400), m])),
      on('chat:typing', ({ user: name }) => {
        setTypingUser(name);
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setTypingUser(''), 3000);
      }),
      on('room:peer-joined', ({ peer }) => {
        getPC(peer.socketId); // existing peer opens the offer toward the newcomer
      }),
      on('room:peer-left', ({ socketId }) => {
        closePC(socketId);
        setPinnedId((prev) => (prev === socketId ? null : prev));
      }),
      on('room:peers', ({ peers: list }) => setPeers(list)),
      on('rtc:signal', handleSignal),
      on('live:hand-raise', ({ name }) => toast.info(`✋ ${name} raised a hand`)),
      on('live:reaction', ({ emoji, name }) => {
        const id = ++floatIdRef.current;
        setFloaters((prev) => [...prev.slice(-16), { id, emoji, name }]);
        setTimeout(() => setFloaters((prev) => prev.filter((f) => f.id !== id)), 4200);
      }),
      on('poll:open', ({ poll }) => {
        setActivePoll(poll);
        setPanel('poll');
        setShowPanel(true);
        toast.info('📊 A poll just started — cast your vote');
      }),
      on('poll:update', ({ poll }) => setActivePoll(poll)),
      on('poll:error', ({ message }) => toast.error(message)),
      on('live:settings', ({ waitingRoom: wr }) => {
        setWaitingRoom(!!wr);
        toast.info(wr ? 'Waiting room is now ON for new arrivals' : 'Waiting room is now OFF — students join directly');
      }),
      on('force:mute', () => {
        localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = false; });
        setMicOn(false);
        toast.info('The host muted your microphone');
      }),
      on('force:kick', () => {
        socket.emit('room:leave', {});
        pcsRef.current.forEach((st) => { try { st.pc.close(); } catch { /* noop */ } });
        pcsRef.current.clear();
        stopRecording();
        setBlockedMsg('The host removed you from this session.');
        setPhase('blocked');
      }),
      on('live:status', ({ classId, status: s }) => {
        if (String(classId) !== String(cls._id)) return;
        setStatus(s);
        if (s === 'ended') {
          stopRecording();
          setPhase((p) => (p === 'in' || p === 'waiting' ? 'ended' : p));
        }
        if (s === 'live') toast.info('Class has started');
      }),
    ];
    return () => offs.forEach((off) => off());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, cls._id]);

  useEffect(() => {
    handRaisedRef.current = handRaised;
  }, [handRaised]);
  useEffect(() => {
    micOnRef.current = micOn;
  }, [micOn]);

  useEffect(() => () => {
    pcsRef.current.forEach((st) => { try { st.pc.close(); } catch { /* noop */ } });
    pcsRef.current.clear();
    shareStreamRef.current?.getTracks().forEach((t) => t.stop());
    metersRef.current.forEach((id) => clearInterval(id));
    metersRef.current.clear();
    videoElsRef.current.clear();
    stopBlur();
    stopCaptions();
    stopRecording();
    clearTimeout(typingTimerRef.current);
  }, []);

  // session + recording timers
  useEffect(() => {
    if (status !== 'live') return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (phase !== 'waiting') return;
    const id = setInterval(() => setWaitSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // keeps the waiting-room clock ticking for the host
  useEffect(() => {
    if (phase !== 'in' || waiters.length === 0) return;
    const id = setInterval(() => forceTick((v) => v + 1), 5000);
    return () => clearInterval(id);
  }, [phase, waiters.length]);

  useEffect(() => {
    if (status !== 'scheduled') return;
    const id = setInterval(() => forceTick((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  // auto-hide the reaction strip
  useEffect(() => {
    if (!showReact) return;
    const id = setTimeout(() => setShowReact(false), 7000);
    return () => clearTimeout(id);
  }, [showReact]);

  const join = () => {
    setPhase('connecting');
    attachMeter('self', localStreamRef.current);
    socket.emit('room:join', { classId: cls._id });
    setTimeout(() => {
      setPhase((p) => {
        if (p !== 'connecting') return p;
        setBlockedMsg('The room did not respond. Check your connection and try again.');
        return 'blocked';
      });
    }, 8000);
  };

  const leave = () => {
    stopRecording();
    socket.emit('room:leave', {});
    pcsRef.current.forEach((st) => { try { st.pc.close(); } catch { /* noop */ } });
    pcsRef.current.clear();
    onLeave();
  };

  const toggleMic = () => {
    const next = !micOnRef.current;
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);
  };
  const toggleCam = () => {
    const next = !camOn;
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = next));
    setCamOn(next);
  };
  const toggleHand = () => {
    const next = !handRaisedRef.current;
    setHandRaised(next);
    socket.emit('live:hand', { raised: next });
  };
  const sendReaction = (emoji) => {
    socket.emit('live:reaction', { emoji });
    if (emoji === '✍️') setHandRaised(true);
  };

  const toggleShare = async () => {
    if (sharing) {
      shareStreamRef.current?.getTracks().forEach((t) => t.stop());
      shareStreamRef.current = null;
      setSharing(false);
      applyVideoTrack();
      return;
    }
    try {
      const ds = await navigator.mediaDevices.getDisplayMedia({ video: true });
      shareStreamRef.current = ds;
      ds.getVideoTracks()[0].onended = () => { if (shareStreamRef.current) toggleShare(); };
      setSharing(true);
      applyVideoTrack();
    } catch {
      toast.error('Screen share was cancelled or not allowed');
    }
  };

  const setStatusHost = (s) => socket.emit('live:status', { classId: cls._id, status: s });

  // ── tiles ──────────────────────────────────────────────────────────
  const others = peers.filter((p) => p.socketId !== socket?.id);
  const hostLabel = (t) => {
    if (!t.isHost) return 'Student';
    const id = String(t.isSelf ? meId : t.userId);
    if (ownerId === id) return 'Instructor';
    return t.isSelf && user?.role === 'admin' ? 'Host' : 'Co-host';
  };
  const selfTile = {
    key: 'self', isSelf: true, name: user?.name || 'You', avatar: user?.avatar,
    isHost, micOn, camOn, sharing, handRaised, userId: meId,
    blurred: settings.blur !== 'off',
    stream: sharing ? shareStreamRef.current : (blurRef.current.stream || localStreamRef.current),
  };
  const tiles = [
    selfTile,
    ...others.map((p) => ({
      key: p.socketId, isSelf: false, name: p.name, avatar: p.avatar, isHost: p.isHost,
      userId: p.userId, micOn: p.micOn, camOn: p.camOn, sharing: p.sharing, handRaised: p.handRaised,
      stream: streamsRef.current.get(p.socketId),
    })),
  ].map((t) => ({ ...t, hostLabel: hostLabel(t) }));
  tilesRef.current = tiles;
  const sharedTile = tiles.find((t) => t.sharing);
  const pinnedTile = pinnedId ? tiles.find((t) => t.key === pinnedId) : null;
  const spotlight = pinnedTile || sharedTile || tiles.find((t) => t.isHost) || null;
  const rest = spotlight ? tiles.filter((t) => t.key !== spotlight.key) : tiles;
  const handQueue = tiles.filter((t) => t.handRaised && !t.isHost);

  const openPanel = (name) => {
    setPanel(name);
    setShowPanel(true);
  };

  // ── pre-join / waiting / blocked screens ───────────────────────────
  if (phase === 'preview' || phase === 'connecting') {
    const stream = blurRef.current.stream || localStreamRef.current;
    return (
      <div className="live-shell">
        <div className="live-preview">
          <div className="live-preview-video">
            {stream && stream.getVideoTracks().length ? (
              <video autoPlay playsInline muted ref={(v) => { if (v && v.srcObject !== stream) v.srcObject = stream; }} className="w-full h-full object-cover" />
            ) : (
              <div className="live-tile-avatar"><span>{initials(user?.name)}</span></div>
            )}
            <div className="live-preview-badges">
              <span className={`live-chip ${micOn ? '' : 'live-chip-off'}`}>{micOn ? <Mic size={13} /> : <MicOff size={13} />} {micOn ? 'Mic on' : 'Muted'}</span>
              <span className={`live-chip ${camOn ? '' : 'live-chip-off'}`}>{camOn ? <Video size={13} /> : <VideoOff size={13} />} {camOn ? 'Cam on' : 'Cam off'}</span>
            </div>
          </div>
          <div className="live-preview-side">
            <div className="eyebrow text-slate-400">You are about to join</div>
            <h2 className="text-xl font-black text-white mt-1 leading-snug">{cls.title}</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">{cls.description || 'Live interactive session with your instructor.'}</p>
            <div className="live-preview-meta">
              <span><Radio size={13} className="text-rose-400" /> {status === 'live' ? 'Streaming now' : `Starts in ${timeLeft(cls.startsAt)}`}</span>
              <span><Users size={13} className="text-violet-400" /> {cls.participantCount || 0} in room</span>
              <span><Clock size={13} className="text-slate-400" /> {new Date(cls.startsAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
              {cls.waitingRoom && <span><DoorClosed size={13} className="text-amber-400" /> Waiting room — the host admits students</span>}
            </div>
            <div className="live-preview-actions">
              <button className="live-btn live-btn-ghost" onClick={toggleMic}>{micOn ? <Mic size={15} /> : <MicOff size={15} />}</button>
              <button className="live-btn live-btn-ghost" onClick={toggleCam}>{camOn ? <Video size={15} /> : <VideoOff size={15} />}</button>
              <button className={`live-btn live-btn-ghost ${settings.blur !== 'off' ? 'live-btn-live' : ''}`} onClick={() => applySettings({ blur: settings.blur === 'off' ? 'soft' : 'off' })} title="Virtual background"><Sparkles size={15} /></button>
            </div>
            <button className="btn-primary w-full mt-4 py-3 text-sm" onClick={join} disabled={phase === 'connecting'}>
              {phase === 'connecting' ? (<><Loader2 size={15} className="animate-spin" /> Joining…</>) : 'Join session now'}
            </button>
            <button className="live-btn-link mt-2" onClick={onLeave}>Back to class list</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'waiting') {
    return (
      <div className="live-shell">
        <div className="live-modal-card text-center live-waiting">
          <div className="live-waiting-orb"><span /><span /><span /></div>
          <h3 className="text-lg font-black text-white mt-4">You are in the waiting room</h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            “{cls.title}” uses a waiting room. An instructor will let you into the session shortly —
            your mic and camera stay private until then.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className={`live-chip ${micOn ? '' : 'live-chip-off'}`}>{micOn ? <Mic size={13} /> : <MicOff size={13} />} {micOn ? 'Mic ready' : 'Muted'}</span>
            <span className={`live-chip ${camOn ? '' : 'live-chip-off'}`}>{camOn ? <Video size={13} /> : <VideoOff size={13} />} {camOn ? 'Cam ready' : 'Cam off'}</span>
            <span className="live-chip"><Clock size={13} /> waiting {fmtClock(waitSeconds)}</span>
          </div>
          <div className="flex gap-3 mt-6">
            <button className="live-btn live-btn-ghost flex-1 py-2.5 text-xs" onClick={toggleMic}>{micOn ? <Mic size={14} /> : <MicOff size={14} />}{micOn ? 'Mute myself' : 'Unmute myself'}</button>
            <button className="live-btn live-btn-danger flex-1 py-2.5 text-xs" onClick={leave}><PhoneOff size={14} /> Leave</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'blocked') {
    return (
      <div className="live-shell">
        <div className="live-modal-card text-center">
          <ShieldCheck size={34} className="mx-auto text-amber-400 mb-3" />
          <h3 className="text-lg font-black text-white">Cannot join room</h3>
          <p className="text-xs text-slate-400 mt-2">{blockedMsg || 'You do not have access to this live class yet. Enroll in the course first.'}</p>
          <button className="btn-primary mt-5 px-6" onClick={onLeave}>Back to class list</button>
        </div>
      </div>
    );
  }

  if (phase === 'ended') {
    return (
      <div className="live-shell">
        <div className="live-modal-card text-center">
          <Radio size={34} className="mx-auto text-rose-400 mb-3" />
          <h3 className="text-lg font-black text-white">“{cls.title}” has ended</h3>
          <p className="text-xs text-slate-400 mt-2">Thanks for attending. Chat history stays available and any recording is listed on the class card.</p>
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            <span className="live-chip"><Users size={13} /> {cls.peakViewers || tiles.length} peak viewers</span>
            <span className="live-chip"><MessageSquare size={13} /> {messages.length} messages</span>
          </div>
          <button className="btn-primary mt-5 px-6" onClick={onLeave}>Back to class list</button>
        </div>
      </div>
    );
  }

  // ── the stage ──────────────────────────────────────────────────────
  return (
    <div className={`live-shell live-stage ${showPanel ? 'with-panel' : ''}`}>
      <div className="live-main">
        <header className="live-topbar">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`live-status-badge ${status === 'live' ? 'live-status-live' : 'live-status-scheduled'}`}>
              {status === 'live' ? '● LIVE' : 'Scheduled'}
            </span>
            {recording && <span className="live-rec-badge"><i /> REC {fmtClock(recSeconds)}</span>}
            <div className="min-w-0">
              <div className="font-extrabold text-sm text-white truncate">{cls.title}</div>
              <div className="text-[11px] text-slate-400 truncate">{cls.course?.title} • {cls.instructor?.name}{waitingRoom ? ' • waiting room on' : ''}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {handQueue.length > 0 && <span className="live-chip live-chip-hand"><Hand size={13} /> {handQueue.length}</span>}
            <span className="live-chip hidden sm:flex"><Users size={13} /> {tiles.length}</span>
            {status === 'live' && <span className="live-chip text-rose-300"><Clock size={13} /> {fmtClock(elapsed)}</span>}
            {status === 'scheduled' && <span className="live-chip"><Clock size={13} /> starts in {timeLeft(cls.startsAt)}</span>}
            {isHost && waiters.length > 0 && (
              <button className="live-chip live-chip-waiting" onClick={() => openPanel('people')}><DoorClosed size={13} /> {waiters.length} waiting</button>
            )}
            {isHost && status === 'scheduled' && (
              <button className="live-btn live-btn-live" onClick={() => setStatusHost('live')}><Radio size={14} /> Start class</button>
            )}
            {isHost && status === 'live' && (
              <button className="live-btn live-btn-danger" onClick={() => setStatusHost('ended')}>End class</button>
            )}
          </div>
        </header>

        <div className="live-content">
          {boardOpen ? (
            <div className="live-board-slot">
              <WhiteboardBoard socket={socket} isHost={isHost} onClose={() => setBoardOpen(false)} />
            </div>
          ) : null}

          {boardOpen ? (
            <div className="live-filmstrip live-filmstrip-board">
              {tiles.map((t) => (
                <div className="live-film-tile" key={t.key}>
                  <PeerTile tile={t} speaking={speakingRef.current.has(t.key)} pinned={pinnedId === t.key} onPin={() => setPinnedId(pinnedId === t.key ? null : t.key)} selfVideo={t.isSelf} registerVideo={registerVideo} />
                </div>
              ))}
            </div>
          ) : spotlight && tiles.length > 1 && !gridMode ? (
            <>
              <div className="live-spotlight">
                <PeerTile tile={spotlight} speaking={speakingRef.current.has(spotlight.key)} pinned={pinnedId === spotlight.key} onPin={() => setPinnedId(pinnedId === spotlight.key ? null : spotlight.key)} selfVideo={spotlight.isSelf} registerVideo={registerVideo} />
              </div>
              <div className="live-filmstrip">
                {rest.map((t) => (
                  <div className="live-film-tile" key={t.key}>
                    <PeerTile tile={t} speaking={speakingRef.current.has(t.key)} pinned={pinnedId === t.key} onPin={() => setPinnedId(pinnedId === t.key ? null : t.key)} selfVideo={t.isSelf} registerVideo={registerVideo} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className={`live-grid live-grid-${Math.min(tiles.length, 4)}`}>
              {tiles.map((t) => (
                <PeerTile key={t.key} tile={t} speaking={speakingRef.current.has(t.key)} pinned={pinnedId === t.key} onPin={() => setPinnedId(pinnedId === t.key ? null : t.key)} selfVideo={t.isSelf} registerVideo={registerVideo} />
              ))}
            </div>
          )}

          {floaters.length > 0 && (
            <div className="live-reaction-layer">
              {floaters.map((f) => (
                <span className="live-reaction-float" key={f.id}>
                  <b>{f.emoji}</b>
                  <em>{f.name}</em>
                </span>
              ))}
            </div>
          )}

          {(settings.captions || captionLines.length > 0 || captionDraft) && (
            <div className="live-caption-bar">
              {captionLines.map((c) => (<p key={c.id}><b>{c.name}:</b> {c.text}</p>))}
              {captionDraft && <p className="live-caption-draft"><b>{user?.name || 'You'}:</b> {captionDraft}</p>}
            </div>
          )}
        </div>

        {showReact && (
          <div className="live-reaction-bar">
            {REACTIONS.map((r) => (
              <button key={r} type="button" onClick={() => { sendReaction(r); setShowReact(false); }} title={r === '✍️' ? 'Raise hand' : `React ${r}`}>{r}</button>
            ))}
          </div>
        )}

        {showSettings && (
          <SettingsMenu
            settings={settings}
            onChange={applySettings}
            onClose={() => setShowSettings(false)}
            isHost={isHost}
            waitingRoom={waitingRoom}
            onToggleWaitingRoom={() => socket.emit('live:settings', { waitingRoom: !waitingRoom })}
            onMuteAll={() => socket.emit('host:mute-all', {})}
            captionsSupported={captionsSupported}
          />
        )}

        <div className="live-controls">
          <div className="live-controls-cluster">
            <button className={`live-ctrl ${!micOn ? 'live-ctrl-off' : ''}`} onClick={toggleMic} title={micOn ? 'Mute microphone' : 'Unmute microphone'}>
              {micOn ? <Mic size={18} /> : <MicOff size={18} />}
              <span>{micOn ? 'Mute' : 'Unmute'}</span>
            </button>
            <button className={`live-ctrl ${!camOn ? 'live-ctrl-off' : ''}`} onClick={toggleCam} title={camOn ? 'Stop camera' : 'Start camera'}>
              {camOn ? <Video size={18} /> : <VideoOff size={18} />}
              <span>{camOn ? 'Stop video' : 'Start video'}</span>
            </button>
            <button className={`live-ctrl ${sharing ? 'live-ctrl-on-accent' : ''}`} onClick={toggleShare} title="Share your screen">
              {sharing ? <MonitorOff size={18} /> : <MonitorUp size={18} />}
              <span>{sharing ? 'Stop share' : 'Share'}</span>
            </button>
            <button className={`live-ctrl ${handRaised ? 'live-ctrl-on-accent' : ''}`} onClick={toggleHand} title="Raise your hand">
              <Hand size={18} />
              <span>{handRaised ? 'Lower hand' : 'Raise hand'}</span>
            </button>
            <button className={`live-ctrl ${boardOpen ? 'live-ctrl-on-accent' : ''}`} onClick={() => setBoardOpen((b) => !b)} title="Collaborative whiteboard">
              <Presentation size={18} />
              <span>Board</span>
            </button>
            <button className="live-ctrl" onClick={() => setShowReact((v) => !v)} title="Send a reaction">
              <SmilePlus size={18} />
              <span>React</span>
            </button>
            <button className="live-ctrl" onClick={() => setGridMode((g) => !g)} title="Toggle layout">
              {gridMode ? <Pin size={18} /> : <LayoutGrid size={18} />}
              <span>{gridMode ? 'Speaker view' : 'Grid view'}</span>
            </button>
          </div>
          <div className="live-controls-cluster">
            {isHost && (
              <button className={`live-ctrl ${recording ? 'live-ctrl-rec' : ''}`} onClick={() => (recording ? stopRecording() : startRecording())} title={recording ? 'Stop and upload recording' : 'Record the session'}>
                {recording ? <Square size={18} /> : <Film size={18} />}
                <span>{recording ? `Stop · ${fmtClock(recSeconds)}` : 'Record'}</span>
              </button>
            )}
            <button className={`live-ctrl ${panel === 'poll' && showPanel ? 'live-ctrl-on-accent' : ''}`} onClick={() => openPanel('poll')} title="Polls">
              <span className="live-ctrl-ic"><Vote size={18} />{activePoll?.status === 'open' && <i className="live-dot-alert" />}</span>
              <span>Poll</span>
            </button>
            <button className={`live-ctrl ${panel === 'chat' && showPanel ? 'live-ctrl-on-accent' : ''}`} onClick={() => { setPanel('chat'); setShowPanel(!showPanel || panel !== 'chat'); }} title="Open chat">
              <MessageSquare size={18} />
              <span>Chat{messages.length > 0 ? ` (${messages.length})` : ''}</span>
            </button>
            <button className={`live-ctrl ${panel === 'people' && showPanel ? 'live-ctrl-on-accent' : ''}`} onClick={() => { setPanel('people'); setShowPanel(!showPanel || panel !== 'people'); }} title="Open participants">
              <span className="live-ctrl-ic"><Users size={18} />{(waiters.length > 0 || handQueue.length > 0) && <i className="live-dot-alert" />}</span>
              <span>People ({tiles.length})</span>
            </button>
            <button className={`live-ctrl ${settings.captions ? 'live-ctrl-on-accent' : ''}`} onClick={() => applySettings({ captions: !settings.captions })} title="Live captions">
              <Captions size={18} />
              <span>Captions</span>
            </button>
            <button className="live-ctrl" onClick={() => setShowSettings((v) => !v)} title="Settings">
              <Settings size={18} />
              <span>Settings</span>
            </button>
            <button className="live-ctrl live-ctrl-leave" onClick={leave} title="Leave session">
              <PhoneOff size={18} />
              <span>Leave</span>
            </button>
          </div>
        </div>
      </div>

      {showPanel && (
        <aside className="live-sidepanel">
          <div className="live-panel-tabs">
            <button className={panel === 'chat' ? 'active' : ''} onClick={() => setPanel('chat')}>Class chat</button>
            <button className={panel === 'people' ? 'active' : ''} onClick={() => setPanel('people')}>
              Participants ({tiles.length}){waiters.length > 0 && <em className="live-tab-alert">{waiters.length}</em>}
            </button>
            <button className={panel === 'poll' ? 'active' : ''} onClick={() => setPanel('poll')}>
              Polls{activePoll?.status === 'open' && <em className="live-tab-alert">1</em>}
            </button>
          </div>

          {panel === 'chat' && (
            <ChatPanel
              messages={messages}
              typing={typingUser}
              meId={meId}
              onSend={(t) => socket.emit('chat:message', { message: t })}
              onTyping={() => socket.emit('chat:typing', {})}
            />
          )}

          {panel === 'poll' && (
            <div className="live-panel-scroll">
              <PollPanel
                poll={activePoll}
                meId={meId}
                isModerator={isHost}
                socket={socket}
                onClose={() => setPanel('chat')}
              />
              {activePoll?.status === 'closed' && (
                <p className="text-[11px] text-slate-500 mt-3 px-1">Results stay visible after a poll closes.</p>
              )}
            </div>
          )}

          {panel === 'people' && (
            <div className="live-panel-scroll">
              {isHost && waiters.length > 0 && (
                <div className="live-waitlist">
                  <div className="live-waitlist-head"><DoorClosed size={12} /> Waiting room · {waiters.length}</div>
                  {waiters.map((w) => (
                    <div className="live-person-row" key={w.socketId}>
                      <div className="live-avatar w-8 h-8 text-[11px]">
                        {w.avatar ? <img src={w.avatar} alt="" className="w-full h-full object-cover rounded-full" /> : initials(w.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-100 truncate">{w.name}</div>
                        <div className="text-[10px] text-amber-300 font-semibold">{w.waitingSince ? `waiting ${fmtClock(Math.max(0, (Date.now() - new Date(w.waitingSince).getTime()) / 1000))}` : 'waiting'}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button className="live-mini-btn live-mini-btn-ok" onClick={() => socket.emit('wait:approve', { socketId: w.socketId })} title="Admit to class"><CircleCheck size={14} /></button>
                        <button className="live-mini-btn live-mini-btn-bad" onClick={() => socket.emit('wait:deny', { socketId: w.socketId })} title="Keep out"><CircleX size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isHost && (
                <div className="live-host-toolbar">
                  <button className="live-btn live-btn-ghost !py-1.5 text-[11px]" onClick={() => socket.emit('host:mute-all', {})}><VolumeX size={12} /> Mute all</button>
                  <button className="live-btn live-btn-ghost !py-1.5 text-[11px]" onClick={() => socket.emit('live:settings', { waitingRoom: !waitingRoom })}>
                    <DoorClosed size={12} /> Waiting room {waitingRoom ? 'on' : 'off'}
                  </button>
                </div>
              )}

              {tiles.map((t) => {
                const isMainHost = ownerId === String(t.userId);
                const manageable = isHost && !t.isSelf && !isMainHost;
                return (
                <div key={t.key} className="live-person-row relative">
                  <div className="live-avatar w-8 h-8 text-[11px]">
                    {t.avatar ? <img src={t.avatar} alt="" className="w-full h-full object-cover rounded-full" /> : initials(t.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-100 truncate">{t.name}{t.isSelf ? ' (You)' : ''}</div>
                    <div className="flex items-center gap-1.5">
                      <span className={`live-role-badge ${t.isHost ? 'live-role-instructor' : 'live-role-student'}`}>{t.hostLabel}</span>
                      {t.sharing && <MonitorUp size={12} className="text-emerald-400" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.handRaised && <Hand size={14} className="text-amber-400 live-hand" />}
                    {!t.micOn ? <MicOff size={14} className="text-rose-400" /> : <Mic size={14} className="text-emerald-400/70" />}
                    {!t.camOn && !t.sharing && <VideoOff size={14} className="text-slate-500" />}
                    {manageable && (
                      <button className="live-mini-btn" onClick={() => setRowMenu(rowMenu === t.key ? null : t.key)} title="Host options"><MoreVertical size={14} /></button>
                    )}
                  </div>
                  {rowMenu === t.key && manageable && (
                    <div className="live-row-menu">
                      {!t.isHost && (
                        <button onClick={() => { socket.emit('host:mute', { targetSocketId: t.key }); setRowMenu(null); }}><MicOff size={13} /> Mute microphone</button>
                      )}
                      {canAppoint && !t.isHost && (
                        <button onClick={() => { socket.emit('live:cohost', { userId: t.userId, on: true }); setRowMenu(null); toast.success(`${t.name} is now a co-host`); }}><UserCog size={13} /> Make co-host</button>
                      )}
                      {canAppoint && t.isHost && (
                        <button onClick={() => { socket.emit('live:cohost', { userId: t.userId, on: false }); setRowMenu(null); toast.info(`${t.name} is no longer a co-host`); }}><UserCog size={13} /> Remove co-host</button>
                      )}
                      {!t.isHost && (
                        <button className="danger" onClick={() => { socket.emit('host:kick', { targetSocketId: t.key }); setRowMenu(null); }}><CircleX size={13} /> Remove from class</button>
                      )}
                    </div>
                  )}
                </div>
                );
              })}

              {handQueue.length > 0 && (
                <div className="live-hand-queue">
                  <div className="live-waitlist-head"><Hand size={12} /> Raised hands</div>
                  {handQueue.map((t) => (
                    <button key={t.key} className="live-btn live-btn-ghost !py-1.5 text-[11px] w-full justify-start" onClick={() => setPinnedId(t.key)}>
                      {t.name}{t.isSelf ? ' (You)' : ''}
                    </button>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-slate-500 pt-2 border-t border-white/5">
                {cls.attendees?.length || 0} enrolled students attended this session · peak {cls.peakViewers || 0}.
              </p>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
