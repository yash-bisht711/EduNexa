import React, { useState } from 'react';
import { Vote, Plus, X, CheckCircle2 } from 'lucide-react';

export default function PollPanel({ poll, meId, isModerator, socket, onClose }) {
  const [question, setQuestion] = useState('');
  const [opts, setOpts] = useState(['', '']);
  const [voted, setVoted] = useState(null);
  const [creating, setCreating] = useState(false);

  const create = () => {
    const options = opts.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || options.length < 2) {
      setCreating(true);
      setTimeout(() => setCreating(false), 2200);
      return;
    }
    socket.emit('poll:create', { question: question.trim(), options });
    setQuestion('');
    setOpts(['', '']);
  };

  if (!poll) {
    if (!isModerator) {
      return (
        <div className="live-poll-card live-poll-empty">
          <span className="flex items-center gap-2 font-black text-sm text-white"><Vote size={15} className="text-[#8b7dff]" /> No poll running</span>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">The instructor can launch a live poll at any moment — this panel fills with the question and a bar chart of the class answers as soon as one opens.</p>
          <button className="live-panel-x" onClick={onClose}><X size={14} /></button>
        </div>
      );
    }
    return (
      <div className="live-poll-card">
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-2 font-black text-sm text-white"><Vote size={15} className="text-[#8b7dff]" /> Launch a poll</span>
          <button className="live-panel-x" onClick={onClose}><X size={14} /></button>
        </div>
        <input className="live-field text-xs" placeholder="Poll question" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={400} />
        <div className="space-y-2 mt-2.5">
          {opts.map((o, i) => (
            <input key={i} className="live-field text-xs" placeholder={`Option ${i + 1}`} value={o} onChange={(e) => setOpts(opts.map((x, j) => (j === i ? e.target.value : x)))} maxLength={200} />
          ))}
        </div>
        <div className="flex items-center justify-between mt-3">
          {opts.length < 6 ? (
            <button className="live-btn live-btn-ghost !py-1.5 text-[11px]" onClick={() => setOpts([...opts, ''])}><Plus size={12} /> Add option</button>
          ) : <span />}
          {creating && <span className="text-[10px] text-rose-400 font-bold">Question + at least 2 options required</span>}
          <button className="live-btn live-btn-accent !py-1.5 text-[11px]" onClick={create}>Start poll</button>
        </div>
      </div>
    );
  }

  const total = poll.options.reduce((s, o) => s + o.votes.length, 0);
  const myVote = poll.options.find((o) => o.votes.includes(String(meId)))?.index ?? null;
  const closed = poll.status === 'closed';

  return (
    <div className="live-poll-card">
      <div className="flex items-center justify-between mb-1">
        <span className="flex items-center gap-2 font-black text-xs text-white">
          <Vote size={14} className="text-[#8b7dff]" /> {closed ? 'Poll closed' : 'Live poll'}
          {!closed && <i className="live-poll-pulse" />}
        </span>
        <button className="live-panel-x" onClick={onClose}><X size={14} /></button>
      </div>
      <p className="text-[13px] font-extrabold text-white leading-snug mt-1">{poll.question}</p>
      <div className="space-y-2 mt-3">
        {poll.options.map((o) => {
          const pct = total ? Math.round((o.votes.length / total) * 100) : 0;
          const mine = myVote === o.index;
          return (
            <button
              key={o.index}
              disabled={closed}
              onClick={() => { socket.emit('poll:vote', { pollId: poll._id, index: o.index }); setVoted(o.index); }}
              className={`live-poll-opt ${mine ? 'live-poll-opt-mine' : ''}`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-slate-100">
                <span className="flex items-center gap-1.5">{mine && <CheckCircle2 size={13} className="text-emerald-400" />}{o.text}</span>
                {(closed || mine || total > 0) && <span className="text-slate-300">{pct}%</span>}
              </div>
              <div className="live-poll-bar"><span style={{ width: `${pct}%` }} /></div>
              <div className="text-[10px] text-slate-400 mt-1">{o.votes.length} vote{o.votes.length === 1 ? '' : 's'}</div>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-3 text-[11px] text-slate-400">
        <span>{total} total votes{myVote !== null ? ' • your vote counts' : ''}</span>
        {isModerator && !closed && (
          <button className="live-btn live-btn-ghost !py-1 text-[10px]" onClick={() => socket.emit('poll:close', { pollId: poll._id })}>Close poll</button>
        )}
      </div>
    </div>
  );
}
