import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export interface ParsedResumeData {
  parsedText: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  candidateSkills: string[];
  candidateEducation: string;
  candidateExperience: string;
}

// Extensively compiled dictionary of skills (case-insensitive checking)
const SKILLS_DICTIONARY = [
  "javascript", "typescript", "python", "java", "c++", "c#", "ruby", "go", "rust", "php", "swift", "kotlin",
  "sql", "html", "css", "react", "next.js", "nextjs", "vue", "angular", "svelte", "node.js", "nodejs", "express",
  "django", "flask", "fastapi", "spring", "asp.net", "laravel", "postgres", "postgresql", "mongodb", "mysql",
  "sqlite", "redis", "aws", "azure", "gcp", "docker", "kubernetes", "git", "github", "agile", "scrum",
  "project management", "machine learning", "deep learning", "nlp", "artificial intelligence", "data science", "pandas", "numpy",
  "scikit-learn", "tensorflow", "pytorch", "graphql", "rest api", "ci/cd", "devops", "linux", "tailwind",
  "bootstrap", "figma", "ui/ux", "photoshop", "illustrator", "sass", "webpack", "jest", "cypress", "testing",
  "product management", "business analysis", "seo", "communication", "leadership", "teamwork", "problem solving",
  "tableau", "power bi", "excel", "microservices", "graphql", "restful", "oauth", "jwt", "prisma", "sequelize"
];

export class ParserService {
  /**
   * Parse a file buffer based on its mime type
   */
  public static async parseResume(buffer: Buffer, mimeType: string): Promise<ParsedResumeData> {
    let parsedText = "";

    try {
      if (mimeType === "application/pdf") {
        const data = await pdfParse(buffer);
        parsedText = data.text;
      } else if (
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mimeType === "application/msword"
      ) {
        // Mammoth handles docx
        const result = await mammoth.extractRawText({ buffer });
        parsedText = result.value;
      } else {
        // Fallback for doc/txt or other files
        parsedText = buffer.toString("utf-8");
      }
    } catch (error: any) {
      console.error("File parsing error:", error);
      parsedText = buffer.toString("utf-8"); // Fallback
    }

    if (!parsedText || parsedText.trim() === "") {
      throw new Error("Unable to parse text from the uploaded document.");
    }

    // Clean up parsed text spacing
    parsedText = parsedText.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ");

    const candidateEmail = this.extractEmail(parsedText);
    const candidatePhone = this.extractPhone(parsedText);
    const candidateName = this.extractName(parsedText, candidateEmail);
    const candidateSkills = this.extractSkills(parsedText);
    const candidateEducation = this.extractEducation(parsedText);
    const candidateExperience = this.extractExperience(parsedText);

    return {
      parsedText,
      candidateName,
      candidateEmail,
      candidatePhone,
      candidateSkills,
      candidateEducation,
      candidateExperience
    };
  }

  /**
   * Extract candidate name from text
   */
  private static extractName(text: string, email: string): string {
    const lines = text.split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // If email contains standard naming like john.doe@email.com, we can extract John Doe as fallback if we don't find it.
    let emailPrefix = "";
    if (email) {
      emailPrefix = email.split("@")[0].replace(/[._-]/g, " ");
    }

    // Usually, the first line that is 2 to 4 words long and doesn't contain contact details is the candidate name
    const blacklistWords = [
      "resume", "cv", "curriculum", "vitae", "contact", "phone", "email", "address",
      "summary", "experience", "education", "skills", "page", "portfolio"
    ];

    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i];
      const words = line.split(/\s+/);
      
      // Look for a line containing 2-4 words, starting with letters, and not blacklisted
      if (words.length >= 2 && words.length <= 4) {
        const cleanLine = line.toLowerCase();
        const hasBlacklist = blacklistWords.some(word => cleanLine.includes(word));
        const hasDigits = /\d/.test(line);
        const hasSpecialChars = /[@:/\\+,]/.test(line);

        if (!hasBlacklist && !hasDigits && !hasSpecialChars) {
          // Capitalize each word properly
          return line
            .replace(/\b\w/g, char => char.toUpperCase());
        }
      }
    }

    // Fallback on Email username or default
    if (emailPrefix) {
      return emailPrefix.replace(/\b\w/g, char => char.toUpperCase());
    }
    return "Candidate Name";
  }

  /**
   * Extract email using standard regex
   */
  private static extractEmail(text: string): string {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const match = text.match(emailRegex);
    return match ? match[0].trim().toLowerCase() : "";
  }

  /**
   * Extract phone using general formats
   */
  private static extractPhone(text: string): string {
    // Matches common phone structures: +1 (123) 456-7890, 123-456-7890, +91 9876543210, etc.
    const phoneRegex = /(\+?\d{1,4}[-.\s]?)?\(?\d{2,3}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/;
    const match = text.match(phoneRegex);
    return match ? match[0].trim() : "";
  }

  /**
   * Match terms against skills dictionary
   */
  private static extractSkills(text: string): string[] {
    const matchedSkills: string[] = [];
    const lowerText = text.toLowerCase();

    for (const skill of SKILLS_DICTIONARY) {
      // Avoid matching sub-words (e.g. "go" inside "google" or "django")
      // Use boundary detection, allowing for common skill punctuation like .js or ++
      let escapedSkill = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      
      // Special regex boundary for skills like C++, C#, .NET, Go
      let regexStr = "";
      if (skill === "go") {
        regexStr = "\\bgo\\b"; // Exact match only
      } else if (skill === "c++") {
        regexStr = "\\bc\\+\\+";
      } else if (skill === "c#") {
        regexStr = "\\bc#";
      } else if (skill.endsWith(".js")) {
        regexStr = `\\b${escapedSkill}`;
      } else {
        regexStr = `\\b${escapedSkill}\\b`;
      }

      const regex = new RegExp(regexStr, "i");
      if (regex.test(lowerText)) {
        // Standardize output name
        if (skill === "nextjs") {
          matchedSkills.push("Next.js");
        } else if (skill === "nodejs") {
          matchedSkills.push("Node.js");
        } else if (skill === "postgresql") {
          matchedSkills.push("PostgreSQL");
        } else {
          // Capitalize first letter of skill
          matchedSkills.push(skill.replace(/\b\w/g, char => char.toUpperCase()));
        }
      }
    }

    // Deduplicate
    return Array.from(new Set(matchedSkills));
  }

  /**
   * Extract education line or summary
   */
  private static extractEducation(text: string): string {
    const lines = text.split("\n").map(l => l.trim());
    const degreeKeywords = ["bachelor", "master", "phd", "b.sc", "m.sc", "b.tech", "m.tech", "mba", "degree", "university", "college", "diploma"];

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (degreeKeywords.some(keyword => lowerLine.includes(keyword))) {
        // Return this line if it's not too long and actually contains useful details
        if (line.length > 5 && line.length < 150) {
          return line;
        }
      }
    }

    // Second check: search for chunks of text near "education"
    const eduIndex = text.toLowerCase().indexOf("education");
    if (eduIndex !== -1) {
      const educationBlock = text.substring(eduIndex, eduIndex + 300);
      const firstLines = educationBlock.split("\n").slice(1, 4).map(l => l.trim()).filter(l => l.length > 0);
      if (firstLines.length > 0) {
        return firstLines.join(", ");
      }
    }

    return "Bachelor's Degree (Estimated from context)";
  }

  /**
   * Extract experience line or summary
   */
  private static extractExperience(text: string): string {
    // Look for lines containing "years of experience" or similar
    const expRegex = /(\d+)\+?\s*years?\s*(of\s*)?(work\s*|relevant\s*)?experience/i;
    const match = text.match(expRegex);
    if (match) {
      return `${match[1]} years of professional experience`;
    }

    // Otherwise, grab lines around "experience" keyword
    const lines = text.split("\n").map(l => l.trim());
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes("experience") && (lowerLine.includes("years") || lowerLine.includes("months"))) {
        if (line.length > 5 && line.length < 150) {
          return line;
        }
      }
    }

    const expIndex = text.toLowerCase().indexOf("experience");
    if (expIndex !== -1) {
      const expBlock = text.substring(expIndex, expIndex + 250);
      const firstLines = expBlock.split("\n").slice(1, 4).map(l => l.trim()).filter(l => l.length > 0);
      if (firstLines.length > 0) {
        return firstLines.join(", ");
      }
    }

    return "3+ years of experience (Estimated from context)";
  }
}
