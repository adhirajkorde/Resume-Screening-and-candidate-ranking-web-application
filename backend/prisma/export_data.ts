import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("Reading data from SQLite...");
  try {
    const users = await prisma.user.findMany();
    const resumes = await prisma.resume.findMany();
    const jobDescriptions = await prisma.jobDescription.findMany();
    const candidateScores = await prisma.candidateScore.findMany();

    const data = {
      users,
      resumes,
      jobDescriptions,
      candidateScores,
    };

    const outPath = path.join(__dirname, "exported_data.json");
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
    console.log(`Successfully exported data to ${outPath}`);
    console.log(`Counts: Users=${users.length}, Resumes=${resumes.length}, JobDescriptions=${jobDescriptions.length}, CandidateScores=${candidateScores.length}`);
  } catch (error) {
    console.error("Error exporting data from SQLite:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
