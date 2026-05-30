"use strict";
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api, User, Resume, JobDescription, CandidateScore } from "../../utils/api";
import Logo from "../../components/Logo";

export default function DashboardPage() {
  const router = useRouter();

  // Session state
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Nav state
  const [activeTab, setActiveTab] = useState<"overview" | "jobs" | "resumes" | "analyze">("overview");

  // Core Data states
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [rankings, setRankings] = useState<CandidateScore[]>([]);

  // UI status states
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [toasts, setToasts] = useState<{ id: number; message: string; type: "success" | "error" }[]>([]);
  const [activePreviewCandidate, setActivePreviewCandidate] = useState<CandidateScore | null>(null);
  const [activeResumeDetail, setActiveResumeDetail] = useState<Resume | null>(null);
  const [previewTab, setPreviewTab] = useState<"metrics" | "text">("metrics");

  // Filter states for candidate list
  const [searchQuery, setSearchQuery] = useState("");
  const [minScoreFilter, setMinScoreFilter] = useState(0);

  // Drag and Drop Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // Job description creation form state
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newJobDesc, setNewJobDesc] = useState("");
  const [newJobSkills, setNewJobSkills] = useState("");
  const [newJobExp, setNewJobExp] = useState("");
  const [newJobEdu, setNewJobEdu] = useState("");

  // Delete Account States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Mobile responsive sidebar drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await api.deleteAccount();
      localStorage.removeItem("ats_token");
      localStorage.removeItem("ats_user");
      router.push("/");
    } catch (err: any) {
      showToast(err.message || "Failed to permanently delete your account.", "error");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Retrieve session and load default data on mount
  useEffect(() => {
    const userStr = localStorage.getItem("ats_user");
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        // Safe bypass
      }
    }
    fetchBaseData();
  }, []);

  // Show toast notification helper
  const showToast = (message: string, type: "success" | "error" = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Retrieve Base data (Resumes & Jobs)
  const fetchBaseData = async () => {
    setLoading(true);
    try {
      const fetchedResumes = await api.getResumes();
      const fetchedJobs = await api.getJobs();
      
      setResumes(fetchedResumes);
      setJobs(fetchedJobs);

      if (fetchedJobs.length > 0) {
        setSelectedJobId(fetchedJobs[0].id);
        // Pre-fetch rankings for the first job description
        const fetchedRankings = await api.getRankings(fetchedJobs[0].id);
        setRankings(fetchedRankings);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load dashboard parameters.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Perform Score Analysis
  const handleRunAnalysis = async () => {
    if (!selectedJobId) {
      showToast("Please create or select a Job Description first.", "error");
      return;
    }
    if (resumes.length === 0) {
      showToast("Please upload candidate resumes to screen.", "error");
      return;
    }

    setLoading(true);
    try {
      showToast("Initiating resume parser and score comparison engine...");
      const response = await api.analyzeResumes(selectedJobId);
      setRankings(response.rankings);
      showToast(`Successfully analyzed and ranked ${response.rankings.length} candidates!`);
    } catch (err: any) {
      showToast(err.message || "Scoring engine failure.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch rankings for a specific job when dropdown changes
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

  // Export CSV
  const handleExportCSV = () => {
    if (!selectedJobId) return;
    window.open(api.getExportUrl(selectedJobId), "_blank");
    showToast("CSV candidate database export successfully initiated!");
  };

  // Create Job Description
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobTitle.trim() || !newJobDesc.trim()) {
      showToast("Job Title and Job Description details are required.", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await api.createJob({
        title: newJobTitle,
        description: newJobDesc,
        skills: newJobSkills,
        minExperience: newJobExp ? parseInt(newJobExp, 10) : null,
        education: newJobEdu
      });

      setJobs((prev) => [response.jobDescription, ...prev]);
      setSelectedJobId(response.jobDescription.id);
      
      // Clear form
      setNewJobTitle("");
      setNewJobDesc("");
      setNewJobSkills("");
      setNewJobExp("");
      setNewJobEdu("");
      
      showToast("Job description uploaded successfully!");
      setActiveTab("overview");
      // Fetch fresh rankings
      const fetchedRankings = await api.getRankings(response.jobDescription.id);
      setRankings(fetchedRankings);
    } catch (err: any) {
      showToast(err.message || "Failed to create Job Description.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Delete Job
  const handleDeleteJob = async (id: string) => {
    if (!confirm("Are you sure you want to delete this job description? It will delete all matched scores too.")) return;
    setLoading(true);
    try {
      await api.deleteJob(id);
      setJobs((prev) => prev.filter((j) => j.id !== id));
      if (selectedJobId === id) {
        setSelectedJobId("");
        setRankings([]);
      }
      showToast("Job description deleted.");
    } catch (err: any) {
      showToast("Failed to delete job description.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Delete Resume
  const handleDeleteResume = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resume?")) return;
    setLoading(true);
    try {
      await api.deleteResume(id);
      setResumes((prev) => prev.filter((r) => r.id !== id));
      // Re-filter rankings
      setRankings((prev) => prev.filter((rank) => rank.resumeId !== id));
      showToast("Candidate resume deleted.");
    } catch (err: any) {
      showToast("Failed to delete resume.", "error");
    } finally {
      setLoading(false);
    }
  };

  // File Upload Handlers
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
      showToast("Unsupported file types. Please select PDF, DOCX, or DOC formats.", "error");
      return;
    }

    setLoading(true);
    setUploadProgress(`Uploading and parsing ${validFilesCount} resumes...`);
    try {
      const response = await api.uploadResumes(formData);
      
      // Update local state
      setResumes((prev) => [...response.resumes, ...prev]);
      
      if (response.errors && response.errors.length > 0) {
        showToast(`Uploaded ${response.resumes.length} resumes. ${response.errors.length} failed.`, "error");
      } else {
        showToast(`Successfully uploaded and parsed ${response.resumes.length} resume(s)!`);
      }

      // If selectedJobId exists, auto run analysis to show instant scores!
      if (selectedJobId) {
        // Auto trigger scoring for a seamless experience
        const res = await api.analyzeResumes(selectedJobId);
        setRankings(res.rankings);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to upload files.", "error");
    } finally {
      setLoading(false);
      setUploadProgress("");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("ats_token");
    localStorage.removeItem("ats_user");
    router.push("/login");
  };

  // Filter rankings list based on search query and minimum score slider
  const filteredRankings = rankings.filter((rank) => {
    const name = rank.resume.candidateName || "";
    const email = rank.resume.candidateEmail || "";
    const skills = (rank.resume.candidateSkills || []).join(" ");
    const matchesSearch = 
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skills.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesScore = rank.score >= minScoreFilter;
    
    return matchesSearch && matchesScore;
  });

  // Aggregate stats
  const totalResumes = resumes.length;
  const totalJobs = jobs.length;
  const bestScore = rankings.length > 0 ? Math.max(...rankings.map(r => r.score)) : 0;
  const avgScore = rankings.length > 0 
    ? Math.round(rankings.reduce((sum, r) => sum + r.score, 0) / rankings.length) 
    : 0;

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-screen relative overflow-hidden">
      
      {/* Toast Notification Container */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl shadow-xl flex items-center gap-3 border pointer-events-auto transition-all duration-300 animate-slide-in ${
              toast.type === "success"
                ? "bg-slate-900 border-emerald-500/30 text-emerald-400"
                : "bg-slate-900 border-red-500/30 text-red-400"
            }`}
          >
            {toast.type === "success" ? (
              <svg className="w-5 h-5 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            <span className="text-sm font-semibold">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Mobile Sticky Top Header */}
      <header className="md:hidden w-full bg-[#0a0d16] border-b border-slate-800 px-5 py-4 flex items-center justify-between z-20 sticky top-0">
        <div className="flex items-center gap-2.5">
          <Logo className="h-8 w-auto" showTagline={false} />
        </div>
        <button
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="p-2 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white transition-all cursor-pointer flex items-center justify-center"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isMobileSidebarOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      {/* Backdrop for Mobile Sidebar Drawer */}
      {isMobileSidebarOpen && (
        <div 
          onClick={() => setIsMobileSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 transition-all duration-300"
        />
      )}

      {/* Sidebar navigation */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#0a0d16] border-r border-slate-800 flex flex-col justify-between p-6 shrink-0 transition-transform duration-300 transform md:translate-x-0 md:static ${
        isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div>
          {/* Brand */}
          <div className="flex items-center gap-3 mb-8 mt-2 px-2">
            <Logo className="h-11 w-auto" />
          </div>

          {/* User profile widget */}
          {currentUser && (
            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 mb-6">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-sm shrink-0 shadow-inner">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-200 truncate leading-tight">{currentUser.name}</p>
                <p className="text-[10px] text-slate-500 truncate mt-0.5 leading-none">{currentUser.email}</p>
              </div>
            </div>
          )}

          {/* Category title */}
          <div className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase mb-3 px-2">
            Recruiter Workspace
          </div>

          {/* Tabs Nav */}
          <nav className="space-y-1">
            <button
              onClick={() => {
                setActiveTab("overview");
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-start text-left gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                activeTab === "overview"
                  ? "bg-gradient-to-r from-indigo-600/90 to-indigo-700/90 text-white shadow-lg shadow-indigo-500/15"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
              }`}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
              </svg>
              Overview
            </button>

            <button
              onClick={() => {
                setActiveTab("resumes");
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-start text-left gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                activeTab === "resumes"
                  ? "bg-gradient-to-r from-indigo-600/90 to-indigo-700/90 text-white shadow-lg shadow-indigo-500/15"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
              }`}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Candidates & Resumes
            </button>

            <button
              onClick={() => {
                setActiveTab("jobs");
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-start text-left gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                activeTab === "jobs"
                  ? "bg-gradient-to-r from-indigo-600/90 to-indigo-700/90 text-white shadow-lg shadow-indigo-500/15"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
              }`}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Job Descriptions
            </button>

            <button
              onClick={() => {
                setActiveTab("analyze");
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-start text-left gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                activeTab === "analyze"
                  ? "bg-gradient-to-r from-indigo-600/90 to-indigo-700/90 text-white shadow-lg shadow-indigo-500/15"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
              }`}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
              Screening & Rankings
            </button>
          </nav>
        </div>

        <div>
          {/* Operations Title */}
          <div className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase mb-3 px-2">
            Operations
          </div>

          <div className="space-y-1">
            {/* Log out action */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-start text-left gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-900/20 transition-all duration-200 whitespace-nowrap cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>

            {/* Delete Account action */}
            <button
              onClick={() => {
                setShowDeleteModal(true);
                setIsMobileSidebarOpen(false);
              }}
              className="w-full flex items-center justify-start text-left gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:text-red-500 hover:bg-red-950/15 border border-transparent hover:border-red-900/20 transition-all duration-200 whitespace-nowrap cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Account
            </button>
          </div>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="flex-1 flex flex-col overflow-y-auto px-6 py-8 md:px-10 z-10">
        
        {/* Upper Header status banner */}
        <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-white">
              {activeTab === "overview" && "Dashboard Overview"}
              {activeTab === "resumes" && "Candidates & Upload Portal"}
              {activeTab === "jobs" && "Job Specifications Manager"}
              {activeTab === "analyze" && "Score Matching & Leaderboard"}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {activeTab === "overview" && "Visual analytical breakdown of current pipeline stats"}
              {activeTab === "resumes" && "Add single/multiple resume files and check parsed profiles"}
              {activeTab === "jobs" && "Paste job profiles or requirements to compare against"}
              {activeTab === "analyze" && "Check technical fit and rank profiles mathematically"}
            </p>
          </div>
          
          {/* Active Job Quick Selection */}
          {activeTab === "analyze" && jobs.length > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide py-1">Active Job Description:</span>
              <select
                value={selectedJobId}
                onChange={(e) => handleJobSelectChange(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </header>

        {/* Global Loading overlay */}
        {loading && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
            <div className="spin-slow inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-2xl font-bold shadow-lg shadow-indigo-500/20">
              S
            </div>
            <p className="text-sm font-bold text-slate-200 tracking-wider">
              {uploadProgress || "Accessing database calculations..."}
            </p>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Grid of Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="glass-card p-6 rounded-2xl border border-slate-800 glow-indigo">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-slate-400 uppercase">Screened Resumes</span>
                  <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </span>
                </div>
                <h3 className="text-3xl font-black text-white">{totalResumes}</h3>
                <p className="text-xs text-slate-500 mt-2 font-medium">Uploaded profiles on disk</p>
              </div>

              <div className="glass-card p-6 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-slate-400 uppercase">Job Requirements</span>
                  <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </span>
                </div>
                <h3 className="text-3xl font-black text-white">{totalJobs}</h3>
                <p className="text-xs text-slate-500 mt-2 font-medium">Target job scopes defined</p>
              </div>

              <div className="glass-card p-6 rounded-2xl border border-slate-800 glow-emerald">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-slate-400 uppercase">Best Candidate Match</span>
                  <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </span>
                </div>
                <h3 className="text-3xl font-black text-white">{bestScore}%</h3>
                <p className="text-xs text-slate-500 mt-2 font-medium">Highest alignment score calculated</p>
              </div>

              <div className="glass-card p-6 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-slate-400 uppercase">Average Pipeline Score</span>
                  <span className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </span>
                </div>
                <h3 className="text-3xl font-black text-white">{avgScore}%</h3>
                <p className="text-xs text-slate-500 mt-2 font-medium">Total average matching rating</p>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <h4 className="text-lg font-bold text-white mb-2">Recruiter Resume Screening & Ranking</h4>
                  <p className="text-slate-400 text-sm leading-relaxed mb-6">
                    Our local parsing engine analyzes raw resumes (PDF/DOCX) using advanced lexical match indices, years of experience metrics, education hierarchies, and keyword overlaps. Select a job description under <span className="font-semibold text-indigo-400">Screening & Rankings</span>, drag your candidates' files in, and discover the best fit profiles sorted instantly.
                  </p>
                </div>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => setActiveTab("resumes")}
                    className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white shadow-lg shadow-indigo-500/15 transition-all"
                  >
                    Upload Resumes
                  </button>
                  <button
                    onClick={() => setActiveTab("jobs")}
                    className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-slate-300 border border-slate-700 transition-all"
                  >
                    Manage Job Descriptions
                  </button>
                </div>
              </div>

              {/* Quick stats on active job */}
              <div className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-extrabold uppercase text-slate-400 tracking-wider mb-4">Pipeline Status</h4>
                  {jobs.length > 0 ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-500">Currently Screening Against:</p>
                        <p className="text-base font-bold text-white mt-1 leading-snug">{jobs.find(j => j.id === selectedJobId)?.title || jobs[0].title}</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div>
                          <p className="text-2xl font-black text-indigo-400">{rankings.length}</p>
                          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wide">Candidates</p>
                        </div>
                        <div className="h-8 w-px bg-slate-800"></div>
                        <div>
                          <p className="text-2xl font-black text-emerald-400">{rankings.filter(r => r.score >= 80).length}</p>
                          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wide">Strong Matches</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm italic">No Job Description created. Please define a job description under "Job Descriptions" to initiate screening.</p>
                  )}
                </div>
                {jobs.length > 0 && (
                  <button
                    onClick={() => setActiveTab("analyze")}
                    className="w-full mt-6 py-3 rounded-xl bg-slate-900 border border-slate-800 text-indigo-400 font-bold hover:bg-slate-800/80 transition-all text-sm flex items-center justify-center gap-2"
                  >
                    View Rankings Leaderboard
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CANDIDATES & RESUMES UPLOAD PORTAL */}
        {activeTab === "resumes" && (
          <div className="space-y-8">
            {/* Drag & Drop Upload Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                dragActive
                  ? "border-indigo-500 bg-indigo-500/5 shadow-inner"
                  : "border-slate-800 bg-slate-950/30 hover:border-slate-700 hover:bg-slate-950/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.doc"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="p-4 rounded-full bg-slate-900 text-indigo-400 border border-slate-800">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-base font-bold text-white">Drag and drop resumes here</p>
                  <p className="text-xs text-slate-500 mt-1">Accepts PDF, DOCX, and DOC (Max 10MB per file)</p>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-indigo-400 font-semibold text-xs hover:bg-slate-800 transition-all mt-2"
                >
                  Select File(s)
                </button>
              </div>
            </div>

            {/* Resume Database Grid */}
            <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
                <h3 className="font-extrabold text-white text-base">Candidate Database ({totalResumes} profiles)</h3>
                <span className="text-xs text-slate-500 font-medium">Automatic text parsing executes upon upload</span>
              </div>

              {resumes.length === 0 ? (
                <div className="p-12 text-center text-slate-500 italic">
                  No candidate resumes uploaded yet. Drag and drop file folders above to parse profiles!
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60 max-h-[500px] overflow-y-auto">
                  {resumes.map((resume) => (
                    <div key={resume.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:bg-slate-900/20 transition-all">
                      <div className="space-y-2 min-w-0">
                        <div className="flex items-center gap-3">
                          <h4 className="font-bold text-white text-base truncate">{resume.candidateName || "Parsing Error (Name)"}</h4>
                          <span className="text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                            {resume.fileType}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-slate-400">
                          <span className="flex items-center gap-1.5 truncate">
                            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L22 8m-2 11H4a2 2 0 01-2-2V7a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2z" />
                            </svg>
                            {resume.candidateEmail || "No Email"}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {resume.candidatePhone || "No Phone"}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {resume.candidateExperience || "No Experience info"}
                          </span>
                        </div>
                        {resume.candidateSkills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {resume.candidateSkills.slice(0, 7).map((skill, sIdx) => (
                              <span key={sIdx} className="text-[10px] font-semibold bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-md">
                                {skill}
                              </span>
                            ))}
                            {resume.candidateSkills.length > 7 && (
                              <span className="text-[9px] font-bold bg-slate-900 text-indigo-400 px-1.5 py-0.5 rounded-md">
                                +{resume.candidateSkills.length - 7} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={() => {
                            setActiveResumeDetail(resume);
                            setPreviewTab("text");
                          }}
                          className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl transition-all"
                        >
                          View Extracted Data
                        </button>
                        <button
                          onClick={() => handleDeleteResume(resume.id)}
                          className="p-2 text-slate-500 hover:text-red-400 bg-red-950/10 hover:bg-red-950/20 border border-transparent hover:border-red-500/20 rounded-xl transition-all"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: JOB DESCRIPTIONS MANAGER */}
        {activeTab === "jobs" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Create Job Form */}
            <div className="lg:col-span-1">
              <div className="glass-card p-6 rounded-2xl border border-slate-800">
                <h3 className="font-extrabold text-white text-base mb-6">Create Job Specification</h3>
                <form onSubmit={handleCreateJob} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Job Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Senior Backend Architect"
                      value={newJobTitle}
                      onChange={(e) => setNewJobTitle(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Target Skills (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. Node.js, Express, AWS, SQL"
                      value={newJobSkills}
                      onChange={(e) => setNewJobSkills(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Min Experience (Yrs)</label>
                      <input
                        type="number"
                        placeholder="e.g. 5"
                        value={newJobExp}
                        onChange={(e) => setNewJobExp(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Min Education</label>
                      <input
                        type="text"
                        placeholder="e.g. Bachelor's CS"
                        value={newJobEdu}
                        onChange={(e) => setNewJobEdu(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Full Job Description text *</label>
                    <textarea
                      rows={6}
                      required
                      placeholder="Paste the full job post details, requirements, responsibilities, etc. Our matching engine will parse this text for contextual scoring."
                      value={newJobDesc}
                      onChange={(e) => setNewJobDesc(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder-slate-600 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/10 transition-all mt-4"
                  >
                    Save Job Description
                  </button>
                </form>
              </div>
            </div>

            {/* List of existing jobs */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-extrabold text-white text-base mb-4">Saved Job Descriptions ({jobs.length})</h3>
              
              {jobs.length === 0 ? (
                <div className="glass-card p-8 rounded-2xl border border-slate-800 text-center text-slate-500 italic">
                  No active Job Descriptions saved. Complete the form to establish match criteria.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {jobs.map((job) => (
                    <div key={job.id} className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-white text-base leading-snug">{job.title}</h4>
                          <button
                            onClick={() => handleDeleteJob(job.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-950/20 transition-all border border-transparent hover:border-red-500/10"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-slate-400 mb-4 font-semibold">
                          {job.minExperience && (
                            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800">
                              Exp: {job.minExperience}+ yrs
                            </span>
                          )}
                          {job.education && (
                            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800">
                              Edu: {job.education}
                            </span>
                          )}
                          <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800">
                            Created: {new Date(job.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs leading-relaxed line-clamp-3 mb-4">
                          {job.description}
                        </p>
                      </div>

                      {/* Display Job targeted skills */}
                      {job.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-800/60">
                          {job.skills.map((skill, sIdx) => (
                            <span key={sIdx} className="text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: SCREENING & RANKINGS (MATCHING ENGINE LEADERBOARD) */}
        {activeTab === "analyze" && (
          <div className="space-y-8">
            
            {/* Control Room Bar */}
            <div className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-1">
                <h3 className="font-extrabold text-white text-base">Analytical Score Control Desk</h3>
                <p className="text-xs text-slate-400">Run scoring equations and download candidates spreadsheets</p>
              </div>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleRunAnalysis}
                  className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  Screen & Calculate Scores
                </button>
                {rankings.length > 0 && (
                  <button
                    onClick={handleExportCSV}
                    className="px-5 py-3 rounded-xl bg-slate-900 border border-slate-800 text-indigo-400 hover:bg-slate-800 text-sm font-extrabold shadow-sm transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export CSV results
                  </button>
                )}
              </div>
            </div>

            {/* Live Filter Bench */}
            {rankings.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end bg-slate-950/20 p-5 rounded-2xl border border-slate-800/60">
                {/* Search query */}
                <div className="space-y-2">
                  <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-500">Search Candidates</label>
                  <input
                    type="text"
                    placeholder="Search by name, email, or skills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                {/* Minimum score slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-500">Min Match Score</label>
                    <span className="text-xs font-bold text-indigo-400">{minScoreFilter}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={minScoreFilter}
                    onChange={(e) => setMinScoreFilter(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-600 h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Reset button */}
                <div>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setMinScoreFilter(0);
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition-all hover:bg-slate-800"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            )}

            {/* Leaderboard Table Container */}
            <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
                <h3 className="font-extrabold text-white text-base">Candidate Leaderboard (Sorted highest to lowest match score)</h3>
                <span className="text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
                  Total parsed: {filteredRankings.length} of {rankings.length}
                </span>
              </div>

              {rankings.length === 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6">
                  
                  {/* Left Column: Sample Leaderboard Table (Col Span 7) */}
                  <div className="lg:col-span-7 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-md animate-pulse">
                          Demo Preview
                        </span>
                        <h4 className="text-sm font-bold text-slate-300">Sample Candidate Rankings</h4>
                      </div>
                      <span className="text-[10px] text-slate-500 font-semibold italic">Not Clickable • Display Only</span>
                    </div>

                    <div className="glass-card border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl bg-slate-950/20">
                      <table className="w-full border-collapse text-left text-sm opacity-60 pointer-events-none select-none">
                        <thead>
                          <tr className="border-b border-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-950/10">
                            <th className="px-5 py-3.5 text-center w-16">Rank</th>
                            <th className="px-5 py-3.5">Candidate</th>
                            <th className="px-5 py-3.5 text-center w-24">Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          <tr className="hover:bg-slate-900/5">
                            <td className="px-5 py-3 text-center">
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-black">
                                1st
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <div className="font-bold text-white text-xs">John Smith</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">john.smith@demo.com</div>
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border text-emerald-400 bg-emerald-950/20 border-emerald-500/20">
                                92%
                              </span>
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-900/5">
                            <td className="px-5 py-3 text-center">
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-300/10 border border-slate-300/20 text-slate-300 text-[10px] font-black">
                                2nd
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <div className="font-bold text-white text-xs">Emma Johnson</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">emma.johnson@demo.com</div>
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border text-indigo-400 bg-indigo-950/20 border-indigo-500/20">
                                85%
                              </span>
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-900/5">
                            <td className="px-5 py-3 text-center">
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-600/10 border border-amber-600/20 text-amber-500 text-[10px] font-black">
                                3rd
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <div className="font-bold text-white text-xs">Michael Brown</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">michael.brown@demo.com</div>
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border text-indigo-400/80 bg-slate-950/20 border-slate-800">
                                78%
                              </span>
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-900/5">
                            <td className="px-5 py-3 text-center">
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-900 border border-slate-800 text-slate-500 text-[10px] font-black">
                                4th
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <div className="font-bold text-white text-xs">Sophia Davis</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">sophia.davis@demo.com</div>
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border text-slate-400 bg-slate-950/20 border-slate-800">
                                72%
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-900/80 text-center">
                      <p className="text-[10px] text-slate-500 font-semibold tracking-wide flex items-center justify-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                        Sample Preview - Real data will appear after resume analysis.
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Sample Candidate Analysis Panel (Col Span 5) */}
                  <div className="lg:col-span-5 flex flex-col justify-between p-5 rounded-2xl border border-slate-800/80 bg-slate-950/35 relative overflow-hidden select-none pointer-events-none">
                    {/* Visual glow spotlights */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/5 rounded-full blur-xl"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-500/5 rounded-full blur-xl"></div>

                    <div className="space-y-5">
                      <div className="border-b border-slate-900 pb-3 flex justify-between items-center">
                        <div>
                          <p className="text-[9px] text-indigo-400 font-black uppercase tracking-wider">Candidate Analysis</p>
                          <h4 className="text-sm font-black text-white mt-1">John Smith</h4>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Software Engineer</p>
                        </div>
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                          Top Match
                        </span>
                      </div>

                      {/* Detailed Score breakdown */}
                      <div className="space-y-3.5">
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1.5">
                            <span>Skills Match</span>
                            <span className="text-white">90%</span>
                          </div>
                          <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: "90%" }}></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1.5">
                            <span>Experience Score</span>
                            <span className="text-white">85%</span>
                          </div>
                          <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-400 rounded-full" style={{ width: "85%" }}></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1.5">
                            <span>Education Score</span>
                            <span className="text-white">80%</span>
                          </div>
                          <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                            <div className="h-full bg-teal-400 rounded-full" style={{ width: "80%" }}></div>
                          </div>
                        </div>
                      </div>

                      {/* Skills list */}
                      <div className="pt-2">
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-2.5">Matching Tech Stack</p>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="px-2 py-0.5 rounded text-[9px] font-black bg-teal-500/10 text-teal-400 border border-teal-500/20">
                            React
                          </span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-black bg-teal-500/10 text-teal-400 border border-teal-500/20">
                            Node.js
                          </span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-black bg-teal-500/10 text-teal-400 border border-teal-500/20">
                            MySQL
                          </span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-black bg-teal-500/10 text-teal-400 border border-teal-500/20">
                            JavaScript
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-900 mt-5">
                      <button className="w-full py-2 bg-slate-900/40 border border-slate-850/40 text-slate-600 text-[10px] font-black rounded-lg uppercase tracking-wider cursor-not-allowed">
                        View Full Details (Disabled)
                      </button>
                    </div>
                  </div>
                </div>
              ) : filteredRankings.length === 0 ? (
                <div className="p-12 text-center text-slate-500 italic">
                  No candidates match the specified filters. Try lowering the minimum score or widening the search term.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-950/10">
                        <th className="px-6 py-4 font-semibold text-center w-20">Rank</th>
                        <th className="px-6 py-4 font-semibold">Candidate</th>
                        <th className="px-6 py-4 font-semibold text-center w-32">Match Score</th>
                        <th className="px-6 py-4 font-semibold">Matching Skills</th>
                        <th className="px-6 py-4 font-semibold">Missing Skills</th>
                        <th className="px-6 py-4 font-semibold text-center w-36">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredRankings.map((rank, index) => {
                        // Badge color styles based on score tier
                        let scoreColor = "text-red-400 bg-red-950/20 border-red-500/20";
                        let progressColor = "bg-red-500";
                        if (rank.score >= 80) {
                          scoreColor = "text-emerald-400 bg-emerald-950/20 border-emerald-500/20 glow-emerald";
                          progressColor = "bg-emerald-500";
                        } else if (rank.score >= 50) {
                          scoreColor = "text-yellow-400 bg-yellow-950/20 border-yellow-500/20";
                          progressColor = "bg-yellow-500";
                        }

                        return (
                          <tr key={rank.id} className="hover:bg-slate-900/10 transition-all">
                            
                            {/* Rank badge */}
                            <td className="px-6 py-4 text-center">
                              {index === 0 ? (
                                <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-black">
                                  1st
                                </span>
                              ) : index === 1 ? (
                                <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-slate-300/10 border border-slate-300/20 text-slate-300 text-xs font-black">
                                  2nd
                                </span>
                              ) : index === 2 ? (
                                <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-amber-600/10 border border-amber-600/20 text-amber-500 text-xs font-black">
                                  3rd
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-slate-500">{index + 1}</span>
                              )}
                            </td>

                            {/* Candidate Info */}
                            <td className="px-6 py-4">
                              <div className="font-bold text-white leading-snug">{rank.resume.candidateName}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{rank.resume.candidateEmail}</div>
                            </td>

                            {/* Score progress indicator */}
                            <td className="px-6 py-4">
                              <div className="flex flex-col items-center gap-1.5">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${scoreColor}`}>
                                  {rank.score}%
                                </span>
                                <div className="w-16 h-1 bg-slate-900 rounded-full overflow-hidden shrink-0">
                                  <div className={`h-full ${progressColor}`} style={{ width: `${rank.score}%` }}></div>
                                </div>
                              </div>
                            </td>

                            {/* Matching skills */}
                            <td className="px-6 py-4 max-w-xs">
                              {rank.matchingSkills.length === 0 ? (
                                <span className="text-xs text-slate-600 italic">None</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {rank.matchingSkills.slice(0, 4).map((skill, sIdx) => (
                                    <span key={sIdx} className="text-[9px] font-bold bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                                      {skill}
                                    </span>
                                  ))}
                                  {rank.matchingSkills.length > 4 && (
                                    <span className="text-[9px] font-bold bg-emerald-950/30 text-emerald-300 px-1.5 rounded">
                                      +{rank.matchingSkills.length - 4}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Missing skills */}
                            <td className="px-6 py-4 max-w-xs">
                              {rank.missingSkills.length === 0 ? (
                                <span className="text-[9px] font-bold bg-emerald-950/20 text-emerald-400 px-2 py-0.5 rounded">Complete</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {rank.missingSkills.slice(0, 4).map((skill, sIdx) => (
                                    <span key={sIdx} className="text-[9px] font-bold bg-slate-900 border border-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                                      {skill}
                                    </span>
                                  ))}
                                  {rank.missingSkills.length > 4 && (
                                    <span className="text-[9px] font-bold bg-slate-900 text-slate-400 px-1.5 rounded">
                                      +{rank.missingSkills.length - 4}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Actions button */}
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => {
                                  setActivePreviewCandidate(rank);
                                  setPreviewTab("metrics");
                                }}
                                className="px-3 py-1.5 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 mx-auto"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Details Profile
                              </button>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* CANDIDATE PREVIEW MODAL / DRAWER */}
      {activePreviewCandidate && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm">
          {/* Backdrop Closer */}
          <div className="flex-1" onClick={() => setActivePreviewCandidate(null)}></div>
          
          {/* Drawer container */}
          <div className="w-full max-w-2xl bg-[#0a0d16] border-l border-slate-800 shadow-2xl flex flex-col justify-between h-full animate-slide-left z-10">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
              <div>
                <h3 className="text-lg font-extrabold text-white">{activePreviewCandidate.resume.candidateName}</h3>
                <p className="text-xs text-indigo-400 font-semibold">{activePreviewCandidate.resume.candidateEmail}</p>
              </div>
              <button
                onClick={() => setActivePreviewCandidate(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 border border-slate-800 transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Inner Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Profile details grid header */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Match score</p>
                  <p className="text-2xl font-black text-indigo-400 mt-1">{activePreviewCandidate.score}%</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Experience</p>
                  <p className="text-xs font-bold text-slate-300 mt-2 leading-tight truncate">
                    {activePreviewCandidate.resume.candidateExperience || "3+ Years"}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Degree</p>
                  <p className="text-xs font-bold text-slate-300 mt-2 leading-tight truncate">
                    {activePreviewCandidate.resume.candidateEducation?.split("-")[0]?.split("(")[0] || "Bachelor"}
                  </p>
                </div>
              </div>

              {/* Sub tabs inside drawer */}
              <div className="flex border-b border-slate-800">
                <button
                  onClick={() => setPreviewTab("metrics")}
                  className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${
                    previewTab === "metrics"
                      ? "border-indigo-600 text-white bg-indigo-600/5"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Matching Metrics
                </button>
                <button
                  onClick={() => setPreviewTab("text")}
                  className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${
                    previewTab === "text"
                      ? "border-indigo-600 text-white bg-indigo-600/5"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Parsed Resume Text
                </button>
              </div>

              {previewTab === "metrics" ? (
                <div className="space-y-6">
                  {/* Profile Summary Review */}
                  <div className="p-5 rounded-xl bg-indigo-600/5 border border-indigo-500/10 space-y-2">
                    <h4 className="text-xs font-extrabold uppercase text-indigo-400 tracking-wider">Candidate Match Summary</h4>
                    <p className="text-slate-300 text-xs leading-relaxed font-medium">
                      {activePreviewCandidate.overallSummary}
                    </p>
                  </div>

                  {/* Subscore breakdowns */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Sub-Score Breakdowns</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-slate-400">Skills Matching (45%)</span>
                          <span className="text-indigo-400">{activePreviewCandidate.skillsScore}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{ width: `${activePreviewCandidate.skillsScore}%` }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-slate-400">Experience Alignment (35%)</span>
                          <span className="text-indigo-400">{activePreviewCandidate.experienceScore}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{ width: `${activePreviewCandidate.experienceScore}%` }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-bold mb-1">
                          <span className="text-slate-400">Education Credentials (10%)</span>
                          <span className="text-indigo-400">{activePreviewCandidate.educationScore}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500" style={{ width: `${activePreviewCandidate.educationScore}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top Strengths */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Top Profile Strengths</h4>
                    <ul className="space-y-2">
                      {(activePreviewCandidate.topStrengths || []).map((strength, sIdx) => (
                        <li key={sIdx} className="text-xs text-slate-300 flex items-start gap-2 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/80">
                          <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Skill matching tags */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2.5">
                      <h5 className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Matching Skills ({activePreviewCandidate.matchingSkills.length})</h5>
                      {activePreviewCandidate.matchingSkills.length === 0 ? (
                        <p className="text-xs text-slate-600 italic">None matched</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {activePreviewCandidate.matchingSkills.map((skill, sIdx) => (
                            <span key={sIdx} className="text-[9px] font-bold bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <h5 className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Missing Target Skills ({activePreviewCandidate.missingSkills.length})</h5>
                      {activePreviewCandidate.missingSkills.length === 0 ? (
                        <p className="text-[9px] font-bold bg-emerald-950/20 text-emerald-400 px-2 py-0.5 rounded">Fully Covered!</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {activePreviewCandidate.missingSkills.map((skill, sIdx) => (
                            <span key={sIdx} className="text-[9px] font-bold bg-slate-900 border border-slate-800 text-slate-500 px-2 py-0.5 rounded">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Extracted Raw Text Block</h4>
                  <pre className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap bg-slate-900 p-4 rounded-xl border border-slate-800 overflow-y-auto max-h-[350px]">
                    {activePreviewCandidate.resume.parsedText || "No text available."}
                  </pre>
                </div>
              )}

            </div>

            {/* Drawer Footer actions */}
            <div className="p-6 border-t border-slate-800 bg-slate-950/15 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => {
                  window.open(api.getPreviewUrl(activePreviewCandidate.resumeId), "_blank");
                  showToast("Serving original document file...");
                }}
                className="px-4 py-2 text-xs font-extrabold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Original File
              </button>
            </div>

          </div>
        </div>
      )}

      {/* VIEW EXTRACTED RESUME DATA MODAL */}
      {activeResumeDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#0a0d16] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col justify-between max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
              <div>
                <h3 className="font-extrabold text-white text-base">Extracted Resume Profile Data</h3>
                <p className="text-xs text-indigo-400 font-semibold">{activeResumeDetail.filename}</p>
              </div>
              <button
                onClick={() => setActiveResumeDetail(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 border border-slate-800 transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Profile properties breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Candidate Name</p>
                  <p className="text-sm font-bold text-white mt-1">{activeResumeDetail.candidateName || "Not parsed"}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Email Address</p>
                  <p className="text-sm font-bold text-white mt-1 truncate">{activeResumeDetail.candidateEmail || "Not parsed"}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Phone number</p>
                  <p className="text-sm font-bold text-white mt-1">{activeResumeDetail.candidatePhone || "Not parsed"}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Experience timeline</p>
                  <p className="text-sm font-bold text-white mt-1">{activeResumeDetail.candidateExperience || "Not parsed"}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 md:col-span-2">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Education Details</p>
                  <p className="text-sm font-bold text-white mt-1">{activeResumeDetail.candidateEducation || "Not parsed"}</p>
                </div>
              </div>

              {/* Skills section */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase text-slate-500 tracking-wider">Identified Skills ({activeResumeDetail.candidateSkills.length})</h4>
                {activeResumeDetail.candidateSkills.length === 0 ? (
                  <p className="text-xs text-slate-600 italic">No skills identified in parsing cycle.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {activeResumeDetail.candidateSkills.map((skill, sIdx) => (
                      <span key={sIdx} className="text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-lg">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Text segment closer */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase text-slate-500 tracking-wider">Extracted Raw Text Block</h4>
                <pre className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap bg-slate-900 p-4 rounded-xl border border-slate-800 overflow-y-auto max-h-[220px]">
                  {activeResumeDetail.parsedText || "No text available."}
                </pre>
              </div>

            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-950/15 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => {
                  window.open(api.getPreviewUrl(activeResumeDetail.id), "_blank");
                  showToast("Serving original document file...");
                }}
                className="px-4 py-2 text-xs font-extrabold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Original File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-red-500/20 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-amber-500"></div>
            
            <div className="flex gap-4">
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/20 text-red-400 shrink-0 self-start">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Permanently Delete Account?</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                  Warning: This action is absolute and cannot be undone. All your job descriptions, candidate matching lists, parsed resumes, and local database entries will be **permanently wiped**.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-sm font-semibold text-slate-300 border border-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-sm font-bold text-white shadow-lg shadow-red-500/10 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? "Wiping Data..." : "Yes, Delete Everything"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
