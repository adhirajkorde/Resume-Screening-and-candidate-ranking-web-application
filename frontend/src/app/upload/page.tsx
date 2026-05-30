"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api, Resume, JobDescription } from "../../utils/api";
import Logo from "../../components/Logo";

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("ats_token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchJobs();
  }, [router]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchJobs = async () => {
    try {
      const fetchedJobs = await api.getJobs();
      setJobs(fetchedJobs);
      if (fetchedJobs.length > 0) {
        setSelectedJobId(fetchedJobs[0].id);
      }
    } catch (err: any) {
      showToast("Failed to retrieve job descriptions", "error");
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFiles(e.target.files);
    }
  };

  const uploadFiles = async (fileList: FileList) => {
    if (!selectedJobId) {
      showToast("Please select a target job description first.", "error");
      return;
    }
    const formData = new FormData();
    const allowedExtensions = [".pdf", ".docx", ".doc"];
    
    let validFilesCount = 0;
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if (allowedExtensions.includes(ext)) {
        formData.append("resumes", file);
        validFilesCount++;
      }
    }

    if (validFilesCount === 0) {
      showToast("Unsupported format. Please select PDF or DOCX files.", "error");
      return;
    }

    setLoading(true);
    setUploadProgress(`Uploading and parsing ${validFilesCount} resume(s)...`);
    try {
      const response = await api.uploadResumes(formData);
      setResumes((prev) => [...response.resumes, ...prev]);
      
      if (response.errors && response.errors.length > 0) {
        showToast(`Uploaded ${response.resumes.length} files. Some errors occurred.`, "error");
      } else {
        showToast(`Successfully parsed ${response.resumes.length} candidate(s)!`);
        // Trigger background analysis automatically to align scores
        await api.analyzeResumes(selectedJobId);
      }
    } catch (err: any) {
      showToast(err.message || "Upload failed.", "error");
    } finally {
      setLoading(false);
      setUploadProgress("");
    }
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
        <button onClick={() => router.push("/dashboard")} className="text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors">
          Back to Dashboard
        </button>
      </header>

      {/* Main Form */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10 flex flex-col gap-8">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Bulk Resume Uploader</h2>
          <p className="text-slate-400 text-sm mt-1">Select a job description, drop your candidates' resumes, and execute immediate parsing.</p>
        </div>

        {/* Configuration Row */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Target Job Description</label>
            {jobs.length > 0 ? (
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="mt-1.5 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-850 text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-red-400 italic">No job specifications available. Create one in the dashboard first.</p>
            )}
          </div>
          {resumes.length > 0 && (
            <button
              onClick={() => router.push("/results")}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white shadow-lg shadow-indigo-500/15 transition-all"
            >
              Analyze & View Rankings
            </button>
          )}
        </div>

        {/* Drag and Drop */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
            dragActive ? "border-indigo-500 bg-indigo-500/5" : "border-slate-800 bg-slate-950/30 hover:border-slate-700 hover:bg-slate-950/50"
          }`}
        >
          <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.doc" onChange={handleFileChange} className="hidden" />
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="p-4 rounded-full bg-slate-900 text-indigo-400 border border-slate-800">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-base font-bold text-white">Drag & drop files here</p>
              <p className="text-xs text-slate-500 mt-1">Accepts PDF, DOCX, and DOC (Max 10MB)</p>
            </div>
            <button type="button" className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-indigo-400 font-semibold text-xs hover:bg-slate-800 transition-all mt-2">
              Select Resumes
            </button>
          </div>
        </div>

        {/* Upload Status Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="text-sm font-bold text-slate-200">{uploadProgress}</p>
          </div>
        )}

        {/* Uploaded resumes preview */}
        {resumes.length > 0 && (
          <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/20">
              <h3 className="font-extrabold text-white text-sm">Parsed Candidate Batch</h3>
            </div>
            <div className="divide-y divide-slate-850">
              {resumes.map((resume, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-900/10 transition-colors">
                  <div>
                    <p className="text-sm font-bold text-white">{resume.candidateName || resume.filename}</p>
                    <p className="text-xs text-slate-400">{resume.candidateEmail || "No email parsed"}</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20 font-semibold">Parsed</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
