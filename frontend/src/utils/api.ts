const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5088/api";

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface CandidateScore {
  id: string;
  score: number;
  matchingSkills: string[];
  missingSkills: string[];
  experienceScore: number;
  educationScore: number;
  skillsScore: number;
  overallSummary: string;
  topStrengths: string[];
  resumeId: string;
  jobDescriptionId: string;
  createdAt: string;
  resume: Resume;
}

export interface Resume {
  id: string;
  filename: string;
  filePath: string;
  fileType: string;
  parsedText: string;
  candidateName: string | null;
  candidateEmail: string | null;
  candidatePhone: string | null;
  candidateSkills: string[];
  candidateEducation: string | null;
  candidateExperience: string | null;
  createdAt: string;
  scores?: {
    id: string;
    score: number;
    jobDescriptionId: string;
  }[];
}

export interface JobDescription {
  id: string;
  title: string;
  description: string;
  skills: string[];
  minExperience: number | null;
  education: string | null;
  createdAt: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface UploadResponse {
  message: string;
  resumes: Resume[];
  errors?: { filename: string; error: string }[];
}

export interface AnalysisResponse {
  message: string;
  rankings: CandidateScore[];
}

class ApiClient {
  private getHeaders(isMultipart = false): HeadersInit {
    const headers: Record<string, string> = {};
    
    if (!isMultipart) {
      headers["Content-Type"] = "application/json";
    }

    if (typeof window !== "undefined") {
      const token = localStorage.getItem("ats_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = "An error occurred during request.";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        // Response wasn't JSON
      }
      throw new Error(errorMessage);
    }
    return response.json() as Promise<T>;
  }

  // --- Auth API ---
  public async login(data: any): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse<LoginResponse>(res);
  }

  public async signup(data: any): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse<LoginResponse>(res);
  }

  public async getProfile(): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      headers: this.getHeaders()
    });
    return this.handleResponse<User>(res);
  }

  public async deleteAccount(): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/delete-account`, {
      method: "DELETE",
      headers: this.getHeaders()
    });
    return this.handleResponse<{ message: string }>(res);
  }

  // --- Resumes API ---
  public async getResumes(): Promise<Resume[]> {
    const res = await fetch(`${API_BASE_URL}/resumes`, {
      method: "GET",
      headers: this.getHeaders()
    });
    return this.handleResponse<Resume[]>(res);
  }

  public async getResumeDetails(id: string): Promise<Resume> {
    const res = await fetch(`${API_BASE_URL}/resumes/${id}`, {
      method: "GET",
      headers: this.getHeaders()
    });
    return this.handleResponse<Resume>(res);
  }

  public async uploadResumes(formData: FormData): Promise<UploadResponse> {
    const res = await fetch(`${API_BASE_URL}/resumes/upload`, {
      method: "POST",
      headers: this.getHeaders(true),
      body: formData
    });
    return this.handleResponse<UploadResponse>(res);
  }

  public async deleteResume(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/resumes/${id}`, {
      method: "DELETE",
      headers: this.getHeaders()
    });
    return this.handleResponse<{ message: string }>(res);
  }

  public getPreviewUrl(id: string): string {
    const token = typeof window !== "undefined" ? localStorage.getItem("ats_token") : "";
    return `${API_BASE_URL}/resumes/${id}/preview?token=${token}`;
  }

  // --- Jobs API ---
  public async getJobs(): Promise<JobDescription[]> {
    const res = await fetch(`${API_BASE_URL}/jobs`, {
      method: "GET",
      headers: this.getHeaders()
    });
    return this.handleResponse<JobDescription[]>(res);
  }

  public async createJob(data: any): Promise<{ message: string; jobDescription: JobDescription }> {
    const res = await fetch(`${API_BASE_URL}/jobs`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    return this.handleResponse<{ message: string; jobDescription: JobDescription }>(res);
  }

  public async deleteJob(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/jobs/${id}`, {
      method: "DELETE",
      headers: this.getHeaders()
    });
    return this.handleResponse<{ message: string }>(res);
  }

  // --- Analysis API ---
  public async analyzeResumes(jobDescriptionId: string): Promise<AnalysisResponse> {
    const res = await fetch(`${API_BASE_URL}/analysis`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ jobDescriptionId })
    });
    return this.handleResponse<AnalysisResponse>(res);
  }

  public async getRankings(jobDescriptionId: string): Promise<CandidateScore[]> {
    const res = await fetch(`${API_BASE_URL}/analysis/rankings/${jobDescriptionId}`, {
      method: "GET",
      headers: this.getHeaders()
    });
    return this.handleResponse<CandidateScore[]>(res);
  }

  public getExportUrl(jobDescriptionId: string): string {
    const token = typeof window !== "undefined" ? localStorage.getItem("ats_token") : "";
    return `${API_BASE_URL}/analysis/export/${jobDescriptionId}?token=${token}`;
  }
}

export const api = new ApiClient();
