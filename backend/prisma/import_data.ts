import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  const jsonPath = path.join(__dirname, "exported_data.json");
  if (!fs.existsSync(jsonPath)) {
    console.log("No SQLite exported_data.json found. Skipping import.");
    return;
  }

  console.log("Reading data from exported_data.json...");
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  const users = data.users || [];
  console.log(`Found ${users.length} users to import.`);

  for (const user of users) {
    const existing = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (existing) {
      console.log(`User ${user.email} already exists in MySQL database. Skipping.`);
      continue;
    }

    console.log(`Importing user ${user.name} (${user.email})...`);
    await prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        password: user.password,
        name: user.name,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
      },
    });
  }

  console.log("Data migration / restore completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during data restore:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
