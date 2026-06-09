import { PrismaClient } from "@prisma/client";
import { runMasterDbSeed } from "../src/lib/seed-master-db";

const prisma = new PrismaClient();

runMasterDbSeed(prisma)
  .catch((error) => {
    console.error("[seed] Failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
