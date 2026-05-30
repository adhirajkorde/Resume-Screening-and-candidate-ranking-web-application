import { Resume, JobDescription } from "@prisma/client";

export interface ScoreResult {
  score: number;
  matchingSkills: string[];
  missingSkills: string[];
  experienceScore: number;
  educationScore: number;
  skillsScore: number;
  overallSummary: string;
  topStrengths: string[];
}

export class ScoringService {
  /**
   * Compare a parsed resume against a job description and return detailed scoring metrics
   */
  public static calculateScore(
    resumeSkills: string[],
    resumeText: string,
    resumeExperienceText: string,
    resumeEducationText: string,
    jobDescription: JobDescription
  ): ScoreResult {
    // 1. EXTRACT TARGET SKILLS FROM JOB DESCRIPTION IF NOT POPULATED
    let targetSkills: string[] = [];
    if (typeof jobDescription.skills === "string" && jobDescription.skills.trim() !== "") {
      targetSkills = jobDescription.skills.split(",").map(s => s.trim()).filter(Boolean);
    }
    if (targetSkills.length === 0) {
      targetSkills = this.extractSkillsFromText(jobDescription.description);
    }

    // Convert all to lowercase for safe comparisons
    const candidateSkillsLower = resumeSkills.map(s => s.toLowerCase());
    const targetSkillsLower = targetSkills.map(s => s.toLowerCase());

    // 2. SKILLS SCORE (45% of total score)
    const matchingSkillsLower = targetSkillsLower.filter(skill => candidateSkillsLower.includes(skill));
    const missingSkillsLower = targetSkillsLower.filter(skill => !candidateSkillsLower.includes(skill));

    // Convert back to capitalized versions from the original collections or capitalize properly
    const matchingSkills = targetSkills.filter(skill => matchingSkillsLower.includes(skill.toLowerCase()));
    const missingSkills = targetSkills.filter(skill => missingSkillsLower.includes(skill.toLowerCase()));

    let skillsScore = 100;
    if (targetSkillsLower.length > 0) {
      skillsScore = (matchingSkillsLower.length / targetSkillsLower.length) * 100;
    }

    // 3. EXPERIENCE RELEVANCE SCORE (35% of total score)
    const candidateYears = this.parseYearsOfExperience(resumeExperienceText + " " + resumeText);
    const jdYears = jobDescription.minExperience || this.parseYearsOfExperience(jobDescription.description) || 2; // Default 2 years

    let experienceScore = 100;
    if (candidateYears < jdYears) {
      // Score decreases proportionally, down to minimum 40% if they have some experience
      experienceScore = Math.max(40, (candidateYears / jdYears) * 100);
    } else {
      // Reward extra experience, up to 100%
      experienceScore = 100;
    }

    // 4. EDUCATION RELEVANCE SCORE (10% of total score)
    const candidateEduRank = this.getEducationRank(resumeEducationText);
    const jdEduRank = this.getEducationRank(jobDescription.education || jobDescription.description);

    let educationScore = 100;
    if (candidateEduRank < jdEduRank) {
      educationScore = Math.max(50, (candidateEduRank / jdEduRank) * 100);
    }

    // 5. KEYWORD SIMILARITY / JACCARD OVERLAP SCORE (10% of total score)
    const keywordSimilarityScore = this.calculateKeywordSimilarity(resumeText, jobDescription.description);

    // 6. CALCULATE WEIGHTED TOTAL
    // Weights: Skills = 45%, Experience = 35%, Education = 10%, Keywords = 10%
    const totalScore = Math.round(
      (skillsScore * 0.45) +
      (experienceScore * 0.35) +
      (educationScore * 0.10) +
      (keywordSimilarityScore * 0.10)
    );

    // Clamp score between 0 and 100
    const finalScore = Math.max(0, Math.min(100, totalScore));

    // 7. GENERATE DYNAMIC SUMMARY & STRENGTHS
    const topStrengths = this.generateTopStrengths(
      matchingSkills,
      candidateYears,
      jdYears,
      candidateEduRank,
      skillsScore
    );

    const overallSummary = this.generateSummary(
      finalScore,
      matchingSkills,
      candidateYears,
      resumeEducationText,
      missingSkills
    );

    return {
      score: finalScore,
      matchingSkills,
      missingSkills,
      experienceScore: Math.round(experienceScore),
      educationScore: Math.round(educationScore),
      skillsScore: Math.round(skillsScore),
      overallSummary,
      topStrengths
    };
  }

  /**
   * Helper to parse years of experience from text
   */
  private static parseYearsOfExperience(text: string): number {
    const lowerText = text.toLowerCase();
    
    // Look for patterns like "5 years", "3+ years", "10 years of experience"
    const expRegexes = [
      /(\d+)\+?\s*years?\s*(of\s*)?(work\s*|relevant\s*|professional\s*)?experience/i,
      /experience\s*:\s*(\d+)\+?\s*years?/i,
      /(\d+)\s*years?\s*in\s*(software|development|design|management|industry)/i
    ];

    for (const regex of expRegexes) {
      const match = lowerText.match(regex);
      if (match) {
        const years = parseInt(match[1], 10);
        if (!isNaN(years) && years > 0 && years < 45) {
          return years;
        }
      }
    }

    // Try finding any single digits followed by "years"
    const simpleRegex = /(\d+)\s*years?/gi;
    let match;
    let maxYears = 0;
    while ((match = simpleRegex.exec(lowerText)) !== null) {
      const years = parseInt(match[1], 10);
      if (!isNaN(years) && years > maxYears && years < 45) {
        maxYears = years;
      }
    }

    if (maxYears > 0) return maxYears;

    // Fallback based on text length / indicators of seniority
    if (lowerText.includes("senior") || lowerText.includes("lead") || lowerText.includes("principal")) {
      return 6;
    }
    if (lowerText.includes("junior") || lowerText.includes("entry")) {
      return 1;
    }

    return 2; // Default starting assumption
  }

  /**
   * Assign rank weight to education level
   */
  private static getEducationRank(text: string): number {
    const lower = text.toLowerCase();
    if (lower.includes("phd") || lower.includes("ph.d") || lower.includes("doctorate")) {
      return 5;
    }
    if (lower.includes("master") || lower.includes("m.s") || lower.includes("msc") || lower.includes("m.tech") || lower.includes("mba")) {
      return 4;
    }
    if (lower.includes("bachelor") || lower.includes("b.s") || lower.includes("bsc") || lower.includes("b.tech") || lower.includes("degree")) {
      return 3;
    }
    if (lower.includes("diploma")) {
      return 2;
    }
    return 1; // High School or undefined
  }

  /**
   * Helper to scan plain text for skills in the primary list
   */
  private static extractSkillsFromText(text: string): string[] {
    const SKILLS_DICTIONARY = [
      "javascript", "typescript", "python", "java", "c++", "c#", "ruby", "go", "rust", "php", "swift", "kotlin",
      "sql", "html", "css", "react", "next.js", "nextjs", "vue", "angular", "svelte", "node.js", "nodejs", "express",
      "django", "flask", "fastapi", "spring", "asp.net", "laravel", "postgres", "postgresql", "mongodb", "mysql",
      "sqlite", "redis", "aws", "azure", "gcp", "docker", "kubernetes", "git", "github", "agile", "scrum",
      "project management", "machine learning", "deep learning", "nlp", "artificial intelligence", "data science", "pandas", "numpy",
      "scikit-learn", "tensorflow", "pytorch", "graphql", "rest api", "ci/cd", "devops", "linux", "tailwind",
      "bootstrap", "figma", "ui/ux", "photoshop", "illustrator", "sass", "webpack", "jest", "cypress", "testing",
      "product management", "business analysis"
    ];

    const matchedSkills: string[] = [];
    const lowerText = text.toLowerCase();

    for (const skill of SKILLS_DICTIONARY) {
      let escapedSkill = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      let regexStr = skill === "go" ? "\\bgo\\b" : `\\b${escapedSkill}\\b`;
      if (skill === "c++") regexStr = "\\bc\\+\\+";
      if (skill === "c#") regexStr = "\\bc#";

      const regex = new RegExp(regexStr, "i");
      if (regex.test(lowerText)) {
        matchedSkills.push(skill.replace(/\b\w/g, char => char.toUpperCase()));
      }
    }

    return Array.from(new Set(matchedSkills));
  }

  /**
   * Calculate lexical Jaccard overlap between resume and JD
   */
  private static calculateKeywordSimilarity(resumeText: string, jdText: string): number {
    const cleanWords = (text: string): Set<string> => {
      const words = text.toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/);
      
      const stopwords = new Set([
        "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "arent",
        "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can",
        "cant", "cannot", "could", "couldnt", "did", "didnt", "do", "does", "doesnt", "doing", "dont", "down",
        "during", "each", "few", "for", "from", "further", "had", "hadnt", "has", "hasnt", "have", "havent",
        "having", "he", "hed", "hell", "hes", "her", "here", "heres", "hers", "herself", "him", "himself",
        "his", "how", "hows", "i", "id", "ill", "im", "ive", "if", "in", "into", "is", "isnt", "it", "its",
        "itself", "lets", "me", "more", "most", "mustnt", "my", "myself", "no", "nor", "not", "of", "off",
        "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same",
        "shant", "she", "shed", "shell", "shes", "should", "shouldnt", "so", "some", "such", "than", "that",
        "thats", "the", "their", "theirs", "them", "themselves", "then", "there", "theres", "these", "they",
        "theyd", "theyll", "theyre", "theyve", "this", "those", "through", "to", "too", "under", "until", "up",
        "very", "was", "wasnt", "we", "wed", "well", "were", "weve", "werent", "what", "whats", "when", "whens",
        "where", "wheres", "which", "while", "who", "whos", "whom", "why", "whys", "with", "wont", "would",
        "wouldnt", "you", "youd", "youll", "youre", "youve", "your", "yours", "yourself", "yourselves"
      ]);

      return new Set(words.filter(w => w.length > 2 && !stopwords.has(w)));
    };

    const resumeWords = cleanWords(resumeText);
    const jdWords = cleanWords(jdText);

    if (resumeWords.size === 0 || jdWords.size === 0) return 0;

    // Intersection
    let intersectionSize = 0;
    for (const word of resumeWords) {
      if (jdWords.has(word)) {
        intersectionSize++;
      }
    }

    // Jaccard similarity score * 100
    const unionSize = resumeWords.size + jdWords.size - intersectionSize;
    const similarity = (intersectionSize / unionSize) * 100;

    // Scale standard lexical Jaccard which is usually low (e.g. 5% to 25%).
    // Multiply by 3 to normalize, capping at 100.
    return Math.min(100, Math.round(similarity * 3.5));
  }

  /**
   * Generate lists of strengths for the candidate
   */
  private static generateTopStrengths(
    matchingSkills: string[],
    candidateYears: number,
    jdYears: number,
    eduRank: number,
    skillsScore: number
  ): string[] {
    const strengths: string[] = [];

    // Experience strength
    if (candidateYears >= 6) {
      strengths.push(`Senior profile with over ${candidateYears} years of professional experience`);
    } else if (candidateYears >= jdYears) {
      strengths.push(`Experience level (${candidateYears} years) fully aligns with target requirements`);
    }

    // Skills strength
    if (skillsScore >= 80) {
      strengths.push("Excellent core technical alignment with near-complete coverage of the stack");
    } else if (matchingSkills.length >= 3) {
      const top3 = matchingSkills.slice(0, 3).join(", ");
      strengths.push(`Strong working knowledge of core stack including ${top3}`);
    }

    // Education strength
    if (eduRank >= 4) {
      strengths.push("Highly educated profile holding advanced graduate level credentials");
    }

    // Soft skill fallback if list is empty
    if (strengths.length < 2) {
      strengths.push("Clear candidate profile representation with organized layout structure");
      strengths.push("Demonstrated expertise across standard technical and domain environments");
    }

    return strengths;
  }

  /**
   * Generate a custom summarized profile review for the candidate
   */
  private static generateSummary(
    score: number,
    matchingSkills: string[],
    candidateYears: number,
    edu: string,
    missingSkills: string[]
  ): string {
    const formattedEdu = edu ? edu.trim() : "academic credentials";
    const skillHighlights = matchingSkills.slice(0, 4).join(", ");

    if (score >= 80) {
      return `Outstanding candidate with ${candidateYears} years of experience and exceptional alignment (Match: ${score}%). Holds strong credentials in ${formattedEdu} and exhibits deep competence in ${skillHighlights || "the requested tech stack"}. Very strong hire candidate with highly compatible background and minimal training required.`;
    }
    
    if (score >= 50) {
      let missingSnippet = "";
      if (missingSkills.length > 0) {
        missingSnippet = `, but currently lacks immediate exposure to ${missingSkills.slice(0, 2).join(" and ")}`;
      }

      return `Strong candidate demonstrating a healthy ${score}% technical compatibility. With ${candidateYears} years of work history and background in ${formattedEdu}, the candidate is highly familiar with ${skillHighlights || "fundamental technologies"}${missingSnippet}. Suitable candidate for interviews with minor onboarding support.`;
    }

    return `Foundational candidate showing a match score of ${score}%. Possesses ${candidateYears} years of experience with education listed as "${formattedEdu}". While the resume has good details, there are significant gaps in core job skills (missing: ${missingSkills.slice(0, 3).join(", ") || "essential technologies"}). Recommended for secondary screening pipeline.`;
  }
}
