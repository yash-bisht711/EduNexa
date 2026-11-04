import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { initials } from '../shared';

const roleBadge = {
  instructor: { label: 'Instructor', cls: 'live-role-instructor' },
  admin: { label: 'Host', cls: 'live-role-instructor' },
  student: { label: 'Student', cls: 'live-role-student' },
};

export default function ChatPanel({ messages, typing, onSend, onTyping, meId, disabled }) {
  const [text, setText] = useState('');
  const endRef = useRef(null);
  const lastTypingSent = useRef(0);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, typing]);

  const submit = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText('');
  };

  const handleChange = (e) => {
    setText(e.target.value);
    const now = Date.now();
    if (now - lastTypingSent.current > 2500) {
      lastTypingSent.current = now;
      onTyping?.();
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="live-chat-scroll flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((m, i) => {
          if (m.kind === 'system') {
            return (
              <div key={m._id || i} className="live-system-note">{m.message}</div>
            );
          }
          const isMe = String(m.user) === String(meId);
          const badge = roleBadge[m.userRole] || roleBadge.student;
          const prev = messages[i - 1];
          const grouped =
            prev && prev.kind !== 'system' && String(prev.user) === String(m.user) &&
            new Date(m.createdAt) - new Date(prev.createdAt) < 120000;
          return (
            <div key={m._id || i} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
              {!isMe ? (
                grouped ? (
                  <div className="w-8 shrink-0" />
                ) : (
                  <div className="live-avatar w-8 h-8 text-[11px] shrink-0">
                    {m.avatar ? <img src={m.avatar} alt="" className="w-full h-full object-cover rounded-full" /> : initials(m.userName)}
                  </div>
                )
              ) : null}
              <div className={`max-w-[80%] ${isMe ? 'items-end text-right' : 'items-start'} flex flex-col`}>
                {!grouped && (
                  <div className={`flex items-center gap-1.5 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[11px] font-bold text-slate-200">{isMe ? 'You' : m.userName}</span>
                    {!isMe && <span className={`live-role-badge ${badge.cls}`}>{badge.label}</span>}
                    <span className="text-[10px] text-slate-500">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                <div className={`live-bubble ${isMe ? 'live-bubble-mine' : 'live-bubble-theirs'} text-xs leading-relaxed`}>
                  {m.message}
                </div>
              </div>
            </div>
          );
        })}
        {typing && (
          <div className="live-typing text-[11px] text-slate-400">
            <span className="live-typing-dots"><i /><i /><i /></span> {typing} is typing…
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="live-chat-input p-3 border-t border-white/10 flex gap-2">
        <input
          className="live-field flex-1 text-xs"
          placeholder={disabled ? 'Session has ended' : 'Ask a question or share a thought…'}
          value={text}
          disabled={disabled}
          onChange={handleChange}
          maxLength={2000}
        />
        <button type="submit" disabled={disabled || !text.trim()} className="live-btn live-btn-accent px-3" aria-label="Send message">
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
