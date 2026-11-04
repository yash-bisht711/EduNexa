import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award, Download, CheckCircle2, Lock, ArrowRight,
  Sparkles, ExternalLink, ShieldCheck
} from 'lucide-react';
import { useLoad, Heading, Empty } from '../components/shared';
import { useToast } from '../components/Toast';
import api from '../api';

export default function CertificatesPage() {
  const toast = useToast();
  const { data, loading } = useLoad('/me/enrollments', { enrollments: [] });
  const enrollments = data.enrollments || [];

  const [downloadingId, setDownloadingId] = useState(null);

  const completed = enrollments.filter(e => e.progress === 100);
  const inProgress = enrollments.filter(e => e.progress < 100);

  const handleDownload = async (course) => {
    setDownloadingId(course._id);
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
      toast.error(err.response?.data?.message || 'Could not download certificate');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <>
      <Heading
        eyebrow="ACADEMIC CREDENTIALS"
        title="Certificates & Accreditations"
        sub="Earn verified, downloadable PDF credentials upon 100% completion of any course syllabus."
      />

      {/* Earned Certificates */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Award size={18} className="text-[#6d5dfc]" />
          <h2 className="font-extrabold text-base text-slate-800">
            Earned Certificates ({completed.length})
          </h2>
        </div>

        {completed.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-5">
            {completed.map((e) => {
              const c = e.course;
              if (!c) return null;
              return (
                <div
                  key={e._id}
                  className="panel p-6 border-2 border-violet-100 bg-gradient-to-br from-white to-violet-50/30 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 flex items-center gap-1.5">
                        <ShieldCheck size={13} /> Verified
                      </span>
                      <span className="text-xs text-slate-400">
                        {e.completedAt ? new Date(e.completedAt).toLocaleDateString() : 'Issued'}
                      </span>
                    </div>

                    <h3 className="font-black text-lg text-slate-900 leading-snug">{c.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Certified by EduNexa Academy & {c.instructor?.name || 'Instructor'}
                    </p>

                    <div className="mt-4 p-3 rounded-xl bg-white border border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>Verification ID:</span>
                      <span className="font-mono text-[10px] text-slate-700 font-bold">
                        ENX-{c._id?.slice(-6)}-{e.student?.slice ? e.student.slice(-4) : 'PASS'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-3">
                    <button
                      onClick={() => handleDownload(c)}
                      disabled={downloadingId === c._id}
                      className="btn-primary flex-1 py-2.5 text-xs flex justify-center items-center gap-2"
                    >
                      <Download size={15} />
                      {downloadingId === c._id ? 'Generating PDF...' : 'Download PDF Certificate'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="panel p-8 text-center text-xs text-slate-400">
            You haven't completed a course yet. Complete 100% of all lessons in any course to unlock your official certificate.
          </div>
        )}
      </div>

      {/* In-Progress Progress */}
      {inProgress.length > 0 && (
        <div>
          <h2 className="font-extrabold text-base text-slate-800 mb-4">
            In-Progress Toward Certificate ({inProgress.length})
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {inProgress.map((e) => {
              const c = e.course;
              if (!c) return null;
              return (
                <div key={e._id} className="panel p-5 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-slate-800 truncate">{c.title}</h4>
                    <div className="text-xs text-slate-400 mt-1">
                      {e.progress}% completed • {(c.lessons?.length || 0) - (e.completedLessons?.length || 0)} lessons remaining
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div
                        className="bg-[#6d5dfc] h-full rounded-full"
                        style={{ width: `${e.progress}%` }}
                      />
                    </div>
                  </div>
                  <Link
                    to={`/learning?course=${c._id}`}
                    className="p-2.5 bg-violet-50 text-[#6d5dfc] rounded-xl hover:bg-violet-100 transition shrink-0"
                  >
                    <ArrowRight size={16} />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
