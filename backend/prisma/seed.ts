import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding started...");

  // 1. Clean existing records (cascading handles relations)
  await prisma.user.deleteMany({});
  console.log("Cleaned old user records.");

  // 2. Create hashed password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash("admin123", salt);

  // 3. Create active recruiter user
  const user = await prisma.user.create({
    data: {
      email: "admin@ats.com",
      password: hashedPassword,
      name: "Alex Mercer"
    }
  });
  console.log("Created test recruiter account: admin@ats.com / admin123");

  // 4. Create Job Description
  const job = await prisma.jobDescription.create({
    data: {
      title: "Senior Full-Stack Engineer",
      description: `We are looking for a Senior Full-Stack Engineer to join our growing tech team. 
Roles and Responsibilities:
- Design and build scalable web applications using React, Next.js, and Node.js.
- Work closely with PostgreSQL databases and manage schemas with Prisma or equivalent ORM tools.
- Implement robust APIs, authentication mechanisms, and maintain high standards of security.
- Collaborate in an Agile team with CI/CD deployment pipelines on AWS or GCP.
- Perform code reviews and mentor junior developers.

Requirements:
- Strong knowledge of TypeScript, JavaScript, and CSS/Tailwind.
- 5+ years of software development experience in full-stack setups.
- Experience with Docker, microservices, and modern state-management systems.
- Bachelor's or Master's degree in Computer Science or related fields.`,
      skills: ["React", "Next.js", "Node.js", "TypeScript", "PostgreSQL", "Prisma", "AWS", "Docker", "Tailwind", "Agile"].join(","),
      minExperience: 5,
      education: "Bachelor's Degree in Computer Science",
      userId: user.id
    }
  });
  console.log("Created Sample Job Description: Senior Full-Stack Engineer");
  
  console.log("Seeding finished successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
