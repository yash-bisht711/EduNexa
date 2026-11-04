import React from 'react';
import { Sliders, ShieldCheck, Users, MicOff, DoorClosed, Captions, Video, Sparkles } from 'lucide-react';

const QUALITIES = [
  ['low', 'Data saver · 360p'],
  ['medium', 'Balanced · 540p'],
  ['high', 'HD · 720p'],
];
const BLURS = [
  ['off', 'None'],
  ['soft', 'Soft'],
  ['strong', 'Strong'],
];

function Switch({ on, onClick, disabled, label, hint, icon }) {
  return (
    <button type="button" className="live-setting-row" onClick={onClick} disabled={disabled}>
      <span className="live-setting-label">
        {icon}
        <span>
          <span className="block font-bold text-[12px] text-slate-100">{label}</span>
          {hint && <span className="block text-[10px] text-slate-500 mt-0.5 leading-snug">{hint}</span>}
        </span>
      </span>
      <span className={`live-switch ${on ? 'on' : ''}`}><i /></span>
    </button>
  );
}

export default function SettingsMenu({ settings, onChange, onClose, isHost, waitingRoom, onToggleWaitingRoom, onMuteAll, captionsSupported }) {
  return (
    <>
      <div className="live-popover-backdrop" onClick={onClose} />
      <div className="live-popover" role="dialog" aria-label="Session settings">
        <div className="live-popover-head">
          <Sliders size={14} className="text-[#8b7dff]" />
          <span className="font-black text-[13px] text-white">Session settings</span>
        </div>

        <div className="live-popover-section">
          <div className="live-popover-title"><Video size={12} /> My video</div>
          <div className="live-seg">
            {QUALITIES.map(([value, label]) => (
              <button key={value} type="button" className={settings.quality === value ? 'active' : ''} onClick={() => onChange({ quality: value })}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="live-popover-section">
          <div className="live-popover-title"><Sparkles size={12} /> Virtual background</div>
          <div className="live-seg">
            {BLURS.map(([value, label]) => (
              <button key={value} type="button" className={settings.blur === value ? 'active' : ''} onClick={() => onChange({ blur: value })}>
                {label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-2 leading-snug">Keeps you sharp and softens the room behind you. Applied to the video peers receive.</p>
        </div>

        <div className="live-popover-section">
          <div className="live-popover-title"><MicOff size={12} /> Audio</div>
          <Switch
            on={settings.noiseSuppression}
            onClick={() => onChange({ noiseSuppression: !settings.noiseSuppression })}
            label="Noise suppression"
            hint="Filters keyboard and fan noise from your microphone"
            icon={<span className="live-setting-ic"><MicOff size={13} /></span>}
          />
        </div>

        <div className="live-popover-section">
          <div className="live-popover-title"><Captions size={12} /> Accessibility</div>
          <Switch
            on={settings.captions}
            disabled={!captionsSupported}
            onClick={() => onChange({ captions: !settings.captions })}
            label="Live captions"
            hint={captionsSupported ? 'Transcribes what you say and shows it on your screen' : 'Requires Chrome or Edge (Web Speech API)'}
            icon={<span className="live-setting-ic"><Captions size={13} /></span>}
          />
        </div>

        {isHost && (
          <div className="live-popover-section">
            <div className="live-popover-title"><ShieldCheck size={12} /> Host controls</div>
            <Switch
              on={waitingRoom}
              onClick={onToggleWaitingRoom}
              label="Waiting room"
              hint="Admit each student manually before they enter"
              icon={<span className="live-setting-ic"><DoorClosed size={13} /></span>}
            />
            <button type="button" className="live-popover-btn" onClick={onMuteAll}>
              <Users size={13} /> Mute everyone except hosts
            </button>
          </div>
        )}
      </div>
    </>
  );
}
