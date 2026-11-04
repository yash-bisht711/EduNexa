import React, { useRef, useState, useEffect } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, FastForward, CheckCircle
} from 'lucide-react';

export default function VideoPlayer({ src, hlsUrl, poster, onEnded, autoAdvance = true }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);

  const activeSrc = hlsUrl || src;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleEnded = () => {
      setPlaying(false);
      if (onEnded) onEnded();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [onEnded]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const handleSeek = (e) => {
    const v = videoRef.current;
    if (!v) return;
    const time = Number(e.target.value);
    v.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e) => {
    const v = videoRef.current;
    if (!v) return;
    const vol = Number(e.target.value);
    v.volume = vol;
    setVolume(vol);
    setMuted(vol === 0);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !muted;
    setMuted(!muted);
  };

  const changeSpeed = (s) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = s;
    setSpeed(s);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 2500);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative rounded-2xl overflow-hidden bg-black group aspect-video select-none"
    >
      <video
        ref={videoRef}
        src={activeSrc}
        poster={poster}
        onClick={togglePlay}
        className="w-full h-full object-contain cursor-pointer"
        playsInline
      />

      {/* Center Play Button Overlay when Paused */}
      {!playing && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer transition"
        >
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur border border-white/30 text-white grid place-items-center hover:scale-110 transition">
            <Play size={28} className="ml-1 fill-white" />
          </div>
        </div>
      )}

      {/* HLS Badge */}
      {hlsUrl && (
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-white text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-full border border-white/20 pointer-events-none">
          HLS STREAM
        </div>
      )}

      {/* Video Controls Bar */}
      <div
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 transition-opacity duration-300 ${
          showControls || !playing ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Scrubber / Progress Bar */}
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-[#6d5dfc] mb-3"
        />

        <div className="flex items-center justify-between text-white text-xs">
          {/* Left Controls: Play, Time, Volume */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="hover:text-[#6d5dfc] transition"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause size={18} /> : <Play size={18} className="fill-white" />}
            </button>

            <button
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime -= 10;
              }}
              className="hover:text-violet-300 transition"
              title="Rewind 10s"
            >
              <RotateCcw size={15} />
            </button>

            <div className="text-[11px] font-medium text-slate-300">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            {/* Volume */}
            <div className="flex items-center gap-1 ml-2 group/vol">
              <button onClick={toggleMute} className="hover:text-[#6d5dfc] transition">
                {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 h-1 bg-white/30 rounded appearance-none cursor-pointer accent-[#6d5dfc]"
              />
            </div>
          </div>

          {/* Right Controls: Speed, Auto-advance, Fullscreen */}
          <div className="flex items-center gap-3">
            {/* Speed Selector */}
            <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-0.5 border border-white/10">
              {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                <button
                  key={s}
                  onClick={() => changeSpeed(s)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    speed === s ? 'bg-[#6d5dfc] text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            <button
              onClick={toggleFullscreen}
              className="hover:text-[#6d5dfc] transition ml-1"
              title="Fullscreen"
            >
              <Maximize size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
