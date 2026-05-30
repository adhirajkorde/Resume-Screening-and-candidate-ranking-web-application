"use strict";
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "../utils/api";
import Logo from "../components/Logo";

interface Candidate {
  id: string;
  name: string;
  degree: string;
  school: string;
  experience: number;
  skills: string[];
  keywordsScore: number;
  eduScore: number;
  summary: string;
}

export default function RootPage() {
  const router = useRouter();
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchStep, setLaunchStep] = useState(0);
  
  // Interactive Simulation States
  const [minExpRequired, setMinExpRequired] = useState(5);
  const [selectedCandidateId, setSelectedCandidateId] = useState("1");
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const targetSkills = ["React", "Next.js", "Node.js", "TypeScript", "PostgreSQL", "Prisma", "AWS", "Docker", "Tailwind", "Agile"];

  // Demo candidates for visual preview on the landing page simulator
  const candidates: Candidate[] = [
    {
      id: "1",
      name: "John Smith",
      degree: "B.S. Computer Science",
      school: "MIT",
      experience: 6,
      skills: ["React", "Node.js", "MySQL", "JavaScript", "TypeScript", "AWS"],
      keywordsScore: 88,
      eduScore: 80,
      summary: "Experienced full stack engineer specializing in building highly scalable React applications with robust Node.js backend integration."
    },
    {
      id: "2",
      name: "Emma Johnson",
      degree: "M.S. Software Engineering",
      school: "Stanford",
      experience: 5,
      skills: ["React", "MySQL", "HTML", "CSS", "Git"],
      keywordsScore: 75,
      eduScore: 90,
      summary: "Frontend-focused engineer passionate about clean code and beautiful user interfaces using React and modern CSS."
    },
    {
      id: "3",
      name: "Michael Brown",
      degree: "B.S. Electrical Engineering & Computer Science",
      school: "UC Berkeley",
      experience: 4,
      skills: ["Node.js", "Express", "Python", "SQL", "Docker"],
      keywordsScore: 80,
      eduScore: 85,
      summary: "Backend engineer with strong systems knowledge, experienced with Express, database integration, and microservices docker containerization."
    }
  ];

  const launchSteps = [
    "Initializing secure screening session...",
    "Connecting to parsing engine...",
    "Checking authentication state...",
    "Optimizing database connections...",
    "Routing to recruiter workspace..."
  ];

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    const executeLaunchRedirect = () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("ats_token") : null;
      
      if (token) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    };

    if (isLaunching) {
      if (launchStep < launchSteps.length) {
        timer = setTimeout(() => {
          setLaunchStep((prev) => prev + 1);
        }, 400);
      } else {
        executeLaunchRedirect();
      }
    }
    return () => clearTimeout(timer);
  }, [isLaunching, launchStep, router]);

  const handleStartApp = () => {
    setIsLaunching(true);
    setLaunchStep(0);
  };

  // Live Score Calculator based on interactive experience slider with precise demo alignment
  const getCalculatedCandidates = () => {
    return candidates.map(c => {
      if (c.id === "1") {
        const matchingSkills = ["React", "Node.js", "MySQL", "JavaScript"];
        const expScoreVal = c.experience >= minExpRequired ? 85 : Math.max(30, 85 - (minExpRequired - c.experience) * 15);
        const finalScoreVal = c.experience >= minExpRequired ? 92 : Math.max(40, 92 - (minExpRequired - c.experience) * 10);
        return {
          ...c,
          matchingSkills,
          missingSkills: ["TypeScript", "AWS"],
          finalScore: Math.round(finalScoreVal),
          skillsScore: 90,
          expScore: Math.round(expScoreVal),
          eduScore: 80
        };
      }
      if (c.id === "2") {
        const matchingSkills = ["React", "MySQL"];
        const expScoreVal = c.experience >= minExpRequired ? 90 : Math.max(35, 90 - (minExpRequired - c.experience) * 15);
        const finalScoreVal = c.experience >= minExpRequired ? 85 : Math.max(40, 85 - (minExpRequired - c.experience) * 10);
        return {
          ...c,
          matchingSkills,
          missingSkills: ["HTML", "CSS", "Git"],
          finalScore: Math.round(finalScoreVal),
          skillsScore: 75,
          expScore: Math.round(expScoreVal),
          eduScore: 90
        };
      }
      if (c.id === "3") {
        const matchingSkills = ["Node.js"];
        const expScoreVal = c.experience >= minExpRequired ? 80 : Math.max(30, 80 - (minExpRequired - c.experience) * 15);
        const finalScoreVal = c.experience >= minExpRequired ? 78 : Math.max(40, 78 - (minExpRequired - c.experience) * 10);
        return {
          ...c,
          matchingSkills,
          missingSkills: ["Express", "Python", "SQL", "Docker"],
          finalScore: Math.round(finalScoreVal),
          skillsScore: 65,
          expScore: Math.round(expScoreVal),
          eduScore: 85
        };
      }

      return {
        ...c,
        matchingSkills: c.skills,
        missingSkills: [],
        finalScore: 70,
        skillsScore: 70,
        expScore: 70,
        eduScore: 70
      };
    }).sort((a, b) => b.finalScore - a.finalScore);
  };

  const calculatedCandidates = getCalculatedCandidates();
  const selectedCandidate = calculatedCandidates.find(c => c.id === selectedCandidateId) || null;

  if (isLaunching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050811] text-slate-300 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "4s" }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-teal-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="flex flex-col items-center gap-8 max-w-md w-full px-6 text-center z-10">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl animate-pulse"></div>
            <div className="relative animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500 border-r-2 border-r-teal-400"></div>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-xl font-bold text-white tracking-wide">
              Launching SmartHire
            </h3>
            <p className="text-sm text-slate-400 font-medium h-5 transition-all duration-300">
              {launchSteps[Math.min(launchStep, launchSteps.length - 1)]}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-400 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${((launchStep + 1) / (launchSteps.length + 1)) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#04060d] text-slate-100 flex flex-col relative selection:bg-indigo-500/30 selection:text-white overflow-x-hidden justify-between">
      {/* Premium Cyber Radial spotlights and Grid Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c0e17_1px,transparent_1px),linear-gradient(to_bottom,#0c0e17_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] opacity-70"></div>
        <div className="absolute top-[-20%] left-1/4 w-[1000px] h-[1000px] bg-indigo-600/10 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: "10s" }}></div>
        <div className="absolute top-[20%] right-1/4 w-[800px] h-[800px] bg-teal-500/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[10%] left-1/3 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[100px]"></div>
      </div>

      {/* Floating Premium Navigation Bar */}
      <header className="w-full z-20 sticky top-0 transition-all duration-300 bg-[#050811]/75 backdrop-blur-md border-b border-slate-900/60 shadow-lg shadow-black/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div onClick={handleStartApp} className="flex items-center gap-3 group cursor-pointer">
            <Logo className="h-10 w-auto" />
          </div>

          <div className="flex items-center gap-4">
            <a 
              href="#usp-section"
              className="text-xs font-bold text-slate-400 hover:text-white transition-colors py-2 px-3 hover:bg-slate-900/40 rounded-lg hidden sm:block"
            >
              Features
            </a>
            <button 
              onClick={handleStartApp}
              className="px-5 py-2.5 text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-300 cursor-pointer active:scale-95 flex items-center gap-1.5 border border-indigo-500/30"
            >
              Access Workspace
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative flex-grow flex flex-col items-center px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto z-10 py-16 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 w-full items-center">
          
          {/* Left Column: Copy & Actions */}
          <div className="lg:col-span-5 text-left flex flex-col items-start space-y-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-extrabold tracking-wider uppercase shadow-inner animate-pulse" style={{ animationDuration: "3s" }}>
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
              Resume Screening System
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.08]">
              Resume Screening 
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-teal-300 bg-clip-text text-transparent block mt-2">
                & Candidate Ranking
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-400 leading-relaxed font-semibold max-w-lg">
              Upload resumes, compare them with job descriptions, generate matching scores, and rank candidates based on suitability.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
              <button
                onClick={handleStartApp}
                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold text-sm rounded-xl shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/35 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                Start Screening
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              
              <a
                href="#usp-section"
                className="px-6 py-4 bg-slate-950/40 hover:bg-slate-900/60 text-slate-300 hover:text-white font-bold text-sm rounded-xl border border-slate-900 hover:border-slate-800/80 transition-all duration-300 flex items-center justify-center gap-2"
              >
                View Features
              </a>
            </div>

            {/* Project Core Modules */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-900/80 w-full">
              <div>
                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-black text-indigo-400 mb-1">
                  📄
                </div>
                <p className="text-xs font-black text-white">Resume Parsing</p>
              </div>
              <div>
                <div className="h-8 w-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-xs font-black text-teal-400 mb-1">
                  🏆
                </div>
                <p className="text-xs font-black text-white">Candidate Ranking</p>
              </div>
              <div>
                <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xs font-black text-purple-400 mb-1">
                  🎯
                </div>
                <p className="text-xs font-black text-white">Job Matching</p>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Candidate Ranking Simulator */}
          <div className="lg:col-span-7 w-full flex flex-col">
            <div className="glass-card rounded-2xl border border-slate-800/90 shadow-2xl relative overflow-hidden flex flex-col p-6 sm:p-8">
              {/* Top ambient lights */}
              <div className="absolute top-0 right-1/4 w-40 h-40 bg-teal-500/5 rounded-full blur-2xl"></div>
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-2xl"></div>

              {/* Simulation Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-900/80 relative z-10">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2 flex-wrap">
                    <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse shrink-0"></span>
                    Interactive Ranking Preview
                    <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-md animate-pulse shrink-0">
                      Demo Preview
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Drag experience threshold below to observe rankings shift live</p>
                </div>
                
                <div className="flex items-center gap-3 bg-slate-950/80 py-1.5 px-3 rounded-lg border border-slate-900 shrink-0">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Min Experience:</span>
                  <span className="text-xs font-black text-indigo-400">{minExpRequired} Years</span>
                </div>
              </div>

              {/* Interactive Control: Experience Slider */}
              <div className="py-6 border-b border-slate-900/50 relative z-10">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold mb-2">
                  <span>Minimum Required Experience (Slider)</span>
                  <span className="text-slate-500">1 - 8 Years</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="8" 
                  value={minExpRequired} 
                  onChange={(e) => setMinExpRequired(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500 border border-slate-900 focus:outline-none"
                />
              </div>

              {/* Main Simulation Workspace Split */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-6 flex-grow relative z-10">
                
                {/* Candidate List (Col Span 7) */}
                <div className="md:col-span-7 flex flex-col gap-3">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Candidate Rankings</span>
                    <span>Matching Score</span>
                  </div>

                  {calculatedCandidates.length === 0 ? (
                    <div className="flex-grow flex flex-col items-center justify-center p-8 border border-dashed border-slate-800 rounded-xl bg-slate-950/20 text-center gap-3 py-16">
                      <span className="text-3xl">📄</span>
                      <div>
                        <p className="text-xs font-bold text-slate-200">No Candidates Analyzed Yet</p>
                        <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] mx-auto leading-relaxed">Upload candidate resumes and job descriptions in the workspace to see ranking scores.</p>
                      </div>
                    </div>
                  ) : (
                    calculatedCandidates.map((c, index) => {
                      const isSelected = c.id === selectedCandidateId;
                      return (
                        <div 
                          key={c.id}
                          onClick={() => setSelectedCandidateId(c.id)}
                          onMouseEnter={() => setHoveredCard(c.id)}
                          onMouseLeave={() => setHoveredCard(null)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-300 flex items-center justify-between relative group ${
                            isSelected 
                              ? "bg-slate-950/80 border-indigo-500/50 shadow-lg shadow-indigo-500/5" 
                              : hoveredCard === c.id
                                ? "bg-slate-900/40 border-slate-800"
                                : "bg-slate-950/20 border-slate-900/60"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-6 w-6 rounded-lg text-xs font-black flex items-center justify-center ${
                              index === 0 
                                ? "bg-indigo-600/10 border border-indigo-500/30 text-indigo-400" 
                                : "bg-slate-900 text-slate-500"
                            }`}>
                              #{index + 1}
                            </div>
                            
                            <div>
                              <p className="text-xs font-black text-white group-hover:text-indigo-300 transition-colors">{c.name}</p>
                              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{c.experience} Years • {c.school}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-black ${
                              c.finalScore >= 80 
                                ? "text-teal-400" 
                                : c.finalScore >= 60 
                                  ? "text-indigo-400" 
                                  : "text-slate-400"
                            }`}>
                              {c.finalScore}%
                            </span>
                            <svg className="w-4 h-4 -rotate-90">
                              <circle cx="8" cy="8" r="6" stroke="#0f172a" strokeWidth="2" fill="transparent" />
                              <circle 
                                cx="8" cy="8" r="6" 
                                stroke={c.finalScore >= 80 ? "#2dd4bf" : c.finalScore >= 60 ? "#6366f1" : "#64748b"} 
                                strokeWidth="2" fill="transparent" 
                                strokeDasharray={`${2 * Math.PI * 6}`}
                                strokeDashoffset={`${2 * Math.PI * 6 * (1 - c.finalScore / 100)}`}
                              />
                            </svg>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Candidate Highlight Panel (Col Span 5) */}
                {selectedCandidate === null ? (
                  <div className="md:col-span-5 flex flex-col bg-slate-950/80 p-4 rounded-xl border border-slate-900 justify-between items-center text-center py-12">
                    <div className="flex flex-col items-center gap-3 my-auto">
                      <span className="text-3xl text-slate-600">📊</span>
                      <div>
                        <p className="text-xs font-bold text-slate-300">No Candidate Data Available</p>
                        <p className="text-[10px] text-slate-500 mt-1 max-w-[130px] mx-auto leading-relaxed">Configure criteria and analyze resumes to unlock scores.</p>
                      </div>
                    </div>
                    <button 
                      disabled={true}
                      className="w-full py-2.5 mt-6 bg-slate-900/60 border border-slate-850/40 text-slate-600 text-[10px] font-black rounded-lg cursor-not-allowed uppercase tracking-widest"
                    >
                      No Candidate Data Available
                    </button>
                  </div>
                ) : (
                  <div className="md:col-span-5 flex flex-col bg-slate-950/80 p-4 rounded-xl border border-slate-900 justify-between">
                    <div className="space-y-4">
                      <div className="border-b border-slate-900 pb-2">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Candidate Analysis</p>
                        <p className="text-xs font-black text-white mt-1">{(selectedCandidate as any).name}</p>
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{(selectedCandidate as any).degree}</p>
                      </div>

                      {/* Score breakdown metrics */}
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-[9px] text-slate-500 font-bold mb-1">
                            <span>Skills Alignment (40%)</span>
                            <span className="text-white">{(selectedCandidate as any).skillsScore}%</span>
                          </div>
                          <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500" style={{ width: `${(selectedCandidate as any).skillsScore}%` }}></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[9px] text-slate-500 font-bold mb-1">
                            <span>Experience Score (35%)</span>
                            <span className="text-white">{(selectedCandidate as any).expScore}%</span>
                          </div>
                          <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                            <div className="h-full bg-teal-400" style={{ width: `${(selectedCandidate as any).expScore}%` }}></div>
                          </div>
                        </div>
                      </div>

                      {/* Skill Tags */}
                      <div>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-2">Matching Tech Stack</p>
                        <div className="flex flex-wrap gap-1">
                          {(selectedCandidate as any).matchingSkills.slice(0, 4).map((skill: string) => (
                            <span key={skill} className="px-1.5 py-0.5 rounded text-[8px] font-black bg-teal-500/10 text-teal-400 border border-teal-500/20 shrink-0">
                              {skill}
                            </span>
                          ))}
                          {(selectedCandidate as any).matchingSkills.length > 4 && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-slate-900 text-slate-400 shrink-0">
                              +{(selectedCandidate as any).matchingSkills.length - 4} More
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-900 mt-4">
                      <button 
                        onClick={(e) => e.preventDefault()}
                        className="w-full py-2 bg-indigo-600/20 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 text-indigo-400 text-[10px] font-black rounded-lg transition-all duration-300 uppercase tracking-widest active:scale-95 cursor-pointer"
                      >
                        View Full Details
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Project Core Features Grid */}
        <div id="usp-section" className="mt-32 w-full max-w-5xl text-center z-10 px-4 scroll-mt-24">
          <div className="flex flex-col items-center mb-16 text-center">
            <span className="text-xs font-black text-indigo-500 tracking-widest uppercase mb-2">Project Features</span>
            <h2 className="text-3xl font-black text-white">Key Features</h2>
            <div className="h-1 w-12 bg-indigo-600 mt-4 rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Feature 1 */}
            <div className="glass-card p-6 rounded-2xl border border-slate-900 hover:border-indigo-500/20 transition-all duration-300 relative group overflow-hidden shadow-2xl flex flex-col text-left">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-lg shadow-inner shrink-0 text-indigo-400 mb-6 group-hover:scale-105 transition-transform">
                📄
              </div>
              <h3 className="text-base font-black text-white mb-2 uppercase tracking-wide">Resume Parsing</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                Extract candidate information such as skills, education, experience, and contact details from uploaded resumes.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card p-6 rounded-2xl border border-slate-900 hover:border-indigo-500/20 transition-all duration-300 relative group overflow-hidden shadow-2xl flex flex-col text-left">
              <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-lg shadow-inner shrink-0 text-teal-400 mb-6 group-hover:scale-105 transition-transform">
                🏆
              </div>
              <h3 className="text-base font-black text-white mb-2 uppercase tracking-wide">Candidate Ranking</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                Compare resumes with job descriptions and generate ranking scores based on matching criteria.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card p-6 rounded-2xl border border-slate-900 hover:border-indigo-500/20 transition-all duration-300 relative group overflow-hidden shadow-2xl flex flex-col text-left">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-lg shadow-inner shrink-0 text-purple-400 mb-6 group-hover:scale-105 transition-transform">
                📊
              </div>
              <h3 className="text-base font-black text-white mb-2 uppercase tracking-wide">Results Dashboard</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                View ranked candidates, matching skills, missing skills, and export results.
              </p>
            </div>
          </div>
        </div>

        {/* Step-by-Step Walkthrough Flow */}
        <div className="mt-32 w-full max-w-5xl text-center z-10 px-4">
          <div className="flex flex-col items-center mb-16 text-center">
            <span className="text-xs font-black text-teal-400 tracking-widest uppercase mb-2">Resume Screening Process</span>
            <h2 className="text-3xl font-black text-white">How It Works</h2>
            <div className="h-1 w-12 bg-teal-400 mt-4 rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative text-left">
            
            {/* Step 1 */}
            <div className="flex flex-col relative">
              <div className="flex items-center gap-4 mb-4">
                <span className="h-8 w-8 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center text-xs font-black shadow-inner">
                  1
                </span>
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wide">Upload Resumes</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-semibold pl-12">
                Upload one or multiple resumes in PDF, DOC, or DOCX format.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col relative">
              <div className="flex items-center gap-4 mb-4">
                <span className="h-8 w-8 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center text-xs font-black shadow-inner">
                  2
                </span>
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wide">Add Job Description</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-semibold pl-12">
                Enter the job description manually or upload a job description document.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col relative">
              <div className="flex items-center gap-4 mb-4">
                <span className="h-8 w-8 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center text-xs font-black shadow-inner">
                  3
                </span>
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wide">Analyze & View Results</h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-semibold pl-12">
                Compare resumes with job requirements, generate matching scores, and view ranked candidates.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900/60 bg-[#050811] py-10 z-10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div onClick={handleStartApp} className="flex items-center gap-3 group cursor-pointer shrink-0">
            <Logo className="h-10 w-auto" showTagline={true} />
          </div>

          <p className="text-xs text-slate-600 font-semibold">&copy; {new Date().getFullYear()} SmartHire. Resume Screening & Candidate Ranking System.</p>
        </div>
      </footer>
    </div>
  );
}
