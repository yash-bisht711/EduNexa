import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  ClipboardCheck, Clock, Award, CheckCircle2, XCircle,
  RotateCcw, Sparkles, Plus, AlertCircle, HelpCircle
} from 'lucide-react';
import { useLoad, Heading, Empty } from '../components/shared';
import { useToast } from '../components/Toast';
import api from '../api';

export default function QuizPage() {
  const user = useSelector((s) => s.auth.user);
  const isStaff = ['instructor', 'admin'].includes(user?.role);
  const toast = useToast();

  const { data, loading, reload } = useLoad('/me/quizzes', { quizzes: [] });
  const { data: coursesData } = useLoad('/courses', { courses: [] });

  const quizzes = data.quizzes || [];
  const courses = coursesData.courses || [];

  // Quiz active state
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // New Quiz state (staff)
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCourseId, setNewCourseId] = useState('');
  const [newQuestions, setNewQuestions] = useState([
    { prompt: '', options: ['', '', '', ''], correctIndex: 0, explanation: '', points: 1 }
  ]);
  const [creating, setCreating] = useState(false);

  const startQuiz = async (quizId) => {
    try {
      const res = await api.get(`/me/quizzes/${quizId}`);
      setActiveQuiz(res.data.quiz);
      setAnswers({});
      setResult(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load quiz details');
    }
  };

  const handleSelectOption = (qIdx, optIdx) => {
    if (result) return; // locked after submission
    setAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleSubmit = async () => {
    if (!activeQuiz) return;
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < activeQuiz.questions.length) {
      if (!confirm(`You have only answered ${answeredCount} of ${activeQuiz.questions.length} questions. Submit anyway?`)) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const answersArr = activeQuiz.questions.map((_, i) => answers[i] ?? -1);
      const res = await api.post(`/me/quizzes/${activeQuiz._id}/submit`, { answers: answersArr });
      setResult(res.data);
      if (res.data.attempt?.percentage >= 70) {
        toast.success(`Passed! You scored ${res.data.attempt.score}/${res.data.attempt.total} (${res.data.attempt.percentage}%)`);
      } else {
        toast.info(`You scored ${res.data.attempt.score}/${res.data.attempt.total} (${res.data.attempt.percentage}%). Review and try again!`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    if (!newCourseId) {
      toast.error('Please select a course for this quiz');
      return;
    }
    setCreating(true);
    try {
      await api.post('/me/quizzes', {
        course: newCourseId,
        title: newTitle,
        questions: newQuestions
      });
      toast.success('Quiz created successfully!');
      setShowCreate(false);
      setNewTitle('');
      setNewQuestions([{ prompt: '', options: ['', '', '', ''], correctIndex: 0, explanation: '', points: 1 }]);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create quiz');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Heading
        eyebrow="EVALUATION"
        title="Quizzes & Knowledge Checks"
        sub="Test your knowledge with auto-graded quizzes and detailed explanations."
        action={
          isStaff && (
            <button
              onClick={() => setShowCreate(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} /> Create Quiz
            </button>
          )
        }
      />

      {/* Active Quiz View */}
      {activeQuiz ? (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="panel p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <span className="text-xs font-bold text-[#6d5dfc] uppercase tracking-wider">Assessment</span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">{activeQuiz.title}</h2>
                <div className="text-xs text-slate-400 mt-1">
                  {activeQuiz.questions.length} questions • 1-2 points each
                </div>
              </div>
              <button
                onClick={() => { setActiveQuiz(null); setResult(null); }}
                className="text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl font-bold transition"
              >
                Back to List
              </button>
            </div>

            {/* Result Banner if submitted */}
            {result && (
              <div className={`p-5 rounded-2xl mb-6 flex items-center gap-4 ${
                result.attempt.percentage >= 70 ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200'
              }`}>
                <div className={`w-12 h-12 rounded-xl grid place-items-center text-white shrink-0 ${
                  result.attempt.percentage >= 70 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}>
                  <Award size={24} />
                </div>
                <div className="flex-1">
                  <div className="font-black text-lg">
                    {result.attempt.percentage >= 70 ? 'Great job! You passed!' : 'Keep practicing!'}
                  </div>
                  <div className="text-sm opacity-90">
                    Final Score: {result.attempt.score} / {result.attempt.total} points ({result.attempt.percentage}%)
                  </div>
                </div>
                <button
                  onClick={() => { setAnswers({}); setResult(null); }}
                  className="px-4 py-2 bg-white rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 border border-slate-200 flex items-center gap-1.5 shadow-sm"
                >
                  <RotateCcw size={14} /> Retry
                </button>
              </div>
            )}

            {/* Questions List */}
            <div className="space-y-6">
              {activeQuiz.questions.map((q, qIdx) => {
                const userAns = answers[qIdx];
                const resItem = result?.results?.[qIdx];
                const isCorrect = resItem?.correct;

                return (
                  <div key={qIdx} className="p-5 rounded-2xl border border-slate-100 bg-[#fafaff]">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="font-extrabold text-sm text-slate-800 flex gap-2">
                        <span className="text-[#6d5dfc]">Q{qIdx + 1}.</span>
                        <span>{q.prompt}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 shrink-0">
                        {q.points || 1} pt
                      </span>
                    </div>

                    <div className="space-y-2 mt-3">
                      {q.options.map((opt, optIdx) => {
                        const selected = userAns === optIdx;
                        let optStyle = 'border-slate-200 bg-white hover:border-violet-300';

                        if (result) {
                          if (resItem?.correctIndex === optIdx) {
                            optStyle = 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold';
                          } else if (selected && !isCorrect) {
                            optStyle = 'border-rose-400 bg-rose-50 text-rose-800';
                          } else {
                            optStyle = 'border-slate-100 opacity-60';
                          }
                        } else if (selected) {
                          optStyle = 'border-[#6d5dfc] bg-violet-50 text-[#6d5dfc] font-bold';
                        }

                        return (
                          <div
                            key={optIdx}
                            onClick={() => handleSelectOption(qIdx, optIdx)}
                            className={`p-3.5 rounded-xl border text-xs flex items-center gap-3 transition cursor-pointer ${optStyle}`}
                          >
                            <span className="w-5 h-5 rounded-full border border-current grid place-items-center text-[10px] shrink-0 font-bold">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="flex-1">{opt}</span>
                            {result && resItem?.correctIndex === optIdx && (
                              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            )}
                            {result && selected && !isCorrect && (
                              <XCircle size={16} className="text-rose-500 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation after submission */}
                    {result && resItem?.explanation && (
                      <div className="mt-3 p-3 rounded-xl bg-violet-50 text-slate-700 text-xs border border-violet-100 flex items-start gap-2">
                        <HelpCircle size={16} className="text-[#6d5dfc] shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-[#6d5dfc]">Explanation:</strong> {resItem.explanation}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Submit Action */}
            {!result && (
              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {Object.keys(answers).length} of {activeQuiz.questions.length} answered
                </span>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-primary py-2.5 px-6 flex items-center gap-2"
                >
                  <ClipboardCheck size={18} />
                  {submitting ? 'Grading...' : 'Submit Answers'}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Quizzes Directory */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {quizzes.map((quiz) => (
            <div key={quiz._id} className="panel p-5 flex flex-col justify-between hover:shadow-soft transition">
              <div>
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-[#6d5dfc] grid place-items-center mb-3">
                  <ClipboardCheck size={20} />
                </div>
                <h3 className="font-extrabold text-base text-slate-800 leading-snug">{quiz.title}</h3>
                <p className="text-xs text-slate-400 mt-2">
                  {quiz.questions?.length || 0} Auto-graded questions
                </p>
              </div>
              <button
                onClick={() => startQuiz(quiz._id)}
                className="btn-primary w-full mt-5 py-2 text-xs flex justify-center items-center gap-1.5"
              >
                Take Quiz
              </button>
            </div>
          ))}

          {quizzes.length === 0 && !loading && (
            <div className="col-span-full">
              <Empty
                icon={ClipboardCheck}
                title="No quizzes available"
                text="Quizzes for your courses will appear here once published."
              />
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Quiz for Instructors */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-xl font-extrabold text-slate-900 mb-4">Create New Quiz</h3>
            <form onSubmit={handleCreateQuiz} className="space-y-4">
              <label className="block text-xs font-bold text-slate-700">
                Course
                <select
                  className="field mt-1.5 text-xs"
                  value={newCourseId}
                  onChange={(e) => setNewCourseId(e.target.value)}
                  required
                >
                  <option value="">Select course...</option>
                  {courses.map(c => (
                    <option key={c._id} value={c._id}>{c.title}</option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-bold text-slate-700">
                Quiz Title
                <input
                  className="field mt-1.5 text-xs"
                  placeholder="e.g. Chapter 1 Knowledge Assessment"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </label>

              {/* Questions Builder */}
              <div className="space-y-4 pt-2">
                <div className="text-xs font-extrabold text-slate-700">Questions ({newQuestions.length})</div>
                {newQuestions.map((q, qIdx) => (
                  <div key={qIdx} className="p-4 rounded-xl border border-slate-200 space-y-3 bg-slate-50">
                    <input
                      className="field text-xs bg-white"
                      placeholder={`Question ${qIdx + 1} Prompt`}
                      value={q.prompt}
                      onChange={(e) => {
                        const copy = [...newQuestions];
                        copy[qIdx].prompt = e.target.value;
                        setNewQuestions(copy);
                      }}
                      required
                    />
                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name={`correct-${qIdx}`}
                            checked={q.correctIndex === optIdx}
                            onChange={() => {
                              const copy = [...newQuestions];
                              copy[qIdx].correctIndex = optIdx;
                              setNewQuestions(copy);
                            }}
                          />
                          <input
                            className="field text-xs bg-white"
                            placeholder={`Option ${optIdx + 1}`}
                            value={opt}
                            onChange={(e) => {
                              const copy = [...newQuestions];
                              copy[qIdx].options[optIdx] = e.target.value;
                              setNewQuestions(copy);
                            }}
                            required
                          />
                        </div>
                      ))}
                    </div>
                    <input
                      className="field text-xs bg-white"
                      placeholder="Explanation for the correct answer"
                      value={q.explanation}
                      onChange={(e) => {
                        const copy = [...newQuestions];
                        copy[qIdx].explanation = e.target.value;
                        setNewQuestions(copy);
                      }}
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setNewQuestions([
                    ...newQuestions,
                    { prompt: '', options: ['', '', '', ''], correctIndex: 0, explanation: '', points: 1 }
                  ])}
                  className="btn-muted text-xs w-full py-2"
                >
                  + Add Question
                </button>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="btn-muted flex-1 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary flex-1 py-2 text-xs"
                >
                  {creating ? 'Saving...' : 'Publish Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
