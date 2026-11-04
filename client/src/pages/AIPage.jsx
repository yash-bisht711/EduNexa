import React, { useState, useEffect, useRef } from 'react';
import {
  Bot, SendHorizontal, Plus, LoaderCircle, CalendarCheck,
  Target, Lightbulb, MessageSquare, Trash2, Sparkles, BookOpen
} from 'lucide-react';
import { Heading, Notice } from '../components/shared';
import { useToast } from '../components/Toast';
import api from '../api';

const suggestions = [
  "Explain JavaScript closures with a practical real-world example.",
  "What is the difference between SQL and NoSQL databases?",
  "How does WebRTC peer-to-peer media streaming actually work?",
  "Give me 3 tips to prepare for a full-stack developer interview."
];

export default function AIPage() {
  const toast = useToast();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am Nexa, your AI learning companion. How can I assist your study today? Ask me any programming or conceptual question!'
    }
  ]);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [history, setHistory] = useState([]);
  const [plan, setPlan] = useState(null);
  const [planBusy, setPlanBusy] = useState(false);
  const [error, setError] = useState('');

  const bottomRef = useRef(null);

  const loadHistory = async () => {
    try {
      const res = await api.get('/ai/conversations');
      setHistory(res.data.conversations || []);
    } catch {
      // Ignore if not loaded yet
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const send = async (textToSend) => {
    const text = (textToSend || prompt).trim();
    if (!text || busy) return;

    setPrompt('');
    setError('');
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setBusy(true);

    try {
      const res = await api.post('/ai/chat', {
        message: text,
        conversationId
      });
      setMessages([...newMessages, { role: 'assistant', content: res.data.answer }]);
      if (res.data.conversationId) setConversationId(res.data.conversationId);
      loadHistory();
    } catch (err) {
      const msg = err.response?.data?.message || 'AI service temporarily unavailable. Check provider API keys.';
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const newChat = () => {
    setConversationId(null);
    setMessages([
      {
        role: 'assistant',
        content: 'Started a fresh session! What topic should we dive into next?'
      }
    ]);
  };

  const openConversation = async (id) => {
    try {
      const res = await api.get(`/ai/conversations/${id}`);
      setConversationId(id);
      setMessages(res.data.conversation.messages || []);
    } catch {
      toast.error('Could not load conversation');
    }
  };

  const deleteConversation = async (e, id) => {
    e.stopPropagation();
    try {
      await api.delete(`/ai/conversations/${id}`);
      if (conversationId === id) newChat();
      loadHistory();
      toast.success('Chat deleted');
    } catch {
      toast.error('Failed to delete chat');
    }
  };

  const generatePlan = async () => {
    setPlanBusy(true);
    try {
      const res = await api.get('/ai/study-plan');
      setPlan(res.data.plan);
      toast.success('Your personalized 7-day plan is ready!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not generate plan right now');
    } finally {
      setPlanBusy(false);
    }
  };

  return (
    <>
      <Heading
        eyebrow="AI ASSISTANT"
        title="Nexa AI Learning Coach"
        sub="A patient, intelligent study partner that clarifies concepts, debugs code, and plans your curriculum."
        action={
          <button onClick={newChat} className="btn-muted flex items-center gap-2">
            <Plus size={16} /> New Session
          </button>
        }
      />

      <div className="grid xl:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Left Column: Chat Area */}
        <div className="panel overflow-hidden flex flex-col h-[600px]">
          {/* Coach Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-violet-100 text-[#6d5dfc] grid place-items-center">
                <Bot size={22} />
              </div>
              <div>
                <div className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  <span>Nexa AI</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    ONLINE
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">Contextual Learning Assistant</div>
              </div>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#fafaff]">
            {messages.map((m, i) => {
              const isUser = m.role === 'user';
              return (
                <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-[#6d5dfc] text-white rounded-br-none shadow-sm'
                        : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none shadow-sm'
                    }`}
                  >
                    <div className={`text-[9px] font-black tracking-wider uppercase mb-1 ${
                      isUser ? 'text-violet-200' : 'text-[#6d5dfc]'
                    }`}>
                      {isUser ? 'You' : 'Nexa AI'}
                    </div>
                    {m.content}
                  </div>
                </div>
              );
            })}

            {busy && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <LoaderCircle size={15} className="animate-spin text-[#6d5dfc]" />
                Nexa is analyzing...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions if few messages */}
          {messages.length <= 2 && (
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Suggested Prompts
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {suggestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => send(q)}
                    className="text-left text-xs bg-white hover:bg-violet-50 hover:text-[#6d5dfc] border border-slate-200 p-2.5 rounded-xl transition truncate"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Bar */}
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-4 border-t border-slate-100 bg-white flex gap-2">
            <input
              className="field text-xs flex-1"
              placeholder="Ask a question about coding, algorithms, or concepts..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={busy}
            />
            <button
              type="submit"
              disabled={!prompt.trim() || busy}
              className="btn-primary px-4 py-2"
            >
              <SendHorizontal size={16} />
            </button>
          </form>
        </div>

        {/* Right Column: 7-Day Study Planner & History */}
        <div className="space-y-4">
          {/* Study Plan Card */}
          <div className="panel p-5">
            <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm mb-2">
              <Target size={18} className="text-[#6d5dfc]" />
              <h3>Personalized Study Plan</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Get an actionable 7-day schedule crafted to match your current course completions.
            </p>
            <button
              onClick={generatePlan}
              disabled={planBusy}
              className="btn-primary w-full py-2 text-xs flex justify-center items-center gap-2"
            >
              {planBusy ? <LoaderCircle size={14} className="animate-spin" /> : <CalendarCheck size={14} />}
              {planBusy ? 'Synthesizing...' : 'Generate 7-Day Plan'}
            </button>

            {plan && (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                <div className="text-xs font-black text-slate-800">{plan.goal}</div>
                <div className="text-[10px] text-slate-500">{plan.dailyMinutes || 30} mins daily commitment</div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {(plan.days || []).map((d, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-violet-50/60 text-xs">
                      <div className="font-bold text-[#6d5dfc]">{d.day}: {d.focus}</div>
                      <ul className="list-disc pl-4 mt-1 text-[11px] text-slate-600 space-y-0.5">
                        {(d.tasks || []).map((t, tidx) => <li key={tidx}>{t}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Past Chats History */}
          <div className="panel p-5">
            <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm mb-3">
              <MessageSquare size={17} className="text-[#6d5dfc]" />
              <h3>Saved Sessions</h3>
            </div>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {history.map((c) => (
                <div
                  key={c._id}
                  onClick={() => openConversation(c._id)}
                  className={`group p-2.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition ${
                    conversationId === c._id ? 'bg-violet-50 text-[#6d5dfc] font-bold' : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className="truncate flex-1 mr-2">{c.title || 'Conversation'}</span>
                  <button
                    onClick={(e) => deleteConversation(e, c._id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              {history.length === 0 && (
                <div className="text-xs text-slate-400 text-center py-4">
                  No saved conversations yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
