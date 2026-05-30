"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, CandidateScore, JobDescription } from "../../utils/api";
import Logo from "../../components/Logo";

export default function ResultsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [rankings, setRankings] = useState<CandidateScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("ats_token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchBaseData();
  }, [router]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchBaseData = async () => {
    setLoading(true);
    try {
      const fetchedJobs = await api.getJobs();
      setJobs(fetchedJobs);
      if (fetchedJobs.length > 0) {
        setSelectedJobId(fetchedJobs[0].id);
        const fetchedRankings = await api.getRankings(fetchedJobs[0].id);
        setRankings(fetchedRankings);
      }
    } catch (err: any) {
      showToast("Failed to retrieve matching reports.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleJobSelectChange = async (jobId: string) => {
    setSelectedJobId(jobId);
    if (!jobId) {
      setRankings([]);
      return;
    }
    setLoading(true);
    try {
      const fetchedRankings = await api.getRankings(jobId);
      setRankings(fetchedRankings);
    } catch (err: any) {
      setRankings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!selectedJobId) return;
    window.open(api.getExportUrl(selectedJobId), "_blank");
    showToast("Successfully downloaded candidate CSV matching matrix!");
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 flex flex-col relative selection:bg-indigo-500/30 selection:text-white">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-xl border animate-slide-in ${
          toast.type === "success" ? "bg-slate-900 border-emerald-500/30 text-emerald-400" : "bg-slate-900 border-red-500/30 text-red-400"
        }`}>
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="w-full border-b border-slate-900 bg-slate-950/30 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo className="h-8 w-auto" showTagline={false} />
        </div>
        <div className="flex gap-4">
          <button onClick={() => router.push("/upload")} className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
            Upload More Resumes
          </button>
          <button onClick={() => router.push("/dashboard")} className="text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors">
            Back to Dashboard
          </button>
        </div>
      </header>

      {/* Main Panel */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10 flex flex-col gap-8">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-white">Screening Results & Leaderboards</h2>
            <p className="text-slate-400 text-sm mt-1">Review candidates ranked deterministically by parsed skills, experience, and keywords.</p>
          </div>
          {jobs.length > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Target Job:</span>
              <select
                value={selectedJobId}
                onChange={(e) => handleJobSelectChange(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Global Loading overlay */}
        {loading && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="text-sm font-bold text-slate-200">Retrieving math matrices...</p>
          </div>
        )}

        {/* Leaderboard Grid */}
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/20">
            <h3 className="font-extrabold text-white text-base">Hiring Pipeline Matching Leaders</h3>
            {rankings.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-indigo-400 font-bold hover:bg-slate-800 transition-all text-xs flex items-center justify-center gap-2"
              >
                Download CSV Export
              </button>
            )}
          </div>

          {rankings.length === 0 ? (
            <div className="p-12 text-center text-slate-500 italic">
              No candidates parsed or scored for this job description. Head over to /upload to import resumes first!
            </div>
          ) : (
            <div className="divide-y divide-slate-850">
              {rankings.map((candidate, idx) => (
                <div key={candidate.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:bg-slate-900/10 transition-colors">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="h-6 w-6 rounded-full bg-slate-900 text-slate-400 text-xs font-bold border border-slate-800 flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <h4 className="font-bold text-white text-base truncate">{candidate.resume.candidateName || "Parsing Error (Name)"}</h4>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-slate-400">
                      <span>Email: {candidate.resume.candidateEmail || "No Email"}</span>
                      <span>Phone: {candidate.resume.candidatePhone || "No Phone"}</span>
                      <span>Exp: {candidate.resume.candidateExperience || "No Exp Details"}</span>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-1">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Matching Skills:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {candidate.matchingSkills.length > 0 ? (
                            candidate.matchingSkills.map((skill, sIdx) => (
                              <span key={sIdx} className="text-[9px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span className="text-[9px] text-slate-600 italic">None</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Missing Skills:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {candidate.missingSkills.length > 0 ? (
                            candidate.missingSkills.map((skill, sIdx) => (
                              <span key={sIdx} className="text-[9px] font-semibold bg-red-500/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded">
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span className="text-[9px] text-slate-600 italic">None</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 self-end md:self-center">
                    <div className="text-right">
                      <span className={`text-xl font-black ${candidate.score >= 80 ? "text-emerald-400" : candidate.score >= 50 ? "text-indigo-400" : "text-slate-400"}`}>
                        {candidate.score}%
                      </span>
                      <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider">Match Index</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
